//! The file store the host gives the engine: the engine's own store in memory, with a note
//! of every file a run writes (Zemp Lite 0.2.2, step 2b).
//!
//! A script's `export` and `save` write under the project's folder (Engine and Project
//! Specification, section 2). In the browser the project's folder is the browser's own
//! storage, which only the interface writes; the engine works on a copy in the worker's
//! memory. So that what a run wrote reaches the project, this store passes every call to the
//! engine's and remembers which paths were written since the run began; the run's outcome
//! names them, and the interface reads each and writes it into the project. A file the
//! interface puts in is not a file a run wrote, and is not noted.
//!
//! It also forgets: a file or a folder the reader renamed, moved or deleted in the project
//! (step 8b) must be gone from the engine's copy too, or a script that still names it would
//! run here and nowhere else. The engine's store removes a folder and no single file, so a
//! file forgotten is kept in a list of those that are gone, and is not there for any call
//! until it is written or put in again.

use std::collections::BTreeSet;
use std::io;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use zeff_engine::fs::{FileInfo, FileSystem, MemoryFileSystem};

/// The engine's store in memory, noting what is written through it.
#[derive(Debug)]
pub struct Recording {
    inner: MemoryFileSystem,
    written: Mutex<BTreeSet<PathBuf>>,
    /// The files forgotten: in the engine's store still, and there for no call.
    gone: Mutex<BTreeSet<PathBuf>>,
}

impl Recording {
    /// An empty store.
    pub fn new() -> Self {
        Recording {
            inner: MemoryFileSystem::new(),
            written: Mutex::default(),
            gone: Mutex::default(),
        }
    }

    /// The path the store keeps a file under, with `.` and `..` resolved.
    fn kept(&self, path: &Path) -> PathBuf {
        self.inner
            .canonicalize(path)
            .unwrap_or_else(|_| path.to_path_buf())
    }

    /// Whether a file was forgotten.
    fn is_gone(&self, path: &Path) -> bool {
        self.gone
            .lock()
            .map(|gone| !gone.is_empty() && gone.contains(&self.kept(path)))
            .unwrap_or(false)
    }

    /// A file is there again: written by a run, or put in by the interface.
    fn back(&self, path: &Path) {
        if let Ok(mut gone) = self.gone.lock() {
            gone.remove(&self.kept(path));
        }
    }

    /// Forget a file, or a folder with all it holds. Whether there was one to forget.
    pub fn forget(&self, path: &Path) -> bool {
        if self.inner.is_dir(path) {
            let kept = self.kept(path);
            if let Ok(mut gone) = self.gone.lock() {
                gone.retain(|file| !file.starts_with(&kept));
            }
            return self.inner.remove_dir_all(path).is_ok();
        }
        if !self.is_file(path) {
            return false;
        }
        let kept = self.kept(path);
        self.gone.lock().map(|mut gone| gone.insert(kept)).is_ok()
    }

    /// Put a file in, as the interface does with the files of the project: not noted.
    pub fn add_file(&self, path: impl AsRef<Path>, contents: impl AsRef<[u8]>) {
        self.inner.add_file(path.as_ref(), contents);
        self.back(path.as_ref());
    }

    /// A run begins: nothing is written yet.
    pub fn begin(&self) {
        if let Ok(mut written) = self.written.lock() {
            written.clear();
        }
    }

    /// The files written since the last run began that are still there, in the order of
    /// their paths.
    pub fn written(&self) -> Vec<PathBuf> {
        self.written
            .lock()
            .map(|written| {
                written
                    .iter()
                    .filter(|path| self.is_file(path))
                    .cloned()
                    .collect()
            })
            .unwrap_or_default()
    }
}

impl Default for Recording {
    fn default() -> Self {
        Recording::new()
    }
}

impl FileSystem for Recording {
    fn read(&self, path: &Path) -> io::Result<Vec<u8>> {
        if self.is_gone(path) {
            return Err(not_found(path));
        }
        self.inner.read(path)
    }

    fn metadata(&self, path: &Path) -> io::Result<FileInfo> {
        if self.is_gone(path) {
            return Err(not_found(path));
        }
        self.inner.metadata(path)
    }

    fn read_to_string(&self, path: &Path) -> io::Result<String> {
        if self.is_gone(path) {
            return Err(not_found(path));
        }
        self.inner.read_to_string(path)
    }

    fn list(&self, dir: &Path) -> io::Result<Vec<String>> {
        let names = self.inner.list(dir)?;
        Ok(names
            .into_iter()
            .filter(|name| !self.is_gone(&dir.join(name)))
            .collect())
    }

    fn is_file(&self, path: &Path) -> bool {
        !self.is_gone(path) && self.inner.is_file(path)
    }

    fn is_dir(&self, path: &Path) -> bool {
        self.inner.is_dir(path)
    }

    fn canonicalize(&self, path: &Path) -> io::Result<PathBuf> {
        if self.is_gone(path) {
            return Err(not_found(path));
        }
        self.inner.canonicalize(path)
    }

    fn create_dir(&self, path: &Path) -> io::Result<()> {
        self.inner.create_dir(path)
    }

    fn write(&self, path: &Path, bytes: &[u8]) -> io::Result<()> {
        self.inner.write(path, bytes)?;
        self.back(path);
        // Noted by the path the store itself keeps the file under, with `.` and `..` resolved.
        let kept = self.kept(path);
        if let Ok(mut written) = self.written.lock() {
            written.insert(kept);
        }
        Ok(())
    }

    fn remove_dir_all(&self, path: &Path) -> io::Result<()> {
        let kept = self.kept(path);
        if let Ok(mut gone) = self.gone.lock() {
            gone.retain(|file| !file.starts_with(&kept));
        }
        self.inner.remove_dir_all(path)
    }

    fn now(&self) -> Option<i64> {
        self.inner.now()
    }
}

/// What the engine's own store says of a path that is not there.
fn not_found(path: &Path) -> io::Error {
    io::Error::new(
        io::ErrorKind::NotFound,
        format!("{} does not exist", path.display()),
    )
}
