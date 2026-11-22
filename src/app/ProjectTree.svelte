<script lang="ts">
  // The files of the project as a tree, with their sizes (the Zemp Specification, section 5):
  // a folder folds and unfolds, a script opens in the Script place, and a data file is added
  // from the computer. From Zemp Lite 0.2.1 it is the Project pane at the script's left (#203).
  // From 0.2.2 each row has a menu at its end (#208): a file is saved to the computer, a
  // folder as a zip.
  import type { TreeNode } from "../project/projects";
  import { size } from "./format";
  import RowMenu, { type RowAction } from "./RowMenu.svelte";
  import { fileTab } from "./views";
  import { editable, type Workspace } from "./workspace-state.svelte";

  let { workspace }: { workspace: Workspace } = $props();

  let chooser = $state<HTMLInputElement | null>(null);

  /** What can be done with a row: the items of its menu, in order. */
  function actionsOf(node: TreeNode): RowAction[] {
    return node.kind === "folder"
      ? [{ name: "Save as a zip…", run: () => void workspace.saveFolder(node.path) }]
      : [{ name: "Save a copy…", run: () => void workspace.saveCopy(node.path) }];
  }

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
          <div class="line">
            <button
              class="row"
              style:padding-left="{8 + depth * 18}px"
              aria-expanded={!folded}
              onclick={() => workspace.toggleFolder(node.path)}
            >
              <span class="chevron" class:open={!folded} aria-hidden="true">›</span>
              <span class="name">{node.name}</span>
            </button>
            <RowMenu label="Actions for {node.path}" actions={actionsOf(node)} />
          </div>
          {#if !folded}
            {@render rows(node.children, depth + 1)}
          {/if}
        {:else}
          <div class="line">
            {#if editable(node.path)}
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
            <RowMenu label="Actions for {node.path}" actions={actionsOf(node)} />
          </div>
        {/if}
      </li>
    {/each}
  </ul>
{/snippet}

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

<style>
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
  .add:hover {
    background: var(--line);
    color: var(--ink);
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
  .line {
    align-items: center;
    display: flex;
    gap: 2px;
  }
  .line .row {
    flex: 1;
    min-width: 0;
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
  .problem {
    color: var(--warning);
    margin: 0;
    padding: 0 16px 10px;
  }
</style>
