// Copy as Zeff (#114): each statement the data viewer copies, held to the cases of
// tests/scripts/copy-as-zeff.json, which the worker's native tests run through the engine and
// hold to what the view showed. So a statement written here is one the engine was seen to run.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { named, viewAsZeff } from "./zeff";

interface Case {
  kind: "view";
  frame: string;
  statement: string;
  where?: string;
  sort?: { variable: string; desc: boolean } | null;
}

const cases = JSON.parse(
  readFileSync(new URL("../../tests/scripts/copy-as-zeff.json", import.meta.url), "utf8"),
) as Case[];

describe("Copy as Zeff", () => {
  it.each(cases.map((one) => [one.statement, one] as const))("writes %s", (_, one) => {
    expect(one.kind).toBe("view");
    const made = viewAsZeff(one.frame, { where: one.where ?? "", sort: one.sort ?? null });
    expect(made).toBe(one.statement);
  });

  it("copies nothing for a view that is the frame", () => {
    expect(viewAsZeff("wages", { where: "  ", sort: null })).toBeNull();
  });

  it("writes a name that is not an identifier in backticks", () => {
    expect(named("gross wage")).toBe("`gross wage`");
    expect(named("wage_2")).toBe("wage_2");
  });
});
