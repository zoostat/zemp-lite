// Prints, as one line of JSON, what the loading screen says of the engine's size (see
// `facts-lib.mjs`). The build asks for it (`vite.config.ts`); where it cannot be had it says so
// and exits with 1, and the build stops.
//
// Usage: node tools/facts.mjs        (after `npm run build:worker`)
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FactError, travelling } from "./facts-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

try {
  const travels = travelling(
    path.join(root, "worker", "pkg", "web"),
    path.join(root, "node_modules", ".cache", "zemp-lite", "travels.json"),
  );
  if (!(travels > 0)) throw new FactError("the engine's travelling size could not be measured");
  console.log(JSON.stringify({ travels }));
} catch (error) {
  if (!(error instanceof FactError)) throw error;
  console.error(`The facts of the engine could not be had: ${error.message}.`);
  process.exit(1);
}
