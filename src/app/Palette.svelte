<script lang="ts">
  // The command palette: a box to type in and the commands that match, chosen with the arrow
  // keys and Enter, or with the pointer; Escape closes it.
  import { matching, type Command } from "./commands";

  let { commands, onclose }: { commands: Command[]; onclose: () => void } = $props();

  let typed = $state("");
  let chosen = $state(0);
  const listed = $derived(matching(commands, typed));

  function key(event: KeyboardEvent): void {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      chosen = listed.length === 0 ? 0 : (chosen + step + listed.length) % listed.length;
    } else if (event.key === "Enter") {
      event.preventDefault();
      const command = listed[chosen];
      if (command !== undefined) run(command);
    } else if (event.key === "Escape") {
      event.preventDefault();
      onclose();
    }
  }

  function run(command: Command): void {
    onclose();
    command.run();
  }

  function focus(node: HTMLInputElement): void {
    node.focus();
  }
</script>

<!-- A press outside the box closes the palette; the keyboard closes it with Escape. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="veil" onclick={(event) => event.target === event.currentTarget && onclose()}>
  <div class="box" role="dialog" aria-modal="true" aria-label="Commands">
    <input
      use:focus
      bind:value={typed}
      oninput={() => (chosen = 0)}
      onkeydown={key}
      placeholder="Type a command…"
      role="combobox"
      aria-label="Type a command"
      aria-expanded="true"
      aria-controls="palette-list"
      aria-activedescendant={listed.length > 0 ? `palette-${chosen}` : undefined}
      autocomplete="off"
      spellcheck="false"
    />
    <ul id="palette-list" role="listbox" aria-label="Commands">
      {#each listed as command, at (command.name)}
        <!-- The keyboard chooses from the box above; the list answers the pointer. -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <li
          id="palette-{at}"
          role="option"
          aria-selected={at === chosen}
          class:chosen={at === chosen}
          onclick={() => run(command)}
          onpointermove={() => (chosen = at)}
        >
          <span>{command.name}</span>
          {#if command.hint}<em>{command.hint}</em>{/if}
        </li>
      {:else}
        <li class="none">No command of that name.</li>
      {/each}
    </ul>
  </div>
</div>

<style>
  .veil {
    align-items: flex-start;
    background: rgba(20, 20, 30, 0.18);
    display: flex;
    inset: 0;
    justify-content: center;
    padding-top: 90px;
    position: fixed;
    z-index: 20;
  }
  .box {
    background: var(--window);
    border: 1px solid var(--line-strong);
    border-radius: 12px;
    box-shadow: 0 20px 50px -20px rgba(0, 0, 0, 0.4);
    overflow: hidden;
    width: min(560px, 92%);
  }
  input {
    background: var(--window);
    border: 0;
    border-bottom: 1px solid var(--line);
    box-sizing: border-box;
    font-size: 15px;
    outline: none;
    padding: 14px 16px;
    width: 100%;
  }
  ul {
    list-style: none;
    margin: 0;
    max-height: 360px;
    overflow: auto;
    padding: 6px 0;
  }
  li {
    cursor: pointer;
    display: flex;
    gap: 12px;
    justify-content: space-between;
    padding: 8px 16px;
  }
  li.chosen {
    background: var(--accent-soft);
  }
  li em {
    color: var(--ink-3);
    font-size: 12.5px;
    font-style: normal;
  }
  li.none {
    color: var(--ink-3);
    cursor: default;
  }
</style>
