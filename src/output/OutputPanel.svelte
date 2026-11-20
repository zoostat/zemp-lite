<script lang="ts">
  // The body of the Output panel of the Panes layout: the blocks of the last run, one under
  // another in the order of the script. When the script has been edited since, the whole is
  // marked "edited · not run".
  import type { Workspace } from "../app/workspace-state.svelte";
  import OutputBlock from "./OutputBlock.svelte";
  import { blocks, type Run } from "./run";

  let {
    run,
    edited,
    refusal = null,
    refusalEdited = false,
    workspace,
  }: {
    run: Run | null;
    edited: boolean;
    /** A press of Run that the engine's check refused, the results of `run` being kept. */
    refusal?: Run | null;
    /** The script has been edited since the check refused it. */
    refusalEdited?: boolean;
    workspace: Workspace;
  } = $props();

  const shown = $derived(run === null ? [] : blocks(run));
  const found = $derived(refusal === null ? [] : blocks(refusal));
  const errors = $derived(
    found.reduce(
      (count, block) => count + block.said.filter((one) => one.kind === "error").length,
      0,
    ),
  );
</script>

<div class="results">
  {#if refusal !== null && run !== null}
    <!-- Nothing ran: what the check found, and under it the results that are kept. -->
    <p class="refused" role="note" data-testid="refused">
      {#if refusal.checkOnly}
        The check of {refusal.clock} found {errors} error{errors === 1 ? "" : "s"}; nothing was run.
      {:else}
        The run of {refusal.clock} did not start: the check found {errors} error{errors === 1
          ? ""
          : "s"}.
      {/if}
      The results under {errors === 1 ? "it" : "them"} are those of the run of {run.clock}.
    </p>
    {#each found as block, at (at)}
      <OutputBlock {block} edited={refusalEdited} {workspace} />
    {/each}
  {/if}
  <div class="kept">
    {#if edited}
      <p class="mark" role="note">edited · not run</p>
    {/if}
    {#if run === null}
      <p class="none">Press Run to see each result under the line that made it.</p>
    {:else if shown.length === 0 && run.state !== "running"}
      <p class="none">The script ran and printed nothing.</p>
    {/if}
    {#each shown as block, at (at)}
      <OutputBlock {block} edited={false} {workspace} />
    {/each}
  </div>
</div>

<style>
  .results,
  .kept {
    display: grid;
    gap: 10px;
  }
  .refused {
    color: var(--ink-2);
    margin: 0;
  }
  .none {
    color: var(--ink-3);
    margin: 4px 0;
  }
  .mark {
    border: 1px dashed var(--warning);
    border-radius: 7px;
    color: var(--warning);
    justify-self: start;
    margin: 0;
    padding: 2px 10px;
  }
  /* Output that is no longer the script's: dashed and faded, with its reason above. */
  .kept:has(.mark) :global(.block) {
    border-style: dashed;
    opacity: 0.6;
  }
</style>
