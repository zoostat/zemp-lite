//! The host of Zemp's worker, tested natively: the project in memory and its runs, as the
//! engine's own browser build has them, and the one thing added here, a file of the project
//! given back. The worker script that carries these as messages is tested under Node
//! (`js/worker.test.mjs`).

use std::cell::RefCell;
use zemp_worker::{Host, engine_version};

fn never() -> bool {
    false
}

/// A run with what it told, line by line, and its outcome.
fn run(host: &Host, text: &str) -> (Vec<String>, String) {
    let told: RefCell<Vec<String>> = RefCell::default();
    let done = host.run("scripts/main.zeff", text, None, never, &|json| {
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
        r#"{"type": "done", "exit_code": 0, "stdout": "one\n", "stderr": "", "frames": []}"#
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
