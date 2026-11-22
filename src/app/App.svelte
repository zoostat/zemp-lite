<script lang="ts">
  // One window, one project (Zemp Specification, section 4). With no project open the window
  // shows the welcome screen; the project it has open is named in its address, after `#/p/`,
  // so that a reload comes back to the same project and a second tab can hold another.
  import { browserEngine } from "../engine/browser";
  import { MemoryFolder, OpfsFolder } from "../project/folder";
  import { keepingOf, type Keeping } from "../project/keeping";
  import { Projects, type Project } from "../project/projects";
  import { browserStorage } from "../theme/theme.svelte";
  import Start from "./Start.svelte";
  import { ENGINE_SHA256, VERSION } from "./version";
  import Welcome, { type Asking } from "./Welcome.svelte";
  import Workspace from "./Workspace.svelte";

  // Projects are kept in the browser's private file system; a browser that gives the page
  // none (a private window) keeps them for the life of the tab, and the welcome screen says so.
  let lasting = $state(true);
  // Whether the browser has agreed to keep that storage for good, or may clear it (Zemp
  // Specification, section 10; #117): it is asked once, when the first project is made.
  let keeping = $state<Keeping>("may-clear");
  const ASKED = "zemp-asked-to-keep";
  let projects = $state<Projects | null>(null);

  /** A project was made: the browser is asked to keep the storage, the first time. */
  async function made(): Promise<void> {
    let ask = true;
    try {
      ask = localStorage.getItem(ASKED) === null;
      localStorage.setItem(ASKED, "1");
    } catch {
      // A browser that keeps no note is asked each time, which costs nothing.
    }
    keeping = await keepingOf(navigator.storage, lasting, ask);
  }
  const engine = browserEngine();
  // The engine's language server runs in a worker of its own, so that typing never waits on a run.
  const language = browserEngine();

  /** The folder the address names, or `null`. */
  function named(): string | null {
    const found = /^#\/p\/([^/]+)$/.exec(window.location.hash);
    return found === null ? null : decodeURIComponent(found[1] as string);
  }

  // A first visit opens on the Start screen, which fetches, checks and starts the engine; the
  // browser then keeps the engine, and the next visit opens straight on the welcome screen.
  // What was opened is noted by the engine's digest, so that a new engine is started afresh.
  const STARTED = "zemp-started";
  const opened = `${VERSION} ${ENGINE_SHA256 ?? ""}`;
  function startedBefore(): boolean {
    try {
      return localStorage.getItem(STARTED) === opened;
    } catch {
      return false;
    }
  }
  let started = $state(startedBefore());
  function onstarted(): void {
    try {
      localStorage.setItem(STARTED, opened);
    } catch {
      // A browser that keeps nothing opens on the Start screen each time.
    }
    started = true;
  }

  let project = $state<Project | null>(null);
  let ready = $state(false);
  /** The welcome screen is to open with the new project's name asked for (`#/new`). */
  let naming = $state(false);

  async function follow(): Promise<void> {
    if (projects === null) {
      const kept = await OpfsFolder.open();
      lasting = kept !== null;
      projects = new Projects(kept ?? new MemoryFolder(), browserStorage());
      keeping = await keepingOf(navigator.storage, lasting, false);
    }
    naming = window.location.hash === "#/new";
    const folder = named();
    if (project !== null && project.info.folder !== folder) {
      // The project closes: its workers are ended, which returns their memory to the browser.
      engine.close();
      language.close();
    }
    project = folder === null ? null : await projects.open(folder);
    if (folder !== null && project === null) {
      // The address names a project that is not here.
      window.location.hash = "";
    }
    ready = true;
  }

  window.addEventListener("hashchange", () => void follow());
  void follow();

  function open(folder: string): void {
    asked = null;
    window.location.hash = `#/p/${encodeURIComponent(folder)}`;
  }

  /**
   * A question about the project open, asked from ⌘K in it (to rename, duplicate, delete it):
   * the project is closed and the start screen opens with the question in its row.
   */
  let asked = $state<Asking | null>(null);
  function ask(kind: Asking["kind"]): void {
    if (project === null) return;
    asked = { kind, folder: project.info.folder };
    window.location.hash = "";
  }
</script>

{#if !started}
  <Start {engine} onopen={onstarted} />
{:else if !ready || projects === null}
  <p class="waiting" role="status">Opening…</p>
{:else if project === null}
  {#key naming}
    <Welcome
      {projects}
      {lasting}
      {keeping}
      {naming}
      ask={asked}
      onopen={open}
      onmade={() => void made()}
    />
  {/key}
{:else}
  {#key project.info.folder}
    <Workspace
      {project}
      {engine}
      {language}
      {keeping}
      onask={ask}
      onclose={() => {
        asked = null;
        window.location.hash = "";
      }}
    />
  {/key}
{/if}

<style>
  .waiting {
    color: var(--ink-3);
    padding: 24px;
  }
</style>
