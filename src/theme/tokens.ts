// The colours of Zemp Lite: one set of names, with a value in the light theme and one in the
// dark (the owner's design guide, sections 2 and 9; open decision #146). Every colour used
// for text reaches 4.5 to 1 against the grounds it is written on, in both themes (WCAG AA),
// which `tokens.test.ts` computes from this file.

export type ThemeName = "light" | "dark";

/** The names of the colours. A component names a colour by its token, never by its value. */
export const TOKENS = {
  // Grounds.
  page: { light: "#eceae6", dark: "#0d0e12" },
  window: { light: "#ffffff", dark: "#16171b" },
  soft: { light: "#f7f7f5", dark: "#1b1d22" },
  // Rules and the borders of controls.
  line: { light: "#ebebe8", dark: "#24262c" },
  "line-strong": { light: "#dcdcd7", dark: "#2e3037" },
  // Text: main, secondary, small print; `ink-4` is decoration only, never text.
  ink: { light: "#1b1b1f", dark: "#e9e9ec" },
  "ink-2": { light: "#55555c", dark: "#a7a8b0" },
  "ink-3": { light: "#6b6b73", dark: "#8f919c" },
  "ink-4": { light: "#b9b9bf", dark: "#4d4f57" },
  // The logo's violet: focus, the selected row, links; and the one filled button.
  accent: { light: "#5b3a9e", dark: "#b9a4f0" },
  "accent-soft": { light: "#f1ecfa", dark: "#221a38" },
  button: { light: "#5b3a9e", dark: "#b9a4f0" },
  "button-ink": { light: "#ffffff", dark: "#1a1330" },
  // States.
  warning: { light: "#8a5d00", dark: "#e2b552" },
  "warning-soft": { light: "#fbf6e9", dark: "#272215" },
  ok: { light: "#2b7a4b", dark: "#8fdcab" },
  "ok-soft": { light: "#eaf5ee", dark: "#16261c" },
  // An error of the engine. The design guide names no colour for one; this red is the
  // interface's own, held to the same contrast.
  error: { light: "#b3261e", dark: "#f2a39b" },
  "error-soft": { light: "#fcf0ef", dark: "#2a1715" },
  // The logo and its watermark.
  "logo-stroke": { light: "#5b3a9e", dark: "#9b7fdb" },
  "logo-centre": { light: "#2e1a5e", dark: "#e4dbfa" },
  "violet-2": { light: "#5b3a9e", dark: "#b9a4f0" },
  "violet-3": { light: "#9b7fdb", dark: "#7e62c4" },
  // Code, the same wherever code is shown.
  "code-keyword": { light: "#7b4fd6", dark: "#c4a7ff" },
  "code-function": { light: "#1f63c2", dark: "#8cbcff" },
  "code-option": { light: "#a3367c", dark: "#f29ac4" },
  "code-operator": { light: "#0f7b8a", dark: "#6fd3dc" },
  "code-text": { light: "#2b7a4b", dark: "#8fdcab" },
  "code-number": { light: "#a8520c", dark: "#f4b77e" },
  "code-comment": { light: "#6b6b73", dark: "#8f919c" },
  "code-variable": { light: "#3a3a42", dark: "#d4d5da" },
} as const satisfies Record<string, Record<ThemeName, string>>;

export type Token = keyof typeof TOKENS;

/** The text colours, each with the grounds it is written on. */
export const TEXT_ON: Partial<Record<Token, Token[]>> = {
  ink: ["window", "soft", "page", "accent-soft", "warning-soft", "error-soft"],
  "ink-2": ["window", "soft", "page", "warning-soft", "error-soft"],
  "ink-3": ["window", "soft"],
  accent: ["window", "soft", "accent-soft"],
  "button-ink": ["button"],
  warning: ["window", "soft", "warning-soft"],
  ok: ["window", "soft", "ok-soft"],
  error: ["window", "soft", "error-soft"],
  "code-keyword": ["window", "soft"],
  "code-function": ["window", "soft"],
  "code-option": ["window", "soft"],
  "code-operator": ["window", "soft"],
  "code-text": ["window", "soft"],
  "code-number": ["window", "soft"],
  "code-comment": ["window", "soft"],
  "code-variable": ["window", "soft"],
};

/** The style sheet of the tokens: `--window` and the rest, for each theme. */
export function tokensCss(): string {
  const block = (theme: ThemeName) =>
    Object.entries(TOKENS)
      .map(([name, value]) => `  --${name}: ${value[theme]};`)
      .join("\n");
  return (
    `:root {\n${block("light")}\n  color-scheme: light;\n}\n` +
    `:root[data-theme="dark"] {\n${block("dark")}\n  color-scheme: dark;\n}\n`
  );
}

/** The relative luminance of a colour written `#rrggbb` (WCAG 2). */
export function luminance(colour: string): number {
  const channel = (at: number) => {
    const value = parseInt(colour.slice(at, at + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** The contrast of two colours, from 1 to 21 (WCAG 2). */
export function contrast(one: string, other: string): number {
  const [light, dark] = [luminance(one), luminance(other)].sort((a, b) => b - a) as [
    number,
    number,
  ];
  return (light + 0.05) / (dark + 0.05);
}
