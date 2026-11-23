import { describe, expect, it } from "vitest";
import type { CodeFamily, ForeignName, HelpIndex } from "../engine/messages";
import { HOME } from "./history";
import { MOST, asTyped, entriesOf, search, slips, type Entry, type OwnPage } from "./search";

const r = (name: string, shown = `${name}()`): ForeignName => ({
  of: "R",
  name,
  shown,
  from: "catalogue",
});
const stata = (name: string, shown = name): ForeignName => ({
  of: "Stata",
  name,
  shown,
  from: "page",
});
const fn = (name: string, summary: string, names: ForeignName[] = []) => ({ name, summary, names });

const index: HelpIndex = {
  engine: "0.8.0",
  packages: [
    {
      name: "data",
      tier: 1,
      functions: [
        fn("summary", "Table of N, missing, mean, SD, min and max", [
          r("summary"),
          stata("summarize"),
        ]),
        fn("sum", "Sum of a variable", [r("sum")]),
        fn("merge", "Join two frames on key variables", [r("left_join", "dplyr::left_join()")]),
        fn("where", "Keep the rows a condition holds for", [
          r("subset"),
          r("filter", "dplyr::filter()"),
        ]),
        fn("tabulate", "One-way or two-way table of counts", [r("table"), stata("tabulate")]),
      ],
    },
    {
      name: "results",
      tier: 1,
      functions: [
        fn("summary", "The full table of a result", [r("summary")]),
        fn("coef", "The coefficients of a fit", [r("coef")]),
      ],
    },
    {
      name: "stats",
      tier: 1,
      functions: [
        fn("t_test", "t-tests for one mean, two groups or paired measurements", [
          r("t.test"),
          stata("ttest"),
        ]),
        fn("chi2_test", "Chi-squared test of independence", [r("chisq.test"), stata("tabulate")]),
      ],
    },
    {
      name: "regress",
      tier: 2,
      functions: [
        fn("reg", "Linear regression by least squares, with fixed effects", [
          r("lm"),
          r("feols", "fixest::feols()"),
          stata("regress"),
          stata("reghdfe"),
        ]),
        fn("ivreg", "Two-stage least squares", [stata("ivregress")]),
      ],
    },
    {
      name: "plot",
      tier: 1,
      functions: [fn("plot", "Start a layered plot", [r("ggplot", "ggplot2::ggplot()")])],
    },
    {
      name: "dist",
      tier: 1,
      functions: [fn("dist.normal", "The normal distribution", [r("rnorm", "rnorm")])],
    },
  ],
  datasets: [{ name: "wages", title: "wages", summary: "Synthetic hourly wages of 3,911 workers" }],
};
const families: CodeFamily[] = [
  {
    name: "W0xxx",
    area: "Warnings, numbered by the same areas",
    codes: [
      { code: "W0201", kind: "warning", title: "missing values skipped by a statistic" },
      { code: "W0202", kind: "warning", title: "a number with a fraction became NA" },
    ],
  },
  {
    name: "Z01xx",
    area: "Names",
    codes: [{ code: "Z0101", kind: "error", title: "no such name" }],
  },
];
const pages: OwnPage[] = [
  {
    title: "Running a script",
    words: "Run the whole script, or the statement at the cursor",
    to: HOME,
  },
  { title: "Keyboard shortcuts", words: "Every key the app answers to", to: HOME },
];
const entries = entriesOf(index, families, pages);

/** A search as it reads: each match as `kind name` with its rule, and why where it is said. */
const read = (typed: string, among: Entry[] = entries) =>
  search(among, typed).matches.map(
    (one) => `${one.kind} ${one.name} [${one.rule}${one.why === null ? "" : `: ${one.why}`}]`,
  );

describe("what the search looks through", () => {
  it("has every function once, with the packages that have it and the names of both", () => {
    const summary = entries.filter((one) => one.name === "summary");
    expect(summary).toHaveLength(1);
    expect(summary[0]).toMatchObject({
      kind: "function",
      words: "Table of N, missing, mean, SD, min and max",
      packages: ["data", "results"],
      to: { kind: "name", name: "summary" },
    });
    expect(summary[0]?.foreign.map((name) => `${name.of} ${name.name}`)).toEqual([
      "R summary",
      "Stata summarize",
    ]);
  });

  it("has the packages, the datasets, the codes and the app's own pages", () => {
    const kinds = (kind: string) =>
      entries.filter((one) => one.kind === kind).map((one) => one.name);
    expect(kinds("package")).toEqual(["data", "results", "stats", "regress", "plot", "dist"]);
    expect(kinds("dataset")).toEqual(["wages"]);
    expect(kinds("code")).toEqual(["W0201", "W0202", "Z0101"]);
    expect(kinds("page")).toEqual(["Running a script", "Keyboard shortcuts"]);
    expect(entries.find((one) => one.kind === "package" && one.name === "stats")).toMatchObject({
      words: "2 functions",
      to: { kind: "package", name: "stats" },
    });
    expect(entries.find((one) => one.name === "plot" && one.kind === "package")?.words).toBe(
      "1 function",
    );
    expect(entriesOf(null, null)).toEqual([]);
  });
});

describe("what was typed", () => {
  it("is searched for without the space around it, a call's brackets, or its capitals", () => {
    expect(asTyped("  T.Test()  ")).toBe("t.test");
    expect(asTyped("lm(")).toBe("lm");
    expect(asTyped("w0201")).toBe("w0201");
  });

  it("finds nothing and says nothing before the second letter", () => {
    for (const typed of ["", " ", "r", " r ", "("]) {
      expect(search(entries, typed)).toMatchObject({ matches: [], nothing: null });
    }
    expect(search(entries, "re").matches.length).toBeGreaterThan(0);
  });
});

describe("the rules of the search, each by itself", () => {
  it("1: a name typed exactly, whatever the capitals: a function, a package, a dataset, a code, a page", () => {
    expect(read("reg")[0]).toBe("function reg [exact]");
    expect(read("REG")[0]).toBe("function reg [exact]");
    expect(read("stats")[0]).toBe("package stats [exact]");
    expect(read("wages")[0]).toBe("dataset wages [exact]");
    expect(read("w0201")).toEqual(["code W0201 [exact]"]);
    expect(read("running a script")[0]).toBe("page Running a script [exact]");
  });

  it("2: a name beginning with what is typed", () => {
    // The names begun come first; what the other rules find follows them.
    expect(read("tab")).toEqual([
      "function tabulate [begins]",
      "function summary [words]",
      "function chi2_test [foreign: Stata tabulate]",
    ]);
    expect(read("su")).toEqual([
      "function sum [begins]",
      "function summary [begins]",
      "code Z0101 [words]",
      "function where [foreign: R subset()]",
    ]);
    expect(read("key")).toEqual(["page Keyboard shortcuts [begins]", "function merge [words]"]);
  });

  it("3: a word of a name after its first, then a word of a title or a one line", () => {
    // `test` begins no name; it is a part of two, and a word of neither one line more.
    expect(read("test")).toEqual(["function chi2_test [part]", "function t_test [part]"]);
    expect(search(entries, "test").matches[0]?.word).toBe("test");
    expect(read("norm")).toEqual(["function dist.normal [part]"]);
    expect(read("short")).toEqual(["page Keyboard shortcuts [part]"]);
    // A word of a one line, of a code's title, of a dataset's line.
    expect(read("squares")).toEqual(["function ivreg [words]", "function reg [words]"]);
    // The word that matched is given, for the list to mark: here the first by the name's order.
    expect(search(entries, "squa").matches[0]).toMatchObject({
      name: "chi2_test",
      word: "squared",
    });
    expect(search(entries, "squares").matches[0]).toMatchObject({ name: "ivreg", word: "squares" });
    expect(read("skipped")).toEqual(["code W0201 [words]"]);
    expect(read("hourly")).toEqual(["dataset wages [words]"]);
    // A part of a name comes before a word of a one line.
    expect(read("mea")).toEqual(["function summary [words]", "function t_test [words]"]);
  });

  it("4: an R or a Stata name, said as its source writes it; one typed exactly before one begun", () => {
    expect(read("lm")).toEqual(["function reg [foreign: R lm()]"]);
    expect(read("t.test")).toEqual(["function t_test [foreign: R t.test()]"]);
    expect(read("ttest")).toEqual(["function t_test [foreign: Stata ttest]"]);
    expect(read("feols")).toEqual(["function reg [foreign: R fixest::feols()]"]);
    expect(read("fixest::feols")).toEqual(["function reg [foreign: R fixest::feols()]"]);
    expect(read("fixest")).toEqual(["function reg [foreign: R fixest::feols()]"]);
    expect(read("left_join()")).toEqual(["function merge [foreign: R dplyr::left_join()]"]);
    expect(read("rnorm")).toEqual(["function dist.normal [foreign: R rnorm]"]);
    // `regress` is the package, typed exactly; `reg` has it as Stata's name, but is found
    // first by a word of its one line ("regression"), which is the better rule.
    expect(read("regress")).toEqual(["package regress [exact]", "function reg [words]"]);
    expect(read("ivregress")).toEqual(["function ivreg [foreign: Stata ivregress]"]);
    // One typed exactly comes before one begun, whatever their names.
    expect(read("regh")).toEqual(["function reg [foreign: Stata reghdfe]"]);
    expect(read("chisq")).toEqual(["function chi2_test [foreign: R chisq.test()]"]);
    expect(read("summarize")).toEqual(["function summary [foreign: Stata summarize]"]);
    // A function that has the name itself is found by its own name, not by R's of the same.
    expect(read("coef")).toEqual(["function coef [exact]"]);
  });

  it("5: a code begun", () => {
    expect(read("W02")).toEqual(["code W0201 [code]", "code W0202 [code]"]);
    expect(read("z0")).toEqual(["code Z0101 [code]"]);
    expect(read("W0202")).toEqual(["code W0202 [exact]"]);
  });

  it("6: a name one key's slip away, from the fourth letter and not before", () => {
    // A letter added, wrong, missing, and two changed over.
    expect(read("regg")).toEqual(["function reg [slip]"]);
    expect(read("sumnary")).toEqual(["function summary [slip]"]);
    expect(read("mrge")).toEqual(["function merge [slip]"]);
    expect(read("wehre")).toEqual(["function where [slip]"]);
    expect(read("stata")).toEqual(["package stats [slip]"]);
    expect(read("wagse")).toEqual(["dataset wages [slip]"]);
    // Three letters are not forgiven: `rge` is one letter from `reg`, and finds nothing.
    expect(read("rge")).toEqual([]);
    expect(search(entries, "rge").nothing).not.toBeNull();
    // Two slips are not one.
    expect(read("sumnarry")).toEqual([]);
    // A name of R or of Stata typed exactly is no slip either: `ttest` is one key from
    // `t_test`, which it finds as Stata's name, and nothing else is guessed beside it.
    const among = entriesOf(
      {
        engine: "0.8.0",
        packages: [
          {
            name: "p",
            tier: 1,
            functions: [
              fn("t_test", "nothing of it", [stata("ttest")]),
              fn("test", "nothing of it"),
              fn("ttests", "nothing of it"),
            ],
          },
        ],
        datasets: [],
      },
      null,
    );
    expect(read("ttest", among)).toEqual([
      "function ttests [begins]",
      "function t_test [foreign: Stata ttest]",
    ]);
    expect(read("ttestz", among)).toEqual(["function ttests [slip]"]);
  });
});

describe("the order of the search", () => {
  it("is the order of the rules: exact, begun, a part, a word, R and Stata, a code begun, a slip", () => {
    const among: Entry[] = entriesOf(
      {
        engine: "0.8.0",
        packages: [
          {
            name: "p",
            tier: 1,
            functions: [
              fn("zz_slip", "nothing of it", []),
              fn("code_begun_never", "nothing of it", []),
              fn("by_stata_begun", "nothing of it", [stata("tablefull")]),
              fn("by_r_exact", "nothing of it", [r("table")]),
              fn("by_words", "A table of counts", []),
              fn("of_table", "nothing of it", []),
              fn("tables", "nothing of it", []),
              fn("table", "nothing of it", []),
              fn("tabel", "nothing of it", []),
            ],
          },
        ],
        datasets: [],
      },
      null,
    );
    // A name typed exactly is no slip: `tabel`, one key away, is not offered beside it.
    expect(read("table", among)).toEqual([
      "function table [exact]",
      "function tables [begins]",
      "function of_table [part]",
      "function by_words [words]",
      "function by_r_exact [foreign: R table()]",
      "function by_stata_begun [foreign: Stata tablefull]",
    ]);
    // Nor beside R's name typed exactly.
    const without = among.filter((one) => one.name !== "table");
    expect(read("table", without)).toEqual([
      "function tables [begins]",
      "function of_table [part]",
      "function by_words [words]",
      "function by_r_exact [foreign: R table()]",
      "function by_stata_begun [foreign: Stata tablefull]",
    ]);
    // Where no name was typed exactly, the slip is the last of them.
    const neither = without.filter((one) => one.name !== "by_r_exact");
    expect(read("table", neither)).toEqual([
      "function tables [begins]",
      "function of_table [part]",
      "function by_words [words]",
      "function by_stata_begun [foreign: Stata tablefull]",
      "function tabel [slip]",
    ]);
    // A code begun stands between the R and Stata names and a slip.
    const coded = entriesOf(
      {
        engine: "0.8.0",
        packages: [
          {
            name: "p",
            tier: 1,
            functions: [fn("w0x1", "nothing of it"), fn("by_r", "nothing of it", [r("w0x9z")])],
          },
        ],
        datasets: [],
      },
      [
        {
          name: "W0xxx",
          area: "Warnings",
          codes: [{ code: "W0X22", kind: "warning", title: "t" }],
        },
      ],
    );
    expect(read("w0x2", coded)).toEqual(["code W0X22 [code]", "function w0x1 [slip]"]);
    expect(read("w0x", coded)).toEqual([
      "function w0x1 [begins]",
      "function by_r [foreign: R w0x9z()]",
      "code W0X22 [code]",
    ]);
  });

  it("enters a match once, by the best rule that finds it", () => {
    // `summary`: its own name, R's of the same name, and a word of other one lines.
    const found = read("summary");
    expect(found.filter((one) => one.includes(" summary "))).toEqual(["function summary [exact]"]);
    // `tabulate` is a name and Stata's name of two functions: its own first, the other by Stata.
    expect(read("tabulate")).toEqual([
      "function tabulate [exact]",
      "function chi2_test [foreign: Stata tabulate]",
    ]);
  });

  it("breaks ties by the name, and for one name by its kind, so the same letters give the same list", () => {
    // The function before the package of its name; both exact.
    expect(read("plot")).toEqual(["function plot [exact]", "package plot [exact]"]);
    // Whatever order the entries come in.
    const turned = [...entries].reverse();
    for (const typed of ["su", "re", "test", "W02", "plot", "ta", "regg", "least"]) {
      expect(read(typed, turned)).toEqual(read(typed));
      expect(read(typed)).toEqual(read(typed));
    }
    expect(read("re")).toEqual([
      "function reg [begins]",
      "package regress [begins]",
      "package results [begins]",
    ]);
  });

  it("gives eight matches at the most, the best of them", () => {
    const many = entriesOf(
      {
        engine: "0.8.0",
        packages: [
          {
            name: "p",
            tier: 1,
            functions: Array.from({ length: 30 }, (_, at) =>
              fn(`fit_${String(at).padStart(2, "0")}`, "nothing of it"),
            ).concat([fn("fit", "nothing of it")]),
          },
        ],
        datasets: [],
      },
      null,
    );
    const found = search(many, "fit").matches;
    expect(found).toHaveLength(MOST);
    expect(found.map((one) => one.name)).toEqual([
      "fit",
      "fit_00",
      "fit_01",
      "fit_02",
      "fit_03",
      "fit_04",
      "fit_05",
      "fit_06",
    ]);
  });
});

describe("the functions an R or a Stata name finds", () => {
  it("come in the order of where the name stands among each one's names, then by name", () => {
    const among = entriesOf(
      {
        engine: "0.8.0",
        packages: [
          {
            name: "p",
            tier: 1,
            functions: [
              fn("anova", "nothing of it", [r("aov"), r("oneway.test"), r("lm")]),
              fn("reg", "nothing of it", [r("lm"), r("feols")]),
              fn("also", "nothing of it", [r("lm")]),
              fn("begun", "nothing of it", [r("lmer")]),
            ],
          },
        ],
        datasets: [],
      },
      null,
    );
    // `lm` is the first name of `also` and of `reg`, and the third of `anova`.
    expect(read("lm", among)).toEqual([
      "function also [foreign: R lm()]",
      "function reg [foreign: R lm()]",
      "function anova [foreign: R lm()]",
      "function begun [foreign: R lmer()]",
    ]);
  });
});

describe("the places of the eight", () => {
  const crowded = (foreign: number) =>
    entriesOf(
      {
        engine: "0.8.0",
        packages: [
          {
            name: "p",
            tier: 1,
            functions: [
              fn("table", "nothing of it"),
              ...Array.from({ length: 12 }, (_, at) =>
                fn(`w${String(at).padStart(2, "0")}`, "A table of something"),
              ),
              ...Array.from({ length: foreign }, (_, at) =>
                fn(`x${at}`, "nothing of it", [r("table")]),
              ),
              fn("y_begun", "nothing of it", [r("tablefull")]),
            ],
          },
        ],
        datasets: [],
      },
      null,
    );

  it("keeps two at the most for R and Stata names typed exactly, where one lines would fill them", () => {
    // One name, twelve one lines with the word, three functions that are R's `table()`.
    expect(read("table", crowded(3))).toEqual([
      "function table [exact]",
      "function w00 [words]",
      "function w01 [words]",
      "function w02 [words]",
      "function w03 [words]",
      "function w04 [words]",
      "function x0 [foreign: R table()]",
      "function x1 [foreign: R table()]",
    ]);
    // One such function takes one place, and none takes none: the one lines have the rest.
    expect(read("table", crowded(1)).slice(6)).toEqual([
      "function w05 [words]",
      "function x0 [foreign: R table()]",
    ]);
    expect(read("table", crowded(0)).slice(6)).toEqual([
      "function w05 [words]",
      "function w06 [words]",
    ]);
  });

  it("gives up none where the eight are not filled, and none of a name's", () => {
    // A name begun is never given up for them.
    const named = entriesOf(
      {
        engine: "0.8.0",
        packages: [
          {
            name: "p",
            tier: 1,
            functions: [
              ...Array.from({ length: 9 }, (_, at) => fn(`table${at}`, "nothing of it")),
              fn("x0", "nothing of it", [r("table")]),
            ],
          },
        ],
        datasets: [],
      },
      null,
    );
    expect(read("table", named).every((one) => one.endsWith("[begins]"))).toBe(true);
    expect(read("table", named)).toHaveLength(MOST);
  });
});

describe("where nothing is found", () => {
  it("there is a sentence and the nearest names, nearer first, never an empty answer", () => {
    const found = search(entries, "xtreg");
    expect(found.matches).toEqual([]);
    expect(found.nothing?.sentence).toBe(
      "Nothing here is called or described by “xtreg”. The nearest names:",
    );
    // Both are two keys away: by the name's order between them.
    expect(found.nothing?.nearest.map((one) => one.name)).toEqual(["ivreg", "reg"]);
    expect(search(entries, "sumnarry").nothing?.nearest.map((one) => one.name)).toEqual([
      "summary",
    ]);
    // As it was typed, capitals and all.
    expect(search(entries, " XTReg ").nothing?.sentence).toContain("“XTReg”");
  });

  it("a short word is near too many names: one slip for up to four letters, two from the fifth", () => {
    // `glm` is two keys from `sum`, and that is not near; `rge` is one from `reg`.
    expect(search(entries, "glm").nothing?.nearest).toEqual([]);
    expect(search(entries, "rge").nothing?.nearest.map((one) => one.name)).toEqual(["reg"]);
    expect(search(entries, "xtreg").nothing?.nearest.length).toBeGreaterThan(0);
  });

  it("there is a sentence that says what can be typed, where no name is near", () => {
    const found = search(entries, "qqqqqqqqqq");
    expect(found.nothing?.nearest).toEqual([]);
    expect(found.nothing?.sentence).toBe(
      "Nothing here is called or described by “qqqqqqqqqq”. Try a function's name, a word of what it does, an R or a Stata name, or a code.",
    );
  });

  it("offers three names at the most, and no code or page among them", () => {
    const found = search(entries, "w0299");
    expect(found.matches).toEqual([]);
    expect(found.nothing?.nearest.every((one) => one.kind !== "code" && one.kind !== "page")).toBe(
      true,
    );
    expect(search(entries, "zzum").nothing?.nearest.length).toBeLessThanOrEqual(3);
  });
});

describe("the slips of one key between two texts", () => {
  it("counts a letter wrong, missing or added, and two changed over, as one each", () => {
    expect(slips("reg", "reg", 1)).toBe(0);
    expect(slips("reg", "regg", 1)).toBe(1);
    expect(slips("reg", "rg", 1)).toBe(1);
    expect(slips("reg", "rag", 1)).toBe(1);
    expect(slips("reg", "rge", 1)).toBe(1);
    expect(slips("summary", "sumnarry", 2)).toBe(2);
    expect(slips("", "ab", 2)).toBe(2);
  });

  it("stops counting past the most asked for", () => {
    expect(slips("reg", "summary", 1)).toBe(2);
    expect(slips("abcdef", "uvwxyz", 2)).toBe(3);
    expect(slips("abc", "abcdefgh", 2)).toBe(3);
  });
});
