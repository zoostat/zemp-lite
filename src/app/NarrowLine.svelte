<script lang="ts">
  // The line a window narrower than 1,200 pixels shows at its top (open decision #33: no
  // tablet or phone layout before 1.0): what the window is laid out for, and that no smaller
  // layout exists yet. The same line on every screen, the Start and welcome screens included.
  let width = $state(window.innerWidth);
</script>

<svelte:window bind:innerWidth={width} />

{#if width < 1200}
  <p class="narrow" role="note">
    Zemp Lite is laid out for a window at least 1,200 pixels wide; this one is {width}. No smaller
    layout exists yet.
  </p>
{/if}

<style>
  .narrow {
    background: var(--warning-soft);
    border-bottom: 1px solid var(--line);
    color: var(--warning);
    flex: none;
    margin: 0;
    padding: 6px 18px;
  }
</style>
