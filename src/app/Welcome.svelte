<script lang="ts" module>
  /** A question about a project, asked in its row of the start screen. */
  export interface Asking {
    kind: "rename" | "duplicate" | "delete" | "reset";
    folder: string;
  }
</script>

<script lang="ts">
  import { tick } from "svelte";
  // The project screen (Zemp Specification, section 5; the design guide, section 9, "Project
  // screen"; open decision #220, item 4; redrawn at release 0.2.4, step 7): with no project
  // open, four cards of what can be done, the note on where the work is kept in two columns
  // under them, and on the right the projects of this browser, the one opened last first, five
  // in view with the lower edge fading until the end of the list is reached.
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
  import HexIcon from "../theme/HexIcon.svelte";
  import Logo from "../theme/Logo.svelte";
  import Named from "../theme/Named.svelte";
  import Watermark from "../theme/Watermark.svelte";
  import FrontBar from "./FrontBar.svelte";
  import NarrowLine from "./NarrowLine.svelte";
  import RowMenu from "./RowMenu.svelte";
  import { saveToComputer } from "./save";
  import { ENGINE } from "./version";

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

  // Whether the list has been read yet. Until it has, the screen shows neither the list nor
  // the card of a first visit: a visitor with projects is never told there is none.
  let read = $state(false);

  async function refresh(): Promise<void> {
    try {
      recent = await projects.list();
    } finally {
      read = true;
    }
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

  // The list of projects shows five and fades at its lower edge while more lie below; the fade
  // goes once the end of the list is in view, and is never there for a list that fits.
  let box = $state<HTMLDivElement | null>(null);
  let atEnd = $state(true);
  function measure(): void {
    if (box === null) return;
    atEnd = box.scrollTop + box.clientHeight >= box.scrollHeight - 2;
  }
  $effect(() => {
    // Measured again whenever the list or a question in one of its rows changes its height.
    void recent.length;
    void asking;
    void tick().then(measure);
  });
</script>

<NarrowLine />
<div class="screen">
  <Watermark />
  <FrontBar heading>
    <span class="report">Something wrong? In a project, ⌘K → <b>Report a problem</b></span>
  </FrontBar>
  <main class="welcome-main">
    <section class="left" aria-label="Start">
      <div class="actions">
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
            {#if problem}<p class="problem" role="alert"><Named text={problem} /></p>{/if}
          </form>
        {:else}
          <button class="act" onclick={() => (naming = true)}>
            <HexIcon name="new" />
            <span class="what">New project…</span>
            <span class="about"
              >A folder with <span class="mono">zeff.toml</span>, scripts and data.</span
            >
          </button>
        {/if}
        <button class="act" onclick={() => zipChooser?.click()}>
          <HexIcon name="zip" />
          <span class="what">Open project…</span>
          <span class="about"
            >A project's zip: one that Export project… wrote, or a project's folder zipped on this
            computer.</span
          >
        </button>
        <button class="act off" disabled>
          <HexIcon name="folder" />
          <span class="what">Open folder…</span>
          <span class="about">A project folder on this computer.</span>
          <span class="tag">comes with the desktop app</span>
        </button>
        <button class="act primary" onclick={scratch}>
          <HexIcon name="play" />
          <span class="what">Scratch project</span>
          <span class="about"
            >Two worked examples to run and change: the returns to schooling, and instrumental
            variables.</span
          >
          <span class="go">Start here <span aria-hidden="true">→</span></span>
        </button>
      </div>
      <input
        bind:this={zipChooser}
        type="file"
        accept=".zip,application/zip"
        hidden
        onchange={zipChosen}
        aria-label="A project's zip to open"
      />
      {#if zipProblem}<p class="problem" role="alert"><Named text={zipProblem} /></p>{/if}

      <div class="kept" data-testid="kept">
        <div class="where" class:not={!lasting}>
          <HexIcon name="lock" size={36} />
          <p>
            {#if lasting}
              <b>Kept on this computer.</b> Projects live in this browser's private storage.
              Clearing the site's data would remove them{keeping === "kept"
                ? ", and the browser has agreed not to clear it on its own."
                : ", and the browser may clear it when the computer runs short of room."}
            {:else}
              <b class="warn">Not kept.</b> This browser gives a page no private storage, so a project
              lasts only until this tab is closed.
            {/if}
          </p>
        </div>
        <div>
          <HexIcon name="out" size={36} />
          <p>
            <b>Taking a project out.</b> Choose <b>Export project…</b> in its ⋯ menu to save it as a
            zip on this computer, or in ⌘K while it is open; <b>Open project…</b> opens it again, here
            or in another browser.
          </p>
        </div>
      </div>
    </section>

    <section class="right" class:has={recent.length > 0} aria-label="Recent projects">
      <div class="rhead">
        <h2>Recent</h2>
        {#if recent.length > 0}
          <span class="count" data-testid="recent-count"
            >{recent.length === 1
              ? "1 project"
              : `${recent.length} projects · the last opened first`}</span
          >
        {/if}
      </div>
      {#if !read}
        <!-- The list is being read: nothing yet. -->
      {:else if recent.length === 0}
        <div class="empty">
          <HexIcon name="play" size={72} />
          <b>No project yet</b>
          <span>Start with the Scratch project: two worked examples, ready to run.</span>
          <button class="filled" onclick={scratch}>Open the Scratch project</button>
        </div>
      {:else}
        <!-- The fade is drawn over the list's lower edge, not cut out of the list: a row's menu
             opens out of the list and must not be faded or cut with it. -->
        <div class="recent-wrap" class:end={atEnd}>
          <div class="recent-box" bind:this={box} onscroll={measure}>
            <ul class="projects">
              {#each recent as project (project.folder)}
                <li>
                  <button class="rec" onclick={() => onopen(project.folder)}>
                    <span class="pi" aria-hidden="true"><Logo size={26} /></span>
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
                        <button type="button" class="plain" onclick={() => (asking = null)}
                          >Cancel</button
                        >
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
                                : `, ${files} files,`} is deleted, and its examples are put back as a
                            first visit has them. It cannot be brought back.
                          {:else}
                            Delete {project.name}{files === null || files === 0
                              ? ""
                              : files === 1
                                ? " and the file in it"
                                : ` and the ${files} files in it`}? It cannot be brought back.
                          {/if}
                        </p>
                        <div class="row">
                          <button
                            class="plain"
                            onkeydown={leave}
                            onclick={() => void exported(project)}>Export project… first</button
                          >
                          <button
                            class="plain danger"
                            onkeydown={leave}
                            onclick={() => void removed(project)}
                            >{asking.kind === "reset" ? "Reset" : "Delete"}</button
                          >
                          <button
                            class="plain"
                            use:keep
                            onkeydown={leave}
                            onclick={() => (asking = null)}>Keep</button
                          >
                        </div>
                      </div>
                    {/if}
                    {#if refusal}<p class="problem" role="alert">{refusal}</p>{/if}
                  </li>
                {/if}
              {/each}
            </ul>
          </div>
        </div>
      {/if}
      <p class="said" role="status"><Named text={said} /></p>
    </section>
  </main>

  <footer class="bottom">
    <span class="state">No project open</span>
    <span class="gap"></span>
    <a class="counted" href="/counted.html">What is counted</a>
    <span class="engine">engine Zeff {ENGINE} · in this browser</span>
  </footer>
</div>

<svelte:window onresize={measure} />

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
  .report {
    color: var(--ink-3);
    font-size: 13.5px;
  }
  .report b {
    color: var(--ink-2);
  }
  .welcome-main {
    align-items: start;
    box-sizing: border-box;
    display: grid;
    flex: 1 0 auto;
    gap: 48px;
    grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
    margin: 0 auto;
    max-width: 1180px;
    padding: 32px;
    width: 100%;
  }
  .actions {
    display: grid;
    gap: 14px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .act {
    align-items: flex-start;
    background: var(--window);
    border: 1px solid var(--line);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
    padding: 18px 18px 16px;
    text-align: left;
    transition:
      border-color 0.15s,
      box-shadow 0.15s;
  }
  .act:hover:not(:disabled),
  .act:focus-visible {
    border-color: var(--accent);
    box-shadow: 0 10px 24px -18px rgba(20, 42, 102, 0.6);
  }
  .act :global(svg) {
    margin-bottom: 4px;
  }
  .what {
    font-size: 16.5px;
    font-weight: 700;
  }
  .about {
    color: var(--ink-2);
    font-size: 13.5px;
    line-height: 1.45;
  }
  .act.primary {
    background: var(--accent-soft);
    border-color: color-mix(in srgb, var(--accent) 55%, transparent);
  }
  .act.primary .about {
    color: var(--ink);
  }
  .go {
    color: var(--accent);
    font-size: 13.5px;
    font-weight: 700;
    margin-top: 4px;
  }
  /* The card that waits for the desktop app: its words keep their contrast, and the dashed
     tag says why it does nothing here. */
  .act.off .what,
  .act.off .about {
    color: var(--ink-3);
  }
  .act.off :global(svg) {
    color: var(--ink-3);
  }
  .tag {
    border: 1px dashed var(--line-strong);
    border-radius: 999px;
    color: var(--ink-3);
    font-size: 12.5px;
    margin-top: 4px;
    padding: 1px 9px;
  }
  .naming {
    background: var(--window);
    border: 1px solid var(--accent);
    border-radius: 12px;
    box-sizing: border-box;
    padding: 18px 18px 16px;
  }
  .naming label {
    display: block;
    font-size: 16.5px;
    font-weight: 700;
    margin-bottom: 10px;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .naming input {
    background: var(--window);
    border: 1px solid var(--line-strong);
    border-radius: 7px;
    flex: 1 1 100%;
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
  .filled:hover:not(:disabled) {
    background: var(--accent-hover);
    border-color: var(--accent-hover);
  }
  .plain {
    background: var(--window);
    border: 1px solid var(--line-strong);
  }
  .plain.danger {
    color: var(--error);
    font-weight: 600;
  }
  .problem {
    color: var(--warning);
    font-size: 14px;
    margin: 8px 0 0;
  }
  .kept {
    background: var(--soft);
    border: 1px solid var(--line);
    border-radius: 12px;
    display: grid;
    gap: 22px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin-top: 22px;
    padding: 14px 16px;
  }
  .kept > div {
    align-items: flex-start;
    display: flex;
    gap: 12px;
  }
  .kept p {
    color: var(--ink-2);
    font-size: 13.5px;
    line-height: 1.55;
    margin: 0;
  }
  .kept b {
    color: var(--ink);
  }
  .kept .where :global(svg) {
    color: var(--ok);
  }
  .kept .where.not :global(svg),
  .kept b.warn {
    color: var(--warning);
  }
  .right {
    background: var(--window);
    border: 1px solid var(--line);
    border-radius: 14px;
    box-shadow: 0 24px 48px -36px rgba(20, 42, 102, 0.5);
    padding: 22px 10px 12px;
  }
  .rhead {
    align-items: baseline;
    display: flex;
    justify-content: space-between;
    padding: 0 14px 10px;
  }
  h2 {
    font:
      600 22px/1.2 "Newsreader",
      serif;
    margin: 0;
  }
  .count {
    color: var(--ink-3);
    font-size: 13px;
  }
  /* Five rows in view; the lower 64 pixels fade into the card while more lie below. The fade
     lies over the list and takes no press, so that the rows under it and the menus that open
     out of the list are as they are. */
  .recent-wrap {
    position: relative;
  }
  .recent-wrap::after {
    background: linear-gradient(transparent, var(--window));
    bottom: 0;
    content: "";
    height: 64px;
    left: 0;
    pointer-events: none;
    position: absolute;
    right: 0;
  }
  .recent-wrap.end::after {
    display: none;
  }
  .recent-box {
    max-height: 335px;
    overflow-y: auto;
    scrollbar-width: thin;
  }
  .projects {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .projects li {
    align-items: center;
    border-radius: 10px;
    display: flex;
  }
  .projects li:hover:not(.asked) {
    background: var(--accent-soft);
  }
  .rec {
    background: none;
    border: 0;
    column-gap: 12px;
    display: grid;
    flex: 1;
    grid-template-columns: 30px minmax(0, 1fr);
    min-width: 0;
    padding: 11px 14px;
    text-align: left;
  }
  .pi {
    align-self: center;
    grid-row: span 2;
  }
  .rec .name {
    font-size: 16px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .rec small {
    color: var(--ink-3);
    font-size: 13px;
  }
  .projects li :global(.more) {
    margin-right: 8px;
  }
  .projects li.asked {
    border-bottom: 1px solid var(--line);
    display: block;
    padding: 6px 14px 12px;
  }
  .asked .row {
    align-items: center;
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
  .empty {
    align-items: center;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 34px 20px 28px;
    text-align: center;
  }
  .empty b {
    font:
      600 20px "Newsreader",
      serif;
    margin-top: 6px;
  }
  .empty span {
    color: var(--ink-2);
    font-size: 14px;
    margin-bottom: 12px;
    max-width: 300px;
  }
  .said {
    color: var(--ink-2);
    font-size: 14px;
    margin: 8px 14px 0;
    min-height: 1.45em;
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
  .bottom .engine,
  .bottom .counted {
    color: var(--ink-2);
  }
  /* A narrow window: one column. A phone: the cards and the note one to a row, and the list
     of projects first when there are any. */
  @media (max-width: 900px) {
    .welcome-main {
      gap: 32px;
      grid-template-columns: minmax(0, 1fr);
    }
    .report {
      display: none;
    }
  }
  @media (max-width: 640px) {
    .welcome-main {
      padding: 24px 16px;
    }
    .actions,
    .kept {
      grid-template-columns: minmax(0, 1fr);
    }
    .kept {
      gap: 14px;
    }
    .right.has {
      order: -1;
    }
    .bottom {
      flex-wrap: wrap;
      gap: 4px 14px;
      padding: 9px 16px;
    }
    .gap {
      display: none;
    }
  }
</style>
