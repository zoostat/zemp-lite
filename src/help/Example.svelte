<script lang="ts">
  // One example of a help page, run in the page (release 0.3, step 9; open decision #211,
  // item 11). Its statements stand as the page prints them, in the editor's colours, and can
  // be changed where they stand; **Run** runs them in the engine the app carries, in a session
  // of their own, and **Reset** puts the page's own back. Under them is what the engine
  // printed and said, a code of a warning or an error opening its page, and each plot drawn
  // by the engine. Until the engine's own output arrives the page's kept text stands, so the
  // page does not jump. The buttons and the line beside them are the app's words (`.own`);
  // every other word is the engine's. **Copy to script** puts the statements into the open
  // script; **Try in the console** (release 0.3.1, step 11b; open decision #245) puts the
  // last of them in the console's field at the foot of the window.
  import Code from "../editor/Code.svelte";
  import { imageOf } from "../plots/figures";
  import { busy, changed, linesOf, saidOf, statusOf } from "./examples";
  import type { Item, PageRuns } from "./runs.svelte";

  let {
    item,
    page,
    oncode,
  }: {
    item: Item;
    page: PageRuns;
    /** Open the page of a code. */
    oncode: (code: string) => void;
  } = $props();

  /** What the print opens a statement typed with. */
  const PROMPT = "> ";
  /** The break between two lines, kept as the print has it. */
  const BREAK = "\n";
  /** What stands beside the buttons of an example that is an illustration, until it is run. */
  const ILLUSTRATION = "the page's illustration · not run";

  const typed = $derived(item.held.text.split("\n"));
  const said = $derived(statusOf(item.held, page.seconds));
  // An illustration is not run as its page opens, and says so until it is run or changed.
  const status = $derived(
    item.note !== ""
      ? item.note
      : said === "" && page.illustrated && item.held.phase === "kept"
        ? ILLUSTRATION
        : said,
  );
  const going = $derived(busy(item.held));

  function keyed(event: KeyboardEvent): void {
    // ⌘↵ or Ctrl+↵ runs it, as it runs a statement of the script.
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      if (!going) void page.run(item);
    }
  }
</script>

<div class="example" role="group" aria-label="Example" data-testid="example">
  {#if item.example.lead.length > 0}
    <pre class="mono lead">{item.example.lead.join(BREAK)}</pre>
  {/if}
  {#if item.runnable}
    <div class="code mono">
      <!-- The statements in the editor's colours, under the field they are typed in. -->
      <pre
        class="mono under"
        aria-hidden="true">{#each typed as line, at (at)}{#if at > 0}{BREAK}{/if}<span
            class="prompt">{PROMPT}</span
          ><Code text={line} inline />{/each}</pre>
      <textarea
        class="mono"
        aria-label="The statements of the example, which can be changed and run"
        autocapitalize="off"
        autocomplete="off"
        spellcheck="false"
        wrap="off"
        rows={typed.length}
        value={item.held.text}
        oninput={(event) => (item.held = { ...item.held, text: event.currentTarget.value })}
        onkeydown={keyed}></textarea>
    </div>
    <div class="bar own">
      <!-- Named apart from the top bar's Run, which runs the script. -->
      <button
        class="run"
        aria-label="Run the example"
        title="Run the example · ⌘↵ in its statements (Ctrl in place of ⌘ on Windows and Linux)"
        disabled={going}
        onclick={() => void page.run(item)}>Run</button
      >
      <button
        class="reset"
        aria-label="Reset the example"
        title="Put back the statements of the page, and run them"
        disabled={going || !changed(item.held)}
        onclick={() => void page.reset(item)}>Reset</button
      >
      <button
        class="copy"
        title="Put these statements into the open script, at the cursor"
        onclick={() => void page.copy(item)}>Copy to script</button
      >
      <!-- The example's last statement, to change and run in the reader's own project
           (release 0.3.1, step 11b; open decision #245). -->
      <button
        class="try"
        title="Put the example's last statement in the console below, to change and run in your project; what it needs from the statements above it is run there first"
        onclick={() => page.try(item)}>Try in the console</button
      >
      <!-- Not the app's one status line, which says how the reader's own run stands. -->
      <span class="status" role="note" aria-live="polite" data-testid="example-status"
        >{status}</span
      >
    </div>
  {/if}
  {#each item.held.parts as part, place (place)}
    {#if part.kind === "text"}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <pre
        class="mono out"
        role="group"
        aria-label="What the example printed"
        tabindex="0"
        data-testid="example-output">{#each part.lines as line, at (at)}{#if at > 0}{BREAK}{/if}{#each saidOf(line) as piece, index (index)}{#if piece.kind === "code"}<button
                class="mono coded"
                title="Open the page of {piece.code}"
                onclick={() => oncode(piece.code)}>{piece.code}</button
              >{:else}{piece.text}{/if}{/each}{/each}</pre>
    {:else}
      {@const drawn = item.figures[place]}
      {#if drawn !== undefined && drawn.svg !== null}
        <div class="frame" data-testid="example-figure">
          <img
            src={imageOf(drawn.svg)}
            alt="The plot the example drew"
            width={drawn.width}
            height={drawn.height}
            data-size="{drawn.width}x{drawn.height}"
          />
        </div>
      {:else if drawn !== undefined}
        <p class="problem own" role="alert">{drawn.problem}</p>
      {/if}
    {/if}
  {/each}
  {#if !item.runnable && item.held.parts.length === 0 && item.example.lead.length === 0}
    <pre class="mono out">{linesOf(item.held.text).join(BREAK)}</pre>
  {/if}
</div>

<style>
  .example {
    background: var(--soft);
    border: 1px solid var(--line);
    border-radius: 8px;
    font-size: calc(var(--code-size, 14px) - 1px);
    line-height: 1.55;
    margin: 0 0 0.7em;
    min-width: 0;
    padding: 12px 14px;
  }
  pre {
    font-size: inherit;
    line-height: inherit;
    margin: 0;
    white-space: pre;
  }
  .lead {
    color: var(--ink-2);
    overflow-x: auto;
  }
  /* The statements: the coloured print below, the field typed in above it, on the same lines. */
  .code {
    display: grid;
    overflow-x: auto;
  }
  .code > * {
    grid-area: 1 / 1;
  }
  .under {
    min-width: max-content;
    pointer-events: none;
  }
  textarea {
    background: transparent;
    border: 0;
    border-radius: 3px;
    caret-color: var(--ink);
    color: transparent;
    font-size: inherit;
    height: 100%;
    line-height: inherit;
    margin: 0;
    min-width: 100%;
    overflow: hidden;
    /* Past the prompt of each line, which is two characters of the code's type. */
    padding: 0 0 0 2ch;
    resize: none;
    white-space: pre;
    width: 100%;
  }
  textarea:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  textarea::selection {
    background: color-mix(in srgb, var(--accent) 28%, transparent);
    color: transparent;
  }
  .prompt {
    color: var(--ink-3);
    user-select: none;
  }
  .bar {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    font-size: 12.5px;
    gap: 6px 8px;
    line-height: 1.4;
    margin: 8px 0 2px;
  }
  .bar button {
    background: var(--window);
    border: 1px solid var(--line-strong);
    border-radius: 6px;
    color: var(--ink);
    cursor: pointer;
    font: inherit;
    padding: 2px 10px;
  }
  /* Outlined: the one filled button of the app is the top bar's Run, of the script. */
  .bar button.run {
    border-color: var(--accent);
    color: var(--accent);
    font-weight: 600;
  }
  /* A button that cannot be pressed is quieter, and still read at 4.5 to 1. */
  .bar button:disabled {
    border-color: var(--line-strong);
    color: var(--ink-3);
    cursor: default;
    font-weight: 400;
  }
  .bar button:focus-visible,
  .out:focus-visible,
  .coded:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
  .status {
    color: var(--ink-2);
  }
  .out {
    color: var(--ink-2);
    margin-top: 6px;
    overflow-x: auto;
  }
  button.coded {
    background: none;
    border: 0;
    border-bottom: 1px dotted currentColor;
    color: var(--accent);
    cursor: pointer;
    font-size: inherit;
    line-height: inherit;
    padding: 0;
  }
  button.coded:hover {
    text-decoration: underline;
  }
  .frame {
    /* The engine's figures are drawn on white, for print, in both themes. */
    background: #ffffff;
    border: 1px solid var(--line);
    border-radius: 8px;
    margin-top: 8px;
    max-width: 100%;
    overflow: hidden;
    width: fit-content;
  }
  img {
    display: block;
    height: auto;
    max-width: 100%;
  }
  .problem {
    color: var(--ink-2);
    font-size: 12.5px;
    margin: 6px 0 0;
  }
</style>
