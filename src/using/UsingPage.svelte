<script lang="ts">
  // A page of Using Zemp Lite, set in the type of the engine's pages (release 0.2.3, step 8a;
  // open decision #211, item 9): the title; what the page is for, in one line; headings;
  // paragraphs and lists, with a control named as the screen names it, a key as a key, code
  // as code, and links to another of these pages or to a page of the engine's. The words are
  // Zemp's, read from the page's own file (`read.ts`).
  import type { Stop } from "../help/history";
  import type { Piece, UsingDoc } from "./read";

  let {
    doc,
    onopen,
  }: {
    doc: UsingDoc;
    /** Open the page a link goes to. */
    onopen: (to: Stop) => void;
  } = $props();
</script>

{#snippet line(pieces: Piece[])}
  {#each pieces as piece, at (at)}{#if piece.kind === "text"}{piece.text}{:else if piece.kind === "control"}<b
        class="control">{piece.text}</b
      >{:else if piece.kind === "code"}<code class="mono">{piece.text}</code
      >{:else if piece.kind === "key"}<kbd>{piece.text}</kbd>{:else}<button
        class="link"
        class:mono={piece.to.kind !== "using"}
        title="Open the page of {piece.text}"
        onclick={() => onopen(piece.to)}>{piece.text}</button
      >{/if}{/each}
{/snippet}

<article class="formatted" data-testid="help-page">
  <header>
    <h3>{doc.title}</h3>
    <p class="does">{doc.line}</p>
  </header>
  {#each doc.blocks as block, at (at)}
    {#if block.kind === "heading"}
      <h4 data-line={block.line}>{block.text}</h4>
    {:else if block.kind === "paragraph"}
      <p>{@render line(block.pieces)}</p>
    {:else if block.kind === "list"}
      <svelte:element this={block.ordered ? "ol" : "ul"}>
        {#each block.items as item, row (row)}
          <li>{@render line(item)}</li>
        {/each}
      </svelte:element>
    {/if}
  {/each}
</article>

<style>
  .formatted {
    color: var(--ink);
    font-size: calc(var(--code-size, 14px) + 1px);
    line-height: 1.65;
    max-width: 760px;
  }
  header {
    border-bottom: 1px solid var(--line-strong);
    margin-bottom: 14px;
    padding-bottom: 12px;
  }
  h3 {
    font-size: calc(var(--code-size, 14px) + 13px);
    font-weight: 600;
    line-height: 1.2;
    margin: 0;
  }
  .does {
    color: var(--ink-2);
    font-size: 1.12em;
    margin: 6px 0 0;
  }
  h4 {
    font-size: 1.05em;
    font-weight: 700;
    letter-spacing: 0.1px;
    margin: 22px 0 8px;
  }
  p {
    margin: 0 0 0.7em;
  }
  :global(article.formatted) :is(ol, ul) {
    margin: 0 0 0.7em;
    padding-left: 1.4em;
  }
  li {
    margin: 0.25em 0;
  }
  .control {
    font-weight: 700;
  }
  code {
    background: var(--soft);
    border: 1px solid var(--line);
    border-radius: 4px;
    font-size: max(12.5px, 0.86em);
    padding: 0 4px;
  }
  kbd {
    background: var(--window);
    border: 1px solid var(--line-strong);
    border-bottom-width: 2px;
    border-radius: 5px;
    font: inherit;
    font-size: max(12.5px, 0.86em);
    padding: 0 5px;
    white-space: nowrap;
  }
  button.link {
    background: none;
    border: 0;
    color: var(--accent);
    cursor: pointer;
    font: inherit;
    padding: 0;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  button.link.mono {
    background: var(--accent-soft);
    border-radius: 4px;
    font-family: "JetBrains Mono", ui-monospace, Menlo, monospace;
    font-size: max(12.5px, 0.86em);
    padding: 0 5px;
    text-decoration: none;
  }
  button.link:hover {
    text-decoration: underline;
  }
  button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
</style>
