// The sections of a script (open decision #178, in the form the owner chose on 21 November
// 2026): a comment written as a heading, `// # Title`, begins a section, and `// ## Title` a
// subsection of it. The language server reports sections from Zeff 0.9.0; on Zeff 0.8.0 the
// interface reads the comments itself, here, and this reader is replaced by the engine's when
// Zemp moves to that engine (Zemp Lite 0.2.1, step 3; #203).
//
// What is a section: a comment alone on its line, begun at the line's first column, of one or
// two `#` and then a title. What is not: a comment further in (inside a block), a comment of
// three or more `#`, a heading with no title, and a line of that look inside a statement that
// runs over several lines (a call whose arguments are written over lines, with a comment
// between them), which the engine's reading of the statements tells apart. A text cannot hold
// one: in Zeff a text ends on the line it begins on.

import type { Ranged } from "../engine/messages";

export interface Section {
  /** The line of the comment, counted from 1. */
  line: number;
  /** 1 for `// # Title`, 2 for `// ## Title`. */
  level: 1 | 2;
  title: string;
  /**
   * The last line of the section: the line before the next heading of its own level or
   * above, or the script's last line. A section holds its subsections.
   */
  end: number;
}

const HEADING = /^\/\/\s*(#{1,2})\s+(\S.*?)\s*$/;

/**
 * The sections of `text`, in order. `statements` is the engine's reading of the same text,
 * where it has one: a heading-like line inside a statement is then passed over.
 */
export function sectionsOf(text: string, statements: Ranged[] = []): Section[] {
  const lines = text.split("\n");
  const inside = (line: number) => statements.some((one) => one.line < line && line <= one.end);
  const found: Section[] = [];
  lines.forEach((written, at) => {
    const match = HEADING.exec(written);
    const line = at + 1;
    if (match === null || inside(line)) return;
    found.push({
      line,
      level: match[1] === "#" ? 1 : 2,
      title: match[2] ?? "",
      end: lines.length,
    });
  });
  // A text that ends with a line break has no line after it.
  const last = text.endsWith("\n") ? lines.length - 1 : lines.length;
  found.forEach((section, at) => {
    const next = found.slice(at + 1).find((one) => one.level <= section.level);
    section.end = Math.max(section.line, next === undefined ? last : next.line - 1);
  });
  return found;
}

/** The section a line is in: the last heading at or before it, a subsection before its section. */
export function sectionAt(sections: Section[], line: number): Section | null {
  return sections.filter((one) => one.line <= line && line <= one.end).at(-1) ?? null;
}
