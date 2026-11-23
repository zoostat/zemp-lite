//! The bindings of the WebAssembly build: what the worker script calls, and what it must
//! provide.
//!
//! `wasm-bindgen` generates code that uses `unsafe`, which the rest of the package denies;
//! the permission is given here and nowhere else.
#![allow(unsafe_code)]

use wasm_bindgen::prelude::wasm_bindgen;

/// The machine a report names, as `zeff report-bug` names its own (`aarch64 macos`): the
/// engine's build for the browser, which knows no more of the machine than that.
const PLATFORM: &str = "wasm32 browser";

#[wasm_bindgen]
extern "C" {
    /// The worker script's `zeffHost.event`: one event of the run, as a line of JSON.
    #[wasm_bindgen(js_namespace = zeffHost, js_name = event)]
    fn host_event(json: &str);

    /// The worker script's `zeffHost.cancelled`: whether the interface has set the flag the
    /// two share.
    #[wasm_bindgen(js_namespace = zeffHost, js_name = cancelled)]
    fn host_cancelled() -> bool;
}

fn cancelled() -> bool {
    host_cancelled()
}

/// A project in the worker's memory.
#[wasm_bindgen]
pub struct Project {
    host: crate::Host,
}

#[wasm_bindgen]
impl Project {
    #[wasm_bindgen(constructor)]
    pub fn new(name: &str) -> Project {
        Project {
            host: crate::Host::new(name),
        }
    }

    /// Put a file into the project, by its path from the project's folder; `false` for a
    /// path that would leave the project.
    pub fn add_file(&self, path: &str, bytes: &[u8]) -> bool {
        self.host.add_file(path, bytes)
    }

    /// Forget a file of the project, or a folder with all it holds: one the reader renamed,
    /// moved or deleted. Whether there was one to forget.
    pub fn remove(&self, path: &str) -> bool {
        self.host.remove(path)
    }

    /// A file of the project as its bytes, or nothing where there is none of that path.
    pub fn file(&self, path: &str) -> Option<Vec<u8>> {
        self.host.file(path)
    }

    /// Run a script. `device_bytes` is the memory the device reports, or 0 where it reports
    /// none; `width` the width tables are printed at, or 0 for the engine's own; `only`, where
    /// given, the lines of the statements to run alone. The events go to `zeffHost.event`;
    /// the outcome comes back as a line of JSON.
    pub fn run(
        &self,
        script: &str,
        text: &str,
        device_bytes: f64,
        width: u32,
        only: Option<Vec<u32>>,
    ) -> String {
        let asked = crate::Asked {
            device_bytes: (device_bytes > 0.0).then_some(device_bytes as u64),
            width: width as usize,
            only: only.as_deref(),
        };
        self.host
            .run(script, text, &asked, cancelled, &|json| host_event(json))
    }

    /// Rows of a frame of the last run as the data viewer shows it, each cell as the engine
    /// prints it, as a line of JSON: sorted by `sort` (none where it is empty), descending
    /// where `desc` is true, kept to the rows of the last filter where `filtered` is true, and
    /// to the rows a non-empty `search` finds.
    #[allow(clippy::too_many_arguments)]
    pub fn rows(
        &self,
        name: &str,
        offset: u32,
        limit: u32,
        sort: &str,
        desc: bool,
        filtered: bool,
        search: &str,
    ) -> String {
        let shown = crate::Shown {
            sort: (!sort.is_empty()).then_some((sort, desc)),
            filtered,
            search,
        };
        self.host
            .rows(name, offset as usize, limit as usize, &shown)
    }

    /// The bug report of a script's failure, as `zeff report-bug` builds it, built in the
    /// worker and sent nowhere, as a line of JSON; the platform is named as the browser.
    pub fn report(&self, script: &str, text: &str) -> String {
        self.host.report(script, text, PLATFORM)
    }

    /// The bindings of a text with their types, as `zeff repl`'s `:vars` lists them, as a
    /// line of JSON.
    pub fn vars(&self, script: &str, text: &str) -> String {
        self.host.vars(script, text)
    }

    /// Keep the viewer's frame to the rows of a condition, as `name.where(condition)` keeps
    /// them, as a line of JSON.
    pub fn filter(&self, name: &str, condition: &str) -> String {
        self.host.filter(name, condition)
    }

    /// The help page of a function, as `zeff help` prints it in this project, as a line of JSON.
    pub fn help(&self, name: &str) -> String {
        self.host.help(name)
    }

    /// One message of the Language Server Protocol given to the engine's language server;
    /// the bodies of the messages it answers with, as a JSON array of texts.
    pub fn language(&self, body: &str) -> String {
        self.host.language(body)
    }

    /// The engine's check of a text, as `zeff check` makes it, as a line of JSON.
    pub fn check(&self, script: &str, text: &str) -> String {
        self.host.check(script, text)
    }

    /// What each statement of a text needs, from the engine's dependency graph, as a line of
    /// JSON.
    pub fn dependencies(&self, script: &str, text: &str) -> String {
        self.host.dependencies(script, text)
    }

    /// A frame of the last run as the bytes of an Arrow stream, or nothing where no binding
    /// of that name held a frame.
    pub fn frame(&self, name: &str) -> Option<Vec<u8>> {
        self.host.frame(name)
    }
}

/// The statements of a text as the engine reads them, as a line of JSON.
#[wasm_bindgen]
pub fn statements(script: &str, text: &str) -> String {
    crate::statements_json(script, text)
}

/// The explained page of a code, as a line of JSON. Named apart from `zeff-web`'s own
/// `explain`, which the engine's browser crate exports into the same module.
#[wasm_bindgen(js_name = explainPage)]
pub fn explain_page(code: &str) -> String {
    crate::explain(code)
}

/// Every code with an explained page, by family, as a line of JSON.
#[wasm_bindgen(js_name = codesExplained)]
pub fn codes_explained() -> String {
    crate::explained_codes()
}

/// The index of the help, as a line of JSON: the packages, their functions and the datasets.
#[wasm_bindgen(js_name = helpIndex)]
pub fn help_index() -> String {
    crate::help_index()
}

/// The version of the Zeff engine in the worker.
#[wasm_bindgen(js_name = engineVersion)]
pub fn engine_version() -> String {
    crate::engine_version().to_string()
}
