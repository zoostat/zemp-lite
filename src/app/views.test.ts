import { describe, expect, it } from "vitest";
import {
  TOPICS,
  familyTopic,
  fileTab,
  leftWidth,
  readViews,
  rightWidth,
  started,
  tabPath,
  topicOpen,
  unfoldToggled,
  usual,
  withTab,
  writeViews,
  pageShare,
  pageSizeStep,
} from "./views";

describe("the view state of a project", () => {
  it("is written and read back as it was", () => {
    const state = usual();
    state.script = { unfolded: { "scripts/main.zeff": [8, 13] } };
    state.panes = {
      script: { project: true, outline: true, notes: false },
      data: { variables: true },
      plots: { about: false },
      paper: { project: true, outline: true, page: false },
      help: { topics: false },
    };
    state.paper = { open: "paper/returns.typ", share: 0.62, size: 125 };
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
      data: { variables: false },
      plots: { about: true },
      paper: { project: false, outline: false, page: true },
      help: { topics: true },
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
      data: { variables: false },
      plots: { about: false },
      paper: { project: false, outline: false, page: true },
      help: { topics: true },
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
    // (Until 0.3.1 the list of frames was a pane, and a file of version 2 said whether it was
    // open; the frames are a menu now, open decision #245, and that word is passed over.)
    expect(read.panes.data).toEqual({ variables: false });
    // (And the plots of a run are a strip of the Plots place's row, not a pane.)
    expect(read.panes.plots).toEqual({ about: true });
    // A file of version 3 says them under `panes` alone.
    const later = readViews(
      JSON.stringify({ version: 3, panes: {}, script: { notes: false }, plots: { list: false } }),
    );
    expect(later.panes.script.notes).toBe(true);
    expect(later.panes.plots).toEqual({ about: true });
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

  it("carries a reader's choice of the old left pane of Help over to Topics, and passes over the pane that is no more", () => {
    // A file of 0.2.1 or 0.2.2, which called the panes of Help Outline and Related functions.
    const closed = readViews(
      JSON.stringify({ version: 3, panes: { help: { outline: false, related: true } } }),
    );
    expect(closed.panes.help).toEqual({ topics: false });
    const open = readViews(JSON.stringify({ version: 3, panes: { help: { outline: true } } }));
    expect(open.panes.help).toEqual({ topics: true });
    // A file of 0.2.3 says Topics and On this page. From 0.2.4 the sections of the page are a
    // part of the page, not a pane (open decision #220, item 7): what the file says of that
    // pane is passed over, and Topics stands as the file has it, whatever an old key says.
    const before = readViews(
      JSON.stringify({
        version: 4,
        panes: { help: { topics: false, outline: true, page: false, related: true } },
      }),
    );
    expect(before.panes.help).toEqual({ topics: false });
    // Written back, the old keys are gone.
    const written = JSON.parse(writeViews(before)) as { panes: { help: object } };
    expect(written.panes.help).toEqual({ topics: false });
  });

  it("keeps which sections of Topics the reader folded and unfolded, and opens the others as they first stand", () => {
    const state = usual();
    // As they first stand: the sections open, each family of codes folded to its name.
    expect(topicOpen(state, TOPICS.using)).toBe(true);
    expect(topicOpen(state, TOPICS.packages)).toBe(true);
    expect(topicOpen(state, TOPICS.codes)).toBe(true);
    expect(topicOpen(state, familyTopic("Z01xx"))).toBe(false);
    state.help.topics = { packages: false, "codes:Z01xx": true };
    const read = readViews(writeViews(state));
    expect(read.help).toEqual({ topics: { packages: false, "codes:Z01xx": true } });
    expect(topicOpen(read, TOPICS.packages)).toBe(false);
    expect(topicOpen(read, familyTopic("Z01xx"))).toBe(true);
    expect(topicOpen(read, familyTopic("W0xxx"))).toBe(false);
    // What is not a truth value, or not a list of them, is passed over.
    expect(
      readViews(JSON.stringify({ help: { topics: { packages: "no", codes: false } } })).help,
    ).toEqual({
      topics: { codes: false },
    });
    expect(readViews(JSON.stringify({ help: { topics: [true] } })).help).toEqual({ topics: {} });
    expect(readViews(JSON.stringify({ help: "all" })).help).toEqual({ topics: {} });
  });

  it("writes its version, and keeps what a later build wrote that this one does not know", () => {
    const read = readViews(JSON.stringify({ version: 7, report: { file: "p.zmd" } }));
    const written = JSON.parse(writeViews(read)) as Record<string, unknown>;
    expect(written["version"]).toBe(6);
    expect(written["report"]).toEqual({ file: "p.zmd" });
    expect(Object.keys(written)).not.toContain("others");
  });

  it("opens a file of version 5, which had the frames of a run as a pane, with nothing lost", () => {
    // Release 0.3.1 (open decision #245): the frames are a menu of the Data place's row. What
    // a file of version 5 says of that pane is passed over; everything else it says is read.
    const read = readViews(
      JSON.stringify({
        version: 5,
        panes: {
          data: { frames: false, variables: true },
          plots: { list: false, about: false },
          script: { project: true },
        },
        data: { frame: "w2010", variable: "wage", hidden: { w2010: ["firm"] } },
      }),
    );
    expect(read.panes.data).toEqual({ variables: true });
    expect(read.panes.plots).toEqual({ about: false });
    expect(read.panes.script.project).toBe(true);
    expect(read.data.frame).toBe("w2010");
    expect(read.data.variable).toBe("wage");
    expect(read.data.hidden).toEqual({ w2010: ["firm"] });
    expect(JSON.parse(writeViews(read))).toMatchObject({
      version: 6,
      panes: { data: { variables: true } },
    });
    expect(
      (JSON.parse(writeViews(read)) as { panes: { data: object } }).panes.data,
    ).not.toHaveProperty("frames");
  });

  it("reads the paper the Paper place has open and the page's share, within its limits", () => {
    expect(usual().paper).toEqual({ open: null, share: 0.5, size: "fit" });
    expect(usual().panes.paper).toEqual({ project: false, outline: false, page: true });
    const read = readViews(
      JSON.stringify({
        version: 5,
        panes: { paper: { project: true, page: false, later: true } },
        paper: { open: "paper/returns.typ", share: 0.9, size: 150, later: 1 },
      }),
    );
    expect(read.panes.paper).toEqual({ project: true, outline: false, page: false });
    expect(read.paper).toEqual({ open: "paper/returns.typ", share: 0.75, size: 150 });
    // What is not a path, a share or a size the page is drawn at is passed over.
    for (const paper of [
      { open: 3, share: "half", size: "large" },
      { open: "", size: 123 },
      "none",
      null,
    ]) {
      expect(readViews(JSON.stringify({ paper })).paper).toEqual({
        open: null,
        share: 0.5,
        size: "fit",
      });
    }
    // A step smaller or larger from a size, or from the size a fitted page happens to have.
    expect(pageSizeStep(100, 1)).toBe(110);
    expect(pageSizeStep(100, -1)).toBe(90);
    expect(pageSizeStep(83.4, 1)).toBe(90);
    expect(pageSizeStep(83.4, -1)).toBe(80);
    expect(pageSizeStep(200, 1)).toBe(200);
    expect(pageSizeStep(31, -1)).toBe(50);
    expect(pageSizeStep(31, 1)).toBe(50);
    expect(pageSizeStep(260, -1)).toBe(200);
    expect(pageShare(0.1)).toBe(0.25);
    expect(pageShare(0.4449)).toBe(0.44);
    // A file of an earlier version names no paper, and opens as a first one does.
    expect(
      readViews(JSON.stringify({ version: 4, panes: { script: { notes: false } } })).paper,
    ).toEqual({ open: null, share: 0.5, size: "fit" });
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
    expect(read.panes.plots).toEqual({ about: true });
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

describe("the views a start begins from", () => {
  const left = (active: string | null, tabs: string[]) => ({
    ...usual(),
    tabs,
    active,
    help: { topics: { packages: true, using: true, "codes:Z01xx": true } },
    panes: { ...usual().panes, help: { topics: false }, data: { variables: true } },
  });

  it("are on the Script place, with the file it last showed, whatever place was left", () => {
    const tabs = ["file:data/wages.csv", "file:scripts/main.zeff", "file:scripts/iv.zeff"];
    for (const view of ["view:help", "view:data", "view:plots"]) {
      // Left on a place: the first script open is shown.
      expect(started(left(view, [...tabs, view])).active).toBe("file:scripts/main.zeff");
    }
    // Left on a file: that file, a script or not.
    expect(started(left("file:scripts/iv.zeff", tabs)).active).toBe("file:scripts/iv.zeff");
    expect(started(left("file:data/wages.csv", tabs)).active).toBe("file:data/wages.csv");
    // No script among the files open: a file; no file at all: none, and the place is Script.
    expect(started(left("view:data", ["file:data/wages.csv", "view:data"])).active).toBe(
      "file:data/wages.csv",
    );
    expect(started(left("view:help", ["view:help"])).active).toBeNull();
  });

  it("have every section of Topics closed, and keep everything else as the project has it", () => {
    const before = left("view:help", ["file:scripts/main.zeff", "view:help"]);
    const now = started(before);
    for (const key of ["packages", "codes", "using", "codes:Z01xx", "codes:W10xx"]) {
      expect(topicOpen(now, key), key).toBe(false);
    }
    // The tabs, the panes, what is unfolded and the rest are the project's own.
    expect(now.tabs).toEqual(before.tabs);
    expect(now.panes).toEqual(before.panes);
    expect({ ...now, active: null, help: null }).toEqual({ ...before, active: null, help: null });
    // The state given is not changed: the start is a view of it.
    expect(before.active).toBe("view:help");
    expect(before.help.topics["packages"]).toBe(true);
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
