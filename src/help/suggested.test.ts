import { describe, expect, it } from "vitest";
import { suggested } from "./read";

describe("a name the engine suggests", () => {
  it("is read from its sentence that it has no such name", () => {
    expect(suggested("no function or package is called `lm`; did you mean `lp`?")).toBe("lp");
    expect(suggested("no function or package is called `/reg`; did you mean `reg`?")).toBe("reg");
  });

  it("is none where the sentence suggests nothing, or is no such sentence", () => {
    expect(suggested("no function or package is called `zzzz`")).toBeNull();
    expect(suggested("did you mean it?")).toBeNull();
    expect(suggested("")).toBeNull();
  });
});
