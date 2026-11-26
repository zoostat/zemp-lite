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
  rows: null,
  columns: null,
  length: null,
  n: null,
  error: null,
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
  written: [],
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
    const notes = notesOf(run);
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
    const notes = notesOf(run);
    expect(notes.map((note) => note.state)).toEqual(["fresh", "failed", "not run"]);
    expect(notes[1]!.tags).toEqual([
      { text: "Z0715", kind: "error" },
      { text: "failed", kind: "state" },
    ]);
    expect(notes[1]!.opens).toBe(true);
  });

  it("marks a result as its mark against the script as it stands says", () => {
    const run = begin("s.zeff", "let a = 1\n", 0, "9:42");
    hear(run, { type: "ranges", statements: ranges(1) }, 0);
    hear(run, { type: "started", statement: 1, of: 1, line: 1 }, 1);
    hear(run, { type: "finished", statement: 1, of: 1, line: 1, failed: false }, 2);
    end(run, outcome([info(1, { name: "a", type: "Int" })]), 3);
    expect(notesOf(run)[0]).toMatchObject({ main: "a", sub: "Int", state: "fresh" });
    expect(notesOf(run, new Map([[1, { mark: "edited" as const }]]))[0]!.tags).toEqual([
      { text: "edited · not run", kind: "state" },
    ]);
    expect(notesOf(run, new Map([[1, { mark: "stale" as const }]]))[0]!.tags).toEqual([
      { text: "stale", kind: "state" },
    ]);
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
        // A statement that gives nothing has no type: the engine names the type of a result.
        info(3, { type: null }),
      ]),
      3,
    );
    const notes = notesOf(run);
    expect(notes.map((note) => [note.main, note.sub])).toEqual([
      ["reg", "RegFit · log(wage) ~ educ"],
      ["2.5", "Float"],
      ["", ""],
    ]);
  });

  it("writes beside a name the type and the dimensions the engine gives for what it binds", () => {
    // Zemp Specification, section 5: `wages Frame · 15,571 × 13`, `m3 RegFit · N 15,366`.
    // The dimensions are the engine's own facts of each result (open decision #175, C5).
    const run = begin("s.zeff", "a\nb\nc\nd\ne\nf\n", 0, "9:42");
    hear(run, { type: "ranges", statements: ranges(1, 2, 3, 4, 5, 6) }, 0);
    for (const line of [1, 2, 3, 4, 5, 6]) {
      hear(run, { type: "started", statement: line, of: 6, line }, 1);
      hear(run, { type: "finished", statement: line, of: 6, line, failed: false }, 2);
    }
    end(
      run,
      outcome([
        info(1, {
          name: "wages",
          type: "Frame",
          frame: { rows: 15571, variables: 13 },
          rows: 15571,
          columns: 13,
        }),
        info(2, { name: "m3", type: "RegFit", n: 15366 }),
        info(3, { name: "roc", type: "TestResult", n: 18390 }),
        info(4, { name: "by_year", type: "Table", rows: 8, columns: 1200 }),
        // A column has a length, which the specification's notes do not write.
        info(5, { name: "ages", type: "Column", length: 15571 }),
        info(6, { name: "share", type: "Float" }),
      ]),
      3,
    );
    expect(notesOf(run).map((note) => `${note.main} ${note.sub}`)).toEqual([
      "wages Frame · 15,571 × 13",
      "m3 RegFit · N 15,366",
      "roc TestResult · N 18,390",
      "by_year Table · 8 × 1,200",
      "ages Column",
      "share Float",
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
    expect(notesOf(run).map((note) => note.line)).toEqual([4]);
  });
});
