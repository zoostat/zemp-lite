<script lang="ts">
  // The Start screen of a first visit (the design guide, section 9, "Start (first visit)";
  // release 0.2, step 18b): the engine is fetched, checked and started, each step with its
  // progress, beside four promises; **Open Zemp Lite** goes on to the welcome screen once the
  // engine runs. The next visit opens straight on the welcome screen, the engine being kept
  // by the browser. The check is of the engine's digest: the file fetched must be the one this
  // release was built with (its SHA-256); signed releases come later (Zemp Specification,
  // section 13).
  import engineUrl from "../../worker/pkg/web/zemp_worker_bg.wasm?url";
  import type { Engine } from "../engine/engine";
  import Logo from "../theme/Logo.svelte";
  import ThemeButton from "../theme/ThemeButton.svelte";
  import NarrowLine from "./NarrowLine.svelte";
  import { ENGINE, ENGINE_BYTES, ENGINE_SHA256, VERSION, shown } from "./version";

  let { engine, onopen }: { engine: Engine; onopen: () => void } = $props();

  type State = "waiting" | "going" | "done" | "failed";
  let fetching = $state<State>("waiting");
  let checking = $state<State>("waiting");
  let starting = $state<State>("waiting");
  let received = $state(0);
  let problem = $state("");
  const ready = $derived(starting === "done");

  const megabytes = (bytes: number) => `${(bytes / 1_000_000).toFixed(1)} MB`;
  const share = $derived(
    ENGINE_BYTES === null || ENGINE_BYTES === 0
      ? null
      : Math.min(100, Math.round((received / ENGINE_BYTES) * 100)),
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
    return whole;
  }

  async function begin(): Promise<void> {
    problem = "";
    received = 0;
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
</script>

<NarrowLine />
<div class="corner"><ThemeButton /></div>
<div class="start" data-testid="start">
  <header>
    <Logo size={34} />
    <h1>Zemp Lite <span class="version">{shown(VERSION)}</span></h1>
    <span class="alpha" data-testid="alpha">alpha</span>
  </header>
  <p class="about">
    An <b>alpha</b>: the first public preview of Zemp Lite, the editor for Zeff in a browser. Much
    is still to come, and what is here will change; every result is the released Zeff
    {ENGINE} engine's own.
  </p>

  <ol class="steps" aria-label="Starting the engine">
    <li class={fetching} data-testid="step-fetch">
      <span class="what">Fetching the engine</span>
      <span class="how"
        >{fetching === "going" || fetching === "done"
          ? share === null
            ? megabytes(received)
            : `${share} % of ${megabytes(ENGINE_BYTES ?? 0)}`
          : said[fetching]}</span
      >
      <span class="bar" aria-hidden="true"
        ><i style:width="{fetching === 'done' ? 100 : (share ?? 0)}%"></i></span
      >
    </li>
    <li class={checking} data-testid="step-check">
      <span class="what">Checking that it is the engine of this release</span>
      <span class="how"
        >{checking === "done" && ENGINE_SHA256 === null
          ? "no digest in this build"
          : said[checking]}</span
      >
    </li>
    <li class={starting} data-testid="step-start">
      <span class="what">Starting it in this browser</span>
      <span class="how"
        >{starting === "done" ? `Zeff ${engine.version ?? ENGINE} ready` : said[starting]}</span
      >
    </li>
  </ol>
  {#if problem}
    <p class="problem" role="alert">
      {problem}. <button class="word" onclick={() => void begin()}>Try again</button>
    </p>
  {/if}

  <ul class="promises">
    <li>
      <b>It runs here.</b> The engine runs in this browser; your scripts are never sent anywhere.
    </li>
    <li>
      <b>Your data stays on this computer,</b> in this browser's private storage.
    </li>
    <li><b>No account.</b> There is nothing to sign up for.</li>
    <li><b>The next visit opens at once:</b> the browser keeps the engine.</li>
  </ul>

  <button class="open" disabled={!ready} onclick={onopen}>Open Zemp Lite</button>
</div>
<footer class="bottom">
  <a class="counted" href="/counted.html">What is counted</a>
  <span class="engine">engine Zeff {ENGINE} · in this browser</span>
</footer>

<style>
  .corner {
    position: absolute;
    right: 18px;
    top: 16px;
    z-index: 2;
  }
  .start {
    background: var(--window);
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 14px;
    margin: 0 auto;
    max-width: 640px;
    overflow: auto;
    padding: 56px 24px 32px;
    width: 100%;
  }
  header {
    align-items: center;
    display: flex;
    gap: 14px;
  }
  h1 {
    font-family: "Newsreader", serif;
    font-size: 34px;
    font-weight: 500;
    margin: 0;
  }
  .version {
    color: var(--ink-3);
    font-size: 20px;
  }
  .alpha {
    border: 1px solid var(--accent);
    border-radius: 999px;
    color: var(--accent);
    font-size: 13px;
    padding: 1px 10px;
  }
  .about,
  .promises li {
    color: var(--ink-2);
    font-size: 15px;
    margin: 0;
  }
  .steps {
    border: 1px solid var(--line);
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    list-style: none;
    margin: 8px 0 0;
    padding: 14px 16px;
  }
  .steps li {
    align-items: center;
    display: grid;
    gap: 4px 12px;
    grid-template-columns: 1fr auto;
  }
  .what {
    color: var(--ink);
    font-size: 15px;
  }
  .waiting .what {
    color: var(--ink-3);
  }
  .how {
    color: var(--ink-2);
    font-size: 13.5px;
  }
  .done .how {
    color: var(--ok, var(--ink-2));
  }
  .failed .how {
    color: var(--error);
  }
  .bar {
    background: var(--soft);
    border-radius: 3px;
    grid-column: 1 / -1;
    height: 5px;
    overflow: hidden;
  }
  .bar i {
    background: var(--accent);
    display: block;
    height: 100%;
    transition: width 0.15s;
  }
  .promises {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 6px 0 0;
    padding-left: 20px;
  }
  .problem {
    color: var(--error);
    margin: 0;
  }
  .word {
    background: none;
    border: 0;
    color: var(--accent);
    cursor: pointer;
    font: inherit;
    padding: 0;
    text-decoration: underline;
  }
  .open {
    align-self: flex-start;
    background: var(--accent);
    border: 0;
    border-radius: 8px;
    color: var(--window);
    cursor: pointer;
    font: inherit;
    font-size: 15px;
    margin-top: 8px;
    padding: 8px 18px;
  }
  .open:disabled {
    background: var(--soft);
    color: var(--ink-3);
    cursor: default;
  }
  .bottom {
    align-items: center;
    background: var(--window);
    border-top: 1px solid var(--line);
    color: var(--ink-3);
    display: flex;
    flex: none;
    font-size: 13.5px;
    gap: 12px;
    height: 36px;
    justify-content: flex-end;
    padding: 0 18px;
  }
  .counted {
    color: var(--ink-3);
    margin-right: auto;
  }
</style>
