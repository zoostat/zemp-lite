// Keeping the page where the reader is while a run replaces its output. When a run starts,
// the results of the run before are taken away, and for a moment the content is much shorter
// than it was; a browser then moves the reader to the top, and leaves them there when the new
// results arrive. So the content is held at its height for the length of the run, and when
// the new results are in, the reader is put back at what they were looking at: the statement
// of the script, or the block of output, that held the top of their view.

/** How a reader's place is known: by the thing that holds the top of their view. */
export interface Place {
  /**
   * The thing that holds the given height of the window, by a name it keeps across a run, and
   * how far its own top is from that height (above it, so nought or less, as a rule).
   */
  at(edge: number): { name: string; offset: number } | null;
  /** How far the top of the thing of that name is from that height now; null where it is gone. */
  from(name: string, edge: number): number | null;
}

/**
 * Hold `content` at the height it has now, inside `scroller`, and note what holds the top of
 * the reader's view. Gives back what releases it: the reader is put back at that thing, as
 * the new content settles, and the content is let take its own height again.
 */
export function held(content: HTMLElement, scroller: HTMLElement, place: Place): () => void {
  const edge = () => scroller.getBoundingClientRect().top;
  const anchor = place.at(edge());
  content.style.minHeight = `${content.offsetHeight}px`;
  // Some browsers move a page by themselves when what is above the reader changes its
  // height. While the place is kept here that is switched off, so that fewer hands move it.
  const anchoring = scroller.style.overflowAnchor;
  scroller.style.overflowAnchor = "none";
  // A reader who scrolls, during the run or as its results settle, is where they chose to
  // be, and is left there. They are known by what they do, never by the page having moved:
  // an editor moves its page too, when the results above the reader are taken away.
  let acted = false;
  const act = (event: Event) => {
    if (event instanceof KeyboardEvent) {
      // A key held down, a modifier, or a shortcut such as the one that ran the script.
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      if (["Shift", "Meta", "Control", "Alt", "CapsLock"].includes(event.key)) return;
    }
    acted = true;
  };
  const SIGNS = ["wheel", "touchmove", "pointerdown", "keydown"];
  for (const sign of SIGNS) scroller.addEventListener(sign, act, { capture: true, passive: true });
  const free = () => {
    for (const sign of SIGNS) scroller.removeEventListener(sign, act, { capture: true });
    content.style.minHeight = "";
    scroller.style.overflowAnchor = anchoring;
  };

  return () => {
    if (anchor === null) {
      free();
      return;
    }
    // The new results take a few frames to reach their sizes (a figure's place is measured
    // after it is drawn), so the reader's place is brought back until it stays there, for a
    // second and a half at the most.
    let frames = 0;
    let steady = 0;
    const settle = () => {
      if (acted) {
        free();
        return;
      }
      frames += 1;
      const now = place.from(anchor.name, edge());
      const off = now === null ? 0 : now - anchor.offset;
      const moved = Math.abs(off) >= 1;
      if (moved) scroller.scrollTop += off;
      steady = moved ? 0 : steady + 1;
      if (steady >= 6 || frames >= 90) {
        free();
        return;
      }
      requestAnimationFrame(settle);
    };
    settle();
  };
}
