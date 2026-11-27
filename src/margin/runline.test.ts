import { describe, expect, it } from "vitest";
import type { Run } from "../output/run";
import { runLine } from "./runline";

const run = (with_: Partial<Run>): Run =>
  ({
    number: 2,
    clock: "15:14",
    checkOnly: false,
    state: "done",
    statements: new Array(9).fill({}),
    of: 9,
    ms: 134,
    ...with_,
  }) as Run;

describe("a run in one line", () => {
  it("is its number, when it began, its statements and its time in the Script place's bar", () => {
    expect(runLine(run({}), true)).toBe("run 2 · 15:14 · 9 statements in 134 ms");
    expect(runLine(run({ statements: [{}] as Run["statements"], ms: 1234 }), true)).toBe(
      "run 2 · 15:14 · 1 statement in 1.23 s",
    );
  });

  it("is the same without the time of day at the foot of the window", () => {
    expect(runLine(run({}), false)).toBe("run 2 · 9 statements in 134 ms");
    expect(runLine(run({ ms: null }), false)).toBe("run 2 · 9 statements");
  });

  it("says how far a run going has come, and how one that did not finish ended", () => {
    const three = new Array(3).fill({}) as Run["statements"];
    expect(runLine(run({ state: "running", statements: three }), false)).toBe(
      "run 2 · statement 3 of 9",
    );
    expect(runLine(run({ state: "running", of: null }), true)).toBe("run 2 · 15:14 · running");
    expect(runLine(run({ state: "failed", statements: three }), false)).toBe(
      "run 2 · ended with an error after 3 statements",
    );
    expect(runLine(run({ state: "cancelled", statements: three }), true)).toBe(
      "run 2 · 15:14 · cancelled after 3 statements",
    );
    expect(runLine(run({ state: "stopped", statements: three }), false)).toBe(
      "run 2 · stopped after 3 statements",
    );
  });

  it("says a check is a check, and a script not run that it is not", () => {
    expect(runLine(run({ checkOnly: true }), true)).toBe("check · 15:14");
    expect(runLine(run({ checkOnly: true }), false)).toBe("check");
    expect(runLine(null, true)).toBe("not run yet");
    expect(runLine(null, false)).toBe("not run yet");
  });
});
