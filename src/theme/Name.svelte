<script lang="ts">
  // The name drawn: Zemp with a small raised Lite badge (release 0.2.4, step 5; open decision
  // #220, item 5; the design guide, section 9, "The name drawn"). The space between the two
  // words is there, set at no size: so the name is read aloud, found and copied as "Zemp Lite",
  // and only its drawing changes. `filled` is for the name inside the one filled button, where
  // the badge is of the button's own ink.
  let { filled = false }: { filled?: boolean } = $props();
  const SPACE = " ";
</script>

<span class="zl" class:filled data-name
  >Zemp<span class="sp">{SPACE}</span><sup class="lite" data-name-badge>Lite</sup></span
>

<style>
  .zl {
    white-space: nowrap;
  }
  .sp {
    font-size: 0;
  }
  /* About 0.3 of the name's size, and never under 11 pixels (the design guide); as the
     approved drawings set it. */
  .lite {
    background: var(--accent-soft);
    border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
    border-radius: 999px;
    color: var(--accent);
    display: inline-block;
    font:
      700 max(0.3em, 11.5px) / 1 "Atkinson Hyperlegible Next",
      sans-serif;
    letter-spacing: 0.04em;
    margin-left: 0.12em;
    padding: 0.22em 0.5em 0.2em;
    position: relative;
    top: -0.15em;
    vertical-align: super;
  }
  .filled .lite {
    background: color-mix(in srgb, currentColor 18%, transparent);
    border-color: color-mix(in srgb, currentColor 45%, transparent);
    color: inherit;
  }
</style>
