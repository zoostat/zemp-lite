// What is unfolded follows the script as it is edited (the margin editor's design, 7.5: "What
// is unfolded is kept with the project's view state"). Outputs are unfolded by the line their
// statement begins on; when lines are typed or taken out above a statement, its line moves.
// So when a script is run again, the lines unfolded in the text that ran last are carried to
// the text that runs now, line by line: a line kept is followed to where it now stands, and a
// line taken out is dropped.

/**
 * Where each line of `before` stands in `after`, both counted from 1, or nothing where it was
 * taken out: the lines common to both, in order, found by the longest common run of lines
 * between what is the same at the start and at the end.
 */
export function lineMap(before: string, after: string): Map<number, number> {
  const a = before.split("\n");
  const b = after.split("\n");
  const map = new Map<number, number>();
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) {
    map.set(start + 1, start + 1);
    start += 1;
  }
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    map.set(endA, endB);
    endA -= 1;
    endB -= 1;
  }
  // The lines between: the longest common subsequence, where it is small enough to find
  // quickly; a change wider than that keeps nothing of it.
  const m = endA - start;
  const n = endB - start;
  if (m === 0 || n === 0 || m * n > 4_000_000) return map;
  const width = n + 1;
  const table = new Uint32Array((m + 1) * width);
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      table[i * width + j] =
        a[start + i] === b[start + j]
          ? (table[(i + 1) * width + j + 1] as number) + 1
          : Math.max(table[(i + 1) * width + j] as number, table[i * width + j + 1] as number);
    }
  }
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[start + i] === b[start + j]) {
      map.set(start + i + 1, start + j + 1);
      i += 1;
      j += 1;
    } else if ((table[(i + 1) * width + j] as number) >= (table[i * width + j + 1] as number)) {
      i += 1;
    } else {
      j += 1;
    }
  }
  return map;
}

/**
 * Where a line of `before` stands in `after`: where it is kept, there; where it was changed,
 * the line as far below the nearest kept line above it as it was, unless a kept line stands
 * there or the text is shorter; `null` where it cannot be placed.
 */
export function placeOf(map: Map<number, number>, line: number, lines: number): number | null {
  const kept = map.get(line);
  if (kept !== undefined) return kept;
  const above = [...map.keys()].filter((old) => old < line).sort((a, b) => b - a)[0];
  const guess = above === undefined ? line : (map.get(above) as number) + (line - above);
  const taken = new Set(map.values());
  return guess <= lines && !taken.has(guess) ? guess : null;
}

/**
 * The lines `lines` of `before`, carried to where they stand in `after`, in order: a line
 * changed in place is followed to its place, and a line taken out is dropped.
 */
export function followed(before: string, after: string, lines: number[]): number[] {
  if (before === after || lines.length === 0) return lines;
  const map = lineMap(before, after);
  const count = after.split("\n").length;
  return lines
    .map((line) => placeOf(map, line, count))
    .filter((line): line is number => line !== null)
    .sort((x, y) => x - y);
}
