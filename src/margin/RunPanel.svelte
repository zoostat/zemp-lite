<script lang="ts">
  // What floats over the window about the last run (the margin editor's design, 7.12 and
  // 7.16.5): the run's facts, opened from the results bar, and what the run said, opened from
  // the state at the foot. Every word and number is the engine's but the times, which the
  // interface measures between the engine's messages until the engine reports them, and says
  // so. Escape closes it, and the focus goes back where it was.
  import { onMount } from "svelte";
  import type { Workspace } from "../app/workspace-state.svelte";
  import { blocks, said, took, type Said } from "../output/run";
  import { counted } from "./notes";

  let {
    workspace,
    kind,
    onclose,
  }: {
    workspace: Workspace;
    kind: "facts" | "said";
    onclose: () => void;
  } = $props();

  const run = $derived(workspace.lastRun);
  const lines = $derived(run === null ? [] : run.text.split("\n"));
  /** The first line of a statement's text, trimmed, for a list. */
  const lineText = (line: number) => (lines[line - 1] ?? "").trim();

  // Where the time went: the statements by the time they took, each with its share of the run.
  const times = $derived(
    run === null
      ? []
      : run.statements
          .filter((one) => one.ms !== null && one.mark === undefined)
          .map((one) => ({ line: one.line, ms: one.ms as number }))
          .sort((a, b) => b.ms - a.ms),
  );
  const total = $derived(times.reduce((sum, one) => sum + one.ms, 0));
  // Where the memory went: the frames by the bytes the engine counts for them.
  const memory = $derived(
    run === null
      ? []
      : run.info
          .flatMap((one) =>
            one.memory === null ? [] : [{ line: one.line, name: one.name ?? "", ...one.memory }],
          )
          .sort((a, b) => b.own - a.own),
  );
  // Where the seed is set: the engine's dependency graph knows, so it is asked.
  let seeds = $state<number[] | null>(null);
  onMount(() => {
    if (kind !== "facts" || run === null) return;
    void workspace.session
      .dependencies(run.script, run.text)
      .then((graph) => (seeds = graph.filter((one) => one.seeds).map((one) => one.line)))
      .catch(() => (seeds = []));
  });

  // What the run said: every message, in the order of the script, statistical warnings apart.
  const messages = $derived.by(() => {
    if (run === null) return [] as Said[];
    const all = [...said(run.beforeRaw), ...blocks(run).flatMap((one) => one.said)];
    return all.filter(
      (one, at) =>
        all.findIndex((other) => other.raw === one.raw && other.line === one.line) === at,
    );
  });
  const statistical = $derived(messages.filter((one) => one.code?.startsWith("W1") ?? false));
  const others = $derived(messages.filter((one) => !(one.code?.startsWith("W1") ?? false)));

  let panel = $state<HTMLElement | null>(null);
  onMount(() => {
    const before = document.activeElement as HTMLElement | null;
    panel?.focus();
    return () => before?.focus();
  });
  function key(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      onclose();
    }
  }
  const go = (line: number) => {
    if (run !== null) void workspace.goTo(run.script, line);
    onclose();
  };
</script>

<div
  class="panel"
  role="dialog"
  tabindex="-1"
  aria-label={kind === "facts" ? "The run's facts" : "What the run said"}
  data-testid={kind === "facts" ? "run-record" : "run-said"}
  bind:this={panel}
  onkeydown={key}
>
  <header>
    <h2>{kind === "facts" ? "The run" : "What the run said"}</h2>
    <button class="act" onclick={onclose}>Close</button>
  </header>
  {#if run === null}
    <p class="quiet">Nothing has run yet.</p>
  {:else if kind === "facts"}
    <p>
      engine Zeff {workspace.engineVersion ?? "…"} · run {run.number} · {run.clock}{run.ms === null
        ? ""
        : ` · ${took(run.ms)}`}{run.partial === null ? "" : " · of part of the script"}
    </p>
    <p data-testid="seeds">
      {#if seeds === null}
        …
      {:else if seeds.length === 0}
        No statement sets the seed.
      {:else}
        The seed is set at line{seeds.length === 1 ? "" : "s"}
        {#each seeds as line, at (line)}{at > 0 ? ", " : " "}<button
            class="act"
            onclick={() => go(line)}>{line}</button
          >{/each}.
      {/if}
    </p>
    <h3>Where the time went</h3>
    <ol class="list" data-testid="times">
      {#each times as one (one.line)}
        <li>
          <button class="act" onclick={() => go(one.line)}>line {one.line}</button>
          <span class="mono what">{lineText(one.line)}</span>
          <span class="num">{took(one.ms)}</span>
          <span class="num quiet">{total > 0 ? `${Math.round((100 * one.ms) / total)}%` : ""}</span>
        </li>
      {/each}
    </ol>
    <h3>Where the memory went</h3>
    {#if memory.length === 0}
      <p class="quiet">No frame was bound.</p>
    {:else}
      <ol class="list" data-testid="memory">
        {#each memory as one (one.line)}
          <li>
            <button class="act" onclick={() => go(one.line)}>line {one.line}</button>
            <span class="mono what">{one.name}</span>
            <span class="num">{counted(one.own)} bytes</span>
            {#if one.kept > 0}<span class="num quiet">keeping {counted(one.kept)} of a parent</span
              >{/if}
          </li>
        {/each}
      </ol>
    {/if}
    <p class="quiet small">
      The times are measured by Zemp Lite between the engine's messages; the bytes are the engine's
      count. Full run records, with the inputs and outputs of every run, come with Zeff 0.11.0.
    </p>
  {:else}
    {#if messages.length === 0}
      <p class="quiet">The run said nothing.</p>
    {/if}
    {#each [{ title: "Statistical warnings", list: statistical }, { title: "Warnings, notes and errors", list: others }] as group (group.title)}
      {#if group.list.length > 0}
        <h3>{group.title}</h3>
        <ol
          class="list"
          data-testid={group.title === "Statistical warnings" ? "statistical" : "said-list"}
        >
          {#each group.list as one, at (at)}
            <li class={one.kind}>
              <span class="kind">{one.kind}</span>
              {#if one.code !== null}<span class="mono code">{one.code}</span>{/if}
              <span class="what">{one.sentence}</span>
              {#if one.line !== null}
                {@const line = one.line}
                <button class="act" onclick={() => go(line)}>line {line}</button>
              {/if}
            </li>
          {/each}
        </ol>
      {/if}
    {/each}
  {/if}
</div>

<style>
  .panel {
    background: var(--window);
    border: 1px solid var(--line);
    border-radius: 12px;
    box-shadow: 0 8px 30px color-mix(in srgb, var(--ink) 14%, transparent);
    color: var(--ink);
    font-size: 13.5px;
    max-height: min(70vh, 620px);
    max-width: min(720px, calc(100vw - 32px));
    overflow: auto;
    padding: 12px 18px 16px;
    position: fixed;
    right: 24px;
    top: 96px;
    width: 640px;
    z-index: 30;
  }
  .panel:focus {
    outline: none;
  }
  header {
    align-items: center;
    display: flex;
    justify-content: space-between;
  }
  h2 {
    font-family: Newsreader, Georgia, serif;
    font-size: 20px;
    font-weight: 400;
    margin: 0;
  }
  h3 {
    color: var(--ink-2);
    font-size: 13.5px;
    font-weight: 500;
    margin: 14px 0 4px;
  }
  p {
    margin: 6px 0;
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .list li {
    align-items: baseline;
    border-bottom: 1px solid var(--line);
    display: flex;
    gap: 10px;
    padding: 3px 0;
  }
  .what {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .num {
    font-variant-numeric: tabular-nums;
  }
  .quiet {
    color: var(--ink-3);
  }
  .small {
    font-size: 12.5px;
    margin-top: 12px;
  }
  .kind {
    font-weight: 600;
  }
  .warning .kind,
  .warning .code {
    color: var(--warning);
  }
  .error .kind,
  .error .code {
    color: var(--error);
  }
  .note .kind {
    color: var(--ink-2);
  }
  .act {
    background: none;
    border: 0;
    border-radius: 6px;
    color: var(--accent);
    cursor: pointer;
    font: inherit;
    padding: 1px 4px;
  }
  .act:hover {
    background: var(--soft);
  }
</style>
