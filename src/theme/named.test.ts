import { describe, expect, it } from "vitest";
import { NAME, named, type NamedPiece } from "./named";

const written = (pieces: NamedPiece[]) =>
  pieces.map((piece) => ("name" in piece ? NAME : piece.text)).join("");

describe("a text with the name in it", () => {
  it("is cut at the name, and nothing else of it is changed", () => {
    expect(named("Using Zemp Lite")).toEqual([{ text: "Using " }, { name: true }]);
    expect(named("Zemp Lite does not open it.")).toEqual([
      { name: true },
      { text: " does not open it." },
    ]);
    expect(named("Zemp Lite")).toEqual([{ name: true }]);
    expect(named("the editor Zemp Lite, and Zemp Lite again")).toEqual([
      { text: "the editor " },
      { name: true },
      { text: ", and " },
      { name: true },
      { text: " again" },
    ]);
  });

  it("is one piece where it does not hold the name", () => {
    expect(named("Getting started")).toEqual([{ text: "Getting started" }]);
    expect(named("zemp lite, Zemp  Lite and ZempLite")).toEqual([
      { text: "zemp lite, Zemp  Lite and ZempLite" },
    ]);
    expect(named("")).toEqual([]);
  });

  it("is the same words when its pieces are put together", () => {
    for (const text of [
      "Using Zemp Lite",
      "Zemp Lite is laid out for a window at least 1,200 pixels wide",
      "where Help starts: Zeff, Zemp Lite and the topics",
      "Zemp LiteZemp Lite",
      "no name here",
    ]) {
      expect(written(named(text))).toBe(text);
    }
  });
});
