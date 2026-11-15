<script lang="ts">
  // The round light and dark button of the start and welcome screens (the design guide,
  // section 5). Inside a project the top bar's Dark switch does the same.
  import { switchTheme, theme } from "./theme.svelte";
</script>

<button
  class="round"
  onclick={switchTheme}
  aria-label={theme.name === "dark" ? "Switch to the light theme" : "Switch to the dark theme"}
  aria-pressed={theme.name === "dark"}
  title={theme.name === "dark" ? "Light" : "Dark"}
>
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    {#if theme.name === "dark"}
      <circle cx="12" cy="12" r="4.2" fill="currentColor" />
      <g stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
        <path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4" />
        <path d="M5.3 5.3l1.7 1.7M17 17l1.7 1.7M5.3 18.7l1.7-1.7M17 7l1.7-1.7" />
      </g>
    {:else}
      <path d="M20 14.2A8.3 8.3 0 0 1 9.8 4a8.3 8.3 0 1 0 10.2 10.2z" fill="currentColor" />
    {/if}
  </svg>
</button>

<style>
  .round {
    align-items: center;
    background: var(--window);
    border: 1px solid var(--line-strong);
    border-radius: 50%;
    color: var(--ink-2);
    display: inline-flex;
    height: 36px;
    justify-content: center;
    padding: 0;
    width: 36px;
  }
  .round:hover {
    color: var(--accent);
  }
</style>
