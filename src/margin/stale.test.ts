import { describe, expect, it } from "vitest";
import type { Ranged, StatementInfo } from "../engine/messages";
import { begin, end, hear, type Run } from "../output/run";
import { marks, merged } from "./stale";

/** The statements of a text of one line each, every line a statement but comments and blanks. */
const ranges = (text: string): Ranged[] =>
  text
    .split("\n")
    .map((line, at) => ({ line: at + 1, end: at + 1, kind: "statement" as const, text: line }))
    .filter((one) => one.text.trim() !== "" && !one.text.trim().startsWith("//"))
    .map(({ line, end, kind }) => ({ line, end, kind }));

const info = (line: number, stdout: string): StatementInfo => ({
  line,
  end: line,
  kind: "statement",
  name: null,
  type: null,
  ran: true,
  stdout,
  stderr: "",
  frame: null,
  memory: null,
});

/** A run of `text` in which the statements on `lines` ran, each printing its line's text. */
function ran(text: string, lines?: number[]): Run {
  const run = begin("s.zeff", text, 0, "9:42");
  const all = ranges(text);
  hear(run, { type: "ranges", statements: all }, 0);
  const chosen = all.filter((one) => lines === undefined || lines.includes(one.line));
  const source = text.split("\n");
  chosen.forEach(({ line }, at) => {
    hear(run, { type: "started", statement: at + 1, of: chosen.length, line }, 1);
    hear(run, { type: "output", stdout: `${source[line - 1]}\n`, stderr: "" }, 1);
    hear(run, { type: "finished", statement: at + 1, of: chosen.length, line, failed: false }, 2);
  });
  end(
    run,
    {
      exitCode: 0,
      stdout: "",
      stderr: "",
      statements: chosen.map(({ line }) => info(line, `${source[line - 1]}\n`)),
      frames: [],
      stopped: false,
    },
    3,
  );
  if (lines !== undefined) run.partial = lines;
  return run;
}

const byLine = (found: Map<number, { mark: string; line: number | null }>) =>
  [...found.entries()].map(([old, { mark, line }]) => [old, mark, line]);

describe("the marks of the results on the page", () => {
  it("are all fresh while the script is as it ran", () => {
    const run = ran("a\nb\nc\n");
    expect(byLine(marks(run, "a\nb\nc\n", ranges("a\nb\nc\n")))).toEqual([
      [1, "fresh", 1],
      [2, "fresh", 2],
      [3, "fresh", 3],
    ]);
  });

  it("make the edited statement edited, those below it stale, and those above it fresh", () => {
    const run = ran("a\nb\nc\nd\n");
    const now = "a\nB\nc\nd\n";
    expect(byLine(marks(run, now, ranges(now)))).toEqual([
      [1, "fresh", 1],
      [2, "edited", 2],
      [3, "stale", 3],
      [4, "stale", 4],
    ]);
  });

  it("follow the statements to their new lines, and mark nothing for a comment or a blank line", () => {
    const run = ran("a\nb\n");
    const now = "// a note\n\na\nb\n";
    expect(byLine(marks(run, now, ranges(now)))).toEqual([
      [1, "fresh", 3],
      [2, "fresh", 4],
    ]);
  });

  it("make what stands below a statement added or taken out stale", () => {
    const run = ran("a\nb\nc\n");
    const added = "a\nnew\nb\nc\n";
    expect(byLine(marks(run, added, ranges(added)))).toEqual([
      [1, "fresh", 1],
      [2, "stale", 3],
      [3, "stale", 4],
    ]);
    const taken = "a\nc\n";
    expect(byLine(marks(run, taken, ranges(taken)))).toEqual([
      [1, "fresh", 1],
      [2, "edited", null],
      [3, "stale", 2],
    ]);
  });
});

describe("the page after a run of less than the script", () => {
  it("holds the results the run made, and keeps the others where their statements now stand", () => {
    const before = ran("a\nb\nc\nd\n");
    const now = "a\nB\nc\nd\n";
    // ⌘↵ on line 2: it, and what it needs (here, line 1), are run.
    const after = merged(before, ran(now, [1, 2]));
    expect(after.statements.map((one) => [one.line, one.printed, one.mark ?? "made"])).toEqual([
      [1, "a\n", "made"],
      [2, "B\n", "made"],
      [3, "c\n", "stale"],
      [4, "d\n", "stale"],
    ]);
    expect(after.info.map((one) => one.line)).toEqual([1, 2, 3, 4]);
    expect(after.partial).toEqual([1, 2]);
  });

  it("keeps fresh a result above every change, and moves it with its statement", () => {
    const before = ran("a\nb\nc\n");
    const now = "a\n// note\nb\nC\n";
    const after = merged(before, ran(now, [4]));
    // Line 4 was run; lines 1 and 3 are the results of the run before, unmarked, since
    // nothing above them changed: a comment is not a statement.
    expect(after.statements.map((one) => [one.line, one.printed, one.mark ?? "fresh"])).toEqual([
      [1, "a\n", "fresh"],
      [3, "b\n", "fresh"],
      [4, "C\n", "fresh"],
    ]);
  });

  it("drops the result of a statement taken out", () => {
    const before = ran("a\nb\nc\n");
    const now = "a\nc\n";
    const after = merged(before, ran(now, [1]));
    expect(after.statements.map((one) => [one.line, one.printed])).toEqual([
      [1, "a\n"],
      [2, "c\n"],
    ]);
    expect(after.statements[1]?.mark).toBe("stale");
  });
});
