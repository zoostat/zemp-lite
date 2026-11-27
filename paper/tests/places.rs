//! A place of the page and its place in the source (release 0.3, step 14): the headings of a
//! paper, each with where it is written and where it stands on the pages; and a point of a
//! page (a click) led back to the text, the heading or the included table it came from.

use serde_json::Value;
use zemp_paper::Paper;

const MAIN: &str = "paper/paper.typ";
const TABLE: &str = "paper/tables/fit.typ";

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

fn headings(paper: &Paper) -> Vec<Value> {
    let told: Value = serde_json::from_str(&paper.outline()).unwrap();
    assert_eq!(told["type"], "outline");
    told["headings"].as_array().unwrap().clone()
}

fn click(paper: &Paper, page: usize, x: f64, y: f64) -> Value {
    serde_json::from_str(&paper.click(page, x, y)).unwrap()
}

/// The first point of a page, going down it and then across, that leads to this file.
fn point_of(paper: &Paper, page: usize, file: &str) -> Option<(f64, f64, Value)> {
    (10..190).step_by(2).find_map(|y| {
        (10..290).step_by(3).find_map(|x| {
            let place = click(paper, page, f64::from(x), f64::from(y));
            (place["file"] == file).then(|| (f64::from(x), f64::from(y), place))
        })
    })
}

const TEXT: &str = "#set page(width: 300pt, height: 200pt, margin: 20pt)\n\
    = Returns to schooling\n\
    \n\
    A paragraph of the paper.\n\
    \n\
    == The data\n\
    \n\
    #include \"tables/fit.typ\"\n\
    #pagebreak()\n\
    = Results\n\
    \n\
    The last words.\n";

#[test]
fn the_headings_of_a_paper_are_listed_with_their_lines_and_their_places_on_the_pages() {
    let mut paper = paper(TEXT);
    assert!(paper.put_text(TABLE, "#table(columns: 2, [educ], [0.08])\n"));
    assert_eq!(set(&mut paper)["ok"], true);
    let found = headings(&paper);
    let told: Vec<(u64, &str, &str, u64, u64)> = found
        .iter()
        .map(|one| {
            (
                one["level"].as_u64().unwrap(),
                one["text"].as_str().unwrap(),
                one["file"].as_str().unwrap(),
                one["line"].as_u64().unwrap(),
                one["page"].as_u64().unwrap(),
            )
        })
        .collect();
    assert_eq!(
        told,
        [
            (1, "Returns to schooling", MAIN, 2, 0),
            (2, "The data", MAIN, 6, 0),
            (1, "Results", MAIN, 10, 1),
        ]
    );
    // Each stands inside its page, at the left margin, and the second under the first.
    for one in &found {
        let (x, y) = (one["x"].as_f64().unwrap(), one["y"].as_f64().unwrap());
        assert!((19.0..=21.0).contains(&x), "{one}");
        assert!((20.0..200.0).contains(&y), "{one}");
    }
    assert!(found[1]["y"].as_f64().unwrap() > found[0]["y"].as_f64().unwrap());
}

#[test]
fn a_heading_of_an_included_file_is_listed_with_that_file() {
    let mut paper = paper("= The paper\n\n#include \"tables/fit.typ\"\n");
    assert!(paper.put_text(TABLE, "\n== A table's own heading\n\nIts words.\n"));
    assert_eq!(set(&mut paper)["ok"], true);
    let found = headings(&paper);
    assert_eq!(found.len(), 2);
    assert_eq!(found[1]["text"], "A table's own heading");
    assert_eq!(found[1]["level"], 2);
    assert_eq!(found[1]["file"], TABLE);
    assert_eq!(found[1]["line"], 2);
}

#[test]
fn a_paper_with_no_heading_or_never_set_has_none_and_a_refused_one_keeps_the_last() {
    let mut never = paper("#nosuch()\n");
    assert_eq!(set(&mut never)["ok"], false);
    assert_eq!(headings(&never), Vec::<Value>::new());
    let mut plain = paper("Only a paragraph.\n");
    assert_eq!(set(&mut plain)["ok"], true);
    assert_eq!(headings(&plain), Vec::<Value>::new());
    // Refused, the headings are those of the pages that stay to be shown.
    let mut paper = paper("= One\n");
    assert_eq!(set(&mut paper)["ok"], true);
    assert!(paper.put_text(MAIN, "= One\n= Two\n#nosuch()\n"));
    assert_eq!(set(&mut paper)["ok"], false);
    assert_eq!(headings(&paper).len(), 1);
}

#[test]
fn a_point_of_the_page_leads_to_the_text_the_heading_or_the_included_table_it_came_from() {
    let mut paper = paper(TEXT);
    assert!(paper.put_text(TABLE, "#table(columns: 2, [educ], [0.08])\n"));
    assert_eq!(set(&mut paper)["ok"], true);
    let found = headings(&paper);
    // A heading: a point just inside its first letter leads to its line.
    let heading = &found[0];
    let at = click(
        &paper,
        0,
        heading["x"].as_f64().unwrap() + 4.0,
        heading["y"].as_f64().unwrap() + 8.0,
    );
    assert_eq!(at["file"], MAIN);
    assert_eq!(at["line"], 2);
    // The paragraph under it: a point between the two headings, on a line of text.
    let between =
        (heading["y"].as_f64().unwrap() as i32 + 16)..(found[1]["y"].as_f64().unwrap() as i32);
    let text = between
        .map(|y| click(&paper, 0, 30.0, f64::from(y)))
        .find(|place| place["line"] == 4)
        .expect("a point of the paragraph");
    assert_eq!(text["file"], MAIN);
    // A letter further along the line is further along the source.
    assert!(text["column"].as_u64().unwrap() >= 1);
    // The table: a point of a cell leads into the file the paper includes, at the table's line.
    let (_, y, cell) = point_of(&paper, 0, TABLE).expect("a point of the included table");
    assert_eq!(cell["line"], 1);
    assert!(
        y > found[1]["y"].as_f64().unwrap(),
        "the table is under its heading"
    );
    // Its two cells are two places of that line, the one at the right further along it.
    let cells: Vec<(i32, u64)> = (10..190)
        .step_by(2)
        .flat_map(|y| (10..290).step_by(3).map(move |x| (x, y)))
        .filter_map(|(x, y)| {
            let place = click(&paper, 0, f64::from(x), f64::from(y));
            (place["file"] == TABLE).then(|| (x, place["column"].as_u64().unwrap()))
        })
        .collect();
    let first = cells.iter().min_by_key(|(_, column)| *column).unwrap();
    let last = cells.iter().max_by_key(|(_, column)| *column).unwrap();
    assert!(last.1 > first.1, "{cells:?}");
    assert!(last.0 > first.0, "{cells:?}");
    // The second page: its heading leads to its own line.
    let second = &found[2];
    let at = click(
        &paper,
        1,
        second["x"].as_f64().unwrap() + 4.0,
        second["y"].as_f64().unwrap() + 8.0,
    );
    assert_eq!(at["line"], 10);
    // The margin leads nowhere.
    assert_eq!(click(&paper, 0, 5.0, 5.0)["file"], Value::Null);
}

#[test]
fn a_figure_leads_to_the_line_that_places_it() {
    let mut paper = paper(
        "#set page(width: 300pt, height: 200pt, margin: 20pt)\nBefore.\n\n\
         #image(\"../output/figure.svg\", width: 80pt)\n",
    );
    assert!(paper.put_bytes(
        "output/figure.svg",
        br#"<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>"#
            .to_vec(),
    ));
    assert_eq!(set(&mut paper)["ok"], true);
    // A point inside the figure, under the line of text.
    let place = (40..120)
        .step_by(4)
        .map(|y| click(&paper, 0, 50.0, f64::from(y)))
        .find(|place| place["line"] == 4)
        .expect("a point of the figure");
    assert_eq!(place["file"], MAIN);
}
