//! Typst as Zemp's module for a paper (Zemp Specification, sections 5 and 8; open decision
//! #172, option A; Zemp Lite 0.3, step 11). A paper's files are held in memory as the page
//! gives them; the paper is set to pages; and its pages as SVG, its PDF, and the place in the
//! source of a point on a page are asked for. It is Typst 0.15.1 and nothing else sets a
//! page: this file is the room Typst works in (its `World`) and the few questions the page
//! asks of it.
//!
//! The module holds no font of its own. Typst's bundled fonts are behind a feature that is
//! left off, because not all of them are under a licence this project ships
//! (docs/decisions.md, 27 November 2026); the page gives the fonts as files (`add_font`):
//! those of `fonts/`, and any font file of the project.
//!
//! A paper is held between settings, so a second setting reuses what the first worked out
//! (Typst's own memory, `comemo`): a letter typed costs a few milliseconds, not a whole
//! setting.

use std::collections::{BTreeSet, HashMap};
use std::num::NonZeroUsize;
use std::sync::Mutex;

use serde_json::{Value, json};
use typst::diag::{FileError, FileResult, Severity, SourceDiagnostic};
use typst::foundations::{Bytes, Datetime, Duration, NativeElement, StyleChain};
use typst::introspection::{Introspector, PagedPosition};
use typst::layout::{Abs, Point};
use typst::model::HeadingElem;
use typst::syntax::{FileId, RootedPath, Source, VirtualPath, VirtualRoot};
use typst::text::{Font, FontBook};
use typst::utils::LazyHash;
use typst::{Library, LibraryExt, World, WorldExt};
use typst_layout::PagedDocument;

#[cfg(target_arch = "wasm32")]
mod browser;

/// The version of Typst this module is.
pub const TYPST: &str = "0.15.1";

/// How many settings a thing Typst worked out is kept for without being used again, before
/// it is dropped: so the memory of a long sitting does not grow with every letter typed.
const KEPT_FOR: usize = 10;

/// The file of a path of the project, as Typst names files; `None` for a path that is none
/// (one that would leave the project).
fn file(path: &str) -> Option<FileId> {
    let path = VirtualPath::new(path.trim_start_matches('/')).ok()?;
    Some(RootedPath::new(VirtualRoot::Project, path).intern())
}

/// The room Typst works in: the files and the fonts the page gave, and the day.
struct Held {
    library: LazyHash<Library>,
    book: LazyHash<FontBook>,
    fonts: Vec<Font>,
    main: FileId,
    /// The files that are text (a `.typ` source, a table as `export` wrote it).
    sources: HashMap<FileId, Source>,
    /// The files that are bytes (a figure, a font is not among them).
    files: HashMap<FileId, Bytes>,
    /// Each file's path in the project, for what is told of it.
    names: HashMap<FileId, String>,
    /// The day `datetime.today()` gives: the reader's, as the page gave it.
    today: Option<(i32, u8, u8)>,
    /// The files Typst asked for since the last setting began and was told are not there, each
    /// by its path in the project: the page looks for these in the project and gives those it
    /// finds. (Typst asks through `&self`, from any thread, hence the lock.)
    missing: Mutex<BTreeSet<String>>,
    /// The files Typst asked for since the last setting began and was given, likewise: the
    /// files the paper reads, as it now stands.
    read: Mutex<BTreeSet<String>>,
}

impl World for Held {
    fn library(&self) -> &LazyHash<Library> {
        &self.library
    }

    fn book(&self) -> &LazyHash<FontBook> {
        &self.book
    }

    fn main(&self) -> FileId {
        self.main
    }

    fn source(&self, id: FileId) -> FileResult<Source> {
        match self.sources.get(&id) {
            Some(source) => {
                self.found(id);
                Ok(source.clone())
            }
            None => Err(self.absent(id)),
        }
    }

    fn file(&self, id: FileId) -> FileResult<Bytes> {
        if let Some(bytes) = self.files.get(&id) {
            self.found(id);
            return Ok(bytes.clone());
        }
        match self.sources.get(&id) {
            Some(source) => {
                self.found(id);
                Ok(Bytes::from_string(source.text().to_string()))
            }
            None => Err(self.absent(id)),
        }
    }

    fn font(&self, index: usize) -> Option<Font> {
        self.fonts.get(index).cloned()
    }

    fn today(&self, _offset: Option<Duration>) -> Option<Datetime> {
        let (year, month, day) = self.today?;
        Datetime::from_ymd(year, month, day)
    }
}

impl Held {
    /// A file Typst asked for and was given is noted for the page: the paper reads it. The
    /// paper's own main file is not among them.
    fn found(&self, id: FileId) {
        if id == self.main {
            return;
        }
        if let (Some(name), Ok(mut read)) = (self.names.get(&id), self.read.lock()) {
            read.insert(name.clone());
        }
    }

    /// What Typst is told of a file that is not there: that it was not found, by its path.
    /// The path is noted for the page.
    fn absent(&self, id: FileId) -> FileError {
        let path = id.vpath().get_without_slash();
        if let Ok(mut missing) = self.missing.lock() {
            missing.insert(path.to_string());
        }
        FileError::NotFound(path.into())
    }
}

impl typst_ide::IdeWorld for Held {
    fn upcast(&self) -> &dyn World {
        self
    }
}

/// A paper in memory, and its last setting.
pub struct Paper {
    world: Held,
    /// The last document that set: its pages stay to be shown while a source is refused.
    document: Option<PagedDocument>,
}

impl Paper {
    /// A paper whose main file is at `main`, a path of the project (`paper/paper.typ`). No
    /// file and no font is in it yet.
    pub fn new(main: &str) -> Paper {
        Paper {
            world: Held {
                library: LazyHash::new(Library::default()),
                book: LazyHash::new(FontBook::new()),
                fonts: Vec::new(),
                main: file(main).unwrap_or_else(|| {
                    RootedPath::new(VirtualRoot::Project, VirtualPath::new("paper.typ").unwrap())
                        .intern()
                }),
                sources: HashMap::new(),
                files: HashMap::new(),
                names: HashMap::new(),
                today: None,
                missing: Mutex::new(BTreeSet::new()),
                read: Mutex::new(BTreeSet::new()),
            },
            document: None,
        }
    }

    /// The main file is now the one at `path`. `false` for a path that is none.
    pub fn set_main(&mut self, path: &str) -> bool {
        match file(path) {
            Some(id) => {
                self.world.main = id;
                true
            }
            None => false,
        }
    }

    /// A font file given by the page (`.otf`, `.ttf`, a collection): how many faces it held,
    /// none where it is no font.
    pub fn add_font(&mut self, data: Vec<u8>) -> usize {
        let before = self.world.fonts.len();
        self.world.fonts.extend(Font::iter(Bytes::new(data)));
        self.world.book = LazyHash::new(FontBook::from_fonts(&self.world.fonts));
        self.world.fonts.len() - before
    }

    /// The families of the fonts given, each once, in the order of their names.
    pub fn families(&self) -> Vec<String> {
        self.world
            .book
            .families()
            .map(|(name, _)| name.to_string())
            .collect()
    }

    /// The day `datetime.today()` gives in the paper.
    pub fn set_today(&mut self, year: i32, month: u8, day: u8) {
        self.world.today = Some((year, month, day));
    }

    /// Put a file of text into the paper, by its path in the project; one of that path is
    /// replaced, and Typst reads again only what changed in it. `false` for a path that is none.
    pub fn put_text(&mut self, path: &str, text: &str) -> bool {
        let Some(id) = file(path) else {
            return false;
        };
        self.world.names.insert(id, path.to_string());
        self.world.files.remove(&id);
        match self.world.sources.get_mut(&id) {
            Some(source) => {
                source.replace(text);
            }
            None => {
                self.world
                    .sources
                    .insert(id, Source::new(id, text.to_string()));
            }
        }
        true
    }

    /// Put a file of bytes into the paper (a figure), by its path in the project. `false` for
    /// a path that is none.
    pub fn put_bytes(&mut self, path: &str, bytes: Vec<u8>) -> bool {
        let Some(id) = file(path) else {
            return false;
        };
        self.world.names.insert(id, path.to_string());
        self.world.sources.remove(&id);
        self.world.files.insert(id, Bytes::new(bytes));
        true
    }

    /// Forget a file: it is gone from the project. Whether there was one.
    pub fn remove(&mut self, path: &str) -> bool {
        let Some(id) = file(path) else {
            return false;
        };
        self.world.names.remove(&id);
        let text = self.world.sources.remove(&id).is_some();
        let bytes = self.world.files.remove(&id).is_some();
        text || bytes
    }

    /// One thing Typst said of a setting, as fields: whether it is an error or a warning, its
    /// words and its hints, and where in which file (lines and columns counted from 1, the
    /// places also as counts of bytes); `file` is null where it points into no file.
    fn said(&self, diagnostic: &SourceDiagnostic) -> Value {
        let place = diagnostic.span.id().and_then(|id| {
            let range = self.world.range(diagnostic.span)?;
            let name = self.world.names.get(&id)?.clone();
            let lines = self
                .world
                .sources
                .get(&id)
                .map(|source| source.lines().clone());
            let at = |offset: usize| {
                lines
                    .as_ref()
                    .and_then(|lines| lines.byte_to_line_column(offset))
                    .map(|(line, column)| (line + 1, column + 1))
            };
            Some((name, range.clone(), at(range.start), at(range.end)))
        });
        let hints: Vec<&str> = diagnostic
            .hints
            .iter()
            .map(|hint| hint.v.as_str())
            .collect();
        json!({
            "severity": match diagnostic.severity {
                Severity::Error => "error",
                Severity::Warning => "warning",
            },
            "message": diagnostic.message.as_str(),
            "hints": hints,
            "file": place.as_ref().map(|(name, ..)| name.as_str()),
            "from": place.as_ref().map(|(_, range, ..)| range.start),
            "to": place.as_ref().map(|(_, range, ..)| range.end),
            "line": place.as_ref().and_then(|(_, _, from, _)| from.map(|(line, _)| line)),
            "column": place.as_ref().and_then(|(_, _, from, _)| from.map(|(_, column)| column)),
            "end_line": place.as_ref().and_then(|(_, _, _, to)| to.map(|(line, _)| line)),
            "end_column": place.as_ref().and_then(|(_, _, _, to)| to.map(|(_, column)| column)),
        })
    }

    /// Set the paper. A line of JSON of type `set`: `ok`, whether Typst set it; `pages`, the
    /// sizes in points of the pages of the last document that set (those of this setting where
    /// `ok`, and otherwise those of the setting before, which stay to be shown); `marks`, one
    /// for each of those pages, the same for a page that is drawn the same and another for one
    /// that is not, so that the page asks again only for the pages that changed; `said`, what
    /// Typst said of this setting, its errors where it refused the source and its warnings;
    /// `missing`, the files Typst asked for in this setting that the paper does not hold, each
    /// by its path in the project, in the order of their paths; `read`, the files besides the
    /// paper's own main file that Typst asked for in this setting and was given, likewise.
    pub fn set(&mut self) -> String {
        if let Ok(mut missing) = self.world.missing.lock() {
            missing.clear();
        }
        if let Ok(mut read) = self.world.read.lock() {
            read.clear();
        }
        let compiled = typst::compile::<PagedDocument>(&self.world);
        // What no setting has used for a while is dropped.
        comemo::evict(KEPT_FOR);
        let mut said: Vec<Value> = compiled.warnings.iter().map(|one| self.said(one)).collect();
        let ok = match compiled.output {
            Ok(document) => {
                self.document = Some(document);
                true
            }
            Err(errors) => {
                said.splice(0..0, errors.iter().map(|one| self.said(one)));
                false
            }
        };
        let pages: Vec<[f64; 2]> = self
            .document
            .iter()
            .flat_map(|document| document.pages())
            .map(|page| {
                let size = page.frame.size();
                [size.x.to_pt(), size.y.to_pt()]
            })
            .collect();
        let marks: Vec<String> = self
            .document
            .iter()
            .flat_map(|document| document.pages())
            // What a page is drawn from: its frame and its ground. Two pages of one mark are
            // drawn the same; a page may get another mark and still be drawn the same (its
            // frame also holds where in the source each piece came from), which costs a
            // drawing and nothing else.
            .map(|page| format!("{:032x}", typst::utils::hash128(&(&page.frame, &page.fill))))
            .collect();
        let missing: Vec<String> = self
            .world
            .missing
            .lock()
            .map(|missing| missing.iter().cloned().collect())
            .unwrap_or_default();
        let read: Vec<String> = self
            .world
            .read
            .lock()
            .map(|read| read.iter().cloned().collect())
            .unwrap_or_default();
        json!({
            "type": "set",
            "ok": ok,
            "pages": pages,
            "marks": marks,
            "said": said,
            "missing": missing,
            "read": read,
        })
        .to_string()
    }

    /// A page of the last document that set, counted from 0, as Typst's own SVG of it; empty
    /// where there is no such page.
    pub fn page_svg(&self, index: usize) -> String {
        match self
            .document
            .as_ref()
            .and_then(|document| document.pages().get(index))
        {
            Some(page) => typst_svg::svg(page, &typst_svg::SvgOptions::default()),
            None => String::new(),
        }
    }

    /// The PDF of the last document that set, as Typst writes it: its creator and its
    /// identifier are Typst's own, so that the file is the desktop Typst's for the same paper,
    /// fonts and time. `created` is the time written into it, as seconds since 1970 in UTC, or
    /// none for a file that names no time. Typst's words where there is no document or it
    /// cannot be written.
    pub fn pdf(&self, created: Option<i64>) -> Result<Vec<u8>, String> {
        let document = self
            .document
            .as_ref()
            .ok_or_else(|| "no paper is set".to_string())?;
        let timestamp = created.and_then(|seconds| {
            let days = seconds.div_euclid(86_400);
            let of_day = seconds.rem_euclid(86_400);
            let (year, month, day) = civil(days);
            Datetime::from_ymd_hms(
                year,
                month,
                day,
                (of_day / 3_600) as u8,
                (of_day % 3_600 / 60) as u8,
                (of_day % 60) as u8,
            )
            .map(typst_pdf::Timestamp::new_utc)
        });
        let options = typst_pdf::PdfOptions {
            timestamp,
            ..Default::default()
        };
        typst_pdf::pdf(document, &options).map_err(|errors| {
            errors
                .iter()
                .map(|one| one.message.to_string())
                .collect::<Vec<_>>()
                .join("; ")
        })
    }

    /// The headings of the last document that set, in the order of the paper: a line of JSON
    /// of type `outline`, with `headings`, each its `level` (1 for a heading, 2 for one under
    /// it), its `text`, the `file` and the `line` (from 1) of the source it is written at
    /// (`file` null where it comes from no file of the paper), and where it stands on the
    /// pages: `page` from 0, `x` and `y` in points from the page's top left.
    pub fn outline(&self) -> String {
        let Some(document) = self.document.as_ref() else {
            return json!({ "type": "outline", "headings": [] }).to_string();
        };
        let introspector = document.introspector();
        let headings: Vec<Value> = introspector
            .query(&HeadingElem::ELEM.select())
            .iter()
            .filter_map(|element| {
                let heading = element.to_packed::<HeadingElem>()?;
                let position = introspector.position(element.location()?)?;
                let span = element.span();
                let file = span.id().and_then(|id| self.world.names.get(&id));
                let line = span.id().and_then(|id| {
                    let range = self.world.range(span)?;
                    let source = self.world.sources.get(&id)?;
                    let (line, _) = source.lines().byte_to_line_column(range.start)?;
                    Some(line + 1)
                });
                Some(json!({
                    "level": heading.resolve_level(StyleChain::default()).get(),
                    "text": heading.body.plain_text(),
                    "file": file,
                    "line": line,
                    "page": position.page.get() - 1,
                    "x": position.point.x.to_pt(),
                    "y": position.point.y.to_pt(),
                }))
            })
            .collect();
        json!({ "type": "outline", "headings": headings }).to_string()
    }

    /// Where in the sources a point of a page came from (a click on the page): a line of JSON
    /// of type `place`, with `file`, the count of bytes into it and the line and column counted
    /// from 1; `file` is null where the point leads to no place in a file of the paper. `page`
    /// is counted from 0, `x` and `y` in points from the page's top left.
    pub fn click(&self, page: usize, x: f64, y: f64) -> String {
        let none = || json!({ "type": "place", "file": null }).to_string();
        let Some(document) = self.document.as_ref() else {
            return none();
        };
        let Some(number) = NonZeroUsize::new(page + 1) else {
            return none();
        };
        let position = PagedPosition {
            page: number,
            point: Point::new(Abs::pt(x), Abs::pt(y)),
        };
        let Some(typst_ide::Jump::File(id, offset)) =
            typst_ide::jump_from_click(&self.world, document, &position)
        else {
            return none();
        };
        let Some(name) = self.world.names.get(&id) else {
            return none();
        };
        let at = self
            .world
            .sources
            .get(&id)
            .and_then(|source| source.lines().byte_to_line_column(offset));
        json!({
            "type": "place",
            "file": name,
            "offset": offset,
            "line": at.map(|(line, _)| line + 1),
            "column": at.map(|(_, column)| column + 1),
        })
        .to_string()
    }
}

/// The year, month and day of a count of days since 1 January 1970 (the civil calendar, by
/// the usual reckoning in whole numbers).
fn civil(days: i64) -> (i32, u8, u8) {
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097);
    let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = yoe + era * 400 + i64::from(month <= 2);
    (year as i32, month as u8, day as u8)
}

#[cfg(test)]
mod tests {
    use super::civil;

    #[test]
    fn a_count_of_days_is_its_day_of_the_calendar() {
        assert_eq!(civil(0), (1970, 1, 1));
        assert_eq!(civil(20_454), (2026, 1, 1));
        assert_eq!(civil(20_454 + 58), (2026, 2, 28));
        assert_eq!(civil(20_454 + 59), (2026, 3, 1));
        assert_eq!(civil(19_782), (2024, 2, 29));
        assert_eq!(civil(-1), (1969, 12, 31));
    }
}
