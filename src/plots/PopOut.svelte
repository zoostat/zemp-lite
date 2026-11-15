<script lang="ts">
  // A plot in a window of its own, which can sit on a second screen and still redraws to fit
  // (Zemp Specification, section 7, "Pop out").
  import type { Workspace } from "../app/workspace-state.svelte";
  import Figure from "./Figure.svelte";
  import type { PlotStatement } from "./figures";

  let { workspace, plot, view }: { workspace: Workspace; plot: PlotStatement; view: Window } =
    $props();

  // svelte-ignore state_referenced_locally
  let room = $state({ width: view.innerWidth, height: view.innerHeight });
  $effect(() => {
    const resized = () => (room = { width: view.innerWidth, height: view.innerHeight });
    view.addEventListener("resize", resized);
    return () => view.removeEventListener("resize", resized);
  });

  // The plot of the same statement in the run shown now, where it still has one.
  const now = $derived(workspace.plots.find((one) => one.source === plot.source) ?? null);
</script>

<main>
  {#if now !== null}
    <h1><span class="mono">line {now.line}</span> {now.title}</h1>
    <Figure
      {workspace}
      plot={now}
      most={room.width - 24}
      height={Math.max(room.height - 64, 120)}
    />
  {:else}
    <p>The last run has no such plot any more. Run the script again, or close this window.</p>
  {/if}
</main>

<style>
  main {
    padding: 8px 12px 12px;
  }
  h1 {
    color: var(--ink);
    font-size: 13.5px;
    font-weight: 500;
    margin: 0;
  }
  h1 span {
    color: var(--ink-3);
    font-size: 12.5px;
    font-weight: 400;
    margin-right: 8px;
  }
  p {
    color: var(--ink-3);
  }
</style>
