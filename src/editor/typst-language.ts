// Typst in CodeMirror: the reader of `typst.ts` as a language of the editor, for the source
// of a paper (release 0.3, step 12). Its colours are the theme's tokens, those of Zeff's code
// where the two have the same kind of word, so that a paper and a script are coloured alike
// in both themes.
import { HighlightStyle, StreamLanguage, syntaxHighlighting } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { tags } from "@lezer/highlight";
import { copy, start, tokens, type State, type Token } from "./typst";

interface Line {
  /** What is open where the next line begins. */
  state: State;
  /** The tokens of the line being read, and the next of them to give. */
  tokens: Token[];
  next: number;
}

const typst = StreamLanguage.define<Line>({
  name: "typst",
  startState: () => ({ state: start(), tokens: [], next: 0 }),
  copyState: (line) => ({ state: copy(line.state), tokens: line.tokens, next: line.next }),
  token(stream, line) {
    if (stream.sol()) {
      line.tokens = tokens(stream.string, line.state);
      line.next = 0;
    }
    const token = line.tokens[line.next];
    if (token === undefined) {
      stream.skipToEnd();
      return null;
    }
    if (stream.pos < token.from) {
      stream.pos = token.from;
      return null;
    }
    stream.pos = token.to;
    line.next += 1;
    return token.kind;
  },
  // A blank line is not given to `token`: it ends a paragraph, and what the paragraph left open.
  blankLine(line) {
    tokens("", line.state);
  },
  languageData: { commentTokens: { line: "//", block: { open: "/*", close: "*/" } } },
  tokenTable: {
    heading: tags.heading,
    strong: tags.strong,
    emphasis: tags.emphasis,
    raw: tags.monospace,
    math: tags.special(tags.string),
    label: tags.labelName,
    marker: tags.list,
    escape: tags.escape,
    comment: tags.comment,
    keyword: tags.keyword,
    function: tags.function(tags.variableName),
    option: tags.attributeName,
    operator: tags.operator,
    text: tags.string,
    number: tags.number,
    variable: tags.variableName,
  },
});

const colours = HighlightStyle.define([
  { tag: tags.heading, color: "var(--ink)", fontWeight: "700" },
  { tag: tags.strong, fontWeight: "700" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.monospace, color: "var(--code-text)" },
  { tag: tags.special(tags.string), color: "var(--code-number)" },
  { tag: tags.labelName, color: "var(--code-option)" },
  { tag: tags.list, color: "var(--code-operator)", fontWeight: "700" },
  { tag: tags.escape, color: "var(--code-operator)" },
  { tag: tags.comment, color: "var(--code-comment)", fontStyle: "italic" },
  { tag: tags.keyword, color: "var(--code-keyword)" },
  { tag: tags.function(tags.variableName), color: "var(--code-function)" },
  { tag: tags.attributeName, color: "var(--code-option)" },
  { tag: tags.operator, color: "var(--code-operator)" },
  { tag: tags.string, color: "var(--code-text)" },
  { tag: tags.number, color: "var(--code-number)" },
  { tag: tags.variableName, color: "var(--code-variable)" },
]);

/** Typst, read and coloured. */
export function typstLanguage(): Extension {
  return [typst, syntaxHighlighting(colours)];
}
