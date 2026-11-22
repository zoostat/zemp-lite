<script lang="ts">
  // The files of the project as a tree, with their sizes (the Zemp Specification, section 5):
  // a folder folds and unfolds, a script opens in the Script place, and a data file is added
  // from the computer. From Zemp Lite 0.2.1 it is the Project pane at the script's left (#203).
  // From 0.2.2 each row has a menu at its end (#208): a file is saved to the computer, a
  // folder as a zip.
  import type { TreeNode } from "../project/projects";
  import { own } from "../project/files";
  import { size } from "./format";
  import RowMenu, { type RowAction } from "./RowMenu.svelte";
  import { fileTab } from "./views";
  import { editable, type Workspace } from "./workspace-state.svelte";

  let { workspace }: { workspace: Workspace } = $props();

  let chooser = $state<HTMLInputElement | null>(null);
  /** The folder the files chosen next are added into. */
  let into = $state("data");

  /** A script or a folder being named, in a row where it will stand. */
  let naming = $state<{ kind: "script" | "folder"; parent: string } | null>(null);
  let named = $state("");
  /** Why what was typed cannot be the name, as a sentence. */
  let refused = $state("");

  function name(kind: "script" | "folder", parent: string): void {
    naming = { kind, parent };
    named = "";
    refused = "";
    workspace.unfoldFolder(parent);
  }

  async function make(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (naming === null) return;
    const problem =
      naming.kind === "script"
        ? await workspace.newScript(named, naming.parent)
        : await workspace.newFolder(named, naming.parent);
    if (problem === null) naming = null;
    else refused = problem;
  }

  function focus(node: HTMLInputElement): void {
    node.focus();
  }

  function addInto(folder: string): void {
    into = folder;
    chooser?.click();
  }

  /** What is made in a folder: a script, a folder, files from the computer. */
  function making(folder: string): RowAction[] {
    return [
      { name: "New script", run: () => name("script", folder === "" ? "scripts" : folder) },
      { name: "New folder", run: () => name("folder", folder) },
      { name: "Add files…", run: () => addInto(folder === "" ? "data" : folder) },
    ];
  }

  /** What can be done with a row: the items of its menu, in order. */
  function actionsOf(node: TreeNode): RowAction[] {
    if (node.kind === "file") {
      return [{ name: "Save a copy…", run: () => void workspace.saveCopy(node.path) }];
    }
    return [
      // Nothing is made in the app's own folder or the engine's.
      ...(own(node.path) ? [] : making(node.path)),
      { name: "Save as a zip…", run: () => void workspace.saveFolder(node.path) },
    ];
  }

  async function chosen(): Promise<void> {
    if (chooser?.files) {
      await workspace.addFiles(chooser.files, into);
      chooser.value = "";
    }
    into = "data";
  }
</script>

<!-- The row in which a new script or folder is named, where it will stand. -->
{#snippet namingRow(depth: number)}
  {#if naming !== null}
    <li>
      <form class="naming" style:padding-left="{26 + depth * 18}px" onsubmit={make}>
        <input
          class="mono"
          bind:value={named}
          use:focus
          aria-label={naming.kind === "script"
            ? "The name of the new script"
            : "The name of the new folder"}
          placeholder={naming.kind === "script" ? "name.zeff" : "name"}
          autocomplete="off"
          spellcheck="false"
          maxlength="120"
          oninput={() => (refused = "")}
          onkeydown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              naming = null;
            }
          }}
        />
        <button class="word" type="submit">Create</button>
        <button class="word" type="button" onclick={() => (naming = null)}>Cancel</button>
      </form>
      {#if refused}<p class="refused" role="alert">{refused}</p>{/if}
    </li>
  {/if}
{/snippet}

{#snippet rows(nodes: TreeNode[], depth: number, path: string)}
  <ul>
    {#if naming !== null && naming.parent === path}
      {@render namingRow(depth)}
    {/if}
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
            {@render rows(node.children, depth + 1, node.path)}
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
  <RowMenu label="Add to the project" symbol="+" actions={making("")} />
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
  {@render rows(workspace.tree, 0, "")}
</div>
{#if workspace.problem}<p class="problem" role="alert">{workspace.problem}</p>{/if}

<style>
  .naming {
    align-items: center;
    display: flex;
    gap: 4px;
    height: 34px;
    padding-right: 4px;
  }
  .naming input {
    background: var(--window);
    border: 1px solid var(--line-strong);
    border-radius: 6px;
    color: var(--ink);
    flex: 1;
    font-size: 13px;
    min-width: 0;
    padding: 3px 7px;
  }
  .naming input:focus-visible {
    border-color: var(--accent);
    outline: 1px solid var(--accent);
  }
  .word {
    background: none;
    border: 0;
    border-radius: 6px;
    color: var(--ink-2);
    cursor: pointer;
    flex: none;
    font: inherit;
    font-size: 13px;
    padding: 3px 6px;
  }
  .word:hover {
    background: var(--line);
  }
  .word:focus-visible {
    outline: 2px solid var(--accent);
  }
  .refused {
    color: var(--warning);
    font-size: 13px;
    line-height: 1.4;
    margin: 0;
    padding: 0 8px 6px 26px;
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
