// What the landing page and the loading screen say of the engine, taken from the engine the
// release carries when the pages are built (release 0.2.4, step 4; open decisions #220, items
// 1 and 3, and #211, item 12): its version; the counts of its functions, packages and
// explained codes; the Scratch project's regressions and what the engine prints for them; and
// the size of the engine as it travels. Nothing here is written by hand, and where one of
// them cannot be had the build stops with a sentence saying which.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

/** A fact that could not be had: the build says it and stops. */
export class FactError extends Error {}

/** The sections of the Scratch script shown on the landing page, in the script's order. */
export const SHOWN = ["Sample", "Models"];

/**
 * The part of the Scratch project's script the landing page shows: its first line, which says
 * what it is, and the statements of the sections named, without the lines that name them. It
 * is a script of its own, which the build runs.
 */
export function excerpt(script, shown = SHOWN) {
  const lines = script.replace(/\r\n/g, "\n").split("\n");
  const [first] = lines;
  if (first === undefined || !first.startsWith("//")) {
    throw new FactError("the Scratch script does not begin with a line saying what it is");
  }
  const sections = new Map();
  let open = null;
  for (const line of lines.slice(1)) {
    const named = /^\/\/ # (.+)$/.exec(line);
    if (named !== null) {
      open = [];
      sections.set(named[1].trim(), open);
    } else if (open !== null) {
      open.push(line);
    }
  }
  const parts = [first];
  for (const name of shown) {
    const body = sections.get(name);
    if (body === undefined) {
      throw new FactError(`the Scratch script has no section called ${name}`);
    }
    const kept = body.join("\n").replace(/^\n+|\n+$/g, "");
    if (kept === "") throw new FactError(`the section ${name} of the Scratch script is empty`);
    parts.push(kept);
  }
  return `${parts.join("\n")}\n`;
}

/**
 * The size of the engine as it travels: the worker's script and its WebAssembly, each as the
 * host sends it (brotli at its highest setting), in bytes. It is the measure of risk R4
 * (`tools/measure-worker.mjs`). Compressing the engine takes seconds, so the sizes are kept
 * beside the tools, by what the files hold, and read again while the files are the same.
 */
export function travelling(web, kept = null) {
  if (!fs.existsSync(web)) {
    throw new FactError("the worker is not built: run `npm run build:worker` first");
  }
  const names = fs
    .readdirSync(web)
    .filter((name) => name.endsWith(".wasm") || name.endsWith(".js"))
    .sort();
  if (!names.some((name) => name.endsWith(".wasm"))) {
    throw new FactError("the worker is not built: run `npm run build:worker` first");
  }
  let before = {};
  if (kept !== null && fs.existsSync(kept)) {
    try {
      before = JSON.parse(fs.readFileSync(kept, "utf8"));
    } catch {
      before = {};
    }
  }
  const now = {};
  let bytes = 0;
  for (const name of names) {
    const buffer = fs.readFileSync(path.join(web, name));
    const digest = createHash("sha256").update(buffer).digest("hex");
    const known = before[digest];
    const size =
      typeof known === "number"
        ? known
        : zlib.brotliCompressSync(buffer, {
            params: {
              [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
              [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buffer.length,
            },
          }).length;
    now[digest] = size;
    bytes += size;
  }
  if (kept !== null) {
    fs.mkdirSync(path.dirname(kept), { recursive: true });
    fs.writeFileSync(kept, JSON.stringify(now));
  }
  return bytes;
}

/**
 * The facts, from an engine (the worker as built for Node), the Scratch project's script, what
 * the released `zeff run` printed for that script whole, and the engine's travelling size.
 */
export function factsOf({ engine, script, expected, travels }) {
  const version = String(engine.engineVersion() ?? "");
  if (!/^\d+\.\d+\.\d+/.test(version)) {
    throw new FactError(`the engine did not say its version (it said "${version}")`);
  }
  const index = JSON.parse(engine.helpIndex());
  const packages = index.packages.length;
  const functions = index.packages.reduce((sum, one) => sum + one.functions.length, 0);
  const families = JSON.parse(engine.codesExplained()).families;
  const codes = families.reduce((sum, family) => sum + family.codes.length, 0);
  for (const [what, count] of [
    ["function", functions],
    ["package", packages],
    ["explained code", codes],
  ]) {
    if (!(count > 0)) throw new FactError(`the engine's index lists no ${what}`);
  }
  const shown = excerpt(script);
  const project = new engine.Project("landing");
  let done;
  try {
    done = JSON.parse(project.run("scripts/main.zeff", shown, 0));
  } finally {
    project.free?.();
  }
  if (done.exit_code !== 0) {
    throw new FactError(
      `the Scratch script's regressions did not run on this engine (exit code ${done.exit_code}): ${String(done.stderr).trim()}`,
    );
  }
  const printed = String(done.stdout);
  if (printed.trim() === "") {
    throw new FactError("the Scratch script's regressions printed nothing on this engine");
  }
  if (!expected.includes(printed)) {
    throw new FactError(
      "what this engine prints for the Scratch script's regressions is not what the released `zeff run` printed for the script (examples/scratch/expected/main.stdout)",
    );
  }
  if (!(travels > 0)) throw new FactError("the engine's travelling size could not be measured");
  return { engine: version, functions, packages, codes, script: shown, printed, travels };
}
