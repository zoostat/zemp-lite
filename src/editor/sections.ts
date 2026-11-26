// The sections of a script (open decision #178, in the form the owner chose on 21 November
// 2026): a comment written as a heading, `// # Title`, begins a section, and `// ## Title` a
// subsection of it. The engine reads them (from Zeff 0.9.0: what its language server reports
// as the outline of a document), and the worker gives them with the statements of the same
// text (`sections` in `worker/src/lib.rs`, whose test holds every case named here). Until
// release 0.3 the interface read the comments itself, in this file; that reader is gone.
//
// What is a section: a comment alone on its line, of one or two `#`, a space and a title,
// where it stands between two statements of the script. What is not: a comment of three or
// more `#`, a heading with no title, a comment after code on its line, and a line of that
// look inside a statement that runs over several lines (a call whose arguments are written
// over lines, with a comment between them; the body of a loop or of a function).

import type { Sectioned } from "../engine/messages";

/**
 * A section: the line of its comment, counted from 1; 1 for `// # Title` and 2 for
 * `// ## Title`; its title; and its last line, which is the line before the next heading of
 * its own level or above, or the script's last line. A section holds its subsections.
 */
export type Section = Sectioned;

/** The section a line is in: the last heading at or before it, a subsection before its section. */
export function sectionAt(sections: Section[], line: number): Section | null {
  return sections.filter((one) => one.line <= line && line <= one.end).at(-1) ?? null;
}
