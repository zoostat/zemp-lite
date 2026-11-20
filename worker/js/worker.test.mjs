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

test("the engine in the worker is the released Zeff 0.8.0", async (t) => {
  const { next } = started(t, 0);
  assert.deepEqual(await next("ready"), { type: "ready", version: "0.8.0" });
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
      [1, null, "Nothing", "one\n"],
      [2, "d", "Frame", ""],
      [3, null, "Nothing", "2\n"],
    ],
  );
  assert.deepEqual(done.statements[1].frame, { rows: 3, variables: 1 });
  const pieces = said.filter((message) => message.type === "output");
  assert.equal(pieces.map((piece) => piece.stdout).join(""), done.stdout);
  assert.equal(pieces.map((piece) => piece.stderr).join(""), done.stderr);
});

test("the example prints, in the worker, what `zeff run` 0.8.0 prints, byte for byte", async (t) => {
  const example = path.resolve(here, "..", "..", "examples", "scratch");
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
      text: read("examples/scratch/scripts/main.zeff"),
      width,
    });
    const done = await next("done");
    assert.equal(done.stdout, read(`tests/scripts/widths/example-${width}.stdout`));
    assert.equal(done.stderr, read(`tests/scripts/widths/example-${width}.stderr`));
  }
});

test("the statements of a text are given without a project and without a run", async (t) => {
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
  });
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

test("a file a run wrote is given back, and passed to the interface, not copied", async (t) => {
  const { worker, said, next } = await opened(t, 0);
  const script =
    "let pay = frame(educ = [10.0, 12, 14, 16], wage = [11.0, 14, 19, 26])\n" +
    'pay.plot(x: educ, y: wage).points().export("output/figure.svg", size: [120, 80])\n';
  worker.postMessage({ type: "run", script: "scripts/main.zeff", text: script });
  assert.equal((await next("done")).exit_code, 0);
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
