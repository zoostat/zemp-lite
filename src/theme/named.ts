// The name drawn (release 0.2.4, step 5; open decision #220, item 5; the design guide, section
// 9, "The name drawn"): wherever Zemp Lite shows its name on a screen it is drawn as Zemp with
// a small raised Lite badge. The name itself is unchanged, and where text cannot be drawn (a
// tab's title, a file, a report, an export) it is written in plain words.

/** The name as it is written. */
export const NAME = "Zemp Lite";

/** A piece of a text: words as they are, or the name, to be drawn. */
export type NamedPiece = { text: string } | { name: true };

/**
 * A text cut where it holds the name, so that the name can be drawn and every other word left
 * as it is. A text without the name is one piece; the pieces put together are the text.
 */
export function named(text: string): NamedPiece[] {
  const pieces: NamedPiece[] = [];
  text.split(NAME).forEach((part, at) => {
    if (at > 0) pieces.push({ name: true });
    if (part !== "") pieces.push({ text: part });
  });
  return pieces;
}
