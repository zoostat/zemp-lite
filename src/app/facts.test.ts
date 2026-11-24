// The fact the loading screen is built from (release 0.2.4, step 4), as the app has it: it is
// there once the worker is built, and it is written as the drawings write it.
import { describe, expect, it } from "vitest";
import { FACTS, megabytes } from "./facts";

describe("the fact of the engine the build carries", () => {
  it("is there, and is the size alone", () => {
    expect(FACTS).not.toBeNull();
    expect(Object.keys(FACTS ?? {})).toEqual(["travels"]);
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
