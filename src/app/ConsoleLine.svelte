<script lang="ts">
  // The foot of the window (Zemp Specification, section 5): a one-line console that runs a
  // statement without adding it to the script, and at its right the status. The line grows
  // upward into a drawer of what was typed and what came of it; Escape shrinks it again.
  import type { Workspace } from "./workspace-state.svelte";

  let { workspace }: { workspace: Workspace } = $props();

  let typing = $state("");
  let box = $state<HTMLInputElement | null>(null);
  let drawer = $state<HTMLElement | null>(null);

  /** Put the keyboard in the console: what ⌃` and the palette do. */
  export function focus(): void {
    box?.focus();
  }

  function key(event: KeyboardEvent): void {
    if (event.key === "Enter" && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      const line = typing;
      typing = "";
      void workspace.enter(line);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      typing = workspace.history.up(typing);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      typing = workspace.history.down(typing);
    } else if (event.key === "Escape") {
      event.preventDefault();
      workspace.consoleOpen = false;
      box?.blur();
    }
  }

  // The newest line of the drawer is kept in view.
  $effect(() => {
    void workspace.entries.length;
    void workspace.entries.at(-1)?.state;
    if (drawer !== null) drawer.scrollTop = drawer.scrollHeight;
  });
</script>

<footer class="bottom">
  {#if workspace.consoleOpen && workspace.entries.length > 0}
    <div class="drawer" bind:this={drawer} role="log" aria-label="Console output">
      {#each workspace.entries as entry, at (at)}
        <div class="entry {entry.state}" data-testid="entry">
          <div class="asked mono"><span aria-hidden="true">›</span> {entry.statement}</div>
          {#if entry.state === "running"}<div class="told">running…</div>{/if}
          {#if entry.printed !== ""}<pre
              class="mono"
              data-testid="console-printed">{entry.printed}</pre>{/if}
          {#each entry.said as one, index (index)}
            <div class="said {one.kind}">
              <span class="kind">{one.kind}</span>
              {#if one.code !== null}<span class="code mono">{one.code}</span>{/if}
              <span>{one.sentence}</span>
              {#each one.help as help (help)}<div class="help">{help}</div>{/each}
            </div>
          {/each}
          {#if entry.told !== ""}<div class="told">{entry.told}</div>{/if}
        </div>
      {/each}
    </div>
  {/if}
  <div class="line">
    <span class="prompt mono" aria-hidden="true">›</span>
    <input
      class="mono"
      bind:this={box}
      bind:value={typing}
      onkeydown={key}
      onfocus={() => (workspace.consoleOpen = true)}
      disabled={!workspace.ready}
      aria-label="Console: a statement to run without adding it to the script"
      placeholder="Type a statement · ⌃` opens the console"
      autocomplete="off"
      spellcheck="false"
    />
    <span class="sync" data-testid="sync"
      >{workspace.sync}{workspace.lastRun !== null && !workspace.running
        ? ` · ${workspace.warnings} warning${workspace.warnings === 1 ? "" : "s"}`
        : ""}</span
    >
    <span role="status">{workspace.status}</span>
    <span class="engine">engine Zeff {workspace.engineVersion ?? "…"} · in this browser</span>
  </div>
</footer>

<style>
  .bottom {
    background: var(--window);
    border-top: 1px solid var(--line);
    color: var(--ink-3);
    flex: none;
    min-width: 0;
  }
  .line {
    align-items: center;
    display: flex;
    gap: 12px;
    height: 36px;
    padding: 0 18px;
  }
  .prompt {
    color: var(--ink-2);
  }
  input {
    background: transparent;
    border: 0;
    color: var(--ink);
    flex: 1;
    font-size: calc(var(--code-size, 14px) - 1px);
    min-width: 0;
    outline: none;
    padding: 0;
  }
  input::placeholder {
    color: var(--ink-3);
    font-family: "Atkinson Hyperlegible Next", sans-serif;
    font-size: 13.5px;
  }
  .sync,
  [role="status"],
  .engine {
    flex: none;
    white-space: nowrap;
  }
  .engine {
    color: var(--ink-2);
  }
  .drawer {
    border-bottom: 1px solid var(--line);
    max-height: 40vh;
    overflow: auto;
    padding: 8px 18px 10px;
  }
  .entry {
    padding: 4px 0;
  }
  .asked {
    color: var(--ink);
    font-size: calc(var(--code-size, 14px) - 1px);
  }
  .asked span {
    color: var(--ink-3);
  }
  pre {
    color: var(--ink);
    font-size: calc(var(--code-size, 14px) - 1px);
    line-height: 1.6;
    margin: 2px 0 0 16px;
    overflow-x: auto;
  }
  .said,
  .told {
    margin: 2px 0 0 16px;
  }
  .said {
    color: var(--ink-2);
  }
  .said .kind {
    font-weight: 600;
  }
  .said.warning .kind,
  .said.warning .code {
    color: var(--warning);
  }
  .said.error .kind,
  .said.error .code {
    color: var(--error);
  }
  .help::before {
    content: "help: ";
    font-weight: 500;
  }
</style>
