// The size of code text in this window, for the components. It is written into the page as
// `--code-size`, which the editor, the output and the console read.
import { keepCodeSize, keptCodeSize, larger, smaller, USUAL_CODE_SIZE } from "./codesize";
import { browserStorage } from "./theme.svelte";

export const codeSize = $state<{ px: number }>({ px: USUAL_CODE_SIZE });

function show(px: number): void {
  codeSize.px = px;
  document.documentElement.style.setProperty("--code-size", `${px}px`);
  // The same as a plain number, 1 at the usual size: the Inline column widens with the code.
  document.documentElement.style.setProperty("--code-scale", String(px / USUAL_CODE_SIZE));
}

export function startCodeSize(): void {
  show(keptCodeSize(browserStorage()));
}

function choose(px: number): void {
  show(px);
  keepCodeSize(browserStorage(), px);
}

export const codeLarger = () => choose(larger(codeSize.px));
export const codeSmaller = () => choose(smaller(codeSize.px));
export const codeUsual = () => choose(USUAL_CODE_SIZE);
