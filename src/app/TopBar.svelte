<script lang="ts">
  // The top bar of a project (the design guide, section 9; open decision #146): the logo and
  // Projects, the project and its file, ⌘K, the size of code text, Inline | Panes, the Dark
  // switch, Check and Run. Run is the one filled control.
  import { codeLarger, codeSize, codeSmaller } from "../theme/codesize.svelte";
  import { CODE_SIZES } from "../theme/codesize";
  import Logo from "../theme/Logo.svelte";
  import { switchTheme, theme } from "../theme/theme.svelte";
  import type { Workspace } from "./workspace-state.svelte";

  let { workspace, onclose }: { workspace: Workspace; onclose: () => void } = $props();

  const path = $derived(workspace.activePath);
  const buffer = $derived(path === null ? undefined : workspace.buffers[path]);
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
  <span class="gap"></span>
  <span class="palette mono" title="The command palette arrives at step 10">⌘K</span>
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
      class:on={workspace.views.layout === "inline"}
      aria-pressed={workspace.views.layout === "inline"}
      disabled
      title="The Inline layout arrives at step 9">Inline</button
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
  <button class="chip" disabled title="Check arrives with the language server, in the alpha"
    >Check</button
  >
  {#if workspace.running}
    <button class="chip" onclick={() => workspace.cancel()}>Cancel</button>
  {/if}
  <button
    class="chip run"
    onclick={() => void workspace.run()}
    disabled={workspace.running || !workspace.ready}>Run</button
  >
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
  .palette {
    color: var(--ink-3);
    font-size: 12.5px;
  }
  .sizes,
  .layouts {
    border: 1px solid var(--line-strong);
    border-radius: 7px;
    display: inline-flex;
    overflow: hidden;
  }
  .sizes {
    align-items: center;
  }
  .sizes button,
  .layouts button {
    background: transparent;
    border: 0;
    color: var(--ink-2);
    padding: 3px 9px;
  }
  .sizes button {
    min-width: 30px;
  }
  .sizes button:hover:not(:disabled) {
    background: var(--accent-soft);
    color: var(--accent);
  }
  .sizes button:disabled,
  .layouts button:disabled {
    opacity: 0.45;
  }
  .sizes span {
    border-left: 1px solid var(--line-strong);
    border-right: 1px solid var(--line-strong);
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
  .layouts button + button {
    border-left: 1px solid var(--line-strong);
  }
  .layouts button.on {
    background: var(--accent-soft);
    color: var(--accent);
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
  .chip {
    background: var(--window);
    border: 1px solid var(--line-strong);
    border-radius: 7px;
    color: var(--ink);
    padding: 3px 11px;
  }
  .chip:disabled {
    color: var(--ink-3);
  }
  .chip.run {
    background: var(--button);
    border-color: var(--button);
    color: var(--button-ink);
  }
  .chip.run:disabled {
    opacity: 0.55;
  }
</style>
