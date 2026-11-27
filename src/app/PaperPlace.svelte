<script lang="ts">
  // The Paper place (release 0.3, step 12; the Zemp Specification, sections 5 and 8; open
  // decisions #172 and #203): a paper is a Typst file of the project, written here with its
  // page beside it. The place stands on the frame every place stands on: **Project** and
  // **Outline** at its left, the source in the middle in the app's editor, and the page at the
  // right, which the place draws beside the source as the Script place draws its notes. A
  // paper is saved as it is typed, as a script is. With no paper open the place says what
  // Paper is, lists the papers of the project and offers a new one.
  //
  // Typst, which sets the page, is a module of its own: it is fetched the first time a paper
  // is opened, and the page's pane says its size and how far the fetching has gone.
  import { tick, untrack } from "svelte";
  import Editor from "../editor/Editor.svelte";
  import { share } from "../paper/fetching";
  import { PAPER_TRAVELS } from "../paper/lazy";
  import { PAPERS, fetchingWords, fileNamed, offeredName } from "../paper/place";
  import { paneOf } from "./panes";
  import Place from "./Place.svelte";
  import ProjectTree from "./ProjectTree.svelte";
  import Splitter from "./Splitter.svelte";
  import { PAGE_SHARE } from "./views";
  import type { Workspace } from "./workspace-state.svelte";

  let { workspace }: { workspace: Workspace } = $props();

  const shown = $derived(workspace.paperShown);
  const path = $derived(shown.kind === "none" ? null : shown.path);
  const buffer = $derived(path === null ? undefined : workspace.buffers[path]);
  const pageOpen = $derived(workspace.views.panes.paper.page);
  const fetching = $derived(workspace.paperFetching);
  const pageShare = $derived(workspace.views.paper.share);

  // A paper the place has open is read when the place is first shown with it, and Typst is
  // fetched the first time a paper is open. Where the fetching failed it is not begun again
  // of itself (the pane offers **Try again**), but the next paper opened asks afresh.
  $effect(() => {
    if (!workspace.ready || path === null) return;
    if (buffer === undefined) void workspace.open(path);
    untrack(() => workspace.fetchPaper());
  });

  // New paper…: its name is asked in a line of the place, and it is made in the folder `paper`.
  let naming = $state(false);
  let name = $state("");
  let problem = $state<string | null>(null);
  let field = $state<HTMLInputElement | null>(null);
  let making = $state(false);

  function begin(): void {
    name = offeredName(workspace.paperFiles);
    problem = null;
    naming = true;
    void tick().then(() => {
      field?.focus();
      field?.select();
    });
  }

  async function make(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (making) return;
    making = true;
    problem = await workspace.newPaper(name);
    making = false;
    if (problem === null) naming = false;
  }

  // ⌘K asks for a new paper through the workspace: each asking is told apart by its count.
  let asked = 0;
  $effect(() => {
    const count = workspace.paperAsked;
    if (count !== asked) {
      asked = count;
      begin();
    }
  });

  let sides = $state<HTMLElement | null>(null);
  /** The page's share of the place, from where its edge is dragged to. */
  function dragged(x: number): void {
    const box = sides?.getBoundingClientRect();
    if (box === undefined || box.width <= 0) return;
    workspace.setPageShare((box.right - x) / box.width);
  }
</script>

{#snippet project()}
  <ProjectTree {workspace} />
{/snippet}
{#snippet outline()}
  <p class="quiet" data-testid="paper-outline">
    The headings of the paper are listed here once its page is set.
  </p>
{/snippet}
{#snippet controls()}
  {#if path !== null}
    <span class="path mono" data-testid="paper-path">{path}</span>
    <button
      class="word"
      onclick={() => workspace.closePaper()}
      title="Close the paper; it stays in the project">Close</button
    >
  {/if}
  <span class="gap"></span>
  <button
    class="word"
    onclick={begin}
    title="A new paper, made in the folder {PAPERS} of this project">New paper…</button
  >
{/snippet}

<Place
  {workspace}
  name="Paper"
  left={[
    paneOf(workspace, "paper", "project", project),
    paneOf(workspace, "paper", "outline", outline),
  ]}
  right={[paneOf(workspace, "paper", "page", null)]}
  bar={controls}
>
  {#if naming}
    <form class="naming" onsubmit={make} aria-label="A new paper">
      <label for="paper-name">The new paper's name</label>
      <span class="in mono">{PAPERS}/</span>
      <input
        id="paper-name"
        class="mono"
        bind:this={field}
        bind:value={name}
        autocomplete="off"
        spellcheck="false"
        aria-describedby="paper-name-says"
        onkeydown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            naming = false;
          }
        }}
      />
      <button class="word strong" type="submit" disabled={making}>Make</button>
      <button class="word" type="button" onclick={() => (naming = false)}>Cancel</button>
      <span class="says" id="paper-name-says" role="note" aria-live="polite">
        {#if problem !== null}
          <span class="problem">{problem}</span>
        {:else if fileNamed(name) !== ""}
          It will be <span class="mono">{PAPERS}/{fileNamed(name)}</span>.
        {/if}
      </span>
    </form>
  {/if}
  {#if shown.kind === "none"}
    <section class="none" aria-label="No paper is open">
      <h2>Paper</h2>
      <p>
        A paper is written here as a Typst file (<span class="mono">.typ</span>): its source in the
        middle, and at its right the page as Typst sets it. Its tables and figures are those the
        scripts of the project write with <span class="mono">export</span>.
      </p>
      {#if shown.papers.length > 0}
        <h3>The papers of this project</h3>
        <ul>
          {#each shown.papers as paper (paper)}
            <li>
              <button class="paper mono" onclick={() => void workspace.open(paper)}>{paper}</button>
            </li>
          {/each}
        </ul>
      {:else}
        <p>This project has no paper yet.</p>
      {/if}
      <p>
        <button class="word strong" onclick={begin}>New paper…</button>
        <span class="quiet"
          >made in the folder <span class="mono">{PAPERS}</span> of the project</span
        >
      </p>
    </section>
  {:else}
    <div class="sides" bind:this={sides}>
      <section class="source" aria-label="The paper's source">
        {#if buffer?.loaded && path !== null}
          {#key path}
            <Editor
              text={buffer.text}
              label="The paper's source"
              language="typst"
              wrap
              onchange={(text) => workspace.edit(path, text)}
              onrun={() => void workspace.run()}
            />
          {/key}
        {/if}
      </section>
      {#if pageOpen}
        <Splitter
          orientation="vertical"
          label="The width of the page"
          value={Math.round(pageShare * 100)}
          least={Math.round(PAGE_SHARE.least * 100)}
          most={Math.round(PAGE_SHARE.most * 100)}
          ondrag={dragged}
          onstep={(direction) => workspace.setPageShare(pageShare - direction * 0.02)}
        />
        <section class="page" aria-label="The page" style:width="{pageShare * 100}%">
          <p class="typst" role="note" aria-live="polite" data-testid="paper-typst">
            {fetchingWords(fetching, PAPER_TRAVELS)}
          </p>
          {#if fetching.state === "fetching"}
            <progress
              max="100"
              value={fetching.progress === null ? 0 : share(fetching.progress)}
              aria-label="How much of Typst has been fetched"
            ></progress>
          {:else if fetching.state === "failed"}
            <button class="word strong" onclick={() => workspace.fetchPaper()}>Try again</button>
          {/if}
        </section>
      {/if}
    </div>
  {/if}
</Place>

<style>
  .sides {
    display: flex;
    flex: 1;
    min-height: 0;
  }
  .source {
    background: var(--window);
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
  }
  .page {
    background: var(--softer);
    border-left: 1px solid var(--line-strong);
    box-sizing: border-box;
    flex: none;
    min-width: 0;
    overflow: auto;
    padding: 14px 18px;
  }
  .typst {
    color: var(--ink-2);
    font-size: 13.5px;
    margin: 0 0 10px;
  }
  progress {
    accent-color: var(--accent);
    display: block;
    height: 6px;
    width: min(100%, 320px);
  }
  .none {
    margin: 0 auto;
    max-width: 640px;
    overflow: auto;
    padding: 36px 24px;
  }
  .none h2 {
    font-family: Newsreader, Georgia, serif;
    font-size: 26px;
    font-weight: 500;
    margin: 0 0 10px;
  }
  .none h3 {
    color: var(--ink-3);
    font-size: 12.5px;
    font-weight: 500;
    letter-spacing: 0.05em;
    margin: 22px 0 6px;
    text-transform: uppercase;
  }
  .none p {
    color: var(--ink-2);
    line-height: 1.55;
    margin: 0 0 12px;
  }
  .none ul {
    list-style: none;
    margin: 0 0 16px;
    padding: 0;
  }
  .paper {
    background: none;
    border: 0;
    border-radius: 6px;
    color: var(--accent);
    cursor: pointer;
    font-size: 13.5px;
    padding: 4px 6px;
    text-align: left;
  }
  .paper:hover {
    background: var(--soft);
  }
  .paper:focus-visible,
  .word:focus-visible,
  input:focus-visible {
    outline: 2px solid var(--accent);
  }
  .quiet {
    color: var(--ink-3);
    font-size: 13px;
  }
  p.quiet {
    margin: 0;
    padding: 6px 14px 12px;
  }
  /* The paper's path gives way where the bar is narrow: its end is cut, not its neighbours. */
  .path {
    color: var(--ink-2);
    font-size: 13px;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  /* A window too narrow for the two side by side: the page stands under the source. */
  @media (max-width: 760px) {
    .sides {
      flex-direction: column;
    }
    .sides > :global(.splitter) {
      display: none;
    }
    .page {
      border-left: 0;
      border-top: 1px solid var(--line-strong);
      flex: 0 0 40%;
      width: auto !important;
    }
  }
  .gap {
    flex: 1;
  }
  .word {
    background: none;
    border: 0;
    border-radius: 6px;
    color: var(--ink-2);
    cursor: pointer;
    flex: none;
    font: inherit;
    white-space: nowrap;
    font-size: 13.5px;
    padding: 3px 8px;
  }
  .word:hover:not(:disabled) {
    background: var(--soft);
  }
  .word.strong {
    border: 1px solid var(--line-strong);
    color: var(--ink);
  }
  .naming {
    align-items: center;
    background: var(--softer);
    border-bottom: 1px solid var(--line-strong);
    display: flex;
    flex: none;
    flex-wrap: wrap;
    gap: 8px;
    padding: 8px 14px;
  }
  .naming label {
    color: var(--ink-2);
    font-size: 13.5px;
  }
  .naming .in {
    color: var(--ink-3);
    font-size: 13px;
    margin-right: -4px;
  }
  .naming input {
    background: var(--window);
    border: 1px solid var(--line-strong);
    border-radius: 6px;
    color: var(--ink);
    font-size: 13px;
    padding: 4px 8px;
    width: 220px;
  }
  .says {
    color: var(--ink-3);
    flex-basis: 100%;
    font-size: 13px;
    min-height: 18px;
  }
  .problem {
    color: var(--error);
  }
</style>
