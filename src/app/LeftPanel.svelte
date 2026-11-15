<script lang="ts">
  // The one left panel, with two tabs (open decision #146, item 7). Project: the project's
  // files as a tree, with their sizes. Objects: what the last run left in memory, and the
  // engine. There is no right panel.
  import type { TreeNode } from "../project/projects";
  import { count, size } from "./format";
  import { fileTab } from "./views";
  import { editable, type Workspace } from "./workspace-state.svelte";

  let { workspace }: { workspace: Workspace } = $props();

  let chooser = $state<HTMLInputElement | null>(null);

  // The memory budget of a window of the browser: the smaller of 3.5 GB and half the memory
  // the device reports (Engine Specification, section 8.3, point 7).
  const device = (navigator as { deviceMemory?: number }).deviceMemory;
  const budget = device === undefined ? 3.5 : Math.min(3.5, device / 2);

  async function chosen(): Promise<void> {
    if (chooser?.files) {
      await workspace.addData(chooser.files);
      chooser.value = "";
    }
  }
</script>

{#snippet rows(nodes: TreeNode[], depth: number)}
  <ul>
    {#each nodes as node (node.path)}
      <li>
        {#if node.kind === "folder"}
          {@const folded = workspace.views.folded.includes(node.path)}
          <button
            class="row"
            style:padding-left="{8 + depth * 18}px"
            aria-expanded={!folded}
            onclick={() => workspace.toggleFolder(node.path)}
          >
            <span class="chevron" class:open={!folded} aria-hidden="true">›</span>
            <span class="name">{node.name}</span>
          </button>
          {#if !folded}
            {@render rows(node.children, depth + 1)}
          {/if}
        {:else if editable(node.path)}
          <button
            class="row file"
            class:on={workspace.views.active === fileTab(node.path)}
            style:padding-left="{26 + depth * 18}px"
            onclick={() => void workspace.open(node.path)}
          >
            <span class="name">{node.name}</span>
            <em>{size(node.size)}</em>
          </button>
        {:else}
          <div class="row file plain" style:padding-left="{26 + depth * 18}px">
            <span class="name">{node.name}</span>
            <em>{size(node.size)}</em>
          </div>
        {/if}
      </li>
    {/each}
  </ul>
{/snippet}

<aside class="left" aria-label="Project and objects">
  <div class="tabs" role="tablist">
    <button
      role="tab"
      aria-selected={workspace.views.left.tab === "project"}
      class:on={workspace.views.left.tab === "project"}
      onclick={() => workspace.setLeftTab("project")}>Project</button
    >
    <button
      role="tab"
      aria-selected={workspace.views.left.tab === "objects"}
      class:on={workspace.views.left.tab === "objects"}
      onclick={() => workspace.setLeftTab("objects")}
      >Objects{#if workspace.frames.length > 0}<em>{workspace.frames.length}</em>{/if}</button
    >
    <span class="gap"></span>
    <button class="fold" onclick={() => workspace.toggleLeft()} aria-label="Hide the left panel"
      >‹</button
    >
  </div>

  {#if workspace.views.left.tab === "project"}
    <div class="panel" role="tabpanel" aria-label="Project">
      <div class="head">
        <span>{workspace.project.info.name}</span>
        <button
          class="add"
          onclick={() => chooser?.click()}
          aria-label="Add a data file…"
          title="Add a data file…">+</button
        >
        <input
          bind:this={chooser}
          type="file"
          multiple
          hidden
          onchange={chosen}
          aria-label="Data files to add"
        />
      </div>
      <div class="tree">
        {@render rows(workspace.tree, 0)}
      </div>
      {#if workspace.problem}<p class="problem" role="alert">{workspace.problem}</p>{/if}
    </div>
  {:else}
    <div class="panel" role="tabpanel" aria-label="Objects">
      <div class="head"><span>In memory</span></div>
      <div class="objects">
        {#each workspace.frames as frame (frame.name)}
          <div class="object">
            <div class="name mono">{frame.name}</div>
            <span class="badge">frame</span>
            <div class="about">{count(frame.rows)} rows × {count(frame.variables)} variables</div>
          </div>
        {:else}
          <p class="none">Run the script to see what it leaves in memory.</p>
        {/each}
      </div>
      <div class="head"><span>Engine</span></div>
      <div class="engine">
        <div class="which">
          Zeff {workspace.engineVersion ?? "…"} <span>in this browser</span>
        </div>
        <div class="about">a memory budget of {budget} GB</div>
      </div>
    </div>
  {/if}
</aside>

<style>
  .left {
    background: var(--soft);
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
    overflow: auto;
  }
  .tabs {
    align-items: center;
    background: var(--soft);
    border-bottom: 1px solid var(--line);
    display: flex;
    gap: 4px;
    padding: 10px 10px 0;
    position: sticky;
    top: 0;
    z-index: 2;
  }
  .tabs [role="tab"] {
    align-items: center;
    background: transparent;
    border: 0;
    border-bottom: 2px solid transparent;
    color: var(--ink-3);
    display: inline-flex;
    font-weight: 500;
    gap: 7px;
    padding: 7px 12px 9px;
  }
  .tabs [role="tab"]:hover {
    color: var(--ink);
  }
  .tabs [role="tab"].on {
    border-bottom-color: var(--accent);
    color: var(--accent);
    font-weight: 600;
  }
  .tabs em {
    background: var(--line);
    border-radius: 999px;
    color: var(--ink-3);
    font-size: 12.5px;
    font-style: normal;
    font-weight: 500;
    padding: 0 7px;
  }
  .tabs .on em {
    background: var(--accent-soft);
    color: var(--accent);
  }
  .gap {
    flex: 1;
  }
  .fold,
  .add {
    background: transparent;
    border: 0;
    border-radius: 6px;
    color: var(--ink-3);
    font-size: 16px;
    height: 22px;
    line-height: 1;
    width: 22px;
  }
  .fold:hover,
  .add:hover {
    background: var(--line);
    color: var(--ink);
  }
  .panel {
    padding-top: 4px;
  }
  .head {
    align-items: center;
    color: var(--ink-3);
    display: flex;
    font-size: 12.5px;
    font-weight: 600;
    justify-content: space-between;
    letter-spacing: 0.06em;
    padding: 14px 16px 8px;
    text-transform: uppercase;
  }
  .head span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tree {
    padding: 0 8px 10px;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .row {
    align-items: center;
    background: transparent;
    border: 0;
    border-radius: 7px;
    box-sizing: border-box;
    color: var(--ink-2);
    display: flex;
    gap: 7px;
    height: 30px;
    padding-right: 8px;
    text-align: left;
    white-space: nowrap;
    width: 100%;
  }
  button.row:hover {
    background: var(--line);
  }
  .row.on {
    background: var(--accent-soft);
    color: var(--accent);
    font-weight: 600;
  }
  .row .name {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .row em {
    color: var(--ink-3);
    font-size: 12.5px;
    font-style: normal;
    font-weight: 400;
    margin-left: auto;
  }
  .chevron {
    color: var(--ink-3);
    display: inline-block;
    text-align: center;
    transition: transform 0.12s;
    width: 11px;
  }
  .chevron.open {
    transform: rotate(90deg);
  }
  .objects {
    display: grid;
    gap: 8px;
    padding: 0 12px 6px;
  }
  .object,
  .engine {
    background: var(--window);
    border: 1px solid var(--line);
    border-radius: 10px;
  }
  .object {
    display: grid;
    gap: 2px 8px;
    grid-template-columns: 1fr auto;
    padding: 10px 12px;
  }
  .object .name {
    color: var(--ink);
    font-size: 14px;
    font-weight: 500;
  }
  .badge {
    align-self: center;
    background: var(--accent-soft);
    border-radius: 999px;
    color: var(--accent);
    font-size: 12.5px;
    font-weight: 500;
    padding: 1px 9px;
  }
  .about {
    color: var(--ink-3);
    font-size: 12.5px;
    grid-column: 1 / 3;
  }
  .engine {
    margin: 0 12px 16px;
    padding: 12px;
  }
  .which {
    color: var(--ink);
    font-weight: 600;
  }
  .which span {
    color: var(--ink-3);
    font-weight: 400;
  }
  .none,
  .problem {
    color: var(--ink-3);
    margin: 0;
    padding: 0 4px 6px;
  }
  .problem {
    color: var(--warning);
    padding: 0 16px 10px;
  }
</style>
