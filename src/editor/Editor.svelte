<script lang="ts">
  // The editor of a script: CodeMirror 6, with line numbers, the current line marked, and the
  // code coloured. It is given a file's text and tells each change of it; it keeps no file.
  // The language server's part (completion, hover, live diagnostics, formatting) comes with
  // the alpha.
  import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
  import { bracketMatching, indentUnit } from "@codemirror/language";
  import { EditorState } from "@codemirror/state";
  import {
    EditorView,
    drawSelection,
    highlightActiveLine,
    highlightActiveLineGutter,
    keymap,
    lineNumbers,
  } from "@codemirror/view";
  import { onMount } from "svelte";
  import { zeffLanguage } from "./language";

  let {
    text,
    label,
    onchange,
    onrun,
  }: {
    /** The text of the file. A change made elsewhere is taken into the editor. */
    text: string;
    /** What the editor holds, for a screen reader. */
    label: string;
    onchange: (text: string) => void;
    /** Run was asked for from the keyboard. */
    onrun: () => void;
  } = $props();

  let host: HTMLDivElement;
  let view: EditorView | null = null;

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
    "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground":
      { backgroundColor: "color-mix(in srgb, var(--accent) 22%, transparent)" },
    "&.cm-focused .cm-matchingBracket": {
      backgroundColor: "var(--accent-soft)",
      outline: "1px solid var(--line-strong)",
    },
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
          // Run from the keyboard: ⌘↵ and ⌘⇧↵ (Ctrl on Windows and Linux). Tab indents;
          // Escape and then Tab moves on to the next control, for those who use the keyboard alone.
          keymap.of([
            { key: "Mod-Enter", run },
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
</script>

<div class="editor" bind:this={host}></div>

<style>
  .editor {
    flex: 1;
    min-height: 0;
    min-width: 0;
  }
</style>
