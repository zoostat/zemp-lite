//! The PDF of a paper (release 0.3, step 16): the sample paper of the Scratch project, with
//! its table, its figure and the fonts the page carries, is written to a file held here by its
//! SHA-256: with no time in it, the file **Export PDF…** saves, the same in every browser; and
//! with a time, the file the desktop Typst 0.15.1 writes for the same sources, fonts and time.

use std::fs;
use std::io::Write;
use std::process::{Command, Stdio};

use zemp_paper::Paper;

/// The sample paper's PDF with no time written into it: what **Export PDF…** saves.
const TIMELESS: &str = "2df5a0d6899096dd7b79ff34f48c3df9ee530b36e49af7f6951dc8985bd0affb";
/// The time of the comparison with the desktop Typst: 1 December 2026, 12:00 UTC.
const AT: i64 = 1_796_126_400;
/// The file `typst compile` 0.15.1 writes for the sample at that time, from these fonts alone
/// (`--root examples/scratch --ignore-system-fonts --ignore-embedded-fonts --font-path
/// paper/fonts --creation-timestamp 1796126400`), taken on 27 November 2026 from the desktop
/// Typst built from the published crate with its own lock file.
const DESKTOP: &str = "bbee9dbe151604ed73ea07ae43cde6459b209b86eae40c7b2020ec0c6b3effba";

fn sample() -> Paper {
    let here = env!("CARGO_MANIFEST_DIR");
    let scratch = format!("{here}/../examples/scratch");
    let mut paper = Paper::new("paper/paper.typ");
    let mut fonts: Vec<String> = fs::read_dir(format!("{here}/fonts"))
        .unwrap()
        .map(|entry| entry.unwrap().file_name().into_string().unwrap())
        .filter(|name| name.ends_with(".otf") || name.ends_with(".ttf"))
        .collect();
    fonts.sort();
    for name in fonts {
        assert_eq!(
            paper.add_font(fs::read(format!("{here}/fonts/{name}")).unwrap()),
            1
        );
    }
    let text = |path: &str| fs::read_to_string(format!("{scratch}/{path}")).unwrap();
    assert!(paper.put_text("paper/paper.typ", &text("paper/paper.typ")));
    assert!(paper.put_text("output/returns.typ", &text("output/returns.typ")));
    assert!(paper.put_bytes(
        "output/schooling.svg",
        fs::read(format!("{scratch}/output/schooling.svg")).unwrap()
    ));
    let told: serde_json::Value = serde_json::from_str(&paper.set()).unwrap();
    assert_eq!(told["ok"], true, "{told}");
    paper
}

/// The SHA-256 of some bytes, by the machine's own tool, so that no crate is added to take one.
fn digest(bytes: &[u8]) -> String {
    let mut tool = Command::new("shasum")
        .args(["-a", "256"])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .expect("shasum runs");
    tool.stdin.take().unwrap().write_all(bytes).unwrap();
    let said = String::from_utf8(tool.wait_with_output().unwrap().stdout).unwrap();
    said.split_whitespace().next().unwrap_or("").to_string()
}

#[test]
fn the_sample_papers_pdf_with_no_time_is_the_kept_file_whenever_it_is_written() {
    let paper = sample();
    let pdf = paper.pdf(None).unwrap();
    assert!(pdf.starts_with(b"%PDF-"));
    assert_eq!(digest(&pdf), TIMELESS);
    // Written again, and from a paper set afresh: the same bytes.
    assert_eq!(paper.pdf(None).unwrap(), pdf);
    assert_eq!(sample().pdf(None).unwrap(), pdf);
    // No time is in it: neither the day it was made nor the day it was changed.
    let text = String::from_utf8_lossy(&pdf);
    assert!(!text.contains("/CreationDate"));
    assert!(!text.contains("/ModDate"));
    assert!(!text.contains("xmp:CreateDate"));
}

#[test]
fn with_a_time_it_is_the_file_the_desktop_typst_writes_for_the_same_sources_fonts_and_time() {
    let pdf = sample().pdf(Some(AT)).unwrap();
    assert_eq!(digest(&pdf), DESKTOP);
    assert!(String::from_utf8_lossy(&pdf).contains("/CreationDate"));
}
