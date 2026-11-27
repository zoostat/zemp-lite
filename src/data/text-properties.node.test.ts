// A test that runs the engine itself, under Node, so it is named `.node.test.ts`; it needs the
// worker built (`npm run build:worker`).
//
// A text of many values in the Variables pane (open decision #209; release 0.3, step 20):
// every figure the pane shows is a cell of what the engine prints for a statement the pane
// asks. The statements are run here on a kept frame of reviews (`tests/scripts/
// properties-text.json`), each print is held to the one kept, and each figure is read out of
// it. With `ZEMP_KEEP_TEXT_PROPERTIES=1` the kept prints are written afresh from the engine.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { Variable } from "../engine/messages";
import {
  LENGTHS,
  LENGTHS_FRAME,
  asked,
  emptyCells,
  firstValues,
  kindOf,
  printedValues,
  repeated,
  summaryCells,
  type Key,
} from "./properties";

const root = new URL("../../", import.meta.url);
const at = (path: string) => fileURLToPath(new URL(path, root));
const KEPT = "tests/scripts/properties-text.json";

interface Case {
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
const project = new (engine().Project)("reviews");
project.add_file(
  "zeff.toml",
  new TextEncoder().encode('[project]\nname = "reviews"\nzeff = "0.9.0"\nedition = "preview"\n'),
);

/** The variable as the engine describes it in the frame's header. */
function described(frame: string, name: string): Variable {
  const page = JSON.parse(project.rows(frame, 0, 1, "", false, false, "")) as {
    variables: Variable[];
  };
  const found = page.variables.find((one) => one.name === name);
  if (found === undefined) throw new Error(`no variable ${name} in ${frame}`);
  return found;
}

/** The setup and the statements run, one to a line: what each printed, by its line. */
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

describe("a text of many values, in the Variables pane", () => {
  // The frame is made first, so that the engine can describe its column.
  expect(ran([]).exit).toBe(0);
  const review = described("reviews", "review");
  const statements = asked("reviews", review);
  const answers = ran(statements.map((one) => one.statement));
  const printed = (key: Key) =>
    answers.printed[statements.findIndex((one) => one.key === key)] ?? "";

  it("is a text the engine counts no value of in its header: a long text", () => {
    expect(review.type).toBe("Str");
    expect(review.bars).toBeNull();
    expect(kindOf(review).longText).toBe(true);
    expect(statements.map((one) => one.key)).toEqual([
      "lengthsFrame",
      "lengths",
      "lengthRange",
      "empty",
      "first",
      "repeats",
      "distinct",
      "missing",
    ]);
  });

  it("is asked statements the engine runs, each print the one kept", () => {
    expect(answers.exit, answers.stderr).toBe(0);
    const now = statements.map((one, index) => ({
      key: one.key,
      statement: one.statement,
      printed: answers.printed[index] ?? "",
    }));
    if (process.env["ZEMP_KEEP_TEXT_PROPERTIES"] === "1") {
      writeFileSync(at(KEPT), `${JSON.stringify({ setup: kept.setup, cases: now }, null, 1)}\n`);
    } else {
      expect(now).toEqual(kept.cases);
    }
  });

  it("has its rows with text, of empty text and missing each counted by the engine", () => {
    expect(emptyCells(printed("empty"))).toEqual({ text: "38", empty: "1", missing: "1" });
  });

  it("has the shortest, the median and the longest length as the engine prints them", () => {
    const lengths = summaryCells(printed("lengths"));
    expect(lengths?.["N"]).toBe("39");
    expect(lengths?.["missing"]).toBe("1");
    const range = printedValues(printed("lengthRange"));
    expect(range).toHaveLength(3);
    // The shortest is the empty text; the engine's own minimum and maximum agree with them.
    expect(range[0]).toBe("0");
    expect(Number(lengths?.["min"])).toBe(Number(range[0]));
    expect(Number(lengths?.["max"])).toBe(Number(range[2]));
    expect(Number(range[1])).toBeGreaterThan(Number(range[0]));
    expect(Number(range[2])).toBeGreaterThan(150);
  });

  it("has its first five values in full, an empty one among them", () => {
    const first = firstValues(printed("first"));
    expect(first).toEqual([
      "Good value, arrived on time. (1)",
      "Works as described; the manual is thin. (2)",
      "Too small for me; returned it after a week of trying. (3)",
      "",
      "Fine. (5)",
    ]);
  });

  it("has the values that repeat, each with its count", () => {
    expect(repeated(printed("repeats"))).toEqual([
      { value: "As described.", copies: "3" },
      { value: "No comment.", copies: "2" },
    ]);
  });

  it("has the engine's own histogram of the lengths, in the frame the pane had it make", () => {
    const lengths = described(LENGTHS_FRAME, LENGTHS);
    expect(lengths.type).toBe("Int");
    expect(lengths.missing).toBe(1);
    expect(lengths.bars).not.toBeNull();
    expect(lengths.bars?.levels).toBeUndefined();
    // Every row with a text is in one of its bins.
    expect((lengths.bars?.counts ?? []).reduce((sum, count) => sum + count, 0)).toBe(39);
  });
});

describe("the readers of the engine's prints", () => {
  it("read a frame of one column whatever its values hold, and nothing from another print", () => {
    expect(
      firstValues(
        "frame · 3 rows × 1 variable\n\n      review\n  1   One  with two spaces.\n  2\n  3   NA\n",
      ),
    ).toEqual(["One  with two spaces.", "", "NA"]);
    expect(firstValues("frame · 0 rows × 1 variable\n\n     review\n")).toEqual([]);
    expect(firstValues("summary · reviews\n")).toBeNull();
  });

  it("read no repeated value where the engine prints its heads alone", () => {
    expect(repeated("duplicates · review\n\n  review   copies\n")).toEqual([]);
    expect(
      repeated("duplicates · review\n\n  review        copies\n  No comment.        2\n"),
    ).toEqual([{ value: "No comment.", copies: "2" }]);
    expect(repeated("frame · 1 row × 1 variable\n")).toBeNull();
  });

  it("read the empty rows where there are none, and none from another table", () => {
    expect(
      emptyCells(
        "tabulate · the frame · zemp_empty\n\n  zemp_empty   N       %\n  false        3   100.0\n  ──────────────────────\n  Total        3   100.0\n",
      ),
    ).toEqual({ text: "3", empty: "0", missing: "0" });
    expect(emptyCells("summary · reviews\n")).toBeNull();
  });
});
