<script lang="ts">
  // The workspace of a project (Zemp Specification, section 5), in the Panes layout of open
  // decision #146: the top bar, one left panel, the main pane, and a line at the foot.
  import type { Engine } from "../engine/engine";
  import type { Project } from "../project/projects";
  import LeftPanel from "./LeftPanel.svelte";
  import MainPane from "./MainPane.svelte";
  import Splitter from "./Splitter.svelte";
  import TopBar from "./TopBar.svelte";
  import { LEFT_WIDTH } from "./views";
  import { Workspace } from "./workspace-state.svelte";

  let { project, engine, onclose }: { project: Project; engine: Engine; onclose: () => void } =
    $props();

  // One project to a window: this component is made anew for each project it shows.
  // svelte-ignore state_referenced_locally
  const workspace = new Workspace(project, engine);

  let width = $state(window.innerWidth);
  let body = $state<HTMLElement | null>(null);

  async function close(): Promise<void> {
    await workspace.settle();
    onclose();
  }
</script>

<svelte:window bind:innerWidth={width} />

<TopBar {workspace} onclose={() => void close()} />

{#if width < 1200}
  <p class="narrow" role="note">
    Zemp Lite is laid out for a window at least 1,200 pixels wide; this one is {width}. No smaller
    layout exists yet.
  </p>
{/if}

<div class="panes" bind:this={body}>
  {#if workspace.views.left.shown}
    <div class="side" style:width="{workspace.views.left.width}px">
      <LeftPanel {workspace} />
    </div>
    <Splitter
      orientation="vertical"
      label="The width of the left panel"
      value={workspace.views.left.width}
      least={LEFT_WIDTH.least}
      most={LEFT_WIDTH.most}
      ondrag={(x) => workspace.setLeftWidth(x - (body?.getBoundingClientRect().left ?? 0))}
      onstep={(direction) => workspace.setLeftWidth(workspace.views.left.width + direction * 16)}
    />
  {:else}
    <div class="rail">
      <button onclick={() => workspace.toggleLeft()} aria-label="Show the left panel">›</button>
    </div>
  {/if}
  <MainPane {workspace} />
</div>

<footer class="bottom">
  <span role="status">{workspace.status}</span>
  <span class="engine">engine Zeff {workspace.engineVersion ?? "…"} · in this browser</span>
</footer>

<style>
  .panes {
    background: var(--window);
    display: flex;
    flex: 1;
    min-height: 0;
  }
  .panes > :global(.main) {
    flex: 1;
  }
  .side {
    border-right: 1px solid var(--line);
    display: flex;
    flex: none;
    min-height: 0;
  }
  .side > :global(.left) {
    flex: 1;
  }
  .rail {
    background: var(--soft);
    border-right: 1px solid var(--line);
    flex: none;
    padding-top: 12px;
    width: 30px;
  }
  .rail button {
    background: transparent;
    border: 0;
    border-radius: 6px;
    color: var(--ink-3);
    font-size: 16px;
    height: 22px;
    line-height: 1;
    margin: 0 4px;
    width: 22px;
  }
  .rail button:hover {
    background: var(--line);
    color: var(--ink);
  }
  .narrow {
    background: var(--warning-soft);
    border-bottom: 1px solid var(--line);
    color: var(--warning);
    flex: none;
    margin: 0;
    padding: 6px 18px;
  }
  .bottom {
    align-items: center;
    background: var(--window);
    border-top: 1px solid var(--line);
    color: var(--ink-3);
    display: flex;
    flex: none;
    gap: 12px;
    height: 36px;
    justify-content: space-between;
    padding: 0 18px;
  }
  .engine {
    color: var(--ink-2);
  }
</style>
