<script lang="ts">
  // The bench of step 4: a box of Zeff, a button that runs it in the engine's worker, and
  // what it printed. The workspace of step 6 takes its place.
  import { browserEngine } from "../engine/browser";
  import type { Outcome } from "../engine/messages";
  import { ENGINE, VERSION, shown } from "./version";

  const engine = browserEngine();

  let text = $state('print("Hello from Zeff")\nprint(1 + 1)\n');
  let output = $state("");
  let messages = $state("");
  let status = $state("starting the engine");
  let running = $state(false);
  let step = $state("");

  engine.start().then(
    (version) => (status = `engine Zeff ${version} ready`),
    (error: Error) => (status = error.message),
  );

  async function run(): Promise<void> {
    running = true;
    output = "";
    messages = "";
    step = "";
    try {
      if (engine.project === null) {
        await engine.open("bench");
      }
      const outcome: Outcome = await engine.run("scripts/main.zeff", text, (event) => {
        if (event.type === "output") {
          output += event.stdout;
          messages += event.stderr;
        } else if (event.type === "started") {
          step = `statement ${event.statement} of ${event.of}, line ${event.line}`;
        } else if (event.type === "pass") {
          step = `pass ${event.pass}, line ${event.line}`;
        }
      });
      status = outcome.stopped
        ? "stopped"
        : outcome.exitCode === 0
          ? "done"
          : `ended with exit code ${outcome.exitCode}`;
    } catch (error) {
      status = (error as Error).message;
    } finally {
      running = false;
    }
  }

  function cancel(): void {
    if (!engine.cancel()) {
      engine.stop();
    }
  }
</script>

<main>
  <h1>Zemp Lite {shown(VERSION)}</h1>
  <p>The code-first workspace for the Zeff language, on the engine Zeff {ENGINE}.</p>

  <label for="script">A Zeff script</label>
  <textarea id="script" bind:value={text} rows="8" spellcheck="false"></textarea>
  <div>
    <button onclick={run} disabled={running}>Run</button>
    <button onclick={cancel} disabled={!running}>Cancel</button>
    <span role="status">{status}</span>
    {#if running}<span data-testid="step">{step}</span>{/if}
  </div>

  <h2>Output</h2>
  <pre data-testid="output">{output}</pre>
  <h2>Warnings, notes and errors</h2>
  <pre data-testid="messages">{messages}</pre>
</main>

<style>
  main {
    font-family: system-ui, sans-serif;
    margin: 2rem auto;
    max-width: 48rem;
    padding: 0 1rem;
  }
  textarea,
  pre {
    box-sizing: border-box;
    font-family: ui-monospace, monospace;
    font-size: 14px;
    width: 100%;
  }
  pre {
    background: #f5f6f8;
    min-height: 2rem;
    overflow: auto;
    padding: 0.5rem;
  }
  label {
    display: block;
    margin-top: 1rem;
  }
</style>
