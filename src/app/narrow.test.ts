import { describe, expect, it } from "vitest";
import { NARROWEST, goOn, tooNarrow, wentOn } from "./narrow";

describe("a window narrower than Zemp Lite is laid out for", () => {
  it("is one under 1,000 pixels: a phone and a tablet held upright, not a tablet held sideways", () => {
    expect(NARROWEST).toBe(1000);
    expect(tooNarrow(375)).toBe(true);
    expect(tooNarrow(768)).toBe(true);
    expect(tooNarrow(999)).toBe(true);
    expect(tooNarrow(1000)).toBe(false);
    expect(tooNarrow(1024)).toBe(false);
  });

  it("is gone on from once, and that is kept for the visit", () => {
    const kept = new Map<string, string>();
    const storage = {
      getItem: (name: string) => kept.get(name) ?? null,
      setItem: (name: string, value: string) => void kept.set(name, value),
    };
    expect(wentOn(storage)).toBe(false);
    goOn(storage);
    expect(wentOn(storage)).toBe(true);
  });

  it("is asked about again where the browser keeps nothing, or refuses", () => {
    expect(wentOn(null)).toBe(false);
    goOn(null);
    const refusing = {
      getItem: () => {
        throw new Error("no storage");
      },
      setItem: () => {
        throw new Error("no storage");
      },
    };
    goOn(refusing);
    expect(wentOn(refusing)).toBe(false);
  });
});
