// The view state of a project as the page was left (release 0.2.2; found at step 6). The view
// state is written to the project a fifth of a second after a change, and a page that is being
// left cannot be relied on to finish a writing it has begun: what a reader set in the last
// moment before closing the tab, or loading the page again, was lost. The browser's own small
// record is written at once and outlasts the page, so at the moment the page is left the view
// state is noted there, by the project's folder; the next opening of that project takes it up,
// writes it to the project, and forgets the note.
import type { Kept } from "../theme/theme";

const LEFT = "zemp-views-left";

function read(kept: Kept): Record<string, string> {
  try {
    const held = JSON.parse(kept.getItem(LEFT) ?? "{}") as unknown;
    if (typeof held !== "object" || held === null || Array.isArray(held)) return {};
    return Object.fromEntries(
      Object.entries(held).filter((one): one is [string, string] => typeof one[1] === "string"),
    );
  } catch {
    return {};
  }
}

/** Note the view state of a project as its page is left: the text its `views.json` would hold. */
export function noteLeft(kept: Kept, folder: string, views: string): void {
  try {
    kept.setItem(LEFT, JSON.stringify({ ...read(kept), [folder]: views }));
  } catch {
    // A browser that keeps no note keeps what was written to the project, as before.
  }
}

/** Take up what was noted for a project when its page was left, once: `null` where nothing was. */
export function takeLeft(kept: Kept, folder: string): string | null {
  const all = read(kept);
  const views = all[folder];
  if (views === undefined) return null;
  try {
    kept.setItem(
      LEFT,
      JSON.stringify(Object.fromEntries(Object.entries(all).filter(([name]) => name !== folder))),
    );
  } catch {
    // It is taken up all the same.
  }
  return views;
}
