<script lang="ts">
  // The files of the project as a tree, with their sizes (the Zemp Specification, section 5):
  // a folder folds and unfolds, a script opens in the Script place, and a data file is added
  // from the computer. From Zemp Lite 0.2.1 it is the Project pane at the script's left (#203).
  // From 0.2.2 each row has a menu at its end (#208): a file is saved to the computer, a
  // folder as a zip.
  import type { TreeNode } from "../project/projects";
  import { fixed, inside, own, placeOf } from "../project/files";
  import { size } from "./format";
  import RowMenu, { type RowAction } from "./RowMenu.svelte";
  import { fileTab } from "./views";
  import { editable, type Workspace } from "./workspace-state.svelte";

  let { workspace }: { workspace: Workspace } = $props();

  let chooser = $state<HTMLInputElement | null>(null);
  /** The folder the files chosen next are added into. */
  let into = $state("data");

  /** A script or a folder being named, in a row where it will stand (`workspace.making`). */
  const naming = $derived(workspace.making);
  let named = $state("");
  /** Why what was typed cannot be the name, as a sentence. */
  let refused = $state("");

  /** The naming ended, made or given up: the next begins with an empty field. */
  function endNaming(): void {
    workspace.making = null;
    named = "";
    refused = "";
  }

  function name(kind: "script" | "folder", parent: string): void {
    endNaming();
    workspace.make(kind, parent);
  }

  async function make(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (naming === null) return;
    const problem =
      naming.kind === "script"
        ? await workspace.newScript(named, naming.parent)
        : await workspace.newFolder(named, naming.parent);
    if (problem === null) endNaming();
    else refused = problem;
  }

  function focus(node: HTMLInputElement | HTMLSelectElement | HTMLButtonElement): void {
    node.focus();
  }

  // A file or a folder being renamed or moved, in its own row (`workspace.asking`).
  /** What is typed as the new name, or chosen as the folder to move into. */
  let answer = $state("");
  /** Why that cannot be done, as a sentence. */
  let problem = $state("");
  $effect(() => {
    const asking = workspace.asking;
    problem = "";
    if (asking?.kind === "move") answer = moves(asking.path)[0] ?? "";
  });

  /** The folders a path may be moved into: not where it is, and for a folder not itself or what lies in it. */
  function moves(path: string): string[] {
    return workspace.folders.filter(
      (folder) =>
        folder !== placeOf(path).parent && folder !== path && !folder.startsWith(`${path}/`),
    );
  }

  /**
   * The name of what is renamed, as its row first shows it: the name without its ending
   * selected, ready to be typed over.
   */
  function stem(node: HTMLInputElement): void {
    answer = node.value;
    node.focus();
    const dot = node.value.lastIndexOf(".");
    node.setSelectionRange(0, dot > 0 ? dot : node.value.length);
  }

  async function answered(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const asking = workspace.asking;
    if (asking === null || asking.kind === "delete") return;
    const to =
      asking.kind === "rename"
        ? inside(placeOf(asking.path).parent, answer.trim())
        : inside(answer, placeOf(asking.path).name);
    const refusal = await workspace.moveTo(asking.path, to);
    if (refusal === null) workspace.asking = null;
    else problem = refusal;
  }

  async function deleted(path: string): Promise<void> {
    const refusal = await workspace.deleteAt(path);
    if (refusal === null) workspace.asking = null;
    else problem = refusal;
  }

  function leave(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      workspace.asking = null;
    }
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
    // What the engine and Zemp open by name is not renamed or moved, and has no such items.
    const placing: RowAction[] = fixed(node.path)
      ? []
      : [
          { name: "Rename…", run: () => (workspace.asking = { kind: "rename", path: node.path }) },
          { name: "Move to…", run: () => (workspace.asking = { kind: "move", path: node.path }) },
        ];
    // A copy can be made of anything of the reader's, what is fixed among it: the copy is not.
    const copying: RowAction[] = own(node.path)
      ? []
      : [{ name: "Duplicate", run: () => void workspace.duplicate(node.path) }];
    const deleting: RowAction[] = fixed(node.path)
      ? []
      : [{ name: "Delete…", run: () => (workspace.asking = { kind: "delete", path: node.path }) }];
    if (node.kind === "file") {
      return [
        ...placing,
        ...copying,
        ...deleting,
        { name: "Save a copy…", run: () => void workspace.saveCopy(node.path) },
      ];
    }
    return [
      // Nothing is made in the app's own folder or the engine's.
      ...(own(node.path) ? [] : making(node.path)),
      ...placing,
      ...copying,
      ...deleting,
      { name: "Save as a zip…", run: () => void workspace.saveFolder(node.path) },
    ];
  }

  /**
   * The files chosen are taken, with the folder they were chosen for, before anything waits:
   * the chooser and the folder are then free for the next choice, which may come while these
   * are still being written. (Read after the wait, a second choice went into the first's
   * folder, and emptying the chooser could cut the second short.)
   */
  async function chosen(): Promise<void> {
    const files = [...(chooser?.files ?? [])];
    const folder = into;
    into = "data";
    if (chooser !== null) chooser.value = "";
    if (files.length > 0) await workspace.addFiles(files, folder);
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
              endNaming();
            }
          }}
        />
        <button class="word" type="submit">Create</button>
        <button class="word" type="button" onclick={endNaming}>Cancel</button>
      </form>
      {#if refused}<p class="refused" role="alert">{refused}</p>{/if}
    </li>
  {/if}
{/snippet}

<!-- The row of a file or a folder being renamed or moved: the answer is given where it stands. -->
{#snippet askingRow(node: TreeNode, depth: number)}
  {@const asking = workspace.asking}
  {#if asking !== null && asking.path === node.path && asking.kind !== "delete"}
    <form
      class="naming"
      style:padding-left="{(node.kind === 'folder' ? 8 : 26) + depth * 18}px"
      onsubmit={answered}
    >
      {#if asking.kind === "rename"}
        <input
          class="mono"
          value={node.name}
          use:stem
          aria-label="The new name of {node.name}"
          autocomplete="off"
          spellcheck="false"
          maxlength="120"
          oninput={(event) => {
            answer = event.currentTarget.value;
            problem = "";
          }}
          onkeydown={leave}
        />
        <button class="word" type="submit">Rename</button>
      {:else}
        <select
          bind:value={answer}
          use:focus
          aria-label="The folder to move {node.name} into"
          onkeydown={leave}
          onchange={() => (problem = "")}
        >
          {#each moves(node.path) as folder (folder)}
            <option value={folder}>{folder === "" ? "the project's own folder" : folder}</option>
          {/each}
        </select>
        <button class="word" type="submit">Move</button>
      {/if}
      <button class="word" type="button" onclick={() => (workspace.asking = null)}>Cancel</button>
    </form>
    {#if problem}<p class="refused" role="alert">{problem}</p>{/if}
  {:else if asking !== null && asking.path === node.path}
    <!-- A deletion is asked once, in the row: what goes, and that it cannot be brought back. -->
    {@const files = workspace.filesAt(node.path)}
    <div
      class="confirm"
      role="group"
      aria-label="Delete {node.name}?"
      style:padding-left="{(node.kind === 'folder' ? 8 : 26) + depth * 18}px"
    >
      <p>
        Delete <span class="mono">{node.name}</span>{node.kind === "file" || files === 0
          ? ""
          : files === 1
            ? " and the file in it"
            : ` and the ${files} files in it`}? It cannot be brought back.
      </p>
      <button class="word danger" onkeydown={leave} onclick={() => void deleted(node.path)}
        >Delete</button
      >
      <button class="word" use:focus onkeydown={leave} onclick={() => (workspace.asking = null)}
        >Keep</button
      >
    </div>
    {#if problem}<p class="refused" role="alert">{problem}</p>{/if}
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
          {@render askingRow(node, depth)}
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
          {@render askingRow(node, depth)}
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
{#if workspace.named !== null}
  <!-- Scripts that name a path no longer there: said, each a way to its place, none rewritten. -->
  <div
    class="named"
    role="group"
    aria-label="Scripts that name what is no longer there"
    aria-live="polite"
    data-testid="named"
  >
    <p>
      <span class="mono">{workspace.named.was}</span> is named in
      {workspace.named.where.length === 1 ? "a line" : `${workspace.named.where.length} lines`} of the
      project's scripts, which {workspace.named.where.length === 1 ? "is" : "are"} not changed:
    </p>
    <ul>
      {#each workspace.named.where as place (`${place.script}:${place.line}`)}
        <li>
          <button class="word" onclick={() => void workspace.goTo(place.script, place.line)}
            >{place.script}, line {place.line}</button
          >
        </li>
      {/each}
    </ul>
    <button class="word" onclick={() => (workspace.named = null)}>Dismiss</button>
  </div>
{/if}

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
  .naming select {
    background: var(--window);
    border: 1px solid var(--line-strong);
    border-radius: 6px;
    color: var(--ink);
    flex: 1;
    font: inherit;
    font-size: 13px;
    min-width: 0;
    padding: 3px 4px;
  }
  .confirm {
    align-items: center;
    background: var(--soft);
    border-radius: 7px;
    display: flex;
    flex-wrap: wrap;
    gap: 2px 4px;
    margin: 2px 0 4px;
    padding-bottom: 6px;
    padding-right: 6px;
    padding-top: 6px;
  }
  .confirm p {
    color: var(--ink);
    flex: 1 1 100%;
    font-size: 13px;
    line-height: 1.4;
    margin: 0 0 2px;
    overflow-wrap: anywhere;
  }
  .word.danger {
    color: var(--error);
    font-weight: 600;
  }
  .named {
    border-top: 1px solid var(--line);
    color: var(--ink-2);
    font-size: 13px;
    line-height: 1.45;
    margin: 6px 8px 0;
    padding: 10px 8px 12px;
  }
  .named p {
    margin: 0 0 4px;
    overflow-wrap: anywhere;
  }
  .named ul {
    margin: 0 0 4px;
  }
  .named li .word {
    color: var(--accent);
    overflow-wrap: anywhere;
    text-align: left;
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
