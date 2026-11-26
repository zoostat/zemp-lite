// One variable's properties (release 0.2.1, step 7b): the statements asked of the engine, and
// the cells read out of what it prints, held to tests/scripts/properties.json, which the
// released `zeff run` 0.9.0 printed and the worker's native tests run through the engine again.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  asked,
  kindOf,
  missingCells,
  printedValues,
  summaryCells,
  tabulated,
  type Key,
} from "./properties";

interface Case {
  base: string;
  name: string;
  type: string;
  few: boolean;
  key: Key;
  statement: string;
  printed: string;
}

const { cases } = JSON.parse(
  readFileSync(new URL("../../tests/scripts/properties.json", import.meta.url), "utf8"),
) as { cases: Case[] };

/** A variable as the viewer has it: of few values where the engine counted each in its header. */
const variable = (one: Case) => ({
  name: one.name,
  type: one.type,
  bars: one.few ? { counts: [1], levels: ["a"] } : { counts: [1], start: 0, width: 1 },
});
const printed = (base: string, name: string, key: Key) => {
  const found = cases.find((one) => one.base === base && one.name === name && one.key === key);
  if (found === undefined) throw new Error(`no case ${base} ${name} ${key}`);
  return found.printed;
};

describe("what is asked of the engine for a variable", () => {
  it("is, for each kind of variable, the statements the engine was seen to run, in order", () => {
    const groups = new Map<string, Case[]>();
    for (const one of cases) {
      const key = `${one.base} ${one.name}`;
      groups.set(key, [...(groups.get(key) ?? []), one]);
    }
    expect(groups.size).toBe(6);
    for (const group of groups.values()) {
      const first = group[0]!;
      expect(asked(first.base, variable(first))).toEqual(
        group.map((one) => ({ key: one.key, statement: one.statement })),
      );
    }
  });

  it("goes by the variable's type: a number, few values, a date or a time", () => {
    expect(kindOf({ type: "Float", bars: { counts: [1], start: 0, width: 1 } })).toEqual({
      number: true,
      few: false,
      moment: false,
    });
    // A whole number of few values is a number and is counted value by value too.
    expect(kindOf({ type: "Int", bars: { counts: [1], levels: ["8"] } })).toEqual({
      number: true,
      few: true,
      moment: false,
    });
    expect(kindOf({ type: "Category", bars: { counts: [1], levels: ["a"] } })).toEqual({
      number: false,
      few: true,
      moment: false,
    });
    expect(kindOf({ type: "Date", bars: { counts: [1], start: 0, width: 1 } }).moment).toBe(true);
    // A text of many values: neither; it is asked its distinct values and its missing alone.
    expect(kindOf({ type: "Str", bars: null })).toEqual({
      number: false,
      few: false,
      moment: false,
    });
    expect(asked("t", { name: "note", type: "Str", bars: null }).map((one) => one.key)).toEqual([
      "distinct",
      "missing",
    ]);
  });

  it("writes a name that is not an identifier as Zeff reads it", () => {
    const statements = asked("wages", { name: "gross wage", type: "Float", bars: null });
    expect(statements[0]?.statement).toBe("wages.summary([`gross wage`])");
    expect(statements[2]?.statement).toBe('n_distinct(wages["gross wage"])');
  });
});

describe("the cells read out of the engine's prints", () => {
  it("are those of a summary, by the heads of its columns", () => {
    expect(summaryCells(printed("wages", "wage", "summary"))).toEqual({
      N: "18,201",
      missing: "211",
      mean: "27.370",
      sd: "14.027",
      min: "3.530",
      max: "152.390",
    });
    // Kept to a condition, the engine's numbers are that view's.
    expect(summaryCells(printed("wages.where(year == 2015)", "wage", "summary"))?.["N"]).toBe(
      "2,152",
    );
    expect(summaryCells("error[Z0401]: `summary` needs a Bool, Int or Float\n")).toBeNull();
    expect(summaryCells("")).toBeNull();
  });

  it("are the quartiles, the distinct values and a date's ends, each as the engine wrote it", () => {
    expect(printedValues(printed("wages", "wage", "quartiles"))).toEqual([
      "17.56",
      "24.35",
      "33.73",
    ]);
    expect(printedValues(printed("wages", "educ", "quartiles"))).toEqual(["12", "14", "15"]);
    expect(printedValues(printed("wages", "wage", "distinct"))).toEqual(["5022"]);
    expect(printedValues(printed("firms", "founded", "least"))).toEqual(["1950-01-15"]);
    expect(printedValues(printed("firms", "founded", "greatest"))).toEqual(["2009-11-26"]);
  });

  it("are each value's count and share, and the total under the rule", () => {
    const industry = tabulated(printed("wages", "industry", "values"));
    expect(industry?.rows).toHaveLength(12);
    expect(industry?.rows[0]).toEqual({ value: "Agriculture", n: "535", share: "2.9" });
    expect(industry?.rows.at(-1)).toEqual({
      value: "Public administration",
      n: "1,421",
      share: "7.7",
    });
    expect(industry?.total).toEqual({ value: "Total", n: "18,412", share: "100.0" });
    // A whole number with labelled codes: the values as the engine prints them, by their labels.
    expect(tabulated(printed("wages", "union", "values"))?.rows).toEqual([
      { value: "no", n: "12,556", share: "68.2" },
      { value: "yes", n: "5,856", share: "31.8" },
    ]);
    expect(tabulated("17.56\n24.35\n")).toBeNull();
  });

  it("are the rows with a value and without, with the share the engine gives", () => {
    expect(missingCells(printed("wages", "wage", "missing"))).toEqual({
      present: "18,201",
      missing: "211",
      share: "1.1",
      rows: "18,412",
    });
    // No row without a value: none missing, and no share to say.
    expect(missingCells(printed("wages", "educ", "missing"))).toEqual({
      present: "18,412",
      missing: "0",
      share: null,
      rows: "18,412",
    });
    expect(missingCells(printed("wages.where(year == 2015)", "wage", "missing"))).toEqual({
      present: "2,152",
      missing: "27",
      share: "1.2",
      rows: "2,179",
    });
    expect(missingCells("")).toBeNull();
  });
});
