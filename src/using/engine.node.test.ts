// The pages of Using Zemp Lite held to the engine the app carries (release 0.2.3, step 9d;
// open decision #211, item 12): every function, package and code a page names exists in that
// engine under that name; what a page says the search finds, it finds on that engine's own
// index; and every piece of code in every page is held in some way (`held.ts`), so that no
// page can say of the engine what no test has read. The engine is the worker as it is built
// for the browser (`npm run build:worker`).
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { CodeFamily, HelpIndex } from "../engine/messages";
import { entriesOf, search } from "../help/search";
import { HELD } from "./held";
import { readUsing, type Piece } from "./read";

const at = (path: string) => fileURLToPath(new URL(`../../${path}`, import.meta.url));

interface Built {
  helpIndex(): string;
  codesExplained(): string;
  engineVersion(): string;
}

function engine(): Built {
  const built = at("worker/pkg/node/zemp_worker.js");
  if (!existsSync(built)) throw new Error("the worker is not built: run `npm run build:worker`");
  (globalThis as Record<string, unknown>)["zeffHost"] = { event() {}, cancelled: () => false };
  return createRequire(import.meta.url)(built) as Built;
}

/** The pages, each with the pieces of its lines. */
function pages(): { slug: string; pieces: Piece[] }[] {
  const folder = at("src/using/pages");
  return readdirSync(folder)
    .filter((file) => file.endsWith(".md"))
    .sort()
    .map((file) => {
      const doc = readUsing(readFileSync(`${folder}/${file}`, "utf8"));
      const pieces = doc.blocks.flatMap((block) =>
        block.kind === "paragraph" ? block.pieces : block.kind === "list" ? block.items.flat() : [],
      );
      return { slug: file.slice(0, -3), pieces };
    });
}

describe("the pages of Using Zemp Lite, held to the engine the app carries", () => {
  const built = engine();
  const index = JSON.parse(built.helpIndex()) as HelpIndex;
  const families = (JSON.parse(built.codesExplained()) as { families: CodeFamily[] }).families;
  const entries = entriesOf(index, families);
  const functions = new Set(index.packages.flatMap((one) => one.functions.map((f) => f.name)));
  const packages = new Set(index.packages.map((one) => one.name));
  const datasets = new Set(index.datasets.map((one) => one.name));
  const codes = new Set(families.flatMap((family) => family.codes.map((one) => one.code)));
  /** Whether a text is a name of the engine's: a function, a package, a dataset or a code. */
  const named = (text: string) =>
    functions.has(text) || packages.has(text) || datasets.has(text) || codes.has(text);

  it("is the engine of this release", () => {
    expect(built.engineVersion()).toBe(index.engine);
    expect(functions.size).toBeGreaterThan(200);
    expect(pages()).toHaveLength(13);
  });

  it("has, under the name the page gives it, every function, package and code a page links to", () => {
    let links = 0;
    for (const { slug, pieces } of pages()) {
      for (const piece of pieces) {
        if (piece.kind !== "link") continue;
        const to = piece.to;
        if (to.kind === "name") {
          expect(functions.has(to.name) || datasets.has(to.name), `${slug}: help:${to.name}`).toBe(
            true,
          );
          links += 1;
        } else if (to.kind === "package") {
          expect(packages.has(to.name), `${slug}: package:${to.name}`).toBe(true);
          links += 1;
        } else if (to.kind === "code") {
          expect(codes.has(to.code), `${slug}: code:${to.code}`).toBe(true);
          links += 1;
        }
      }
    }
    // The pages do link to the engine's pages: the check is not an empty one.
    expect(links).toBeGreaterThanOrEqual(3);
  });

  it("holds every piece of code in every page: a name of the engine's, or held in a way that is listed", () => {
    for (const { slug, pieces } of pages()) {
      const given = [
        ...new Set(pieces.filter((piece) => piece.kind === "code").map((p) => p.text)),
      ];
      const listed = HELD[slug] ?? {};
      for (const code of given) {
        const held = listed[code];
        // A piece not listed is a name of the engine's, there in its index under that name.
        if (held === undefined)
          expect(named(code), `${slug}: \`${code}\` is held in no way`).toBe(true);
      }
      // And nothing is listed that the page no longer gives.
      for (const code of Object.keys(listed)) {
        expect(given, `${slug}: \`${code}\` is listed and not on the page`).toContain(code);
      }
    }
    // No page is listed that is not there.
    const slugs = pages().map((one) => one.slug);
    for (const slug of Object.keys(HELD)) expect(slugs, slug).toContain(slug);
  });

  it("finds, on this engine's index, what a page says the search finds", () => {
    let claims = 0;
    for (const [slug, listed] of Object.entries(HELD)) {
      for (const [typed, held] of Object.entries(listed)) {
        if (held.by !== "search") continue;
        const found = search(entries, typed).matches.map((one) => one.name);
        expect(found, `${slug}: \`${typed}\` finds \`${held.finds}\``).toContain(held.finds);
        expect(functions.has(held.finds), `${slug}: \`${held.finds}\` is a function`).toBe(true);
        claims += 1;
      }
    }
    expect(claims).toBe(4);
    // What the page of Help says in so many words: both names find `reg`, its first match.
    expect(search(entries, "lm").matches[0]?.name).toBe("reg");
    expect(search(entries, "reghdfe").matches[0]?.name).toBe("reg");
    expect(search(entries, "summ").matches[0]?.name).toBe("summary");
    // And a code a page gives as an example is a code of this engine, a warning.
    expect(codes.has("W0201")).toBe(true);
  });
});
