// The size of code text (the design guide, section 9; open decision #146, item 9): eight
// sizes from 12 to 22 pixels with 14 the usual one, changing the code, its line numbers and
// the output together, and remembered between visits under `zemp-code-size`.
import type { Kept } from "./theme";

export const CODE_SIZES = [12, 13, 14, 15, 16, 18, 20, 22] as const;
const SMALLEST = 12;
const LARGEST = 22;
export const USUAL_CODE_SIZE = 14;
const KEY = "zemp-code-size";

/** The next size up, or the largest. */
export function larger(size: number): number {
  return CODE_SIZES.find((one) => one > size) ?? LARGEST;
}

/** The next size down, or the smallest. */
export function smaller(size: number): number {
  return [...CODE_SIZES].reverse().find((one) => one < size) ?? SMALLEST;
}

/** The size kept, or the usual one where none is kept or what is kept is not a size. */
export function keptCodeSize(kept: Kept): number {
  try {
    const size = Number(kept.getItem(KEY));
    return (CODE_SIZES as readonly number[]).includes(size) ? size : USUAL_CODE_SIZE;
  } catch {
    return USUAL_CODE_SIZE;
  }
}

export function keepCodeSize(kept: Kept, size: number): void {
  try {
    kept.setItem(KEY, String(size));
  } catch {
    // The size holds for this visit.
  }
}
