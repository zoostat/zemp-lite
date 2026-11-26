import { describe, expect, it } from "vitest";
import type { CodeFamily, HelpIndex } from "../engine/messages";
import { aroundOf } from "./around";
import { HOME } from "./history";

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
    { name: "stats", tier: 1, functions: [fn("t_test", "t-tests for one mean"), fn("anova")] },
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

/** The names of a group's rows, the one open between stars. */
const names = (rows: { name: string; here: boolean }[]) =>
  rows.map((row) => (row.here ? `*${row.name}*` : row.name));

describe("what stands around a page of Help", () => {
  it("is a function's package with its functions, the open one marked", () => {
    const around = aroundOf({ kind: "name", name: "anova" }, index, families);
    expect(around).toHaveLength(1);
    expect(around[0]).toMatchObject({
      name: "stats",
      to: { kind: "package", name: "stats" },
      kind: "functions",
      datasets: [],
    });
    expect(names(around[0]!.rows)).toEqual(["t_test", "*anova*"]);
    expect(around[0]!.rows[0]).toEqual({
      name: "t_test",
      words: "t-tests for one mean",
      to: { kind: "name", name: "t_test" },
      here: false,
    });
  });

  it("is both packages of a name two packages have, the name marked in each", () => {
    const around = aroundOf({ kind: "name", name: "summary" }, index, families);
    expect(around.map((group) => group.name)).toEqual(["data", "results"]);
    expect(names(around[0]!.rows)).toEqual(["*summary*", "mean"]);
    expect(names(around[1]!.rows)).toEqual(["*summary*", "coef"]);
  });

  it("is a package's own functions beside its page, none marked and no page to go to", () => {
    const around = aroundOf({ kind: "package", name: "plot" }, index, families);
    expect(around).toHaveLength(1);
    expect(around[0]!.to).toBeNull();
    expect(names(around[0]!.rows)).toEqual(["plot", "text"]);
    // The function of the package's name has the package around it, itself marked.
    const beside = aroundOf({ kind: "name", name: "plot" }, index, families);
    expect(beside[0]!.to).toEqual({ kind: "package", name: "plot" });
    expect(names(beside[0]!.rows)).toEqual(["*plot*", "text"]);
  });

  it("puts the shipped datasets after the functions of `datasets`, the open one marked", () => {
    const around = aroundOf({ kind: "name", name: "wages" }, index, families);
    expect(around.map((group) => group.name)).toEqual(["datasets"]);
    expect(names(around[0]!.rows)).toEqual(["dataset", "datasets"]);
    expect(names(around[0]!.datasets)).toEqual(["sleep", "*wages*"]);
    const own = aroundOf({ kind: "package", name: "datasets" }, index, families);
    expect(names(own[0]!.datasets)).toEqual(["sleep", "wages"]);
    // The function `datasets` is marked among the functions, not among the datasets.
    const same = aroundOf({ kind: "name", name: "datasets" }, index, families);
    expect(names(same[0]!.rows)).toEqual(["dataset", "*datasets*"]);
    expect(names(same[0]!.datasets)).toEqual(["sleep", "wages"]);
  });

  it("is a code's family with its codes and their titles, the open one marked", () => {
    const around = aroundOf({ kind: "code", code: "Z0103" }, index, families);
    expect(around).toEqual([
      {
        name: "Z01xx",
        words: "Names: variables, bindings, functions, packages",
        to: { kind: "codes", family: "Z01xx" },
        kind: "codes",
        rows: [
          {
            name: "Z0101",
            words: "no such name",
            to: { kind: "code", code: "Z0101" },
            here: false,
          },
          {
            name: "Z0103",
            words: "no such function",
            to: { kind: "code", code: "Z0103" },
            here: true,
          },
        ],
        datasets: [],
      },
    ]);
  });

  it("is nothing for Home, the codes by family, a name the index does not know, and before the index is given", () => {
    expect(aroundOf(HOME, index, families)).toEqual([]);
    expect(aroundOf(null, index, families)).toEqual([]);
    expect(aroundOf({ kind: "codes", family: null }, index, families)).toEqual([]);
    expect(aroundOf({ kind: "codes", family: "Z01xx" }, index, families)).toEqual([]);
    expect(aroundOf({ kind: "name", name: "a_learning" }, index, families)).toEqual([]);
    expect(aroundOf({ kind: "code", code: "Q9999" }, index, families)).toEqual([]);
    expect(aroundOf({ kind: "name", name: "anova" }, null, families)).toEqual([]);
    expect(aroundOf({ kind: "package", name: "stats" }, null, families)).toEqual([]);
    expect(aroundOf({ kind: "code", code: "Z0103" }, index, null)).toEqual([]);
  });
});
