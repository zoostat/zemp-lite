import { describe, expect, it } from "vitest";
import { count, size } from "./format";

describe("sizes and counts", () => {
  it("writes a size in the unit it is read in", () => {
    expect(size(0)).toBe("0 B");
    expect(size(28)).toBe("28 B");
    expect(size(999)).toBe("999 B");
    expect(size(1000)).toBe("1.0 kB");
    expect(size(5_640)).toBe("5.6 kB");
    expect(size(56_300)).toBe("56 kB");
    expect(size(999_600)).toBe("1.0 MB");
    expect(size(13_437_655)).toBe("13 MB");
    expect(size(3_500_000_000)).toBe("3.5 GB");
  });

  it("marks the thousands of a count", () => {
    expect(count(722)).toBe("722");
    expect(count(18412)).toBe("18,412");
  });
});
