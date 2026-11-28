<script lang="ts" module>
  /** A question about a project, asked in its row of the start screen. */
  export interface Asking {
    kind: "rename" | "duplicate" | "delete" | "reset";
    folder: string;
  }
</script>

<script lang="ts">
  // The projects screen (Zemp Specification, section 5; open decision #245, as completed on 28
  // November 2026; redrawn at release 0.3.1, step 12b, from the screen of #220, item 4). With
  // no project open: at the left a column of what can be done (the Scratch project, a new
  // project, a project's zip, and a folder, which waits for the desktop app) with, at its
  // foot, the note on where the work is kept, the space the browser says the site uses and
  // **Export all projects…**; and the projects of this browser as a table, the one opened last
  // first, each with its scripts, how its last run went, its size, when it was opened and
  // exported, and **Open**, **Export…** and ⋯ at its end. A field over the table keeps the
  // rows whose name or script holds what is typed. Under it three cards lead to a first
  // analysis and into Help. The watermark stands faint behind.
  import { exportProject } from "../project/export";
  import { limitsFor, projectOf } from "../project/from-zip";
  import type { Keeping } from "../project/keeping";
  import { ZipError, readZip } from "../project/zip";
  import {
    ProjectError,
    SCRATCH,
    when,
    type ProjectInfo,
    type ProjectRow,
    type Projects,
  } from "../project/projects";
  import { addressOf } from "../help/address";
  import Named from "../theme/Named.svelte";
  import Watermark from "../theme/Watermark.svelte";
  import FrontBar from "./FrontBar.svelte";
  import { filtered, lastRun, scriptsLine, sizeOf, usedOf } from "./projects-list";
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

  let recent = $state<ProjectRow[]>([]);
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
      recent = await projects.rows();
    } finally {
      read = true;
    }
    void measured();
  }
  void refresh();

  // The space the browser says the site uses: asked of the browser, and left out of the note
  // where it gives no number.
  let used = $state<ReturnType<typeof usedOf>>(null);
  async function measured(): Promise<void> {
    try {
      used = usedOf(await navigator.storage?.estimate?.());
    } catch {
      used = null;
    }
  }

  // The field over the table: the rows whose name, or a script's name, holds what is typed.
  let finding = $state("");
  const rows = $derived(filtered(recent, finding));
  // A first visit: this browser has no project. The Scratch project stands in the table all
  // the same, not yet made: opening its row makes it.
  const first = $derived(read && recent.length === 0);

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
          { name: "Export project…", run: () => void exportOne(project) },
          { name: "Reset…", run: ask("reset") },
        ]
      : [
          { name: "Rename…", run: ask("rename") },
          { name: "Duplicate…", run: ask("duplicate") },
          { name: "Export project…", run: () => void exportOne(project) },
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

  /** Give a project to the computer as a zip, without opening it: the zip's name, or none. */
  async function exported(info: ProjectInfo): Promise<string | null> {
    const project = await projects.peek(info.folder);
    if (project === null) return null;
    const made = await exportProject(project, Date.now());
    saveToComputer(made.name, made.bytes, "application/zip");
    project.noteExported();
    return made.name;
  }

  /** **Export…** of a row, and **Export project…** of its menu. */
  async function exportOne(info: ProjectInfo): Promise<void> {
    try {
      const name = await exported(info);
      if (name !== null) said = `${info.name} exported as ${name}`;
      await refresh();
    } catch (error) {
      said = error instanceof Error ? error.message : String(error);
    }
  }

  /**
   * **Export all projects…**: every project of this browser, whatever the field over the
   * table keeps, each as a zip of its own, one after another.
   */
  let exporting = $state(false);
  async function exportAll(): Promise<void> {
    if (exporting) return;
    exporting = true;
    const names: string[] = [];
    try {
      for (const info of recent) {
        said = `Exporting ${info.name}…`;
        const name = await exported(info);
        if (name !== null) names.push(name);
      }
      said =
        names.length === 1
          ? `1 project exported: ${names[0]}`
          : `${names.length} projects exported: ${names.join(", ")}`;
      await refresh();
    } catch (error) {
      said = error instanceof Error ? error.message : String(error);
    } finally {
      exporting = false;
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

  /** A press on a row opens its project, unless it is on a control of the row. */
  function rowPressed(event: MouseEvent, folder: string): void {
    const at = event.target as HTMLElement | null;
    if (at?.closest("button, a, input, form, [role='menu']") !== null) return;
    onopen(folder);
  }

  // The three cards under the table: into the Scratch project, and into Help, which opens
  // in the Scratch project (Help is a place inside a project).
  const FINDING = addressOf({ kind: "using", page: "finding-help" });
  const REG = addressOf({ kind: "name", name: "reg" });
</script>

<!-- What is asked of a project, under its row: a new name, or whether to delete or reset it. -->
{#snippet question(project: ProjectRow, now: Asking)}
  {#if now.kind === "rename" || now.kind === "duplicate"}
    <form class="row" onsubmit={(event) => void answered(event, project)}>
      <input
        value={now.kind === "rename" ? project.name : `${project.name} copy`}
        use:whole
        aria-label={now.kind === "rename"
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
      <button class="filled" type="submit">{now.kind === "rename" ? "Rename" : "Duplicate"}</button>
      <button type="button" class="plain" onclick={() => (asking = null)}>Cancel</button>
    </form>
  {:else}
    <div
      class="confirm"
      role="group"
      aria-label={now.kind === "reset" ? "Reset the Scratch project?" : `Delete ${project.name}?`}
    >
      <p>
        {#if now.kind === "reset"}
          Reset the Scratch project? What it holds{files === null
            ? ""
            : files === 1
              ? ", one file,"
              : `, ${files} files,`} is deleted, and its examples are put back as a first visit has them.
          It cannot be brought back.
        {:else}
          Delete {project.name}{files === null || files === 0
            ? ""
            : files === 1
              ? " and the file in it"
              : ` and the ${files} files in it`}? It cannot be brought back.
        {/if}
      </p>
      <div class="row">
        <button class="plain" onkeydown={leave} onclick={() => void exportOne(project)}
          >Export project… first</button
        >
        <button class="plain danger" onkeydown={leave} onclick={() => void removed(project)}
          >{now.kind === "reset" ? "Reset" : "Delete"}</button
        >
        <button class="plain" use:keep onkeydown={leave} onclick={() => (asking = null)}
          >Keep</button
        >
      </div>
    </div>
  {/if}
  {#if refusal}<p class="problem" role="alert">{refusal}</p>{/if}
{/snippet}

<div class="screen">
  <Watermark faint />
  <FrontBar heading>
    <span class="report">Something wrong? In a project, ⌘K → <b>Report a problem</b></span>
  </FrontBar>
  <main class="body">
    <section class="side" aria-label="Start">
      <h2 class="over">Start</h2>
      <button class="act primary" onclick={scratch}>
        <span class="what">Scratch project</span>
        <span class="about">Two worked examples, ready to run</span>
      </button>
      {#if naming}
        <form class="naming" onsubmit={create}>
          <label for="project-name">The name of the new project</label>
          <input
            id="project-name"
            bind:value={name}
            use:focus
            autocomplete="off"
            maxlength="80"
            oninput={() => (problem = "")}
          />
          <div class="row">
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
          <span class="what">New project…</span>
          <span class="about">An empty project with a first script</span>
        </button>
      {/if}
      <button class="act" onclick={() => zipChooser?.click()}>
        <span class="what">Open project…</span>
        <span class="about"
          >A project's zip: one that Export project… wrote, or a folder zipped</span
        >
      </button>
      <button class="act off" disabled>
        <span class="what">Open folder… <span class="tag">desktop app</span></span>
        <span class="about">A project folder on this computer</span>
      </button>
      <input
        bind:this={zipChooser}
        type="file"
        accept=".zip,application/zip"
        hidden
        onchange={zipChosen}
        aria-label="A project's zip to open"
      />
      {#if zipProblem}<p class="problem" role="alert"><Named text={zipProblem} /></p>{/if}

      <div class="store" class:not={!lasting} data-testid="kept">
        <p>
          {#if lasting}
            <b>Kept in this browser.</b>
            {#if used !== null}<span data-testid="used">{used.words}.</span>{/if}
            Clearing the site's data removes the projects{keeping === "kept"
              ? ", and the browser has agreed not to clear it on its own"
              : ", and the browser may clear it when the computer runs short of room"}; export the
            ones you keep.
          {:else}
            <b class="warn">Not kept.</b> This browser gives a page no private storage, so a project lasts
            only until this tab is closed; export the ones you keep.
          {/if}
        </p>
        {#if lasting && used !== null && used.share !== null}
          <!-- How much of what the browser allows is used: the words above say the amount. -->
          <div class="usage" aria-hidden="true" data-testid="usage">
            <i style:width="{Math.max(2, Math.round(used.share * 100))}%"></i>
          </div>
        {/if}
        <button
          class="link"
          disabled={recent.length === 0 || exporting}
          title="Save every project of this browser to this computer, each as a zip of its own"
          onclick={() => void exportAll()}>Export all projects…</button
        >
      </div>
    </section>

    <section class="main" aria-label="Your projects">
      <div class="head">
        <div>
          <h2>Your projects</h2>
          <p class="sub" data-testid="project-count">
            {#if !read}
              &nbsp;
            {:else if first}
              None yet. Start with the Scratch project: press its row to open it.
            {:else if recent.length === 1}
              1 project. Press its row to open it.
            {:else}
              {recent.length} projects, the last opened first. Press a row to open it.
            {/if}
          </p>
        </div>
        <input
          class="find"
          type="search"
          bind:value={finding}
          aria-label="Find a project"
          placeholder="Find a project"
          autocomplete="off"
          spellcheck="false"
        />
      </div>
      <table class="projects">
        <thead>
          <tr>
            <th scope="col">Project</th>
            <th scope="col" class="scripts">Scripts</th>
            <th scope="col">Last run</th>
            <th scope="col" class="num">Size</th>
            <th scope="col">Opened</th>
            <th scope="col">Exported</th>
            <th scope="col"><span class="hid">What can be done</span></th>
          </tr>
        </thead>
        <tbody>
          {#if !read}
            <!-- The list is being read: nothing yet. -->
          {:else if first}
            <tr class="project" data-testid="first-visit" onclick={() => void scratch()}>
              <th scope="row">
                <button class="name" onclick={() => void scratch()}>
                  <b>Scratch</b>
                  <small>Two worked examples, ready to run</small>
                </button>
              </th>
              <td class="scripts"></td>
              <td><span class="chip none">not run</span></td>
              <td class="num"></td>
              <td>{when(null, now)}</td>
              <td><span class="chip none">never</span></td>
              <td class="acts">
                <button class="link" onclick={() => void scratch()}
                  >Open <span class="hid">Scratch</span></button
                >
              </td>
            </tr>
          {:else}
            {#each rows as project (project.folder)}
              {@const ran = lastRun(project.ran)}
              <!-- The keyboard opens a project by its name or by Open; the row answers the pointer. -->
              <tr class="project" onclick={(event) => rowPressed(event, project.folder)}>
                <th scope="row">
                  <button class="name" onclick={() => onopen(project.folder)}>
                    <b>{project.name}</b>
                    <small>{scriptsLine(project.scripts)}</small>
                  </button>
                </th>
                <td class="scripts num">{project.scripts.length}</td>
                <td><span class="chip {ran.tone}">{ran.words}</span></td>
                <td class="num">{sizeOf(project.size)}</td>
                <td>{when(project.opened, now)}</td>
                <td>
                  {#if project.exported === null}
                    <span class="chip none">never</span>
                  {:else}
                    <span class="chip ok">{when(project.exported, now)}</span>
                  {/if}
                </td>
                <td class="acts">
                  <button class="link" onclick={() => onopen(project.folder)}
                    >Open <span class="hid">{project.name}</span></button
                  >
                  <button class="link" onclick={() => void exportOne(project)}
                    >Export… <span class="hid">{project.name}</span></button
                  >
                  <RowMenu label="Actions for {project.name}" actions={actionsOf(project)} />
                </td>
              </tr>
              {#if asking !== null && asking.folder === project.folder}
                <tr class="asked">
                  <td colspan="7">{@render question(project, asking)}</td>
                </tr>
              {/if}
            {/each}
            {#if rows.length === 0}
              <tr class="nothing">
                <td colspan="7" data-testid="none-found"
                  >No project is called “{finding.trim()}”, and none has a script of that name.</td
                >
              </tr>
            {/if}
          {/if}
        </tbody>
      </table>
      <p class="said" role="status"><Named text={said} /></p>

      <div class="learn" role="group" aria-label="Where to begin">
        <button class="card" onclick={() => void scratch()}>
          <span class="k">Learn</span>
          <b>Your first analysis</b>
          <span
            >Five steps in the Scratch project: a sample, a summary, three models, a table, a
            figure.</span
          >
        </button>
        <a class="card" href={FINDING}>
          <span class="k">Help</span>
          <b>Coming from R or Stata</b>
          <span
            >Search Help by the name you know: <span class="mono">lm</span> finds
            <span class="mono">reg</span>, and most pages say what they match in R and in Stata.</span
          >
        </a>
        <a class="card" href={REG}>
          <span class="k">Reference</span>
          <b><span class="mono">reg</span>, the workhorse</b>
          <span>Least squares with fixed effects and clustered errors.</span>
        </a>
      </div>
    </section>
  </main>

  <footer class="bottom">
    <span class="state">No project open</span>
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
    overflow: hidden;
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
  /* Two columns: what can be done, and the projects; each moves by itself where it is long. */
  .body {
    display: grid;
    flex: 1;
    grid-template-columns: 260px minmax(0, 1fr);
    min-height: 0;
  }
  .side {
    background: color-mix(in srgb, var(--softer) 88%, transparent);
    border-right: 1px solid var(--line);
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-height: 0;
    overflow: auto;
    padding: 22px 18px 16px;
  }
  .over {
    color: var(--ink-3);
    font: inherit;
    font-size: 12.5px;
    font-weight: 500;
    letter-spacing: 0.06em;
    margin: 0 0 6px;
    text-transform: uppercase;
  }
  .act {
    background: none;
    border: 1px solid transparent;
    border-radius: 10px;
    display: block;
    padding: 9px 12px;
    text-align: left;
    width: 100%;
  }
  .act:hover:not(:disabled),
  .act:focus-visible {
    background: var(--window);
    border-color: var(--line-strong);
  }
  .what {
    display: block;
    font-size: 14.5px;
    font-weight: 700;
  }
  .about {
    color: var(--ink-2);
    display: block;
    font-size: 13px;
    line-height: 1.4;
  }
  /* The one filled entry: where a first visit starts. */
  .act.primary {
    background: var(--button);
    border-color: var(--button);
    color: var(--button-ink);
  }
  .act.primary .about {
    color: inherit;
  }
  .act.primary:hover,
  .act.primary:focus-visible {
    background: var(--accent-hover);
    border-color: var(--accent-hover);
  }
  /* The entry that waits for the desktop app: its words keep their contrast, and the dashed
     tag says why it does nothing here. */
  .act.off .what,
  .act.off .about {
    color: var(--ink-3);
  }
  .tag {
    border: 1px dashed var(--line-strong);
    border-radius: 999px;
    font-size: 12.5px;
    font-weight: 400;
    margin-left: 4px;
    padding: 1px 8px;
    white-space: nowrap;
  }
  .naming {
    background: var(--window);
    border: 1px solid var(--accent);
    border-radius: 10px;
    box-sizing: border-box;
    padding: 10px 12px 12px;
  }
  .naming label {
    display: block;
    font-size: 14.5px;
    font-weight: 700;
    margin-bottom: 8px;
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
    box-sizing: border-box;
    color: var(--ink);
    font: inherit;
    font-size: 15px;
    margin-bottom: 8px;
    min-width: 0;
    padding: 5px 9px;
    width: 100%;
  }
  .filled,
  .plain {
    border-radius: 7px;
    font-size: 14px;
    padding: 5px 13px;
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
  /* Where the work is kept, at the foot of the column. */
  .store {
    border-top: 1px solid var(--line);
    margin-top: auto;
    padding-top: 14px;
  }
  .store p {
    color: var(--ink-2);
    font-size: 13px;
    line-height: 1.5;
    margin: 0;
  }
  .store b {
    color: var(--ink);
  }
  .store b.warn {
    color: var(--warning);
  }
  .usage {
    background: var(--line);
    border-radius: 999px;
    height: 6px;
    margin: 8px 0 2px;
    overflow: hidden;
  }
  .usage i {
    background: var(--ok);
    display: block;
    height: 100%;
  }
  .link {
    background: none;
    border: 0;
    border-radius: 5px;
    color: var(--accent);
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    padding: 2px 3px;
  }
  .link:hover:not(:disabled) {
    text-decoration: underline;
  }
  .link:disabled {
    color: var(--ink-3);
  }
  .store .link {
    margin: 6px 0 0 -3px;
  }
  .main {
    box-sizing: border-box;
    min-height: 0;
    min-width: 0;
    overflow: auto;
    padding: 24px 32px 20px;
  }
  .head {
    align-items: end;
    display: flex;
    gap: 16px;
    justify-content: space-between;
    margin-bottom: 14px;
  }
  h2 {
    font:
      500 30px/1.1 "Newsreader",
      serif;
    margin: 0 0 4px;
  }
  .sub {
    color: var(--ink-2);
    font-size: 14px;
    margin: 0;
  }
  .find {
    background: var(--window);
    border: 1px solid var(--line-strong);
    border-radius: 9px;
    box-sizing: border-box;
    color: var(--ink);
    flex: 0 1 300px;
    font: inherit;
    font-size: 14px;
    height: 32px;
    min-width: 150px;
    padding: 0 10px;
  }
  .find::placeholder {
    color: var(--ink-3);
  }
  .find:focus-visible {
    border-color: var(--accent);
    outline: 3px solid var(--accent-soft);
  }
  table {
    border-collapse: collapse;
    font-size: 14px;
    width: 100%;
  }
  thead th {
    border-bottom: 1px solid var(--line-strong);
    color: var(--ink-3);
    font-size: 12.5px;
    font-weight: 600;
    letter-spacing: 0.05em;
    padding: 8px 12px;
    text-align: left;
    text-transform: uppercase;
    white-space: nowrap;
  }
  tbody th,
  tbody td {
    border-bottom: 1px solid var(--line);
    font-weight: 400;
    padding: 10px 12px;
    text-align: left;
    vertical-align: middle;
    white-space: nowrap;
  }
  thead th.num,
  tbody td.num {
    font-variant-numeric: tabular-nums;
    text-align: right;
  }
  tr.project {
    cursor: pointer;
  }
  tr.project:hover > * {
    background: var(--soft);
  }
  /* The name takes the room the other columns leave, and is cut where it has too little. */
  tbody th {
    max-width: 0;
    padding: 4px 6px;
    width: 100%;
  }
  .name {
    background: none;
    border: 0;
    border-radius: 7px;
    display: block;
    padding: 6px;
    text-align: left;
    width: 100%;
  }
  .name b,
  .name small {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .name b {
    font-size: 15.5px;
    font-weight: 600;
  }
  .name small {
    color: var(--ink-3);
    font-size: 12.5px;
  }
  .chip {
    border-radius: 999px;
    display: inline-block;
    font-size: 12.5px;
    font-weight: 600;
    padding: 2px 9px;
  }
  .chip.ok {
    background: color-mix(in srgb, var(--ok) 7%, transparent);
    color: var(--ok);
  }
  .chip.warning {
    background: color-mix(in srgb, var(--warning) 8%, transparent);
    color: var(--warning);
  }
  .chip.error {
    background: color-mix(in srgb, var(--error) 7%, transparent);
    color: var(--error);
  }
  .chip.none {
    background: var(--soft);
    color: var(--ink-3);
  }
  tr.project:hover .chip.none {
    background: var(--line);
    color: var(--ink-2);
  }
  td.acts {
    padding-right: 4px;
    text-align: right;
  }
  .acts .link {
    margin-left: 8px;
  }
  .acts :global(.more) {
    margin-left: 6px;
    vertical-align: middle;
  }
  /* A question about a project, under its row. */
  tr.asked td {
    background: var(--soft);
    padding: 10px 14px 12px;
    white-space: normal;
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
  tr.nothing td {
    color: var(--ink-2);
    padding: 16px 12px;
    white-space: normal;
  }
  .said {
    color: var(--ink-2);
    font-size: 14px;
    margin: 8px 12px 0;
    min-height: 1.45em;
  }
  /* Three cards under the table: where to begin. */
  .learn {
    display: grid;
    gap: 14px;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin-top: 18px;
  }
  .card {
    align-items: flex-start;
    background: color-mix(in srgb, var(--window) 80%, transparent);
    border: 1px solid var(--line);
    border-radius: 12px;
    color: var(--ink);
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    font: inherit;
    padding: 14px 16px;
    text-align: left;
    text-decoration: none;
  }
  .card:hover,
  .card:focus-visible {
    border-color: var(--accent);
  }
  .card b {
    display: block;
    font-size: 14.5px;
    margin-bottom: 2px;
  }
  .card > span {
    color: var(--ink-2);
    display: block;
    font-size: 13px;
    line-height: 1.45;
  }
  .card .k {
    color: var(--accent);
    font-size: 12.5px;
    font-weight: 700;
    letter-spacing: 0.07em;
    margin-bottom: 6px;
    text-transform: uppercase;
  }
  /* Said to a screen reader and not drawn: whose Open and whose Export… a button is. */
  .hid {
    clip-path: inset(50%);
    height: 1px;
    overflow: hidden;
    position: absolute;
    white-space: nowrap;
    width: 1px;
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
  /* Where the table has less room, the count of scripts gives way: they are named under the
     project's name. */
  @media (max-width: 1180px) {
    .body {
      grid-template-columns: 236px minmax(0, 1fr);
    }
    .main {
      padding: 20px 20px 16px;
    }
    .scripts {
      display: none;
    }
    tbody td,
    thead th {
      padding-left: 8px;
      padding-right: 8px;
    }
  }
</style>
