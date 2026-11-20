// Where each block of a run stands: directly under its statement (Zemp Specification,
// section 5). From Zeff 0.8.0 the engine says where each statement begins and ends (its
// outline, told as the first event of a run), so a block stands under the last line the
// engine gives its statement; the interface reads no statement's shape of its own
// (docs/decisions.md, 21 November 2026, release 0.2, step 3).
import type { Ranged } from "../engine/messages";
import { blocks, type Block, type Run } from "./run";

export interface Placed {
  /** The line of the script the block stands under, counted from 1. */
  after: number;
  block: Block;
}

/** The lines of the text that ran. A text that ends with a line break has no line after it. */
export function linesOf(run: Run): string[] {
  const lines = run.text.split("\n");
  if (lines.at(-1) === "") lines.pop();
  return lines;
}

/**
 * The last line of the statement that holds line `line`, as the engine's ranges give it; the
 * line itself where no statement holds it (a finding of the check on a line the engine could
 * not read as a statement), and where the engine has not yet said.
 */
export function endOf(ranges: readonly Ranged[] | null, line: number): number {
  const holding = ranges?.find((range) => range.line <= line && line <= range.end);
  return holding === undefined ? line : holding.end;
}

/** The blocks of a run, each with the line it stands under. */
export function placed(run: Run): Placed[] {
  const last = Math.max(linesOf(run).length, 1);
  return blocks(run).map((block) => ({
    after: block.line === null ? last : Math.min(endOf(run.ranges, block.line), last),
    block,
  }));
}
