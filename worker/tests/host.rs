//! The host of Zemp's worker, tested natively: the project in memory and its runs, as the
//! engine's own browser build has them, and the one thing added here, a file of the project
//! given back. The worker script that carries these as messages is tested under Node
//! (`js/worker.test.mjs`).

use serde_json::Value;
use std::cell::RefCell;
use zemp_worker::{Host, engine_version, statements, statements_json};

fn never() -> bool {
    false
}

/// A run with what it told, line by line, and its outcome.
fn run(host: &Host, text: &str) -> (Vec<String>, String) {
    let told: RefCell<Vec<String>> = RefCell::default();
    let done = host.run("scripts/main.zeff", text, None, 0, never, &|json| {
        told.borrow_mut().push(json.to_string());
    });
    (told.into_inner(), done)
}

#[test]
fn the_engine_is_the_released_one() {
    assert_eq!(engine_version(), "0.8.0");
}

#[test]
fn a_run_tells_each_event_as_a_line_of_json_and_gives_its_outcome() {
    let host = Host::new("demo");
    let (told, done) = run(&host, "print(\"one\")\nlet a = 2\n");
    assert_eq!(
        told,
        [
            r#"{"type": "started", "statement": 1, "of": 2, "line": 1}"#,
            r#"{"type": "output", "stdout": "one\n", "stderr": ""}"#,
            r#"{"type": "finished", "statement": 1, "of": 2, "line": 1, "failed": false}"#,
            r#"{"type": "started", "statement": 2, "of": 2, "line": 2}"#,
            r#"{"type": "finished", "statement": 2, "of": 2, "line": 2, "failed": false}"#,
        ]
    );
    assert_eq!(
        done,
        concat!(
            r#"{"type": "done", "exit_code": 0, "stdout": "one\n", "stderr": "", "statements": ["#,
            r#"{"line": 1, "end": 1, "kind": "statement", "name": null, "type": "Nothing", "ran": true, "stdout": "one\n", "stderr": "", "frame": null, "memory": null}, "#,
            r#"{"line": 2, "end": 2, "kind": "statement", "name": "a", "type": "Int", "ran": true, "stdout": "", "stderr": "", "frame": null, "memory": null}"#,
            r#"], "frames": []}"#
        )
    );
}

#[test]
fn a_file_put_into_the_project_is_read_by_a_run_and_given_back() {
    let host = Host::new("demo");
    assert!(host.add_file("data/pay.csv", b"id,wage\n1,23.5\n2,19\n3,31.25\n"));
    // A leading slash is the project's folder all the same.
    assert!(host.add_file("/data/more.csv", b"id\n7\n"));
    let (_, done) = run(
        &host,
        "print(import(\"data/pay.csv\").mean(wage))\nprint(import(\"data/more.csv\").n_rows())\n",
    );
    assert!(done.contains(r#""stdout": "24.5833\n1\n""#), "{done}");
    assert_eq!(
        host.file("data/pay.csv").as_deref(),
        Some(&b"id,wage\n1,23.5\n2,19\n3,31.25\n"[..])
    );
    assert_eq!(
        host.file("/data/more.csv").as_deref(),
        Some(&b"id\n7\n"[..])
    );
    // The manifest the host wrote is a file of the project like any other.
    let manifest = String::from_utf8(host.file("zeff.toml").unwrap()).unwrap();
    assert!(manifest.contains("zeff = \"0.8.0\""), "{manifest}");
}

#[test]
fn a_figure_a_run_exports_is_given_back_as_the_file_it_wrote() {
    let host = Host::new("demo");
    let script = "let pay = frame(educ = [10.0, 12, 14, 16], wage = [11.0, 14, 19, 26])\n\
                  let p = pay.plot(x: educ, y: wage).points()\n\
                  p.export(\"output/figure.svg\", size: [120, 80])\n";
    let (_, done) = run(&host, script);
    assert!(done.contains(r#""exit_code": 0"#), "{done}");
    let figure = String::from_utf8(host.file("output/figure.svg").unwrap()).unwrap();
    assert!(
        figure.starts_with("<svg") || figure.starts_with("<?xml"),
        "{}",
        &figure[..80]
    );
    assert!(figure.trim_end().ends_with("</svg>"));
    // The same script gives the same bytes: a figure is a function of the script alone.
    let again = Host::new("demo");
    run(&again, script);
    assert_eq!(again.file("output/figure.svg").unwrap(), figure.as_bytes());
    // A size of another shape gives another figure.
    run(
        &again,
        &script.replace("size: [120, 80]", "size: [80, 120]"),
    );
    assert_ne!(again.file("output/figure.svg").unwrap(), figure.as_bytes());
}

#[test]
fn a_file_that_is_not_there_and_a_path_that_leaves_the_project_give_nothing() {
    let host = Host::new("demo");
    assert_eq!(host.file("output/none.svg"), None);
    // A folder is not a file.
    assert!(host.add_file("data/pay.csv", b"id\n1\n"));
    assert_eq!(host.file("data"), None);
    // Nothing above the project is read or written, however the path is spelt.
    for path in ["../secret", "data/../../secret", "/../secret", "", "/", "."] {
        assert_eq!(host.file(path), None, "{path:?}");
        assert!(!host.add_file(path, b"x"), "{path:?}");
    }
}

#[test]
fn a_frame_of_the_last_run_is_given_as_an_arrow_stream() {
    let host = Host::new("demo");
    let (_, done) = run(
        &host,
        "let pay = frame(region = [\"north\", \"south\"], wage = [23.5, NA])\nlet n = pay.n_rows()\n",
    );
    assert!(
        done.ends_with(r#""frames": [{"name": "pay", "rows": 2, "variables": 2}]}"#),
        "{done}"
    );
    let bytes = host.frame("pay").unwrap();
    assert_eq!(&bytes[..4], [0xff, 0xff, 0xff, 0xff]);
    assert_eq!(host.frame("n"), None);
}

/// The example the prototype opens with (`examples/scratch/`), run through the host: what it
/// prints and says is, byte for byte, what `zeff run` of the released 0.8.0 printed for it,
/// which `expected/` holds.
#[test]
fn the_example_prints_what_zeff_run_prints() {
    let example = concat!(env!("CARGO_MANIFEST_DIR"), "/../examples/scratch");
    let read = |file: &str| std::fs::read_to_string(format!("{example}/{file}")).unwrap();
    let host = Host::new("scratch");
    let (told, done) = run(&host, &read("scripts/main.zeff"));
    let piece = |key: &str| -> String {
        told.iter()
            .filter(|line| line.starts_with(r#"{"type": "output""#))
            .map(|line| field(line, key))
            .collect()
    };
    assert_eq!(piece("stdout"), read("expected/stdout.txt"));
    assert_eq!(piece("stderr"), read("expected/stderr.txt"));
    assert_eq!(field(&done, "stdout"), read("expected/stdout.txt"));
    assert_eq!(field(&done, "stderr"), read("expected/stderr.txt"));
    assert!(done.contains(r#""exit_code": 0"#));
    assert!(
        done.contains(r#"{"name": "wages", "rows": 18412, "variables": "#),
        "{done}"
    );
}

/// The text a line of JSON holds under `key`, read back from its JSON form: enough of a
/// reader for the escapes the engine writes in a text.
fn field(line: &str, key: &str) -> String {
    let mark = format!("\"{key}\": \"");
    let start = line.find(&mark).unwrap() + mark.len();
    let mut text = String::new();
    let mut letters = line[start..].chars();
    while let Some(letter) = letters.next() {
        match letter {
            '"' => return text,
            '\\' => match letters.next().unwrap() {
                'n' => text.push('\n'),
                't' => text.push('\t'),
                'r' => text.push('\r'),
                'u' => {
                    let code: String = letters.by_ref().take(4).collect();
                    text.push(char::from_u32(u32::from_str_radix(&code, 16).unwrap()).unwrap());
                }
                other => text.push(other),
            },
            other => text.push(other),
        }
    }
    panic!("the text under `{key}` does not end");
}

/// A run at a width of `width` characters, its outcome read as JSON.
fn run_at(host: &Host, text: &str, width: usize) -> Value {
    let done = host.run("scripts/main.zeff", text, None, width, never, &|_| {});
    serde_json::from_str(&done).unwrap()
}

/// The file of this repository at `path`, as text.
fn read(path: &str) -> String {
    std::fs::read_to_string(format!("{}/../{path}", env!("CARGO_MANIFEST_DIR"))).unwrap()
}

#[test]
fn the_statements_of_a_text_are_the_engines_from_their_first_line_to_their_last() {
    let text = "// a comment\n\nlet a = 1\nlet b = dataset(wages)\n    .where(year == 2010)\n\n    .add(y = 1)\n\nfn twice(x: Float) -> Float {\n    x * 2\n}\nb\n";
    let found: Vec<(u32, u32, &str)> = statements("scripts/main.zeff", text)
        .iter()
        .map(|one| (one.line, one.end, one.kind))
        .collect();
    assert_eq!(
        found,
        [
            (3, 3, "statement"),
            (4, 7, "statement"),
            (9, 11, "function"),
            (12, 12, "statement")
        ]
    );
    let json: Value = serde_json::from_str(&statements_json("scripts/main.zeff", text)).unwrap();
    assert_eq!(json["type"], "statements");
    assert_eq!(json["statements"][1]["end"], 7);
    // A text with nothing in it has no statements, and one that does not parse is read as far
    // as the engine reads it.
    assert!(statements("scripts/main.zeff", "").is_empty());
    assert!(statements("scripts/main.zeff", "// only a comment\n").is_empty());
}

#[test]
fn each_statement_of_the_example_has_what_it_printed_what_it_made_and_its_size() {
    let host = Host::new("scratch");
    let text = read("examples/scratch/scripts/main.zeff");
    let done = run_at(&host, &text, 0);
    let each = done["statements"].as_array().unwrap();
    let lines: Vec<u64> = each
        .iter()
        .map(|one| one["line"].as_u64().unwrap())
        .collect();
    assert_eq!(lines, [4, 5, 8, 12, 13, 16, 17, 20, 21]);
    assert!(each.iter().all(|one| one["ran"] == true));
    // What each printed and said, put together in order, is what the whole run printed and
    // said, which is what `zeff run` prints and says.
    let joined = |key: &str| -> String {
        each.iter()
            .map(|one| one[key].as_str().unwrap().to_string())
            .collect()
    };
    assert_eq!(
        joined("stdout"),
        read("examples/scratch/expected/stdout.txt")
    );
    assert_eq!(
        joined("stderr"),
        read("examples/scratch/expected/stderr.txt")
    );
    // The name a `let` binds and the type the engine names; a frame with its size.
    let wages = &each[0];
    assert_eq!(wages["name"], "wages");
    assert_eq!(wages["type"], "Frame");
    assert_eq!(wages["frame"]["rows"], 18412);
    assert!(wages["memory"]["own"].as_u64().unwrap() > 0);
    assert_eq!(each[1]["name"], "w2010");
    assert_eq!(each[1]["frame"]["rows"], done["frames"][1]["rows"]);
    assert_eq!(each[2]["name"], Value::Null);
    assert_eq!(each[2]["type"], "Table");
    assert_eq!(each[3]["name"], "fit");
    assert_eq!(each[3]["frame"], Value::Null);
    assert_eq!(each[5]["type"], "Plot");
    assert!(each[3]["type"].as_str().unwrap().len() > 1, "{}", each[3]);
}

#[test]
fn a_run_prints_at_the_width_asked_as_zeff_run_does() {
    let text = read("examples/scratch/scripts/main.zeff");
    for width in [40, 80] {
        let host = Host::new("scratch");
        let done = run_at(&host, &text, width);
        assert_eq!(
            done["stdout"].as_str().unwrap(),
            read(&format!("tests/scripts/widths/example-{width}.stdout")),
            "at {width}"
        );
        assert_eq!(
            done["stderr"].as_str().unwrap(),
            read(&format!("tests/scripts/widths/example-{width}.stderr")),
            "at {width}"
        );
        let joined: String = done["statements"]
            .as_array()
            .unwrap()
            .iter()
            .map(|one| one["stdout"].as_str().unwrap().to_string())
            .collect();
        assert_eq!(joined, done["stdout"].as_str().unwrap());
    }
    // 0 is the engine's own width, 118.
    let host = Host::new("scratch");
    assert_eq!(
        run_at(&host, &text, 0)["stdout"].as_str().unwrap(),
        run_at(&host, &text, 118)["stdout"].as_str().unwrap()
    );
}

#[test]
fn a_statement_after_the_one_that_failed_is_listed_as_not_run() {
    let host = Host::new("demo");
    let done = run_at(&host, &read("tests/scripts/error.zeff"), 0);
    let each = done["statements"].as_array().unwrap();
    let failed = each
        .iter()
        .position(|one| one["stderr"].as_str().unwrap().contains("error["))
        .unwrap();
    assert!(each[..=failed].iter().all(|one| one["ran"] == true));
    assert!(each[failed + 1..].iter().all(|one| one["ran"] == false));
    assert!(
        failed + 1 < each.len(),
        "the test script has a statement after its error"
    );
    assert_eq!(
        done["stderr"].as_str().unwrap(),
        read("tests/scripts/error.stderr")
    );
}

#[test]
fn a_refused_script_runs_nothing_and_lists_its_statements() {
    let host = Host::new("demo");
    let done = run_at(&host, &read("tests/scripts/refused.zeff"), 0);
    let each = done["statements"].as_array().unwrap();
    assert!(!each.is_empty());
    assert!(each.iter().all(|one| one["ran"] == false));
    assert_eq!(
        done["stderr"].as_str().unwrap(),
        read("tests/scripts/refused.stderr")
    );
}
