// The engine's worker, tested under a worker thread of Node, as the Zeff repository tests its
// own: the messages of `host.mjs` on the WebAssembly build of `node worker/build.mjs`.
// Usage: node --test worker/js/worker.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { Worker } from "node:worker_threads";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, "..", "pkg", "node");
assert.ok(
  fs.existsSync(path.join(pkg, "zemp_worker.js")),
  "the worker is not built: run `npm run build:worker` first",
);

// A worker, what it has said since it was last asked, and a way to wait for a message.
// The worker ends with its test, whether the test passes or fails: one left running would
// keep the whole run from ending.
function started(t, deviceBytes) {
  const worker = new Worker(path.join(here, "worker.node.mjs"), {
    workerData: { pkg, deviceBytes },
  });
  t.after(() => worker.terminate());
  const said = [];
  let wake = null;
  worker.on("message", (message) => {
    said.push(message);
    if (wake) wake();
  });
  // The next message of a type, waited for; the others stay in `said`.
  const next = async (type) => {
    for (;;) {
      const at = said.findIndex((message) => message.type === type);
      if (at >= 0) return said.splice(at, 1)[0];
      await new Promise((resolve) => (wake = resolve));
    }
  };
  return { worker, said, next };
}

// A worker with a project open.
async function opened(t, deviceBytes) {
  const { worker, said, next } = started(t, deviceBytes);
  const ready = await next("ready");
  const cancel = new SharedArrayBuffer(4);
  worker.postMessage({ type: "open", name: "demo", cancel });
  await next("opened");
  return { worker, said, next, ready, flag: new Int32Array(cancel) };
}

const bytes = (text) => new TextEncoder().encode(text);
const text = (some) => new TextDecoder().decode(some);

test("the engine in the worker is the released Zeff 0.9.0", async (t) => {
  const { next } = started(t, 0);
  assert.deepEqual(await next("ready"), { type: "ready", version: "0.9.0" });
});

test("a run tells its steps and what it prints, then its outcome", async (t) => {
  const { worker, said, next } = await opened(t, 0);
  worker.postMessage({
    type: "run",
    script: "scripts/main.zeff",
    text: 'print("one")\nlet d = frame(x = [1.0, NA, 3])\nprint(d.mean(x))\n',
  });
  const done = await next("done");
  assert.equal(done.exit_code, 0, done.stderr);
  assert.equal(done.stdout, "one\n2\n");
  assert.match(done.stderr, /warning\[W0201\]/);
  assert.deepEqual(
    said.map((message) => message.type),
    [
      "ranges",
      "started",
      "output",
      "finished",
      "started",
      "finished",
      "started",
      "output",
      "finished",
    ],
  );
  // First the statements as the engine reads them, then each step.
  assert.deepEqual(said[0], {
    type: "ranges",
    statements: [1, 2, 3].map((line) => ({ line, end: line, kind: "statement" })),
  });
  assert.deepEqual(said[1], { type: "started", statement: 1, of: 3, line: 1 });
  // The outcome gives each statement with what it printed and made.
  assert.deepEqual(
    done.statements.map((one) => [one.line, one.name, one.type, one.stdout]),
    [
      // A statement that gives nothing has no type (release 0.3, step 6a: the engine's own
      // facts name the type of a result).
      [1, null, null, "one\n"],
      [2, "d", "Frame", ""],
      [3, null, null, "2\n"],
    ],
  );
  assert.deepEqual(done.statements[1].frame, { rows: 3, variables: 1 });
  const pieces = said.filter((message) => message.type === "output");
  assert.equal(pieces.map((piece) => piece.stdout).join(""), done.stdout);
  assert.equal(pieces.map((piece) => piece.stderr).join(""), done.stderr);
});

test("the example prints, in the worker, what `zeff run` 0.9.0 prints, byte for byte", async (t) => {
  const example = path.resolve(here, "..", "..", "tests", "scripts", "example");
  const read = (file) => fs.readFileSync(path.join(example, file), "utf8");
  const { worker, said, next } = await opened(t, 0);
  worker.postMessage({ type: "run", script: "scripts/main.zeff", text: read("scripts/main.zeff") });
  const done = await next("done");
  assert.equal(done.exit_code, 0, done.stderr);
  assert.equal(done.stdout, read("expected/stdout.txt"));
  assert.equal(done.stderr, read("expected/stderr.txt"));
  // The pieces told while it ran are the whole of it, and each statement began on its line.
  const pieces = said.filter((message) => message.type === "output");
  assert.equal(pieces.map((piece) => piece.stdout).join(""), done.stdout);
  assert.deepEqual(
    said.filter((message) => message.type === "started").map((message) => message.line),
    [4, 5, 8, 12, 13, 16, 17, 20, 21],
  );
  assert.deepEqual(
    done.frames.map((frame) => frame.name),
    ["wages", "w2010"],
  );
});

test("a run prints at the width asked, as `zeff run --width` does", async (t) => {
  const root = path.resolve(here, "..", "..");
  const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
  const { worker, next } = await opened(t, 0);
  for (const width of [40, 80]) {
    worker.postMessage({
      type: "run",
      script: "scripts/main.zeff",
      text: read("tests/scripts/example/scripts/main.zeff"),
      width,
    });
    const done = await next("done");
    assert.equal(done.stdout, read(`tests/scripts/widths/example-${width}.stdout`));
    assert.equal(done.stderr, read(`tests/scripts/widths/example-${width}.stderr`));
  }
});

test("the statements of a text, and its sections, are given without a project and without a run", async (t) => {
  const { worker, next } = started(t, 0);
  await next("ready");
  worker.postMessage({
    type: "statements",
    id: 7,
    script: "scripts/main.zeff",
    text: "// a note\nlet w = dataset(wages)\n    .where(year == 2010)\n\nw\n",
  });
  assert.deepEqual(await next("statements"), {
    type: "statements",
    id: 7,
    statements: [
      { line: 2, end: 3, kind: "statement" },
      { line: 5, end: 5, kind: "statement" },
    ],
    // A comment that is no heading begins no section.
    sections: [],
  });
  // The sections of the same text, as the engine reads them (release 0.3, step 6c; #178).
  worker.postMessage({
    type: "statements",
    id: 8,
    script: "scripts/main.zeff",
    text: "// # Sample\nlet w = dataset(wages)\n// ## One year\nlet y = w.where(year == 2010)\n// # Print\ny\n",
  });
  assert.deepEqual((await next("statements")).sections, [
    { line: 1, end: 4, level: 1, title: "Sample" },
    { line: 3, end: 4, level: 2, title: "One year" },
    { line: 5, end: 6, level: 1, title: "Print" },
  ]);
});

test("the check of a text is what `zeff check` says of it, and runs nothing", async (t) => {
  const root = path.resolve(here, "..", "..");
  const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
  const { worker, said, next } = await opened(t, 0);
  worker.postMessage({
    type: "check",
    id: 3,
    script: "scripts/main.zeff",
    text: read("tests/scripts/refused.zeff"),
  });
  const checked = await next("checked");
  assert.equal(checked.id, 3);
  assert.equal(checked.exit_code, 1);
  assert.equal(checked.said, read("tests/scripts/check/refused.stderr"));
  assert.equal(checked.summary, "scripts/main.zeff: 1 error, 0 warnings");
  assert.equal(checked.findings[0].code, "Z0103");
  assert.deepEqual(checked.ranges, [
    { line: 1, end: 1, kind: "statement" },
    { line: 2, end: 2, kind: "statement" },
  ]);
  assert.equal(said.filter((message) => message.type === "started").length, 0);
});

test("what each statement needs, and a run of the statements one needs alone", async (t) => {
  const { worker, next } = await opened(t, 0);
  const text = "let a = 2\nlet b = 3\nprint(a * 10)\nprint(b)\n";
  worker.postMessage({ type: "dependencies", script: "scripts/main.zeff", text });
  const graph = await next("dependencies");
  assert.deepEqual(
    graph.statements.map((one) => [one.line, one.makes, one.needs]),
    [
      [1, "a", [1]],
      [2, "b", [2]],
      [3, null, [1, 3]],
      [4, null, [2, 4]],
    ],
  );
  worker.postMessage({ type: "run", script: "scripts/main.zeff", text, only: [1, 3] });
  const done = await next("done");
  assert.equal(done.exit_code, 0, done.stderr);
  assert.equal(done.stdout, "20\n");
  assert.deepEqual(
    done.statements.map((one) => one.line),
    [1, 3],
  );
});

test("a code's explained page is given without a project, as `zeff explain` prints it", async (t) => {
  const root = path.resolve(here, "..", "..");
  const { worker, next } = started(t, 0);
  await next("ready");
  worker.postMessage({ type: "explain", id: 4, code: "W0201" });
  const explained = await next("explained");
  assert.equal(explained.id, 4);
  assert.equal(
    explained.page.text,
    fs.readFileSync(path.join(root, "tests/scripts/explain-W0201.txt"), "utf8"),
  );
  worker.postMessage({ type: "explain", id: 5, code: "Q9999" });
  assert.match((await next("error")).message, /no code `Q9999` has an explained page/);
});

test("the index of the help is given without a project: the packages, their functions, the datasets", async (t) => {
  const root = path.resolve(here, "..", "..");
  const { worker, next } = started(t, 0);
  await next("ready");
  worker.postMessage({ type: "helpIndex", id: 6 });
  const index = await next("helpIndex");
  assert.equal(index.id, 6);
  assert.equal(index.engine, "0.9.0");
  assert.deepEqual(
    index.packages.map((one) => one.name),
    [
      "core",
      "time",
      "text",
      "data",
      "dist",
      "results",
      "stats",
      "plot",
      "datasets",
      "regress",
      "glm",
    ],
  );
  // A package's functions are those the released `zeff help stats` lists, in its order.
  const printed = fs
    .readFileSync(path.join(root, "tests/scripts/packages/stats.txt"), "utf8")
    .split("\n")
    .filter((line) => line.startsWith("  "))
    .map((line) => line.trim().split(/\s+/)[0]);
  const stats = index.packages.find((one) => one.name === "stats");
  assert.deepEqual(
    stats.functions.map((one) => one.name),
    printed,
  );
  // A function with its one line, and the names a reader of R or of Stata knows it by.
  const reg = index.packages
    .find((one) => one.name === "regress")
    .functions.find((one) => one.name === "reg");
  assert.ok(reg.summary.length > 0);
  assert.deepEqual(reg.names, [
    { of: "R", name: "lm", shown: "lm()", from: "catalogue" },
    { of: "R", name: "feols", shown: "fixest::feols()", from: "catalogue" },
    { of: "Stata", name: "regress", shown: "regress", from: "catalogue" },
    { of: "Stata", name: "reghdfe", shown: "reghdfe", from: "catalogue" },
  ]);
  assert.deepEqual(
    index.datasets.map((one) => one.name),
    ["firms", "sleep", "staff", "wages"],
  );
});

test("the codes with an explained page are given by family, without a project", async (t) => {
  const { worker, next } = started(t, 0);
  await next("ready");
  worker.postMessage({ type: "codes", id: 7 });
  const codes = await next("codes");
  assert.equal(codes.id, 7);
  assert.equal(codes.families.length, 12);
  assert.deepEqual(codes.families[1].name, "Z01xx");
  assert.equal(codes.families[1].area, "Names: variables, bindings, functions, packages");
  assert.deepEqual(codes.families[1].codes[0], {
    code: "Z0101",
    kind: "error",
    title: "no such name",
  });
  assert.equal(
    codes.families.reduce((sum, one) => sum + one.codes.length, 0),
    148,
  );
});

test("the prints of the last run are given again at another width, and nothing is run for them", async (t) => {
  // Release 0.3, step 6b (open decision #175, C6).
  const root = path.resolve(here, "..", "..");
  const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
  const script = read("tests/scripts/example/scripts/main.zeff");
  const { worker, said, next } = await opened(t, 0);
  worker.postMessage({ type: "run", id: 1, script: "scripts/main.zeff", text: script });
  const done = await next("done");
  assert.equal(done.exit_code, 0);
  // What the run told is set aside: nothing more of it may come.
  said.length = 0;
  for (const width of [40, 80]) {
    worker.postMessage({
      type: "printedAt",
      id: width,
      script: "scripts/main.zeff",
      text: script,
      width,
    });
    const printed = await next("printed");
    assert.equal(printed.id, width);
    assert.equal(printed.width, width);
    assert.equal(
      printed.statements.map((one) => one.stdout).join(""),
      read(`tests/scripts/widths/example-${width}.stdout`),
    );
  }
  assert.deepEqual(
    said.filter((message) => ["started", "finished", "output", "ranges"].includes(message.type)),
    [],
  );
  // Another text than the one last run: nothing is given.
  worker.postMessage({
    type: "printedAt",
    id: 9,
    script: "scripts/main.zeff",
    text: "print(1)\n",
    width: 80,
  });
  assert.equal((await next("printed")).statements, null);
  // Under 40 characters there is no print.
  worker.postMessage({
    type: "printedAt",
    id: 10,
    script: "scripts/main.zeff",
    text: script,
    width: 20,
  });
  const refused = await next("error");
  assert.equal(refused.id, 10);
  assert.equal(refused.message, "a print is at least 40 characters wide, and 20 was asked for");
});

test("a plot of the last run is laid out at a size, as export writes it, and nothing is run for it", async (t) => {
  // Release 0.3, step 7a (open decision #197).
  const root = path.resolve(here, "..", "..");
  const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
  const script = read("tests/scripts/example/scripts/main.zeff");
  const { worker, said, next } = await opened(t, 0);
  worker.postMessage({ type: "run", id: 1, script: "scripts/main.zeff", text: script });
  const done = await next("done");
  assert.deepEqual(
    done.plots.map((one) => [one.line, one.name]),
    [
      [16, "schooling"],
      [17, null],
      [20, "shape"],
      [21, null],
    ],
  );
  said.length = 0;
  // The size in millimetres that `export` was given for the kept figures.
  const ask = (id, line, more = {}) =>
    worker.postMessage({
      type: "plotSvg",
      id,
      script: "scripts/main.zeff",
      text: script,
      line,
      width: 150.02,
      height: 93.13,
      ...more,
    });
  ask(2, 16);
  const first = await next("plot");
  assert.equal(first.id, 2);
  assert.equal(first.held, true);
  assert.equal(first.svg, read("tests/scripts/figures/example-figure-1.svg"));
  ask(3, 20);
  assert.equal((await next("plot")).svg, read("tests/scripts/figures/example-figure-2.svg"));
  assert.deepEqual(
    said.filter((message) => ["started", "finished", "output", "ranges"].includes(message.type)),
    [],
  );
  // A page too small: the engine's words, and that the size is at fault.
  ask(4, 16, { width: 8, height: 6 });
  const small = await next("plot");
  assert.equal(small.svg, null);
  assert.equal(small.of_size, true);
  assert.ok(small.message.length > 0);
  // A statement that made no plot is not held, in a run that was of this text.
  ask(5, 4);
  const none = await next("plot");
  assert.equal(none.held, false);
  assert.equal(none.ran, true);
  assert.equal(first.ran, true);
});

test("the prints are not asked for before a project is opened", async (t) => {
  const { worker, next } = started(t, 0);
  await next("ready");
  worker.postMessage({ type: "printedAt", id: 1, script: "s.zeff", text: "", width: 80 });
  assert.equal(
    (await next("error")).message,
    "the prints were asked for at another width before a project was opened",
  );
});

test("the engine's language server is spoken to through the worker, over the project", async (t) => {
  const { worker, next } = await opened(t, 0);
  const send = (id, body) =>
    worker.postMessage({ type: "language", id, body: JSON.stringify(body) });
  send(1, { jsonrpc: "2.0", id: 1, method: "initialize", params: { capabilities: {} } });
  const started = await next("language");
  assert.equal(JSON.parse(started.messages[0]).id, 1);
  send(2, {
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
    params: {
      textDocument: {
        uri: "file:///project/scripts/main.zeff",
        languageId: "zeff",
        version: 1,
        text: "let z = nosuch(3)\n",
      },
    },
  });
  const told = (await next("language")).messages.map((one) => JSON.parse(one));
  const published = told.find((one) => one.method === "textDocument/publishDiagnostics");
  assert.equal(published.params.diagnostics[0].code, "Z0103");
});

test("a function's help page is given as `zeff help` prints it, or the engine's reason", async (t) => {
  const root = path.resolve(here, "..", "..");
  const { worker, next } = await opened(t, 0);
  worker.postMessage({ type: "help", id: 8, name: "summary" });
  const found = await next("help");
  assert.equal(found.id, 8);
  assert.equal(
    found.page,
    fs.readFileSync(path.join(root, "tests/scripts/help-summary.txt"), "utf8"),
  );
  worker.postMessage({ type: "help", id: 9, name: "nosuch" });
  const none = await next("help");
  assert.equal(none.page, null);
  assert.match(none.message, /no function or package is called `nosuch`/);
});

test("rows of a frame of the last run are given a page at a time, as the engine prints them", async (t) => {
  const { worker, next } = await opened(t, 0);
  worker.postMessage({
    type: "run",
    script: "scripts/main.zeff",
    text: "let pay = frame(id = [1, 2, 3], wage = [11.5, NA, 26])\n",
  });
  await next("done");
  worker.postMessage({ type: "rows", id: 11, name: "pay", offset: 1, limit: 5 });
  const page = await next("rows");
  assert.equal(page.id, 11);
  assert.equal(page.total, 3);
  assert.equal(page.offset, 1);
  assert.deepEqual(
    page.variables.map((one) => [one.name, one.missing, one.right]),
    [
      ["id", 0, true],
      ["wage", 1, true],
    ],
  );
  assert.deepEqual(page.rows, [
    ["2", "NA"],
    ["3", "26"],
  ]);
});

test("a frame is kept to the rows of a condition, sorted and searched as the viewer asks", async (t) => {
  const { worker, next } = await opened(t, 0);
  worker.postMessage({
    type: "run",
    script: "scripts/main.zeff",
    text: 'let pay = frame(region = ["north", "south", "north"], wage = [23.5, NA, 31.25])\n',
  });
  await next("done");
  worker.postMessage({ type: "filter", id: 12, name: "pay", condition: 'region == "north"' });
  const filtered = await next("filter");
  assert.equal(filtered.id, 12);
  assert.equal(filtered.ok, true);
  assert.equal(filtered.rows, 2);
  worker.postMessage({
    type: "rows",
    name: "pay",
    offset: 0,
    limit: 10,
    sort: "wage",
    desc: true,
    filtered: true,
  });
  const page = await next("rows");
  assert.equal(page.total, 3);
  assert.equal(page.kept, 2);
  assert.deepEqual(page.rows, [
    ["north", "31.25"],
    ["north", "23.5"],
  ]);
  worker.postMessage({ type: "rows", name: "pay", offset: 0, limit: 10, search: "SOUTH" });
  const found = await next("rows");
  assert.equal(found.kept, 1);
  assert.deepEqual(found.rows, [["south", "NA"]]);
  assert.deepEqual(found.variables[0].bars, { counts: [2, 1], levels: ["north", "south"] });
});

test("the bug report of a failure is built in the worker, and nothing to report is said", async (t) => {
  const { worker, next } = await opened(t, 0);
  worker.postMessage({
    type: "report",
    id: 21,
    script: "scripts/main.zeff",
    text: 'print("a")\nlet w = import("data/none.csv")\n',
  });
  const report = await next("report");
  assert.equal(report.id, 21);
  assert.equal(report.ok, true);
  assert.equal(report.kind, "error");
  assert.equal(report.code, "Z0715");
  assert.match(report.name, /^main-Z0715-[0-9a-f]{8}\.md$/);
  assert.match(report.text, /^# Zeff bug report: an error, Z0715\n/);
  assert.match(report.text, /- platform: wasm32 browser\n/);
  worker.postMessage({ type: "report", script: "scripts/main.zeff", text: "print(1)\n" });
  const none = await next("report");
  assert.equal(none.ok, false);
  assert.equal(none.message, "the script ran without an error: there is nothing to report");
});

test("a file a run wrote is given back, and passed to the interface, not copied", async (t) => {
  const { worker, said, next } = await opened(t, 0);
  const script =
    "let pay = frame(educ = [10.0, 12, 14, 16], wage = [11.0, 14, 19, 26])\n" +
    'pay.plot(x: educ, y: wage).points().export("output/figure.svg", size: [120, 80])\n';
  worker.postMessage({ type: "run", script: "scripts/main.zeff", text: script });
  const done = await next("done");
  assert.equal(done.exit_code, 0);
  // The run's outcome names what it wrote, for the interface to bring into the project.
  assert.deepEqual(done.written, ["output/figure.svg"]);
  said.length = 0;
  worker.postMessage({ type: "read", path: "output/figure.svg", id: 7 });
  const read = await next("read");
  assert.equal(read.path, "output/figure.svg");
  assert.equal(read.id, 7);
  assert.ok(read.bytes instanceof Uint8Array);
  assert.ok(!(read.bytes.buffer instanceof SharedArrayBuffer));
  const figure = text(read.bytes);
  // A figure is written in points: 120 mm by 80 mm are 340.157 by 226.772.
  assert.match(figure, /^<\?xml[^>]*\?>\n<svg [^>]*width="340\.157pt" height="226\.772pt"/);
  assert.ok(figure.trimEnd().endsWith("</svg>"));
  // A file put in is read back as it was put; one that is not there is `null`, not an error.
  worker.postMessage({ type: "file", path: "data/pay.csv", bytes: bytes("id\n1\n"), id: 8 });
  assert.deepEqual(await next("filed"), { type: "filed", path: "data/pay.csv", id: 8 });
  worker.postMessage({ type: "read", path: "data/pay.csv" });
  assert.equal(text((await next("read")).bytes), "id\n1\n");
  worker.postMessage({ type: "read", path: "output/none.svg", id: 9 });
  assert.deepEqual(await next("read"), {
    type: "read",
    path: "output/none.svg",
    bytes: null,
    id: 9,
  });
  // A file forgotten is gone for the engine, and said to have been there; one that is not
  // there, and a path above the project, are said not to have been.
  worker.postMessage({ type: "remove", path: "data/pay.csv", id: 10 });
  assert.deepEqual(await next("removed"), {
    type: "removed",
    path: "data/pay.csv",
    was: true,
    id: 10,
  });
  worker.postMessage({ type: "read", path: "data/pay.csv" });
  assert.equal((await next("read")).bytes, null);
  worker.postMessage({ type: "remove", path: "data/pay.csv" });
  assert.deepEqual(await next("removed"), { type: "removed", path: "data/pay.csv", was: false });
  worker.postMessage({ type: "remove", path: "../secret" });
  assert.deepEqual(await next("removed"), { type: "removed", path: "../secret", was: false });
  // A folder goes with what it holds.
  worker.postMessage({ type: "remove", path: "output" });
  assert.equal((await next("removed")).was, true);
  worker.postMessage({ type: "read", path: "output/figure.svg" });
  assert.equal((await next("read")).bytes, null);
  // Nothing above the project is read or written.
  worker.postMessage({ type: "read", path: "../secret" });
  assert.deepEqual(await next("read"), { type: "read", path: "../secret", bytes: null });
  worker.postMessage({ type: "file", path: "../secret", bytes: bytes("x") });
  assert.deepEqual(await next("error"), {
    type: "error",
    message: "the path `../secret` is not inside the project",
  });
  assert.deepEqual(said, []);
});

test("a run is cancelled between two steps through the flag the two sides share", async (t) => {
  const { worker, next, flag } = await opened(t, 0);
  worker.postMessage({
    type: "run",
    script: "scripts/main.zeff",
    text: 'print("started")\nfor i in 1..200000 {\n    let rows = dataset(wages).where(year == 2015).n_rows()\n}\nprint("never")\n',
  });
  await next("pass");
  Atomics.store(flag, 0, 1);
  const done = await next("done");
  assert.equal(done.exit_code, 1);
  assert.equal(done.stdout, "started\n");
  assert.match(
    done.stderr,
    /^error\[Z0705\]: the run was cancelled before pass \d+ of this loop\n/,
  );
  // The flag is the interface's: cleared, the next run goes to its end.
  Atomics.store(flag, 0, 0);
  worker.postMessage({ type: "run", script: "scripts/main.zeff", text: "print(1 + 1)\n" });
  const again = await next("done");
  assert.equal(again.exit_code, 0);
  assert.equal(again.stdout, "2\n");
});

test("the window has a memory budget by default, and the project's own comes first", async (t) => {
  const script = 'let w = import("zeff:wages.csv")\nprint(w.n_rows())\n';
  const small = await opened(t, 4_000_000);
  small.worker.postMessage({ type: "run", script: "scripts/main.zeff", text: script });
  const refused = await small.next("done");
  assert.equal(refused.exit_code, 1);
  assert.match(
    refused.stderr,
    /error\[Z0704\]: this statement may need .* more than the budget of 2\.0 MB/,
  );
  const manifest = `[project]\nname = "demo"\nzeff = "${small.ready.version}"\nedition = "preview"\nmemory = "64MB"\n`;
  small.worker.postMessage({ type: "file", path: "zeff.toml", bytes: bytes(manifest) });
  small.worker.postMessage({ type: "run", script: "scripts/main.zeff", text: script });
  const ran = await small.next("done");
  assert.equal(ran.exit_code, 0, ran.stderr);
  assert.equal(ran.stdout, "18412\n");
});

test("a frame of the last run is passed to the interface as an Arrow stream", async (t) => {
  const { worker, next } = await opened(t, 0);
  worker.postMessage({
    type: "run",
    script: "scripts/main.zeff",
    text: 'let pay = frame(region = ["north", "south", "north"], wage = [23.5, NA, 31.25])\nlet n = pay.n_rows()\n',
  });
  const done = await next("done");
  assert.deepEqual(done.frames, [{ name: "pay", rows: 3, variables: 2 }]);
  worker.postMessage({ type: "frame", name: "pay", id: "a" });
  const frame = await next("frame");
  assert.equal(frame.id, "a");
  assert.deepEqual([...frame.bytes.subarray(0, 4)], [0xff, 0xff, 0xff, 0xff]);
  worker.postMessage({ type: "frame", name: "n", id: "b" });
  assert.deepEqual(await next("error"), {
    type: "error",
    message: "no frame called `n` in the last run",
    id: "b",
  });
});

test("a message the worker cannot act on is answered, not passed over", async (t) => {
  const { worker, said, next } = started(t, 0);
  await next("ready");
  worker.postMessage({ type: "run", script: "scripts/main.zeff", text: "print(1)\n" });
  worker.postMessage({ type: "file", path: "data/x.csv", bytes: new Uint8Array() });
  worker.postMessage({ type: "read", path: "data/x.csv" });
  worker.postMessage({ type: "dance", id: 3 });
  const answers = [
    await next("error"),
    await next("error"),
    await next("error"),
    await next("error"),
  ];
  assert.deepEqual(answers, [
    { type: "error", message: "a run was asked for before a project was opened" },
    { type: "error", message: "a file was sent before a project was opened" },
    { type: "error", message: "a file was asked for before a project was opened" },
    { type: "error", message: "no such message: dance", id: 3 },
  ]);
  assert.deepEqual(said, []);
});

test("an example of Help runs in a session of its own, with no project open, and tells its steps marked as an example's", async (t) => {
  const { worker, said, next } = started(t, 0);
  await next("ready");
  worker.postMessage({
    type: "example",
    id: 1,
    text: 'let pay = import("data/wages.csv")\nprint(pay.mean(wage))\nprint(today())\n',
    limit: 10_000,
  });
  const done = await next("exampleDone");
  assert.equal(done.id, 1);
  assert.equal(done.exit_code, 0);
  assert.equal(done.stdout, "24.5333\n2026-11-01\n");
  assert.equal(done.stopped, null);
  assert.deepEqual(
    done.statements.map((one) => [one.line, one.stdout]),
    [
      [1, ""],
      [2, "24.5333\n"],
      [3, "2026-11-01\n"],
    ],
  );
  // Its events, each marked as an example's: the statements first, then each step.
  const events = said.filter((message) => message.type !== "exampleDone");
  assert.ok(events.length > 0);
  assert.ok(events.every((message) => message.example === true));
  assert.equal(events[0].type, "ranges");
  assert.deepEqual(
    events
      .filter((message) => message.type === "output" && message.stdout !== "")
      .map((message) => message.stdout),
    ["24.5333\n", "2026-11-01\n"],
  );
  assert.ok(events.some((message) => message.type === "started"));
  assert.ok(events.some((message) => message.type === "finished"));
});

test("an example sees nothing of the reader's project and leaves the reader's run as it was", async (t) => {
  const { worker, said, next } = await opened(t, 0);
  // The reader's project: a file, a name, a frame and a plot that an example's would clash with.
  worker.postMessage({
    type: "file",
    path: "data/wages.csv",
    bytes: bytes("id,wage,hours\n9,1000,1\n"),
  });
  await next("filed");
  const script =
    'let pay = import("data/wages.csv")\nlet own = 7\nprint(pay.mean(wage))\n' +
    "let p = dataset(wages).where(year == 2010).scatter(educ, log(wage))\n";
  worker.postMessage({ type: "run", script: "scripts/main.zeff", text: script });
  const ran = await next("done");
  assert.equal(ran.stdout, "1000\n");
  const ask = (id, message) => worker.postMessage({ id, ...message });
  const kept = async () => {
    ask(50, { type: "printedAt", script: "scripts/main.zeff", text: script, width: 60 });
    const printed = await next("printed");
    ask(51, {
      type: "plotSvg",
      script: "scripts/main.zeff",
      text: script,
      line: 4,
      width: 120,
      height: 80,
    });
    const plot = await next("plot");
    ask(52, { type: "frame", name: "pay" });
    const frame = await next("frame");
    ask(53, { type: "read", path: "data/wages.csv" });
    const file = await next("read");
    return {
      printed: printed.statements,
      plot: plot.svg,
      frame: [...frame.bytes],
      file: [...file.bytes],
    };
  };
  const before = await kept();
  assert.ok(before.plot.includes("<svg"));
  said.length = 0;

  // The example: the page's own small file at the reader's path, a name of the reader's that
  // is none here, a file written, and a plot.
  ask(60, {
    type: "example",
    text: 'let pay = import("data/wages.csv")\nprint(pay.mean(wage))\npay.save("data/made.csv")\npay.scatter(hours, wage)\n',
    limit: 10_000,
  });
  const done = await next("exampleDone");
  assert.equal(done.exit_code, 0);
  assert.match(done.stdout, /^24\.5333\n/);
  assert.deepEqual(
    done.plots.map((one) => one.line),
    [4],
  );
  // Nothing of it reached the reader's run: every event was the example's.
  assert.ok(said.every((message) => message.example === true));
  said.length = 0;
  ask(61, { type: "examplePlot", line: 4, width: 120, height: 80 });
  const drawn = await next("plot");
  assert.equal(drawn.held, true);
  assert.ok(drawn.svg.includes("<svg"));
  assert.notEqual(drawn.svg, before.plot);
  ask(62, { type: "example", text: "print(own)\n", limit: 10_000 });
  const unknown = await next("exampleDone");
  assert.notEqual(unknown.exit_code, 0);
  assert.match(unknown.stderr, /own/);
  assert.match(unknown.stderr, / --> examples\.zeff:1:/);
  said.length = 0;

  // The reader's project has no file of the example's, and its run is as it was: its
  // prints, its plot, its frame and its file.
  ask(63, { type: "read", path: "data/made.csv" });
  assert.equal((await next("read")).bytes, null);
  assert.deepEqual(await kept(), before);
});

test("an example that runs beyond its time is stopped before its next step, and the worker goes on", async (t) => {
  const { worker, next, flag } = await opened(t, 0);
  const slow =
    'print("started")\nfor i in 1..200000 {\n    let rows = dataset(wages).where(year == 2015).n_rows()\n}\nprint("never")\n';
  worker.postMessage({ type: "example", id: 1, text: slow, limit: 300 });
  const done = await next("exampleDone");
  assert.equal(done.stopped, "slow");
  assert.equal(done.exit_code, 1);
  assert.equal(done.stdout, "started\n");
  assert.match(
    done.stderr,
    /^error\[Z0705\]: the run was cancelled before pass \d+ of this loop\n/,
  );
  // Stopped by the interface, through a flag of its own: the reader's flag is not touched.
  const cancel = new SharedArrayBuffer(4);
  worker.postMessage({ type: "example", id: 2, text: slow, limit: 60_000, cancel });
  await next("pass");
  Atomics.store(new Int32Array(cancel), 0, 1);
  const asked = await next("exampleDone");
  assert.equal(asked.stopped, "asked");
  assert.equal(Atomics.load(flag, 0), 0);
  // The worker is usable: the next example runs to its end, and so does a run of the reader's.
  worker.postMessage({ type: "example", id: 3, text: "print(1 + 1)\n", limit: 10_000 });
  const again = await next("exampleDone");
  assert.equal(again.stopped, null);
  assert.equal(again.stdout, "2\n");
  worker.postMessage({ type: "run", script: "scripts/main.zeff", text: "print(2 + 2)\n" });
  const run = await next("done");
  assert.equal(run.exit_code, 0);
  assert.equal(run.stdout, "4\n");
});

test("a plot of an example is not asked for before an example is run", async (t) => {
  const { worker, next } = started(t, 0);
  await next("ready");
  worker.postMessage({ type: "examplePlot", id: 4, line: 1, width: 100, height: 80 });
  assert.deepEqual(await next("error"), {
    type: "error",
    id: 4,
    message: "a plot of an example was asked for before an example was run",
  });
});
