<script lang="ts">
  // The Data place (open decision #75, as the owner answered it; the margin editor's design,
  // section 8): the frames of the last run at the left, each by the statement that made it, and
  // the frame chosen as a grid. The grid draws only the rows near its window and asks the
  // engine for them a page at a time, so a frame of any length scrolls without a pause; every
  // cell is written as the engine prints it, a missing value `NA`, never blank. The header and
  // the row numbers with the first variable stay in place as the grid is scrolled. Nothing
  // here writes a statement: the viewer is read-only.
  import type { Workspace } from "../app/workspace-state.svelte";
  import type { Rows } from "../engine/messages";
  import { counted } from "../margin/notes";

  let { workspace, onback = null }: { workspace: Workspace; onback?: (() => void) | null } =
    $props();

  /** Rows fetched at a time, and the height of a row in pixels. */
  const PAGE = 200;
  const ROW = 26;

  const frames = $derived(workspace.frames);
  /** The line of the statement that made a frame, from the last run. */
  const lineOf = (name: string) =>
    workspace.lastRun?.info.find((one) => one.name === name && one.frame !== null)?.line ?? null;
  const chosen = $derived(
    frames.find((one) => one.name === workspace.views.data.frame)?.name ?? frames[0]?.name ?? null,
  );

  // The pages fetched of the frame shown, by their number; the frame's header and variables.
  let pages = $state<Record<number, string[][]>>({});
  // The pages already asked for: not shown, so kept as a plain record.
  let asked: Record<number, true> = {};
  let first = $state<Rows | null>(null);
  let shownFor = $state<string | null>(null);
  let problem = $state("");

  async function fetchPage(name: string, page: number): Promise<void> {
    if (asked[page]) return;
    asked[page] = true;
    try {
      const found = await workspace.rows(name, page * PAGE, PAGE);
      if (name !== shownFor) return;
      pages = { ...pages, [page]: found.rows };
      if (page === 0) first = found;
    } catch (error) {
      problem = (error as Error).message;
    }
  }

  // A new frame chosen, or a new run: the pages fetched afresh.
  $effect(() => {
    const name = chosen;
    void workspace.lastRun?.startedAt;
    pages = {};
    asked = {};
    first = null;
    problem = "";
    shownFor = name;
    if (name !== null) void fetchPage(name, 0);
  });

  // The window of the grid, and the rows near it.
  let grid = $state<HTMLElement | null>(null);
  let top = $state(0);
  let height = $state(600);
  const total = $derived(first?.total ?? 0);
  const from = $derived(Math.max(0, Math.floor(top / ROW) - 20));
  const to = $derived(Math.min(total, Math.ceil((top + height) / ROW) + 20));
  $effect(() => {
    if (shownFor === null || first === null) return;
    for (
      let page = Math.floor(from / PAGE);
      page <= Math.floor(Math.max(to - 1, 0) / PAGE);
      page++
    ) {
      void fetchPage(shownFor, page);
    }
  });
  const rowAt = (row: number) => pages[Math.floor(row / PAGE)]?.[row % PAGE] ?? null;
  const visible = $derived(Array.from({ length: Math.max(0, to - from) }, (_, at) => from + at));

  // Each column as wide as its name or its widest cell of the first page, within bounds.
  const widths = $derived(
    (first?.variables ?? []).map((variable, at) => {
      const longest = Math.max(
        variable.name.length,
        ...(first?.rows ?? []).slice(0, 100).map((row) => (row[at] ?? "").length),
      );
      return Math.min(Math.max(longest * 8 + 24, 64), 280);
    }),
  );
  const numberWidth = $derived(Math.max(String(total).length * 8 + 22, 48));
</script>

<div class="data" data-testid="data">
  {#if workspace.views.data.list}
    <aside class="side" aria-label="The frames of the run">
      <div class="side-head">
        <span>Frames of the run</span>
        <button class="word" onclick={() => workspace.setDataList(false)}>‹ Hide</button>
      </div>
      {#if frames.length === 0}
        <p class="quiet">The last run made no frame.</p>
      {/if}
      <ul class="frames">
        {#each frames as frame (frame.name)}
          {@const line = lineOf(frame.name)}
          <li>
            <button
              class="frame"
              aria-current={frame.name === chosen}
              onclick={() => workspace.showFrame(frame.name)}
            >
              <span class="mono name">{frame.name}</span>
              <span class="about"
                >{counted(frame.rows)} × {counted(frame.variables)}{line === null
                  ? ""
                  : ` · line ${line}`}</span
              >
            </button>
          </li>
        {/each}
      </ul>
    </aside>
  {/if}
  <div class="main">
    <div class="bar">
      {#if onback}<button class="word" onclick={onback}>‹ Script</button>{/if}
      {#if !workspace.views.data.list}
        <button class="word" onclick={() => workspace.setDataList(true)}
          >Show frames and variables ›</button
        >
      {/if}
      <h2 class="mono" data-testid="frame-header">{first?.header ?? chosen ?? "No frame"}</h2>
    </div>
    {#if problem}<p class="problem" role="alert">{problem}</p>{/if}
    {#if first !== null}
      <div
        class="grid mono"
        role="grid"
        aria-label="The rows of {first.name}"
        aria-rowcount={total + 1}
        tabindex="0"
        bind:this={grid}
        bind:clientHeight={height}
        onscroll={() => (top = grid?.scrollTop ?? 0)}
      >
        <div
          class="sheet"
          style:height="{(total + 1) * ROW}px"
          style:width="{numberWidth + widths.reduce((sum, one) => sum + one, 0)}px"
        >
          <div class="row head" role="row" aria-rowindex={1} style:top="0px">
            <span class="cell num frozen" style:width="{numberWidth}px" role="columnheader"></span>
            {#each first.variables as variable, at (variable.name)}
              <span
                class="cell"
                class:frozen-2={at === 0}
                class:right={variable.right}
                style:width="{widths[at]}px"
                style:left={at === 0 ? `${numberWidth}px` : undefined}
                role="columnheader"
                title="{variable.type}{variable.label === ''
                  ? ''
                  : ` · ${variable.label}`}{variable.missing > 0
                  ? ` · ${counted(variable.missing)} missing`
                  : ''}">{variable.name}</span
              >
            {/each}
          </div>
          {#each visible as row (row)}
            {@const cells = rowAt(row)}
            <div
              class="row"
              role="row"
              aria-rowindex={row + 2}
              style:top="{(row + 1) * ROW}px"
              data-testid="data-row"
            >
              <span class="cell num frozen" style:width="{numberWidth}px" role="rowheader"
                >{row + 1}</span
              >
              {#if cells === null}
                <span class="cell quiet">…</span>
              {:else}
                {#each cells as cell, at (at)}
                  <span
                    class="cell"
                    class:frozen-2={at === 0}
                    class:right={first.variables[at]?.right}
                    class:na={cell === "NA"}
                    style:width="{widths[at]}px"
                    style:left={at === 0 ? `${numberWidth}px` : undefined}
                    role="gridcell">{cell}</span
                  >
                {/each}
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {:else if chosen === null}
      <p class="quiet">Run the script: the frames it makes are shown here.</p>
    {/if}
  </div>
</div>

<style>
  .data {
    background: var(--window);
    display: flex;
    flex: 1;
    min-height: 0;
    min-width: 0;
  }
  .side {
    border-right: 1px solid var(--line);
    display: flex;
    flex: none;
    flex-direction: column;
    min-height: 0;
    width: 230px;
  }
  .side-head {
    align-items: center;
    color: var(--ink-2);
    display: flex;
    font-size: 13px;
    justify-content: space-between;
    padding: 8px 10px 4px 14px;
  }
  .frames {
    list-style: none;
    margin: 0;
    overflow-y: auto;
    padding: 2px 8px 12px;
  }
  .frame {
    background: none;
    border: 0;
    border-radius: 7px;
    color: var(--ink);
    cursor: pointer;
    display: block;
    padding: 5px 8px;
    text-align: left;
    width: 100%;
  }
  .frame:hover {
    background: var(--soft);
  }
  .frame[aria-current="true"] {
    background: var(--accent-soft);
  }
  .name {
    display: block;
  }
  .about {
    color: var(--ink-3);
    display: block;
    font-size: 12.5px;
  }
  .main {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
  }
  .bar {
    align-items: center;
    border-bottom: 1px solid var(--line);
    display: flex;
    gap: 14px;
    min-height: 40px;
    padding: 0 14px;
  }
  h2 {
    font-size: 13.5px;
    font-weight: 500;
    margin: 0;
  }
  .word {
    background: none;
    border: 0;
    border-radius: 6px;
    color: var(--ink-2);
    cursor: pointer;
    font: inherit;
    font-size: 13px;
    padding: 2px 6px;
  }
  .word:hover {
    background: var(--soft);
  }
  .grid {
    flex: 1;
    font-size: 12.5px;
    min-height: 0;
    overflow: auto;
    position: relative;
  }
  .grid:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }
  .sheet {
    position: relative;
  }
  .row {
    display: flex;
    height: 26px;
    left: 0;
    position: absolute;
  }
  .row.head {
    background: var(--window);
    border-bottom: 1px solid var(--line-strong);
    color: var(--ink-2);
    font-weight: 500;
    position: sticky;
    z-index: 3;
  }
  .cell {
    border-bottom: 1px solid var(--line);
    box-sizing: border-box;
    flex: none;
    line-height: 25px;
    overflow: hidden;
    padding: 0 8px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .right {
    text-align: right;
  }
  .num {
    color: var(--ink-3);
    text-align: right;
  }
  .frozen,
  .frozen-2 {
    background: var(--window);
    position: sticky;
    z-index: 2;
  }
  .frozen {
    left: 0;
  }
  .frozen-2 {
    border-right: 1px solid var(--line-strong);
  }
  .na {
    color: var(--warning);
  }
  .quiet {
    color: var(--ink-3);
    padding: 10px 14px;
  }
  .problem {
    color: var(--error);
    padding: 6px 14px;
  }
</style>
