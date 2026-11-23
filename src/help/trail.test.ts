import { describe, expect, it } from "vitest";
import type { CodeFamily, HelpIndex } from "../engine/messages";
import { HOME, type Stop } from "./history";
import { codesPage, countsOf, packagePage } from "./pages";
import { familyOf, homesOf, trailOf } from "./trail";

const fn = (name: string, summary = `what ${name} does`) => ({ name, summary, names: [] });
const index: HelpIndex = {
  engine: "0.8.0",
  packages: [
    { name: "data", tier: 1, functions: [fn("summary"), fn("mean")] },
    { name: "results", tier: 1, functions: [fn("summary"), fn("coef")] },
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
    expect(trail.map((step) => step.to)).toEqual([HOME, { kind: "package", name: "stats" }, null]);
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
    expect(page.facts).toEqual(["package · tier 1", "1 function in Zeff 0.8.0"]);
    expect(page.groups).toEqual([
      {
        key: "functions",
        heading: null,
        rows: [
          { name: "t_test", words: "t-tests for one mean", to: { kind: "name", name: "t_test" } },
        ],
      },
    ]);
    expect(packagePage(index, "data")!.facts[1]).toBe("2 functions in Zeff 0.8.0");
  });

  it("lists the shipped datasets under `datasets`, after its functions", () => {
    const page = packagePage(index, "datasets")!;
    expect(page.facts).toEqual(["package · tier 1", "2 functions in Zeff 0.8.0", "2 datasets"]);
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

describe("the line under Home's title", () => {
  it("names the engine and counts the functions and the packages of the index", () => {
    // `summary` is of two packages and is counted in each, as each package counts its own.
    expect(countsOf(index)).toBe("Zeff 0.8.0 · 9 functions in 5 packages");
    expect(countsOf({ engine: "0.8.0", packages: [index.packages[2]!], datasets: [] })).toBe(
      "Zeff 0.8.0 · 1 function in 1 package",
    );
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
