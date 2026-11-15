<script lang="ts">
  // One block of a run: what a statement printed and what the engine said of it. In the Panes
  // layout it is a card in the Output panel, under a line saying which line it is and how
  // long it took; in the Inline layout it sits directly under its statement in the script,
  // with the time or the state in the margin.
  import { took, type Block, type Said } from "./run";

  let {
    block,
    edited,
    inline = false,
    oncancel,
  }: {
    block: Block;
    /** The script has been edited since this ran: the block is not the script's any more. */
    edited: boolean;
    inline?: boolean;
    oncancel?: () => void;
  } = $props();

  const label: Record<Said["kind"], string> = { warning: "warning", note: "note", error: "error" };
</script>

<section
  class="block {block.state}"
  class:inline
  class:edited
  data-testid="block"
  data-line={block.line ?? ""}
>
  <header>
    {#if !inline}
      <span class="line mono"
        >{block.line === null ? "after the script" : `line ${block.line}`}</span
      >
      <span class="gap"></span>
    {/if}
    {#if edited}
      <span class="state warn">edited · not run</span>
    {:else if block.state === "running"}
      <span class="running" data-testid="running"
        ><i aria-hidden="true"></i>running{block.pass === null
          ? "…"
          : ` · pass ${block.pass.pass.toLocaleString("en-GB")}${block.pass.of === null ? "" : ` of ${block.pass.of.toLocaleString("en-GB")}`}`}</span
      >
      {#if inline && oncancel}
        <button class="cancel" onclick={oncancel}>Cancel</button>
      {/if}
    {:else}
      {#if inline && block.state === "failed"}<span class="state bad">failed</span>{/if}
      {#if block.ms !== null}<span class="time" data-testid="time">{took(block.ms)}</span>{/if}
    {/if}
  </header>
  <div class="body">
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
  </div>
</section>

<style>
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
  /* Output that is no longer the script's: dashed and faded, with its reason. */
  .block.edited {
    border-style: dashed;
  }
  .block.edited .body {
    opacity: 0.55;
  }
  /* Inline: the output in a soft box under its statement, the time or state in a margin of
     120 pixels at the right (Zemp Specification, section 5, "The look"). */
  .block.inline {
    background: none;
    border: 0;
    border-radius: 0;
    display: grid;
    font-family: "Atkinson Hyperlegible Next", sans-serif;
    gap: 0 12px;
    grid-template-columns: minmax(0, 1fr) 120px;
    line-height: 1.5;
    margin: 0;
    padding: 0 0 0 16px;
  }
  .block.inline header {
    align-items: flex-end;
    flex-direction: column;
    gap: 4px;
    grid-column: 2;
    grid-row: 1;
    padding-top: 10px;
    text-align: right;
  }
  .block.inline .body {
    background: var(--soft);
    border: 1px solid transparent;
    border-radius: 10px;
    grid-column: 1;
    grid-row: 1;
    min-width: 0;
    padding: 6px 16px 12px;
  }
  .block.inline.failed .body {
    border-color: color-mix(in srgb, var(--error) 45%, var(--line));
  }
  .block.inline.edited .body {
    border: 1px dashed var(--line-strong);
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
  .state.warn {
    color: var(--warning);
  }
  .state.bad {
    color: var(--error);
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
    flex: none;
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
  .cancel {
    background: var(--window);
    border: 1px solid var(--line-strong);
    border-radius: 7px;
    color: var(--ink-2);
    font-size: 12.5px;
    padding: 2px 10px;
  }
  pre {
    font-size: calc(var(--code-size, 14px) - 1px);
    line-height: 1.6;
    margin: 6px 0 0;
    overflow-x: auto;
  }
  .said {
    border-radius: 8px;
    font-size: 13.5px;
    line-height: 1.5;
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
