import { describe, expect, it } from "vitest";
import { comesFrom, exportsOf, lackingWords, listed, writersOf } from "./exports";

describe("which scripts a paper's files come from", () => {
  it("reads the paths a script exports to, after a value or with the value first, each once", () => {
    expect(
      exportsOf(
        [
          "let m = wages.reg(lwage ~ educ)",
          'report([m]).export("output/fit.typ")',
          'wages.scatter(educ, lwage).export("output/wages.svg", size: one_column)',
          'export(m, "output/fit.docx")',
          "report([m])",
          "    .export(",
          '        "./output/second.typ"',
          "    )",
          'report([m]).export("output/fit.typ")',
        ].join("\n"),
      ),
    ).toEqual(["output/fit.typ", "output/wages.svg", "output/fit.docx", "output/second.typ"]);
  });

  it("passes over a comment, a text that only names a path, and a path that is not written out", () => {
    expect(
      exportsOf(
        [
          '// m.export("output/old.typ")',
          'print("see output/fit.typ, made by export")',
          'let note = "m.export(\\"output/quoted.typ\\")" // export("output/x.typ")',
          "m.export(target)",
          'm.export("output/kept.typ") // the one that is written',
          'let address = "https://example.org/a//b"',
        ].join("\n"),
      ),
    ).toEqual(["output/kept.typ"]);
    expect(exportsOf("")).toEqual([]);
  });

  it("names the scripts that write the files a paper uses, in the order of their paths", () => {
    const scripts = [
      {
        path: "scripts/second.zeff",
        text: 'p.export("output/wages.svg")\nq.export("output/other.svg")',
      },
      {
        path: "scripts/main.zeff",
        text: 't.export("output/fit.typ")\np.export("output/wages.svg")',
      },
      { path: "scripts/none.zeff", text: "print(1)" },
    ];
    expect(writersOf(scripts, ["output/wages.svg", "./output/fit.typ", "zeff.toml"])).toEqual([
      { script: "scripts/main.zeff", files: ["output/fit.typ", "output/wages.svg"] },
      { script: "scripts/second.zeff", files: ["output/wages.svg"] },
    ]);
    expect(writersOf(scripts, ["paper/table.typ"])).toEqual([]);
    expect(writersOf([], ["output/fit.typ"])).toEqual([]);
  });

  it("says of each file a paper lacks which script writes it, and nothing of one no script writes", () => {
    const writers = [
      { script: "scripts/main.zeff", files: ["output/fit.typ", "output/wages.svg"] },
      { script: "scripts/second.zeff", files: ["output/other.svg"] },
    ];
    expect(lackingWords(["output/fit.typ"], writers)).toEqual([
      "output/fit.typ is written by scripts/main.zeff: press Run to make it.",
    ]);
    expect(
      lackingWords(
        ["output/fit.typ", "output/wages.svg", "output/other.svg", "data/x.csv"],
        writers,
      ),
    ).toEqual([
      "output/fit.typ and output/wages.svg are written by scripts/main.zeff: press Run to make them.",
      "output/other.svg is written by scripts/second.zeff: press Run to make it.",
    ]);
    expect(lackingWords([], writers)).toEqual([]);
    expect(lackingWords(["data/x.csv"], writers)).toEqual([]);
    expect(listed(["a", "b", "c"])).toBe("a, b and c");
  });
});

describe("where a paper's tables and figures come from, in the row of the Paper place", () => {
  it("is said in a few words: what they are, and the scripts that write them", () => {
    expect(
      comesFrom([
        { script: "scripts/paper.zeff", files: ["output/returns.typ", "output/schooling.svg"] },
      ]),
    ).toBe("its table and figure from scripts/paper.zeff");
    expect(
      comesFrom([
        { script: "scripts/a.zeff", files: ["output/one.typ", "output/two.typ"] },
        { script: "scripts/b.zeff", files: ["output/shape.png", "output/fit.pdf"] },
      ]),
    ).toBe("its tables and figures from scripts/a.zeff and scripts/b.zeff");
    expect(comesFrom([{ script: "scripts/a.zeff", files: ["output/one.typ"] }])).toBe(
      "its table from scripts/a.zeff",
    );
    expect(
      comesFrom([
        { script: "scripts/a.zeff", files: ["output/s.svg"] },
        { script: "scripts/b.zeff", files: ["output/t.svg"] },
        { script: "scripts/c.zeff", files: ["output/u.svg"] },
      ]),
    ).toBe("its figures from scripts/a.zeff, scripts/b.zeff and scripts/c.zeff");
  });

  it("counts a file two scripts write once, and says nothing where no script writes any", () => {
    expect(
      comesFrom([
        { script: "scripts/a.zeff", files: ["output/one.typ"] },
        { script: "scripts/b.zeff", files: ["output/one.typ"] },
      ]),
    ).toBe("its table from scripts/a.zeff and scripts/b.zeff");
    expect(comesFrom([])).toBe("");
    expect(comesFrom([{ script: "scripts/a.zeff", files: [] }])).toBe("");
  });
});
