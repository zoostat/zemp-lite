import { describe, expect, it } from "vitest";
import {
  MATHEMATICS,
  fetchingWords,
  fileNamed,
  firstLines,
  isPaper,
  megabytes,
  offeredName,
  pagesWords,
  papersOf,
  shownOf,
  standingWords,
  toldOf,
  wordsOf,
} from "./place";

const file = (path: string) => ({ kind: "file" as const, path });
const folder = (path: string, children: ReturnType<typeof file>[]) => ({
  kind: "folder" as const,
  path,
  children,
});

describe("the papers of a project", () => {
  it("are its Typst sources, wherever they stand, capitals apart", () => {
    expect(isPaper("paper/paper.typ")).toBe(true);
    expect(isPaper("output/table.TYP")).toBe(true);
    expect(isPaper("scripts/main.zeff")).toBe(false);
    expect(isPaper("notes/typ")).toBe(false);
    expect(isPaper("paper.typ.txt")).toBe(false);
  });

  it("are listed with those of the folder paper first, each group by its paths", () => {
    const tree = [
      folder("output", [file("output/table.typ"), file("output/wages.svg")]),
      folder("paper", [file("paper/second.typ"), file("paper/first.typ"), file("paper/notes.md")]),
      folder("scripts", [file("scripts/main.zeff")]),
      file("draft.typ"),
      folder(".zemp", [file(".zemp/kept.typ")]),
    ];
    expect(papersOf(tree)).toEqual([
      "paper/first.typ",
      "paper/second.typ",
      "draft.typ",
      "output/table.typ",
    ]);
    expect(papersOf([])).toEqual([]);
  });
});

describe("a new paper", () => {
  it("is offered the first name the folder paper does not hold", () => {
    expect(offeredName([])).toBe("paper");
    expect(offeredName(["output/paper.typ"])).toBe("paper");
    expect(offeredName(["paper/paper.typ"])).toBe("paper-2");
    expect(offeredName(["paper/Paper.typ", "paper/paper-2.typ"])).toBe("paper-3");
    expect(offeredName(["paper/paper-2.typ"])).toBe("paper");
  });

  it("is a Typst file by its name, whatever was typed", () => {
    expect(fileNamed("returns")).toBe("returns.typ");
    expect(fileNamed("  returns.typ ")).toBe("returns.typ");
    expect(fileNamed("Returns.TYP")).toBe("Returns.TYP");
    expect(fileNamed("draft.v2")).toBe("draft.v2.typ");
    expect(fileNamed("   ")).toBe("");
  });

  it("begins with the line that names the face of its mathematics, and a heading", () => {
    const text = firstLines("returns to schooling.typ");
    const lines = text.split("\n");
    expect(lines[0]).toMatch(/^\/\/ /);
    expect(lines[1]).toBe(MATHEMATICS);
    expect(lines[1]).toBe('#show math.equation: set text(font: "Libertinus Math")');
    expect(lines[2]).toBe("");
    expect(lines[3]).toBe("= Returns to schooling");
    // It ends with a line to write on.
    expect(text.endsWith("\n\n")).toBe(true);
    expect(firstLines("paper.typ")).toContain("\n= Paper\n");
  });
});

describe("what the place shows", () => {
  const papers = ["paper/paper.typ", "output/table.typ"];

  it("with no paper open, or with one that is gone: what Paper is, and the papers there are", () => {
    expect(shownOf(null, papers, () => true)).toEqual({ kind: "none", papers });
    expect(shownOf("paper/gone.typ", papers, () => true)).toEqual({ kind: "none", papers });
    expect(shownOf(null, [], () => false)).toEqual({ kind: "none", papers: [] });
  });

  it("with a paper open: the paper, once its text has been read", () => {
    expect(shownOf("paper/paper.typ", papers, () => false)).toEqual({
      kind: "reading",
      path: "paper/paper.typ",
    });
    expect(shownOf("paper/paper.typ", papers, (path) => path === "paper/paper.typ")).toEqual({
      kind: "paper",
      path: "paper/paper.typ",
    });
  });
});

describe("what the page's pane says of Typst", () => {
  const progress = (received: number) => ({ received, of: 7_531_100, files: 0, among: 10 });

  it("says the size before the fetching, and while it comes with how far it has gone", () => {
    expect(megabytes(7_531_100)).toBe("7.5 MB");
    expect(fetchingWords({ state: "waiting" }, 7_531_100)).toBe(
      "Typst sets the page. It is fetched the first time a paper is opened, 7.5 MB, and this browser keeps it afterwards.",
    );
    expect(fetchingWords({ state: "fetching", progress: null }, 7_531_100)).toBe(
      "Fetching Typst, 7.5 MB: 0%. This browser keeps it afterwards.",
    );
    expect(fetchingWords({ state: "fetching", progress: progress(3_765_550) }, 7_531_100)).toBe(
      "Fetching Typst, 7.5 MB: 50%. This browser keeps it afterwards.",
    );
    // Never 100 before every byte has come.
    expect(fetchingWords({ state: "fetching", progress: progress(7_531_099) }, 7_531_100)).toBe(
      "Fetching Typst, 7.5 MB: 99%. This browser keeps it afterwards.",
    );
  });

  it("says no size where the build gave none, and what happened once the fetching has ended", () => {
    expect(fetchingWords({ state: "fetching", progress: null }, null)).toBe(
      "Fetching Typst: 0%. This browser keeps it afterwards.",
    );
    expect(fetchingWords({ state: "ready", typst: "0.15.1" }, 7_531_100)).toBe(
      "Typst 0.15.1 is ready.",
    );
    expect(fetchingWords({ state: "failed", message: "the host answered 503" }, 7_531_100)).toBe(
      "Typst could not be fetched: the host answered 503",
    );
  });
});

describe("what Typst said, as the app shows it", () => {
  const said = (
    more: Partial<Parameters<typeof toldOf>[0][number]> = {},
  ): Parameters<typeof toldOf>[0][number] => ({
    severity: "error",
    message: "unknown variable: nosuch",
    hints: [],
    file: "paper/paper.typ",
    line: 3,
    column: 2,
    end_line: 3,
    end_column: 8,
    from: 20,
    to: 26,
    ...more,
  });

  it("is Typst's message with its hints, and for a formula without its face the line to begin with", () => {
    expect(wordsOf({ message: "unknown variable: nosuch", hints: [] })).toBe(
      "unknown variable: nosuch",
    );
    expect(wordsOf({ message: "unexpected argument", hints: ["remove it", "or name it"] })).toBe(
      "unexpected argument (remove it) (or name it)",
    );
    expect(
      wordsOf({
        message: "current font is not designed for math",
        hints: ["rendering may be poor"],
      }),
    ).toBe(
      'current font is not designed for math (rendering may be poor). Begin the paper with the line: #show math.equation: set text(font: "Libertinus Math")',
    );
  });

  it("is placed at its line of the paper, or named by the file it is of, each thing once", () => {
    expect(
      toldOf(
        [
          said(),
          said(),
          said({ severity: "warning", message: "unknown font family: arial", line: 1 }),
          said({ file: "paper/tables/fit.typ", line: 2, message: "expected expression" }),
          said({ file: "output/table.typ", line: null, message: "file is not valid utf-8" }),
          said({ file: null, line: null, message: "the document has no pages" }),
        ],
        "paper/paper.typ",
      ),
    ).toEqual([
      { severity: "error", line: 3, where: "line 3", text: "unknown variable: nosuch" },
      { severity: "warning", line: 1, where: "line 1", text: "unknown font family: arial" },
      {
        severity: "error",
        line: null,
        where: "paper/tables/fit.typ, line 2",
        text: "expected expression",
      },
      { severity: "error", line: null, where: "output/table.typ", text: "file is not valid utf-8" },
      { severity: "error", line: null, where: "", text: "the document has no pages" },
    ]);
  });

  it("says above the pages how they stand to the text", () => {
    const error = { severity: "error" as const, line: 3, where: "line 3", text: "x" };
    const warning = { severity: "warning" as const, line: 1, where: "line 1", text: "y" };
    expect(pagesWords(1)).toBe("1 page");
    expect(pagesWords(12)).toBe("12 pages");
    expect(standingWords(true, 2, [])).toBe("");
    expect(standingWords(true, 2, [warning])).toBe("Typst set the paper, with 1 warning.");
    expect(standingWords(true, 2, [warning, warning])).toBe(
      "Typst set the paper, with 2 warnings.",
    );
    expect(standingWords(false, 1, [error, warning])).toBe(
      "Typst refuses the text as it stands (1 error). The page is of the text as it last set, not of the present text.",
    );
    expect(standingWords(false, 3, [error, error])).toBe(
      "Typst refuses the text as it stands (2 errors). The pages are of the text as it last set, not of the present text.",
    );
    expect(standingWords(false, 0, [error])).toBe(
      "Typst refuses the text as it stands (1 error). There is no page yet.",
    );
  });
});
