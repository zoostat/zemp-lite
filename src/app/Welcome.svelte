<script lang="ts" module>
  /** A question about a project, asked in its row of the start screen. */
  export interface Asking {
    kind: "rename" | "duplicate" | "delete" | "reset";
    folder: string;
  }
</script>

<script lang="ts">
  // The welcome screen (Zemp Specification, section 5; the design guide, section 9): with no
  // project open, one quiet screen. On the left what can be done; on the right the projects
  // of this browser, the one opened last first.
  import { exportProject } from "../project/export";
  import { limitsFor, projectOf } from "../project/from-zip";
  import type { Keeping } from "../project/keeping";
  import { ZipError, readZip } from "../project/zip";
  import {
    ProjectError,
    SCRATCH,
    when,
    type ProjectInfo,
    type Projects,
  } from "../project/projects";
  import Logo from "../theme/Logo.svelte";
  import ThemeButton from "../theme/ThemeButton.svelte";
  import Watermark from "../theme/Watermark.svelte";
  import NarrowLine from "./NarrowLine.svelte";
  import RowMenu from "./RowMenu.svelte";
  import { saveToComputer } from "./save";
  import { ENGINE, VERSION, shown } from "./version";

  let {
    projects,
    lasting,
    keeping,
    naming: asked = false,
    onopen,
    onmade,
    ask = null,
  }: {
    projects: Projects;
    /** Whether the screen opens asking for a new project's name. */
    naming?: boolean;
    /** Whether the browser keeps the projects after the tab is closed. */
    lasting: boolean;
    /** Whether the browser has agreed to keep the storage for good, or may clear it. */
    keeping: Keeping;
    onopen: (folder: string) => void;
    /** A project was made here: the browser is then asked to keep the storage. */
    onmade: () => void;
    /** A question about a project the screen opens with: asked from ⌘K in that project. */
    ask?: Asking | null;
  } = $props();

  let recent = $state<ProjectInfo[]>([]);
  // svelte-ignore state_referenced_locally
  let naming = $state(asked);
  let name = $state("");
  let problem = $state("");
  const now = Date.now();

  async function refresh(): Promise<void> {
    recent = await projects.list();
  }
  void refresh();

  async function create(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    try {
      const made = await projects.create(name);
      onmade();
      onopen(made.folder);
    } catch (error) {
      problem =
        error instanceof ProjectError
          ? error.message
          : `The project could not be made: ${String(error)}`;
    }
  }

  /** What the screen last did with a project, said where a reader of the screen hears it. */
  let said = $state("");

  // A project being renamed, duplicated, deleted or (the Scratch project) reset: asked in its
  // own row of the list (open decision #208; the owner's answers to questions 1 and 4).
  // svelte-ignore state_referenced_locally
  let asking = $state<Asking | null>(ask);
  /** The name typed, for a rename or a copy. */
  let answer = $state("");
  /** Why it cannot be done, as a sentence. */
  let refusal = $state("");
  /** How many files the project asked about holds, once counted. */
  let files = $state<number | null>(null);
  $effect(() => {
    const now = asking;
    refusal = "";
    files = null;
    if (now !== null && (now.kind === "delete" || now.kind === "reset")) {
      void projects.count(now.folder).then((count) => {
        if (asking === now) files = count;
      });
    }
  });

  /** What can be done with a project, from its row: the Scratch project has its own. */
  function actionsOf(project: ProjectInfo) {
    const ask = (kind: Asking["kind"]) => () => (asking = { kind, folder: project.folder });
    return project.folder === SCRATCH
      ? [
          { name: "Duplicate…", run: ask("duplicate") },
          { name: "Export project…", run: () => void exported(project) },
          { name: "Reset…", run: ask("reset") },
        ]
      : [
          { name: "Rename…", run: ask("rename") },
          { name: "Duplicate…", run: ask("duplicate") },
          { name: "Export project…", run: () => void exported(project) },
          { name: "Delete…", run: ask("delete") },
        ];
  }

  /** The name a field first shows, all of it selected, ready to be typed over. */
  function whole(node: HTMLInputElement): void {
    answer = node.value;
    node.focus();
    node.select();
  }

  async function answered(event: SubmitEvent, project: ProjectInfo): Promise<void> {
    event.preventDefault();
    if (asking === null) return;
    try {
      if (asking.kind === "rename") {
        const now = await projects.rename(project.folder, answer);
        said = `${project.name} renamed to ${now.name}`;
      } else {
        const copy = await projects.duplicate(project.folder, answer);
        onmade();
        said = `${project.name} copied as ${copy.name}`;
      }
      asking = null;
      await refresh();
    } catch (error) {
      refusal = error instanceof ProjectError ? error.message : String(error);
    }
  }

  async function removed(project: ProjectInfo): Promise<void> {
    try {
      if (project.folder === SCRATCH) {
        await projects.resetScratch();
        said = "The Scratch project is as a first visit has it";
      } else {
        await projects.remove(project.folder);
        said = `${project.name} deleted`;
      }
      asking = null;
      await refresh();
    } catch (error) {
      refusal = error instanceof ProjectError ? error.message : String(error);
    }
  }

  function leave(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      asking = null;
    }
  }

  function keep(node: HTMLButtonElement): void {
    node.focus();
  }

  /** Give a project to the computer as a zip, without opening it. */
  async function exported(info: ProjectInfo): Promise<void> {
    try {
      const project = await projects.peek(info.folder);
      if (project === null) return;
      const made = await exportProject(project, Date.now());
      saveToComputer(made.name, made.bytes, "application/zip");
      project.noteExported();
      said = `${info.name} exported as ${made.name}`;
    } catch (error) {
      said = error instanceof Error ? error.message : String(error);
    }
  }

  let zipChooser = $state<HTMLInputElement | null>(null);
  /** Why a zip chosen was not opened, in a sentence. */
  let zipProblem = $state("");

  /**
   * Open a zip as a new project (open decisions #208 and #117): the zip is read and proved
   * whole before anything is written, and what cannot be opened is said in a sentence.
   */
  async function zipChosen(): Promise<void> {
    const file = zipChooser?.files?.[0];
    if (zipChooser !== null) zipChooser.value = "";
    if (file === undefined) return;
    zipProblem = "";
    try {
      const device = (navigator as { deviceMemory?: number }).deviceMemory;
      const held = await readZip(new Uint8Array(await file.arrayBuffer()), limitsFor(device));
      const made = await projects.adopt(projectOf(held), file.name.replace(/\.zip$/i, ""));
      onmade();
      onopen(made.folder);
    } catch (error) {
      zipProblem =
        error instanceof ZipError || error instanceof ProjectError
          ? error.message
          : `The zip could not be opened: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  async function scratch(): Promise<void> {
    const made = await projects.scratch();
    onmade();
    onopen(made.folder);
  }

  function focus(node: HTMLInputElement): void {
    node.focus();
  }
</script>

<NarrowLine />
<div class="welcome">
  <Watermark />
  <div class="corner"><ThemeButton /></div>

  <section class="left" aria-label="Start">
    <h1 class="brand">
      <Logo size={34} />
      Zemp Lite <small>{shown(VERSION)}</small>
      <span class="alpha" data-testid="alpha">alpha</span>
    </h1>
    <p class="alpha-line">
      The first public preview: much is still to come, and what is here will change; every result is
      the released Zeff {ENGINE} engine's own. Something wrong? In a project, ⌘K →
      <b>Report a problem</b> builds a report here, which you read and save; nothing is sent.
    </p>

    {#if naming}
      <form class="naming" onsubmit={create}>
        <label for="project-name">The name of the new project</label>
        <div class="row">
          <input
            id="project-name"
            bind:value={name}
            use:focus
            autocomplete="off"
            maxlength="80"
            oninput={() => (problem = "")}
          />
          <button class="filled" type="submit">Create</button>
          <button
            type="button"
            class="plain"
            onclick={() => {
              naming = false;
              problem = "";
            }}>Cancel</button
          >
        </div>
        {#if problem}<p class="problem" role="alert">{problem}</p>{/if}
      </form>
    {:else}
      <button class="act" onclick={() => (naming = true)}>
        <span class="what">New project…</span>
        <span class="about"
          >a folder with <span class="mono">zeff.toml</span>, scripts and data</span
        >
      </button>
    {/if}
    <button class="act" disabled>
      <span class="what">Open folder…</span>
      <span class="about"
        >a project folder on this computer: comes with the desktop app, and then in Chrome and Edge</span
      >
    </button>
    <button class="act" onclick={() => zipChooser?.click()}>
      <span class="what">Open a project's zip…</span>
      <span class="about"
        >a zip that Export project… wrote, or a project's folder zipped on this computer</span
      >
    </button>
    <input
      bind:this={zipChooser}
      type="file"
      accept=".zip,application/zip"
      hidden
      onchange={zipChosen}
      aria-label="A project's zip to open"
    />
    {#if zipProblem}<p class="problem" role="alert">{zipProblem}</p>{/if}
    <button class="act" onclick={scratch}>
      <span class="what">Scratch project</span>
      <span class="about"
        >two worked examples to run and change: the returns to schooling, and instrumental variables</span
      >
    </button>

    <p class="store">
      {#if lasting}
        <b>Kept on this computer.</b> Projects live in this browser's private storage. Clearing the
        site's data would remove them{keeping === "kept"
          ? ", and the browser has agreed not to clear it on its own."
          : ", and the browser may clear it when the computer runs short of room."}
      {:else}
        <b class="warn">Not kept.</b> This browser gives a page no private storage, so a project lasts
        only until this tab is closed.
      {/if}
      To take a project out, as a zip saved on this computer, choose
      <b class="word">Export project…</b>
      in its menu (⋯) in the list, or in ⌘K while it is open;
      <b class="word">Open a project's zip…</b> opens it again, here or in another browser.
    </p>
  </section>

  <section class="right" aria-label="Recent projects">
    <h2 class="label">Recent</h2>
    <ul class="projects">
      {#each recent as project (project.folder)}
        <li>
          <button class="rec" onclick={() => onopen(project.folder)}>
            <span class="name">{project.name}</span>
            <small>in this browser · {when(project.opened, now)}</small>
          </button>
          <RowMenu label="Actions for {project.name}" actions={actionsOf(project)} />
        </li>
        {#if asking !== null && asking.folder === project.folder}
          <li class="asked">
            {#if asking.kind === "rename" || asking.kind === "duplicate"}
              <form class="row" onsubmit={(event) => void answered(event, project)}>
                <input
                  value={asking.kind === "rename" ? project.name : `${project.name} copy`}
                  use:whole
                  aria-label={asking.kind === "rename"
                    ? `The new name of ${project.name}`
                    : `The name of the copy of ${project.name}`}
                  autocomplete="off"
                  maxlength="80"
                  oninput={(event) => {
                    answer = event.currentTarget.value;
                    refusal = "";
                  }}
                  onkeydown={leave}
                />
                <button class="filled" type="submit"
                  >{asking.kind === "rename" ? "Rename" : "Duplicate"}</button
                >
                <button type="button" class="plain" onclick={() => (asking = null)}>Cancel</button>
              </form>
            {:else}
              <div
                class="confirm"
                role="group"
                aria-label={asking.kind === "reset"
                  ? "Reset the Scratch project?"
                  : `Delete ${project.name}?`}
              >
                <p>
                  {#if asking.kind === "reset"}
                    Reset the Scratch project? What it holds{files === null
                      ? ""
                      : files === 1
                        ? ", one file,"
                        : `, ${files} files,`} is deleted, and its examples are put back as a first visit
                    has them. It cannot be brought back.
                  {:else}
                    Delete {project.name}{files === null || files === 0
                      ? ""
                      : files === 1
                        ? " and the file in it"
                        : ` and the ${files} files in it`}? It cannot be brought back.
                  {/if}
                </p>
                <div class="row">
                  <button class="plain" onkeydown={leave} onclick={() => void exported(project)}
                    >Export project… first</button
                  >
                  <button
                    class="plain danger"
                    onkeydown={leave}
                    onclick={() => void removed(project)}
                    >{asking.kind === "reset" ? "Reset" : "Delete"}</button
                  >
                  <button class="plain" use:keep onkeydown={leave} onclick={() => (asking = null)}
                    >Keep</button
                  >
                </div>
              </div>
            {/if}
            {#if refusal}<p class="problem" role="alert">{refusal}</p>{/if}
          </li>
        {/if}
      {:else}
        <li class="none">No project yet. Start with the Scratch project.</li>
      {/each}
    </ul>
    <p class="said" role="status">{said}</p>
  </section>
</div>

<footer class="bottom">
  <span class="state">No project open</span>
  <a class="counted" href="/counted.html">What is counted</a>
  <span class="engine">engine Zeff {ENGINE} · in this browser</span>
</footer>

<style>
  .welcome {
    display: grid;
    flex: 1;
    grid-template-columns: 1.1fr 1fr;
    min-height: 0;
    overflow: hidden;
    position: relative;
  }
  .alpha {
    border: 1px solid var(--accent);
    border-radius: 999px;
    color: var(--accent);
    font-family: "Atkinson Hyperlegible Next", sans-serif;
    font-size: 13px;
    font-weight: 400;
    margin-left: 4px;
    padding: 1px 10px;
    vertical-align: middle;
  }
  .alpha-line {
    color: var(--ink-2);
    font-size: 14px;
    margin: -6px 0 18px;
    max-width: 520px;
  }
  .corner {
    position: absolute;
    right: 18px;
    top: 16px;
    z-index: 2;
  }
  .left,
  .right {
    position: relative;
    z-index: 1;
  }
  .left {
    border-right: 1px solid var(--line);
    padding: 64px 64px 40px;
  }
  .right {
    padding: 64px 52px 40px;
  }
  .brand {
    align-items: center;
    display: flex;
    font:
      500 34px/1.1 "Newsreader",
      Georgia,
      serif;
    gap: 12px;
    letter-spacing: -0.01em;
    margin: 0 0 30px;
  }
  .brand small {
    color: var(--ink-3);
    font:
      400 13.5px "Atkinson Hyperlegible Next",
      sans-serif;
    margin-left: 8px;
  }
  .act,
  .rec {
    background: none;
    border: 0;
    flex: 1;
    min-width: 0;
    text-align: left;
  }
  .projects {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .projects li {
    align-items: center;
    border-bottom: 1px solid var(--line);
    display: flex;
    gap: 8px;
  }
  .projects li.asked {
    display: block;
    padding: 10px 0 12px;
  }
  .asked .row {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .asked input {
    background: var(--window);
    border: 1px solid var(--line-strong);
    border-radius: 7px;
    color: var(--ink);
    flex: 1;
    font: inherit;
    font-size: 15px;
    min-width: 0;
    padding: 6px 10px;
  }
  .asked input:focus-visible {
    border-color: var(--accent);
    outline: 1px solid var(--accent);
  }
  .confirm p {
    font-size: 15px;
    line-height: 1.45;
    margin: 0 0 8px;
  }
  .plain.danger {
    color: var(--error);
    font-weight: 600;
  }
  .projects li.none {
    border: 0;
    padding: 12px 0;
  }
  .said {
    color: var(--ink-2);
    font-size: 14px;
    margin: 12px 0 0;
    min-height: 1.45em;
  }
  .act {
    align-items: baseline;
    display: flex;
    font-size: 17px;
    gap: 18px;
    justify-content: space-between;
    padding: 14px 0;
  }
  .act:hover:not(:disabled) .what,
  .rec:hover .name {
    color: var(--accent);
  }
  .act:disabled .what {
    color: var(--ink-3);
  }
  .about {
    color: var(--ink-3);
    flex: 1 1 auto;
    font-size: 14px;
    line-height: 1.45;
    min-width: 0;
    text-align: right;
  }
  .naming {
    border-bottom: 1px solid var(--line);
    padding: 12px 0 14px;
  }
  .naming label {
    color: var(--ink-2);
    display: block;
    font-size: 14px;
    margin-bottom: 6px;
  }
  .row {
    display: flex;
    gap: 8px;
  }
  .naming input {
    background: var(--window);
    border: 1px solid var(--line-strong);
    border-radius: 7px;
    flex: 1;
    font-size: 16.5px;
    min-width: 0;
    padding: 6px 10px;
  }
  .filled,
  .plain {
    border-radius: 7px;
    font-size: 15px;
    padding: 6px 14px;
  }
  .filled {
    background: var(--button);
    border: 1px solid var(--button);
    color: var(--button-ink);
  }
  .plain {
    background: var(--window);
    border: 1px solid var(--line-strong);
  }
  .problem {
    color: var(--warning);
    font-size: 14px;
    margin: 8px 0 0;
  }
  .store {
    background: var(--soft);
    border-radius: 10px;
    color: var(--ink-2);
    font-size: 14px;
    line-height: 1.6;
    margin: 28px 0 0;
    padding: 12px 14px;
  }
  .store b {
    color: var(--ok);
    font-weight: 500;
  }
  .store b.warn {
    color: var(--warning);
  }
  .store b.word {
    color: var(--ink);
  }
  .label {
    color: var(--ink-3);
    font-size: 14px;
    font-weight: 400;
    margin: 0 0 12px;
  }
  .rec {
    display: block;
    padding: 12px 0;
  }
  .rec .name {
    display: block;
    font-size: 16.5px;
  }
  .rec small,
  .none {
    color: var(--ink-3);
    font-size: 14px;
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
    justify-content: space-between;
    padding: 0 18px;
  }
  .bottom .engine {
    color: var(--ink-2);
  }
  .bottom .counted {
    color: var(--ink-3);
    margin-left: auto;
  }
  @media (max-width: 900px) {
    .welcome {
      grid-template-columns: 1fr;
      overflow: auto;
    }
    .left {
      border-right: 0;
      padding: 32px 24px;
    }
    .right {
      padding: 24px;
    }
  }
</style>
