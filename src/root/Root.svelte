<script lang="ts">
  // The front page, until the landing page stands (release 0.2.4, step 2; the landing page is
  // step 8): what Zemp Lite is in one line, and the way into the app, so that the address is
  // never without one. It fetches nothing of the engine.
  import { ENGINE, VERSION, shown } from "../app/version";
  import Logo from "../theme/Logo.svelte";
  import ThemeButton from "../theme/ThemeButton.svelte";
  import { APP } from "./forward";
</script>

<div class="corner"><ThemeButton /></div>
<main class="front" data-testid="front">
  <header>
    <Logo size={34} />
    <h1>Zemp Lite</h1>
  </header>
  <p class="lede">
    Zeff in your browser. Write a script, run it and read the results, with nothing to install and
    nothing uploaded.
  </p>
  <p><a class="open" href={APP}>Open Zemp Lite</a></p>
  <p class="version">Version {shown(VERSION)}, on the Zeff {ENGINE} engine</p>
</main>
<footer class="bottom">
  <a href="/counted.html">What is counted</a>
</footer>

<style>
  :global(#root) {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .corner {
    position: absolute;
    right: 18px;
    top: 16px;
  }
  .front {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 10px;
    margin: 0 auto;
    max-width: 640px;
    padding: 72px 24px 32px;
    width: 100%;
    box-sizing: border-box;
  }
  header {
    align-items: center;
    display: flex;
    gap: 14px;
  }
  h1 {
    font-family: "Newsreader", serif;
    font-size: 44px;
    font-weight: 500;
    line-height: 1.1;
    margin: 0;
  }
  .lede {
    color: var(--ink-2);
    font-size: 18px;
    line-height: 1.5;
    margin: 6px 0 10px;
  }
  .open {
    background: var(--button);
    border-radius: 8px;
    color: var(--button-ink);
    display: inline-block;
    font-size: 16.5px;
    font-weight: 600;
    padding: 10px 22px;
    text-decoration: none;
  }
  .version {
    color: var(--ink-3);
    font-size: 14px;
    margin: 0;
  }
  .bottom {
    border-top: 1px solid var(--line);
    color: var(--ink-3);
    font-size: 13.5px;
    padding: 10px 24px;
  }
  .bottom a {
    color: var(--ink-2);
  }
</style>
