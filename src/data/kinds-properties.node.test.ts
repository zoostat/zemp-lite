// A test that runs the engine itself, under Node, so it is named `.node.test.ts`; it needs the
// worker built (`npm run build:worker`).
//
// The other kinds of variable in the Variables pane (open decision #209; release 0.3, step
// 21): a text of few values, a variable whose every value differs, an ordered category, and a
// number with the unit its data carries. What the engine says of each column, and what it
// prints for each statement the pane asks, on a kept frame holding each kind
// (`tests/scripts/properties-kinds.json`). With `ZEMP_KEEP_KINDS_PROPERTIES=1` the kept
// prints are written afresh from the engine.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { Variable } from "../engine/messages";
import {
  ALL_DIFFER,
  FEW_TEXT,
  IDENTIFIER,
  allDiffer,
  asked,
  differingLine,
  firstValues,
  kindOf,
  missingCells,
  printedValues,
  tabulated,
  type Key,
} from "./properties";

const root = new URL("../../", import.meta.url);
const at = (path: string) => fileURLToPath(new URL(path, root));
const KEPT = "tests/scripts/properties-kinds.json";

interface Case {
  base: string;
  name: string;
  key: Key;
  statement: string;
  printed: string;
}
interface Project {
  add_file(path: string, bytes: Uint8Array): boolean;
  run(script: string, text: string, deviceBytes: number, width: number): string;
  rows(
    name: string,
    offset: number,
    limit: number,
    sort: string,
    desc: boolean,
    filtered: boolean,
    search: string,
  ): string;
}

function engine(): { Project: new (name: string) => Project } {
  const built = at("worker/pkg/node/zemp_worker.js");
  expect(existsSync(built), "the worker is not built: run `npm run build:worker` first").toBe(true);
  (globalThis as { zeffHost?: unknown }).zeffHost = { event() {}, cancelled: () => false };
  return createRequire(import.meta.url)(built) as { Project: new (name: string) => Project };
}

const kept = JSON.parse(readFileSync(at(KEPT), "utf8")) as { setup: string; cases: Case[] };
const project = new (engine().Project)("kinds");
project.add_file(
  "zeff.toml",
  new TextEncoder().encode('[project]\nname = "kinds"\nzeff = "0.9.0"\nedition = "preview"\n'),
);

function ran(statements: string[]): { printed: string[]; exit: number; stderr: string } {
  const lines = kept.setup.split("\n").length - 1;
  const text = `${kept.setup}${statements.join("\n")}\n`;
  const done = JSON.parse(project.run("scripts/main.zeff", text, 0, 0)) as {
    exit_code: number;
    stderr: string;
    statements: { line: number; stdout: string }[];
  };
  return {
    exit: done.exit_code,
    stderr: done.stderr,
    printed: statements.map(
      (_, index) => done.statements.find((one) => one.line === lines + index + 1)?.stdout ?? "",
    ),
  };
}

function described(frame: string, name: string): Variable {
  const page = JSON.parse(project.rows(frame, 0, 1, "", false, false, "")) as {
    variables: Variable[];
  };
  const found = page.variables.find((one) => one.name === name);
  if (found === undefined) throw new Error(`no variable ${name} in ${frame}`);
  return found;
}

/** The variables the pane is asked of here, each by its frame and its name. */
const CHOSEN: [string, string][] = [
  ["people", "code"],
  ["people", "serial"],
  ["people", "country"],
  ["people", "agree"],
  ["few", "id"],
  ["few", "group"],
  ["wages", "wage"],
];

expect(ran([]).exit).toBe(0);
const variables = new Map(
  CHOSEN.map(([frame, name]) => [`${frame}.${name}`, described(frame, name)]),
);
const statements = CHOSEN.flatMap(([frame, name]) =>
  asked(frame, variables.get(`${frame}.${name}`) as Variable).map((one) => ({
    base: frame,
    name,
    ...one,
  })),
);
const answers = ran(statements.map((one) => one.statement));
const printed = (frame: string, name: string, key: Key) =>
  answers.printed[
    statements.findIndex((one) => one.base === frame && one.name === name && one.key === key)
  ] ?? "";
const variable = (frame: string, name: string) => variables.get(`${frame}.${name}`) as Variable;
/** The line the pane adds for a variable whose every value differs, from the engine's own cells. */
const line = (frame: string, name: string) =>
  differingLine(
    variable(frame, name),
    printedValues(printed(frame, name, "distinct"))[0] ?? "",
    missingCells(printed(frame, name, "missing"))?.present ?? "",
    printedValues(printed(frame, name, "lengthRange")),
  );

describe("the other kinds of variable, in the Variables pane", () => {
  it("are asked statements the engine runs, each print the one kept", () => {
    expect(answers.exit, answers.stderr).toBe(0);
    const now = statements.map((one, index) => ({ ...one, printed: answers.printed[index] ?? "" }));
    if (process.env["ZEMP_KEEP_KINDS_PROPERTIES"] === "1") {
      writeFileSync(at(KEPT), `${JSON.stringify({ setup: kept.setup, cases: now }, null, 1)}\n`);
    } else {
      expect(now).toEqual(kept.cases);
    }
  });

  it("a text of few values is counted as a category is, and is said to be text", () => {
    const country = variable("people", "country");
    expect(country.type).toBe("Str");
    expect(country.bars?.levels).toEqual(["BR", "DE", "FR", "IN"]);
    expect(kindOf(country)).toMatchObject({ few: true, longText: false });
    expect(tabulated(printed("people", "country", "values"))?.rows.map((row) => row.value)).toEqual(
      ["BR", "DE", "FR", "IN"],
    );
    // Its values repeat: it is no identifier, and the pane says what would make it a category.
    expect(line("people", "country")).toBeNull();
    expect(FEW_TEXT).toBe("Text of few values: category() would make it a category.");
  });

  it("a text of few values whose every value differs looks like an identifier, with its first and last value", () => {
    const id = variable("few", "id");
    expect(kindOf(id).few).toBe(true);
    expect(line("few", "id")).toBe(IDENTIFIER);
    expect(firstValues(printed("few", "id", "firstRow"))).toEqual(["a1"]);
    expect(firstValues(printed("few", "id", "lastRow"))).toEqual(["a6"]);
    // The column beside it, whose values repeat, does not.
    expect(line("few", "group")).toBeNull();
  });

  it("a text of many values, all different and all of one length, looks like an identifier too", () => {
    const code = variable("people", "code");
    expect(code.bars).toBeNull();
    expect(kindOf(code).longText).toBe(true);
    expect(printedValues(printed("people", "code", "lengthRange"))).toEqual(["4", "4", "4"]);
    expect(line("people", "code")).toBe(IDENTIFIER);
    // Texts all different and of different lengths are only said to have no two alike.
    expect(differingLine(code, "40", "40", ["12", "47", "200"])).toBe(ALL_DIFFER);
    expect(differingLine(code, "37", "40", ["4", "4", "4"])).toBeNull();
  });

  it("a whole number whose every value differs keeps its statistics, and has the same line", () => {
    const serial = variable("people", "serial");
    expect(serial.type).toBe("Int");
    expect(kindOf(serial)).toMatchObject({ number: true, few: false });
    expect(line("people", "serial")).toBe(IDENTIFIER);
    // A measure with decimals whose values all differ is not called one.
    expect(differingLine({ type: "Float", bars: null }, "40", "40")).toBeNull();
  });

  it("holds two of the engine's cells against each other, commas apart, and counts nothing", () => {
    expect(allDiffer("18412", "18,412")).toBe(true);
    expect(allDiffer("5022", "18,201")).toBe(false);
    expect(allDiffer("1", "1")).toBe(false);
    expect(allDiffer("", "40")).toBe(false);
    expect(allDiffer("NA", "NA")).toBe(false);
  });

  it("an ordered category is said to be ordered, with its levels in their order, never by count", () => {
    const agree = variable("people", "agree");
    expect(agree.type).toBe("Category");
    expect(agree.ordered).toBe(true);
    expect(agree.measure).toBe("ordinal");
    expect(agree.bars?.levels).toEqual(["disagree", "neutral", "agree"]);
    expect(tabulated(printed("people", "agree", "values"))?.rows.map((row) => row.value)).toEqual([
      "disagree",
      "neutral",
      "agree",
    ]);
    // A category whose levels have no order is not said to have one.
    expect(described("wages", "industry").ordered).toBe(false);
    expect(described("wages", "industry").measure).toBe("");
  });

  it("a number carries the unit its data gives it, and one that has none carries none", () => {
    expect(variable("wages", "wage").unit).toBe("USD per hour");
    expect(described("wages", "educ").unit).toBe("years");
    expect(described("wages", "union").unit).toBe("");
    expect(variable("people", "serial").unit).toBe("");
  });
});
