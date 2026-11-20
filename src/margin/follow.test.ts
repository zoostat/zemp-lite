import { describe, expect, it } from "vitest";
import { followed, lineMap } from "./follow";

describe("what is unfolded, followed through an edit", () => {
  it("moves down when lines are typed above, and up when lines are taken out", () => {
    expect(followed("print(6)\nprint(1)\n", "// a note\nprint(6)\nprint(1)\n", [1, 2])).toEqual([
      2, 3,
    ]);
    expect(followed("// a\n// b\nx\ny\n", "x\ny\n", [3, 4])).toEqual([1, 2]);
  });

  it("drops a line taken out, and follows a line changed in place", () => {
    expect(followed("a\nb\nc\n", "a\nc\n", [1, 2, 3])).toEqual([1, 2]);
    expect(followed("a\nb\nc\n", "a\nB\nc\n", [2, 3])).toEqual([2, 3]);
    // Changed in place and moved down by a line typed above it.
    expect(followed("a\nb\nc\n", "// x\na\nB\nc\n", [2])).toEqual([3]);
  });

  it("follows lines through an edit in the middle of a long script", () => {
    const before = Array.from({ length: 50 }, (_, at) => `line ${at}`).join("\n");
    const lines = before.split("\n");
    lines.splice(20, 1, "new one", "new two");
    // Line 21 was changed into two lines: it is followed to the first of them.
    expect(followed(before, lines.join("\n"), [10, 30, 21])).toEqual([10, 21, 31]);
  });

  it("maps every line of a text to itself when nothing changed", () => {
    const map = lineMap("a\nb\n", "a\nb\n");
    expect([...map.entries()]).toEqual([
      [1, 1],
      [2, 2],
      [3, 3],
    ]);
    expect(followed("a\n", "a\n", [1])).toEqual([1]);
  });
});
