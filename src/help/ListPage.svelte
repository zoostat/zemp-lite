<script lang="ts">
  // A page of Help that is a list, set in the type of the engine's pages (release 0.2.3,
  // step 3b; #211, item 7): a package's page, its functions each with its one line, and the
  // codes by family. The names, the one lines, the families and the titles are the engine's
  // (`pages.ts`); each name opens its own page.
  import type { Stop } from "./history";
  import Named from "../theme/Named.svelte";
  import type { ListPage } from "./pages";
  import { pieces } from "./read";

  let {
    list,
    onopen,
  }: {
    list: ListPage;
    /** Open the page a row names. */
    onopen: (to: Stop) => void;
  } = $props();
</script>

<article class="formatted" data-testid="help-page">
  <header>
    <h3 class:mono={list.named}><Named text={list.title} /></h3>
    {#if list.lead !== undefined}<p class="lead">{list.lead}</p>{/if}
    {#if list.facts.length > 0}
      <ul class="facts" aria-label="Facts of {list.title}">
        {#each list.facts as fact (fact)}<li>{fact}</li>{/each}
      </ul>
    {/if}
  </header>
  {#each list.groups as group, line (group.key)}
    <section
      data-line={group.heading === null ? undefined : line}
      aria-labelledby={group.heading === null ? undefined : `help-list-${line}`}
      aria-label={group.heading === null
        ? `The ${list.titles ? "pages" : list.named ? "functions" : "list"} of ${list.title}`
        : undefined}
    >
      {#if group.heading !== null}
        <h4 id="help-list-{line}">
          {#if group.heading.name !== null}<span class="mono family">{group.heading.name}</span
            >{/if}{group.heading.words}
        </h4>
      {/if}
      <table>
        <tbody>
          {#each group.rows as row, at (at)}
            {@const called = row.of === undefined ? row.name : `${row.name} · ${row.of}`}
            <tr>
              <th scope="row">
                <!-- A function of a name that has two says which it is, after its name (#215). -->
                <button
                  class="link"
                  class:title={list.titles}
                  aria-label={called}
                  title="Open the page of {called}"
                  onclick={() => onopen(row.to)}
                  ><span class:mono={!list.titles}>{row.name}</span>{#if row.of !== undefined}<span
                      class="of">{row.of}</span
                    >{/if}</button
                >
              </th>
              <!-- The one line as the engine words it, what it sets between backticks as code. -->
              <td
                >{#each pieces(row.words) as piece, at (at)}{#if piece.kind === "text"}{piece.text}{:else}<code
                      class="mono">{piece.text}</code
                    >{/if}{/each}{#if row.usage !== undefined}<code class="mono usage"
                    >{row.usage}</code
                  >{/if}</td
              >
            </tr>
          {/each}
        </tbody>
      </table>
    </section>
  {/each}
</article>

<style>
  .formatted {
    color: var(--ink);
    font-size: calc(var(--code-size, 14px) + 1px);
    line-height: 1.65;
    max-width: 800px;
  }
  header {
    border-bottom: 1px solid var(--line-strong);
    margin-bottom: 14px;
    padding-bottom: 14px;
  }
  h3 {
    font-size: calc(var(--code-size, 14px) + 13px);
    font-weight: 600;
    line-height: 1.2;
    margin: 0 0 10px;
    overflow-wrap: anywhere;
  }
  /* The sentence under the title of a page that needs one. */
  .lead {
    color: var(--ink-2);
    margin: 0;
  }
  .facts {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .facts li {
    background: var(--soft);
    border: 1px solid var(--line);
    border-radius: 20px;
    color: var(--ink-2);
    font-size: 12.5px;
    line-height: 1.5;
    padding: 1px 10px;
  }
  h4 {
    font-size: 1.05em;
    font-weight: 700;
    letter-spacing: 0.1px;
    margin: 26px 0 6px;
  }
  .family {
    color: var(--ink-2);
    font-size: max(12.5px, 0.86em);
    font-weight: 500;
    margin-right: 10px;
  }
  table {
    border-collapse: collapse;
    width: 100%;
  }
  th {
    font-weight: 400;
    padding: 5px 18px 5px 0;
    text-align: left;
    vertical-align: top;
    white-space: nowrap;
    width: 1%;
  }
  td {
    color: var(--ink-2);
    padding: 5px 0;
    vertical-align: top;
  }
  td code {
    background: var(--soft);
    border: 1px solid var(--line);
    border-radius: 4px;
    color: var(--ink);
    font-size: max(12.5px, 0.86em);
    padding: 0 4px;
  }
  tr + tr th,
  tr + tr td {
    border-top: 1px solid var(--line);
  }
  button.link {
    background: var(--accent-soft);
    border: 0;
    border-radius: 4px;
    color: var(--accent);
    cursor: pointer;
    font-family: "JetBrains Mono", ui-monospace, Menlo, monospace;
    font-size: max(12.5px, 0.86em);
    line-height: inherit;
    padding: 0 5px;
  }
  button.link .mono {
    font-family: inherit;
  }
  /* Which function of its name a row is: in the app's type, after the name. */
  button.link .of {
    font-family: "Atkinson Hyperlegible Next", sans-serif;
    margin-left: 7px;
  }
  /* A function's usage under its one line, on the chooser of a name's functions. */
  td code.usage {
    display: block;
    margin-top: 4px;
    overflow-wrap: anywhere;
    padding: 2px 6px;
    white-space: pre-wrap;
    width: fit-content;
  }
  /* A title, not a name of the engine's: in the app's type. */
  button.link.title {
    background: none;
    font-family: inherit;
    font-size: 1em;
    font-weight: 600;
    padding: 0;
  }
  button.link:hover {
    text-decoration: underline;
  }
  button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
</style>
