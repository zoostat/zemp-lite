// Keeping the page where the reader is while a run replaces its output. When a run starts,
// the results of the run before are taken away, and for a moment the content is much shorter
// than it was; a browser then moves the reader to the top, and leaves them there when the new
// results arrive. So the content is held at its height for the length of the run, and when
// the new results are in, the reader is put back at what they were looking at: the line of
// the script, or the block of output, that stood at the top of their view.

/** Things on the page a reader's place is known by, each with a name: the lines, or the blocks. */
export type Marks = () => Iterable<[string, Element]>;

/**
 * Hold `content` at the height it has now, inside `scroller`, and note which mark stands at
 * the top of the reader's view. Gives back what releases it: the reader is put back at that
 * mark, as the new content settles, and the content is let take its own height again.
 */
export function held(content: HTMLElement, scroller: HTMLElement, marks: Marks): () => void {
  const top = scroller.scrollTop;
  const edge = () => scroller.getBoundingClientRect().top;
  let anchor: { name: string; offset: number } | null = null;
  for (const [name, mark] of marks()) {
    const box = mark.getBoundingClientRect();
    if (box.bottom > edge() + 1) {
      anchor = { name, offset: box.top - edge() };
      break;
    }
  }
  content.style.minHeight = `${content.offsetHeight}px`;

  return () => {
    scroller.scrollTop = top;
    // The new results take a few frames to reach their sizes (a figure's place is measured
    // after it is drawn), so the reader's mark is brought back to its place until it stays
    // there, for a second and a half at the most.
    let frames = 0;
    let steady = 0;
    const settle = () => {
      frames += 1;
      let moved = false;
      if (anchor !== null) {
        for (const [name, mark] of marks()) {
          if (name !== anchor.name) continue;
          const off = mark.getBoundingClientRect().top - edge() - anchor.offset;
          if (Math.abs(off) >= 1) {
            scroller.scrollTop += off;
            moved = true;
          }
          break;
        }
      }
      steady = moved ? 0 : steady + 1;
      if (steady >= 6 || frames >= 90) {
        content.style.minHeight = "";
        return;
      }
      requestAnimationFrame(settle);
    };
    requestAnimationFrame(settle);
  };
}
