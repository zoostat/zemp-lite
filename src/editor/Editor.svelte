<script lang="ts">
  // The editor of a script: CodeMirror 6, with line numbers, the current line marked, and the
  // code coloured. It is given a file's text and tells each change of it; it keeps no file.
  // The language server's part (completion, hover, live diagnostics, formatting) comes with
  // the alpha.
  import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
  import { bracketMatching, indentUnit } from "@codemirror/language";
  import { setDiagnostics, type Diagnostic as Marked } from "@codemirror/lint";
  import { EditorState } from "@codemirror/state";
  import {
    EditorView,
    drawSelection,
    hoverTooltip,
    highlightActiveLine,
    highlightActiveLineGutter,
    keymap,
    lineNumbers,
  } from "@codemirror/view";
  import { onMount } from "svelte";
  import type { Place } from "../app/steady";
  import type { Diagnostic } from "../engine/language";
  import { inlineOutput, showOutput, type InlineOutput } from "./inline";
  import { marginNotes, showNotes, showRunTo, type MarginNotes, type RunTo } from "./margin";
  import { zeffLanguage } from "./language";

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
    diagnostics = [],
    onhover,
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
    /** A line to bring into view with the cursor on it; a new `count` asks again. */
    reveal?: { line: number; count: number } | null;
    /** What the language server says of the text, as it says it: underlined where it says. */
    diagnostics?: Diagnostic[];
    /** What the language server knows of the word at a place (lines and columns from 0). */
    onhover?: (line: number, character: number) => Promise<string | null>;
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
      lineHeight: "1.75",
      overflow: "auto",
    },
    ".cm-content": { caretColor: "var(--ink)", padding: "10px 0 24px" },
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
    ".cm-content": { padding: "18px 0 40px" },
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
          zeffLanguage(),
          look,
          // What the language server knows of the word under the pointer, in its own words.
          hoverTooltip(async (target, pos) => {
            if (onhover === undefined) return null;
            const line = target.state.doc.lineAt(pos);
            const text = await onhover(line.number - 1, pos - line.from);
            if (text === null || text.trim() === "") return null;
            return {
              pos,
              above: true,
              create: () => {
                const dom = document.createElement("div");
                dom.className = "cm-zemp-hover";
                dom.dataset["testid"] = "hover";
                const page = document.createElement("pre");
                page.textContent = text;
                dom.append(page);
                return { dom };
              },
            };
          }),
          // In the margin editor a long line wraps, so that nothing reaches past it.
          inline === null ? [] : [tall, inlineOutput(), marginNotes(), EditorView.lineWrapping],
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
            "aria-label": label,
            "aria-description": "Press Escape and then Tab to leave the editor.",
            spellcheck: "false",
            autocapitalize: "off",
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onchange(update.state.doc.toString());
            if (update.selectionSet || update.docChanged) {
              oncursor?.(update.state.doc.lineAt(update.state.selection.main.head).number);
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

  // A line asked for (the error's trail): the cursor put on it, and it brought into view.
  let revealed = 0;
  $effect(() => {
    const asked = reveal;
    if (view === null || asked === null || asked.count === revealed) return;
    revealed = asked.count;
    const line = view.state.doc.line(Math.min(Math.max(asked.line, 1), view.state.doc.lines));
    view.dispatch({
      selection: { anchor: line.from },
      effects: EditorView.scrollIntoView(line.from, { y: "center" }),
    });
    view.focus();
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
