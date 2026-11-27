import { describe, expect, it } from "vitest";
import {
  MATHEMATICS,
  fetchingWords,
  fileNamed,
  firstLines,
  isPaper,
  megabytes,
  offeredName,
  papersOf,
  shownOf,
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
