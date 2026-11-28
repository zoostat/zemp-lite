<script lang="ts">
  // The Topics pane of the Help place (release 0.2.3, steps 5a, 5b and 9c; the row of 0.2.3;
  // open decision #211, items 4, 9 and 13): sections that fold, each with its count.
  // **Packages**, each package the engine ships with its count, a click opening its page;
  // **Errors and warnings**, the families as the engine lists them, each folding to its codes
  // with their titles, a click opening a code's page; **Using Zemp Lite**, the app's own pages
  // by their titles. Which sections are folded is kept with the project. Every name, family
  // and title of the first two is the engine's.
  //
  // Beside a page that has neighbours (`around.ts`) the pane holds those in place of its
  // sections: a function's package with its functions, the open one marked and in view; a
  // package's own functions; a code's family with its codes; a page of the app's own, all of
  // them. **‹ All topics** returns the pane to its sections without leaving the page; the
  // next page opened has its neighbours beside it again. The sections of the page itself are
  // in the pane at the right, **On this page** (item 13).
  //
  // From release 0.3.1 (step 11a; open decision #245) the pane is the index of Help as the
  // revamp draws it. At its top, and staying there, the search field (`SearchField.svelte`),
  // whose list of what was found takes the index's place while it is open. Under it **Start
  // here**: Home and two pages of the app's own. And between Packages and the codes,
  // **Functions**: every function by its name, each with its package, folded until asked for.
  import { familyTopic, TOPICS, topicOpen } from "../app/views";
  import Named from "../theme/Named.svelte";
  import type { Workspace } from "../app/workspace-state.svelte";
  import { aroundOf, functionsOf } from "./around";
  import { USING, USING_TITLE } from "../using/pages";
  import { CODES, type Stop } from "./history";
  import SearchField from "./SearchField.svelte";

  let { workspace }: { workspace: Workspace } = $props();

  const index = $derived(workspace.helpIndex);
  const families = $derived(workspace.helpCodes);
  const codes = $derived((families ?? []).reduce((sum, one) => sum + one.codes.length, 0));
  const shown = $derived(workspace.help.stop);
  const open = (key: string) => topicOpen(workspace.views, key);

  // What stands around the page, shown beside it until the reader asks for all the topics.
  const around = $derived(aroundOf(shown, index, families));
  let all = $state(false);
  $effect(() => {
    void workspace.help.stop;
    all = false;
  });
  const beside = $derived(around.length > 0 && !all);

  // While the search's list is on the screen it stands in the index's place.
  let searching = $state(false);

  // Start here: where Help starts, the first steps in the app, and how to find a page: by a
  // name, a word, or what R or Stata calls it.
  const START: { words: string; title: string; to: Stop }[] = [
    { words: "Help home", title: "Home: where Help starts", to: { kind: "home" } },
    ...["getting-started", "finding-help"].flatMap((slug) => {
      const page = USING.find((one) => one.slug === slug);
      return page === undefined
        ? []
        : [{ words: page.title, title: page.line, to: { kind: "using", page: slug } as Stop }];
    }),
  ];
  const sameStop = (to: Stop) =>
    to.kind === "home"
      ? shown === null || shown.kind === "home"
      : to.kind === "using" && shown?.kind === "using" && shown.page === to.page;

  // Every function by its name, read only while its section is unfolded.
  const functions = $derived(
    index !== null && !beside && open(TOPICS.functions) ? functionsOf(index, shown) : [],
  );
  const functionCount = $derived(
    (index?.packages ?? []).reduce((sum, one) => sum + one.functions.length, 0),
  );

  // The page open is brought into view among its neighbours, inside their own list.
  let pane = $state<HTMLElement | null>(null);
  $effect(() => {
    void around;
    if (!beside || pane === null) return;
    for (const here of pane.querySelectorAll<HTMLElement>(".around [aria-current='page']")) {
      const box = here.closest<HTMLElement>(".around");
      if (box === null) continue;
      const top = here.getBoundingClientRect().top - box.getBoundingClientRect().top;
      box.scrollTop += top - (box.clientHeight - here.offsetHeight) / 2;
    }
  });
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
      <span class="words"><Named text={words} /></span>
      <span class="count">{count}</span>
    </button>
  </h3>
{/snippet}

<!-- A neighbour of the page open: a link to its page, marked where it is the page itself. -->
{#snippet neighbour(
  row: { name: string; words: string; to: Stop; here: boolean; of?: string },
  kind: "functions" | "codes" | "pages",
)}
  <li>
    <button
      class="row"
      class:code={kind === "codes"}
      class:on={row.here}
      aria-current={row.here ? "page" : undefined}
      title={kind === "codes" ? undefined : row.words}
      onclick={() => void workspace.showHelpStop(row.to)}
    >
      <span class:mono={kind !== "pages"}>{row.name}</span>
      <!-- A code has its title; a function of a name that has two says which it is (#215). -->
      {#if kind === "codes"}<span class="title">{row.words}</span
        >{:else if row.of !== undefined}<span class="of">{row.of}</span>{/if}
    </button>
  </li>
{/snippet}

<div class="topics" class:searching bind:this={pane}>
  <SearchField {workspace} bind:showing={searching} />
  <div class="index">
    {#if beside}
      <button class="all" onclick={() => (all = true)}>
        <span aria-hidden="true">‹</span> <span>All topics</span>
      </button>
      {#each around as group (group.name)}
        <section aria-label="Beside this page: {group.name}">
          <h3 class="holder">
            {#if group.to !== null}
              <button
                class="fold"
                title="Open the page of {group.name}"
                onclick={() => group.to !== null && void workspace.showHelpStop(group.to)}
              >
                <span class="words"
                  ><span class:mono={group.kind !== "pages"}><Named text={group.name} /></span
                  >{group.words === "" ? "" : ` ${group.words}`}</span
                >
                <span class="count">{group.rows.length}</span>
              </button>
            {:else}
              <span class="fold here">
                <span class="words mono"><Named text={group.name} /></span>
                <span class="count">{group.rows.length}</span>
              </span>
            {/if}
          </h3>
          <!-- Two packages share the pane, each in a list of its own, the open name in view in each. -->
          <div class="around" style:max-height="{Math.round(72 / around.length)}vh">
            <ul aria-label="The {group.kind} of {group.name}">
              {#each group.rows as row, at (at)}
                {@render neighbour(row, group.kind)}
              {/each}
            </ul>
            {#if group.datasets.length > 0}
              <h4>Datasets <span class="count">{group.datasets.length}</span></h4>
              <ul aria-label="The datasets of {group.name}">
                {#each group.datasets as row (row.name)}
                  {@render neighbour(row, "functions")}
                {/each}
              </ul>
            {/if}
          </div>
        </section>
      {/each}
    {/if}
    {#if !beside}
      <section aria-label="Start here">
        <h3 class="plain">Start here</h3>
        <ul aria-label="Start here">
          {#each START as one (one.words)}
            {@const here = sameStop(one.to)}
            <li>
              <button
                class="row"
                class:on={here}
                aria-current={here ? "page" : undefined}
                title={one.title}
                onclick={() => void workspace.showHelpStop(one.to)}
              >
                <span>{one.words}</span>
              </button>
            </li>
          {/each}
        </ul>
      </section>
    {/if}
    {#if index !== null && !beside}
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
    {#if index !== null && !beside}
      <section aria-label="Functions">
        {@render head(TOPICS.functions, "Functions", functionCount)}
        {#if open(TOPICS.functions)}
          <ul id="help-topic-{TOPICS.functions}" aria-label="Functions">
            {#each functions as one (`${one.name} ${one.package} ${one.of ?? ""}`)}
              <li>
                <button
                  class="row"
                  class:on={one.here}
                  aria-current={one.here ? "page" : undefined}
                  title={one.words}
                  onclick={() => void workspace.showHelpStop(one.to)}
                >
                  <span class="mono">{one.name}</span>
                  <!-- A function of a name that has two says which it is (#215). -->
                  {#if one.of !== undefined}<span class="of">{one.of}</span>{/if}
                  <span class="count">{one.package}</span>
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </section>
    {/if}
    {#if families !== null && !beside}
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
    {#if USING.length > 0 && !beside}
      <section aria-label={USING_TITLE}>
        {@render head(TOPICS.using, USING_TITLE, USING.length)}
        {#if open(TOPICS.using)}
          <ul id="help-topic-{TOPICS.using}" aria-label={USING_TITLE}>
            {#each USING as one (one.slug)}
              {@const here = shown?.kind === "using" && shown.page === one.slug}
              <li>
                <button
                  class="row"
                  class:on={here}
                  aria-current={here ? "page" : undefined}
                  title={one.line}
                  onclick={() => void workspace.showHelpStop({ kind: "using", page: one.slug })}
                >
                  <span>{one.title}</span>
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </section>
    {/if}
  </div>
</div>

<style>
  .topics {
    padding: 0 8px 12px;
  }
  /* The index gives its place to the search's list while that is on the screen. */
  .searching .index {
    display: none;
  }
  h3 {
    font-size: 13.5px;
    margin: 6px 0 0;
  }
  /* A heading that folds nothing: the same words, set where a section's own stand. */
  h3.plain {
    font-weight: 700;
    padding: 5px 8px;
  }
  h3.plain + ul .row {
    padding-left: 8px;
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
  /* All topics: the way from a page's neighbours back to the sections. */
  .all {
    color: var(--accent);
    font-size: 13.5px;
    margin-top: 4px;
  }
  /* The holder of the neighbours, where it is the page open: a heading, not a link. */
  .fold.here {
    padding: 5px 8px;
  }
  /* The neighbours of one holder scroll in a list of their own, the open one kept in view. */
  .around {
    max-height: 72vh;
    overflow: auto;
  }
  h4 {
    align-items: baseline;
    color: var(--ink-2);
    display: flex;
    font-size: 13px;
    font-weight: 600;
    margin: 4px 0 0;
    padding: 5px 8px 5px 26px;
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
  /* Which function of its name a row is: smaller, after the name. */
  .row .of {
    color: var(--ink-3);
    font-size: 12.5px;
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
  .on {
    background: var(--accent-soft);
    color: var(--accent);
    font-weight: 600;
  }
  .on .title {
    color: inherit;
  }
</style>
