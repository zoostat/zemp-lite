<script lang="ts">
  // The Help place (open decisions #74 and #203; the owner's answers of 22 November 2026: Help
  // is a place, not a panel beside the script, and its page is set in type, not shown as the
  // terminal prints it). In the middle the engine's page, a function's or a code's, read from
  // its print (`help/read.ts`) and formatted (`help/HelpPage.svelte`), every word the engine's.
  // At its left the pane **Outline**: the page's sections, each going to its place, the one in
  // view marked. At its right the pane **Related functions**: those the page names under SEE
  // ALSO, each with what its own page says it does, a click opening that page. F1 on a name in
  // the script, **Explain** in what a run said, a name or a code in the page itself, and the
  // field here each open a page.
  import HelpPage from "../help/HelpPage.svelte";
  import { outlineOf, readPage, relatedOf } from "../help/read";
  import { paneOf } from "./panes";
  import Place from "./Place.svelte";
  import type { Workspace } from "./workspace-state.svelte";

  let { workspace }: { workspace: Workspace } = $props();

  const page = $derived(workspace.help.page);
  const doc = $derived(readPage(page));
  const sections = $derived(outlineOf(doc));

  // The related functions, each with the first line of its own page, asked of the engine.
  const related = $derived(relatedOf(doc));
  let heads = $state<Record<string, { does: string; pack: string } | null>>({});
  $effect(() => {
    for (const name of related) {
      if (name in heads) continue;
      heads[name] = null;
      void workspace
        .helpPage(name)
        .then((found) => {
          const [head] = found.page === null ? [] : readPage(found.page).entries;
          heads[name] = { does: head?.does ?? "", pack: head?.facts[0] ?? "" };
        })
        .catch(() => {
          heads[name] = { does: "", pack: "" };
        });
    }
  });

  // The section in view: the last whose heading has reached the top of the page's own pane.
  let pane = $state<HTMLElement | null>(null);
  let inView = $state<number | null>(null);
  function watch(): void {
    if (pane === null) return;
    const top = pane.getBoundingClientRect().top;
    let found: number | null = null;
    for (const part of pane.querySelectorAll<HTMLElement>("[data-line]")) {
      if (part.getBoundingClientRect().top - top <= 8) found = Number(part.dataset["line"]);
    }
    inView = found;
  }
  // A new page is read from its top.
  $effect(() => {
    void page;
    if (pane !== null) pane.scrollTop = 0;
    inView = null;
  });
  function goTo(line: number): void {
    const part = pane?.querySelector<HTMLElement>(`[data-line="${line}"]`);
    if (pane === null || part === null || part === undefined) return;
    pane.scrollTop += part.getBoundingClientRect().top - pane.getBoundingClientRect().top;
    inView = line;
  }

  let asked = $state("");
  function open(event: SubmitEvent): void {
    event.preventDefault();
    const name = asked.trim();
    if (name === "") return;
    asked = "";
    void (/^[WZ]\d{4}$/.test(name) ? workspace.showCode(name) : workspace.showHelp(name));
  }
</script>

{#snippet outline()}
  {#if sections.length === 0}
    <p class="none">
      {page === "" ? "No page is open." : "This page has no sections."}
    </p>
  {:else}
    <ul class="outline">
      {#each sections as section (section.line)}
        <li class:entry={section.entry} class:sub={!section.entry}>
          <button
            class:on={section.line === inView}
            aria-current={section.line === inView ? "location" : undefined}
            onclick={() => goTo(section.line)}>{section.title}</button
          >
        </li>
      {/each}
    </ul>
  {/if}
{/snippet}

{#snippet relatedFunctions()}
  {#if related.length === 0}
    <p class="none">
      {page === "" ? "No page is open." : "This page names no related function."}
    </p>
  {:else}
    <ul class="related">
      {#each related as name (name)}
        <li>
          <button onclick={() => void workspace.showHelp(name)} title="Open the page of {name}">
            <span class="name mono">{name}</span>
            {#if heads[name]}
              <span class="does">{heads[name]?.does}</span>
              <span class="pack">{heads[name]?.pack}</span>
            {/if}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
{/snippet}

{#snippet controls()}
  <h2 class="mono" data-testid="help-title">
    {workspace.help.title === "" ? "Help" : workspace.help.title}
  </h2>
  <span class="gap"></span>
  <form onsubmit={open}>
    <input
      type="search"
      placeholder="A function's name, or a code"
      aria-label="Open the page of a function or a code"
      spellcheck="false"
      bind:value={asked}
    />
    <button class="word" type="submit">Open</button>
  </form>
{/snippet}

<div class="help" data-testid="help">
  <Place
    {workspace}
    name="Help"
    left={[paneOf(workspace, "help", "outline", outline)]}
    right={[paneOf(workspace, "help", "related", relatedFunctions)]}
    bar={controls}
  >
    <div class="page" bind:this={pane} onscroll={watch}>
      {#if page === ""}
        <p class="quiet">
          Press F1 on a function's name in the script, press Explain on what a run said, or type a
          name in the field above, to read the engine's page here.
        </p>
      {:else if doc.plain !== null}
        <!-- A page the reader does not know (a package's list): as the engine prints it. -->
        <pre class="mono" data-testid="help-page">{doc.plain}</pre>
      {:else}
        <HelpPage
          {doc}
          onname={(name) => void workspace.showHelp(name)}
          oncode={(code) => void workspace.showCode(code)}
        />
      {/if}
    </div>
  </Place>
</div>

<style>
  .help {
    background: var(--window);
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
  }
  h2 {
    font-size: 13.5px;
    font-weight: 500;
    margin: 0;
  }
  .gap {
    flex: 1;
  }
  form {
    align-items: center;
    display: flex;
    gap: 6px;
  }
  input {
    background: var(--soft);
    border: 0;
    border-radius: 6px;
    color: var(--ink);
    font: inherit;
    font-size: 13px;
    padding: 4px 9px;
    width: 230px;
  }
  .word {
    background: none;
    border: 0;
    border-radius: 6px;
    color: var(--ink-2);
    cursor: pointer;
    font: inherit;
    font-size: 13px;
    padding: 2px 6px;
  }
  .word:hover {
    background: var(--soft);
  }
  .page {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 18px 28px 60px;
  }
  pre {
    color: var(--ink);
    font-size: calc(var(--code-size, 14px) - 1px);
    line-height: 1.5;
    margin: 0;
    white-space: pre;
  }
  .quiet,
  .none {
    color: var(--ink-3);
    margin: 0;
  }
  .none {
    font-size: 13px;
    padding: 4px 14px 14px;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 2px 8px 10px;
  }
  li button {
    background: none;
    border: 0;
    border-radius: 7px;
    color: var(--ink);
    cursor: pointer;
    display: block;
    font: inherit;
    padding: 5px 8px;
    text-align: left;
    width: 100%;
  }
  li button:hover {
    background: var(--line);
  }
  li button:focus-visible {
    outline: 2px solid var(--accent);
  }
  .outline .entry button {
    font-weight: 600;
  }
  .outline .on {
    background: var(--accent-soft);
    color: var(--accent);
    font-weight: 600;
  }
  .related .name {
    display: block;
    font-weight: 600;
  }
  .related .does {
    color: var(--ink-2);
    display: block;
    font-size: 13px;
  }
  .related .pack {
    color: var(--ink-3);
    display: block;
    font-size: 12.5px;
  }
</style>
