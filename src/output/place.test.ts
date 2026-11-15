import { describe, expect, it } from "vitest";
import example from "../../examples/scratch/scripts/main.zeff?raw";
import type { RunEvent } from "../engine/messages";
import { lastLine, lastLineByShape, placed } from "./place";
import { begin, end, hear } from "./run";

/** A run of `text` whose statements begin on `starts`, each printing its line. */
function ran(text: string, starts: number[]) {
  const run = begin("scripts/main.zeff", text, 0, "15:42");
  starts.forEach((line, at) => {
    const events: RunEvent[] = [
      { type: "started", statement: at + 1, of: starts.length, line },
      { type: "output", stdout: `${line}\n`, stderr: "" },
      { type: "finished", statement: at + 1, of: starts.length, line, failed: false },
    ];
    for (const event of events) hear(run, event, 1);
  });
  end(run, { exitCode: 0, stdout: "", stderr: "", frames: [], stopped: false }, 2);
  return run;
}

describe("where a block stands in the Inline layout", () => {
  it("is under the last line of its statement, before the blank lines and comments that follow", () => {
    const lines = [
      "let a = 1",
      "",
      "// about b",
      "let b = frame(",
      "    x = [1, 2],",
      ")",
      "",
      "// the end",
    ];
    expect(lastLine(lines, 1, 4)).toBe(1);
    expect(lastLine(lines, 4, null)).toBe(6);
    // A statement of one line that is the script's last.
    expect(lastLine(["print(1)"], 1, null)).toBe(1);
    // Two statements on neighbouring lines.
    expect(lastLine(["a", "b"], 1, 2)).toBe(1);
  });

  it("puts each result of the example under the statement that made it", () => {
    const run = ran(example, [4, 5, 8, 12, 13, 16, 17, 20, 21]);
    expect(placed(run).map((one) => [one.block.line, one.after])).toEqual([
      [4, 4],
      [5, 5],
      [8, 8],
      [12, 12],
      [13, 13],
      [16, 16],
      [17, 17],
      [20, 20],
      [21, 21],
    ]);
  });

  it("puts the result of a statement written over several lines under its last line", () => {
    const text =
      "let d = frame(\n    x = [1, 2],\n    y = [3, 4],\n)\n\n// then\nd\n    .summary([x])\n";
    expect(placed(ran(text, [1, 7])).map((one) => one.after)).toEqual([4, 8]);
  });

  it("puts what the check found under the line it names, and what belongs to no line at the end", () => {
    const run = begin("scripts/main.zeff", "print(1)\nlet z = nosuch(3)\n", 0, "15:42");
    hear(
      run,
      {
        type: "output",
        stdout: "",
        stderr: "error[Z0103]: no function is called `nosuch`\n --> scripts/main.zeff:2:9\n",
      },
      1,
    );
    end(run, { exitCode: 1, stdout: "", stderr: "", frames: [], stopped: false }, 2);
    expect(placed(run).map((one) => one.after)).toEqual([2]);
  });

  it("finds the end of a statement from its shape, where no later statement tells it", () => {
    const lines = [
      'print("a")',
      "for i in 1..9 {",
      "    let rows = d.where(year == 2015) // a } in a comment",
      "}",
      'print("b")',
      "let m = wages",
      '    .where(industry != "{")',
      "    .reg(y ~ x +",
      "         z)",
      'print("c")',
    ];
    expect(lastLineByShape(lines, 1)).toBe(1);
    expect(lastLineByShape(lines, 2)).toBe(4);
    expect(lastLineByShape(lines, 5)).toBe(5);
    expect(lastLineByShape(lines, 6)).toBe(9);
    expect(lastLineByShape(lines, 10)).toBe(10);
    // A statement that is never closed runs to the end of the script.
    expect(lastLineByShape(["f(", "1,"], 1)).toBe(2);
  });

  it("puts a statement that failed, after which nothing ran, under its own last line", () => {
    const text = 'print("a")\nlet w = import("data/none.csv")\nprint("b")\n';
    const run = begin("scripts/main.zeff", text, 0, "15:42");
    hear(run, { type: "started", statement: 1, of: 3, line: 1 }, 1);
    hear(run, { type: "output", stdout: "a\n", stderr: "" }, 1);
    hear(run, { type: "finished", statement: 1, of: 3, line: 1, failed: false }, 1);
    hear(run, { type: "started", statement: 2, of: 3, line: 2 }, 1);
    hear(run, { type: "output", stdout: "", stderr: "error[Z0715]: no file\n" }, 1);
    hear(run, { type: "finished", statement: 2, of: 3, line: 2, failed: true }, 1);
    end(run, { exitCode: 1, stdout: "", stderr: "", frames: [], stopped: false }, 2);
    expect(placed(run).map((one) => one.after)).toEqual([1, 2]);
  });

  it("puts a statement that is running under its own last line, not at the end of the script", () => {
    const text = 'for i in 1..9 {\n    print(i)\n}\nprint("after")\n';
    const run = begin("scripts/main.zeff", text, 0, "15:42");
    hear(run, { type: "started", statement: 1, of: 2, line: 1 }, 1);
    expect(placed(run).map((one) => one.after)).toEqual([3]);
  });

  it("never names a line past the end of the script", () => {
    expect(placed(ran("a\n", [1, 9])).map((one) => one.after)).toEqual([1, 1]);
    expect(placed(ran("", [1])).map((one) => one.after)).toEqual([1]);
  });
});
