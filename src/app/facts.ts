// What the landing page and the loading screen say of the engine (release 0.2.4, step 4; open
// decisions #220, items 1 and 3, and #211, item 12): taken from the engine the release carries
// when the pages are built (`tools/facts.mjs`), never written by hand. `null` only before the
// worker is built, where there is no build either.

/** The facts of the engine this build carries. */
export interface Facts {
  /** The engine's version, as the engine says it. */
  engine: string;
  /** How many functions, packages and explained codes its index lists. */
  functions: number;
  packages: number;
  codes: number;
  /** The Scratch project's regressions, as the landing page shows them. */
  script: string;
  /** What the engine prints for that script. */
  printed: string;
  /** The engine as it travels to a browser, in bytes. */
  travels: number;
}

export const FACTS: Facts | null = __ZEMP_FACTS__;

/** A size as the screens write it: megabytes to one decimal, as "2.9 MB". */
export function megabytes(bytes: number): string {
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

/** A count as the screens write it, with a comma between the thousands. */
export function counted(count: number): string {
  return count.toLocaleString("en-GB");
}
