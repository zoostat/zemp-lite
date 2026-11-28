// What the projects screen says of each project, in words (release 0.3.1, step 12a; open
// decision #245: the projects as a table): how its last run went, its size, its scripts in
// one line, which rows a filter keeps, and the space the browser says the site uses.
import type { Ran } from "../project/projects";

/** How a project's last run went, as its row says it: the words, and the colour they are in. */
export interface RunState {
  tone: "ok" | "warning" | "error" | "none";
  words: string;
}

const counted = (count: number, one: string) => `${count} ${one}${count === 1 ? "" : "s"}`;

/**
 * How a project's last run went, from the record kept of it: its errors where it gave any,
 * its warnings where it gave those alone, "clean" where it gave neither, and "not run" where
 * this browser remembers no run.
 */
export function lastRun(ran: Ran | null): RunState {
  if (ran === null) return { tone: "none", words: "not run" };
  if (ran.errors > 0) return { tone: "error", words: counted(ran.errors, "error") };
  if (ran.warnings > 0) return { tone: "warning", words: counted(ran.warnings, "warning") };
  return { tone: "ok", words: "clean" };
}

/**
 * A size as a row writes it: megabytes to one decimal from a million bytes ("1.9 MB"), as the
 * other screens write them; whole kilobytes under that ("412 kB", never less than 1); bytes
 * under a thousand.
 */
export function sizeOf(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
  if (bytes >= 999_500) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${Math.round(bytes / 1_000)} kB`;
  return counted(bytes, "byte");
}

/** The name of a script, without the folders above it. */
const named = (path: string) => path.slice(path.lastIndexOf("/") + 1);

/**
 * A project's scripts in one line, by their names: all of three or fewer; of more, the first
 * three and how many more; "no script" where it has none.
 */
export function scriptsLine(scripts: string[]): string {
  if (scripts.length === 0) return "no script";
  const names = scripts.map(named);
  return names.length <= 3
    ? names.join(", ")
    : `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`;
}

/**
 * The rows a filter keeps: those whose name, or the name of one of whose scripts, holds what
 * was typed, whatever the capitals; every row where nothing is typed. Their order is kept.
 */
export function filtered<Row extends { name: string; scripts: string[] }>(
  rows: Row[],
  typed: string,
): Row[] {
  const wanted = typed.trim().toLowerCase();
  if (wanted === "") return rows;
  return rows.filter((row) =>
    [row.name, ...row.scripts.map(named)].some((word) => word.toLowerCase().includes(wanted)),
  );
}

/** What a browser says of the space a site uses (`navigator.storage.estimate()`). */
export interface Estimate {
  usage?: number;
  quota?: number;
}

/**
 * The space the browser says the site uses, in words, and its share of what the browser
 * allows, from 0 to 1, where it says that too. None where the browser gives no number: the
 * screen then leaves the space out.
 */
export function usedOf(
  estimate: Estimate | null | undefined,
): { words: string; share: number | null } | null {
  const usage = estimate?.usage;
  if (typeof usage !== "number" || !Number.isFinite(usage) || usage < 0) return null;
  const quota = estimate?.quota;
  const share =
    typeof quota === "number" && Number.isFinite(quota) && quota > 0
      ? Math.min(1, usage / quota)
      : null;
  return { words: `${sizeOf(usage)} used`, share };
}
