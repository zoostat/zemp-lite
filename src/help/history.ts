// The history of the Help place (release 0.2.3, step 3a; open decision #211, part 3): the
// pages this reader opened, in order, with where they now stand among them. **Back** and
// **Forward** go through it as a web browser's do: a page opened after going back drops what
// lay forward, and the same page opened twice in a row is there once. It lasts as long as
// the window; nothing of it is kept with the project.

/**
 * A page of the Help place: Home, where Help starts; what `zeff help <name>` prints for a
 * name (a function's page, a dataset's, a package's list); or a code's explained page.
 */
export type Stop =
  { kind: "home" } | { kind: "name"; name: string } | { kind: "code"; code: string };

/** The pages opened, oldest first, and the one shown; `at` is -1 before any is opened. */
export interface History {
  stops: Stop[];
  at: number;
}

/** The pages a history keeps: opening one more forgets the oldest. */
export const KEPT = 200;

export const HOME: Stop = { kind: "home" };

/** A history with nothing opened yet. */
export function begun(): History {
  return { stops: [], at: -1 };
}

/** Whether two stops are the same page. */
export function same(a: Stop, b: Stop): boolean {
  if (a.kind === "home" || b.kind === "home") return a.kind === b.kind;
  if (a.kind === "name") return b.kind === "name" && a.name === b.name;
  return b.kind === "code" && a.code === b.code;
}

/** The page shown, or none before any is opened. */
export function here(history: History): Stop | null {
  return history.stops[history.at] ?? null;
}

/**
 * A page opened: it follows the one shown, and what lay forward of that is dropped. The page
 * already shown is not entered again. Past `KEPT` pages the oldest is forgotten.
 */
export function opened(history: History, stop: Stop): History {
  const shown = here(history);
  if (shown !== null && same(shown, stop)) return history;
  const stops = [...history.stops.slice(0, history.at + 1), stop].slice(-KEPT);
  return { stops, at: stops.length - 1 };
}

/** The page Back goes to, or none where this is the first. */
export function before(history: History): Stop | null {
  return history.at > 0 ? (history.stops[history.at - 1] ?? null) : null;
}

/** The page Forward goes to, or none where this is the last. */
export function after(history: History): Stop | null {
  return history.stops[history.at + 1] ?? null;
}

/** One page back; the same history where there is nowhere to go. */
export function back(history: History): History {
  return before(history) === null ? history : { stops: history.stops, at: history.at - 1 };
}

/** One page forward; the same history where there is nowhere to go. */
export function forward(history: History): History {
  return after(history) === null ? history : { stops: history.stops, at: history.at + 1 };
}

/** What a stop is called, for a button that goes to it: `Home`, a name, or a code. */
export function called(stop: Stop): string {
  if (stop.kind === "home") return "Home";
  return stop.kind === "name" ? stop.name : stop.code;
}
