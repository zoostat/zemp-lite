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
  //
  // The page is live (step 13): the source is set a short pause after the last key and drawn
  // page by page, each page a picture of Typst's own SVG, asked for when it is near the
  // reader's view. It is drawn to the width of its pane, or at a size the reader chooses; a
  // page is always in the light print theme, whichever theme the window is in. Where Typst
  // refuses the text its words stand at their line in the editor and above the pages, and the
  // pages of the text as it last set stay, marked as not of the present text.
  import { tick, untrack } from "svelte";
  import Editor from "../editor/Editor.svelte";
  import { lackingWords } from "../paper/exports";
  import { share } from "../paper/fetching";
  import { staleWords } from "../paper/written";
  import { PAPER_TRAVELS } from "../paper/lazy";
  import {
    PAPERS,
    fetchingWords,
    fileNamed,
    offeredName,
    outlineOf,
    pagesWords,
    rowAt,
    standingWords,
    toldOf,
    type OutlineRow,
  } from "../paper/place";
  import { paneOf } from "./panes";
  import Place from "./Place.svelte";
  import ProjectTree from "./ProjectTree.svelte";
  import Splitter from "./Splitter.svelte";
  import { PAGE_SHARE, PAGE_SIZE, pageSizeStep } from "./views";
  import type { Workspace } from "./workspace-state.svelte";

  let { workspace }: { workspace: Workspace } = $props();

  const shown = $derived(workspace.paperShown);
  const path = $derived(shown.kind === "none" ? null : shown.path);
  const buffer = $derived(path === null ? undefined : workspace.buffers[path]);
  const pageOpen = $derived(workspace.views.panes.paper.page);
  const fetching = $derived(workspace.paperFetching);
  const pageShare = $derived(workspace.views.paper.share);

  // The Scratch project is given its sample paper the first time the place is shown in it.
  $effect(() => {
    if (workspace.ready) untrack(() => void workspace.giveSample());
  });

  // A paper the place has open is read when the place is first shown with it, and Typst is
  // fetched the first time a paper is open. Where the fetching failed it is not begun again
  // of itself (the pane offers **Try again**), but the next paper opened asks afresh.
  $effect(() => {
    if (!workspace.ready || path === null) return;
    if (buffer === undefined) void workspace.open(path);
    untrack(() => workspace.fetchPaper());
  });

  // The live page: Typst is here and the paper's text is read; no paper, no live page.
  $effect(() => {
    if (shown.kind === "paper" && fetching.state === "ready") {
      const open = shown.path;
      untrack(() => workspace.showLive(open));
    } else if (shown.kind === "none") {
      untrack(() => workspace.closeLive());
    }
  });
  const live = $derived(workspace.paperLive?.main === path ? workspace.paperLive : null);
  const outcome = $derived(live?.outcome ?? null);
  const pages = $derived(outcome?.pages ?? []);
  // What Typst said, placed: at its line of this paper, or named by the file it is of.
  const told = $derived(outcome === null || path === null ? [] : toldOf(outcome.said, path));
  const atLines = $derived(
    told.flatMap((one) =>
      one.line === null ? [] : [{ line: one.line, severity: one.severity, text: one.text }],
    ),
  );
  const standing = $derived(
    outcome === null ? "" : standingWords(outcome.ok, outcome.pages.length, told),
  );

  // The files the paper lacks that a script of the project writes: each named with its script
  // (step 15a). The scripts are read again each time the paper is set, and when the place is shown.
  $effect(() => {
    const page = live;
    if (page === null || page.outcome === null) return;
    untrack(() => void workspace.findWriters());
  });
  const lacking = $derived(
    outcome === null ? [] : lackingWords(outcome.absent, workspace.paperWriters),
  );
  // The tables and figures whose script has changed since it wrote them (step 15b).
  const stale = $derived(outcome === null ? [] : staleWords(workspace.paperStale));

  // The size the pages are drawn at: a printed point is 96/72 of a pixel of the screen at 100
  // per cent; to fit, the widest page takes the width of the pane.
  const POINT = 96 / 72;
  let scroller = $state<HTMLElement | null>(null);
  let room = $state(0);
  $effect(() => {
    const within = scroller;
    if (within === null) return;
    const measure = () => {
      const style = getComputedStyle(within);
      room = within.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    };
    const watch = new ResizeObserver(measure);
    watch.observe(within);
    measure();
    return () => watch.disconnect();
  });
  const size = $derived(workspace.views.paper.size);
  const widest = $derived(Math.max(0, ...pages.map((page) => page.width)));
  /** Pixels of the screen to a point of the page. */
  const scale = $derived(
    size === "fit" ? (room > 0 && widest > 0 ? room / widest : POINT) : (POINT * size) / 100,
  );
  const percent = $derived(Math.round((scale / POINT) * 100));

  // The pages near the reader's view, whose pictures are asked for: now, and each time the
  // paper is set again.
  let near = $state<number[]>([]);
  function watched(node: HTMLElement, index: number) {
    let at = index;
    const watch = new IntersectionObserver(
      (entries) => {
        const inView = entries.some((entry) => entry.isIntersecting);
        near = inView ? [...new Set([...near, at])] : near.filter((one) => one !== at);
      },
      { root: scroller, rootMargin: "900px 0px" },
    );
    watch.observe(node);
    return {
      update(next: number) {
        at = next;
      },
      destroy() {
        watch.disconnect();
        near = near.filter((one) => one !== at);
      },
    };
  }
  $effect(() => {
    const page = live;
    if (page === null || page.outcome === null) return;
    for (const index of near) page.want(index);
  });

  // A press on a page finds its place in the source (step 14): where on the page, in points.
  function pressed(event: MouseEvent, index: number): void {
    const sheet = (event.currentTarget as HTMLElement).getBoundingClientRect();
    void workspace.goFromPage(
      index,
      (event.clientX - sheet.left) / scale,
      (event.clientY - sheet.top) / scale,
    );
  }

  // The Outline: the headings of the paper as it last set, each going to its place in the
  // source and on the page; the one the cursor is under is marked.
  const rows = $derived(
    outcome === null || path === null
      ? []
      : outlineOf(outcome.headings, path, buffer?.text ?? outcome.text),
  );
  const under = $derived(
    rowAt(
      rows,
      workspace.cursor !== null && workspace.cursor.path === path ? workspace.cursor.line : null,
    ),
  );
  function goTo(row: OutlineRow): void {
    if (path !== null && row.line !== null) void workspace.goTo(path, row.line, true);
    // On the page: the heading a little under the top of the pane, where its page is drawn.
    const sheet = scroller?.querySelectorAll<HTMLElement>('[data-testid="paper-page"]')[row.page];
    if (scroller === null || sheet === undefined) return;
    const top =
      sheet.getBoundingClientRect().top -
      scroller.getBoundingClientRect().top +
      scroller.scrollTop +
      row.y * scale;
    scroller.scrollTo({ top: Math.max(0, top - 24) });
  }

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
  {#if outcome === null}
    <p class="quiet" data-testid="paper-outline">
      The headings of the paper are listed here once its page is set.
    </p>
  {:else if rows.length === 0}
    <p class="quiet" data-testid="paper-outline">
      This paper has no headings. A line begun with <span class="mono">=</span> and a space is one,
      and <span class="mono">==</span> a heading under it.
    </p>
  {:else}
    <ul class="outline" data-testid="paper-outline">
      {#each rows as row, index (index)}
        <li>
          <button
            class="go"
            class:on={index === under}
            style:padding-left="{14 + (Math.min(row.level, 6) - 1) * 14}px"
            aria-current={index === under ? "location" : undefined}
            disabled={row.line === null && !pageOpen}
            title={row.line === null
              ? `Go to page ${row.page + 1}`
              : row.from === null
                ? `Go to line ${row.line}, and to page ${row.page + 1}`
                : `Go to line ${row.line}, which names ${row.from}, and to page ${row.page + 1}`}
            onclick={() => goTo(row)}
          >
            <span class="title">{row.text === "" ? "(a heading with no words)" : row.text}</span>
            <span class="line mono">{row.line ?? ""}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
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
  {#if path !== null}
    <button
      class="word"
      onclick={() => void workspace.exportPdf()}
      title="The paper as a PDF, set by Typst, saved to this computer">Export PDF…</button
    >
  {/if}
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
              oncursor={(line) => (workspace.cursor = { path, line })}
              said={atLines}
              reveal={workspace.reveal?.path === path ? workspace.reveal : null}
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
          {#if live !== null}
            <div class="tools" role="toolbar" aria-label="The page: its pages and its size">
              <span class="count" data-testid="paper-pages"
                >{outcome === null ? "" : pagesWords(pages.length)}</span
              >
              <span class="gap"></span>
              <button
                class="view"
                aria-pressed={size === "fit"}
                onclick={() => workspace.setPageSize("fit")}
                title="Draw the page to the width of this pane">Fit width</button
              >
              <button
                class="view step"
                aria-label="Smaller page"
                title="A size smaller"
                disabled={percent <= PAGE_SIZE.least}
                onclick={() => workspace.setPageSize(pageSizeStep(percent, -1))}>−</button
              >
              <span class="percent" aria-live="polite" data-testid="paper-size">{percent}%</span>
              <button
                class="view step"
                aria-label="Larger page"
                title="A size larger"
                disabled={percent >= PAGE_SIZE.most}
                onclick={() => workspace.setPageSize(pageSizeStep(percent, 1))}>+</button
              >
            </div>
          {/if}
          <!-- The view scrolls, so the keyboard stops at it (the arrow keys move the pages);
               it is named for those who hear the screen read. -->
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <div
            class="pages"
            role="group"
            aria-label="The pages of the paper"
            tabindex="0"
            bind:this={scroller}
            data-testid="paper-pages-view"
          >
            {#if live === null}
              {#if fetching.state === "fetching"}
                <progress
                  max="100"
                  value={fetching.progress === null ? 0 : share(fetching.progress)}
                  aria-label="How much of Typst has been fetched"
                ></progress>
              {:else if fetching.state === "failed"}
                <button class="word strong" onclick={() => workspace.fetchPaper()}>Try again</button
                >
              {/if}
            {:else}
              {#if live.failed !== null}
                <p class="standing refused" role="note">
                  The paper could not be set: {live.failed}
                </p>
              {:else if standing !== ""}
                <p
                  class="standing"
                  class:refused={outcome !== null && !outcome.ok}
                  role="note"
                  aria-live="polite"
                  data-testid="paper-standing"
                >
                  {standing}
                </p>
              {/if}
              {#each stale as words (words)}
                <p class="lacking stale" role="note" data-testid="paper-stale">{words}</p>
              {/each}
              {#each lacking as words (words)}
                <p class="lacking" role="note" data-testid="paper-lacking">{words}</p>
              {/each}
              {#if told.length > 0}
                <ul class="told" aria-label="What Typst says of the paper">
                  {#each told as one, index (index)}
                    <li class={one.severity}>
                      {#if one.line !== null && path !== null}
                        <button
                          class="where"
                          onclick={() => void workspace.goTo(path, one.line ?? 1)}
                          title="Go to this line of the source">{one.where}</button
                        >
                      {:else if one.where !== ""}
                        <span class="where">{one.where}</span>
                      {/if}
                      <span>{one.text}</span>
                    </li>
                  {/each}
                </ul>
              {/if}
              {#each pages as page, index (index)}
                <!-- A press on the page goes to its place in the source. The page is a picture,
                     and has no parts for the keyboard to stand on: by the keyboard the
                     Outline goes to each heading, in the source and on the page. -->
                <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
                <figure
                  class="sheet"
                  class:stale={outcome !== null && !outcome.ok}
                  style:width="{page.width * scale}px"
                  style:height="{page.height * scale}px"
                  data-testid="paper-page"
                  title="Press a word, a table or a figure to go to its place in the source"
                  onclick={(event) => pressed(event, index)}
                  use:watched={index}
                >
                  {#if live.shown[index] !== undefined}
                    <img
                      src={live.shown[index]}
                      alt="Page {index + 1} of {pages.length}"
                      draggable="false"
                    />
                  {/if}
                  {#if outcome !== null && !outcome.ok}
                    <figcaption>not the present text</figcaption>
                  {/if}
                </figure>
              {/each}
            {/if}
          </div>
          <p class="typst" role="note" aria-live="polite" data-testid="paper-typst">
            {#if fetching.state !== "ready"}
              {fetchingWords(fetching, PAPER_TRAVELS)}
            {:else if outcome === null}
              Typst {fetching.typst} · setting the paper…
            {:else}
              Typst {fetching.typst} · set in {Math.max(1, Math.round(outcome.ms))} ms{live?.busy
                ? " · setting again…"
                : ""}
            {/if}
          </p>
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
    display: flex;
    flex: none;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
  }
  /* The count of pages, and the controls of the page's size, which change only the view. */
  .tools {
    align-items: center;
    border-bottom: 1px solid var(--line);
    display: flex;
    flex: none;
    gap: 4px;
    min-height: 34px;
    padding: 0 12px 0 18px;
  }
  .count,
  .percent {
    color: var(--ink-3);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
  }
  .percent {
    min-width: 44px;
    text-align: center;
  }
  .view {
    background: none;
    border: none;
    border-radius: 6px;
    color: var(--ink-2);
    cursor: pointer;
    font: inherit;
    font-size: 13.5px;
    padding: 3px 6px;
    text-decoration: underline dashed var(--line-strong);
    text-underline-offset: 4px;
  }
  .view.step {
    min-width: 26px;
    text-decoration: none;
  }
  .view:hover:not(:disabled) {
    background: var(--soft);
  }
  .view:disabled {
    color: var(--ink-3);
    cursor: default;
  }
  .view[aria-pressed="true"] {
    color: var(--accent);
    font-weight: 600;
  }
  .view:focus-visible,
  .where:focus-visible {
    outline: 2px solid var(--accent);
  }
  .pages {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 14px 18px;
  }
  .typst {
    border-top: 1px solid var(--line);
    color: var(--ink-3);
    flex: none;
    font-size: 13px;
    margin: 0;
    padding: 6px 18px;
  }
  progress {
    accent-color: var(--accent);
    display: block;
    height: 6px;
    width: min(100%, 320px);
  }
  .standing {
    color: var(--ink-2);
    font-size: 13.5px;
    margin: 0 0 8px;
  }
  .standing.refused {
    color: var(--error);
  }
  /* A file the paper lacks that a script writes: what to do, in words. */
  .lacking {
    border-left: 3px solid var(--accent);
    color: var(--ink);
    font-size: 13.5px;
    margin: 0 0 8px;
    padding: 2px 0 2px 10px;
  }
  /* A table or a figure whose script has changed since it wrote it: hatched, as a stale
     result is in the Script place, and said in words. */
  .lacking.stale {
    background: repeating-linear-gradient(
      135deg,
      transparent 0 6px,
      color-mix(in srgb, var(--warning) 9%, transparent) 6px 12px
    );
    border-left-color: var(--warning);
    padding: 4px 8px 4px 10px;
  }
  /* What Typst says, each thing with where it is; its own line of the source is gone to. */
  .told {
    font-size: 13px;
    list-style: none;
    margin: 0 0 12px;
    max-height: 132px;
    overflow: auto;
    padding: 0;
  }
  .told li {
    border-left: 3px solid var(--error);
    color: var(--ink-2);
    display: flex;
    gap: 8px;
    padding: 2px 0 2px 10px;
  }
  .told li + li {
    margin-top: 4px;
  }
  .told li.warning {
    border-left-color: var(--warning);
  }
  .told .where {
    background: none;
    border: 0;
    border-radius: 5px;
    color: var(--ink-3);
    flex: none;
    font: inherit;
    padding: 0;
    white-space: nowrap;
  }
  .told button.where {
    color: var(--accent);
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  /* The headings of the paper, by level, each with its line; the one the cursor is under marked. */
  .outline {
    list-style: none;
    margin: 0;
    padding: 0 0 10px;
  }
  .go {
    align-items: baseline;
    background: none;
    border: 0;
    color: var(--ink-2);
    cursor: pointer;
    display: flex;
    font: inherit;
    font-size: 13.5px;
    gap: 8px;
    padding: 4px 12px 4px 14px;
    text-align: left;
    width: 100%;
  }
  .go:hover:not(:disabled) {
    background: var(--soft);
  }
  .go:disabled {
    cursor: default;
  }
  .go:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }
  .go.on {
    background: var(--accent-soft);
    color: var(--accent);
    font-weight: 600;
  }
  .go .title {
    flex: 1;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .go .line {
    color: var(--ink-3);
    flex: none;
    font-size: 12.5px;
    font-weight: 400;
  }
  /* A page: always the light print theme, whichever theme the window is in. */
  .sheet {
    background: #fff;
    cursor: pointer;
    box-shadow:
      0 0 0 1px var(--line-strong),
      0 2px 8px rgb(0 0 0 / 12%);
    margin: 0 auto 16px;
    position: relative;
  }
  .sheet img {
    display: block;
    height: 100%;
    user-select: none;
    width: 100%;
  }
  /* A page of the text as it last set, while Typst refuses the text as it stands: quieter,
     and said to be so. */
  .sheet.stale img {
    opacity: 0.45;
  }
  .sheet figcaption {
    background: var(--error-soft);
    border-radius: 0 0 0 6px;
    color: var(--error);
    font-size: 12.5px;
    padding: 2px 8px;
    position: absolute;
    right: 0;
    top: 0;
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
