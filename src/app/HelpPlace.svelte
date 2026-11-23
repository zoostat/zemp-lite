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
  //
  // From 0.2.3 (#211, part 3) the pages opened are a history (`help/history.ts`): **Back** and
  // **Forward** go through them, **Home** returns to where Help starts and is lit while one is
  // there. ⌘[ and ⌘] (Ctrl on other keyboards) and the mouse's two side buttons do as Back
  // and Forward while this place is shown; the browser, whose own Back and Forward they are,
  // is not given them here, so that reading Help never leaves the app.
  import HelpPage from "../help/HelpPage.svelte";
  import { after, before, called, here } from "../help/history";
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

  // Where Back and Forward go, and whether Home is the page shown.
  const earlier = $derived(before(workspace.helpHistory));
  const later = $derived(after(workspace.helpHistory));
  const atHome = $derived(here(workspace.helpHistory)?.kind === "home");

  /** ⌘[ and ⌘]: back and forward through the pages of Help, not of the browser. */
  function keys(event: KeyboardEvent): void {
    if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
    if (event.key !== "[" && event.key !== "]") return;
    event.preventDefault();
    void (event.key === "[" ? workspace.helpBack() : workspace.helpForward());
  }

  /**
   * The mouse's side buttons (the fourth and the fifth): the browser is kept from going back
   * or forward on them, at the press and at the release, and the release goes through Help.
   */
  function side(event: MouseEvent): void {
    if (event.button !== 3 && event.button !== 4) return;
    event.preventDefault();
    if (event.type !== "mouseup") return;
    void (event.button === 3 ? workspace.helpBack() : workspace.helpForward());
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
  <div class="nav" role="group" aria-label="Moving through Help">
    <button
      class="step"
      aria-label="Back"
      title={earlier === null ? "Back" : `Back: ${called(earlier)}`}
      disabled={earlier === null}
      onclick={() => void workspace.helpBack()}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" /></svg>
    </button>
    <button
      class="step"
      aria-label="Forward"
      title={later === null ? "Forward" : `Forward: ${called(later)}`}
      disabled={later === null}
      onclick={() => void workspace.helpForward()}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" /></svg>
    </button>
    <button
      class="step home"
      class:on={atHome}
      aria-current={atHome ? "page" : undefined}
      title="Home: where Help starts"
      onclick={() => void workspace.showHelpHome()}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true"
        ><path d="M2.5 7.5 8 3l5.5 4.5M4 6.5V13h8V6.5" /></svg
      >
      <span>Home</span>
    </button>
  </div>
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

<svelte:window onkeydown={keys} onmousedown={side} onmouseup={side} onauxclick={side} />

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
  .nav {
    align-items: center;
    display: flex;
    flex: none;
    gap: 2px;
  }
  .step {
    align-items: center;
    background: none;
    border: 1px solid transparent;
    border-radius: 7px;
    color: var(--ink-2);
    cursor: pointer;
    display: inline-flex;
    font: inherit;
    font-size: 13px;
    gap: 6px;
    height: 28px;
    justify-content: center;
    padding: 0;
    width: 30px;
  }
  .step svg {
    fill: none;
    height: 16px;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.7;
    width: 16px;
  }
  .step:hover:not(:disabled) {
    background: var(--soft);
  }
  .step:focus-visible {
    outline: 2px solid var(--accent);
  }
  /* Greyed where there is nowhere to go: an arrow with no word, fainter than any text is set. */
  .step:disabled {
    color: var(--ink-3);
    cursor: default;
  }
  .step:disabled svg {
    opacity: 0.45;
  }
  .step.home {
    border-color: var(--line-strong);
    padding: 0 10px 0 8px;
    width: auto;
  }
  .step.home.on {
    background: var(--accent-soft);
    border-color: transparent;
    color: var(--accent);
    font-weight: 600;
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
