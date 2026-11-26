<script lang="ts">
  // One block of a run: what a statement printed and what the engine said of it, as a
  // statement's output unfolded under it (#174; the design, 7.4): a header of its lines, its time or state, and its actions (Copy as text,
  // Open in Plots, Fold); then what the engine said, each warning and error with Explain,
  // which opens the engine's explained page in place; then what it printed, or its figure.
  import type { Workspace } from "../app/workspace-state.svelte";
  import { counted } from "../margin/notes";
  import { trailOf } from "../margin/trail";
  import Figure from "../plots/Figure.svelte";
  import { took, type Block, type Said } from "./run";

  let {
    block,
    edited,
    oncancel,
    workspace = null,
    last = null,
    onfold,
    word = "edited · not run",
  }: {
    block: Block;
    /** The script has been edited since this ran: the block is not the script's any more. */
    edited: boolean;
    oncancel?: () => void;
    /** The window, where the block may show the figure of a statement that ended in a plot. */
    workspace?: Workspace | null;
    /** In the margin editor: the last line of the statement, which the block stands under. */
    last?: number | null;
    /** In the margin editor: fold this output away. */
    onfold?: () => void;
    /** What an output that is not the script's is said to be: edited, or stale. */
    word?: string;
  } = $props();

  // The explained pages opened, by code, while they are being fetched `null`.
  let explained = $state<Record<string, string | null>>({});
  async function explain(code: string): Promise<void> {
    if (workspace === null) return;
    if (code in explained) {
      explained = Object.fromEntries(Object.entries(explained).filter(([one]) => one !== code));
      return;
    }
    explained = { ...explained, [code]: null };
    try {
      const page = await workspace.explain(code);
      explained = { ...explained, [code]: page };
    } catch (error) {
      explained = { ...explained, [code]: (error as Error).message };
    }
  }

  // The passes of a loop (#76; the design, 7.16.2): a list of up to 20 is shown whole, a longer
  // one by its first three and its last three until **Show all** is pressed.
  let allPasses = $state(false);
  const passRows = $derived.by(() => {
    const passes = block.passes;
    if (allPasses || passes.length <= 20) return passes.map((pass) => ({ pass, gap: false }));
    return [
      ...passes.slice(0, 3).map((pass) => ({ pass, gap: false })),
      ...passes.slice(-3).map((pass, at) => ({ pass, gap: at === 0 })),
    ];
  });
  const passesOf = $derived(block.passes.at(-1)?.of ?? block.passes.at(-1)?.pass ?? 0);

  /** The lines the block stands under, in words. */
  const lines = $derived(
    block.line === null
      ? "after the script"
      : last !== null && last > block.line
        ? `lines ${block.line}–${last}`
        : `line ${block.line}`,
  );

  // The plot this block's statement ended in, where it did.
  const plot = $derived(workspace?.plots.find((one) => one.line === block.line) ?? null);

  const label: Record<Said["kind"], string> = { warning: "warning", note: "note", error: "error" };
</script>

<section class="block {block.state}" class:edited data-testid="block" data-line={block.line ?? ""}>
  <header>
    <span class="line mono">{lines}</span>
    {#if edited}
      <span class="state warn">{word}</span>
    {:else if block.state === "running"}
      <span class="running" data-testid="running"
        ><i aria-hidden="true"></i>running{block.pass === null
          ? "…"
          : ` · pass ${block.pass.pass.toLocaleString("en-GB")}${block.pass.of === null ? "" : ` of ${block.pass.of.toLocaleString("en-GB")}`}`}</span
      >
      {#if oncancel}
        <button class="cancel" onclick={oncancel}>Cancel</button>
      {/if}
    {:else}
      {#if block.state === "failed"}<span class="state bad">failed</span>{/if}
      {#if block.ms !== null}<span class="time" data-testid="time">{took(block.ms)}</span>{/if}
    {/if}
    {#if workspace !== null && block.line !== null && block.state !== "running"}
      <span class="gap"></span>
      {#if block.printed !== ""}
        <button class="act" onclick={() => void workspace.copyText(block.line as number)}
          >Copy as text</button
        >
      {/if}
      {#if plot !== null}
        <button class="act" onclick={() => workspace.openPlots()}>Open in Plots ↗</button>
      {/if}
      {#if onfold && block.state !== "failed"}
        <button class="act" onclick={onfold}>Fold</button>
      {/if}
    {/if}
  </header>
  <div class="body">
    {#snippet print()}
      {#if block.printed !== ""}
        <pre class="mono printed" data-testid="printed">{block.printed}</pre>
      {/if}
      {#if workspace !== null && plot !== null}
        <Figure {workspace} {plot} />
      {/if}
    {/snippet}
    <!-- What the engine said comes first, then the print (the design, 7.4). -->
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
        {#if workspace !== null && one.kind === "error"}
          {@const trail = trailOf(block.error)}
          {#if trail.length > 0}
            <!-- The error's trail (#183): the chain the engine named, each link a way to its line. -->
            <div class="trail" data-testid="trail">
              <p class="trail-head">The trail</p>
              <ol>
                {#each trail as link, at (at)}
                  <li class:raised={link.raised}>
                    <button class="act" onclick={() => void workspace.goTo(link.file, link.line)}
                      >{link.file}:{link.line}</button
                    >
                    <span class={link.raised ? "sentence" : "mono given"}>{link.text}</span>
                  </li>
                {/each}
              </ol>
            </div>
          {/if}
        {/if}
        {#if workspace !== null && one.code !== null}
          {@const code = one.code}
          <button
            class="act explain"
            aria-expanded={code in explained}
            onclick={() => void explain(code)}>Explain</button
          >
          {#if code.startsWith("Z9")}
            <button class="act" onclick={() => void workspace?.reportProblem()}
              >Report a problem</button
            >
          {/if}
          {#if code in explained}
            <pre class="mono explained" data-testid="explained">{explained[code] ?? "…"}</pre>
          {/if}
        {/if}
      </div>
    {/each}
    {@render print()}
    {#if block.passes.length > 0}
      <div class="passes" data-testid="passes">
        <p class="passes-head">
          Passes <span class="quiet"
            >· {counted(passesOf)} pass{passesOf === 1 ? "" : "es"}{block.passes.length < passesOf
              ? `, ${counted(block.passes.length)} of them reported by the engine`
              : ""}</span
          >
        </p>
        <table>
          <thead>
            <tr><th>pass</th><th>time</th></tr>
          </thead>
          <tbody>
            {#each passRows as { pass, gap }, at (at)}
              {#if gap}
                <tr class="gap-row"><td colspan="2">…</td></tr>
              {/if}
              {@const failed =
                block.state === "failed" && pass === block.passes[block.passes.length - 1]}
              <tr class:failed data-testid="pass">
                <td class="num"
                  >{counted(pass.pass)}{pass.of === null ? "" : ` of ${counted(pass.of)}`}</td
                >
                <td class="num"
                  >{pass.ms === null ? "" : took(pass.ms)}{failed ? " · failed" : ""}</td
                >
              </tr>
            {/each}
          </tbody>
        </table>
        {#if !allPasses && block.passes.length > 20}
          <button class="act" onclick={() => (allPasses = true)}
            >Show all {counted(block.passes.length)}</button
          >
        {/if}
        <p class="quiet small">
          The engine reports each pass by its number, and the interface times it; the loop variable,
          the rows, the result and what each pass said come when the engine reports them.
        </p>
      </div>
    {/if}
  </div>
</section>

<style>
  /* The output unfolded under its statement, across the code's column and the notes' (the
     design, 7.4), on the softer ground with a hairline, a header of words. */
  .block {
    background: var(--softer);
    border: 1px solid var(--line);
    border-radius: 12px;
    display: block;
    font-family: "Atkinson Hyperlegible Next", sans-serif;
    line-height: 1.5;
    margin: 0 calc(-1 * var(--zemp-margin, 0px)) 0 16px;
    min-width: 0;
    padding: 0;
  }
  /* Output that is no longer the script's: dashed and faded, with its reason. */
  .block.edited {
    border-style: dashed;
  }
  .block.edited .body {
    opacity: 0.55;
  }
  .block header {
    align-items: center;
    border-bottom: 1px solid var(--line);
    display: flex;
    gap: 12px;
    padding: 4px 10px 4px 16px;
  }
  .block .body {
    min-width: 0;
    padding: 6px 16px 12px;
  }
  .block.failed {
    border-color: color-mix(in srgb, var(--error) 45%, var(--line));
  }
  .block.edited .body {
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
  .gap {
    flex: 1;
  }
  .act {
    background: none;
    border: 0;
    border-radius: 6px;
    color: var(--ink-2);
    cursor: pointer;
    font: inherit;
    font-size: 12.5px;
    padding: 1px 6px;
  }
  .act:hover {
    background: var(--soft);
    color: var(--accent);
  }
  .act:focus-visible {
    outline: 2px solid var(--accent);
  }
  .explain {
    margin-top: 2px;
  }
  .trail {
    margin-top: 6px;
  }
  .passes {
    margin-top: 8px;
  }
  .passes-head {
    color: var(--ink-2);
    font-weight: 500;
    margin: 0;
  }
  .passes table {
    border-collapse: collapse;
    font-size: 12.5px;
    margin-top: 4px;
  }
  .passes th {
    color: var(--ink-3);
    font-weight: 400;
    padding: 2px 14px 2px 0;
    text-align: left;
  }
  .passes td {
    border-top: 1px solid var(--line);
    padding: 2px 14px 2px 0;
  }
  .passes .num {
    font-variant-numeric: tabular-nums;
  }
  .passes tr.failed td {
    color: var(--error);
  }
  .gap-row td {
    color: var(--ink-3);
  }
  .quiet {
    color: var(--ink-3);
  }
  .small {
    font-size: 12.5px;
  }
  .trail-head {
    color: var(--ink-2);
    font-weight: 500;
  }
  .trail ol {
    margin: 2px 0 0;
    padding-left: 20px;
  }
  .trail li {
    margin: 2px 0;
  }
  .trail .given {
    font-size: 12.5px;
  }
  .explained {
    background: var(--window);
    border-left: 2px solid var(--line-strong);
    font-size: 12.5px;
    margin: 6px 0 0;
    overflow-x: auto;
    padding: 6px 10px;
    white-space: pre;
  }
</style>
