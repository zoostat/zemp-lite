<script lang="ts">
  // The Plots tab: the plots of the last run, each drawn to fit the pane.
  import type { Workspace } from "../app/workspace-state.svelte";
  import { took } from "../output/run";
  import Figure from "./Figure.svelte";

  let { workspace }: { workspace: Workspace } = $props();
</script>

<div class="plots" data-testid="plots">
  {#each workspace.plots as plot (plot.line)}
    <section>
      <h2><span class="mono">line {plot.line}</span> {plot.title}</h2>
      <Figure {workspace} {plot} most={1100} />
    </section>
  {:else}
    <p class="none">
      {workspace.lastRun === null
        ? "Run the script to see its plots here."
        : "The last run drew no plot. A plot is drawn when a statement ends in one."}
    </p>
  {/each}
  {#if workspace.drawMs !== null}
    <p class="time" data-testid="draw-time">
      drawn by a run of the script in {took(workspace.drawMs)}
    </p>
  {/if}
</div>

<style>
  .plots {
    background: var(--window);
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 6px 18px 24px;
  }
  section {
    margin-bottom: 18px;
  }
  h2 {
    color: var(--ink);
    font-size: 13.5px;
    font-weight: 500;
    margin: 12px 0 0;
  }
  h2 span {
    color: var(--ink-3);
    font-size: 12.5px;
    font-weight: 400;
    margin-right: 8px;
  }
  .none,
  .time {
    color: var(--ink-3);
  }
  .time {
    font-size: 12.5px;
  }
</style>
