<script lang="ts">
  // The side menu of a project (release 0.3.1, step 4; open decision #245): a column of 52
  // pixels at the left of every place, with Script, Data, Plots and Paper, then Help after a
  // rule, and All projects at its foot. These are icons, the one set of controls of Zemp Lite
  // that is not a word (#33 as amended on 27 November 2026 for this menu alone): each shows
  // its name, what it holds and its key when it is pointed at and when the keyboard is on it,
  // and each carries its name, with those words as its description, for a screen reader. The
  // place shown is marked in the accent, with a bar at the window's edge.
  import Named from "../theme/Named.svelte";
  import { KEYED, holds, keyOf, type Keyed } from "./sidemenu";
  import { DATA, HELP, PAPER, PLOTS, fileTab } from "./views";
  import type { Workspace } from "./workspace-state.svelte";

  let { workspace, onclose }: { workspace: Workspace; onclose: () => void } = $props();

  const mac = /Mac|iPhone|iPad/.test(navigator.platform);

  const shown = $derived<Keyed>(
    workspace.views.active === PLOTS
      ? "plots"
      : workspace.views.active === DATA
        ? "data"
        : workspace.views.active === HELP
          ? "help"
          : workspace.views.active === PAPER
            ? "paper"
            : "script",
  );
  const NAMES: Record<Keyed, string> = {
    script: "Script",
    data: "Data",
    plots: "Plots",
    paper: "Paper",
    help: "Help",
  };
  const said = $derived(
    holds({
      script: workspace.scriptPath,
      frames: workspace.frames.length,
      plots: workspace.plots.length,
      ran: workspace.lastRun !== null && workspace.lastRun.state !== "running",
      paper: workspace.paperShown.kind === "none" ? null : workspace.paperShown.path,
      papers: workspace.paperFiles.length,
    }),
  );

  // An entry just pressed with the pointer keeps its words to itself until the pointer has
  // left it: they would stand over the place it opened. The keyboard's focus still shows them.
  let pressed = $state<string | null>(null);

  /** Open a place, as its key and its command do. */
  export function open(place: Keyed): void {
    if (place === "script") workspace.show(fileTab(workspace.scriptPath));
    else if (place === "data") workspace.openData();
    else if (place === "plots") workspace.openPlots();
    else if (place === "paper") workspace.openPaper();
    else workspace.openHelp();
  }
</script>

{#snippet icon(place: Keyed | "projects")}
  <svg viewBox="0 0 24 24" aria-hidden="true">
    {#if place === "script"}
      <path d="M7 7l-4 5 4 5M17 7l4 5-4 5M14 5l-4 14" />
    {:else if place === "data"}
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17M3.5 14.5h17M9 4.5v15" />
    {:else if place === "plots"}
      <path d="M4 20h16M7 16.5v-5M11.5 16.5V7M16 16.5v-8" />
    {:else if place === "paper"}
      <path d="M6.5 3.5h7l4 4v13h-11z" />
      <path d="M13.5 3.5v4h4M9 12h6M9 15.5h6" />
    {:else if place === "help"}
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.6 9.6a2.5 2.5 0 114 2c-.9.6-1.6 1.1-1.6 2.2M12 17v.2" />
    {:else}
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    {/if}
  </svg>
{/snippet}

{#snippet entry(place: Keyed)}
  <button
    class:on={shown === place}
    aria-label={NAMES[place]}
    aria-current={shown === place ? "page" : undefined}
    aria-describedby="side-{place}"
    aria-keyshortcuts="Meta+{KEYED.indexOf(place) + 1} Control+{KEYED.indexOf(place) + 1}"
    data-place={place}
    class:pressed={pressed === place}
    onclick={() => {
      pressed = place;
      open(place);
    }}
    onpointerleave={() => (pressed = null)}
  >
    {@render icon(place)}
    <span class="tip" role="tooltip" id="side-{place}"
      ><b>{NAMES[place]}</b><Named text={said[place]} filled /> ·
      <kbd>{keyOf(place, mac)}</kbd></span
    >
  </button>
{/snippet}

<nav class="side" aria-label="Places">
  {@render entry("script")}
  {@render entry("data")}
  {@render entry("plots")}
  {@render entry("paper")}
  <span class="rule" aria-hidden="true"></span>
  {@render entry("help")}
  <span class="gap"></span>
  <button aria-label="All projects" aria-describedby="side-projects" onclick={onclose}>
    {@render icon("projects")}
    <span class="tip" role="tooltip" id="side-projects"
      ><b>All projects</b>back to the projects of this browser</span
    >
  </button>
</nav>

<style>
  .side {
    align-items: center;
    background: var(--softer);
    border-right: 1px solid var(--line);
    box-sizing: border-box;
    display: flex;
    flex: none;
    flex-direction: column;
    gap: 4px;
    padding: 8px 0;
    position: relative;
    width: 52px;
    z-index: 8;
  }
  button {
    background: transparent;
    border: 0;
    border-radius: 10px;
    color: var(--ink-3);
    display: grid;
    flex: none;
    height: 38px;
    padding: 0;
    place-items: center;
    position: relative;
    width: 38px;
  }
  svg {
    fill: none;
    height: 21px;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.7;
    width: 21px;
  }
  button:hover,
  button:focus-visible {
    background: var(--soft);
    color: var(--ink);
  }
  button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }
  button.on {
    background: var(--accent-soft);
    color: var(--accent);
  }
  /* The place shown: a bar at the window's edge. */
  button.on::before {
    background: var(--accent);
    border-radius: 0 3px 3px 0;
    bottom: 9px;
    content: "";
    left: -7px;
    position: absolute;
    top: 9px;
    width: 3px;
  }
  .rule {
    background: var(--line);
    flex: none;
    height: 1px;
    margin: 4px 0;
    width: 24px;
  }
  .gap {
    flex: 1;
  }
  /* The name of an entry, what it holds and its key: beside it, when it is pointed at and
     when the keyboard is on it. */
  .tip {
    background: var(--ink);
    border-radius: 8px;
    box-shadow: 0 16px 48px -16px rgb(0 0 0 / 40%);
    color: var(--window);
    font-size: 12.5px;
    left: 46px;
    line-height: 1.35;
    padding: 6px 10px;
    pointer-events: none;
    position: absolute;
    text-align: left;
    top: 50%;
    transform: translate(-4px, -50%);
    transition: transform 0.12s;
    visibility: hidden;
    white-space: nowrap;
  }
  .tip b {
    display: block;
    font-size: 13.5px;
  }
  .tip kbd {
    font: inherit;
  }
  button:hover:not(.pressed) .tip,
  button:focus-visible .tip {
    transform: translate(0, -50%);
    visibility: visible;
  }
  @media (prefers-reduced-motion: reduce) {
    .tip {
      transition: none;
    }
  }
</style>
