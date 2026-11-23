import { describe, expect, it } from "vitest";
import { USING, USING_TITLE, usingFiles, usingPage, usingText } from "./pages";
import { UsingError, headingsOf, piecesOf, readUsing, wordsOf, type Piece } from "./read";

const page = `# Running a script

Run the whole script, or one statement.

Press **Run**, or <kbd>⌘↵</kbd>. The engine's page of \`reg\` is [reg](help:reg).

## What runs

1. The script, from its first statement
   to its last.
2. Or the statement at the cursor.

- A warning has a code, as [W0201](code:W0201).
- A package has a page: [stats](package:stats).

![The Script place after a run, a note beside each statement](script-after-a-run)

## Next

See [Finding help](finding-help).
`;

describe("the reader of the app's own pages", () => {
  it("reads the title, the one line, and the parts in their order", () => {
    const doc = readUsing(page);
    expect(doc.title).toBe("Running a script");
    expect(doc.line).toBe("Run the whole script, or one statement.");
    expect(doc.blocks.map((block) => block.kind)).toEqual([
      "paragraph",
      "heading",
      "list",
      "list",
      "picture",
      "heading",
      "paragraph",
    ]);
    expect(headingsOf(doc)).toEqual([
      { line: 0, title: "What runs" },
      { line: 1, title: "Next" },
    ]);
  });

  it("reads a control, a key, code and a link to a function within a line", () => {
    const [first] = readUsing(page).blocks;
    expect(first).toEqual({
      kind: "paragraph",
      pieces: [
        { kind: "text", text: "Press " },
        { kind: "control", text: "Run" },
        { kind: "text", text: ", or " },
        { kind: "key", text: "⌘↵" },
        { kind: "text", text: ". The engine's page of " },
        { kind: "code", text: "reg" },
        { kind: "text", text: " is " },
        { kind: "link", text: "reg", to: { kind: "name", name: "reg" } },
        { kind: "text", text: "." },
      ],
    });
  });

  it("reads a numbered list and a plain one, an item going on over its indented line", () => {
    const lists = readUsing(page).blocks.filter((block) => block.kind === "list");
    expect(lists.map((list) => list.ordered)).toEqual([true, false]);
    expect(lists[0]?.items.map(wordsOf)).toEqual([
      "The script, from its first statement to its last.",
      "Or the statement at the cursor.",
    ]);
    const links = (lists[1]?.items ?? []).flat().filter((piece) => piece.kind === "link");
    expect(links).toEqual([
      { kind: "link", text: "W0201", to: { kind: "code", code: "W0201" } },
      { kind: "link", text: "stats", to: { kind: "package", name: "stats" } },
    ]);
  });

  it("reads a picture with its words, and a link to another of the pages", () => {
    const doc = readUsing(page);
    expect(doc.blocks.find((block) => block.kind === "picture")).toEqual({
      kind: "picture",
      name: "script-after-a-run",
      words: "The Script place after a run, a note beside each statement",
    });
    const last = doc.blocks.at(-1);
    expect(last?.kind === "paragraph" ? last.pieces[1] : null).toEqual({
      kind: "link",
      text: "Finding help",
      to: { kind: "using", page: "finding-help" },
    });
  });

  it("joins the lines of a paragraph, and reads a page whatever its line ends", () => {
    const doc = readUsing("# T\r\n\r\nOne line\r\nof two.\r\n\r\nA paragraph\r\nof two lines.\r\n");
    expect(doc.line).toBe("One line of two.");
    expect(doc.blocks).toEqual([
      { kind: "paragraph", pieces: [{ kind: "text", text: "A paragraph of two lines." }] },
    ]);
  });

  it("says the line of a slip, and reads nothing of a page that has one", () => {
    const slip = (text: string) => {
      try {
        readUsing(text);
        return "read";
      } catch (error) {
        return error instanceof UsingError ? error.message : "another error";
      }
    };
    expect(slip("No title\n")).toBe("line 1: a page begins with its title, `# Title`");
    expect(slip("# T\n")).toBe("line 2: a page has its one line under its title");
    expect(slip("# T\n\nPress **Run**.\n")).toBe(
      "line 3: the first paragraph is the page's one line, in plain words",
    );
    expect(slip("# T\n\nLine.\n\n### Deep\n")).toBe(
      "line 5: a heading is `## Heading`; a page has one title",
    );
    expect(slip("# T\n\nLine.\n\nPress **Run.\n")).toBe("line 5: `**` is not closed, or not known");
    expect(slip("# T\n\nLine.\n\nA `tick.\n")).toBe(
      "line 5: `` ` `` is not closed, or not known".replace("`` ` ``", "```"),
    );
    expect(slip("# T\n\nLine.\n\nA <kbd>key.\n")).toBe(
      "line 5: `<kbd` is not closed, or not known",
    );
    expect(slip("# T\n\nLine.\n\nSee [here](Not A Page).\n")).toBe(
      "line 5: `](` is not closed, or not known",
    );
    expect(slip("# T\n\nLine.\n\nSee [here](https://example.org).\n")).toBe(
      "line 5: a link goes to `https://example.org`, which is no page",
    );
    expect(slip("# T\n\nLine.\n\n![](a-name)\n")).toBe(
      "line 5: a picture has words for a screen reader",
    );
    expect(slip("# T\n\nLine.\n\n![Words](A Name)\n")).toBe(
      "line 5: a picture is named as `a-name`, not `A Name`",
    );
    expect(slip("# T\n\nLine.\n\n- one\n- two **open\n")).toBe(
      "line 6: `**` is not closed, or not known",
    );
  });

  it("gives the pieces of a line by themselves", () => {
    const kinds = (text: string) => piecesOf(text).map((piece: Piece) => piece.kind);
    expect(kinds("plain words")).toEqual(["text"]);
    expect(kinds("**a** `b` <kbd>c</kbd> [d](e)")).toEqual([
      "control",
      "text",
      "code",
      "text",
      "key",
      "text",
      "link",
    ]);
    expect(piecesOf("")).toEqual([]);
  });
});

describe("the pages of Using Zemp Lite", () => {
  it("are listed with the title and the one line each file begins with", async () => {
    expect(USING_TITLE).toBe("Using Zemp Lite");
    // Every file is listed, and every page listed has its file.
    expect(USING.map((one) => one.slug).sort()).toEqual(usingFiles());
    expect(new Set(USING.map((one) => one.slug)).size).toBe(USING.length);
    for (const one of USING) {
      const text = await usingText(one.slug);
      expect(text, one.slug).not.toBeNull();
      const doc = readUsing(text ?? "");
      expect(doc.title, one.slug).toBe(one.title);
      expect(doc.line, one.slug).toBe(one.line);
      expect(usingPage(one.slug)).toBe(one);
    }
    expect(usingPage("no-such-page")).toBeNull();
    expect(await usingText("no-such-page")).toBeNull();
  });

  it("link only to pages there are, and say what each picture shows", async () => {
    for (const one of USING) {
      const doc = readUsing((await usingText(one.slug)) ?? "");
      const pieces = doc.blocks.flatMap((block) =>
        block.kind === "paragraph" ? block.pieces : block.kind === "list" ? block.items.flat() : [],
      );
      for (const piece of pieces) {
        if (piece.kind === "link" && piece.to.kind === "using") {
          expect(
            usingPage(piece.to.page ?? ""),
            `${one.slug} links to ${piece.to.page}`,
          ).not.toBeNull();
        }
      }
      // A page is short: a reader should see its end without much scrolling.
      expect(doc.blocks.length, one.slug).toBeLessThanOrEqual(24);
      expect(
        doc.blocks.some((block) => block.kind === "heading"),
        one.slug,
      ).toBe(true);
    }
  });
});
