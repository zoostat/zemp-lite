import { describe, expect, it } from "vitest";
import { TEXT_ON, TOKENS, contrast, tokensCss, type ThemeName, type Token } from "./tokens";

describe("the colours", () => {
  it("measures contrast as WCAG does", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrast("#ffffff", "#ffffff")).toBe(1);
    expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
  });

  for (const theme of ["light", "dark"] as ThemeName[]) {
    it(`every text colour reaches 4.5 to 1 against its grounds, in the ${theme} theme`, () => {
      const short: string[] = [];
      for (const [text, grounds] of Object.entries(TEXT_ON) as [Token, Token[]][]) {
        for (const ground of grounds) {
          const ratio = contrast(TOKENS[text][theme], TOKENS[ground][theme]);
          if (ratio < 4.5) short.push(`${text} on ${ground}: ${ratio.toFixed(2)}`);
        }
      }
      expect(short).toEqual([]);
    });
  }

  it("every token is a colour of six hexadecimal digits in both themes", () => {
    for (const value of Object.values(TOKENS)) {
      expect(value.light).toMatch(/^#[0-9a-f]{6}$/);
      expect(value.dark).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("writes the tokens as a style sheet, the dark theme as a second set of the same names", () => {
    const css = tokensCss();
    expect(css).toContain(":root {\n  --page: #eceae6;");
    expect(css).toContain(':root[data-theme="dark"] {\n  --page: #0d0e12;');
    expect(css.match(/--window:/g)).toHaveLength(2);
  });
});
