<script lang="ts">
  import type { Workspace } from "./workspace-state.svelte";

  // The line a project shows under the bar where its `zeff.toml` names another engine than
  // the one Zemp Lite carries (release 0.3, step 3b). A project runs on the engine it names
  // and on no other (Engine Specification, section 2), and a browser carries one engine: so
  // the engine refuses the run in its own words (Z0710), and this line says why in plain
  // words and offers the one way on, which rewrites the one line of the manifest. Once the
  // project is moved the line says so, until it is closed or the project is left.
  const { workspace }: { workspace: Workspace } = $props();
</script>

{#if workspace.otherEngine !== null}
  <p class="engine-line" role="note" aria-live="polite" data-testid="engine-line">
    <span>
      This project names Zeff {workspace.otherEngine} in its <span class="mono">zeff.toml</span>,
      and Zemp Lite carries Zeff {workspace.carried}. A project runs only on the engine it names.
      {#if workspace.engineRefusal !== null}
        The engine refused the run:
        <span class="mono" data-testid="engine-said">{workspace.engineRefusal}</span>
      {/if}
    </span>
    <button onclick={() => void workspace.moveEngine()}>Move to Zeff {workspace.carried}</button>
  </p>
{:else if workspace.movedFrom !== null}
  <p class="engine-line moved" role="note" aria-live="polite" data-testid="engine-line">
    <span
      >This project now names Zeff {workspace.carried}; it named {workspace.movedFrom}. Run it to
      see its results on this engine.</span
    >
    <button onclick={() => (workspace.movedFrom = null)}>Close</button>
  </p>
{/if}

<style>
  .engine-line {
    align-items: baseline;
    background: var(--warning-soft);
    border-bottom: 1px solid var(--line);
    color: var(--warning);
    display: flex;
    flex: none;
    gap: 12px;
    margin: 0;
    padding: 6px 18px;
  }
  .engine-line.moved {
    background: var(--soft);
    color: var(--ink);
  }
  button {
    background: none;
    border: 1px solid currentColor;
    border-radius: 6px;
    color: inherit;
    flex: none;
    padding: 2px 10px;
  }
  button:hover {
    background: var(--window);
  }
</style>
