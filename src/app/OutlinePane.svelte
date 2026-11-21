<script lang="ts">
  // The Outline of a script (open decisions #178 and #203): its sections and subsections, each
  // with its line. A click on one brings its heading to the top of the script; the section the
  // cursor is in is marked; and each can be run, its statements with what they need.
  import type { Section } from "../editor/sections";

  let {
    sections,
    current,
    running,
    ongo,
    onrun,
  }: {
    sections: Section[];
    /** The line of the heading of the section the cursor is in, or `null`. */
    current: number | null;
    /** Whether a run is going: a section is not run meanwhile. */
    running: boolean;
    ongo: (section: Section) => void;
    onrun: (section: Section) => void;
  } = $props();
</script>

{#if sections.length === 0}
  <p class="none">
    This script has no sections. A comment written <span class="mono">// # Title</span> begins one,
    and <span class="mono">// ## Title</span> a subsection of it.
  </p>
{:else}
  <ul>
    {#each sections as section (section.line)}
      <li class:sub={section.level === 2} class:on={section.line === current}>
        <button
          class="go"
          aria-current={section.line === current ? "location" : undefined}
          title="Go to line {section.line}"
          onclick={() => ongo(section)}
        >
          <span class="title">{section.title}</span>
          <span class="line mono">{section.line}</span>
        </button>
        <button
          class="run"
          aria-label="Run section {section.title}"
          title="Run this section: its statements, with what they need"
          disabled={running}
          onclick={() => onrun(section)}>▶</button
        >
      </li>
    {/each}
  </ul>
{/if}

<style>
  .none {
    color: var(--ink-3);
    font-size: 13px;
    margin: 0;
    padding: 4px 14px 14px;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 2px 8px 10px;
  }
  li {
    align-items: center;
    border-radius: 7px;
    display: flex;
  }
  li:hover {
    background: var(--line);
  }
  li.on {
    background: var(--accent-soft);
  }
  .go {
    align-items: baseline;
    background: none;
    border: 0;
    border-radius: 7px;
    color: var(--ink);
    cursor: pointer;
    display: flex;
    flex: 1;
    font: inherit;
    gap: 8px;
    min-width: 0;
    padding: 5px 8px;
    text-align: left;
  }
  li.sub .go {
    color: var(--ink-2);
    padding-left: 24px;
  }
  li.on .go {
    color: var(--accent);
    font-weight: 600;
  }
  .title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .line {
    color: var(--ink-3);
    flex: none;
    font-size: 12.5px;
    font-weight: 400;
  }
  .run {
    background: none;
    border: 0;
    border-radius: 6px;
    color: var(--accent);
    cursor: pointer;
    flex: none;
    font-size: 12.5px;
    opacity: 0;
    padding: 4px 9px;
  }
  li:hover .run,
  .run:focus-visible {
    opacity: 1;
  }
  .run:disabled {
    color: var(--ink-3);
    cursor: default;
  }
  .go:focus-visible,
  .run:focus-visible {
    outline: 2px solid var(--accent);
  }
</style>
