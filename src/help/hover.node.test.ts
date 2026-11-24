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
import { cardOf, usageIn } from "./hover";
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

describe("the usage a hover shows, on the whole index of Zeff 0.8.0", () => {
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
      // The card holds the usage and nothing else of the page.
      expect(cardOf(print(one.name)), one.name).toBe(usage);
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
      expect(cardOf(whole), name).toBe(whole);
    }
  });

  it("is nothing for what is not a function's page, which the card shows as it is", () => {
    for (const said of [
      "wages: Frame, 18,412 rows × 12 columns",
      "no function or package is called `nonesuch`",
      "",
    ]) {
      expect(usageIn(said), said).toBeNull();
      expect(cardOf(said), said).toBe(said);
    }
  });
});
