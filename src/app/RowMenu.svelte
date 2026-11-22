<script lang="ts">
  // The menu of a row (release 0.2.2, step 3: a project's row of the start screen; step 4: a
  // file's or a folder's row of the Project pane). A small button at the row's end, named for
  // its row and a stop of the Tab key; pressed, it lists what can be done with the row. The
  // arrow keys move through the list, Escape and a press elsewhere close it, and focus goes
  // back to the button. An item that does not apply to a row is not in its list.

  export interface RowAction {
    name: string;
    run: () => void;
  }

  let { label, actions }: { label: string; actions: RowAction[] } = $props();

  let open = $state(false);
  let button = $state<HTMLButtonElement | null>(null);
  let list = $state<HTMLElement | null>(null);
  /** Where the list stands: under the button, kept inside the window. */
  let place = $state({ left: 0, top: 0 });

  function items(): HTMLElement[] {
    return [...(list?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
  }

  function show(): void {
    if (button === null) return;
    const at = button.getBoundingClientRect();
    place = { left: Math.max(8, Math.min(at.left, window.innerWidth - 228)), top: at.bottom + 4 };
    open = true;
    // The first item is where the keyboard begins.
    queueMicrotask(() => items()[0]?.focus());
  }

  function close(back = true): void {
    if (!open) return;
    open = false;
    if (back) button?.focus();
  }

  function keys(event: KeyboardEvent): void {
    const all = items();
    const at = all.indexOf(document.activeElement as HTMLElement);
    const to = (index: number) => all[(index + all.length) % all.length]?.focus();
    if (event.key === "Escape") close();
    else if (event.key === "ArrowDown") to(at + 1);
    else if (event.key === "ArrowUp") to(at - 1);
    else if (event.key === "Home") to(0);
    else if (event.key === "End") to(all.length - 1);
    else if (event.key === "Tab") {
      close(false);
      return;
    } else return;
    event.preventDefault();
    event.stopPropagation();
  }

  function choose(action: RowAction): void {
    close();
    action.run();
  }
</script>

<svelte:window
  onpointerdown={(event) => {
    const target = event.target as Node;
    if (open && !list?.contains(target) && !button?.contains(target)) close(false);
  }}
  onresize={() => close(false)}
/>

{#if actions.length > 0}
  <button
    class="more"
    bind:this={button}
    aria-label={label}
    title={label}
    aria-haspopup="menu"
    aria-expanded={open}
    onclick={(event) => {
      event.stopPropagation();
      if (open) close();
      else show();
    }}
  >
    <span aria-hidden="true">⋯</span>
  </button>
  {#if open}
    <!-- svelte-ignore a11y_interactive_supports_focus -->
    <div
      class="list"
      role="menu"
      aria-label={label}
      bind:this={list}
      style:left="{place.left}px"
      style:top="{place.top}px"
      onkeydown={keys}
    >
      {#each actions as action (action.name)}
        <button role="menuitem" tabindex="-1" onclick={() => choose(action)}>{action.name}</button>
      {/each}
    </div>
  {/if}
{/if}

<style>
  .more {
    background: none;
    border: 0;
    border-radius: 6px;
    color: var(--ink-3);
    cursor: pointer;
    flex: none;
    font: inherit;
    font-size: 15px;
    line-height: 1;
    padding: 4px 7px;
  }
  .more:hover,
  .more[aria-expanded="true"] {
    background: var(--line);
    color: var(--ink);
  }
  .more:focus-visible,
  .list button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }
  .list {
    background: var(--window);
    border: 1px solid var(--line-strong);
    border-radius: 8px;
    box-shadow: 0 6px 22px rgb(0 0 0 / 14%);
    display: flex;
    flex-direction: column;
    min-width: 180px;
    padding: 4px;
    position: fixed;
    width: max-content;
    max-width: 220px;
    z-index: 30;
  }
  .list button {
    background: none;
    border: 0;
    border-radius: 6px;
    color: var(--ink);
    cursor: pointer;
    font: inherit;
    font-size: 13.5px;
    padding: 6px 10px;
    text-align: left;
  }
  .list button:hover,
  .list button:focus {
    background: var(--soft);
  }
</style>
