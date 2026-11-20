//! The host of Zemp's worker, tested natively: the project in memory and its runs, as the
//! engine's own browser build has them, and the one thing added here, a file of the project
//! given back. The worker script that carries these as messages is tested under Node
//! (`js/worker.test.mjs`).

use serde_json::Value;
use std::cell::RefCell;
use zemp_worker::{
    Asked, Host, Shown, engine_version, explain, explained_codes, only, statements, statements_json,
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

#[test]
fn the_check_finds_what_zeff_check_finds_and_says_it_the_same_way() {
    for name in ["plain", "warning", "error", "refused"] {
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
    let text = read("examples/scratch/scripts/main.zeff");
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
            kind => {
                let done = run_at(
                    &host,
                    &format!("let wages = dataset(wages)\n{statement}\n"),
                    0,
                );
                assert_eq!(done["exit_code"], 0, "{statement}: {done}");
                let (page, _) = every_row(&host, "wages", &Shown::default());
                let name = case["variable"].as_str().unwrap();
                let variable = page["variables"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .find(|one| one["name"] == name)
                    .unwrap()
                    .clone();
                match kind {
                    "type" => assert_eq!(variable["type"], case["type"], "{statement}"),
                    "contrast" => {
                        assert_eq!(variable["contrast"], case["contrast"], "{statement}")
                    }
                    "labels" => {
                        let shown: Vec<&str> = variable["codes"]
                            .as_array()
                            .unwrap()
                            .iter()
                            .map(|one| one["shown"].as_str().unwrap())
                            .collect();
                        assert_eq!(shown, ["not a member", "member"], "{statement}");
                    }
                    other => panic!("no such case: {other}"),
                }
            }
        }
    }
}
