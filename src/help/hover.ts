// What the card under the pointer shows for a name in a script (release 0.2.4, step 9; open
// decision #220, item 6; redrawn at release 0.3.1, step 7, by open decision #245): for a
// function, its name and what it does, its usage, and what it matches in R and Stata, not its
// whole page; F1 opens the whole page. The language server's answer for a function's name is that function's page,
// as `zeff help` prints it, the one the call would run where a name has two (#215); the usage
// is read from it, so it is always the engine's own for that function. Whatever else the
// server says of a word (a variable and its type, a project's own note) is shown as it is.
import type { ForeignName, HelpIndex } from "../engine/messages";
import { readPage } from "./read";

/**
 * The usage block of the one function a hover is the page of, as the page writes it; `null`
 * where the hover is not one function's page or the page gives no usage.
 */
export function usageIn(hover: string): string | null {
  const doc = readPage(hover);
  const [entry] = doc.entries;
  if (entry === undefined || doc.entries.length !== 1) return null;
  const usage = entry.sections
    .flatMap((section) => section.blocks)
    .flatMap((block) => (block.kind === "usage" ? [block.code] : []));
  return usage.length === 0 ? null : usage.join("\n");
}

/**
 * The card of a function (release 0.3.1, step 7; open decision #245, which revises #220, item
 * 6, where the card was the usage alone): its name and what it does, as its page's first line
 * says; its usage; and what it matches in R and Stata, as its page's **Coming from R or
 * Stata** begins. Every word is the page's own.
 */
export interface Card {
  name: string;
  does: string;
  usage: string;
  /** `Equivalents: R lm(); Stata regress.`, or `null` where neither the page nor the index names any. */
  equivalents: string | null;
}

/** What a card shows: a function's card, or whatever else the server said of a word, as it said it. */
export type Shown = { kind: "function"; card: Card } | { kind: "words"; text: string };

/**
 * What its page says a function matches in R and Stata: the sentence that page's **Coming
 * from R or Stata** begins with, where it begins with one (`Equivalents: …`); else `null`.
 */
export function equivalentsIn(hover: string): string | null {
  const doc = readPage(hover);
  const [entry] = doc.entries;
  if (entry === undefined || doc.entries.length !== 1) return null;
  const section = entry.sections.find((one) => one.heading === "COMING FROM R OR STATA");
  const [first] = section?.blocks ?? [];
  if (first === undefined || first.kind !== "paragraph") return null;
  return first.text.startsWith("Equivalents:") ? first.text : null;
}

/**
 * What the engine's index says a function matches, written as a page writes it, for a function
 * whose page has no such sentence yet (`reg`, in Zeff 0.9.0): the names the catalogue gives
 * it, R's and then Stata's, each as the index shows it. The names a page merely mentions in
 * its examples are left out. `null` where the catalogue names none.
 */
export function equivalentsOf(names: readonly ForeignName[]): string | null {
  const of = (which: ForeignName["of"]) => [
    ...new Set(
      names.filter((one) => one.from === "catalogue" && one.of === which).map((one) => one.shown),
    ),
  ];
  const parts = [
    ...(of("R").length > 0 ? [`R ${of("R").join(", ")}`] : []),
    ...(of("Stata").length > 0 ? [`Stata ${of("Stata").join(", ")}`] : []),
  ];
  return parts.length === 0 ? null : `Equivalents: ${parts.join("; ")}.`;
}

/**
 * The card of the one function a hover is the page of; `null` for anything else. `names` are
 * the R and Stata names the engine's index gives the function, where the window has them.
 */
export function cardIn(hover: string, names: readonly ForeignName[] = []): Card | null {
  const usage = usageIn(hover);
  if (usage === null) return null;
  const [entry] = readPage(hover).entries;
  if (entry === undefined) return null;
  return {
    name: entry.name,
    does: entry.does,
    usage,
    equivalents: equivalentsIn(hover) ?? equivalentsOf(names),
  };
}

/** What the card shows: a function's card, and anything else as the server said it. */
export function shownFor(hover: string, names: readonly ForeignName[] = []): Shown {
  const card = cardIn(hover, names);
  return card === null ? { kind: "words", text: hover } : { kind: "function", card };
}

/**
 * The R and Stata names the engine's index gives the function a hover is the page of: the one
 * of that name, and where a name has two functions, the one whose usage the page writes.
 */
export function namesFor(index: HelpIndex | null, hover: string): ForeignName[] {
  const [entry] = readPage(hover).entries;
  const usage = usageIn(hover);
  if (index === null || entry === undefined || usage === null) return [];
  const flat = (text: string) => text.replace(/\s+/g, " ").trim();
  const named = index.packages
    .flatMap((each) => each.functions)
    .filter((one) => one.name === entry.name);
  const one =
    named.length === 1 ? named[0] : named.find((each) => flat(each.usage) === flat(usage));
  return one?.names ?? [];
}
