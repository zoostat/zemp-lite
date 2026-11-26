import { describe, expect, it } from "vitest";
import type { CodeFamily, HelpIndex } from "../engine/messages";
import { HOME, type Stop } from "./history";
import { HOME_WORDS, codesIn, countsOf, functionsIn, homeParts, topicPanels } from "./home";
import { codesPage, packagePage, packagesPage } from "./pages";
import { familyOf, homesOf, trailOf } from "./trail";

/** A function of the index: called on a value of the type `on`, as `data.name()` is. */
const fn = (name: string, summary = `what ${name} does`, on = "Frame") => ({
  name,
  summary,
  usage: `${on === "Frame" ? "data" : on.toLowerCase()}.${name}()`,
  method: true,
  first: { name: on === "Frame" ? "data" : on.toLowerCase(), type: on },
  names: [],
});
const index: HelpIndex = {
  engine: "0.9.0",
  packages: [
    { name: "data", tier: 1, functions: [fn("summary"), fn("mean")] },
    {
      name: "results",
      tier: 1,
      functions: [fn("summary", "what summary does of a result", "Result"), fn("coef")],
    },
    { name: "stats", tier: 1, functions: [fn("t_test", "t-tests for one mean")] },
    { name: "plot", tier: 1, functions: [fn("plot"), fn("text")] },
    { name: "datasets", tier: 1, functions: [fn("dataset"), fn("datasets")] },
  ],
  datasets: [
    { name: "sleep", title: "sleep", summary: "Student's 1908 data" },
    { name: "wages", title: "wages", summary: "Synthetic hourly wages" },
  ],
};
const families: CodeFamily[] = [
  {
    name: "Z01xx",
    area: "Names: variables, bindings, functions, packages",
    codes: [
      { code: "Z0101", kind: "error", title: "no such name" },
      { code: "Z0103", kind: "error", title: "no such function" },
    ],
  },
  {
    name: "W0xxx",
    area: "Warnings, numbered by the same areas",
    codes: [{ code: "W0201", kind: "warning", title: "missing values skipped by a statistic" }],
  },
];

/** A trail as it reads, with the page each step opens: `label>kind` or `label.` for the last. */
const read = (stop: Stop, i: HelpIndex | null = index, f: CodeFamily[] | null = families) =>
  trailOf(stop, i, f)
    .map((step) => `${step.beside ? "· " : ""}${step.label}${step.to === null ? "." : ""}`)
    .join(" › ")
    .replaceAll(" › · ", " · ");

describe("the trail of a page of Help", () => {
  it("is nothing on Home, whose own button is marked as the page open", () => {
    expect(trailOf(HOME, index, families)).toEqual([]);
  });

  it("puts a function under its package, each step before it a link to its page", () => {
    const trail = trailOf({ kind: "name", name: "t_test" }, index, families);
    // It begins under Home: the word Help is not among its steps.
    expect(trail.map((step) => step.label)).toEqual(["Packages", "stats", "t_test"]);
    expect(trail.map((step) => step.to)).toEqual([
      { kind: "packages" },
      { kind: "package", name: "stats" },
      null,
    ]);
    // The package and the function are names of the engine's; the word is not.
    expect(trail.map((step) => step.name)).toEqual([false, true, true]);
  });

  it("names both packages of a name two packages have, side by side", () => {
    expect(read({ kind: "name", name: "summary" })).toBe("Packages › data · results › summary.");
    const trail = trailOf({ kind: "name", name: "summary" }, index, families);
    expect(trail[1]).toMatchObject({ to: { kind: "package", name: "data" }, beside: false });
    expect(trail[2]).toMatchObject({ to: { kind: "package", name: "results" }, beside: true });
    expect(homesOf(index, "summary")).toEqual(["data", "results"]);
  });

  it("tells a package from the function of its name", () => {
    // The function `plot` of the package `plot`, and the package itself.
    expect(read({ kind: "name", name: "plot" })).toBe("Packages › plot › plot.");
    const trail = trailOf({ kind: "name", name: "plot" }, index, families);
    expect(trail[1]?.to).toEqual({ kind: "package", name: "plot" });
    expect(read({ kind: "package", name: "plot" })).toBe("Packages › plot.");
    expect(read({ kind: "name", name: "datasets" })).toBe("Packages › datasets › datasets.");
  });

  it("puts a shipped dataset under the package of datasets", () => {
    expect(read({ kind: "name", name: "wages" })).toBe("Packages › datasets › wages.");
    expect(homesOf(index, "wages")).toEqual(["datasets"]);
  });

  it("gives a name the index does not know alone", () => {
    expect(read({ kind: "name", name: "a_learning" })).toBe("a_learning.");
    expect(read({ kind: "name", name: "t_test" }, null)).toBe("t_test.");
    expect(homesOf(null, "t_test")).toEqual([]);
  });

  it("puts a code under its family, and a family under the codes", () => {
    const trail = trailOf({ kind: "code", code: "W0201" }, index, families);
    expect(trail.map((step) => step.label)).toEqual(["Errors and warnings", "W0xxx", "W0201"]);
    expect(trail.map((step) => step.to)).toEqual([
      { kind: "codes", family: null },
      { kind: "codes", family: "W0xxx" },
      null,
    ]);
    expect(read({ kind: "codes", family: null })).toBe("Errors and warnings.");
    expect(read({ kind: "codes", family: "Z01xx" })).toBe("Errors and warnings › Z01xx.");
    // A code no family lists, or the families not yet given: under the codes alone.
    expect(read({ kind: "code", code: "Q9999" })).toBe("Errors and warnings › Q9999.");
    expect(read({ kind: "code", code: "W0201" }, index, null)).toBe("Errors and warnings › W0201.");
    expect(familyOf(families, "Z0103")).toBe("Z01xx");
    expect(familyOf(families, "Q9999")).toBeNull();
  });
});

describe("a package's page", () => {
  it("lists the functions the index has, in its order, each opening its page", () => {
    const page = packagePage(index, "stats")!;
    expect(page.title).toBe("stats");
    expect(page.named).toBe(true);
    expect(page.facts).toEqual(["package · tier 1", "1 function in Zeff 0.9.0"]);
    expect(page.groups).toEqual([
      {
        key: "functions",
        heading: null,
        rows: [
          { name: "t_test", words: "t-tests for one mean", to: { kind: "name", name: "t_test" } },
        ],
      },
    ]);
    expect(packagePage(index, "data")!.facts[1]).toBe("2 functions in Zeff 0.9.0");
  });

  it("lists the shipped datasets under `datasets`, after its functions", () => {
    const page = packagePage(index, "datasets")!;
    expect(page.facts).toEqual(["package · tier 1", "2 functions in Zeff 0.9.0", "2 datasets"]);
    expect(page.groups.map((group) => group.rows.map((row) => row.name))).toEqual([
      ["dataset", "datasets"],
      ["sleep", "wages"],
    ]);
    expect(page.groups[1]?.heading).toEqual({ name: null, words: "Datasets" });
    expect(page.groups[1]?.rows[1]).toEqual({
      name: "wages",
      words: "Synthetic hourly wages",
      to: { kind: "name", name: "wages" },
    });
  });

  it("is none for a name that is no package, and before the index is given", () => {
    expect(packagePage(index, "t_test")).toBeNull();
    expect(packagePage(null, "stats")).toBeNull();
  });
});

describe("Home, the landing page", () => {
  it("counts the functions, the packages and the codes of the engine", () => {
    // `summary` is of two packages and is counted in each, as each package counts its own.
    expect(functionsIn(index)).toBe(9);
    expect(codesIn(families)).toBe(3);
    expect(codesIn(null)).toBe(0);
    expect(countsOf(index, families)).toBe("9 functions · 5 packages · 3 codes");
    expect(countsOf({ engine: "0.9.0", packages: [index.packages[2]!], datasets: [] }, null)).toBe(
      "1 function · 1 package · 0 codes",
    );
  });

  it("has a panel for each section of Topics, with its count and the page it opens", () => {
    const panels = topicPanels(index, families);
    expect(panels.map((panel) => `${panel.name} ${panel.count}`)).toEqual([
      "Packages 5",
      "Errors and warnings 3",
      `Using Zemp Lite ${panels[2]?.count}`,
    ]);
    expect(panels.map((panel) => panel.to)).toEqual([
      { kind: "packages" },
      { kind: "codes", family: null },
      { kind: "using", page: null },
    ]);
    // The pages of the app there are, counted.
    expect(panels[2]?.count).toBe(13);
  });

  it("lists its panels for the pane at the right, and gives a code as its example", () => {
    expect(homeParts(index, families)).toEqual([
      "Zeff",
      "Zemp Lite",
      "Packages",
      "Errors and warnings",
      "Using Zemp Lite",
    ]);
    expect(HOME_WORDS.title).toBe("Help");
    expect(HOME_WORDS.codes.code).toMatch(/^[WZ]\d{4}$/);
  });
});

describe("the page of the packages", () => {
  it("lists every package of the index, in its order, with its count, each opening its page", () => {
    const page = packagesPage(index)!;
    expect(page.title).toBe("Packages");
    expect(page.named).toBe(false);
    expect(page.facts).toEqual(["5 packages", "9 functions in Zeff 0.9.0"]);
    expect(page.groups[0]?.rows.map((row) => `${row.name}: ${row.words}`)).toEqual([
      "data: 2 functions · tier 1",
      "results: 2 functions · tier 1",
      "stats: 1 function · tier 1",
      "plot: 2 functions · tier 1",
      "datasets: 2 functions · tier 1",
    ]);
    expect(page.groups[0]?.rows[2]?.to).toEqual({ kind: "package", name: "stats" });
    expect(packagesPage(null)).toBeNull();
  });

  it("is a step of every trail under it, and a page of the history apart from Home", () => {
    expect(read({ kind: "packages" })).toBe("Packages.");
    expect(trailOf({ kind: "package", name: "stats" }, index, families)[0]?.to).toEqual({
      kind: "packages",
    });
  });
});

describe("the page of the codes by family", () => {
  it("lists every family with its codes, as the engine gives them", () => {
    const page = codesPage(families)!;
    expect(page.title).toBe("Errors and warnings");
    expect(page.named).toBe(false);
    expect(page.facts).toEqual(["3 codes", "2 families"]);
    expect(page.groups.map((group) => group.key)).toEqual(["Z01xx", "W0xxx"]);
    expect(page.groups[0]?.heading).toEqual({
      name: "Z01xx",
      words: "Names: variables, bindings, functions, packages",
    });
    expect(page.groups[0]?.rows[1]).toEqual({
      name: "Z0103",
      words: "no such function",
      to: { kind: "code", code: "Z0103" },
    });
    expect(codesPage(null)).toBeNull();
  });
});
