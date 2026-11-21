<script lang="ts">
  // The Data place (open decision #75, as the owner answered it; the margin editor's design,
  // section 8): the frames of the last run at the left, each by the statement that made it, and
  // the frame chosen as a grid. The grid draws only the rows near its window and asks the
  // engine for them a page at a time, so a frame of any length scrolls without a pause; every
  // cell is written as the engine prints it, a missing value `NA`, never blank. The header and
  // the row numbers with the first variable stay in place as the grid is scrolled. The view
  // can be kept to the rows of a condition, sorted by a variable and searched, each done by
  // the engine (step 14b); each header draws the variable's distribution as the engine bins
  // it; a range of cells can be copied as the engine wrote them; and Copy as Zeff (#114) puts
  // on the clipboard the statement that gives what the view shows. Nothing here writes a
  // statement into the script: the viewer is read-only.
  import type { Workspace } from "../app/workspace-state.svelte";
  import type { Bars, Rows } from "../engine/messages";
  import { counted } from "../margin/notes";
  import { CONTRASTS, TYPES, contrastAsZeff, labelsAsZeff, typeAsZeff, viewAsZeff } from "./zeff";

  let { workspace, onback = null }: { workspace: Workspace; onback?: (() => void) | null } =
    $props();

  /** Rows fetched at a time, the height of a row and of the header, in pixels. */
  const PAGE = 200;
  const ROW = 26;
  const HEAD = 58;

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
  // Each fetch of the pages afresh: an answer to an earlier one is not shown.
  let generation = 0;

  // How the frame is shown: the view state, kept with the project.
  const view = $derived(
    chosen === null ? { where: "", sort: null, search: "" } : workspace.viewOf(chosen),
  );

  async function fetchPage(name: string, page: number): Promise<void> {
    if (asked[page]) return;
    asked[page] = true;
    const asking = generation;
    try {
      const found = await workspace.rows(name, page * PAGE, PAGE);
      if (name !== shownFor || asking !== generation) return;
      pages = { ...pages, [page]: found.rows };
      if (page === 0) first = found;
    } catch (error) {
      if (asking === generation) problem = (error as Error).message;
    }
  }

  // A new frame chosen, a new run or a new view: the pages fetched afresh.
  $effect(() => {
    const name = chosen;
    void workspace.lastRun?.startedAt;
    void [view.where, view.sort?.variable, view.sort?.desc, view.search];
    generation += 1;
    pages = {};
    asked = {};
    problem = "";
    selection = null;
    shownFor = name;
    if (name !== null) void fetchPage(name, 0);
    else first = null;
  });

  // The window of the grid, and the rows near it.
  let grid = $state<HTMLElement | null>(null);
  let top = $state(0);
  let height = $state(600);
  // The rows the view keeps: the grid is as long as they are.
  const total = $derived(first?.kept ?? 0);
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

  // The condition and the search as they are typed: the condition is given to the engine on
  // Enter, the search a moment after the last key.
  let condition = $state("");
  let searching = $state("");
  let typedFor: string | null = null;
  $effect(() => {
    if (chosen !== typedFor) {
      typedFor = chosen;
      condition = view.where;
      searching = view.search;
    }
  });
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  function search(text: string): void {
    searching = text;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      if (chosen !== null) workspace.setView(chosen, { search: searching });
    }, 250);
  }
  function keep(): void {
    if (chosen !== null) workspace.setView(chosen, { where: condition.trim() });
  }
  function clearView(): void {
    condition = "";
    searching = "";
    if (chosen !== null) workspace.setView(chosen, { where: "", sort: null, search: "" });
  }
  /** Sorted by a variable: none, then up, then down, then none again. */
  function sortBy(name: string): void {
    if (chosen === null) return;
    const now = view.sort;
    const next =
      now === null || now.variable !== name
        ? { variable: name, desc: false }
        : now.desc
          ? null
          : { variable: name, desc: true };
    workspace.setView(chosen, { sort: next });
  }
  const wanted = $derived(view.search.toLowerCase());
  const matches = (cell: string) => wanted !== "" && cell.toLowerCase().includes(wanted);

  // What was copied from here, in words.
  let copied = $state("");
  async function copy(text: string, what: string): Promise<void> {
    await workspace.copyFromData(text, what);
    copied = workspace.copied;
  }
  const statement = $derived(
    chosen === null ? null : viewAsZeff(chosen, { where: view.where, sort: view.sort }),
  );
  function copyView(): void {
    if (statement === null) return;
    const searched = view.search === "" ? "" : " · the search is the viewer's and is not in it";
    void copy(statement, `copied ${statement}${searched}`);
  }

  // A range of cells: from the cell pressed to the one the mouse is let go over, or the one
  // pressed with Shift; columns by their place among the variables shown.
  let selection = $state<{ r0: number; c0: number; r1: number; c1: number } | null>(null);
  let dragging = false;
  const span = $derived(
    selection === null
      ? null
      : {
          top: Math.min(selection.r0, selection.r1),
          bottom: Math.max(selection.r0, selection.r1),
          left: Math.min(selection.c0, selection.c1),
          right: Math.max(selection.c0, selection.c1),
        },
  );
  const inRange = (row: number, column: number) =>
    span !== null &&
    row >= span.top &&
    row <= span.bottom &&
    column >= span.left &&
    column <= span.right;
  function press(event: MouseEvent, row: number, column: number): void {
    if (event.button !== 0) return;
    if (event.shiftKey && selection !== null) {
      selection = { ...selection, r1: row, c1: column };
    } else {
      selection = { r0: row, c0: column, r1: row, c1: column };
      dragging = true;
    }
    grid?.focus();
  }
  function over(row: number, column: number): void {
    if (dragging && selection !== null) selection = { ...selection, r1: row, c1: column };
  }
  async function copyCells(): Promise<void> {
    if (span === null || chosen === null) return;
    const columns = shown.slice(span.left, span.right + 1).map(({ at }) => at);
    const found = await workspace.rows(chosen, span.top, span.bottom - span.top + 1);
    const text = found.rows.map((row) => columns.map((at) => row[at] ?? "").join("\t")).join("\n");
    const rows = found.rows.length;
    await copy(
      `${text}\n`,
      `copied ${counted(rows)} row${rows === 1 ? "" : "s"} × ${counted(columns.length)} column${columns.length === 1 ? "" : "s"} of cells`,
    );
  }
  function keydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c" && span !== null) {
      event.preventDefault();
      void copyCells();
    } else if (event.key === "Escape") {
      selection = null;
    }
  }

  // The small distribution in a header: a bar for each bin or value, as high as its count.
  function described(bars: Bars): string {
    if (bars.levels !== undefined) {
      return bars.levels
        .map((level, at) => `${level} ${counted(bars.counts[at] ?? 0)}`)
        .join(" · ");
    }
    return `${bars.counts.length} bins of the engine's histogram`;
  }
  const most = (bars: Bars) => Math.max(1, ...bars.counts);

  // The inspector's Copy as Zeff: another type, another contrast, labels for the codes.
  let toType = $state("");
  let toContrast = $state("");
  let labels = $state<Record<number, string>>({});
  $effect(() => {
    const variable = inspected;
    toType = TYPES.find((one) => one !== variable?.type) ?? "Float";
    toContrast = CONTRASTS.find((one) => one !== variable?.contrast) ?? "sum";
    labels = Object.fromEntries(
      (variable?.codes ?? []).map((one) => [
        one.code,
        one.shown === String(one.code) ? "" : one.shown,
      ]),
    );
  });
  function copyStatement(text: string | null): void {
    if (text !== null) void copy(text, `copied ${text}`);
  }

  // Each column as wide as its header or its widest cell of the first page, within bounds. The
  // header holds the name (in the code face) over the type and the count of NA (in the text
  // face), beside the sort and hide buttons, which take about 34 pixels with the padding.
  const widths = $derived(
    (first?.variables ?? []).map((variable, at) => {
      const facts =
        variable.type.length +
        (variable.missing > 0 ? ` · ${counted(variable.missing)} NA`.length : 0);
      const head = Math.max(variable.name.length * 8, facts * 7) + 52;
      const longest = Math.max(
        0,
        ...(first?.rows ?? []).slice(0, 100).map((row) => (row[at] ?? "").length),
      );
      return Math.min(Math.max(head, longest * 8 + 24, 64), 280);
    }),
  );
  const numberWidth = $derived(Math.max(String(total).length * 8 + 22, 48));
</script>

<svelte:window onmouseup={() => (dragging = false)} />

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
      {#if first !== null && (view.where !== "" || view.search !== "" || first.kept !== first.total)}
        <span class="count" data-testid="kept-count"
          >{counted(first.kept)} of {counted(first.total)} rows</span
        >
      {/if}
      {#if hidden.length > 0}
        <span class="about"
          >{counted(hidden.length)} hidden ·
          <button class="word" onclick={() => chosen !== null && workspace.setHidden(chosen, [])}
            >show all</button
          ></span
        >
      {/if}
    </div>
    {#if chosen !== null}
      <div class="tools">
        <label class="where">
          <span>Keep rows where</span>
          <input
            class="mono"
            type="text"
            spellcheck="false"
            placeholder="year >= 2010"
            aria-label="Keep rows where"
            bind:value={condition}
            onkeydown={(event) => {
              if (event.key === "Enter") keep();
              else if (event.key === "Escape") {
                condition = "";
                keep();
              }
            }}
          />
        </label>
        <button class="word" onclick={keep}>Keep</button>
        <input
          class="find search"
          type="search"
          placeholder="Search the cells"
          aria-label="Search the cells"
          value={searching}
          oninput={(event) => search(event.currentTarget.value)}
        />
        {#if span !== null}
          <button class="word" onclick={() => void copyCells()}
            >Copy {counted(span.bottom - span.top + 1)} × {counted(span.right - span.left + 1)} cells</button
          >
        {/if}
        <button
          class="word"
          disabled={statement === null}
          title="The statement that gives what the view shows, put on the clipboard"
          onclick={copyView}>Copy as Zeff</button
        >
        {#if view.where !== "" || view.sort !== null || view.search !== ""}
          <button class="word" onclick={clearView}>Clear</button>
        {/if}
      </div>
      {#if first?.filter && first.filter.said !== ""}
        <p
          class="said mono"
          class:problem={!first.filter.ok}
          role={first.filter.ok ? undefined : "alert"}
          data-testid="filter-said"
        >
          {first.filter.said}
        </p>
      {/if}
      {#if copied}<p class="said" data-testid="data-copied">{copied}</p>{/if}
    {/if}
    {#if problem}<p class="problem" role="alert">{problem}</p>{/if}
    {#if first !== null}
      <div
        class="grid mono"
        role="grid"
        aria-label="The rows of {first.name}"
        aria-rowcount={total + 1}
        tabindex="0"
        onkeydown={keydown}
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
                  ><span class="vname" title={variable.name}>{variable.name}</span><span
                    class="vfacts"
                    >{variable.type}{#if variable.missing > 0}<span class="miss">
                        · {counted(variable.missing)} NA</span
                      >{/if}</span
                  >{#if variable.bars !== null}{@const bars = variable.bars}<svg
                      class="spark"
                      viewBox="0 0 {bars.counts.length} 12"
                      preserveAspectRatio="none"
                      role="img"
                      aria-label={described(bars)}
                      data-testid="spark"
                      ><title>{described(bars)}</title>{#each bars.counts as count, bin (bin)}<rect
                          x={bin + 0.08}
                          width="0.84"
                          y={12 - (12 * count) / most(bars)}
                          height={(12 * count) / most(bars)}
                        />{/each}</svg
                    >{/if}</button
                ><button
                  class="sort"
                  class:on={view.sort?.variable === variable.name}
                  aria-label="Sort by {variable.name}"
                  title={view.sort?.variable === variable.name
                    ? view.sort.desc
                      ? "Sorted down: press to stop sorting"
                      : "Sorted up: press to sort down"
                    : "Sort up"}
                  onclick={() => sortBy(variable.name)}
                  >{view.sort?.variable === variable.name
                    ? view.sort.desc
                      ? "↓"
                      : "↑"
                    : "↕"}</button
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
                    class:match={matches(cell)}
                    class:selected={inRange(row, index)}
                    style:width="{widths[at]}px"
                    style:left={index === 0 ? `${numberWidth}px` : undefined}
                    role="gridcell"
                    tabindex="-1"
                    aria-selected={inRange(row, index)}
                    onmousedown={(event) => press(event, row, index)}
                    onmouseenter={() => over(row, index)}>{cell}</span
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
      <div class="as-zeff" data-testid="copy-as-zeff">
        <span class="as-head">Copy as Zeff</span>
        <div class="as-row">
          <select aria-label="Another type for {inspected.name}" bind:value={toType}>
            {#each TYPES.filter((one) => one !== inspected.type) as type (type)}
              <option value={type}>{type}</option>
            {/each}
          </select>
          <button
            class="word"
            onclick={() =>
              chosen !== null && copyStatement(typeAsZeff(chosen, inspected.name, toType))}
            >Copy the change of type</button
          >
        </div>
        {#if inspected.type === "Category"}
          <div class="as-row">
            <select aria-label="Another contrast for {inspected.name}" bind:value={toContrast}>
              {#each CONTRASTS as contrast (contrast)}
                <option value={contrast}>{contrast}</option>
              {/each}
            </select>
            <button
              class="word"
              onclick={() =>
                chosen !== null &&
                copyStatement(contrastAsZeff(chosen, inspected.name, toContrast))}
              >Copy the contrast</button
            >
          </div>
        {/if}
        {#if inspected.codes !== null}
          <div class="labels">
            {#each inspected.codes as one (one.code)}
              <label class="as-row"
                ><span class="mono code">{one.code}</span><input
                  type="text"
                  aria-label="The label of {one.code}"
                  bind:value={labels[one.code]}
                /></label
              >
            {/each}
            <button
              class="word"
              onclick={() =>
                chosen !== null &&
                copyStatement(
                  labelsAsZeff(
                    chosen,
                    inspected.name,
                    (inspected.codes ?? []).map((one) => ({
                      code: one.code,
                      label: labels[one.code] ?? "",
                    })),
                  ),
                )}>Copy the labels</button
            >
          </div>
        {/if}
      </div>
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
  .count {
    color: var(--ink-2);
    font-size: 13px;
  }
  .tools {
    align-items: center;
    border-bottom: 1px solid var(--line);
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 6px 14px;
  }
  .where {
    align-items: center;
    color: var(--ink-2);
    display: flex;
    flex: 1 1 320px;
    font-size: 13px;
    gap: 8px;
  }
  .where input {
    background: var(--soft);
    border: 0;
    border-radius: 6px;
    color: var(--ink);
    flex: 1;
    font-size: 12.5px;
    min-width: 120px;
    padding: 4px 8px;
  }
  .search {
    flex: 0 1 220px;
    width: auto;
  }
  .word:disabled {
    color: var(--ink-3);
    cursor: default;
  }
  .word:disabled:hover {
    background: none;
  }
  .said {
    color: var(--ink-2);
    font-size: 12.5px;
    margin: 0;
    padding: 4px 14px;
    white-space: pre-wrap;
  }
  .said.problem {
    color: var(--error);
  }
  .spark {
    display: block;
    fill: var(--ink-3);
    height: 12px;
    margin-top: 2px;
    opacity: 0.7;
    width: 100%;
  }
  .headcell.chosen .spark {
    fill: var(--accent);
  }
  .sort {
    background: none;
    border: 0;
    border-radius: 4px;
    color: var(--ink-3);
    cursor: pointer;
    flex: none;
    font: inherit;
    padding: 0 3px;
  }
  .sort.on {
    color: var(--accent);
  }
  .sort:hover {
    background: var(--soft);
  }
  .cell.match {
    background: var(--tint);
  }
  .cell.selected {
    background: var(--accent-soft);
  }
  .grid {
    user-select: none;
  }
  .as-zeff {
    border-top: 1px solid var(--line);
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 8px;
    padding: 8px 14px 4px;
  }
  .as-head {
    color: var(--ink-2);
    font-size: 13px;
  }
  .as-row {
    align-items: center;
    display: flex;
    gap: 6px;
  }
  .as-zeff .word {
    margin: 0;
  }
  .as-zeff select,
  .as-zeff input {
    background: var(--soft);
    border: 0;
    border-radius: 6px;
    color: var(--ink);
    font: inherit;
    font-size: 13px;
    padding: 3px 6px;
  }
  .labels {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .code {
    color: var(--ink-3);
    min-width: 3ch;
    text-align: right;
  }
  .problem {
    color: var(--error);
    padding: 6px 14px;
  }
</style>
