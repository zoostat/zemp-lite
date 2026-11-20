// The usage of the call being typed, from the language server (release 0.2, step 10b): shown
// over the cursor when a call is opened or an argument begun, its parameter at the cursor in
// bold, and gone when the call is closed, the cursor leaves it, or Escape is pressed.
import { StateEffect, StateField, type Extension } from "@codemirror/state";
import { EditorView, ViewPlugin, showTooltip, type Tooltip } from "@codemirror/view";

export interface Usage {
  /** Where the tooltip stands. */
  pos: number;
  usage: string;
  /** Where the parameter at the cursor stands in the usage, as offsets. */
  active: [number, number] | null;
  summary: string;
}

/** Show this usage, or none. */
export const showUsage = StateEffect.define<Usage | null>();

const field = StateField.define<Usage | null>({
  create: () => null,
  update(value, transaction) {
    for (const effect of transaction.effects) if (effect.is(showUsage)) return effect.value;
    // Closing the call, or moving away from where it was shown, takes it away.
    if (value !== null && transaction.docChanged) {
      const typed = transaction.newDoc.sliceString(
        Math.max(0, transaction.state.selection.main.head - 1),
        transaction.state.selection.main.head,
      );
      if (typed === ")") return null;
      return { ...value, pos: transaction.changes.mapPos(value.pos) };
    }
    if (value !== null && transaction.selection !== undefined) {
      const head = transaction.state.selection.main.head;
      if (
        transaction.state.doc.lineAt(head).number !== transaction.state.doc.lineAt(value.pos).number
      ) {
        return null;
      }
    }
    return value;
  },
  provide: (self) =>
    showTooltip.from(self, (value): Tooltip | null =>
      value === null
        ? null
        : {
            pos: value.pos,
            above: true,
            create: () => {
              const dom = document.createElement("div");
              dom.className = "cm-zemp-usage";
              dom.dataset["testid"] = "usage";
              const line = document.createElement("div");
              line.className = "cm-zemp-usage-line";
              if (value.active === null) {
                line.textContent = value.usage;
              } else {
                const [from, to] = value.active;
                const strong = document.createElement("strong");
                strong.textContent = value.usage.slice(from, to);
                line.append(value.usage.slice(0, from), strong, value.usage.slice(to));
              }
              dom.append(line);
              if (value.summary !== "") {
                const summary = document.createElement("div");
                summary.className = "cm-zemp-usage-summary";
                summary.textContent = value.summary;
                dom.append(summary);
              }
              return { dom };
            },
          },
    ),
});

const look = EditorView.theme({
  ".cm-zemp-usage": { maxWidth: "640px", padding: "6px 10px" },
  ".cm-zemp-usage-line": {
    fontFamily: '"JetBrains Mono", ui-monospace, Menlo, monospace',
    fontSize: "12.5px",
  },
  ".cm-zemp-usage-summary": { color: "var(--ink-2)", fontSize: "12.5px", marginTop: "2px" },
});

/**
 * The usage of calls: `ask` is told the cursor's place when a call is opened or an argument
 * begun, and gives the usage there, or none.
 */
export function usageOfCalls(
  ask: (line: number, character: number) => Promise<Omit<Usage, "pos"> | null>,
): Extension {
  return [
    field,
    look,
    // Escape closes the usage, and goes on to do what it does in the editor. It is heard on the
    // editor's element as it comes in, before anything inside it handles it, in every browser.
    ViewPlugin.define((view) => {
      const listen = (event: KeyboardEvent) => {
        if (event.key === "Escape" && view.state.field(field) !== null) {
          view.dispatch({ effects: showUsage.of(null) });
        }
      };
      view.dom.addEventListener("keydown", listen, true);
      return { destroy: () => view.dom.removeEventListener("keydown", listen, true) };
    }),
    EditorView.updateListener.of((update) => {
      if (!update.docChanged) return;
      const head = update.state.selection.main.head;
      const typed = update.state.doc.sliceString(Math.max(0, head - 1), head);
      if (typed !== "(" && typed !== ",") return;
      const line = update.state.doc.lineAt(head);
      // Asked once this change has been passed on, so that the server reads the text with it.
      setTimeout(() => {
        void ask(line.number - 1, head - line.from).then((usage) => {
          if (update.view.state.selection.main.head !== head) return;
          update.view.dispatch({
            effects: showUsage.of(usage === null ? null : { ...usage, pos: head }),
          });
        });
      }, 0);
    }),
  ];
}
