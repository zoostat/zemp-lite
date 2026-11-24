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
  import HexIcon, { type HexName } from "../theme/HexIcon.svelte";
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
  /** The icon of each topic's card, in the look of 0.2.4's screens (open decision #220, item 9). */
  const ICON: Record<string, HexName> = { packages: "packages", codes: "codes", using: "book" };
</script>

<article class="home" data-testid="help-page">
  <h3>{HOME_WORDS.title}</h3>
  {@render under?.()}

  <section class="panel" data-line="0" aria-labelledby="help-home-zeff">
    <HexIcon name="zeff" />
    <div class="words">
      <h4 id="help-home-zeff">
        <span class="name">Zeff</span>
        <span class="version mono" data-testid="help-engine">{index.engine}</span>
      </h4>
      <p>{HOME_WORDS.zeff}</p>
      <p class="counts" data-testid="help-counts">{countsOf(index, families)}</p>
    </div>
  </section>

  <section class="panel" data-line="1" aria-labelledby="help-home-zemp">
    <HexIcon name="app" />
    <div class="words">
      <h4 id="help-home-zemp">
        <span class="name"><Name /></span>
        <span class="version mono" data-testid="help-app">{shown(VERSION)}</span>
        <span class="stage">{HOME_WORDS.stage}</span>
      </h4>
      <p>{HOME_WORDS.zemp}</p>
    </div>
  </section>

  <p class="label" id="help-home-topics">{HOME_WORDS.topics}</p>

  {#each panels as panel, at (panel.key)}
    <section class="panel link" data-line={at + 2} aria-labelledby="help-home-{panel.key}">
      <HexIcon name={ICON[panel.key] ?? "book"} />
      <div class="words">
        <h4 id="help-home-{panel.key}">
          <!-- The button is the whole card's: it is stretched over it, under the links inside. -->
          <button class="open" onclick={() => onopen(panel.to)}>
            <span class="name"><Named text={panel.name} /></span>
            <span class="count">{panel.count}</span>
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
        <!-- The way on, as the project screen's cards say it; the card's button says where. -->
        <span class="go" aria-hidden="true">Open →</span>
      </div>
    </section>
  {/each}
</article>

<style>
  .home {
    color: var(--ink);
    font-size: calc(var(--code-size, 14px) - 0.5px);
    line-height: 1.6;
    max-width: 700px;
  }
  /* The title in the display type, as the titles of 0.2.4's screens. */
  h3 {
    font-family: "Newsreader", serif;
    font-size: calc(var(--code-size, 14px) + 18px);
    font-weight: 600;
    line-height: 1.1;
    margin: 2px 0 18px;
  }
  /* A card of the project screen's kind: white, a hairline, rounded, a soft shade under it;
     its icon in a hexagon at the left. One under another. */
  .panel {
    align-items: flex-start;
    background: var(--window);
    border: 1px solid var(--line);
    border-radius: 14px;
    box-shadow: 0 24px 48px -36px rgba(46, 26, 94, 0.5);
    display: flex;
    gap: 16px;
    margin-bottom: 12px;
    padding: 16px 20px;
    position: relative;
  }
  .panel.link:hover,
  .panel.link:focus-within {
    border-color: var(--accent);
  }
  .words {
    flex: 1;
    min-width: 0;
  }
  h4 {
    align-items: center;
    display: flex;
    font-size: calc(var(--code-size, 14px) + 2.5px);
    font-weight: 700;
    gap: 8px;
    margin: 1px 0 3px;
  }
  p {
    color: var(--ink-2);
    margin: 0;
  }
  .counts {
    color: var(--ink-3);
    font-size: max(12.5px, 0.96em);
    margin-top: 4px;
  }
  .version {
    color: var(--ink-2);
    font-size: 12.5px;
    font-weight: 400;
  }
  .stage {
    border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
    border-radius: 999px;
    color: var(--accent);
    font-size: 12.5px;
    font-weight: 400;
    line-height: 1.5;
    padding: 0 8px;
  }
  .label {
    color: var(--ink);
    font:
      600 21px/1.2 "Newsreader",
      serif;
    margin: 26px 0 12px;
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
  /* The whole card answers to the pointer as its heading's button does. */
  .open::after {
    border-radius: 14px;
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
    font-size: max(12.5px, 0.82em);
    font-weight: 400;
  }
  .go {
    color: var(--accent);
    display: block;
    font-weight: 700;
    margin-top: 6px;
  }
  .packages {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    list-style: none;
    margin: 8px 0 0;
    padding: 0;
  }
  /* The packages' links stand over the card's own button. */
  .package {
    background: var(--softer);
    border: 1px solid var(--line-strong);
    border-radius: 7px;
    color: var(--accent);
    font-family: "JetBrains Mono", ui-monospace, Menlo, monospace;
    font-size: max(12.5px, 0.95em);
    padding: 1px 8px;
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
    background: var(--softer);
    border: 1px solid var(--line);
    border-radius: 4px;
    font-size: max(12.5px, 0.95em);
    padding: 0 4px;
  }
</style>
