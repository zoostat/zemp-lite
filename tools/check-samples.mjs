// Runs the sample projects of the released Zeff engine through this repository's worker
// build and holds what each prints and says to what the Zeff repository keeps for it
// (`samples/<name>/expected/`), byte for byte: the script tests of the testing handbook
// (section 1), on the engine as the browser loads it. The samples are those of the engine's
// own source at the pinned commit, which cargo has fetched to build the worker; nothing of
// them is copied here.
//
// Usage: node tools/check-samples.mjs        (after `npm run build:worker`)
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const built = path.join(root, "worker", "pkg", "node", "zemp_worker.js");
if (!fs.existsSync(built)) {
  console.error("the worker is not built: run `npm run build:worker` first");
  process.exit(1);
}

// Where cargo keeps the engine's source: beside the manifest of one of its crates.
const metadata = spawnSync("cargo", ["metadata", "--format-version", "1", "--locked"], {
  cwd: path.join(root, "worker"),
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
});
if (metadata.status !== 0) {
  console.error(metadata.stderr || "cargo metadata failed");
  process.exit(1);
}
const crate = JSON.parse(metadata.stdout).packages.find((one) => one.name === "zeff-web");
const samples = path.resolve(crate.manifest_path, "..", "..", "..", "samples");

/** Every file under a folder, by its path from it, with `/` between the parts. */
function files(folder, under = "") {
  return fs.readdirSync(path.join(folder, under), { withFileTypes: true }).flatMap((entry) => {
    const at = under === "" ? entry.name : `${under}/${entry.name}`;
    return entry.isDirectory() ? files(folder, at) : [at];
  });
}

globalThis.zeffHost = { event() {}, cancelled: () => false };
const engine = createRequire(import.meta.url)(built);

const rows = [];
let failed = 0;
for (const name of fs.readdirSync(samples).sort()) {
  const folder = path.join(samples, name);
  if (!fs.existsSync(path.join(folder, "scripts", "main.zeff"))) continue;
  const project = new engine.Project(name);
  for (const file of files(folder)) {
    // The project's own files; what was expected of it, and what made its data, are not its.
    if (file.startsWith("expected/") || file.endsWith(".py")) continue;
    project.add_file(file, fs.readFileSync(path.join(folder, file)));
  }
  const text = fs.readFileSync(path.join(folder, "scripts", "main.zeff"), "utf8");
  const done = JSON.parse(project.run("scripts/main.zeff", text, 0));
  const expected = (which) =>
    fs.readFileSync(path.join(folder, "expected", `${which}.txt`), "utf8");
  const same = done.stdout === expected("stdout") && done.stderr === expected("stderr");
  if (!same) failed += 1;
  rows.push(
    `| ${name} | ${text.split("\n").length} | ${done.stdout.split("\n").length - 1} | ${done.exit_code} | ${same ? "identical" : "**differs**"} |`,
  );
  project.free();
}

const table = [
  `### The sample projects of Zeff ${engine.engineVersion()}, run through this worker`,
  "",
  "| Project | Lines of script | Lines printed | Exit code | Against its expected output |",
  "| --- | ---: | ---: | ---: | --- |",
  ...rows,
  "",
  failed === 0
    ? `All ${rows.length} print and say what the Zeff repository expects of them, byte for byte.`
    : `**${failed} of ${rows.length} differ.**`,
  "",
].join("\n");
console.log(table);
if (process.env.GITHUB_STEP_SUMMARY)
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, table + "\n");
if (failed > 0 || rows.length === 0) process.exit(1);
