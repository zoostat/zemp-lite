<script lang="ts">
  // The plot viewer (Zemp Specification, section 7), with what the released engine allows:
  // the plot shown redrawn to fit, or at a page of a journal or a slide; at its left the pane
  // **Plots of the run** (open decision #203; the margin editor's design, section 10), every
  // plot of the last run as a thumbnail, clicked to show and dragged to reorder; at its right
  // the pane **The plot**, with the plot's statement, its line, its kind and the size it is
  // saved at; two to four plots pinned side by side; a plot popped out into a window of its own; and a figure
  // saved as SVG, PDF or PNG, written by the engine's `export`, with the Zeff statement that
  // does the same offered beside it.
  import { tick } from "svelte";
  import type { Workspace } from "../app/workspace-state.svelte";
  import { took } from "../output/run";
  import Figure from "./Figure.svelte";
  import {
    PAGES,
    exportStatement,
    millimetres,
    nameOf,
    type Format,
    type Page,
    type PlotStatement,
  } from "./figures";
  import Code from "../editor/Code.svelte";
  import { paneOf } from "../app/panes";
  import Place from "../app/Place.svelte";
  import { popOut } from "./popout";
  import { MOST_PINNED } from "./viewer";

  let { workspace }: { workspace: Workspace } = $props();

  let stage = $state<HTMLElement | null>(null);
  let room = $state({ width: 0, height: 0 });
  $effect(() => {
    if (stage === null) return;
    const watch = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (box !== undefined)
        room = { width: Math.floor(box.width), height: Math.floor(box.height) };
    });
    watch.observe(stage);
    return () => watch.disconnect();
  });

  const strip = $derived(workspace.strip);
  const shown = $derived(workspace.shownPlot);
  const pinned = $derived(workspace.comparedPlots);
  const page = $derived(workspace.views.plots.page);
  const paged = $derived<Page | null>(page === "fit" ? null : page);
  // Two plots stand side by side; three or four in two rows of two.
  const rows = $derived(pinned.length > 2 ? 2 : 1);
  // How the figures last drawn were made, and how long it took.
  const drawnIn = $derived(
    workspace.drawMs === null
      ? ""
      : `${
          workspace.drawnBy === "engine"
            ? "laid out by the engine in"
            : "drawn by a run of the script in"
        } ${took(workspace.drawMs)}`,
  );

  // Saving a figure.
  let format = $state<Format>("svg");
  let problem = $state("");
  let saving = $state(false);
  let copied = $state(false);
  /** The size a saved figure has: the page chosen, or the size the plot is shown at. */
  const size = $derived(
    paged ??
      `[${millimetres(Math.min(room.width, 1100))}, ${millimetres(Math.max(room.height - 8, 80))}]`,
  );
  const statement = $derived(shown === null ? "" : exportStatement(shown, format, size));
  /**
   * The plot's statement as the script that ran has it, over the lines it is written on.
   * Where the statement is a name alone, which prints a plot bound before it, the statement
   * that bound the name stands over it: that is where the plot is written.
   */
  const written = $derived.by(() => {
    const run = workspace.lastRun;
    if (shown === null || run === null) return "";
    const lines = run.text.split("\n");
    const own = lines.slice(shown.line - 1, shown.last).join("\n");
    const name = /^[A-Za-z_][A-Za-z0-9_]*$/.test(own.trim()) ? own.trim() : null;
    const bound = run.info.filter((one) => one.name === name && one.line < shown.line).at(-1);
    return name === null || bound === undefined
      ? own
      : `${lines.slice(bound.line - 1, bound.end).join("\n")}\n${own}`;
  });
  /** The size the figure is saved at, in words: a page's, or the size it is shown at. */
  const sized = $derived(
    paged === null
      ? `${millimetres(Math.min(room.width, 1100))} × ${millimetres(Math.max(room.height - 8, 80))} mm, to fit`
      : `${PAGES[paged].width} × ${PAGES[paged].height} mm, ${PAGES[paged].name.toLowerCase()}`,
  );

  const kinds: Record<Format, string> = {
    svg: "image/svg+xml",
    pdf: "application/pdf",
    png: "image/png",
  };

  async function save(plot: PlotStatement): Promise<void> {
    saving = true;
    problem = "";
    const written = await workspace.exported(plot, format, size);
    saving = false;
    if (typeof written === "string") {
      problem = written;
      return;
    }
    // The browser saves the file the engine wrote, under the plot's name.
    const address = URL.createObjectURL(
      new Blob([written as Uint8Array<ArrayBuffer>], { type: kinds[format] }),
    );
    const link = document.createElement("a");
    link.href = address;
    link.download = `${nameOf(plot)}.${format}`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(address), 10_000);
  }

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(statement);
      copied = true;
      setTimeout(() => (copied = false), 1500);
    } catch {
      problem = "The browser did not let the statement be copied; select it and copy it by hand.";
    }
  }

  // Dragging a thumbnail to another's place.
  let dragged = $state<number | null>(null);

  let list = $state<HTMLElement | null>(null);

  async function key(event: KeyboardEvent, at: number): Promise<void> {
    // Alt and an arrow moves a thumbnail along the strip, for those who use the keyboard alone.
    if (event.altKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault();
      const to = at + (event.key === "ArrowLeft" ? -1 : 1);
      if (to < 0 || to >= strip.length) return;
      workspace.movePlot(at, to);
      // The thumbnail keeps the keyboard where it now stands, so that it can be moved on.
      await tick();
      list?.querySelectorAll<HTMLButtonElement>("button.thumb")[to]?.focus();
    }
  }
</script>

{#snippet row()}
  <!-- The row of Plots (release 0.3.1, step 9; open decision #245): the plots of the run as a
       strip of thumbnails, each with its Compare, and at the strip's end the sizes a plot is
       drawn at and Pop out: every way of laying out the place had as two panes and a bar. -->
  <ul class="strip" aria-label="Plots of the last run" bind:this={list}>
    {#each strip as plot, at (plot.id)}
      <li
        class:on={pinned.length === 0 && shown?.id === plot.id}
        class:over={dragged !== null && dragged !== at}
        draggable="true"
        ondragstart={(event) => {
          dragged = at;
          event.dataTransfer?.setData("text/plain", String(at));
        }}
        ondragover={(event) => event.preventDefault()}
        ondrop={(event) => {
          event.preventDefault();
          if (dragged !== null) workspace.movePlot(dragged, at);
          dragged = null;
        }}
        ondragend={() => (dragged = null)}
      >
        <button
          class="thumb"
          onclick={() => workspace.showPlot(plot)}
          onkeydown={(event) => void key(event, at)}
          aria-label="Show the plot {plot.title}"
          aria-current={shown?.id === plot.id}
        >
          <span class="small"><Figure {workspace} {plot} most={440} /></span>
          <span class="name">{plot.title}</span>
          <span class="about-plot"
            ><span class="mono">line {plot.line}</span>{plot.kind === ""
              ? ""
              : ` · ${plot.kind}`}</span
          >
        </button>
        <label class="pin">
          <input
            type="checkbox"
            checked={workspace.views.plots.pinned.includes(plot.id)}
            disabled={!workspace.views.plots.pinned.includes(plot.id) &&
              workspace.views.plots.pinned.length >= MOST_PINNED}
            onchange={() => workspace.pinPlot(plot)}
          />
          Compare
        </label>
      </li>
    {/each}
  </ul>
  <span class="gap"></span>
  <span class="group" role="group" aria-label="Size">
    {#each ["fit", "one_column", "two_column", "slide"] as const as one (one)}
      <button
        class:on={page === one}
        aria-pressed={page === one}
        onclick={() => workspace.setPage(one)}>{one === "fit" ? "Fit" : PAGES[one].name}</button
      >
    {/each}
  </span>
  {#if paged !== null}
    <span class="about">{PAGES[paged].width} × {PAGES[paged].height} mm</span>
  {/if}
  {#if pinned.length > 0}
    <span class="about" data-testid="comparing">comparing {pinned.length}</span>
    <button class="word" onclick={() => workspace.unpinAll()}>Unpin all</button>
  {/if}
  {#if shown !== null && pinned.length === 0}
    <button class="word" onclick={() => popOut(workspace, shown)}>Pop out</button>
  {/if}
{/snippet}

{#snippet thePlot()}
  {#if shown === null}
    <p class="none">No plot is shown.</p>
  {:else if pinned.length > 0}
    <p class="none">{pinned.length} plots are compared. Unpin them to read of one.</p>
  {:else}
    <div class="written"><Code text={written} /></div>
    <dl class="facts" data-testid="plot-facts">
      <dt>Line</dt>
      <dd>
        <button
          class="word"
          title="Go to the statement in the script"
          onclick={() =>
            void workspace.goTo(workspace.lastRun?.script ?? workspace.scriptPath, shown.line)}
          >{shown.last > shown.line
            ? `lines ${shown.line} to ${shown.last}`
            : `line ${shown.line}`}</button
        >
      </dd>
      {#if shown.kind !== ""}
        <dt>Kind</dt>
        <dd>{shown.kind}</dd>
      {/if}
      <dt>Export size</dt>
      <dd>{sized}</dd>
    </dl>
  {/if}
{/snippet}

<div class="viewer" data-testid="plots">
  <Place
    {workspace}
    name="Plots"
    right={[paneOf(workspace, "plots", "about", null)]}
    bar={strip.length === 0 ? null : row}
  >
    {#if strip.length === 0}
      <p class="none">
        {workspace.lastRun === null
          ? "Run the script to see its plots here."
          : "The last run drew no plot. A plot is drawn when a statement ends in one."}
      </p>
    {:else}
      <div class="main">
        <div class="middle">
          <div class="stage" class:paged={paged !== null} bind:this={stage}>
            {#if pinned.length > 0}
              <div
                class="compare"
                style:grid-template-columns="repeat({pinned.length > 2 ? 2 : pinned.length},
                minmax(0, 1fr))"
              >
                {#each pinned as plot (plot.id)}
                  <div class="cell">
                    <h2><span class="mono">line {plot.line}</span> {plot.title}</h2>
                    <Figure
                      {workspace}
                      {plot}
                      page={paged}
                      most={1100}
                      height={paged === null
                        ? Math.max(Math.floor(room.height / rows) - 40, 120)
                        : null}
                    />
                  </div>
                {/each}
              </div>
            {:else if shown !== null}
              <h2><span class="mono">line {shown.line}</span> {shown.title}</h2>
              {#key shown.id}
                <Figure
                  {workspace}
                  plot={shown}
                  page={paged}
                  most={1100}
                  height={paged === null ? Math.max(room.height - 40, 160) : null}
                />
              {/key}
            {/if}
          </div>

          {#if problem}<p class="problem" role="alert">{problem}</p>{/if}
        </div>
        <!-- The plot's panel, at the right: its statement, its line and its size; the format
             and Save…; and the statement that saves it. -->
        {#if workspace.views.panes.plots.about}
          <aside class="side" aria-label="The plot">
            <h3>The plot</h3>
            {@render thePlot()}
            {#if shown !== null && pinned.length === 0}
              <h3>Save it</h3>
              <div class="saving">
                <label class="about" for="plot-format">Save as</label>
                <select id="plot-format" bind:value={format}>
                  <option value="svg">SVG</option>
                  <option value="pdf">PDF</option>
                  <option value="png">PNG</option>
                </select>
                <button class="word filled" onclick={() => void save(shown)} disabled={saving}
                  >Save…</button
                >
              </div>
              <p class="about saves">The statement that saves this figure:</p>
              <code class="mono" data-testid="export-statement">{statement}</code>
              <p class="copying">
                <button class="word" onclick={() => void copy()}
                  >{copied ? "Copied" : "Copy as Zeff"}</button
                >
              </p>
              {#if workspace.drawMs !== null}
                <p class="about time" data-testid="draw-time">{drawnIn}</p>
              {/if}
            {/if}
          </aside>
        {/if}
      </div>
    {/if}
  </Place>
</div>

<style>
  .viewer {
    background: var(--window);
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
  }
  /* The plot in the middle, and its panel at the right (open decision #245). */
  .main {
    display: flex;
    flex: 1;
    min-height: 0;
    min-width: 0;
  }
  .middle {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
  }
  .side {
    background: var(--softer);
    border-left: 1px solid var(--line);
    box-sizing: border-box;
    flex: none;
    overflow: auto;
    padding: 6px 0 14px;
    width: 300px;
  }
  .side h3 {
    color: var(--ink-3);
    font-size: 12.5px;
    font-weight: 500;
    letter-spacing: 0.05em;
    margin: 10px 14px 6px;
    text-transform: uppercase;
  }
  .saving {
    align-items: center;
    display: flex;
    gap: 8px;
    padding: 0 14px;
  }
  .saves {
    margin: 12px 14px 4px;
  }
  .copying {
    margin: 6px 14px 0;
  }
  .side .time {
    margin: 12px 14px 0;
  }
  .written {
    background: var(--window);
    border: 1px solid var(--line);
    border-radius: 8px;
    margin: 2px 12px 8px;
    padding: 8px 10px;
  }
  .facts {
    display: grid;
    font-size: 13px;
    gap: 4px 14px;
    grid-template-columns: auto 1fr;
    margin: 0;
    padding: 0 14px 14px;
  }
  .facts dt {
    color: var(--ink-3);
  }
  .facts dd {
    color: var(--ink);
    margin: 0;
  }
  .facts .word {
    padding: 0 7px;
  }
  .about-plot {
    color: var(--ink-3);
    display: block;
    font-size: 12.5px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .none {
    color: var(--ink-3);
    padding: 12px 18px;
  }
  .gap {
    flex: 1;
  }
  .about {
    color: var(--ink-3);
    flex: none;
    font-size: 12.5px;
    white-space: nowrap;
  }
  /* The sizes, and the words after them, keep their room in the row: the strip gives way to
     them, and scrolls. */
  .group {
    border: 1px solid var(--line-strong);
    border-radius: 7px;
    display: inline-flex;
    flex: none;
    overflow: hidden;
  }
  .group button {
    background: transparent;
    border: 0;
    color: var(--ink-2);
    font-size: 12.5px;
    padding: 3px 11px;
  }
  .group button + button {
    border-left: 1px solid var(--line-strong);
  }
  .group button.on {
    background: var(--accent-soft);
    color: var(--accent);
  }
  .word,
  select {
    background: var(--window);
    border: 1px solid var(--line-strong);
    border-radius: 7px;
    color: var(--ink-2);
    flex: none;
    padding: 3px 11px;
    white-space: nowrap;
  }
  .word:hover:not(:disabled) {
    border-color: var(--accent);
    color: var(--accent);
  }
  .word.filled {
    background: var(--button);
    border-color: var(--button);
    color: var(--button-ink);
  }
  .word.filled:hover:not(:disabled) {
    background: var(--accent-hover);
    border-color: var(--accent-hover);
    color: var(--button-ink);
  }
  .word:disabled {
    opacity: 0.55;
  }
  /* The plot stands on a white ground in both themes: the engine draws it for print. */
  .stage {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 0 18px 10px;
  }
  /* A page of a journal lies on a soft ground, as paper on a desk. */
  .stage.paged {
    background: var(--soft);
  }
  .compare {
    display: grid;
    gap: 0 16px;
  }
  .cell {
    min-width: 0;
  }
  h2 {
    color: var(--ink);
    font-size: 13.5px;
    font-weight: 500;
    margin: 10px 0 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  h2 span {
    color: var(--ink-3);
    font-size: 12.5px;
    font-weight: 400;
    margin-right: 8px;
  }
  /* The statement that saves the figure: whole, on as many lines as it needs. */
  code {
    background: var(--window);
    border: 1px solid var(--line);
    border-radius: 8px;
    color: var(--ink);
    display: block;
    font-size: 12.5px;
    margin: 0 12px;
    overflow-wrap: anywhere;
    padding: 8px 10px;
    white-space: pre-wrap;
  }
  .problem {
    color: var(--error);
    margin: 0;
    padding: 0 18px 8px;
  }
  /* The strip: the plots of the run side by side, each a small picture with its name and its
     line, and its Compare; it scrolls sideways where the run drew more than the row holds. */
  .strip {
    display: flex;
    flex: 0 1000 auto;
    gap: 6px;
    list-style: none;
    margin: 0;
    min-width: 0;
    overflow-x: auto;
    padding: 5px 0;
  }
  .strip li {
    align-items: center;
    background: var(--window);
    border: 1px solid var(--line);
    border-radius: 8px;
    display: flex;
    flex: none;
    gap: 8px;
    padding: 4px 8px 4px 4px;
  }
  .strip li.on {
    background: var(--accent-soft);
    border-color: color-mix(in srgb, var(--accent) 45%, transparent);
  }
  .strip li.over {
    border-style: dashed;
  }
  .thumb {
    align-items: center;
    background: none;
    border: 0;
    column-gap: 8px;
    display: grid;
    grid-template-columns: 72px auto;
    padding: 0;
    text-align: left;
  }
  /* A thumbnail is a small picture of the figure the engine drew at a readable size. */
  .small {
    background: #ffffff;
    border: 1px solid var(--line);
    border-radius: 5px;
    display: block;
    grid-row: 1 / span 2;
    height: 46px;
    overflow: hidden;
    pointer-events: none;
    width: 72px;
  }
  .small :global(.figure) {
    margin: 0;
    transform: scale(0.1636);
    transform-origin: top left;
    width: 440px;
  }
  .name {
    align-self: end;
    color: var(--ink);
    display: block;
    font-size: 12.5px;
    font-weight: 600;
    max-width: 170px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .about-plot {
    align-self: start;
    max-width: 170px;
  }
  .pin {
    align-items: center;
    color: var(--ink-3);
    display: flex;
    flex: none;
    font-size: 12.5px;
    gap: 5px;
  }
</style>
