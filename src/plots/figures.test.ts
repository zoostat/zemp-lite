import { describe, expect, it } from "vitest";
import example from "../../tests/scripts/example/scripts/main.zeff?raw";
import composedExample from "../../tests/scripts/figures/example-with-exports.zeff?raw";
import type { RunEvent } from "../engine/messages";
import { begin, end, hear } from "../output/run";
import {
  kindOf,
  fileOf,
  imageOf,
  keyOf,
  millimetres,
  pixels,
  plotsOf,
  sizeOf,
  withExports,
} from "./figures";

/**
 * A run of `text`: each statement given by the line it begins on, what it printed, and the
 * line it ends on where that is another, as the engine's ranges tell it.
 */
function ran(text: string, statements: [number, string, number?][]) {
  const run = begin("scripts/main.zeff", text, 0, "15:42");
  const ranges = statements.map(([line, , last]) => ({
    line,
    end: last ?? line,
    kind: "statement" as const,
  }));
  hear(run, { type: "ranges", statements: ranges }, 0);
  statements.forEach(([line, printed], at) => {
    const events: RunEvent[] = [
      { type: "started", statement: at + 1, of: statements.length, line },
      { type: "output", stdout: printed, stderr: "" },
      { type: "finished", statement: at + 1, of: statements.length, line, failed: false },
    ];
    for (const event of events) hear(run, event, 1);
  });
  end(
    run,
    {
      exitCode: 0,
      stdout: "",
      stderr: "",
      statements: [],
      frames: [],
      written: [],
      stopped: false,
    },
    2,
  );
  return run;
}

/** The example as the engine runs it: two of its statements end in a plot. */
const exampleRun = () =>
  ran(example, [
    [4, ""],
    [5, ""],
    [8, "summary · by female\n"],
    [12, ""],
    [13, "reg · log(wage) ~ educ + exper + female + union\n"],
    [16, ""],
    [17, "plot · w2010 · log(wage) against educ\n\n  axis   title\n"],
    [20, ""],
    [21, "plot · w2010 · log(wage)\n\n  axis   title\n"],
  ]);

describe("the plots of a run", () => {
  it("are the statements for which the engine printed a plot's summary", () => {
    expect(plotsOf(exampleRun())).toEqual([
      {
        id: "schooling",
        line: 17,
        last: 17,
        source: "schooling",
        title: "w2010 · log(wage) against educ",
        kind: "",
      },
      { id: "shape", line: 21, last: 21, source: "shape", title: "w2010 · log(wage)", kind: "" },
    ]);
  });

  it("are also the plots bound to a name, each its own statement's, a name bound again among them", () => {
    // Release 0.3, step 7b: the engine keeps the plots of a run by their statements, so the
    // plot of a name bound again further down is drawn, where until then it was left out.
    const text = [
      "let p = d.plot(x: a).points()", // 1
      "let p = d.plot(x: a).histogram()", // 2
      "let q = d.scatter(a, b)", // 3
      "q", // 4
      "let r = d.scatter(b, a)", // 5
      "",
    ].join("\n");
    const bound = (line: number, name: string) => ({
      line,
      end: line,
      kind: "statement" as const,
      name,
      type: "Plot",
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
    });
    const made = () => {
      const run = ran(text, [
        [1, ""],
        [2, ""],
        [3, ""],
        [4, "plot · d · b against a\n"],
        [5, ""],
      ]);
      run.info = [bound(1, "p"), bound(2, "p"), bound(3, "q"), bound(5, "r")];
      return run;
    };
    // One run of the engine's: both plots called `p`, each on its own line; `q` where it is
    // printed, by the statement that is its name alone, and not twice; and `r`.
    expect(plotsOf(made()).map((plot) => [plot.line, plot.source])).toEqual([
      [1, "p"],
      [2, "p"],
      [4, "q"],
      [5, "r"],
    ]);
    // The viewer tells the two called `p` apart: each has an identity of its own.
    expect(plotsOf(made()).map((plot) => plot.id)).toEqual(["p", "p · 2", "q", "r"]);
    // A page that holds results of more than one run of the engine's (a statement run alone):
    // a plot is then drawn by its name after the script, where the first `p` is the second.
    const merged = made();
    merged.partial = [5];
    expect(plotsOf(merged).map((plot) => [plot.line, plot.source])).toEqual([
      [2, "p"],
      [4, "q"],
      [5, "r"],
    ]);
  });

  it("take a statement written over several lines whole, with its comment", () => {
    const text =
      'let w = dataset(wages)\nw.plot(x: log(wage))\n    .histogram(bins: 30) // the shape\n\n// after\nprint("x")\n';
    const run = ran(text, [
      [1, ""],
      [2, "plot · w · log(wage)\n", 3],
      [6, "x\n"],
    ]);
    expect(plotsOf(run)).toEqual([
      {
        id: "w.plot(x: log(wage))\n    .histogram(bins: 30) // the shape",
        line: 2,
        last: 3,
        source: "w.plot(x: log(wage))\n    .histogram(bins: 30) // the shape",
        title: "w · log(wage)",
        kind: "",
      },
    ]);
  });

  it("are none where no statement ended in a plot, or the one that would have failed", () => {
    expect(plotsOf(ran("print(1)\n", [[1, "1\n"]]))).toEqual([]);
    const run = begin("scripts/main.zeff", "p\n", 0, "15:42");
    hear(run, { type: "started", statement: 1, of: 1, line: 1 }, 1);
    hear(run, { type: "output", stdout: "plot · half\n", stderr: "" }, 1);
    hear(run, { type: "finished", statement: 1, of: 1, line: 1, failed: true }, 1);
    expect(plotsOf(run)).toEqual([]);
  });
});

describe("the size of a figure", () => {
  it("is the size of its place on the screen, in millimetres to a hundredth", () => {
    expect(millimetres(96)).toBe(25.4);
    expect(millimetres(567)).toBe(150.02);
    expect(millimetres(352)).toBe(93.13);
    expect(pixels(25.4)).toBeCloseTo(96, 10);
    expect(Math.round(pixels(millimetres(567)))).toBe(567);
  });

  it("is read back from the figure the engine wrote, which gives it in points", () => {
    const svg =
      '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="340.157pt" height="226.772pt" viewBox="0 0 340.157 226.772">';
    const size = sizeOf(svg)!;
    // 120 mm by 80 mm.
    expect(size.width).toBeCloseTo(pixels(120), 2);
    expect(size.height).toBeCloseTo(pixels(80), 2);
    expect(sizeOf("<svg>")).toBeNull();
  });
});

describe("the text sent for the figures of a run", () => {
  const plots = plotsOf(exampleRun());

  it("is the script, unchanged, and after it one export for each figure asked for", () => {
    const sent = withExports(example, plots, [
      { line: 17, width: 567, height: 352 },
      { line: 21, width: 567, height: 352 },
    ]);
    expect(sent.text.startsWith(example)).toBe(true);
    expect(sent.text.slice(example.length)).toBe(
      '(schooling\n).export("zemp-figure-1.svg", size: [150.02, 93.13])\n' +
        '(shape\n).export("zemp-figure-2.svg", size: [150.02, 93.13])\n',
    );
    // The script has 21 lines: what is added begins on line 22.
    expect(sent.from).toBe(22);
    expect(sent.figures).toEqual([
      { key: "17@567x352", file: "output/zemp-figure-1.svg", line: 22 },
      { key: "21@567x352", file: "output/zemp-figure-2.svg", line: 24 },
    ]);
    // This is the text kept beside the figures the released `zeff run` 0.9.0 wrote for it.
    expect(sent.text).toBe(composedExample);
  });

  it("asks for one plot at two sizes with two exports, and passes over a plot that is not there", () => {
    const sent = withExports(
      "p\n",
      [{ id: "p", line: 1, last: 1, source: "p", title: "t", kind: "" }],
      [
        { line: 1, width: 400, height: 300 },
        { line: 9, width: 400, height: 300 },
        { line: 1, width: 800, height: 600 },
      ],
    );
    expect(sent.figures.map((figure) => [figure.key, figure.file, figure.line])).toEqual([
      ["1@400x300", "output/zemp-figure-1.svg", 2],
      ["1@800x600", "output/zemp-figure-3.svg", 4],
    ]);
  });

  it("keeps a comment at the end of the statement from swallowing what is added", () => {
    const plot = {
      id: "w.plot(x: a)\n    .points() // the cloud",
      line: 1,
      last: 2,
      source: "w.plot(x: a)\n    .points() // the cloud",
      title: "t",
      kind: "",
    };
    expect(
      withExports(
        "w.plot(x: a)\n    .points() // the cloud\n",
        [plot],
        [{ line: 1, width: 96, height: 96 }],
      ).text,
    ).toBe(
      "w.plot(x: a)\n    .points() // the cloud\n" +
        '(w.plot(x: a)\n    .points() // the cloud\n).export("zemp-figure-1.svg", size: [25.4, 25.4])\n',
    );
  });

  it("names its files and its figures", () => {
    expect(fileOf(0)).toBe("zemp-figure-1.svg");
    expect(keyOf({ line: 17, width: 567, height: 352 })).toBe("17@567x352");
    expect(imageOf('<svg width="1pt"/>')).toBe(
      "data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D%221pt%22%2F%3E",
    );
  });
});

describe("a plot's kind", () => {
  it("is the marks of its layers, as the engine's table of what it drew names them", () => {
    const printed = [
      "plot · w2010 · log(wage) against educ",
      "",
      "  axis   title                scale    limits               breaks",
      "  x      Years of schooling   linear   7.4 to 20.6          8, 10, 12",
      "",
      "  layer   mark       data    marks   settings",
      "      1   fit band   w2010      80   95% confidence band, alpha 0.2, 1 band",
      "      2   points     w2010     531   size 4.5, alpha 1",
      "      3   fit line   w2010      80   least squares of log(wage) on educ, width 1, 1 line",
      "",
    ].join("\n");
    expect(kindOf(printed)).toBe("fit band, points, fit line");
    expect(kindOf("plot · x\n")).toBe("");
  });
});
