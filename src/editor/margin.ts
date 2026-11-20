// The margin of the margin editor (open decision #174; its design, sections 7.1 to 7.5): a
// note on the first row of each statement, in a column at the right of the code. A note is a
// widget of the editor, never text of the script, so it scrolls with its line and the script
// stays a plain `.zeff` file. A note with something to unfold is a button that unfolds or
// folds the statement's output; one with nothing to unfold is a line of text.
import { StateEffect, StateField, type EditorState, type Extension } from "@codemirror/state";
import { RangeSet } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  GutterMarker,
  WidgetType,
  gutter,
  type DecorationSet,
} from "@codemirror/view";
import type { Note } from "../margin/notes";

export interface MarginNotes {
  /**
   * What the notes were worked out from: while it stays the same the notes keep the places
   * they have, which follow the script as it is edited; when it changes they are placed
   * afresh on their lines.
   */
  basis: string;
  notes: Note[];
  /** The lines of the statements whose output is unfolded. */
  unfolded: number[];
  /** A note was pressed: unfold or fold the output of the statement on `line`. */
  onnote: (line: number) => void;
}

/** Show these notes, in place of those shown; `null` hides the margin's notes. */
export const showNotes = StateEffect.define<MarginNotes | null>();

/** A note's words, in the order they are shown. */
function words(note: Note): string[] {
  return [note.main, note.sub, ...note.tags.map((tag) => tag.text)].filter((word) => word !== "");
}

class NoteWidget extends WidgetType {
  readonly #note: Note;
  readonly #open: boolean;
  readonly #onnote: (line: number) => void;
  readonly #shows: string;

  constructor(note: Note, open: boolean, onnote: (line: number) => void) {
    super();
    this.#note = note;
    this.#open = open;
    this.#onnote = onnote;
    this.#shows = JSON.stringify([note, open]);
  }

  override eq(other: NoteWidget): boolean {
    return other.#shows === this.#shows;
  }

  override toDOM(): HTMLElement {
    const note = this.#note;
    const dom = document.createElement(note.opens ? "button" : "span");
    dom.className = `cm-zemp-note cm-zemp-note-${note.state.replace(" ", "-")}`;
    dom.dataset["testid"] = "note";
    dom.dataset["line"] = String(note.line);
    const part = (text: string, name: string) => {
      const span = document.createElement("span");
      span.className = name;
      span.textContent = text;
      dom.append(span);
    };
    if (note.main !== "") part(note.main, "cm-zemp-note-main");
    if (note.sub !== "") part(note.sub, "cm-zemp-note-sub");
    for (const tag of note.tags) part(tag.text, `cm-zemp-note-tag cm-zemp-note-${tag.kind}`);
    if (note.opens) {
      const button = dom as HTMLButtonElement;
      button.type = "button";
      part(this.#open ? "⌄" : "›", "cm-zemp-note-open");
      button.setAttribute("aria-expanded", String(this.#open));
      button.setAttribute(
        "aria-label",
        `${words(note).join(", ")}; ${this.#open ? "fold" : "unfold"} the output of line ${note.line}`,
      );
      button.addEventListener("click", () => this.#onnote(note.line));
    } else {
      dom.setAttribute("aria-label", `line ${note.line}: ${words(note).join(", ")}`);
    }
    return dom;
  }

  // A press on a note is the note's, not the editor's.
  override ignoreEvent(): boolean {
    return true;
  }
}

interface Shown {
  basis: string;
  notes: DecorationSet;
}

function placed(
  doc: EditorState["doc"],
  margin: MarginNotes,
  was: DecorationSet | null,
): DecorationSet {
  const kept: number[] = [];
  if (was !== null) {
    for (const at = was.iter(); at.value !== null; at.next()) kept.push(at.from);
  }
  const open = new Set(margin.unfolded);
  return Decoration.set(
    margin.notes
      .filter((note) => note.line <= doc.lines)
      .map((note, index, all) =>
        Decoration.widget({
          widget: new NoteWidget(note, open.has(note.line), margin.onnote),
          side: 1,
        }).range(kept.length === all.length ? (kept[index] as number) : doc.line(note.line).to),
      ),
    true,
  );
}

const field = StateField.define<Shown>({
  create: () => ({ basis: "", notes: Decoration.none }),
  update(shown, transaction) {
    let now: Shown = { ...shown, notes: shown.notes.map(transaction.changes) };
    for (const effect of transaction.effects) {
      if (!effect.is(showNotes)) continue;
      const margin = effect.value;
      now =
        margin === null
          ? { basis: "", notes: Decoration.none }
          : {
              basis: margin.basis,
              notes: placed(
                transaction.state.doc,
                margin,
                margin.basis === now.basis && margin.basis !== "" ? now.notes : null,
              ),
            };
    }
    return now;
  },
  provide: (self) => EditorView.decorations.from(self, (shown) => shown.notes),
});

/**
 * The margin's look. The column of notes is the code's right padding, as wide as the window
 * gives it (`--zemp-margin`, 300 pixels, or none when the notes are hidden); a note stands in
 * it on its line's first row, whatever the line wraps to.
 */
const look = EditorView.theme({
  ".cm-content": { paddingRight: "var(--zemp-margin, 0px)" },
  ".cm-line": { position: "relative" },
  ".cm-zemp-note": {
    position: "absolute",
    left: "100%",
    top: "0",
    width: "var(--zemp-margin, 0px)",
    boxSizing: "border-box",
    padding: "0 10px 0 14px",
    display: "flex",
    alignItems: "baseline",
    gap: "8px",
    overflow: "hidden",
    whiteSpace: "nowrap",
    background: "none",
    border: "none",
    borderLeftStyle: "solid",
    borderLeftWidth: "1px",
    borderLeftColor: "var(--line)",
    font: "inherit",
    fontSize: "calc(var(--code-size, 14px) - 1.5px)",
    color: "var(--ink-2)",
    textAlign: "left",
    cursor: "default",
  },
  "button.cm-zemp-note": { cursor: "pointer" },
  "button.cm-zemp-note:hover, button.cm-zemp-note:focus-visible": {
    background: "var(--soft)",
    outline: "none",
  },
  "button.cm-zemp-note:focus-visible": { boxShadow: "inset 0 0 0 2px var(--accent)" },
  ".cm-zemp-note-main": { color: "var(--ink)", fontWeight: "500" },
  ".cm-zemp-note-sub": {
    fontFamily: '"Atkinson Hyperlegible Next", system-ui, sans-serif',
    overflow: "hidden",
    textOverflow: "ellipsis",
    minWidth: "0",
    flexShrink: "1",
  },
  ".cm-zemp-note-tag": { flexShrink: "0" },
  ".cm-zemp-note-warning": { color: "var(--warning)" },
  ".cm-zemp-note-error": { color: "var(--error)" },
  ".cm-zemp-note-state": { color: "var(--ink-3)" },
  ".cm-zemp-note-open": { marginLeft: "auto", flexShrink: "0", color: "var(--ink-3)" },
  ".cm-zemp-note-failed .cm-zemp-note-state": { color: "var(--error)" },
  ".cm-zemp-note-edited": {
    backgroundImage:
      "repeating-linear-gradient(135deg, transparent 0 6px, color-mix(in srgb, var(--ink-3) 10%, transparent) 6px 7px)",
  },
});

/**
 * **Run to here** on a statement's line number (#76, R15): the lines statements begin on, and
 * what to do when the words are pressed on one of them.
 */
export interface RunTo {
  lines: number[];
  onrun: (line: number) => void;
}

/** Offer Run to here on these statements' line numbers; `null` offers it nowhere. */
export const showRunTo = StateEffect.define<RunTo | null>();

class RunToMarker extends GutterMarker {
  readonly #line: number;
  readonly #onrun: (line: number) => void;
  constructor(line: number, onrun: (line: number) => void) {
    super();
    this.#line = line;
    this.#onrun = onrun;
  }
  override eq(other: RunToMarker): boolean {
    return other.#line === this.#line && other.#onrun === this.#onrun;
  }
  override toDOM(): Node {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cm-zemp-runto";
    button.dataset["testid"] = "run-to-here";
    button.dataset["line"] = String(this.#line);
    // Reached by the pointer over the line number; the keyboard has the command in ⌘K.
    button.tabIndex = -1;
    button.setAttribute("aria-label", `Run to here: the statements before line ${this.#line}`);
    const words = document.createElement("span");
    words.textContent = "Run to here";
    button.append(words);
    button.addEventListener("click", () => this.#onrun(this.#line));
    return button;
  }
}

const runTo = StateField.define<RunTo | null>({
  create: () => null,
  update(value, transaction) {
    for (const effect of transaction.effects) if (effect.is(showRunTo)) value = effect.value;
    return value;
  },
});

/**
 * A gutter of no width of its own, before the line numbers: on each statement's first line a
 * button laid over the line number, which shows the words **Run to here** when the pointer
 * rests on it.
 */
const runToGutter = gutter({
  class: "cm-zemp-runto-gutter",
  markers: (view) => {
    const offered = view.state.field(runTo);
    if (offered === null) return RangeSet.empty;
    const doc = view.state.doc;
    return RangeSet.of(
      offered.lines
        .filter((line) => line >= 1 && line <= doc.lines)
        .sort((a, b) => a - b)
        .map((line) => new RunToMarker(line, offered.onrun).range(doc.line(line).from)),
    );
  },
});

const runToLook = EditorView.theme({
  ".cm-zemp-runto-gutter": { width: "0", overflow: "visible" },
  ".cm-zemp-runto-gutter .cm-gutterElement": { position: "relative", overflow: "visible" },
  ".cm-zemp-runto": {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    height: "100%",
    padding: "0",
    position: "absolute",
    right: "0",
    top: "0",
    width: "52px",
    zIndex: "2",
  },
  ".cm-zemp-runto span": {
    background: "var(--soft)",
    borderRadius: "6px",
    color: "var(--accent)",
    fontFamily: '"Atkinson Hyperlegible Next", system-ui, sans-serif',
    fontSize: "12.5px",
    left: "52px",
    padding: "1px 8px",
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    visibility: "hidden",
    whiteSpace: "nowrap",
  },
  ".cm-zemp-runto:hover span, .cm-zemp-runto:focus-visible span": { visibility: "visible" },
});

/** The editor's part of the margin: the notes, the room they stand in, and Run to here. */
export function marginNotes(): Extension {
  return [field, look, runTo, runToGutter, runToLook];
}
