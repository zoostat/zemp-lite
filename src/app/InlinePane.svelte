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
  const output = $derived({
    basis: run === null ? "" : `${run.startedAt}:${blocks.length}`,
    placed: blocks,
    edited: workspace.edited,
    oncancel: () => workspace.cancel(),
    workspace,
  });

  $effect(() => {
    if (workspace.ready && buffer === undefined) void workspace.open(path);
  });

  // The page stays where the reader is while a run replaces its output (see `steady.ts`).
  let pane = $state<HTMLElement | null>(null);
  let sheet = $state<HTMLElement | null>(null);
  let release: (() => void) | null = null;
  // Before the page is changed for a run that has just started: hold its height.
  $effect.pre(() => {
    if (run?.state === "running" && release === null && pane !== null && sheet !== null) {
      // A reader's place in the script is the line at the top of their view, by its number.
      const lines = sheet;
      release = held(sheet, pane, () =>
        [...lines.querySelectorAll(".cm-lineNumbers .cm-gutterElement")].map(
          (number): [string, Element] => [number.textContent ?? "", number],
        ),
      );
    }
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
