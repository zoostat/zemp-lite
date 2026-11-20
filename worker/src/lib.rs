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
use zeff_engine::fs::{FileSystem, MemoryFileSystem};
use zeff_engine::interpreter::{MemoryNote, StatementOutput};
use zeff_engine::language::outline::statements_in;
use zeff_engine::language::{Position, Range, offset, position};
use zeff_engine::project::Project;
use zeff_engine::run::{Frames, RunOptions, check_in_project, run_script_keeping};
use zeff_ir::{Program, Statement, Ty};
use zeff_web::{default_budget, event_json};

#[cfg(target_arch = "wasm32")]
mod browser;

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

/// A project in memory, and the runs made in it.
pub struct Host {
    fs: MemoryFileSystem,
    /// The engine's language server (`zeff-lsp`), over the project as this host holds it.
    language: RefCell<zeff_lsp::Server>,
    /// The frames the bindings of the last run held when it ended, for the interface to show.
    frames: RefCell<Frames>,
}

impl Host {
    /// A project called `name`, pinned to this engine, with nothing in it yet.
    pub fn new(name: &str) -> Host {
        let fs = MemoryFileSystem::new();
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
        self.done(
            outcome.exit_code,
            &outcome.output.stdout,
            &outcome.output.stderr,
            &each,
        )
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
        format!(
            "{{\"type\": \"done\", \"exit_code\": {exit_code}, \"stdout\": {}, \"stderr\": {}, \"statements\": {statements}, \"frames\": [{}]}}",
            json_string(stdout),
            json_string(stderr),
            frames.join(", ")
        )
    }
}
