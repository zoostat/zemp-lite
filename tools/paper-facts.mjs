// Prints, as one line of JSON, what the Paper module is as it travels (see `paper-lib.mjs`).
// The build asks for it (`vite.config.ts`); where it cannot be had it says so and exits with
// 1, and the build stops.
//
// Usage: node tools/paper-facts.mjs        (after `npm run build:paper`)
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PaperError, paperFacts } from "./paper-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

try {
  console.log(JSON.stringify(paperFacts(root)));
} catch (error) {
  if (!(error instanceof PaperError)) throw error;
  console.error(`The facts of the Paper module could not be had: ${error.message}.`);
  process.exit(1);
}
