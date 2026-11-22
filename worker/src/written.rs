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
}

impl Recording {
    /// An empty store.
    pub fn new() -> Self {
        Recording {
            inner: MemoryFileSystem::new(),
            written: Mutex::default(),
        }
    }

    /// Put a file in, as the interface does with the files of the project: not noted.
    pub fn add_file(&self, path: impl AsRef<Path>, contents: impl AsRef<[u8]>) {
        self.inner.add_file(path, contents);
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
                    .filter(|path| self.inner.is_file(path))
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
        self.inner.read(path)
    }

    fn metadata(&self, path: &Path) -> io::Result<FileInfo> {
        self.inner.metadata(path)
    }

    fn read_to_string(&self, path: &Path) -> io::Result<String> {
        self.inner.read_to_string(path)
    }

    fn list(&self, dir: &Path) -> io::Result<Vec<String>> {
        self.inner.list(dir)
    }

    fn is_file(&self, path: &Path) -> bool {
        self.inner.is_file(path)
    }

    fn is_dir(&self, path: &Path) -> bool {
        self.inner.is_dir(path)
    }

    fn canonicalize(&self, path: &Path) -> io::Result<PathBuf> {
        self.inner.canonicalize(path)
    }

    fn create_dir(&self, path: &Path) -> io::Result<()> {
        self.inner.create_dir(path)
    }

    fn write(&self, path: &Path, bytes: &[u8]) -> io::Result<()> {
        self.inner.write(path, bytes)?;
        // Noted by the path the store itself keeps the file under, with `.` and `..` resolved.
        let kept = self
            .inner
            .canonicalize(path)
            .unwrap_or_else(|_| path.to_path_buf());
        if let Ok(mut written) = self.written.lock() {
            written.insert(kept);
        }
        Ok(())
    }

    fn remove_dir_all(&self, path: &Path) -> io::Result<()> {
        self.inner.remove_dir_all(path)
    }

    fn now(&self) -> Option<i64> {
        self.inner.now()
    }
}
