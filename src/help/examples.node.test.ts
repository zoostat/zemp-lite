// Every example of every page of the engine, run as the page runs it (release 0.3, step 10;
// open decision #211, item 11): the examples of a page as one script in the examples'
// session, and what each prints held to what its page says, line for line, and to a time.
// The engine is the worker as it is built for the browser (`npm run build:worker`), under
// Node; the reading of a page, the script and the reading of its output are the page's own
// (`examples.ts`), so what is held here is what a reader sees under an example.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { ExampleOutcome } from "../engine/messages";
import { apartFrom, asPages, composed, examplesOf, givenBy, type PageExample } from "./examples";
import { readPage } from "./read";

const at = (path: string) => fileURLToPath(new URL(`../../${path}`, import.meta.url));

interface Built {
  Project: new (name: string) => { help(name: string): string };
  Example: new () => {
    run(text: string, deviceBytes: number, width: number): string;
    free(): void;
  };
  explainPage(code: string): string;
  codesExplained(): string;
  helpIndex(): string;
}

/** The engine, as the worker is built for Node beside the browser's. */
function engine(): Built {
  const built = at("worker/pkg/node/zemp_worker.js");
  if (!existsSync(built)) throw new Error("the worker is not built: run `npm run build:worker`");
  (globalThis as Record<string, unknown>)["zeffHost"] = { event() {}, cancelled: () => false };
  return createRequire(import.meta.url)(built) as Built;
}

const built = engine();

/** A text run in a session of the examples made afresh, and how long the engine took. */
function ran(text: string): { outcome: ExampleOutcome; ms: number } {
  const session = new built.Example();
  const from = performance.now();
  const done = JSON.parse(session.run(text, 0, 0)) as {
    exit_code: number;
    stdout: string;
    stderr: string;
    statements: ExampleOutcome["statements"];
    plots: ExampleOutcome["plots"];
  };
  const ms = performance.now() - from;
  session.free();
  return {
    outcome: {
      exitCode: done.exit_code,
      stdout: done.stdout,
      stderr: done.stderr,
      statements: done.statements,
      plots: done.plots,
      stopped: null,
    },
    ms,
  };
}

const textOf = (example: PageExample) => example.code.join("\n");
/** The lines an example shows under its statements, a line's trailing spaces apart. */
const shownBy = (given: ReturnType<typeof givenBy>[number]) =>
  given.parts
    .flatMap((part) => (part.kind === "text" ? part.lines : []))
    .map((line) => line.trimEnd());
const keptBy = (example: PageExample) => example.kept.map((line) => line.trimEnd());

/** The examples of a page of the engine: those of its EXAMPLES, and those that stand apart. */
function examplesIn(page: string): { name: string; chain: PageExample[]; apart: PageExample[] }[] {
  return readPage(page).entries.map((entry) => {
    const chain: PageExample[] = [];
    const apart: PageExample[] = [];
    for (const section of entry.sections) {
      const chained = section.heading === "EXAMPLES" || section.heading === "EXAMPLE";
      for (const block of section.blocks) {
        if (block.kind !== "example") continue;
        for (const one of examplesOf(block.lines)) {
          if (one.code.length > 0) (chained ? chain : apart).push(one);
        }
      }
    }
    return { name: entry.name, chain, apart };
  });
}

/**
 * The time a page's examples may take here, in milliseconds. A reader's browser stops them
 * after ten seconds; under Node on the machine of the routine the slowest page takes under
 * half a second, so this leaves a browser on a slow machine six times the room.
 */
const MOST = 1_500;

describe("every example of every page of the engine, run as its page runs it", () => {
  /** Every name of the catalogue and every dataset the engine ships, once. */
  const names = (() => {
    const rows = readFileSync(at("docs/spec/zeff_functions.csv"), "utf8").split("\n").slice(1);
    const functions = rows.flatMap((row) => /^\d+,([^,]+),/.exec(row)?.[1] ?? []);
    const index = JSON.parse(built.helpIndex()) as { datasets: { name: string }[] };
    return [...new Set([...functions, ...index.datasets.map((one) => one.name)])].sort();
  })();

  it("prints what its page says, line for line, and in time", () => {
    const project = new built.Project("pages");
    const differ: string[] = [];
    const slow: string[] = [];
    let pages = 0;
    let examples = 0;
    let slowest = 0;
    for (const name of names) {
      const found = JSON.parse(project.help(name)) as { page: string | null };
      if (found.page === null) continue;
      for (const entry of examplesIn(found.page)) {
        if (entry.chain.length + entry.apart.length === 0) continue;
        pages += 1;
        const said = (which: string, kept: string[], shown: string[]) => {
          examples += 1;
          if (JSON.stringify(shown) === JSON.stringify(kept)) return;
          differ.push(
            `${name} (${entry.name}), ${which}:\n  page: ${JSON.stringify(kept)}\n  here: ${JSON.stringify(shown)}`,
          );
        };
        // The page's EXAMPLES, as one script: each shown as the engine prints it.
        if (entry.chain.length > 0) {
          const script = composed(entry.chain.map(textOf));
          const { outcome, ms } = ran(script.text);
          slowest = Math.max(slowest, ms);
          if (ms > MOST) slow.push(`${name} (${entry.name}): ${ms.toFixed(0)} ms`);
          givenBy(outcome, script.ranges).forEach((given, index) =>
            said(`example ${index + 1}`, keptBy(entry.chain[index] as PageExample), shownBy(given)),
          );
        }
        // A call that stands apart (a common mistake), after the page's examples: shown
        // without the excerpt of the script, as the engine's pages show it.
        for (const one of entry.apart) {
          const script = composed([...entry.chain.map(textOf), textOf(one)]);
          const { outcome, ms } = ran(script.text);
          slowest = Math.max(slowest, ms);
          if (ms > MOST) slow.push(`${name} (${entry.name}), apart: ${ms.toFixed(0)} ms`);
          const given = givenBy(outcome, script.ranges).at(-1);
          said(
            `the call \`${one.code.join(" ")}\``,
            asPages(keptBy(one)),
            given === undefined ? [] : shownBy(apartFrom(given)),
          );
        }
      }
    }
    expect(differ, differ.join("\n")).toEqual([]);
    expect(slow, slow.join("\n")).toEqual([]);
    // The engine's count at Zeff 0.9.0: every function and every dataset has a page with
    // examples.
    expect({ pages, examples }).toEqual({ pages: PAGES, examples: EXAMPLES });
    expect(slowest).toBeLessThan(MOST);
  }, 600_000);

  it("an explained code's example is an illustration: which of them print what their page says is as it is kept", () => {
    const families = (
      JSON.parse(built.codesExplained()) as { families: { codes: { code: string }[] }[] }
    ).families;
    const codes = families.flatMap((family) => family.codes.map((one) => one.code)).sort();
    const listed = codes.map((code) => {
      const page = (JSON.parse(built.explainPage(code)) as { page: { text: string } }).page;
      const entry = examplesIn(page.text)[0];
      const all = [...(entry?.chain ?? []), ...(entry?.apart ?? [])];
      if (all.length === 0) return `${code} none`;
      const script = composed(all.map(textOf));
      const { outcome } = ran(script.text);
      const given = givenBy(outcome, script.ranges);
      const same = all.every(
        (one, index) =>
          JSON.stringify(asPages(keptBy(one))) ===
          JSON.stringify(given[index] === undefined ? [] : shownBy(apartFrom(given[index]))),
      );
      return `${code} ${same ? "as its page says" : "otherwise"}`;
    });
    const now = `${listed.join("\n")}\n`;
    // The kept list is written by this test when asked to (`tests/scripts/README.md`), at a
    // new engine, and read in the change it makes.
    if (process.env["ZEMP_KEEP_CODE_EXAMPLES"] === "1") writeFileSync(at(KEPT), now);
    expect(now).toBe(readFileSync(at(KEPT), "utf8"));
  }, 600_000);
});

/** Which explained codes' examples print what their page says, a line for each code. */
const KEPT = "tests/scripts/code-examples.txt";
/** The pages with examples and their examples, at the engine this app carries. */
const PAGES = 270;
const EXAMPLES = 1216;
