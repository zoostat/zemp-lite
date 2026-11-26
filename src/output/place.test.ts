import { describe, expect, it } from "vitest";
import example from "../../tests/scripts/example/scripts/main.zeff?raw";
import type { Ranged, RunEvent } from "../engine/messages";
import { endOf, placed } from "./place";
import { begin, end, hear } from "./run";

const outcome = {
  exitCode: 0,
  stdout: "",
  stderr: "",
  statements: [],
  frames: [],
  written: [],
  stopped: false,
};

/** Statements from their first and last lines, as the engine's outline gives them. */
const ranges = (...spans: [number, number][]): Ranged[] =>
  spans.map(([line, last]) => ({ line, end: last, kind: "statement" }));

/** A run of `text` whose statements the engine reads as `told`, each printing its line. */
function ran(text: string, told: Ranged[]) {
  const run = begin("scripts/main.zeff", text, 0, "15:42");
  hear(run, { type: "ranges", statements: told }, 0);
  told.forEach(({ line }, at) => {
    const events: RunEvent[] = [
      { type: "started", statement: at + 1, of: told.length, line },
      { type: "output", stdout: `${line}\n`, stderr: "" },
      { type: "finished", statement: at + 1, of: told.length, line, failed: false },
    ];
    for (const event of events) hear(run, event, 1);
  });
  end(run, outcome, 2);
  return run;
}

describe("where a block stands", () => {
  it("is under the last line the engine gives its statement", () => {
    const text = "let a = 1\n\n// about b\nlet b = frame(\n    x = [1, 2],\n)\n\n// then\nb\n";
    const run = ran(text, ranges([1, 1], [4, 6], [9, 9]));
    expect(placed(run).map((one) => [one.block.line, one.after])).toEqual([
      [1, 1],
      [4, 6],
      [9, 9],
    ]);
  });

  it("puts each result of the example under the statement that made it", () => {
    const lines = [4, 5, 8, 12, 13, 16, 17, 20, 21];
    const run = ran(example, ranges(...lines.map((line): [number, number] => [line, line])));
    expect(placed(run).map((one) => [one.block.line, one.after])).toEqual(
      lines.map((line) => [line, line]),
    );
  });

  it("puts what the check found under the statement that holds the line it names, and what belongs to no line at the end", () => {
    const text = "print(1)\nlet z = nosuch(\n    3)\n";
    const run = begin("scripts/main.zeff", text, 0, "15:42");
    hear(run, { type: "ranges", statements: ranges([1, 1], [2, 3]) }, 0);
    hear(
      run,
      {
        type: "output",
        stdout: "",
        stderr: "error[Z0103]: no function is called `nosuch`\n --> scripts/main.zeff:2:9\n",
      },
      1,
    );
    end(run, { ...outcome, exitCode: 1 }, 2);
    expect(placed(run).map((one) => one.after)).toEqual([3]);
  });

  it("puts a statement that is running under its own last line, from the moment it starts", () => {
    const text = 'for i in 1..9 {\n    print(i)\n}\nprint("after")\n';
    const run = begin("scripts/main.zeff", text, 0, "15:42");
    hear(run, { type: "ranges", statements: ranges([1, 3], [4, 4]) }, 0);
    hear(run, { type: "started", statement: 1, of: 2, line: 1 }, 1);
    expect(placed(run).map((one) => one.after)).toEqual([3]);
  });

  it("takes the ranges from the outcome where they were not told before the run", () => {
    const run = begin("scripts/main.zeff", "let d = frame(\n  x = [1])\nd\n", 0, "15:42");
    hear(run, { type: "started", statement: 1, of: 2, line: 1 }, 1);
    hear(run, { type: "finished", statement: 1, of: 2, line: 1, failed: false }, 1);
    hear(run, { type: "started", statement: 2, of: 2, line: 3 }, 1);
    hear(run, { type: "output", stdout: "d\n", stderr: "" }, 1);
    hear(run, { type: "finished", statement: 2, of: 2, line: 3, failed: false }, 1);
    const info = {
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
    };
    end(
      run,
      {
        ...outcome,
        statements: [
          { line: 1, end: 2, kind: "statement", ...info },
          { line: 3, end: 3, kind: "statement", ...info },
        ],
      },
      2,
    );
    expect(run.ranges).toEqual(ranges([1, 2], [3, 3]));
    expect(placed(run).map((one) => one.after)).toEqual([3]);
  });

  it("stands on the line itself where no statement holds it, or the engine has not said", () => {
    expect(endOf(ranges([1, 3]), 5)).toBe(5);
    expect(endOf(null, 2)).toBe(2);
    expect(endOf(ranges([1, 3]), 2)).toBe(3);
  });

  it("never names a line past the end of the script", () => {
    expect(placed(ran("a\n", ranges([1, 1], [9, 9]))).map((one) => one.after)).toEqual([1, 1]);
    expect(placed(ran("", ranges([1, 1]))).map((one) => one.after)).toEqual([1]);
  });
});
