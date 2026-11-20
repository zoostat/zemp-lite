<script lang="ts">
  // The top bar of a project (the design guide, section 9; open decision #146), in the quiet
  // look of the margin editor (#174; its design, sections 5 and 14): the logo and Projects, the
  // project and its file, a search field for ⌘K, the size of code text, Margin | Panes, the
  // Dark switch, Check and Run. Every control is a word with a soft ground when pointed at;
  // Run is the one filled control, and reads Stop while the engine runs.
  import { codeLarger, codeSize, codeSmaller } from "../theme/codesize.svelte";
  import { CODE_SIZES } from "../theme/codesize";
  import Logo from "../theme/Logo.svelte";
  import { switchTheme, theme } from "../theme/theme.svelte";
  import { DATA, PLOTS, fileTab } from "./views";
  import type { Workspace } from "./workspace-state.svelte";

  let {
    workspace,
    onclose,
    onpalette,
  }: { workspace: Workspace; onclose: () => void; onpalette: () => void } = $props();

  // The key of the command palette as this computer writes it.
  const mac = /Mac|iPhone|iPad/.test(navigator.platform);

  const path = $derived(workspace.activePath);
  const buffer = $derived(path === null ? undefined : workspace.buffers[path]);
  // The places (the margin editor's design, section 6): the script, its data and its plots.
  const place = $derived(
    workspace.views.active === PLOTS
      ? "plots"
      : workspace.views.active === DATA
        ? "data"
        : "script",
  );
  const smallest = CODE_SIZES[0];
  const largest = CODE_SIZES[CODE_SIZES.length - 1];
</script>

<header class="top">
  <Logo size={18} />
  <button class="word strong" onclick={onclose} title="Back to the projects of this browser"
    >Projects ▾</button
  >
  <span class="where">
    <h1>{workspace.project.info.name}</h1>
    {#if path !== null}
      <span class="file"
        >/ {path.split("/").at(-1)} · {buffer === undefined || buffer.saved
          ? "saved"
          : "saving"}</span
      >
    {/if}
  </span>
  <nav class="places" aria-label="Places">
    <button
      class:on={place === "script"}
      aria-current={place === "script" ? "page" : undefined}
      onclick={() => workspace.show(fileTab(workspace.scriptPath))}>Script</button
    >
    <button
      class:on={place === "data"}
      aria-current={place === "data" ? "page" : undefined}
      onclick={() => workspace.openData()}>Data</button
    >
    <button
      class:on={place === "plots"}
      aria-current={place === "plots" ? "page" : undefined}
      onclick={() => workspace.openPlots()}>Plots</button
    >
  </nav>
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
  <span class="layouts" role="group" aria-label="Layout">
    <button
      class:on={workspace.views.layout === "margin"}
      aria-pressed={workspace.views.layout === "margin"}
      onclick={() => workspace.setLayout("margin")}>Margin</button
    >
    <button
      class:on={workspace.views.layout === "panes"}
      aria-pressed={workspace.views.layout === "panes"}
      onclick={() => workspace.setLayout("panes")}>Panes</button
    >
  </span>
  <button class="switch" role="switch" aria-checked={theme.name === "dark"} onclick={switchTheme}>
    <i></i>Dark
  </button>
  <button
    class="word control"
    onclick={() => void workspace.check()}
    title="Check the script as Zeff does before it runs it; nothing is run"
    disabled={workspace.running || !workspace.ready}>Check</button
  >
  {#if workspace.running && workspace.status !== "checking"}
    <!-- While the engine runs, Run reads Stop: what has finished is kept (the design, 7.8). -->
    <button
      class="filled"
      onclick={() => workspace.cancel()}
      title="Stop the run; what has finished is kept">Stop</button
    >
  {:else}
    <button
      class="filled"
      onclick={() => void workspace.run()}
      title="Run the script · ⌘↵ or ⌘⇧↵ (Ctrl in place of ⌘ on Windows and Linux)"
      aria-keyshortcuts="Meta+Enter Control+Enter"
      disabled={workspace.running || !workspace.ready}>Run</button
    >
  {/if}
</header>

<style>
  .top {
    align-items: center;
    border-bottom: 1px solid var(--line);
    color: var(--ink-2);
    display: flex;
    flex: none;
    gap: 16px;
    height: 48px;
    min-width: 0;
    overflow: hidden;
    padding: 0 18px;
  }
  .top > :global(*) {
    flex: none;
  }
  .word {
    background: none;
    border: 0;
    padding: 0;
  }
  .strong {
    color: var(--ink);
  }
  .where {
    flex: 0 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  h1 {
    color: var(--ink);
    display: inline;
    font-size: inherit;
    font-weight: 400;
    margin: 0;
  }
  .file {
    color: var(--ink-3);
  }
  .gap {
    flex: 1;
  }
  /* The search field of ⌘K: a soft field, the key at its end. */
  .search {
    align-items: center;
    background: var(--soft);
    border: 0;
    border-radius: 8px;
    color: var(--ink-3);
    display: inline-flex;
    gap: 18px;
    padding: 4px 8px 4px 11px;
  }
  .search kbd {
    color: var(--ink-3);
    font-size: 12.5px;
  }
  .search:hover,
  .search:focus-visible {
    color: var(--ink-2);
  }
  .sizes,
  .layouts {
    display: inline-flex;
    gap: 2px;
  }
  .sizes {
    align-items: center;
  }
  .sizes button,
  .layouts button {
    background: transparent;
    border: 0;
    border-radius: 6px;
    color: var(--ink-2);
    padding: 3px 8px;
  }
  .sizes button:hover:not(:disabled),
  .layouts button:hover {
    background: var(--soft);
  }
  .sizes button {
    min-width: 30px;
  }
  .sizes button:disabled,
  .layouts button:disabled {
    opacity: 0.45;
  }
  .sizes span {
    color: var(--ink-3);
    font-size: 12.5px;
    font-variant-numeric: tabular-nums;
    min-width: 22px;
    padding: 3px 4px;
    text-align: center;
  }
  .layouts button {
    font-size: 12.5px;
    padding: 3px 11px;
  }
  .places {
    display: inline-flex;
    gap: 4px;
  }
  .places button {
    background: none;
    border: 0;
    border-radius: 6px;
    color: var(--ink-2);
    padding: 3px 8px;
  }
  .places button:hover {
    background: var(--soft);
  }
  .places button.on {
    color: var(--accent);
    text-decoration: underline 2px var(--accent);
    text-underline-offset: 6px;
  }
  /* The layout shown is underlined in violet, as the current place is (the design, 14). */
  .layouts button.on {
    color: var(--accent);
    text-decoration: underline 2px var(--accent);
    text-underline-offset: 6px;
  }
  .switch {
    align-items: center;
    background: none;
    border: 0;
    color: inherit;
    display: inline-flex;
    gap: 7px;
    padding: 0;
  }
  .switch i {
    background: var(--line-strong);
    border-radius: 999px;
    display: block;
    height: 15px;
    position: relative;
    transition: background 0.2s;
    width: 26px;
  }
  .switch i::after {
    background: var(--window);
    border-radius: 50%;
    content: "";
    height: 11px;
    left: 2px;
    position: absolute;
    top: 2px;
    transition: left 0.2s;
    width: 11px;
  }
  .switch[aria-checked="true"] i {
    background: var(--accent);
  }
  .switch[aria-checked="true"] i::after {
    left: 13px;
  }
  .control {
    border-radius: 6px;
    color: var(--ink);
    padding: 3px 8px;
  }
  .control:hover:not(:disabled) {
    background: var(--soft);
  }
  .control:disabled {
    color: var(--ink-3);
  }
  /* The one filled control of the window. */
  .filled {
    background: var(--button);
    border: 1px solid var(--button);
    border-radius: 8px;
    color: var(--button-ink);
    padding: 3px 14px;
  }
  .filled:disabled {
    opacity: 0.55;
  }
</style>
