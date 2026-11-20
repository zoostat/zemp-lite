import { describe, expect, it } from "vitest";
import { ENGINE, VERSION, shown } from "./version";

describe("the version", () => {
  it("is the one `package.json` carries", () => {
    expect(VERSION).toMatch(/^0\.2\.\d+(-dev)?$/);
  });

  it("names the engine of the release plan's row", () => {
    expect(ENGINE).toBe("0.7.0");
  });

  it("is written without a patch of 0", () => {
    expect(shown("0.1.0")).toBe("0.1");
    expect(shown("0.1.0-dev")).toBe("0.1-dev");
    expect(shown("1.2.3")).toBe("1.2.3");
    expect(shown("not a version")).toBe("not a version");
  });
});
