import { describe, expect, it } from "vitest";
import { copy, start, tokens, type State } from "./typst";

/** The tokens of each line of a text, as `kind:text`, the lines read one after another. */
function read(text: string, state: State = start()): string[][] {
  return text
    .split("\n")
    .map((line) => tokens(line, state).map((one) => `${one.kind}:${line.slice(one.from, one.to)}`));
}

const one = (line: string) => read(line)[0];

describe("the reader of Typst, for the colours of a paper", () => {
  it("reads a heading, strong and emphasised text, raw text, a label and a reference", () => {
    expect(one("= Returns to schooling")).toEqual(["heading:= Returns to schooling"]);
    expect(one("== A part <part>")).toEqual(["heading:== A part <part>"]);
    expect(one("With *weight* and _stress_, and `lm(y ~ x)`.")).toEqual([
      "strong:*",
      "strong:weight",
      "strong:*",
      "emphasis:_",
      "emphasis:stress",
      "emphasis:_",
      "raw:`lm(y ~ x)`",
    ]);
    expect(one("See @fig-wages and the part <part>.")).toEqual([
      "label:@fig-wages",
      "label:<part>",
    ]);
    // A sign that is no heading, an underscore inside a word, and a comparison are plain text.
    expect(one("a = b, snake_case, and 1 < 2 > 0")).toEqual([]);
  });

  it("reads the items of a list, a term, an escape and an address", () => {
    expect(one("- An item")).toEqual(["marker:-"]);
    expect(one("  + A numbered item")).toEqual(["marker:+"]);
    expect(one("12. The twelfth")).toEqual(["marker:12."]);
    expect(one("/ Term: what it is")).toEqual(["marker:/"]);
    expect(one("Not \\*strong\\* and 5 \\$")).toEqual(["escape:\\*", "escape:\\*", "escape:\\$"]);
    // The two slashes of an address begin no comment.
    expect(one("At https://example.org/a//b. // said once")).toEqual([
      "label:https://example.org/a//b.",
      "comment:// said once",
    ]);
  });

  it("reads the code a hash begins: keywords, functions, named arguments, texts and numbers", () => {
    expect(one('#show math.equation: set text(font: "Libertinus Math")')).toEqual([
      "operator:#",
      "keyword:show",
      "variable:math",
      "operator:.",
      "variable:equation",
      "operator::",
      "keyword:set",
      "function:text",
      "operator:(",
      "option:font",
      "operator::",
      'text:"Libertinus Math"',
      "operator:)",
    ]);
    expect(one("#let total = 3 + calc.round(2.5em) // why")).toEqual([
      "operator:#",
      "keyword:let",
      "variable:total",
      "operator:=",
      "number:3",
      "operator:+",
      "variable:calc",
      "operator:.",
      "function:round",
      "operator:(",
      "number:2.5em",
      "operator:)",
      "comment:// why",
    ]);
    expect(one("#set page(width: 80%, fill: none)")).toEqual([
      "operator:#",
      "keyword:set",
      "function:page",
      "operator:(",
      "option:width",
      "operator::",
      "number:80%",
      "operator:,",
      "option:fill",
      "operator::",
      "number:none",
      "operator:)",
    ]);
    // A name in a sentence, with its field, and the sentence after it.
    expect(one("The total is #total.value, as said.")).toEqual([
      "operator:#",
      "variable:total",
      "operator:.",
      "variable:value",
    ]);
  });

  it("reads markup inside the square brackets of code, and code again after them", () => {
    expect(one("#if total > 5 [*Large*] else [Small]")).toEqual([
      "operator:#",
      "keyword:if",
      "variable:total",
      "operator:>",
      "number:5",
      "operator:[",
      "strong:*",
      "strong:Large",
      "strong:*",
      "operator:]",
      "keyword:else",
      "operator:[",
      "operator:]",
    ]);
    expect(one("#table.header[A][B] and text")).toEqual([
      "operator:#",
      "variable:table",
      "operator:.",
      "function:header",
      "operator:[",
      "operator:]",
      "operator:[",
      "operator:]",
    ]);
    // A square bracket in a sentence is a part of the sentence.
    expect(one("In brackets [as here], nothing.")).toEqual([]);
  });

  it("carries a call over its lines, and ends it where its bracket closes", () => {
    expect(
      read(
        '#figure(\n  image("output/wages.svg", width: 80%),\n  caption: [Wages by _schooling_],\n) <wages>\nAfter it.',
      ),
    ).toEqual([
      ["operator:#", "function:figure", "operator:("],
      [
        "function:image",
        "operator:(",
        'text:"output/wages.svg"',
        "operator:,",
        "option:width",
        "operator::",
        "number:80%",
        "operator:)",
        "operator:,",
      ],
      [
        "option:caption",
        "operator::",
        "operator:[",
        "emphasis:_",
        "emphasis:schooling",
        "emphasis:_",
        "operator:]",
        "operator:,",
      ],
      ["operator:)", "label:<wages>"],
      [],
    ]);
  });

  it("carries a block comment, a block of raw text and a formula over their lines", () => {
    expect(read("Before /* a\nblock /* within */ still\ncomment */ after *it*")).toEqual([
      ["comment:/* a"],
      ["comment:block /* within */ still"],
      ["comment:comment */", "strong:*", "strong:it", "strong:*"],
    ]);
    expect(read("```r\nlm(y ~ x) # *not* strong\n``` and _after_")).toEqual([
      ["raw:```r"],
      ["raw:lm(y ~ x) # *not* strong"],
      ["raw:```", "emphasis:_", "emphasis:after", "emphasis:_"],
    ]);
    expect(
      read('$ integral_0^1 f(x) dif x\n  = alpha / beta "if" #total $ and $x^2$ after'),
    ).toEqual([
      ["math:$", "math: integral_0^1 f(x) dif x"],
      [
        "math:= alpha / beta ",
        'text:"if"',
        "math: ",
        "operator:#",
        "variable:total",
        "math: ",
        "math:$",
        "math:$",
        "math:x^2",
        "math:$",
      ],
    ]);
  });

  it("ends strong and emphasised text at the end of a paragraph, however it was left", () => {
    const state = start();
    expect(read("An *unclosed weight\nruns on", state)).toEqual([
      ["strong:*", "strong:unclosed weight"],
      ["strong:runs on"],
    ]);
    expect(state.strong).toBe(true);
    expect(read("\nA new paragraph.", state)).toEqual([[], []]);
    expect(state.strong).toBe(false);
  });

  it("leaves the state it was given as it was where a copy is read from", () => {
    const state = start();
    tokens("#figure(", state);
    const kept = copy(state);
    tokens(")", state);
    expect(kept.frames).toEqual(["paren"]);
    expect(state.frames).toEqual([]);
  });

  it("gives every token inside its line, in order, none over another", () => {
    const state = start();
    for (const line of [
      "#let f(x) = { x + 1 }; text",
      "$ a \\",
      "*_`",
      "#",
      "#(1, 2).at(0)",
      '#"text"',
      "]]] )) }} $$ ``",
      "/* /* */",
      "*/ */ */",
      "= ",
      "<>@ @a <a",
    ]) {
      let at = 0;
      for (const token of tokens(line, state)) {
        expect(token.from).toBeGreaterThanOrEqual(at);
        expect(token.to).toBeGreaterThan(token.from);
        expect(token.to).toBeLessThanOrEqual(line.length);
        at = token.to;
      }
    }
  });
});
