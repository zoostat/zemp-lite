// The side menu of a project (release 0.3.1, step 4; open decision #245, and #33 as amended
// for this menu alone): the places as icons at the left of every place, each named on hover
// and on focus with what it holds and its key. Here are the keys and the words; the icons and
// the drawing are `SideMenu.svelte`.

/** The places a key opens, in the order of their keys: ⌘1 to ⌘5 (Ctrl 1 to Ctrl 5 elsewhere). */
export const KEYED = ["script", "data", "plots", "paper", "help"] as const;
export type Keyed = (typeof KEYED)[number];

/** A key as the window hears it: the part of a keyboard event the menu reads. */
export interface Pressed {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

/**
 * The place a key opens, or `null`: ⌘ or Ctrl with a figure from 1 to 5, and nothing else
 * held. (A browser has the same keys for its own tabs; the app takes them while it has the
 * keyboard, and each place is reached as well by its icon and from ⌘K.)
 */
export function placeOfKey(pressed: Pressed): Keyed | null {
  if (!(pressed.metaKey || pressed.ctrlKey) || pressed.altKey || pressed.shiftKey) return null;
  const at = "12345".indexOf(pressed.key);
  return pressed.key.length !== 1 || at < 0 ? null : (KEYED[at] as Keyed);
}

/** The key of a place as this computer writes it: `⌘3` on a Mac, `Ctrl 3` elsewhere. */
export function keyOf(place: Keyed, mac: boolean): string {
  const figure = KEYED.indexOf(place) + 1;
  return mac ? `⌘${figure}` : `Ctrl ${figure}`;
}

/** What a project holds now, as far as the menu says it. */
export interface Held {
  /** The script shown in Script, by its path, or `null`. */
  script: string | null;
  /** The frames and the plots the last run made. */
  frames: number;
  plots: number;
  /** Whether the script has been run. */
  ran: boolean;
  /** The paper open in Paper, by its path, or `null`; and how many papers the project has. */
  paper: string | null;
  papers: number;
}

const counted = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

/** What each place holds, in a few words, under its name on hover and on focus. */
export function holds(held: Held): Record<Keyed, string> {
  const name = (path: string) => path.split("/").at(-1) ?? path;
  return {
    script: held.script === null ? "the project's scripts" : name(held.script),
    data: held.ran
      ? `${counted(held.frames, "frame", "frames")} of the run`
      : "the frames of a run",
    plots: held.ran ? `${counted(held.plots, "plot", "plots")} of the run` : "the plots of a run",
    paper:
      held.paper !== null
        ? name(held.paper)
        : held.papers === 0
          ? "no paper yet"
          : counted(held.papers, "paper", "papers"),
    help: "functions, messages, Zemp Lite",
  };
}
