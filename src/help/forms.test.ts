import { describe, expect, it } from "vitest";
import type { HelpIndex, IndexedFunction } from "../engine/messages";
import { aroundOf } from "./around";
import { entryOf, formIn, formed, formsOf, sameForm, severalOf, shownOf, wordsOn } from "./forms";
import { called, same, type Stop } from "./history";
import { chooserPage, packagePage } from "./pages";
import { readPage } from "./read";
import { trailOf } from "./trail";

/** A function of the index, by the value it is called on and how its usage begins. */
const fn = (
  name: string,
  summary: string,
  first: { name: string; type: string } | null,
  method = true,
): IndexedFunction => ({
  name,
  summary,
  usage: method && first !== null ? `${first.name}.${name}(var)` : `${name}(a, b, ...)`,
  method,
  first,
  names: [],
});
const frame = { name: "data", type: "Frame" };
const index: HelpIndex = {
  engine: "0.9.0",
  packages: [
    {
      name: "core",
      tier: 0,
      functions: [
        fn("min", "Smallest of two or more values", { name: "a", type: "Float | Date" }, false),
        fn("abs", "Absolute value", { name: "x", type: "Float" }, false),
      ],
    },
    {
      name: "data",
      tier: 1,
      functions: [fn("min", "Smallest non-missing value", frame), fn("mean", "Mean", frame)],
    },
    {
      name: "plot",
      tier: 1,
      functions: [
        fn("histogram", "A histogram layer", { name: "p", type: "Plot" }),
        fn("point", "A layer of points", { name: "p", type: "Plot" }),
        fn("histogram", "A histogram of a variable of a frame", frame),
      ],
    },
  ],
  datasets: [],
};

/** The engine's print of a name with two functions: one page after the other. */
const PRINT = [
  "histogram — A histogram layer                              plot · tier 1 · since 0.7.0 · 1.0 · closed form",
  "",
  "USAGE",
  "    p.histogram(data: Frame)",
  "",
  "histogram — A histogram of a variable of a frame           plot · tier 1 · since 0.7.0 · 1.0 · exact",
  "",
  "USAGE",
  "    data.histogram(var)",
  "",
  "SEE ALSO",
  "    density, boxplot",
  "",
].join("\n");

describe("the words that tell two functions of a name apart", () => {
  it("are made from the type of the value a function is called on", () => {
    expect(wordsOn("Frame")).toBe("of a frame");
    expect(wordsOn("Plot")).toBe("of a plot");
    expect(wordsOn("Result")).toBe("of a result");
    expect(wordsOn("Distribution")).toBe("of a distribution");
    // What a type holds is not said, and a vowel takes `an`.
    expect(wordsOn("List<Float>")).toBe("of a list");
    expect(wordsOn("Int")).toBe("of an int");
    // Several types, as a function written before its values takes.
    expect(wordsOn("Float | Date | DateTime")).toBe("of values");
    expect(wordsOn("List<Float> | List<Int>")).toBe("of a list");
    expect(wordsOn("")).toBe("of nothing");
  });

  it("are each function's own, in the index's order", () => {
    expect(formsOf(index, "histogram").map((one) => `${one.words} · ${one.form.package}`)).toEqual([
      "of a plot · plot",
      "of a frame · plot",
    ]);
    expect(formsOf(index, "min").map((one) => `${one.words} · ${one.form.package}`)).toEqual([
      "of values · core",
      "of a frame · data",
    ]);
    expect(formsOf(index, "mean")).toHaveLength(1);
    expect(formsOf(index, "nothing")).toEqual([]);
    expect(formsOf(null, "min")).toEqual([]);
    expect([...severalOf(index)]).toEqual(["min", "histogram"]);
    expect(severalOf(null).size).toBe(0);
  });

  it("say the package too where two functions are called on the same type", () => {
    const alike: HelpIndex = {
      engine: "0.9.0",
      packages: [
        { name: "data", tier: 1, functions: [fn("rank", "Ranks", frame)] },
        { name: "stats", tier: 1, functions: [fn("rank", "Ranks, tested", frame)] },
      ],
      datasets: [],
    };
    expect(formsOf(alike, "rank").map((one) => one.words)).toEqual([
      "of a frame, in data",
      "of a frame, in stats",
    ]);
  });

  it("find one function among those of its name", () => {
    const of = formed(index, "histogram", { package: "plot", on: "Frame" });
    expect(of?.function.summary).toBe("A histogram of a variable of a frame");
    expect(formed(index, "histogram", { package: "data", on: "Frame" })).toBeNull();
    expect(sameForm({ package: "plot", on: "Plot" }, { package: "plot", on: "Plot" })).toBe(true);
    expect(sameForm({ package: "plot", on: "Plot" }, { package: "plot", on: "Frame" })).toBe(false);
    expect(sameForm(undefined, undefined)).toBe(true);
    expect(sameForm(undefined, { package: "plot", on: "Plot" })).toBe(false);
  });
});

describe("the engine's print of a name with two functions, cut by function", () => {
  const doc = readPage(PRINT);
  const [layer, whole] = formsOf(index, "histogram");

  it("gives each function its own part, by its package and its one line", () => {
    expect(doc.entries).toHaveLength(2);
    expect(entryOf(doc, layer!)?.does).toBe("A histogram layer");
    expect(entryOf(doc, whole!)?.does).toBe("A histogram of a variable of a frame");
    expect(entryOf(doc, formsOf(index, "min")[0]!)).toBeNull();
  });

  it("is the chooser for the bare name, and one function's page for a form", () => {
    expect(shownOf(doc, index, "histogram", undefined)).toEqual({
      kind: "chooser",
      forms: [layer, whole],
    });
    const one = shownOf(doc, index, "histogram", { package: "plot", on: "Frame" });
    expect(one.kind).toBe("one");
    if (one.kind !== "one") return;
    expect(one.of.words).toBe("of a frame");
    expect(one.doc.entries).toHaveLength(1);
    expect(one.doc.entries[0]?.does).toBe("A histogram of a variable of a frame");
    // Its sections are its own alone.
    expect(one.doc.entries[0]?.sections.map((section) => section.title)).toEqual([
      "Usage",
      "See also",
    ]);
    // A form the name has not: the chooser.
    expect(shownOf(doc, index, "histogram", { package: "plot", on: "Fit" }).kind).toBe("chooser");
  });

  it("is the print as it came for a name of one function, and where the print is of another", () => {
    const mean = readPage("mean — Mean        data · tier 1\n\nUSAGE\n    data.mean(var)\n");
    expect(shownOf(mean, index, "mean", undefined)).toEqual({ kind: "whole", doc: mean });
    // A function of the project's own of that name is printed in the engine's place.
    const own = readPage("histogram — My own        project\n\nUSAGE\n    histogram(x)\n");
    expect(shownOf(own, index, "histogram", undefined).kind).toBe("whole");
    expect(shownOf(own, index, "histogram", { package: "plot", on: "Frame" }).kind).toBe("whole");
    expect(shownOf(doc, null, "histogram", undefined).kind).toBe("whole");
  });
});

describe("the function a hover of the script speaks of", () => {
  // The engine's hover on a function's name is that function's page.
  const [first, second] = PRINT.split("\nhistogram — ");
  const pages = [first!, `histogram — ${second!}`];

  it("is the one whose page the hover is: its package and its one line", () => {
    const forms = formsOf(index, "histogram");
    expect(formIn(pages[1]!, forms)?.words).toBe("of a frame");
    expect(formIn(pages[0]!, forms)?.words).toBe("of a plot");
    // A page that names the other function in its words is still its own.
    expect(formIn(`${pages[0]!}\nDETAILS\n    See data.histogram(var).\n`, forms)?.words).toBe(
      "of a plot",
    );
    const mins = formsOf(index, "min");
    const page = (does: string, home: string) => `min — ${does}        ${home} · tier 1\n`;
    expect(formIn(page("Smallest non-missing value", "data"), mins)?.words).toBe("of a frame");
    expect(formIn(page("Smallest of two or more values", "core"), mins)?.words).toBe("of values");
  });

  it("is none where the hover is not one function's page, or is of none of them", () => {
    const forms = formsOf(index, "histogram");
    expect(formIn("nothing of either", forms)).toBeNull();
    expect(formIn("", forms)).toBeNull();
    // Both pages at once, as `zeff help histogram` prints them.
    expect(formIn(PRINT, forms)).toBeNull();
    // A function of the project's own of that name.
    expect(formIn("histogram — My own        project\n", forms)).toBeNull();
    expect(formIn("mean — Mean        data · tier 1\n", forms)).toBeNull();
  });
});

describe("a name with two functions, in the history, the trail and the lists", () => {
  const bare: Stop = { kind: "name", name: "histogram" };
  const whole: Stop = { kind: "name", name: "histogram", form: { package: "plot", on: "Frame" } };
  const layer: Stop = { kind: "name", name: "histogram", form: { package: "plot", on: "Plot" } };

  it("is three pages: the chooser and each function", () => {
    expect(same(bare, whole)).toBe(false);
    expect(same(whole, layer)).toBe(false);
    expect(same(whole, { ...whole, form: { package: "plot", on: "Frame" } })).toBe(true);
    expect(called(bare)).toBe("histogram");
    expect(called(whole)).toBe("histogram · of a frame");
    expect(called(layer)).toBe("histogram · of a plot");
  });

  it("has the chooser as a step of each function's trail", () => {
    const trail = trailOf(whole, index, null);
    expect(trail.map((step) => step.label)).toEqual([
      "Packages",
      "plot",
      "histogram",
      "of a frame",
    ]);
    expect(trail.map((step) => step.to)).toEqual([
      { kind: "packages" },
      { kind: "package", name: "plot" },
      bare,
      null,
    ]);
    expect(trail.map((step) => step.name)).toEqual([false, true, true, false]);
    // The chooser's own trail is the name's, under every package that has it.
    expect(trailOf(bare, index, null).map((step) => step.label)).toEqual([
      "Packages",
      "plot",
      "histogram",
    ]);
    expect(trailOf({ kind: "name", name: "min" }, index, null).map((step) => step.label)).toEqual([
      "Packages",
      "core",
      "data",
      "min",
    ]);
    // One function of `min` stands under its own package alone.
    expect(
      trailOf(
        { kind: "name", name: "min", form: { package: "data", on: "Frame" } },
        index,
        null,
      ).map((step) => step.label),
    ).toEqual(["Packages", "data", "min", "of a frame"]);
  });

  it("is a chooser of each function, with its usage and its one line", () => {
    const page = chooserPage(index, "histogram")!;
    expect(page.title).toBe("histogram");
    expect(page.named).toBe(true);
    expect(page.lead).toBe("histogram is two functions. Choose one by what it is called on.");
    expect(page.groups[0]?.rows).toEqual([
      {
        name: "histogram",
        of: "of a plot",
        words: "A histogram layer",
        usage: "p.histogram(var)",
        to: layer,
      },
      {
        name: "histogram",
        of: "of a frame",
        words: "A histogram of a variable of a frame",
        usage: "data.histogram(var)",
        to: whole,
      },
    ]);
    expect(chooserPage(index, "mean")).toBeNull();
    expect(chooserPage(null, "histogram")).toBeNull();
  });

  it("is listed twice on its package's page, each row saying which and opening its own page", () => {
    const page = packagePage(index, "plot")!;
    expect(page.facts[1]).toBe("3 functions in Zeff 0.9.0");
    expect(page.groups[0]?.rows.map((row) => `${row.name} ${row.of ?? ""}`.trim())).toEqual([
      "histogram of a plot",
      "point",
      "histogram of a frame",
    ]);
    expect(page.groups[0]?.rows[0]?.to).toEqual(layer);
    expect(page.groups[0]?.rows[1]?.to).toEqual({ kind: "name", name: "point" });
    // A name two packages have: each package lists its own, which opens its own page.
    expect(packagePage(index, "data")!.groups[0]?.rows[0]).toEqual({
      name: "min",
      words: "Smallest non-missing value",
      of: "of a frame",
      to: { kind: "name", name: "min", form: { package: "data", on: "Frame" } },
    });
  });

  it("stands in Topics in its own package, the function open marked, both beside the chooser", () => {
    const marks = (stop: Stop) =>
      aroundOf(stop, index, null).map((group) => [
        group.name,
        ...group.rows.map(
          (row) => `${row.here ? "*" : ""}${row.name}${row.of ? ` ${row.of}` : ""}`,
        ),
      ]);
    expect(marks(whole)).toEqual([
      ["plot", "histogram of a plot", "point", "*histogram of a frame"],
    ]);
    expect(marks(bare)).toEqual([
      ["plot", "*histogram of a plot", "point", "*histogram of a frame"],
    ]);
    expect(marks({ kind: "name", name: "min", form: { package: "data", on: "Frame" } })).toEqual([
      ["data", "*min of a frame", "mean"],
    ]);
    expect(marks({ kind: "name", name: "min" })).toEqual([
      ["core", "*min of values", "abs"],
      ["data", "*min of a frame", "mean"],
    ]);
    expect(aroundOf(whole, index, null)[0]?.rows[2]?.to).toEqual(whole);
  });
});
