// View state: what is shown, never what is computed (Zemp Specification, section 5, "Analysis
// state and view state"). The layout of a window is kept with its project, in
// `.zemp/views.json`, which a replication package omits: which layout, the left panel's tab
// and width, the share of the script's pane the output takes, the open tabs. Whatever the
// file holds that is not understood is passed over, and the default is used in its place, so
// a file written by a later version, or damaged, never keeps a project from opening.

export type Layout = "inline" | "panes";
export type LeftTab = "project" | "objects";

export interface ViewState {
  /** Inline, one column with each output under its statement, or Panes (section 5). */
  layout: Layout;
  left: {
    tab: LeftTab;
    /** The panel's width, in pixels. */
    width: number;
    shown: boolean;
  };
  output: {
    /** The share of the script's pane the Output panel takes, from 0 to 1. */
    share: number;
    shown: boolean;
  };
  /** The open tabs, in order: `file:` and a path of the project, or `view:` and a viewer's name. */
  tabs: string[];
  /** The tab shown, one of `tabs`, or `null` where none is open. */
  active: string | null;
  /** The folders folded away in the project tree, by path. */
  folded: string[];
}

/** The narrowest and the widest the left panel goes. */
export const LEFT_WIDTH = { least: 180, most: 520, usual: 268 } as const;
/** The least and the most of the script's pane the output takes. */
export const OUTPUT_SHARE = { least: 0.12, most: 0.85, usual: 0.42 } as const;

/** The tab of a file of the project. */
export const fileTab = (path: string) => `file:${path}`;
/** The path of a file's tab, or `null` for a tab that is not a file's. */
export const tabPath = (tab: string) => (tab.startsWith("file:") ? tab.slice(5) : null);

/** A project opened for the first time: its main script in a tab. */
export function usual(): ViewState {
  return {
    // Zemp Lite opens in Inline (section 5).
    layout: "inline",
    left: { tab: "project", width: LEFT_WIDTH.usual, shown: true },
    output: { share: OUTPUT_SHARE.usual, shown: true },
    tabs: [fileTab("scripts/main.zeff")],
    active: fileTab("scripts/main.zeff"),
    folded: [],
  };
}

const within = (value: number, least: number, most: number) =>
  Math.min(most, Math.max(least, value));

/** The width the left panel is given when `width` is asked for. */
export const leftWidth = (width: number) =>
  Math.round(within(width, LEFT_WIDTH.least, LEFT_WIDTH.most));

/** The share the output is given when `share` is asked for. */
export const outputShare = (share: number) => within(share, OUTPUT_SHARE.least, OUTPUT_SHARE.most);

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
  if (from["layout"] === "inline" || from["layout"] === "panes") {
    state.layout = from["layout"];
  }
  const left = from["left"] as Record<string, unknown> | undefined;
  if (typeof left === "object" && left !== null) {
    if (left["tab"] === "project" || left["tab"] === "objects") state.left.tab = left["tab"];
    if (typeof left["width"] === "number" && Number.isFinite(left["width"])) {
      state.left.width = leftWidth(left["width"]);
    }
    if (typeof left["shown"] === "boolean") state.left.shown = left["shown"];
  }
  const output = from["output"] as Record<string, unknown> | undefined;
  if (typeof output === "object" && output !== null) {
    if (typeof output["share"] === "number" && Number.isFinite(output["share"])) {
      state.output.share = outputShare(output["share"]);
    }
    if (typeof output["shown"] === "boolean") state.output.shown = output["shown"];
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
  return state;
}

/** The view state as the file holds it. */
export function writeViews(state: ViewState): string {
  return `${JSON.stringify(state, null, 2)}\n`;
}

/** The tabs with `tab` open and shown; a tab already open is shown, not opened twice. */
export function withTab(state: ViewState, tab: string): Pick<ViewState, "tabs" | "active"> {
  return { tabs: state.tabs.includes(tab) ? state.tabs : [...state.tabs, tab], active: tab };
}

/** The tabs with `tab` closed; where it was the one shown, its neighbour is shown. */
export function withoutTab(state: ViewState, tab: string): Pick<ViewState, "tabs" | "active"> {
  const at = state.tabs.indexOf(tab);
  if (at < 0) {
    return { tabs: state.tabs, active: state.active };
  }
  const tabs = state.tabs.filter((one) => one !== tab);
  const active = state.active === tab ? (tabs[at] ?? tabs[at - 1] ?? null) : state.active;
  return { tabs, active };
}
