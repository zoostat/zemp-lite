// The search of the Help place on the whole index of the engine (release 0.2.3, step 6): the
// index and the codes as the worker built for the browser gives them (`npm run
// build:worker`), searched as a reader would type. What is found for the names a reader of R
// or of Stata knows; that every function is found by its own name; and that every keystroke
// is answered in a time no one notices.
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { CodeFamily, HelpIndex } from "../engine/messages";
import { MOST, entriesOf, search } from "./search";

const at = (path: string) => fileURLToPath(new URL(`../../${path}`, import.meta.url));

interface Built {
  helpIndex(): string;
  codesExplained(): string;
}

/** The engine, as the worker is built for Node beside the browser's. */
function engine(): Built {
  const built = at("worker/pkg/node/zemp_worker.js");
  if (!existsSync(built)) throw new Error("the worker is not built: run `npm run build:worker`");
  (globalThis as Record<string, unknown>)["zeffHost"] = { event() {}, cancelled: () => false };
  return createRequire(import.meta.url)(built) as Built;
}

describe("the search, on the whole index of Zeff 0.9.0", () => {
  const built = engine();
  const index = JSON.parse(built.helpIndex()) as HelpIndex;
  const families = (JSON.parse(built.codesExplained()) as { families: CodeFamily[] }).families;
  const entries = entriesOf(index, families);
  const names = (typed: string) => search(entries, typed).matches.map((one) => one.name);
  const first = (typed: string) => search(entries, typed).matches[0];

  it("looks through every function, package, dataset and code the engine has", () => {
    const count = (kind: string) => entries.filter((one) => one.kind === kind).length;
    expect(index.engine).toBe("0.9.0");
    // Every function the engine registers: 257 names, nine of which name two functions (#215).
    expect(count("function")).toBe(266);
    expect(
      new Set(entries.filter((one) => one.kind === "function").map((one) => one.name)).size,
    ).toBe(257);
    expect(count("package")).toBe(11);
    expect(count("dataset")).toBe(4);
    expect(count("code")).toBe(148);
    // The two of a name are apart, each saying which it is and opening its own page.
    const formed = entries.filter((one) => one.of !== undefined);
    expect([...new Set(formed.map((one) => one.name))].sort()).toEqual([
      "append",
      "boxplot",
      "density",
      "histogram",
      "max",
      "min",
      "plot",
      "quantile",
      "summary",
    ]);
    expect(formed).toHaveLength(18);
    expect(
      formed.filter((one) => one.name === "histogram").map((one) => `${one.of}, ${one.packages}`),
    ).toEqual(["of a plot, plot", "of a frame, plot"]);
    for (const one of formed) expect(one.to).toMatchObject({ kind: "name", form: {} });
  });

  it("finds every function, package and dataset by its own name, first, and every code by its code", () => {
    // A name of one letter is not searched for, the list opening at the second: the engine
    // has two, the constant `E` and the count `n`, which the field opens by name as before.
    expect(entries.filter((one) => one.name.length < 2).map((one) => one.name)).toEqual(["E", "n"]);
    for (const entry of entries.filter((one) => one.name.length >= 2)) {
      const found = search(entries, entry.name).matches;
      const top = found
        .filter((one) => one.rule === "exact")
        .map((one) => `${one.kind} ${one.name}`);
      expect(top, entry.name).toContain(`${entry.kind} ${entry.name}`);
      expect(found[0]?.rule, entry.name).toBe("exact");
    }
  });

  it("finds a function by the name a reader of R or of Stata knows it by", () => {
    // What is typed, and the function that must be among the matches, with why.
    const known: [string, string, string][] = [
      ["lm", "reg", "R lm()"],
      ["feols", "reg", "R fixest::feols()"],
      ["reghdfe", "reg", "Stata reghdfe"],
      ["t.test", "t_test", "R t.test()"],
      ["ttest", "t_test", "Stata ttest"],
      ["wilcox.test", "wilcoxon_test", "R wilcox.test()"],
      ["ranksum", "wilcoxon_test", "Stata ranksum"],
      ["chisq.test", "chi2_test", "R chisq.test()"],
      ["left_join", "merge", "R dplyr::left_join()"],
      ["mutate", "add", "R mutate()"],
      ["pivot_longer", "to_long", "R tidyr::pivot_longer()"],
      ["reshape", "to_long", "Stata reshape"],
      ["collapse", "aggregate", "Stata collapse"],
      ["xtset", "panel", "Stata xtset"],
      ["ivregress", "ivreg", "Stata ivregress"],
      ["rnorm", "dist.normal", "R rnorm()"],
      ["pbinom", "dist.binomial", "R pbinom()"],
      ["ggplot", "plot", "R ggplot2::ggplot()"],
      ["geom_point", "points", "R geom_point()"],
      ["%in%", "is_in", "R %in%"],
      ["is.na", "is_missing", "R is.na()"],
      ["tolower", "lower", "R tolower()"],
      ["esttab", "export", "Stata esttab"],
      ["kwallis", "kruskal_test", "Stata kwallis"],
      ["sysuse", "dataset", "Stata sysuse"],
    ];
    for (const [typed, name, why] of known) {
      const found = search(entries, typed).matches.find((one) => one.name === name);
      expect(found, `${typed} finds ${name}`).toBeDefined();
      expect(found?.why, typed).toBe(why);
      expect(found?.rule, typed).toBe("foreign");
    }
    // `ttest` is Stata's name and that alone: `test`, one key away, is not guessed beside it.
    expect(names("ttest")).toEqual(["t_test"]);
    // `lm` is the first name of `reg`; `anova`, which R also writes with `lm`, comes after it.
    // `posthoc`, whose page writes it in R from Zeff 0.9.0 (`emmeans` after `lm`), after both.
    expect(names("lm")).toEqual(["reg", "anova", "posthoc"]);
    // Where nothing else is called so, the function is the first match.
    for (const typed of ["lm", "ttest", "t.test", "left_join", "xtset", "rnorm", "kwallis"]) {
      expect(first(typed)?.rule, typed).toBe("foreign");
    }
  });

  it("finds by a name begun, a part of a name, a word of a one line, a code begun and a slip", () => {
    expect(names("regr")).toContain("regress");
    expect(names("t_te")[0]).toBe("t_test");
    // `test` is a function's name; after it the tests, by the part of their names.
    expect(search(entries, "test").matches.map((one) => `${one.name} ${one.rule}`)).toEqual([
      "test exact",
      "ar_test part",
      "chi2_test part",
      "fisher_test part",
      "kruskal_test part",
      "ks_test part",
      "proportion_test part",
      "shapiro_test part",
    ]);
    expect(names("wilcoxon")[0]).toBe("wilcoxon_test");
    expect(search(entries, "regression").matches.map((one) => one.name)).toContain("reg");
    expect(first("W02")).toMatchObject({ kind: "code", name: "W0201", rule: "code" });
    expect(names("W0201")).toEqual(["W0201"]);
    expect(first("regg")).toMatchObject({ name: "reg", rule: "slip" });
    expect(first("sumary")).toMatchObject({ name: "summary", rule: "slip" });
    expect(first("wages")).toMatchObject({ kind: "dataset", rule: "exact" });
    // The functions and the package of one name, the functions first, each saying which it is.
    expect(
      search(entries, "plot")
        .matches.slice(0, 3)
        .map((one) => `${one.kind} ${one.of ?? ""}`.trim()),
    ).toEqual(["function of a frame", "function of a result", "package"]);
    expect(
      search(entries, "min")
        .matches.slice(0, 2)
        .map((one) => `${one.name} ${one.of}, ${one.packages}`),
    ).toEqual(["min of values, core", "min of a frame, data"]);
  });

  it("keeps a place for an R or a Stata name typed exactly among many one lines with the word", () => {
    // Seven one lines have the word "table"; R's `table()` is `tabulate`, and is still found.
    const found = search(entries, "table").matches;
    expect(found).toHaveLength(MOST);
    expect(found[0]).toMatchObject({ name: "table", rule: "exact" });
    expect(found.find((one) => one.name === "tabulate")).toMatchObject({
      rule: "foreign",
      why: "R table()",
    });
    // The order shown is still the order of the rules.
    const order = ["exact", "begins", "part", "words", "foreign", "code", "slip"];
    const ranks = found.map((one) => order.indexOf(one.rule));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });

  it("answers what the engine does not have with a sentence and the nearest names", () => {
    // A command of Stata that Zeff 0.9.0 has no function for.
    const found = search(entries, "xtreg");
    expect(found.matches).toEqual([]);
    expect(found.nothing?.nearest.map((one) => one.name)).toContain("reg");
    expect(found.nothing?.sentence).toContain("“xtreg”");
    expect(search(entries, "zzzzzzzzzzzz").nothing?.nearest).toEqual([]);
  });

  it("answers every keystroke of twenty words in a time no one notices, with eight matches at the most", () => {
    const words = [
      "regression",
      "summary",
      "t.test",
      "wilcoxon",
      "tabulate",
      "histogram",
      "left_join",
      "W0201",
      "missing",
      "standardize",
      "correlation",
      "xtreg",
      "pivot_longer",
      "variance",
      "quantile",
      "dist.normal",
      "geom_point",
      "fixest::feols",
      "sumnary",
      "proportion",
    ];
    // Each keystroke is timed three times and its best time taken: another program on the
    // machine can only make a timing longer, never shorter, so the best is the search's own.
    const best = new Map<string, number>();
    for (let turn = 0; turn < 3; turn++) {
      for (const word of words) {
        for (let typed = 1; typed <= word.length; typed++) {
          const asked = word.slice(0, typed);
          const started = performance.now();
          const found = search(entries, asked);
          const took = performance.now() - started;
          best.set(asked, Math.min(best.get(asked) ?? Infinity, took));
          expect(found.matches.length).toBeLessThanOrEqual(MOST);
          // From the second letter there is always an answer: matches, or the sentence.
          if (typed >= 2) expect(found.matches.length > 0 || found.nothing !== null).toBe(true);
        }
      }
    }
    // Every keystroke of the twenty words (a beginning two words share is one).
    const keys = new Set(words.flatMap((word) => [...word].map((_, at) => word.slice(0, at + 1))));
    expect(best.size).toBe(keys.size);
    expect(best.size).toBeGreaterThan(150);
    // A sixtieth of a second is one frame of the screen.
    const slowest = Math.max(...best.values());
    expect(slowest).toBeLessThan(1000 / 60);
  });
});
