//! The Zeff engine as Zemp's worker (Zemp Specification, section 3: "the engine runs in its
//! own worker, so the interface never freezes"; Engine and Project Specification, section
//! 8.3, point 7).
//!
//! A [`Host`] is one project held in memory. The interface gives it the project's files, asks
//! it to run a script, and is told the run's steps and what it prints as it goes, each as one
//! line of JSON, then its outcome: this much is the host of the engine's own browser build
//! (`zeff-web`), whose events and default memory budget are used as they are. One thing is
//! added. A file of the project is given back, so that the interface can read what a run
//! wrote: at Zeff 0.7.0 a figure leaves the engine only as a file `export` writes
//! (docs/decisions.md, 15 November 2026).
//!
//! The functions here are plain Rust and are tested natively; `browser` binds them for
//! WebAssembly, and `js/` holds the worker script that carries the messages.

use std::cell::RefCell;
use std::path::{Component, Path, PathBuf};
use zeff_diagnostics::json_string;
use zeff_engine::control::{Control, Event};
use zeff_engine::fs::{FileSystem, MemoryFileSystem};
use zeff_engine::project::Project;
use zeff_engine::run::{Frames, RunOptions, run_script_keeping};
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

/// A project in memory, and the runs made in it.
pub struct Host {
    fs: MemoryFileSystem,
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
    /// the project's `memory`, or the browser's default for a device of `device_bytes`. What
    /// comes back is the outcome, as a line of JSON of type `done`.
    pub fn run(
        &self,
        script: &str,
        text: &str,
        device_bytes: Option<u64>,
        cancelled: fn() -> bool,
        tell: &dyn Fn(&str),
    ) -> String {
        let project = match Project::open(&self.fs, Path::new(ROOT)) {
            Ok(project) => project,
            Err(_) => {
                self.frames.borrow_mut().clear();
                return self.done(
                    1,
                    "",
                    "error[Z0709]: the project's `zeff.toml` could not be read\n",
                );
            }
        };
        let options = RunOptions {
            // The project's own `memory` comes first; without one the browser has a default.
            memory: match project.manifest.memory {
                Some(_) => None,
                None => Some(default_budget(device_bytes)),
            },
            ..RunOptions::default()
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
        *self.frames.borrow_mut() = frames;
        self.done(
            outcome.exit_code,
            &outcome.output.stdout,
            &outcome.output.stderr,
        )
    }

    /// The outcome of a run as a line of JSON, with the frames its bindings hold: each by
    /// name with its rows and variables, which is what an interface lists before it asks for
    /// one.
    fn done(&self, exit_code: i32, stdout: &str, stderr: &str) -> String {
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
            "{{\"type\": \"done\", \"exit_code\": {exit_code}, \"stdout\": {}, \"stderr\": {}, \"frames\": [{}]}}",
            json_string(stdout),
            json_string(stderr),
            frames.join(", ")
        )
    }
}
