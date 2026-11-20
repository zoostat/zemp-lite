import { describe, expect, it } from "vitest";
import type { Outcome, StatementInfo } from "../engine/messages";
import { begin, end, hear } from "../output/run";
import { counted, notesOf } from "./notes";

const info = (line: number, more: Partial<StatementInfo>): StatementInfo => ({
  line,
  end: line,
  kind: "statement",
  name: null,
  type: null,
  ran: true,
  stdout: "",
  stderr: "",
  frame: null,
  memory: null,
  ...more,
});

const ranges = (...lines: number[]) =>
  lines.map((line) => ({ line, end: line, kind: "statement" as const }));

const outcome = (statements: StatementInfo[], exitCode = 0): Outcome => ({
  exitCode,
  stdout: "",
  stderr: "",
  statements,
  frames: [],
  stopped: false,
});

describe("a note", () => {
  it("writes a count as the engine does", () => {
    expect(counted(7)).toBe("7");
    expect(counted(18412)).toBe("18,412");
    expect(counted(1234567)).toBe("1,234,567");
  });

  it("says, while a run goes, which statement runs and which wait", () => {
    const run = begin("s.zeff", "a\nb\nc\n", 0, "9:42");
    hear(run, { type: "ranges", statements: ranges(1, 2, 3) }, 0);
    hear(run, { type: "started", statement: 1, of: 3, line: 1 }, 1);
    hear(run, { type: "finished", statement: 1, of: 3, line: 1, failed: false }, 2);
    hear(run, { type: "started", statement: 2, of: 3, line: 2 }, 3);
    hear(run, { type: "pass", pass: 40, of: 200000, line: 2 }, 4);
    const notes = notesOf(run, false);
    expect(notes.map((note) => note.state)).toEqual(["fresh", "running", "waiting"]);
    expect(notes[1]!.tags).toEqual([{ text: "running…", kind: "state" }]);
    expect(notes[1]!.sub).toBe("200,000 passes");
  });

  it("marks a failed statement and those it kept from running, with the error's code", () => {
    const run = begin("s.zeff", "a\nb\nc\n", 0, "9:42");
    hear(run, { type: "ranges", statements: ranges(1, 2, 3) }, 0);
    hear(run, { type: "started", statement: 1, of: 3, line: 1 }, 1);
    hear(run, { type: "finished", statement: 1, of: 3, line: 1, failed: false }, 2);
    hear(run, { type: "started", statement: 2, of: 3, line: 2 }, 3);
    hear(run, { type: "finished", statement: 2, of: 3, line: 2, failed: true }, 4);
    end(
      run,
      outcome(
        [
          info(1, {}),
          info(2, { stderr: "error[Z0715]: no file called `data/none.csv`\n" }),
          info(3, { ran: false }),
        ],
        1,
      ),
      5,
    );
    const notes = notesOf(run, false);
    expect(notes.map((note) => note.state)).toEqual(["fresh", "failed", "not run"]);
    expect(notes[1]!.tags).toEqual([
      { text: "Z0715", kind: "error" },
      { text: "failed", kind: "state" },
    ]);
    expect(notes[1]!.opens).toBe(true);
  });

  it("marks every result once the script is edited, as 0.1 does until the engine says more", () => {
    const run = begin("s.zeff", "let a = 1\n", 0, "9:42");
    hear(run, { type: "ranges", statements: ranges(1) }, 0);
    hear(run, { type: "started", statement: 1, of: 1, line: 1 }, 1);
    hear(run, { type: "finished", statement: 1, of: 1, line: 1, failed: false }, 2);
    end(run, outcome([info(1, { name: "a", type: "Int" })]), 3);
    expect(notesOf(run, false)[0]).toMatchObject({ main: "a", sub: "Int", state: "fresh" });
    expect(notesOf(run, true)[0]!.tags).toEqual([{ text: "edited · not run", kind: "state" }]);
  });

  it("names what a statement that is not a `let` made from the head of what it printed", () => {
    const run = begin("s.zeff", "x\ny\nz\n", 0, "9:42");
    hear(run, { type: "ranges", statements: ranges(1, 2, 3) }, 0);
    for (const line of [1, 2, 3]) {
      hear(run, { type: "started", statement: line, of: 3, line }, 1);
      hear(run, { type: "finished", statement: line, of: 3, line, failed: false }, 2);
    }
    end(
      run,
      outcome([
        info(1, { type: "RegFit", stdout: "reg · log(wage) ~ educ\n\n  term  estimate\n" }),
        info(2, { type: "Float", stdout: "2.5\n" }),
        info(3, { type: "Nothing" }),
      ]),
      3,
    );
    const notes = notesOf(run, false);
    expect(notes.map((note) => [note.main, note.sub])).toEqual([
      ["reg", "RegFit · log(wage) ~ educ"],
      ["2.5", "Float"],
      ["", ""],
    ]);
  });

  it("is given only to statements, not to a function or a `use`", () => {
    const run = begin("s.zeff", "fn f(x: Float) -> Float {\n  x\n}\nf(1.0)\n", 0, "9:42");
    hear(
      run,
      {
        type: "ranges",
        statements: [
          { line: 1, end: 3, kind: "function" },
          { line: 4, end: 4, kind: "statement" },
        ],
      },
      0,
    );
    expect(notesOf(run, false).map((note) => note.line)).toEqual([4]);
  });
});
