<script lang="ts">
  // The page a window narrower than 1,000 pixels is shown (open decision #243; release 0.3.1,
  // step 3): that Zemp Lite is made for a computer, why, and a way on at the visitor's own
  // risk. It stands over the app, which is started beneath it as on a computer, and it is gone
  // when the window is made wide enough. Escape goes on, as the button does. From step 13 it
  // is drawn as the front page is (open decision #245): the mark and the drawn name over it,
  // its heading in the headline's face with the last words in the accent, and the watermark
  // faint behind.
  import Logo from "../theme/Logo.svelte";
  import Name from "../theme/Name.svelte";
  import Watermark from "../theme/Watermark.svelte";
  import { NARROWEST } from "./narrow";

  let { width, ongo }: { width: number; ongo: () => void } = $props();
  let page = $state<HTMLDialogElement | null>(null);

  $effect(() => {
    const shown = page;
    shown?.showModal();
    return () => shown?.close();
  });
</script>

<dialog
  bind:this={page}
  aria-labelledby="computer-title"
  data-testid="computer-notice"
  oncancel={ongo}
>
  <!-- The watermark is held to the window, so that it never makes the page wider than it. -->
  <div class="behind"><Watermark faint /></div>
  <div class="words">
    <p class="brand"><Logo size={28} /><span class="name"><Name /></span></p>
    <h1 id="computer-title">Zemp Lite is made <em>for&nbsp;a&nbsp;computer</em></h1>
    <p>
      This window is {width} pixels wide. Zemp Lite shows a script beside its results, its notes and its
      data, and its screens are laid out for a window at least {NARROWEST.toLocaleString("en-GB")} pixels
      wide: a laptop, a desktop, or a tablet held sideways.
    </p>
    <p>
      You may go on at your own risk. Your projects and the engine work as on a computer, but parts
      of the screens will not fit a window this narrow.
    </p>
    <button onclick={ongo}>Go on anyway</button>
  </div>
</dialog>

<style>
  dialog {
    background: var(--window);
    border: 0;
    box-sizing: border-box;
    color: var(--ink);
    height: 100%;
    margin: 0;
    max-height: none;
    max-width: none;
    overflow: auto;
    padding: 0;
    width: 100%;
  }
  dialog::backdrop {
    background: var(--window);
  }
  .behind {
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    position: absolute;
  }
  .words {
    box-sizing: border-box;
    margin: 0 auto;
    max-width: 34rem;
    padding: 9vh 24px 32px;
    position: relative;
    z-index: 1;
  }
  /* The mark and the name, as the front page's bar draws them. */
  .brand {
    align-items: center;
    color: var(--ink);
    display: flex;
    gap: 10px;
    margin: 0 0 34px;
  }
  .name {
    font:
      600 21px/1 "Newsreader",
      serif;
  }
  /* The badge beside a name of this size is 11 pixels (the design guide, "The name drawn"). */
  .name :global(.lite) {
    font-size: 11px;
    top: -0.4em;
  }
  /* The heading in the headline's face: its last words in italic and in the accent. */
  h1 {
    font:
      500 44px/1.05 "Newsreader",
      Georgia,
      serif;
    letter-spacing: -0.02em;
    margin: 0 0 18px;
  }
  h1 em {
    color: var(--accent);
    font-style: italic;
  }
  p {
    color: var(--ink-2);
    font-size: 16px;
    line-height: 1.55;
    margin: 0 0 14px;
  }
  button {
    background: var(--window);
    border: 1px solid var(--line-strong);
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    margin-top: 10px;
    min-height: 44px;
    padding: 8px 20px;
  }
  button:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
</style>
