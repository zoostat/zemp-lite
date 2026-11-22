// The view state of a project as its page was left (`left.ts`).
import { describe, expect, it } from "vitest";
import { noteLeft, takeLeft } from "./left";

function kept(fails = false) {
  const all = new Map<string, string>();
  return {
    all,
    getItem: (key: string) => all.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (fails) throw new Error("the record is full");
      all.set(key, value);
    },
  };
}

describe("the view state noted as a page is left", () => {
  it("is taken up by the next opening of that project, once", () => {
    const record = kept();
    noteLeft(record, "wages", '{"version":3}');
    expect(takeLeft(record, "wages")).toBe('{"version":3}');
    expect(takeLeft(record, "wages")).toBeNull();
  });

  it("is each project's own, and the last noted for a project stands", () => {
    const record = kept();
    noteLeft(record, "wages", "one");
    noteLeft(record, "scratch", "two");
    noteLeft(record, "wages", "three");
    expect(takeLeft(record, "scratch")).toBe("two");
    expect(takeLeft(record, "wages")).toBe("three");
    expect(takeLeft(record, "other")).toBeNull();
  });

  it("is nothing where the record holds no note, or what it holds is not one", () => {
    const record = kept();
    expect(takeLeft(record, "wages")).toBeNull();
    record.all.set("zemp-views-left", "not json");
    expect(takeLeft(record, "wages")).toBeNull();
    record.all.set("zemp-views-left", '["a list"]');
    expect(takeLeft(record, "wages")).toBeNull();
    record.all.set("zemp-views-left", '{"wages": 7, "scratch": "kept"}');
    expect(takeLeft(record, "wages")).toBeNull();
    expect(takeLeft(record, "scratch")).toBe("kept");
  });

  it("fails quietly where the browser keeps no note", () => {
    const record = kept(true);
    expect(() => noteLeft(record, "wages", "one")).not.toThrow();
    expect(takeLeft(record, "wages")).toBeNull();
  });
});
