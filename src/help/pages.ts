// The pages of Help that are lists (release 0.2.3, step 3b; open decision #211, item 7): a
// package's page, its functions each with its one line, and the codes by family. Both are
// set from what the engine gives (the index of the help, the codes it explains): the names,
// the one lines, the families and the titles are the engine's, in its order. `zeff help
// <package>` prints such a list for seven of the ten packages; for `plot`, `text` and
// `datasets` it prints the function of that name, so every package's page is set here alike.
import type { CodeFamily, HelpIndex } from "../engine/messages";
import { CODES, type Stop } from "./history";

/** A row of a list: a name that opens a page, and its one line. */
export interface Row {
  name: string;
  words: string;
  to: Stop;
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

/** A page that is a list: its title, in the code's type where it is a name; its facts; its parts. */
export interface ListPage {
  title: string;
  named: boolean;
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
  const groups: Group[] = [
    {
      key: "functions",
      heading: null,
      rows: found.functions.map((f) => ({
        name: f.name,
        words: f.summary,
        to: { kind: "name", name: f.name },
      })),
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

/** The parts of a list that have a heading, for the outline: where each is, and its words. */
export function partsOf(page: ListPage): { line: number; title: string }[] {
  return page.groups.flatMap((group, line) =>
    group.heading === null
      ? []
      : [
          {
            line,
            title:
              group.heading.name === null
                ? group.heading.words
                : `${group.heading.name} · ${group.heading.words}`,
          },
        ],
  );
}
