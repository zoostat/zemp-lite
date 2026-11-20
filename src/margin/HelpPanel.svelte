<script lang="ts">
  // The Help panel (open decision #74, as the owner answered it on 21 November 2026): at the
  // side of the script, hidden until asked for, it shows a function's page as `zeff help`
  // prints it, following the function under the cursor unless switched off, or a code's
  // explained page as `zeff explain` prints it. The pages are the engine's, shipped with it.
  import type { Workspace } from "../app/workspace-state.svelte";

  let { workspace }: { workspace: Workspace } = $props();
</script>

<aside class="help" aria-label="Help" data-testid="help">
  <header>
    <h2>{workspace.help.title === "" ? "Help" : workspace.help.title}</h2>
    <label class="follow">
      <input
        type="checkbox"
        checked={workspace.help.follow}
        onchange={(event) => workspace.setHelpFollow(event.currentTarget.checked)}
      />
      Follows the cursor
    </label>
    <button class="act" onclick={() => workspace.setHelpShown(false)}>‹ Hide</button>
  </header>
  {#if workspace.help.page === ""}
    <p class="quiet">
      Put the cursor on a function's name, or press F1 there, to read its page here.
    </p>
  {:else}
    <pre class="mono page" data-testid="help-page">{workspace.help.page}</pre>
  {/if}
</aside>

<style>
  .help {
    background: var(--window);
    border-left: 1px solid var(--line);
    display: flex;
    flex: none;
    flex-direction: column;
    min-height: 0;
    width: 440px;
  }
  header {
    align-items: center;
    border-bottom: 1px solid var(--line);
    display: flex;
    gap: 12px;
    padding: 8px 14px;
  }
  h2 {
    flex: 1;
    font-family: Newsreader, Georgia, serif;
    font-size: 18px;
    font-weight: 400;
    margin: 0;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .follow {
    color: var(--ink-2);
    font-size: 12.5px;
    white-space: nowrap;
  }
  .act {
    background: none;
    border: 0;
    border-radius: 6px;
    color: var(--ink-2);
    cursor: pointer;
    font: inherit;
    font-size: 12.5px;
    padding: 2px 6px;
  }
  .act:hover {
    background: var(--soft);
  }
  .page {
    flex: 1;
    font-size: 12.5px;
    line-height: 1.55;
    margin: 0;
    overflow: auto;
    padding: 10px 14px 20px;
    white-space: pre-wrap;
  }
  .quiet {
    color: var(--ink-3);
    padding: 10px 14px;
  }
</style>
