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
use zeff_engine::interpreter::{MemoryNote, Output, PlotMade};
use zeff_engine::language::outline::{sections_of, statements_in};
use zeff_engine::language::{Position, Range, offset, position};
use zeff_engine::project::Project;
use zeff_engine::run::{
    Frames, RunOptions, check_in_project, run_script_keeping, run_script_showing,
};
use zeff_engine::statements::statement_facts;
use zeff_ir::Statement;
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

/// A section of a script (open decision #178): the line of its heading and its last line,
/// counted from 1, its level (1 for `// # Title`, 2 for `// ## Title`) and its title.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Sectioned {
    pub line: u32,
    pub end: u32,
    pub level: u8,
    pub title: String,
}

/// The sections of a text, in the order written, as the engine reads them (`sections_of`,
/// from Zeff 0.9.0: what its language server reports as the outline of a document). A
/// heading counts where it stands between the statements of the script. Until release 0.3
/// the interface read the comments itself.
pub fn sections(script: &str, text: &str) -> Vec<Sectioned> {
    sections_of(script, text)
        .into_iter()
        .map(|section| Sectioned {
            line: section.line + 1,
            end: section.end_line + 1,
            level: section.level,
            title: section.title,
        })
        .collect()
}

/// The statements of a text as a line of JSON of type `statements`, with its sections: both
/// are the engine's reading of the same text, asked for by one question.
pub fn statements_json(script: &str, text: &str) -> String {
    let sections: Vec<String> = sections(script, text)
        .iter()
        .map(|one| {
            format!(
                "{{\"line\": {}, \"end\": {}, \"level\": {}, \"title\": {}}}",
                one.line,
                one.end,
                one.level,
                json_string(&one.title)
            )
        })
        .collect();
    format!(
        "{{\"type\": \"statements\", \"statements\": {}, \"sections\": [{}]}}",
        ranges_json(script, text),
        sections.join(", ")
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

/// What a statement printed: the line it begins on, its output as the run printed it, and the
/// values in it with their places.
type Printed = (u32, String, Vec<zeff_core::runtime::Shown>);

/// The script an example of Help is run as: the name the engine runs the examples of its own
/// pages under, which is the name a diagnostic of an example shows.
pub const EXAMPLES_SCRIPT: &str = "examples.zeff";

/// The narrowest page a print is made for, as `--width` has it.
const NARROWEST: usize = 40;

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
    /// What each statement of the last run printed, by the line it begins on, with the values
    /// it printed and their places in it: what its print is made again from at another width,
    /// without a new run (open decision #175, C6; from Zeff 0.9.0).
    prints: RefCell<Vec<Printed>>,
    /// The plots the statements of the last run made, each with the line of its statement and
    /// the name that binds it where one does: what a figure is laid out from at the size of
    /// its place, without a new run (open decision #197; from Zeff 0.9.0).
    plots: RefCell<Vec<PlotMade>>,
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
            prints: RefCell::default(),
            plots: RefCell::default(),
            filtered: RefCell::default(),
            kept: RefCell::default(),
            bars: RefCell::default(),
        }
    }

    /// The session of an example of Help (Zemp Lite 0.3, step 8; open decision #211): a
    /// project of its own in memory, which is the engine's own project for the examples of
    /// its pages, made as `zeff_engine::examples::fixture_project` makes it: called
    /// `examples`, with the small files the pages read under `data/` and the clock of the
    /// examples (1 November 2026, 09:30), so that an example prints here what its page says.
    /// It sees the datasets the engine ships and nothing of a reader's project: no frame, no
    /// name, no file. What an example writes is written into this session's own memory, and
    /// is gone with it. An example is run as [`EXAMPLES_SCRIPT`], the name the engine's pages
    /// were made under.
    pub fn examples() -> Host {
        let host = Host::new("examples");
        host.fs.set_clock(zeff_engine::examples::EXAMPLES_CLOCK);
        for (name, bytes) in zeff_engine::examples::FIXTURE_FILES {
            host.fs.add_file(format!("{ROOT}/data/{name}"), bytes);
        }
        host
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
                self.prints.borrow_mut().clear();
                self.plots.borrow_mut().clear();
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
            self.prints.borrow_mut().clear();
            self.plots.borrow_mut().clear();
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
        let (outcome, showing) = run_script_showing(
            &self.fs,
            &project,
            script,
            text,
            &options,
            &control,
            Some(&listener),
        );
        let each = self.each(&project, script, text, &outcome.output);
        *self.frames.borrow_mut() = showing.frames;
        *self.plots.borrow_mut() = showing.plots;
        *self.prints.borrow_mut() = outcome
            .output
            .statements
            .iter()
            .zip(showing.prints)
            .map(|(statement, shown)| (statement.line, statement.stdout.clone(), shown))
            .collect();
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

    /// Whether the engine's last run was of this text: the text itself, or the text with lines
    /// after it (a line of the console, or the run the interface makes of a script with
    /// `export`s added, whose statements stand on the same lines). What the run kept (its
    /// prints, its plots) is then the page's; after a run of some statements alone, or in a
    /// project opened afresh, it is not.
    fn holds(&self, script: &str, text: &str) -> bool {
        match self.last.borrow().as_ref() {
            Some((ran, kept)) => ran == script && kept.starts_with(text),
            None => false,
        }
    }

    /// The plot the statement on `line` of the last run made, as an SVG on a page `width` by
    /// `height` millimetres, without a new run (open decision #197; Zemp Specification,
    /// section 7, "Redraw to fit"): the engine's own layout and writer, those of `export`, so
    /// that at a size it is, byte for byte, the file `export(..., size: [width, height])`
    /// writes; the millimetres become points as `export` makes them (72 to the inch of 25.4,
    /// multiplied before divided). The plot has the theme its script gave it.
    ///
    /// A line of JSON of type `plot`: with `svg`, the figure; or with `svg` null and
    /// `message`, the engine's words where it will not draw the plot at that size (`of_size`
    /// says whether the size is at fault, as a pane too small for the labels, or the plot);
    /// or with `held` false, where the engine does not hold a plot for that statement of this
    /// text. `ran` says which of the two it is: false where the engine's last run was not of
    /// this text (see [`Host::holds`]), so that a run of it would bring the plot; true where
    /// it was and the statement gave no plot of its own (as a list of plots), which the
    /// interface draws as it did before this was there, by a run with an `export`.
    pub fn plot_svg(&self, script: &str, text: &str, line: u32, width: f64, height: f64) -> String {
        let none = |ran: bool| {
            format!(
                "{{\"type\": \"plot\", \"line\": {line}, \"ran\": {ran}, \"held\": false, \"svg\": null, \"message\": \"\", \"of_size\": false}}"
            )
        };
        if !self.holds(script, text) {
            return none(false);
        }
        let plots = self.plots.borrow();
        let Some(made) = plots.iter().find(|made| made.line == line) else {
            return none(true);
        };
        let points = |millimetres: f64| millimetres * 72.0 / 25.4;
        match zeff_plot::figure::svg_at(&made.plot, points(width), points(height), None) {
            Ok(svg) => format!(
                "{{\"type\": \"plot\", \"line\": {line}, \"ran\": true, \"held\": true, \"svg\": {}, \"message\": \"\", \"of_size\": false}}",
                json_string(&svg)
            ),
            Err(problem) => format!(
                "{{\"type\": \"plot\", \"line\": {line}, \"ran\": true, \"held\": true, \"svg\": null, \"message\": {}, \"of_size\": {}}}",
                json_string(&problem.message),
                problem.of_size
            ),
        }
    }

    /// What each statement of the last run printed, made again at `width` characters without a
    /// new run (open decision #175, C6; Zemp Specification, section 5, the opened result):
    /// every frame and table it printed wraps at that width, and everything else is as it
    /// was. The text of each is what `zeff run --width <width>` prints for that statement,
    /// character for character, by the engine's own `printed_at`.
    ///
    /// The prints the engine holds are those of its last run, and are given only where that
    /// run was of this text: the text itself, or the text with lines after it (a run the
    /// interface made of the same script to draw its figures, whose statements stand on the
    /// same lines). Where it was another (a run of some statements alone, a console line, a
    /// project opened afresh), `statements` is `null`, and the interface runs the text again
    /// as it did before this was there. A line of JSON of type `printed`, or of type `error`
    /// for a width under 40.
    pub fn printed_at(&self, script: &str, text: &str, width: usize) -> String {
        if width < NARROWEST {
            return format!(
                "{{\"type\": \"error\", \"message\": {}}}",
                json_string(&format!(
                    "a print is at least {NARROWEST} characters wide, and {width} was asked for"
                ))
            );
        }
        if !self.holds(script, text) {
            return format!("{{\"type\": \"printed\", \"width\": {width}, \"statements\": null}}");
        }
        let listed: Vec<String> = self
            .prints
            .borrow()
            .iter()
            .map(|(line, stdout, shown)| {
                format!(
                    "{{\"line\": {line}, \"stdout\": {}}}",
                    json_string(&zeff_core::runtime::printed_at(stdout, shown, width))
                )
            })
            .collect();
        format!(
            "{{\"type\": \"printed\", \"width\": {width}, \"statements\": [{}]}}",
            listed.join(", ")
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
                "{{\"name\": {}, \"type\": {}, \"label\": {}, \"unit\": {}, \"measure\": {}, \"ordered\": {}, \"missing\": {}, \"right\": {right}, \"contrast\": {}, \"bars\": {}, \"codes\": {}}}",
                json_string(variable),
                json_string(column.ty().name()),
                json_string(column.metadata().get(zeff_columns::MetadataKey::Label).unwrap_or("")),
                // The unit and the measure the data carries (Language Reference, section 4.3),
                // empty where it carries none; and whether a category's levels are in an order.
                json_string(column.metadata().get(zeff_columns::MetadataKey::Unit).unwrap_or("")),
                json_string(
                    column
                        .metadata()
                        .get(zeff_columns::MetadataKey::Measure)
                        .unwrap_or("")
                ),
                column.is_ordered(),
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
    /// the name it binds; whether it ran, and what it printed and said; the type of what it
    /// made and its dimensions (the rows and columns of a frame or a table, the length of a
    /// column or a list, the observations of a fit or a test); for a frame bound by `let`,
    /// its rows and variables, and the memory the engine counts for it (Engine Specification,
    /// section 8.3, point 7); and, where it stopped the run, the engine's record of the error.
    /// Every word and number is the engine's own fact of the statement (open decision #175,
    /// C5 and C22, from Zeff 0.9.0: `zeff_engine::statements`), as the engine's own host for
    /// the browser reads them: the script is checked in the project and the run's record is
    /// set beside it. Until release 0.3 the worker read the name and the type from the checked
    /// program itself and matched the frames to their statements by their order.
    fn each(&self, project: &Project, script: &str, text: &str, output: &Output) -> String {
        let facts = match zeff_engine::registry::registry() {
            Ok(registry) => statement_facts(
                &check_in_project(&self.fs, project, script, text, registry)
                    .checked
                    .program,
                script,
                text,
                registry,
                output,
            ),
            Err(_) => Vec::new(),
        };
        let mut listed = Vec::new();
        for statement in statements(script, text) {
            let fact = facts.iter().find(|one| one.line == statement.line);
            let name = fact.and_then(|one| one.name.clone());
            let result = fact.and_then(|one| one.result.as_ref());
            let frame = match result {
                Some(made) if made.ty == "Frame" && name.is_some() => format!(
                    "{{\"rows\": {}, \"variables\": {}}}",
                    made.rows.unwrap_or(0),
                    made.columns.unwrap_or(0)
                ),
                _ => "null".to_string(),
            };
            let held = output.memory.iter().find_map(|note| match note {
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
            let text_of = |value: Option<&str>| match value {
                Some(value) => json_string(value),
                None => "null".to_string(),
            };
            let count = |value: Option<u64>| match value {
                Some(value) => value.to_string(),
                None => "null".to_string(),
            };
            listed.push(format!(
                "{{\"line\": {}, \"end\": {}, \"kind\": \"{}\", \"name\": {}, \"type\": {}, \"ran\": {}, \"stdout\": {}, \"stderr\": {}, \"frame\": {frame}, \"memory\": {}, \"rows\": {}, \"columns\": {}, \"length\": {}, \"n\": {}, \"error\": {}}}",
                statement.line,
                statement.end,
                statement.kind,
                text_of(name.as_deref()),
                text_of(result.map(|made| made.ty.as_str())),
                fact.is_some_and(|one| one.ran),
                json_string(fact.map_or("", |one| one.stdout.as_str())),
                json_string(fact.map_or("", |one| one.stderr.as_str())),
                held.unwrap_or_else(|| "null".to_string()),
                count(result.and_then(|made| made.rows)),
                count(result.and_then(|made| made.columns)),
                count(result.and_then(|made| made.length)),
                count(result.and_then(|made| made.n)),
                // The engine's record of the error is a line of JSON already.
                fact.and_then(|one| one.error.clone())
                    .unwrap_or_else(|| "null".to_string()),
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
        // The plots the statements made, as the engine's own host for the browser lists them:
        // each with the line of its statement, the name that binds it where one does, its
        // kind (the marks of its layers) and its theme.
        let plots: Vec<String> = self
            .plots
            .borrow()
            .iter()
            .map(|made| {
                let mut marks: Vec<&str> = Vec::new();
                for layer in &made.plot.layers {
                    let mark = layer.mark.name();
                    if !marks.contains(&mark) {
                        marks.push(mark);
                    }
                }
                format!(
                    "{{\"line\": {}, \"name\": {}, \"kind\": {}, \"theme\": {}}}",
                    made.line,
                    made.name.as_deref().map_or("null".to_string(), json_string),
                    json_string(&marks.join(", ")),
                    json_string(made.plot.theme.name.name())
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
            "{{\"type\": \"done\", \"exit_code\": {exit_code}, \"stdout\": {}, \"stderr\": {}, \"statements\": {statements}, \"frames\": [{}], \"plots\": [{}], \"written\": [{}]}}",
            json_string(stdout),
            json_string(stderr),
            frames.join(", "),
            plots.join(", "),
            written.join(", ")
        )
    }
}
