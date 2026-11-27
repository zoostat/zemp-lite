// The run in one line (the margin editor's design, section 5; open decision #245): its number,
// when it began, how many statements it ran and how long they took. The bar of the Script
// place writes it whole; the line at the foot of the window writes it without the time of
// day, which the bar has (release 0.3.1, step 5).
import { took, type Run } from "../output/run";
import { counted } from "./notes";

/** A run as one line, with the time of day it began or without it; a script not run yet says so. */
export function runLine(run: Run | null, clock: boolean): string {
  if (run === null) return "not run yet";
  const statements = (n: number) => `${counted(n)} statement${n === 1 ? "" : "s"}`;
  const head = clock ? `run ${run.number} · ${run.clock}` : `run ${run.number}`;
  if (run.checkOnly) return clock ? `check · ${run.clock}` : "check";
  if (run.state === "running") {
    const at = run.statements.length;
    return run.of === null ? `${head} · running` : `${head} · statement ${at} of ${run.of}`;
  }
  const ran = run.statements.length;
  const time = run.ms === null ? "" : ` in ${took(run.ms)}`;
  if (run.state === "done") return `${head} · ${statements(ran)}${time}`;
  return `${head} · ${run.state === "failed" ? "ended with an error" : run.state} after ${statements(ran)}`;
}
