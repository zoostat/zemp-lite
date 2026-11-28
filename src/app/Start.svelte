<script lang="ts">
  // The front page (open decision #245, as completed on 28 November 2026; redrawn at release
  // 0.3.1, step 13). At the left the headline, "Reproducible empirical research, in your
  // browser.", its line, **Start** and three facts; at the right the card of the engine being
  // started, with its three numbered steps under one bar and, under them, three lines of
  // script with what the engine prints for them, taken from the carried engine when the app is
  // built (`facts.ts`; #220's rule). The watermark stands faint behind, and a line at the foot
  // gives the versions, the licence, what is counted and how to report a problem. What follows
  // is the page as it was built, which the redrawing keeps:
  //
  // The loading screen of a first visit (the design guide, section 9, "Loading screen"; open
  // decision #220, item 3; release 0.2.4, step 6; first built at release 0.2, step 18b): the
  // name large with what Zemp Lite is in one line and **Start** (named **Open Zemp Lite** until
  // 0.2.5; open decision #225, item 5), which is grey until
  // the engine runs; beside it a card, the engine fetched, checked and started under one bar,
  // each step with its mark, its line and its state; and the four promises in a band. The bar
  // glides however fast the steps finish, the button opens when the bar is full, and the first
  // step says how the engine came: over the network, with the bytes that travelled, or from
  // the browser's own keeping (open decision #220, item 10; release 0.2.4, step 6b). The next visit opens straight on the welcome screen, the engine being kept
  // by the browser. The check is of the engine's digest: the file fetched must be the one this
  // release was built with (its SHA-256); signed releases come later (Zemp Specification,
  // section 13).
  import engineUrl from "../../worker/pkg/web/zemp_worker_bg.wasm?url";
  import type { Engine } from "../engine/engine";
  import Code from "../editor/Code.svelte";
  import Named from "../theme/Named.svelte";
  import Watermark from "../theme/Watermark.svelte";
  import { FACTS, megabytes } from "./facts";
  import FrontBar from "./FrontBar.svelte";
  import { came, glided, marked, reached, type Came, type State } from "./start";
  import { ENGINE, ENGINE_BYTES, ENGINE_SHA256, VERSION, shown as versionShown } from "./version";

  let { engine, onopen }: { engine: Engine; onopen: () => void } = $props();

  let fetching = $state<State>("waiting");
  let checking = $state<State>("waiting");
  let starting = $state<State>("waiting");
  let received = $state(0);
  let problem = $state("");

  /** How much of the engine has come, of a hundred; none known before the worker is built. */
  const share = $derived(
    ENGINE_BYTES === null || ENGINE_BYTES === 0
      ? null
      : Math.min(100, Math.round((received / ENGINE_BYTES) * 100)),
  );
  // One bar over the three steps. Where the steps have got to is one thing, and what the bar
  // shows another: the bar glides towards it, never faster than the whole bar in a second, so
  // that a start that is done at once (the engine already kept) is still seen to be made.
  const target = $derived(reached({ fetching, checking, starting }, share));
  let glide = $state(0);
  const quiet =
    typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  $effect(() => {
    let frame = 0;
    let before = performance.now();
    const move = (now: number) => {
      // A reader who has asked for less motion is shown where the steps are, at once.
      glide = quiet ? target : glided(glide, target, now - before);
      before = now;
      frame = requestAnimationFrame(move);
    };
    frame = requestAnimationFrame(move);
    return () => cancelAnimationFrame(frame);
  });
  // The number the bar gives, never ahead of the bar: it says 100 only when the bar is full,
  // which is when the button opens.
  const whole = $derived(Math.floor(glide + 0.001));
  // The steps as the screen marks them: each done once the bar has passed it.
  const shown = $derived(marked({ fetching, checking, starting }, glide));
  const ready = $derived(shown.starting === "done");
  const step = $derived(shown.fetching !== "done" ? 1 : shown.checking !== "done" ? 2 : 3);
  /**
   * The size the engine travels at from the host, as the build reckons it (`facts.ts`). The
   * step says it until the engine has come and keeps it beside what it then says, so that the
   * check after a deployment can hold the reckoning to the bytes the address sent.
   */
  const travels = FACTS === null ? null : megabytes(FACTS.travels);
  /** How the engine came this time, once it has: fetched, with its bytes, or already kept. */
  let arrived = $state<Came>(null);
  const first = $derived(
    arrived?.how === "kept"
      ? "already in this browser"
      : arrived?.how === "fetched"
        ? `${megabytes(arrived.bytes)}, once`
        : travels === null
          ? "once"
          : `${travels}, once`,
  );

  /** The engine's file, fetched as it comes, so that its progress can be shown. */
  async function fetched(): Promise<Uint8Array<ArrayBuffer>> {
    const answer = await fetch(engineUrl);
    if (!answer.ok || answer.body === null) {
      throw new Error(`the engine could not be fetched: the host answered ${answer.status}`);
    }
    const reader = answer.body.getReader();
    const chunks: Uint8Array[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
    }
    const whole = new Uint8Array(new ArrayBuffer(received));
    let at = 0;
    for (const chunk of chunks) {
      whole.set(chunk, at);
      at += chunk.length;
    }
    // The browser's own record of the fetch says how the file came.
    const address = new URL(engineUrl, window.location.href).href;
    arrived = came(
      performance.getEntriesByName(address, "resource").at(-1) as
        PerformanceResourceTiming | undefined,
    );
    return whole;
  }

  async function begin(): Promise<void> {
    problem = "";
    received = 0;
    arrived = null;
    checking = "waiting";
    starting = "waiting";
    try {
      fetching = "going";
      const bytes = await fetched();
      fetching = "done";
      checking = "going";
      if (ENGINE_SHA256 !== null) {
        const digest = await crypto.subtle.digest("SHA-256", bytes);
        const hex = [...new Uint8Array(digest)]
          .map((byte) => byte.toString(16).padStart(2, "0"))
          .join("");
        if (hex !== ENGINE_SHA256) {
          throw new Error(
            "the engine fetched is not the one this release was built with: its digest differs",
          );
        }
      }
      checking = "done";
      starting = "going";
      await engine.start();
      starting = "done";
    } catch (error) {
      problem = (error as Error).message;
      for (const step of ["fetching", "checking", "starting"] as const) {
        const now = { fetching, checking, starting }[step];
        if (now === "going") {
          if (step === "fetching") fetching = "failed";
          if (step === "checking") checking = "failed";
          if (step === "starting") starting = "failed";
        }
      }
    }
  }
  void begin();

  const said: Record<State, string> = {
    waiting: "waiting",
    going: "…",
    done: "done",
    failed: "failed",
  };

  /** The break between two lines of the example, kept as the script has it. */
  const BREAK = "\n";

  // Once the engine runs the cursor is on **Start**, so that Return presses it too.
  let open = $state<HTMLButtonElement | null>(null);
  $effect(() => {
    if (ready) open?.focus();
  });
</script>

<!-- The mark of a step: a tick when done, a turning ring while it runs, its number while it waits. -->
{#snippet mark(state: State, number: number)}
  <i class="mark" aria-hidden="true">
    {#if state === "done"}
      <svg viewBox="0 0 20 20"><path d="M5 10.5 8.5 14 15 6.5" /></svg>
    {:else if state === "failed"}
      !
    {:else if state === "waiting"}
      {number}
    {/if}
  </i>
{/snippet}

<div class="screen">
  <Watermark faint />
  <FrontBar />
  <main class="start-main" data-testid="start">
    <section class="hero">
      <h1>Reproducible empirical research, <em>in&nbsp;your&nbsp;browser.</em></h1>
      <p class="lede">
        Regressions, tests, tables and figures from a short script, run on this computer with
        nothing installed. The same script gives the same numbers wherever it runs.
      </p>
      <div class="go">
        <button class="open" bind:this={open} disabled={!ready} onclick={onopen}>Start</button>
        <p class="hint" data-testid="open-hint">
          {#if ready}
            The engine is ready · press <kbd>Return</kbd>
          {:else}
            Opens as soon as the engine is ready
          {/if}
        </p>
      </div>
      <ul class="facts" aria-label="What Zemp Lite promises">
        <li>
          <b>Runs here</b>
          <span
            >The engine runs in this browser; your scripts and data are never sent anywhere.</span
          >
        </li>
        <li>
          <b>Stays here</b>
          <span>Projects live in this browser until you export them.</span>
        </li>
        <li>
          <b>No account</b>
          <span>Nothing to sign up for; open the page and start.</span>
        </li>
      </ul>
    </section>

    <section class="card" aria-label="Starting the engine" data-engine={starting}>
      <header>
        <h2>Starting the engine</h2>
        <p class="barnote" data-testid="start-whole">
          <span>{ready ? "Ready" : `Step ${step} of 3`}</span><span>{whole} %</span>
        </p>
      </header>
      <div
        class="bar"
        role="progressbar"
        aria-label="Starting the engine"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={whole}
      >
        <i style:width="{whole}%"></i>
      </div>
      <ol class="steps">
        <li class={shown.fetching} data-testid="step-fetch">
          {@render mark(shown.fetching, 1)}
          <div class="t">
            <b>Fetching the engine</b>
            <span data-testid="step-fetch-how" data-reckoned={travels}>{first}</span>
          </div>
          <em
            >{shown.fetching === "going" && fetching === "going" && share !== null
              ? `${share} %`
              : said[shown.fetching]}</em
          >
        </li>
        <li class={shown.checking} data-testid="step-check">
          {@render mark(shown.checking, 2)}
          <div class="t">
            <b>Checking that it is the engine of this release</b>
            <span>its digest against the one this release was built with</span>
          </div>
          <em
            >{shown.checking === "going"
              ? "checking…"
              : shown.checking === "done" && ENGINE_SHA256 === null
                ? "no digest in this build"
                : said[shown.checking]}</em
          >
        </li>
        <li class={shown.starting} data-testid="step-start">
          {@render mark(shown.starting, 3)}
          <div class="t">
            <b>Starting it in this browser</b>
            <span>in a worker of its own, so the page never freezes</span>
          </div>
          <em
            >{shown.starting === "going"
              ? "starting…"
              : shown.starting === "done"
                ? `Zeff ${engine.version ?? ENGINE} ready`
                : said[shown.starting]}</em
          >
        </li>
      </ol>
      {#if problem}
        <p class="problem" role="alert">
          {problem}. <button class="word" onclick={() => void begin()}>Try again</button>
        </p>
      {/if}
      {#if FACTS !== null}
        <!-- Three lines of script and what the engine this release carries prints for them:
             taken from that engine when the app is built, not written here. -->
        <figure class="peek" data-testid="start-example">
          <figcaption>What a run looks like</figcaption>
          <pre
            class="mono script"
            data-testid="start-example-script">{#each FACTS.example.script.split("\n") as line, at (at)}{#if at > 0}{BREAK}{/if}<Code
                text={line}
                inline
              />{/each}</pre>
          <pre class="mono printed" data-testid="start-example-printed">{FACTS.example
              .printed}</pre>
        </figure>
      {/if}
    </section>
  </main>

  <footer class="bottom">
    <span data-testid="start-versions"
      ><Named text={`Zemp Lite ${versionShown(VERSION)} · engine Zeff ${ENGINE}`} /></span
    >
    <span>Apache 2.0 licence</span>
    <a class="counted" href="/counted.html">What is counted</a>
    <span class="gap"></span>
    <span class="report">Something wrong? In a project, ⌘K → <b>Report a problem</b></span>
  </footer>
</div>

<style>
  .screen {
    background: var(--window);
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    overflow: auto;
    position: relative;
  }
  .screen > :global(*:not(.watermark)) {
    position: relative;
    z-index: 1;
  }
  .start-main {
    align-items: center;
    box-sizing: border-box;
    display: grid;
    flex: 1 0 auto;
    gap: 56px;
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
    margin: 0 auto;
    max-width: 1440px;
    padding: 24px 56px 32px;
    width: 100%;
  }
  /* The headline: Newsreader, large, its last words in italic and in the accent. */
  h1 {
    font:
      500 76px/1.02 "Newsreader",
      serif;
    letter-spacing: -0.02em;
    margin: 0 0 18px;
  }
  h1 em {
    color: var(--accent);
    font-style: italic;
  }
  .lede {
    color: var(--ink-2);
    font-size: 19px;
    line-height: 1.5;
    margin: 0 0 28px;
    max-width: 560px;
  }
  .go {
    align-items: center;
    display: flex;
    gap: 16px;
    margin-bottom: 30px;
  }
  .open {
    background: var(--button);
    border: 1px solid transparent;
    border-radius: 9px;
    box-shadow: 0 8px 24px -10px color-mix(in srgb, var(--button) 70%, transparent);
    color: var(--button-ink);
    flex: none;
    font-size: 17px;
    font-weight: 700;
    padding: 13px 34px;
  }
  .open:hover:not(:disabled) {
    background: var(--accent-hover);
  }
  .open:disabled {
    background: var(--soft);
    border-color: var(--line-strong);
    box-shadow: none;
    color: var(--ink-3);
  }
  .hint {
    color: var(--ink-3);
    font-size: 13.5px;
    margin: 0;
  }
  kbd {
    border: 1px solid var(--line-strong);
    border-radius: 4px;
    font: inherit;
    font-size: 12.5px;
    padding: 0 5px;
  }
  .facts {
    border-top: 1px solid var(--line);
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    list-style: none;
    margin: 0;
    max-width: 640px;
    padding: 0;
  }
  .facts li {
    padding: 14px 18px 0 0;
  }
  .facts b {
    display: block;
    font-size: 15px;
    margin-bottom: 3px;
  }
  .facts span {
    color: var(--ink-2);
    font-size: 13.5px;
    line-height: 1.45;
  }
  .card {
    background: var(--softer);
    border: 1px solid var(--line);
    border-radius: 18px;
    box-shadow: 0 24px 48px -36px rgba(20, 42, 102, 0.5);
    overflow: hidden;
  }
  .card header {
    align-items: center;
    display: flex;
    justify-content: space-between;
    padding: 14px 18px;
  }
  h2 {
    font: inherit;
    font-size: 15px;
    font-weight: 700;
    margin: 0;
  }
  .barnote {
    color: var(--ink-2);
    display: flex;
    font-size: 13px;
    gap: 14px;
    margin: 0;
  }
  .barnote span:last-child {
    font-variant-numeric: tabular-nums;
    min-width: 4ch;
    text-align: right;
  }
  .bar {
    background: var(--line);
    height: 4px;
    overflow: hidden;
  }
  .bar i {
    background: var(--accent);
    display: block;
    height: 100%;
  }
  .steps {
    list-style: none;
    margin: 0;
    padding: 6px 18px 4px;
  }
  .steps li {
    align-items: center;
    border-bottom: 1px solid var(--line);
    display: grid;
    gap: 12px;
    grid-template-columns: 30px minmax(0, 1fr) auto;
    padding: 12px 0;
  }
  .steps li:last-child {
    border-bottom: 0;
  }
  .mark {
    border: 1.5px solid var(--line-strong);
    border-radius: 50%;
    box-sizing: border-box;
    color: var(--ink-3);
    display: grid;
    font:
      600 13px/1 "Atkinson Hyperlegible Next",
      sans-serif;
    height: 26px;
    place-items: center;
    width: 26px;
  }
  .mark svg {
    fill: none;
    height: 15px;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 2.4;
    width: 15px;
  }
  .done .mark {
    background: var(--ok-soft);
    border-color: transparent;
    color: var(--ok);
  }
  .going .mark {
    animation: turning 0.9s linear infinite;
    border: 2.5px solid var(--accent-soft);
    border-top-color: var(--accent);
  }
  .failed .mark {
    background: var(--error-soft);
    border-color: transparent;
    color: var(--error);
  }
  @keyframes turning {
    to {
      transform: rotate(360deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .going .mark {
      animation: none;
    }
  }
  .t b {
    display: block;
    font-size: 14.5px;
    font-weight: 600;
  }
  .t span {
    color: var(--ink-3);
    display: block;
    font-size: 13px;
  }
  .waiting .t b {
    color: var(--ink-3);
    font-weight: 500;
  }
  .steps em {
    color: var(--ink-3);
    font-size: 13px;
    font-style: normal;
    white-space: nowrap;
  }
  .done em {
    color: var(--ok);
  }
  .going em {
    color: var(--accent);
    font-weight: 600;
  }
  .failed em {
    color: var(--error);
  }
  .problem {
    border-top: 1px solid var(--line);
    color: var(--error);
    font-size: 13.5px;
    margin: 0;
    padding: 12px 18px;
  }
  .word {
    background: none;
    border: 0;
    color: var(--accent);
    padding: 0;
    text-decoration: underline;
  }
  /* What a run looks like: the script in the editor's colours, its print under it. */
  .peek {
    background: var(--window);
    border-top: 1px solid var(--line);
    margin: 0;
    padding: 14px 18px 16px;
  }
  .peek figcaption {
    color: var(--ink-3);
    font-size: 12.5px;
    font-weight: 600;
    letter-spacing: 0.06em;
    margin-bottom: 6px;
    text-transform: uppercase;
  }
  /* The three lines fit the card at every width the page is laid out for; were a window
     narrower still, a line would be broken, not cut. */
  .peek pre {
    font-size: 13px;
    line-height: 1.6;
    margin: 0;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }
  .peek .printed {
    color: var(--ink-2);
  }
  .bottom {
    align-items: center;
    background: var(--window);
    border-top: 1px solid var(--line);
    color: var(--ink-3);
    display: flex;
    flex: none;
    flex-wrap: wrap;
    font-size: 13px;
    gap: 6px 22px;
    padding: 11px 28px;
  }
  .gap {
    flex: 1;
  }
  .counted {
    color: var(--ink-2);
  }
  .report b {
    color: var(--ink-2);
  }
  /* Where the window is narrower the headline is set smaller, so that the page keeps to one
     screen at a laptop's and a tablet's size. */
  @media (max-width: 1280px) {
    .start-main {
      gap: 36px;
      padding: 16px 36px 24px;
    }
    h1 {
      font-size: 60px;
    }
  }
  @media (max-width: 1100px) {
    h1 {
      font-size: 50px;
    }
    .lede {
      font-size: 17px;
    }
  }
</style>
