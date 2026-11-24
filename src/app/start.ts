// What the loading screen shows of the engine's start (release 0.2.4, step 6b; open decision
// #220, item 10): a bar that glides however fast the steps finish, steps that are marked done
// as the bar passes them, and a first step that says truly how the engine came: over the
// network, with the bytes that travelled, or from the browser's own keeping.

export type State = "waiting" | "going" | "done" | "failed";

/** How long the bar takes to fill where nothing holds it back, in milliseconds. */
export const GLIDE_MS = 1000;

/** The share of the bar each step has: the fetching is the long one. */
export const SHARE = { fetching: 70, checking: 15, starting: 15 } as const;

/** Where the three steps have got to, of a hundred: the fetching counted by the share that has come. */
export function reached(steps: Steps, share: number | null): number {
  return (
    (steps.fetching === "done" ? SHARE.fetching : ((share ?? 0) * SHARE.fetching) / 100) +
    (steps.checking === "done" ? SHARE.checking : 0) +
    (steps.starting === "done" ? SHARE.starting : 0)
  );
}

/**
 * The bar a moment later: it moves towards where the steps have got to, never faster than
 * the whole bar in `GLIDE_MS`, and never backwards unless the steps begin again.
 */
export function glided(shown: number, target: number, elapsed: number): number {
  if (target < shown) return target;
  return Math.min(target, shown + (Math.max(0, elapsed) / GLIDE_MS) * 100);
}

export interface Steps {
  fetching: State;
  checking: State;
  starting: State;
}

/**
 * The steps as the screen marks them: a step is done once it is done and the bar has reached
 * its end of the bar; until then it runs. So the marks and the bar never disagree, and
 * **Start** opens when the bar is full. A step that failed is marked at once.
 */
export function marked(steps: Steps, shown: number): Steps {
  /** A step after the first: it waits until the one before it is marked done. */
  const at = (state: State, end: number, before: State): State =>
    state === "failed"
      ? "failed"
      : before !== "done" || state === "waiting"
        ? "waiting"
        : state === "done" && shown >= end - 0.001
          ? "done"
          : "going";
  const fetching: State =
    steps.fetching === "failed"
      ? "failed"
      : steps.fetching === "done" && shown >= SHARE.fetching - 0.001
        ? "done"
        : steps.fetching === "waiting"
          ? "waiting"
          : "going";
  const checking = at(steps.checking, SHARE.fetching + SHARE.checking, fetching);
  const starting = at(steps.starting, 100, checking);
  return { fetching, checking, starting };
}

/** How the engine's file came, as the browser's own record of the fetch says. */
export type Came =
  /** Over the network: the bytes that travelled. */
  | { how: "fetched"; bytes: number }
  /** From the browser's keeping: nothing of it travelled. */
  | { how: "kept" }
  /** The browser's record does not say. */
  | null;

/**
 * Read from the browser's record of a fetch (Resource Timing). A file taken from the browser's
 * keeping has a body but no transfer, or the transfer of a short answer that says it has not
 * changed; a file fetched travelled about as many bytes as its body, as it was sent.
 */
export function came(entry: { transferSize?: number; encodedBodySize?: number } | undefined): Came {
  const sent = entry?.transferSize;
  const body = entry?.encodedBodySize;
  if (typeof sent !== "number" || typeof body !== "number" || body <= 0) return null;
  if (sent < body / 2) return { how: "kept" };
  return { how: "fetched", bytes: body };
}
