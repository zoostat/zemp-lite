// Where each block of a run stands in the Inline layout: directly under its statement (Zemp
// Specification, section 5). At Zeff 0.7.0 the engine tells an interface the line a statement
// begins on and not the line it ends on (the ranges of statements arrive with 0.8.0), so the
// end is found here from the text that ran: a statement reaches to the last line before the
// next statement that is neither blank nor a comment.
import { blocks, type Block, type Run } from "./run";

export interface Placed {
  /** The line of the script the block stands under, counted from 1. */
  after: number;
  block: Block;
}

/**
 * The last line of the statement that begins on line `start`, in a script whose next
 * statement begins on line `next` (`null` where it is the last).
 */
export function lastLine(lines: string[], start: number, next: number | null): number {
  let last = Math.min(next === null ? lines.length : next - 1, lines.length);
  while (last > start) {
    const text = (lines[last - 1] ?? "").trim();
    if (text !== "" && !text.startsWith("//")) break;
    last -= 1;
  }
  return Math.max(last, Math.min(start, lines.length), 1);
}

/**
 * The last line of the statement that begins on line `start`, found from its shape alone: it
 * ends on the first line where every bracket opened is closed, the line does not end with an
 * operator or a comma, and the next line of code does not carry it on with a `.` or a closing
 * bracket. This is for a statement with no statement started after it that did not finish
 * well: one that is running, or one that failed, after which nothing ran.
 */
export function lastLineByShape(lines: string[], start: number): number {
  let depth = 0;
  for (let at = start; at <= lines.length; at++) {
    const line = code(lines[at - 1] ?? "");
    for (const char of line) {
      if ("([{".includes(char)) depth += 1;
      else if (")]}".includes(char)) depth -= 1;
    }
    let next = at + 1;
    while (next <= lines.length && code(lines[next - 1] ?? "").trim() === "") next += 1;
    const carriesOn = /^\s*[.)\]}]/.test(code(lines[next - 1] ?? ""));
    if (depth <= 0 && !/[-+*/^~=<>|&,:(]\s*$/.test(line) && !carriesOn) {
      return at;
    }
  }
  return Math.max(lines.length, 1);
}

/** A line without its comment and with its texts emptied, so that only its code is read. */
function code(line: string): string {
  return line.replace(/r?"(?:[^"\\]|\\.)*"?/g, '""').replace(/\/\/.*$/, "");
}

/** The blocks of a run, each with the line it stands under. */
export function placed(run: Run): Placed[] {
  const lines = run.text.split("\n");
  // A text that ends with a line break has no line after it.
  if (lines.at(-1) === "") lines.pop();
  const starts = [...new Set(run.statements.map((statement) => statement.line))].sort(
    (a, b) => a - b,
  );
  return blocks(run).map((block) => {
    if (block.line === null) {
      return { after: Math.max(lines.length, 1), block };
    }
    const from = block.line;
    const next = starts.find((start) => start > from) ?? null;
    const unfinished = next === null && block.state !== "done";
    return {
      after: unfinished
        ? lastLineByShape(lines, Math.min(from, Math.max(lines.length, 1)))
        : lastLine(lines, from, next),
      block,
    };
  });
}
