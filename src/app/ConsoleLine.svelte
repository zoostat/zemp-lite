<script lang="ts">
  // The foot of the window (release 0.3.1, step 5; open decision #245): one line of 26 pixels
  // holding the console, which runs a statement without adding it to the script; the state of
  // the page after a coloured dot, which always has its words beside it; the run; its
  // warnings; the note on where the work is kept, with **Export project…**; what was last
  // done; and the engine. The line grows upward into a drawer of what was typed and what came
  // of it; Escape shrinks it again. (The keys it named until 0.3.1 are in the top bar.)
  import { runLine } from "../margin/runline";
  import type { Workspace } from "./workspace-state.svelte";

  let { workspace }: { workspace: Workspace } = $props();

  // The run, in a few words: nothing before the first, which the state beside it says.
  const run = $derived(workspace.lastRun === null ? null : runLine(workspace.lastRun, false));
  // The warnings of the last run, said while the page is in step with it or edited since.
  const warnings = $derived(
    workspace.lastRun !== null &&
      !workspace.lastRun.checkOnly &&
      !workspace.running &&
      workspace.refusedErrors === 0 &&
      workspace.sync !== workspace.checked?.summary
      ? workspace.warnings
      : null,
  );
  // The note on where the work is kept: what the browser does with it, which gives way first
  // where the line has no room, and when the project was last exported, which never does.
  const kept = $derived.by(() => {
    const whole = workspace.reminder;
    if (whole === null) return null;
    const at = whole.lastIndexOf(" · ");
    return at < 0
      ? { first: "", last: whole }
      : { first: whole.slice(0, at), last: whole.slice(at) };
  });
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
    <span class="prompt mono" aria-hidden="true">›</span>
    <input
      class="mono"
      bind:this={box}
      bind:value={typing}
      onkeydown={key}
      onfocus={() => (workspace.consoleOpen = true)}
      disabled={!workspace.ready}
      aria-label="Console: a statement to run without adding it to the script"
      placeholder="Type a statement · ⌃`"
      title="Type a statement and press Return: it runs without being added to the script. ⌃` puts the cursor here."
      autocomplete="off"
      spellcheck="false"
    />
    <button
      class="state {tone}"
      aria-haspopup="dialog"
      title="What the run said: every warning, note and error, with its line"
      onclick={() => (workspace.panel = workspace.panel === "said" ? null : "said")}
      ><i aria-hidden="true"></i>
      <span class="sync" data-testid="sync">{workspace.sync}</span></button
    >
    {#if run !== null}
      <button
        class="run"
        data-testid="foot-run"
        aria-haspopup="dialog"
        title="The run's facts: the engine, the seed, where the time and the memory went"
        onclick={() => (workspace.panel = workspace.panel === "facts" ? null : "facts")}
        >{run}</button
      >
    {/if}
    {#if warnings !== null}
      <button
        class="warnings"
        class:some={warnings > 0}
        data-testid="warnings"
        aria-haspopup="dialog"
        title="What the run said: every warning, note and error, with its line"
        onclick={() => (workspace.panel = workspace.panel === "said" ? null : "said")}
        >{warnings} warning{warnings === 1 ? "" : "s"}</button
      >
    {/if}
    {#if kept !== null}
      <!-- Where the line has no room, what the browser does with the project is cut short
           before anything else is: the whole of the note is then in its title. -->
      <span class="reminder" data-testid="reminder" title={workspace.reminder}
        ><span class="first">{kept.first}</span><span class="last">{kept.last}</span></span
      >
      <button class="export" onclick={() => void workspace.exportProject()}>Export project…</button>
    {/if}
    <span class="status" role="status" title={workspace.status}>{workspace.status}</span>
    <span class="engine">Zeff {workspace.engineVersion ?? "…"} · in this browser</span>
  </div>
</footer>

<style>
  .bottom {
    background: var(--softer);
    border-top: 1px solid var(--line);
    color: var(--ink-3);
    flex: none;
    min-width: 0;
  }
  .line {
    align-items: center;
    box-sizing: border-box;
    display: flex;
    font-size: 12.5px;
    gap: 14px;
    height: 26px;
    overflow: hidden;
    padding: 0 10px;
    white-space: nowrap;
  }
  .line > * {
    flex: none;
  }
  .prompt {
    color: var(--accent);
    font-weight: 700;
    margin-right: -6px;
  }
  /* The console takes what room the line has, and is never left less than a statement needs:
     the note on where the work is kept gives way to it. */
  input {
    background: transparent;
    border: 0;
    color: var(--ink);
    flex: 1 1 0;
    font-size: 12.5px;
    min-width: 200px;
    outline: none;
    padding: 0;
  }
  input::placeholder {
    color: var(--ink-3);
  }
  .state,
  .run,
  .warnings,
  .export {
    background: none;
    border: 0;
    border-radius: 5px;
    color: inherit;
    font: inherit;
    margin: 0 -4px;
    padding: 1px 4px;
  }
  .state:hover,
  .run:hover,
  .warnings:hover,
  .export:hover {
    background: var(--soft);
    color: var(--ink);
  }
  .state:focus-visible,
  .run:focus-visible,
  .warnings:focus-visible,
  .export:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -1px;
  }
  .state {
    align-items: center;
    display: inline-flex;
    gap: 6px;
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
  .state.ok .sync {
    color: var(--ok);
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
  .state.warning .sync,
  .warnings.some {
    color: var(--warning);
  }
  /* The note on where the work is kept: quiet words, and the one thing to press beside them. */
  .reminder {
    display: inline-flex;
    flex: 0 1000 auto;
    min-width: 0;
  }
  .reminder .first {
    flex: 0 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .reminder .last {
    flex: none;
    white-space: pre;
  }
  .export {
    color: var(--accent);
    font-weight: 600;
  }
  .export:hover {
    color: var(--accent);
  }
  /* What was last done is said whole where there is room; a long sentence gives way with the
     note, its whole in its title. */
  [role="status"] {
    flex: 0 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .engine {
    color: var(--ink-2);
  }
  /* Where the pointer is a finger the line's controls are taller than the line is drawn for. */
  @media (pointer: coarse) {
    .line {
      height: 38px;
    }
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
