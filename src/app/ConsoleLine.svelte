<script lang="ts">
  // The foot of the window (Zemp Specification, section 5; the margin editor's design, section
  // 5): one line holding the state of the page after a coloured dot, which always has its words
  // beside it; the console, which runs a statement without adding it to the script; the keys;
  // and the engine. The line grows
  // upward into a drawer of what was typed and what came of it; Escape shrinks it again.
  import type { Workspace } from "./workspace-state.svelte";

  let { workspace }: { workspace: Workspace } = $props();

  const mac = /Mac|iPhone|iPad/.test(navigator.platform);
  /** The colour of the state's dot: in step, out of step, refused, or nothing yet. */
  const tone = $derived.by(() => {
    const sync = workspace.sync;
    if (/^not run · |: [1-9]\d* errors?/.test(sync)) return "error";
    if (sync.startsWith("edited") || sync.startsWith("stale")) return "warning";
    if (sync.startsWith("in sync") || sync.endsWith("no problems")) return "ok";
    return "quiet";
  });

  let typing = $state("");
  let box = $state<HTMLInputElement | null>(null);
  let drawer = $state<HTMLElement | null>(null);

  /** Put the keyboard in the console: what ⌃` and the palette do. */
  export function focus(): void {
    box?.focus();
  }

  function key(event: KeyboardEvent): void {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      // ⌘↵ copies the line into the script at the cursor; the line is recalled by ↑.
      event.preventDefault();
      const line = typing;
      if (line.trim() !== "" && !line.trim().startsWith(":")) typing = "";
      void workspace.copyIntoScript(line);
    } else if (event.key === "Enter" && !event.metaKey && !event.ctrlKey) {
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
    } else if (event.key === "Tab" && typing.trim() !== "") {
      // Tab completes from the language server, as if the statement followed the script.
      event.preventDefault();
      const asked = typing;
      void workspace.completeConsole(asked).then((done) => {
        if (typing === asked) typing = done;
      });
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
          <div class="asked mono">
            <span aria-hidden="true">›</span>
            {entry.statement}{#if !entry.statement.startsWith(":")}<span class="apart"
                >not in the script</span
              >{/if}
          </div>
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
    <button
      class="state {tone}"
      aria-haspopup="dialog"
      title="What the run said: every warning, note and error, with its line"
      onclick={() => (workspace.panel = workspace.panel === "said" ? null : "said")}
      ><i aria-hidden="true"></i>
      <span class="sync" data-testid="sync"
        >{workspace.sync}{workspace.lastRun !== null &&
        !workspace.lastRun.checkOnly &&
        !workspace.running &&
        workspace.refusedErrors === 0 &&
        workspace.sync !== workspace.checked?.summary
          ? ` · ${workspace.warnings} warning${workspace.warnings === 1 ? "" : "s"}`
          : ""}</span
      ></button
    >
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

    {#if workspace.reminder !== null}
      <span class="reminder" data-testid="reminder">{workspace.reminder}</span>
      <button class="export" onclick={() => void workspace.exportProject()}>Export project…</button>
    {/if}
    <span class="keys mono" aria-hidden="true">{mac ? "⌘↵ run · ⌘K" : "Ctrl ↵ run · Ctrl K"}</span>
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
  .state {
    align-items: center;
    background: none;
    border: 0;
    border-radius: 6px;
    color: inherit;
    cursor: pointer;
    font: inherit;
    padding: 2px 6px;
    display: inline-flex;
    flex: none;
    gap: 7px;
  }
  .state i {
    background: var(--ink-3);
    border-radius: 50%;
    display: block;
    height: 7px;
    width: 7px;
  }
  .state.ok i {
    background: var(--ok);
  }
  .state.warning i {
    background: var(--warning);
  }
  .state.error i {
    background: var(--error);
  }
  .state.error .sync {
    color: var(--error);
  }
  .state.warning .sync {
    color: var(--warning);
  }
  .keys {
    color: var(--ink-3);
    flex: none;
    font-size: 12.5px;
  }
  /* The reminder to export: quiet words, and the one thing to press beside them. */
  .reminder {
    color: var(--ink-3);
    flex: 0 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .export {
    background: none;
    border: 0;
    border-radius: 6px;
    color: var(--accent);
    cursor: pointer;
    flex: none;
    font: inherit;
    padding: 2px 6px;
  }
  .export:hover {
    background: var(--soft);
  }
  .export:focus-visible {
    outline: 2px solid var(--accent);
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
  .apart {
    color: var(--ink-3);
    font-family: "Atkinson Hyperlegible Next", sans-serif;
    font-size: 12.5px;
    margin-left: 10px;
  }
  .said,
  .told {
    margin: 2px 0 0 16px;
  }
  .told {
    white-space: pre-wrap;
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
