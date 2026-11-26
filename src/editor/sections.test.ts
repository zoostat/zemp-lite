import { describe, expect, it } from "vitest";
import { sectionAt, type Section } from "./sections";

// The sections of a script are the engine's reading of it (release 0.3, step 6c): which
// comments are headings, and where each section ends, is held in the worker's own tests
// (`worker/tests/host.rs`), on the cases this file held while the interface read the comments
// itself. What is left here is the interface's own: which section a line is in.

/** The sections the engine gives for a script of fourteen lines, three sections and two subsections. */
const SECTIONS: Section[] = [
  { line: 3, level: 1, title: "Sample", end: 6 },
  { line: 7, level: 1, title: "Models", end: 12 },
  { line: 8, level: 2, title: "Pooled", end: 9 },
  { line: 10, level: 2, title: "Fixed effects", end: 12 },
  { line: 13, level: 1, title: "Figure", end: 14 },
];

describe("the sections of a script", () => {
  it("say which section a line is in, the subsection before the section that holds it", () => {
    const sections = SECTIONS;
    expect(sectionAt(sections, 1)).toBeNull();
    expect(sectionAt(sections, 4)?.title).toBe("Sample");
    expect(sectionAt(sections, 7)?.title).toBe("Models");
    expect(sectionAt(sections, 9)?.title).toBe("Pooled");
    expect(sectionAt(sections, 12)?.title).toBe("Fixed effects");
    expect(sectionAt(sections, 14)?.title).toBe("Figure");
  });
});
