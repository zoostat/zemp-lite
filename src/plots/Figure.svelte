<script lang="ts">
  // One plot of the last run, drawn by the engine at the size of the place it is shown in.
  // When the place is resized the plot is drawn afresh at the new size, once the resizing
  // has stopped: it is laid out again, never stretched. Until the new figure arrives the one
  // before it stays, at its own size. A figure is drawn in the engine's light print theme, on
  // a light ground in both themes of the interface.
  import type { Workspace } from "../app/workspace-state.svelte";
  import { imageOf, type PlotStatement } from "./figures";

  let {
    workspace,
    plot,
    ratio = 0.62,
    height = null,
    most = 760,
  }: {
    workspace: Workspace;
    plot: PlotStatement;
    /** The figure's height as a share of its width, where no height is given. */
    ratio?: number;
    /** A height in pixels to fill, where the place has one of its own. */
    height?: number | null;
    /** The widest the figure is drawn, in pixels. */
    most?: number;
  } = $props();

  let place = $state<HTMLElement | null>(null);
  let width = $state(0);

  $effect(() => {
    if (place === null) return;
    const watch = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (box !== undefined) width = Math.floor(Math.min(box.width, most));
    });
    watch.observe(place);
    return () => watch.disconnect();
  });

  const tall = $derived(Math.round(height ?? width * ratio));
  // What is asked of the engine, kept under a name; a place of no size asks for nothing.
  let key = $state<string | null>(null);
  $effect(() => {
    if (width < 120 || tall < 80) {
      key = null;
      return;
    }
    const mine = workspace.want(plot.line, width, tall);
    key = mine;
    return () => workspace.unwant(mine);
  });

  const figure = $derived(key === null ? undefined : workspace.figures[key]);
  // The last figure drawn stays while the next is on its way.
  let shown = $state<{ svg: string; width: number; height: number } | null>(null);
  $effect(() => {
    const svg = figure?.svg;
    if (typeof svg === "string") shown = { svg, width, height: tall };
  });
</script>

<div class="figure" bind:this={place} data-testid="figure" data-line={plot.line}>
  <div class="frame" style:height="{tall}px" style:width="{width}px">
    {#if shown !== null}
      <img
        src={imageOf(shown.svg)}
        alt="Plot: {plot.title}"
        width={shown.width}
        height={shown.height}
        data-size="{shown.width}x{shown.height}"
      />
    {/if}
    {#if figure?.problem}
      <p class="problem" role="alert">{figure.problem}</p>
    {:else if figure === undefined || figure.svg === null}
      <p class="drawing" data-testid="drawing">drawing…</p>
    {/if}
  </div>
</div>

<style>
  .figure {
    margin-top: 8px;
    min-width: 0;
  }
  .frame {
    /* The engine's figures are drawn on white, for print, in both themes. */
    background: #ffffff;
    border: 1px solid var(--line);
    border-radius: 8px;
    overflow: hidden;
    position: relative;
  }
  img {
    display: block;
    /* Shown at its own size: a figure is never stretched to a place it was not drawn for. */
    max-width: none;
  }
  .drawing,
  .problem {
    background: color-mix(in srgb, #ffffff 85%, transparent);
    border-radius: 6px;
    font-size: 12.5px;
    margin: 0;
    padding: 2px 8px;
    position: absolute;
    right: 8px;
    top: 8px;
  }
  .drawing {
    color: #55555c;
  }
  .problem {
    color: #b3261e;
    left: 8px;
  }
</style>
