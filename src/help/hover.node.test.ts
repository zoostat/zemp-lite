// The card under the pointer, on the engine the app carries (release 0.2.4, step 9; open
// decision #220, item 6): for every function of the index, the usage read out of the page the
// language server answers with is that function's own usage, as the engine's index gives it;
// and what is not a function's page is shown as it is. The engine is the worker as it is built
// for the browser (`npm run build:worker`).
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { HelpIndex } from "../engine/messages";
import { formsOf, severalOf, shownOf } from "./forms";
import { cardIn, equivalentsIn, equivalentsOf, shownFor, usageIn } from "./hover";
import { readPage } from "./read";

const at = (path: string) => fileURLToPath(new URL(`../../${path}`, import.meta.url));

interface Built {
  Project: new (name: string) => { help(name: string): string };
  helpIndex(): string;
}

function engine(): Built {
  const built = at("worker/pkg/node/zemp_worker.js");
  if (!existsSync(built)) throw new Error("the worker is not built: run `npm run build:worker`");
  (globalThis as Record<string, unknown>)["zeffHost"] = { event() {}, cancelled: () => false };
  return createRequire(import.meta.url)(built) as Built;
}

/** A usage with its line breaks and its indents taken out, to set one beside another. */
const flat = (usage: string) => usage.replace(/\s+/g, " ").trim();

describe("the usage a hover shows, on the whole index of Zeff 0.9.0", () => {
  const built = engine();
  const index = JSON.parse(built.helpIndex()) as HelpIndex;
  const project = new built.Project("hover");
  const print = (name: string) => (JSON.parse(project.help(name)) as { page: string }).page;
  const several = severalOf(index);

  it("is, for every function of one name, the usage the engine's index gives for it", () => {
    let held = 0;
    for (const one of index.packages.flatMap((each) => each.functions)) {
      if (several.has(one.name)) continue;
      const usage = usageIn(print(one.name));
      expect(usage, one.name).not.toBeNull();
      expect(flat(usage ?? ""), one.name).toBe(flat(one.usage));
      // The card: the function's name, what it does as the index gives it, and its usage
      // (release 0.3.1, step 7; the usage alone until then).
      const card = cardIn(print(one.name));
      expect(card?.name, one.name).toBe(one.name);
      expect(card?.does, one.name).toBe(one.summary);
      expect(card?.usage, one.name).toBe(usage);
      expect(shownFor(print(one.name)), one.name).toEqual({ kind: "function", card });
      held += 1;
    }
    expect(held).toBeGreaterThan(200);
  });

  it("is, for a name with two functions, the usage of the one the hover is the page of", () => {
    for (const name of [...several].sort()) {
      const whole = print(name);
      const doc = readPage(whole);
      const lines = whole.split("\n");
      for (const one of formsOf(index, name)) {
        // The function's own page, as the engine's hover gives it: its part of the print.
        const shown = shownOf(doc, index, name, one.form);
        if (shown.kind !== "one") throw new Error(`${name} ${one.words} has no page`);
        const from = shown.doc.entries[0]?.line ?? 0;
        const next = doc.entries.map((entry) => entry.line).find((line) => line > from);
        const hover = lines.slice(from, next).join("\n");
        expect(flat(usageIn(hover) ?? ""), `${name} ${one.words}`).toBe(flat(one.function.usage));
      }
      // The print of both at once is the page of neither: it is shown as it is.
      expect(usageIn(whole), name).toBeNull();
      expect(shownFor(whole), name).toEqual({ kind: "words", text: whole });
    }
  });

  it("is nothing for what is not a function's page, which the card shows as it is", () => {
    for (const said of [
      "wages: Frame, 18,412 rows × 12 columns",
      "no function or package is called `nonesuch`",
      "",
    ]) {
      expect(usageIn(said), said).toBeNull();
      expect(cardIn(said), said).toBeNull();
      expect(shownFor(said), said).toEqual({ kind: "words", text: said });
    }
  });

  it("names what a function matches in R and Stata, in its page's own words, where the page names any", () => {
    // The three the mockup of the revamp draws, and what Zeff 0.9.0 says of them.
    const names = (name: string) =>
      index.packages.flatMap((each) => each.functions).find((one) => one.name === name)?.names ??
      [];
    expect(equivalentsIn(print("dataset"))).toBe("Equivalents: R data(); Stata sysuse, webuse.");
    expect(equivalentsIn(print("mean"))).toBe("Equivalents: R mean().");
    // Its page's sentence comes before what the index gives: the page says it at more length.
    expect(cardIn(print("dataset"), names("dataset"))?.equivalents).toBe(
      "Equivalents: R data(); Stata sysuse, webuse.",
    );
    // (`summary` is the name of two functions: the print of both is the page of neither, and
    // the language server answers with the one the call would run.)
    expect(several.has("summary")).toBe(true);
    expect(equivalentsIn(print("summary"))).toBeNull();
    // The page of `reg` has no such section in Zeff 0.9.0: the card writes the same sentence
    // from the names the engine's catalogue gives it, and leaves out what a page only mentions.
    expect(equivalentsIn(print("reg"))).toBeNull();
    expect(cardIn(print("reg"), names("reg"))?.equivalents).toBe(
      "Equivalents: R lm(), fixest::feols(); Stata regress, reghdfe.",
    );
    expect(cardIn(print("reg"))?.equivalents).toBeNull();
    // What a page only mentions in its examples is not what the function matches.
    expect(equivalentsOf(names("mean"))).toBeNull();
    expect(
      equivalentsOf([
        { of: "Stata", name: "regress", shown: "regress", from: "catalogue" },
        { of: "R", name: "lm", shown: "lm()", from: "catalogue" },
        { of: "R", name: "lm", shown: "lm()", from: "catalogue" },
        { of: "R", name: "by", shown: "by()", from: "page" },
      ]),
    ).toBe("Equivalents: R lm(); Stata regress.");
    expect(equivalentsOf([])).toBeNull();
    // Every function: the sentence is the one its page's section begins with, or there is none.
    let named = 0;
    for (const one of index.packages.flatMap((each) => each.functions)) {
      if (several.has(one.name)) continue;
      const page = print(one.name);
      const said = equivalentsIn(page);
      const section = readPage(page).entries[0]?.sections.find(
        (each) => each.heading === "COMING FROM R OR STATA",
      );
      const [first] = section?.blocks ?? [];
      if (said === null) {
        expect(first?.kind === "paragraph" && first.text.startsWith("Equivalents:"), one.name).toBe(
          false,
        );
      } else {
        expect(first, one.name).toEqual({ kind: "paragraph", text: said });
        expect(page.replace(/\s+/g, " "), one.name).toContain(said);
        named += 1;
      }
    }
    // The pages in the fuller form of 0.9.0 name them; the others have none to name.
    expect(named).toBeGreaterThan(50);
  });
});
