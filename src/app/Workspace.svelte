<script lang="ts">
  // The workspace of a project (Zemp Specification, section 5; open decision #203): the top
  // bar, the place shown on its frame of panes, and a line at the foot.
  import type { Engine } from "../engine/engine";
  import { fixed } from "../project/files";
  import type { Keeping } from "../project/keeping";
  import { browserStorage } from "../theme/theme.svelte";
  import { SCRATCH, type Project } from "../project/projects";
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
    onask = () => {},
  }: {
    project: Project;
    engine: Engine;
    language?: Engine | null;
    /** What the browser does with the projects, for the reminder to export. */
    keeping?: Keeping;
    onclose: () => void;
    /** A question about this project, which the start screen asks in the project's row. */
    onask?: (kind: "rename" | "duplicate" | "delete" | "reset") => void;
  } = $props();

  // One project to a window: this component is made anew for each project it shows.
  // svelte-ignore state_referenced_locally
  const workspace = new Workspace(project, engine, language, browserStorage());
  $effect(() => {
    workspace.keeping = keeping;
  });

  let palette = $state(false);
  /** The files ⌘K adds to the project are chosen here; the Project pane has a chooser of its own. */
  let chooser = $state<HTMLInputElement | null>(null);

  // The files are taken before anything waits, so that a next choice finds the chooser free.
  async function chosen(): Promise<void> {
    const files = [...(chooser?.files ?? [])];
    if (chooser !== null) chooser.value = "";
    if (files.length > 0) await workspace.addFiles(files, "data");
  }
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
    // The project itself is renamed, copied and deleted on the start screen, in its own row:
    // the project is closed first, what is typed being written.
    ...(project.info.folder === SCRATCH
      ? ([
          [
            "duplicate",
            "Project: duplicate…",
            "a project of your own name, with all this one holds",
          ],
          ["reset", "Project: reset…", "the Scratch project as a first visit has it"],
        ] as const)
      : ([
          ["rename", "Project: rename…", "another name, typed on the start screen"],
          ["duplicate", "Project: duplicate…", "a copy under another name"],
          ["delete", "Project: delete…", "asked once, on the start screen"],
        ] as const)
    ).map(([kind, name, hint]) => ({
      name,
      hint,
      run: () => {
        closePopOuts();
        void workspace.settle().then(() => onask(kind));
      },
    })),
    // What the Project pane's + makes, in the pane, which is opened for it.
    ...(["script", "folder"] as const).map((kind) => ({
      name: `Project: new ${kind}…`,
      hint:
        kind === "script"
          ? "in scripts, named in its row of the Project pane"
          : "at the project's top, named in its row of the Project pane",
      run: () => {
        workspace.show(fileTab(shownFile));
        workspace.setPane("script", "project", true);
        workspace.make(kind, kind === "script" ? "scripts" : "");
      },
    })),
    {
      name: "Project: add files…",
      hint: "from this computer, into data",
      run: () => {
        // The pane is opened, so that what is added, or why it was not, is seen.
        workspace.show(fileTab(shownFile));
        workspace.setPane("script", "project", true);
        chooser?.click();
      },
    },
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
    // The file shown is renamed and moved in its row of the Project pane, which is opened for it.
    ...(fixed(shownFile)
      ? []
      : (["rename", "move"] as const).map((kind) => ({
          name: `File: ${kind} ${shownFile.split("/").pop()}…`,
          hint:
            kind === "rename"
              ? "a new name, typed in its row of the Project pane"
              : "another folder, chosen in its row of the Project pane",
          run: () => {
            workspace.setPane("script", "project", true);
            workspace.show(fileTab(shownFile));
            workspace.asking = { kind, path: shownFile };
          },
        }))),
    {
      name: `File: duplicate ${shownFile.split("/").pop()}`,
      hint: "a copy beside it, under a name with copy in it",
      run: () => void workspace.duplicate(shownFile),
    },
    ...(fixed(shownFile)
      ? []
      : [
          {
            name: `File: delete ${shownFile.split("/").pop()}…`,
            hint: "asked once, in its row of the Project pane",
            run: () => {
              workspace.setPane("script", "project", true);
              workspace.asking = { kind: "delete" as const, path: shownFile };
            },
          },
        ]),
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
    paneCommand(workspace, "help", "topics"),
    paneCommand(workspace, "help", "related"),
    {
      name: "Place: Help",
      hint: "F1 in the script opens the page of the name at the cursor",
      run: () => workspace.openHelp(),
    },
    {
      name: "Help: index of functions",
      hint: "Home: every function of this engine, by package",
      run: () => void workspace.showHelpHome(),
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
<input
  bind:this={chooser}
  type="file"
  multiple
  hidden
  onchange={chosen}
  aria-label="Files to add to the project's data"
/>
{#if palette}
  <Palette {commands} onclose={() => (palette = false)} />
{/if}
