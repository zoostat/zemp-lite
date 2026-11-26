// The licences of everything the Paper module links for the browser (release 0.3, step 11):
// every crate of its tree for the WebAssembly target, with the licence its manifest states.
// Each must be under a permissive licence (MIT, Apache-2.0, BSD, ISC, Zlib, Unicode, or one
// more permissive), on at least one of the terms it offers; none may be under the GPL, the
// LGPL, the AGPL, the MPL or the LPPL alone. The list is kept in `paper/DEPENDENCIES.md`, and
// this holds the tree to it, so that a crate cannot arrive or change its licence unread.
//
// Usage: node tools/paper-licences.mjs          hold the tree to the kept list
//        node tools/paper-licences.mjs --write  write the kept list from the tree
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const crate = path.join(root, "paper");
const kept = path.join(crate, "DEPENDENCIES.md");

/** The licences this project links (the standing instructions), by their SPDX names. */
const ALLOWED = new Set([
  "MIT",
  "Apache-2.0",
  "Apache-2.0 WITH LLVM-exception",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "ISC",
  "Zlib",
  "Unicode-3.0",
  "Unicode-DFS-2016",
  // More permissive than those.
  "0BSD",
  "CC0-1.0",
  "Unlicense",
  "BSL-1.0",
]);

/**
 * Whether a licence expression can be met on allowed terms alone: of every part joined by
 * AND, at least one of the terms offered by OR is allowed.
 */
export function permitted(expression) {
  return expression
    .replaceAll("/", " OR ")
    .split(/\s+AND\s+/)
    .every((part) =>
      part
        .replace(/^\(|\)$/g, "")
        .split(/\s+OR\s+/)
        .some((term) => ALLOWED.has(term.trim())),
    );
}

/** The crates linked for the browser's target, each `name version` with its licence. */
function tree() {
  const done = spawnSync(
    "cargo",
    [
      "tree",
      "--locked",
      "--target",
      "wasm32-unknown-unknown",
      "--edges",
      "normal",
      "--prefix",
      "none",
      "--format",
      "{p}|{l}",
    ],
    { cwd: crate, encoding: "utf8" },
  );
  if (done.status !== 0) {
    console.error(done.stderr);
    process.exit(done.status ?? 1);
  }
  const rows = new Map();
  for (const line of done.stdout.split("\n")) {
    if (line.trim() === "") continue;
    const [named, licence] = line.replace(" (*)", "").split("|");
    // A crate of this repository is named with its folder: `hypher v0.1.8 (/…/paper/hypher)`.
    const [name, version] = named.replace(/ \(.*\)$/, "").split(" ");
    rows.set(`${name} ${version.replace(/^v/, "")}`, licence.trim());
  }
  return [...rows].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

function page(rows) {
  const counts = new Map();
  for (const [, licence] of rows) counts.set(licence, (counts.get(licence) ?? 0) + 1);
  return [
    "# What the Paper module links",
    "",
    "Every crate in the module's tree for the browser (`wasm32-unknown-unknown`), with the licence its",
    "manifest states. Written by `node tools/paper-licences.mjs --write` and held to the tree by the",
    "routine (`npm run check:paper`): each is under a permissive licence on at least one of the terms it",
    "offers, and none arrives or changes unread. The versions are those of the released Typst 0.15.1's own",
    "lock file (`Cargo.lock`). `hypher` is the copy in `hypher/` (see its `CHANGES.md`), and `zemp-paper`",
    "is this package.",
    "",
    `${rows.length} crates.`,
    "",
    "| Licence, as stated | Crates |",
    "| --- | ---: |",
    ...[...counts]
      .sort(([a, x], [b, y]) => y - x || (a < b ? -1 : 1))
      .map(([licence, count]) => `| ${licence} | ${count} |`),
    "",
    "| Crate | Version | Licence |",
    "| --- | --- | --- |",
    ...rows.map(
      ([named, licence]) => `| ${named.split(" ")[0]} | ${named.split(" ")[1]} | ${licence} |`,
    ),
    "",
  ].join("\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rows = tree();
  const refused = rows.filter(([, licence]) => !permitted(licence));
  if (refused.length > 0) {
    console.error("Not under a permissive licence:");
    for (const [named, licence] of refused) console.error(`  ${named}: ${licence}`);
    process.exit(1);
  }
  const now = page(rows);
  if (process.argv.includes("--write")) {
    fs.writeFileSync(kept, now);
    console.log(`paper/DEPENDENCIES.md is written: ${rows.length} crates.`);
  } else if (!fs.existsSync(kept) || fs.readFileSync(kept, "utf8") !== now) {
    console.error(
      "The Paper module's tree is not the one kept in paper/DEPENDENCIES.md. Read what changed, and " +
        "write the list again with: node tools/paper-licences.mjs --write",
    );
    process.exit(1);
  } else {
    console.log(
      `The Paper module links ${rows.length} crates, each under a permissive licence, as kept.`,
    );
  }
}
