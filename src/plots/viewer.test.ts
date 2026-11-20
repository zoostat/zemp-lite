import { describe, expect, it } from "vitest";
import {
  exportStatement,
  keyOf,
  nameOf,
  sizeArgument,
  withExport,
  withExports,
  type PlotStatement,
} from "./figures";
import { compared, moved, ordered, toggled } from "./viewer";

const plot = (line: number, source: string): PlotStatement => ({
  line,
  last: line,
  kind: "",
  source,
  title: source,
});
const a = plot(3, "schooling");
const b = plot(7, "shape");
const c = plot(9, "w.plot(x: a)\n    .points()");
const sources = (plots: PlotStatement[]) => plots.map((one) => one.source);

describe("the gallery strip", () => {
  it("keeps its order from run to run, and puts a new plot at the end", () => {
    expect(sources(ordered([a, b, c], []))).toEqual([a.source, b.source, c.source]);
    expect(sources(ordered([a, b, c], [b.source, a.source]))).toEqual([
      b.source,
      a.source,
      c.source,
    ]);
    // A plot the order names that the run no longer has is simply not there.
    expect(sources(ordered([a], ["gone", a.source]))).toEqual([a.source]);
  });

  it("moves a plot to another place", () => {
    expect(moved(["x", "y", "z"], 0, 2)).toEqual(["y", "z", "x"]);
    expect(moved(["x", "y", "z"], 2, 0)).toEqual(["z", "x", "y"]);
    expect(moved(["x", "y", "z"], 1, 1)).toEqual(["x", "y", "z"]);
    expect(moved(["x", "y"], 0, 5)).toEqual(["x", "y"]);
  });
});

describe("the plots compared", () => {
  it("are pinned and unpinned, four at most", () => {
    expect(toggled([], "x")).toEqual(["x"]);
    expect(toggled(["x", "y"], "x")).toEqual(["y"]);
    expect(toggled(["1", "2", "3", "4"], "5")).toEqual(["1", "2", "3", "4"]);
    expect(toggled(["1", "2", "3", "4"], "2")).toEqual(["1", "3", "4"]);
  });

  it("are shown side by side from two of them on, in the strip's order", () => {
    expect(compared([a, b, c], [])).toEqual([]);
    expect(compared([a, b, c], [b.source])).toEqual([]);
    expect(sources(compared([b, a, c], [a.source, b.source]))).toEqual([b.source, a.source]);
    expect(compared([a, b], ["gone", a.source])).toEqual([]);
  });
});

describe("a figure at a named page", () => {
  it("is asked of the engine by the page's own word", () => {
    expect(keyOf({ line: 3, page: "one_column" })).toBe("3@one_column");
    expect(sizeArgument({ line: 3, page: "slide" })).toBe("slide");
    expect(sizeArgument({ line: 3, width: 96, height: 192 })).toBe("[25.4, 50.8]");
    expect(
      withExports("schooling\n", [plot(1, "schooling")], [{ line: 1, page: "two_column" }]).text,
    ).toBe('schooling\n(schooling\n).export("zemp-figure-1.svg", size: two_column)\n');
  });
});

describe("saving a figure", () => {
  it("runs the script with one export of the format and size chosen", () => {
    expect(withExport("let p = 1\np\n", plot(2, "p"), "pdf", "one_column")).toEqual({
      text: 'let p = 1\np\n(p\n).export("zemp-export.pdf", size: one_column)\n',
      file: "output/zemp-export.pdf",
    });
  });

  it("offers the statement that does the same, named after the plot where it has a name", () => {
    expect(nameOf(a)).toBe("schooling");
    expect(nameOf(c)).toBe("figure-line-9");
    expect(exportStatement(a, "svg", "one_column")).toBe(
      'schooling.export("output/schooling.svg", size: one_column)',
    );
    expect(exportStatement(c, "png", "[120, 80]")).toBe(
      '(w.plot(x: a)\n    .points()\n).export("output/figure-line-9.png", size: [120, 80])',
    );
  });
});
