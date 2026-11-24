// The facts the screens are built from (release 0.2.4, step 4), as the app has them: they are
// there once the worker is built, they are of the engine the app names, and they are written
// as the drawings write them.
import { describe, expect, it } from "vitest";
import { FACTS, counted, megabytes } from "./facts";
import { ENGINE } from "./version";

describe("the facts of the engine the build carries", () => {
  it("are there, and are of the engine the app names", () => {
    expect(FACTS).not.toBeNull();
    expect(FACTS?.engine).toBe(ENGINE);
    expect(FACTS?.functions).toBeGreaterThan(0);
    expect(FACTS?.packages).toBeGreaterThan(0);
    expect(FACTS?.codes).toBeGreaterThan(0);
    expect(FACTS?.script).toMatch(/report\(\[m1, m2, m3\]\)\n$/);
    expect(FACTS?.printed).toContain("(1)");
  });

  it("give the size that travels, under the limit of risk R4", () => {
    expect(FACTS?.travels).toBeGreaterThan(1_000_000);
    expect(FACTS?.travels).toBeLessThan(5_000_000);
  });

  it("are written as the screens write them", () => {
    expect(megabytes(2_926_416)).toBe("2.9 MB");
    expect(megabytes(15_148_300)).toBe("15.1 MB");
    expect(megabytes(2_950_000)).toBe("3.0 MB");
    expect(counted(259)).toBe("259");
    expect(counted(18179)).toBe("18,179");
  });
});
