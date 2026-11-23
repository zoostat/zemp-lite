<script lang="ts">
  // The Topics pane of the Help place (release 0.2.3, step 5a; the row of 0.2.3; open decision
  // #211, items 4 and 9): sections that fold, each with its count. **On this page**, the
  // sections of the page open, each going to its place, the one in view marked; **Packages**,
  // each package the engine ships with its count, a click opening its page; **Errors and
  // warnings**, the families as the engine lists them, each folding to its codes with their
  // titles, a click opening a code's page. Which sections are folded is kept with the project.
  // Every name, family and title is the engine's.
  import { familyTopic, TOPICS, topicOpen } from "../app/views";
  import type { Workspace } from "../app/workspace-state.svelte";
  import { CODES } from "./history";

  let {
    workspace,
    sections,
    inView,
    onsection,
  }: {
    workspace: Workspace;
    /** The sections of the page open: where each is, its words, and whether it heads an entry. */
    sections: { line: number; title: string; entry: boolean }[];
    /** The section in view, by its line. */
    inView: number | null;
    /** Go to a section of the page. */
    onsection: (line: number) => void;
  } = $props();

  const index = $derived(workspace.helpIndex);
  const families = $derived(workspace.helpCodes);
  const codes = $derived((families ?? []).reduce((sum, one) => sum + one.codes.length, 0));
  const shown = $derived(workspace.help.stop);
  const open = (key: string) => topicOpen(workspace.views, key);
</script>

<!-- The head of a section: a button that folds and unfolds it, with its count. -->
{#snippet head(key: string, words: string, count: number)}
  <h3>
    <button
      class="fold"
      aria-expanded={open(key)}
      aria-controls="help-topic-{key}"
      onclick={() => workspace.toggleTopic(key)}
    >
      <span class="mark" aria-hidden="true">{open(key) ? "▾" : "▸"}</span>
      <span class="words">{words}</span>
      <span class="count">{count}</span>
    </button>
  </h3>
{/snippet}

<div class="topics">
  {#if sections.length > 0}
    <section aria-label="On this page">
      {@render head(TOPICS.page, "On this page", sections.length)}
      {#if open(TOPICS.page)}
        <ul class="outline" id="help-topic-{TOPICS.page}" aria-label="On this page">
          {#each sections as section (section.line)}
            <li class:entry={section.entry}>
              <button
                class:on={section.line === inView}
                aria-current={section.line === inView ? "location" : undefined}
                onclick={() => onsection(section.line)}>{section.title}</button
              >
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  {/if}
  {#if index !== null}
    <section aria-label="Packages">
      {@render head(TOPICS.packages, "Packages", index.packages.length)}
      {#if open(TOPICS.packages)}
        <ul id="help-topic-{TOPICS.packages}" aria-label="Packages">
          {#each index.packages as one (one.name)}
            {@const here = shown?.kind === "package" && shown.name === one.name}
            <li>
              <button
                class="row"
                class:on={here}
                aria-current={here ? "page" : undefined}
                title="Open the page of the package {one.name}"
                onclick={() => void workspace.showHelpStop({ kind: "package", name: one.name })}
              >
                <span class="mono">{one.name}</span>
                <span class="count">{one.functions.length}</span>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  {/if}
  {#if families !== null}
    <section aria-label={CODES}>
      {@render head(TOPICS.codes, CODES, codes)}
      {#if open(TOPICS.codes)}
        <ul id="help-topic-{TOPICS.codes}" aria-label={CODES}>
          {#each families as family (family.name)}
            {@const key = familyTopic(family.name)}
            <li>
              <button
                class="row family"
                aria-expanded={open(key)}
                aria-controls="help-topic-{key}"
                onclick={() => workspace.toggleTopic(key)}
              >
                <span class="mark" aria-hidden="true">{open(key) ? "▾" : "▸"}</span>
                <span class="words"
                  ><span class="mono">{family.name}</span>
                  {family.area}</span
                >
                <span class="count">{family.codes.length}</span>
              </button>
              {#if open(key)}
                <ul class="codes" id="help-topic-{key}" aria-label="The codes of {family.name}">
                  {#each family.codes as one (one.code)}
                    {@const here = shown?.kind === "code" && shown.code === one.code}
                    <li>
                      <button
                        class="row code"
                        class:on={here}
                        aria-current={here ? "page" : undefined}
                        onclick={() => void workspace.showCode(one.code)}
                      >
                        <span class="mono">{one.code}</span>
                        <span class="title">{one.title}</span>
                      </button>
                    </li>
                  {/each}
                </ul>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  {/if}
</div>

<style>
  .topics {
    padding: 0 8px 12px;
  }
  h3 {
    font-size: 13.5px;
    margin: 6px 0 0;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0 0 6px;
  }
  button {
    background: none;
    border: 0;
    border-radius: 7px;
    color: var(--ink);
    cursor: pointer;
    font: inherit;
    padding: 5px 8px;
    text-align: left;
    width: 100%;
  }
  button:hover {
    background: var(--line);
  }
  button:focus-visible {
    outline: 2px solid var(--accent);
  }
  /* On the darker ground of a row rested on, the faintest ink is one step stronger. */
  button:hover .mark,
  button:hover .count {
    color: var(--ink-2);
  }
  .fold,
  .row {
    align-items: baseline;
    display: flex;
    gap: 6px;
  }
  .fold {
    font-weight: 700;
  }
  .mark {
    color: var(--ink-3);
    flex: none;
    width: 12px;
  }
  .words,
  .title {
    flex: 1;
    min-width: 0;
  }
  .count {
    color: var(--ink-3);
    flex: none;
    font-size: 12.5px;
    font-weight: 400;
    margin-left: auto;
  }
  .row {
    font-size: 13.5px;
    padding-left: 26px;
  }
  .row.family {
    padding-left: 8px;
  }
  .row.family .mono {
    color: var(--ink-2);
    font-size: 12.5px;
    margin-right: 4px;
  }
  .row.code {
    font-size: 13px;
    padding-left: 26px;
  }
  .row.code .mono {
    flex: none;
    font-size: 12.5px;
  }
  .row.code .title {
    color: var(--ink-2);
  }
  .outline button {
    padding-left: 26px;
  }
  .outline .entry button {
    font-weight: 600;
  }
  .on {
    background: var(--accent-soft);
    color: var(--accent);
    font-weight: 600;
  }
  .on .title {
    color: inherit;
  }
</style>
