import { describe, expect, it } from "vitest";
import { functionAt, wordAt } from "./at";

describe("the function at the cursor", () => {
  it("is a name followed by an opening bracket, a method's or a function's", () => {
    const line = "let fit = wages.reg(log(wage) ~ educ, cluster: worker)";
    expect(functionAt(line, line.indexOf("reg") + 1)).toBe("reg");
    expect(functionAt(line, line.indexOf("reg"))).toBe("reg");
    expect(functionAt(line, line.indexOf("log") + 3)).toBe("log");
    expect(functionAt("summary (x)", 3)).toBe("summary");
  });

  it("is none on a name that is not called, or between names", () => {
    const line = "let fit = wages.reg(log(wage) ~ educ)";
    expect(functionAt(line, line.indexOf("wages") + 2)).toBeNull();
    expect(functionAt(line, line.indexOf("educ") + 1)).toBeNull();
    expect(functionAt(line, line.indexOf("~"))).toBeNull();
    expect(wordAt(line, line.indexOf("wages") + 2)).toBe("wages");
  });
});
