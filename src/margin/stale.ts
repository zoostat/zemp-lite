// Which results on the page are still the script's (the margin editor's design, 7.8 and 7.9).
// A result is fresh when the engine would reuse it for the script as it stands; the engine of
// 0.8.0 cannot yet say so (C3 of #175, with the cache of 0.11.0), nor which statements read a
// file or draw random numbers, which its dependency graph does not see. So the rule here is the
// safe one: a statement whose own text changed is `edited`; every result below the first
// statement that changed is `stale`, keeping its last value; every result above it is fresh.
// Too many marked is safe; too few is not.
import type { Ranged } from "../engine/messages";
import type { Run, Statement } from "../output/run";
import { lineMap, placeOf } from "./follow";

export type Mark = "fresh" | "edited" | "stale";

/** A statement's text: its lines, from its first to its last. */
function textOf(lines: string[], range: Ranged): string {
  return lines.slice(range.line - 1, range.end).join("\n");
}

/**
 * For each statement of the run's text, by the line it began on there: its mark against the
 * script as it stands (`text`, whose statements the engine reads as `now`), and the line it now
 * begins on, or `null` where its first line is gone.
 */
export function marks(
  run: Pick<Run, "text" | "ranges">,
  text: string,
  now: readonly Ranged[],
): Map<number, { mark: Mark; line: number | null }> {
  const before = (run.ranges ?? []).filter((range) => range.kind === "statement");
  const statements = now.filter((range) => range.kind === "statement");
  const map = lineMap(run.text, text);
  const oldLines = run.text.split("\n");
  const newLines = text.split("\n");
  const found = new Map<number, { mark: Mark; line: number | null }>();
  const starts = new Set(statements.map((one) => one.line));
  // Every result at or below this line is stale: the line below a statement that changed or
  // was added, or the line a statement taken out stood before.
  let boundary = Infinity;
  for (const range of before) {
    // Where its first line changed, it is placed by the nearest kept line above it, where a
    // statement of the script as it stands begins there.
    let line = placeOf(map, range.line, newLines.length);
    if (line !== null && !map.has(range.line) && !starts.has(line)) line = null;
    const there = line === null ? undefined : statements.find((one) => one.line === line);
    const same = there !== undefined && textOf(oldLines, range) === textOf(newLines, there);
    if (line === null) {
      // Taken out: what stood after it is below it.
      const after = [...map.entries()].filter(([old]) => old > range.end).map(([, at]) => at);
      boundary = Math.min(boundary, after.length > 0 ? Math.min(...after) : newLines.length + 1);
    } else if (!same) {
      boundary = Math.min(boundary, (there?.end ?? line) + 1);
    }
    found.set(range.line, { mark: same ? "fresh" : "edited", line });
  }
  // A statement of the script as it stands that is none of the run's: added.
  const placed = new Set([...found.values()].map((one) => one.line));
  for (const range of statements) {
    if (!placed.has(range.line)) boundary = Math.min(boundary, range.end + 1);
  }
  for (const [key, value] of found) {
    if (value.mark === "fresh" && value.line !== null && value.line >= boundary) {
      found.set(key, { mark: "stale", line: value.line });
    }
  }
  return found;
}

/**
 * The page after a run of less than the script (`partial`, whose text is the script as it
 * stands and whose ranges are all of its statements): the results it made, and every other
 * result of the page before (`previous`) kept, moved to the line its statement now begins on,
 * and marked as `marks` has it, an earlier mark kept. A result whose statement is gone is gone.
 */
export function merged(previous: Run, partial: Run): Run {
  const ran = new Set(partial.statements.map((one) => one.line));
  const marked = marks(previous, partial.text, partial.ranges ?? []);
  const carried: Statement[] = [];
  for (const statement of previous.statements) {
    const at = marked.get(statement.line);
    if (at === undefined || at.line === null || ran.has(at.line)) continue;
    const mark = at.mark === "fresh" ? statement.mark : at.mark;
    carried.push({ ...statement, line: at.line, ...(mark === undefined ? {} : { mark }) });
  }
  const info = [
    ...partial.info,
    ...previous.info.flatMap((one) => {
      const at = marked.get(one.line);
      if (at === undefined || at.line === null || ran.has(at.line)) return [];
      return [{ ...one, line: at.line, end: at.line + (one.end - one.line) }];
    }),
  ].sort((a, b) => a.line - b.line);
  return {
    ...partial,
    statements: [...partial.statements, ...carried].sort((a, b) => a.line - b.line),
    info,
  };
}
