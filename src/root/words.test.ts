import { describe, expect, it } from "vitest";
import { inHelp, inWords, notesOf, usingPage } from "./words";

describe("what the landing page says and where it leads", () => {
  it("writes a small count in words", () => {
    expect(inWords(13)).toBe("thirteen");
    expect(inWords(0)).toBe("no");
    expect(inWords(20)).toBe("twenty");
    expect(inWords(21)).toBe("21");
  });

  it("leads into Help by the app's address of a page", () => {
    expect(inHelp({ kind: "home" })).toBe("/app/#/help");
    expect(inHelp({ kind: "packages" })).toBe("/app/#/help/packages");
    expect(inHelp({ kind: "codes", family: null })).toBe("/app/#/help/codes");
    expect(usingPage("getting-started")).toBe("/app/#/help/using/getting-started");
  });

  it("leads to a release's notes, and to the list of releases between two", () => {
    expect(notesOf("0.2.4")).toBe(
      "https://github.com/zoostat/zemp-lite/blob/main/docs/releases/0.2.4-notes.md",
    );
    expect(notesOf("0.2.4-dev")).toBe("https://github.com/zoostat/zemp-lite/releases");
  });
});
