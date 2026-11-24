// The reader of a help page (release 0.2.1, step 10a; the owner's choice of 22 November 2026,
// a formatted page). The engine prints a function's page (`zeff help`) and a code's
// (`zeff explain`) as text set for a terminal, 118 characters wide. The Help place sets the
// same words in type, so the print is read here into its parts: each function of the page with
// its name, what it does and its facts; each section by its heading; and within a section what
// the heading promises (the usage, the arguments, the warnings by code, the examples) or, in
// prose, its paragraphs, lists, sub-headings, tables and examples.
//
// Nothing is written here and nothing left out: every part keeps the print's own characters
// (the backticks around code among them), and `wordsOf` gives them back in the print's order,
// which the tests hold for every page the engine has. A page the reader does not know (a
// package's list of functions) is kept as printed.

/** A page, read. */
export interface HelpDoc {
  /** The functions of the page, or the one code: each with its sections. */
  entries: Entry[];
  /**
   * Lines the page says outside any function: a function that arrives with a later release
   * has one line and no page, and the engine's sentence for a name it has not is one too.
   */
  notes: Note[];
  /** The page as printed, where the reader does not know its shape; `null` where it does. */
  plain: string | null;
}

/** A line the page says of itself, set at the first column. */
export interface Note {
  text: string;
  /** The line of the page it stands on, counted from 0. */
  line: number;
}

/** A function of the page, or a code. */
export interface Entry {
  /** `reg`, or `W1001`. */
  name: string;
  /** What it does, as the first line says after the dash. */
  does: string;
  /** The facts at the right of the first line: package, tier, since, edition, accuracy. */
  facts: string[];
  /** The line of the page its first line stands on, counted from 0. */
  line: number;
  sections: Section[];
  /** What the page says after the function's sections: another function of the name to come. */
  notes: Note[];
}

export interface Section {
  /** The heading as the page writes it: `USAGE`, `WARNINGS AND NOTES`. */
  heading: string;
  /** The heading in sentence case: `Usage`, `Warnings and notes`. */
  title: string;
  /** The line of the page the heading stands on, counted from 0. */
  line: number;
  blocks: Block[];
}

export type Block =
  | { kind: "usage"; code: string }
  | { kind: "arguments"; rows: Argument[] }
  | { kind: "codes"; rows: CodeRow[] }
  | { kind: "value"; parts: ValuePart[] }
  | { kind: "references"; items: string[] }
  | { kind: "names"; names: string[] }
  | { kind: "example"; lines: ExampleLine[] }
  | { kind: "paragraph"; text: string }
  | { kind: "subheading"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "table"; head: string[]; rows: string[][] }
  | { kind: "printed"; lines: string[] };

export interface Argument {
  /** `data`, `fe:`, `...`. */
  name: string;
  /** The type the description opens with: `Frame`, `classical | robust | hc2 | hc3`. */
  type: string;
  /** What stood between the type and the description in the print: `. `, `.` or nothing. */
  stop: string;
  /** The description, after its type. */
  text: string;
  /** Whether the print marks the description `(shared)`: it is shared with other functions. */
  shared: boolean;
}

export interface CodeRow {
  /** `Note`, or a code: `W1001`, `Z0401`. */
  key: string;
  kind: "note" | "warning" | "error";
  text: string;
}

/** A piece of what VALUE says: prose, or a list of the names a result answers to. */
export type ValuePart =
  { kind: "text"; text: string } | { kind: "names"; label: string; names: string[]; stop: string };

export interface ExampleLine {
  /** Whether the line is a statement typed (the print opens it with `> `) or what it printed. */
  typed: boolean;
  /** The line without its prompt, as printed. */
  text: string;
}

/** A heading of a page: a line of capitals begun at the first column. */
const HEADING = /^[A-Z][A-Z ]*[A-Z]$/;
/** The first line of a function or a code: its name, a dash and what it does. */
const ENTRY = /^(\S+) — (.*)$/;
/** The body of a section stands four characters in. */
const INDENT = "    ";

/** A heading in sentence case, the names it holds kept as names: `Coming from R or Stata`. */
function titleOf(heading: string): string {
  const lower = heading.charAt(0) + heading.slice(1).toLowerCase();
  return lower.replace(/\br\b/g, "R").replace(/\bstata\b/g, "Stata");
}

/** Read a page as the engine prints it. */
export function readPage(page: string): HelpDoc {
  const lines = page.replace(/\n+$/, "").split("\n");
  const unknown: HelpDoc = { entries: [], notes: [], plain: page };
  const doc: HelpDoc = { entries: [], notes: [], plain: null };
  if (!lines.some((line) => ENTRY.test(line))) {
    // No function and no code: lines the engine says, each one a sentence of its own, or a
    // page of another shape (a package's list), which is kept as printed.
    const said = lines.every(
      (line) => line === "" || (/^\S/.test(line) && !/\S\s{2,}\S/.test(line)),
    );
    if (!said || page.trim() === "") return unknown;
    lines.forEach((text, line) => {
      if (text !== "") doc.notes.push({ text, line });
    });
    return doc;
  }
  let entry: Entry | null = null;
  let body: { section: Section; lines: string[] } | null = null;
  const close = (): boolean => {
    if (body === null) return true;
    const blocks = blocksOf(body.section.heading, body.lines);
    if (blocks === null) return false;
    body.section.blocks = blocks;
    body = null;
    return true;
  };
  for (const [line, written] of lines.entries()) {
    const head = ENTRY.exec(written);
    if (head !== null) {
      if (!close()) return unknown;
      const [does = "", facts] = (head[2] ?? "").split(/\s{2,}/);
      entry = {
        name: head[1] ?? "",
        does,
        facts: facts === undefined ? [] : facts.split(" · "),
        line,
        sections: [],
        notes: [],
      };
      // A first line of more than a name, what it does and its facts is not one the reader knows.
      if ((head[2] ?? "").split(/\s{2,}/).length > 2) return unknown;
      doc.entries.push(entry);
    } else if (entry === null) {
      if (written !== "") return unknown;
    } else if (HEADING.test(written)) {
      if (!close()) return unknown;
      const section: Section = {
        heading: written,
        title: titleOf(written),
        line,
        blocks: [],
      };
      entry.sections.push(section);
      body = { section, lines: [] };
    } else if (written === "") {
      body?.lines.push("");
    } else if (written.startsWith(INDENT)) {
      if (body === null) return unknown;
      body.lines.push(written.slice(INDENT.length));
    } else if (/^\S/.test(written)) {
      // A line at the first column that is no heading: what the page says after a function.
      if (!close()) return unknown;
      entry.notes.push({ text: written, line });
    } else {
      return unknown;
    }
  }
  return close() ? doc : unknown;
}

/** The lines of a section's body in runs between its empty lines. */
function runs(lines: string[]): string[][] {
  const all: string[][] = [];
  let run: string[] = [];
  for (const line of lines) {
    if (line === "") {
      if (run.length > 0) all.push(run);
      run = [];
    } else {
      run.push(line);
    }
  }
  if (run.length > 0) all.push(run);
  return all;
}

const joined = (lines: string[]): string => lines.map((line) => line.trim()).join(" ");

/** The blocks of a section, by its heading; `null` where its lines are not what the heading promises. */
function blocksOf(heading: string, body: string[]): Block[] | null {
  const lines = [...body];
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  while (lines.length > 0 && lines[0] === "") lines.shift();
  if (lines.length === 0) return [];
  switch (heading) {
    case "USAGE":
      return lines.includes("") ? null : [{ kind: "usage", code: joined(lines) }];
    case "ARGUMENTS": {
      const rows = argumentsOf(lines);
      return rows === null ? null : [{ kind: "arguments", rows }];
    }
    case "WARNINGS AND NOTES": {
      const rows = codesOf(lines);
      return rows === null ? null : [{ kind: "codes", rows }];
    }
    case "VALUE":
      return lines.includes("") ? prose(lines) : [{ kind: "value", parts: valueOf(joined(lines)) }];
    case "REFERENCES":
      return lines.includes("")
        ? prose(lines)
        : [{ kind: "references", items: referencesOf(joined(lines)) }];
    case "SEE ALSO": {
      const names = joined(lines).split(", ");
      return names.every((name) => /^\S+$/.test(name)) ? [{ kind: "names", names }] : prose(lines);
    }
    case "EXAMPLES":
    case "EXAMPLE":
      return [{ kind: "example", lines: lines.map(exampleLine) }];
    default:
      return prose(lines);
  }
}

function exampleLine(line: string): ExampleLine {
  return line.startsWith("> ")
    ? { typed: true, text: line.slice(2) }
    : { typed: false, text: line };
}

/** The rows of ARGUMENTS: a name, then its description, which goes on under its own column. */
function argumentsOf(lines: string[]): Argument[] | null {
  const rows: Argument[] = [];
  const texts: string[][] = [];
  for (const written of lines) {
    if (written === "") return null;
    const marked = /\s{2,}\(shared\)$/.exec(written);
    const line = marked === null ? written : written.slice(0, marked.index);
    const begun = /^(\S+)\s+(\S.*)$/.exec(line);
    if (begun !== null) {
      rows.push({ name: begun[1] ?? "", type: "", stop: "", text: "", shared: marked !== null });
      texts.push([begun[2] ?? ""]);
    } else {
      const row = rows[rows.length - 1];
      if (row === undefined || !/^\s+\S/.test(line)) return null;
      texts[texts.length - 1]?.push(line.trim());
      row.shared ||= marked !== null;
    }
  }
  for (const [at, row] of rows.entries()) {
    // A description opens with its type, a sentence of its own.
    const text = (texts[at] ?? []).join(" ");
    const end = text.indexOf(". ");
    if (end >= 0) {
      Object.assign(row, { type: text.slice(0, end), stop: ". ", text: text.slice(end + 2) });
    } else if (text.endsWith(".")) {
      Object.assign(row, { type: text.slice(0, -1), stop: "." });
    } else {
      row.type = text;
    }
  }
  return rows;
}

/** The rows of WARNINGS AND NOTES: `Note` or a code, then what it says. */
function codesOf(lines: string[]): CodeRow[] | null {
  const rows: CodeRow[] = [];
  for (const line of lines) {
    const begun = /^(Note|[WZ]\d{4})\s+(\S.*)$/.exec(line);
    if (begun !== null) {
      const key = begun[1] ?? "";
      const kind = key === "Note" ? "note" : key.startsWith("W") ? "warning" : "error";
      rows.push({ key, kind, text: begun[2] ?? "" });
    } else {
      const row = rows[rows.length - 1];
      if (row === undefined || !/^\s+\S/.test(line)) return null;
      row.text += ` ${line.trim()}`;
    }
  }
  return rows;
}

/** A sentence of VALUE that lists names: `Result interface: summary, estimates, ci`. */
const NAMES = /^([A-Z][A-Za-z ]*): ([a-z_][a-z0-9_.]*(?:, [a-z_][a-z0-9_.]*)*)(\.?)$/;

/** VALUE in its sentences: prose, and the lists of names a result answers to. */
function valueOf(text: string): ValuePart[] {
  const parts: ValuePart[] = [];
  const sentences = text.split(". ");
  for (const [at, sentence] of sentences.entries()) {
    const last = at === sentences.length - 1;
    const list = NAMES.exec(sentence);
    if (list !== null) {
      parts.push({
        kind: "names",
        label: list[1] ?? "",
        names: (list[2] ?? "").split(", "),
        stop: last ? (list[3] ?? "") : ".",
      });
      continue;
    }
    const written = last ? sentence : `${sentence}.`;
    const before = parts[parts.length - 1];
    if (before?.kind === "text") before.text += ` ${written}`;
    else parts.push({ kind: "text", text: written });
  }
  return parts;
}

/** An author as a reference opens: `Davidson, R.`, `MacKinnon, J. G.`, `de Chaisemartin, C.`. */
const AUTHOR = String.raw`(?:(?:de|van|von|der|den|la|le|di|da|del) )*\p{Lu}[\p{L}'’-]+(?: \p{Lu}[\p{L}'’-]+)*,(?: \p{Lu}\.(?:-\p{Lu}\.)?)+`;
/** Where one reference ends and the next begins: a full stop, then authors and a year. */
const NEXT = new RegExp(
  String.raw`(?<=\.) (?=${AUTHOR}(?:(?:,| and|, and|,? &) ${AUTHOR})*(?:,? et al\.)? \(\d{4}[a-z]?\))`,
  "u",
);

/** REFERENCES one by one; the whole as one where no reference is seen to begin. */
function referencesOf(text: string): string[] {
  return text.split(NEXT);
}

/**
 * Prose in its blocks: a paragraph; a list (`- `); a sub-heading (a short line of its own that
 * ends no sentence, before more prose); a table (cells set under a first row's columns); an
 * example (a statement typed, and what it printed).
 */
function prose(lines: string[]): Block[] {
  const all = runs(lines);
  return all.map((run, at): Block => {
    const first = run[0] ?? "";
    if (first.startsWith("> ")) return { kind: "example", lines: run.map(exampleLine) };
    if (
      run.every((line) => line.startsWith("- ") || line.startsWith("  ")) &&
      first.startsWith("- ")
    ) {
      const items: string[] = [];
      for (const line of run) {
        if (line.startsWith("- ")) items.push(line.slice(2).trim());
        else items[items.length - 1] += ` ${line.trim()}`;
      }
      return { kind: "list", items };
    }
    if (run.some((line) => /^\s/.test(line) || /\S\s{2,}\S/.test(line))) {
      return tableOf(run) ?? { kind: "printed", lines: run };
    }
    if (
      run.length === 1 &&
      at < all.length - 1 &&
      first.length <= 70 &&
      !/[.:;,?!)]$/.test(first)
    ) {
      return { kind: "subheading", text: first };
    }
    return { kind: "paragraph", text: joined(run) };
  });
}

/** A table: a first row of column names, and every row's cells begun under them. */
function tableOf(run: string[]): Block | null {
  const first = run[0] ?? "";
  const starts = [...first.matchAll(/(?:^|\s{2,})(\S)/g)].map(
    (found) => found.index + found[0].length - 1,
  );
  if (starts.length < 2 || starts[0] !== 0 || run.length < 2) return null;
  const cells = (line: string): string[] | null => {
    const row: string[] = [];
    for (const [at, from] of starts.entries()) {
      // A cell begins at its column, with nothing of the cell before astride it.
      if (from > 0 && line.length > from && !/^\s{2}$/.test(line.slice(from - 2, from)))
        return null;
      row.push(line.slice(from, starts[at + 1]).trim());
    }
    return row;
  };
  const rows = run.map(cells);
  if (rows.some((row) => row === null)) return null;
  const [head = [], ...rest] = rows as string[][];
  return { kind: "table", head, rows: rest };
}

/** A piece of a line of prose. */
export type Piece =
  /** Words in the page's type. */
  | { kind: "text"; text: string }
  /** Code, which the print sets between backticks. */
  | { kind: "code"; text: string }
  /** A function named as a call, `base()`: its page is `name`'s. */
  | { kind: "call"; text: string; name: string }
  /** A code, `W1001`: it has a page of its own. */
  | { kind: "coded"; text: string }
  /** A title, which a reference sets between asterisks. */
  | { kind: "title"; text: string };

const CALL = /^([a-z_][a-z0-9_.]*)\(\)$/;

/**
 * A line of prose in its pieces. The backticks and, in a reference, the asterisks are the
 * print's marks and are not among the pieces' text; every other character is. A line whose
 * backticks do not pair (Stata's own quotation, `` `x' ``) is given as it is.
 */
export function pieces(text: string, titles = false): Piece[] {
  const parts = text.split("`");
  if (parts.length % 2 === 0) return words(text, titles);
  return parts.flatMap((part, at): Piece[] => {
    if (at % 2 === 0) return words(part, titles);
    const call = CALL.exec(part);
    return [
      call === null
        ? { kind: "code", text: part }
        : { kind: "call", text: part, name: call[1] ?? "" },
    ];
  });
}

/**
 * The name the engine suggests in a sentence that it has no such name ("no function or package
 * is called `lm`; did you mean `lp`?"): the name after "did you mean", or `null` where the
 * sentence suggests none.
 */
export function suggested(text: string): string | null {
  return /\bdid you mean `([^`]+)`\?/.exec(text)?.[1] ?? null;
}

/** Words outside code: the codes among them, and in a reference the titles. */
function words(text: string, titles: boolean): Piece[] {
  const marks = titles ? /\b[WZ]\d{4}\b|\*([^*\s][^*]*?)\*/g : /\b[WZ]\d{4}\b/g;
  const all: Piece[] = [];
  let at = 0;
  for (const found of text.matchAll(marks)) {
    if (found.index > at) all.push({ kind: "text", text: text.slice(at, found.index) });
    all.push(
      found[1] === undefined
        ? { kind: "coded", text: found[0] }
        : { kind: "title", text: found[1] },
    );
    at = found.index + found[0].length;
  }
  if (at < text.length) all.push({ kind: "text", text: text.slice(at) });
  return all;
}

/**
 * The words of a page that was read, in the print's order and with its marks: what the tests
 * hold to the words of the print itself, so that the reader is seen to lose, add and move none.
 */
export function wordsOf(doc: HelpDoc): string[] {
  const said: string[] = [];
  const blocks = (all: Block[]): void => {
    for (const block of all) {
      switch (block.kind) {
        case "usage":
          said.push(block.code);
          break;
        case "arguments":
          for (const row of block.rows) {
            said.push(row.name, `${row.type}${row.stop}${row.text}`);
            if (row.shared) said.push("(shared)");
          }
          break;
        case "codes":
          for (const row of block.rows) said.push(row.key, row.text);
          break;
        case "value":
          for (const part of block.parts) {
            said.push(
              part.kind === "text"
                ? part.text
                : `${part.label}: ${part.names.join(", ")}${part.stop}`,
            );
          }
          break;
        case "references":
        case "list":
          for (const item of block.items) said.push(block.kind === "list" ? `- ${item}` : item);
          break;
        case "names":
          said.push(block.names.join(", "));
          break;
        case "example":
          for (const line of block.lines) said.push(line.typed ? `> ${line.text}` : line.text);
          break;
        case "paragraph":
        case "subheading":
          said.push(block.text);
          break;
        case "table":
          for (const row of [block.head, ...block.rows]) said.push(...row);
          break;
        case "printed":
          said.push(...block.lines);
          break;
      }
    }
  };
  // The notes of a page stand among its functions, where their lines put them.
  const parts: { line: number; say: () => void }[] = doc.notes.map((note) => ({
    line: note.line,
    say: () => said.push(note.text),
  }));
  for (const entry of doc.entries) {
    parts.push({
      line: entry.line,
      say: () => said.push(entry.name, "—", entry.does, entry.facts.join(" · ")),
    });
    for (const section of entry.sections) {
      parts.push({
        line: section.line,
        say: () => {
          said.push(section.heading);
          blocks(section.blocks);
        },
      });
    }
    for (const note of entry.notes)
      parts.push({ line: note.line, say: () => said.push(note.text) });
  }
  for (const part of parts.sort((a, b) => a.line - b.line)) part.say();
  return said
    .join(" ")
    .split(/\s+/)
    .filter((word) => word !== "");
}

/** The words of a page as printed. */
export function wordsOfPrint(page: string): string[] {
  return page.split(/\s+/).filter((word) => word !== "");
}

/** A place of a page the outline goes to: a function, where the page has several, or a section. */
export interface OutlineItem {
  /** `Usage`, or `summary · data` for a function of a page that holds several of a name. */
  title: string;
  /** The line of the page it stands on, counted from 0. */
  line: number;
  /** Whether it is a function, over its own sections. */
  entry: boolean;
}

/** The outline of a page: its sections, each function named over its own where there are several. */
export function outlineOf(doc: HelpDoc): OutlineItem[] {
  const several = doc.entries.length > 1;
  return doc.entries.flatMap((entry): OutlineItem[] => [
    ...(several
      ? [{ title: `${entry.name} · ${entry.facts[0] ?? ""}`, line: entry.line, entry: true }]
      : []),
    ...entry.sections.map((section) => ({
      title: section.title,
      line: section.line,
      entry: false,
    })),
  ]);
}
