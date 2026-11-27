<script lang="ts">
  // The top bar of a project (release 0.3.1, step 4; open decision #245): one bar of 38 pixels
  // with the mark, **Projects ▾** (all projects, export, rename, report a problem), the project
  // and its file with whether it is saved, the field of ⌘K, the size of code text, Dark, Check
  // and Run. The places are no longer here: they are the side menu (`SideMenu.svelte`). Every
  // control is a word; Run is the one filled control, and reads Stop while the engine runs.
  import { codeLarger, codeSize, codeSmaller } from "../theme/codesize.svelte";
  import { CODE_SIZES } from "../theme/codesize";
  import Logo from "../theme/Logo.svelte";
  import { switchTheme, theme } from "../theme/theme.svelte";
  import RowMenu, { type RowAction } from "./RowMenu.svelte";
  import { PAPER } from "./views";
  import type { Workspace } from "./workspace-state.svelte";

  let {
    workspace,
    onclose,
    onpalette,
    onexport,
    onrename,
    onreport,
  }: {
    workspace: Workspace;
    onclose: () => void;
    onpalette: () => void;
    onexport: () => void;
    /** Rename the project, or `null` where it has no name of its own to change (Scratch). */
    onrename: (() => void) | null;
    onreport: () => void;
  } = $props();

  // The keys as this computer writes them.
  const mac = /Mac|iPhone|iPad/.test(navigator.platform);

  // The file the place shows: a script's in Script, the open paper's in Paper.
  const path = $derived(
    workspace.views.active === PAPER
      ? workspace.paperShown.kind === "none"
        ? null
        : workspace.paperShown.path
      : workspace.activePath,
  );
  const buffer = $derived(path === null ? undefined : workspace.buffers[path]);
  const state = $derived(
    buffer?.readOnly ? "read only" : buffer === undefined || buffer.saved ? "saved" : "saving",
  );
  const smallest = CODE_SIZES[0];
  const largest = CODE_SIZES[CODE_SIZES.length - 1];

  /** What **Projects ▾** lists: the projects, and what is done with this one as a whole. */
  const projects = $derived<RowAction[]>([
    { name: "All projects", run: () => onclose() },
    { name: "Export project…", run: () => onexport() },
    ...(onrename === null ? [] : [{ name: "Rename project…", run: onrename }]),
    { name: "Report a problem…", run: () => onreport() },
  ]);
</script>

<header class="top">
  <Logo size={20} />
  <RowMenu label="Projects" words="Projects ▾" actions={projects} />
  <span class="where">
    <h1>{workspace.project.info.name}</h1>
    {#if path !== null}
      <span class="file"
        >/ {path.split("/").at(-1)} ·
        <span class="state" class:saved={state === "saved"}>{state}</span></span
      >
    {/if}
  </span>
  <span class="gap"></span>
  <button
    class="search"
    onclick={onpalette}
    aria-label="Commands"
    title="Every command of the window"
    ><span>Search or run a command</span><kbd class="mono">{mac ? "⌘K" : "Ctrl K"}</kbd></button
  >
  <span class="sizes" role="group" aria-label="Code text size">
    <button onclick={codeSmaller} disabled={codeSize.px === smallest} aria-label="Smaller code text"
      >A−</button
    >
    <span aria-live="polite">{codeSize.px}</span>
    <button onclick={codeLarger} disabled={codeSize.px === largest} aria-label="Larger code text"
      >A+</button
    >
  </span>
  <button
    class="word"
    role="switch"
    aria-checked={theme.name === "dark"}
    title="The dark theme, for this browser"
    onclick={switchTheme}>Dark</button
  >
  <button
    class="outlined"
    onclick={() => void workspace.check()}
    title="Check the script as Zeff does before it runs it; nothing is run"
    disabled={workspace.running || !workspace.ready}>Check</button
  >
  {#if workspace.running && workspace.status !== "checking"}
    <!-- While the engine runs, Run reads Stop: what has finished is kept (the design, 7.8). -->
    <button
      class="outlined filled"
      onclick={() => workspace.cancel()}
      title="Stop the run; what has finished is kept">Stop</button
    >
  {:else}
    <button
      class="outlined filled"
      onclick={() => void workspace.run()}
      aria-label="Run"
      title="Run the script · ⌘↵ or ⌘⇧↵ (Ctrl in place of ⌘ on Windows and Linux)"
      aria-keyshortcuts="Meta+Enter Control+Enter"
      disabled={workspace.running || !workspace.ready}
      >Run <kbd class="mono" aria-hidden="true">{mac ? "⌘↵" : "Ctrl ↵"}</kbd></button
    >
  {/if}
</header>

<style>
  .top {
    align-items: center;
    background: var(--window);
    border-bottom: 1px solid var(--line);
    box-sizing: border-box;
    color: var(--ink-2);
    display: flex;
    flex: none;
    gap: 2px;
    height: 38px;
    min-width: 0;
    padding: 0 8px;
    position: relative;
    white-space: nowrap;
    z-index: 9;
  }
  .top > :global(*) {
    flex: none;
  }
  .top > :global(svg) {
    margin: 0 4px 0 2px;
  }
  /* The project and its file give way first where the bar has no room: their end is cut. */
  .where {
    flex: 0 1 auto;
    min-width: 0;
    overflow: hidden;
    padding: 0 8px;
    text-overflow: ellipsis;
  }
  h1 {
    color: var(--ink);
    display: inline;
    font-size: inherit;
    font-weight: 700;
    margin: 0;
  }
  .file {
    color: var(--ink-3);
  }
  .state.saved {
    color: var(--ok);
  }
  .gap {
    flex: 1;
  }
  /* The field of ⌘K: an outlined field, the key at its end. */
  .search {
    align-items: center;
    background: transparent;
    border: 1px solid var(--line);
    border-radius: 7px;
    color: var(--ink-3);
    display: inline-flex;
    gap: 8px;
    height: 28px;
    margin-right: 4px;
    padding: 0 9px;
    width: 232px;
  }
  .search span {
    flex: 1;
    overflow: hidden;
    text-align: left;
    text-overflow: ellipsis;
  }
  .search kbd {
    color: var(--ink-3);
    font-size: 12.5px;
  }
  .search:hover,
  .search:focus-visible {
    border-color: var(--line-strong);
    color: var(--ink-2);
  }
  .sizes {
    align-items: center;
    display: inline-flex;
  }
  .sizes button,
  .word {
    background: transparent;
    border: 0;
    border-radius: 7px;
    color: var(--ink-2);
    font-weight: 600;
    height: 28px;
    padding: 0 7px;
  }
  .word {
    padding: 0 9px;
  }
  .sizes button:hover:not(:disabled),
  .word:hover {
    background: var(--soft);
    color: var(--ink);
  }
  .sizes button:disabled {
    opacity: 0.45;
  }
  .sizes span {
    color: var(--ink-3);
    font-size: 12.5px;
    font-variant-numeric: tabular-nums;
    min-width: 20px;
    text-align: center;
  }
  /* Dark, when it is on. */
  .word[aria-checked="true"] {
    background: var(--accent-soft);
    color: var(--accent);
  }
  /* Check and Run: outlined, and Run the one filled control of the window. */
  .outlined {
    align-items: center;
    background: var(--window);
    border: 1px solid var(--line-strong);
    border-radius: 8px;
    color: var(--ink);
    display: inline-flex;
    font-weight: 700;
    gap: 7px;
    height: 28px;
    margin-left: 4px;
    padding: 0 12px;
  }
  .outlined:hover:not(:disabled) {
    border-color: var(--accent);
  }
  .outlined:disabled {
    color: var(--ink-3);
  }
  .filled {
    background: var(--button);
    border-color: var(--button);
    color: var(--button-ink);
  }
  .filled kbd {
    font-size: 12.5px;
    font-weight: 400;
    opacity: 0.85;
  }
  .filled:hover:not(:disabled) {
    background: var(--accent-hover);
    border-color: var(--accent-hover);
  }
  .filled:disabled {
    color: var(--button-ink);
    opacity: 0.55;
  }
  /* Where the pointer is a finger the bar's controls are taller than the bar is drawn for. */
  @media (pointer: coarse) {
    .top {
      height: 44px;
    }
    .search,
    .sizes button,
    .word,
    .outlined {
      height: 32px;
    }
  }
</style>
