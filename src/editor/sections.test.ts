import { describe, expect, it } from "vitest";
import { sectionAt, sectionsOf } from "./sections";

const SCRIPT = [
  "// Returns to schooling.", // 1
  "", // 2
  "// # Sample", // 3
  "let wages = dataset(wages)", // 4
  "    .where(year >= 2012)", // 5
  "", // 6
  "// # Models", // 7
  "// ## Pooled", // 8
  "let m1 = wages.reg(lwage ~ educ)", // 9
  "// ## Fixed effects", // 10
  "let m3 = wages.reg(lwage ~ educ, fe: year)", // 11
  "", // 12
  "// # Figure", // 13
  "let shape = wages.plot(x: lwage).histogram()", // 14
  "",
].join("\n");

describe("the sections of a script", () => {
  it("are the comments written as headings, each with its line, level, title and last line", () => {
    expect(sectionsOf(SCRIPT)).toEqual([
      { line: 3, level: 1, title: "Sample", end: 6 },
      { line: 7, level: 1, title: "Models", end: 12 },
      { line: 8, level: 2, title: "Pooled", end: 9 },
      { line: 10, level: 2, title: "Fixed effects", end: 12 },
      { line: 13, level: 1, title: "Figure", end: 14 },
    ]);
  });

  it("are none in a script without headings, and none in an empty one", () => {
    expect(sectionsOf("// a comment\nprint(1)\n")).toEqual([]);
    expect(sectionsOf("")).toEqual([]);
  });

  it("take a heading whatever the spaces round its marks, and keep the title as written", () => {
    expect(sectionsOf("//# Data\n//  ##   Cleaning the wages  \n").map((one) => one.title)).toEqual(
      ["Data", "Cleaning the wages"],
    );
    expect(sectionsOf("// # Models: pooled, then fixed effects (#2)\n")[0]?.title).toBe(
      "Models: pooled, then fixed effects (#2)",
    );
  });

  it("pass over what is not a heading", () => {
    for (const line of [
      "// #", // no title
      "// #Data", // no space after the mark
      "// ### Deeper", // three marks
      "  // # Indented", // inside a block
      "print(1) // # After code", // not alone on its line
      "# Data", // not a comment
      "/// # Data", // another kind of comment
      "// Data #", // the mark at the end
    ]) {
      expect(sectionsOf(`${line}\nprint(1)\n`), line).toEqual([]);
    }
  });

  it("pass over a heading-like line inside a statement the engine reads over several lines", () => {
    const text = [
      "// # Real",
      "let fit = wages.reg(lwage ~ educ,",
      "// # Not a section",
      "    se: robust)",
      "print(fit)",
    ].join("\n");
    // Without the engine's reading the text alone is gone by.
    expect(sectionsOf(text).map((one) => one.title)).toEqual(["Real", "Not a section"]);
    const statements = [
      { line: 2, end: 4, kind: "statement" as const },
      { line: 5, end: 5, kind: "statement" as const },
    ];
    expect(sectionsOf(text, statements)).toEqual([{ line: 1, level: 1, title: "Real", end: 5 }]);
  });

  it("end a subsection at the next heading of any level, and a section at the next section", () => {
    const sections = sectionsOf(
      "// ## Loose\nprint(1)\n// # A\n// ## B\nprint(2)\n// ## C\nprint(3)",
    );
    expect(sections.map((one) => [one.title, one.line, one.end])).toEqual([
      ["Loose", 1, 2],
      ["A", 3, 7],
      ["B", 4, 5],
      ["C", 6, 7],
    ]);
  });

  it("say which section a line is in, the subsection before the section that holds it", () => {
    const sections = sectionsOf(SCRIPT);
    expect(sectionAt(sections, 1)).toBeNull();
    expect(sectionAt(sections, 4)?.title).toBe("Sample");
    expect(sectionAt(sections, 7)?.title).toBe("Models");
    expect(sectionAt(sections, 9)?.title).toBe("Pooled");
    expect(sectionAt(sections, 12)?.title).toBe("Fixed effects");
    expect(sectionAt(sections, 14)?.title).toBe("Figure");
  });
});
