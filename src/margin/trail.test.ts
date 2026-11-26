import { describe, expect, it } from "vitest";
import { trailOf } from "./trail";

// The trail is read from the engine's own record of an error (release 0.3, step 6d; open
// decision #175, C22). The records here are written as the engine writes them; that the
// engine does write them so, for the kept script of the trail and for a loop, is held on the
// engine itself in `trail.node.test.ts`.

const place = { file: "scripts/main.zeff" };

describe("the error's trail", () => {
  it("is the chain the engine names, from the script's line to the line that raised it", () => {
    expect(
      trailOf({
        code: "Z0801",
        message: "no row remains to fit the model: the frame has no rows",
        ...place,
        span: { line: 3, column: 20, end_line: 3, end_column: 23 },
        chain: [
          {
            kind: "call",
            function: "returns",
            given: [{ name: "data", value: "a frame of 0 rows × 11 variables" }],
            ...place,
            line: 9,
            column: 5,
          },
          {
            kind: "call",
            function: "in_year",
            given: [
              { name: "data", value: "a frame of 18,412 rows × 11 variables" },
              { name: "y", value: "1900" },
            ],
            ...place,
            line: 14,
            column: 7,
          },
        ],
      }),
    ).toEqual([
      {
        ...place,
        line: 14,
        column: 7,
        text: "in_year(data: a frame of 18,412 rows × 11 variables, y: 1900)",
        raised: false,
        pass: false,
      },
      {
        ...place,
        line: 9,
        column: 5,
        text: "returns(data: a frame of 0 rows × 11 variables)",
        raised: false,
        pass: false,
      },
      {
        ...place,
        line: 3,
        column: 20,
        text: "no row remains to fit the model: the frame has no rows",
        raised: true,
        pass: false,
      },
    ]);
  });

  it("names the pass of a loop the error was raised in, which a printed message does not", () => {
    const trail = trailOf({
      code: "Z0001",
      message: "zero",
      ...place,
      span: { line: 2, column: 17 },
      chain: [
        {
          kind: "call",
          function: "inv",
          given: [{ name: "x", value: "0" }],
          ...place,
          line: 6,
          column: 11,
        },
        { kind: "pass", pass: 3, of: 3, variable: "k", value: "0", ...place, line: 5, column: 5 },
      ],
    });
    expect(trail.map((link) => [link.line, link.text, link.pass, link.raised])).toEqual([
      [5, "pass 3 of 3: k = 0", true, false],
      [6, "inv(x: 0)", false, false],
      [2, "zero", false, true],
    ]);
    // A loop that does not know how many passes it has, and one with no variable.
    const pass = (more: Record<string, unknown>) =>
      trailOf({
        message: "stop",
        ...place,
        span: { line: 2, column: 1 },
        chain: [{ kind: "pass", pass: 7, ...place, line: 1, column: 1, ...more }],
      })[0]?.text;
    expect(pass({ of: null, variable: "k", value: "0.5" })).toBe("pass 7: k = 0.5");
    expect(pass({ of: 10 })).toBe("pass 7 of 10");
    expect(pass({})).toBe("pass 7");
  });

  it("is empty for an error not raised inside a function or a loop, and where there is no record", () => {
    expect(
      trailOf({
        code: "Z0103",
        message: "no function is called `nosuch`",
        ...place,
        span: { line: 2, column: 9 },
        chain: [],
      }),
    ).toEqual([]);
    expect(
      trailOf({ code: "Z0103", message: "x", ...place, span: { line: 2, column: 9 } }),
    ).toEqual([]);
    expect(trailOf(null)).toEqual([]);
    expect(trailOf(undefined)).toEqual([]);
    // A record that is not one is read as none.
    expect(trailOf({ chain: "not a chain", span: 3 })).toEqual([]);
  });
});
