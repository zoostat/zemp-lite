import { describe, expect, it } from "vitest";
import { coloured } from "./colour";

const SCRIPT = `// Returns to schooling, in the wages panel that ships with Zeff.
let wages = dataset(wages)
    .where(year >= 2012 && age >= 25)
    .add(lwage = log(wage), exper2 = exper^2)
let m1 = wages.reg(lwage ~ educ + exper + exper2, se: robust)
report([m1])
`;

describe("the colours of a script on the landing page", () => {
  it("change no letter of the script", () => {
    expect(
      coloured(SCRIPT)
        .map((piece) => piece.text)
        .join(""),
    ).toBe(SCRIPT);
    expect(coloured("")).toEqual([]);
  });

  it("tell a comment, a keyword, a function, an option, a number and an operator apart", () => {
    const of = (kind: string) =>
      coloured(SCRIPT)
        .filter((piece) => piece.kind === kind)
        .map((piece) => piece.text);
    expect(of("comment")).toEqual([
      "// Returns to schooling, in the wages panel that ships with Zeff.",
    ]);
    expect(of("keyword")).toEqual(["let", "let"]);
    expect(of("function")).toEqual(["dataset", "where", "add", "log", "reg", "report"]);
    expect(of("option")).toEqual(["se:"]);
    expect(of("number")).toEqual(["2012", "25", "2"]);
    expect(of("operator")).toEqual(["=", ">=", "&&", ">=", "=", "=", "^", "=", "~", "+", "+"]);
  });

  it("leaves a name that only holds a keyword, or a digit, as it is", () => {
    expect(coloured("letter = m1").map((piece) => piece.kind)).toEqual([
      "plain",
      "operator",
      "plain",
    ]);
  });
});
