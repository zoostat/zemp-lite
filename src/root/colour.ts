// The colours of a Zeff script as the landing page shows it (release 0.2.4, step 8): the code
// colours of the design guide, section 2, which the editor of the app uses, set here without
// the editor, which the landing page does not carry. Only the kinds the page's script holds
// are told apart; every other letter is left in the text's own ink.

export type Kind = "comment" | "keyword" | "function" | "option" | "number" | "operator" | "plain";

/** A run of letters of one kind. */
export interface Piece {
  kind: Kind;
  text: string;
}

const PARTS =
  /(\/\/[^\n]*)|\b(let|fn|for|if|else|in|return)\b|([A-Za-z_][A-Za-z0-9_]*)(?=\()|([A-Za-z_][A-Za-z0-9_]*:)(?!:)|(?<![A-Za-z_\d.])(\d+(?:\.\d+)?)(?![A-Za-z_])|(>=|<=|==|!=|&&|\|\||[~+\-*/^=<>])/g;
const KINDS: Kind[] = ["comment", "keyword", "function", "option", "number", "operator"];

/** A script cut into runs of one kind each; the runs put together are the script. */
export function coloured(script: string): Piece[] {
  const pieces: Piece[] = [];
  let at = 0;
  for (const found of script.matchAll(PARTS)) {
    if (found.index > at) pieces.push({ kind: "plain", text: script.slice(at, found.index) });
    const which = found.slice(1).findIndex((group) => group !== undefined);
    pieces.push({ kind: KINDS[which] ?? "plain", text: found[0] });
    at = found.index + found[0].length;
  }
  if (at < script.length) pieces.push({ kind: "plain", text: script.slice(at) });
  return pieces;
}
