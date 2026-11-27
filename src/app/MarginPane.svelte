<script lang="ts">
  // The margin editor (open decision #174; its design, sections 5 to 7), Zemp Lite's editor
  // from the 0.2 alpha in place of the Inline layout. The script fills the column; a note
  // beside each statement says what it made and how large it is; the whole output of a
  // statement unfolds under it when the reader asks, and a script opens with every output
  // folded. Running never moves the code. From 0.2.1 the place stands on the frame of #203:
  // Project at its left, the notes its right pane, and the run's facts with Fold all and
  // Unfold all in its bar; all three change only the view. The column is 920 pixels of code at the usual code size (100 characters),
  // wider with the code, and the 300 pixels of the notes beside it.
  import { tick } from "svelte";
  import Editor from "../editor/Editor.svelte";
  import { counted, notesOf } from "../margin/notes";
  import { marks } from "../margin/stale";
  import { trailOf } from "../margin/trail";
  import type { Note } from "../margin/notes";
  import { placed } from "../output/place";
  import { took } from "../output/run";
  import PlotViewer from "../plots/PlotViewer.svelte";
  import { sectionAt } from "../editor/sections";
  import OutlinePane from "./OutlinePane.svelte";
  import { paneOf } from "./panes";
  import Place from "./Place.svelte";
  import ProjectTree from "./ProjectTree.svelte";
  import { held } from "./steady";
  import HelpPlace from "./HelpPlace.svelte";
  import PaperPlace from "./PaperPlace.svelte";
  import { DATA, HELP, PAPER, PLOTS } from "./views";
  import DataViewer from "../data/DataViewer.svelte";
  import { readOnlyWords } from "../project/text";
  import type { Workspace } from "./workspace-state.svelte";

  let { workspace }: { workspace: Workspace } = $props();

  // The margin editor shows the file of the tab shown, or the script Run runs where no tab is open.
  const path = $derived(workspace.activePath ?? workspace.scriptPath);
  const buffer = $derived(workspace.buffers[path]);
  const run = $derived(workspace.lastRun);
  // The last run belongs to this script only where it is the one that ran.
  const ours = $derived(run !== null && run.script === path ? run : null);
  // How each result stands to the script as it is now: by the engine's reading of the script
  // after the last edit; until it has read it, every result is marked edited, as in 0.1.
  const marked = $derived.by(() => {
    if (ours === null || buffer === undefined || buffer.text === ours.text) return new Map();
    const now = workspace.now;
    if (now === null || now.path !== path || now.text !== buffer.text) {
      return new Map(
        (ours.ranges ?? []).map((range) => [range.line, { mark: "edited" as const, line: null }]),
      );
    }
    return marks(ours, now.text, now.ranges);
  });
  // The lines an error's trail names in this file, each with a note of what the call there
  // was given, or of the error raised there (the design, 7.16.1); nothing is run again.
  const trailNotes = $derived.by((): Note[] => {
    const last = workspace.lastRun;
    if (last === null) return [];
    const found: Note[] = [];
    for (const statement of last.statements) {
      if (statement.state !== "failed") continue;
      // The engine's own record of the error that stopped the run at this statement, with
      // its chain as fields (open decision #175, C22).
      const error = last.info.find((one) => one.line === statement.line)?.error ?? null;
      const code = typeof error?.["code"] === "string" ? error["code"] : null;
      for (const link of trailOf(error)) {
        if (link.file !== path || found.some((note) => note.line === link.line)) continue;
        found.push({
          line: link.line,
          main: link.raised ? "error" : link.pass ? "loop" : (link.text.split("(")[0] ?? ""),
          sub: link.text,
          tags: link.raised && code !== null ? [{ text: code, kind: "error" }] : [],
          state: link.raised ? "failed" : "fresh",
          opens: false,
          place: null,
        });
      }
    }
    return found;
  });
  const notes = $derived.by(() => {
    const own = ours === null ? [] : notesOf(ours, marked);
    const extra = trailNotes.filter((note) => !own.some((one) => one.line === note.line));
    return [...own, ...extra].sort((a, b) => a.line - b.line);
  });
  const unfolded = $derived(workspace.views.script.unfolded[path] ?? []);
  const notesShown = $derived(workspace.views.panes.script.notes);
  // An output is shown under its statement where the reader unfolded it; what failed, and
  // what belongs to no statement, is always shown. A run is stopped from the top bar.
  const blocks = $derived(
    ours === null
      ? []
      : placed(ours).filter(
          (one) =>
            one.block.line === null ||
            one.block.state === "failed" ||
            unfolded.includes(one.block.line),
        ),
  );
  // The run's facts, as the results bar gives them (the design, section 5).
  const facts = $derived.by(() => {
    if (ours === null) return "not run yet";
    const statements = (n: number) => `${counted(n)} statement${n === 1 ? "" : "s"}`;
    const head = `run ${ours.number} · ${ours.clock}`;
    if (ours.checkOnly) return `check · ${ours.clock}`;
    if (ours.state === "running") {
      const at = ours.statements.length;
      return ours.of === null ? `${head} · running` : `${head} · statement ${at} of ${ours.of}`;
    }
    const ran = ours.statements.length;
    const time = ours.ms === null ? "" : ` in ${took(ours.ms)}`;
    if (ours.state === "done") return `${head} · ${statements(ran)}${time}`;
    return `${head} · ${ours.state === "failed" ? "ended with an error" : ours.state} after ${statements(ran)}`;
  });
  const margin = $derived(
    notesShown
      ? {
          basis:
            ours === null
              ? `trail:${workspace.lastRun?.startedAt ?? ""}`
              : `${ours.startedAt}:${trailNotes.length}`,
          notes,
          unfolded,
          onnote: (line: number) => workspace.toggleUnfolded(path, line),
        }
      : null,
  );
  /** The statements with an output to unfold. */
  const opening = $derived(notes.filter((note) => note.opens).map((note) => note.line));
  // What the check found when it refused the script, shown above the results kept.
  const refusal = $derived(workspace.refusal);
  const refused = $derived(
    refusal !== null && refusal.script === path
      ? {
          basis: String(refusal.startedAt),
          placed: placed(refusal),
          edited: workspace.refusalEdited,
        }
      : null,
  );
  const output = $derived({
    basis: run === null ? "" : `${run.startedAt}:${blocks.map((one) => one.block.line).join(",")}`,
    placed: blocks,
    edited: false,
    // An output is marked where its result is no longer the script's (`src/margin/stale.ts`).
    stale: (line: number | null): "edited" | "stale" | null => {
      if (line === null) return null;
      const live = marked.get(line)?.mark ?? "fresh";
      if (live !== "fresh") return live;
      return ours?.statements.find((one) => one.line === line)?.mark ?? null;
    },
    refused,
    oncancel: () => workspace.cancel(),
    onfold: (line: number) => workspace.toggleUnfolded(path, line),
    workspace,
  });

  $effect(() => {
    if (workspace.ready && buffer === undefined) void workspace.open(path);
  });

  // The width of the place an output unfolds in, in characters of the print's own font: the
  // engine prints its tables at that width (the design, 7.4). A hidden run of a hundred
  // characters in that font gives a character's width; the output spans the code's column and
  // the notes', less its edge, its padding and its hairlines.
  let probe = $state<HTMLElement | null>(null);
  $effect(() => {
    const at = sheet;
    const ruler = probe;
    if (at === null || ruler === null) return;
    const measure = () => {
      const content = at.querySelector<HTMLElement>(".cm-content");
      const char = ruler.getBoundingClientRect().width / 100;
      if (content === null || !(char > 0)) return;
      workspace.setPrintWidth((content.clientWidth - 16 - 32 - 2) / char);
    };
    const watch = new ResizeObserver(measure);
    watch.observe(at);
    watch.observe(ruler);
    measure();
    return () => watch.disconnect();
  });

  // The engine's reading of the script as it stands, for the marks and for Run to here.
  $effect(() => {
    if (workspace.ready && buffer?.loaded && !buffer.readOnly) {
      workspace.readStatements(path, buffer.text);
    }
  });
  // A text file that is no script, shown to be read (#228).
  const reading = $derived(buffer?.readOnly === true);
  // Run to here on every statement's line number but the first, which has nothing before it.
  const runto = $derived.by(() => {
    const now = workspace.now;
    if (now === null || now.path !== path || buffer === undefined || now.text !== buffer.text) {
      return null;
    }
    const lines = now.ranges.filter((one) => one.kind === "statement").map((one) => one.line);
    return {
      lines: lines.slice(1),
      onrun: (line: number) => void workspace.runPart("to", line),
    };
  });

  /** ⌥↵: unfold or fold the output of the statement at the cursor. */
  function unfoldAt(line: number): void {
    const range = ours?.ranges?.find(
      (one) => one.kind === "statement" && one.line <= line && line <= one.end,
    );
    if (range !== undefined && notes.some((note) => note.line === range.line && note.opens)) {
      workspace.toggleUnfolded(path, range.line);
    }
  }

  // The page stays where the reader is while a run replaces its output (see `steady.ts`).
  let pane = $state<HTMLElement | null>(null);
  let sheet = $state<HTMLElement | null>(null);
  let editor = $state<ReturnType<typeof Editor> | null>(null);
  let release: (() => void) | null = null;
  // Just before a run takes the old results off the page: hold its height, and note the
  // reader's place in the script, which is the statement, with its output, at the top of
  // their view. The editor says which, and where it stands when the results are new.
  $effect(() => {
    const hold = () => {
      if (release === null && pane !== null && sheet !== null && editor !== null) {
        release = held(sheet, pane, editor.place());
      }
    };
    return workspace.beforeRun(hold);
  });
  // After the results of a run that has ended are drawn: give the reader's place back.
  $effect(() => {
    if (run?.state !== "running" && release !== null) {
      const done = release;
      release = null;
      void tick().then(() => requestAnimationFrame(done));
    }
  });
</script>

{#if workspace.views.active === PLOTS}
  <!-- The Plots place, on its own frame of panes. -->
  <PlotViewer {workspace} />
{:else if workspace.views.active === DATA}
  <DataViewer {workspace} />
{:else if workspace.views.active === HELP}
  <HelpPlace {workspace} />
{:else if workspace.views.active === PAPER}
  <PaperPlace {workspace} />
{:else}
  {#snippet project()}
    <ProjectTree {workspace} />
  {/snippet}
  {#snippet outline()}
    <OutlinePane
      sections={workspace.sections}
      current={workspace.cursor?.path === path
        ? (sectionAt(workspace.sections, workspace.cursor.line)?.line ?? null)
        : null}
      running={workspace.running}
      ongo={(section) => void workspace.goTo(path, section.line, true)}
      onrun={(section) => void workspace.runSection(section)}
    />
  {/snippet}
  {#snippet controls()}
    <button
      class="facts"
      data-testid="run-facts"
      disabled={ours === null}
      aria-haspopup="dialog"
      title="The run's facts: the engine, the seed, where the time and the memory went"
      onclick={() => (workspace.panel = workspace.panel === "facts" ? null : "facts")}
      >{facts}</button
    >
    <span class="copied" aria-live="polite" data-testid="copied">{workspace.copied}</span>
    <span class="gap"></span>
    {#if path.endsWith(".zeff")}
      <button
        class="word"
        disabled={workspace.running}
        onclick={() => void workspace.exportScript()}
        title="The script with what each statement printed, said and drew, as a PDF saved to this computer"
        >Export script with output</button
      >
    {/if}
    <button
      class="view"
      onclick={() => workspace.setUnfolded(path, [])}
      title="Fold every output; an error stays">Fold all</button
    >
    <button
      class="view"
      onclick={() => workspace.setUnfolded(path, opening)}
      disabled={opening.length === 0}
      title="Unfold every output under its statement">Unfold all</button
    >
  {/snippet}
  <Place
    {workspace}
    name="Script"
    left={[
      paneOf(workspace, "script", "project", project),
      paneOf(workspace, "script", "outline", outline),
    ]}
    right={[paneOf(workspace, "script", "notes", null)]}
    bar={controls}
  >
    {#if workspace.exportAsking === path}
      <!-- A script that has not been run has no output to set: the reader says which is meant. -->
      <div class="asking" role="group" aria-label="Export script with output">
        <span>
          <span class="mono">{path}</span> has not been run, so it has no output to set.
        </span>
        <button class="word strong" onclick={() => void workspace.exportScript("run")}
          >Run, then export</button
        >
        <button class="word" onclick={() => void workspace.exportScript("alone")}
          >Export the script alone</button
        >
        <button class="word" onclick={() => (workspace.exportAsking = null)}>Cancel</button>
      </div>
    {/if}
    {#if reading}
      <p class="reading" role="note" data-testid="read-only">
        {readOnlyWords(path, workspace.writerOf(path))}
      </p>
    {/if}
    <div class="place">
      <section class="margin" aria-label="Script with its notes and output" bind:this={pane}>
        <div
          class="sheet"
          bind:this={sheet}
          style:--zemp-margin={notesShown ? "300px" : "0px"}
          data-width={workspace.printWidth}
        >
          <span class="probe mono" aria-hidden="true" bind:this={probe}>{"0".repeat(100)}</span>
          {#if buffer?.loaded}
            {#key path}
              <Editor
                bind:this={editor}
                text={buffer.text}
                label={reading ? "The file, read only" : "The script"}
                language={reading ? "plain" : "zeff"}
                readOnly={reading}
                onchange={(text) => workspace.edit(path, text)}
                onrun={() => void workspace.run()}
                inline={output}
                notes={margin}
                onunfold={unfoldAt}
                onstatement={(line) => void workspace.runPart("statement", line)}
                {runto}
                oncursor={(line) => (workspace.cursor = { path, line })}
                reveal={workspace.reveal?.path === path ? workspace.reveal : null}
                inserting={workspace.inserting?.path === path ? workspace.inserting : null}
                oninserted={(count) => workspace.inserted(count)}
                diagnostics={workspace.diagnostics[path] ?? []}
                onhover={(line, character) => workspace.hoverCard(path, line, character)}
                oncomplete={(line, character) => workspace.complete(path, line, character)}
                onusage={(line, character) => workspace.signature(path, line, character)}
                onhelp={(name, line, character) =>
                  void workspace.showHelpAt(path, name, line, character)}
              />
            {/key}
          {/if}
        </div>
      </section>
    </div>
  </Place>
{/if}

<style>
  .place {
    display: flex;
    flex: 1;
    min-height: 0;
  }
  .margin {
    background: var(--window);
    flex: 1;
    min-height: 0;
    overflow: auto;
  }
  .probe {
    font-size: calc(var(--code-size, 14px) - 1px);
    position: absolute;
    visibility: hidden;
    white-space: pre;
  }
  .sheet {
    position: relative;
    margin: 0 auto;
    /* 920 pixels of code: its line numbers and 100 characters, the longest line Zeff's
       formatter leaves (Language Reference, section 3), so that formatted code never wraps
       beside its notes where the window gives the room. */
    max-width: calc(920px * var(--code-scale, 1) + var(--zemp-margin, 0px));
    padding: 0 18px;
  }
  /* The run's facts, and the two controls that change only the view, which are words with a
     dashed underline (the design, sections 5 and 14.2); they stand in the place's bar. */
  .facts {
    background: none;
    border: 0;
    border-radius: 6px;
    color: var(--ink-3);
    cursor: pointer;
    font: inherit;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    padding: 2px 6px;
  }
  .facts:hover:not(:disabled) {
    background: var(--soft);
    color: var(--ink-2);
  }
  .facts:disabled {
    cursor: default;
  }
  .gap {
    flex: 1;
  }
  /* A command of the bar that is a word, and the line that asks before a script not yet run
     is exported. */
  .word {
    background: none;
    border: 0;
    border-radius: 6px;
    color: var(--ink-2);
    cursor: pointer;
    flex: none;
    font: inherit;
    font-size: 13.5px;
    padding: 3px 8px;
    white-space: nowrap;
  }
  .word:hover:not(:disabled) {
    background: var(--soft);
  }
  .word:disabled {
    color: var(--ink-3);
    cursor: default;
  }
  .word:focus-visible {
    outline: 2px solid var(--accent);
  }
  .word.strong {
    border: 1px solid var(--line-strong);
    color: var(--ink);
  }
  .reading {
    background: var(--softer);
    border-bottom: 1px solid var(--line-strong);
    color: var(--ink-2);
    flex: none;
    font-size: 13.5px;
    margin: 0;
    padding: 8px 18px;
  }
  .asking {
    align-items: center;
    background: var(--softer);
    border-bottom: 1px solid var(--line-strong);
    color: var(--ink-2);
    display: flex;
    flex: none;
    flex-wrap: wrap;
    font-size: 13.5px;
    gap: 8px;
    padding: 8px 14px;
  }
  .copied {
    color: var(--ok);
    font-size: 13px;
  }
  .view {
    background: none;
    border: none;
    border-radius: 6px;
    color: var(--ink-2);
    cursor: pointer;
    font: inherit;
    font-size: 13.5px;
    padding: 3px 6px;
    text-decoration: underline dashed var(--line-strong);
    text-underline-offset: 4px;
  }
  .view:hover {
    background: var(--soft);
  }
  .view:disabled {
    color: var(--ink-3);
    cursor: default;
  }
  .view:focus-visible {
    outline: 2px solid var(--accent);
  }
</style>
