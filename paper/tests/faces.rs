//! The faces a paper is set in, with every font of `fonts/` given as the page gives them
//! (release 0.3, step 11c): its text in Libertinus Serif and its code in DejaVu Sans Mono, as
//! Typst sets them with no line in the paper; its mathematics in Libertinus Math, by the one
//! line a new paper begins with, since Typst's own face for mathematics is not carried.

use serde_json::Value;
use zemp_paper::Paper;

const MAIN: &str = "paper/paper.typ";

/// The line a new paper begins with, which names the face of its mathematics.
const MATHEMATICS: &str = "#show math.equation: set text(font: \"Libertinus Math\")\n";

const FORMULAS: &str = "A sum $x^2 + sum_(i=1)^n y_i$ in a line, and one displayed:\n\
    $ integral_0^1 f(x) dif x = alpha / beta $\n";

/// A paper with every font of `fonts/`, in the order of their names, and its one file.
fn paper(text: &str) -> Paper {
    let mut paper = Paper::new(MAIN);
    let folder = format!("{}/fonts", env!("CARGO_MANIFEST_DIR"));
    let mut names: Vec<String> = std::fs::read_dir(&folder)
        .unwrap()
        .map(|entry| entry.unwrap().file_name().into_string().unwrap())
        .filter(|name| name.ends_with(".otf") || name.ends_with(".ttf"))
        .collect();
    names.sort();
    for name in names {
        let bytes = std::fs::read(format!("{folder}/{name}")).unwrap();
        assert_eq!(paper.add_font(bytes), 1, "{name}");
    }
    assert!(paper.put_text(MAIN, text));
    paper
}

/// What Typst says of a paper, and the PDF it sets.
fn set(text: &str) -> (Vec<Value>, Vec<u8>) {
    let mut paper = paper(text);
    let told: Value = serde_json::from_str(&paper.set()).unwrap();
    assert_eq!(told["ok"], true, "{told}");
    let said = told["said"].as_array().unwrap().clone();
    (said, paper.pdf(Some(0)).unwrap())
}

/// Whether a PDF embeds a font of this PostScript name (a PDF names each font it embeds in
/// plain bytes, after the tag of its subset: `/ABCDEF+Name`).
fn embeds(pdf: &[u8], name: &str) -> bool {
    let wanted = format!("+{name}");
    let ends = |at: usize| !matches!(pdf.get(at), Some(byte) if byte.is_ascii_alphanumeric() || *byte == b'-');
    pdf.windows(wanted.len())
        .enumerate()
        .any(|(at, window)| window == wanted.as_bytes() && ends(at + wanted.len()))
}

#[test]
fn the_families_a_paper_may_be_set_in_are_the_three_carried() {
    assert_eq!(
        paper("").families(),
        ["DejaVu Sans Mono", "Libertinus Math", "Libertinus Serif"]
    );
}

#[test]
fn code_is_set_in_dejavu_sans_mono_with_no_line_in_the_paper_and_nothing_said() {
    let (said, pdf) = set("Code `x <- 1` in a line, and a block:\n```r\nlm(y ~ x)\n```\n");
    assert_eq!(said, Vec::<Value>::new());
    assert!(embeds(&pdf, "DejaVuSansMono"));
    assert!(embeds(&pdf, "LibertinusSerif-Regular"));
    assert!(!embeds(&pdf, "LibertinusMath-Regular"));
}

#[test]
fn code_that_is_bold_or_slanted_finds_its_own_face() {
    let (said, pdf) = set("*`bold`*, _`slanted`_ and *_`both`_*.\n");
    assert_eq!(said, Vec::<Value>::new());
    for face in [
        "DejaVuSansMono-Bold",
        "DejaVuSansMono-Oblique",
        "DejaVuSansMono-BoldOblique",
    ] {
        assert!(embeds(&pdf, face), "{face}");
    }
    // The upright face is not embedded where nothing is set in it.
    assert!(!embeds(&pdf, "DejaVuSansMono"));
}

#[test]
fn mathematics_is_set_in_libertinus_math_by_the_line_a_new_paper_begins_with() {
    let (said, pdf) = set(&format!("{MATHEMATICS}{FORMULAS}"));
    assert_eq!(said, Vec::<Value>::new());
    assert!(embeds(&pdf, "LibertinusMath-Regular"));
    assert!(embeds(&pdf, "LibertinusSerif-Regular"));
}

#[test]
fn mathematics_without_that_line_still_sets_and_typst_warns_at_each_formula() {
    // Typst names its own face for mathematics, which is not carried; it falls back, and says
    // so at each formula. What the app adds to these words is the line to begin the paper with.
    let (said, _) = set(FORMULAS);
    assert_eq!(said.len(), 2, "{said:?}");
    for (one, line) in said.iter().zip([1, 2]) {
        assert_eq!(one["severity"], "warning");
        assert_eq!(one["message"], "current font is not designed for math");
        assert_eq!(one["file"], MAIN);
        assert_eq!(one["line"], line);
    }
}
