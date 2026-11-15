// The watermark: the logo's geometry grown outwards (the design guide, section 6). Nine
// hexagons; from the centre one, each ring's centre moves by (−2.6, +2.6) and its radius
// grows by 11.4 from 9.7. The centre one is filled; the rings grow fainter and thinner
// outwards.

export interface Ring {
  /** The six corners, as the `points` of a polygon. */
  points: string;
  /** The width of its line, and how strongly it is drawn; the centre one has neither. */
  width: number;
  opacity: number;
}

const RINGS = 9;

/** The rings from the outermost to the centre, the order they are drawn in. */
export function rings(): Ring[] {
  const made: Ring[] = [];
  for (let k = RINGS - 1; k >= 0; k--) {
    const cx = 57.8 - 2.6 * k;
    const cy = 42.2 + 2.6 * k;
    const r = 9.7 + 11.4 * k;
    const dx = (r * Math.sqrt(3)) / 2;
    const corners = [
      [cx, cy - r],
      [cx + dx, cy - r / 2],
      [cx + dx, cy + r / 2],
      [cx, cy + r],
      [cx - dx, cy + r / 2],
      [cx - dx, cy - r / 2],
    ] as const;
    made.push({
      points: corners.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" "),
      // From 2.40 and 1.00 at the first ring to 0.80 and 0.28 at the eighth.
      width: k === 0 ? 0 : 2.4 - ((k - 1) * 1.6) / 7,
      opacity: k === 0 ? 0 : 1 - ((k - 1) * 0.72) / 7,
    });
  }
  return made;
}
