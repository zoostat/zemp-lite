// The facts the front page is built from (release 0.2.4, step 4; the example from release
// 0.3.1, step 13), as the app has them: they are there once the worker is built, and the size
// is written as the drawings write it.
import { describe, expect, it } from "vitest";
import { FACTS, megabytes } from "./facts";

describe("the fact of the engine the build carries", () => {
  it("is there: the size, and the front page's example with its print", () => {
    expect(FACTS).not.toBeNull();
    expect(Object.keys(FACTS ?? {})).toEqual(["travels", "example"]);
  });

  it("gives an example of three lines of script, and what the engine printed for it", () => {
    const example = FACTS?.example;
    expect(example?.script.split("\n")).toHaveLength(3);
    expect(example?.script.endsWith("\n")).toBe(false);
    expect(example?.printed).toMatch(/\S/);
    expect(example?.printed.endsWith("\n")).toBe(false);
  });

  it("gives the size that travels, under the limit of risk R4", () => {
    expect(FACTS?.travels).toBeGreaterThan(1_000_000);
    expect(FACTS?.travels).toBeLessThan(5_000_000);
  });

  it("is written as the screens write it", () => {
    expect(megabytes(2_926_416)).toBe("2.9 MB");
    expect(megabytes(15_148_300)).toBe("15.1 MB");
    expect(megabytes(2_950_000)).toBe("3.0 MB");
  });
});
