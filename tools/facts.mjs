// Prints, as one line of JSON, what the front page says of the engine: its size as it travels,
// and a short example with what this engine prints for it (see `facts-lib.mjs`). The build
// asks for it (`vite.config.ts`); where it cannot be had it says so and exits with 1, and the
// build stops.
//
// Usage: node tools/facts.mjs        (after `npm run build:worker`)
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FactError, exampleOf, travelling } from "./facts-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const built = path.join(root, "worker", "pkg", "node", "zemp_worker.js");

try {
  const travels = travelling(
    path.join(root, "worker", "pkg", "web"),
    path.join(root, "node_modules", ".cache", "zemp-lite", "travels.json"),
  );
  if (!(travels > 0)) throw new FactError("the engine's travelling size could not be measured");
  if (!fs.existsSync(built)) {
    throw new FactError("the worker is not built: run `npm run build:worker` first");
  }
  globalThis.zeffHost = { event() {}, cancelled: () => false };
  const example = exampleOf(
    createRequire(import.meta.url)(built),
    fs.readFileSync(path.join(root, "examples", "front", "example.zeff"), "utf8"),
  );
  console.log(JSON.stringify({ travels, example }));
} catch (error) {
  if (!(error instanceof FactError)) throw error;
  console.error(`The facts of the engine could not be had: ${error.message}.`);
  process.exit(1);
}
