// A plot popped out into a window of its own. The window belongs to this one: it is given
// this window's styles and theme, and the plot in it is drawn by this window's engine, at the
// popped window's size. It closes when this window's project closes.
import { mount, unmount } from "svelte";
import type { Workspace } from "../app/workspace-state.svelte";
import type { PlotStatement } from "./figures";
import PopOut from "./PopOut.svelte";

const opened = new Set<Window>();

/** Open `plot` in a window of its own; `null` where the browser did not allow a window. */
export function popOut(workspace: Workspace, plot: PlotStatement): Window | null {
  const view = window.open("", "_blank", "popup,width=900,height=640");
  if (view === null) {
    return null;
  }
  const page = view.document;
  page.title = `Plot: ${plot.title}`;
  // The styles of this window, the fonts and the colour tokens among them, and its theme.
  for (const node of document.head.querySelectorAll('style, link[rel="stylesheet"]')) {
    page.head.append(node.cloneNode(true));
  }
  const theme = document.documentElement.dataset["theme"];
  if (theme !== undefined) page.documentElement.dataset["theme"] = theme;
  const component = mount(PopOut, { target: page.body, props: { workspace, plot, view } });
  opened.add(view);
  view.addEventListener("pagehide", () => {
    opened.delete(view);
    void unmount(component);
  });
  return view;
}

/** Close every window popped out of this one: its project is closing. */
export function closePopOuts(): void {
  for (const view of opened) view.close();
  opened.clear();
}
