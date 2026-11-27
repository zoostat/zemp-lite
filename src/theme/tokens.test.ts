import { describe, expect, it } from "vitest";
import {
  OLD_COLOURS,
  TEXT_ON,
  TOKENS,
  contrast,
  tokensCss,
  type ThemeName,
  type Token,
} from "./tokens";

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

  it("the accent is the cobalt of open decision #244, in both themes", () => {
    expect(TOKENS.accent).toEqual({ light: "#2448a8", dark: "#9db2ff" });
    expect(TOKENS["accent-hover"]).toEqual({ light: "#2f57c4", dark: "#bccaff" });
    expect(TOKENS["accent-soft"]).toEqual({ light: "#e9eefb", dark: "#181e38" });
    expect(TOKENS["logo-centre"]).toEqual({ light: "#142a66", dark: "#e3e9ff" });
    expect(TOKENS["button-ink"]).toEqual({ light: "#ffffff", dark: "#0d1330" });
    // The logo's strokes and the one filled button are the accent itself.
    expect(TOKENS["logo-stroke"]).toEqual(TOKENS.accent);
    expect(TOKENS.button).toEqual(TOKENS.accent);
    // White on the light accent and the dark accent on the dark page, as #244 reckons them.
    expect(contrast("#ffffff", TOKENS.accent.light)).toBeCloseTo(8.2, 1);
    expect(contrast(TOKENS.accent.dark, TOKENS.page.dark)).toBeCloseTo(9.4, 1);
  });

  it("a function's name is teal and an operator slate grey, so no word of code looks like a control", () => {
    expect(TOKENS["code-function"]).toEqual({ light: "#0f7b8a", dark: "#6fd3dc" });
    expect(TOKENS["code-operator"]).toEqual({ light: "#5d6b82", dark: "#a3adbf" });
  });

  it("holds none of the violet's values, nor the blue that function names had", () => {
    const now = Object.values(TOKENS).flatMap((value) => [value.light, value.dark]);
    for (const old of OLD_COLOURS) expect(now, old).not.toContain(`#${old}`);
  });

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
