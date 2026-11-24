// The facts the landing page and the loading screen are built from (release 0.2.4, step 4),
// held to the engine the release carries: each is the worker's own, and where one cannot be
// had the tool says which and stops the build.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import { FactError, excerpt, factsOf, travelling } from "./facts-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const at = (...parts) => path.join(root, ...parts);
const script = fs.readFileSync(at("examples", "scratch", "scripts", "main.zeff"), "utf8");
const expected = fs.readFileSync(at("examples", "scratch", "expected", "main.stdout"), "utf8");

globalThis.zeffHost = { event() {}, cancelled: () => false };
const engine = createRequire(import.meta.url)(at("worker", "pkg", "node", "zemp_worker.js"));

/** An engine that answers as the worker does, but for what a test changes. */
function stub(changes = {}) {
  return {
    engineVersion: () => engine.engineVersion(),
    helpIndex: () => engine.helpIndex(),
    codesExplained: () => engine.codesExplained(),
    Project: engine.Project,
    ...changes,
  };
}

/** A project whose every run ends as given. */
function ending(done) {
  return class {
    run() {
      return JSON.stringify(done);
    }
  };
}

test("each fact is the worker's own", () => {
  const facts = factsOf({ engine, script, expected, travels: 2_900_000 });
  assert.equal(facts.engine, engine.engineVersion());
  const index = JSON.parse(engine.helpIndex());
  assert.equal(facts.packages, index.packages.length);
  assert.equal(facts.functions, index.packages.flatMap((one) => one.functions).length);
  assert.equal(
    facts.codes,
    JSON.parse(engine.codesExplained()).families.flatMap((family) => family.codes).length,
  );
  assert.equal(facts.travels, 2_900_000);
});

test("the script shown is the Scratch project's own lines, and its print is what the released `zeff run` printed", () => {
  const facts = factsOf({ engine, script, expected, travels: 1 });
  // Every line shown is a line of the Scratch project's script, in the script's order.
  const lines = script.split("\n");
  let from = 0;
  for (const line of facts.script.trimEnd().split("\n")) {
    const found = lines.indexOf(line, from);
    assert.notEqual(found, -1, `not a line of the Scratch script, in its order: ${line}`);
    from = found + 1;
  }
  assert.match(facts.script, /^\/\/ Returns to schooling/);
  assert.match(facts.script, /report\(\[m1, m2, m3\]\)\n$/);
  assert.doesNotMatch(facts.script, /\/\/ #/);
  // The print is a part of what `zeff run` printed for the whole script, byte for byte, and it
  // is the table of the three regressions to its last line.
  assert.ok(expected.includes(facts.printed));
  assert.ok(expected.endsWith(facts.printed));
  assert.match(facts.printed, /^\s+\(1\)\s+\(2\)\s+\(3\)\n/);
});

test("a script without a section it shows, or that does not say what it is, stops the build", () => {
  assert.throws(() => excerpt("let a = 1\n"), FactError);
  assert.throws(
    () => excerpt("// A script.\n// # Sample\nlet a = 1\n"),
    /no section called Models/,
  );
  assert.throws(
    () => excerpt("// A script.\n// # Sample\n\n// # Models\nlet a = 1\n"),
    /section Sample of the Scratch script is empty/,
  );
  assert.equal(
    excerpt(
      "// A script.\n\n// # Sample\nlet a = 1\n\n// # Other\nlet b = 2\n// # Models\nprint(a)\n",
    ),
    "// A script.\nlet a = 1\nprint(a)\n",
  );
});

test("an engine that does not say its version, or lists nothing, stops the build", () => {
  assert.throws(
    () => factsOf({ engine: stub({ engineVersion: () => "" }), script, expected, travels: 1 }),
    /did not say its version/,
  );
  const none = JSON.stringify({ ...JSON.parse(engine.helpIndex()), packages: [] });
  assert.throws(
    () => factsOf({ engine: stub({ helpIndex: () => none }), script, expected, travels: 1 }),
    /lists no function/,
  );
  assert.throws(
    () =>
      factsOf({
        engine: stub({ codesExplained: () => JSON.stringify({ families: [] }) }),
        script,
        expected,
        travels: 1,
      }),
    /lists no explained code/,
  );
});

test("a script that fails, prints nothing, or prints what `zeff run` did not, stops the build", () => {
  const failed = ending({ exit_code: 1, stdout: "", stderr: "error[Z0101]: no such name\n" });
  assert.throws(
    () => factsOf({ engine: stub({ Project: failed }), script, expected, travels: 1 }),
    /did not run on this engine \(exit code 1\): error\[Z0101\]/,
  );
  const silent = ending({ exit_code: 0, stdout: "\n", stderr: "" });
  assert.throws(
    () => factsOf({ engine: stub({ Project: silent }), script, expected, travels: 1 }),
    /printed nothing/,
  );
  const other = ending({ exit_code: 0, stdout: "a table of other numbers\n", stderr: "" });
  assert.throws(
    () => factsOf({ engine: stub({ Project: other }), script, expected, travels: 1 }),
    /not what the released `zeff run` printed/,
  );
  assert.throws(
    () => factsOf({ engine, script, expected, travels: 0 }),
    /travelling size could not be measured/,
  );
});

test("the travelling size is the files' own, compressed as the host sends them, and is kept by what they hold", () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "zemp-facts-"));
  try {
    const web = path.join(folder, "web");
    fs.mkdirSync(web);
    assert.throws(() => travelling(path.join(folder, "nowhere")), /worker is not built/);
    fs.writeFileSync(path.join(web, "zemp_worker.js"), "export const a = 1;\n".repeat(200));
    assert.throws(() => travelling(web), /worker is not built/);
    const wasm = Buffer.from("the engine ".repeat(5000));
    fs.writeFileSync(path.join(web, "zemp_worker_bg.wasm"), wasm);
    fs.writeFileSync(path.join(web, "zemp_worker.d.ts"), "not sent to a browser");
    const brotli = (buffer) =>
      zlib.brotliCompressSync(buffer, {
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
          [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buffer.length,
        },
      }).length;
    const sizes = brotli(wasm) + brotli(fs.readFileSync(path.join(web, "zemp_worker.js")));
    const kept = path.join(folder, "kept", "travels.json");
    assert.equal(travelling(web, kept), sizes);
    assert.equal(Object.keys(JSON.parse(fs.readFileSync(kept, "utf8"))).length, 2);
    // Read again from what was kept; and measured again once a file holds something else.
    assert.equal(travelling(web, kept), sizes);
    fs.writeFileSync(path.join(web, "zemp_worker_bg.wasm"), Buffer.from("another ".repeat(9000)));
    assert.notEqual(travelling(web, kept), sizes);
    // What was kept, if it cannot be read, is measured afresh.
    fs.writeFileSync(kept, "not json");
    assert.equal(travelling(web, kept) > 0, true);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test("the tool prints the facts of this build as one line, which the measure of risk R4 agrees with", () => {
  const ran = spawnSync(process.execPath, [at("tools", "facts.mjs")], { encoding: "utf8" });
  assert.equal(ran.status, 0, ran.stderr);
  const facts = JSON.parse(ran.stdout);
  assert.deepEqual(Object.keys(facts).sort(), [
    "codes",
    "engine",
    "functions",
    "packages",
    "printed",
    "script",
    "travels",
  ]);
  // The measure of risk R4 prints the same total, in kilobytes.
  const measured = spawnSync(process.execPath, [at("tools", "measure-worker.mjs")], {
    encoding: "utf8",
  });
  assert.equal(measured.status, 0, measured.stderr);
  const total = /\*\*Total\*\* \| [\d.]+ kB \| \*\*([\d.]+) kB\*\*/.exec(measured.stdout);
  assert.notEqual(total, null, measured.stdout);
  assert.equal((facts.travels / 1000).toFixed(1), total[1]);
});
