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
  "summary" | "quartiles" | "distinct" | "values" | "missing" | "least" | "greatest";

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
} {
  const number = /^(Int|Float)\b/.test(variable.type);
  const few = variable.bars?.levels !== undefined;
  return { number, few, moment: !number && !few && /Date|Time/.test(variable.type) };
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
