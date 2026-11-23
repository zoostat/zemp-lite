import { describe, expect, it } from "vitest";
import type { CodeFamily, HelpIndex } from "../engine/messages";
import { HOME, type Stop } from "./history";
import { codesPage, packagePage, partsOf } from "./pages";
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
  it("is Help alone on Home, and no link", () => {
    expect(trailOf(HOME, index, families)).toEqual([
      { label: "Help", to: null, name: false, beside: false },
    ]);
  });

  it("puts a function under its package, each step before it a link to its page", () => {
    const trail = trailOf({ kind: "name", name: "t_test" }, index, families);
    expect(trail.map((step) => step.label)).toEqual(["Help", "Packages", "stats", "t_test"]);
    expect(trail.map((step) => step.to)).toEqual([
      HOME,
      HOME,
      { kind: "package", name: "stats" },
      null,
    ]);
    // The package and the function are names of the engine's; the two words are not.
    expect(trail.map((step) => step.name)).toEqual([false, false, true, true]);
  });

  it("names both packages of a name two packages have, side by side", () => {
    expect(read({ kind: "name", name: "summary" })).toBe(
      "Help › Packages › data · results › summary.",
    );
    const trail = trailOf({ kind: "name", name: "summary" }, index, families);
    expect(trail[2]).toMatchObject({ to: { kind: "package", name: "data" }, beside: false });
    expect(trail[3]).toMatchObject({ to: { kind: "package", name: "results" }, beside: true });
    expect(homesOf(index, "summary")).toEqual(["data", "results"]);
  });

  it("tells a package from the function of its name", () => {
    // The function `plot` of the package `plot`, and the package itself.
    expect(read({ kind: "name", name: "plot" })).toBe("Help › Packages › plot › plot.");
    const trail = trailOf({ kind: "name", name: "plot" }, index, families);
    expect(trail[2]?.to).toEqual({ kind: "package", name: "plot" });
    expect(read({ kind: "package", name: "plot" })).toBe("Help › Packages › plot.");
    expect(read({ kind: "name", name: "datasets" })).toBe("Help › Packages › datasets › datasets.");
  });

  it("puts a shipped dataset under the package of datasets", () => {
    expect(read({ kind: "name", name: "wages" })).toBe("Help › Packages › datasets › wages.");
    expect(homesOf(index, "wages")).toEqual(["datasets"]);
  });

  it("puts a name the index does not know under Help alone", () => {
    expect(read({ kind: "name", name: "a_learning" })).toBe("Help › a_learning.");
    expect(read({ kind: "name", name: "t_test" }, null)).toBe("Help › t_test.");
    expect(homesOf(null, "t_test")).toEqual([]);
  });

  it("puts a code under its family, and a family under the codes", () => {
    const trail = trailOf({ kind: "code", code: "W0201" }, index, families);
    expect(trail.map((step) => step.label)).toEqual([
      "Help",
      "Errors and warnings",
      "W0xxx",
      "W0201",
    ]);
    expect(trail.map((step) => step.to)).toEqual([
      HOME,
      { kind: "codes", family: null },
      { kind: "codes", family: "W0xxx" },
      null,
    ]);
    expect(read({ kind: "codes", family: null })).toBe("Help › Errors and warnings.");
    expect(read({ kind: "codes", family: "Z01xx" })).toBe("Help › Errors and warnings › Z01xx.");
    // A code no family lists, or the families not yet given: under the codes alone.
    expect(read({ kind: "code", code: "Q9999" })).toBe("Help › Errors and warnings › Q9999.");
    expect(read({ kind: "code", code: "W0201" }, index, null)).toBe(
      "Help › Errors and warnings › W0201.",
    );
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
    expect(partsOf(page)).toEqual([]);
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
    expect(partsOf(page)).toEqual([{ line: 1, title: "Datasets" }]);
  });

  it("is none for a name that is no package, and before the index is given", () => {
    expect(packagePage(index, "t_test")).toBeNull();
    expect(packagePage(null, "stats")).toBeNull();
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
    expect(partsOf(page)).toEqual([
      { line: 0, title: "Z01xx · Names: variables, bindings, functions, packages" },
      { line: 1, title: "W0xxx · Warnings, numbered by the same areas" },
    ]);
    expect(codesPage(null)).toBeNull();
  });
});
