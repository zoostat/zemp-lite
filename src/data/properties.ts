// One variable's properties, in the Variables pane of the Data place (open decision #203; the
// owner's answer of 22 November 2026 on which statistics, by the variable's type). Every number
// is the engine's own: the pane asks the engine a few statements, run after the script as the
// console line runs one, and shows cells of what it prints. Nothing here computes or formats a
// statistic; this file only says which statements are asked, and reads the cells out of the
// engine's prints.
//
// The statements, and what the released engine prints for each, are held in
// `tests/scripts/properties.json`: the unit tests hold this file to them, and the worker's
// native tests run each through the engine.

import type { Variable } from "../engine/messages";
import { named } from "./zeff";

export type Key =
  | "summary"
  | "quartiles"
  | "distinct"
  | "values"
  | "missing"
  | "least"
  | "greatest"
  // A text of many values (open decision #209; release 0.3, step 20).
  | "lengthsFrame"
  | "lengths"
  | "lengthRange"
  | "empty"
  | "first"
  | "repeats";

/**
 * The frame the pane has the engine make for a text of many values, and its column of each
 * value's length in characters (`n_chars`): the engine counts the lengths, and its own
 * histogram of that column is the chart the pane draws.
 */
export const LENGTHS_FRAME = "zemp_lengths";
export const LENGTHS = "zemp_n_chars";

export interface Asked {
  key: Key;
  statement: string;
}

/** What kind of variable it is, for what is asked of it. */
export function kindOf(variable: Pick<Variable, "type" | "bars">): {
  /** An `Int` or a `Float`: N, mean, sd, min, the quartiles and max. */
  number: boolean;
  /** Few values, each counted by the engine in the column's header: each value's count and share. */
  few: boolean;
  /** A date or a time of many values: its least and its greatest. */
  moment: boolean;
  /**
   * A text of many values (a review, a comment, an open answer): the lengths of its values,
   * its empty and missing rows, its first values in full and the values that repeat.
   */
  longText: boolean;
} {
  const number = /^(Int|Float)\b/.test(variable.type);
  const few = variable.bars?.levels !== undefined;
  return {
    number,
    few,
    moment: !number && !few && /Date|Time/.test(variable.type),
    longText: !few && /^Str\b/.test(variable.type),
  };
}

/**
 * The statements asked of the engine for a variable, in order. `base` is the frame as the view
 * shows it: its name, or the name kept to the rows of the view's condition.
 */
export function asked(base: string, variable: Pick<Variable, "name" | "type" | "bars">): Asked[] {
  const v = named(variable.name);
  const kind = kindOf(variable);
  const all: Asked[] = [];
  if (kind.number) {
    all.push({ key: "summary", statement: `${base}.summary([${v}])` });
    all.push({ key: "quartiles", statement: `${base}.quantile(${v}, p: [0.25, 0.5, 0.75])` });
  }
  if (kind.moment) {
    all.push({ key: "least", statement: `${base}.min(${v})` });
    all.push({ key: "greatest", statement: `${base}.max(${v})` });
  }
  if (kind.few) all.push({ key: "values", statement: `${base}.tabulate(${v})` });
  if (kind.longText) {
    // The lengths, counted by the engine's `n_chars` in a frame of the pane's own.
    all.push({
      key: "lengthsFrame",
      statement: `let ${LENGTHS_FRAME} = ${base}.add(${LENGTHS} = n_chars(${v}))`,
    });
    all.push({ key: "lengths", statement: `${LENGTHS_FRAME}.summary([${LENGTHS}])` });
    all.push({
      key: "lengthRange",
      statement: `${LENGTHS_FRAME}.quantile(${LENGTHS}, p: [0, 0.5, 1])`,
    });
    // An empty answer and a missing one are not the same: each is counted.
    all.push({
      key: "empty",
      statement: `${base}.add(zemp_empty = ${v} == "").tabulate(zemp_empty)`,
    });
    all.push({ key: "first", statement: `${base}.head(5).select([${v}])` });
    all.push({ key: "repeats", statement: `${base}.duplicates([${v}])` });
  }
  all.push({
    key: "distinct",
    statement: `n_distinct(${base}[${JSON.stringify(variable.name)}])`,
  });
  // The rows with and without a value, counted and shared by the engine's own `tabulate`.
  all.push({
    key: "missing",
    statement: `${base}.add(zemp_missing = is_missing(${v})).tabulate(zemp_missing)`,
  });
  return all;
}

/** The cells of a line of a printed table: its columns stand two spaces or more apart. */
const cells = (line: string) => line.trim().split(/\s{2,}/);
const written = (printed: string) => printed.split("\n").filter((line) => line.trim() !== "");

/**
 * The cells of a `summary` of one variable, by the heads of its columns (`N`, `missing`,
 * `mean`, `sd`, `min`, `max`); `null` where the print is not such a table.
 */
export function summaryCells(printed: string): Record<string, string> | null {
  const lines = written(printed);
  const head = lines.findIndex((line) => cells(line)[0] === "variable");
  const row = lines[head + 1];
  if (head < 0 || row === undefined) return null;
  const heads = cells(lines[head] ?? "");
  const values = cells(row);
  if (values.length !== heads.length) return null;
  return Object.fromEntries(heads.slice(1).map((name, at) => [name, values[at + 1] ?? ""]));
}

/** The lines of a print of single values, one to a line (`quantile`, `n_distinct`, `min`, `max`). */
export function printedValues(printed: string): string[] {
  return written(printed).map((line) => line.trim());
}

export interface Counted {
  value: string;
  n: string;
  share: string;
}

/**
 * The rows of a one-way `tabulate`: each value with its count and its percentage, and the
 * total under the rule; `null` where the print is not such a table.
 */
export function tabulated(printed: string): { rows: Counted[]; total: Counted | null } | null {
  const lines = written(printed);
  const head = lines.findIndex((line) => {
    const found = cells(line);
    return found.length === 3 && found[1] === "N" && found[2] === "%";
  });
  if (head < 0) return null;
  const rows: Counted[] = [];
  let total: Counted | null = null;
  let under = false;
  for (const line of lines.slice(head + 1)) {
    if (line.trim().startsWith("─")) {
      under = true;
      continue;
    }
    const found = cells(line);
    if (found.length !== 3) return null;
    const one = { value: found[0] ?? "", n: found[1] ?? "", share: found[2] ?? "" };
    if (under) total = one;
    else rows.push(one);
  }
  return { rows, total };
}

/**
 * The rows with a value and without, from the engine's count of `is_missing`: how many have
 * one, how many have none and what share of the rows that is, and how many rows there are.
 */
export function missingCells(
  printed: string,
): { present: string; missing: string; share: string | null; rows: string } | null {
  const table = tabulated(printed);
  if (table === null || table.total === null) return null;
  const none = table.rows.find((row) => row.value === "true");
  const some = table.rows.find((row) => row.value === "false");
  return {
    present: some?.n ?? "0",
    missing: none?.n ?? "0",
    share: none?.share ?? null,
    rows: table.total.n,
  };
}

/**
 * The rows of a text with something in it, of empty text and missing, from the engine's count
 * of `v == ""`: `false` is a text, `true` an empty one, `NA` a missing one. `null` where the
 * print is not such a table.
 */
export function emptyCells(
  printed: string,
): { text: string; empty: string; missing: string } | null {
  const table = tabulated(printed);
  if (table === null) return null;
  const of = (value: string) => table.rows.find((row) => row.value === value)?.n ?? "0";
  return { text: of("false"), empty: of("true"), missing: of("NA") };
}

/**
 * The values of a frame of one column as the engine prints it (`head(5).select([v])`), each
 * in full: what stands after the row's number, however many spaces the value itself holds.
 * An empty text is an empty value. `null` where the print is not such a frame.
 */
export function firstValues(printed: string): string[] | null {
  const lines = printed.split("\n");
  if (!/^frame · /.test(lines[0] ?? "")) return null;
  const found: string[] = [];
  for (const line of lines.slice(1)) {
    const row = /^\s*\d[\d,]*(?: {3}(.*))?$/.exec(line);
    if (row !== null) found.push(row[1] ?? "");
  }
  return found;
}

/**
 * The values that repeat, each with how many rows hold it, from the engine's `duplicates`:
 * none where it prints its heads alone. `null` where the print is not such a table.
 */
export function repeated(printed: string): { value: string; copies: string }[] | null {
  const lines = written(printed);
  const head = lines.findIndex((line) => /\s{2,}copies$/.test(line));
  if (head < 0) return null;
  const found: { value: string; copies: string }[] = [];
  for (const line of lines.slice(head + 1)) {
    const row = /^ {2}(.*?) {2,}(\d[\d,]*)$/.exec(line);
    if (row === null) return null;
    found.push({ value: row[1] ?? "", copies: row[2] ?? "" });
  }
  return found;
}
