// The paper's worker, tested under a worker thread of Node: the messages of `host.mjs` on the
// WebAssembly build of `node paper/build.mjs`, which is the build a browser runs.
// Usage: node --test paper/js/worker.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { Worker } from "node:worker_threads";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, "..", "pkg", "node");
assert.ok(
  fs.existsSync(path.join(pkg, "zemp_paper.js")),
  "the Paper module is not built: run `npm run build:paper` first",
);
const font = (name) => new Uint8Array(fs.readFileSync(path.resolve(here, "..", "fonts", name)));
const FACES = ["Regular", "Italic", "Bold", "BoldItalic"].map(
  (face) => `LibertinusSerif-${face}.otf`,
);
const MAIN = "paper/paper.typ";

// A worker, what it has said since it was last asked, and a way to wait for a message. The
// worker ends with its test, whether the test passes or fails.
function started(t) {
  const worker = new Worker(path.join(here, "worker.node.mjs"), { workerData: { pkg } });
  t.after(() => worker.terminate());
  const said = [];
  let wake = null;
  worker.on("message", (message) => {
    said.push(message);
    if (wake) wake();
  });
  const next = async (type) => {
    for (;;) {
      const at = said.findIndex((message) => message.type === type);
      if (at >= 0) return said.splice(at, 1)[0];
      await new Promise((resolve) => (wake = resolve));
    }
  };
  return { worker, said, next };
}

// A worker with the module's fonts given and a paper open.
async function opened(t) {
  const { worker, said, next } = started(t);
  await next("ready");
  for (const name of FACES) {
    worker.postMessage({ type: "font", bytes: font(name) });
    await next("fonted");
  }
  worker.postMessage({ type: "open", main: MAIN });
  await next("opened");
  return { worker, said, next };
}

test("the worker says it is ready, with Typst's version", async (t) => {
  const { next } = started(t);
  assert.deepEqual(await next("ready"), { type: "ready", typst: "0.15.1" });
});

test("a font is read before any paper is open, and a file that is no font is said to hold none", async (t) => {
  const { worker, next } = started(t);
  await next("ready");
  worker.postMessage({ type: "font", id: 1, bytes: font(FACES[0]) });
  assert.deepEqual(await next("fonted"), {
    type: "fonted",
    id: 1,
    faces: 1,
    families: ["Libertinus Serif"],
  });
  worker.postMessage({ type: "font", id: 2, bytes: new TextEncoder().encode("not a font") });
  assert.deepEqual(await next("fonted"), { type: "fonted", id: 2, faces: 0, families: [] });
  worker.postMessage({ type: "font", id: 3 });
  assert.deepEqual(await next("error"), {
    type: "error",
    id: 3,
    message: "a font was sent without its bytes",
  });
});

test("a paper is set to pages in the fonts given before it was opened, and each page and the PDF are given", async (t) => {
  const { worker, said, next } = await opened(t);
  worker.postMessage({
    type: "text",
    id: 1,
    path: MAIN,
    text: '#set page(paper: "a4")\n= Returns to schooling\n\nA paragraph, with *weight* and _stress_.\n#pagebreak()\nA second page.\n',
  });
  assert.deepEqual(await next("put"), { type: "put", id: 1, path: MAIN });
  worker.postMessage({ type: "set", id: 2 });
  const set = await next("set");
  assert.equal(set.id, 2);
  assert.equal(set.ok, true);
  // Nothing is said: the fonts given are found, bold and italic among them.
  assert.deepEqual(set.said, []);
  assert.equal(set.pages.length, 2);
  assert.ok(Math.abs(set.pages[0][0] - 595.276) < 0.001);
  worker.postMessage({ type: "page", id: 3, index: 0 });
  const first = await next("page");
  assert.equal(first.index, 0);
  assert.ok(first.svg.startsWith("<svg"));
  worker.postMessage({ type: "page", id: 4, index: 5 });
  assert.equal((await next("page")).svg, "");
  // The PDF, its bytes passed and not copied; the same bytes when asked again at the same time.
  worker.postMessage({ type: "pdf", id: 5, created: 1_795_000_000 });
  const pdf = await next("pdf");
  assert.equal(Buffer.from(pdf.bytes.subarray(0, 5)).toString(), "%PDF-");
  worker.postMessage({ type: "pdf", id: 6, created: 1_795_000_000 });
  const again = await next("pdf");
  const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
  assert.equal(digest(again.bytes), digest(pdf.bytes));
  worker.postMessage({ type: "pdf", id: 7, created: null });
  assert.equal(Buffer.from((await next("pdf")).bytes.subarray(0, 5)).toString(), "%PDF-");
  assert.deepEqual(said, []);
});

test("what Typst refuses is said with its file, line and column, and the last pages stay", async (t) => {
  const { worker, next } = await opened(t);
  const put = async (path, text) => {
    worker.postMessage({ type: "text", path, text });
    await next("put");
  };
  await put(MAIN, "A page that sets.\n");
  worker.postMessage({ type: "set" });
  assert.equal((await next("set")).ok, true);
  await put(MAIN, 'A page that sets.\n\n#include "tables/fit.typ"\n');
  await put("paper/tables/fit.typ", "#nosuch()\n");
  worker.postMessage({ type: "set" });
  const refused = await next("set");
  assert.equal(refused.ok, false);
  assert.equal(refused.said[0].severity, "error");
  assert.equal(refused.said[0].file, "paper/tables/fit.typ");
  assert.equal(refused.said[0].line, 1);
  assert.equal(refused.said[0].column, 2);
  assert.match(refused.said[0].message, /unknown variable: nosuch/);
  assert.equal(refused.pages.length, 1);
  worker.postMessage({ type: "page", index: 0 });
  assert.ok((await next("page")).svg.startsWith("<svg"));
  // The file forgotten, Typst says it is not there, at the line that asks for it.
  worker.postMessage({ type: "remove", id: 9, path: "paper/tables/fit.typ" });
  assert.deepEqual(await next("removed"), {
    type: "removed",
    id: 9,
    path: "paper/tables/fit.typ",
    was: true,
  });
  worker.postMessage({ type: "set" });
  const absent = await next("set");
  assert.equal(absent.said[0].file, MAIN);
  assert.equal(absent.said[0].line, 3);
  assert.match(absent.said[0].message, /file not found/);
});

test("a figure is given as bytes, a point of the page leads to its source, and the day is the one given", async (t) => {
  const { worker, next } = await opened(t);
  const figure = new TextEncoder().encode(
    '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>',
  );
  worker.postMessage({ type: "bytes", path: "output/figure.svg", bytes: figure });
  await next("put");
  worker.postMessage({
    type: "text",
    path: MAIN,
    text: '#set page(width: 300pt, height: 200pt, margin: 20pt)\n= Returns\n\n#image("../output/figure.svg", width: 40pt)\n#datetime.today().display()\n',
  });
  await next("put");
  worker.postMessage({ type: "today", year: 2026, month: 11, day: 27 });
  await next("dated");
  worker.postMessage({ type: "set" });
  const set = await next("set");
  assert.equal(set.ok, true, JSON.stringify(set.said));
  worker.postMessage({ type: "click", id: 4, page: 0, x: 30, y: 28 });
  const place = await next("place");
  assert.equal(place.id, 4);
  assert.equal(place.file, MAIN);
  assert.equal(place.line, 2);
  worker.postMessage({ type: "click", page: 0, x: 290, y: 190 });
  assert.equal((await next("place")).file, null);
  // Another day, another page.
  worker.postMessage({ type: "page", index: 0 });
  const one = (await next("page")).svg;
  worker.postMessage({ type: "today", year: 2026, month: 11, day: 28 });
  await next("dated");
  worker.postMessage({ type: "set" });
  await next("set");
  worker.postMessage({ type: "page", index: 0 });
  assert.notEqual((await next("page")).svg, one);
});

test("a paper opened after another has the fonts, and nothing of the paper before", async (t) => {
  const { worker, next } = await opened(t);
  worker.postMessage({ type: "text", path: MAIN, text: "The first paper.\n" });
  await next("put");
  worker.postMessage({ type: "open", id: 1, main: "paper/second.typ" });
  assert.deepEqual(await next("opened"), { type: "opened", id: 1, main: "paper/second.typ" });
  worker.postMessage({ type: "text", path: "paper/second.typ", text: '#include "paper.typ"\n' });
  await next("put");
  worker.postMessage({ type: "set" });
  const set = await next("set");
  // The first paper's file is not in this one; and where the second sets, its fonts are there.
  assert.equal(set.ok, false);
  assert.match(set.said[0].message, /file not found/);
  worker.postMessage({ type: "text", path: "paper/second.typ", text: "*Bold* and _italic_.\n" });
  await next("put");
  worker.postMessage({ type: "set" });
  const again = await next("set");
  assert.equal(again.ok, true);
  assert.deepEqual(again.said, []);
});

test("a message the worker cannot act on is answered, not passed over", async (t) => {
  const { worker, said, next } = started(t);
  await next("ready");
  worker.postMessage({ type: "set", id: 1 });
  assert.deepEqual(await next("error"), {
    type: "error",
    id: 1,
    message: "a setting was asked for before a paper was opened",
  });
  worker.postMessage({ type: "nosuch", id: 2 });
  assert.deepEqual(await next("error"), {
    type: "error",
    id: 2,
    message: "no such message: nosuch",
  });
  worker.postMessage({ type: "open", main: MAIN });
  await next("opened");
  worker.postMessage({ type: "text", id: 3, path: "../outside.typ", text: "x" });
  assert.deepEqual(await next("error"), {
    type: "error",
    id: 3,
    message: "the path `../outside.typ` is not inside the project",
  });
  worker.postMessage({ type: "bytes", id: 4, path: "output/figure.svg" });
  assert.deepEqual(await next("error"), {
    type: "error",
    id: 4,
    message: "a file was sent without its bytes",
  });
  // No paper has set: there is no PDF, in Typst's module's own words.
  worker.postMessage({ type: "pdf", id: 5, created: null });
  assert.deepEqual(await next("error"), { type: "error", id: 5, message: "no paper is set" });
  assert.deepEqual(said, []);
});
