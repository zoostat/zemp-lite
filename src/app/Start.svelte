<script lang="ts">
  // The loading screen of a first visit (the design guide, section 9, "Loading screen"; open
  // decision #220, item 3; release 0.2.4, step 6; first built at release 0.2, step 18b): the
  // name large with what Zemp Lite is in one line and **Open Zemp Lite**, which is grey until
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
  import HexIcon from "../theme/HexIcon.svelte";
  import Name from "../theme/Name.svelte";
  import Watermark from "../theme/Watermark.svelte";
  import { FACTS, megabytes } from "./facts";
  import FrontBar from "./FrontBar.svelte";
  import NarrowLine from "./NarrowLine.svelte";
  import { came, glided, marked, reached, type Came, type State } from "./start";
  import { ENGINE, ENGINE_BYTES, ENGINE_SHA256 } from "./version";

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
  /** The size the engine travels at from the host, as the build reckons it (`facts.ts`). */
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

  // Once the engine runs the cursor is on **Open Zemp Lite**, so that Return opens it too.
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

<NarrowLine />
<div class="screen">
  <Watermark />
  <FrontBar />
  <main class="start-main" data-testid="start">
    <section class="hero">
      <h1><Name /></h1>
      <p class="lede">
        <strong>Zeff in your browser.</strong> Write a script, run it and read the results, with nothing
        to install and nothing uploaded.
      </p>
      <button class="open" bind:this={open} disabled={!ready} onclick={onopen}
        >Open <Name filled />{#if ready}<span class="arrow" aria-hidden="true">→</span>{/if}</button
      >
      <p class="hint" data-testid="open-hint">
        {ready ? "or press ↵" : "Opens as soon as the engine is ready."}
      </p>
    </section>

    <section class="card" aria-label="Starting the engine" data-engine={starting}>
      <h2>Starting the engine</h2>
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
      <p class="barnote" data-testid="start-whole">
        <span>{ready ? "Ready" : `Step ${step} of 3`}</span><span>{whole} %</span>
      </p>
      <ol class="steps">
        <li class={shown.fetching} data-testid="step-fetch">
          {@render mark(shown.fetching, 1)}
          <div class="t">
            <b>Fetching the engine</b>
            <span data-testid="step-fetch-how">{first}</span>
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
    </section>
  </main>

  <section class="promise-band" aria-label="What Zemp Lite promises">
    <ul class="promises">
      <li>
        <HexIcon name="here" size={40} />
        <div>
          <b>It runs here</b>
          <span>The engine runs in this browser; your scripts are never sent anywhere.</span>
        </div>
      </li>
      <li>
        <HexIcon name="lock" size={40} />
        <div>
          <b>Your data stays on this computer</b>
          <span>In this browser's private storage.</span>
        </div>
      </li>
      <li>
        <HexIcon name="no-account" size={40} />
        <div>
          <b>No account</b>
          <span>There is nothing to sign up for.</span>
        </div>
      </li>
      <li>
        <HexIcon name="bolt" size={40} />
        <div>
          <b>The next visit opens at once</b>
          <span>The browser keeps the engine.</span>
        </div>
      </li>
    </ul>
  </section>
  <footer class="bottom">
    <span class="gap"></span>
    <a class="counted" href="/counted.html">What is counted</a>
    <span class="engine">engine Zeff {ENGINE} · in this browser</span>
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
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
    margin: 0 auto;
    max-width: 1180px;
    padding: 56px 32px 40px;
    width: 100%;
  }
  h1 {
    font:
      600 84px/1 "Newsreader",
      serif;
    letter-spacing: -0.01em;
    margin: 0 0 20px;
  }
  /* The badge of a page's title is 0.26 of the name (the design guide, "The name drawn"). */
  h1 :global(.lite) {
    font-size: 0.26em;
    margin-left: 0.08em;
    top: -0.35em;
  }
  .lede {
    color: var(--ink-2);
    font-size: 21px;
    line-height: 1.45;
    margin: 0 0 34px;
    max-width: 520px;
  }
  .lede strong {
    color: var(--ink);
  }
  .open {
    background: var(--button);
    border: 1px solid transparent;
    border-radius: 6px;
    box-shadow: 0 8px 24px -10px color-mix(in srgb, var(--button) 70%, transparent);
    color: var(--button-ink);
    font-size: 17px;
    font-weight: 700;
    letter-spacing: 0.06em;
    padding: 18px 40px;
    text-transform: uppercase;
  }
  .open :global(.lite) {
    text-transform: none;
  }
  .open:disabled {
    background: var(--soft);
    border-color: var(--line-strong);
    box-shadow: none;
    color: var(--ink-3);
  }
  /* In the grey button the badge has no ground of its own: the small-print ink on a tinted
     ground falls under 4.5 to 1. */
  .open:disabled :global(.lite) {
    background: transparent;
  }
  .arrow {
    margin-left: 12px;
  }
  .hint {
    color: var(--ink-3);
    font-size: 13.5px;
    margin: 10px 0 0;
  }
  .card {
    background: var(--window);
    border: 1px solid var(--line);
    border-radius: 14px;
    box-shadow: 0 24px 48px -36px rgba(46, 26, 94, 0.5);
    padding: 26px 28px 14px;
  }
  h2 {
    font:
      600 22px/1.2 "Newsreader",
      serif;
    margin: 0 0 16px;
  }
  .bar {
    background: var(--line);
    border-radius: 999px;
    height: 6px;
    overflow: hidden;
  }
  .bar i {
    background: linear-gradient(90deg, var(--violet-2), var(--violet-3));
    border-radius: 999px;
    display: block;
    height: 100%;
  }
  .barnote {
    color: var(--ink-3);
    display: flex;
    font-size: 13px;
    justify-content: space-between;
    margin: 6px 0 10px;
  }
  .steps {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .steps li {
    align-items: start;
    border-top: 1px solid var(--line);
    display: grid;
    gap: 14px;
    grid-template-columns: 30px minmax(0, 1fr) auto;
    padding: 14px 0;
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
    height: 28px;
    place-items: center;
    width: 28px;
  }
  .mark svg {
    fill: none;
    height: 16px;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 2.4;
    width: 16px;
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
    font-size: 15px;
    font-weight: 600;
  }
  .t span {
    color: var(--ink-3);
    display: block;
    font-size: 13.5px;
  }
  .waiting .t b {
    color: var(--ink-3);
    font-weight: 500;
  }
  .steps em {
    color: var(--ink-3);
    font-size: 13.5px;
    font-style: normal;
    padding-top: 2px;
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
    padding: 12px 0;
  }
  .word {
    background: none;
    border: 0;
    color: var(--accent);
    padding: 0;
    text-decoration: underline;
  }
  .promise-band {
    background: var(--deep);
    color: var(--deep-ink);
    flex: none;
  }
  .promises {
    box-sizing: border-box;
    display: grid;
    gap: 28px;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    list-style: none;
    margin: 0 auto;
    max-width: 1180px;
    padding: 28px 32px;
  }
  .promises li {
    align-items: flex-start;
    display: flex;
    gap: 14px;
  }
  .promises :global(svg) {
    color: var(--deep-muted);
  }
  .promises b {
    display: block;
    font-size: 15px;
    margin-bottom: 2px;
  }
  .promises span {
    color: var(--deep-muted);
    font-size: 13.5px;
  }
  .bottom {
    align-items: center;
    background: var(--window);
    border-top: 1px solid var(--line);
    color: var(--ink-3);
    display: flex;
    flex: none;
    font-size: 13px;
    gap: 18px;
    padding: 9px 32px;
  }
  .gap {
    flex: 1;
  }
  .counted {
    color: var(--ink-2);
  }
  /* A narrow window and a phone: one column, the name smaller, the promises two and then one
     to a row. */
  @media (max-width: 900px) {
    .start-main {
      gap: 32px;
      grid-template-columns: minmax(0, 1fr);
      padding: 36px 20px 32px;
    }
    h1 {
      font-size: 60px;
    }
    .lede {
      font-size: 18px;
      margin-bottom: 24px;
    }
    .promises {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      padding: 24px 20px;
    }
    .bottom {
      padding: 9px 16px;
    }
  }
  @media (max-width: 520px) {
    .promises {
      grid-template-columns: minmax(0, 1fr);
    }
    .card {
      padding: 20px 18px 10px;
    }
    .open {
      padding: 16px 28px;
    }
  }
</style>
