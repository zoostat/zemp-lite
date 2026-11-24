<script lang="ts">
  import type { Snippet } from "svelte";
  // A help page set in type (release 0.2.1, step 10b; the owner's choice of 22 November 2026,
  // the mockup's look C). The engine prints a page for a terminal; `read.ts` reads the print
  // into its parts, and this sets them: the name as the title, what it does under it, its
  // facts as small labels; headings; prose in the app's type with code in the code's; each
  // argument with its type; warnings and notes by code; the usage and the examples as code in
  // the editor's colours, what an example printed kept as printed and scrolled inside its
  // block, never broken. Every word is the engine's: nothing here writes one. A function named
  // in the prose, a related name and a code each open their own page.
  import Code from "../editor/Code.svelte";
  import { pieces, type Block, type ExampleLine, type HelpDoc } from "./read";

  let {
    doc,
    of,
    under,
    onname,
    oncode,
  }: {
    doc: HelpDoc;
    /** What stands under the page's title: the list of its sections, in a narrow window. */
    under?: Snippet;
    /** Which function of its name the page is of, where the name has two: "of a frame" (#215). */
    of?: string;
    /** Open the page of a function. */
    onname: (name: string) => void;
    /** Open the page of a code. */
    oncode: (code: string) => void;
  } = $props();

  /** What the print opens a statement typed with. */
  const PROMPT = "> ";
  /** The break between two lines of code, kept as the print has it. */
  const BREAK = "\n";
</script>

<!-- A line of prose: code, the functions and codes it names as links, a reference's titles. -->
{#snippet prose(text: string, titles: boolean = false)}
  {#each pieces(text, titles) as piece, at (at)}{#if piece.kind === "text"}{piece.text}{:else if piece.kind === "code"}<code
        class="mono chip">{piece.text}</code
      >{:else if piece.kind === "call"}<button
        class="mono chip link"
        title="Open the page of {piece.name}"
        onclick={() => onname(piece.name)}>{piece.text}</button
      >{:else if piece.kind === "coded"}<button
        class="mono coded link"
        title="Open the page of {piece.text}"
        onclick={() => oncode(piece.text)}>{piece.text}</button
      >{:else}<em>{piece.text}</em>{/if}{/each}
{/snippet}

<!-- Names, each a link to its own page. -->
{#snippet names(all: string[])}
  <ul class="names">
    {#each all as name (name)}
      <li>
        <button class="mono chip link" title="Open the page of {name}" onclick={() => onname(name)}
          >{name}</button
        >
      </li>
    {/each}
  </ul>
{/snippet}

<!-- Statements typed and what they printed, as printed: the block scrolls, no line is broken. -->
{#snippet example(lines: ExampleLine[])}
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <pre
    class="mono block example"
    role="group"
    aria-label="Example"
    tabindex="0">{#each lines as line, at (at)}{#if at > 0}{BREAK}{/if}{#if line.typed}<span
          class="prompt">{PROMPT}</span
        ><Code text={line.text} inline />{:else}<span class="printed">{line.text}</span
        >{/if}{/each}</pre>
{/snippet}

{#snippet blocks(all: Block[])}
  {#each all as block, at (at)}
    {#if block.kind === "usage"}
      <pre class="mono block usage"><Code text={block.code} inline /></pre>
    {:else if block.kind === "arguments"}
      <dl class="arguments">
        {#each block.rows as row, index (index)}
          <dt>
            <code class="mono argument">{row.name}</code>
            <code class="mono type">{row.type}</code>
            {#if row.shared}
              <span class="shared" title="This description is shared with other functions"
                >shared</span
              >
            {/if}
          </dt>
          <dd>{@render prose(row.text)}</dd>
        {/each}
      </dl>
    {:else if block.kind === "codes"}
      <table class="codes">
        <tbody>
          {#each block.rows as row, index (index)}
            <tr>
              <th scope="row">
                {#if row.kind === "note"}
                  <span class="mono badge note">{row.key}</span>
                {:else}
                  <button
                    class="mono badge {row.kind}"
                    title="Open the page of {row.key}"
                    onclick={() => oncode(row.key)}>{row.key}</button
                  >
                {/if}
              </th>
              <td>{@render prose(row.text)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {:else if block.kind === "value"}
      {#each block.parts as part, index (index)}
        {#if part.kind === "text"}
          <p>{@render prose(part.text)}</p>
        {:else}
          <div class="answers">
            <span class="label">{part.label}</span>
            {@render names(part.names)}
          </div>
        {/if}
      {/each}
    {:else if block.kind === "references"}
      <ul class="references">
        {#each block.items as item, index (index)}
          <li>{@render prose(item, true)}</li>
        {/each}
      </ul>
    {:else if block.kind === "names"}
      {@render names(block.names)}
    {:else if block.kind === "example"}
      {@render example(block.lines)}
    {:else if block.kind === "paragraph"}
      <p>{@render prose(block.text)}</p>
    {:else if block.kind === "subheading"}
      <h5>{block.text}</h5>
    {:else if block.kind === "list"}
      <ul class="list">
        {#each block.items as item, index (index)}
          <li>{@render prose(item)}</li>
        {/each}
      </ul>
    {:else if block.kind === "table"}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div class="scroll" role="group" aria-label="Table" tabindex="0">
        <table class="compare">
          <thead>
            <tr>
              {#each block.head as cell, index (index)}<th scope="col">{cell}</th>{/each}
            </tr>
          </thead>
          <tbody>
            {#each block.rows as row, index (index)}
              <tr>
                {#each row as cell, column (column)}
                  <td><code class="mono">{cell}</code></td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else}
      <pre class="mono block">{block.lines.join(BREAK)}</pre>
    {/if}
  {/each}
{/snippet}

<article class="formatted" data-testid="help-page">
  {#each doc.notes as note (note.line)}
    <p class="said" data-line={note.line}>{@render prose(note.text)}</p>
  {/each}
  {#each doc.entries as entry, at (entry.line)}
    <section class="entry">
      <header data-line={entry.line}>
        <h3>
          <span class="mono">{entry.name}</span>{#if of !== undefined}<span class="of">· {of}</span
            >{/if}
        </h3>
        <p class="does">{entry.does}</p>
        {#if entry.facts.length > 0}
          <ul class="facts" aria-label="Facts of {entry.name}">
            {#each entry.facts as fact, at (at)}<li>{fact}</li>{/each}
          </ul>
        {/if}
      </header>
      {#if at === 0}{@render under?.()}{/if}
      {#each entry.sections as section (section.line)}
        <section data-line={section.line} aria-labelledby="help-{section.line}">
          <h4 id="help-{section.line}">{section.title}</h4>
          {@render blocks(section.blocks)}
        </section>
      {/each}
      {#each entry.notes as note (note.line)}
        <p class="said after" data-line={note.line}>{@render prose(note.text)}</p>
      {/each}
    </section>
  {/each}
</article>

<style>
  .formatted {
    color: var(--ink);
    font-size: calc(var(--code-size, 14px) + 1px);
    line-height: 1.65;
    max-width: 800px;
  }
  p {
    margin: 0 0 0.7em;
  }
  .entry + .entry {
    border-top: 1px solid var(--line-strong);
    margin-top: 34px;
    padding-top: 26px;
  }
  header {
    border-bottom: 1px solid var(--line-strong);
    margin-bottom: 4px;
    padding-bottom: 14px;
  }
  h3 {
    font-size: calc(var(--code-size, 14px) + 13px);
    font-weight: 600;
    line-height: 1.2;
    margin: 0;
    overflow-wrap: anywhere;
  }
  /* Which function of its name the page is of: in the app's type, lighter than the name. */
  h3 .of {
    color: var(--ink-2);
    font-weight: 400;
    margin-left: 0.4em;
  }
  .does {
    color: var(--ink-2);
    font-size: 1.12em;
    margin: 6px 0 10px;
  }
  .facts {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .facts li {
    background: var(--soft);
    border: 1px solid var(--line);
    border-radius: 20px;
    color: var(--ink-2);
    font-size: 12.5px;
    line-height: 1.5;
    padding: 1px 10px;
  }
  section section {
    padding-top: 6px;
  }
  h4 {
    font-size: 1.05em;
    font-weight: 700;
    letter-spacing: 0.1px;
    margin: 22px 0 8px;
  }
  h5 {
    font-size: 1em;
    font-weight: 600;
    margin: 16px 0 6px;
  }
  .chip,
  .coded,
  .argument,
  .type,
  .compare code {
    font-size: max(12.5px, 0.86em);
  }
  code.chip {
    background: var(--soft);
    border: 1px solid var(--line);
    border-radius: 4px;
    overflow-wrap: anywhere;
    padding: 0 4px;
  }
  button.link,
  button.badge {
    border: 0;
    cursor: pointer;
    font-family: inherit;
    line-height: inherit;
  }
  button.mono {
    font-family: "JetBrains Mono", ui-monospace, Menlo, monospace;
  }
  button.chip {
    background: var(--accent-soft);
    border-radius: 4px;
    color: var(--accent);
    padding: 0 5px;
  }
  button.coded {
    background: none;
    border-bottom: 1px dotted currentColor;
    color: var(--accent);
    padding: 0;
  }
  button.link:hover,
  button.badge:hover {
    text-decoration: underline;
  }
  button:focus-visible,
  [tabindex]:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
  .block {
    background: var(--soft);
    border: 1px solid var(--line);
    border-radius: 8px;
    font-size: calc(var(--code-size, 14px) - 1px);
    line-height: 1.55;
    margin: 0 0 0.7em;
    overflow-x: auto;
    padding: 12px 14px;
    white-space: pre;
  }
  /* The usage is one statement: it breaks at the pane's edge, its later lines set in. */
  .usage {
    overflow-wrap: anywhere;
    padding-left: calc(14px + 4ch);
    text-indent: -4ch;
    white-space: pre-wrap;
  }
  .prompt {
    color: var(--ink-3);
    user-select: none;
  }
  .printed {
    color: var(--ink-2);
  }
  .arguments {
    margin: 0;
  }
  .arguments dt {
    align-items: baseline;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 14px;
  }
  .arguments dt:first-child {
    margin-top: 4px;
  }
  .argument {
    font-size: max(12.5px, 0.92em);
    font-weight: 600;
  }
  .type {
    background: var(--soft);
    border-radius: 4px;
    color: var(--ink-2);
    overflow-wrap: anywhere;
    padding: 0 6px;
  }
  .shared {
    border: 1px solid var(--line-strong);
    border-radius: 10px;
    color: var(--ink-3);
    font-size: 12.5px;
    line-height: 1.4;
    padding: 0 7px;
  }
  .arguments dd {
    margin: 3px 0 0;
  }
  .answers {
    align-items: baseline;
    display: grid;
    gap: 6px 14px;
    grid-template-columns: 11em minmax(0, 1fr);
    margin: 0 0 6px;
  }
  .label {
    color: var(--ink-3);
    font-size: max(12.5px, 0.9em);
  }
  .names {
    display: flex;
    flex-wrap: wrap;
    gap: 5px 6px;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .codes {
    border-collapse: collapse;
  }
  .codes th {
    font-weight: 400;
    padding: 5px 14px 5px 0;
    text-align: left;
    vertical-align: top;
    white-space: nowrap;
  }
  .codes td {
    padding: 5px 0;
    vertical-align: top;
  }
  .codes tr + tr th,
  .codes tr + tr td {
    border-top: 1px solid var(--line);
  }
  .badge {
    border-radius: 5px;
    display: inline-block;
    font-size: 12.5px;
    padding: 1px 7px;
  }
  .badge.note {
    background: var(--soft);
    color: var(--ink-2);
  }
  .badge.warning {
    background: var(--warning-soft);
    color: var(--warning);
  }
  .badge.error {
    background: var(--error-soft);
    color: var(--error);
  }
  .references {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .references li {
    margin-bottom: 7px;
    padding-left: 1.6em;
    text-indent: -1.6em;
  }
  .list {
    margin: 0 0 0.7em;
    padding-left: 1.3em;
  }
  .list li {
    margin-bottom: 4px;
  }
  .scroll {
    margin: 0 0 0.7em;
    overflow-x: auto;
  }
  .compare {
    border-collapse: collapse;
  }
  .compare th {
    color: var(--ink-3);
    font-size: max(12.5px, 0.9em);
    font-weight: 600;
    padding: 4px 18px 4px 0;
    text-align: left;
  }
  .compare td {
    border-top: 1px solid var(--line);
    padding: 5px 18px 5px 0;
    vertical-align: top;
  }
  .said.after {
    color: var(--ink-2);
    margin-top: 22px;
  }
</style>
