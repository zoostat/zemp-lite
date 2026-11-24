import { describe, expect, it } from "vitest";
import { addressOf, stopOf } from "./address";
import { HOME, type Stop } from "./history";

const STOPS: [string, Stop][] = [
  ["#/help", HOME],
  ["#/help/using", { kind: "using", page: null }],
  ["#/help/using/finding-help", { kind: "using", page: "finding-help" }],
  ["#/help/name/reg", { kind: "name", name: "reg" }],
  [
    "#/help/name/histogram/plot/Frame",
    { kind: "name", name: "histogram", form: { package: "plot", on: "Frame" } },
  ],
  ["#/help/packages", { kind: "packages" }],
  ["#/help/package/regress", { kind: "package", name: "regress" }],
  ["#/help/codes", { kind: "codes", family: null }],
  ["#/help/codes/Z01xx", { kind: "codes", family: "Z01xx" }],
  ["#/help/code/Z0101", { kind: "code", code: "Z0101" }],
];

describe("an address that opens a page of Help", () => {
  it.each(STOPS)("%s is read into its page, and the page written back into it", (hash, stop) => {
    expect(stopOf(hash)).toEqual(stop);
    expect(addressOf(stop)).toBe(hash);
  });

  it("keeps a name with letters an address cannot hold", () => {
    const stop: Stop = { kind: "name", name: "my fn/é" };
    expect(addressOf(stop)).toBe("#/help/name/my%20fn%2F%C3%A9");
    expect(stopOf(addressOf(stop))).toEqual(stop);
  });

  it("is not one of Help's unless it begins as one", () => {
    expect(stopOf("")).toBeNull();
    expect(stopOf("#/p/scratch")).toBeNull();
    expect(stopOf("#/new")).toBeNull();
    expect(stopOf("#/helpful")).toBeNull();
  });

  it("opens Home where it names no page that can be read", () => {
    for (const hash of [
      "#/help/",
      "#/help/nothing",
      "#/help/using/no-such-page",
      "#/help/using/finding-help/more",
      "#/help/name",
      "#/help/name/histogram/plot",
      "#/help/name/a/b/c/d",
      "#/help/package",
      "#/help/packages/regress",
      "#/help/code",
      "#/help/code/Z0101/more",
      "#/help/name/%E0%A4%A",
    ]) {
      expect(stopOf(hash), hash).toEqual(HOME);
    }
  });
});
