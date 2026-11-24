// The fact the loading screen is built from (release 0.2.4, step 4; pared at 0.2.5, when the
// landing page went with the others): the engine's travelling size is the built files' own,
// and where it cannot be had the tool says so and stops the build.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import { HOST_QUALITY, travelling } from "./facts-lib.mjs";
import { pack, packedBeside } from "./pack-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const at = (...parts) => path.join(root, ...parts);

test("the travelling size is the engine as the build packed it and the script as the host sends it, and the script's is kept by what it holds", () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "zemp-facts-"));
  try {
    const web = path.join(folder, "web");
    fs.mkdirSync(web);
    assert.throws(() => travelling(path.join(folder, "nowhere")), /worker is not built/);
    fs.writeFileSync(path.join(web, "zemp_worker.js"), "export const a = 1;\n".repeat(200));
    assert.throws(() => travelling(web), /worker is not built/);
    const wasm = Buffer.from("the engine ".repeat(5000));
    const engine = path.join(web, "zemp_worker_bg.wasm");
    fs.writeFileSync(engine, wasm);
    fs.writeFileSync(path.join(web, "zemp_worker.d.ts"), "not sent to a browser");
    // The engine must stand packed beside itself: that is the file the host sends.
    assert.throws(() => travelling(web), /engine is not packed/);
    const packed = packedBeside(engine);
    assert.equal(packed.bytes, pack(wasm).length);
    const brotli = (buffer) =>
      zlib.brotliCompressSync(buffer, {
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: HOST_QUALITY,
          [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buffer.length,
        },
      }).length;
    const sizes = packed.bytes + brotli(fs.readFileSync(path.join(web, "zemp_worker.js")));
    const kept = path.join(folder, "kept", "travels.json");
    assert.equal(travelling(web, kept), sizes);
    // Of the two, the script's size alone is kept: the engine's is its packed file's own.
    assert.equal(Object.keys(JSON.parse(fs.readFileSync(kept, "utf8"))).length, 1);
    assert.equal(travelling(web, kept), sizes);
    // An engine that holds something else, with the packed file of the one before beside it,
    // is not reckoned: the packed file is not this engine.
    fs.writeFileSync(engine, Buffer.from("another ".repeat(9000)));
    assert.throws(() => travelling(web, kept), /not this engine packed/);
    assert.notEqual(packedBeside(engine).bytes, packed.bytes);
    assert.notEqual(travelling(web, kept), sizes);
    // What was kept, if it cannot be read, is measured afresh.
    fs.writeFileSync(kept, "not json");
    assert.equal(travelling(web, kept) > 0, true);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test("the tool prints the fact of this build as one line; its travelling size is the least a host could send, to within a hundredth, and under the limit of risk R4", () => {
  const ran = spawnSync(process.execPath, [at("tools", "facts.mjs")], { encoding: "utf8" });
  assert.equal(ran.status, 0, ran.stderr);
  const facts = JSON.parse(ran.stdout);
  // The size alone: what the landing page took besides went with it at 0.2.5.
  assert.deepEqual(Object.keys(facts), ["travels"]);
  // The measure of risk R4 packs both files at brotli's highest setting, the least a host
  // could send, and with gzip, which every host can. The engine travels packed at that highest
  // setting (open decision #224), with a wider window than the measure uses, and the small
  // script as the host packs it, a little less tightly: so the size that travels is within a
  // hundredth of the measure's least, never more than half a per cent below it, and under the
  // limit of the risk (5 MB).
  const measured = spawnSync(process.execPath, [at("tools", "measure-worker.mjs")], {
    encoding: "utf8",
  });
  assert.equal(measured.status, 0, measured.stderr);
  const total = /\*\*Total\*\* \| [\d.]+ kB \| \*\*([\d.]+) kB\*\* \| ([\d.]+) kB/.exec(
    measured.stdout,
  );
  assert.notEqual(total, null, measured.stdout);
  const least = Number(total[1]) * 1000;
  const gzip = Number(total[2]) * 1000;
  assert.ok(facts.travels > least * 0.995, `${facts.travels} is far under ${least}`);
  assert.ok(facts.travels < least * 1.01, `${facts.travels} is not within a hundredth of ${least}`);
  assert.ok(facts.travels < gzip, `${facts.travels} is not less than ${gzip}`);
  assert.ok(facts.travels < 5_000_000);
});
