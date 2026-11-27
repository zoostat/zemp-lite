import { describe, expect, it } from "vitest";
import type { Ranged } from "../engine/messages";
import { begin, end, hear, type Run } from "../output/run";
import {
  NOT_SHOWN,
  printSize,
  quoted,
  quotedIn,
  scriptDocument,
  standingLine,
  type Scripted,
} from "./script-document";

const TEXT = [
  "// Wages, briefly.",
  "let w = dataset(wages)",
  "",
  "w.summary([wage])",
  "let p = w.plot(x: wage)",
  "    .histogram(bins: 30)",
  "print(w.n_rows())",
  "",
].join("\n");

const RANGES: Ranged[] = [
  { line: 2, end: 2, kind: "statement" },
  { line: 4, end: 4, kind: "statement" },
  { line: 5, end: 6, kind: "statement" },
  { line: 7, end: 7, kind: "statement" },
];

const TABLE = '  variable   mean   "sd"\n  wage       27.37  12.9\\\n';
const NOTE = "note: 26 rows with NA in wage dropped (line 4)\n";

/** A run of the text: the summary printed and said, the plot printed nothing, the count printed. */
function ran(text = TEXT, ranges = RANGES): Run {
  const run = begin("scripts/main.zeff", text, 0, "9:05");
  hear(run, { type: "ranges", statements: ranges }, 0);
  const statement = (number: number, line: number, printed: string, said: string) => {
    hear(run, { type: "started", statement: number, of: ranges.length, line }, 1);
    if (printed !== "" || said !== "") {
      hear(run, { type: "output", stdout: printed, stderr: said }, 2);
    }
    hear(run, { type: "finished", statement: number, of: ranges.length, line, failed: false }, 3);
  };
  statement(1, 2, "", "");
  statement(2, 4, TABLE, NOTE);
  statement(3, 5, "", "");
  statement(4, 7, "15571\n", "");
  end(
    run,
    {
      exitCode: 0,
      stdout: `${TABLE}15571\n`,
      stderr: NOTE,
      statements: ranges.map((range, index) => ({
        ...range,
        name: [null, null, "p", null][index] ?? null,
        type: ["Frame", "Summary", "Plot", "Int"][index] ?? null,
        ran: true,
        stdout: "",
        stderr: "",
        frame: null,
        memory: null,
        rows: null,
        columns: null,
        length: null,
        n: null,
        error: null,
      })),
      frames: [],
      written: [],
      stopped: false,
    },
    4,
  );
  return run;
}

const input = (more: Partial<Scripted> = {}): Scripted => ({
  project: "Scratch",
  script: "scripts/main.zeff",
  engine: "0.9.0",
  text: TEXT,
  ranges: RANGES,
  run: ran(),
  figures: { 5: "<svg>the histogram</svg>" },
  ...more,
});

describe("a text as Typst holds it in quotes", () => {
  it("keeps every character, and is read back as it was", () => {
    for (const text of [
      "plain",
      'a "quoted" word and a back\\slash',
      "two\nlines\tand a tab\r",
      "wäge → ε ≥ 0 · R²",
      "#let x = $1$ // not code here\n*nor* _this_ <label> @ref",
      "an escape \u001b[0m and a bell \u0007",
      "",
    ]) {
      expect(quotedIn(quoted(text))).toEqual([text]);
    }
    expect(quoted('a "b" \\ c\n')).toBe('"a \\"b\\" \\\\ c\\n"');
  });
});

describe("the size a print is set at", () => {
  it("is the code's where it fits, smaller for a wide table, and never under the smallest", () => {
    expect(printSize("short")).toBe(8.5);
    expect(printSize("x".repeat(80))).toBe(8.5);
    // A table at the engine's own width, 118 characters, fits the page's width.
    const wide = printSize("x".repeat(118));
    expect(wide).toBeLessThan(8.5);
    expect(wide).toBeGreaterThan(6);
    expect(118 * (1233 / 2048) * wide).toBeLessThanOrEqual(595.276 - 2 * 56.693 - 12);
    expect(printSize(`${"x".repeat(30)}\n${"y".repeat(118)}\nz`)).toBe(wide);
    expect(printSize("x".repeat(1000))).toBe(4);
    expect(printSize("")).toBe(8.5);
  });
});

describe("a script with its output, as a document", () => {
  it("heads with the script, the project and the engine, and says how the results stand", () => {
    const made = scriptDocument(input());
    expect(made.main).toBe(".zemp/export/script.typ");
    expect(made.text).toContain('#text(size: 15pt, weight: "bold", "scripts/main.zeff")');
    expect(made.text).toContain(
      '"Project Scratch · Zeff 0.9.0 · 4 statements, each result of the script as it stands"',
    );
    expect(made.text).toContain('#let foot = "scripts/main.zeff · project Scratch · Zeff 0.9.0"');
    expect(made.text).toContain('#set document(title: "scripts/main.zeff")');
    // Nothing of the day, of the hour, or of how long the run took is in it.
    expect(made.text).not.toMatch(/9:05|\bms\b|datetime/);
  });

  it("sets the script as typed, each piece with its first line's number, and each statement's output under it", () => {
    const made = scriptDocument(input());
    const body = made.text.slice(made.text.indexOf("#line(length: 100%"));
    expect(body.split("\n").slice(1)).toEqual([
      '#code(1, "// Wages, briefly.\\nlet w = dataset(wages)")',
      '#code(3, "\\nw.summary([wage])")',
      `#printed(8.5pt, ${quoted(TABLE.replace(/\n$/, ""))})`,
      `#said(8.5pt, ${quoted(NOTE.replace(/\n$/, ""))})`,
      '#code(5, "let p = w.plot(x: wage)\\n    .histogram(bins: 30)")',
      '#figure-of("figure-1.svg")',
      '#code(7, "print(w.n_rows())")',
      '#printed(8.5pt, "15571")',
      "",
    ]);
    // The figure is the engine's own, beside the document.
    expect(made.files).toEqual([
      { path: ".zemp/export/figure-1.svg", text: "<svg>the histogram</svg>" },
    ]);
  });

  it("holds every character of what the engine printed and said, and of the script, as they were", () => {
    const made = scriptDocument(input());
    const held = quotedIn(made.text);
    expect(held).toContain(TABLE.replace(/\n$/, ""));
    expect(held).toContain(NOTE.replace(/\n$/, ""));
    expect(held).toContain("15571");
    // The script's lines, put together again from the pieces of code, are the script.
    const code = [...made.text.matchAll(/^#code\(\d+, ("(?:[^"\\]|\\.)*")\)$/gm)].map(
      (match) => quotedIn(match[1] as string)[0],
    );
    expect(code.join("\n")).toBe(TEXT.replace(/\n$/, ""));
  });

  it("shows no result of an earlier text: an edited statement, those below it, and one added are said to be so", () => {
    // The summary's statement changed since the run; a statement is added at the end.
    const text = TEXT.replace("w.summary([wage])", "w.summary([wage, educ])").replace(
      "print(w.n_rows())\n",
      "print(w.n_rows())\nprint(1)\n",
    );
    const ranges: Ranged[] = [...RANGES, { line: 8, end: 8, kind: "statement" }];
    const made = scriptDocument(input({ text, ranges }));
    const body = made.text.slice(made.text.indexOf("#line(length: 100%")).split("\n").slice(1);
    expect(body).toEqual([
      '#code(1, "// Wages, briefly.\\nlet w = dataset(wages)")',
      '#code(3, "\\nw.summary([wage, educ])")',
      `#not-shown("${NOT_SHOWN.edited}")`,
      '#code(5, "let p = w.plot(x: wage)\\n    .histogram(bins: 30)")',
      `#not-shown("${NOT_SHOWN.stale}")`,
      '#code(7, "print(w.n_rows())")',
      `#not-shown("${NOT_SHOWN.stale}")`,
      '#code(8, "print(1)")',
      `#not-shown("${NOT_SHOWN.unrun}")`,
      "",
    ]);
    // Neither the old table, nor the old count, nor the figure is in the document.
    expect(made.text).not.toContain("27.37");
    expect(made.text).not.toContain("15571");
    expect(made.files).toEqual([]);
    expect(standingLine(input({ text, ranges }))).toBe(
      "5 statements, 4 without a result of the script as it stands",
    );
  });

  it("sets a script that has not run as the script alone, and says so once, at its head", () => {
    const made = scriptDocument(input({ run: null, figures: {} }));
    expect(made.text).toContain('"Project Scratch · Zeff 0.9.0 · 4 statements, not run"');
    expect(made.text).not.toContain("#printed(");
    expect(made.text).not.toContain("#not-shown(");
    expect(made.text).toContain('#code(7, "print(w.n_rows())")');
  });

  it("sets what the engine's check found before the script, and says how a run ended", () => {
    const refused = begin("scripts/main.zeff", TEXT, 0, "9:05");
    hear(refused, { type: "ranges", statements: RANGES }, 0);
    hear(
      refused,
      { type: "output", stdout: "", stderr: "error[Z0102]: unknown name `wagez` (line 4)\n" },
      1,
    );
    end(
      refused,
      {
        exitCode: 1,
        stdout: "",
        stderr: "",
        statements: [],
        frames: [],
        written: [],
        stopped: false,
      },
      2,
    );
    const made = scriptDocument(input({ run: refused, figures: {} }));
    expect(made.text).toContain('#said(8.5pt, "error[Z0102]: unknown name `wagez` (line 4)")');
    expect(made.text).toContain(
      "4 statements, 4 without a result of the script as it stands; the run ended with an error",
    );
  });
});
