<script lang="ts">
  // One window, one project (Zemp Specification, section 4). With no project open the window
  // shows the welcome screen; the project it has open is named in its address, after `#/p/`,
  // so that a reload comes back to the same project and a second tab can hold another.
  import { browserEngine } from "../engine/browser";
  import { MemoryFolder, OpfsFolder } from "../project/folder";
  import { Projects, type Project } from "../project/projects";
  import { browserStorage } from "../theme/theme.svelte";
  import Welcome from "./Welcome.svelte";
  import Workspace from "./Workspace.svelte";

  // Projects are kept in the browser's private file system; a browser that gives the page
  // none (a private window) keeps them for the life of the tab, and the welcome screen says so.
  let lasting = $state(true);
  let projects = $state<Projects | null>(null);
  const engine = browserEngine();

  /** The folder the address names, or `null`. */
  function named(): string | null {
    const found = /^#\/p\/([^/]+)$/.exec(window.location.hash);
    return found === null ? null : decodeURIComponent(found[1] as string);
  }

  let project = $state<Project | null>(null);
  let ready = $state(false);

  async function follow(): Promise<void> {
    if (projects === null) {
      const kept = await OpfsFolder.open();
      lasting = kept !== null;
      projects = new Projects(kept ?? new MemoryFolder(), browserStorage());
    }
    const folder = named();
    if (project !== null && project.info.folder !== folder) {
      // The project closes: its worker is ended, which returns its memory to the browser.
      engine.close();
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
    window.location.hash = `#/p/${encodeURIComponent(folder)}`;
  }
</script>

{#if !ready || projects === null}
  <p class="waiting" role="status">Opening…</p>
{:else if project === null}
  <Welcome {projects} {lasting} onopen={open} />
{:else}
  {#key project.info.folder}
    <Workspace {project} {engine} onclose={() => (window.location.hash = "")} />
  {/key}
{/if}

<style>
  .waiting {
    color: var(--ink-3);
    padding: 24px;
  }
</style>
