// The names with two functions, on the engine the app carries (release 0.2.3, step 9g; open
// decision #215): which they are, the words that tell the two apart, each function's own part
// of the engine's print, and the usage by which a hover of the script says which is meant.
// The engine is the worker as it is built for the browser (`npm run build:worker`).
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { HelpIndex } from "../engine/messages";
import { formIn, formsOf, severalOf, shownOf } from "./forms";
import { chooserPage } from "./pages";
import { outlineOf, readPage } from "./read";

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

describe("the names with two functions, on the whole index of Zeff 0.8.0", () => {
  const built = engine();
  const index = JSON.parse(built.helpIndex()) as HelpIndex;
  const project = new built.Project("forms");
  const print = (name: string) => (JSON.parse(project.help(name)) as { page: string }).page;
  const several = [...severalOf(index)].sort();

  it("are nine, each told apart by what it is called on, in words made from the engine's types", () => {
    const words = Object.fromEntries(
      several.map((name) => [
        name,
        formsOf(index, name).map((one) => `${one.words} (${one.form.package})`),
      ]),
    );
    expect(words).toEqual({
      append: ["of a list (core)", "of a frame (data)"],
      boxplot: ["of a plot (plot)", "of a frame (plot)"],
      density: ["of a plot (plot)", "of a frame (plot)"],
      histogram: ["of a plot (plot)", "of a frame (plot)"],
      max: ["of values (core)", "of a frame (data)"],
      min: ["of values (core)", "of a frame (data)"],
      plot: ["of a frame (plot)", "of a result (plot)"],
      quantile: ["of a frame (data)", "of a distribution (dist)"],
      summary: ["of a frame (data)", "of a result (results)"],
    });
    // No two functions of a name read the same.
    for (const name of several) {
      const all = formsOf(index, name).map((one) => one.words);
      expect(new Set(all).size, name).toBe(all.length);
    }
  });

  it("each have a page of their own, cut from the engine's print, with its own sections alone", () => {
    for (const name of several) {
      const doc = readPage(print(name));
      const forms = formsOf(index, name);
      expect(doc.entries, name).toHaveLength(forms.length);
      // The bare name is the chooser, each function with its usage and its one line.
      expect(shownOf(doc, index, name, undefined).kind, name).toBe("chooser");
      const chooser = chooserPage(index, name)!;
      expect(chooser.lead).toBe(`${name} is two functions. Choose one by what it is called on.`);
      const taken = new Set<number>();
      for (const [at, one] of forms.entries()) {
        const shown = shownOf(doc, index, name, one.form);
        expect(shown.kind, `${name} ${one.words}`).toBe("one");
        if (shown.kind !== "one") continue;
        const [entry] = shown.doc.entries;
        expect(shown.doc.entries).toHaveLength(1);
        expect(entry?.name).toBe(name);
        expect(entry?.facts[0]).toBe(one.form.package);
        expect(entry?.does).toBe(one.function.summary);
        // Each function has its own part: no part is given to two.
        expect(taken.has(entry?.line ?? -1)).toBe(false);
        taken.add(entry?.line ?? -1);
        // The page's usage is the function's own, as the chooser gives it.
        const usage = print(name).split("\n").slice(entry?.line).join("\n");
        const head = one.function.usage.slice(0, one.function.usage.indexOf("(") + 1);
        expect(usage.split("USAGE")[1]?.trimStart().startsWith(head), `${name} ${head}`).toBe(true);
        expect(chooser.groups[0]?.rows[at]).toMatchObject({
          name,
          of: one.words,
          words: one.function.summary,
          usage: one.function.usage,
        });
        // On this page: this function's sections, each once, and no function named over them.
        const outline = outlineOf(shown.doc);
        expect(outline.some((item) => item.entry)).toBe(false);
        expect(new Set(outline.map((item) => item.title)).size).toBe(outline.length);
        expect(outline[0]?.title).toBe("Usage");
      }
    }
  });

  it("are told apart in a hover, which is the page of the function the call would run", () => {
    for (const name of several) {
      const forms = formsOf(index, name);
      const whole = print(name);
      const doc = readPage(whole);
      const lines = whole.split("\n");
      for (const one of forms) {
        // The function's own page, as the engine's hover gives it: its part of the print.
        const shown = shownOf(doc, index, name, one.form);
        if (shown.kind !== "one") throw new Error(`${name} ${one.words} has no page`);
        const from = shown.doc.entries[0]?.line ?? 0;
        const next = doc.entries.map((entry) => entry.line).find((line) => line > from);
        const hover = lines.slice(from, next).join("\n");
        expect(formIn(hover, forms)?.form, `${name} ${one.words}`).toEqual(one.form);
      }
      // The print of both at once is of neither.
      expect(formIn(whole, forms), name).toBeNull();
    }
  });

  it("leave every other name one page, as the engine prints it", () => {
    expect(index.packages.reduce((sum, one) => sum + one.functions.length, 0)).toBe(259);
    for (const name of ["reg", "t_test", "mean", "text", "datasets"]) {
      expect(formsOf(index, name), name).toHaveLength(1);
      const doc = readPage(print(name));
      expect(shownOf(doc, index, name, undefined), name).toEqual({ kind: "whole", doc });
    }
  });
});
