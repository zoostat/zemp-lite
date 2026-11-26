//! The host of Zemp's worker, tested natively: the project in memory and its runs, as the
//! engine's own browser build has them, and the one thing added here, a file of the project
//! given back. The worker script that carries these as messages is tested under Node
//! (`js/worker.test.mjs`).

use serde_json::Value;
use std::cell::RefCell;
use zemp_worker::{
    Asked, Host, Shown, engine_version, explain, explained_codes, help_index, only, statements,
    statements_json,
};

fn never() -> bool {
    false
}

/// A run with what it told, line by line, and its outcome.
fn run(host: &Host, text: &str) -> (Vec<String>, String) {
    let told: RefCell<Vec<String>> = RefCell::default();
    let done = host.run(
        "scripts/main.zeff",
        text,
        &Asked::default(),
        never,
        &|json| {
            told.borrow_mut().push(json.to_string());
        },
    );
    (told.into_inner(), done)
}

#[test]
fn the_engine_is_the_released_one() {
    assert_eq!(engine_version(), "0.9.0");
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
            // A statement that gives nothing has no type: the engine names the type of a
            // result, and `print` has none (until release 0.3 the worker wrote `Nothing` here,
            // from the checked program).
            r#"{"line": 1, "end": 1, "kind": "statement", "name": null, "type": null, "ran": true, "stdout": "one\n", "stderr": "", "frame": null, "memory": null, "rows": null, "columns": null, "length": null, "n": null, "error": null}, "#,
            r#"{"line": 2, "end": 2, "kind": "statement", "name": "a", "type": "Int", "ran": true, "stdout": "", "stderr": "", "frame": null, "memory": null, "rows": null, "columns": null, "length": null, "n": null, "error": null}"#,
            r#"], "frames": [], "plots": [], "written": []}"#
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
    assert!(manifest.contains("zeff = \"0.9.0\""), "{manifest}");
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

/// The files a run's outcome says it wrote.
fn written(done: &str) -> Vec<String> {
    let outcome: Value = serde_json::from_str(done).unwrap();
    outcome["written"]
        .as_array()
        .unwrap()
        .iter()
        .map(|path| path.as_str().unwrap().to_string())
        .collect()
}

#[test]
fn a_runs_outcome_names_the_files_it_wrote_and_no_others() {
    let host = Host::new("demo");
    // A file the interface puts in is not a file a run wrote.
    assert!(host.add_file("data/pay.csv", b"id,wage\n1,23.5\n2,19\n3,31.25\n"));
    let (_, done) = run(&host, "print(import(\"data/pay.csv\").mean(wage))\n");
    assert_eq!(written(&done), Vec::<String>::new(), "{done}");
    // A figure exported and a frame saved, each named by its path from the project's folder.
    let script = "let pay = import(\"data/pay.csv\")\n\
                  pay.plot(x: id, y: wage).points().export(\"output/pay.svg\", size: [120, 80])\n\
                  pay.save(\"output/pay.csv\")\n";
    let (_, done) = run(&host, script);
    assert!(done.contains(r#""exit_code": 0"#), "{done}");
    assert_eq!(written(&done), ["output/pay.csv", "output/pay.svg"]);
    // Each is there to be read, as the run wrote it.
    assert!(host.file("output/pay.svg").is_some());
    let saved = String::from_utf8(host.file("output/pay.csv").unwrap()).unwrap();
    assert!(saved.starts_with("id,wage\n"), "{saved}");
    // The next run names what it wrote itself: nothing of the run before.
    let (_, done) = run(&host, "print(1)\n");
    assert_eq!(written(&done), Vec::<String>::new());
    // A run that writes a file again names it again; the engine's own folder is never named.
    let (_, done) = run(&host, script);
    assert_eq!(written(&done), ["output/pay.csv", "output/pay.svg"]);
    assert!(written(&done).iter().all(|path| !path.starts_with(".zeff")));
    // A run that stops at an error names what it wrote before it.
    let (_, done) = run(
        &host,
        "import(\"data/pay.csv\").save(\"output/first.csv\")\nerror(\"stop\")\n",
    );
    assert!(done.contains(r#""exit_code": 1"#), "{done}");
    assert_eq!(written(&done), ["output/first.csv"]);
}

#[test]
fn a_file_or_a_folder_forgotten_is_gone_for_the_engine_and_the_last_runs_frames_are_kept() {
    let host = Host::new("demo");
    assert!(host.add_file("data/pay.csv", b"id,wage\n1,23.5\n2,19\n3,31.25\n"));
    assert!(host.add_file("data/old/a.csv", b"id\n1\n"));
    assert!(host.add_file("data/old/deep/b.csv", b"id\n2\n"));
    let reads = "let pay = import(\"data/pay.csv\")\nprint(pay.mean(wage))\n";
    let (_, done) = run(&host, reads);
    assert!(done.contains(r#""stdout": "24.5833\n""#), "{done}");
    // Forgotten, the file is not there: not to be read back, and not for a script that names it.
    assert!(host.remove("data/pay.csv"));
    assert_eq!(host.file("data/pay.csv"), None);
    // The frame the last run left is still given: forgetting a file ends no run's results.
    assert!(host.frame("pay").is_some());
    let (_, done) = run(&host, reads);
    assert!(done.contains(r#""exit_code": 1"#), "{done}");
    assert!(
        done.contains("Z0701") || done.contains("data/pay.csv"),
        "{done}"
    );
    // Its neighbours are as they were.
    assert_eq!(
        host.file("data/old/a.csv").as_deref(),
        Some(&b"id\n1\n"[..])
    );
    // Put in again, under its name or another, it is there again.
    assert!(host.add_file("data/wages.csv", b"id,wage\n1,10\n"));
    assert!(host.add_file("data/pay.csv", b"id,wage\n1,40\n"));
    let (_, done) = run(&host, reads);
    assert!(done.contains(r#""stdout": "40\n""#), "{done}");
    // A file a run wrote is forgotten the same way, and written again by the next run.
    let writes = "import(\"data/pay.csv\").save(\"kept.csv\")\n";
    let (_, done) = run(&host, writes);
    assert_eq!(written(&done), ["output/kept.csv"]);
    assert!(host.remove("output/kept.csv"));
    assert_eq!(host.file("output/kept.csv"), None);
    let (_, done) = run(&host, "print(1)\n");
    assert_eq!(written(&done), Vec::<String>::new());
    let (_, done) = run(&host, writes);
    assert_eq!(written(&done), ["output/kept.csv"]);
    assert!(host.file("output/kept.csv").is_some());
    // A folder goes with all it holds.
    assert!(host.remove("data/old"));
    assert_eq!(host.file("data/old/a.csv"), None);
    assert_eq!(host.file("data/old/deep/b.csv"), None);
    assert_eq!(
        host.file("data/wages.csv").as_deref(),
        Some(&b"id,wage\n1,10\n"[..])
    );
    // What is not there, the manifest, and a path that leaves the project are not forgotten.
    assert!(!host.remove("data/none.csv"));
    assert!(!host.remove("data/old"));
    assert!(!host.remove("zeff.toml"));
    assert!(!host.remove("../secret"));
    assert!(!host.remove(""));
    assert!(host.file("zeff.toml").is_some());
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
        done.ends_with(
            r#""frames": [{"name": "pay", "rows": 2, "variables": 2}], "plots": [], "written": []}"#
        ),
        "{done}"
    );
    let bytes = host.frame("pay").unwrap();
    assert_eq!(&bytes[..4], [0xff, 0xff, 0xff, 0xff]);
    assert_eq!(host.frame("n"), None);
}

/// A script of the repository and what `zeff run` of the released 0.9.0 printed and said for
/// it, run through the host: the two must be the same, byte for byte, as the run goes and in
/// its outcome; the outcome is given back.
fn prints_as_zeff_run(host: &Host, script: &str, text: &str, stdout: &str, stderr: &str) -> String {
    let asked = Asked::default();
    let told = RefCell::new(Vec::new());
    let done = host.run(script, text, &asked, never, &|line| {
        told.borrow_mut().push(line.to_string())
    });
    let told = told.into_inner();
    let piece = |key: &str| -> String {
        told.iter()
            .filter(|line| line.starts_with(r#"{"type": "output""#))
            .map(|line| field(line, key))
            .collect()
    };
    assert_eq!(piece("stdout"), stdout, "{script}");
    assert_eq!(piece("stderr"), stderr, "{script}");
    assert_eq!(field(&done, "stdout"), stdout, "{script}");
    assert_eq!(field(&done, "stderr"), stderr, "{script}");
    assert!(done.contains(r#""exit_code": 0"#), "{script}: {done}");
    done
}

/// The example of the tests (`tests/scripts/example/`, the Scratch project's example of
/// release 0.1), run through the host: what it prints and says is what `zeff run` printed.
#[test]
fn the_example_prints_what_zeff_run_prints() {
    let host = Host::new("scratch");
    let done = prints_as_zeff_run(
        &host,
        "scripts/main.zeff",
        &read("tests/scripts/example/scripts/main.zeff"),
        &read("tests/scripts/example/expected/stdout.txt"),
        &read("tests/scripts/example/expected/stderr.txt"),
    );
    assert!(
        done.contains(r#"{"name": "wages", "rows": 18412, "variables": "#),
        "{done}"
    );
}

/// The three scripts of the Scratch project a first visitor opens (`examples/scratch/`): the
/// returns to schooling, the engine's own sample on instrumental variables, and the showcase of
/// plots, each printing what `zeff run` of the released 0.9.0 printed for it.
#[test]
fn the_scratch_projects_scripts_print_what_zeff_run_prints() {
    let host = Host::new("scratch");
    for name in ["main", "instruments", "plots"] {
        prints_as_zeff_run(
            &host,
            &format!("scripts/{name}.zeff"),
            &read(&format!("examples/scratch/scripts/{name}.zeff")),
            &read(&format!("examples/scratch/expected/{name}.stdout")),
            &read(&format!("examples/scratch/expected/{name}.stderr")),
        );
    }
    // The table the sample's last section exports is written into the project.
    assert!(host.file("output/table_iv.tex").is_some());
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
    let asked = Asked {
        width,
        ..Asked::default()
    };
    let done = host.run("scripts/main.zeff", text, &asked, never, &|_| {});
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
    let text = read("tests/scripts/example/scripts/main.zeff");
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
        read("tests/scripts/example/expected/stdout.txt")
    );
    assert_eq!(
        joined("stderr"),
        read("tests/scripts/example/expected/stderr.txt")
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
    // The dimensions are the engine's own facts of each result (open decision #175, C5; Zeff
    // 0.9.0): a frame's rows and columns, a table's, and the observations of a fit, which is
    // the N its print gives.
    assert_eq!(wages["rows"], 18412);
    assert_eq!(wages["columns"], 11);
    assert_eq!(wages["frame"]["variables"], 11);
    assert_eq!(each[1]["rows"], 537);
    assert_eq!(each[2]["rows"], 8);
    assert_eq!(each[2]["columns"], 8);
    assert_eq!(each[2]["n"], Value::Null);
    assert_eq!(each[3]["type"], "RegFit");
    assert_eq!(each[3]["n"], 18179);
    assert_eq!(each[3]["rows"], Value::Null);
    assert!(
        each[4]["stdout"].as_str().unwrap().contains("N = 18,179"),
        "{}",
        each[4]["stdout"]
    );
    assert!(each.iter().all(|one| one["error"] == Value::Null));
}

#[test]
fn a_statement_s_result_is_the_engines_own_fact_of_it_for_each_kind_of_result() {
    // tests/scripts/binary.zeff: a frame, a fit bound and printed, a table, three results of
    // tests, a plot, and a statement that stops the run.
    let host = Host::new("demo");
    let done = run_at(&host, &read("tests/scripts/binary.zeff"), 0);
    let each = done["statements"].as_array().unwrap();
    let facts: Vec<(Value, Value, Value)> = each
        .iter()
        .map(|one| (one["name"].clone(), one["type"].clone(), one["n"].clone()))
        .collect();
    let fact = |name: Option<&str>, ty: Option<&str>, n: Option<u64>| {
        (
            name.map_or(Value::Null, Value::from),
            ty.map_or(Value::Null, Value::from),
            n.map_or(Value::Null, Value::from),
        )
    };
    assert_eq!(
        facts,
        [
            fact(Some("wages"), Some("Frame"), None),
            fact(Some("lg"), Some("GlmFit"), Some(18390)),
            fact(None, Some("GlmFit"), Some(18390)),
            fact(None, Some("Table"), None),
            fact(None, Some("TestResult"), Some(18390)),
            fact(None, Some("TestResult"), Some(18390)),
            fact(Some("roc"), Some("TestResult"), Some(18390)),
            fact(None, Some("Plot"), None),
            fact(Some("apart"), Some("Frame"), None),
            // The fit that fails gives no result, and the statement after it did not run.
            fact(None, None, None),
            fact(None, None, None),
        ]
    );
    assert_eq!(each[3]["rows"], 4);
    assert_eq!(each[3]["columns"], 6);
    assert_eq!(each[8]["frame"]["rows"], 6);
    // The statement that stopped the run carries the engine's record of the error, as fields.
    let error = &each[9]["error"];
    assert_eq!(error["code"], "Z0803");
    assert_eq!(error["severity"], "error");
    assert_eq!(
        error["message"],
        "glm: `dose` perfectly predicts `cured` (separation)"
    );
    assert_eq!(error["span"]["line"], 10);
    assert_eq!(each[9]["ran"], true);
    assert_eq!(each[10]["ran"], false);
    assert_eq!(each[10]["error"], Value::Null);
}

#[test]
fn a_run_prints_at_the_width_asked_as_zeff_run_does() {
    let text = read("tests/scripts/example/scripts/main.zeff");
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

#[test]
fn the_check_finds_what_zeff_check_finds_and_says_it_the_same_way() {
    for name in ["plain", "warning", "error", "refused", "binary"] {
        let host = Host::new("demo");
        let checked: Value = serde_json::from_str(&host.check(
            "scripts/main.zeff",
            &read(&format!("tests/scripts/{name}.zeff")),
        ))
        .unwrap();
        assert_eq!(checked["type"], "checked");
        let said = checked["said"].as_str().unwrap();
        assert_eq!(
            said,
            read(&format!("tests/scripts/check/{name}.stderr")),
            "{name}"
        );
        // Its two parts: what it found, then its last line.
        let found = checked["found"].as_str().unwrap();
        let summary = checked["summary"].as_str().unwrap();
        assert!(said.starts_with(found), "{name}");
        assert!(said.ends_with(&format!("{summary}\n")), "{name}");
        let refused = name == "refused";
        assert_eq!(checked["exit_code"], i32::from(refused), "{name}");
        // A record for every message it wrote, an error among them only where it refused.
        let records = checked["findings"].as_array().unwrap();
        let messages = said
            .lines()
            .filter(|line| {
                ["error", "warning", "note"]
                    .iter()
                    .any(|kind| line.starts_with(kind))
            })
            .count();
        assert_eq!(records.len(), messages, "{name}");
        assert_eq!(
            records.iter().any(|one| one["severity"] == "error"),
            refused,
            "{name}"
        );
    }
    let host = Host::new("demo");
    let checked: Value =
        serde_json::from_str(&host.check("scripts/main.zeff", &read("tests/scripts/refused.zeff")))
            .unwrap();
    let finding = &checked["findings"][0];
    assert_eq!(finding["code"], "Z0103");
    assert_eq!(finding["severity"], "error");
}

/// What each statement of `text` needs, by the line it begins on, as lines.
fn needs(text: &str) -> Vec<(u64, Vec<u64>)> {
    let host = Host::new("demo");
    let graph: Value = serde_json::from_str(&host.dependencies("scripts/main.zeff", text)).unwrap();
    assert_eq!(graph["type"], "dependencies");
    graph["statements"]
        .as_array()
        .unwrap()
        .iter()
        .map(|one| {
            (
                one["line"].as_u64().unwrap(),
                one["needs"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .map(|line| line.as_u64().unwrap())
                    .collect(),
            )
        })
        .collect()
}

#[test]
fn what_a_statement_needs_is_the_engines_dependency_graph() {
    // Each statement needs itself and what it reads, and theirs; nothing else.
    assert_eq!(
        needs("let a = 1\nlet b = 2\nlet c = a + 1\nprint(c)\nprint(b)\n"),
        [
            (1, vec![1]),
            (2, vec![2]),
            (3, vec![1, 3]),
            (4, vec![1, 3, 4]),
            (5, vec![2, 5])
        ]
    );
    // A later `let` of the same name shadows the earlier: a statement reads the one above it.
    assert_eq!(
        needs("let a = 1\nprint(a)\nlet a = 2\nprint(a)\n"),
        [(1, vec![1]), (2, vec![1, 2]), (3, vec![3]), (4, vec![3, 4])]
    );
    // A seed set earlier is kept for every statement after it, since the graph cannot tell
    // which statements draw.
    assert_eq!(
        needs("let n = 3\nseed(7)\nlet x = draw(normal(), n)\nprint(1)\n"),
        [
            (1, vec![1]),
            (2, vec![2]),
            (3, vec![1, 2, 3]),
            (4, vec![2, 4])
        ]
    );
    // A chain over several lines is one statement, known by its first line.
    assert_eq!(
        needs("let w = dataset(wages)\n    .where(year == 2010)\nw.summary([wage])\n"),
        [(1, vec![1]), (3, vec![1, 3])]
    );
}

#[test]
fn a_run_of_chosen_statements_runs_them_alone_and_prints_what_the_whole_run_prints_for_them() {
    let text = read("tests/scripts/example/scripts/main.zeff");
    let whole = run_at(&Host::new("scratch"), &text, 0);
    // The summary at line 8 needs the frames of lines 4 and 5.
    let lines: [u32; 3] = [4, 5, 8];
    let host = Host::new("scratch");
    let asked = Asked {
        only: Some(&lines),
        ..Asked::default()
    };
    let done: Value =
        serde_json::from_str(&host.run("scripts/main.zeff", &text, &asked, never, &|_| {}))
            .unwrap();
    assert_eq!(done["exit_code"], 0, "{}", done["stderr"]);
    let ran: Vec<u64> = done["statements"]
        .as_array()
        .unwrap()
        .iter()
        .map(|one| one["line"].as_u64().unwrap())
        .collect();
    assert_eq!(ran, lines.map(u64::from));
    for one in done["statements"].as_array().unwrap() {
        let same = whole["statements"]
            .as_array()
            .unwrap()
            .iter()
            .find(|other| other["line"] == one["line"])
            .unwrap();
        assert_eq!(one["stdout"], same["stdout"], "line {}", one["line"]);
        assert_eq!(one["stderr"], same["stderr"], "line {}", one["line"]);
    }
    // The text run keeps every line where it was, with the others blanked.
    let blanked = only("scripts/main.zeff", &text, &lines);
    assert_eq!(blanked.lines().count(), text.lines().count());
    assert!(blanked.lines().nth(11).unwrap().trim().is_empty());
    assert_eq!(blanked.lines().nth(7), text.lines().nth(7));
    assert_eq!(blanked.lines().next(), text.lines().next());
}

#[test]
fn a_codes_explained_page_is_what_zeff_explain_prints() {
    let page: Value = serde_json::from_str(&explain("W0201")).unwrap();
    assert_eq!(page["type"], "explained");
    assert_eq!(
        page["page"]["text"].as_str().unwrap(),
        read("tests/scripts/explain-W0201.txt")
    );
    // The link a diagnostic carries, in either case, finds the same page.
    let linked: Value = serde_json::from_str(&explain("zeff://explain/w0201")).unwrap();
    assert_eq!(linked["page"]["code"], "W0201");
    let none: Value = serde_json::from_str(&explain("Q9999")).unwrap();
    assert_eq!(none["type"], "error");
    let codes: Value = serde_json::from_str(&explained_codes()).unwrap();
    assert_eq!(codes["type"], "codes");
    assert!(
        codes["families"]
            .as_array()
            .unwrap()
            .iter()
            .flat_map(|family| family["codes"].as_array().unwrap())
            .any(|code| code["code"] == "W0201")
    );
}

/// A message of the Language Server Protocol, as an editor sends it.
fn rpc(id: Option<u64>, method: &str, params: Value) -> String {
    let mut message = serde_json::json!({ "jsonrpc": "2.0", "method": method, "params": params });
    if let Some(id) = id {
        message["id"] = serde_json::json!(id);
    }
    message.to_string()
}

/// What the language server answers a message with, each message read as JSON.
fn ask(host: &Host, message: &str) -> Vec<Value> {
    let answered: Vec<String> = serde_json::from_str(&host.language(message)).unwrap();
    answered
        .iter()
        .map(|one| serde_json::from_str(one).unwrap())
        .collect()
}

#[test]
fn the_engines_language_server_answers_an_editor_over_the_project_in_memory() {
    let host = Host::new("demo");
    let uri = "file:///project/scripts/main.zeff";
    let started = ask(
        &host,
        &rpc(
            Some(1),
            "initialize",
            serde_json::json!({ "capabilities": {} }),
        ),
    );
    assert_eq!(started[0]["id"], 1);
    assert!(started[0]["result"]["capabilities"]["hoverProvider"] != Value::Null);
    ask(&host, &rpc(None, "initialized", serde_json::json!({})));
    // A document opened with a mistake: the checker's diagnostics come straight back.
    let text = "let w = dataset(wages)\nlet z = nosuch(3)\nw.summary([wage])\n";
    let told = ask(
        &host,
        &rpc(
            None,
            "textDocument/didOpen",
            serde_json::json!({ "textDocument": { "uri": uri, "languageId": "zeff", "version": 1, "text": text } }),
        ),
    );
    let published = told
        .iter()
        .find(|one| one["method"] == "textDocument/publishDiagnostics")
        .unwrap();
    let diagnostics = published["params"]["diagnostics"].as_array().unwrap();
    assert!(diagnostics.iter().any(|one| one["code"] == "Z0103"));
    // What is known of the word under the cursor: `summary`, a function with its page.
    let hover = ask(
        &host,
        &rpc(
            Some(2),
            "textDocument/hover",
            serde_json::json!({ "textDocument": { "uri": uri }, "position": { "line": 2, "character": 4 } }),
        ),
    );
    assert_eq!(hover[0]["id"], 2);
    assert!(
        hover[0]["result"]["contents"]
            .to_string()
            .contains("summary"),
        "{}",
        hover[0]
    );
    // Completion after `w.`: the methods of a frame.
    let changed = "let w = dataset(wages)\nw.\n";
    ask(
        &host,
        &rpc(
            None,
            "textDocument/didChange",
            serde_json::json!({ "textDocument": { "uri": uri, "version": 2 }, "contentChanges": [{ "text": changed }] }),
        ),
    );
    let offered = ask(
        &host,
        &rpc(
            Some(3),
            "textDocument/completion",
            serde_json::json!({ "textDocument": { "uri": uri }, "position": { "line": 1, "character": 2 } }),
        ),
    );
    let items = offered[0]["result"]["items"]
        .as_array()
        .or_else(|| offered[0]["result"].as_array())
        .unwrap()
        .clone();
    assert!(
        items.iter().any(|one| one["label"] == "summary"),
        "{}",
        offered[0]
    );
}

#[test]
fn a_functions_help_page_is_what_zeff_help_prints() {
    let host = Host::new("demo");
    let found: Value = serde_json::from_str(&host.help("summary")).unwrap();
    assert_eq!(found["type"], "help");
    assert_eq!(
        found["page"].as_str().unwrap(),
        read("tests/scripts/help-summary.txt")
    );
    let none: Value = serde_json::from_str(&host.help("nosuch")).unwrap();
    assert_eq!(none["page"], Value::Null);
    assert!(
        read("tests/scripts/help-nosuch.stderr").contains(none["message"].as_str().unwrap()),
        "{none}"
    );
}

#[test]
fn a_page_of_a_frames_rows_is_written_as_the_engine_prints_the_frame() {
    let host = Host::new("demo");
    let done = run_at(&host, "let wages = dataset(wages)\nwages\n", 0);
    let printed = done["stdout"].as_str().unwrap().to_string();
    let page: Value = serde_json::from_str(&host.rows("wages", 0, 3, &Shown::default())).unwrap();
    assert_eq!(page["type"], "rows");
    // The header is the engine's first line of the frame.
    assert_eq!(
        page["header"].as_str().unwrap(),
        printed.lines().next().unwrap()
    );
    assert_eq!(page["total"], 18412);
    let variables = page["variables"].as_array().unwrap();
    assert_eq!(variables.len(), 11);
    assert!(
        variables
            .iter()
            .any(|one| one["name"] == "wage" && one["right"] == true)
    );
    // Each row's cells, in order, are the cells of the same row as the engine prints it.
    for (at, row) in page["rows"].as_array().unwrap().iter().enumerate() {
        let line = printed
            .lines()
            .find(|line| line.trim_start().starts_with(&format!("{} ", at + 1)))
            .unwrap();
        let mut rest = line.trim_start()[format!("{} ", at + 1).len()..].to_string();
        for cell in row.as_array().unwrap() {
            let cell = cell.as_str().unwrap();
            let found = rest
                .find(cell)
                .unwrap_or_else(|| panic!("{cell} not in {line}"));
            rest = rest[found + cell.len()..].to_string();
        }
    }
    // A page past the end is empty, and a frame not bound is said to be none.
    let past: Value =
        serde_json::from_str(&host.rows("wages", 18412, 50, &Shown::default())).unwrap();
    assert!(past["rows"].as_array().unwrap().is_empty());
    let none: Value = serde_json::from_str(&host.rows("nosuch", 0, 5, &Shown::default())).unwrap();
    assert_eq!(none["type"], "error");
}

/// Every row of a view of a frame, its cells as the engine prints them.
fn every_row(host: &Host, name: &str, shown: &Shown<'_>) -> (Value, Vec<Value>) {
    let page: Value = serde_json::from_str(&host.rows(name, 0, usize::MAX, shown)).unwrap();
    assert_eq!(page["type"], "rows", "{page}");
    let rows = page["rows"].as_array().unwrap().clone();
    (page, rows)
}

#[test]
fn a_sorted_view_is_what_data_sort_gives() {
    let host = Host::new("demo");
    run_at(
        &host,
        "let wages = dataset(wages)\nlet down = wages.sort(wage, desc: true)\nlet up = wages.sort(hours)\n",
        0,
    );
    for (sort, made) in [(("wage", true), "down"), (("hours", false), "up")] {
        let shown = Shown {
            sort: Some(sort),
            ..Shown::default()
        };
        let (page, viewed) = every_row(&host, "wages", &shown);
        let (_, sorted) = every_row(&host, made, &Shown::default());
        assert_eq!(page["kept"], 18412);
        assert_eq!(viewed, sorted, "the view sorted by {sort:?} is `{made}`");
    }
    // A variable not in the frame cannot sort it, and the view says so.
    let shown = Shown {
        sort: Some(("nosuch", false)),
        ..Shown::default()
    };
    let error: Value = serde_json::from_str(&host.rows("wages", 0, 5, &shown)).unwrap();
    assert_eq!(error["type"], "error");
}

#[test]
fn a_filtered_view_is_what_data_where_gives() {
    let host = Host::new("demo");
    run_at(
        &host,
        "let wages = dataset(wages)\nlet kept = wages.where(year >= 2010 && female == 1).sort(age)\nlet older = wages.where(exper > 10)\n",
        0,
    );
    let filtered: Value =
        serde_json::from_str(&host.filter("wages", "year >= 2010 && female == 1")).unwrap();
    assert_eq!(filtered["type"], "filter");
    assert_eq!(filtered["ok"], true, "{filtered}");
    let shown = Shown {
        sort: Some(("age", false)),
        filtered: true,
        ..Shown::default()
    };
    let (page, viewed) = every_row(&host, "wages", &shown);
    let (_, made) = every_row(&host, "kept", &Shown::default());
    assert_eq!(page["kept"].as_u64().unwrap() as usize, made.len());
    assert_eq!(filtered["rows"].as_u64().unwrap() as usize, made.len());
    assert_eq!(viewed, made);
    // The frame's own header and count stay those of the whole frame.
    assert_eq!(page["total"], 18412);
    // Not filtered, the view is the whole frame again.
    let (whole, _) = every_row(&host, "wages", &Shown::default());
    assert_eq!(whole["kept"], 18412);

    // What the engine says of the statement comes with it: the note of the rows dropped
    // where the condition was NA, and the error of a condition it cannot run.
    let noted: Value = serde_json::from_str(&host.filter("wages", "exper > 10")).unwrap();
    assert_eq!(noted["ok"], true);
    assert!(
        noted["said"].as_str().unwrap().starts_with("note"),
        "{noted}"
    );
    let (_, viewed) = every_row(
        &host,
        "wages",
        &Shown {
            filtered: true,
            ..Shown::default()
        },
    );
    let (_, made) = every_row(&host, "older", &Shown::default());
    assert_eq!(viewed, made);
    let refused: Value = serde_json::from_str(&host.filter("wages", "yaer > 1")).unwrap();
    assert_eq!(refused["ok"], false);
    assert!(
        refused["said"].as_str().unwrap().starts_with("error"),
        "{refused}"
    );
    // An empty condition keeps every row.
    let cleared: Value = serde_json::from_str(&host.filter("wages", "")).unwrap();
    assert_eq!(cleared["ok"], true);
}

#[test]
fn a_search_keeps_the_rows_with_a_cell_that_holds_it_and_each_header_has_its_distribution() {
    let host = Host::new("demo");
    run_at(&host, "let wages = dataset(wages)\n", 0);
    let shown = Shown {
        search: "MANU",
        ..Shown::default()
    };
    let (page, rows) = every_row(&host, "wages", &shown);
    let kept = page["kept"].as_u64().unwrap() as usize;
    assert_eq!(kept, rows.len());
    assert!(kept > 0 && kept < 18412, "{kept}");
    for row in &rows {
        assert!(
            row.as_array().unwrap().iter().any(|cell| cell
                .as_str()
                .unwrap()
                .to_lowercase()
                .contains("manu"))
        );
    }
    // A number's header has the bins of the engine's histogram, and a whole number of a few
    // values a bar for each value, by its label: their counts add to the values not missing.
    for variable in page["variables"].as_array().unwrap() {
        let bars = &variable["bars"];
        if variable["name"] == "female" {
            assert_eq!(bars["levels"], serde_json::json!(["male", "female"]));
        }
        if variable["type"] == "Float" || variable["type"] == "Int" {
            let counted: u64 = bars["counts"]
                .as_array()
                .unwrap()
                .iter()
                .map(|count| count.as_u64().unwrap())
                .sum();
            assert_eq!(
                counted + variable["missing"].as_u64().unwrap(),
                18412,
                "{variable}"
            );
            assert!(bars["levels"].is_array() || bars["width"].as_f64().unwrap() > 0.0);
        }
    }
}

#[test]
fn each_statement_copy_as_zeff_writes_gives_what_the_view_showed() {
    // The statements of tests/scripts/copy-as-zeff.json, which the interface's own tests hold
    // its builders to, each run by the engine after the frame is made.
    let cases: Value = serde_json::from_str(&read("tests/scripts/copy-as-zeff.json")).unwrap();
    for case in cases.as_array().unwrap() {
        let statement = case["statement"].as_str().unwrap();
        let host = Host::new("demo");
        match case["kind"].as_str().unwrap() {
            "view" => {
                let done = run_at(
                    &host,
                    &format!("let wages = dataset(wages)\nlet copied = {statement}\n"),
                    0,
                );
                assert_eq!(done["exit_code"], 0, "{statement}: {done}");
                let condition = case["where"].as_str().unwrap();
                let filtered: Value =
                    serde_json::from_str(&host.filter("wages", condition)).unwrap();
                assert_eq!(filtered["ok"], true, "{filtered}");
                let sort = case["sort"]["variable"]
                    .as_str()
                    .map(|variable| (variable, case["sort"]["desc"] == true));
                let shown = Shown {
                    sort,
                    filtered: !condition.is_empty(),
                    ..Shown::default()
                };
                let (_, viewed) = every_row(&host, "wages", &shown);
                let (_, made) = every_row(&host, "copied", &Shown::default());
                assert_eq!(viewed, made, "{statement}");
            }
            // The viewer copies a view alone: a variable is not changed from it (#203).
            other => panic!("no such case: {other}"),
        }
    }
}

#[test]
fn each_statement_the_variables_pane_asks_prints_what_zeff_run_prints() {
    // tests/scripts/properties.json: the statements the Variables pane asks of the engine for a
    // variable (a summary, the quartiles, the distinct values, each value's count and share,
    // the rows without a value, a date's ends), each with what the released `zeff run` printed
    // for it after the two lines that make the frames. The interface reads its cells out of
    // these prints, so they are held here byte for byte.
    let kept: Value = serde_json::from_str(&read("tests/scripts/properties.json")).unwrap();
    let setup = kept["setup"].as_str().unwrap();
    let cases = kept["cases"].as_array().unwrap();
    assert_eq!(cases.len(), 24);
    for case in cases {
        let statement = case["statement"].as_str().unwrap();
        let host = Host::new("demo");
        let done = run_at(&host, &format!("{setup}{statement}\n"), 0);
        assert_eq!(done["exit_code"], 0, "{statement}: {done}");
        assert_eq!(done["stdout"], case["printed"], "{statement}");
    }
}

#[test]
fn the_bindings_are_listed_as_zeff_repl_lists_them() {
    // tests/scripts/repl/vars.stdout is what the released `zeff repl` printed for `:vars`
    // after the four statements of tests/scripts/repl/console.txt.
    let typed = read("tests/scripts/repl/console.txt");
    let statements: String = typed
        .lines()
        .filter(|line| !line.starts_with(':'))
        .map(|line| format!("{line}\n"))
        .collect();
    let host = Host::new("demo");
    let listed: Value = serde_json::from_str(&host.vars("scripts/main.zeff", &statements)).unwrap();
    assert_eq!(listed["type"], "vars");
    assert_eq!(listed["printed"], read("tests/scripts/repl/vars.stdout"));
    assert_eq!(listed["said"], "");
    // A function's parameters and its own lets are not bindings a later statement sees.
    let with_function =
        format!("fn twice(x: Float) -> Float {{\n    let y = x * 2\n    y\n}}\n{statements}");
    let listed: Value =
        serde_json::from_str(&host.vars("scripts/main.zeff", &with_function)).unwrap();
    assert_eq!(listed["printed"], read("tests/scripts/repl/vars.stdout"));
    let none: Value = serde_json::from_str(&host.vars("scripts/main.zeff", "print(1)\n")).unwrap();
    assert_eq!(none["printed"], "");
    assert_eq!(
        none["said"],
        "no bindings yet: `let name = ...` makes one\n"
    );
}

#[test]
fn a_report_of_a_failure_is_what_zeff_report_bug_writes() {
    // tests/scripts/report/: the reports the released `zeff report-bug` wrote for two scripts
    // run as a project's `scripts/main.zeff`, on this machine (`aarch64 macos`).
    for (script, written) in [
        ("error.zeff", "main-Z0715-c20d7af0.md"),
        ("framed.zeff", "main-Z0707-5e4b623a.md"),
    ] {
        let host = Host::new("demo");
        let text = read(&format!("tests/scripts/report/{script}"));
        let report: Value =
            serde_json::from_str(&host.report("scripts/main.zeff", &text, "aarch64 macos"))
                .unwrap();
        assert_eq!(report["type"], "report");
        assert_eq!(report["ok"], true, "{report}");
        assert_eq!(report["kind"], "error");
        assert_eq!(report["name"], written);
        assert_eq!(
            report["text"],
            read(&format!("tests/scripts/report/{written}")),
            "{script}"
        );
        assert_eq!(report["reduced"], true);
    }
}

#[test]
fn a_report_of_an_internal_error_says_it_is_a_bug_in_zeff_and_nothing_to_report_is_said() {
    let host = Host::new("demo");
    let text = read("tests/scripts/report/framed.zeff");
    // The engine's test hook plants an internal error at the third statement.
    let report: Value =
        serde_json::from_str(&host.report_planted("scripts/main.zeff", &text, "wasm32 browser", 3))
            .unwrap();
    assert_eq!(report["kind"], "internal error", "{report}");
    assert_eq!(report["code"], "Z9001");
    assert!(report["name"].as_str().unwrap().starts_with("main-Z9001-"));
    let written = report["text"].as_str().unwrap();
    assert!(written.contains("This is a bug in Zeff, not in the script"));
    assert!(written.contains("- platform: wasm32 browser"));
    // A script that runs through has nothing to report, as the command line says.
    let none: Value =
        serde_json::from_str(&host.report("scripts/main.zeff", "print(1)\n", "wasm32 browser"))
            .unwrap();
    assert_eq!(none["ok"], false);
    assert_eq!(
        none["message"],
        "the script ran without an error: there is nothing to report"
    );
}

#[test]
fn the_reader_tests_scripts_each_run_without_an_error() {
    // docs/releases/0.2-reader-test/scripts: the ten scripts of the reader test (the testing
    // handbook, section 2.4, item 4), which the readers paste into the alpha.
    let folder = format!(
        "{}/../docs/releases/0.2-reader-test/scripts",
        env!("CARGO_MANIFEST_DIR")
    );
    let mut names: Vec<String> = std::fs::read_dir(&folder)
        .unwrap()
        .map(|entry| entry.unwrap().file_name().to_string_lossy().into_owned())
        .filter(|name| name.ends_with(".zeff"))
        .collect();
    names.sort();
    assert_eq!(names.len(), 10);
    for name in names {
        let host = Host::new("reader");
        let text = std::fs::read_to_string(format!("{folder}/{name}")).unwrap();
        let done = run_at(&host, &text, 0);
        assert_eq!(done["exit_code"], 0, "{name}: {}", done["stderr"]);
        assert!(
            !done["stdout"].as_str().unwrap().is_empty(),
            "{name} printed nothing"
        );
    }
}

/// The packages of the index, each with its functions.
fn indexed() -> Vec<(String, u64, Vec<Value>)> {
    let index: Value = serde_json::from_str(&help_index()).unwrap();
    index["packages"]
        .as_array()
        .unwrap()
        .iter()
        .map(|package| {
            (
                package["name"].as_str().unwrap().to_string(),
                package["tier"].as_u64().unwrap(),
                package["functions"].as_array().unwrap().clone(),
            )
        })
        .collect()
}

/// A function of the index, by its package and name.
fn indexed_function(package: &str, name: &str) -> Value {
    indexed()
        .into_iter()
        .find(|(of, _, _)| of == package)
        .and_then(|(_, _, functions)| functions.into_iter().find(|f| f["name"] == name))
        .unwrap_or_else(|| panic!("{package}.{name} is not in the index"))
}

/// The names of one language a function of the index has, each with where it was read.
fn names_of(function: &Value, of: &str) -> Vec<(String, String, String)> {
    function["names"]
        .as_array()
        .unwrap()
        .iter()
        .filter(|name| name["of"] == of)
        .map(|name| {
            (
                name["name"].as_str().unwrap().to_string(),
                name["shown"].as_str().unwrap().to_string(),
                name["from"].as_str().unwrap().to_string(),
            )
        })
        .collect()
}

fn name(name: &str, shown: &str, from: &str) -> (String, String, String) {
    (name.to_string(), shown.to_string(), from.to_string())
}

#[test]
fn the_index_of_the_help_lists_the_packages_shipped_in_the_tiers_order_and_the_datasets() {
    let index: Value = serde_json::from_str(&help_index()).unwrap();
    assert_eq!(index["type"], "helpIndex");
    assert_eq!(index["engine"], "0.9.0");
    let packages: Vec<(String, u64)> = indexed()
        .into_iter()
        .map(|(name, tier, _)| (name, tier))
        .collect();
    let expected = [
        ("core", 0),
        ("time", 1),
        ("text", 1),
        ("data", 1),
        ("dist", 1),
        ("results", 1),
        ("stats", 1),
        ("plot", 1),
        ("datasets", 1),
        ("regress", 2),
        ("glm", 2),
    ];
    assert_eq!(
        packages,
        expected.map(|(name, tier)| (name.to_string(), tier))
    );
    // The datasets, each with the one line its page begins with.
    let datasets = index["datasets"].as_array().unwrap();
    let names: Vec<&str> = datasets
        .iter()
        .map(|d| d["name"].as_str().unwrap())
        .collect();
    assert_eq!(names, ["firms", "sleep", "staff", "wages"]);
    let host = Host::new("demo");
    for dataset in datasets {
        let name = dataset["name"].as_str().unwrap();
        let summary = dataset["summary"].as_str().unwrap();
        assert!(!dataset["title"].as_str().unwrap().is_empty(), "{name}");
        let found: Value = serde_json::from_str(&host.help(name)).unwrap();
        let page = found["page"].as_str().unwrap();
        assert!(
            page.lines().next().unwrap().contains(summary),
            "{name}: {summary}"
        );
    }
}

#[test]
fn each_package_s_functions_are_those_zeff_help_prints_for_it_in_its_order() {
    // What the released `zeff help <package>` of 0.9.0 printed (`tests/scripts/packages/`).
    // Three packages have a function of their own name (`text`, `plot`, `datasets`), whose
    // page the command prints in place of the list: the list of those is not printed anywhere.
    for package in [
        "core", "time", "data", "dist", "results", "stats", "regress",
    ] {
        let printed = read(&format!("tests/scripts/packages/{package}.txt"));
        let mut lines = printed.lines();
        let head = lines.next().unwrap();
        assert!(head.starts_with(&format!("{package} · tier ")), "{head}");
        let listed: Vec<(String, String)> = lines
            .filter(|line| line.starts_with("  "))
            .map(|line| {
                let (name, summary) = line.trim().split_once(' ').unwrap();
                (name.to_string(), summary.trim().to_string())
            })
            .collect();
        // The count the page gives is the count of its lines.
        let count: usize = head
            .split(" · ")
            .nth(2)
            .and_then(|words| words.split(' ').next())
            .and_then(|count| count.parse().ok())
            .unwrap();
        assert_eq!(listed.len(), count, "{package}");
        let (_, tier, functions) = indexed()
            .into_iter()
            .find(|(name, _, _)| name == package)
            .unwrap();
        assert!(head.contains(&format!("tier {tier} ")), "{head}");
        let ours: Vec<(String, String)> = functions
            .iter()
            .map(|f| {
                (
                    f["name"].as_str().unwrap().to_string(),
                    f["summary"].as_str().unwrap().to_string(),
                )
            })
            .collect();
        assert_eq!(ours, listed, "{package}");
    }
}

#[test]
fn the_index_holds_every_function_this_engine_runs_and_none_of_a_later_release() {
    let registry = zeff_engine::registry::registry().unwrap();
    let catalogue = registry.catalogue();
    let host = Host::new("demo");
    let mut ours: Vec<(String, String)> = Vec::new();
    let mut apart: Vec<(String, String, String)> = Vec::new();
    for (package, _, functions) in indexed() {
        assert!(!functions.is_empty(), "{package}");
        for function in functions {
            let name = function["name"].as_str().unwrap().to_string();
            // The catalogue has it as implemented, and it opens a page.
            let row = catalogue
                .find(&package, &name)
                .unwrap_or_else(|| panic!("{package}.{name} is not in the catalogue"));
            assert_eq!(row.status, "implemented", "{package}.{name}");
            assert!(!function["summary"].as_str().unwrap().is_empty(), "{name}");
            let found: Value = serde_json::from_str(&host.help(&name)).unwrap();
            assert!(found["page"].is_string(), "{package}.{name} has no page");
            // A name is listed once for each function it names (open decision #215): two of
            // a package differ in the type of the value they are called on.
            let on = function["first"]["type"].as_str().unwrap_or("").to_string();
            assert!(
                !apart.contains(&(package.clone(), name.clone(), on.clone())),
                "{package}.{name} of {on} is listed twice"
            );
            assert!(
                function["usage"]
                    .as_str()
                    .unwrap()
                    .contains(&format!("{name}(")),
                "{package}.{name}: {}",
                function["usage"]
            );
            apart.push((package.clone(), name.clone(), on));
            ours.push((package.clone(), name));
        }
    }
    // Every registered function is there: 266, of 262 names by package.
    assert_eq!(apart.len(), 266);
    assert_eq!(
        apart.len(),
        zeff_engine::registry::registry().unwrap().functions().len()
    );
    ours.sort();
    ours.dedup();
    assert_eq!(ours.len(), 262);
    // Every function the catalogue has as implemented is there, once.
    let mut theirs: Vec<(String, String)> = catalogue
        .rows()
        .iter()
        .filter(|row| row.status == "implemented")
        .map(|row| (row.package.clone(), row.name.clone()))
        .collect();
    theirs.sort();
    theirs.dedup();
    ours.sort();
    assert_eq!(ours, theirs);
    // Functions of Zeff 0.10.0 and of the roadmap, which the catalogue lists, are not.
    for later in ["mcnemar_test", "reliability", "xtreg", "logit_reg"] {
        assert!(ours.iter().all(|(_, name)| name != later), "{later}");
    }
}

#[test]
fn a_name_with_two_functions_is_listed_twice_each_with_what_it_is_called_on() {
    // Open decision #215: the Help place gives each a page of its own, told apart by the type
    // of the value it is called on, and by its usage.
    let of = |package: &str, name: &str| -> Vec<(String, String, bool, String)> {
        let (_, _, functions) = indexed()
            .into_iter()
            .find(|(one, _, _)| one == package)
            .unwrap();
        functions
            .iter()
            .filter(|f| f["name"] == name)
            .map(|f| {
                (
                    f["first"]["name"].as_str().unwrap_or("").to_string(),
                    f["first"]["type"].as_str().unwrap_or("").to_string(),
                    f["method"].as_bool().unwrap(),
                    f["usage"].as_str().unwrap().to_string(),
                )
            })
            .collect()
    };
    let histogram = of("plot", "histogram");
    assert_eq!(histogram.len(), 2);
    assert_eq!(
        (
            histogram[0].0.as_str(),
            histogram[0].1.as_str(),
            histogram[0].2
        ),
        ("p", "Plot", true)
    );
    assert!(
        histogram[0].3.starts_with("p.histogram("),
        "{}",
        histogram[0].3
    );
    assert_eq!(
        (
            histogram[1].0.as_str(),
            histogram[1].1.as_str(),
            histogram[1].2
        ),
        ("data", "Frame", true)
    );
    assert!(
        histogram[1].3.starts_with("data.histogram(var"),
        "{}",
        histogram[1].3
    );
    // A function written before its values: its first parameter, and no receiver.
    let min = of("core", "min");
    assert_eq!(min.len(), 1);
    assert_eq!(
        (min[0].0.as_str(), min[0].2, min[0].3.as_str()),
        ("a", false, "min(a, b, ...)")
    );
    assert_eq!(of("data", "min")[0].1, "Frame");
    // The usage is the line the page gives under Usage, where it fits on one line.
    let host = Host::new("demo");
    let found: Value = serde_json::from_str(&host.help("append")).unwrap();
    let page = found["page"].as_str().unwrap();
    for (package, on) in [("core", "List"), ("data", "Frame")] {
        let one = &of(package, "append")[0];
        assert_eq!(one.1, on);
        assert!(page.contains(&format!("    {}\n", one.3)), "{}", one.3);
    }
    // A function that takes no value has none.
    let (_, _, core) = indexed()
        .into_iter()
        .find(|(one, _, _)| one == "core")
        .unwrap();
    assert!(core.iter().any(|f| f["first"].is_null()));
}

#[test]
fn a_function_s_r_and_stata_names_come_from_its_page_and_from_the_catalogue() {
    // A page with the table, from Zeff 0.9.0 (the pages of `stats` in the fuller form): the
    // names are the page's own.
    let t_test = indexed_function("stats", "t_test");
    assert_eq!(names_of(&t_test, "R"), [name("t.test", "t.test()", "page")]);
    // Of Stata, the command and what its table writes with brackets, which the index reads as
    // it reads a function called (`vce()` on the page of `ivreg`, since 0.2.3): generous by
    // its rule, so that a reader who types `by` or `level` is led here too.
    assert_eq!(
        names_of(&t_test, "Stata"),
        [
            name("ttest", "ttest", "page"),
            name("by", "by()", "page"),
            name("level", "level()", "page")
        ]
    );
    // A page without the table (those of `regress` wait for 0.10.0): every name is the
    // catalogue's.
    let reg = indexed_function("regress", "reg");
    assert_eq!(
        names_of(&reg, "R"),
        [
            name("lm", "lm()", "catalogue"),
            name("feols", "fixest::feols()", "catalogue")
        ]
    );
    assert_eq!(
        names_of(&reg, "Stata"),
        [
            name("regress", "regress", "catalogue"),
            name("reghdfe", "reghdfe", "catalogue")
        ]
    );
    // A page with the table: its names first, then the catalogue's it did not give.
    let error = indexed_function("core", "error");
    assert_eq!(names_of(&error, "R"), [name("stop", "stop()", "page")]);
    assert_eq!(
        names_of(&error, "Stata"),
        [
            name("display", "display", "page"),
            name("exit", "exit", "page"),
            name("error", "error", "catalogue")
        ]
    );
    let max = indexed_function("core", "max");
    assert_eq!(
        names_of(&max, "R"),
        [name("pmax", "pmax()", "page"), name("max", "max()", "page")]
    );
    // A function with no equivalent has no name, and is listed all the same.
    let h0 = indexed_function("results", "h0");
    assert_eq!(h0["names"].as_array().unwrap().len(), 0);
    // A name with two homes is listed in each.
    assert_eq!(indexed_function("data", "summary")["name"], "summary");
    assert_eq!(indexed_function("results", "summary")["name"], "summary");
}

#[test]
fn a_project_that_names_another_engine_is_refused_in_the_command_lines_words() {
    // tests/scripts/pin/: the manifest `zeff new demo` of 0.8.0 wrote, and what the released
    // `zeff run` and `zeff check` of 0.9.0 say of a project that holds it, with exit code 4.
    let said = read("tests/scripts/pin/another-engine.stderr");
    let host = Host::new("demo");
    assert!(host.add_file("zeff.toml", read("tests/scripts/pin/zeff.toml").as_bytes()));
    // A run: nothing runs, and the refusal is the whole of what is told and said. It is told
    // as the engine tells what it says before a first statement.
    let (told, done) = run(&host, "print(1 + 1)\n");
    assert_eq!(told.len(), 1, "{told:?}");
    let event: Value = serde_json::from_str(&told[0]).unwrap();
    assert_eq!(event["type"], "output");
    assert_eq!(event["stdout"], "");
    assert_eq!(event["stderr"], said);
    let done: Value = serde_json::from_str(&done).unwrap();
    assert_eq!(done["exit_code"], 4);
    assert_eq!(done["stdout"], "");
    assert_eq!(done["stderr"], said);
    assert_eq!(done["statements"].as_array().unwrap().len(), 0);
    assert_eq!(done["frames"].as_array().unwrap().len(), 0);
    // A check, in the same words.
    let checked: Value =
        serde_json::from_str(&host.check("scripts/main.zeff", "print(1 + 1)\n")).unwrap();
    assert_eq!(checked["exit_code"], 4);
    assert_eq!(checked["said"], said);
    assert_eq!(checked["found"], said);
    // The bindings and a report are not made either: each would run the script.
    let listed: Value =
        serde_json::from_str(&host.vars("scripts/main.zeff", "let a = 1\n")).unwrap();
    assert_eq!(listed["printed"], "");
    assert_eq!(listed["said"], said);
    let report: Value = serde_json::from_str(&host.report(
        "scripts/main.zeff",
        "error(\"stop\")\n",
        "aarch64 macos",
    ))
    .unwrap();
    assert_eq!(report["ok"], false);
    assert_eq!(
        report["message"],
        "error[Z0710]: this project needs Zeff 0.8.0, but this is Zeff 0.9.0"
    );
    // The same project moved to this engine, by the one line of its manifest, runs.
    let moved = read("tests/scripts/pin/zeff.toml").replace("0.8.0", engine_version());
    assert!(host.add_file("zeff.toml", moved.as_bytes()));
    let (_, done) = run(&host, "print(1 + 1)\n");
    let done: Value = serde_json::from_str(&done).unwrap();
    assert_eq!(done["exit_code"], 0);
    assert_eq!(done["stdout"], "2\n");
}

#[test]
fn a_run_s_prints_are_made_again_at_another_width_without_a_new_run() {
    // Open decision #175, C6. tests/scripts/widths/: what the released `zeff run --width`
    // printed for the example at 40 and at 80 characters.
    let text = read("tests/scripts/example/scripts/main.zeff");
    let host = Host::new("scratch");
    let told: RefCell<Vec<String>> = RefCell::default();
    let done: Value = serde_json::from_str(&host.run(
        "scripts/main.zeff",
        &text,
        &Asked::default(),
        never,
        &|json| told.borrow_mut().push(json.to_string()),
    ))
    .unwrap();
    let events = told.borrow().len();
    let at = |width: usize| -> Value {
        serde_json::from_str(&host.printed_at("scripts/main.zeff", &text, width)).unwrap()
    };
    for width in [40, 80] {
        let printed = at(width);
        assert_eq!(printed["type"], "printed");
        assert_eq!(printed["width"], width);
        let each = printed["statements"].as_array().unwrap();
        // One for each statement that ran, on its line, in order.
        let lines: Vec<u64> = each
            .iter()
            .map(|one| one["line"].as_u64().unwrap())
            .collect();
        assert_eq!(lines, [4, 5, 8, 12, 13, 16, 17, 20, 21]);
        // Put together, they are what `zeff run --width` prints, character for character.
        let joined: String = each
            .iter()
            .map(|one| one["stdout"].as_str().unwrap().to_string())
            .collect();
        assert_eq!(
            joined,
            read(&format!("tests/scripts/widths/example-{width}.stdout")),
            "at {width}"
        );
    }
    // At the width of the run they are what the run printed.
    let own: String = at(118)["statements"]
        .as_array()
        .unwrap()
        .iter()
        .map(|one| one["stdout"].as_str().unwrap().to_string())
        .collect();
    assert_eq!(own, done["stdout"].as_str().unwrap());
    // Nothing was run for any of them: no event was told after the run's own.
    assert_eq!(told.borrow().len(), events);
    // The same script with lines after it, as the interface runs it to draw its figures: the
    // prints of its statements are given for the script itself.
    let with_more = format!("{text}print(\"a line the interface added\")\n");
    run_at(&host, &with_more, 0);
    let joined: String = at(80)["statements"]
        .as_array()
        .unwrap()
        .iter()
        .filter(|one| one["line"].as_u64().unwrap() <= 21)
        .map(|one| one["stdout"].as_str().unwrap().to_string())
        .collect();
    assert_eq!(joined, read("tests/scripts/widths/example-80.stdout"));
    // Another text than the one last run: nothing is given, and the interface runs it again.
    let other: Value =
        serde_json::from_str(&host.printed_at("scripts/main.zeff", "print(1)\n", 80)).unwrap();
    assert_eq!(other["statements"], Value::Null);
    let elsewhere: Value =
        serde_json::from_str(&host.printed_at("scripts/other.zeff", &text, 80)).unwrap();
    assert_eq!(elsewhere["statements"], Value::Null);
    // A run of some statements alone ran a text of its own, with the others blanked.
    let part: Value = serde_json::from_str(&host.run(
        "scripts/main.zeff",
        &text,
        &Asked {
            only: Some(&[4, 5]),
            ..Asked::default()
        },
        never,
        &|_| {},
    ))
    .unwrap();
    assert_eq!(part["exit_code"], 0);
    assert_eq!(at(80)["statements"], Value::Null);
    // No print is narrower than 40 characters.
    let narrow = at(39);
    assert_eq!(narrow["type"], "error");
    assert_eq!(
        narrow["message"],
        "a print is at least 40 characters wide, and 39 was asked for"
    );
    // A project in which nothing has run holds no print.
    let fresh = Host::new("scratch");
    let none: Value =
        serde_json::from_str(&fresh.printed_at("scripts/main.zeff", &text, 80)).unwrap();
    assert_eq!(none["statements"], Value::Null);
}

#[test]
fn the_sections_of_a_script_are_the_engines_reading_of_its_headings() {
    // Open decision #178, from Zeff 0.9.0. The cases are those the interface's own reader of
    // comments was held to until release 0.3 (`src/editor/sections.test.ts`), and the engine
    // answers each as that reader did, but for one, said below.
    use zemp_worker::{Sectioned, sections};
    let of = |text: &str| sections("scripts/main.zeff", text);
    let section = |line: u32, level: u8, title: &str, end: u32| Sectioned {
        line,
        end,
        level,
        title: title.to_string(),
    };
    let script = [
        "// Returns to schooling.",
        "",
        "// # Sample",
        "let wages = dataset(wages)",
        "    .where(year >= 2012)",
        "",
        "// # Models",
        "// ## Pooled",
        "let m1 = wages.reg(lwage ~ educ)",
        "// ## Fixed effects",
        "let m3 = wages.reg(lwage ~ educ, fe: year)",
        "",
        "// # Figure",
        "let shape = wages.plot(x: lwage).histogram()",
        "",
    ]
    .join("\n");
    assert_eq!(
        of(&script),
        [
            section(3, 1, "Sample", 6),
            section(7, 1, "Models", 12),
            section(8, 2, "Pooled", 9),
            section(10, 2, "Fixed effects", 12),
            section(13, 1, "Figure", 14),
        ]
    );
    // None in a script without headings, and none in an empty one.
    assert_eq!(of("// a comment\nprint(1)\n"), []);
    assert_eq!(of(""), []);
    // Whatever the spaces round its marks, and the title as written.
    assert_eq!(
        of("//# Data\n//  ##   Cleaning the wages  \n"),
        [
            section(1, 1, "Data", 2),
            section(2, 2, "Cleaning the wages", 2)
        ]
    );
    assert_eq!(
        of("// # Models: pooled, then fixed effects (#2)\n"),
        [section(1, 1, "Models: pooled, then fixed effects (#2)", 1)]
    );
    // What is not a heading: no title, no space after the mark, three marks, a comment after
    // code, no comment at all, a line of help text, the mark at the end.
    for line in [
        "// #",
        "// #Data",
        "// ### Deeper",
        "print(1) // # After code",
        "# Data",
        "/// # Data",
        "// Data #",
    ] {
        assert_eq!(of(&format!("{line}\nprint(1)\n")), [], "{line}");
    }
    // A heading-like line inside a statement that runs over several lines is a comment.
    assert_eq!(
        of(
            "// # Real\nlet fit = wages.reg(lwage ~ educ,\n// # Not a section\n    se: robust)\nprint(fit)"
        ),
        [section(1, 1, "Real", 5)]
    );
    // A subsection ends at the next heading of any level, and a section at the next section.
    assert_eq!(
        of("// ## Loose\nprint(1)\n// # A\n// ## B\nprint(2)\n// ## C\nprint(3)"),
        [
            section(1, 2, "Loose", 2),
            section(3, 1, "A", 7),
            section(4, 2, "B", 5),
            section(6, 2, "C", 7),
        ]
    );
    // The one case the reader answered otherwise: a heading set in from the margin, between
    // two statements. The reader passed it over, taking any indent for the inside of a block;
    // the engine knows where a statement begins and ends, and it stands between two.
    assert_eq!(
        of("  // # Indented\nprint(1)\n"),
        [section(1, 1, "Indented", 2)]
    );
    // And as a line of JSON, with the statements of the same text.
    let both: Value =
        serde_json::from_str(&statements_json("scripts/main.zeff", "// # A\nprint(1)\n")).unwrap();
    assert_eq!(both["type"], "statements");
    assert_eq!(both["statements"].as_array().unwrap().len(), 1);
    assert_eq!(
        both["sections"],
        serde_json::json!([{"line": 1, "end": 2, "level": 1, "title": "A"}])
    );
}

#[test]
fn a_run_s_plots_are_laid_out_at_a_size_without_a_new_run_as_export_writes_them() {
    // Open decision #197. tests/scripts/figures/: the two figures the released `zeff run`
    // wrote for the example with `export("…", size: [150.02, 93.13])` added for its two plots.
    let text = read("tests/scripts/example/scripts/main.zeff");
    let host = Host::new("scratch");
    let told: RefCell<Vec<String>> = RefCell::default();
    let done: Value = serde_json::from_str(&host.run(
        "scripts/main.zeff",
        &text,
        &Asked::default(),
        never,
        &|json| told.borrow_mut().push(json.to_string()),
    ))
    .unwrap();
    let events = told.borrow().len();
    // The outcome lists the plots the statements made: the two bound with `let`, and the two
    // statements that are those names alone, each with its line, its name, its theme and its
    // kind, which is the marks its layers are drawn with (a histogram is drawn with bars; the
    // word of its print, `histogram`, is the layer's, and is what the interface shows).
    assert_eq!(
        done["plots"],
        serde_json::json!([
            {"line": 16, "name": "schooling", "kind": "ribbon, points, lines", "theme": "journal"},
            {"line": 17, "name": null, "kind": "ribbon, points, lines", "theme": "journal"},
            {"line": 20, "name": "shape", "kind": "bars", "theme": "journal"},
            {"line": 21, "name": null, "kind": "bars", "theme": "journal"},
        ])
    );
    let at = |line: u32, width: f64, height: f64| -> Value {
        serde_json::from_str(&host.plot_svg("scripts/main.zeff", &text, line, width, height))
            .unwrap()
    };
    // At the size `export` was given, the figure is the file `export` wrote, byte for byte:
    // from the `let`, and from the statement that is the name alone.
    for (line, kept) in [(16, 1), (17, 1), (20, 2), (21, 2)] {
        let plot = at(line, 150.02, 93.13);
        assert_eq!(plot["type"], "plot");
        assert_eq!(plot["held"], true);
        assert_eq!(plot["line"], line);
        assert_eq!(
            plot["svg"].as_str().unwrap(),
            read(&format!("tests/scripts/figures/example-figure-{kept}.svg")),
            "line {line}"
        );
    }
    // Another size is another figure; nothing was run for any of them.
    assert_ne!(at(16, 89.0, 66.0)["svg"], at(16, 150.02, 93.13)["svg"]);
    assert_eq!(told.borrow().len(), events);
    // A page too small for the plot's labels: the engine's own words, and that the size is
    // at fault.
    let small = at(16, 8.0, 6.0);
    assert_eq!(small["held"], true);
    assert_eq!(small["svg"], Value::Null);
    assert_eq!(small["of_size"], true);
    assert!(!small["message"].as_str().unwrap().is_empty());
    // A statement that made no plot, another text, and a project in which nothing ran: not held.
    assert_eq!(at(4, 150.02, 93.13)["held"], false);
    let other: Value =
        serde_json::from_str(&host.plot_svg("scripts/main.zeff", "print(1)\n", 16, 150.02, 93.13))
            .unwrap();
    assert_eq!(other["held"], false);
    let fresh: Value = serde_json::from_str(&Host::new("scratch").plot_svg(
        "scripts/main.zeff",
        &text,
        16,
        150.02,
        93.13,
    ))
    .unwrap();
    assert_eq!(fresh["held"], false);
}

#[test]
fn a_plot_is_held_where_its_name_is_bound_again_and_where_a_later_statement_fails() {
    // The two limits of drawing a plot by a run with an `export` added after the script: the
    // plot of a name bound again further down, where the name at the end holds another value;
    // and the plot of a run that fails further down, which never reaches the lines added.
    let text = "let pay = frame(educ = [10.0, 12, 14, 16], wage = [11.0, 14, 19, 26])\n\
                let p = pay.plot(x: educ, y: wage).points()\n\
                let p = pay.plot(x: educ).histogram(bins: 3)\n\
                let q = pay.scatter(wage, educ)\n\
                error(\"stop\")\n\
                let r = pay.scatter(educ, wage)\n";
    let host = Host::new("demo");
    let done: Value = serde_json::from_str(&run(&host, text).1).unwrap();
    assert_eq!(done["exit_code"], 1);
    let listed: Vec<(u64, String, String)> = done["plots"]
        .as_array()
        .unwrap()
        .iter()
        .map(|one| {
            (
                one["line"].as_u64().unwrap(),
                one["name"].as_str().unwrap().to_string(),
                one["kind"].as_str().unwrap().to_string(),
            )
        })
        .collect();
    assert_eq!(
        listed,
        [
            (2, "p".to_string(), "points".to_string()),
            (3, "p".to_string(), "bars".to_string()),
            (4, "q".to_string(), "points".to_string()),
        ]
    );
    let figure = |line: u32| -> String {
        let plot: Value =
            serde_json::from_str(&host.plot_svg("scripts/main.zeff", text, line, 120.0, 80.0))
                .unwrap();
        assert_eq!(plot["held"], true, "line {line}");
        plot["svg"].as_str().unwrap().to_string()
    };
    // Each is the plot of its own statement: the first `p` is the points, not the histogram.
    let (first, second, third) = (figure(2), figure(3), figure(4));
    assert_ne!(first, second);
    assert_ne!(first, third);
    // And each is what `export` writes for that plot at that size, in a script of its own.
    for (made, svg) in [
        ("pay.plot(x: educ, y: wage).points()", &first),
        ("pay.plot(x: educ).histogram(bins: 3)", &second),
        ("pay.scatter(wage, educ)", &third),
    ] {
        let alone = Host::new("demo");
        let script = format!(
            "let pay = frame(educ = [10.0, 12, 14, 16], wage = [11.0, 14, 19, 26])\n\
             {made}.export(\"output/figure.svg\", size: [120, 80])\n"
        );
        assert!(run(&alone, &script).1.contains(r#""exit_code": 0"#));
        assert_eq!(
            String::from_utf8(alone.file("output/figure.svg").unwrap()).unwrap(),
            **svg,
            "{made}"
        );
    }
    // The statement after the one that failed made nothing.
    let after: Value =
        serde_json::from_str(&host.plot_svg("scripts/main.zeff", text, 6, 120.0, 80.0)).unwrap();
    assert_eq!(after["held"], false);
}
