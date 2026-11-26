//! The paper's module, tested natively: a paper set to pages by Typst, what Typst says of a
//! source it refuses, the hyphenation that is carried and the hyphenation that is left out,
//! and the place in the source of a point on a page. The fonts are those of `fonts/`.

use serde_json::Value;
use zemp_paper::Paper;

const MAIN: &str = "paper/paper.typ";

/// A paper with the fonts of `fonts/` and one file, its main one.
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

/// A paragraph long enough to be broken into many lines of a narrow column.
const GERMAN: &str = "Die Wahrscheinlichkeitsrechnung untersucht Gesetzmäßigkeiten zufälliger \
    Erscheinungen. Stichprobenverteilungen, Regressionskoeffizienten und \
    Konfidenzintervalle werden in der Wirtschaftswissenschaft außerordentlich häufig \
    verwendet, insbesondere bei Längsschnittuntersuchungen der Einkommensentwicklung.";
const ENGLISH: &str = "Heteroskedasticity-consistent covariance estimators are indispensable \
    in econometrics. Representative longitudinal investigations of incomes necessarily \
    acknowledge unobservable characteristics, measurement difficulties and nonresponse, \
    notwithstanding considerable methodological sophistication.";
const DUTCH: &str = "De waarschijnlijkheidsrekening onderzoekt wetmatigheden van toevallige \
    verschijnselen. Steekproefverdelingen, regressiecoëfficiënten en \
    betrouwbaarheidsintervallen worden in de economische wetenschappen buitengewoon vaak \
    gebruikt, in het bijzonder bij longitudinaal onderzoek naar inkomensontwikkeling.";

/// A narrow justified column in a language, its words broken or not.
fn column(lang: &str, hyphenate: bool, text: &str) -> String {
    format!(
        "#set page(width: 150pt, height: auto, margin: 10pt)\n\
         #set text(lang: \"{lang}\", hyphenate: {hyphenate})\n\
         #set par(justify: true)\n{text}\n"
    )
}

/// The first page of a paper that must set with nothing said of it.
fn page(text: &str) -> String {
    let mut paper = paper(text);
    let told = set(&mut paper);
    assert_eq!(told["ok"], true, "{told}");
    assert_eq!(told["said"], Value::Array(vec![]), "{told}");
    paper.page_svg(0)
}

#[test]
fn the_module_is_typst_of_the_version_it_names() {
    assert_eq!(zemp_paper::TYPST, "0.15.1");
}

#[test]
fn a_paper_is_set_to_pages_with_its_fonts_and_gives_each_page_and_its_pdf() {
    let mut paper = paper(
        "#set page(paper: \"a4\")\n= Returns to schooling\n\nA first paragraph, with *weight* \
         and _stress_.\n#pagebreak()\nA second page.\n",
    );
    assert_eq!(paper.families(), ["Libertinus Serif"]);
    let told = set(&mut paper);
    assert_eq!(told["type"], "set");
    assert_eq!(told["ok"], true);
    assert_eq!(told["said"], Value::Array(vec![]));
    // Two pages of A4, in points.
    let pages = told["pages"].as_array().unwrap();
    assert_eq!(pages.len(), 2);
    for size in pages {
        assert!(
            (size[0].as_f64().unwrap() - 595.276).abs() < 0.001,
            "{size}"
        );
        assert!((size[1].as_f64().unwrap() - 841.89).abs() < 0.001, "{size}");
    }
    // Each page as Typst's own SVG of it; a page that is not there is nothing.
    let first = paper.page_svg(0);
    assert!(first.starts_with("<svg"), "{}", &first[..40]);
    assert_ne!(first, paper.page_svg(1));
    assert_eq!(paper.page_svg(2), "");
    // The PDF, written twice to the same bytes, and to others at another time.
    let pdf = paper.pdf(Some(1_795_000_000)).unwrap();
    assert!(pdf.starts_with(b"%PDF-"));
    assert_eq!(paper.pdf(Some(1_795_000_000)).unwrap(), pdf);
    assert_ne!(paper.pdf(Some(1_795_086_400)).unwrap(), pdf);
    assert!(paper.pdf(None).unwrap().starts_with(b"%PDF-"));
}

#[test]
fn a_paper_set_again_after_a_change_is_the_paper_as_it_now_stands() {
    let mut paper = paper("One page.\n");
    assert_eq!(set(&mut paper)["pages"].as_array().unwrap().len(), 1);
    let before = paper.page_svg(0);
    assert!(paper.put_text(MAIN, "One page.\n#pagebreak()\nAnd a second.\n"));
    assert_eq!(set(&mut paper)["pages"].as_array().unwrap().len(), 2);
    assert!(paper.put_text(MAIN, "Another page.\n"));
    assert_eq!(set(&mut paper)["pages"].as_array().unwrap().len(), 1);
    assert_ne!(paper.page_svg(0), before);
    // Set afresh from the same text, it is the same page: nothing is left from the changes.
    assert_eq!(paper.page_svg(0), page("Another page.\n"));
}

#[test]
fn what_typst_refuses_is_said_with_its_place_and_the_last_pages_that_set_stay() {
    let mut paper = paper("A page that sets.\n");
    assert_eq!(set(&mut paper)["ok"], true);
    let kept = paper.page_svg(0);
    assert!(paper.put_text(MAIN, "A page that sets.\n\n#let x = \n#nosuch(3)\n"));
    let told = set(&mut paper);
    assert_eq!(told["ok"], false);
    let said = told["said"].as_array().unwrap();
    assert!(!said.is_empty());
    let first = &said[0];
    assert_eq!(first["severity"], "error");
    assert_eq!(first["file"], MAIN);
    assert_eq!(first["line"], 3);
    assert!(first["column"].as_u64().unwrap() >= 1);
    assert!(first["from"].as_u64().unwrap() >= 19);
    assert!(!first["message"].as_str().unwrap().is_empty());
    // The pages of the setting before are still there to be shown, and still a PDF.
    assert_eq!(told["pages"].as_array().unwrap().len(), 1);
    assert_eq!(paper.page_svg(0), kept);
    // Put right, it sets, and nothing is said.
    assert!(paper.put_text(MAIN, "A page that sets again.\n"));
    let told = set(&mut paper);
    assert_eq!(told["ok"], true);
    assert_eq!(told["said"], Value::Array(vec![]));
}

#[test]
fn a_paper_reads_the_other_files_of_the_project_and_says_which_is_not_there() {
    let mut paper =
        paper("#include \"tables/fit.typ\"\n#image(\"../output/figure.svg\", width: 40pt)\n");
    // Neither is there yet: Typst says so of the first, at its line, by its path.
    let told = set(&mut paper);
    assert_eq!(told["ok"], false);
    let first = &told["said"][0];
    assert_eq!(first["line"], 1);
    assert!(
        first["message"]
            .as_str()
            .unwrap()
            .contains("file not found"),
        "{first}"
    );
    assert!(
        first["message"]
            .as_str()
            .unwrap()
            .contains("paper/tables/fit.typ"),
        "{first}"
    );
    // A table as text beside the paper, and a figure as bytes in another folder of the project.
    assert!(paper.put_text(
        "paper/tables/fit.typ",
        "#table(columns: 2, [educ], [0.08])\n"
    ));
    assert!(paper.put_bytes(
        "output/figure.svg",
        br#"<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>"#
            .to_vec(),
    ));
    let told = set(&mut paper);
    assert_eq!(told["ok"], true, "{told}");
    let with = paper.page_svg(0);
    // A file changed is read again; a file gone is not there any more.
    assert!(paper.put_text(
        "paper/tables/fit.typ",
        "#table(columns: 2, [educ], [0.09])\n"
    ));
    assert_eq!(set(&mut paper)["ok"], true);
    assert_ne!(paper.page_svg(0), with);
    assert!(paper.remove("output/figure.svg"));
    assert!(!paper.remove("output/figure.svg"));
    let told = set(&mut paper);
    assert_eq!(told["ok"], false);
    assert_eq!(told["said"][0]["line"], 2);
    // A path that would leave the project is no file of it.
    assert!(!paper.put_text("../outside.typ", "x"));
    // An error inside a file the paper reads is said of that file.
    assert!(paper.put_bytes("output/figure.svg", b"<svg".to_vec()));
    assert!(paper.put_text("paper/tables/fit.typ", "#nosuch()\n"));
    let told = set(&mut paper);
    assert_eq!(told["said"][0]["file"], "paper/tables/fit.typ");
    assert_eq!(told["said"][0]["line"], 1);
}

#[test]
fn a_warning_is_said_and_the_paper_still_sets() {
    let mut paper = paper("#set text(font: \"No Such Face\")\nText.\n");
    let told = set(&mut paper);
    assert_eq!(told["ok"], true);
    let said = told["said"].as_array().unwrap();
    assert_eq!(said.len(), 1, "{told}");
    assert_eq!(said[0]["severity"], "warning");
    assert_eq!(said[0]["line"], 1);
    assert!(
        said[0]["message"]
            .as_str()
            .unwrap()
            .contains("unknown font family"),
        "{told}"
    );
}

#[test]
fn the_words_of_a_language_that_is_carried_are_broken_at_the_ends_of_lines() {
    // German and English: the column is another column when its words may be broken.
    assert_ne!(
        page(&column("de", true, GERMAN)),
        page(&column("de", false, GERMAN))
    );
    assert_ne!(
        page(&column("en", true, ENGLISH)),
        page(&column("en", false, ENGLISH))
    );
}

#[test]
fn a_language_left_out_is_set_unhyphenated_and_nothing_is_said() {
    // Dutch is one of the fifteen whose patterns are not carried (`hypher/CHANGES.md`): the
    // column is the same whether breaking is asked for or forbidden, and `page` holds that
    // Typst says nothing of it, neither an error nor a warning.
    assert_eq!(
        page(&column("nl", true, DUTCH)),
        page(&column("nl", false, DUTCH))
    );
    // The same words set as German would be broken: the column is narrow enough to tell.
    assert_ne!(
        page(&column("de", true, DUTCH)),
        page(&column("de", false, DUTCH))
    );
}

#[test]
fn a_point_of_a_page_leads_to_its_place_in_the_source() {
    let text = "#set page(width: 300pt, height: 200pt, margin: 20pt)\n= Returns\n\nA paragraph \
                of the paper.\n";
    let mut paper = paper(text);
    assert_eq!(set(&mut paper)["ok"], true);
    // A point inside the heading, near the page's top left.
    let place: Value = serde_json::from_str(&paper.click(0, 30.0, 28.0)).unwrap();
    assert_eq!(place["type"], "place");
    assert_eq!(place["file"], MAIN);
    assert_eq!(place["line"], 2);
    // A point inside the paragraph under it, found by going down the page from the heading.
    let under = (36..90)
        .map(|y| serde_json::from_str::<Value>(&paper.click(0, 30.0, f64::from(y))).unwrap())
        .find(|place| place["line"] == 4)
        .expect("a point of the paragraph");
    assert_eq!(under["file"], MAIN);
    assert!(under["offset"].as_u64().unwrap() > place["offset"].as_u64().unwrap());
    // An empty corner of the page, and a page that is not there, lead nowhere.
    let corner: Value = serde_json::from_str(&paper.click(0, 290.0, 190.0)).unwrap();
    assert_eq!(corner["file"], Value::Null);
    let absent: Value = serde_json::from_str(&paper.click(7, 30.0, 28.0)).unwrap();
    assert_eq!(absent["file"], Value::Null);
}

#[test]
fn the_day_in_a_paper_is_the_day_the_page_gives() {
    let dated =
        "#set page(width: 200pt, height: 60pt, margin: 10pt)\n#datetime.today().display()\n";
    let mut paper = paper(dated);
    paper.set_today(2026, 11, 27);
    assert_eq!(set(&mut paper)["ok"], true);
    let one = paper.page_svg(0);
    paper.set_today(2026, 11, 28);
    assert_eq!(set(&mut paper)["ok"], true);
    assert_ne!(paper.page_svg(0), one);
}

#[test]
fn a_file_that_is_no_font_adds_none() {
    let mut paper = Paper::new(MAIN);
    assert_eq!(paper.add_font(b"not a font".to_vec()), 0);
    assert!(paper.families().is_empty());
}
