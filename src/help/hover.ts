// What the card under the pointer shows for a name in a script (release 0.2.4, step 9; open
// decision #220, item 6): for a function, its usage block alone, not its whole page; F1 opens
// the whole page. The language server's answer for a function's name is that function's page,
// as `zeff help` prints it, the one the call would run where a name has two (#215); the usage
// is read from it, so it is always the engine's own for that function. Whatever else the
// server says of a word (a variable and its type, a project's own note) is shown as it is.
import { readPage } from "./read";

/**
 * The usage block of the one function a hover is the page of, as the page writes it; `null`
 * where the hover is not one function's page or the page gives no usage.
 */
export function usageIn(hover: string): string | null {
  const doc = readPage(hover);
  const [entry] = doc.entries;
  if (entry === undefined || doc.entries.length !== 1) return null;
  const usage = entry.sections
    .flatMap((section) => section.blocks)
    .flatMap((block) => (block.kind === "usage" ? [block.code] : []));
  return usage.length === 0 ? null : usage.join("\n");
}

/** What the card shows: a function's usage alone, and anything else as the server said it. */
export function cardOf(hover: string): string {
  return usageIn(hover) ?? hover;
}
