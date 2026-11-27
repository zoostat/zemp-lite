// What is said of a line of the text, standing under the line (release 0.3, step 13): where
// Typst refuses a paper's source, or warns of it, its words stand at the line they are of, in
// the editor, and stay there until the text is set again. The words are given from outside
// (`showSaid`); the editor only places them.
import { StateEffect, StateField, type Extension, type Text } from "@codemirror/state";
import { Decoration, EditorView, WidgetType, type DecorationSet } from "@codemirror/view";

/** One thing said of a line, counted from 1. */
export interface SaidAt {
  line: number;
  severity: "error" | "warning";
  text: string;
}

/** What is said of the text now: it takes the place of what was said before. */
export const showSaid = StateEffect.define<readonly SaidAt[]>();

class SaidWidget extends WidgetType {
  constructor(
    readonly severity: SaidAt["severity"],
    readonly text: string,
  ) {
    super();
  }

  override eq(other: SaidWidget): boolean {
    return other.severity === this.severity && other.text === this.text;
  }

  override toDOM(): HTMLElement {
    const box = document.createElement("div");
    box.className = `cm-zemp-said ${this.severity}`;
    box.dataset["testid"] = "said";
    box.setAttribute("role", "note");
    const kind = document.createElement("strong");
    kind.textContent = this.severity === "error" ? "error" : "warning";
    box.append(kind, ` ${this.text}`);
    return box;
  }

  // The words are read, and may be selected; a press on them is not the editor's.
  override ignoreEvent(): boolean {
    return true;
  }
}

function placed(doc: Text, said: readonly SaidAt[]): DecorationSet {
  const ranges = said
    .filter((one) => Number.isInteger(one.line) && one.line >= 1)
    .map((one) => ({ ...one, at: doc.line(Math.min(one.line, doc.lines)).to }))
    // In the order of their lines; of one line, in the order said.
    .sort((a, b) => a.at - b.at)
    .map((one) =>
      Decoration.widget({
        widget: new SaidWidget(one.severity, one.text),
        block: true,
        side: 1,
      }).range(one.at),
    );
  return Decoration.set(ranges);
}

const field = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(showSaid)) return placed(transaction.state.doc, effect.value);
    }
    // While the text is typed, what was said stays with its line.
    return transaction.docChanged ? value.map(transaction.changes) : value;
  },
  provide: (own) => EditorView.decorations.from(own),
});

/** The words said of the text's lines, under their lines. */
export function saidAtLines(): Extension {
  return field;
}
