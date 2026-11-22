<script lang="ts">
  // The workspace of a project (Zemp Specification, section 5; open decision #203): the top
  // bar, the place shown on its frame of panes, and a line at the foot.
  import type { Engine } from "../engine/engine";
  import type { Keeping } from "../project/keeping";
  import { browserStorage } from "../theme/theme.svelte";
  import type { Project } from "../project/projects";
  import { closePopOuts } from "../plots/popout";
  import type { TreeNode } from "../project/projects";
  import { codeLarger, codeSize, codeSmaller, codeUsual } from "../theme/codesize.svelte";
  import { switchTheme, theme } from "../theme/theme.svelte";
  import { sectionAt } from "../editor/sections";
  import type { Command } from "./commands";
  import ConsoleLine from "./ConsoleLine.svelte";
  import MarginPane from "./MarginPane.svelte";
  import RunPanel from "../margin/RunPanel.svelte";
  import NarrowLine from "./NarrowLine.svelte";
  import Palette from "./Palette.svelte";
  import { paneCommand } from "./panes";
  import ReportWindow from "./ReportWindow.svelte";
  import TopBar from "./TopBar.svelte";
  import { fileTab } from "./views";
  import { Workspace, editable } from "./workspace-state.svelte";

  let {
    project,
    engine,
    language = null,
    keeping = "may-clear",
    onclose,
  }: {
    project: Project;
    engine: Engine;
    language?: Engine | null;
    /** What the browser does with the projects, for the reminder to export. */
    keeping?: Keeping;
    onclose: () => void;
  } = $props();

  // One project to a window: this component is made anew for each project it shows.
  // svelte-ignore state_referenced_locally
  const workspace = new Workspace(project, engine, language, browserStorage());
  $effect(() => {
    workspace.keeping = keeping;
  });

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

  // The section the cursor is in, which ⌘K offers to run.
  const atSection = $derived(
    workspace.cursor === null ? null : sectionAt(workspace.sections, workspace.cursor.line),
  );

  // The file the Script place shows, which ⌘K offers to save to the computer.
  const shownFile = $derived(workspace.activePath ?? workspace.scriptPath);

  // The commands of ⌘K: every control of the window, and what has no button of its own.
  const commands = $derived<Command[]>([
    { name: "Run the script", hint: "⌘↵", run: () => void workspace.run() },
    { name: "Check the script", hint: "nothing is run", run: () => void workspace.check() },
    {
      name: "Project: export…",
      hint: "the whole project as a zip, saved to this computer",
      run: () => void workspace.exportProject(),
    },
    {
      name: `File: save a copy of ${shownFile.split("/").pop()}`,
      hint: `${shownFile}, saved to this computer`,
      run: () => void workspace.saveCopy(shownFile),
    },
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
    paneCommand(workspace, "script", "outline"),
    paneCommand(workspace, "script", "notes"),
    paneCommand(workspace, "data", "frames"),
    paneCommand(workspace, "data", "variables"),
    paneCommand(workspace, "plots", "list"),
    paneCommand(workspace, "plots", "about"),
    paneCommand(workspace, "help", "outline"),
    paneCommand(workspace, "help", "related"),
    {
      name: "Place: Help",
      hint: "F1 in the script opens the page of the name at the cursor",
      run: () => workspace.openHelp(),
    },
    {
      name: "Format the script",
      hint: "as zeff fmt does",
      run: () => void workspace.format(workspace.activePath ?? workspace.scriptPath),
    },
    ...(workspace.cursor !== null
      ? [
          {
            name: "Run the statement at the cursor",
            hint: "⌘↵ in the script",
            run: () => void workspace.runPart("statement", workspace.cursor?.line ?? 1),
          },
          ...(atSection === null
            ? []
            : [
                {
                  name: "Run section",
                  hint: `${atSection.title}, lines ${atSection.line} to ${atSection.end}`,
                  run: () => void workspace.runSection(atSection),
                },
              ]),
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

<!-- A page that is being left writes what waits to be written, as far as the browser lets it. -->
<svelte:window onkeydown={keys} onpagehide={() => workspace.leave()} />

<TopBar {workspace} onclose={() => void close()} onpalette={() => (palette = true)} />

<NarrowLine />

<MarginPane {workspace} />

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
