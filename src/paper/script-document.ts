// A script with its output, as a Typst document (release 0.3, step 17; the Zemp Specification,
// section 5, "Export script with output"; open decision #172). From a script as it stands and
// its last run: the project, the script's name and the engine's version at its head; then the
// script as typed, and under each statement what the engine printed, what it said, and its
// figure as the engine's own SVG. Typst sets it (the module of step 11), in the light print
// theme: black on white, whichever theme the window is in.
//
// Every character of a print is the engine's: the document holds each print as a text in
// quotes that Typst sets as it is, and writes none of its own beside it. A result is shown
// only where it is the result of the statement as it now stands: a statement edited since it
// ran, one below such a change, and one never run are said to be so, in words, and no older
// result is set in their place.
//
// The document holds no time and nothing of the machine, so the same script and run give the
// same file.
import type { Ranged } from "../engine/messages";
import { marks } from "../margin/stale";
import type { Run, Statement } from "../output/run";

/** What the document is made from. */
export interface Scripted {
  /** The project's name, the script's path in it, and the engine's version (`0.9.0`). */
  project: string;
  script: string;
  engine: string;
  /** The script as it stands, and its statements as the engine reads them. */
  text: string;
  ranges: readonly Ranged[];
  /** The last run of this script; `null` where it has not run. */
  run: Run | null;
  /** The figure of each statement of the run that made a plot, by the line it began on there: the engine's SVG. */
  figures: Readonly<Record<number, string>>;
}

/** The document: its main file, and the figures it places, each by its path beside it. */
export interface ScriptDocument {
  main: string;
  text: string;
  files: { path: string; text: string }[];
}

/** Where the document stands among a paper's files: the interface's own folder, never a file of the reader's. */
export const SCRIPT_FOLDER = ".zemp/export";
export const SCRIPT_MAIN = `${SCRIPT_FOLDER}/script.typ`;

/** The width of the page's text, in points: A4 less two margins of 2 cm. */
const TEXT_WIDTH = 595.276 - 2 * 56.693;
/** How far an output stands in from the code, with its rule, in points. */
const INSET = 12;
/** A letter of DejaVu Sans Mono is this share of its size wide. */
const ADVANCE = 1233 / 2048;
/** The size code is set at, and the largest and the smallest a print is set at, in points. */
const CODE_SIZE = 8.5;
const PRINT_SIZE = { most: 8.5, least: 4 } as const;
/** A print of up to this many lines is kept whole on one page. */
const WHOLE = 45;

/** A text as Typst writes one in quotes: every character kept, those that would end or bend it escaped. */
export function quoted(text: string): string {
  let out = '"';
  for (const character of text) {
    const code = character.codePointAt(0) as number;
    if (character === "\\") out += "\\\\";
    else if (character === '"') out += '\\"';
    else if (character === "\n") out += "\\n";
    else if (character === "\r") out += "\\r";
    else if (character === "\t") out += "\\t";
    else if (code < 32 || code === 127) out += `\\u{${code.toString(16)}}`;
    else out += character;
  }
  return `${out}"`;
}

/**
 * The size a print is set at, in points, so that its longest line fits the width of the page
 * beside its rule: the code's size where it fits, smaller where a table is wide, and never
 * under the smallest (a line longer than that wraps).
 */
export function printSize(text: string): number {
  const longest = Math.max(1, ...text.split("\n").map((line) => [...line].length));
  const fits = Math.floor(((TEXT_WIDTH - INSET - 2) / (longest * ADVANCE)) * 10) / 10;
  return Math.max(PRINT_SIZE.least, Math.min(PRINT_SIZE.most, fits));
}

/** A print without the line break it ends with, which is not a line of it. */
const trimmed = (text: string) => text.replace(/\n+$/, "");

/** How a statement of the script as it stands is to its last run. */
type Standing =
  /** It has a result of this text: the run's statement that made it. */
  | { kind: "fresh"; statement: Statement }
  /** It ran, and made nothing to show. */
  | { kind: "silent" }
  | { kind: "edited" }
  | { kind: "stale" }
  | { kind: "unrun" };

/**
 * For each statement of the script as it stands, by the line it begins on, how it stands to
 * the run: by the engine's reading of both texts (`margin/stale.ts`), the rule the Script
 * place marks its notes by.
 */
function standings(input: Scripted): Map<number, Standing> {
  const found = new Map<number, Standing>();
  const statements = input.ranges.filter((range) => range.kind === "statement");
  const run = input.run;
  if (run === null) {
    for (const range of statements) found.set(range.line, { kind: "unrun" });
    return found;
  }
  // The line each statement of the run now begins on, and its mark against the present text.
  const now =
    run.text === input.text
      ? new Map(
          (run.ranges ?? [])
            .filter((range) => range.kind === "statement")
            .map((range) => [range.line, { mark: "fresh" as const, line: range.line }]),
        )
      : marks(run, input.text, input.ranges);
  const byNow = new Map<number, { was: number; mark: "fresh" | "edited" | "stale" }>();
  for (const [was, value] of now) {
    if (value.line !== null) byNow.set(value.line, { was, mark: value.mark });
  }
  for (const range of statements) {
    const from = byNow.get(range.line);
    if (from === undefined) {
      found.set(range.line, { kind: "unrun" });
      continue;
    }
    if (from.mark !== "fresh") {
      found.set(range.line, { kind: from.mark });
      continue;
    }
    const statement = run.statements.find((one) => one.line === from.was);
    if (statement === undefined) {
      // The run ended before it, or ran less than the script.
      const ran = run.info.find((one) => one.line === from.was)?.ran ?? false;
      found.set(range.line, ran ? { kind: "silent" } : { kind: "unrun" });
    } else if (statement.mark !== undefined) {
      // Kept on the page from an earlier run: not a result of this text.
      found.set(range.line, { kind: statement.mark });
    } else {
      found.set(range.line, { kind: "fresh", statement });
    }
  }
  return found;
}

/** The words under a statement that has no result of the text as it stands. */
export const NOT_SHOWN = {
  edited: "edited · not run: no result is shown",
  stale: "stale: its result is of an earlier text, and is not shown",
  unrun: "not run",
} as const;

/** The document's own definitions: the page, the faces, and how code, a print and a figure are set. */
const PREAMBLE = `#set page(
  paper: "a4",
  margin: (x: 2cm, top: 2cm, bottom: 2.4cm),
  footer: context {
    set text(size: 8pt, fill: luma(90))
    grid(columns: (1fr, auto), align: (left, right), foot, counter(page).display("1 of 1", both: true))
  },
)
#set text(font: "Libertinus Serif", size: 10.5pt, lang: "en", fill: black)
#set par(justify: false, leading: 0.55em)
#show raw: set text(font: "DejaVu Sans Mono")
// The script as typed, each line with its number in the script.
#let code(first, body) = {
  show raw.line: it => {
    box(width: 2.4em, align(right, text(fill: luma(140), str(it.number + first - 1))))
    h(0.9em)
    it.body
  }
  // A statement is not left at the foot of a page without what stands under it.
  block(above: 0.7em, below: 0.5em, sticky: true, text(size: ${CODE_SIZE}pt, raw(body, block: true)))
}
// A print of up to ${WHOLE} lines is kept on one page; a longer one goes on to the next.
#let whole(body) = body.split("\n").len() <= ${WHOLE}
// What the engine printed, as it printed it.
#let printed(size, body) = block(
  above: 0.4em, below: 0.6em, inset: (left: ${INSET - 2}pt, y: 2pt), stroke: (left: 0.6pt + luma(150)),
  breakable: not whole(body),
  text(size: size, raw(body, block: true)),
)
// What the engine said: a warning, a note or an error, as it wrote it.
#let said(size, body) = block(
  above: 0.4em, below: 0.6em, inset: (left: ${INSET - 2}pt, y: 2pt), stroke: (left: 1.6pt + luma(60)),
  breakable: not whole(body),
  text(size: size, raw(body, block: true)),
)
// The engine's own figure.
#let figure-of(path) = block(
  above: 0.5em, below: 0.8em, inset: (left: ${INSET}pt), breakable: false, image(path, width: 72%),
)
// A statement with no result of the text as it stands.
#let not-shown(words) = block(
  above: 0.3em, below: 0.6em, inset: (left: ${INSET}pt),
  text(size: 9pt, style: "italic", fill: luma(80), words),
)`;

/** How many, in words: `1 statement`, `9 statements`. */
const counted = (count: number) => `${count} statement${count === 1 ? "" : "s"}`;

/**
 * The line under the script's name that says how the results stand to the script: every
 * statement's result is of this text, or how many are, or that it has not run.
 */
export function standingLine(input: Scripted): string {
  const all = [...standings(input).values()];
  if (input.run === null) return `${counted(all.length)}, not run`;
  const without = all.filter((one) => one.kind !== "fresh" && one.kind !== "silent").length;
  const ended =
    input.run.state === "failed"
      ? "; the run ended with an error"
      : input.run.state === "cancelled" || input.run.state === "stopped"
        ? "; the run was stopped"
        : "";
  return without === 0
    ? `${counted(all.length)}, each result of the script as it stands${ended}`
    : `${counted(all.length)}, ${without} without a result of the script as it stands${ended}`;
}

/** The document of a script with its output. */
export function scriptDocument(input: Scripted): ScriptDocument {
  const lines = input.text.split("\n");
  if (lines.at(-1) === "") lines.pop();
  const files: { path: string; text: string }[] = [];
  const out: string[] = [];
  const foot = `${input.script} · project ${input.project} · Zeff ${input.engine}`;
  out.push(`#let foot = ${quoted(foot)}`);
  out.push(`#set document(title: ${quoted(input.script)})`);
  out.push(PREAMBLE);
  out.push("");
  out.push(`#text(size: 15pt, weight: "bold", ${quoted(input.script)})`);
  out.push("");
  out.push(
    `#text(size: 9.5pt, fill: luma(70), ${quoted(`Project ${input.project} · Zeff ${input.engine} · ${standingLine(input)}`)})`,
  );
  out.push("#line(length: 100%, stroke: 0.5pt + luma(150))");
  const run = input.run;
  // What the engine's check found before any statement ran stands before the script.
  if (run !== null && run.beforeRaw.trim() !== "") {
    const text = trimmed(run.beforeRaw);
    out.push(`#said(${printSize(text)}pt, ${quoted(text)})`);
  }
  const how = standings(input);
  // The script in pieces, each ending with a statement, whose output follows it.
  const statements = input.ranges
    .filter((range) => range.kind === "statement")
    .slice()
    .sort((a, b) => a.line - b.line);
  let next = 1;
  const code = (from: number, to: number) => {
    const last = Math.min(to, lines.length);
    if (last < from) return;
    out.push(`#code(${from}, ${quoted(lines.slice(from - 1, last).join("\n"))})`);
  };
  for (const range of statements) {
    if (range.end < next) continue;
    code(next, range.end);
    next = range.end + 1;
    const standing = how.get(range.line) ?? { kind: "unrun" as const };
    if (standing.kind === "fresh") {
      const { statement } = standing;
      if (statement.printed !== "") {
        const text = trimmed(statement.printed);
        out.push(`#printed(${printSize(text)}pt, ${quoted(text)})`);
      }
      const figure = input.figures[statement.line];
      if (figure !== undefined) {
        const path = `figure-${files.length + 1}.svg`;
        files.push({ path: `${SCRIPT_FOLDER}/${path}`, text: figure });
        out.push(`#figure-of(${quoted(path)})`);
      }
      if (statement.saidRaw.trim() !== "") {
        const text = trimmed(statement.saidRaw);
        out.push(`#said(${printSize(text)}pt, ${quoted(text)})`);
      }
    } else if (standing.kind !== "silent" && run !== null) {
      out.push(`#not-shown(${quoted(NOT_SHOWN[standing.kind])})`);
    }
  }
  code(next, lines.length);
  // What the engine printed or said after the last statement, where the text is the one that ran.
  if (run !== null && run.text === input.text) {
    if (run.afterPrinted !== "") {
      const text = trimmed(run.afterPrinted);
      out.push(`#printed(${printSize(text)}pt, ${quoted(text)})`);
    }
    if (run.afterRaw.trim() !== "") {
      const text = trimmed(run.afterRaw);
      out.push(`#said(${printSize(text)}pt, ${quoted(text)})`);
    }
  }
  return { main: SCRIPT_MAIN, text: `${out.join("\n")}\n`, files };
}

/** The texts in quotes of a document, as Typst reads them back: what was given to `quoted`. */
export function quotedIn(document: string): string[] {
  const found: string[] = [];
  const texts = /"((?:[^"\\]|\\.)*)"/g;
  for (const match of document.matchAll(texts)) {
    found.push(
      (match[1] as string).replace(/\\(u\{([0-9a-f]+)\}|.)/g, (_, escape: string, hex?: string) =>
        hex !== undefined
          ? String.fromCodePoint(parseInt(hex, 16))
          : escape === "n"
            ? "\n"
            : escape === "r"
              ? "\r"
              : escape === "t"
                ? "\t"
                : escape,
      ),
    );
  }
  return found;
}
