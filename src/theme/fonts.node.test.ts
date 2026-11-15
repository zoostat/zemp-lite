import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
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
