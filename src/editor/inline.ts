// The Inline layout in the editor: each block of a run drawn directly under the statement
// that made it (Zemp Specification, section 5). The blocks are widgets of the editor, never
// text of the script: the script stays a plain `.zeff` file, and inline output is never
// written into it.
import { StateEffect, StateField, type EditorState, type Extension } from "@codemirror/state";
import { Decoration, EditorView, WidgetType, type DecorationSet } from "@codemirror/view";
import { mount, unmount } from "svelte";
import type { Workspace } from "../app/workspace-state.svelte";
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
  /**
   * What the engine's check found when it refused the script, where the results of the run
   * before were kept: each finding under the line it names, above what is kept there.
   */
  refused: { basis: string; placed: Placed[]; edited: boolean } | null;
  oncancel: () => void;
  /** The window, which a block asks for the figure of a statement that ended in a plot. */
  workspace: Workspace;
}

/** Show these blocks under their statements, in place of those shown. */
export const showOutput = StateEffect.define<InlineOutput>();

// The height each block was last seen at, by what it shows, for each window. The editor draws
// only the blocks near the window and reckons the rest; told the height a block of the same
// results had before, it reckons a script's results at the height they had, so that a run
// which gives the same results leaves the page as long as it was, and nothing shifts as it is
// scrolled. A height is only ever a reckoning: a block that is drawn is measured.
const seen = new WeakMap<Workspace, Map<string, number>>();
const KEPT = 400;
function heights(workspace: Workspace): Map<string, number> {
  let mine = seen.get(workspace);
  if (mine === undefined) {
    mine = new Map();
    seen.set(workspace, mine);
  }
  return mine;
}

class BlockWidget extends WidgetType {
  readonly #placed: Placed;
  readonly #edited: boolean;
  readonly #oncancel: () => void;
  readonly #workspace: Workspace;
  #watch: ResizeObserver | null = null;
  /** What the widget shows, as text: two widgets that show the same are the same widget. */
  readonly #shows: string;
  /** What gives the block its height: where it stands and what it holds, not how long it took. */
  readonly #sized: string;
  #component: Record<string, unknown> | null = null;

  constructor(placed: Placed, output: InlineOutput, edited: boolean) {
    super();
    const { oncancel, workspace } = output;
    this.#placed = placed;
    this.#edited = edited;
    this.#oncancel = oncancel;
    this.#workspace = workspace;
    this.#shows = JSON.stringify([placed.block, edited]);
    const { state, printed, said } = placed.block;
    this.#sized = JSON.stringify([placed.after, state, printed, said, edited]);
  }

  override eq(other: BlockWidget): boolean {
    return other.#shows === this.#shows;
  }

  override toDOM(view: EditorView): HTMLElement {
    const dom = document.createElement("div");
    dom.className = "cm-zemp-output";
    this.#component = mount(OutputBlock, {
      target: dom,
      props: {
        block: this.#placed.block,
        edited: this.#edited,
        inline: true,
        oncancel: this.#oncancel,
        workspace: this.#workspace,
      },
    });
    // A block grows when its figure arrives: the editor is told, so that the line numbers
    // stay in step with the lines.
    this.#watch = new ResizeObserver(() => {
      if (dom.offsetHeight > 0) {
        const known = heights(this.#workspace);
        // The newest are kept: the oldest goes when there are too many.
        known.delete(this.#sized);
        known.set(this.#sized, dom.offsetHeight);
        if (known.size > KEPT) known.delete(known.keys().next().value as string);
      }
      view.requestMeasure();
    });
    this.#watch.observe(dom);
    return dom;
  }

  // Until it is drawn, a block is reckoned at the height a block of the same results was
  // last seen at.
  override get estimatedHeight(): number {
    return heights(this.#workspace).get(this.#sized) ?? -1;
  }

  override destroy(): void {
    this.#watch?.disconnect();
    this.#watch = null;
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
  /** The findings of a check that refused the script, under their lines. */
  refusedBasis: string;
  refused: DecorationSet;
}

/**
 * Blocks under their lines. While `basis` is the one they were placed from, they keep the
 * places they have in the editor, which follow the script as it is edited; otherwise they
 * are placed afresh, each under the line it names. A finding of the check stands nearer its
 * line than a result kept from the run before.
 */
function set(
  doc: EditorState["doc"],
  placed: Placed[],
  widget: (one: Placed) => WidgetType,
  side: number,
  was: DecorationSet | null,
): DecorationSet {
  const kept: number[] = [];
  if (was !== null) {
    for (const at = was.iter(); at.value !== null; at.next()) kept.push(at.from);
  }
  return Decoration.set(
    placed.map((one, index) =>
      Decoration.widget({ widget: widget(one), block: true, side }).range(
        kept.length === placed.length
          ? (kept[index] as number)
          : doc.line(Math.min(Math.max(one.after, 1), doc.lines)).to,
      ),
    ),
    true,
  );
}

const field = StateField.define<Shown>({
  create: () => ({
    basis: "",
    blocks: Decoration.none,
    refusedBasis: "",
    refused: Decoration.none,
  }),
  update(shown, transaction) {
    let now: Shown = {
      ...shown,
      blocks: shown.blocks.map(transaction.changes),
      refused: shown.refused.map(transaction.changes),
    };
    for (const effect of transaction.effects) {
      if (!effect.is(showOutput)) continue;
      const doc = transaction.state.doc;
      const output = effect.value;
      const refused = output.refused;
      now = {
        basis: output.basis,
        blocks: set(
          doc,
          output.placed,
          (one) => new BlockWidget(one, output, output.edited),
          2,
          output.basis === now.basis ? now.blocks : null,
        ),
        refusedBasis: refused?.basis ?? "",
        refused:
          refused === null
            ? Decoration.none
            : set(
                doc,
                refused.placed,
                (one) => new BlockWidget(one, output, refused.edited),
                1,
                refused.basis === now.refusedBasis ? now.refused : null,
              ),
      };
    }
    return now;
  },
  provide: (self) => [
    EditorView.decorations.from(self, (shown) => shown.blocks),
    EditorView.decorations.from(self, (shown) => shown.refused),
  ],
});

/** The editor's part of the Inline layout. */
export function inlineOutput(): Extension {
  return field;
}
