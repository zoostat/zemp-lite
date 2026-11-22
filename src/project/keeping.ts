// Whether the browser keeps the projects, and the reminder to export (release 0.2.2, step 6;
// the Zemp Specification, section 10; open decision #117). Projects on the web live in the
// browser's private storage, which is lost if the site's data is cleared or the browser
// evicts it. So the browser is asked, when the first project is made, to keep that storage
// for good; and where it does not agree, or a project has not been exported for 30 days, a
// line in the status bar says so, with **Export project…** beside it. Nothing is exported
// without the reader.

/**
 * What the browser does with the projects: keeps them and has agreed not to clear them on its
 * own; keeps them but may clear them when the computer runs short of room; or gives the page
 * no storage at all, so that a project lasts until the tab is closed.
 */
export type Keeping = "kept" | "may-clear" | "none";

/** What a browser's storage answers to, as far as this needs it (`navigator.storage`). */
export interface Asks {
  persisted?: () => Promise<boolean>;
  persist?: () => Promise<boolean>;
}

/**
 * What the browser does with the projects. `lasting` is whether it gives the page a private
 * file system at all; `ask` is whether to ask it now to keep the storage for good, which is
 * done once, when the first project is made. A browser that cannot be asked, or that fails
 * when asked, is one that may clear.
 */
export async function keepingOf(
  storage: Asks | undefined,
  lasting: boolean,
  ask: boolean,
): Promise<Keeping> {
  if (!lasting) return "none";
  try {
    if ((await storage?.persisted?.()) === true) return "kept";
    if (ask && (await storage?.persist?.()) === true) return "kept";
  } catch {
    // A browser that fails here is not one that has agreed.
  }
  return "may-clear";
}

const DAY = 24 * 60 * 60 * 1000;
/** After how long without an export the status bar says so. */
export const REMIND_AFTER = 30 * DAY;

/** How long ago a moment was, in whole days: "today", "yesterday", "12 days ago". */
function ago(then: number, now: number): string {
  const days = Math.max(0, Math.floor((now - then) / DAY));
  return days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
}

/**
 * The line of the status bar for a project, or `null` where there is nothing to say: the
 * browser has agreed to keep the storage and the project was exported, or made, within the
 * last 30 days. `made` and `exported` are moments in milliseconds, `null` where not known.
 */
export function reminderOf(
  times: { made: number | null; exported: number | null },
  keeping: Keeping,
  now: number,
): string | null {
  const last =
    times.exported === null ? "not exported yet" : `exported ${ago(times.exported, now)}`;
  if (keeping === "none") return `this browser keeps no project after the tab is closed · ${last}`;
  if (keeping === "may-clear") return `the browser may clear this project · ${last}`;
  if (times.exported !== null) {
    return now - times.exported >= REMIND_AFTER
      ? `not exported for ${Math.floor((now - times.exported) / DAY)} days`
      : null;
  }
  return times.made !== null && now - times.made >= REMIND_AFTER
    ? `not exported yet, ${Math.floor((now - times.made) / DAY)} days after it was made`
    : null;
}
