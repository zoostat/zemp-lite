// The Inline layout in the editor: each block of a run drawn directly under the statement
// that made it (Zemp Specification, section 5). The blocks are widgets of the editor, never
// text of the script: the script stays a plain `.zeff` file, and inline output is never
// written into it.
import { StateEffect, StateField, type Extension } from "@codemirror/state";
import { Decoration, EditorView, WidgetType, type DecorationSet } from "@codemirror/view";
import { mount, unmount } from "svelte";
import OutputBlock from "../output/OutputBlock.svelte";
import type { Placed } from "../output/place";

export interface InlineOutput {
  /**
   * What the places were worked out from: the run and how many blocks it has. While this
   * stays the same the blocks keep the places they have in the editor, which follow the
   * script as it is edited; when it changes they are placed afresh by their lines.
   */
  basis: string;
  placed: Placed[];
  /** The script has been edited since the run. */
  edited: boolean;
  oncancel: () => void;
}

/** Show these blocks under their statements, in place of those shown. */
export const showOutput = StateEffect.define<InlineOutput>();

class BlockWidget extends WidgetType {
  readonly #placed: Placed;
  readonly #edited: boolean;
  readonly #oncancel: () => void;
  /** What the widget shows, as text: two widgets that show the same are the same widget. */
  readonly #shows: string;
  #component: Record<string, unknown> | null = null;

  constructor(placed: Placed, edited: boolean, oncancel: () => void) {
    super();
    this.#placed = placed;
    this.#edited = edited;
    this.#oncancel = oncancel;
    this.#shows = JSON.stringify([placed.block, edited]);
  }

  override eq(other: BlockWidget): boolean {
    return other.#shows === this.#shows;
  }

  override toDOM(): HTMLElement {
    const dom = document.createElement("div");
    dom.className = "cm-zemp-output";
    this.#component = mount(OutputBlock, {
      target: dom,
      props: {
        block: this.#placed.block,
        edited: this.#edited,
        inline: true,
        oncancel: this.#oncancel,
      },
    });
    return dom;
  }

  override destroy(): void {
    if (this.#component !== null) {
      void unmount(this.#component);
      this.#component = null;
    }
  }

  // A press on Cancel, or a selection of the output's text, is the block's and not the editor's.
  override ignoreEvent(): boolean {
    return true;
  }
}

interface Shown {
  basis: string;
  blocks: DecorationSet;
}

const field = StateField.define<Shown>({
  create: () => ({ basis: "", blocks: Decoration.none }),
  update(shown, transaction) {
    let now: Shown = { basis: shown.basis, blocks: shown.blocks.map(transaction.changes) };
    for (const effect of transaction.effects) {
      if (!effect.is(showOutput)) continue;
      const doc = transaction.state.doc;
      const { basis, placed, edited, oncancel } = effect.value;
      const widget = (one: Placed) =>
        Decoration.widget({ widget: new BlockWidget(one, edited, oncancel), block: true, side: 1 });
      // The places the blocks have now, in order, where they are to be kept.
      const kept: number[] = [];
      if (basis === now.basis) {
        for (const at = now.blocks.iter(); at.value !== null; at.next()) kept.push(at.from);
      }
      now = {
        basis,
        blocks: Decoration.set(
          placed.map((one, index) =>
            widget(one).range(
              kept.length === placed.length
                ? (kept[index] as number)
                : doc.line(Math.min(Math.max(one.after, 1), doc.lines)).to,
            ),
          ),
          true,
        ),
      };
    }
    return now;
  },
  provide: (self) => EditorView.decorations.from(self, (shown) => shown.blocks),
});

/** The editor's part of the Inline layout. */
export function inlineOutput(): Extension {
  return field;
}
