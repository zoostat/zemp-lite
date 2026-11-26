import { describe, expect, it } from "vitest";
import type { ExampleOutcome, StatementInfo } from "../engine/messages";
import {
  answered,
  asPages,
  busy,
  changed,
  composed,
  examplesOf,
  fresh,
  givenBy,
  isExcerpt,
  saidOf,
  stale,
  statusOf,
  type Held,
} from "./examples";
import { readPage } from "./read";

/** The lines of an example's block, as `read.ts` gives them from a print. */
const lines = (print: string) =>
  print
    .split("\n")
    .map((line) =>
      line.startsWith("> ") ? { typed: true, text: line.slice(2) } : { typed: false, text: line },
    );

const statement = (line: number, stdout: string, stderr = "", more: Partial<StatementInfo> = {}) =>
  ({
    line,
    end: line,
    kind: "statement",
    name: null,
    type: null,
    ran: true,
    stdout,
    stderr,
    frame: null,
    memory: null,
    rows: null,
    columns: null,
    length: null,
    n: null,
    error: null,
    ...more,
  }) as StatementInfo;

const outcome = (
  statements: StatementInfo[],
  more: Partial<ExampleOutcome> = {},
): ExampleOutcome => ({
  exitCode: 0,
  stdout: statements.map((one) => one.stdout).join(""),
  stderr: statements.map((one) => one.stderr).join(""),
  statements,
  plots: [],
  stopped: null,
  ...more,
});

describe("the examples of a page", () => {
  it("are read apart: each with its comment, its statements and what the page says they print", () => {
    const found = examplesOf(
      lines(
        [
          "// The mean of the wages.",
          "> let wages = dataset(wages)",
          "> wages.mean(wage)",
          "27.3695",
          "warning[W0201]: 211 rows with NA in wage were skipped (line 2)",
          "",
          "// One row for each group,",
          "// with `by:`.",
          "> wages.mean(wage, by: female)",
          "mean · wage by female",
          "",
          "  female     mean",
          "  male     29.189",
        ].join("\n"),
      ),
    );
    expect(found).toEqual([
      {
        lead: ["// The mean of the wages."],
        code: ["let wages = dataset(wages)", "wages.mean(wage)"],
        kept: ["27.3695", "warning[W0201]: 211 rows with NA in wage were skipped (line 2)"],
      },
      {
        lead: ["// One row for each group,", "// with `by:`."],
        code: ["wages.mean(wage, by: female)"],
        kept: ["mean · wage by female", "", "  female     mean", "  male     29.189"],
      },
    ]);
  });

  it("begin at a statement typed after something printed, with no comment and no empty line between", () => {
    const found = examplesOf(
      lines(
        "> let d = 1\n> d.scatter(a, b)\nplot · d\n> d.scatter(a, b, fit: linear)\nplot · d\n\ncaption: Band",
      ),
    );
    expect(found.map((one) => one.code)).toEqual([
      ["let d = 1", "d.scatter(a, b)"],
      ["d.scatter(a, b, fit: linear)"],
    ]);
    expect(found[1]?.kept).toEqual(["plot · d", "", "caption: Band"]);
  });

  it("are those of a page as the engine prints it, the wrong call of a common mistake among them", () => {
    const page = [
      "mean — The mean of a variable                                  stats · tier 1",
      "",
      "A COMMON MISTAKE",
      "    Giving an expression where the variable goes.",
      "",
      "    > dataset(wages).mean(log(wage))",
      "    error[Z0401]: `var` of `mean` takes a variable of the frame, not an expression",
      "      = help: compute it first",
      "",
      "    Make the variable, then name it.",
      "",
      "EXAMPLES",
      "    > dataset(wages).mean(union)",
      "    0.318053",
      "",
    ].join("\n");
    const blocks = readPage(page).entries[0]!.sections.flatMap((section) =>
      section.blocks.flatMap((block) =>
        block.kind === "example" ? [examplesOf(block.lines)] : [],
      ),
    );
    expect(blocks).toEqual([
      [
        {
          lead: [],
          code: ["dataset(wages).mean(log(wage))"],
          kept: [
            "error[Z0401]: `var` of `mean` takes a variable of the frame, not an expression",
            "  = help: compute it first",
          ],
        },
      ],
      [{ lead: [], code: ["dataset(wages).mean(union)"], kept: ["0.318053"] }],
    ]);
  });
});

describe("the script that runs examples", () => {
  it("is their statements in order, as they stand, each on the lines the engine's pages count", () => {
    expect(
      composed(["let wages = dataset(wages)\nwages.mean(wage)", "wages.mean(union)\n\n"]),
    ).toEqual({
      text: "let wages = dataset(wages)\nwages.mean(wage)\nwages.mean(union)\n",
      ranges: [
        { first: 1, last: 2 },
        { first: 3, last: 3 },
      ],
    });
  });
});

describe("what the engine gave for an example", () => {
  it("is what its own statements printed and said, in order, with a plot after its statement", () => {
    const ran = outcome(
      [
        statement(1, ""),
        statement(2, "27.3695\n", "warning[W0201]: 211 rows skipped (line 2)\n"),
        statement(3, "plot · d\n\n  axis   title\n"),
        statement(4, "0.318053\n"),
      ],
      { plots: [{ line: 3, name: null, kind: "points", theme: "light" }] },
    );
    const { ranges } = composed(["a\nb", "c\nd"]);
    expect(givenBy(ran, ranges)).toEqual([
      {
        parts: [{ kind: "text", lines: ["27.3695", "warning[W0201]: 211 rows skipped (line 2)"] }],
        ran: true,
        failed: false,
      },
      {
        parts: [
          { kind: "text", lines: ["plot · d", "", "  axis   title"] },
          { kind: "plot", line: 3 },
          { kind: "text", lines: ["0.318053"] },
        ],
        ran: true,
        failed: false,
      },
    ]);
  });

  it("shows a diagnostic as the engine's pages do: without its source excerpt, its help two spaces in", () => {
    const said =
      "error[Z0401]: `var` of `mean` takes a variable of the frame, not an expression\n" +
      " --> examples.zeff:12:22\n" +
      "   |\n" +
      "12 | dataset(wages).mean(log(wage))\n" +
      "   |                     ^^^^^^^^^ this is an expression\n" +
      "   |\n" +
      "   = help: compute it first";
    expect(asPages(said)).toEqual([
      "error[Z0401]: `var` of `mean` takes a variable of the frame, not an expression",
      "  = help: compute it first",
    ]);
    expect(isExcerpt("12 | dataset(wages)")).toBe(true);
    expect(isExcerpt("12 rows")).toBe(false);
    expect(isExcerpt("  variable | N")).toBe(false);
  });

  it("gives an error found before anything ran to the example asked for, and marks the one that failed", () => {
    const refused = outcome(
      [statement(1, "", "", { ran: false }), statement(2, "", "", { ran: false })],
      {
        exitCode: 2,
        stderr: "error[Z0103]: no function is called `nosuch`\n --> examples.zeff:2:1\n",
      },
    );
    const { ranges } = composed(["a", "b"]);
    // The engine points at line 2, which is the second example's.
    const given = givenBy(refused, ranges, 0);
    expect(given[0]).toEqual({ parts: [], ran: false, failed: false });
    expect(given[1]).toEqual({
      parts: [{ kind: "text", lines: ["error[Z0103]: no function is called `nosuch`"] }],
      ran: false,
      failed: true,
    });
    // Where it points at no line of the script, the example asked for has it.
    const nowhere = givenBy(
      { ...refused, stderr: "error[Z0709]: the project could not be read\n" },
      ranges,
      0,
    );
    expect(nowhere.map((one) => one.failed)).toEqual([true, false]);
    // An error of a statement is that statement's example's.
    const failed = outcome(
      [
        statement(1, "one\n"),
        statement(2, "", "error[Z0601]: the fit did not converge\n", { error: { code: "Z0601" } }),
        statement(3, "", "", { ran: false }),
      ],
      { exitCode: 1 },
    );
    const three = givenBy(failed, composed(["a", "b", "c"]).ranges);
    expect(three.map((one) => [one.ran, one.failed])).toEqual([
      [true, false],
      [true, true],
      [false, false],
    ]);
  });
});

describe("an example's states", () => {
  const example = { lead: [], code: ["let a = 1", "a + 1"], kept: ["2"] };
  const { ranges } = composed([example.code.join("\n")]);

  it("opens with the page's statements and the page's kept output, and says nothing", () => {
    const held = fresh(example);
    expect(held).toEqual({
      own: "let a = 1\na + 1",
      text: "let a = 1\na + 1",
      ranText: null,
      phase: "kept",
      parts: [{ kind: "text", lines: ["2"] }],
      ms: null,
      problem: "",
    });
    expect([changed(held), stale(held), busy(held), statusOf(held, 10)]).toEqual([
      false,
      false,
      false,
      "",
    ]);
  });

  it("keeps the kept output while it waits and runs, and shows the engine's own once it has run", () => {
    let held: Held = { ...fresh(example), phase: "waiting" };
    expect(statusOf(held, 10)).toBe("waiting to run");
    expect(held.parts).toEqual([{ kind: "text", lines: ["2"] }]);
    held = { ...held, phase: "running" };
    expect([busy(held), statusOf(held, 10)]).toEqual([true, "running…"]);
    const ran = outcome([statement(1, ""), statement(2, "2\n")]);
    held = answered(held, held.text, givenBy(ran, ranges)[0]!, ran, 12.4);
    expect(held.phase).toBe("ran");
    expect(held.parts).toEqual([{ kind: "text", lines: ["2"] }]);
    expect(statusOf(held, 10)).toBe("run by the engine in 12 ms");
    expect(statusOf({ ...held, ms: 1430 }, 10)).toBe("run by the engine in 1.4 s");
  });

  it("is edited until it is run again, and is the page's own again when reset", () => {
    const ran = outcome([statement(1, ""), statement(2, "2\n")]);
    let held = answered(fresh(example), fresh(example).text, givenBy(ran, ranges)[0]!, ran, 5);
    held = { ...held, text: "let a = 1\na + 2\n" };
    expect([changed(held), stale(held), statusOf(held, 10)]).toEqual([
      true,
      true,
      "edited · not run",
    ]);
    const again = outcome([statement(1, ""), statement(2, "3\n")]);
    held = answered(held, held.text, givenBy(again, ranges)[0]!, again, 5);
    expect([changed(held), stale(held)]).toEqual([true, false]);
    expect(held.parts).toEqual([{ kind: "text", lines: ["3"] }]);
    // Reset: the page's statements stand again, and what is under them is of the edited ones.
    held = { ...held, text: held.own };
    expect([changed(held), stale(held)]).toEqual([false, true]);
  });

  it("says so where it was stopped as too slow, where it was not reached, and where the engine could not be asked", () => {
    const slow = outcome(
      [
        statement(1, ""),
        statement(2, "started\n", "error[Z0705]: the run was cancelled\n", { error: {} }),
      ],
      { exitCode: 1, stopped: "slow" },
    );
    let held = answered(fresh(example), "x", givenBy(slow, ranges)[0]!, slow, 10_000);
    expect(held.phase).toBe("slow");
    expect(held.parts).toEqual([
      { kind: "text", lines: ["started", "error[Z0705]: the run was cancelled"] },
    ]);
    expect(statusOf({ ...held, text: "x" }, 10)).toBe(
      "stopped: the examples ran for more than 10 seconds",
    );
    // An example the run never reached keeps what it showed.
    const failed = outcome(
      [statement(1, "", "error[Z0601]: no\n", { error: {} }), statement(2, "", "", { ran: false })],
      { exitCode: 1 },
    );
    const two = composed(["a", "b"]).ranges;
    held = answered(fresh(example), "b", givenBy(failed, two)[1]!, failed, 3);
    expect(held.phase).toBe("unreached");
    expect(held.parts).toEqual([{ kind: "text", lines: ["2"] }]);
    expect(statusOf(held, 10)).toBe("not run: the engine stopped at an error in another example");
    expect(
      statusOf(
        { ...fresh(example), phase: "refused", problem: "the engine's worker was ended" },
        10,
      ),
    ).toBe("not run: the engine's worker was ended");
  });
});

describe("a line of an example's output", () => {
  it("has the code of a warning or an error apart, to open its page, and is text otherwise", () => {
    expect(saidOf("warning[W0201]: 211 rows with NA in wage were skipped (line 2)")).toEqual([
      { kind: "text", text: "warning[" },
      { kind: "code", code: "W0201" },
      { kind: "text", text: "]: 211 rows with NA in wage were skipped (line 2)" },
    ]);
    expect(saidOf("  wage       18,201       211")).toEqual([
      { kind: "text", text: "  wage       18,201       211" },
    ]);
  });
});
