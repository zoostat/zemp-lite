import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

// A test that reads files, so it is named `.node.test.ts` and type-checked with the tools.
// Each shipped font is the file its publisher gave, to the byte (`fonts/SOURCE.md`).
const FONTS: Record<string, string> = {
  "AtkinsonHyperlegibleNext-wght.woff2":
    "abde1ad5cf78b9ac575ef90d991f2e9101eb0b3b6668bde9a00e2e1e27d99afd",
  "AtkinsonHyperlegibleNext-Italic-wght.woff2":
    "34491c5a87f711d314637962f69267d28c7df3ed498082c990cdfbbc02ebf3f2",
  "JetBrainsMono-Regular.woff2": "a9cb1cd82332b23a47e3a1239d25d13c86d16c4220695e34b243effa999f45f2",
  "JetBrainsMono-Medium.woff2": "086c48dfbea9ddaff1320f7e09399b8e2924e88ce67453721255db3bdbb5a353",
  "JetBrainsMono-Italic.woff2": "cb6a1b246318ed3885d7dffa14a2609297fe80e9b8e500bea33b52fa312a36a4",
  "Newsreader-opsz-wght.woff2": "1faa3380ac0e87e057b180e03fd94bd708a612afb67d2590677be4508909fae9",
};

describe("the shipped fonts", () => {
  for (const [file, digest] of Object.entries(FONTS)) {
    it(`${file} is its publisher's file`, () => {
      const bytes = readFileSync(new URL(`./fonts/${file}`, import.meta.url));
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(digest);
    });
  }

  it("each family carries its licence", () => {
    for (const family of ["AtkinsonHyperlegibleNext", "JetBrainsMono", "Newsreader"]) {
      const licence = readFileSync(new URL(`./fonts/${family}-OFL.txt`, import.meta.url), "utf8");
      expect(licence).toContain("SIL Open Font License, Version 1.1");
    }
  });
});

// Every screen of Zemp Lite is set in the three shipped fonts (the design guide, section 3;
// open decision #222): a rule that names a font the app does not ship is drawn in whatever the
// reader's computer has. Found at 0.2.4: one rule of a list page of Help named a font that is
// not shipped. So every place a source names a font is read here.
describe("the fonts the app's rules name", () => {
  const SHIPPED = ["Atkinson Hyperlegible Next", "JetBrains Mono", "Newsreader"];
  // What a rule may name after a shipped font, for the instant before the font has come:
  // the computer's own faces of the same kind, and the kinds themselves.
  const AFTER = [
    "system-ui",
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "sans-serif",
    "serif",
    "Georgia",
    "monospace",
    "ui-monospace",
    "Menlo",
    "Consolas",
  ];
  const root = new URL("../../", import.meta.url);

  /** Every source of a screen: the app's, and the pages that are no part of its build. */
  function sources(folder: string): string[] {
    return readdirSync(new URL(folder, root), { withFileTypes: true }).flatMap((entry) => {
      const at = `${folder}${entry.name}`;
      if (entry.isDirectory()) return sources(`${at}/`);
      return /\.(svelte|css|html|ts)$/.test(entry.name) && !/\.test\.ts$/.test(entry.name)
        ? [at]
        : [];
    });
  }

  /** The families a declaration names, in order; the first part of a `font` carries its size too. */
  function families(value: string): string[] {
    return value
      .replace(/\([^()]*\)/g, "")
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part !== "")
      .map((part) => {
        const quoted = /["']([^"']+)["']$/.exec(part);
        if (quoted !== null) return quoted[1] as string;
        return part.split(/\s+/).at(-1) as string;
      });
  }

  it("are the three shipped, each followed only by the computer's own faces of its kind", () => {
    const files = [...sources("src/"), ...sources("public/"), "index.html", "app/index.html"];
    const named: { file: string; value: string; families: string[] }[] = [];
    for (const file of files) {
      const text = readFileSync(new URL(file, root), "utf8");
      // In a style sheet: `font-family: …;` and the shorthand `font: …;`.
      for (const found of text.matchAll(/(?:^|[\s;{])font(?:-family)?\s*:\s*([^;{}]+);/g)) {
        // Not a sentence of a comment that happens to say "font:".
        const line = text.slice(text.lastIndexOf("\n", found.index + 1) + 1, found.index + 1);
        if (/\/\/|\/\*|^\s*\*/.test(line) || (found[1] as string).includes("//")) continue;
        named.push({ file, value: (found[1] as string).trim(), families: [] });
      }
      // In a theme written as an object (the editor's): `fontFamily: '…'`.
      for (const found of text.matchAll(/fontFamily\s*:\s*(['"`])(.+?)\1\s*,/g)) {
        named.push({ file, value: (found[2] as string).trim(), families: [] });
      }
    }
    const read = named
      .filter(({ value }) => !/^(inherit|var\()/.test(value))
      .map((one) => ({ ...one, families: families(one.value) }));
    // The reading finds the rules: there are many, in the styles and in the editor's theme
    // (35 once the landing page of 0.2.4 went with its own, at 0.2.5).
    expect(read.length).toBeGreaterThan(30);
    const wrong = read.filter(({ families: all }) => {
      const [first, ...rest] = all;
      if (first === undefined || first === "inherit") return false;
      return !SHIPPED.includes(first) || rest.some((name) => !AFTER.includes(name));
    });
    expect(wrong.map((one) => `${one.file}: ${one.value}`)).toEqual([]);
  });
});
