// View state: what is shown, never what is computed (Zemp Specification, section 5, "Analysis
// state and view state"). The layout of a window is kept with its project, in
// `.zemp/views.json`, which a replication package omits: which panes are open and how wide,
// what is unfolded, the place shown, the views of the data and of the plots. Whatever the
// file holds that is not understood is passed over, and the default is used in its place, so
// a file written by a later version, or damaged, never keeps a project from opening.
//
// From Zemp Lite 0.2.1 every place has a left pane, the place itself and a right pane, each
// pane opened and closed by its own link (open decision #203), and the file says which panes
// of each place are open and how wide the two sides are. From 0.2.3 the left pane of Help is
// **Topics** (open decision #211; it was **Outline**), and the file says which of its sections
// the reader folded or unfolded; its right pane is **On this page** (#211, item 13; it was
// **Related functions**). From 0.3 there is a fifth place, **Paper**: the file says which of
// its panes are open, the paper it has open, and the page's share of its width. From 0.3.1
// (version 6; open decision #245) the frames of a run are a menu of the Data place's row, not
// a pane, so the file no longer says whether that pane is open; and **Variables** is what the
// Data place shows in place of the grid, said by the same word as the pane it was; and the
// plots of a run are a strip of the Plots place's row, no longer a pane; the plot's panel at
// the right is still shown and hidden, under the word it had.

import type { View } from "../engine/messages";

/** The version of the view state this build writes; a file without one is of version 1. */
export const VIEWS_VERSION = 6;

/**
 * The panes of each place, and whether each is open in a project opened for the first time
 * (#203): beside the script, Project and Outline closed and Notes open; in the Data place,
 * the grid shown and not the variables (#245; the list of frames was a pane until 0.3.1);
 * in the Plots place the plot's panel open (#245: the plots of the run are a strip of the
 * row, always there; they were a pane until 0.3.1); beside a page of Help,
 * Topics open (the sections of the page open are a part of the page from 0.2.4, not a pane:
 * open decision #220, item 7); beside a paper, Project and Outline closed and the page open.
 */
export const PANES = {
  script: { project: false, outline: false, notes: true },
  data: { variables: false },
  plots: { about: true },
  paper: { project: false, outline: false, page: true },
  help: { topics: true },
} as const;
export type PlaceName = keyof typeof PANES;
export type PaneName<P extends PlaceName> = keyof (typeof PANES)[P];
/** Which panes are open, for each place. */
export type PaneState = { [P in PlaceName]: { -readonly [N in PaneName<P>]: boolean } };

export interface ViewState {
  /** Which panes of each place are open (#203). */
  panes: PaneState;
  /** The right pane of a place: its width, in pixels. */
  right: { width: number };
  /** The margin editor's view of the scripts. */
  script: {
    /** For each script, by its path, the lines of the statements whose output is unfolded. */
    unfolded: Record<string, number[]>;
  };
  /**
   * The data viewer: the frame shown, by the name of its binding; the variable chosen for the
   * inspector; and, for each frame, the variables hidden from the grid.
   * Hiding is the view's alone: a hidden variable is still in every result and export. And
   * for each frame, how it is shown: kept to the rows of a condition, sorted and searched,
   * which the viewer's Copy as Zeff writes as a statement and the script never holds.
   */
  data: {
    frame: string | null;
    variable: string | null;
    hidden: Record<string, string[]>;
    shown: Record<string, View>;
  };
  /**
   * The Topics pane of Help (#211): the sections the reader folded or unfolded, by their
   * keys, each `true` where it is open. A section not named stands as it first does
   * (`topicOpen`).
   */
  help: { topics: Record<string, boolean> };
  /**
   * The Paper place: the paper it has open, by its path, or `null` where it has none; and the
   * share of the place's width the page takes beside the source; and the size the page is
   * drawn at, to fit the width of its pane or at a per cent of its printed size.
   */
  paper: { open: string | null; share: number; size: PageSize };
  /** The parts of the file this build does not know, kept as they were (a later build's). */
  others: Record<string, unknown>;
  /** The left pane of a place: its width, in pixels. */
  left: { width: number };
  /**
   * What has been opened, in order: `file:` and a path of the project, or `view:` and a
   * viewer's name. (The one shown is the place; a script opened is shown in the Script place.)
   */
  tabs: string[];
  /** The one shown, one of `tabs`, or `null` where none is open. */
  active: string | null;
  /** The folders folded away in the project tree, by path. */
  folded: string[];
  /** The plot viewer: each plot is named by the text of its statement. */
  plots: {
    /** The order of the gallery strip. */
    order: string[];
    /** The plots pinned side by side, two to four of them. */
    pinned: string[];
    /** The plot shown, or `null` for the first of the strip. */
    shown: string | null;
    /** The size plots are drawn at: to fit the pane, or a page of a journal or a slide. */
    page: "fit" | "one_column" | "two_column" | "slide";
  };
}

/** The narrowest and the widest the left pane of a place goes. */
export const LEFT_WIDTH = { least: 180, most: 520, usual: 268 } as const;
/** The narrowest and the widest the right pane of a place goes. */
export const RIGHT_WIDTH = { least: 240, most: 560, usual: 310 } as const;

/** The least, the most and the usual share of the Paper place its page takes. */
export const PAGE_SHARE = { least: 0.25, most: 0.75, usual: 0.5 } as const;

/** The size a paper's page is drawn at: to the width of its pane, or a per cent of its printed size. */
export type PageSize = "fit" | number;
/** The sizes a page is drawn at, in per cent of its printed size, from the smallest. */
export const PAGE_SIZES = [50, 67, 80, 90, 100, 110, 125, 150, 175, 200] as const;
/** The smallest and the largest of them. */
export const PAGE_SIZE = { least: 50, most: 200 } as const;

/**
 * The size a step smaller (−1) or larger (+1) than a page now drawn at `now` per cent: the
 * next of the sizes below or above it, and the same size where there is none.
 */
export function pageSizeStep(now: number, direction: -1 | 1): number {
  const next =
    direction === 1
      ? PAGE_SIZES.find((size) => size > now + 0.5)
      : [...PAGE_SIZES].reverse().find((size) => size < now - 0.5);
  return next ?? (direction === 1 ? PAGE_SIZE.most : PAGE_SIZE.least);
}

/** The tab of the plot viewer. */
export const PLOTS = "view:plots";
/** A frame's view as the file has it; `null` where it is not one, or is the frame as it is. */
function viewOf(from: unknown): View | null {
  if (typeof from !== "object" || from === null) return null;
  const one = from as Record<string, unknown>;
  const where = typeof one["where"] === "string" ? one["where"] : "";
  const search = typeof one["search"] === "string" ? one["search"] : "";
  const sort = one["sort"] as Record<string, unknown> | null | undefined;
  const sorted =
    typeof sort === "object" && sort !== null && typeof sort["variable"] === "string"
      ? { variable: sort["variable"], desc: sort["desc"] === true }
      : null;
  if (where === "" && search === "" && sorted === null) return null;
  return { where, sort: sorted, search };
}

/** The tab of the data viewer. */
export const DATA = "view:data";
/** The tab of the Help place. */
export const HELP = "view:help";
/** The tab of the Paper place. */
export const PAPER = "view:paper";

/** The tab of a file of the project. */
export const fileTab = (path: string) => `file:${path}`;
/** The path of a file's tab, or `null` for a tab that is not a file's. */
export const tabPath = (tab: string) => (tab.startsWith("file:") ? tab.slice(5) : null);

/** A project opened for the first time: its main script in a tab. */
export function usual(): ViewState {
  return {
    panes: {
      script: { ...PANES.script },
      data: { ...PANES.data },
      plots: { ...PANES.plots },
      paper: { ...PANES.paper },
      help: { ...PANES.help },
    },
    right: { width: RIGHT_WIDTH.usual },
    script: { unfolded: {} },
    data: { frame: null, variable: null, hidden: {}, shown: {} },
    help: { topics: {} },
    paper: { open: null, share: PAGE_SHARE.usual, size: "fit" },
    others: {},
    left: { width: LEFT_WIDTH.usual },
    tabs: [fileTab("scripts/main.zeff")],
    active: fileTab("scripts/main.zeff"),
    folded: [],
    plots: { order: [], pinned: [], shown: null, page: "fit" },
  };
}

const within = (value: number, least: number, most: number) =>
  Math.min(most, Math.max(least, value));

/** The width the left pane is given when `width` is asked for. */
export const leftWidth = (width: number) =>
  Math.round(within(width, LEFT_WIDTH.least, LEFT_WIDTH.most));

/** The width the right pane is given when `width` is asked for. */
export const rightWidth = (width: number) =>
  Math.round(within(width, RIGHT_WIDTH.least, RIGHT_WIDTH.most));

/** The share of the Paper place the page is given when `share` is asked for, to a hundredth. */
export const pageShare = (share: number) =>
  Math.round(within(share, PAGE_SHARE.least, PAGE_SHARE.most) * 100) / 100;

/** The view state a file holds, each part that cannot be read replaced by the usual one. */
export function readViews(text: string | null): ViewState {
  const state = usual();
  let held: unknown;
  try {
    held = JSON.parse(text ?? "");
  } catch {
    return state;
  }
  if (typeof held !== "object" || held === null) {
    return state;
  }
  const from = held as Record<string, unknown>;
  // The panes of each place, as a file of version 3 says them. A pane the file does not name,
  // or names with anything but a truth value, stands as in a project opened for the first time.
  const panes = from["panes"] as Record<string, unknown> | undefined;
  if (typeof panes === "object" && panes !== null) {
    for (const place of Object.keys(PANES) as PlaceName[]) {
      const said = panes[place] as Record<string, unknown> | undefined;
      if (typeof said !== "object" || said === null) continue;
      const open = state.panes[place] as Record<string, boolean>;
      for (const pane of Object.keys(PANES[place])) {
        if (typeof said[pane] === "boolean") open[pane] = said[pane];
      }
    }
    // The left pane of Help was Outline until 0.2.3: a reader's choice of it is that of Topics.
    const help = panes["help"] as Record<string, unknown> | undefined;
    if (typeof help === "object" && help !== null) {
      if (typeof help["topics"] !== "boolean" && typeof help["outline"] === "boolean") {
        state.panes.help.topics = help["outline"];
      }
    }
  }
  const topics = (from["help"] as Record<string, unknown> | undefined)?.["topics"];
  if (typeof topics === "object" && topics !== null && !Array.isArray(topics)) {
    for (const [key, open] of Object.entries(topics as Record<string, unknown>)) {
      if (typeof open === "boolean") state.help.topics[key] = open;
    }
  }
  const paper = from["paper"] as Record<string, unknown> | undefined;
  if (typeof paper === "object" && paper !== null) {
    if (typeof paper["open"] === "string" && paper["open"] !== "") state.paper.open = paper["open"];
    if (typeof paper["share"] === "number" && Number.isFinite(paper["share"])) {
      state.paper.share = pageShare(paper["share"]);
    }
    const size = paper["size"];
    if (typeof size === "number" && (PAGE_SIZES as readonly number[]).includes(size)) {
      state.paper.size = size;
    }
  }
  const right = from["right"] as Record<string, unknown> | undefined;
  if (typeof right === "object" && right !== null) {
    if (typeof right["width"] === "number" && Number.isFinite(right["width"])) {
      state.right.width = rightWidth(right["width"]);
    }
  }
  // A file of version 1 or 2 said three of them where the viewers then kept them.
  const earlier = typeof panes !== "object" || panes === null;
  const script = from["script"] as Record<string, unknown> | undefined;
  if (typeof script === "object" && script !== null) {
    if (earlier && typeof script["notes"] === "boolean") state.panes.script.notes = script["notes"];
    const unfolded = script["unfolded"];
    if (typeof unfolded === "object" && unfolded !== null && !Array.isArray(unfolded)) {
      for (const [path, lines] of Object.entries(unfolded as Record<string, unknown>)) {
        if (Array.isArray(lines)) {
          const kept = lines.filter(
            (line): line is number => Number.isInteger(line) && (line as number) >= 1,
          );
          if (kept.length > 0)
            state.script.unfolded[path] = [...new Set(kept)].sort((a, b) => a - b);
        }
      }
    }
  }
  const data = from["data"] as Record<string, unknown> | undefined;
  if (typeof data === "object" && data !== null) {
    if (typeof data["frame"] === "string") state.data.frame = data["frame"];
    if (typeof data["variable"] === "string") state.data.variable = data["variable"];
    const hidden = data["hidden"];
    if (typeof hidden === "object" && hidden !== null && !Array.isArray(hidden)) {
      for (const [frame, names] of Object.entries(hidden as Record<string, unknown>)) {
        if (Array.isArray(names)) {
          const kept = [...new Set(names.filter((one): one is string => typeof one === "string"))];
          if (kept.length > 0) state.data.hidden[frame] = kept;
        }
      }
    }
    const shown = data["shown"];
    if (typeof shown === "object" && shown !== null && !Array.isArray(shown)) {
      for (const [frame, view] of Object.entries(shown as Record<string, unknown>)) {
        const read = viewOf(view);
        if (read !== null) state.data.shown[frame] = read;
      }
    }
  }
  // What a file of version 1 or 2 said of the layouts that are gone (which one, and the share
  // of the pane its output took) is passed over, not kept as a later build's.
  const known = new Set(["version", "layout", "output", ...Object.keys(state)]);
  for (const [key, value] of Object.entries(from)) {
    if (!known.has(key)) state.others[key] = value;
  }
  const left = from["left"] as Record<string, unknown> | undefined;
  if (typeof left === "object" && left !== null) {
    if (typeof left["width"] === "number" && Number.isFinite(left["width"])) {
      state.left.width = leftWidth(left["width"]);
    }
  }
  const texts = (value: unknown): string[] | null =>
    Array.isArray(value) && value.every((one) => typeof one === "string")
      ? [...new Set(value as string[])]
      : null;
  const tabs = texts(from["tabs"]);
  if (tabs !== null) {
    state.tabs = tabs.filter((tab) => tab.startsWith("file:") || tab.startsWith("view:"));
    const active = from["active"];
    state.active =
      typeof active === "string" && state.tabs.includes(active) ? active : (state.tabs[0] ?? null);
  }
  state.folded = texts(from["folded"]) ?? [];
  const plots = from["plots"] as Record<string, unknown> | undefined;
  if (typeof plots === "object" && plots !== null) {
    state.plots.order = texts(plots["order"]) ?? [];
    state.plots.pinned = (texts(plots["pinned"]) ?? []).slice(0, 4);
    if (typeof plots["shown"] === "string") state.plots.shown = plots["shown"];
    const page = plots["page"];
    if (page === "fit" || page === "one_column" || page === "two_column" || page === "slide") {
      state.plots.page = page;
    }
  }
  return state;
}

/** The view state as the file holds it: its version first, and the parts not known kept. */
export function writeViews(state: ViewState): string {
  const { others, ...known } = state;
  return `${JSON.stringify({ ...others, version: VIEWS_VERSION, ...known }, null, 2)}\n`;
}

/** The sections of the Topics pane, by their keys; a family of codes is `codes:` and its name. */
export const TOPICS = {
  packages: "packages",
  codes: "codes",
  using: "using",
} as const;
/** The key of a family of codes in the Topics pane. */
export const familyTopic = (family: string) => `codes:${family}`;

/**
 * Whether a section of the Topics pane is open: as the reader left it, or as it first stands:
 * the sections open, and each family of codes folded to its name.
 */
export function topicOpen(state: ViewState, key: string): boolean {
  return state.help.topics[key] ?? !key.startsWith("codes:");
}

/**
 * The views a start begins from (release 0.2.4, step 11; open decision #220, item 8): whatever
 * place a project was left on, it opens on the Script place, with the file it last showed
 * there; and the first click on Help shows Home with every section of the Topics pane closed.
 * Everything else is as the project keeps it. Within a visit the reader's choices stand: Help
 * returns to the page being read, with Topics as the reader left it.
 */
export function started(state: ViewState): ViewState {
  const file = (tab: string) => tab.startsWith("file:");
  const active =
    state.active !== null && file(state.active)
      ? state.active
      : (state.tabs.find((tab) => file(tab) && tab.endsWith(".zeff")) ??
        state.tabs.find(file) ??
        null);
  const closed = Object.fromEntries(Object.values(TOPICS).map((key) => [key, false]));
  return { ...state, active, help: { topics: closed } };
}

/** The lines unfolded in `path` with the output of the statement at `line` unfolded or folded. */
export function unfoldToggled(state: ViewState, path: string, line: number): number[] {
  const now = state.script.unfolded[path] ?? [];
  return now.includes(line)
    ? now.filter((one) => one !== line)
    : [...now, line].sort((a, b) => a - b);
}

/** The tabs with `tab` open and shown; a tab already open is shown, not opened twice. */
export function withTab(state: ViewState, tab: string): Pick<ViewState, "tabs" | "active"> {
  return { tabs: state.tabs.includes(tab) ? state.tabs : [...state.tabs, tab], active: tab };
}
