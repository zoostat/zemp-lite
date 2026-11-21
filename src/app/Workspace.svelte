<script lang="ts">
  // The workspace of a project (Zemp Specification, section 5), in the Panes layout of open
  // decision #146: the top bar, one left panel, the main pane, and a line at the foot.
  import type { Engine } from "../engine/engine";
  import type { Project } from "../project/projects";
  import { closePopOuts } from "../plots/popout";
  import type { TreeNode } from "../project/projects";
  import { codeLarger, codeSize, codeSmaller, codeUsual } from "../theme/codesize.svelte";
  import { switchTheme, theme } from "../theme/theme.svelte";
  import type { Command } from "./commands";
  import ConsoleLine from "./ConsoleLine.svelte";
  import MarginPane from "./MarginPane.svelte";
  import RunPanel from "../margin/RunPanel.svelte";
  import LeftPanel from "./LeftPanel.svelte";
  import MainPane from "./MainPane.svelte";
  import NarrowLine from "./NarrowLine.svelte";
  import Palette from "./Palette.svelte";
  import { paneCommand } from "./panes";
  import ReportWindow from "./ReportWindow.svelte";
  import Splitter from "./Splitter.svelte";
  import TopBar from "./TopBar.svelte";
  import { LEFT_WIDTH, fileTab } from "./views";
  import { Workspace, editable } from "./workspace-state.svelte";

  let {
    project,
    engine,
    language = null,
    onclose,
  }: { project: Project; engine: Engine; language?: Engine | null; onclose: () => void } = $props();

  // One project to a window: this component is made anew for each project it shows.
  // svelte-ignore state_referenced_locally
  const workspace = new Workspace(project, engine, language);

  let body = $state<HTMLElement | null>(null);

  let palette = $state(false);
  let console_ = $state<ReturnType<typeof ConsoleLine> | null>(null);

  async function close(): Promise<void> {
    closePopOuts();
    await workspace.settle();
    onclose();
  }

  /** The files the editor opens, each by its path. */
  function files(nodes: TreeNode[]): string[] {
    return nodes.flatMap((node) =>
      node.kind === "folder" ? files(node.children) : editable(node.path) ? [node.path] : [],
    );
  }

  // The commands of ⌘K: every control of the window, and what has no button of its own.
  const commands = $derived<Command[]>([
    { name: "Run the script", hint: "⌘↵", run: () => void workspace.run() },
    { name: "Check the script", hint: "nothing is run", run: () => void workspace.check() },
    {
      name: "Report a problem",
      hint: "a bug report built here, nothing sent",
      run: () => void workspace.reportProblem(),
    },
    {
      name: "Place: Script",
      hint: "the script with its notes",
      run: () => workspace.show(fileTab(workspace.scriptPath)),
    },
    { name: "Place: Data", hint: "the frames of the run", run: () => workspace.openData() },
    { name: "Place: Plots", hint: "the plots of the run", run: () => workspace.openPlots() },
    paneCommand(workspace, "script", "project"),
    paneCommand(workspace, "script", "notes"),
    paneCommand(workspace, "plots", "list"),
    {
      name: workspace.help.shown ? "Help: hide" : "Help: show",
      hint: "F1 in the script opens the page of the name at the cursor",
      run: () => workspace.setHelpShown(!workspace.help.shown),
    },
    {
      name: "Format the script",
      hint: "as zeff fmt does",
      run: () => void workspace.format(workspace.activePath ?? workspace.scriptPath),
    },
    ...(workspace.views.layout === "margin" && workspace.cursor !== null
      ? [
          {
            name: "Run the statement at the cursor",
            hint: "⌘↵ in the script",
            run: () => void workspace.runPart("statement", workspace.cursor?.line ?? 1),
          },
          {
            name: "Run to here",
            hint: `the statements before line ${workspace.cursor.line}`,
            run: () => void workspace.runPart("to", workspace.cursor?.line ?? 1),
          },
          {
            name: "Run from here",
            hint: `line ${workspace.cursor.line} and what follows`,
            run: () => void workspace.runPart("from", workspace.cursor?.line ?? 1),
          },
        ]
      : []),
    {
      name: workspace.views.layout === "margin" ? "Layout: Panes" : "Layout: Margin",
      hint: `now ${workspace.views.layout === "margin" ? "Margin" : "Panes"}`,
      run: () => workspace.setLayout(workspace.views.layout === "margin" ? "panes" : "margin"),
    },
    {
      name: theme.name === "dark" ? "Theme: light" : "Theme: dark",
      hint: `now ${theme.name}`,
      run: switchTheme,
    },
    { name: "Code text: larger", hint: `now ${codeSize.px}`, run: codeLarger },
    { name: "Code text: smaller", hint: `now ${codeSize.px}`, run: codeSmaller },
    { name: "Code text: default size", hint: "14", run: codeUsual },
    { name: "Console: type a statement", hint: "⌃`", run: () => console_?.focus() },
    { name: "Output: clear", run: () => workspace.clear() },
    { name: "Open the plot viewer", run: () => workspace.openPlots() },
    ...(workspace.views.layout === "panes"
      ? [
          {
            name: workspace.views.output.shown ? "Output: hide" : "Output: show",
            run: () => workspace.toggleOutput(),
          },
          {
            name: workspace.views.left.shown ? "Left panel: hide" : "Left panel: show",
            run: () => workspace.toggleLeft(),
          },
        ]
      : []),
    ...files(workspace.tree).map((path) => ({
      name: `Open file: ${path}`,
      run: () => void workspace.open(path),
    })),
    { name: "New project…", run: () => void close().then(() => (window.location.hash = "#/new")) },
    { name: "Projects: back to the projects of this browser", run: () => void close() },
  ]);

  function keys(event: KeyboardEvent): void {
    const command = event.metaKey || event.ctrlKey;
    if (command && event.key.toLowerCase() === "k") {
      event.preventDefault();
      palette = !palette;
    } else if (event.ctrlKey && event.key === "`") {
      event.preventDefault();
      console_?.focus();
    } else if (event.key === "Enter" && command && !event.defaultPrevented) {
      // Run from the keyboard wherever the focus is (the editor answers these keys itself).
      event.preventDefault();
      void workspace.run();
    }
  }
</script>

<svelte:window onkeydown={keys} />

<TopBar {workspace} onclose={() => void close()} onpalette={() => (palette = true)} />

<NarrowLine />

{#if workspace.views.layout === "margin"}
  <MarginPane {workspace} />
{:else}
  <div class="panes" bind:this={body}>
    {#if workspace.views.left.shown}
      <div class="side" style:width="{workspace.views.left.width}px">
        <LeftPanel {workspace} />
      </div>
      <Splitter
        orientation="vertical"
        label="The width of the left panel"
        value={workspace.views.left.width}
        least={LEFT_WIDTH.least}
        most={LEFT_WIDTH.most}
        ondrag={(x) => workspace.setLeftWidth(x - (body?.getBoundingClientRect().left ?? 0))}
        onstep={(direction) => workspace.setLeftWidth(workspace.views.left.width + direction * 16)}
      />
    {:else}
      <div class="rail">
        <button onclick={() => workspace.toggleLeft()} aria-label="Show the left panel">›</button>
      </div>
    {/if}
    <MainPane {workspace} />
  </div>
{/if}

<ConsoleLine {workspace} bind:this={console_} />
{#if workspace.panel !== null}
  {#key workspace.panel}
    <RunPanel {workspace} kind={workspace.panel} onclose={() => (workspace.panel = null)} />
  {/key}
{/if}

<ReportWindow {workspace} />
{#if palette}
  <Palette {commands} onclose={() => (palette = false)} />
{/if}

<style>
  .panes {
    background: var(--window);
    display: flex;
    flex: 1;
    min-height: 0;
  }
  .panes > :global(.main) {
    flex: 1;
  }
  .side {
    border-right: 1px solid var(--line);
    display: flex;
    flex: none;
    min-height: 0;
  }
  .side > :global(.left) {
    flex: 1;
  }
  .rail {
    background: var(--soft);
    border-right: 1px solid var(--line);
    flex: none;
    padding-top: 12px;
    width: 30px;
  }
  .rail button {
    background: transparent;
    border: 0;
    border-radius: 6px;
    color: var(--ink-3);
    font-size: 16px;
    height: 22px;
    line-height: 1;
    margin: 0 4px;
    width: 22px;
  }
  .rail button:hover {
    background: var(--line);
    color: var(--ink);
  }
</style>
