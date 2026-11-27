// A small reader of Typst's source, for colouring a paper in the editor (release 0.3, step
// 12). It goes by shape alone, as the reader of Zeff does (`zeff.ts`): headings, strong and
// emphasised text, raw text, mathematics, labels and references, comments, and the code that
// `#` begins, with its keywords, functions, named arguments, texts and numbers. It is not
// Typst's own parser, and where the two differ only a colour is wrong: what a paper is, the
// module says when it sets the page.
//
// Unlike Zeff, Typst has things that span lines (a block comment, a block of raw text, a
// formula, the brackets of a call), so the reader carries a state from each line to the next.

export type Kind =
  | "heading"
  | "strong"
  | "emphasis"
  | "raw"
  | "math"
  | "label"
  | "marker"
  | "escape"
  | "comment"
  | "keyword"
  | "function"
  | "option"
  | "operator"
  | "text"
  | "number"
  | "variable";

export interface Token {
  /** Where the token starts and ends in its line, the end not included. */
  from: number;
  to: number;
  kind: Kind;
}

/**
 * What is open where a line begins. A frame is one thing opened and not yet closed:
 * `paren`, `brace` and `line` are code (a call's brackets, a block, a statement to the end of
 * its line), `content` is markup inside code's square brackets, `math` a formula.
 */
export type Frame = "paren" | "brace" | "line" | "content" | "math";

export interface State {
  frames: Frame[];
  /** The depth of the block comment the line begins in; 0 where it begins in none. */
  comment: number;
  /** The count of backticks that will close the block of raw text the line begins in; 0 in none. */
  raw: number;
  /** Whether the line begins inside strong text, and inside emphasised text. */
  strong: boolean;
  emphasis: boolean;
}

export const start = (): State => ({
  frames: [],
  comment: 0,
  raw: 0,
  strong: false,
  emphasis: false,
});

export const copy = (state: State): State => ({ ...state, frames: [...state.frames] });

/** The words of Typst's code that are its own. */
export const KEYWORDS = new Set([
  "let",
  "set",
  "show",
  "import",
  "include",
  "if",
  "else",
  "for",
  "while",
  "in",
  "return",
  "break",
  "continue",
  "context",
  "and",
  "or",
  "not",
  "as",
]);

/** The words that are values, coloured as the numbers are. */
export const VALUES = new Set(["none", "auto", "true", "false"]);

const IDENT = /[\p{L}_][\p{L}\p{N}_-]*/uy;
const NUMBER = /(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?(?:pt|mm|cm|in|em|fr|deg|rad|%)?/y;
const LABEL = /<[\p{L}\p{N}_][\p{L}\p{N}_.:-]*>/uy;
const ADDRESS = /https?:\/\/[^\s\]]+/y;
const REFERENCE = /@[\p{L}\p{N}_][\p{L}\p{N}_.:-]*/uy;
const OPERATORS = [
  "=>",
  "==",
  "!=",
  "<=",
  ">=",
  "+=",
  "-=",
  "*=",
  "/=",
  "..",
  "+",
  "-",
  "*",
  "/",
  "=",
  "<",
  ">",
  ".",
];

function match(pattern: RegExp, line: string, at: number): string | null {
  pattern.lastIndex = at;
  return pattern.exec(line)?.[0] ?? null;
}

const letter = (character: string | undefined) =>
  character !== undefined && /[\p{L}\p{N}]/u.test(character);

/**
 * The tokens of one line, read from the state the line begins in; the state is changed to
 * the one the next line begins in.
 */
export function tokens(line: string, state: State): Token[] {
  const found: Token[] = [];
  let at = 0;
  const give = (to: number, kind: Kind) => {
    if (to > at) found.push({ from: at, to, kind });
    at = to;
  };
  const top = (): Frame | undefined => state.frames[state.frames.length - 1];
  const inCode = () => top() === "paren" || top() === "brace" || top() === "line";
  /** After a function's name or a call's closing bracket in markup, `[` and `(` go on with it. */
  let callOpen = false;

  // A paragraph ends at a blank line, and strong or emphasised text with it.
  if (line.trim() === "" && state.comment === 0 && state.raw === 0) {
    if (top() === undefined || top() === "content") {
      state.strong = false;
      state.emphasis = false;
    }
    return found;
  }

  /** The end of the text in quotes that begins at `from`. */
  const quoted = (from: number): number => {
    let end = from + 1;
    while (end < line.length && line[end] !== '"') end += line[end] === "\\" ? 2 : 1;
    return Math.min(end + 1, line.length);
  };

  /** A block comment, from inside it: to its end, or to the end of the line. */
  const comment = (): void => {
    let end = at;
    while (end < line.length && state.comment > 0) {
      if (line.startsWith("/*", end)) {
        state.comment += 1;
        end += 2;
      } else if (line.startsWith("*/", end)) {
        state.comment -= 1;
        end += 2;
      } else {
        end += 1;
      }
    }
    give(end, "comment");
  };

  /** Raw text, from its opening backticks at `at`. */
  const raw = (): void => {
    let ticks = 0;
    while (line[at + ticks] === "`") ticks += 1;
    if (ticks === 2) {
      // Two backticks are raw text that holds nothing.
      give(at + 2, "raw");
      return;
    }
    const close = line.indexOf("`".repeat(ticks), at + ticks);
    if (close >= 0) {
      give(close + ticks, "raw");
    } else if (ticks >= 3) {
      state.raw = ticks;
      give(line.length, "raw");
    } else {
      give(line.length, "raw");
    }
  };

  /** A comment that begins at `at`, if one does. */
  const commentAt = (): boolean => {
    if (line.startsWith("//", at)) {
      give(line.length, "comment");
      return true;
    }
    if (line.startsWith("/*", at)) {
      state.comment = 1;
      const from = at;
      at += 2;
      comment();
      // One token from the opening.
      const last = found.pop();
      if (last !== undefined) found.push({ from, to: last.to, kind: "comment" });
      else found.push({ from, to: at, kind: "comment" });
      return true;
    }
    return false;
  };

  /** One token of code. */
  const code = (): void => {
    const character = line[at] as string;
    if (/\s/.test(character)) {
      at += 1;
      return;
    }
    if (commentAt()) return;
    if (character === '"') return give(quoted(at), "text");
    if (character === "`") return raw();
    if (character === "$") {
      state.frames.push("math");
      return give(at + 1, "math");
    }
    if (character === "(") {
      state.frames.push("paren");
      return give(at + 1, "operator");
    }
    if (character === "{") {
      state.frames.push("brace");
      return give(at + 1, "operator");
    }
    if (character === "[") {
      state.frames.push("content");
      return give(at + 1, "operator");
    }
    if (character === ")" || character === "}") {
      const wanted = character === ")" ? "paren" : "brace";
      // A statement that runs to the end of its line ends at the bracket that closes what holds it.
      while (top() === "line") state.frames.pop();
      if (top() === wanted) state.frames.pop();
      give(at + 1, "operator");
      // Back in markup, the call may go on with content in square brackets.
      callOpen = !inCode() && top() !== "math";
      return;
    }
    if (character === ";") {
      while (top() === "line") state.frames.pop();
      return give(at + 1, "operator");
    }
    const number = /[\d.]/.test(character) ? match(NUMBER, line, at) : null;
    if (number !== null && number !== "") return give(at + number.length, "number");
    const label = character === "<" ? match(LABEL, line, at) : null;
    if (label !== null) return give(at + label.length, "label");
    const name = match(IDENT, line, at);
    if (name !== null) {
      const end = at + name.length;
      if (KEYWORDS.has(name)) return give(end, "keyword");
      if (VALUES.has(name)) return give(end, "number");
      if (line[end] === "(" || line[end] === "[") return give(end, "function");
      // A named argument: a name and a colon, in a call's brackets.
      if (top() === "paren" && /^\s*:/.test(line.slice(end))) return give(end, "option");
      return give(end, "variable");
    }
    const operator = OPERATORS.find((one) => line.startsWith(one, at));
    if (operator !== undefined) return give(at + operator.length, "operator");
    if (character === "," || character === ":") return give(at + 1, "operator");
    at += 1;
  };

  /** Code begun by `#` in markup or in a formula: the `#` and what it leads. */
  const hash = (): void => {
    give(at + 1, "operator");
    const character = line[at];
    if (character === "{") {
      state.frames.push("brace");
      return give(at + 1, "operator");
    }
    if (character === "[") {
      state.frames.push("content");
      return give(at + 1, "operator");
    }
    if (character === "(") {
      state.frames.push("paren");
      return give(at + 1, "operator");
    }
    if (character === '"') return give(quoted(at), "text");
    const number = character !== undefined && /\d/.test(character) ? match(NUMBER, line, at) : null;
    if (number !== null && number !== "") return give(at + number.length, "number");
    const name = match(IDENT, line, at);
    if (name === null) return;
    if (KEYWORDS.has(name)) {
      give(at + name.length, "keyword");
      // What follows is code, to the end of the line; the brackets of a block opened in it
      // are found as they are met, and what they hold is read as what it is.
      state.frames.push("line");
      return;
    }
    if (VALUES.has(name)) return give(at + name.length, "number");
    // A name, with the fields and methods after it: `#fig.caption`, `#calc.round(x)`.
    for (;;) {
      const part = match(IDENT, line, at);
      if (part === null) break;
      const end = at + part.length;
      const called = line[end] === "(" || line[end] === "[";
      give(end, called ? "function" : "variable");
      if (line[at] === "." && match(IDENT, line, at + 1) !== null) {
        give(at + 1, "operator");
        continue;
      }
      callOpen = called;
      break;
    }
  };

  /** One token of a formula. */
  const math = (): void => {
    const character = line[at] as string;
    if (character === "$") {
      state.frames.pop();
      return give(at + 1, "math");
    }
    if (commentAt()) return;
    if (character === '"') return give(quoted(at), "text");
    if (character === "\\") return give(Math.min(at + 2, line.length), "escape");
    if (character === "#") return hash();
    let end = at + 1;
    while (
      end < line.length &&
      !'$"\\#'.includes(line[end] as string) &&
      !line.startsWith("//", end) &&
      !line.startsWith("/*", end)
    ) {
      end += 1;
    }
    give(end, "math");
  };

  /** One token of markup. */
  const markup = (first: number): void => {
    const character = line[at] as string;
    if (callOpen) {
      callOpen = false;
      if (character === "[") {
        state.frames.push("content");
        return give(at + 1, "operator");
      }
      if (character === "(") {
        state.frames.push("paren");
        return give(at + 1, "operator");
      }
    }
    if (commentAt()) return;
    if (at === first) {
      // What only the beginning of a line holds: a heading, an item of a list, a term.
      const heading = /^=+(?=\s|$)/.exec(line.slice(at));
      if (heading !== null) {
        const close = top() === "content" ? line.indexOf("]", at) : -1;
        return give(close >= 0 ? close : line.length, "heading");
      }
      if (/^[-+](?=\s|$)/.test(line.slice(at)) || /^\d+\.(?=\s|$)/.test(line.slice(at))) {
        return give(at + (/^\d+\./.exec(line.slice(at))?.[0].length ?? 1), "marker");
      }
      if (/^\/(?=\s)/.test(line.slice(at))) return give(at + 1, "marker");
    }
    if (character === "]" && top() === "content") {
      state.frames.pop();
      give(at + 1, "operator");
      callOpen = !inCode() && top() !== "math";
      return;
    }
    if (character === "#") return hash();
    if (character === "$") {
      state.frames.push("math");
      return give(at + 1, "math");
    }
    if (character === "`") return raw();
    if (character === "\\") return give(Math.min(at + 2, line.length), "escape");
    if (character === "*") {
      state.strong = !state.strong;
      return give(at + 1, "strong");
    }
    // An underscore inside a word is a part of the word.
    if (character === "_" && !(letter(line[at - 1]) && letter(line[at + 1]))) {
      state.emphasis = !state.emphasis;
      return give(at + 1, "emphasis");
    }
    const label = character === "<" ? match(LABEL, line, at) : null;
    if (label !== null) return give(at + label.length, "label");
    const reference = character === "@" ? match(REFERENCE, line, at) : null;
    if (reference !== null) return give(at + reference.length, "label");
    // An address is a link as it stands, and its `//` begins no comment.
    const address = character === "h" ? match(ADDRESS, line, at) : null;
    if (address !== null) return give(at + address.length, "label");
    // Plain text, to the next character that may begin something.
    let end = at + 1;
    while (
      end < line.length &&
      !"#$`\\*_<@]/".includes(line[end] as string) &&
      !(line[end] === "h" && match(ADDRESS, line, end) !== null)
    ) {
      end += 1;
    }
    const kind = state.strong ? "strong" : state.emphasis ? "emphasis" : null;
    if (kind === null) at = end;
    else give(end, kind);
  };

  // What the line begins inside.
  if (state.comment > 0) comment();
  if (state.raw > 0 && at < line.length) {
    const close = line.indexOf("`".repeat(state.raw), at);
    if (close >= 0) {
      give(close + state.raw, "raw");
      state.raw = 0;
    } else {
      give(line.length, "raw");
    }
  }
  const first = line.length - line.trimStart().length;
  if (at < first) at = first;
  while (at < line.length) {
    if (state.comment > 0) comment();
    else if (state.raw > 0) {
      give(line.length, "raw");
    } else if (inCode()) code();
    else if (top() === "math") math();
    else markup(first);
  }
  // A statement runs to the end of its line, unless a bracket opened in it is still open.
  while (top() === "line") state.frames.pop();
  return found;
}
