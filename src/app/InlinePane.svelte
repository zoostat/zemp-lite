<script lang="ts">
  // The Inline layout (Zemp Specification, section 5; Zemp Lite's default): one centred
  // column holding the script, with each statement's printed output, warnings and errors
  // directly under it and its time or state in the right margin. The column is at most 760
  // pixels wide at the usual code size, and widens with the code.
  import Editor from "../editor/Editor.svelte";
  import { placed } from "../output/place";
  import type { Workspace } from "./workspace-state.svelte";

  let { workspace }: { workspace: Workspace } = $props();

  // Inline shows the file of the tab shown, or the script Run runs where no tab is open.
  const path = $derived(workspace.activePath ?? workspace.scriptPath);
  const buffer = $derived(workspace.buffers[path]);
  const run = $derived(workspace.lastRun);
  // The blocks of the last run belong under this script only where it is the one that ran.
  const blocks = $derived(run !== null && run.script === path ? placed(run) : []);
  const output = $derived({
    basis: run === null ? "" : `${run.startedAt}:${blocks.length}`,
    placed: blocks,
    edited: workspace.edited,
    oncancel: () => workspace.cancel(),
  });

  $effect(() => {
    if (workspace.ready && buffer === undefined) void workspace.open(path);
  });
</script>

<section class="inline" aria-label="Script with its output">
  <div class="sheet">
    {#if buffer?.loaded}
      {#key path}
        <Editor
          text={buffer.text}
          label="The script"
          onchange={(text) => workspace.edit(path, text)}
          onrun={() => void workspace.run()}
          inline={output}
        />
      {/key}
    {/if}
  </div>
</section>

<style>
  .inline {
    background: var(--window);
    flex: 1;
    min-height: 0;
    overflow: auto;
  }
  .sheet {
    margin: 0 auto;
    max-width: calc(760px * var(--code-scale, 1));
    padding: 0 18px;
  }
</style>
