// The reader of the app's own pages, Using Zemp Lite (release 0.2.3, step 8a; open decision
// #211, item 9). These pages describe the app, not the language, so their words are Zemp's
// and are kept here, as text files (`pages/*.md`): the one exception to the rule that every
// word of the Help place is the engine's. A page is written in a small part of Markdown, read
// into the parts the Help place sets in the type of the engine's pages:
//
//   # Title                          the first line
//   One line.                        the first paragraph: what the page is for, in one line
//   ## Heading                       a section
//   A paragraph.                     lines that follow one another are one paragraph
//   - item        1. item            a list, plain or numbered; a line indented goes on with its item
//   ![words](name)                   a picture of the screen, with its words for a screen reader
//
// and within a line: **a control** as the screen names it; `code`; <kbd>a key</kbd>; a link
// [to another of these pages](its-name), [to a function](help:reg), [to a package](package:stats)
// or [to a code](code:W0201). Anything else that looks like a mark is an error, with its line,
// so that a slip in a page is found by a test and never shown.
import type { Stop } from "../help/history";

/** A piece of a line. */
export type Piece =
  | { kind: "text"; text: string }
  /** A control, as the screen names it. */
  | { kind: "control"; text: string }
  | { kind: "code"; text: string }
  | { kind: "key"; text: string }
  /** A link: to another of these pages, or to a page of the engine's, whose name is set as code. */
  | { kind: "link"; text: string; to: Stop };

/** A part of a page. A heading has its place among the headings, for the outline. */
export type Block =
  | { kind: "heading"; text: string; line: number }
  | { kind: "paragraph"; pieces: Piece[] }
  | { kind: "list"; ordered: boolean; items: Piece[][] }
  | { kind: "picture"; name: string; words: string };

/** A page: its title, what it is for in one line, and its parts. */
export interface UsingDoc {
  title: string;
  line: string;
  blocks: Block[];
}

/** A slip in a page's text, with the line it is on. */
export class UsingError extends Error {
  constructor(
    readonly at: number,
    what: string,
  ) {
    super(`line ${at}: ${what}`);
  }
}

const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MARK = /\*\*(.+?)\*\*|`([^`]+)`|<kbd>(.+?)<\/kbd>|\[([^\]]+)\]\(([^)\s]+)\)/g;

/** Where a link goes. */
function target(to: string, at: number): Stop {
  if (to.startsWith("help:") && to.length > 5) return { kind: "name", name: to.slice(5) };
  if (to.startsWith("package:") && to.length > 8) return { kind: "package", name: to.slice(8) };
  if (/^code:[WZ]\d{4}$/.test(to)) return { kind: "code", code: to.slice(5) };
  if (NAME.test(to)) return { kind: "using", page: to };
  throw new UsingError(at, `a link goes to \`${to}\`, which is no page`);
}

/** The pieces of a line. */
export function piecesOf(text: string, at = 1): Piece[] {
  const pieces: Piece[] = [];
  const plain = (words: string) => {
    if (words === "") return;
    // A mark left over is one that was not closed, or is not of this small part of Markdown.
    const stray = /\*\*|`|<\/?kbd|\]\(|!\[/.exec(words);
    if (stray !== null) throw new UsingError(at, `\`${stray[0]}\` is not closed, or not known`);
    pieces.push({ kind: "text", text: words });
  };
  let from = 0;
  for (const found of text.matchAll(MARK)) {
    plain(text.slice(from, found.index));
    const [, control, code, key, link, to] = found;
    if (control !== undefined) pieces.push({ kind: "control", text: control });
    else if (code !== undefined) pieces.push({ kind: "code", text: code });
    else if (key !== undefined) pieces.push({ kind: "key", text: key });
    else if (link !== undefined && to !== undefined) {
      pieces.push({ kind: "link", text: link, to: target(to, at) });
    }
    from = found.index + found[0].length;
  }
  plain(text.slice(from));
  return pieces;
}

/** The words of pieces, as they read. */
export const wordsOf = (pieces: Piece[]) => pieces.map((piece) => piece.text).join("");

/** Read a page. A slip in its text is a `UsingError`. */
export function readUsing(text: string): UsingDoc {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const first = lines.findIndex((line) => line.trim() !== "");
  const title = /^# (.+)$/.exec(lines[first] ?? "");
  if (title === null || title[1] === undefined) {
    throw new UsingError(Math.max(first, 0) + 1, "a page begins with its title, `# Title`");
  }
  const blocks: Block[] = [];
  let line = "";
  let headings = 0;
  let at = first + 1;
  while (at < lines.length) {
    const here = lines[at] ?? "";
    const number = at + 1;
    if (here.trim() === "") {
      at += 1;
      continue;
    }
    if (here.startsWith("#")) {
      const heading = /^## (.+)$/.exec(here);
      if (heading === null || heading[1] === undefined) {
        throw new UsingError(number, "a heading is `## Heading`; a page has one title");
      }
      blocks.push({ kind: "heading", text: heading[1].trim(), line: headings });
      headings += 1;
      at += 1;
      continue;
    }
    const picture = /^!\[(.*)\]\((.*)\)$/.exec(here.trim());
    if (picture !== null) {
      const [, words = "", name = ""] = picture;
      if (words.trim() === "")
        throw new UsingError(number, "a picture has words for a screen reader");
      if (!NAME.test(name))
        throw new UsingError(number, `a picture is named as \`a-name\`, not \`${name}\``);
      blocks.push({ kind: "picture", name, words: words.trim() });
      at += 1;
      continue;
    }
    const item = /^(-|\d+\.) (.+)$/.exec(here);
    if (item !== null) {
      const ordered = item[1] !== "-";
      const items: Piece[][] = [];
      while (at < lines.length) {
        const next = /^(-|\d+\.) (.+)$/.exec(lines[at] ?? "");
        if (next === null || (next[1] !== "-") !== ordered) break;
        const begun = at + 1;
        let words = next[2] ?? "";
        at += 1;
        // A line indented goes on with the item above it.
        while (at < lines.length && /^\s+\S/.test(lines[at] ?? "")) {
          words += ` ${(lines[at] ?? "").trim()}`;
          at += 1;
        }
        items.push(piecesOf(words, begun));
      }
      blocks.push({ kind: "list", ordered, items });
      continue;
    }
    // A paragraph: the lines up to a blank one, a heading, a list or a picture.
    const begun = number;
    let words = here.trim();
    at += 1;
    while (at < lines.length) {
      const next = lines[at] ?? "";
      if (next.trim() === "" || /^(#|- |\d+\. |!\[)/.test(next)) break;
      words += ` ${next.trim()}`;
      at += 1;
    }
    const pieces = piecesOf(words, begun);
    // The first paragraph is the page's one line, and is words alone.
    if (line === "" && blocks.length === 0) {
      if (pieces.some((piece) => piece.kind !== "text")) {
        throw new UsingError(begun, "the first paragraph is the page's one line, in plain words");
      }
      line = words;
    } else {
      blocks.push({ kind: "paragraph", pieces });
    }
  }
  if (line === "") throw new UsingError(first + 2, "a page has its one line under its title");
  return { title: title[1].trim(), line, blocks };
}

/** The headings of a page, for the outline: where each is, and its words. */
export function headingsOf(doc: UsingDoc): { line: number; title: string }[] {
  return doc.blocks.flatMap((block) =>
    block.kind === "heading" ? [{ line: block.line, title: block.text }] : [],
  );
}
