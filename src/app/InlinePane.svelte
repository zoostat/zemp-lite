<script lang="ts">
  // The Inline layout (Zemp Specification, section 5; Zemp Lite's default): one centred
  // column holding the script, with each statement's printed output, warnings and errors
  // directly under it and its time or state in the right margin. The column is at most 760
  // pixels wide at the usual code size, and widens with the code.
  import { tick } from "svelte";
  import Editor from "../editor/Editor.svelte";
  import { placed } from "../output/place";
  import PlotViewer from "../plots/PlotViewer.svelte";
  import { held } from "./steady";
  import { PLOTS, fileTab } from "./views";
  import type { Workspace } from "./workspace-state.svelte";

  let { workspace }: { workspace: Workspace } = $props();

  // Inline shows the file of the tab shown, or the script Run runs where no tab is open.
  const path = $derived(workspace.activePath ?? workspace.scriptPath);
  const buffer = $derived(workspace.buffers[path]);
  const run = $derived(workspace.lastRun);
  // The blocks of the last run belong under this script only where it is the one that ran.
  const blocks = $derived(run !== null && run.script === path ? placed(run) : []);
  // What the check found when it refused the script, shown above the results kept.
  const refusal = $derived(workspace.refusal);
  const refused = $derived(
    refusal !== null && refusal.script === path
      ? {
          basis: String(refusal.startedAt),
          placed: placed(refusal),
          edited: workspace.refusalEdited,
        }
      : null,
  );
  const output = $derived({
    basis: run === null ? "" : `${run.startedAt}:${blocks.length}`,
    placed: blocks,
    edited: workspace.edited,
    refused,
    oncancel: () => workspace.cancel(),
    workspace,
  });

  $effect(() => {
    if (workspace.ready && buffer === undefined) void workspace.open(path);
  });

  // The page stays where the reader is while a run replaces its output (see `steady.ts`).
  let pane = $state<HTMLElement | null>(null);
  let sheet = $state<HTMLElement | null>(null);
  let editor = $state<ReturnType<typeof Editor> | null>(null);
  let release: (() => void) | null = null;
  // Just before a run takes the old results off the page: hold its height, and note the
  // reader's place in the script, which is the statement, with its output, at the top of
  // their view. The editor says which, and where it stands when the results are new.
  $effect(() => {
    const hold = () => {
      if (release === null && pane !== null && sheet !== null && editor !== null) {
        release = held(sheet, pane, editor.place());
      }
    };
    return workspace.beforeRun(hold);
  });
  // After the results of a run that has ended are drawn: give the reader's place back.
  $effect(() => {
    if (run?.state !== "running" && release !== null) {
      const done = release;
      release = null;
      void tick().then(() => requestAnimationFrame(done));
    }
  });
</script>

{#if workspace.views.active === PLOTS}
  <!-- The plot viewer, opened from ⌘K, in the script's place; "Script" goes back. -->
  <PlotViewer {workspace} onback={() => workspace.show(fileTab(workspace.scriptPath))} />
{:else}
  <section class="inline" aria-label="Script with its output" bind:this={pane}>
    <div class="sheet" bind:this={sheet}>
      {#if buffer?.loaded}
        {#key path}
          <Editor
            bind:this={editor}
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
{/if}

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
