// Prints, as one line of JSON, what the landing page and the loading screen say of the engine
// (see `facts-lib.mjs`). The build asks for it (`vite.config.ts`); where a fact cannot be had
// it says which and exits with 1, and the build stops.
//
// Usage: node tools/facts.mjs        (after `npm run build:worker`)
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FactError, factsOf, travelling } from "./facts-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const built = path.join(root, "worker", "pkg", "node", "zemp_worker.js");

try {
  if (!fs.existsSync(built)) {
    throw new FactError("the worker is not built: run `npm run build:worker` first");
  }
  globalThis.zeffHost = { event() {}, cancelled: () => false };
  const engine = createRequire(import.meta.url)(built);
  const facts = factsOf({
    engine,
    script: fs.readFileSync(path.join(root, "examples", "scratch", "scripts", "main.zeff"), "utf8"),
    expected: fs.readFileSync(
      path.join(root, "examples", "scratch", "expected", "main.stdout"),
      "utf8",
    ),
    travels: travelling(
      path.join(root, "worker", "pkg", "web"),
      path.join(root, "node_modules", ".cache", "zemp-lite", "travels.json"),
    ),
  });
  console.log(JSON.stringify(facts));
} catch (error) {
  if (!(error instanceof FactError)) throw error;
  console.error(`The facts of the engine could not be had: ${error.message}.`);
  process.exit(1);
}
