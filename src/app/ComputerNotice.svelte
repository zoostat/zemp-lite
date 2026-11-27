<script lang="ts">
  // The page a window narrower than 1,000 pixels is shown (open decision #243; release 0.3.1,
  // step 3): that Zemp Lite is made for a computer, why, and a way on at the visitor's own
  // risk. It stands over the app, which is started beneath it as on a computer, and it is gone
  // when the window is made wide enough. Escape goes on, as the button does.
  import Logo from "../theme/Logo.svelte";
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
  <div class="words">
    <Logo size={44} />
    <h1 id="computer-title">Zemp Lite is made for a computer</h1>
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
  .words {
    box-sizing: border-box;
    margin: 0 auto;
    max-width: 34rem;
    padding: 12vh 24px 32px;
  }
  h1 {
    font:
      600 30px/1.2 "Newsreader",
      Georgia,
      serif;
    margin: 20px 0 14px;
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
