import { describe, expect, it } from "vitest";
import type { Outcome, RunEvent } from "../engine/messages";
import { begin, blocks, clockOf, end, hear, said, took, type Run } from "./run";

const done = (exitCode: number, stderr = ""): Outcome => ({
  exitCode,
  stdout: "",
  stderr,
  frames: [],
  stopped: false,
});

/** A run told by its events, each 10 ms after the one before. */
function told(events: RunEvent[], outcome: Outcome): Run {
  const run = begin("scripts/main.zeff", "the text\n", 0, "15:42");
  let now = 0;
  for (const event of events) hear(run, event, (now += 10));
  end(run, outcome, now + 10);
  return run;
}

describe("what a run said", () => {
  it("is read into warnings and notes, each with its code, sentence and line", () => {
    const text =
      "warning[W0201]: 6 rows with NA in wage, 1 with NA in exper and 1 with NA in hours were skipped (line 8)\n" +
      "note: 33 of the 3,911 clusters hold one observation (line 12)\n";
    const read = said(text);
    expect(read).toEqual([
      {
        kind: "warning",
        code: "W0201",
        sentence: "6 rows with NA in wage, 1 with NA in exper and 1 with NA in hours were skipped",
        line: 8,
        help: [],
        detail: "",
        raw: "warning[W0201]: 6 rows with NA in wage, 1 with NA in exper and 1 with NA in hours were skipped (line 8)\n",
      },
      {
        kind: "note",
        code: null,
        sentence: "33 of the 3,911 clusters hold one observation",
        line: 12,
        help: [],
        detail: "",
        raw: "note: 33 of the 3,911 clusters hold one observation (line 12)\n",
      },
    ]);
    // Put back together, the messages are what the engine wrote, to the byte.
    expect(read.map((one) => one.raw).join("")).toBe(text);
  });

  it("reads an error with its place, its excerpt and its advice", () => {
    const text =
      "warning[W0204]: division by zero gave Inf (line 2)\n" +
      "  = help: test the divisor first, as in `b != 0 && a / b > 1`; on a frame, `where(b != 0)`\n" +
      "error[Z0715]: no file `data/none.csv` in the project\n" +
      " --> scripts/main.zeff:3:16\n" +
      "  |\n" +
      '3 | let w = import("data/none.csv")\n' +
      "  |                ^^^^^^^^^^^^^^^ the file is not there\n" +
      "  |\n" +
      "  = help: put the file in the project and write its path from the project folder, as in `data/none.csv`\n";
    const [warning, error] = said(text);
    expect(warning).toMatchObject({
      kind: "warning",
      code: "W0204",
      line: 2,
      help: ["test the divisor first, as in `b != 0 && a / b > 1`; on a frame, `where(b != 0)`"],
      detail: "",
    });
    expect(error).toMatchObject({
      kind: "error",
      code: "Z0715",
      sentence: "no file `data/none.csv` in the project",
      line: 3,
      help: [
        "put the file in the project and write its path from the project folder, as in `data/none.csv`",
      ],
    });
    expect(error!.detail).toBe(
      ' --> scripts/main.zeff:3:16\n  |\n3 | let w = import("data/none.csv")\n  |                ^^^^^^^^^^^^^^^ the file is not there\n  |',
    );
    expect(
      said(text)
        .map((one) => one.raw)
        .join(""),
    ).toBe(text);
  });

  it("is nothing where nothing was said", () => {
    expect(said("")).toEqual([]);
  });
});

describe("a run, as the Output panel shows it", () => {
  it("puts what each statement printed and said under the line that made it", () => {
    const run = told(
      [
        { type: "started", statement: 1, of: 3, line: 1 },
        { type: "finished", statement: 1, of: 3, line: 1, failed: false },
        { type: "started", statement: 2, of: 3, line: 2 },
        { type: "output", stdout: "2\n", stderr: "" },
        {
          type: "output",
          stdout: "",
          stderr: "warning[W0201]: 1 row with NA in x was skipped (line 2)\n",
        },
        { type: "finished", statement: 2, of: 3, line: 2, failed: false },
        { type: "started", statement: 3, of: 3, line: 5 },
        { type: "output", stdout: "summary\n", stderr: "" },
        { type: "finished", statement: 3, of: 3, line: 5, failed: false },
      ],
      done(0),
    );
    expect(run.state).toBe("done");
    expect(run.of).toBe(3);
    expect(run.ms).toBe(100);
    const shown = blocks(run);
    // A statement that printed nothing and said nothing has no block.
    expect(shown.map((block) => block.line)).toEqual([2, 5]);
    expect(shown[0]).toMatchObject({ state: "done", printed: "2\n", ms: 30 });
    expect(shown[0]!.said.map((one) => one.code)).toEqual(["W0201"]);
    expect(shown[1]).toMatchObject({ printed: "summary\n", said: [], ms: 20 });
  });

  it("keeps what was printed whole: the blocks' text is the run's text", () => {
    const events: RunEvent[] = [
      { type: "started", statement: 1, of: 2, line: 1 },
      { type: "output", stdout: "a\n", stderr: "" },
      { type: "finished", statement: 1, of: 2, line: 1, failed: false },
      { type: "started", statement: 2, of: 2, line: 2 },
      {
        type: "output",
        stdout: "Inf\n",
        stderr: "warning[W0204]: division by zero gave Inf (line 2)\n  = help: test the divisor\n",
      },
      { type: "finished", statement: 2, of: 2, line: 2, failed: false },
    ];
    const shown = blocks(told(events, done(0)));
    expect(shown.map((block) => block.printed).join("")).toBe("a\nInf\n");
    expect(shown.flatMap((block) => block.said.map((one) => one.raw)).join("")).toBe(
      "warning[W0204]: division by zero gave Inf (line 2)\n  = help: test the divisor\n",
    );
  });

  it("shows a statement that failed, with its error, and the run as failed", () => {
    const error =
      'error[Z0715]: no file `data/none.csv` in the project\n --> scripts/main.zeff:2:16\n  |\n2 | let w = import("data/none.csv")\n  |                ^ the file is not there\n  |\n';
    const run = told(
      [
        { type: "started", statement: 1, of: 3, line: 1 },
        { type: "output", stdout: "a\n", stderr: "" },
        { type: "finished", statement: 1, of: 3, line: 1, failed: false },
        { type: "started", statement: 2, of: 3, line: 2 },
        { type: "output", stdout: "", stderr: error },
        { type: "finished", statement: 2, of: 3, line: 2, failed: true },
      ],
      done(1, error),
    );
    expect(run.state).toBe("failed");
    const shown = blocks(run);
    expect(shown.map((block) => [block.line, block.state])).toEqual([
      [1, "done"],
      [2, "failed"],
    ]);
    expect(shown[1]!.said[0]).toMatchObject({ kind: "error", code: "Z0715", line: 2 });
  });

  it("puts what the engine's check found, before any statement ran, under the lines it names", () => {
    const found =
      "error[Z0103]: no function is called `nosuch`\n --> scripts/main.zeff:2:9\n  |\n2 | let z = nosuch(3)\n  |         ^^^^^^ not a function of Zeff\n  |\n  = help: `zeff help` lists the functions of this release\n" +
      "error[Z0101]: no variable `y` in `d`\n --> scripts/main.zeff:7:14\n  |\n7 | print(d.mean(y))\n  |              ^ not a variable of d\n  |\n";
    const run = told([{ type: "output", stdout: "", stderr: found }], done(1, found));
    expect(run.state).toBe("failed");
    expect(run.statements).toEqual([]);
    const shown = blocks(run);
    expect(shown.map((block) => [block.line, block.state, block.said[0]!.code])).toEqual([
      [2, "failed", "Z0103"],
      [7, "failed", "Z0101"],
    ]);
  });

  it("shows the statement that is running, and the pass of a loop it is at", () => {
    const run = begin("scripts/main.zeff", "x\n", 0, "15:42");
    hear(run, { type: "started", statement: 1, of: 2, line: 1 }, 5);
    hear(run, { type: "output", stdout: "started\n", stderr: "" }, 6);
    hear(run, { type: "finished", statement: 1, of: 2, line: 1, failed: false }, 7);
    hear(run, { type: "started", statement: 2, of: 2, line: 2 }, 8);
    hear(run, { type: "pass", pass: 40, of: 200000, line: 2 }, 30);
    expect(run.state).toBe("running");
    expect(blocks(run)).toMatchObject([
      { line: 1, state: "done", printed: "started\n", ms: 2 },
      { line: 2, state: "running", ms: null, pass: { pass: 40, of: 200000 } },
    ]);
    // Cancelled between two passes: the engine says so in its own words.
    const cancelled = "error[Z0705]: the run was cancelled before pass 41 of this loop\n";
    hear(run, { type: "output", stdout: "", stderr: cancelled }, 40);
    hear(run, { type: "finished", statement: 2, of: 2, line: 2, failed: true }, 41);
    end(run, done(1, cancelled), 42);
    expect(run.state).toBe("cancelled");
    expect(blocks(run)[1]).toMatchObject({ state: "failed", ms: 33 });
  });

  it("ends a run whose worker was ended under it as stopped, its statement not left running", () => {
    const run = begin("scripts/main.zeff", "x\n", 0, "15:42");
    hear(run, { type: "started", statement: 1, of: 1, line: 1 }, 5);
    end(run, { exitCode: null, stdout: "", stderr: "", frames: [], stopped: true }, 905);
    expect(run.state).toBe("stopped");
    expect(blocks(run)).toMatchObject([{ line: 1, state: "failed", ms: 900 }]);
  });
});

describe("a time", () => {
  it("of day is written as hours and minutes", () => {
    expect(clockOf(new Date(2026, 10, 15, 9, 5).getTime())).toBe("9:05");
    expect(clockOf(new Date(2026, 10, 15, 15, 42).getTime())).toBe("15:42");
  });

  it("is written in the unit it is read in", () => {
    expect(took(0.4)).toBe("0 ms");
    expect(took(42.4)).toBe("42 ms");
    expect(took(999.4)).toBe("999 ms");
    expect(took(999.6)).toBe("1.00 s");
    expect(took(1234)).toBe("1.23 s");
    expect(took(59_990)).toBe("59.99 s");
    expect(took(125_400)).toBe("2 min 05 s");
  });
});
