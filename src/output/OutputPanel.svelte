<script lang="ts">
  // The body of the Output panel: each statement's printed output under the line that made
  // it, with the line number and its time; a warning as a card with its code and its
  // sentence; an error under its line; a mark on the statement that is running. When the
  // script has been edited since, the whole is marked "edited · not run".
  import { blocks, took, type Run, type Said } from "./run";

  let { run, edited }: { run: Run | null; edited: boolean } = $props();

  const shown = $derived(run === null ? [] : blocks(run));

  const label: Record<Said["kind"], string> = { warning: "warning", note: "note", error: "error" };
</script>

<div class="results" class:edited>
  {#if edited}
    <p class="mark" role="note">edited · not run</p>
  {/if}
  {#if run === null}
    <p class="none">Press Run to see each result under the line that made it.</p>
  {:else if shown.length === 0 && run.state !== "running"}
    <p class="none">The script ran and printed nothing.</p>
  {/if}
  {#each shown as block, at (at)}
    <section class="block {block.state}" data-testid="block" data-line={block.line ?? ""}>
      <header>
        <span class="line mono"
          >{block.line === null ? "after the script" : `line ${block.line}`}</span
        >
        <span class="gap"></span>
        {#if block.state === "running"}
          <span class="running" data-testid="running"
            ><i aria-hidden="true"></i>running{block.pass === null
              ? "…"
              : ` · pass ${block.pass.pass.toLocaleString("en-GB")}${block.pass.of === null ? "" : ` of ${block.pass.of.toLocaleString("en-GB")}`}`}</span
          >
        {:else if block.ms !== null}
          <span class="time" data-testid="time">{took(block.ms)}</span>
        {/if}
      </header>
      {#if block.printed !== ""}
        <pre class="mono printed" data-testid="printed">{block.printed}</pre>
      {/if}
      {#each block.said as one, index (index)}
        <div class="said {one.kind}" data-testid="said">
          <p class="first">
            <span class="kind">{label[one.kind]}</span>
            {#if one.code !== null}<span class="code mono">{one.code}</span>{/if}
            <span class="sentence">{one.sentence}</span>
          </p>
          {#if one.detail !== ""}<pre class="mono detail">{one.detail}</pre>{/if}
          {#each one.help as help (help)}
            <p class="help">{help}</p>
          {/each}
        </div>
      {/each}
    </section>
  {/each}
</div>

<style>
  .results {
    display: grid;
    gap: 10px;
  }
  .none {
    color: var(--ink-3);
    margin: 4px 0;
  }
  /* Output that is no longer the script's: dashed and faded, with its reason. */
  .edited .block {
    border-style: dashed;
    opacity: 0.6;
  }
  .mark {
    border: 1px dashed var(--warning);
    border-radius: 7px;
    color: var(--warning);
    justify-self: start;
    margin: 0;
    padding: 2px 10px;
  }
  .block {
    background: var(--window);
    border: 1px solid var(--line);
    border-radius: 10px;
    min-width: 0;
    padding: 8px 14px 12px;
  }
  .block.failed {
    border-color: color-mix(in srgb, var(--error) 45%, var(--line));
  }
  header {
    align-items: baseline;
    color: var(--ink-3);
    display: flex;
    font-size: 12.5px;
    gap: 10px;
  }
  .gap {
    flex: 1;
  }
  .time {
    font-variant-numeric: tabular-nums;
  }
  .running {
    align-items: center;
    color: var(--accent);
    display: inline-flex;
    gap: 6px;
  }
  .running i {
    animation: beat 1s ease-in-out infinite;
    background: var(--accent);
    border-radius: 50%;
    height: 7px;
    width: 7px;
  }
  @keyframes beat {
    50% {
      opacity: 0.25;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .running i {
      animation: none;
    }
  }
  pre {
    font-size: calc(var(--code-size, 14px) - 1px);
    line-height: 1.6;
    margin: 6px 0 0;
    overflow-x: auto;
  }
  .said {
    border-radius: 8px;
    margin-top: 8px;
    padding: 7px 12px;
  }
  .said p {
    margin: 0;
  }
  .said.warning {
    background: var(--warning-soft);
  }
  .said.error {
    background: var(--error-soft);
  }
  .said.note {
    padding: 2px 0 0;
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
    font-weight: 500;
  }
  .note .sentence {
    color: var(--ink-2);
  }
  .code {
    font-size: 12.5px;
    margin: 0 2px;
  }
  .detail {
    color: var(--ink);
  }
  .help {
    color: var(--ink-2);
    margin-top: 4px !important;
  }
  .help::before {
    content: "help: ";
    font-weight: 500;
  }
</style>
