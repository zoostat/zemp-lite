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

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const at = (...parts) => path.join(root, ...parts);

test("the travelling size is the files' own, compressed at the setting the host sends them at, and is kept by what they hold", () => {
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
          [zlib.constants.BROTLI_PARAM_QUALITY]: HOST_QUALITY,
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

test("the tool prints the fact of this build as one line; its travelling size is more than the least a host could send, and under the limit of risk R4", () => {
  const ran = spawnSync(process.execPath, [at("tools", "facts.mjs")], { encoding: "utf8" });
  assert.equal(ran.status, 0, ran.stderr);
  const facts = JSON.parse(ran.stdout);
  // The size alone: what the landing page took besides went with it at 0.2.5.
  assert.deepEqual(Object.keys(facts), ["travels"]);
  // The measure of risk R4 compresses at brotli's highest setting, the least a host could
  // send, and with gzip, which every host can: the size as this host sends it lies between
  // the two, and under the limit of the risk (5 MB).
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
  assert.ok(facts.travels > least, `${facts.travels} is not more than ${least}`);
  assert.ok(facts.travels < gzip, `${facts.travels} is not less than ${gzip}`);
  assert.ok(facts.travels < 5_000_000);
});
