import { describe, expect, it } from "vitest";
import sample from "../../docs/spec/zeff_samples.zeff?raw";
import example from "../../tests/scripts/example/scripts/main.zeff?raw";
import { KEYWORDS, VALUES, tokens, type Kind } from "./zeff";

/** A line as its tokens, each as its text and kind. */
const read = (line: string): [string, Kind][] =>
  tokens(line).map((token) => [line.slice(token.from, token.to), token.kind]);

describe("the reader of Zeff's words", () => {
  it("reads a statement of the example into the seven categories", () => {
    expect(read("let fit = wages.reg(log(wage) ~ educ + exper, cluster: worker) // why")).toEqual([
      ["let", "keyword"],
      ["fit", "variable"],
      ["=", "operator"],
      ["wages", "variable"],
      ["reg", "function"],
      ["log", "function"],
      ["wage", "variable"],
      ["~", "operator"],
      ["educ", "variable"],
      ["+", "operator"],
      ["exper", "variable"],
      ["cluster", "option"],
      [":", "operator"],
      ["worker", "variable"],
      ["// why", "comment"],
    ]);
  });

  it("reads text, raw text and escapes, none of which hides what follows", () => {
    expect(read('export("output/t \\"2\\".docx", size: slide)')).toEqual([
      ["export", "function"],
      ['"output/t \\"2\\".docx"', "text"],
      ["size", "option"],
      [":", "operator"],
      ["slide", "variable"],
    ]);
    expect(read('match(x, r"\\d+") // a "quoted" comment')).toEqual([
      ["match", "keyword"],
      ["x", "variable"],
      ['r"\\d+"', "text"],
      ['// a "quoted" comment', "comment"],
    ]);
    // A text that is not closed runs to the end of its line and no further.
    expect(read('print("open')).toEqual([
      ["print", "function"],
      ['"open', "text"],
    ]);
    expect(read('"http://example.org" // not a comment inside')).toEqual([
      ['"http://example.org"', "text"],
      ["// not a comment inside", "comment"],
    ]);
  });

  it("reads numbers, and the values that are words, as numbers", () => {
    expect(
      read("where(year >= 2_010 & share < 0.5e-3 | x == NA)").filter(
        ([, kind]) => kind === "number",
      ),
    ).toEqual([
      ["2_010", "number"],
      ["0.5e-3", "number"],
      ["NA", "number"],
    ]);
    // A range of whole numbers is two numbers and an operator, not a decimal.
    expect(read("for i in 1..200 {")).toEqual([
      ["for", "keyword"],
      ["i", "variable"],
      ["in", "keyword"],
      ["1", "number"],
      ["..", "operator"],
      ["200", "number"],
    ]);
    expect(read("[true, false, Inf]").map(([, kind]) => kind)).toEqual([
      "number",
      "number",
      "number",
    ]);
  });

  it("takes a name for an option only at the start of an argument or of a field", () => {
    // An interaction of two variables in a formula is not an option.
    expect(read("reg(y ~ x + firm:year, fe: firm)")).toEqual([
      ["reg", "function"],
      ["y", "variable"],
      ["~", "operator"],
      ["x", "variable"],
      ["+", "operator"],
      ["firm", "variable"],
      [":", "operator"],
      ["year", "variable"],
      ["fe", "option"],
      [":", "operator"],
      ["firm", "variable"],
    ]);
    // A reserved word before a colon is an option's name.
    expect(
      read("plot(x: a, type: flip, model: m)").filter(([, kind]) => kind === "option"),
    ).toEqual([
      ["x", "option"],
      ["type", "option"],
      ["model", "option"],
    ]);
    // An argument on a line of its own, and a field of a record.
    expect(read("    by: [year, female],")[0]).toEqual(["by", "option"]);
    expect(
      read("let opts = { se: robust, cluster: firm }").filter(([, kind]) => kind === "option"),
    ).toEqual([
      ["se", "option"],
      ["cluster", "option"],
    ]);
    expect(read("use functions::clean").map(([text]) => text)).toEqual([
      "use",
      "functions",
      "::",
      "clean",
    ]);
  });

  it("reads the operators of formulas, models and graphs whole", () => {
    const operators = (line: string) =>
      read(line)
        .filter(([, kind]) => kind === "operator")
        .map(([text]) => text);
    expect(operators("f1 =~ x1 + x2")).toEqual(["=~", "+"]);
    expect(operators("x1 ~~ x2")).toEqual(["~~"]);
    expect(operators("ab := a * b")).toEqual([":=", "*"]);
    expect(operators("x -> m -> y")).toEqual(["->", "->"]);
    expect(operators("u <-> v")).toEqual(["<->"]);
    expect(operators('["a" => 1]')).toEqual(["=>"]);
    expect(operators("a != b")).toEqual(["!="]);
  });

  it("keeps a name in backticks a variable, whatever it holds", () => {
    expect(read("wages.mean(`case`)")).toEqual([
      ["wages", "variable"],
      ["mean", "function"],
      ["`case`", "variable"],
    ]);
    expect(read("d.mean(`gross sales (total)`)")[2]).toEqual(["`gross sales (total)`", "variable"]);
  });

  for (const [name, script] of [
    ["the sample script of the specification", sample],
    ["the example of the Scratch project", example],
  ] as const) {
    it(`puts every word of ${name} in its category`, () => {
      const counts: Record<string, number> = {};
      for (const line of script.split("\n")) {
        let end = 0;
        for (const token of tokens(line)) {
          const text = line.slice(token.from, token.to);
          counts[token.kind] = (counts[token.kind] ?? 0) + 1;
          // The tokens are in order and do not overlap.
          expect(token.from).toBeGreaterThanOrEqual(end);
          expect(token.to).toBeGreaterThan(token.from);
          end = token.to;
          switch (token.kind) {
            case "comment":
              expect(text.startsWith("//")).toBe(true);
              expect(token.to).toBe(line.length);
              break;
            case "text":
              expect(text).toMatch(/^r?"(?:[^"\\]|\\.)*"$/);
              break;
            case "number":
              expect(VALUES.has(text) || /^\d[\d_]*(\.\d[\d_]*)?([eE][+-]?\d+)?$/.test(text)).toBe(
                true,
              );
              break;
            case "keyword":
              expect(KEYWORDS.has(text)).toBe(true);
              break;
            case "option":
              expect(line[token.to]).toBe(":");
              break;
            case "function":
              expect(line.slice(token.to).trimStart()[0]).toBe("(");
              break;
            case "variable":
              // No reserved word is left uncoloured, unless it is written in backticks.
              expect(KEYWORDS.has(text) || VALUES.has(text)).toBe(false);
              break;
          }
        }
      }
      // Every category occurs in the specification's sample (the short example has no text).
      if (script !== sample) return;
      for (const kind of [
        "keyword",
        "function",
        "option",
        "operator",
        "text",
        "number",
        "comment",
        "variable",
      ]) {
        expect(counts[kind] ?? 0, kind).toBeGreaterThan(0);
      }
    });
  }
});
