// What the search of the Help place finds, and in what order (release 0.2.3, step 6; the row
// of 0.2.3; open decision #211, part 4, and the owner's answer to question 1). It runs in the
// browser, on what the engine has given (the index of the help and the codes by family) and
// on the pages of Using Zemp Lite: no request leaves the page.
//
// From the second letter typed, up to eight matches, best first, in the order #211 sets:
//
//   1. a name typed exactly (a function's, a package's, a dataset's, a code, a page's title);
//   2. a name beginning with what is typed;
//   3. a word beginning with it: of a name (`test` in `t_test`), then of a title or a one-line
//      description;
//   4. an R or a Stata name: one typed exactly, then one beginning with it (`lm`, `t.test`);
//   5. a code begun (`W02`);
//   6. from the fourth letter, a name one key's slip away (`regg`), where no name, the
//      engine's or R's or Stata's, was typed exactly.
//
// Where more than eight are found, the words of one lines, which are the commonest match and
// the weakest, give up two places at the most to R and Stata names typed exactly, so that
// `table` still finds `tabulate` (R's `table()`) after the six one lines that have the word.
// The order shown is the order of the rules all the same.
//
// A match is entered once, by the best rule that finds it. Within a rule the order is fixed,
// so the same letters always give the same list: by the name, as a dictionary has it, and
// for one name by its kind (a function before the package of its name). Among the functions
// an R or a Stata name finds, the one that has it earlier among its names comes first: `lm`
// is the first name of `reg`, and the fifth of `anova`, which R writes `anova(lm())`. Where nothing is
// found the answer is a sentence and the nearest names, never an empty list.
import type { CodeFamily, ForeignName, HelpIndex } from "../engine/messages";
import type { Stop } from "./history";

/** What a match is. */
export type Kind = "function" | "package" | "dataset" | "code" | "page";

/** The most matches a search gives. */
export const MOST = 8;
/** The letters from which a search answers. */
export const LEAST = 2;
/** The letters from which a slip of one key is forgiven. */
export const SLIP_FROM = 4;
/** The most names offered where nothing is found. */
export const NEAREST = 3;
/** The places of the eight kept for R and Stata names typed exactly, where one lines would fill them. */
export const KEPT_FOREIGN = 2;

/** A page of Using Zemp Lite, for the search: its title, its one line, and where it is. */
export interface OwnPage {
  title: string;
  words: string;
  to: Stop;
}

/**
 * Something the search can find: its kind, its name, its one line, where it is; for a
 * function, the packages that have it and the R and Stata names it answers to.
 */
export interface Entry {
  kind: Kind;
  name: string;
  words: string;
  to: Stop;
  packages: string[];
  foreign: ForeignName[];
}

/** The rule by which a match was found, in the order of #211. */
export type Rule = "exact" | "begins" | "part" | "words" | "foreign" | "code" | "slip";

/**
 * A match: what it is, and why it matched. `why` is said to the reader where the match is
 * not by the name itself: the R or Stata name as its source writes it ("R lm()"), or the
 * name the slip was taken for. `word` is the word of the name or of the one line that begins
 * with what was typed, for the list to mark.
 */
export interface Match extends Entry {
  rule: Rule;
  why: string | null;
  word: string | null;
}

/** What a search gives: its matches, or, where there are none, a sentence and the nearest names. */
export interface Found {
  typed: string;
  matches: Match[];
  nothing: { sentence: string; nearest: Entry[] } | null;
}

const KINDS: Kind[] = ["function", "package", "dataset", "code", "page"];
const lower = (text: string) => text.toLowerCase();

/** The order within a rule: by the name as a dictionary has it, then by kind. */
function byName(a: Entry, b: Entry): number {
  const [x, y] = [lower(a.name), lower(b.name)];
  if (x !== y) return x < y ? -1 : 1;
  if (a.name !== b.name) return a.name < b.name ? -1 : 1;
  return KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind);
}

/**
 * Everything the search looks through, from the index, the codes and the app's own pages.
 * A function two packages have is one entry, as it is one page: its one line the first
 * package's, its R and Stata names those of both.
 */
export function entriesOf(
  index: HelpIndex | null,
  families: CodeFamily[] | null,
  pages: OwnPage[] = [],
): Entry[] {
  const entries: Entry[] = [];
  const functions = new Map<string, Entry>();
  for (const one of index?.packages ?? []) {
    for (const f of one.functions) {
      const held = functions.get(f.name);
      if (held === undefined) {
        const entry: Entry = {
          kind: "function",
          name: f.name,
          words: f.summary,
          to: { kind: "name", name: f.name },
          packages: [one.name],
          foreign: [...f.names],
        };
        functions.set(f.name, entry);
        entries.push(entry);
      } else {
        held.packages.push(one.name);
        for (const name of f.names) {
          if (!held.foreign.some((had) => had.of === name.of && had.name === name.name)) {
            held.foreign.push(name);
          }
        }
      }
    }
    const count = one.functions.length;
    entries.push({
      kind: "package",
      name: one.name,
      words: `${count} ${count === 1 ? "function" : "functions"}`,
      to: { kind: "package", name: one.name },
      packages: [],
      foreign: [],
    });
  }
  for (const d of index?.datasets ?? []) {
    entries.push({
      kind: "dataset",
      name: d.name,
      words: d.summary,
      to: { kind: "name", name: d.name },
      packages: [],
      foreign: [],
    });
  }
  for (const family of families ?? []) {
    for (const one of family.codes) {
      entries.push({
        kind: "code",
        name: one.code,
        words: one.title,
        to: { kind: "code", code: one.code },
        packages: [],
        foreign: [],
      });
    }
  }
  for (const page of pages) {
    entries.push({
      kind: "page",
      name: page.title,
      words: page.words,
      to: page.to,
      packages: [],
      foreign: [],
    });
  }
  return entries;
}

/** What was typed, as it is searched for: without the space around it, a call's brackets, or capitals. */
export function asTyped(typed: string): string {
  return lower(typed.trim().replace(/\(\)?$/, ""));
}

/** The words of a text: runs of letters and digits, in order. */
const wordsOf = (text: string) => text.match(/[\p{L}\p{N}]+/gu) ?? [];

/** The first word of a text that begins with what was typed, or none. */
function wordBeginning(text: string, typed: string): string | null {
  return wordsOf(text).find((word) => lower(word).startsWith(typed)) ?? null;
}

/**
 * The parts of a name after its first: `test` of `t_test`, `normal` of `dist.normal`. A page's
 * title has its words after the first; a code has none.
 */
function partBeginning(entry: Entry, typed: string): string | null {
  if (entry.kind === "code") return null;
  const [, ...rest] = wordsOf(entry.name.replaceAll("_", " "));
  return rest.find((part) => lower(part).startsWith(typed)) ?? null;
}

/** How an R or a Stata name is typed: its name, or as its source writes it, without brackets. */
const spellings = (name: ForeignName) => [lower(name.name), lower(name.shown.replace(/\(\)$/, ""))];

/**
 * The R or Stata name of an entry that is what was typed, or that begins with it; which it
 * is, and where it stands among the entry's names.
 */
function foreignMatch(
  entry: Entry,
  typed: string,
): { name: ForeignName; exact: boolean; at: number } | null {
  let begun: { name: ForeignName; exact: boolean; at: number } | null = null;
  for (const [at, name] of entry.foreign.entries()) {
    const all = spellings(name);
    if (all.includes(typed)) return { name, exact: true, at };
    if (begun === null && all.some((one) => one.startsWith(typed))) {
      begun = { name, exact: false, at };
    }
  }
  return begun;
}

/**
 * How many slips of one key lie between two texts, up to `most`: a letter wrong, missing or
 * added, or two neighbours changed over (Damerau's and Levenshtein's measure). More than
 * `most` is given as `most + 1`.
 */
export function slips(a: string, b: string, most: number): number {
  if (Math.abs(a.length - b.length) > most) return most + 1;
  let before: number[] = [];
  let row = Array.from({ length: b.length + 1 }, (_, at) => at);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    let least = i;
    for (let j = 1; j <= b.length; j++) {
      const same = a[i - 1] === b[j - 1];
      let cost = Math.min(
        (row[j] ?? 0) + 1,
        (next[j - 1] ?? 0) + 1,
        (row[j - 1] ?? 0) + (same ? 0 : 1),
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        cost = Math.min(cost, (before[j - 2] ?? 0) + 1);
      }
      next.push(cost);
      least = Math.min(least, cost);
    }
    if (least > most) return most + 1;
    before = row;
    row = next;
  }
  return Math.min(row[b.length] ?? most + 1, most + 1);
}

/** What is said of an R or a Stata name that matched: "R lm()", "Stata regress". */
const said = (name: ForeignName) => `${name.of} ${name.shown}`;

/**
 * Search the entries for what was typed. Fewer than two letters find nothing and say
 * nothing: the list is not yet open.
 */
export function search(entries: Entry[], asked: string): Found {
  const typed = asTyped(asked);
  if ([...typed].length < LEAST) return { typed, matches: [], nothing: null };

  // Each rule's matches, in the fixed order; an entry is taken by the first rule that finds it.
  const rules: Rule[] = ["exact", "begins", "part", "words", "foreign", "foreign", "code", "slip"];
  const found: Match[][] = rules.map(() => []);
  const forgiving = [...typed].length >= SLIP_FROM;
  /** Where the R or Stata name that matched stands among each match's names. */
  const standing = new Map<Match, number>();
  for (const entry of [...entries].sort(byName)) {
    const name = lower(entry.name);
    const match = (at: number, why: string | null, word: string | null): Match => {
      const made: Match = { ...entry, rule: rules[at] ?? "exact", why, word };
      found[at]?.push(made);
      return made;
    };
    if (name === typed) {
      match(0, null, null);
      continue;
    }
    if (name.startsWith(typed)) {
      // A code begun is found by its own rule, after the R and Stata names.
      match(entry.kind === "code" ? 6 : 1, null, null);
      continue;
    }
    const part = partBeginning(entry, typed);
    if (part !== null) {
      match(2, null, part);
      continue;
    }
    const word = wordBeginning(entry.words, typed);
    if (word !== null) {
      match(3, null, word);
      continue;
    }
    const foreign = foreignMatch(entry, typed);
    if (foreign !== null) {
      standing.set(match(foreign.exact ? 4 : 5, said(foreign.name), null), foreign.at);
      continue;
    }
    if (forgiving && entry.kind !== "page" && slips(name, typed, 1) === 1) {
      match(7, null, null);
    }
  }
  // The functions an R or a Stata name finds: first the one that has it earlier among its names.
  for (const at of [4, 5]) {
    found[at]?.sort((a, b) => (standing.get(a) ?? 0) - (standing.get(b) ?? 0) || byName(a, b));
  }
  // A name typed exactly, the engine's or R's or Stata's, is no slip of the keyboard: nothing
  // one key away is offered beside it (`ttest` is Stata's, not `test` mistyped).
  if ((found[0]?.length ?? 0) > 0 || (found[4]?.length ?? 0) > 0) found[7] = [];
  // The words of one lines give up places to R and Stata names typed exactly (see above).
  const [exact = [], begins = [], part = [], words = [], known = [], ...rest] = found;
  const names = [...exact, ...begins, ...part];
  const kept = Math.min(known.length, KEPT_FOREIGN);
  const room = Math.max(0, MOST - names.length - kept);
  const matches = [...names, ...words.slice(0, room), ...known, ...rest.flat()].slice(0, MOST);
  if (matches.length > 0) return { typed, matches, nothing: null };

  // Nothing: the nearest names, by how few slips away they are, nearer first. A short word
  // is near too many names: one slip for up to four letters, two from the fifth.
  const most = [...typed].length >= 5 ? 2 : 1;
  const nearest = entries
    .filter((entry) => entry.kind !== "page" && entry.kind !== "code")
    .map((entry) => ({ entry, away: slips(lower(entry.name), typed, most) }))
    .filter((one) => one.away <= most)
    .sort((a, b) => a.away - b.away || byName(a.entry, b.entry))
    .slice(0, NEAREST)
    .map((one) => one.entry);
  return {
    typed,
    matches: [],
    nothing: {
      sentence:
        nearest.length > 0
          ? `Nothing here is called or described by “${asked.trim()}”. The nearest names:`
          : `Nothing here is called or described by “${asked.trim()}”. Try a function's name, a word of what it does, an R or a Stata name, or a code.`,
      nearest,
    },
  };
}
