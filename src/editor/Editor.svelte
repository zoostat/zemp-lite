<script lang="ts">
  // The editor of a script: CodeMirror 6, with line numbers, the current line marked, and the
  // code coloured. It is given a file's text and tells each change of it; it keeps no file.
  // The language server's part (completion, hover, live diagnostics, formatting) comes with
  // the alpha.
  import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
  import { bracketMatching, indentUnit } from "@codemirror/language";
  import {
    autocompletion,
    type Completion,
    type CompletionContext,
  } from "@codemirror/autocomplete";
  import { setDiagnostics, type Diagnostic as Marked } from "@codemirror/lint";
  import { EditorState, StateEffect, StateField } from "@codemirror/state";
  import {
    EditorView,
    drawSelection,
    hoverTooltip,
    showTooltip,
    type Tooltip,
    highlightActiveLine,
    highlightActiveLineGutter,
    keymap,
    lineNumbers,
  } from "@codemirror/view";
  import { onMount } from "svelte";
  import type { Place } from "../app/steady";
  import type { CompletionItem } from "../app/workspace-state.svelte";
  import type { Diagnostic } from "../engine/language";
  import type { Shown } from "../help/hover";
  import { usageOfCalls, type Usage } from "./signature";
  import { functionAt, wordAt } from "./at";
  import { inlineOutput, showOutput, type InlineOutput } from "./inline";
  import { marginNotes, showNotes, showRunTo, type MarginNotes, type RunTo } from "./margin";
  import { zeffLanguage } from "./language";
  import { typstLanguage } from "./typst-language";
  import { saidAtLines, showSaid, type SaidAt } from "./said";

  let {
    text,
    label,
    onchange,
    onrun,
    inline = null,
    notes = null,
    onunfold,
    onstatement,
    runto = null,
    oncursor,
    reveal = null,
    inserting = null,
    oninserted,
    diagnostics = [],
    onhover,
    oncomplete,
    onusage,
    onhelp,
    language = "zeff",
    wrap = false,
    said = [],
    readOnly = false,
  }: {
    /** The text of the file. A change made elsewhere is taken into the editor. */
    text: string;
    /** What the editor holds, for a screen reader. */
    label: string;
    onchange: (text: string) => void;
    /** Run was asked for from the keyboard. */
    onrun: () => void;
    /**
     * The Inline layout: the editor is as tall as its script, the page scrolling it, and
     * these blocks of the last run are drawn under their statements.
     */
    inline?: InlineOutput | null;
    /** The margin editor's notes, beside their statements; `null` where none are shown. */
    notes?: MarginNotes | null;
    /** ⌥↵ (Alt ↵): unfold or fold the output of the statement on this line. */
    onunfold?: (line: number) => void;
    /** ⌘↵: run the statement on this line with what it needs; without it, ⌘↵ runs the script. */
    onstatement?: (line: number) => void;
    /** Run to here, offered on these statements' line numbers. */
    runto?: RunTo | null;
    /** The cursor moved to this line. */
    oncursor?: (line: number) => void;
    /**
     * A line to bring into view with the cursor on it, at a column of it (from 1) where one is
     * given; a new `count` asks again.
     */
    reveal?: { line: number; count: number; top?: boolean; column?: number } | null;
    /**
     * A statement to put into the script at the cursor (⌘↵ on the console line): on the
     * cursor's line where it is blank, else on a line of its own after it, as one edit that
     * undo takes back. Each asking is told apart by its count, and `oninserted` is told once
     * it is made, so that a request is carried out once.
     */
    inserting?: { text: string; count: number } | null;
    oninserted?: (count: number) => void;
    /** What the language server says of the text, as it says it: underlined where it says. */
    diagnostics?: Diagnostic[];
    /** What the language server knows of the word at a place (lines and columns from 0). */
    onhover?: (line: number, character: number) => Promise<Shown | null>;
    /** What the language server offers at a place (lines and columns from 0). */
    oncomplete?: (line: number, character: number) => Promise<CompletionItem[]>;
    /** The usage of the call at a place, from the language server. */
    onusage?: (line: number, character: number) => Promise<Omit<Usage, "pos"> | null>;
    /** F1: the help page of the name at the cursor, with where the name begins (from 0). */
    onhelp?: (name: string, line: number, character: number) => void;
    /** What the text is read and coloured as: a script of Zeff, the source of a paper, or nothing. */
    language?: "zeff" | "typst" | "plain";
    /** Whether the text is shown to be read and cannot be changed here. */
    readOnly?: boolean;
    /** Whether a long line wraps where the editor scrolls itself (a paper's paragraphs do). */
    wrap?: boolean;
    /** What is said of lines of the text (Typst, of a paper): its words stand under each line. */
    said?: readonly SaidAt[];
  } = $props();

  let host: HTMLDivElement;
  let view: EditorView | null = null;

  /**
   * A reader's place in the script, for a page that scrolls the editor: the statement, with
   * the output under it, that holds a height of the window, by the number of its line. The
   * editor draws only what is near the window, so the place is asked of what it knows of the
   * whole script, never of what happens to be drawn.
   */
  export function place(): Place {
    return {
      at(edge) {
        if (view === null) return null;
        const height = edge - view.documentTop;
        const block = view.lineBlockAtHeight(height);
        const line = view.state.doc.lineAt(block.from).number;
        return { name: String(line), offset: block.top - height };
      },
      from(name, edge) {
        const line = Number(name);
        if (view === null || !(line >= 1 && line <= view.state.doc.lines)) return null;
        const block = view.lineBlockAt(view.state.doc.line(line).from);
        return view.documentTop + block.top - edge;
      },
    };
  }

  /**
   * The card of the word at a place of the script (release 0.3.1, step 7; open decision #245):
   * for a function, its name and what it does, its usage, what it matches in R and Stata, and
   * the way to its page; for anything else, what the language server says of it, as it says it.
   */
  function card(shown: Shown, line: number, character: number): HTMLElement {
    const dom = document.createElement("div");
    dom.className = "cm-zemp-hover";
    dom.dataset["testid"] = "hover";
    const add = (tag: string, name: string, text: string) => {
      const part = document.createElement(tag);
      part.className = name;
      part.dataset["testid"] = name;
      part.textContent = text;
      dom.append(part);
      return part;
    };
    if (shown.kind === "words") {
      add("pre", "hover-words", shown.text);
      return dom;
    }
    dom.classList.add("cm-zemp-card");
    const head = add("p", "hover-head", "");
    const name = document.createElement("b");
    name.className = "hover-name";
    name.dataset["testid"] = "hover-name";
    name.textContent = shown.card.name;
    const does = document.createElement("span");
    does.dataset["testid"] = "hover-does";
    does.textContent = shown.card.does;
    head.append(name, " · ", does);
    add("pre", "hover-usage", shown.card.usage);
    if (shown.card.equivalents !== null) add("p", "hover-equivalents", shown.card.equivalents);
    const more = add("p", "hover-more", "");
    const page = document.createElement("button");
    page.type = "button";
    page.dataset["testid"] = "hover-page";
    page.textContent = "Open its page →";
    page.title = "The page of this function in Help · F1 with the cursor on its name";
    page.addEventListener("click", () => onhelp?.(shown.card.name, line, character));
    more.append(page);
    if (onhelp === undefined) more.remove();
    return dom;
  }

  /** Show a card at the cursor, or take the one shown away. */
  const showAtCursor = StateEffect.define<Tooltip | null>();
  const atCursor = StateField.define<Tooltip | null>({
    create: () => null,
    update(shown, transaction) {
      for (const effect of transaction.effects) if (effect.is(showAtCursor)) return effect.value;
      // The card is of where the cursor was: it goes when the cursor or the script moves on.
      return transaction.docChanged || transaction.selection !== undefined ? null : shown;
    },
    provide: (field) => showTooltip.from(field),
  });

  const look = EditorView.theme({
    "&": {
      backgroundColor: "var(--window)",
      color: "var(--code-variable)",
      fontSize: "var(--code-size, 14px)",
      height: "100%",
    },
    "&.cm-focused": { outline: "none" },
    ".cm-scroller": {
      fontFamily: '"JetBrains Mono", ui-monospace, Menlo, monospace',
      // Lines at 1.6 times the size of code text (open decision #245; 1.75 until release 0.3.1).
      lineHeight: "1.6",
      overflow: "auto",
    },
    // The space above and below only: the right padding is the margin's (`margin.ts`), which a
    // shorthand here would set to nothing, leaving the notes outside the sheet.
    ".cm-content": { caretColor: "var(--ink)", paddingTop: "10px", paddingBottom: "24px" },
    ".cm-line": { padding: "0 18px 0 16px" },
    ".cm-gutters": {
      backgroundColor: "var(--window)",
      border: "none",
      color: "var(--ink-3)",
      // Line numbers are a pixel and a half smaller than the code (the design guide).
      fontSize: "calc(var(--code-size, 14px) - 1.5px)",
    },
    ".cm-lineNumbers .cm-gutterElement": { minWidth: "44px", padding: "0 2px 0 8px" },
    // The current line: a faint ground, its number in the accent, a bar at the left edge.
    ".cm-activeLine": { backgroundColor: "color-mix(in srgb, var(--accent) 7%, transparent)" },
    ".cm-activeLineGutter": {
      backgroundColor: "color-mix(in srgb, var(--accent) 7%, transparent)",
      boxShadow: "inset 3px 0 0 var(--accent)",
      color: "var(--accent)",
      fontWeight: "600",
    },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--ink)" },
    ".cm-tooltip": {
      background: "var(--window)",
      border: "1px solid var(--line)",
      borderRadius: "8px",
      color: "var(--ink)",
    },
    // What is said of a line, under it: words of the interface, not code.
    ".cm-zemp-said": {
      backgroundColor: "var(--error-soft)",
      borderLeft: "3px solid var(--error)",
      color: "var(--error)",
      fontFamily: '"Atkinson Hyperlegible Next", system-ui, sans-serif',
      fontSize: "13px",
      lineHeight: "1.45",
      margin: "2px 0 4px",
      padding: "4px 12px 5px 13px",
      whiteSpace: "normal",
    },
    ".cm-zemp-said.warning": {
      backgroundColor: "var(--warning-soft)",
      borderLeftColor: "var(--warning)",
      color: "var(--warning)",
    },
    ".cm-zemp-said strong": { fontWeight: "600" },
    ".cm-zemp-hover pre": {
      fontFamily: '"JetBrains Mono", ui-monospace, Menlo, monospace',
      fontSize: "12.5px",
      margin: "0",
      maxHeight: "320px",
      maxWidth: "640px",
      overflow: "auto",
      padding: "8px 10px",
      whiteSpace: "pre-wrap",
    },
    // The card of a function: its name and what it does, its usage on a soft ground, what it
    // matches in R and Stata, and the way to its page.
    ".cm-zemp-card": {
      boxSizing: "border-box",
      fontFamily: '"Atkinson Hyperlegible Next", system-ui, sans-serif',
      fontSize: "13px",
      lineHeight: "1.5",
      maxWidth: "440px",
      padding: "10px 12px",
      whiteSpace: "normal",
    },
    ".cm-zemp-card p": { margin: "0" },
    ".cm-zemp-card .hover-name": {
      fontFamily: '"JetBrains Mono", ui-monospace, Menlo, monospace',
      fontSize: "12.5px",
    },
    ".cm-zemp-card pre": {
      background: "var(--soft)",
      borderRadius: "7px",
      fontWeight: "500",
      lineHeight: "1.5",
      margin: "6px 0",
      maxWidth: "none",
      padding: "6px 8px",
    },
    ".cm-zemp-card .hover-equivalents": { color: "var(--ink-3)" },
    ".cm-zemp-card .hover-more": { marginTop: "8px" },
    ".cm-zemp-card button": {
      background: "none",
      border: "0",
      borderRadius: "4px",
      color: "var(--accent)",
      cursor: "pointer",
      font: "inherit",
      fontWeight: "600",
      padding: "0",
    },
    ".cm-zemp-card button:hover": { textDecoration: "underline" },
    "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground":
      { backgroundColor: "color-mix(in srgb, var(--accent) 22%, transparent)" },
    "&.cm-focused .cm-matchingBracket": {
      backgroundColor: "var(--accent-soft)",
      outline: "1px solid var(--line-strong)",
    },
  });

  // In the Inline layout the editor does not scroll: it is as tall as what it holds.
  const tall = EditorView.theme({
    "&": { height: "auto" },
    ".cm-scroller": { overflow: "visible" },
    ".cm-content": { paddingTop: "18px", paddingBottom: "40px" },
    // A block of output is not code: its sentences wrap. Its space above and below is
    // padding, not margin, so that the editor measures it and the line numbers stay in step.
    ".cm-zemp-output": { padding: "4px 0 14px", whiteSpace: "normal" },
  });

  onMount(() => {
    const run = () => {
      onrun();
      return true;
    };
    view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: text,
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          highlightActiveLineGutter(),
          history(),
          drawSelection(),
          bracketMatching(),
          indentUnit.of("    "),
          EditorState.tabSize.of(4),
          language === "typst" ? typstLanguage() : language === "plain" ? [] : zeffLanguage(),
          // A file shown to be read: the cursor moves through it and it can be copied from,
          // and nothing typed changes it.
          readOnly ? [EditorState.readOnly.of(true)] : [],
          saidAtLines(),
          look,
          // Completion from the language server: each item makes the edit the server names.
          autocompletion({
            activateOnTyping: true,
            override: [
              async (context: CompletionContext) => {
                if (oncomplete === undefined) return null;
                const word = context.matchBefore(/[\p{L}\p{N}_]*/u);
                const before = context.state.sliceDoc(Math.max(0, context.pos - 1), context.pos);
                if (
                  !context.explicit &&
                  (word === null || word.from === word.to) &&
                  before !== "."
                ) {
                  return null;
                }
                const line = context.state.doc.lineAt(context.pos);
                const items = await oncomplete(line.number - 1, context.pos - line.from);
                if (items.length === 0) return null;
                const at = (place: { line: number; character: number }) =>
                  context.state.doc.line(place.line + 1).from + place.character;
                const first = items[0]?.textEdit?.range;
                const from = first === undefined ? (word?.from ?? context.pos) : at(first.start);
                const kinds: Record<number, string> = {
                  2: "method",
                  3: "function",
                  5: "property",
                  6: "variable",
                  10: "property",
                  12: "constant",
                  15: "text",
                  20: "keyword",
                };
                const options: Completion[] = items.map((item) => ({
                  label: item.filterText ?? item.label,
                  displayLabel: item.label,
                  ...(item.detail === undefined ? {} : { detail: item.detail }),
                  ...(item.documentation === undefined ? {} : { info: item.documentation }),
                  type: kinds[item.kind ?? 0] ?? "text",
                  apply: (target, _completion, start, end) => {
                    const edit = item.textEdit;
                    const change =
                      edit === undefined
                        ? { from: start, to: end, insert: item.label }
                        : { from: at(edit.range.start), to: end, insert: edit.newText };
                    target.dispatch({
                      changes: change,
                      selection: { anchor: change.from + change.insert.length },
                    });
                  },
                }));
                return { from, options, validFor: /^[\p{L}\p{N}_]*$/u };
              },
            ],
          }),
          usageOfCalls(async (line, character) =>
            onusage === undefined ? null : onusage(line, character),
          ),
          // The word under the pointer: a function's usage, or what the language server says of
          // anything else, in its own words (the workspace reads the one out of the other).
          hoverTooltip(async (target, pos) => {
            if (onhover === undefined) return null;
            const line = target.state.doc.lineAt(pos);
            const shown = await onhover(line.number - 1, pos - line.from);
            if (shown === null) return null;
            return {
              pos,
              above: true,
              create: () => ({ dom: card(shown, line.number - 1, pos - line.from) }),
            };
          }),
          // The same card for the keyboard: ⇧F1 shows it for the word the cursor is on, and it
          // goes when the cursor moves, the script changes, or Escape is pressed.
          atCursor,
          // In the margin editor a long line wraps, so that nothing reaches past it.
          inline === null
            ? wrap
              ? [EditorView.lineWrapping]
              : []
            : [tall, inlineOutput(), marginNotes(), EditorView.lineWrapping],
          // Run from the keyboard: ⌘↵ and ⌘⇧↵ (Ctrl on Windows and Linux). Tab indents;
          // Escape and then Tab moves on to the next control, for those who use the keyboard alone.
          keymap.of([
            {
              key: "Mod-Enter",
              run: (target) => {
                if (onstatement === undefined) return run();
                onstatement(target.state.doc.lineAt(target.state.selection.main.head).number);
                return true;
              },
            },
            {
              key: "Shift-F1",
              run: (target) => {
                if (onhover === undefined) return false;
                const head = target.state.selection.main.head;
                const line = target.state.doc.lineAt(head);
                void onhover(line.number - 1, head - line.from).then((shown) => {
                  // The cursor may have moved on while the engine was asked.
                  if (target.state.selection.main.head !== head) return;
                  target.dispatch({
                    effects: showAtCursor.of(
                      shown === null
                        ? null
                        : {
                            pos: head,
                            above: true,
                            create: () => ({ dom: card(shown, line.number - 1, head - line.from) }),
                          },
                    ),
                  });
                });
                return true;
              },
            },
            {
              key: "Escape",
              run: (target) => {
                if (target.state.field(atCursor) === null) return false;
                target.dispatch({ effects: showAtCursor.of(null) });
                return true;
              },
            },
            {
              key: "F1",
              run: (target) => {
                if (onhelp === undefined) return false;
                const head = target.state.selection.main.head;
                const line = target.state.doc.lineAt(head);
                const name =
                  functionAt(line.text, head - line.from) ?? wordAt(line.text, head - line.from);
                if (name !== null) {
                  // The name holds the cursor: it begins at or before it.
                  const from = Math.max(0, line.text.lastIndexOf(name, head - line.from));
                  onhelp(name, line.number - 1, from);
                }
                return true;
              },
            },
            {
              key: "Alt-Enter",
              run: (target) => {
                if (onunfold === undefined) return false;
                onunfold(target.state.doc.lineAt(target.state.selection.main.head).number);
                return true;
              },
            },
            { key: "Shift-Mod-Enter", run },
            ...defaultKeymap,
            ...historyKeymap,
            indentWithTab,
          ]),
          EditorView.contentAttributes.of({
            ...(readOnly ? { "aria-readonly": "true" } : {}),
            "aria-label": label,
            "aria-description": "Press Escape and then Tab to leave the editor.",
            spellcheck: "false",
            autocapitalize: "off",
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onchange(update.state.doc.toString());
            if (update.selectionSet || update.docChanged) {
              const head = update.state.selection.main.head;
              const line = update.state.doc.lineAt(head);
              oncursor?.(line.number);
            }
          }),
        ],
      }),
    });
    return () => {
      view?.destroy();
      view = null;
    };
  });

  // The file's text changed from outside the editor (it was read, or another tab wrote it).
  $effect(() => {
    const now = text;
    if (view !== null && view.state.doc.toString() !== now) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: now } });
    }
  });

  // The notes of the margin, beside their statements, each time they change.
  $effect(() => {
    const shown = notes;
    if (view !== null && inline !== null) {
      view.dispatch({ effects: showNotes.of(shown) });
    }
  });

  // The language server's diagnostics, underlined where it places them, each with its code.
  $effect(() => {
    const told = diagnostics;
    if (view === null) return;
    const doc = view.state.doc;
    const at = (line: number, character: number) =>
      line + 1 > doc.lines
        ? doc.length
        : Math.min(doc.line(line + 1).from + character, doc.line(line + 1).to);
    const marked: Marked[] = told.map((one) => {
      const from = at(one.range.start.line, one.range.start.character);
      const to = Math.max(at(one.range.end.line, one.range.end.character), from);
      return {
        from,
        to: to === from ? Math.min(from + 1, doc.length) : to,
        severity: one.severity === 1 ? "error" : one.severity === 2 ? "warning" : "info",
        message: one.code === undefined ? one.message : `${one.code}: ${one.message}`,
      };
    });
    view.dispatch(setDiagnostics(view.state, marked));
  });

  // What is said of the text's lines, each time it changes.
  $effect(() => {
    const told = said;
    if (view !== null) view.dispatch({ effects: showSaid.of(told) });
  });

  // A line asked for (the error's trail, a section of the outline): the cursor put on it, and
  // it brought into view, a section's heading to the top.
  let revealed = 0;
  $effect(() => {
    const asked = reveal;
    if (view === null || asked === null || asked.count === revealed) return;
    revealed = asked.count;
    const line = view.state.doc.line(Math.min(Math.max(asked.line, 1), view.state.doc.lines));
    const at = Math.min(line.from + Math.max((asked.column ?? 1) - 1, 0), line.to);
    view.dispatch({
      selection: { anchor: at },
      effects: EditorView.scrollIntoView(at, { y: asked.top ? "start" : "center" }),
    });
    view.focus();
  });

  // A statement from the console line, put in at the cursor.
  let inserted = 0;
  $effect(() => {
    const asked = inserting;
    if (view === null || asked === null || asked.count === inserted) return;
    inserted = asked.count;
    const state = view.state;
    const line = state.doc.lineAt(state.selection.main.head);
    const blank = line.text.trim() === "";
    const from = blank ? line.from : line.to;
    const insert = blank ? asked.text : `\n${asked.text}`;
    view.dispatch({
      changes: { from, to: blank ? line.to : line.to, insert },
      selection: { anchor: from + insert.length },
      scrollIntoView: true,
      userEvent: "input.paste",
    });
    view.focus();
    oninserted?.(asked.count);
  });

  // Run to here on the statements' line numbers, each time they change.
  $effect(() => {
    const offered = runto;
    if (view !== null && inline !== null) {
      view.dispatch({ effects: showRunTo.of(offered) });
    }
  });

  // The blocks of the last run, drawn under their statements each time they change.
  $effect(() => {
    const output = inline;
    if (view !== null && output !== null) {
      view.dispatch({ effects: showOutput.of(output) });
    }
  });
</script>

<div class="editor" bind:this={host}></div>

<style>
  .editor {
    flex: 1;
    min-height: 0;
    min-width: 0;
  }
</style>
