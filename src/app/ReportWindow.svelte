<script lang="ts">
  // Report a problem (the Zemp Specification, section 5; release 0.2, step 16): the bug report
  // of the last run's failure, built by the engine in the worker as `zeff report-bug` builds
  // it, shown whole for the user to read, and saved as a file on the user's own computer when
  // the user asks. Nothing is sent anywhere, and nothing is written into the project.
  import { counted } from "../margin/notes";
  import type { Workspace } from "./workspace-state.svelte";

  let { workspace }: { workspace: Workspace } = $props();

  const report = $derived(workspace.report);
  let dialog = $state<HTMLElement | null>(null);
  let saved = $state("");

  $effect(() => {
    dialog?.focus();
  });

  /** What the report is of, in the command line's words. */
  const what = $derived.by(() => {
    if (report === null || report.building || !report.ok) return "";
    const kind =
      report.kind === "internal error"
        ? "an internal error, a bug in Zeff"
        : report.code !== null
          ? `${report.kind === "error" ? "an error" : report.kind}, ${report.code}`
          : `an ${report.kind}`;
    return `${kind}; ${counted(report.kept)} of the ${counted(report.of)} statements of ${report.script} are kept${report.reduced || report.of === 0 ? "" : " (every statement up to the failure)"}`;
  });

  function save(): void {
    if (report === null || report.building || !report.ok) return;
    const url = URL.createObjectURL(new Blob([report.text], { type: "text/markdown" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = report.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    saved = `saved as ${report.name}`;
  }

  function close(): void {
    saved = "";
    workspace.report = null;
  }
</script>

{#if report !== null}
  <div class="veil" role="presentation" onclick={close}></div>
  <div
    class="report"
    role="dialog"
    aria-modal="true"
    aria-label="Report a problem"
    tabindex="-1"
    bind:this={dialog}
    onkeydown={(event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    }}
  >
    <header>
      <h2>Report a problem</h2>
      <button class="word" onclick={close}>Close</button>
    </header>
    {#if report.building}
      <p class="about" role="status">
        The engine is building the report: it runs the script, then the failing statement with only
        the statements it needs.
      </p>
    {:else if !report.ok}
      <p class="about" data-testid="report-none">{report.message}</p>
    {:else}
      <p class="about" data-testid="report-what">{what}</p>
      <p class="about">
        Built in this browser; nothing has been sent. Read it whole before you attach it to an
        issue: it holds statements of your script and the names and types of your variables, never a
        row of your data.
      </p>
      <pre class="mono text" data-testid="report-text">{report.text}</pre>
      <footer>
        <button class="primary" onclick={save}>Save the report…</button>
        <span class="mono about">{report.name}</span>
        {#if saved}<span class="about" data-testid="report-saved">{saved}</span>{/if}
      </footer>
    {/if}
  </div>
{/if}

<style>
  .veil {
    background: rgb(0 0 0 / 0.25);
    inset: 0;
    position: fixed;
    z-index: 40;
  }
  .report {
    background: var(--window);
    border: 1px solid var(--line-strong);
    border-radius: 10px;
    box-shadow: 0 12px 40px rgb(0 0 0 / 0.18);
    display: flex;
    flex-direction: column;
    gap: 8px;
    left: 50%;
    max-height: 84vh;
    max-width: 92vw;
    outline: none;
    padding: 14px 18px 16px;
    position: fixed;
    top: 8vh;
    transform: translateX(-50%);
    width: 760px;
    z-index: 41;
  }
  header,
  footer {
    align-items: center;
    display: flex;
    gap: 12px;
    justify-content: space-between;
  }
  footer {
    justify-content: flex-start;
  }
  h2 {
    font-size: 15px;
    font-weight: 600;
    margin: 0;
  }
  .about {
    color: var(--ink-2);
    font-size: 13px;
    margin: 0;
  }
  .text {
    background: var(--soft);
    border-radius: 8px;
    flex: 1;
    font-size: 12.5px;
    margin: 0;
    min-height: 120px;
    overflow: auto;
    padding: 10px 12px;
    white-space: pre;
  }
  .word {
    background: none;
    border: 0;
    border-radius: 6px;
    color: var(--ink-2);
    cursor: pointer;
    font: inherit;
    font-size: 13px;
    padding: 2px 6px;
  }
  .word:hover {
    background: var(--soft);
  }
  .primary {
    background: var(--accent);
    border: 0;
    border-radius: 7px;
    color: var(--window);
    cursor: pointer;
    font: inherit;
    font-size: 13px;
    padding: 5px 12px;
  }
</style>
