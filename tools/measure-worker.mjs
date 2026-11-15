// Measures the engine's worker as a browser loads it: its compressed size, and its cold start
// under Node, each against the limit of risk R4 of the risk register (5 MB compressed; a cold
// start within 1,000 ms, half of Zemp Lite web's start-up target of 2 seconds: Zemp
// Specification, section 14). The measure is the Zeff repository's own (`tools/bundle/`), so
// that the figures can be set beside those of its releases.
//
// Usage: node tools/measure-worker.mjs            measure, print, and fail over a limit
//        node tools/measure-worker.mjs --once     (used by the tool itself) one cold start
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const web = path.join(root, "worker", "pkg", "web");
const node = path.join(root, "worker", "pkg", "node");

const LIMIT_BYTES = 5_000_000;
const LIMIT_MS = 1000;
const RUNS = 5;

if (process.argv.includes("--once")) {
  // One cold start, in a process of its own: the engine loaded, then a project opened and a
  // one-line script run, which is the first thing a window does.
  globalThis.zeffHost = { event() {}, cancelled: () => false };
  const before = performance.now();
  const engine = createRequire(import.meta.url)(path.join(node, "zemp_worker.js"));
  const loaded = performance.now();
  const project = new engine.Project("measure");
  const done = JSON.parse(project.run("scripts/main.zeff", "print(1 + 1)\n", 0));
  const ran = performance.now();
  if (done.exit_code !== 0 || done.stdout !== "2\n") {
    console.error("the one-line script did not print 2");
    process.exit(1);
  }
  console.log(JSON.stringify({ load_ms: loaded - before, first_call_ms: ran - loaded }));
  process.exit(0);
}

if (!fs.existsSync(path.join(web, "zemp_worker_bg.wasm"))) {
  console.error("the worker is not built: run `npm run build:worker` first");
  process.exit(1);
}

const median = (numbers) => {
  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const kilobytes = (bytes) => `${(bytes / 1000).toFixed(1)} kB`;

const files = fs
  .readdirSync(web)
  .filter((name) => name.endsWith(".wasm") || name.endsWith(".js"))
  .sort()
  .map((name) => {
    const buffer = fs.readFileSync(path.join(web, name));
    const brotli = zlib.brotliCompressSync(buffer, {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
        [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buffer.length,
      },
    }).length;
    return { name, raw: buffer.length, brotli, gzip: zlib.gzipSync(buffer, { level: 9 }).length };
  });
const total = (key) => files.reduce((sum, file) => sum + file[key], 0);

const runs = [];
for (let run = 0; run < RUNS; run++) {
  const once = spawnSync(process.execPath, [fileURLToPath(import.meta.url), "--once"], {
    encoding: "utf8",
  });
  if (once.status !== 0) {
    console.error(once.stderr || "a cold start failed");
    process.exit(1);
  }
  runs.push(JSON.parse(once.stdout));
}
const cold = median(runs.map((run) => run.load_ms + run.first_call_ms));

const problems = [];
if (total("brotli") > LIMIT_BYTES) {
  problems.push(
    `the compressed worker is ${total("brotli")} bytes, over the limit of ${LIMIT_BYTES}`,
  );
}
if (cold > LIMIT_MS) {
  problems.push(`the cold start takes ${cold.toFixed(1)} ms, over the limit of ${LIMIT_MS} ms`);
}

const table = [
  "### The engine's worker: size and cold start",
  "",
  "| File | Raw | Brotli | Gzip |",
  "| --- | ---: | ---: | ---: |",
  ...files.map(
    (file) =>
      `| ${file.name} | ${kilobytes(file.raw)} | ${kilobytes(file.brotli)} | ${kilobytes(file.gzip)} |`,
  ),
  `| **Total** | ${kilobytes(total("raw"))} | **${kilobytes(total("brotli"))}** | ${kilobytes(total("gzip"))} |`,
  "",
  `Cold start under Node ${process.version}: **${cold.toFixed(1)} ms** (the median of ${RUNS} fresh processes: load ${median(
    runs.map((run) => run.load_ms),
  ).toFixed(1)} ms, a project opened and a one-line script run ${median(
    runs.map((run) => run.first_call_ms),
  ).toFixed(1)} ms).`,
  "",
  `Limits: ${kilobytes(LIMIT_BYTES)} compressed and ${LIMIT_MS} ms (risk R4). ` +
    (problems.length ? `**Exceeded:** ${problems.join("; ")}.` : "Both hold."),
  "",
].join("\n");
console.log(table);
if (process.env.GITHUB_STEP_SUMMARY)
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, table + "\n");
if (problems.length) process.exit(1);
