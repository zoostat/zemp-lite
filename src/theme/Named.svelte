<script lang="ts">
  // A text set with the name drawn wherever it holds it (see `named.ts`): a title, a sentence
  // or a message that may name Zemp Lite. Every other word is left as it is.
  import Name from "./Name.svelte";
  import { named } from "./named";

  let { text, filled = false }: { text: string; filled?: boolean } = $props();
  const pieces = $derived(named(text));
</script>

{#each pieces as piece, at (at)}{#if "name" in piece}<Name
      {filled}
    />{:else}{piece.text}{/if}{/each}
