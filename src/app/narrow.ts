// Zemp Lite is made for a computer (open decision #243; release 0.3.1, step 3). Its screens
// are laid out for a window of 1,024 pixels or more, which a tablet held sideways has; below
// 1,000 pixels a page says so, and a visitor may go on at their own risk: their projects and
// the engine work as on a computer. That they went on is kept for the visit, by the tab.

/** The width, in pixels, below which the window is told that Zemp Lite is made for a computer. */
export const NARROWEST = 1000;

const WENT_ON = "zemp-went-on";

/** Whether a window this wide is narrower than Zemp Lite is laid out for. */
export function tooNarrow(width: number): boolean {
  return width < NARROWEST;
}

/** Whether the visitor went on in this tab; a browser that keeps no note is asked again. */
export function wentOn(kept: Pick<Storage, "getItem"> | null): boolean {
  try {
    return kept?.getItem(WENT_ON) === "1";
  } catch {
    return false;
  }
}

/** The visitor goes on: kept for the visit, where the browser keeps anything. */
export function goOn(kept: Pick<Storage, "setItem"> | null): void {
  try {
    kept?.setItem(WENT_ON, "1");
  } catch {
    // Nothing is kept: the page is shown again at the next load.
  }
}

/** The tab's own storage, or `null` where the browser gives none. */
export function tabStorage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}
