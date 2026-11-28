<script lang="ts">
  // The search field of the Help place (release 0.2.3, step 7; open decision #211, part 4;
  // from release 0.3.1, step 11a, at the top of the index at the left, where #245 draws it:
  // until then it stood at the right end of the place's bar). From the second letter typed a
  // list stands under the field, in the index's place, with what `search.ts` finds, refreshed
  // at each key: up to eight matches, each with what it is, its name, its one line and why it
  // matched; or, where nothing is found, a sentence and the nearest names. ↑ and ↓ move
  // through the list, ↵ opens the one marked, Esc closes it, and `/` puts the cursor in the
  // field from anywhere in the place that is not itself a field (`HelpPlace.svelte`, which
  // opens the pane for it). With none marked ↵ opens the page of the name or the code as
  // typed, as the field did before. A screen reader is told a combobox and its list. Nothing
  // is asked of any server.
  import type { Workspace } from "../app/workspace-state.svelte";
  import Named from "../theme/Named.svelte";
  import { USING } from "../using/pages";
  import { entriesOf, search, LEAST, type Entry, type Match, type OwnPage } from "./search";

  // `showing` tells the pane that the list is on the screen, so that the index gives it room.
  let { workspace, showing = $bindable(false) }: { workspace: Workspace; showing?: boolean } =
    $props();

  // The app's own pages are searched with the engine's: by their titles and their one lines.
  const own: OwnPage[] = USING.map((page) => ({
    title: page.title,
    words: page.line,
    to: { kind: "using", page: page.slug },
  }));
  const entries = $derived(entriesOf(workspace.helpIndex, workspace.helpCodes, own));
  let typed = $state("");
  let open = $state(false);
  /** The match marked, by its place in the list; none until an arrow marks one. */
  let marked = $state<number | null>(null);
  let field = $state<HTMLInputElement | null>(null);

  const found = $derived(search(entries, typed));
  /** What the list offers: the matches, or the nearest names under the sentence. */
  const offered = $derived<(Entry & Partial<Match>)[]>(
    found.matches.length > 0 ? found.matches : (found.nothing?.nearest ?? []),
  );
  // Until the engine has given its index (a moment, the first time Help is shown) there is
  // nothing to search, and the list waits for it: it never says "nothing" of what it has not read.
  const ready = $derived(workspace.helpIndex !== null);
  const shown = $derived(open && ready && (found.matches.length > 0 || found.nothing !== null));
  $effect(() => {
    showing = shown;
  });

  const KINDS = {
    function: "function",
    package: "package",
    dataset: "dataset",
    code: "code",
    page: "page",
  } as const;

  /** The one line of a match in three: before the word that matched, the word, and after. */
  function cut(one: Entry & Partial<Match>): [string, string, string] {
    const word = one.rule === "words" ? (one.word ?? null) : null;
    const at = word === null ? -1 : one.words.indexOf(word);
    if (word === null || at < 0) return [one.words, "", ""];
    return [one.words.slice(0, at), word, one.words.slice(at + word.length)];
  }

  function close(): void {
    open = false;
    marked = null;
  }

  /**
   * Open a page of the list, or, with none marked, the page of what was typed where that is a
   * name, and otherwise the first match offered (`showHelpTyped`); the field is left empty.
   */
  function go(one: Entry | null): void {
    const name = typed.trim();
    const first = offered[0]?.to ?? null;
    typed = "";
    close();
    if (one !== null) {
      void workspace.showHelpStop(one.to);
    } else if (name !== "") {
      void (/^[WZ]\d{4}$/i.test(name)
        ? workspace.showCode(name.toUpperCase())
        : workspace.showHelpTyped(name, first));
    }
  }

  function keys(event: KeyboardEvent): void {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!shown || offered.length === 0) {
        open = true;
        return;
      }
      event.preventDefault();
      const last = offered.length - 1;
      if (event.key === "ArrowDown") marked = marked === null ? 0 : Math.min(last, marked + 1);
      else marked = marked === null || marked === 0 ? null : marked - 1;
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(marked === null ? null : (offered[marked] ?? null));
    } else if (event.key === "Escape" && shown) {
      // The list closes; what was typed stays, and the key goes no further.
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  }

  // **Help: search**, of ⌘K, puts the cursor in the field from any place: once the field is
  // on the screen and the list of commands has closed.
  $effect(() => {
    const input = field;
    if (!workspace.helpSearchAsked || input === null) return;
    workspace.helpSearchAsked = false;
    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  });
</script>

<div class="search">
  <input
    bind:this={field}
    bind:value={typed}
    type="text"
    role="combobox"
    aria-label="Search Help: a function, a package, a dataset, a code, or an R or Stata name"
    aria-expanded={shown}
    aria-controls="help-found"
    aria-autocomplete="list"
    aria-activedescendant={shown && marked !== null ? `help-found-${marked}` : undefined}
    placeholder="Search: a name, a word, R or Stata"
    title="Search Help by a function's name, a word of what it does, an R or a Stata name, or a code"
    autocomplete="off"
    spellcheck="false"
    oninput={() => {
      open = true;
      marked = null;
    }}
    onfocus={() => (open = true)}
    onblur={close}
    onkeydown={keys}
  />
  <kbd aria-hidden="true">/</kbd>
</div>
{#if shown}
  <!-- A press on the list is not to take the cursor from the field before it is answered. -->
  <div class="found" onmousedown={(event) => event.preventDefault()} role="presentation">
    {#if found.nothing !== null}
      <p class="nothing" role="status">{found.nothing.sentence}</p>
    {/if}
    <ul id="help-found" role="listbox" aria-label="What was found">
      {#each offered as one, at (`${one.kind} ${one.name} ${one.packages.join(" ")} ${one.of ?? ""}`)}
        {@const [before, word, after] = cut(one)}
        <!-- The keyboard chooses from the field above; the list answers the pointer. -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <li
          id="help-found-{at}"
          role="option"
          aria-selected={at === marked}
          class:on={at === marked}
          onclick={() => go(one)}
          onpointermove={() => (marked = at)}
        >
          <span class="kind">{KINDS[one.kind]}</span>
          <span class="what">
            <span class="name" class:mono={one.kind !== "page"}>{one.name}</span>
            <!-- A function of a name that has two says which it is, before its package (#215). -->
            {#if one.of !== undefined}<span class="form">{one.of}</span>{/if}
            {#if one.packages.length > 0}
              <span class="of"><Named text={one.packages.join(" · ")} /></span>
            {/if}
            <span class="words">{before}<b>{word}</b>{after}</span>
            {#if one.why}
              <span class="why">matched {one.why}</span>
            {/if}
          </span>
        </li>
      {/each}
    </ul>
  </div>
{:else if open && [...typed.trim()].length < LEAST}
  <!-- The list is not open yet: its place is named, so that the field's own words hold. -->
  <ul id="help-found" role="listbox" aria-label="What was found" hidden></ul>
{/if}

<style>
  /* The field stays at the top of the pane while the index, or the list, moves under it. */
  .search {
    align-items: center;
    background: var(--softer);
    display: flex;
    padding: 2px 0 8px;
    position: sticky;
    top: 0;
    z-index: 2;
  }
  input {
    background: var(--window);
    border: 1px solid var(--line-strong);
    border-radius: 8px;
    box-sizing: border-box;
    color: var(--ink);
    font: inherit;
    font-size: 13px;
    height: 30px;
    min-width: 0;
    padding: 4px 30px 4px 9px;
    text-overflow: ellipsis;
    width: 100%;
  }
  input::placeholder {
    color: var(--ink-3);
  }
  input:focus-visible {
    border-color: var(--accent);
    outline: 3px solid var(--accent-soft);
  }
  kbd {
    border: 1px solid var(--line-strong);
    border-radius: 4px;
    color: var(--ink-3);
    font: inherit;
    font-size: 12.5px;
    line-height: 1.2;
    padding: 0 5px;
    pointer-events: none;
    position: absolute;
    right: 7px;
  }
  /* What was found: in the pane, in the index's place, each match a few short lines. */
  .found {
    padding: 0 0 8px;
  }
  .nothing {
    color: var(--ink-2);
    font-size: 13px;
    margin: 0;
    padding: 6px 8px 4px;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li {
    border-radius: 6px;
    cursor: pointer;
    padding: 5px 8px;
  }
  li.on {
    background: var(--accent-soft);
  }
  .kind {
    color: var(--ink-3);
    font-size: 12.5px;
    margin-right: 6px;
  }
  .name {
    color: var(--ink);
    font-size: 13.5px;
    font-weight: 600;
  }
  .of {
    color: var(--ink-3);
    font-size: 12.5px;
    margin-left: 6px;
  }
  /* Which function of its name: said beside the name, before the package. */
  .form {
    color: var(--ink-2);
    font-size: 12.5px;
    margin-left: 6px;
  }
  .words {
    color: var(--ink-2);
    display: block;
    font-size: 13px;
  }
  .words b {
    color: var(--ink);
    font-weight: 600;
  }
  .why {
    color: var(--accent);
    display: block;
    font-size: 12.5px;
  }
  li.on .kind,
  li.on .of {
    color: var(--ink-2);
  }
</style>
