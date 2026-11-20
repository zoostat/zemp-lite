import { describe, expect, it } from "vitest";
import example from "../../examples/scratch/scripts/main.zeff?raw";
import composedExample from "../../tests/scripts/figures/example-with-exports.zeff?raw";
import type { RunEvent } from "../engine/messages";
import { begin, end, hear } from "../output/run";
import {
  fileOf,
  imageOf,
  keyOf,
  millimetres,
  pixels,
  plotsOf,
  sizeOf,
  withExports,
} from "./figures";

/** A run of `text`: each statement given by the line it begins on and what it printed. */
function ran(text: string, statements: [number, string][]) {
  const run = begin("scripts/main.zeff", text, 0, "15:42");
  statements.forEach(([line, printed], at) => {
    const events: RunEvent[] = [
      { type: "started", statement: at + 1, of: statements.length, line },
      { type: "output", stdout: printed, stderr: "" },
      { type: "finished", statement: at + 1, of: statements.length, line, failed: false },
    ];
    for (const event of events) hear(run, event, 1);
  });
  end(run, { exitCode: 0, stdout: "", stderr: "", frames: [], stopped: false }, 2);
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
      { line: 17, last: 17, source: "schooling", title: "w2010 · log(wage) against educ" },
      { line: 21, last: 21, source: "shape", title: "w2010 · log(wage)" },
    ]);
  });

  it("take a statement written over several lines whole, with its comment", () => {
    const text =
      'let w = dataset(wages)\nw.plot(x: log(wage))\n    .histogram(bins: 30) // the shape\n\n// after\nprint("x")\n';
    const run = ran(text, [
      [1, ""],
      [2, "plot · w · log(wage)\n"],
      [6, "x\n"],
    ]);
    expect(plotsOf(run)).toEqual([
      {
        line: 2,
        last: 3,
        source: "w.plot(x: log(wage))\n    .histogram(bins: 30) // the shape",
        title: "w · log(wage)",
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
    // This is the text kept beside the figures the released `zeff run` 0.8.0 wrote for it.
    expect(sent.text).toBe(composedExample);
  });

  it("asks for one plot at two sizes with two exports, and passes over a plot that is not there", () => {
    const sent = withExports(
      "p\n",
      [{ line: 1, last: 1, source: "p", title: "t" }],
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
      line: 1,
      last: 2,
      source: "w.plot(x: a)\n    .points() // the cloud",
      title: "t",
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
