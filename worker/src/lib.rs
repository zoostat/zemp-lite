//! The Zeff engine as Zemp's worker (Zemp Specification, section 3: "the engine runs in its
//! own worker, so the interface never freezes"; Engine and Project Specification, section
//! 8.3, point 7).
//!
//! A [`Host`] is one project held in memory. The interface gives it the project's files, asks
//! it to run a script, and is told the run's steps and what it prints as it goes, each as one
//! line of JSON, then its outcome: this much is the host of the engine's own browser build
//! (`zeff-web`), whose events and default memory budget are used as they are. One thing is
//! added. A file of the project is given back, so that the interface can read what a run
//! wrote: at Zeff 0.7.0 and 0.8.0 a figure leaves the engine only as a file `export` writes
//! (docs/decisions.md, 15 November 2026). And from Zeff 0.8.0 the host tells, for a text, where
//! each statement begins and ends, and with a run's outcome, for each statement, what it
//! printed and said at the width asked, what it made and how large a frame it made, all in
//! the engine's own words (docs/decisions.md, 21 November 2026, release 0.2, step 3).
//!
//! The functions here are plain Rust and are tested natively; `browser` binds them for
//! WebAssembly, and `js/` holds the worker script that carries the messages.

use std::cell::RefCell;
use std::path::{Component, Path, PathBuf};
use zeff_diagnostics::json_string;
use zeff_diagnostics::{Diagnostic, Severity, Source, Sources};
use zeff_engine::control::{Control, Event};
use zeff_engine::dependencies::graph;
use zeff_engine::fs::FileSystem;
use zeff_engine::interpreter::{MemoryNote, StatementOutput};
use zeff_engine::language::outline::statements_in;
use zeff_engine::language::{Position, Range, offset, position};
use zeff_engine::project::Project;
use zeff_engine::run::{Frames, RunOptions, check_in_project, run_script_keeping};
use zeff_ir::{Program, Statement, Ty};
use zeff_web::{default_budget, event_json};

#[cfg(target_arch = "wasm32")]
mod browser;
pub mod index;
mod view;
mod written;

use written::Recording;

/// Where the project lies in the worker's memory.
const ROOT: &str = "/project";

/// The version of the engine in the worker.
pub fn engine_version() -> &'static str {
    zeff_engine::VERSION
}

/// The place in memory of a path given from the project's folder (`data/wages.csv`,
/// `/output/fig1.svg`), or `None` for a path that would leave the project: one with `..` in
/// it, or with nothing in it.
fn inside(path: &str) -> Option<PathBuf> {
    let mut place = PathBuf::from(ROOT);
    let mut parts = 0;
    for part in Path::new(path.trim_start_matches('/')).components() {
        match part {
            Component::Normal(name) => {
                place.push(name);
                parts += 1;
            }
            Component::CurDir => {}
            Component::ParentDir | Component::RootDir | Component::Prefix(_) => return None,
        }
    }
    (parts > 0).then_some(place)
}

/// One statement of a script as the engine reads it: where it begins and ends, as lines
/// counted from 1, and its kind (`statement`, `function` or `use`).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Ranged {
    pub line: u32,
    pub end: u32,
    pub kind: &'static str,
}

/// The statements of a text, in order, as the engine's outline gives them (Zeff 0.8.0, step
/// 8b): a chain written over several lines is one statement.
pub fn statements(script: &str, text: &str) -> Vec<Ranged> {
    let whole = Range {
        start: Position {
            line: 0,
            character: 0,
        },
        end: position(text, text.len()),
    };
    statements_in(script, text, whole)
        .into_iter()
        .map(|statement| {
            let (start, end) = (statement.range.start, statement.range.end);
            // A range ends before its end; where it ends at the start of a line, its last line
            // is the one before.
            let last = if end.character == 0 && end.line > start.line {
                end.line - 1
            } else {
                end.line
            };
            Ranged {
                line: start.line + 1,
                end: last + 1,
                kind: statement.kind.name(),
            }
        })
        .collect()
}

/// The explained page of a code (`W0201`, or a diagnostic's `zeff://explain/W0201` link), as
/// `zeff explain <code> --format json` gives it, as a line of JSON of type `explained`; or of
/// type `error` for a code no page explains. It needs no project.
pub fn explain(code: &str) -> String {
    zeff_web::explain(code)
}

/// Every code with an explained page, by family, as a line of JSON of type `codes`.
pub fn explained_codes() -> String {
    zeff_web::explained_codes()
}

/// The index of the help, as a line of JSON of type `helpIndex` (`index::help_index`): the
/// packages shipped with their functions, each with its one-line summary and its R and Stata
/// names, and the shipped datasets. It needs no project. Where the registry did not build,
/// which stops every run too, the index is empty.
pub fn help_index() -> String {
    match zeff_engine::registry::registry() {
        Ok(registry) => index::help_index(registry, engine_version()),
        Err(_) => format!(
            "{{\"type\": \"helpIndex\", \"engine\": {}, \"packages\": [], \"datasets\": []}}",
            json_string(engine_version())
        ),
    }
}

/// The statements of a text as a JSON array of `{line, end, kind}`.
fn ranges_json(script: &str, text: &str) -> String {
    let listed: Vec<String> = statements(script, text)
        .iter()
        .map(|one| {
            format!(
                "{{\"line\": {}, \"end\": {}, \"kind\": \"{}\"}}",
                one.line, one.end, one.kind
            )
        })
        .collect();
    format!("[{}]", listed.join(", "))
}

/// The statements of a text as a line of JSON of type `statements`.
pub fn statements_json(script: &str, text: &str) -> String {
    format!(
        "{{\"type\": \"statements\", \"statements\": {}}}",
        ranges_json(script, text)
    )
}

/// The text with every statement that does not begin on one of `lines` blanked: each of its
/// characters but the line breaks becomes a space, so that every line and column of what
/// stays is where it was, and the engine names the script's own lines. A function, a `use`,
/// a comment and a blank line stay as they are.
pub fn only(script: &str, text: &str, lines: &[u32]) -> String {
    let mut bytes = text.as_bytes().to_vec();
    let whole = Range {
        start: Position {
            line: 0,
            character: 0,
        },
        end: position(text, text.len()),
    };
    for statement in statements_in(script, text, whole) {
        if statement.kind.name() != "statement" || lines.contains(&(statement.range.start.line + 1))
        {
            continue;
        }
        let (from, to) = (
            offset(text, statement.range.start),
            offset(text, statement.range.end),
        );
        for byte in &mut bytes[from..to] {
            // A byte of a character of several bytes becomes a space each, which keeps the
            // text valid and every later byte where it was.
            if *byte != b'\n' && *byte != b'\r' {
                *byte = b' ';
            }
        }
    }
    String::from_utf8(bytes).unwrap_or_else(|_| text.to_string())
}

/// What the checked program says a top-level statement makes: the name it binds, if any, and
/// the type the engine names (`Frame`, `RegFit`, `Plot`), by the line the statement begins on.
fn made(program: &Program, text: &str) -> Vec<(u32, Option<String>, Option<String>)> {
    let line = |byte: usize| position(text, byte).line + 1;
    let named = |ty: &Ty| (*ty != Ty::Unknown).then(|| ty.to_string());
    program
        .statements
        .iter()
        .filter_map(|statement| match statement {
            Statement::Let { binding, span, .. } => {
                let binding = program.bindings.get(*binding)?;
                Some((
                    line(span.start),
                    Some(binding.name.clone()),
                    named(&binding.ty),
                ))
            }
            Statement::Print { value, span } => Some((line(span.start), None, named(&value.ty))),
            _ => None,
        })
        .collect()
}

/// How a run is asked for: the memory the device reports, where it reports any; the width
/// tables are printed at, 0 for the engine's own; and the lines of the statements to run
/// alone, where only some are to run.
#[derive(Debug, Clone, Copy, Default)]
pub struct Asked<'a> {
    pub device_bytes: Option<u64>,
    pub width: usize,
    pub only: Option<&'a [u32]>,
}

/// How the data viewer shows a frame (#75): sorted by a variable (`true` for descending) or
/// not; kept to the rows of the condition last given to [`Host::filter`] or not; and kept to
/// the rows with a cell that holds `search`.
#[derive(Debug, Clone, Copy, Default)]
pub struct Shown<'a> {
    pub sort: Option<(&'a str, bool)>,
    pub filtered: bool,
    pub search: &'a str,
}

/// The binding the viewer's filter is run into; the user never sees it, since the statement
/// copied is written with the frame's own name.
const FILTERED: &str = "zemp_viewer_rows";

/// Never cancelled: a filter is short, and runs only the statements it needs.
fn never() -> bool {
    false
}

/// A frame kept to the rows of a condition: the frame's name, the condition, and the frame
/// the engine made of them.
type Filtered = (String, String, zeff_core::value::Frame);

/// A project in memory, and the runs made in it.
pub struct Host {
    /// The project as the engine sees it, in memory, noting what a run writes.
    fs: Recording,
    /// The engine's language server (`zeff-lsp`), over the project as this host holds it.
    language: RefCell<zeff_lsp::Server>,
    /// The frames the bindings of the last run held when it ended, for the interface to show.
    frames: RefCell<Frames>,
    /// The script and the text the last run ran, which a filter runs again with its statement.
    last: RefCell<Option<(String, String)>>,
    /// The viewer's frame kept to the rows of a condition, until the next run.
    filtered: RefCell<Option<Filtered>>,
    /// The rows of the viewer's last view, by what made them, so that a scroll does not put
    /// them in order again.
    kept: RefCell<Option<(String, Vec<usize>)>>,
    /// The small distributions of the headers of the viewer's last frame, by what made it.
    bars: RefCell<Option<(String, Vec<String>)>>,
}

/// What the engine says of a project whose `zeff.toml` names another engine than this one
/// (Z0710), as the command line words it, or `None` where the project names this engine. From
/// Zeff 0.9.0 the command line makes this check and the engine's library runs what it is
/// given; so the worker makes it wherever it would run the project's code (release 0.3,
/// step 3b): a project is run on the engine it names, and on no other.
fn another_engine(project: &Project) -> Option<String> {
    let diagnostic = project.check_pin().err()?;
    let mut sources = Sources::new();
    sources.add(Source::new(
        zeff_engine::project::MANIFEST,
        project.manifest_text.clone(),
    ));
    Some(diagnostic.render(&sources))
}

/// The first line of what the engine said: the message itself, without its place and help.
fn first_line(said: &str) -> &str {
    said.lines().next().unwrap_or(said)
}

impl Host {
    /// A project called `name`, pinned to this engine, with nothing in it yet.
    pub fn new(name: &str) -> Host {
        let fs = Recording::new();
        fs.add_file(
            format!("{ROOT}/zeff.toml"),
            format!(
                "[project]\nname = {}\nzeff = \"{}\"\nedition = \"preview\"\n",
                json_string(name),
                zeff_engine::VERSION
            ),
        );
        Host {
            fs,
            language: RefCell::new(zeff_lsp::Server::new()),
            frames: RefCell::default(),
            last: RefCell::default(),
            filtered: RefCell::default(),
            kept: RefCell::default(),
            bars: RefCell::default(),
        }
    }

    /// Put a file into the project, by its path from the project's folder; a file of that
    /// path is replaced. `false` for a path that would leave the project, which is not put.
    pub fn add_file(&self, path: &str, bytes: &[u8]) -> bool {
        match inside(path) {
            Some(place) => {
                self.fs.add_file(place, bytes);
                true
            }
            None => false,
        }
    }

    /// Forget a file of the project, or a folder with all it holds, by its path from the
    /// project's folder: the reader renamed, moved or deleted it in the project, and it must
    /// be gone from the engine's copy too. The frames of the last run are kept. Whether there
    /// was one to forget; `false` also for a path that would leave the project, and for the
    /// manifest, without which there is no project.
    pub fn remove(&self, path: &str) -> bool {
        match inside(path) {
            Some(place) if place != Path::new(ROOT).join("zeff.toml") => self.fs.forget(&place),
            _ => false,
        }
    }

    /// A file of the project as its bytes, by its path from the project's folder: one the
    /// interface put in, or one a run wrote. `None` where there is no such file, and for a
    /// path that would leave the project.
    pub fn file(&self, path: &str) -> Option<Vec<u8>> {
        let place = inside(path)?;
        if !self.fs.is_file(&place) {
            return None;
        }
        self.fs.read(&place).ok()
    }

    /// A frame of the last run as the bytes of an Arrow stream, with its column types, labels
    /// and categories (Engine Specification, section 8.3, point 5), or `None` where no
    /// binding of that name held a frame.
    pub fn frame(&self, name: &str) -> Option<Vec<u8>> {
        let frames = self.frames.borrow();
        let (_, frame) = frames.iter().find(|(bound, _)| bound == name)?;
        zeff_columns::write_ipc(&frame.table).ok()
    }

    /// Run the text of `script` (its path in the project). `tell` is given each event as a
    /// line of JSON while the run goes; `cancelled` is asked before each step. The budget is
    /// the project's `memory`, or the browser's default for a device of `asked.device_bytes`.
    /// Tables and frames are printed at `asked.width` characters, or at the engine's 118
    /// where it is 0. With `asked.only`, only the statements that begin on those lines run, in
    /// the order of the script, and the outcome lists them alone. What comes back is the outcome, as a line of
    /// JSON of type `done`.
    pub fn run(
        &self,
        script: &str,
        text: &str,
        asked: &Asked<'_>,
        cancelled: fn() -> bool,
        tell: &dyn Fn(&str),
    ) -> String {
        let Asked {
            device_bytes,
            width,
            only: chosen,
        } = *asked;
        // What this run writes is noted from here (see [`Recording`]).
        self.fs.begin();
        // A run of chosen statements runs the text with the others blanked (see [`only`]).
        let blanked;
        let text = match chosen {
            Some(lines) => {
                blanked = only(script, text, lines);
                blanked.as_str()
            }
            None => text,
        };
        let project = match Project::open(&self.fs, Path::new(ROOT)) {
            Ok(project) => project,
            Err(_) => {
                self.frames.borrow_mut().clear();
                return self.done(
                    1,
                    "",
                    "error[Z0709]: the project's `zeff.toml` could not be read\n",
                    "[]",
                );
            }
        };
        if let Some(said) = another_engine(&project) {
            self.frames.borrow_mut().clear();
            // Told as the engine tells what its check says before the first statement, so
            // that the interface has it as a run the engine refused.
            tell(&format!(
                "{{\"type\": \"output\", \"stdout\": \"\", \"stderr\": {}}}",
                json_string(&said)
            ));
            return self.done(4, "", &said, "[]");
        }
        let defaults = RunOptions::default();
        let options = RunOptions {
            // The project's own `memory` comes first; without one the browser has a default.
            memory: match project.manifest.memory {
                Some(_) => None,
                None => Some(default_budget(device_bytes)),
            },
            width: if width == 0 { defaults.width } else { width },
            ..defaults
        };
        let control = Control::asking(cancelled);
        let listener = |event: &Event| tell(&event_json(event));
        let (outcome, frames) = run_script_keeping(
            &self.fs,
            &project,
            script,
            text,
            &options,
            &control,
            Some(&listener),
        );
        let each = self.each(
            &project,
            script,
            text,
            &outcome.output.statements,
            &outcome.output.memory,
            &frames,
        );
        *self.frames.borrow_mut() = frames;
        *self.last.borrow_mut() = Some((script.to_string(), text.to_string()));
        self.filtered.borrow_mut().take();
        self.kept.borrow_mut().take();
        self.bars.borrow_mut().take();
        self.done(
            outcome.exit_code,
            &outcome.output.stdout,
            &outcome.output.stderr,
            &each,
        )
    }

    /// Rows of a frame of the last run, for the data viewer (#75): the frame's header line as
    /// the engine prints it (`wages · 18,412 rows × 11 variables`); each variable with its type,
    /// its label, its count of missing values, how its cells line up, the small distribution
    /// of its header and, for a whole-number variable of few values, its codes; how many rows
    /// the view keeps; and the rows of the view from `offset`, at most `limit` of them, each
    /// cell written as the engine prints it (a labelled value by its label, a date in ISO form,
    /// a missing value `NA`). The view (see [`Shown`]) is the frame, or the frame kept to the
    /// rows of the last [`Host::filter`], put in order by a variable as `data.sort` puts it and
    /// kept to the rows a search finds. As a line of JSON of type `rows`, or of type `error`
    /// where no binding of the last run held a frame of that name or the sort cannot be made.
    pub fn rows(&self, name: &str, offset: usize, limit: usize, shown: &Shown<'_>) -> String {
        let error = |message: &str| {
            format!(
                "{{\"type\": \"error\", \"message\": {}}}",
                json_string(message)
            )
        };
        let frames = self.frames.borrow();
        let Some((_, frame)) = frames.iter().rev().find(|(bound, _)| bound == name) else {
            return error(&format!("no frame called `{name}` in the last run"));
        };
        let filtered = self.filtered.borrow();
        let (table, condition) = match filtered.as_ref() {
            Some((of, condition, kept)) if shown.filtered && of == name => {
                (&kept.table, condition.as_str())
            }
            _ => (&frame.table, ""),
        };
        let key = format!(
            "{name}\u{0}{condition}\u{0}{:?}\u{0}{}",
            shown.sort, shown.search
        );
        if self
            .kept
            .borrow()
            .as_ref()
            .is_none_or(|(made, _)| *made != key)
        {
            let rows = match view::order(table, shown.sort) {
                Ok(rows) => view::found(table, rows, shown.search),
                Err(message) => return error(&message),
            };
            *self.kept.borrow_mut() = Some((key, rows));
        }
        let base = format!("{name}\u{0}{condition}");
        if self
            .bars
            .borrow()
            .as_ref()
            .is_none_or(|(made, _)| *made != base)
        {
            let drawn = table
                .columns()
                .map(|(_, column)| view::bars(column))
                .collect();
            *self.bars.borrow_mut() = Some((base, drawn));
        }
        let kept = self.kept.borrow();
        let rows_kept = kept.as_ref().map_or(&[][..], |(_, rows)| rows.as_slice());
        let bars = self.bars.borrow();
        let drawn = bars.as_ref().map_or(&[][..], |(_, drawn)| drawn.as_slice());
        let mut variables = Vec::new();
        let mut columns = Vec::new();
        for (index, (variable, column)) in table.columns().enumerate() {
            let right = matches!(
                zeff_core::display::column_alignment(column),
                zeff_core::value::Align::Right
            );
            variables.push(format!(
                "{{\"name\": {}, \"type\": {}, \"label\": {}, \"missing\": {}, \"right\": {right}, \"contrast\": {}, \"bars\": {}, \"codes\": {}}}",
                json_string(variable),
                json_string(column.ty().name()),
                json_string(column.metadata().get(zeff_columns::MetadataKey::Label).unwrap_or("")),
                column.n_missing(),
                column
                    .contrast()
                    .map_or("null".to_string(), |contrast| json_string(contrast.as_str())),
                drawn.get(index).map_or("null", String::as_str),
                view::codes(column),
            ));
            columns.push(column);
        }
        let from = offset.min(rows_kept.len());
        let to = rows_kept.len().min(from.saturating_add(limit));
        let rows: Vec<String> = rows_kept[from..to]
            .iter()
            .map(|&row| {
                let cells: Vec<String> = columns
                    .iter()
                    .map(|column| json_string(&zeff_core::display::labelled_cell(column, row)))
                    .collect();
                format!("[{}]", cells.join(", "))
            })
            .collect();
        format!(
            "{{\"type\": \"rows\", \"name\": {}, \"header\": {}, \"total\": {}, \"kept\": {}, \"offset\": {from}, \"variables\": [{}], \"rows\": [{}]}}",
            json_string(name),
            json_string(&zeff_core::display::frame_header(frame)),
            frame.table.rows(),
            rows_kept.len(),
            variables.join(", "),
            rows.join(", ")
        )
    }

    /// Keep the viewer's frame `name` to the rows of `condition` (#75), by running, as the
    /// engine runs it, the statement `name.where(condition)` after the text of the last run,
    /// with only the statements it needs: what the view then shows is what that statement,
    /// pasted into the script, gives. An empty condition keeps every row. As a line of JSON of
    /// type `filter`: whether it ran, how many rows it kept, and what the engine said of the
    /// statement (a note of rows dropped where the condition was `NA`, or the error that
    /// stopped it), each diagnostic by its first line.
    pub fn filter(&self, name: &str, condition: &str) -> String {
        let answer = |ok: bool, rows: usize, said: &str| {
            format!(
                "{{\"type\": \"filter\", \"ok\": {ok}, \"rows\": {rows}, \"said\": {}}}",
                json_string(said)
            )
        };
        self.kept.borrow_mut().take();
        let condition = condition.trim();
        if condition.is_empty() {
            self.filtered.borrow_mut().take();
            return answer(true, 0, "");
        }
        if condition.contains(['\n', '\r']) {
            return answer(false, 0, "a condition is one line");
        }
        let Some((script, text)) = self.last.borrow().clone() else {
            return answer(false, 0, "run the script first");
        };
        let mut composed = text.clone();
        if !composed.is_empty() && !composed.ends_with('\n') {
            composed.push('\n');
        }
        let line = u32::try_from(composed.lines().count() + 1).unwrap_or(u32::MAX);
        composed.push_str(&format!("let {FILTERED} = {name}.where({condition})\n"));
        let Ok(project) = Project::open(&self.fs, Path::new(ROOT)) else {
            return answer(false, 0, "the project's `zeff.toml` could not be read");
        };
        if let Some(said) = another_engine(&project) {
            return answer(false, 0, first_line(&said));
        }
        let needs = self.needed(&project, &script, &composed, line);
        let text = only(&script, &composed, &needs);
        let options = RunOptions {
            memory: match project.manifest.memory {
                Some(_) => None,
                None => Some(default_budget(None)),
            },
            ..RunOptions::default()
        };
        let control = Control::asking(never);
        let (outcome, frames) =
            run_script_keeping(&self.fs, &project, &script, &text, &options, &control, None);
        let said = outcome
            .output
            .statements
            .iter()
            .find(|one| one.line == line)
            .map_or(outcome.output.stderr.as_str(), |one| one.stderr.as_str());
        let headlines: Vec<&str> = said
            .lines()
            .filter(|line| {
                ["error", "warning", "note"]
                    .iter()
                    .any(|kind| line.starts_with(kind))
            })
            .collect();
        let said = headlines.join("\n");
        match frames.into_iter().find(|(bound, _)| bound == FILTERED) {
            Some((_, frame)) => {
                let rows = frame.table.rows();
                *self.filtered.borrow_mut() =
                    Some((name.to_string(), condition.to_string(), frame));
                answer(true, rows, &said)
            }
            None => answer(false, 0, &said),
        }
    }

    /// The bug report of a script's failure, as `zeff report-bug` builds it (Language Reference,
    /// section 11.1; the Zemp Specification, section 5, "Report a problem"): the engine runs
    /// the script, keeps the failing statement and only the statements it needs, runs them
    /// alone to see that they fail in the same way, and writes what went wrong, the engine's
    /// version and `platform`, those statements, and the schema of the data, never a row. The
    /// report is built here and written nowhere: the interface shows it whole and the user
    /// saves it, and nothing is sent. As a line of JSON of type `report`: the report's file
    /// name, its text, its kind and code, how many statements it keeps of how many; or, where
    /// there is nothing to report, why, in the engine's words (its first line).
    pub fn report(&self, script: &str, text: &str, platform: &str) -> String {
        self.report_with(script, text, platform, None)
    }

    /// [`Host::report`] with the engine's test hook, which plants an internal error at the
    /// statement on `line`; for tests alone, as the engine's own tests use it.
    pub fn report_planted(&self, script: &str, text: &str, platform: &str, line: u32) -> String {
        self.report_with(script, text, platform, Some(line))
    }

    fn report_with(
        &self,
        script: &str,
        text: &str,
        platform: &str,
        planted: Option<u32>,
    ) -> String {
        use zeff_engine::bug_report::{self, Asked};
        let none = |message: &str| {
            format!(
                "{{\"type\": \"report\", \"ok\": false, \"message\": {}}}",
                json_string(message)
            )
        };
        let Ok(project) = Project::open(&self.fs, Path::new(ROOT)) else {
            return none("the project's `zeff.toml` could not be read");
        };
        if let Some(said) = another_engine(&project) {
            return none(first_line(&said));
        }
        let options = RunOptions {
            memory: match project.manifest.memory {
                Some(_) => None,
                None => Some(default_budget(None)),
            },
            panic_at_line: planted,
            ..RunOptions::default()
        };
        let asked = Asked {
            script,
            text,
            line: None,
            reference: None,
            include_data: false,
            synthetic: false,
            trials: bug_report::TRIALS,
            platform,
            options,
        };
        match bug_report::build(&self.fs, &project, &asked) {
            Ok(report) => format!(
                "{{\"type\": \"report\", \"ok\": true, \"kind\": {}, \"code\": {}, \"name\": {}, \"text\": {}, \"kept\": {}, \"of\": {}, \"reduced\": {}}}",
                json_string(report.kind.name()),
                report
                    .code
                    .as_deref()
                    .map_or("null".to_string(), json_string),
                json_string(&report.name),
                json_string(&report.text),
                report.kept,
                report.of,
                report.reduced
            ),
            Err(why) => none(why.to_string().lines().next().unwrap_or_default()),
        }
    }

    /// The bindings of a text with their types, as `zeff repl`'s `:vars` lists those of its
    /// session: each name once, with the type the engine's checker gives it now (a later `let`
    /// shadows an earlier one), the names lined up, in the order they were last bound; only
    /// the bindings of the text's top level, which a statement after it can read. As a line of
    /// JSON of type `vars`: what is printed, and what is said where there is no binding.
    pub fn vars(&self, script: &str, text: &str) -> String {
        let answer = |printed: &str, said: &str| {
            format!(
                "{{\"type\": \"vars\", \"printed\": {}, \"said\": {}}}",
                json_string(printed),
                json_string(said)
            )
        };
        let none = "no bindings yet: `let name = ...` makes one\n";
        let Ok(project) = Project::open(&self.fs, Path::new(ROOT)) else {
            return answer("", "error: the project's `zeff.toml` could not be read\n");
        };
        if let Some(said) = another_engine(&project) {
            return answer("", &said);
        }
        let Ok(registry) = zeff_engine::registry::registry() else {
            return answer("", none);
        };
        let program = check_in_project(&self.fs, &project, script, text, registry)
            .checked
            .program;
        let mut bindings: Vec<&zeff_ir::Binding> = Vec::new();
        for statement in &program.statements {
            if let Statement::Let { binding, .. } = statement
                && let Some(binding) = program.bindings.get(*binding)
            {
                bindings.retain(|b| b.name != binding.name);
                bindings.push(binding);
            }
        }
        if bindings.is_empty() {
            return answer("", none);
        }
        let width = bindings
            .iter()
            .map(|b| b.name.chars().count())
            .max()
            .unwrap_or(0);
        let printed: String = bindings
            .iter()
            .map(|binding| format!("{:width$}  {}\n", binding.name, binding.ty))
            .collect();
        answer(&printed, "")
    }

    /// The lines of every statement the statement on `line` needs to run as it would, itself
    /// included, from the engine's dependency graph.
    fn needed(&self, project: &Project, script: &str, text: &str, line: u32) -> Vec<u32> {
        let Ok(registry) = zeff_engine::registry::registry() else {
            return vec![line];
        };
        let program = check_in_project(&self.fs, project, script, text, registry)
            .checked
            .program;
        let graph = graph(&program, script);
        let line_of = |index: usize| position(text, graph.statements[index].span.start).line + 1;
        match (0..graph.statements.len()).find(|&index| line_of(index) == line) {
            Some(index) => graph
                .needed_by(index)
                .statements
                .iter()
                .map(|&index| line_of(index))
                .collect(),
            None => vec![line],
        }
    }

    /// The help page of a function, as `zeff help <name>` prints it inside this project: a
    /// function of the project's modules first, then the engine's own; as a line of JSON of type
    /// `help`, with the page, or the engine's sentence where there is none.
    pub fn help(&self, name: &str) -> String {
        let Ok(registry) = zeff_engine::registry::registry() else {
            return "{\"type\": \"help\", \"page\": null, \"message\": \"\"}".to_string();
        };
        let own = Project::open(&self.fs, Path::new(ROOT))
            .ok()
            .and_then(|project| {
                zeff_engine::help::project_help(&self.fs, &project, registry, name)
            });
        let found = match own {
            Some(page) => Ok(page),
            None => zeff_engine::help::help_text(registry, name),
        };
        match found {
            Ok(page) => format!(
                "{{\"type\": \"help\", \"page\": {}, \"message\": \"\"}}",
                json_string(&page)
            ),
            Err(message) => format!(
                "{{\"type\": \"help\", \"page\": null, \"message\": {}}}",
                json_string(&message)
            ),
        }
    }

    /// One message of the Language Server Protocol (its body, a JSON object) given to the
    /// engine's own language server, as `zeff lsp` serves an editor; what it answers, the bodies
    /// of the messages to send back in order, as a JSON array of texts. A document is named by
    /// a `file:///project/…` address, where this host keeps the project.
    pub fn language(&self, body: &str) -> String {
        let answer = self.language.borrow_mut().handle(&self.fs, body.as_bytes());
        let messages: Vec<String> = answer.messages.iter().map(|one| json_string(one)).collect();
        format!("[{}]", messages.join(", "))
    }

    /// The engine's check of the text of `script`, as `zeff check` makes it, as a line of
    /// JSON of type `checked`: its exit code; all it says, as `zeff check` writes it (`said`),
    /// and that in two parts, what it found (`found`) and its last line (`summary`); and each
    /// finding as the engine's JSON record (`findings`).
    pub fn check(&self, script: &str, text: &str) -> String {
        let project = match Project::open(&self.fs, Path::new(ROOT)) {
            Ok(project) => project,
            Err(_) => {
                return format!(
                    "{{\"type\": \"checked\", \"exit_code\": 1, \"said\": {0}, \"found\": {0}, \"summary\": \"\", \"findings\": [], \"ranges\": []}}",
                    json_string("error[Z0709]: the project's `zeff.toml` could not be read\n")
                );
            }
        };
        if let Some(said) = another_engine(&project) {
            return format!(
                "{{\"type\": \"checked\", \"exit_code\": 4, \"said\": {0}, \"found\": {0}, \"summary\": \"\", \"findings\": [], \"ranges\": []}}",
                json_string(&said)
            );
        }
        let registry = match zeff_engine::registry::registry() {
            Ok(registry) => registry,
            Err(_) => {
                return "{\"type\": \"checked\", \"exit_code\": 2, \"said\": \"\", \"found\": \"\", \"summary\": \"\", \"findings\": [], \"ranges\": []}".to_string();
            }
        };
        let in_project = check_in_project(&self.fs, &project, script, text, registry);
        let mut sources = Sources::new();
        sources.add(Source::new(script.to_string(), text.to_string()));
        for module in in_project.module_sources {
            sources.add(module);
        }
        let diagnostics: Vec<Diagnostic> = in_project.checked.diagnostics.into_vec();
        let count = |severity: Severity| {
            diagnostics
                .iter()
                .filter(|one| one.severity == severity)
                .count()
        };
        let (errors, warnings) = (count(Severity::Error), count(Severity::Warning));
        let found: Vec<String> = diagnostics.iter().map(|one| one.render(&sources)).collect();
        let plural = |n: usize, word: &str| {
            if n == 1 {
                format!("{n} {word}")
            } else {
                format!("{n} {word}s")
            }
        };
        let summary = if errors == 0 && warnings == 0 {
            format!("checked {script}: no problems")
        } else {
            format!(
                "{script}: {}, {}",
                plural(errors, "error"),
                plural(warnings, "warning")
            )
        };
        let records: Vec<String> = diagnostics
            .iter()
            .map(|one| one.to_json(&sources))
            .collect();
        let found = found.join("\n");
        // `zeff check` sets its last line apart by a blank line where it found an error or a
        // warning, and writes it straight after a note.
        let said = if found.is_empty() {
            format!("{summary}\n")
        } else if errors + warnings > 0 {
            format!("{found}\n{summary}\n")
        } else {
            format!("{found}{summary}\n")
        };
        format!(
            "{{\"type\": \"checked\", \"exit_code\": {}, \"said\": {}, \"found\": {}, \"summary\": {}, \"findings\": [{}], \"ranges\": {}}}",
            i32::from(errors > 0),
            json_string(&said),
            json_string(&found),
            json_string(&summary),
            records.join(", "),
            ranges_json(script, text)
        )
    }

    /// What each statement of the text needs, from the engine's dependency graph
    /// (`zeff_engine::dependencies`), as a line of JSON of type `dependencies`: for each
    /// top-level statement, the line it begins on, the name it makes, the lines of the
    /// statements it reads from, whether it sets the seed, and the lines of every statement it
    /// needs to run as it ran, itself included. The graph does not see a statement that reads
    /// a file another one writes.
    pub fn dependencies(&self, script: &str, text: &str) -> String {
        let empty = "{\"type\": \"dependencies\", \"statements\": []}".to_string();
        let Ok(project) = Project::open(&self.fs, Path::new(ROOT)) else {
            return empty;
        };
        let Ok(registry) = zeff_engine::registry::registry() else {
            return empty;
        };
        let program = check_in_project(&self.fs, &project, script, text, registry)
            .checked
            .program;
        let graph = graph(&program, script);
        let line = |index: usize| position(text, graph.statements[index].span.start).line + 1;
        let lines = |indices: &[usize]| {
            indices
                .iter()
                .map(|index| line(*index).to_string())
                .collect::<Vec<_>>()
                .join(", ")
        };
        let listed: Vec<String> = graph
            .statements
            .iter()
            .enumerate()
            .map(|(index, node)| {
                let makes = node
                    .defines
                    .and_then(|binding| program.bindings.get(binding))
                    .map_or("null".to_string(), |binding| json_string(&binding.name));
                format!(
                    "{{\"line\": {}, \"makes\": {makes}, \"reads\": [{}], \"seeds\": {}, \"needs\": [{}]}}",
                    line(index),
                    lines(&node.reads),
                    node.seeds,
                    lines(&graph.needed_by(index).statements)
                )
            })
            .collect();
        format!(
            "{{\"type\": \"dependencies\", \"statements\": [{}]}}",
            listed.join(", ")
        )
    }

    /// For each statement of the text, in order, as a JSON array: where it begins and ends;
    /// the name it binds and the type the engine names for what it makes, from the check;
    /// whether it ran, and what it printed and said; for a frame bound by `let`, its rows and
    /// variables, and the memory the engine counts for it (Engine Specification, section 8.3,
    /// point 7). Every word and number is the engine's.
    fn each(
        &self,
        project: &Project,
        script: &str,
        text: &str,
        outputs: &[StatementOutput],
        memory: &[MemoryNote],
        frames: &Frames,
    ) -> String {
        let made = match zeff_engine::registry::registry() {
            Ok(registry) => made(
                &check_in_project(&self.fs, project, script, text, registry)
                    .checked
                    .program,
                text,
            ),
            Err(_) => Vec::new(),
        };
        // The frames come back in the order they were bound, so the lets that made them are
        // matched to them in order, by name.
        let mut unmatched = frames.iter().peekable();
        let mut listed = Vec::new();
        for statement in statements(script, text) {
            let (name, ty) = made
                .iter()
                .find(|(line, _, _)| *line == statement.line)
                .map(|(_, name, ty)| (name.clone(), ty.clone()))
                .unwrap_or((None, None));
            let output = outputs.iter().find(|one| one.line == statement.line);
            let mut frame = "null".to_string();
            if let Some(name) = &name
                && unmatched.peek().is_some_and(|(bound, _)| bound == name)
                && let Some((_, kept)) = unmatched.next()
            {
                frame = format!(
                    "{{\"rows\": {}, \"variables\": {}}}",
                    kept.table.rows(),
                    kept.table.names().len()
                );
            }
            let held = memory.iter().find_map(|note| match note {
                MemoryNote::Bound {
                    name: bound,
                    line,
                    own,
                    kept,
                } if *line == statement.line && Some(bound) == name.as_ref() => {
                    Some(format!("{{\"own\": {own}, \"kept\": {kept}}}"))
                }
                _ => None,
            });
            let text_of = |value: &Option<String>| match value {
                Some(value) => json_string(value),
                None => "null".to_string(),
            };
            listed.push(format!(
                "{{\"line\": {}, \"end\": {}, \"kind\": \"{}\", \"name\": {}, \"type\": {}, \"ran\": {}, \"stdout\": {}, \"stderr\": {}, \"frame\": {frame}, \"memory\": {}}}",
                statement.line,
                statement.end,
                statement.kind,
                text_of(&name),
                text_of(&ty),
                output.is_some(),
                json_string(output.map_or("", |one| one.stdout.as_str())),
                json_string(output.map_or("", |one| one.stderr.as_str())),
                held.unwrap_or_else(|| "null".to_string()),
            ));
        }
        format!("[{}]", listed.join(", "))
    }

    /// The outcome of a run as a line of JSON, with each statement (see [`Host::each`]) and
    /// the frames its bindings hold: each by name with its rows and variables, which is what
    /// an interface lists before it asks for one.
    fn done(&self, exit_code: i32, stdout: &str, stderr: &str, statements: &str) -> String {
        let frames: Vec<String> = self
            .frames
            .borrow()
            .iter()
            .map(|(name, frame)| {
                format!(
                    "{{\"name\": {}, \"rows\": {}, \"variables\": {}}}",
                    json_string(name),
                    frame.table.rows(),
                    frame.table.names().len()
                )
            })
            .collect();
        // The files the run wrote, by their paths from the project's folder; the engine's own
        // folder, `.zeff/`, is rebuilt on every run and is not the project's to keep.
        let written: Vec<String> = self
            .fs
            .written()
            .iter()
            .filter_map(|path| path.strip_prefix(ROOT).ok())
            .map(|path| path.to_string_lossy().replace('\\', "/"))
            .filter(|path| !path.is_empty() && path != ".zeff" && !path.starts_with(".zeff/"))
            .map(|path| json_string(&path))
            .collect();
        format!(
            "{{\"type\": \"done\", \"exit_code\": {exit_code}, \"stdout\": {}, \"stderr\": {}, \"statements\": {statements}, \"frames\": [{}], \"written\": [{}]}}",
            json_string(stdout),
            json_string(stderr),
            frames.join(", "),
            written.join(", ")
        )
    }
}
