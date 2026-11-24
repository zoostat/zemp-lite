<script lang="ts">
  // The top bar of the loading and project screens (the design guide, section 9; open
  // decision #220, items 3 and 4): the mark and the drawn name with the version, what a screen
  // puts at the right, and the theme button; under it the alpha notice, as a thin strip.
  import type { Snippet } from "svelte";
  import Logo from "../theme/Logo.svelte";
  import Name from "../theme/Name.svelte";
  import ThemeButton from "../theme/ThemeButton.svelte";
  import { ENGINE, VERSION, shown } from "./version";

  let { children }: { children?: Snippet } = $props();
</script>

<header class="bar-top">
  <span class="brand">
    <Logo size={28} />
    <span class="name"><Name /></span>
    <span class="version" data-testid="version">{shown(VERSION)}</span>
  </span>
  <span class="gap"></span>
  {@render children?.()}
  <ThemeButton />
</header>
<p class="alphabar">
  <span class="pill" data-testid="alpha">alpha</span>
  The first public preview: much is still to come, and what is here will change. Every result is the released
  Zeff {ENGINE} engine's own.
</p>

<style>
  .bar-top {
    align-items: center;
    background: var(--window);
    border-bottom: 1px solid var(--line);
    display: flex;
    flex: none;
    gap: 16px;
    padding: 12px 32px;
  }
  .brand {
    align-items: center;
    display: flex;
    gap: 10px;
  }
  .name {
    font:
      600 21px/1 "Newsreader",
      serif;
  }
  .version {
    color: var(--ink-3);
    font-size: 13px;
    font-weight: 500;
  }
  .gap {
    flex: 1;
  }
  .alphabar {
    background: var(--accent-soft);
    border-bottom: 1px solid var(--line);
    color: var(--ink);
    flex: none;
    font-size: 13.5px;
    margin: 0;
    padding: 8px 32px;
  }
  .pill {
    background: var(--window);
    border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent);
    border-radius: 999px;
    color: var(--accent);
    display: inline-block;
    font-size: 12.5px;
    font-weight: 600;
    margin-right: 6px;
    padding: 0 9px;
  }
  @media (max-width: 640px) {
    .bar-top,
    .alphabar {
      padding-left: 16px;
      padding-right: 16px;
    }
  }
</style>
