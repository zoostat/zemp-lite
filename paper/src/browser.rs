//! The bindings of the WebAssembly build: what the paper's worker script calls.
//!
//! `wasm-bindgen` generates code that uses `unsafe`, which the rest of the package denies;
//! the permission is given here and nowhere else.
#![allow(unsafe_code)]

use wasm_bindgen::prelude::wasm_bindgen;

/// The version of Typst this module is.
#[wasm_bindgen(js_name = typstVersion)]
pub fn typst_version() -> String {
    crate::TYPST.to_string()
}

/// A paper in the worker's memory.
#[wasm_bindgen]
pub struct Paper {
    paper: crate::Paper,
}

#[wasm_bindgen]
impl Paper {
    /// A paper whose main file is at `main`, a path of the project.
    #[wasm_bindgen(constructor)]
    pub fn new(main: &str) -> Paper {
        Paper {
            paper: crate::Paper::new(main),
        }
    }

    pub fn set_main(&mut self, path: &str) -> bool {
        self.paper.set_main(path)
    }

    /// A font file: how many faces it held.
    pub fn add_font(&mut self, data: Vec<u8>) -> u32 {
        self.paper.add_font(data) as u32
    }

    /// The families of the fonts given, as a JSON array of names.
    pub fn families(&self) -> String {
        serde_json::Value::from(self.paper.families()).to_string()
    }

    pub fn set_today(&mut self, year: i32, month: u8, day: u8) {
        self.paper.set_today(year, month, day)
    }

    pub fn put_text(&mut self, path: &str, text: &str) -> bool {
        self.paper.put_text(path, text)
    }

    pub fn put_bytes(&mut self, path: &str, bytes: Vec<u8>) -> bool {
        self.paper.put_bytes(path, bytes)
    }

    pub fn remove(&mut self, path: &str) -> bool {
        self.paper.remove(path)
    }

    /// Set the paper: a line of JSON of type `set`.
    pub fn set(&mut self) -> String {
        self.paper.set()
    }

    pub fn page_svg(&self, index: u32) -> String {
        self.paper.page_svg(index as usize)
    }

    /// The PDF; `created` is seconds since 1970 in UTC, or not a number for a file that names
    /// no time. Typst's words, thrown, where there is none.
    pub fn pdf(&self, created: f64) -> Result<Vec<u8>, String> {
        self.paper
            .pdf(created.is_finite().then_some(created as i64))
    }

    /// Where a point of a page came from: a line of JSON of type `place`.
    pub fn click(&self, page: u32, x: f64, y: f64) -> String {
        self.paper.click(page as usize, x, y)
    }
}
