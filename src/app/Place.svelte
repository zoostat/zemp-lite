<script lang="ts" module>
  import type { Snippet } from "svelte";

  /**
   * A pane of a place: the word of its link, what the link says on resting over it, whether it
   * is open, and what it holds. A pane the place draws inside its own middle (the notes beside
   * the code) holds nothing here, and has its link alone.
   */
  export interface Pane {
    key: string;
    label: string;
    title: string;
    open: boolean;
    set: (open: boolean) => void;
    content: Snippet | null;
  }
</script>

<script lang="ts">
  // The frame every place stands on from Zemp Lite 0.2.1 (open decision #203; the Zemp
  // Specification, section 5): a bar under the top bar with one link for each pane, above
  // that pane, which opens and closes it; the left pane, the place itself in the middle, and
  // the right pane. A pane also closes by its own ×, and the edge between a pane and the
  // middle is dragged, or moved with the arrow keys, within limits. Which panes are open is
  // the place's own and is kept with the project; the two widths are the same in every place.
  import Splitter from "./Splitter.svelte";
  import { LEFT_WIDTH, RIGHT_WIDTH } from "./views";
  import type { Workspace } from "./workspace-state.svelte";

  let {
    workspace,
    name,
    left = [],
    right = [],
    bar = null,
    children,
  }: {
    workspace: Workspace;
    /** The place's name, as the top bar has it. */
    name: string;
    left?: Pane[];
    right?: Pane[];
    /** What the bar holds between the links of the left panes and those of the right. */
    bar?: Snippet | null;
    children: Snippet;
  } = $props();

  let body = $state<HTMLElement | null>(null);
  const drawn = (panes: Pane[]) => panes.filter((pane) => pane.open && pane.content !== null);
  const atLeft = $derived(drawn(left));
  const atRight = $derived(drawn(right));
</script>

{#snippet link(pane: Pane, side: "left" | "right")}
  <button
    class="link {side}"
    aria-pressed={pane.open}
    title={pane.title}
    onclick={() => pane.set(!pane.open)}
  >
    <svg viewBox="0 0 15 13" aria-hidden="true">
      <rect class="frame" x=".65" y=".65" width="13.7" height="11.7" rx="2" />
      <rect class="side" x={side === "left" ? 1.3 : 9.3} y="1.3" width="4.4" height="10.4" rx="1" />
    </svg>
    <span>{pane.label}</span>
  </button>
{/snippet}

{#snippet block(pane: Pane)}
  <section class="block" aria-label={pane.label} data-pane={pane.key}>
    <header>
      <h2>{pane.label}</h2>
      <button
        class="close"
        aria-label="Close {pane.label}"
        title="Close"
        onclick={() => pane.set(false)}>×</button
      >
    </header>
    {@render pane.content?.()}
  </section>
{/snippet}

<div class="frame" data-place={name}>
  <div class="bar" role="toolbar" aria-label="{name}: its panes and its controls">
    {#each left as pane (pane.key)}
      {@render link(pane, "left")}
    {/each}
    <div class="between">{@render bar?.()}</div>
    {#each right as pane (pane.key)}
      {@render link(pane, "right")}
    {/each}
  </div>
  <div class="columns" bind:this={body}>
    {#if atLeft.length > 0}
      <aside
        class="side"
        style:width="{workspace.views.left.width}px"
        aria-label="{name}: the left pane"
      >
        {#each atLeft as pane (pane.key)}
          {@render block(pane)}
        {/each}
      </aside>
      <Splitter
        orientation="vertical"
        label="The width of the left pane"
        value={workspace.views.left.width}
        least={LEFT_WIDTH.least}
        most={LEFT_WIDTH.most}
        ondrag={(x) => workspace.setLeftWidth(x - (body?.getBoundingClientRect().left ?? 0))}
        onstep={(direction) => workspace.setLeftWidth(workspace.views.left.width + direction * 16)}
      />
    {/if}
    <div class="middle">{@render children()}</div>
    {#if atRight.length > 0}
      <Splitter
        orientation="vertical"
        label="The width of the right pane"
        value={workspace.views.right.width}
        least={RIGHT_WIDTH.least}
        most={RIGHT_WIDTH.most}
        ondrag={(x) => workspace.setRightWidth((body?.getBoundingClientRect().right ?? 0) - x)}
        onstep={(direction) =>
          workspace.setRightWidth(workspace.views.right.width - direction * 16)}
      />
      <aside
        class="side right"
        style:width="{workspace.views.right.width}px"
        aria-label="{name}: the right pane"
      >
        {#each atRight as pane (pane.key)}
          {@render block(pane)}
        {/each}
      </aside>
    {/if}
  </div>
</div>

<style>
  .frame {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
  }
  .bar {
    align-items: center;
    background: var(--window);
    border-bottom: 1px solid var(--line-strong);
    display: flex;
    flex: none;
    gap: 4px;
    min-height: 38px;
    padding: 0 10px;
  }
  .between {
    align-items: center;
    display: flex;
    flex: 1;
    gap: 14px;
    min-width: 0;
    padding: 0 10px;
  }
  /* A link of the bar: a word with the picture of its side, filled where its pane is open. */
  .link {
    align-items: center;
    background: none;
    border: 1px solid var(--line-strong);
    border-radius: 7px;
    color: var(--ink-3);
    cursor: pointer;
    display: inline-flex;
    flex: none;
    font: inherit;
    font-size: 13px;
    gap: 6px;
    padding: 3px 10px 3px 8px;
    white-space: nowrap;
  }
  .link.right {
    flex-direction: row-reverse;
    padding: 3px 8px 3px 10px;
  }
  .link:hover {
    background: var(--soft);
  }
  .link:focus-visible {
    outline: 2px solid var(--accent);
  }
  .link svg {
    flex: none;
    height: 13px;
    width: 15px;
  }
  .link .frame {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.3;
  }
  .link .side {
    fill: currentColor;
    opacity: 0.25;
  }
  .link[aria-pressed="true"] {
    background: var(--accent-soft);
    border-color: transparent;
    color: var(--accent);
    font-weight: 600;
  }
  .link[aria-pressed="true"] .side {
    opacity: 0.9;
  }
  .columns {
    background: var(--window);
    display: flex;
    flex: 1;
    min-height: 0;
  }
  .middle {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
  }
  .side {
    background: var(--softer);
    border-right: 1px solid var(--line-strong);
    box-sizing: border-box;
    display: flex;
    flex: none;
    flex-direction: column;
    min-height: 0;
    overflow: auto;
  }
  .side.right {
    border-left: 1px solid var(--line-strong);
    border-right: 0;
  }
  .block + .block {
    border-top: 1px solid var(--line-strong);
  }
  .block header {
    align-items: center;
    display: flex;
    justify-content: space-between;
    padding: 10px 10px 4px 14px;
  }
  .block h2 {
    color: var(--ink-3);
    font-size: 12.5px;
    font-weight: 500;
    letter-spacing: 0.05em;
    margin: 0;
    text-transform: uppercase;
  }
  .close {
    background: none;
    border: 0;
    border-radius: 5px;
    color: var(--ink-3);
    cursor: pointer;
    font-size: 16px;
    height: 22px;
    line-height: 1;
    width: 22px;
  }
  .close:hover {
    background: var(--soft);
    color: var(--ink);
  }
  .close:focus-visible {
    outline: 2px solid var(--accent);
  }
</style>
