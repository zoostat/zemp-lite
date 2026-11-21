// The reader of a help page (release 0.2.1, step 8), on pages the released `zeff help` and
// `zeff explain` printed, kept in tests/scripts.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { headOf, relatedOf, sectionsOfPage } from "./helppage";

const kept = (name: string) =>
  readFileSync(new URL(`../../tests/scripts/${name}`, import.meta.url), "utf8");

describe("a help page of the engine", () => {
  const summary = kept("help-summary.txt");

  it("has the sections its headings begin, each with its line", () => {
    const sections = sectionsOfPage(summary).filter((one) => !one.entry);
    expect(sections.map((one) => one.heading)).toEqual(
      summary.split("\n").filter((line) => /^[A-Z][A-Z ]*[A-Z]$/.test(line)),
    );
    for (const one of sections) expect(summary.split("\n")[one.line]).toBe(one.heading);
    expect(sections.map((one) => one.title)).toContain("Usage");
    expect(sections.map((one) => one.title)).toContain("See also");
  });

  it("names each function of a page that holds several of a name, over its own sections", () => {
    // `summary` is a function of a frame and a function of a result: one page, two functions.
    const entries = sectionsOfPage(summary).filter((one) => one.entry);
    expect(entries.map((one) => one.title)).toEqual(["summary · data", "summary · results"]);
    expect(entries[0]?.line).toBe(0);
    const all = sectionsOfPage(summary);
    expect(all[0]?.entry).toBe(true);
    expect(all[1]?.title).toBe("Usage");
    // A page of one function has its title above the outline, not in it.
    const one = "reg — Linear regression    regress · tier 2\n\nUSAGE\n    data.reg(formula)\n";
    expect(sectionsOfPage(one).map((section) => section.title)).toEqual(["Usage"]);
  });

  it("names its related functions under SEE ALSO, in the page's order and once each", () => {
    expect(relatedOf(summary)).toEqual(["mean", "sd", "describe", "estimates", "export", "reg"]);
    expect(relatedOf("reg — Linear regression\n\nUSAGE\n    data.reg(formula)\n")).toEqual([]);
    // A list written over two lines is read whole, and ends at the next heading.
    expect(
      relatedOf(
        "x — y\n\nSEE ALSO\n    a, b,\n    c\n\nEXAMPLES\n    > d, e\n\nSEE ALSO\n    b, f\n",
      ),
    ).toEqual(["a", "b", "c", "f"]);
  });

  it("says in its first line what its function is, does and belongs to", () => {
    expect(headOf(summary)).toEqual({
      name: "summary",
      does: "Table of N, missing, mean, SD, min and max",
      pack: "data",
    });
    expect(headOf("no such page")).toBeNull();
  });

  it("reads a code's explained page the same way", () => {
    const sections = sectionsOfPage(kept("explain-W0201.txt"));
    expect(sections.map((one) => one.title)).toEqual([
      "Meaning",
      "Common causes",
      "Example",
      "Fix",
    ]);
    expect(relatedOf(kept("explain-W0201.txt"))).toEqual([]);
  });
});
