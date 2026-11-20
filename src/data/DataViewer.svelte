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

  /** Rows fetched at a time, the height of a row and of the header, in pixels. */
  const PAGE = 200;
  const ROW = 26;
  const HEAD = 44;

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
  // (The header stands above the first row: a row's place is the header's height and its own.)
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

  // The variables hidden from the grid (the owner's ruling of 18 November 2026): the view's
  // alone, kept for each frame; a hidden variable is still listed and in every result.
  const hidden = $derived(chosen === null ? [] : (workspace.views.data.hidden[chosen] ?? []));
  const shown = $derived(
    (first?.variables ?? [])
      .map((variable, at) => ({ variable, at }))
      .filter(({ variable }) => !hidden.includes(variable.name)),
  );
  let finding = $state("");
  const listed = $derived(
    (first?.variables ?? []).filter((one) =>
      one.name.toLowerCase().includes(finding.trim().toLowerCase()),
    ),
  );
  function hide(name: string, hide: boolean): void {
    if (chosen === null) return;
    workspace.setHidden(chosen, hide ? [...hidden, name] : hidden.filter((one) => one !== name));
  }

  // The inspector: the variable chosen, and the engine's summary of it.
  const inspected = $derived(
    (first?.variables ?? []).find((one) => one.name === workspace.views.data.variable) ?? null,
  );
  let summary = $state("");
  $effect(() => {
    const frame = chosen;
    const variable = inspected?.name ?? null;
    summary = "";
    if (frame === null || variable === null) return;
    void workspace
      .summaryOf(frame, variable)
      .then((text) => {
        if (inspected?.name === variable) summary = text;
      })
      .catch((error: Error) => (summary = error.message));
  });
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
      {#if first !== null}
        <div class="vars-head">
          <span>Variables</span>
          <span class="about" data-testid="shown-count"
            >{counted(shown.length)} of {counted(first.variables.length)} shown</span
          >
        </div>
        <div class="vars-tools">
          <input
            class="find"
            type="search"
            placeholder="Find a variable"
            aria-label="Find a variable"
            bind:value={finding}
          />
          <button class="word" onclick={() => chosen !== null && workspace.setHidden(chosen, [])}
            >Show all</button
          >
          <button
            class="word"
            onclick={() =>
              chosen !== null &&
              workspace.setHidden(
                chosen,
                (first?.variables ?? []).map((one) => one.name),
              )}>Hide all</button
          >
        </div>
        <ul class="vars">
          {#each listed as variable (variable.name)}
            <li>
              <input
                type="checkbox"
                checked={!hidden.includes(variable.name)}
                aria-label="Show {variable.name} in the grid"
                onchange={(event) => hide(variable.name, !event.currentTarget.checked)}
              />
              <button class="vpick" onclick={() => workspace.chooseVariable(variable.name)}
                ><span class="mono">{variable.name}</span>
                <span class="about">{variable.type}</span></button
              >
            </li>
          {/each}
        </ul>
      {/if}
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
      {#if hidden.length > 0}
        <span class="about"
          >{counted(hidden.length)} hidden ·
          <button class="word" onclick={() => chosen !== null && workspace.setHidden(chosen, [])}
            >show all</button
          ></span
        >
      {/if}
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
          style:height="{HEAD + total * ROW}px"
          style:width="{numberWidth + shown.reduce((sum, one) => sum + (widths[one.at] ?? 0), 0)}px"
        >
          <div class="row head" role="row" aria-rowindex={1} style:top="0px">
            <span class="cell num frozen" style:width="{numberWidth}px" role="columnheader"></span>
            {#each shown as { variable, at }, index (variable.name)}
              <span
                class="cell headcell"
                class:frozen-2={index === 0}
                class:right={variable.right}
                class:chosen={variable.name === inspected?.name}
                style:width="{widths[at]}px"
                style:left={index === 0 ? `${numberWidth}px` : undefined}
                role="columnheader"
                aria-label={variable.name}
              >
                <button class="pick" onclick={() => workspace.chooseVariable(variable.name)}
                  ><span class="vname">{variable.name}</span><span class="vfacts"
                    >{variable.type}{#if variable.missing > 0}<span class="miss">
                        · {counted(variable.missing)} NA</span
                      >{/if}</span
                  ></button
                ><button
                  class="hide"
                  aria-label="Hide {variable.name}"
                  title="Hide from the grid"
                  onclick={() => hide(variable.name, true)}>×</button
                >
              </span>
            {/each}
          </div>
          {#each visible as row (row)}
            {@const cells = rowAt(row)}
            <div
              class="row"
              role="row"
              aria-rowindex={row + 2}
              style:top="{HEAD + row * ROW}px"
              data-testid="data-row"
            >
              <span class="cell num frozen" style:width="{numberWidth}px" role="rowheader"
                >{row + 1}</span
              >
              {#if cells === null}
                <span class="cell quiet">…</span>
              {:else}
                {#each shown as { variable, at }, index (variable.name)}
                  {@const cell = cells[at] ?? ""}
                  <span
                    class="cell"
                    class:frozen-2={index === 0}
                    class:right={variable.right}
                    class:na={cell === "NA"}
                    style:width="{widths[at]}px"
                    style:left={index === 0 ? `${numberWidth}px` : undefined}
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
  {#if inspected !== null}
    <aside class="inspector" aria-label="The variable chosen" data-testid="inspector">
      <div class="side-head">
        <span class="mono">{inspected.name}</span>
        <button class="word" onclick={() => workspace.chooseVariable(null)}>Close</button>
      </div>
      <p class="facts">
        {inspected.type}{inspected.label === "" ? "" : ` · ${inspected.label}`} · {counted(
          inspected.missing,
        )} missing
      </p>
      <button class="word" onclick={() => hide(inspected.name, !hidden.includes(inspected.name))}
        >{hidden.includes(inspected.name) ? "Show in the grid" : "Hide from the grid"}</button
      >
      <pre class="mono summary" data-testid="variable-summary">{summary === ""
          ? "…"
          : summary}</pre>
    </aside>
  {/if}
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
  .row.head {
    height: 44px;
  }
  .headcell {
    align-items: center;
    display: flex;
    gap: 2px;
    line-height: 1.2;
    padding: 0 2px 0 8px;
  }
  .headcell.chosen {
    background: var(--accent-soft);
  }
  .pick {
    background: none;
    border: 0;
    color: inherit;
    cursor: pointer;
    flex: 1;
    font: inherit;
    min-width: 0;
    padding: 0;
    text-align: inherit;
  }
  .vname,
  .vfacts {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .vfacts {
    color: var(--ink-3);
    font-family: "Atkinson Hyperlegible Next", sans-serif;
    font-size: 12.5px;
    font-weight: 400;
  }
  .miss {
    color: var(--warning);
  }
  .hide {
    background: none;
    border: 0;
    border-radius: 4px;
    color: var(--ink-3);
    cursor: pointer;
    flex: none;
    opacity: 0;
    padding: 0 4px;
  }
  .headcell:hover .hide,
  .hide:focus-visible {
    opacity: 1;
  }
  .vars-head {
    border-top: 1px solid var(--line);
    color: var(--ink-2);
    display: flex;
    font-size: 13px;
    justify-content: space-between;
    padding: 8px 14px 4px;
  }
  .vars-tools {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 0 10px 4px 14px;
  }
  .find {
    background: var(--soft);
    border: 0;
    border-radius: 6px;
    color: var(--ink);
    font: inherit;
    font-size: 13px;
    padding: 3px 8px;
    width: 100%;
  }
  .vars {
    flex: 1;
    list-style: none;
    margin: 0;
    min-height: 0;
    overflow-y: auto;
    padding: 0 10px 12px 14px;
  }
  .vars li {
    align-items: center;
    display: flex;
    gap: 6px;
  }
  .vpick {
    background: none;
    border: 0;
    color: var(--ink);
    cursor: pointer;
    display: flex;
    flex: 1;
    font: inherit;
    font-size: 13px;
    gap: 8px;
    justify-content: space-between;
    padding: 2px 0;
    text-align: left;
  }
  .inspector {
    border-left: 1px solid var(--line);
    display: flex;
    flex: none;
    flex-direction: column;
    min-height: 0;
    width: 300px;
  }
  .facts {
    color: var(--ink-2);
    font-size: 13px;
    margin: 0;
    padding: 2px 14px 6px;
  }
  .inspector .word {
    align-self: flex-start;
    margin: 0 8px;
  }
  .summary {
    flex: 1;
    font-size: 12.5px;
    margin: 8px 0 0;
    overflow: auto;
    padding: 6px 14px 16px;
    white-space: pre;
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
