<script lang="ts">
  import type { Snippet } from "svelte";
  // Home, the page Help starts on (release 0.2.3, step 9f; open decision #211, item 14, the
  // owner's choice of 24 November 2026): a landing page of soft panels, one under another.
  // Under the title **Help**, a panel for Zeff (its version, what it is, its counts) and one
  // for Zemp Lite (its version, its stage, what it is); then, under **Topics**, a panel for
  // each section of the Topics pane, with its count, a sentence on what it holds and an
  // arrow, a click opening it: **Packages**, with the packages' names as small links inside
  // it; **Errors and warnings**; **Using Zemp Lite**. Zeff's version and every count are the
  // engine's; the words are Zemp's (`home.ts`). The index of functions that stood here at
  // step 4 is gone: every function is reached from its package, from search and from links.
  import { VERSION, shown } from "../app/version";
  import Name from "../theme/Name.svelte";
  import Named from "../theme/Named.svelte";
  import type { CodeFamily, HelpIndex } from "../engine/messages";
  import type { Stop } from "./history";
  import { HOME_WORDS, countsOf, topicPanels } from "./home";

  let {
    index,
    families,
    under,
    onopen,
  }: {
    index: HelpIndex;
    /** What stands under the page's title: the list of its panels, in a narrow window. */
    under?: Snippet;
    families: CodeFamily[] | null;
    /** Open a page: a topic's, or a package's. */
    onopen: (to: Stop) => void;
  } = $props();

  const panels = $derived(topicPanels(index, families));
</script>

<article class="home" data-testid="help-page">
  <h3>{HOME_WORDS.title}</h3>
  {@render under?.()}

  <section class="panel" data-line="0" aria-labelledby="help-home-zeff">
    <h4 id="help-home-zeff">
      <span class="name">Zeff</span>
      <span class="version mono" data-testid="help-engine">{index.engine}</span>
    </h4>
    <p>{HOME_WORDS.zeff}</p>
    <p class="counts" data-testid="help-counts">{countsOf(index, families)}</p>
  </section>

  <section class="panel" data-line="1" aria-labelledby="help-home-zemp">
    <h4 id="help-home-zemp">
      <span class="name"><Name /></span>
      <span class="version mono" data-testid="help-app">{shown(VERSION)}</span>
      <span class="version stage">{HOME_WORDS.stage}</span>
    </h4>
    <p>{HOME_WORDS.zemp}</p>
  </section>

  <p class="label" id="help-home-topics">{HOME_WORDS.topics}</p>

  {#each panels as panel, at (panel.key)}
    <section class="panel link" data-line={at + 2} aria-labelledby="help-home-{panel.key}">
      <h4 id="help-home-{panel.key}">
        <!-- The button is the whole panel's: it is stretched over it, under the links inside. -->
        <button class="open" onclick={() => onopen(panel.to)}>
          <span class="name"><Named text={panel.name} /></span>
          <span class="count">{panel.count}</span>
          <svg class="arrow" viewBox="0 0 16 16" aria-hidden="true"
            ><path d="M3 8h10M9 4l4 4-4 4" /></svg
          >
        </button>
      </h4>
      {#if panel.key === "packages"}
        <p>{HOME_WORDS.packages}</p>
        <ul class="packages" aria-label="The packages">
          {#each index.packages as one (one.name)}
            <li>
              <button
                class="mono package"
                title="Open the page of the package {one.name}"
                onclick={() => onopen({ kind: "package", name: one.name })}>{one.name}</button
              >
            </li>
          {/each}
        </ul>
      {:else if panel.key === "codes"}
        <p>
          {HOME_WORDS.codes.before}<code class="mono">{HOME_WORDS.codes.code}</code>{HOME_WORDS
            .codes.after}
        </p>
      {:else}
        <p>{HOME_WORDS.using}</p>
      {/if}
    </section>
  {/each}
</article>

<style>
  .home {
    color: var(--ink);
    font-size: calc(var(--code-size, 14px) + 0.5px);
    line-height: 1.6;
    max-width: 700px;
  }
  h3 {
    font-size: calc(var(--code-size, 14px) + 17px);
    font-weight: 600;
    line-height: 1.2;
    margin: 2px 0 16px;
  }
  /* A soft panel: the light tint, rounded, one under another. */
  .panel {
    background: var(--softer);
    border: 1px solid var(--line);
    border-radius: 12px;
    margin-bottom: 10px;
    padding: 14px 18px;
    position: relative;
  }
  .panel.link:hover,
  .panel.link:focus-within {
    border-color: var(--accent);
  }
  h4 {
    align-items: center;
    display: flex;
    font-size: 1.1em;
    font-weight: 700;
    gap: 8px;
    margin: 0 0 4px;
  }
  p {
    color: var(--ink-2);
    margin: 0;
  }
  .counts {
    color: var(--ink-3);
    font-size: 13px;
    margin-top: 6px;
  }
  .version {
    background: var(--accent-soft);
    border-radius: 20px;
    color: var(--accent);
    font-size: 12.5px;
    font-weight: 500;
    line-height: 1.5;
    padding: 0 8px;
  }
  .version.stage {
    background: var(--soft);
    border: 1px solid var(--line);
    color: var(--ink-2);
  }
  .label {
    color: var(--ink-3);
    font-size: 12.5px;
    font-weight: 600;
    letter-spacing: 0.07em;
    margin: 20px 0 8px;
    text-transform: uppercase;
  }
  button {
    background: none;
    border: 0;
    color: inherit;
    cursor: pointer;
    font: inherit;
    padding: 0;
  }
  .open {
    align-items: center;
    display: flex;
    flex: 1;
    gap: 8px;
    text-align: left;
  }
  /* The whole panel answers to the pointer as its heading's button does. */
  .open::after {
    border-radius: 12px;
    content: "";
    inset: 0;
    position: absolute;
  }
  .open:focus-visible {
    outline: none;
  }
  .open:focus-visible::after {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
  .name {
    font-weight: 700;
  }
  .count {
    color: var(--ink-3);
    font-size: 13px;
    font-weight: 400;
  }
  .arrow {
    color: var(--accent);
    fill: none;
    height: 16px;
    margin-left: auto;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.7;
    width: 16px;
  }
  .packages {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    list-style: none;
    margin: 8px 0 0;
    padding: 0;
  }
  /* The packages' links stand over the panel's own button. */
  .package {
    background: var(--window);
    border: 1px solid var(--line);
    border-radius: 6px;
    color: var(--accent);
    font-family: "JetBrains Mono", ui-monospace, Menlo, monospace;
    font-size: max(12.5px, 0.9em);
    padding: 0 7px;
    position: relative;
    z-index: 1;
  }
  .package:hover {
    border-color: var(--accent);
  }
  .package:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
  code {
    background: var(--window);
    border: 1px solid var(--line);
    border-radius: 4px;
    font-size: max(12.5px, 0.86em);
    padding: 0 4px;
  }
</style>
