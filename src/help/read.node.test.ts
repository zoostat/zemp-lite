// The reader of a help page (release 0.2.1, step 10a), held on every page the engine has: the
// 597 names of the catalogue through `help` and every code through `explainPage`, asked of the
// worker as it is built for the browser (`npm run build:worker`). For each page the words of
// what was read, in order, are the words of the print: none lost, none added, none moved.
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  outlineOf,
  pieces,
  readPage,
  relatedOf,
  wordsOf,
  wordsOfPrint,
  type Block,
  type HelpDoc,
} from "./read";

const at = (path: string) => fileURLToPath(new URL(`../../${path}`, import.meta.url));
const kept = (name: string) => readFileSync(at(`tests/scripts/${name}`), "utf8");

interface Built {
  Project: new (name: string) => { help(name: string): string };
  explainPage(code: string): string;
}

/** The engine, as the worker is built for Node beside the browser's. */
function engine(): Built {
  const built = at("worker/pkg/node/zemp_worker.js");
  if (!existsSync(built)) throw new Error("the worker is not built: run `npm run build:worker`");
  (globalThis as Record<string, unknown>)["zeffHost"] = { event() {}, cancelled: () => false };
  return createRequire(import.meta.url)(built) as Built;
}

/** Every name of the catalogue, once. */
function names(): string[] {
  const rows = readFileSync(at("docs/spec/zeff_functions.csv"), "utf8").split("\n").slice(1);
  const all = rows.flatMap((row) => /^\d+,([^,]+),/.exec(row)?.[1] ?? []);
  return [...new Set(all)].sort();
}

const blocksOf = (doc: HelpDoc): Block[] =>
  doc.entries.flatMap((entry) => entry.sections.flatMap((section) => section.blocks));

describe("the reader of a help page, on every page of the engine", () => {
  const built = engine();
  const project = new built.Project("pages");
  const pages = names().flatMap((name) => {
    const found = JSON.parse(project.help(name)) as { page: string | null };
    return found.page === null ? [] : [{ name, page: found.page }];
  });
  const codes = ["W", "Z"].flatMap((letter) =>
    Array.from({ length: 10000 }, (_, n) => `${letter}${String(n).padStart(4, "0")}`).flatMap(
      (code) => {
        const found = JSON.parse(built.explainPage(code)) as { page?: { text: string } };
        return found.page === undefined ? [] : [{ name: code, page: found.page.text }];
      },
    ),
  );

  it("has the pages to read: the catalogue's functions and the engine's codes", () => {
    expect(pages.length).toBeGreaterThanOrEqual(596);
    expect(codes.length).toBeGreaterThanOrEqual(144);
  });

  it("is given the kept pages as the worker gives them", () => {
    for (const name of ["add", "summary"]) {
      const found = pages.find((one) => one.name === name);
      expect(found?.page, name).toBe(kept(`help-${name}.txt`));
    }
    expect(codes.find((one) => one.name === "W0201")?.page).toBe(kept("explain-W0201.txt"));
  });

  it("knows the shape of every page", () => {
    const unknown = [...pages, ...codes].filter((one) => readPage(one.page).plain !== null);
    expect(unknown.map((one) => one.name)).toEqual([]);
  });

  it("loses, adds and moves no word of any page", () => {
    for (const one of [...pages, ...codes]) {
      expect(wordsOf(readPage(one.page)), one.name).toEqual(wordsOfPrint(one.page));
    }
  });

  it("reads each function's first line, and each code's", () => {
    for (const one of pages) {
      const doc = readPage(one.page);
      // A function that arrives with a later release has a line, and no page yet.
      if (doc.entries.length === 0) {
        expect(doc.notes.map((note) => note.text).join("\n"), one.name).toBe(one.page.trimEnd());
        continue;
      }
      for (const entry of doc.entries) {
        expect(entry.name, one.name).toBe(one.name);
        expect(entry.does, one.name).not.toBe("");
        expect(entry.facts, one.name).toHaveLength(5);
        expect(
          entry.sections.map((section) => section.heading),
          one.name,
        ).toContain("USAGE");
      }
    }
    for (const one of codes) {
      const doc = readPage(one.page);
      expect(doc.entries.map((entry) => entry.name)).toEqual([one.name]);
      expect(doc.entries[0]?.facts).toEqual([]);
      expect(doc.entries[0]?.sections.map((section) => section.heading)).toEqual([
        "MEANING",
        "COMMON CAUSES",
        "EXAMPLE",
        "FIX",
      ]);
    }
  });

  it("reads each section as what its heading promises", () => {
    const by = (kind: Block["kind"]) =>
      pages.flatMap((one) => blocksOf(readPage(one.page)).filter((block) => block.kind === kind));
    // Nothing of a function's page is left as printed for want of a shape.
    expect(by("printed")).toEqual([]);
    for (const block of by("arguments")) {
      if (block.kind !== "arguments") continue;
      for (const row of block.rows) {
        expect(row.name).toMatch(/^(\.\.\.|[a-z_][a-z0-9_]*:?)$/);
        expect(row.type).not.toBe("");
      }
    }
    for (const block of by("names")) {
      if (block.kind === "names") expect(block.names.length).toBeGreaterThan(0);
    }
    for (const block of by("table")) {
      if (block.kind !== "table") continue;
      expect(block.head).toEqual(["Zeff", "R", "Stata"]);
      for (const row of block.rows) expect(row).toHaveLength(3);
    }
    // Each function has its usage, one statement however many lines the print gave it.
    const functions = pages.flatMap((one) => readPage(one.page).entries);
    expect(by("usage")).toHaveLength(functions.length);
  });
});

describe("the reader of a help page, on the kept pages", () => {
  it("reads the two functions of a page that holds two of a name", () => {
    const doc = readPage(kept("help-summary.txt"));
    expect(doc.entries.map((entry) => `${entry.name} · ${entry.facts[0]}`)).toEqual([
      "summary · data",
      "summary · results",
    ]);
    expect(doc.entries[0]?.line).toBe(0);
    expect(doc.entries[0]?.sections[0]?.title).toBe("Usage");
    for (const entry of doc.entries) {
      for (const section of entry.sections) {
        expect(kept("help-summary.txt").split("\n")[section.line]).toBe(section.heading);
      }
    }
  });

  it("gives the outline: the sections, each function named over its own where there are two", () => {
    const outline = outlineOf(readPage(kept("help-summary.txt")));
    expect(outline.filter((one) => one.entry).map((one) => one.title)).toEqual([
      "summary · data",
      "summary · results",
    ]);
    expect(outline[0]).toEqual({ title: "summary · data", line: 0, entry: true });
    expect(outline[1]?.title).toBe("Usage");
    // A page of one function names no function in its outline, and keeps a name's own capitals.
    const one = outlineOf(readPage(kept("help-add.txt")));
    expect(one.every((item) => !item.entry)).toBe(true);
    expect(one.map((item) => item.title)).toContain("Coming from R or Stata");
    expect(outlineOf(readPage("no such page"))).toEqual([]);
  });

  it("gives the functions named under SEE ALSO, in order and once each", () => {
    expect(relatedOf(readPage(kept("help-summary.txt")))).toEqual([
      "mean",
      "sd",
      "describe",
      "estimates",
      "export",
      "reg",
    ]);
    expect(relatedOf(readPage(kept("explain-W0201.txt")))).toEqual([]);
    expect(
      relatedOf(readPage("reg — Linear regression\n\nUSAGE\n    data.reg(formula)\n")),
    ).toEqual([]);
  });

  it("reads every kind of part of a function's page", () => {
    const [entry] = readPage(kept("help-add.txt")).entries;
    const kinds = (heading: string) =>
      entry?.sections
        .find((section) => section.heading === heading)
        ?.blocks.map((block) => block.kind);
    expect(kinds("IN BRIEF")).toEqual(["list"]);
    expect(kinds("DETAILS")).toEqual(["subheading", "paragraph", "subheading", "paragraph"]);
    expect(kinds("A COMMON MISTAKE")).toEqual(["paragraph", "example", "paragraph"]);
    expect(kinds("COMING FROM R OR STATA")).toEqual(["paragraph", "table", "paragraph"]);
    // Another function of the name, to come: said after this one's sections.
    expect(entry?.notes.map((note) => note.text.slice(0, 13))).toEqual(["Another `add`"]);
  });

  it("reads a code's page: what it means, its causes as a list, an example, the fix", () => {
    const doc = readPage(kept("explain-W0201.txt"));
    const [entry] = doc.entries;
    expect(entry?.name).toBe("W0201");
    expect(entry?.sections.map((section) => section.title)).toEqual([
      "Meaning",
      "Common causes",
      "Example",
      "Fix",
    ]);
    expect(entry?.sections[1]?.blocks[0]?.kind).toBe("list");
    expect(entry?.sections[2]?.blocks[0]?.kind).toBe("example");
  });

  it("gives the engine's sentence for a name it has not as a line of its own", () => {
    const said = kept("help-nosuch.stderr").trimEnd();
    const doc = readPage(said);
    expect(doc.plain).toBeNull();
    expect(doc.entries).toEqual([]);
    expect(doc.notes.map((note) => note.text)).toEqual(said.split("\n"));
  });

  it("keeps as printed a page it does not know, a package's list among them", () => {
    const list =
      "regress · tier 2 · 2 of 10 functions\n\n  reg     Linear regression\n  ivreg   Two-stage least squares\n";
    expect(readPage(list)).toEqual({ entries: [], notes: [], plain: list });
    expect(readPage("").plain).toBe("");
  });
});

describe("a line of prose in its pieces", () => {
  it("sets code apart, a function named as a call, and a code", () => {
    expect(
      pieces("as the base unless `base()` names another, `exper^2` is computed (W1001)."),
    ).toEqual([
      { kind: "text", text: "as the base unless " },
      { kind: "call", text: "base()", name: "base" },
      { kind: "text", text: " names another, " },
      { kind: "code", text: "exper^2" },
      { kind: "text", text: " is computed (" },
      { kind: "coded", text: "W1001" },
      { kind: "text", text: ")." },
    ]);
  });

  it("sets a title apart in a reference alone, where an asterisk is the print's mark", () => {
    expect(pieces("(2004). *Econometric Theory and Methods*. Oxford.", true)).toEqual([
      { kind: "text", text: "(2004). " },
      { kind: "title", text: "Econometric Theory and Methods" },
      { kind: "text", text: ". Oxford." },
    ]);
    expect(pieces("acos(x) * 180 / PI and x * 2")).toEqual([
      { kind: "text", text: "acos(x) * 180 / PI and x * 2" },
    ]);
  });

  it("gives a line whose backticks do not pair as it is", () => {
    expect(pieces("local xs `xs' 4")).toEqual([{ kind: "text", text: "local xs `xs' 4" }]);
  });

  it("keeps every character but the marks", () => {
    const line = "With `fe:` the effects (Z0802), as `r_squared()` gives.";
    expect(
      pieces(line)
        .map((piece) => piece.text)
        .join(""),
    ).toBe(line.replaceAll("`", ""));
  });
});
