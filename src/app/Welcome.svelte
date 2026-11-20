<script lang="ts">
  // The welcome screen (Zemp Specification, section 5; the design guide, section 9): with no
  // project open, one quiet screen. On the left what can be done; on the right the projects
  // of this browser, the one opened last first.
  import { ProjectError, when, type ProjectInfo, type Projects } from "../project/projects";
  import Logo from "../theme/Logo.svelte";
  import ThemeButton from "../theme/ThemeButton.svelte";
  import Watermark from "../theme/Watermark.svelte";
  import { ENGINE, VERSION, shown } from "./version";

  let {
    projects,
    lasting,
    naming: asked = false,
    onopen,
  }: {
    projects: Projects;
    /** Whether the screen opens asking for a new project's name. */
    naming?: boolean;
    /** Whether the browser keeps the projects after the tab is closed. */
    lasting: boolean;
    onopen: (folder: string) => void;
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
      onopen(made.folder);
    } catch (error) {
      problem =
        error instanceof ProjectError
          ? error.message
          : `The project could not be made: ${String(error)}`;
    }
  }

  async function scratch(): Promise<void> {
    onopen((await projects.scratch()).folder);
  }

  function focus(node: HTMLInputElement): void {
    node.focus();
  }
</script>

<div class="welcome">
  <Watermark />
  <div class="corner"><ThemeButton /></div>

  <section class="left" aria-label="Start">
    <h1 class="brand">
      <Logo size={34} />
      Zemp Lite <small>{shown(VERSION)}</small>
    </h1>

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
      <span class="about">a project folder on this computer: not in this prototype yet</span>
    </button>
    <button class="act" onclick={scratch}>
      <span class="what">Scratch project</span>
      <span class="about">a worked example to run and change</span>
    </button>

    <p class="store">
      {#if lasting}
        <b>Kept on this computer.</b> Projects live in this browser's private storage. Clearing the site's
        data would remove them.
      {:else}
        <b class="warn">Not kept.</b> This browser gives a page no private storage, so a project lasts
        only until this tab is closed.
      {/if}
    </p>
  </section>

  <section class="right" aria-label="Recent projects">
    <h2 class="label">Recent</h2>
    {#each recent as project (project.folder)}
      <button class="rec" onclick={() => onopen(project.folder)}>
        <span class="name">{project.name}</span>
        <small>in this browser · {when(project.opened, now)}</small>
      </button>
    {:else}
      <p class="none">No project yet. Start with the Scratch project.</p>
    {/each}
  </section>
</div>

<footer class="bottom">
  <span class="state">No project open</span>
  <a class="counted" href="./counted.html">What is counted</a>
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
    border-bottom: 1px solid var(--line);
    text-align: left;
    width: 100%;
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
