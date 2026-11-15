// The plot viewer's own state, as pure functions: the order of the gallery strip and the
// plots pinned side by side. Both are view state (Zemp Specification, section 5). A plot is
// named by the text of its statement, which is what stays the same from one run to the next.
import type { PlotStatement } from "./figures";

/** The most plots that are compared side by side (section 7, "Compare"). */
export const MOST_PINNED = 4;

/** The plots of a run in the order the strip keeps: those it knows first, in its order, then the new ones. */
export function ordered(plots: PlotStatement[], order: string[]): PlotStatement[] {
  const place = (plot: PlotStatement) => {
    const at = order.indexOf(plot.source);
    return at < 0 ? order.length : at;
  };
  return [...plots].sort((a, b) => place(a) - place(b) || a.line - b.line);
}

/** The order of the strip after the plot at `from` is moved to stand at `to`. */
export function moved(sources: string[], from: number, to: number): string[] {
  if (from < 0 || from >= sources.length || to < 0 || to >= sources.length || from === to) {
    return sources;
  }
  const now = [...sources];
  const [one] = now.splice(from, 1) as [string];
  now.splice(to, 0, one);
  return now;
}

/** The pins after a plot's pin is pressed: taken off where it was on, put on where there is room. */
export function toggled(pinned: string[], source: string): string[] {
  if (pinned.includes(source)) {
    return pinned.filter((one) => one !== source);
  }
  return pinned.length >= MOST_PINNED ? pinned : [...pinned, source];
}

/** The plots to compare: those pinned that the run has, in the strip's order; fewer than two is no comparison. */
export function compared(strip: PlotStatement[], pinned: string[]): PlotStatement[] {
  const found = strip.filter((plot) => pinned.includes(plot.source)).slice(0, MOST_PINNED);
  return found.length >= 2 ? found : [];
}
