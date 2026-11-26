// Measures the Paper module as a reader's browser fetches it, once, the first time a paper is
// opened: the module's WebAssembly and each font, packed at brotli's highest setting as the
// host sends them, against the limit recorded for it (release 0.3, step 2: 8.5 MB, the module
// and its fonts together). It is outside the measure of risk R4, which is of the app's start:
// the start fetches no byte of it, and a browser test holds that.
//
// Usage: node tools/measure-paper.mjs        (after `npm run build:paper`)
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LIMIT_BYTES, PaperError, paperFacts } from "./paper-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const kilobytes = (bytes) => `${(bytes / 1000).toFixed(1)} kB`;

let facts;
try {
  facts = paperFacts(root);
} catch (error) {
  if (!(error instanceof PaperError)) throw error;
  console.error(error.message);
  process.exit(1);
}
const rows = [facts.module, ...facts.fonts];
console.log("| File | Bytes | As it travels (brotli) |");
console.log("| --- | ---: | ---: |");
for (const row of rows) {
  console.log(`| ${row.name} | ${kilobytes(row.bytes)} | ${kilobytes(row.travels)} |`);
}
const whole = rows.reduce((sum, row) => sum + row.bytes, 0);
console.log(`| **Total** | ${kilobytes(whole)} | **${kilobytes(facts.travels)}** |`);
console.log("");
const holds = facts.travels <= LIMIT_BYTES;
console.log(
  `Limit: ${kilobytes(LIMIT_BYTES)} as it travels, the module and its fonts together. ${holds ? "It holds." : "It does NOT hold."}`,
);
if (!holds) process.exit(1);
