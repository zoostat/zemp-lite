<script lang="ts">
  // The plot viewer (Zemp Specification, section 7), with what the released engine allows:
  // the plot shown redrawn to fit, or at a page of a journal or a slide; the list of plots at
  // the left (the margin editor's design, section 10), which hides, in place of 0.1's strip,
  // every plot of the last run as a thumbnail, clicked to show and dragged to reorder; two to
  // four plots pinned side by side; a plot popped out into a window of its own; and a figure
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
  import { popOut } from "./popout";
  import { MOST_PINNED } from "./viewer";

  let { workspace, onback = null }: { workspace: Workspace; onback?: (() => void) | null } =
    $props();

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

<div class="viewer" data-testid="plots">
  {#if strip.length === 0}
    <p class="none">
      {#if onback}<button class="word" onclick={onback}>‹ Script</button>{/if}
      {workspace.lastRun === null
        ? "Run the script to see its plots here."
        : "The last run drew no plot. A plot is drawn when a statement ends in one."}
    </p>
  {:else}
    {#if workspace.views.plots.list}
      <aside class="side" aria-label="The list of plots">
        <div class="side-head">
          <span>Plots of the run</span>
          <button class="word" onclick={() => workspace.setPlotList(false)}>‹ Hide</button>
        </div>
        <ul class="strip" aria-label="Plots of the last run" bind:this={list}>
          {#each strip as plot, at (plot.source)}
            <li
              class:on={pinned.length === 0 && shown?.source === plot.source}
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
                aria-current={shown?.source === plot.source}
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
                  checked={workspace.views.plots.pinned.includes(plot.source)}
                  disabled={!workspace.views.plots.pinned.includes(plot.source) &&
                    workspace.views.plots.pinned.length >= MOST_PINNED}
                  onchange={() => workspace.pinPlot(plot)}
                />
                Compare
              </label>
            </li>
          {/each}
        </ul>
      </aside>
    {/if}
    <div class="main">
      <div class="bar">
        {#if onback}<button class="word" onclick={onback}>‹ Script</button>{/if}
        {#if !workspace.views.plots.list}
          <button class="word" onclick={() => workspace.setPlotList(true)}
            >Show the list of plots ›</button
          >
        {/if}
        <span class="group" role="group" aria-label="Size">
          {#each ["fit", "one_column", "two_column", "slide"] as const as one (one)}
            <button
              class:on={page === one}
              aria-pressed={page === one}
              onclick={() => workspace.setPage(one)}
              >{one === "fit" ? "Fit" : PAGES[one].name}</button
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
        <span class="gap"></span>
        {#if shown !== null && pinned.length === 0}
          <button class="word" onclick={() => popOut(workspace, shown)}>Pop out</button>
          <label class="about" for="plot-format">Save as</label>
          <select id="plot-format" bind:value={format}>
            <option value="svg">SVG</option>
            <option value="pdf">PDF</option>
            <option value="png">PNG</option>
          </select>
          <button class="word filled" onclick={() => void save(shown)} disabled={saving}
            >Save…</button
          >
        {/if}
      </div>

      <div class="stage" class:paged={paged !== null} bind:this={stage}>
        {#if pinned.length > 0}
          <div
            class="compare"
            style:grid-template-columns="repeat({pinned.length > 2 ? 2 : pinned.length}, minmax(0,
            1fr))"
          >
            {#each pinned as plot (plot.source)}
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
          {#key shown.source}
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

      {#if shown !== null && pinned.length === 0}
        <div class="statement">
          <span class="about">The statement that saves this figure:</span>
          <code class="mono" data-testid="export-statement">{statement}</code>
          <button class="word" onclick={() => void copy()}
            >{copied ? "Copied" : "Copy as Zeff"}</button
          >
          {#if workspace.drawMs !== null}
            <span class="about time" data-testid="draw-time"
              >drawn by a run of the script in {took(workspace.drawMs)}</span
            >
          {/if}
        </div>
      {/if}
      {#if problem}<p class="problem" role="alert">{problem}</p>{/if}
    </div>
  {/if}
</div>

<style>
  .viewer {
    background: var(--window);
    display: flex;
    flex: 1;
    flex-direction: row;
    min-height: 0;
    min-width: 0;
  }
  .main {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
  }
  /* The list of plots at the left (the margin editor's design, section 10), which hides. */
  .side {
    border-right: 1px solid var(--line);
    display: flex;
    flex: none;
    flex-direction: column;
    min-height: 0;
    width: 230px;
  }
  .side-head {
    align-items: center;
    color: var(--ink-2);
    display: flex;
    font-size: 13px;
    justify-content: space-between;
    padding: 8px 10px 4px 14px;
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
  .bar,
  .statement {
    align-items: center;
    display: flex;
    flex: none;
    flex-wrap: wrap;
    gap: 10px;
    padding: 8px 18px;
  }
  .bar {
    border-bottom: 1px solid var(--line);
  }
  .statement {
    border-top: 1px solid var(--line);
  }
  .gap {
    flex: 1;
  }
  .about {
    color: var(--ink-3);
    font-size: 12.5px;
  }
  .time {
    margin-left: auto;
  }
  .group {
    border: 1px solid var(--line-strong);
    border-radius: 7px;
    display: inline-flex;
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
    padding: 3px 11px;
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
    color: var(--button-ink);
  }
  .word:disabled {
    opacity: 0.55;
  }
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
  code {
    background: var(--soft);
    border-radius: 6px;
    color: var(--ink);
    font-size: 12.5px;
    max-width: 60%;
    overflow: hidden;
    padding: 3px 8px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .problem {
    color: var(--error);
    margin: 0;
    padding: 0 18px 8px;
  }
  .strip {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 8px;
    list-style: none;
    margin: 0;
    min-height: 0;
    overflow-y: auto;
    padding: 4px 10px 12px;
  }
  .strip li {
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--window);
    flex: none;
    padding: 6px;
  }
  .strip li.on {
    border-color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent);
  }
  .strip li.over {
    border-style: dashed;
  }
  .thumb {
    background: none;
    border: 0;
    display: block;
    padding: 0;
    text-align: left;
    width: 100%;
  }
  /* A thumbnail is a small picture of the figure the engine drew at a readable size. */
  .small {
    display: block;
    height: 99px;
    overflow: hidden;
    pointer-events: none;
  }
  .small :global(.figure) {
    margin: 0;
    transform: scale(0.3636);
    transform-origin: top left;
    width: 440px;
  }
  .name {
    color: var(--ink-2);
    display: block;
    font-size: 12.5px;
    margin-top: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .pin {
    align-items: center;
    color: var(--ink-3);
    display: flex;
    font-size: 12.5px;
    gap: 5px;
    margin-top: 2px;
  }
</style>
