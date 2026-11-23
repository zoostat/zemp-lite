// The pages of Help that are lists (release 0.2.3, step 3b; open decision #211, item 7): a
// package's page, its functions each with its one line, and the codes by family. Both are
// set from what the engine gives (the index of the help, the codes it explains): the names,
// the one lines, the families and the titles are the engine's, in its order. `zeff help
// <package>` prints such a list for seven of the ten packages; for `plot`, `text` and
// `datasets` it prints the function of that name, so every package's page is set here alike.
import type { CodeFamily, HelpIndex } from "../engine/messages";
import { USING, USING_TITLE } from "../using/pages";
import { formsOf, onOf, severalOf, wordsOn } from "./forms";
import { CODES, type Stop } from "./history";

/**
 * A row of a list: a name that opens a page, and its one line. A function of a name that has
 * two says which it is after its name (`of`: "of a frame"), and the chooser gives each its
 * usage under its one line (`usage`).
 */
export interface Row {
  name: string;
  words: string;
  to: Stop;
  of?: string;
  usage?: string;
}

/**
 * A part of a list: its rows under a heading, or under none (a package's functions). A
 * heading has a name where the engine names the part (`Z01xx`) and words that say what it is.
 */
export interface Group {
  key: string;
  heading: { name: string | null; words: string } | null;
  rows: Row[];
}

/**
 * A page that is a list: its title, in the code's type where it is a name; its facts; its
 * parts. The rows are names of the engine's, set in the code's type, unless the list is of
 * titles (`titles`), set in the app's.
 */
export interface ListPage {
  title: string;
  named: boolean;
  titles?: boolean;
  /** A sentence under the title, where the page needs one (the chooser of a name's functions). */
  lead?: string;
  facts: string[];
  groups: Group[];
}

const counted = (count: number, one: string, many: string) =>
  `${count.toLocaleString("en-GB")} ${count === 1 ? one : many}`;

/**
 * A package's page: the functions this engine has, each with its one line, in the order the
 * engine lists them; under `datasets`, the shipped datasets after its functions. None where
 * the index has no such package.
 */
export function packagePage(index: HelpIndex | null, name: string): ListPage | null {
  const found = index?.packages.find((one) => one.name === name);
  if (index === null || found === undefined) return null;
  const several = severalOf(index);
  const groups: Group[] = [
    {
      key: "functions",
      heading: null,
      rows: found.functions.map((f): Row => {
        // A function of a name that has two is listed apart, and opens its own page.
        if (!several.has(f.name)) return { name: f.name, words: f.summary, to: nameStop(f.name) };
        const form = { package: name, on: onOf(f) };
        const words = formsOf(index, f.name).find(
          (one) => one.form.package === name && one.form.on === form.on,
        )?.words;
        return {
          name: f.name,
          words: f.summary,
          to: { kind: "name", name: f.name, form },
          of: words ?? wordsOn(form.on),
        };
      }),
    },
  ];
  const facts = [
    `package · tier ${found.tier}`,
    `${counted(found.functions.length, "function", "functions")} in Zeff ${index.engine}`,
  ];
  if (name === "datasets" && index.datasets.length > 0) {
    groups.push({
      key: "datasets",
      heading: { name: null, words: "Datasets" },
      rows: index.datasets.map((d) => ({
        name: d.name,
        words: d.summary,
        to: { kind: "name", name: d.name },
      })),
    });
    facts.push(counted(index.datasets.length, "dataset", "datasets"));
  }
  return { title: name, named: true, facts, groups };
}

const nameStop = (name: string): Stop => ({ kind: "name", name });

const NUMBERS = ["no", "one", "two", "three", "four", "five", "six"];

/**
 * The chooser of a name that has several functions (#215): each with what it is called on,
 * its one line and its usage, a click opening its page. None where the name has one function.
 */
export function chooserPage(index: HelpIndex | null, name: string): ListPage | null {
  const forms = formsOf(index, name);
  if (forms.length < 2) return null;
  const count = NUMBERS[forms.length] ?? String(forms.length);
  return {
    title: name,
    named: true,
    lead: `${name} is ${count} functions. Choose one by what it is called on.`,
    facts: [],
    groups: [
      {
        key: "forms",
        heading: null,
        rows: forms.map((one) => ({
          name,
          of: one.words,
          words: one.function.summary,
          usage: one.function.usage,
          to: { kind: "name", name, form: one.form },
        })),
      },
    ],
  };
}

/** The page of the codes by family, as `zeff explain` lists them. None until they are given. */
export function codesPage(families: CodeFamily[] | null): ListPage | null {
  if (families === null) return null;
  const count = families.reduce((sum, one) => sum + one.codes.length, 0);
  return {
    title: CODES,
    named: false,
    facts: [counted(count, "code", "codes"), counted(families.length, "family", "families")],
    groups: families.map((family) => ({
      key: family.name,
      heading: { name: family.name, words: family.area },
      rows: family.codes.map((one) => ({
        name: one.code,
        words: one.title,
        to: { kind: "code", code: one.code },
      })),
    })),
  };
}

/** The list of the pages of Using Zemp Lite: each title with its one line. */
export function usingList(): ListPage {
  return {
    title: USING_TITLE,
    named: false,
    titles: true,
    facts: [counted(USING.length, "page", "pages"), "on the app itself, in Zemp's own words"],
    groups: [
      {
        key: "pages",
        heading: null,
        rows: USING.map((page) => ({
          name: page.title,
          words: page.line,
          to: { kind: "using", page: page.slug },
        })),
      },
    ],
  };
}

/** The page of the packages: each package the engine ships, in its order, with its count. */
export function packagesPage(index: HelpIndex | null): ListPage | null {
  if (index === null) return null;
  const functions = index.packages.reduce((sum, one) => sum + one.functions.length, 0);
  return {
    title: "Packages",
    named: false,
    facts: [
      counted(index.packages.length, "package", "packages"),
      `${counted(functions, "function", "functions")} in Zeff ${index.engine}`,
    ],
    groups: [
      {
        key: "packages",
        heading: null,
        rows: index.packages.map((one) => ({
          name: one.name,
          words: `${counted(one.functions.length, "function", "functions")} · tier ${one.tier}`,
          to: { kind: "package", name: one.name },
        })),
      },
    ],
  };
}
