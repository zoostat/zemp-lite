<script lang="ts">
  // The Help place (open decisions #74 and #203; the owner's answers of 22 November 2026: Help
  // is a place, not a panel beside the script, and its page is set in type, not shown as the
  // terminal prints it). In the middle the engine's page, a function's or a code's, read from
  // its print (`help/read.ts`) and formatted (`help/HelpPage.svelte`), every word the engine's.
  // At its left the pane **Topics** (`help/TopicsPane.svelte`; it was **Outline** until
  // 0.2.3): the packages, the codes by family and the app's own pages, in sections that fold,
  // and beside a page its neighbours. At its right the pane **On this page** (#211, item 13;
  // it was **Related functions**): the sections of the page open, each going to its place,
  // the one in view marked; a page's own See also keeps the links to related functions. F1 on
  // a name in the script, **Explain** in what a run said, a name or a code in the page itself,
  // and the search field each open a page; the field suggests as one types
  // (`help/SearchField.svelte`), and from release 0.3.1 (step 11a; #245) stands at the top of
  // the index at the left, not in the bar.
  //
  // From 0.2.3 (#211, part 3) the pages opened are a history (`help/history.ts`): **Back** and
  // **Forward** go through them, **Home** returns to where Help starts and is lit while one is
  // there. ⌘[ and ⌘] (Ctrl on other keyboards) and the mouse's two side buttons do as Back
  // and Forward while this place is shown; the browser, whose own Back and Forward they are,
  // is not given them here, so that reading Help never leaves the app. Beside them the trail
  // says where the page stands, each step before the last a link (`help/trail.ts`): _Packages
  // › stats › t_test_; on Home there is none, Home being marked as the page open. A package's page and the codes by family are lists set from
  // the engine's index (`help/pages.ts`, `help/ListPage.svelte`), so that every step of a
  // trail has a page to open.
  import HelpPage from "../help/HelpPage.svelte";
  import Named from "../theme/Named.svelte";
  import { onMount, tick } from "svelte";
  import { shownOf } from "../help/forms";
  import { HOME, after, before, called, here } from "../help/history";
  import HomePage from "../help/HomePage.svelte";
  import ListPage from "../help/ListPage.svelte";
  import TopicsPane from "../help/TopicsPane.svelte";
  import { homeParts } from "../help/home";
  import { chooserPage, codesPage, packagePage, packagesPage, usingList } from "../help/pages";
  import { outlineOf, readPage } from "../help/read";
  import { trailOf } from "../help/trail";
  import { headingsOf, readUsing } from "../using/read";
  import UsingPage from "../using/UsingPage.svelte";
  import { paneOf } from "./panes";
  import Place from "./Place.svelte";
  import type { Workspace } from "./workspace-state.svelte";

  let { workspace }: { workspace: Workspace } = $props();

  // The Help place on the screen stands on a page: on Home, until one is opened.
  onMount(() => workspace.readyHelp());

  // The page shown: a list (a package's functions, the codes by family, the app's own pages),
  // a page of the app's own, Home, or the engine's print.
  const shown = $derived(workspace.help.stop);
  // Where the code shown was raised, if Explain opened its page.
  const raised = $derived(
    shown?.kind === "code" && workspace.raisedNow?.code === shown.code ? workspace.raisedNow : null,
  );
  const listed = $derived(
    shown?.kind === "package"
      ? packagePage(workspace.helpIndex, shown.name)
      : shown?.kind === "packages"
        ? packagesPage(workspace.helpIndex)
        : shown?.kind === "codes"
          ? codesPage(workspace.helpCodes)
          : shown?.kind === "using" && shown.page === null
            ? usingList()
            : null,
  );
  // A page of Using Zemp Lite, read from its text; a slip in a page is said, not hidden.
  const own = $derived.by(() => {
    if (shown?.kind !== "using" || shown.page === null || workspace.help.page === "") return null;
    try {
      return { doc: readUsing(workspace.help.page), slip: "" };
    } catch (error) {
      return { doc: null, slip: error instanceof Error ? error.message : String(error) };
    }
  });
  const page = $derived(listed === null && own === null ? workspace.help.page : "");
  // Home, the landing page, once the engine has given its index.
  const home = $derived(shown === null || shown.kind === "home" ? workspace.helpIndex : null);
  // The engine's print, read. A name with two functions (#215) has a page for each, cut
  // from the print, told apart in its title by what it is called on; the bare name is the
  // chooser of the two, a list as a package's page is.
  const read = $derived(readPage(page));
  const named = $derived(
    shown?.kind === "name" && page !== "" && read.plain === null
      ? shownOf(read, workspace.helpIndex, shown.name, shown.form)
      : null,
  );
  const chooser = $derived(
    named?.kind === "chooser" && shown?.kind === "name"
      ? chooserPage(workspace.helpIndex, shown.name)
      : null,
  );
  const list = $derived(listed ?? chooser);
  const doc = $derived(named?.kind === "one" ? named.doc : read);
  const of = $derived(named?.kind === "one" ? named.of.words : undefined);
  // The sections of the page open, listed as a part of the page (open decision #220, item 7,
  // which replaces the pane of #211, item 13): those of the engine's page, or of one of the
  // app's own; on Home, its panels (#211, item 14). A page that is a list has none.
  const sections = $derived(
    own !== null
      ? own.doc === null
        ? []
        : headingsOf(own.doc).map((part) => ({ ...part, entry: false }))
      : home !== null
        ? homeParts(home, workspace.helpCodes).map((title, line) => ({ line, title, entry: false }))
        : list === null
          ? outlineOf(doc)
          : [],
  );
  const trail = $derived(trailOf(shown ?? HOME, workspace.helpIndex, workspace.helpCodes));

  // The section in view: the last whose heading has reached the top of the page's own pane.
  // A section near the page's end cannot reach the top: one gone to from the pane at the
  // right stays the section marked while the page stands at its end.
  let pane = $state<HTMLElement | null>(null);
  let inView = $state<number | null>(null);
  // The list stands at the right of the page's text where the place is wide enough to hold
  // both, and once under the page's title where it is not.
  const BESIDE = 860;
  let width = $state(0);
  const beside = $derived(width >= BESIDE);
  $effect(() => {
    if (pane === null) return;
    const seen = new ResizeObserver(() => {
      width = pane?.clientWidth ?? 0;
    });
    seen.observe(pane);
    width = pane.clientWidth;
    return () => seen.disconnect();
  });
  let asked: number | null = null;
  function watch(): void {
    if (pane === null) return;
    const top = pane.getBoundingClientRect().top;
    let found: number | null = null;
    for (const part of pane.querySelectorAll<HTMLElement>("[data-line]")) {
      if (part.getBoundingClientRect().top - top <= 8) found = Number(part.dataset["line"]);
    }
    const atEnd = pane.scrollTop + pane.clientHeight >= pane.scrollHeight - 1;
    if (atEnd && asked !== null && (found === null || asked > found)) found = asked;
    else asked = null;
    inView = found;
  }
  // A new page is read from its top; the codes opened at a family, from that family's heading.
  $effect(() => {
    const now = workspace.help.stop;
    if (pane !== null) pane.scrollTop = 0;
    inView = null;
    asked = null;
    const family = now?.kind === "codes" ? now.family : null;
    if (family === null) return;
    void tick().then(() => {
      const line = list?.groups.findIndex((group) => group.key === family) ?? -1;
      if (line >= 0) goTo(line);
    });
  });
  function goTo(line: number): void {
    const part = pane?.querySelector<HTMLElement>(`[data-line="${line}"]`);
    if (pane === null || part === null || part === undefined) return;
    pane.scrollTop += part.getBoundingClientRect().top - pane.getBoundingClientRect().top;
    inView = line;
    asked = line;
  }

  // Where Back and Forward go, and whether Home is the page shown.
  const earlier = $derived(before(workspace.helpHistory));
  const later = $derived(after(workspace.helpHistory));
  const atHome = $derived(here(workspace.helpHistory)?.kind === "home");

  /**
   * ⌘[ and ⌘]: back and forward through the pages of Help, not of the browser. And `/`, typed
   * where nothing is being typed, puts the cursor in the search field at the top of the
   * index, opening that pane where it is closed (release 0.3.1, step 11a).
   */
  function keys(event: KeyboardEvent): void {
    if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const at = event.target as HTMLElement | null;
      const typing =
        at !== null && (at.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(at.tagName));
      if (typing) return;
      event.preventDefault();
      workspace.searchHelp();
      return;
    }
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
</script>

{#snippet topics()}
  <TopicsPane {workspace} />
{/snippet}

<!-- The sections of the page open: a part of the page, with no pane and no shade. -->
{#snippet onThisPage(where: "beside" | "under")}
  {#if sections.length > 0}
    <nav class="otp {where}" aria-label="On this page">
      <b>On this page</b>
      <ul class="outline">
        {#each sections as section (section.line)}
          <li class:entry={section.entry}>
            <button
              class:on={section.line === inView}
              aria-current={section.line === inView ? "location" : undefined}
              onclick={() => goTo(section.line)}><Named text={section.title} /></button
            >
          </li>
        {/each}
      </ul>
    </nav>
  {/if}
{/snippet}

{#snippet under()}
  {#if !beside}{@render onThisPage("under")}{/if}
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
  <!-- Home has no trail: its button is marked as the page open. -->
  {#if trail.length > 0}
    <nav class="trail" aria-label="Where this page stands">
      <ol>
        {#each trail as step, at (at)}
          <li class:last={step.to === null}>
            {#if at > 0}<span class="then" aria-hidden="true">{step.beside ? "·" : "›"}</span>{/if}
            {#if step.to !== null}
              <button
                class:mono={step.name}
                onclick={() => step.to !== null && void workspace.showHelpStop(step.to)}
                ><Named text={step.label} /></button
              >
            {:else}
              <span class="here" class:mono={step.name} aria-current="page" data-testid="help-title"
                ><Named text={step.label} /></span
              >
            {/if}
          </li>
        {/each}
      </ol>
    </nav>
  {/if}
{/snippet}

<svelte:window onkeydown={keys} onmousedown={side} onmouseup={side} onauxclick={side} />

<div class="help" data-testid="help">
  <Place
    {workspace}
    name="Help"
    left={[paneOf(workspace, "help", "topics", topics)]}
    bar={controls}
  >
    <div class="page" bind:this={pane} onscroll={watch}>
      <div class="with" class:beside={beside && sections.length > 0}>
        <div class="text">
          {#if raised !== null}
            <!-- The page of a code that Explain opened links back to the line that raised it
                 (release 0.3.1, step 6b; open decision #245). -->
            <p class="raised" data-testid="help-raised">
              <button onclick={() => void workspace.backToRaised()}
                >Back to line {raised.line} of {raised.path.split("/").at(-1)}</button
              >, where the run said {raised.code}.
            </p>
          {/if}
          {#if list !== null}
            <ListPage {list} onopen={(to) => void workspace.showHelpStop(to)} />
          {:else if own !== null}
            {#if own.doc !== null}
              <UsingPage doc={own.doc} {under} onopen={(to) => void workspace.showHelpStop(to)} />
            {:else}
              <p class="quiet" data-testid="help-page">This page cannot be shown: {own.slip}.</p>
            {/if}
          {:else if home !== null}
            <HomePage
              index={home}
              families={workspace.helpCodes}
              {under}
              onopen={(to) => void workspace.showHelpStop(to)}
            />
          {:else if page === ""}
            <!-- Home before the engine has given its index, or where it cannot. -->
            <p class="quiet">
              Press F1 on a function's name in the script, press Explain on what a run said, or type
              a name in the field at the left, to read the engine's page here.
            </p>
          {:else if doc.plain !== null}
            <!-- A page the reader does not know (a package's list): as the engine prints it. -->
            <pre class="mono" data-testid="help-page">{doc.plain}</pre>
          {:else}
            <HelpPage
              {doc}
              {of}
              {under}
              runs={workspace.exampleRuns}
              illustrated={shown?.kind === "code"}
              onname={(name) => void workspace.showHelp(name)}
              oncode={(code) => void workspace.showCode(code)}
            />
          {/if}
        </div>
        {#if beside}{@render onThisPage("beside")}{/if}
      </div>
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
  /* The trail: one line, the steps before the last links; a long one is cut at its end. */
  .trail {
    flex: 0 1 auto;
    font-size: 13.5px;
    min-width: 0;
  }
  .trail ol {
    align-items: center;
    display: flex;
    list-style: none;
    margin: 0;
    overflow: hidden;
    padding: 0;
    white-space: nowrap;
  }
  .trail li {
    align-items: center;
    display: flex;
    flex: none;
  }
  .trail li.last {
    flex: 0 1 auto;
    min-width: 3.5em;
  }
  .trail .then {
    color: var(--ink-3);
    padding: 0 6px;
  }
  .trail button {
    background: none;
    border: 0;
    border-radius: 5px;
    color: var(--accent);
    cursor: pointer;
    display: inline;
    font: inherit;
    padding: 1px 3px;
    width: auto;
  }
  .trail button.mono,
  .trail .here.mono {
    font-family: "JetBrains Mono", ui-monospace, Menlo, monospace;
  }
  .trail button:hover {
    text-decoration: underline;
  }
  .trail button:focus-visible {
    outline: 2px solid var(--accent);
  }
  .trail .here {
    color: var(--ink);
    font-weight: 600;
    overflow: hidden;
    padding: 1px 3px;
    text-overflow: ellipsis;
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
  /* The page and, beside it, the list of its sections: one ground, no rule between them. */
  .with.beside {
    align-items: start;
    display: grid;
    gap: 44px;
    grid-template-columns: minmax(0, 1fr) 190px;
    max-width: 1010px;
  }
  .text {
    min-width: 0;
  }
  .raised {
    color: var(--ink-2);
    margin: 0 0 14px;
  }
  .raised button {
    background: none;
    border: 0;
    border-radius: 4px;
    color: var(--accent);
    font: inherit;
    font-weight: 600;
    padding: 0;
  }
  .raised button:hover {
    text-decoration: underline;
  }
  .otp {
    font-size: 13px;
  }
  /* Beside the text it stays in view as the page is read. */
  .otp.beside {
    max-height: calc(100vh - 160px);
    overflow: auto;
    position: sticky;
    top: 0;
  }
  /* Under the title it is a short block of the page's own, before the first section. */
  .otp.under {
    border-bottom: 1px solid var(--line);
    margin: 0 0 14px;
    max-width: 760px;
    padding: 0 0 10px;
  }
  .otp b {
    color: var(--ink-3);
    display: block;
    font-size: 12.5px;
    font-weight: 600;
    margin: 0 0 6px;
  }
  .outline {
    border-left: 1px solid var(--line-strong);
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .outline button {
    background: none;
    border: 0;
    border-left: 2px solid transparent;
    color: var(--ink-2);
    cursor: pointer;
    display: block;
    font: inherit;
    margin-left: -1px;
    padding: 3px 8px 3px 12px;
    text-align: left;
    width: 100%;
  }
  .outline button:hover {
    color: var(--accent);
  }
  .outline button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }
  .outline .entry button {
    color: var(--ink);
    font-weight: 600;
  }
  .outline .on {
    border-left-color: var(--accent);
    color: var(--accent);
    font-weight: 600;
  }
</style>
