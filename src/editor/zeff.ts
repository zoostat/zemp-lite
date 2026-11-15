// A small reader of Zeff's words, for colouring code in the editor (the design guide, section
// 2, "Code colours"): keyword, function, option, operator, text in quotes, number, comment,
// and everything else a variable or binding, which keeps the main ink. It reads one line at a
// time, which is enough: in Zeff neither a comment nor a text spans lines (Language
// Reference, section 3.1).
//
// This is the prototype's stand-in. From the alpha the colours come from the semantic tokens
// of the Zeff language server, which knows what a name is; this reader goes by shape alone.

export type Kind =
  "keyword" | "function" | "option" | "operator" | "text" | "number" | "comment" | "variable";

export interface Token {
  /** Where the token starts and ends in its line, the end not included. */
  from: number;
  to: number;
  kind: Kind;
}

/** The 18 reserved words in use and the 8 reserved for later, less the four that are values. */
export const KEYWORDS = new Set([
  "let",
  "fn",
  "if",
  "else",
  "case",
  "for",
  "in",
  "break",
  "continue",
  "return",
  "use",
  "model",
  "dag",
  "as",
  "type",
  "while",
  "match",
  "mut",
  "pub",
  "loop",
  "trait",
  "impl",
]);

/** The reserved words that are values, coloured as the numbers are. */
export const VALUES = new Set(["true", "false", "NA", "Inf"]);

// The longest first, so that `==` is not read as two `=`.
const OPERATORS = [
  "<->",
  "=~",
  "~~",
  ":=",
  "->",
  "=>",
  "==",
  "!=",
  "<=",
  ">=",
  "..",
  "::",
  "--",
  "~",
  "+",
  "-",
  "*",
  "/",
  "^",
  "=",
  "<",
  ">",
  "|",
  "&",
  "!",
  ":",
];

const NAME = /[A-Za-z_][A-Za-z0-9_]*/y;
const NUMBER = /\d(?:_?\d)*(?:\.\d(?:_?\d)*)?(?:[eE][+-]?\d+)?/y;

/** The tokens of one line, in order. What lies between them (spaces, brackets, commas, the dot of a method) has no colour. */
export function tokens(line: string): Token[] {
  const found: Token[] = [];
  // The last character that was not a space: an option is a name at the start of an argument
  // or of a record's field, that is after `(`, `,` or `{`, or at the start of a line of them.
  let before = "";
  let at = 0;
  const push = (to: number, kind: Kind) => {
    found.push({ from: at, to, kind });
    before = line[to - 1] ?? before;
    at = to;
  };
  while (at < line.length) {
    const char = line[at] as string;
    if (char === " " || char === "\t") {
      at += 1;
    } else if (line.startsWith("//", at)) {
      push(line.length, "comment");
    } else if (char === '"' || (char === "r" && line[at + 1] === '"')) {
      // A raw text, `r"..."`, has no escapes and ends at the first quote.
      const raw = char === "r";
      let end = at + (raw ? 2 : 1);
      while (end < line.length && line[end] !== '"') {
        end += !raw && line[end] === "\\" ? 2 : 1;
      }
      push(Math.min(end + 1, line.length), "text");
    } else if (char === "`") {
      // A name in backticks: a variable whose name is not a Zeff name, or is a reserved word.
      const end = line.indexOf("`", at + 1);
      push(end < 0 ? line.length : end + 1, "variable");
    } else if (char >= "0" && char <= "9") {
      NUMBER.lastIndex = at;
      push(at + (NUMBER.exec(line)?.[0].length ?? 1), "number");
    } else if (/[A-Za-z_]/.test(char)) {
      NAME.lastIndex = at;
      const word = NAME.exec(line)?.[0] ?? char;
      const end = at + word.length;
      const next = line.slice(end).trimStart();
      const colon = line[end] === ":" && line[end + 1] !== ":" && line[end + 1] !== "=";
      if (colon && (before === "" || before === "(" || before === "," || before === "{")) {
        // A reserved word before a colon is an option's name like any other (section 3.1).
        push(end, "option");
      } else if (VALUES.has(word)) {
        push(end, "number");
      } else if (KEYWORDS.has(word)) {
        push(end, "keyword");
      } else if (next.startsWith("(")) {
        push(end, "function");
      } else {
        push(end, "variable");
      }
    } else {
      const operator = OPERATORS.find((one) => line.startsWith(one, at));
      if (operator !== undefined) {
        push(at + operator.length, "operator");
      } else {
        before = char;
        at += 1;
      }
    }
  }
  return found;
}
