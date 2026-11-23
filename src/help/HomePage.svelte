<script lang="ts">
  // Home, the page Help starts on (release 0.2.3, step 4; the row of 0.2.3; #211, part 1 and
  // "Placed"): the **Index of functions**, until the methods arrive with the engine. Under the
  // title, the engine and the counts; then each package the engine ships, a heading with its
  // count, and its functions as links in as many columns as there is room for; the shipped
  // datasets under `datasets`. Only what this engine runs is listed. The names alone are set
  // (the owner's answer to question 2): a function's one line is shown while the pointer or
  // the keyboard rests on its name. Every name and every one line is the engine's.
  import type { HelpIndex } from "../engine/messages";
  import type { Stop } from "./history";
  import { HOME_TITLE, countsOf } from "./pages";

  let {
    index,
    onopen,
  }: {
    index: HelpIndex;
    /** Open a page: a function's, a dataset's or a package's. */
    onopen: (to: Stop) => void;
  } = $props();

  /** How long the pointer rests on a name before its one line is shown, in milliseconds. */
  const REST = 350;

  // The one line shown, and where: under the name rested on, kept inside the window.
  let resting = $state<{ words: string; left: number; top: number; of: HTMLElement } | null>(null);
  let waiting: ReturnType<typeof setTimeout> | null = null;

  function show(of: HTMLElement, words: string): void {
    const box = of.getBoundingClientRect();
    const left = Math.max(8, Math.min(box.left, window.innerWidth - 368));
    resting = { words, left, top: box.bottom + 5, of };
  }
  function rest(event: Event, words: string, wait: number): void {
    const of = event.currentTarget as HTMLElement;
    if (waiting !== null) clearTimeout(waiting);
    waiting = setTimeout(() => show(of, words), wait);
  }
  function leave(): void {
    if (waiting !== null) clearTimeout(waiting);
    waiting = null;
    resting = null;
  }
  function keys(event: KeyboardEvent): void {
    if (event.key === "Escape" && resting !== null) leave();
  }
  /** The page scrolled (a name the Tab key reached is brought into view): the line follows its name. */
  function follow(): void {
    if (resting !== null) show(resting.of, resting.words);
  }
</script>

<!-- A name of a list: a link, its one line shown while the pointer or the keyboard rests on it. -->
{#snippet link(name: string, words: string)}
  <li>
    <button
      class="mono name"
      aria-describedby={resting?.words === words ? "help-home-line" : undefined}
      onclick={() => onopen({ kind: "name", name })}
      onpointerenter={(event) => rest(event, words, REST)}
      onpointerleave={leave}
      onfocus={(event) => rest(event, words, 0)}
      onblur={leave}>{name}</button
    >
  </li>
{/snippet}

<svelte:window onkeydown={keys} onscrollcapture={follow} />

<article class="home" data-testid="help-page">
  <header>
    <h3>{HOME_TITLE}</h3>
    <p class="counts" data-testid="help-counts">{countsOf(index)}</p>
  </header>
  {#each index.packages as one, line (one.name)}
    <section data-line={line} aria-labelledby="help-home-{one.name}">
      <h4 id="help-home-{one.name}">
        <button
          class="mono package"
          title="Open the page of the package {one.name}"
          onclick={() => onopen({ kind: "package", name: one.name })}>{one.name}</button
        >
        <small>{one.functions.length}</small>
      </h4>
      <ul class="names" aria-label="The functions of {one.name}">
        {#each one.functions as f (f.name)}
          {@render link(f.name, f.summary)}
        {/each}
      </ul>
      {#if one.name === "datasets" && index.datasets.length > 0}
        <h5 id="help-home-shipped">Datasets <small>{index.datasets.length}</small></h5>
        <ul class="names" aria-labelledby="help-home-shipped">
          {#each index.datasets as d (d.name)}
            {@render link(d.name, d.summary)}
          {/each}
        </ul>
      {/if}
    </section>
  {/each}
</article>

{#if resting !== null}
  <div
    class="line"
    id="help-home-line"
    role="tooltip"
    style:left="{resting.left}px"
    style:top="{resting.top}px"
  >
    {resting.words}
  </div>
{/if}

<style>
  .home {
    color: var(--ink);
    font-size: calc(var(--code-size, 14px) + 1px);
    line-height: 1.65;
  }
  header {
    margin-bottom: 6px;
  }
  h3 {
    font-size: calc(var(--code-size, 14px) + 13px);
    font-weight: 600;
    line-height: 1.2;
    margin: 0 0 4px;
  }
  .counts {
    color: var(--ink-2);
    margin: 0;
  }
  h4,
  h5 {
    align-items: baseline;
    border-bottom: 1px solid var(--line-strong);
    display: flex;
    font-size: 1.05em;
    font-weight: 700;
    justify-content: space-between;
    margin: 24px 0 8px;
    padding-bottom: 5px;
  }
  h5 {
    border-bottom-color: var(--line);
    font-size: 1em;
    font-weight: 600;
    margin-top: 14px;
  }
  small {
    color: var(--ink-3);
    font-size: 12.5px;
    font-weight: 400;
  }
  /* As many columns as there is room for; a name is never cut across two. */
  .names {
    column-gap: 24px;
    column-width: 150px;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li {
    break-inside: avoid;
    padding: 1px 0;
  }
  button {
    background: none;
    border: 0;
    border-radius: 4px;
    cursor: pointer;
    font-family: "JetBrains Mono", ui-monospace, Menlo, monospace;
    line-height: inherit;
    padding: 0 3px;
  }
  .name {
    color: var(--accent);
    font-size: max(12.5px, 0.9em);
    margin-left: -3px;
    max-width: 100%;
    overflow-wrap: anywhere;
    text-align: left;
  }
  .package {
    color: var(--ink);
    font-size: 1em;
    font-weight: 700;
    margin-left: -3px;
  }
  button:hover {
    text-decoration: underline;
  }
  button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
  .line {
    background: var(--window);
    border: 1px solid var(--line-strong);
    border-radius: 7px;
    box-shadow: 0 6px 22px rgb(0 0 0 / 14%);
    color: var(--ink);
    font-size: 13px;
    line-height: 1.45;
    max-width: 360px;
    padding: 5px 10px;
    pointer-events: none;
    position: fixed;
    z-index: 30;
  }
</style>
