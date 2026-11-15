import { describe, expect, it } from "vitest";
import { keepCodeSize, keptCodeSize, larger, smaller } from "./codesize";
import type { Kept } from "./theme";

function storage(start: Record<string, string> = {}): Kept {
  const held = { ...start };
  return { getItem: (key) => held[key] ?? null, setItem: (key, value) => void (held[key] = value) };
}

describe("the size of code text", () => {
  it("steps through the eight sizes and stops at each end", () => {
    const up: number[] = [12];
    while (larger(up.at(-1)!) !== up.at(-1)) up.push(larger(up.at(-1)!));
    expect(up).toEqual([12, 13, 14, 15, 16, 18, 20, 22]);
    expect(smaller(22)).toBe(20);
    expect(smaller(18)).toBe(16);
    expect(smaller(12)).toBe(12);
  });

  it("is 14 until one is kept, and passes over what is not a size", () => {
    expect(keptCodeSize(storage())).toBe(14);
    expect(keptCodeSize(storage({ "zemp-code-size": "17" }))).toBe(14);
    expect(keptCodeSize(storage({ "zemp-code-size": "big" }))).toBe(14);
    const kept = storage();
    keepCodeSize(kept, 18);
    expect(keptCodeSize(kept)).toBe(18);
  });
});
