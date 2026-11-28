import { describe, expect, it } from "vitest";
import { megabytes } from "./facts";
import { filtered, lastRun, scriptsLine, sizeOf, usedOf } from "./projects-list";

describe("how a project's last run went, from its record", () => {
  it("is not run where this browser remembers none", () => {
    expect(lastRun(null)).toEqual({ tone: "none", words: "not run" });
  });

  it("is clean where it gave neither a warning nor an error", () => {
    expect(lastRun({ at: 1, errors: 0, warnings: 0 })).toEqual({ tone: "ok", words: "clean" });
  });

  it("counts its warnings, one or several", () => {
    expect(lastRun({ at: 1, errors: 0, warnings: 1 })).toEqual({
      tone: "warning",
      words: "1 warning",
    });
    expect(lastRun({ at: 1, errors: 0, warnings: 12 }).words).toBe("12 warnings");
  });

  it("says its errors before its warnings: the run did not go through", () => {
    expect(lastRun({ at: 1, errors: 1, warnings: 4 })).toEqual({ tone: "error", words: "1 error" });
    expect(lastRun({ at: 1, errors: 3, warnings: 0 }).words).toBe("3 errors");
  });
});

describe("a size, as a row writes it", () => {
  it("is in megabytes from a million bytes, as the other screens write them", () => {
    expect(sizeOf(1_900_000)).toBe("1.9 MB");
    expect(sizeOf(1_900_000)).toBe(megabytes(1_900_000));
    expect(sizeOf(1_000_000)).toBe("1.0 MB");
    expect(sizeOf(48_250_000)).toBe("48.3 MB");
    expect(sizeOf(2_400_000_000)).toBe("2.4 GB");
  });

  it("is in whole kilobytes under that, and in bytes under a thousand", () => {
    expect(sizeOf(412_300)).toBe("412 kB");
    expect(sizeOf(1_000)).toBe("1 kB");
    expect(sizeOf(999)).toBe("999 bytes");
    expect(sizeOf(1)).toBe("1 byte");
    expect(sizeOf(0)).toBe("0 bytes");
    // What would round to a thousand kilobytes is a megabyte.
    expect(sizeOf(999_700)).toBe("1.0 MB");
    expect(sizeOf(999_400)).toBe("999 kB");
  });
});

describe("a project's scripts in one line", () => {
  it("names them without their folders, all of three or fewer", () => {
    expect(scriptsLine(["scripts/main.zeff"])).toBe("main.zeff");
    expect(scriptsLine(["scripts/main.zeff", "scripts/robustness.zeff", "extra.zeff"])).toBe(
      "main.zeff, robustness.zeff, extra.zeff",
    );
  });

  it("names three of more and counts the rest, and says where there is none", () => {
    const five = ["a", "b", "c", "d", "e"].map((name) => `scripts/${name}.zeff`);
    expect(scriptsLine(five)).toBe("a.zeff, b.zeff, c.zeff and 2 more");
    expect(scriptsLine(five.slice(0, 4))).toBe("a.zeff, b.zeff, c.zeff and 1 more");
    expect(scriptsLine([])).toBe("no script");
  });
});

describe("the rows a filter keeps", () => {
  const rows = [
    { name: "Scratch", scripts: ["scripts/main.zeff", "scripts/instruments.zeff"] },
    { name: "Returns to schooling", scripts: ["scripts/main.zeff", "scripts/robustness.zeff"] },
    { name: "Engagement survey", scripts: ["scripts/scales.zeff"] },
  ];
  const names = (typed: string) => filtered(rows, typed).map((row) => row.name);

  it("are all of them where nothing is typed", () => {
    expect(filtered(rows, "")).toBe(rows);
    expect(names("   ")).toEqual(rows.map((row) => row.name));
  });

  it("are those whose name holds what was typed, whatever the capitals, in their order", () => {
    expect(names("s")).toEqual(rows.map((row) => row.name));
    expect(names("SCHOOL")).toEqual(["Returns to schooling"]);
    expect(names(" survey ")).toEqual(["Engagement survey"]);
  });

  it("are those with a script of that name too, and none where nothing matches", () => {
    expect(names("robust")).toEqual(["Returns to schooling"]);
    expect(names("main")).toEqual(["Scratch", "Returns to schooling"]);
    // A folder above a script is not its name.
    expect(names("scripts")).toEqual([]);
    expect(names("zzz")).toEqual([]);
  });
});

describe("the space the browser says the site uses", () => {
  it("is said with its share of what the browser allows", () => {
    expect(usedOf({ usage: 4_600_000, quota: 2_000_000_000 })).toEqual({
      words: "4.6 MB used",
      share: 0.0023,
    });
    expect(usedOf({ usage: 3_000, quota: 2_000 })).toEqual({ words: "3 kB used", share: 1 });
  });

  it("is said without a share where the browser gives no limit", () => {
    expect(usedOf({ usage: 4_600_000 })).toEqual({ words: "4.6 MB used", share: null });
    expect(usedOf({ usage: 0, quota: 0 })).toEqual({ words: "0 bytes used", share: null });
  });

  it("is left out where the browser gives no number", () => {
    expect(usedOf(undefined)).toBeNull();
    expect(usedOf(null)).toBeNull();
    expect(usedOf({})).toBeNull();
    expect(usedOf({ quota: 5 })).toBeNull();
    expect(usedOf({ usage: Number.NaN })).toBeNull();
    expect(usedOf({ usage: -1 })).toBeNull();
  });
});
