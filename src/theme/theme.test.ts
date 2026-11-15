import { describe, expect, it } from "vitest";
import { chosen, keep, type Kept } from "./theme";

function storage(start: Record<string, string> = {}): Kept & { held: Record<string, string> } {
  const held = { ...start };
  return {
    held,
    getItem: (key) => held[key] ?? null,
    setItem: (key, value) => {
      held[key] = value;
    },
  };
}

describe("the theme", () => {
  it("is the system's until a choice is made", () => {
    expect(chosen(storage(), false)).toBe("light");
    expect(chosen(storage(), true)).toBe("dark");
  });

  it("is the choice once made, kept under the key the website uses", () => {
    const kept = storage();
    keep(kept, "dark");
    expect(kept.held).toEqual({ "zeff-theme": "dark" });
    expect(chosen(kept, false)).toBe("dark");
    keep(kept, "light");
    expect(chosen(kept, true)).toBe("light");
  });

  it("passes over a value it does not know, and storage that refuses", () => {
    expect(chosen(storage({ "zeff-theme": "sepia" }), true)).toBe("dark");
    const refusing: Kept = {
      getItem: () => {
        throw new Error("no storage");
      },
      setItem: () => {
        throw new Error("no storage");
      },
    };
    expect(chosen(refusing, false)).toBe("light");
    expect(() => keep(refusing, "dark")).not.toThrow();
  });
});
