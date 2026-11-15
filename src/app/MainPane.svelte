<script lang="ts">
  // The main pane: the editor tabs, a strip saying what is open, and the tab shown. A script's
  // tab holds the editor above and the Output panel below it (open decision #146, item 7),
  // which is resized by dragging its upper edge, folds away, and is emptied with Clear.
  import Editor from "../editor/Editor.svelte";
  import OutputPanel from "../output/OutputPanel.svelte";
  import { took, type Run } from "../output/run";
  import Splitter from "./Splitter.svelte";
  import { tabPath } from "./views";
  import type { Workspace } from "./workspace-state.svelte";

  let { workspace }: { workspace: Workspace } = $props();

  let pane = $state<HTMLElement | null>(null);

  const path = $derived(workspace.activePath);
  const buffer = $derived(path === null ? undefined : workspace.buffers[path]);
  const share = $derived(workspace.views.output.share);

  function title(tab: string): string {
    return tabPath(tab)?.split("/").at(-1) ?? tab.slice(5);
  }

  const run = $derived(workspace.lastRun);

  /** A run in a line: when it started, how far it is or how it ended, and how long it took. */
  function summary(run: Run): string {
    const statements = (count: number) => `${count} statement${count === 1 ? "" : "s"}`;
    if (run.state === "running") {
      const at = run.statements.length;
      return run.of === null
        ? `run ${run.clock} · starting`
        : `run ${run.clock} · statement ${at} of ${run.of}`;
    }
    const ended = {
      done: statements(run.statements.length),
      failed: "ended with an error",
      cancelled: "cancelled",
      stopped: "stopped",
    }[run.state];
    return `run ${run.clock} · ${ended}${run.ms === null ? "" : ` · ${took(run.ms)}`}`;
  }

  function dragged(_x: number, y: number): void {
    if (pane === null) return;
    const box = pane.getBoundingClientRect();
    workspace.setOutputShare((box.bottom - y) / box.height);
  }
</script>

<section class="main" aria-label="Editor">
  <div class="tabs" role="tablist" aria-label="Open files">
    {#each workspace.views.tabs as tab (tab)}
      <div class="tab" class:on={workspace.views.active === tab}>
        <button
          role="tab"
          aria-selected={workspace.views.active === tab}
          onclick={() => workspace.show(tab)}>{title(tab)}</button
        >
        <button class="close" onclick={() => workspace.close(tab)} aria-label="Close {title(tab)}"
          >×</button
        >
      </div>
    {/each}
  </div>
  <div class="strip">
    {#if path !== null}
      <span>{path.split("/").join(" › ")}</span>
    {:else}
      <span>No file is open. Choose one in the Project tab.</span>
    {/if}
  </div>

  {#if path !== null && buffer !== undefined}
    <div class="script" bind:this={pane}>
      <div class="editor">
        {#if buffer.loaded}
          {#key path}
            <Editor
              text={buffer.text}
              label="The script"
              onchange={(text) => workspace.edit(path, text)}
              onrun={() => void workspace.run()}
            />
          {/key}
        {/if}
      </div>
      <div
        class="output"
        class:closed={!workspace.views.output.shown}
        style:height={workspace.views.output.shown ? `${share * 100}%` : null}
      >
        {#if workspace.views.output.shown}
          <Splitter
            orientation="horizontal"
            label="The height of the Output panel"
            value={Math.round(share * 100)}
            least={12}
            most={85}
            ondrag={dragged}
            onstep={(direction) => workspace.setOutputShare(share - direction * 0.04)}
          />
        {/if}
        <div class="head">
          <button
            class="fold"
            onclick={() => workspace.toggleOutput()}
            aria-expanded={workspace.views.output.shown}
            aria-label={workspace.views.output.shown ? "Hide the output" : "Show the output"}
          >
            <span class:turned={!workspace.views.output.shown} aria-hidden="true">⌄</span>
          </button>
          <span class="title">Output</span>
          {#if run !== null}
            <span class="about" data-testid="run-summary">{summary(run)}</span>
          {/if}
          <span class="gap"></span>
          {#if workspace.running}
            <button class="word" onclick={() => workspace.cancel()}>Cancel</button>
          {/if}
          <button class="word" onclick={() => workspace.clear()} disabled={workspace.running}
            >Clear</button
          >
        </div>
        {#if workspace.views.output.shown}
          <div class="body" data-testid="output">
            <OutputPanel {run} edited={workspace.edited} />
          </div>
        {/if}
      </div>
    </div>
  {:else}
    <div class="empty"></div>
  {/if}
</section>

<style>
  .main {
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
  }
  .tabs {
    align-items: flex-end;
    background: var(--soft);
    border-bottom: 1px solid var(--line);
    display: flex;
    flex: none;
    gap: 2px;
    height: 42px;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 0 10px;
    scrollbar-width: none;
  }
  .tab {
    align-items: center;
    border: 1px solid transparent;
    border-bottom: 0;
    border-radius: 8px 8px 0 0;
    color: var(--ink-3);
    display: flex;
    height: 33px;
    padding: 0 6px 0 12px;
  }
  .tab.on {
    background: var(--window);
    border-color: var(--line);
    color: var(--ink);
    font-weight: 500;
    height: 34px;
    margin-bottom: -1px;
  }
  .tab:not(.on):hover {
    background: color-mix(in srgb, var(--line) 60%, transparent);
    color: var(--ink);
  }
  .tab button {
    background: none;
    border: 0;
    color: inherit;
    font-weight: inherit;
    padding: 0;
  }
  .tab .close {
    border-radius: 5px;
    color: var(--ink-3);
    font-size: 14px;
    margin-left: 6px;
    padding: 0 4px;
  }
  .tab .close:hover {
    background: var(--line);
    color: var(--ink);
  }
  .strip {
    align-items: center;
    background: var(--window);
    border-bottom: 1px solid var(--line);
    color: var(--ink-3);
    display: flex;
    flex: none;
    font-size: 12.5px;
    gap: 10px;
    min-height: 36px;
    padding: 4px 16px;
  }
  .script {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  }
  .editor {
    background: var(--window);
    display: flex;
    flex: 1;
    min-height: 0;
  }
  .output {
    background: var(--soft);
    border-top: 1px solid var(--line-strong);
    display: flex;
    flex: none;
    flex-direction: column;
    min-height: 44px;
  }
  .output.closed {
    height: 44px;
  }
  .head {
    align-items: center;
    border-bottom: 1px solid var(--line);
    display: flex;
    flex: none;
    gap: 10px;
    height: 42px;
    padding: 0 12px 0 8px;
  }
  .closed .head {
    border-bottom: 0;
  }
  .title {
    color: var(--ink);
    font-weight: 600;
  }
  .about {
    color: var(--ink-3);
    font-size: 12.5px;
  }
  .gap {
    flex: 1;
  }
  .fold {
    background: transparent;
    border: 0;
    border-radius: 6px;
    color: var(--ink-3);
    height: 26px;
    width: 26px;
  }
  .fold:hover {
    background: var(--line);
  }
  .fold span {
    display: inline-block;
    transition: transform 0.15s;
  }
  .fold span.turned {
    transform: rotate(-90deg);
  }
  .word {
    background: var(--window);
    border: 1px solid var(--line-strong);
    border-radius: 7px;
    color: var(--ink-2);
    padding: 4px 11px;
  }
  .word:disabled {
    opacity: 0.5;
  }
  .word:hover:not(:disabled) {
    border-color: var(--accent);
    color: var(--accent);
  }
  .body {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 10px 16px 18px;
  }
  .empty {
    background: var(--window);
    flex: 1;
  }
</style>
