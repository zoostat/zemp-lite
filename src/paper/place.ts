// The Paper place, in what it knows without a screen (release 0.3, step 12): which files of a
// project are papers, where a new paper is made and what it is called, what a new paper
// holds, what the place shows, and the words of the fetching of Typst.
import type { Progress } from "./fetching";
import { share } from "./fetching";
import type { Figure, Heading, Said } from "./messages";

/** The folder a new paper is made in (the owner's answer to question 3 of release 0.3). */
export const PAPERS = "paper";

/** Whether a file of this path is a paper: a Typst source, anywhere in the project. */
export const isPaper = (path: string): boolean => /\.typ$/i.test(path);

interface Node {
  kind: "file" | "folder";
  path: string;
  children?: Node[];
}

/**
 * The papers of a project, each by its path: those of the folder `paper` first, then every
 * other Typst source (a table a script exported is one, and opens as a paper does), each
 * group in the order of its paths. The app's own folders hold none.
 */
export function papersOf(tree: readonly Node[]): string[] {
  const found: string[] = [];
  const walk = (nodes: readonly Node[]) => {
    for (const node of nodes) {
      if (node.kind === "folder") walk(node.children ?? []);
      else if (isPaper(node.path) && !/^\.(zemp|zeff)\//.test(node.path)) found.push(node.path);
    }
  };
  walk(tree);
  const own = (path: string) => path.startsWith(`${PAPERS}/`);
  const ordered = (paths: string[]) => paths.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return [...ordered(found.filter(own)), ...ordered(found.filter((path) => !own(path)))];
}

/**
 * The name a new paper is offered: `paper` for the first of the folder, then `paper-2`,
 * `paper-3`, the first that no file of the folder has, capitals apart.
 */
export function offeredName(papers: readonly string[]): string {
  const taken = new Set(papers.map((path) => path.toLowerCase()));
  for (let count = 1; ; count += 1) {
    const name = count === 1 ? "paper" : `paper-${count}`;
    if (!taken.has(`${PAPERS}/${name}.typ`)) return name;
  }
}

/** The file's name a typed name gives: `.typ` after it where it lacks it. */
export function fileNamed(typed: string): string {
  const name = typed.trim();
  return name === "" || isPaper(name) ? name : `${name}.typ`;
}

/** The line that names the face of a paper's mathematics (`paper/fonts/SOURCE.md`). */
export const MATHEMATICS = '#show math.equation: set text(font: "Libertinus Math")';

/**
 * What a new paper holds: the line that names the face of its mathematics, with why it is
 * there, and a heading to write under. Typst names its own face for mathematics, which Zemp
 * Lite does not carry; without the line a formula is set in a face not made for it.
 */
export function firstLines(file: string): string {
  const title = file.replace(/\.typ$/i, "");
  return [
    "// Mathematics is set in Libertinus Math, the face Zemp Lite carries for it.",
    MATHEMATICS,
    "",
    `= ${title.charAt(0).toUpperCase()}${title.slice(1)}`,
    "",
    "",
  ].join("\n");
}

/** What the middle of the place shows. */
export type Shown =
  /** No paper is open: what Paper is, the papers of the project, and New paper…. */
  | { kind: "none"; papers: string[] }
  /** A paper is open and its text is being read. */
  | { kind: "reading"; path: string }
  /** A paper is open: its source in the editor. */
  | { kind: "paper"; path: string };

/**
 * What the place shows: the paper it has open where that file is still in the project, and
 * otherwise what it shows with none.
 */
export function shownOf(
  open: string | null,
  papers: readonly string[],
  loaded: (path: string) => boolean,
): Shown {
  if (open === null || !papers.includes(open)) return { kind: "none", papers: [...papers] };
  return loaded(open) ? { kind: "paper", path: open } : { kind: "reading", path: open };
}

/** A count of bytes as megabytes with one decimal, as the fetching says it: `6.9 MB`. */
export const megabytes = (bytes: number): string => `${(bytes / 1_000_000).toFixed(1)} MB`;

/** Where the module of the page stands. */
export type Fetching =
  | { state: "waiting" }
  | { state: "fetching"; progress: Progress | null }
  | { state: "ready"; typst: string }
  | { state: "failed"; message: string };

/**
 * What the page's pane says of Typst: before it is fetched, while it comes, once it is here,
 * and where it could not be fetched. `travels` is the bytes that travel, as the build says
 * them; `null` where it does not.
 */
export function fetchingWords(fetching: Fetching, travels: number | null): string {
  const size = travels === null ? "" : `, ${megabytes(travels)}`;
  switch (fetching.state) {
    case "waiting":
      return `Typst sets the page. It is fetched the first time a paper is opened${size}, and this browser keeps it afterwards.`;
    case "fetching": {
      const done = fetching.progress === null ? 0 : share(fetching.progress);
      return `Fetching Typst${size}: ${done}%. This browser keeps it afterwards.`;
    }
    case "ready":
      return `Typst ${fetching.typst} is ready.`;
    case "failed":
      return `Typst could not be fetched: ${fetching.message}`;
  }
}

/** What Typst says of a formula set with no face for mathematics among the paper's fonts. */
const NO_MATHEMATICS = "current font is not designed for math";

/**
 * What Typst said, as the app shows it at a line: Typst's own message, its hints after it,
 * and, for a formula set without the face of its mathematics, the line the paper is to begin
 * with (Typst names its own face, which Zemp Lite does not carry).
 */
export function wordsOf(said: Pick<Said, "message" | "hints">): string {
  const hints = said.hints.map((hint) => ` (${hint})`).join("");
  const more =
    said.message === NO_MATHEMATICS ? `. Begin the paper with the line: ${MATHEMATICS}` : "";
  return `${said.message}${hints}${more}`;
}

/** One thing Typst said, placed for the page's pane and for the editor. */
export interface Told {
  severity: "error" | "warning";
  /** The line of the paper's own source it stands at, from 1; `null` where it is of another file, or of none. */
  line: number | null;
  /** Where it is, in words, before the message: `line 3`, or another file's path and line. */
  where: string;
  text: string;
}

/**
 * What Typst said of a setting, each thing placed: at its line of the paper's own source, or
 * named by its file where it is of another (a table the paper includes). Things said twice of
 * one place are said once.
 */
export function toldOf(said: readonly Said[], main: string): Told[] {
  const seen = new Set<string>();
  const told: Told[] = [];
  for (const one of said) {
    const own = one.file === main;
    const where =
      one.file === null
        ? ""
        : own
          ? one.line === null
            ? ""
            : `line ${one.line}`
          : one.line === null
            ? one.file
            : `${one.file}, line ${one.line}`;
    const text = wordsOf(one);
    const key = `${one.severity}|${where}|${text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    told.push({ severity: one.severity, line: own ? one.line : null, where, text });
  }
  return told;
}

/** The count of pages, in words: `1 page`, `3 pages`. */
export const pagesWords = (count: number): string => `${count} page${count === 1 ? "" : "s"}`;

/**
 * What the page's pane says above the pages: that the pages are of the text as it stands,
 * with what Typst warns of; or that Typst refuses the text, and what is shown meanwhile.
 */
export function standingWords(ok: boolean, pages: number, told: readonly Told[]): string {
  const errors = told.filter((one) => one.severity === "error").length;
  const warnings = told.length - errors;
  const counted = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;
  if (ok) return warnings === 0 ? "" : `Typst set the paper, with ${counted(warnings, "warning")}.`;
  const refused = `Typst refuses the text as it stands (${counted(Math.max(errors, 1), "error")}).`;
  return pages === 0
    ? `${refused} There is no page yet.`
    : `${refused} The ${pages === 1 ? "page is" : "pages are"} of the text as it last set, not of the present text.`;
}

/**
 * The line of a paper's own source, from 1, that names another file of the project (a table
 * it includes, a figure it places), so that what came from that file can be gone to in the
 * paper itself; `null` where no line names it. A name is read as Typst reads it: from the
 * paper's own folder, or from the project's top where it begins with `/`.
 */
export function lineNaming(text: string, main: string, file: string): number | null {
  const folder = main.split("/").slice(0, -1);
  const lines = text.split("\n");
  for (const [index, line] of lines.entries()) {
    for (const quoted of line.matchAll(/"([^"\n]+)"/g)) {
      const named = quoted[1] as string;
      const parts = named.startsWith("/") ? [] : [...folder];
      for (const part of named.replace(/^\//, "").split("/")) {
        if (part === "..") parts.pop();
        else if (part !== "." && part !== "") parts.push(part);
      }
      if (parts.join("/") === file) return index + 1;
    }
  }
  return null;
}

/**
 * A row of the Outline: a heading of the paper, or one of its tables and figures (release
 * 0.3.1, step 10; open decision #245), with where it is gone to.
 */
export interface OutlineRow {
  /** A heading's level; a table or a figure stands one level under the heading it follows. */
  level: number;
  /** A heading's words; for a table or a figure its name, as "Table 1". */
  text: string;
  /** For a table or a figure: which it is, and its caption where it has one. */
  figure?: { kind: "table" | "figure"; caption: string | null };
  /**
   * The line of the paper's own source it is gone to, from 1: its own, or for a heading of a
   * file the paper includes, the line that names that file; `null` where neither is known.
   */
  line: number | null;
  /** The file it is written in where that is not the paper itself. */
  from: string | null;
  /** Where it stands on the pages: the page from 0, and points from the page's top. */
  page: number;
  y: number;
}

/** The name of a table or a figure, as the page numbers it: "Table 1", "Figure 2", "Figure". */
export function figureName(figure: Pick<Figure, "kind" | "supplement" | "number">): string {
  const word =
    figure.supplement.trim() !== ""
      ? figure.supplement.trim()
      : figure.kind === "table"
        ? "Table"
        : "Figure";
  return figure.number === null ? word : `${word} ${figure.number}`;
}

/**
 * The rows of the Outline: the paper's headings, and its tables and figures, in the order
 * they stand on the pages, each with where it is gone to.
 */
export function outlineOf(
  headings: readonly Heading[],
  main: string,
  text: string,
  figures: readonly Figure[] = [],
): OutlineRow[] {
  const placed = (one: Heading | Figure) => {
    const own = one.file === main;
    return {
      line: own ? one.line : one.file === null ? null : lineNaming(text, main, one.file),
      from: own ? null : one.file,
      page: one.page,
      y: one.y,
    };
  };
  const rows: OutlineRow[] = headings.map((one) => ({
    level: one.level,
    text: one.text,
    ...placed(one),
  }));
  for (const one of figures) {
    // Where it stands among the rows: after the last that is above it on the pages.
    let at = 0;
    while (
      at < rows.length &&
      ((rows[at] as OutlineRow).page < one.page ||
        ((rows[at] as OutlineRow).page === one.page && (rows[at] as OutlineRow).y <= one.y))
    ) {
      at += 1;
    }
    // One level under the heading it follows, or at the first level where it follows none.
    const above = rows
      .slice(0, at)
      .reverse()
      .find((row) => row.figure === undefined);
    rows.splice(at, 0, {
      level: above === undefined ? 1 : above.level + 1,
      text: figureName(one),
      figure: { kind: one.kind === "table" ? "table" : "figure", caption: one.caption },
      ...placed(one),
    });
  }
  return rows;
}

/**
 * The row the cursor is under, by its place among the rows: the last heading written at or
 * above the cursor's line; `null` where the cursor is above them all, or its line is not known.
 */
export function rowAt(rows: readonly OutlineRow[], line: number | null): number | null {
  if (line === null) return null;
  let found: number | null = null;
  rows.forEach((row, index) => {
    if (row.line !== null && row.line <= line) found = index;
  });
  return found;
}
