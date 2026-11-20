// The function whose name the cursor is on, for the Help panel (#74) and F1: a name followed,
// after any spaces, by an opening bracket, as `summary` in `w.summary(` or `reg` in `reg (`.
// Only the shape is read; the page is the engine's, and a name with no page shows none.

const NAME = /[\p{L}_][\p{L}\p{N}_]*/gu;

/** The function named at `column` of `line` (columns from 0), or `null`. */
export function functionAt(line: string, column: number): string | null {
  for (const found of line.matchAll(NAME)) {
    const from = found.index;
    const to = from + found[0].length;
    if (column < from || column > to) continue;
    const after = line.slice(to).trimStart();
    return after.startsWith("(") ? found[0] : null;
  }
  return null;
}

/** The name at `column` of `line`, whatever follows it, or `null`. */
export function wordAt(line: string, column: number): string | null {
  for (const found of line.matchAll(NAME)) {
    if (column >= found.index && column <= found.index + found[0].length) return found[0];
  }
  return null;
}
