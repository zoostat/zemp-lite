// A name with two functions (release 0.2.3, step 9g; open decision #215, the owner's choice of
// 24 November 2026): `histogram` is a layer of a plot and a plot of a frame's variable in one
// call; `min` is of two or more values and of a frame's column. Each function has a page of
// its own, told from the other by what it is called on: "histogram · of a frame",
// "histogram · of a plot". The words are made from the type of the function's first value,
// as the engine gives it in the index, so that nothing is written by hand for any name. The
// bare name opens a short chooser of the two.
//
// Until the engine prints one function at a time (Zeff 0.10.0), `zeff help histogram` prints
// both pages one after the other: the print is cut by function here, each function of the
// index finding its own part of the print by its package and its one line.
import type { HelpIndex, IndexedFunction } from "../engine/messages";
import { readPage, type Entry, type HelpDoc } from "./read";

/** Which function of a name: the package that has it, and the type of the value it is called on. */
export interface Form {
  package: string;
  on: string;
}

/** A function of a name that has several: which it is, what the index says of it, and its words. */
export interface Formed {
  form: Form;
  function: IndexedFunction;
  /** What tells it from the others of its name: "of a frame". */
  words: string;
}

/** The type of the value a function is called on, as the index gives it; empty where it takes none. */
export const onOf = (one: IndexedFunction): string => one.first?.type ?? "";

/**
 * The words for a type a function is called on: one type is named with its article, in small
 * letters and without what it holds ("of a frame", "of a list"); several types, which a
 * function written before its values takes (`min(a, b, ...)`), are "of values".
 */
export function wordsOn(type: string): string {
  const types = type
    .split("|")
    .map((one) => one.trim().replace(/<.*$/, ""))
    .filter((one) => one !== "");
  const [only] = [...new Set(types)];
  if (only === undefined) return "of nothing";
  if (new Set(types).size > 1) return "of values";
  const word = only.toLowerCase();
  return `of ${/^[aeiou]/.test(word) ? "an" : "a"} ${word}`;
}

/**
 * The functions of a name, in the index's order, each with its words. Where two would read
 * the same (two functions of a frame, in two packages) each says its package too.
 */
export function formsOf(index: HelpIndex | null, name: string): Formed[] {
  const found: Formed[] = [];
  for (const one of index?.packages ?? []) {
    for (const each of one.functions) {
      if (each.name !== name) continue;
      const on = onOf(each);
      found.push({ form: { package: one.name, on }, function: each, words: wordsOn(on) });
    }
  }
  for (const one of found) {
    const plain = wordsOn(one.form.on);
    if (found.filter((other) => wordsOn(other.form.on) === plain).length > 1) {
      one.words = `${plain}, in ${one.form.package}`;
    }
  }
  return found;
}

/** The names of the index that name several functions. */
export function severalOf(index: HelpIndex | null): Set<string> {
  const seen = new Set<string>();
  const several = new Set<string>();
  for (const one of index?.packages ?? []) {
    for (const each of one.functions) {
      if (seen.has(each.name)) several.add(each.name);
      seen.add(each.name);
    }
  }
  return several;
}

/** Whether two forms are the same function of a name. */
export const sameForm = (a: Form | undefined, b: Form | undefined): boolean =>
  a === undefined || b === undefined ? a === b : a.package === b.package && a.on === b.on;

/** One function of a name among those the index has, or none. */
export function formed(index: HelpIndex | null, name: string, form: Form): Formed | null {
  return formsOf(index, name).find((one) => sameForm(one.form, form)) ?? null;
}

/**
 * The part of the engine's print that is one function's page: the entry of its name and its
 * package, and, where a package has two of the name, the one whose first line says what the
 * index says the function does. None where the print has no such part (a function of the
 * project's own of that name is printed in the engine's place).
 */
export function entryOf(doc: HelpDoc, one: Formed): Entry | null {
  const ofPackage = doc.entries.filter(
    (entry) => entry.name === one.function.name && entry.facts[0] === one.form.package,
  );
  if (ofPackage.length === 1) return ofPackage[0] ?? null;
  return ofPackage.find((entry) => entry.does === one.function.summary) ?? null;
}

/**
 * What a page of a name shows, from the engine's print and the index: the print as it is,
 * where the name is one function (or the print is not of the index's functions); one
 * function's part, where a form is asked for; or the chooser, where the bare name has several.
 */
export type Shown =
  | { kind: "whole"; doc: HelpDoc }
  | { kind: "one"; doc: HelpDoc; of: Formed }
  | { kind: "chooser"; forms: Formed[] };

export function shownOf(
  doc: HelpDoc,
  index: HelpIndex | null,
  name: string,
  form: Form | undefined,
): Shown {
  const forms = formsOf(index, name);
  if (forms.length < 2) return { kind: "whole", doc };
  const parts = forms.map((one) => entryOf(doc, one));
  // The print is not the engine's pages of these functions: it is shown as it came.
  if (parts.some((part) => part === null) || doc.entries.length !== forms.length) {
    return { kind: "whole", doc };
  }
  if (form === undefined) return { kind: "chooser", forms };
  const at = forms.findIndex((one) => sameForm(one.form, form));
  const entry = parts[at];
  const of = forms[at];
  if (entry === null || entry === undefined || of === undefined) return { kind: "chooser", forms };
  return { kind: "one", doc: { ...doc, entries: [entry] }, of };
}

/**
 * The form a hover of the script speaks of. The engine's hover on a function's name is the
 * page of the function the call would run, as `zeff help` prints it: its first line says the
 * name, what it does and its package, and the form is the one of that package that does so.
 * None where the hover is not one function's page, or is of none of them.
 */
export function formIn(hover: string, forms: Formed[]): Formed | null {
  const doc = readPage(hover);
  const [entry] = doc.entries;
  if (entry === undefined || doc.entries.length !== 1) return null;
  const ofPackage = forms.filter(
    (one) => one.function.name === entry.name && one.form.package === entry.facts[0],
  );
  if (ofPackage.length === 1) return ofPackage[0] ?? null;
  // Two of one package: the one that does what the first line says.
  const found = ofPackage.filter((one) => one.function.summary === entry.does);
  return found.length === 1 ? (found[0] ?? null) : null;
}
