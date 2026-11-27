//! What the live page asks of a setting (release 0.3, step 13): a mark for each page, the
//! same for a page drawn the same, so that only the pages that changed are drawn again; and
//! the files the paper asked for and does not hold, so that the page can give them from the
//! project.

use serde_json::Value;
use zemp_paper::Paper;

const MAIN: &str = "paper/paper.typ";

fn paper(text: &str) -> Paper {
    let mut paper = Paper::new(MAIN);
    for face in ["Regular", "Italic", "Bold", "BoldItalic"] {
        let path = format!(
            "{}/fonts/LibertinusSerif-{face}.otf",
            env!("CARGO_MANIFEST_DIR")
        );
        assert_eq!(paper.add_font(std::fs::read(path).unwrap()), 1, "{face}");
    }
    assert!(paper.put_text(MAIN, text));
    paper
}

fn set(paper: &mut Paper) -> Value {
    serde_json::from_str(&paper.set()).unwrap()
}

fn marks(told: &Value) -> Vec<String> {
    told["marks"]
        .as_array()
        .unwrap()
        .iter()
        .map(|mark| mark.as_str().unwrap().to_string())
        .collect()
}

fn missing(told: &Value) -> Vec<String> {
    told["missing"]
        .as_array()
        .unwrap()
        .iter()
        .map(|path| path.as_str().unwrap().to_string())
        .collect()
}

const THREE: &str = "#set page(width: 200pt, height: 120pt)\nThe first page.\n#pagebreak()\n\
    The second page.\n#pagebreak()\nThe third page.\n";

#[test]
fn the_same_source_gives_the_same_pages_and_the_same_marks() {
    let mut one = paper(THREE);
    let mut other = paper(THREE);
    let told = set(&mut one);
    let again = set(&mut other);
    assert_eq!(told["ok"], true, "{told}");
    let first = marks(&told);
    assert_eq!(first.len(), 3);
    assert_eq!(told["pages"].as_array().unwrap().len(), 3);
    // A mark is 32 hexadecimal digits, and three different pages have three marks.
    for mark in &first {
        assert_eq!(mark.len(), 32, "{mark}");
        assert!(
            mark.chars().all(|digit| digit.is_ascii_hexdigit()),
            "{mark}"
        );
    }
    assert_ne!(first[0], first[1]);
    assert_ne!(first[1], first[2]);
    assert_eq!(first, marks(&again));
    for index in 0..3 {
        assert_eq!(one.page_svg(index), other.page_svg(index), "page {index}");
    }
    // Set again with nothing changed, the pages and their marks are the same.
    let before: Vec<String> = (0..3).map(|index| one.page_svg(index)).collect();
    assert_eq!(marks(&set(&mut one)), first);
    for (index, svg) in before.iter().enumerate() {
        assert_eq!(&one.page_svg(index), svg, "page {index}");
    }
}

#[test]
fn a_change_gives_another_mark_to_the_page_it_changes_and_to_no_other() {
    let mut paper = paper(THREE);
    let before = marks(&set(&mut paper));
    let kept = [paper.page_svg(0), paper.page_svg(1), paper.page_svg(2)];
    assert!(paper.put_text(
        MAIN,
        &THREE.replace("The second page.", "The second page, changed.")
    ));
    let after = marks(&set(&mut paper));
    assert_eq!(after[0], before[0]);
    assert_ne!(after[1], before[1]);
    assert_eq!(after[2], before[2]);
    assert_eq!(paper.page_svg(0), kept[0]);
    assert_ne!(paper.page_svg(1), kept[1]);
    assert_eq!(paper.page_svg(2), kept[2]);
    // A page put before the others: four pages, and the first of them a new one.
    assert!(paper.put_text(
        MAIN,
        &THREE.replace(
            "The first page.",
            "A new page.\n#pagebreak()\nThe first page."
        )
    ));
    let longer = marks(&set(&mut paper));
    assert_eq!(longer.len(), 4);
    assert!(!before.contains(&longer[0]));
}

#[test]
fn a_refused_source_keeps_the_pages_and_the_marks_of_the_last_that_set() {
    let mut paper = paper(THREE);
    let before = set(&mut paper);
    assert!(paper.put_text(MAIN, &format!("{THREE}#nosuch()\n")));
    let refused = set(&mut paper);
    assert_eq!(refused["ok"], false);
    assert_eq!(refused["said"][0]["severity"], "error");
    assert_eq!(refused["said"][0]["line"], 7);
    assert_eq!(refused["said"][0]["column"], 2);
    assert_eq!(marks(&refused), marks(&before));
    assert_eq!(refused["pages"], before["pages"]);
    assert_eq!(missing(&refused), Vec::<String>::new());
}

#[test]
fn a_paper_that_has_never_set_has_no_page_and_no_mark() {
    let mut paper = paper("#nosuch()\n");
    let told = set(&mut paper);
    assert_eq!(told["ok"], false);
    assert_eq!(marks(&told), Vec::<String>::new());
    assert_eq!(told["pages"].as_array().unwrap().len(), 0);
}

fn read(told: &Value) -> Vec<String> {
    told["read"]
        .as_array()
        .unwrap()
        .iter()
        .map(|path| path.as_str().unwrap().to_string())
        .collect()
}

#[test]
fn the_files_a_paper_reads_are_named_at_each_setting_and_no_longer_once_it_reads_them_no_more() {
    let figure = br#"<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>"#;
    let text = "#include \"tables/fit.typ\"\n#image(\"../output/figure.svg\", width: 40pt)\n";
    let mut paper = paper(text);
    assert!(paper.put_text(
        "paper/tables/fit.typ",
        "#table(columns: 2, [educ], [0.08])\n"
    ));
    assert!(paper.put_bytes("output/figure.svg", figure.to_vec()));
    // A file the paper holds and does not read is not among them.
    assert!(paper.put_bytes("output/unused.svg", figure.to_vec()));
    let told = set(&mut paper);
    assert_eq!(told["ok"], true, "{told}");
    assert_eq!(read(&told), ["output/figure.svg", "paper/tables/fit.typ"]);
    // Set again with nothing changed, and with a word changed: the same files.
    assert_eq!(
        read(&set(&mut paper)),
        ["output/figure.svg", "paper/tables/fit.typ"]
    );
    assert!(paper.put_text(MAIN, &format!("{text}A word more.\n")));
    assert_eq!(
        read(&set(&mut paper)),
        ["output/figure.svg", "paper/tables/fit.typ"]
    );
    // The figure taken out of the paper's text: it is read no more, though the paper holds it.
    assert!(paper.put_text(MAIN, "#include \"tables/fit.typ\"\n"));
    let told = set(&mut paper);
    assert_eq!(read(&told), ["paper/tables/fit.typ"]);
    assert_eq!(missing(&told), Vec::<String>::new());
    // A paper that reads no other file reads none.
    assert!(paper.put_text(MAIN, "Only words.\n"));
    assert_eq!(read(&set(&mut paper)), Vec::<String>::new());
}

#[test]
fn the_files_a_paper_asks_for_and_does_not_hold_are_named_at_each_setting() {
    let mut paper = paper(
        "#include \"tables/fit.typ\"\n#image(\"../output/figure.svg\", width: 40pt)\n\
         #read(\"/data/notes.txt\")\n",
    );
    // Typst stops at the first file it lacks: each setting names what it asked for and lacked.
    let told = set(&mut paper);
    assert_eq!(told["ok"], false);
    assert_eq!(missing(&told), ["paper/tables/fit.typ"]);
    // Asked again with nothing given, it is named again.
    assert_eq!(missing(&set(&mut paper)), ["paper/tables/fit.typ"]);
    assert!(paper.put_text(
        "paper/tables/fit.typ",
        "#table(columns: 2, [educ], [0.08])\n"
    ));
    let told = set(&mut paper);
    assert_eq!(told["ok"], false);
    assert_eq!(missing(&told), ["output/figure.svg"]);
    assert!(paper.put_bytes(
        "output/figure.svg",
        br#"<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>"#
            .to_vec(),
    ));
    let told = set(&mut paper);
    assert_eq!(missing(&told), ["data/notes.txt"]);
    assert!(paper.put_bytes("data/notes.txt", b"A note.".to_vec()));
    // With every file given the paper sets, and lacks nothing: now, and when set again.
    let told = set(&mut paper);
    assert_eq!(told["ok"], true, "{told}");
    assert_eq!(missing(&told), Vec::<String>::new());
    assert_eq!(missing(&set(&mut paper)), Vec::<String>::new());
    // A file taken away is lacked again, and named.
    assert!(paper.remove("output/figure.svg"));
    let told = set(&mut paper);
    assert_eq!(told["ok"], false);
    assert_eq!(missing(&told), ["output/figure.svg"]);
}
