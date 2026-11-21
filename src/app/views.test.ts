import { describe, expect, it } from "vitest";
import {
  fileTab,
  leftWidth,
  readViews,
  rightWidth,
  tabPath,
  unfoldToggled,
  usual,
  withTab,
  writeViews,
} from "./views";

describe("the view state of a project", () => {
  it("is written and read back as it was", () => {
    const state = usual();
    state.script = { unfolded: { "scripts/main.zeff": [8, 13] } };
    state.panes = {
      script: { project: true, outline: true, notes: false },
      data: { frames: false, variables: true },
      plots: { list: false, about: false },
      help: { outline: false, related: false },
    };
    state.right = { width: 400 };
    state.left = { width: 312 };
    state.tabs = [fileTab("scripts/main.zeff"), fileTab("scripts/second.zeff"), "view:plots"];
    state.active = "view:plots";
    state.folded = ["data"];
    state.plots = {
      order: ["shape", "schooling"],
      pinned: ["shape", "schooling"],
      shown: "shape",
      page: "slide",
    };
    state.data = {
      frame: "wages",
      variable: "wage",
      hidden: { wages: ["firm"] },
      shown: {
        wages: { where: "year >= 2010", sort: { variable: "wage", desc: true }, search: "" },
        w2010: { where: "", sort: null, search: "Mining" },
      },
    };
    expect(readViews(writeViews(state))).toEqual(state);
  });

  it("reads each frame's view in the data viewer, and passes over one it cannot read", () => {
    const read = readViews(
      JSON.stringify({
        data: {
          shown: {
            wages: { where: "female == 1", sort: { variable: "age", desc: "yes" } },
            odd: { sort: { desc: true } },
            plain: { where: "", search: "" },
            broken: 3,
          },
        },
      }),
    );
    expect(read.data.shown).toEqual({
      wages: { where: "female == 1", sort: { variable: "age", desc: false }, search: "" },
    });
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
        left: { tab: "methods", width: "wide", shown: false },
        right: { width: "narrow" },
        tabs: ["file:a.zeff", 7],
        folded: "data",
        later: { anything: true },
      }),
    );
    expect(read).toEqual({
      ...usual(),
      left: { width: 268 },
      right: { width: 310 },
      others: { later: { anything: true } },
    });
  });

  it("opens a project with every output folded and the notes shown", () => {
    expect(usual().script).toEqual({ unfolded: {} });
    expect(usual().panes.script.notes).toBe(true);
  });

  it("opens each place with the panes of open decision #203", () => {
    expect(usual().panes).toEqual({
      script: { project: false, outline: false, notes: true },
      data: { frames: true, variables: false },
      plots: { list: true, about: true },
      help: { outline: true, related: true },
    });
    expect(usual().right).toEqual({ width: 310 });
  });

  it("reads the panes a file of version 3 names, and leaves the others as they open", () => {
    const read = readViews(
      JSON.stringify({
        version: 3,
        panes: {
          script: { project: true, notes: "no", unknown: true },
          data: "all",
          plots: { about: false },
          later: { pane: true },
        },
        right: { width: 5000 },
      }),
    );
    expect(read.panes).toEqual({
      script: { project: true, outline: false, notes: true },
      data: { frames: true, variables: false },
      plots: { list: true, about: false },
      help: { outline: true, related: true },
    });
    expect(read.right).toEqual({ width: 560 });
  });

  it("reads from a file of version 2 the three panes it said where the viewers kept them", () => {
    const read = readViews(
      JSON.stringify({
        version: 2,
        script: { notes: false },
        data: { list: false },
        plots: { list: false },
      }),
    );
    expect(read.panes.script).toEqual({ project: false, outline: false, notes: false });
    expect(read.panes.data).toEqual({ frames: false, variables: false });
    expect(read.panes.plots).toEqual({ list: false, about: true });
    // A file of version 3 says them under `panes` alone.
    const later = readViews(
      JSON.stringify({ version: 3, panes: {}, script: { notes: false }, plots: { list: false } }),
    );
    expect(later.panes.script.notes).toBe(true);
    expect(later.panes.plots.list).toBe(true);
  });

  it("passes over the layouts an earlier file names, which are gone, and does not keep them", () => {
    for (const layout of ["inline", "panes", "margin"]) {
      const read = readViews(
        JSON.stringify({
          version: 2,
          layout,
          output: { share: 0.3, shown: false },
          left: { tab: "objects", width: 300, shown: false },
        }),
      );
      expect(read).toEqual({ ...usual(), left: { width: 300 } });
      const written = JSON.parse(writeViews(read)) as Record<string, unknown>;
      expect(Object.keys(written)).not.toContain("layout");
      expect(Object.keys(written)).not.toContain("output");
      expect(written["left"]).toEqual({ width: 300 });
    }
  });

  it("writes its version, and keeps what a later build wrote that this one does not know", () => {
    const read = readViews(JSON.stringify({ version: 4, paper: { file: "p.zmd" } }));
    const written = JSON.parse(writeViews(read)) as Record<string, unknown>;
    expect(written["version"]).toBe(3);
    expect(written["paper"]).toEqual({ file: "p.zmd" });
    expect(Object.keys(written)).not.toContain("others");
  });

  it("reads what is unfolded, each script's lines whole numbers, once each and in order", () => {
    const read = readViews(
      JSON.stringify({
        script: {
          notes: "no",
          unfolded: { "a.zeff": [13, 8, 8, 0, 2.5, "x"], "b.zeff": "all", c: [] },
        },
      }),
    );
    expect(read.script).toEqual({ unfolded: { "a.zeff": [8, 13] } });
    expect(read.panes.script.notes).toBe(true);
  });

  it("unfolds and folds one output", () => {
    const state = usual();
    state.script.unfolded["s.zeff"] = [8];
    expect(unfoldToggled(state, "s.zeff", 13)).toEqual([8, 13]);
    expect(unfoldToggled(state, "s.zeff", 8)).toEqual([]);
    expect(unfoldToggled(state, "t.zeff", 4)).toEqual([4]);
  });

  it("holds the width of the left pane and of the right inside their limits", () => {
    expect(leftWidth(20)).toBe(180);
    expect(leftWidth(9000)).toBe(520);
    expect(leftWidth(300.4)).toBe(300);
    expect(rightWidth(20)).toBe(240);
    expect(rightWidth(9000)).toBe(560);
    expect(rightWidth(333.6)).toBe(334);
    const read = readViews(JSON.stringify({ left: { width: 5 }, right: { width: 7 } }));
    expect(read.left.width).toBe(180);
    expect(read.right.width).toBe(240);
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
    expect(read.panes.plots.list).toBe(true);
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
});
