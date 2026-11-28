// What the front page says of the engine (release 0.2.4, step 4; open decision #220, item 3;
// the example from release 0.3.1, step 13, and open decision #245): its size as it travels,
// and a short script with what the engine prints for it, both taken from the engine the
// release carries when the app is built (`tools/facts.mjs`), never written by hand. `null`
// only before the worker is built, where there is no build either.

/** The facts of the engine this build carries. */
export interface Facts {
  /** The engine as it travels to a browser, in bytes. */
  travels: number;
  /** A short script, and what this engine prints for it, to the character. */
  example: { script: string; printed: string };
}

export const FACTS: Facts | null = __ZEMP_FACTS__;

/** A size as the screens write it: megabytes to one decimal, as "2.9 MB". */
export function megabytes(bytes: number): string {
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}
