import { describe, expect, it } from "vitest";
import {
  fileTab,
  leftWidth,
  outputShare,
  readViews,
  tabPath,
  usual,
  withTab,
  withoutTab,
  writeViews,
} from "./views";

describe("the view state of a project", () => {
  it("is written and read back as it was", () => {
    const state = usual();
    state.layout = "inline";
    state.left = { tab: "objects", width: 312, shown: false };
    state.output = { share: 0.3, shown: false };
    state.tabs = [fileTab("scripts/main.zeff"), fileTab("scripts/second.zeff"), "view:plots"];
    state.active = "view:plots";
    state.folded = ["data"];
    state.plots = {
      order: ["shape", "schooling"],
      pinned: ["shape", "schooling"],
      shown: "shape",
      page: "slide",
    };
    expect(readViews(writeViews(state))).toEqual(state);
  });

  it("is the usual one where there is no file, or one that cannot be read", () => {
    for (const text of [null, "", "not json", "[]", "3", "null"]) {
      expect(readViews(text), String(text)).toEqual(usual());
    }
    expect(usual().tabs).toEqual(["file:scripts/main.zeff"]);
  });

  it("replaces each part it cannot read by the usual one, and keeps the rest", () => {
    const read = readViews(
      JSON.stringify({
        layout: "columns",
        left: { tab: "methods", width: "wide", shown: false },
        output: { share: 0.5, shown: "yes" },
        tabs: ["file:a.zeff", 7],
        folded: "data",
        later: { anything: true },
      }),
    );
    expect(read).toEqual({
      ...usual(),
      left: { tab: "project", width: 268, shown: false },
      output: { share: 0.5, shown: true },
    });
  });

  it("holds the panel's width and the output's share inside their limits", () => {
    expect(leftWidth(20)).toBe(180);
    expect(leftWidth(9000)).toBe(520);
    expect(leftWidth(300.4)).toBe(300);
    expect(outputShare(0)).toBe(0.12);
    expect(outputShare(1)).toBe(0.85);
    const read = readViews(JSON.stringify({ left: { width: 5 }, output: { share: 7 } }));
    expect(read.left.width).toBe(180);
    expect(read.output.share).toBe(0.85);
  });

  it("reads the plot viewer's state, at most four plots pinned, an unknown page passed over", () => {
    const read = readViews(
      JSON.stringify({
        plots: { order: ["a", "b"], pinned: ["a", "b", "c", "d", "e"], shown: 3, page: "poster" },
      }),
    );
    expect(read.plots).toEqual({
      order: ["a", "b"],
      pinned: ["a", "b", "c", "d"],
      shown: null,
      page: "fit",
    });
  });

  it("drops a tab written twice and one of no known kind, and shows a tab that is open", () => {
    const read = readViews(
      JSON.stringify({
        tabs: ["file:a.zeff", "file:a.zeff", "dialog:reg", "view:plots"],
        active: "dialog:reg",
      }),
    );
    expect(read.tabs).toEqual(["file:a.zeff", "view:plots"]);
    expect(read.active).toBe("file:a.zeff");
    expect(readViews(JSON.stringify({ tabs: [] })).active).toBeNull();
  });
});

describe("the tabs", () => {
  const state = { ...usual(), tabs: ["file:a", "file:b", "file:c"], active: "file:b" };

  it("name a file by its path", () => {
    expect(fileTab("scripts/main.zeff")).toBe("file:scripts/main.zeff");
    expect(tabPath("file:scripts/main.zeff")).toBe("scripts/main.zeff");
    expect(tabPath("view:plots")).toBeNull();
  });

  it("open a tab once and show it", () => {
    expect(withTab(state, "file:d")).toEqual({
      tabs: ["file:a", "file:b", "file:c", "file:d"],
      active: "file:d",
    });
    expect(withTab(state, "file:a")).toEqual({
      tabs: ["file:a", "file:b", "file:c"],
      active: "file:a",
    });
  });

  it("close a tab and show its neighbour where it was the one shown", () => {
    expect(withoutTab(state, "file:b")).toEqual({ tabs: ["file:a", "file:c"], active: "file:c" });
    expect(withoutTab({ ...state, active: "file:c" }, "file:c")).toEqual({
      tabs: ["file:a", "file:b"],
      active: "file:b",
    });
    expect(withoutTab(state, "file:a")).toEqual({ tabs: ["file:b", "file:c"], active: "file:b" });
    expect(withoutTab({ ...state, tabs: ["file:b"] }, "file:b")).toEqual({
      tabs: [],
      active: null,
    });
    expect(withoutTab(state, "file:z")).toEqual({ tabs: state.tabs, active: "file:b" });
  });
});
