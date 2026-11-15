// Zeff in CodeMirror: the reader of `zeff.ts` as a language of the editor, and the colours of
// its categories, which are the theme's tokens, so that code is coloured alike in both themes
// and wherever it is shown.
import { HighlightStyle, StreamLanguage, syntaxHighlighting } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { tags } from "@lezer/highlight";
import { tokens, type Token } from "./zeff";

interface Line {
  /** The tokens of the line being read, and the next of them to give. */
  tokens: Token[];
  next: number;
}

const zeff = StreamLanguage.define<Line>({
  name: "zeff",
  startState: () => ({ tokens: [], next: 0 }),
  token(stream, state) {
    if (stream.sol()) {
      state.tokens = tokens(stream.string);
      state.next = 0;
    }
    const token = state.tokens[state.next];
    if (token === undefined) {
      stream.skipToEnd();
      return null;
    }
    if (stream.pos < token.from) {
      stream.pos = token.from;
      return null;
    }
    stream.pos = token.to;
    state.next += 1;
    return token.kind;
  },
  languageData: { commentTokens: { line: "//" } },
  tokenTable: {
    keyword: tags.keyword,
    function: tags.function(tags.variableName),
    option: tags.attributeName,
    operator: tags.operator,
    text: tags.string,
    number: tags.number,
    comment: tags.lineComment,
    variable: tags.variableName,
  },
});

const colours = HighlightStyle.define([
  { tag: tags.keyword, color: "var(--code-keyword)" },
  { tag: tags.function(tags.variableName), color: "var(--code-function)" },
  { tag: tags.attributeName, color: "var(--code-option)" },
  { tag: tags.operator, color: "var(--code-operator)" },
  { tag: tags.string, color: "var(--code-text)" },
  { tag: tags.number, color: "var(--code-number)" },
  { tag: tags.lineComment, color: "var(--code-comment)", fontStyle: "italic" },
  { tag: tags.variableName, color: "var(--code-variable)" },
]);

/** Zeff, read and coloured. */
export function zeffLanguage(): Extension {
  return [zeff, syntaxHighlighting(colours)];
}
