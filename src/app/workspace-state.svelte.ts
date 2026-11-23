// The state of one window with a project open in it: the project and its engine, what the
// panes show, the scripts being edited, and the last run. Every screen of
// the workspace reads this one object and changes it through its methods.
import type { Engine } from "../engine/engine";
import { Language, type Diagnostic, type Range } from "../engine/language";
import type {
  Checked,
  FrameInfo,
  HelpIndex,
  Outcome,
  Ranged,
  Report,
  Rows,
  View,
} from "../engine/messages";
import {
  HOME as HELP_HOME,
  after,
  back,
  before,
  begun,
  forward,
  here,
  opened,
  type History as HelpHistory,
  type Stop,
} from "../help/history";
import { once } from "../help/once";
import { ProjectError, type Project, type TreeNode } from "../project/projects";
import { followed } from "../margin/follow";
import { merged } from "../margin/stale";
import { begin, blocks, clockOf, end, hear, refused, said, type Run } from "../output/run";
import {
  keyOf,
  plotsOf,
  withExport,
  withExports,
  type Format,
  type PlotStatement,
  type Wanted,
} from "../plots/figures";
import { compared, moved, ordered, toggled } from "../plots/viewer";
import { Session } from "../project/session";
import { CONSOLE_HELP, History, composed, consoleRun, outcomeOf, type Entry } from "./console";
import { parts } from "../project/folder";
import {
  DATA,
  HELP,
  PLOTS,
  fileTab,
  leftWidth,
  rightWidth,
  readViews,
  tabPath,
  unfoldToggled,
  usual,
  withTab,
  writeViews,
  type PaneName,
  type PlaceName,
  type ViewState,
} from "./views";
import { sectionsOf, type Section } from "../editor/sections";
import { exportFolder, exportProject } from "../project/export";
import { own, placeOf } from "../project/files";
import { reminderOf, type Keeping } from "../project/keeping";
import { noteLeft, takeLeft } from "./left";
import type { Kept } from "../theme/theme";
import { saveToComputer } from "./save";
import { notesOf } from "../margin/notes";

/** The lines of the statements of a run that have an output to unfold. */
function openable(run: Run): number[] {
  return notesOf(run)
    .filter((note) => note.opens)
    .map((note) => note.line);
}

const VIEWS = ".zemp/views.json";
const MAIN = "scripts/main.zeff";

/** A file open in the editor. */
export interface Buffer {
  text: string;
  /** Whether the file has been read. */
  loaded: boolean;
  /** Whether what is typed has been written to the project. */
  saved: boolean;
}

/** Whether the editor opens a file of this name: scripts and the plain text beside them. */
export function editable(path: string): boolean {
  return /\.(zeff|toml|txt|md)$/i.test(path);
}

/** A completion the language server offers, as it gives it. */
export interface CompletionItem {
  label: string;
  kind?: number;
  detail?: string;
  documentation?: string;
  filterText?: string;
  sortText?: string;
  textEdit?: { range: Range; newText: string };
}

/** A text with the language server's edits made, from the last to the first. */
export function applied(text: string, edits: { range: Range; newText: string }[]): string {
  const lines = text.split("\n");
  const offset = (line: number, character: number) => {
    let at = 0;
    for (let index = 0; index < line && index < lines.length; index++) {
      at += (lines[index] as string).length + 1;
    }
    return Math.min(at + character, text.length);
  };
  const ordered = edits
    .map((edit) => ({
      from: offset(edit.range.start.line, edit.range.start.character),
      to: offset(edit.range.end.line, edit.range.end.character),
      text: edit.newText,
    }))
    .sort((a, b) => b.from - a.from);
  let out = text;
  for (const edit of ordered) out = out.slice(0, edit.from) + edit.text + out.slice(edit.to);
  return out;
}

export class Workspace {
  readonly project: Project;
  readonly engine: Engine;
  readonly session: Session;

  /** Whether the project's view state and files have been read. */
  ready = $state(false);
  views = $state<ViewState>(usual());
  tree = $state<TreeNode[]>([]);
  buffers = $state<Record<string, Buffer>>({});

  /** The engine's version, once its worker has started. */
  engineVersion = $state<string | null>(null);
  /** What the engine is doing, in a word or two. */
  status = $state("starting the engine");
  running = $state(false);
  /** The last run, as the page shows it, or `null` before the first and after Clear. */
  lastRun = $state<Run | null>(null);
  /**
   * The last press of Run, where the engine's check refused the script and the results of
   * the run before it were kept on the page: nothing ran, so those are still the latest.
   */
  refusal = $state<Run | null>(null);
  /** The last Check: the script and its text as checked, and the engine's last line of it. */
  checked = $state<{ script: string; text: string; summary: string } | null>(null);
  #beforeRun: (() => void)[] = [];
  /** How many runs of a script this window has made: each is numbered (the design, 7.8). */
  #runs = 0;
  /**
   * The width in characters of the place an output is unfolded in, which the engine prints
   * its tables at (the margin editor's design, 7.4); 0 where none is known, for the engine's
   * own 118.
   */
  printWidth = $state(0);
  #relaying: ReturnType<typeof setTimeout> | null = null;
  /** What was last copied, in words, for the reader and for a screen reader. */
  copied = $state("");
  /**
   * The statements of a script as it stands, as the engine reads them, read a moment after
   * each edit: what marks the results on the page against the script (`src/margin/stale.ts`).
   */
  now = $state<{ path: string; text: string; ranges: Ranged[] } | null>(null);
  /**
   * The page the Help place shows (#74, #203): a function's as `zeff help` prints it, or a
   * code's as `zeff explain` does, with the name it is known by; none until one is asked for.
   */
  help = $state<{ title: string; page: string }>({ title: "", page: "" });
  /**
   * The pages of Help this reader opened, and the one shown (#211, part 3; `help/history.ts`):
   * what **Back** and **Forward** go through. It lasts as long as the window.
   */
  helpHistory = $state<HelpHistory>(begun());
  /** The last page of Help asked for, counted: a page that arrives late is not shown over it. */
  #helpAsked = 0;
  /**
   * The index of the help (the row of 0.2.3; #211): the packages the engine ships with
   * their functions, and the shipped datasets; none until the Help place is first shown.
   */
  helpIndex = $state<HelpIndex | null>(null);
  /** What floats over the window about the last run: its facts, or what it said. */
  panel = $state<"facts" | "said" | null>(null);
  /** A line to be brought into view, with the cursor on it (`goTo`). */
  reveal = $state<{ path: string; line: number; count: number; top?: boolean } | null>(null);
  /** The line of the cursor in the margin editor, for the commands that run from it. */
  cursor = $state<{ path: string; line: number } | null>(null);
  #reading: ReturnType<typeof setTimeout> | null = null;
  /** The frames the last run left. */
  frames = $state<FrameInfo[]>([]);
  /** Something the user asked for that could not be done, in words. */
  problem = $state("");

  /**
   * The figures drawn for the last run, each under the name of what was asked for: a plot,
   * by the line of its statement, at a size. `svg` is `null` while it is being drawn;
   * `problem` holds the engine's words where it could not be drawn.
   */
  figures = $state<Record<string, { svg: string | null; problem: string }>>({});
  /** How long the last drawing of figures took, in milliseconds: one run of the script. */
  drawMs = $state<number | null>(null);
  // What is wanted is a plain list, never shown: nothing on the screen follows it.
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  readonly #wanted = new Map<string, Wanted>();
  #drawing: ReturnType<typeof setTimeout> | null = null;

  /** The console: what was typed there in this window, with what came of each line. */
  entries = $state<Entry[]>([]);
  /** Whether the console's drawer is open. */
  consoleOpen = $state(false);
  readonly history = new History();
  /** The statements the console has kept: each runs again before the next one typed. */
  #kept: string[] = [];

  /** The run or the console statement that is going, which the next console statement waits for. */
  #busy: Promise<void> = Promise.resolve();
  #saving: Promise<void> = Promise.resolve();
  #keeping: ReturnType<typeof setTimeout> | null = null;

  /** The engine's language server, in a worker of its own; `null` where the window has none. */
  readonly language: Language | null;
  /** What the language server says of each file, as it says it, by path. */
  diagnostics = $state<Record<string, Diagnostic[]>>({});
  #telling: ReturnType<typeof setTimeout> | null = null;

  /** What the browser does with the projects: kept for good, or it may clear them. */
  keeping = $state<Keeping>("may-clear");
  /** When the project was last exported, as the status bar's reminder counts it. */
  exportedAt = $state<number | null>(null);

  /**
   * The line of the status bar that reminds the reader to export (Zemp Specification, section
   * 10; #117), or `null` where there is nothing to say.
   */
  get reminder(): string | null {
    return reminderOf(
      { made: this.project.info.made, exported: this.exportedAt },
      this.keeping,
      Date.now(),
    );
  }

  /** The browser's own small record, where the view state is noted as the page is left. */
  readonly #record: Kept | null;

  constructor(
    project: Project,
    engine: Engine,
    language: Engine | null = null,
    kept: Kept | null = null,
  ) {
    this.#record = kept;
    this.project = project;
    this.exportedAt = project.info.exported;
    this.engine = engine;
    this.session = new Session(project, engine);
    this.language = language === null ? null : new Language(project, language);
    if (this.language !== null) {
      this.language.ondiagnostics = (path, found) => {
        this.diagnostics = { ...this.diagnostics, [path]: found };
      };
    }
    void this.#begin();
  }

  /** Tell the language server the text of a script as it stands. */
  #tell(path: string, text: string): Promise<void> {
    if (this.language === null || !path.endsWith(".zeff")) return Promise.resolve();
    this.#told = { ...this.#told, [path]: text };
    return this.language.update(path, text).catch(() => {
      // The language worker is not there: the editor works on without its help.
    });
  }
  /** The text of each script the language server was last told. */
  #told: Record<string, string> = {};

  /** Before a question to the language server: it is told the script as it now stands. */
  async #inStep(path: string): Promise<void> {
    const text = this.buffers[path]?.text;
    if (text === undefined || this.#told[path] === text) return;
    if (this.#telling !== null) {
      clearTimeout(this.#telling);
      this.#telling = null;
    }
    await this.#tell(path, text);
  }

  /** Ask the language server, about a script as it stands; `null` where it cannot answer. */
  async #ask(path: string, method: string, params: Record<string, unknown>): Promise<unknown> {
    if (this.language === null) return null;
    await this.#inStep(path);
    return this.language.request(method, {
      textDocument: { uri: `file:///project/${path}` },
      ...params,
    });
  }

  /**
   * What the language server offers at a place of a script: each item with its label, its
   * kind, what it is, and the edit it makes (its range and new text), as the server gives them.
   */
  async complete(path: string, line: number, character: number): Promise<CompletionItem[]> {
    const found = (await this.#ask(path, "textDocument/completion", {
      position: { line, character },
    })) as { items?: CompletionItem[] } | CompletionItem[] | null;
    return Array.isArray(found) ? found : (found?.items ?? []);
  }

  /**
   * Tab in the console line: what the language server offers at the end of the statement being
   * typed, read as if it followed the script, made into the console's text. One offer is
   * taken; of several, the text they all begin with; none leaves the text as it is.
   */
  async completeConsole(typed: string): Promise<string> {
    const script = this.scriptPath;
    await this.#load(script);
    const base = this.buffers[script]?.text ?? "";
    const before = base.endsWith("\n") || base === "" ? base : `${base}\n`;
    const path = ".zemp/console.zeff";
    const line = before.split("\n").length - 1;
    await this.#tell(path, `${before}${typed}\n`);
    const edits = (await this.complete(path, line, typed.length)).flatMap((item) =>
      item.textEdit === undefined ? [] : [item.textEdit],
    );
    const first = edits[0];
    if (first === undefined) return typed;
    const start = first.range.start.character;
    const word = typed.slice(start);
    const fitting = edits.map((edit) => edit.newText).filter((text) => text.startsWith(word));
    if (fitting.length === 0) return typed;
    let common = fitting[0] as string;
    for (const text of fitting) {
      while (!text.startsWith(common)) common = common.slice(0, -1);
    }
    return typed.slice(0, start) + (fitting.length === 1 ? (fitting[0] as string) : common);
  }

  /** The usage of the call at a place of a script, and the parameter the place is in. */
  async signature(
    path: string,
    line: number,
    character: number,
  ): Promise<{ usage: string; active: [number, number] | null; summary: string } | null> {
    const found = (await this.#ask(path, "textDocument/signatureHelp", {
      position: { line, character },
    })) as {
      signatures?: {
        label: string;
        documentation?: string;
        parameters?: { label: [number, number] }[];
        activeParameter?: number;
      }[];
    } | null;
    const one = found?.signatures?.[0];
    if (one === undefined) return null;
    const active =
      one.activeParameter === undefined
        ? null
        : (one.parameters?.[one.activeParameter]?.label ?? null);
    return { usage: one.label, active, summary: one.documentation ?? "" };
  }

  /**
   * Format a script as `zeff fmt` does, by the language server's edits: the editor's text
   * replaced, as a paste would, and saved. Nothing changes where the server makes no edit.
   */
  async format(path: string): Promise<void> {
    const edits = (await this.#ask(path, "textDocument/formatting", {
      options: { tabSize: 4, insertSpaces: true },
    })) as { range: Range; newText: string }[] | null;
    const text = this.buffers[path]?.text;
    if (edits === null || edits.length === 0 || text === undefined) {
      this.status = "nothing to format";
      return;
    }
    this.edit(path, applied(text, edits));
    this.status = "formatted";
  }

  /** What the language server knows of the word at a place of a script, as plain text. */
  async hover(path: string, line: number, character: number): Promise<string | null> {
    if (this.language === null) return null;
    const found = (await this.language.request("textDocument/hover", {
      textDocument: { uri: `file:///project/${path}` },
      position: { line, character },
    })) as { contents?: unknown } | null;
    const contents = found?.contents;
    if (typeof contents === "string") return contents;
    if (contents !== null && typeof contents === "object" && "value" in contents) {
      return String((contents as { value: unknown }).value);
    }
    return null;
  }

  async #begin(): Promise<void> {
    this.engine.start().then(
      (version) => {
        this.engineVersion = version;
        this.status = `engine Zeff ${version} ready`;
      },
      (error: Error) => (this.status = error.message),
    );
    // The view state as the page was last left, where that was noted (`left.ts`), is newer than
    // what the project holds: it is taken up, and written to the project.
    const left = this.#record === null ? null : takeLeft(this.#record, this.project.info.folder);
    if (left !== null) {
      this.#saving = this.#saving.then(() => this.project.writeText(VIEWS, left));
    }
    const views = readViews(left ?? (await this.project.readText(VIEWS)));
    // A tab whose file is gone is not opened.
    const tabs: string[] = [];
    for (const tab of views.tabs) {
      const path = tabPath(tab);
      if (path === null || (await this.project.read(path)) !== null) tabs.push(tab);
    }
    views.tabs = tabs;
    views.active =
      views.active !== null && tabs.includes(views.active) ? views.active : (tabs[0] ?? null);
    this.views = views;
    await this.refresh();
    for (const tab of tabs) {
      const path = tabPath(tab);
      if (path !== null) await this.#load(path);
    }
    this.ready = true;
  }

  /** Read the project's files again. */
  async refresh(): Promise<void> {
    this.tree = await this.project.tree();
  }

  async #load(path: string): Promise<void> {
    if (this.buffers[path]?.loaded) {
      return;
    }
    this.buffers[path] = { text: "", loaded: false, saved: true };
    const text = await this.project.readText(path);
    this.buffers[path] = { text: text ?? "", loaded: true, saved: true };
    // The language server is told each script once it is read, and checks it at once.
    this.#tell(path, text ?? "");
  }

  /** The path of the file in the tab shown, or `null`. */
  get activePath(): string | null {
    return this.views.active === null ? null : tabPath(this.views.active);
  }

  /** The script Run runs: the one shown, or the first one open, or the project's main script. */
  get scriptPath(): string {
    const scripts = [this.activePath, ...this.views.tabs.map(tabPath)].filter(
      (path): path is string => path !== null && path.endsWith(".zeff"),
    );
    return scripts[0] ?? MAIN;
  }

  /**
   * The sections of the script shown, read from its comments (`src/editor/sections.ts`), with
   * the engine's reading of its statements where that is of the text as it stands.
   */
  get sections(): Section[] {
    const path = this.activePath ?? this.scriptPath;
    const text = this.buffers[path]?.text;
    if (text === undefined || !path.endsWith(".zeff")) return [];
    const now = this.now;
    return sectionsOf(
      text,
      now !== null && now.path === path && now.text === text ? now.ranges : [],
    );
  }

  /** Run a section: its statements, from its heading to its last line, with what they need. */
  async runSection(section: Section): Promise<void> {
    await this.runPart("section", section.line, section.end);
  }

  // What is shown. Each change is kept with the project.

  /** Unfold, or fold, the output of the statement on `line` of the script at `path`. */
  toggleUnfolded(path: string, line: number): void {
    this.views.script.unfolded = {
      ...this.views.script.unfolded,
      [path]: unfoldToggled(this.views, path, line),
    };
    this.#keep();
  }

  /** Unfold the outputs of the statements on `lines` of `path`, and fold every other. */
  setUnfolded(path: string, lines: number[]): void {
    const others = Object.entries(this.views.script.unfolded).filter(([one]) => one !== path);
    const kept = lines.filter((line, at) => lines.indexOf(line) === at).sort((a, b) => a - b);
    this.views.script.unfolded = Object.fromEntries(
      kept.length === 0 ? others : [...others, [path, kept]],
    );
    this.#keep();
  }

  /** Show or hide the notes beside the code. */
  setNotes(shown: boolean): void {
    this.setPane("script", "notes", shown);
  }

  /** Open or close a pane of a place (#203); kept with the project. */
  setPane<P extends PlaceName>(place: P, pane: PaneName<P>, open: boolean): void {
    this.views.panes[place] = { ...this.views.panes[place], [pane]: open };
    this.#keep();
  }

  /** The width of the right pane of the places, within its limits. */
  setRightWidth(width: number): void {
    this.views.right.width = rightWidth(width);
    this.#keep();
  }

  setLeftWidth(width: number): void {
    this.views.left.width = leftWidth(width);
    this.#keep();
  }

  toggleFolder(path: string): void {
    this.views.folded = this.views.folded.includes(path)
      ? this.views.folded.filter((one) => one !== path)
      : [...this.views.folded, path];
    this.#keep();
  }

  /** Open a file of the project in a tab, and show it. */
  async open(path: string): Promise<void> {
    if (!editable(path)) {
      return;
    }
    Object.assign(this.views, withTab(this.views, fileTab(path)));
    this.#keep();
    await this.#load(path);
  }

  /**
   * Go to a line of a file of the project: its tab opened and shown, and the editor asked to
   * put the cursor on the line and bring it into view. Each asking is told apart by its count.
   */
  /** Report a problem: the report being built, the one built, or why there is none. */
  report = $state<{ building: true } | ({ building: false; script: string } & Report) | null>(null);

  /**
   * Report a problem (the Zemp Specification, section 5): the engine builds the bug report of
   * the last run's failure in the worker, as `zeff report-bug` builds it, from the text that
   * ran (the script as it stands where nothing has run); the window shows it whole for the
   * user to read and save. Nothing is sent, and nothing is written into the project.
   */
  async reportProblem(): Promise<void> {
    const run = this.lastRun;
    const script = run?.script ?? this.scriptPath;
    await this.#load(script);
    const text = run?.text ?? this.buffers[script]?.text ?? "";
    this.report = { building: true };
    const before = this.#busy;
    const work = (async () => {
      await before;
      await this.#saving;
      try {
        this.report = { building: false, script, ...(await this.engine.report(script, text)) };
      } catch (error) {
        this.report = { building: false, script, ok: false, message: (error as Error).message };
      }
    })();
    this.#busy = work;
    await work;
  }

  /** A statement for the script's editor to put in at the cursor, until it is put in. */
  inserting = $state<{ path: string; text: string; count: number } | null>(null);
  #insertions = 0;

  /**
   * ⌘↵ on the console line: the statement copied into the script at the cursor, as one edit
   * that undo takes back; the script shown where another place was. A command to the console
   * (a line beginning with a colon) is not a statement and is not copied.
   */
  async copyIntoScript(line: string): Promise<void> {
    const statement = line.trim();
    if (statement === "" || statement.startsWith(":")) return;
    this.history.add(line);
    const path = this.scriptPath;
    await this.open(path);
    this.#insertions += 1;
    this.inserting = { path, text: statement, count: this.#insertions };
  }

  /** The editor put the statement in. */
  inserted(count: number): void {
    if (this.inserting?.count === count) this.inserting = null;
  }

  /** Show a line of a file: in the middle of the view, or at its top (a section's heading). */
  async goTo(path: string, line: number, top = false): Promise<void> {
    await this.open(path);
    this.reveal = { path, line, count: (this.reveal?.count ?? 0) + 1, top };
  }

  show(tab: string): void {
    if (this.views.tabs.includes(tab)) {
      this.views.active = tab;
      this.#keep();
    }
  }

  /**
   * The view state is to be written: a fifth of a second after the first change not yet
   * written, however many follow it. (It was once after the last change, each new one putting
   * the writing off: a reader who opened a pane and went straight on working had nothing kept,
   * and found the pane closed when the page was loaded again; 22 November 2026.) What changes
   * meanwhile is in the writing, which takes the state as it then stands.
   */
  #keep(): void {
    if (this.#keeping !== null) return;
    this.#keeping = setTimeout(() => {
      this.#keeping = null;
      const text = writeViews($state.snapshot(this.views));
      this.#saving = this.#saving.then(() => this.project.writeText(VIEWS, text));
    }, 200);
  }

  /**
   * Bring what a run wrote into the project (release 0.2.2, step 2b). A script's `export` and
   * `save` write under the project's folder (Engine Specification, section 2), which for the
   * engine is its own copy in the worker's memory: each file the run's outcome names is read
   * from there and written into the project itself, so that it is kept, shown in the Project
   * pane, and there to be saved to the computer. This is done after the runs the visitor asks
   * for; the runs the interface makes for itself (to draw a figure, to lay a print out afresh,
   * to ask a variable's statistics) write nothing of the visitor's that the run before did not.
   */
  async #keepWritten(outcome: Outcome): Promise<void> {
    // The interface's own folder is not the engine's to write into.
    const paths = outcome.written.filter((path) => path !== ".zemp" && !path.startsWith(".zemp/"));
    if (outcome.stopped || paths.length === 0) return;
    try {
      for (const path of paths) {
        const bytes = await this.engine.read(path);
        if (bytes === null) continue;
        await this.project.write(path, bytes);
        this.language?.changed(path);
      }
    } catch (error) {
      this.problem = `What the run wrote could not be kept in the project: ${(error as Error).message}`;
    }
    await this.refresh();
  }

  /**
   * Give the project to the computer as a zip (open decision #208): what is typed is saved
   * first, the zip holds the project as the `zeff` command line would find it, and when it was
   * exported is remembered.
   */
  async exportProject(): Promise<void> {
    try {
      await this.settle();
      const made = await exportProject(this.project, Date.now());
      saveToComputer(made.name, made.bytes, "application/zip");
      this.project.noteExported();
      this.exportedAt = this.project.info.exported;
      this.status = `exported as ${made.name}`;
    } catch (error) {
      this.status = (error as Error).message;
    }
  }

  /**
   * Give a file of the project to the computer, as it is (open decision #208): a script as it
   * stands, what is typed saved first; a data file; a table or a figure a run wrote.
   */
  async saveCopy(path: string): Promise<void> {
    try {
      await this.settle();
      const bytes = await this.project.read(path);
      if (bytes === null) throw new ProjectError(`There is no file \`${path}\` in this project.`);
      const name = path.split("/").pop() ?? path;
      saveToComputer(name, bytes);
      this.status = `saved as ${name}`;
    } catch (error) {
      this.status = (error as Error).message;
    }
  }

  /** Give a folder of the project to the computer as a zip that holds it, named by the folder. */
  async saveFolder(path: string): Promise<void> {
    try {
      await this.settle();
      const made = await exportFolder(this.project, path, Date.now());
      saveToComputer(made.name, made.bytes, "application/zip");
      this.status = `saved as ${made.name}`;
    } catch (error) {
      this.status = (error as Error).message;
    }
  }

  /**
   * The page is being left: the view state is noted in the browser's own record, which is
   * written at once, and what waits to be written is begun. A project still being opened has
   * no view state of its own yet, and notes nothing.
   */
  leave(): void {
    if (this.ready && this.#record !== null) {
      noteLeft(this.#record, this.project.info.folder, writeViews($state.snapshot(this.views)));
    }
    void this.settle();
  }

  /** Write what waits to be written: the view state and the scripts. */
  async settle(): Promise<void> {
    if (this.#keeping !== null) {
      clearTimeout(this.#keeping);
      this.#keeping = null;
      const text = writeViews($state.snapshot(this.views));
      this.#saving = this.#saving.then(() => this.project.writeText(VIEWS, text));
    }
    await this.#saving;
  }

  // The scripts.

  /** The text of a file changed in the editor: it is saved as it is typed. */
  edit(path: string, text: string): void {
    const buffer = this.buffers[path];
    if (buffer === undefined || !buffer.loaded || buffer.text === text) {
      return;
    }
    buffer.text = text;
    // The language server is told the script as it now stands, a moment after the last key.
    if (this.#telling !== null) clearTimeout(this.#telling);
    this.#telling = setTimeout(() => {
      this.#telling = null;
      this.#tell(path, text);
    }, 150);
    // The engine reads the script as it now stands, a moment after the last keystroke.
    if (this.#reading !== null) clearTimeout(this.#reading);
    this.#reading = setTimeout(() => {
      this.#reading = null;
      void this.#readStatements(path, text);
    }, 120);
    buffer.saved = false;
    this.#saving = this.#saving
      .then(() => this.project.writeText(path, text))
      .then(() => {
        this.session.changed(path);
        this.language?.changed(path);
        const now = this.buffers[path];
        if (now !== undefined && now.text === text) {
          now.saved = true;
          // The tree shows each file's size, which has changed.
          void this.refresh();
        }
      });
  }

  // Runs.

  /**
   * Have `tell` called just before each run takes the results of the run before it off the
   * page. Gives back what ends that.
   */
  beforeRun(tell: () => void): () => void {
    this.#beforeRun.push(tell);
    return () => {
      this.#beforeRun = this.#beforeRun.filter((other) => other !== tell);
    };
  }

  /** Run the script, as the editor holds it. */
  async run(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    const work = this.#run(this.#busy);
    this.#busy = work;
    await work;
  }

  async #run(before: Promise<void>): Promise<void> {
    // A drawing of figures that is going is let end first: the engine does one thing at a time.
    await before;
    const script = this.scriptPath;
    await this.#load(script);
    const text = this.buffers[script]?.text ?? "";
    this.running = true;
    const fresh = begin(script, text, performance.now(), clockOf(Date.now()));
    this.#runs += 1;
    fresh.number = this.#runs;
    // What the events of the run are heard into: the run as it is shown, once it is shown.
    let run = fresh;
    let shown = false;
    const show = () => {
      if (shown) return;
      shown = true;
      // A pane that keeps its reader's place notes it now, while the results of the run
      // before are still on the page.
      for (const tell of this.#beforeRun) tell();
      // The figures of the run before are not this run's.
      this.figures = {};
      this.#wanted.clear();
      this.drawMs = null;
      this.refusal = null;
      this.lastRun = fresh;
      // The run is read through the state, so that what the panel shows follows each event.
      run = this.lastRun;
      // Run unfolds every output under its statement (open decision #203): each as its
      // statement ends, so every line of the script is unfolded while the run goes, and what
      // is kept at its end is the lines of the statements that have an output.
      this.setUnfolded(
        script,
        text.split("\n").map((_, at) => at + 1),
      );
    };
    // What is unfolded was unfolded by the lines of the text that ran last: carried through
    // the edits since to where those statements now stand (`src/margin/follow.ts`).
    const last = this.lastRun;
    const unfolded = this.views.script.unfolded[script];
    if (last !== null && last.script === script && unfolded !== undefined) {
      const now = followed(last.text, text, unfolded);
      if (now.join() !== unfolded.join()) this.setUnfolded(script, now);
    }
    // The engine checks a whole script before it runs any of it. Where there are results on
    // the page, they are left there until a statement of this run starts: if the check
    // refuses the script, nothing has run, and they are still the latest there are.
    const earlier = this.lastRun;
    if (earlier === null || earlier.script !== script || earlier.statements.length === 0) show();
    try {
      await this.#saving;
      fresh.width = this.printWidth;
      const outcome = await this.session.run(
        script,
        text,
        (event) => {
          if (event.type === "started") show();
          hear(run, event, performance.now());
        },
        this.printWidth,
      );
      if (!shown) {
        end(fresh, outcome, performance.now());
        if (refused(fresh)) this.refusal = fresh;
        else show();
      } else {
        end(run, outcome, performance.now());
      }
      // A script that was refused made no frames: those of the results kept are kept too.
      if (shown) this.frames = outcome.frames;
      await this.#keepWritten(outcome);
      if (shown) this.setUnfolded(script, openable(run));
      // A run that drew a plot puts the Plots tab beside the script's, without leaving the script.
      if (shown && plotsOf(run).length > 0 && !this.views.tabs.includes(PLOTS)) {
        this.views.tabs = [...this.views.tabs, PLOTS];
        this.#keep();
      }
      this.status = outcome.stopped
        ? "stopped"
        : outcome.exitCode === 0
          ? "done"
          : `ended with exit code ${outcome.exitCode}`;
    } catch (error) {
      this.status = (error as Error).message;
    } finally {
      this.running = false;
    }
  }

  /**
   * The engine's check of the script, as the editor holds it, as `zeff check` makes it: what
   * it finds stands under the lines it names, as a refused run's findings do, and the results
   * on the page stay; nothing runs. The status line gives the engine's last line of it.
   */
  async check(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    const work = this.#check(this.#busy);
    this.#busy = work;
    await work;
  }

  async #check(before: Promise<void>): Promise<void> {
    await before;
    const script = this.scriptPath;
    await this.#load(script);
    const text = this.buffers[script]?.text ?? "";
    this.running = true;
    this.status = "checking";
    try {
      await this.#saving;
      const checked = await this.session.check(script, text);
      this.#showChecked(script, text, checked);
      this.checked = { script, text, summary: checked.summary };
      this.status = "done";
    } catch (error) {
      this.status = (error as Error).message;
    } finally {
      this.running = false;
    }
  }

  /** Have the engine read the statements of a script as it stands, where it has not yet. */
  readStatements(path: string, text: string): void {
    const now = this.now;
    if (now !== null && now.path === path && now.text === text) return;
    void this.#readStatements(path, text);
  }

  async #readStatements(path: string, text: string): Promise<void> {
    try {
      // The window can be ready before the engine's worker is: it is waited for.
      await this.engine.start();
      const ranges = await this.engine.statements(path, text);
      if (this.buffers[path]?.text === text) this.now = { path, text, ranges };
    } catch {
      // The engine is not there to ask: the marks wait for the next edit or run.
    }
  }

  /**
   * Run less than the script (the margin editor's design, 7.8), by the line of the statement
   * the cursor is on: `statement` runs it with every statement it needs (⌘↵; #176, R9), `to`
   * the statements before it (Run to here; #76), `from` it and every statement after it, with
   * what they need (Run from here; #181). The engine keeps nothing between two runs in a
   * browser at 0.8.0, so what is needed runs again from the top, the other statements blanked;
   * the other results on the page stay, marked where they are no longer the script's. The
   * whole script is checked first, as Zeff checks before it runs.
   */
  async runPart(
    kind: "statement" | "to" | "from" | "section",
    line: number,
    last = line,
  ): Promise<void> {
    if (this.running) return;
    this.running = true;
    const work = this.#runPart(this.#busy, kind, line, last);
    this.#busy = work;
    await work;
  }

  async #runPart(
    before: Promise<void>,
    kind: "statement" | "to" | "from" | "section",
    line: number,
    last: number,
  ): Promise<void> {
    await before;
    const script = this.scriptPath;
    await this.#load(script);
    const text = this.buffers[script]?.text ?? "";
    this.running = true;
    try {
      await this.#saving;
      const checked = await this.session.check(script, text);
      if (checked.exitCode !== 0) {
        // Refused: nothing runs, and the findings stand under their lines, as Check shows them.
        this.#showChecked(script, text, checked);
        this.checked = { script, text, summary: checked.summary };
        this.status = "done";
        return;
      }
      const graph = await this.session.dependencies(script, text);
      const target = graph
        .filter((one) => one.line <= line)
        .reduce<number | null>((at, one) => Math.max(at ?? 0, one.line), null);
      const wanted =
        kind === "section"
          ? // The statements of a section, from its heading to its last line (#178).
            graph.filter((one) => one.line >= line && one.line <= last)
          : kind === "statement"
            ? graph.filter((one) => one.line === target)
            : kind === "to"
              ? graph.filter((one) => target !== null && one.line < target)
              : graph.filter((one) => one.line >= (target ?? graph[0]?.line ?? 1));
      const lines = wanted
        .flatMap((one) => one.needs)
        .filter((one, at, all) => all.indexOf(one) === at)
        .sort((a, b) => a - b);
      if (lines.length === 0) {
        this.status = "nothing to run there";
        return;
      }
      const previous = this.lastRun;
      const unfolded = this.views.script.unfolded[script];
      if (previous !== null && previous.script === script && unfolded !== undefined) {
        const now = followed(previous.text, text, unfolded);
        if (now.join() !== unfolded.join()) this.setUnfolded(script, now);
      }
      const fresh = begin(script, text, performance.now(), clockOf(Date.now()));
      this.#runs += 1;
      fresh.number = this.#runs;
      fresh.width = this.printWidth;
      fresh.partial = lines;
      this.status = "running";
      const outcome = await this.session.run(
        script,
        text,
        (event) => hear(fresh, event, performance.now()),
        this.printWidth,
        lines,
      );
      end(fresh, outcome, performance.now());
      this.refusal = null;
      this.figures = {};
      this.#wanted.clear();
      this.lastRun =
        previous !== null && previous.script === script ? merged(previous, fresh) : fresh;
      this.frames = outcome.frames;
      await this.#keepWritten(outcome);
      // A run of part of the script unfolds the outputs of the statements asked for, and
      // leaves the others as they were (the owner's answer of 22 November 2026): not those
      // of the statements run only because the ones asked for read them.
      const asked = wanted.map((one) => one.line);
      this.setUnfolded(script, [
        ...(this.views.script.unfolded[script] ?? []),
        ...openable(this.lastRun).filter((line) => asked.includes(line)),
      ]);
      this.status = outcome.stopped
        ? "stopped"
        : outcome.exitCode === 0
          ? "done"
          : `ended with exit code ${outcome.exitCode}`;
    } catch (error) {
      this.status = (error as Error).message;
    } finally {
      this.running = false;
    }
  }

  /**
   * The place an output is unfolded in is `columns` characters wide. The engine never prints
   * under 40 (Language Reference, section 3.8). A change of width lays the last run's prints
   * out afresh, a quarter of a second after the last change, as a figure is redrawn.
   */
  setPrintWidth(columns: number): void {
    const width = Math.max(40, Math.floor(columns));
    if (width === this.printWidth) return;
    this.printWidth = width;
    if (this.#relaying !== null) clearTimeout(this.#relaying);
    this.#relaying = setTimeout(() => {
      this.#relaying = null;
      void this.relayout();
    }, 250);
  }

  /**
   * Print the last run's results again at the width of their place: the same text run again,
   * which by the determinism of the engine gives the same results, laid out at the new width.
   * The run keeps its number, its time and what it said; only what it printed changes.
   */
  async relayout(): Promise<void> {
    const run = this.lastRun;
    if (run === null || run.checkOnly || run.state === "running" || this.running) return;
    if (run.width === this.printWidth) return;
    const width = this.printWidth;
    const before = this.#busy;
    const work = (async () => {
      await before;
      if (this.lastRun !== run || this.running) return;
      try {
        await this.#saving;
        const outcome = await this.session.run(run.script, run.text, undefined, width);
        if (this.lastRun !== run) return;
        for (const statement of run.statements) {
          const info = outcome.statements.find((one) => one.line === statement.line);
          if (info !== undefined) statement.printed = info.stdout;
        }
        run.info = outcome.statements;
        run.width = width;
      } catch (error) {
        this.status = (error as Error).message;
      }
    })();
    this.#busy = work;
    await work;
  }

  /**
   * Copy what the statement on `line` printed, as `zeff run` prints it: at the engine's own
   * width, 118, whatever the width of the window (the design, 7.4). Where the run was printed
   * at another width, the text that ran is run again at 118 for it.
   */
  async copyText(line: number): Promise<void> {
    const run = this.lastRun;
    if (run === null) return;
    let text = run.info.find((one) => one.line === line)?.stdout ?? "";
    if (run.width !== 0 && run.width !== 118) {
      const before = this.#busy;
      const work = (async () => {
        await before;
        const outcome = await this.session.run(run.script, run.text, undefined, 0);
        text = outcome.statements.find((one) => one.line === line)?.stdout ?? "";
      })();
      this.#busy = work;
      await work;
    }
    try {
      await navigator.clipboard.writeText(text);
      const lines = text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
      this.copied = `copied line ${line} as text: ${lines} line${lines === 1 ? "" : "s"}`;
    } catch {
      this.copied = "the browser did not let the text be copied";
    }
  }

  /** A code's explained page, as `zeff explain` prints it. */
  async explain(code: string): Promise<string> {
    if (this.language !== null) return this.language.explain(code);
    return (await this.engine.explain(code)).text;
  }

  /** A function's help page, as `zeff help` prints it, or the engine's sentence where it has none. */
  async helpPage(name: string): Promise<{ page: string | null; message: string }> {
    if (this.language !== null) return this.language.help(name);
    return this.engine.help(name);
  }

  /** Open the Help place on a function's page (F1 in the script, a related function, the field). */
  async showHelp(name: string): Promise<void> {
    await this.#openStop({ kind: "name", name });
  }

  /** Open the Help place on a code's explained page (Explain, in what a run said). */
  async showCode(code: string): Promise<void> {
    await this.#openStop({ kind: "code", code });
  }

  /** Open the Help place on Home, where it starts. */
  async showHelpHome(): Promise<void> {
    await this.#openStop(HELP_HOME);
  }

  /** Back to the page of Help opened before the one shown; nothing where this is the first. */
  async helpBack(): Promise<void> {
    const to = before(this.helpHistory);
    if (to === null) return;
    this.helpHistory = back(this.helpHistory);
    await this.#showStop(to);
  }

  /** Forward to the page of Help one went back from; nothing where this is the last. */
  async helpForward(): Promise<void> {
    const to = after(this.helpHistory);
    if (to === null) return;
    this.helpHistory = forward(this.helpHistory);
    await this.#showStop(to);
  }

  /** A page opened: it goes into the history, is read from the engine, and Help is shown. */
  async #openStop(stop: Stop): Promise<void> {
    this.helpHistory = opened(this.helpHistory, stop);
    await this.#showStop(stop);
    this.openHelp();
  }

  /**
   * Put a page of the history on the screen: Home, or the engine's page read afresh (a page
   * of the project's own function follows its script). Where another page was asked for
   * while this one was read, the later one stands.
   */
  async #showStop(stop: Stop): Promise<void> {
    const asked = ++this.#helpAsked;
    let shown = { title: "", page: "" };
    if (stop.kind === "name") {
      const found = await this.helpPage(stop.name);
      shown = { title: stop.name, page: found.page ?? found.message };
    } else if (stop.kind === "code") {
      const page = await this.explain(stop.code).catch((error: Error) => error.message);
      shown = { title: stop.code, page };
    }
    if (asked === this.#helpAsked) this.help = shown;
  }

  /** Show the Help place, on the page it last showed; on Home where none was opened yet. */
  openHelp(): void {
    Object.assign(this.views, withTab(this.views, HELP));
    this.#keep();
    if (here(this.helpHistory) === null) this.helpHistory = opened(this.helpHistory, HELP_HOME);
    void this.indexHelp();
  }

  /**
   * The index of the help, asked of the worker the first time it is wanted and kept; null
   * where the worker cannot give it, and then the Help place works on without it.
   */
  async indexHelp(): Promise<HelpIndex | null> {
    try {
      this.helpIndex = await this.#indexed();
    } catch {
      // The worker is not there: the next call asks again.
    }
    return this.helpIndex;
  }
  readonly #indexed = once(() =>
    this.language !== null ? this.language.helpIndex() : this.engine.helpIndex(),
  );

  /**
   * What a check found, shown as a run the check refused: under the lines it names, the
   * results on the page kept; or, where there are none, as the page itself.
   */
  #showChecked(script: string, text: string, checked: Checked): void {
    // The findings, as a run that the check refused: under the lines they name.
    const run = begin(script, text, performance.now(), clockOf(Date.now()));
    run.checkOnly = true;
    hear(run, { type: "ranges", statements: checked.ranges }, performance.now());
    hear(run, { type: "output", stdout: "", stderr: checked.found }, performance.now());
    end(
      run,
      {
        exitCode: checked.exitCode,
        stdout: "",
        stderr: checked.found,
        statements: [],
        frames: [],
        written: [],
        stopped: false,
      },
      performance.now(),
    );
    if (refused(run)) {
      const earlier = this.lastRun;
      if (earlier === null || earlier.script !== script) {
        this.lastRun = run;
        this.refusal = null;
      } else {
        this.refusal = run;
      }
    } else if (this.refusal?.script === script) {
      this.refusal = null;
    }
  }

  /** The statements of the last run that ended in a plot, once the run is over. */
  get plots(): PlotStatement[] {
    const run = this.lastRun;
    return run === null || run.state === "running" ? [] : plotsOf(run);
  }

  /**
   * A figure is wanted: a plot, by the line its statement begins on, at the size of a place on
   * the screen or at a named page. It is drawn a moment after the last thing asked for, so
   * that a pane being resized is drawn once, when the resizing has stopped. Gives the name it
   * is kept under.
   */
  want(asked: Wanted): string {
    const wanted: Wanted =
      asked.page === undefined
        ? { line: asked.line, width: Math.round(asked.width), height: Math.round(asked.height) }
        : asked;
    const key = keyOf(wanted);
    if (!this.#wanted.has(key)) {
      this.#wanted.set(key, wanted);
    }
    if (this.figures[key] === undefined) {
      if (this.#drawing !== null) clearTimeout(this.#drawing);
      this.#drawing = setTimeout(() => {
        this.#drawing = null;
        void this.#draw();
      }, 250);
    }
    return key;
  }

  /** A figure is wanted no longer: its place was resized or closed. */
  unwant(key: string): void {
    this.#wanted.delete(key);
  }

  /**
   * Draw the figures wanted and not yet drawn. The interface runs the text of the last run
   * with an `export` added for each (see `plots/figures.ts`) and reads the files written.
   */
  async #draw(): Promise<void> {
    const before = this.#busy;
    const work = (async () => {
      await before;
      const run = this.lastRun;
      if (run === null || run.state === "running") {
        return;
      }
      const wanted = [...this.#wanted.values()].filter(
        (one) => this.figures[keyOf(one)] === undefined,
      );
      if (wanted.length === 0) {
        return;
      }
      for (const one of wanted) this.figures[keyOf(one)] = { svg: null, problem: "" };
      const started = performance.now();
      // The engine ends a run at its first error. A figure it refuses (a plot of twelve panels
      // on a page as small as a thumbnail's) would so take with it every figure asked for
      // after it in the same run, the one a reader is looking at among them. So where a
      // figure is refused, those after it are asked for again, without it: a refused figure
      // costs itself and one more run of the script, never its neighbours.
      let asking = wanted;
      for (let rounds = 0; asking.length > 0 && rounds <= wanted.length; rounds += 1) {
        const sent = withExports(run.text, plotsOf(run), asking);
        const told = consoleRun(run.script, sent.text);
        const again: Wanted[] = [];
        try {
          const outcome = await this.session.run(run.script, sent.text, told.hear);
          told.end(outcome);
          // What the engine said of the lines the interface added, each under its own figure.
          const said = blocks(told.run).flatMap((block) => block.said);
          let refused = false;
          for (const [index, figure] of sent.figures.entries()) {
            const next = sent.figures[index + 1]?.line ?? Infinity;
            // A figure is this run's only where its own statement ended in this run: a file
            // of its name may be left from a drawing before, and a run that ended earlier
            // never wrote this one.
            const wrote = told.run.statements.some(
              (one) => one.line === figure.line && one.state === "done",
            );
            const bytes = outcome.stopped || !wrote ? null : await this.engine.read(figure.file);
            const problem = said
              .filter((one) => one.line !== null && one.line >= figure.line && one.line < next)
              .filter((one) => one.kind === "error")
              .map((one) => one.sentence)
              .join(" ");
            const one = asking.find((candidate) => keyOf(candidate) === figure.key);
            if (bytes === null && problem === "" && refused && one !== undefined) {
              // Not reached: the run had ended at a figure before it.
              again.push(one);
              continue;
            }
            if (bytes === null && problem !== "") refused = true;
            this.figures[figure.key] = {
              svg: bytes === null ? null : new TextDecoder().decode(bytes),
              problem: bytes === null ? problem || "The engine wrote no figure." : "",
            };
          }
        } catch (error) {
          for (const figure of sent.figures) {
            this.figures[figure.key] = { svg: null, problem: (error as Error).message };
          }
        }
        asking = again;
      }
      this.drawMs = performance.now() - started;
    })();
    this.#busy = work;
    await work;
  }

  /**
   * Save a plot of the last run as a file the engine writes: the script is run with one
   * `export` of the format and size chosen, and the bytes of the file are given back for the
   * browser to save. The engine's words are given where it could not.
   */
  async exported(plot: PlotStatement, format: Format, size: string): Promise<Uint8Array | string> {
    const before = this.#busy;
    let result: Uint8Array | string = "No run to save a plot of.";
    const work = (async () => {
      await before;
      const run = this.lastRun;
      if (run === null || run.state === "running") {
        return;
      }
      const sent = withExport(run.text, plot, format, size);
      const told = consoleRun(run.script, sent.text);
      try {
        const outcome = await this.session.run(run.script, sent.text, told.hear);
        told.end(outcome);
        const bytes = outcome.stopped ? null : await this.engine.read(sent.file);
        result =
          bytes ??
          (blocks(told.run)
            .flatMap((block) => block.said)
            .filter((one) => one.kind === "error")
            .map((one) => one.sentence)
            .join(" ") ||
            "The engine wrote no file.");
      } catch (error) {
        result = (error as Error).message;
      }
    })();
    this.#busy = work;
    await work;
    return result;
  }

  // The plot viewer: what it shows is view state, kept with the project.

  /** The plots of the last run in the order of the gallery strip. */
  get strip(): PlotStatement[] {
    return ordered(this.plots, this.views.plots.order);
  }

  /** The plot the viewer shows: the one chosen, or the first of the strip. */
  get shownPlot(): PlotStatement | null {
    const strip = this.strip;
    return strip.find((plot) => plot.source === this.views.plots.shown) ?? strip[0] ?? null;
  }

  /** The plots pinned side by side; none where fewer than two are pinned. */
  get comparedPlots(): PlotStatement[] {
    return compared(this.strip, this.views.plots.pinned);
  }

  showPlot(plot: PlotStatement): void {
    this.views.plots.shown = plot.source;
    this.#keep();
  }

  /** Move the plot at `from` in the strip to stand at `to`. */
  movePlot(from: number, to: number): void {
    this.views.plots.order = moved(
      this.strip.map((plot) => plot.source),
      from,
      to,
    );
    this.#keep();
  }

  pinPlot(plot: PlotStatement): void {
    this.views.plots.pinned = toggled(this.views.plots.pinned, plot.source);
    this.#keep();
  }

  unpinAll(): void {
    this.views.plots.pinned = [];
    this.#keep();
  }

  setPage(page: ViewState["plots"]["page"]): void {
    this.views.plots.page = page;
    this.#keep();
  }

  /** Open the data viewer, on a frame where one is named. */
  openData(frame?: string): void {
    Object.assign(this.views, withTab(this.views, DATA));
    if (frame !== undefined) this.views.data.frame = frame;
    this.#keep();
  }

  /** Show a frame in the data viewer. */
  showFrame(frame: string): void {
    this.views.data.frame = frame;
    this.#keep();
  }

  /** Hide variables of a frame from the grid, or show them again; nothing else changes. */
  setHidden(frame: string, hidden: string[]): void {
    const others = Object.entries(this.views.data.hidden).filter(([one]) => one !== frame);
    const kept = hidden.filter((one, at) => hidden.indexOf(one) === at);
    this.views.data.hidden = Object.fromEntries(
      kept.length === 0 ? others : [...others, [frame, kept]],
    );
    this.#keep();
  }

  /** Choose a variable for the data viewer's inspector. */
  /**
   * Choose a variable of the frame shown, or none. A variable chosen (a column's header
   * clicked, a name in the list) opens the Variables pane on it in place of the list (open
   * decision #203); none chosen leaves the pane as it is, on the list.
   */
  chooseVariable(variable: string | null): void {
    this.views.data.variable = variable;
    if (variable !== null) this.views.panes.data = { ...this.views.panes.data, variables: true };
    this.#keep();
  }

  /**
   * What the engine prints for each of some statements, run after the script as the console
   * line runs one, so that every number shown of a variable is the engine's (`frame.summary`,
   * `quantile`, `tabulate` and the rest; `src/data/properties.ts`). The script is not changed.
   * The statements follow the text of the last run, whose frames they are asked of.
   * A statement that printed nothing gives what the engine said of it; `said` is what the
   * engine said where it refused the statements or one of them failed.
   */
  async askAfter(statements: string[]): Promise<{ printed: string[]; said: string }> {
    // After the script that ran last, as it ran: the frames the Data place shows are that
    // run's, whichever script is open now and however it has been edited since.
    const run = this.lastRun;
    if (run === null) return { printed: statements.map(() => ""), said: "" };
    const script = run.script;
    const { text, from } = composed(run.text, statements.slice(0, -1), statements.at(-1) ?? "");
    // Each statement is on a line of its own, the last of them on line `from`.
    const first = from - (statements.length - 1);
    const before = this.#busy;
    let answer = { printed: statements.map(() => ""), said: "" };
    const work = (async () => {
      await before;
      await this.#saving;
      const told = consoleRun(script, text);
      const outcome = await this.session.run(script, text, told.hear, 0);
      told.end(outcome);
      const all = blocks(told.run);
      const raw = (block: (typeof all)[number]) => block.said.map((one) => one.raw).join("");
      answer = {
        printed: statements.map((_, at) => {
          const block = all.find((one) => one.line === first + at);
          return block === undefined ? "" : block.printed !== "" ? block.printed : raw(block);
        }),
        said: all
          .filter((block) => block.state === "failed")
          .map(raw)
          .join(""),
      };
    })();
    this.#busy = work;
    await work;
    return answer;
  }

  /** Show or hide the data viewer's list of frames and variables. */
  setDataList(shown: boolean): void {
    this.setPane("data", "frames", shown);
  }

  /** How the data viewer shows a frame: kept to the rows of a condition, sorted, searched. */
  viewOf(frame: string): View {
    return this.views.data.shown[frame] ?? { where: "", sort: null, search: "" };
  }

  /** Change how the data viewer shows a frame; the frame and the script do not change. */
  setView(frame: string, change: Partial<View>): void {
    const view = { ...this.viewOf(frame), ...change };
    const others = Object.entries(this.views.data.shown).filter(([one]) => one !== frame);
    const plain = view.where.trim() === "" && view.sort === null && view.search === "";
    this.views.data.shown = Object.fromEntries(plain ? others : [...others, [frame, view]]);
    this.#keep();
  }

  /** Rows of a frame of the last run as the data viewer shows it, each cell as the engine prints it. */
  rows(name: string, offset: number, limit: number): Promise<Rows> {
    return this.engine.rows(name, offset, limit, this.viewOf(name));
  }

  /**
   * Put text on the clipboard for the data viewer: a statement of Copy as Zeff, or a range of
   * cells; `what` says which, in the words the viewer shows once it is copied.
   */
  async copyFromData(text: string, what: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.copied = what;
    } catch {
      this.copied = "the browser did not let the text be copied";
    }
  }

  /** Show or hide the list of plots at the left of the plot viewer. */
  setPlotList(shown: boolean): void {
    this.setPane("plots", "list", shown);
  }

  /** Open the plot viewer: its tab is added where it is not there, and shown. */
  openPlots(): void {
    Object.assign(this.views, withTab(this.views, PLOTS));
    this.#keep();
  }

  /** How the output stands to the script: not run yet, running, in sync, or edited since. */
  get sync(): string {
    if (this.running) return this.status === "checking" ? "checking" : "running";
    const errors = this.refusedErrors;
    if (errors > 0) return `not run · ${errors} error${errors === 1 ? "" : "s"} found by the check`;
    // What the last Check said, while the script is as it was checked.
    const checked = this.checked;
    if (checked !== null && checked.script === this.scriptPath) {
      const buffer = this.buffers[checked.script];
      if (buffer !== undefined && buffer.text === checked.text) return checked.summary;
    }
    if (this.lastRun === null) return "not run yet";
    return this.edited ? "edited · not run" : "in sync";
  }

  /** Whether the script has been edited since the check refused it. */
  get refusalEdited(): boolean {
    const run = this.refusal;
    if (run === null) return false;
    const buffer = this.buffers[run.script];
    return buffer !== undefined && buffer.loaded && buffer.text !== run.text;
  }

  /** How many errors the check found in the script as it stands; none once it is edited. */
  get refusedErrors(): number {
    const run = this.refusal;
    return run === null || this.running || this.refusalEdited
      ? 0
      : said(run.beforeRaw).filter((one) => one.kind === "error").length;
  }

  /** How many warnings the last run gave. */
  get warnings(): number {
    return this.lastRun === null
      ? 0
      : blocks(this.lastRun).reduce(
          (count, block) => count + block.said.filter((one) => one.kind === "warning").length,
          0,
        );
  }

  /**
   * A line was entered in the console. A statement runs after the script and the statements
   * the console has kept, and is not added to the script; a line that begins with a colon is
   * a word to the console itself.
   */
  async enter(line: string): Promise<void> {
    const statement = line.trim();
    if (statement === "") {
      return;
    }
    this.history.add(line);
    this.consoleOpen = true;
    if (statement.startsWith(":")) {
      await this.#command(statement);
      return;
    }
    this.entries.push({ statement, state: "running", printed: "", said: [], told: "" });
    const entry = this.entries[this.entries.length - 1] as Entry;
    // A statement entered while something runs waits its turn: none is dropped.
    const before = this.#busy;
    const work = (async () => {
      await before;
      const script = this.scriptPath;
      await this.#load(script);
      const { text, from } = composed(this.buffers[script]?.text ?? "", this.#kept, statement);
      const told = consoleRun(script, text);
      this.running = true;
      try {
        await this.#saving;
        const outcome = await this.session.run(script, text, told.hear);
        told.end(outcome);
        Object.assign(entry, outcomeOf(told.run, from));
        // A statement that ran is kept, so that the next one typed sees what it made.
        if (entry.state === "done") this.#kept.push(statement);
        this.frames = outcome.frames;
        await this.#keepWritten(outcome);
      } catch (error) {
        entry.state = "failed";
        entry.told = (error as Error).message;
      } finally {
        this.running = false;
      }
    })();
    this.#busy = work;
    await work;
  }

  /**
   * A word to the console itself (the Zemp Specification, section 5): `:help`, `:vars` and
   * `:save` as `zeff repl` has them, in its words, the console's statements standing for the
   * session; `:clear`, the console's own, empties it and forgets its statements.
   */
  async #command(statement: string): Promise<void> {
    const [name = "", ...rest] = statement.slice(1).trim().split(/\s+/);
    const argument = rest.join(" ");
    // The command takes its place at once and waits its turn, as a statement does, so that
    // what it answers follows what was typed before it.
    this.entries.push({ statement, state: "running", printed: "", said: [], told: "" });
    const entry = this.entries[this.entries.length - 1] as Entry;
    const tell = (printed: string, told: string) =>
      Object.assign(entry, { state: "done", printed, told });
    const before = this.#busy;
    const work = (async () => {
      await before;
      if (name === "clear") {
        this.entries = [];
        this.#kept = [];
      } else if (name === "help" && argument === "") {
        tell(CONSOLE_HELP, "");
      } else if (name === "help") {
        const found = await this.helpPage(argument);
        tell(found.page ?? "", found.page === null ? `error: ${found.message}` : "");
      } else if (name === "vars") {
        const script = this.scriptPath;
        await this.#load(script);
        const { text } = composed(this.buffers[script]?.text ?? "", this.#kept, "");
        const found = await this.engine.vars(script, text);
        tell(found.printed, found.said.trimEnd());
      } else if (name === "save") {
        tell("", await this.#save(argument));
      } else {
        tell("", `unknown console command \`:${name}\`; :help lists the commands`);
      }
    })().catch((error: Error) => {
      Object.assign(entry, { state: "failed", told: error.message });
    });
    this.#busy = work;
    await work;
  }

  /** Files `:save` wrote in this window, which it may write again. */
  #saved: string[] = [];

  /**
   * `:save <path>`: the console's statements written as a script of the project, as `zeff
   * repl` writes its session: only a new file, or one it wrote here; in a folder that is
   * there; never outside the project. What it says, in the command line's words.
   */
  async #save(path: string): Promise<string> {
    if (path === "") return "`:save` needs a path, as in `:save scripts/explore.zeff`";
    let segments: string[] | null;
    try {
      segments = path.startsWith("/") ? null : parts(path.replace(/^(\.\/)+/, ""));
    } catch {
      segments = null;
    }
    if (segments === null || segments.length === 0) {
      const file =
        path
          .split("/")
          .filter((one) => one !== "")
          .at(-1) ?? "explore.zeff";
      return `error[Z0707]: cannot write \`${path}\`: it is outside the project\n  = help: write under the project, as in \`output/${file}\``;
    }
    const target = segments.join("/");
    if (segments[0] === ".zemp") {
      return `error: \`${path}\` is the window's own folder; \`:save scripts/<name>.zeff\` writes beside the other scripts`;
    }
    const kind = await this.project.kind(target);
    if (kind === "folder" || (kind === "file" && !this.#saved.includes(target))) {
      return `error: \`${path}\` already exists; \`:save\` writes only a new file, or one it wrote in this session`;
    }
    const folder = segments.slice(0, -1).join("/");
    if (folder !== "" && (await this.project.kind(folder)) !== "folder") {
      return `error: the folder of \`${path}\` does not exist; \`:save scripts/<name>.zeff\` writes beside the other scripts`;
    }
    const n = this.#kept.length;
    await this.project.writeText(target, this.#kept.map((one) => `${one}\n`).join(""));
    if (!this.#saved.includes(target)) this.#saved.push(target);
    this.session.changed(target);
    this.language?.changed(target);
    await this.refresh();
    return `saved the ${n} ${n === 1 ? "statement" : "statements"} of the session to ${path}`;
  }

  /** End the run: before its next step where that can be asked, at once where it cannot. */
  cancel(): void {
    if (this.running && !this.engine.cancel()) {
      this.engine.stop();
    }
  }

  /** Take the last run's results off the page. A run that is going is left to show. */
  clear(): void {
    if (!this.running) {
      this.lastRun = null;
      this.refusal = null;
      this.figures = {};
      this.#wanted.clear();
    }
  }

  /** Whether the script has been edited since the run the panel shows: its output is then not the script's. */
  get edited(): boolean {
    const run = this.lastRun;
    if (run === null || run.state === "running") {
      return false;
    }
    const buffer = this.buffers[run.script];
    return buffer !== undefined && buffer.loaded && buffer.text !== run.text;
  }

  /**
   * Add files chosen from the computer into a folder of the project (`data` where none is
   * named); nothing is written into a script. A file that cannot be added says why, and the
   * others are added.
   */
  async addFiles(files: Iterable<File>, folder = "data"): Promise<void> {
    this.problem = "";
    for (const file of files) {
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const path =
          folder === "data"
            ? await this.project.addData(file.name, bytes)
            : await this.project.add(folder, file.name, bytes);
        this.session.changed(path);
        this.language?.changed(path);
      } catch (error) {
        this.problem = error instanceof ProjectError ? error.message : String(error);
      }
    }
    await this.refresh();
  }

  /**
   * Make a script in a folder of the project and open it (open decision #208). Gives the
   * reason, as a sentence, where it cannot be made, and `null` where it was.
   */
  async newScript(name: string, folder: string): Promise<string | null> {
    try {
      const path = await this.project.newScript(name, folder);
      this.session.changed(path);
      this.language?.changed(path);
      await this.refresh();
      await this.open(path);
      return null;
    } catch (error) {
      return error instanceof ProjectError ? error.message : String(error);
    }
  }

  /** Make a folder in a folder of the project. Gives the reason where it cannot be made. */
  async newFolder(name: string, parent: string): Promise<string | null> {
    try {
      await this.project.newFolder(name, parent);
      await this.refresh();
      return null;
    } catch (error) {
      return error instanceof ProjectError ? error.message : String(error);
    }
  }

  /**
   * A file or a folder the reader is renaming, moving or deleting from the Project pane, in
   * the row where it stands; `null` where none is. ⌘K sets it too, for the file shown.
   */
  asking = $state<{ kind: "rename" | "move" | "delete"; path: string } | null>(null);

  /**
   * A script or a folder the reader is naming, in the row of the Project pane where it will
   * stand; `null` where none is. The pane's menus set it, and ⌘K.
   */
  making = $state<{ kind: "script" | "folder"; parent: string } | null>(null);

  /** Begin naming a new script or folder in a folder, which is unfolded for it. */
  make(kind: "script" | "folder", parent: string): void {
    this.unfoldFolder(parent);
    this.making = { kind, parent };
  }

  /**
   * Where the scripts of the project name a path that is no longer there (renamed, moved or
   * deleted). The scripts are not changed: no control of Zemp Lite writes a statement, and a
   * renamed file is not a reason to rewrite a reader's script. The reader is told, and goes
   * to each place himself.
   */
  named = $state<{ was: string; where: { script: string; line: number }[] } | null>(null);

  /** The folders of the project, each by its path; `""` is the project's own. */
  get folders(): string[] {
    const found: string[] = [""];
    const walk = (nodes: TreeNode[]): void => {
      for (const node of nodes) {
        if (node.kind === "folder" && !own(node.path)) {
          found.push(node.path);
          walk(node.children);
        }
      }
    };
    walk(this.tree);
    return found;
  }

  /** Every file of the project under a path (the path itself, where it is a file; all of them for `""`). */
  #under(path: string): string[] {
    const found: string[] = [];
    const within = (file: string) => path === "" || file === path || file.startsWith(`${path}/`);
    const walk = (nodes: TreeNode[]): void => {
      for (const node of nodes) {
        if (node.kind === "folder") walk(node.children);
        else if (within(node.path)) found.push(node.path);
      }
    };
    walk(this.tree);
    return found;
  }

  /**
   * Where the project's scripts name a path, as text: each script, as it stands in the editor
   * or in the project, and each line of it that holds the path (a folder's with the `/` that
   * follows it). At most twenty places.
   */
  async #naming(path: string, folder: boolean): Promise<{ script: string; line: number }[]> {
    const sought = folder ? `${path}/` : path;
    const found: { script: string; line: number }[] = [];
    for (const script of this.#under("").filter((one) => one.endsWith(".zeff"))) {
      const buffer = this.buffers[script];
      const text = buffer?.loaded ? buffer.text : ((await this.project.readText(script)) ?? "");
      for (const [at, line] of text.split("\n").entries()) {
        if (line.includes(sought) && found.length < 20) found.push({ script, line: at + 1 });
      }
    }
    return found;
  }

  /**
   * What the window keeps by a file's path is kept by its new one: the text open in the
   * editor, its tab, which of its outputs are unfolded, which folders are folded, and the
   * results of its run. `to` is `null` where the path is gone and nothing takes its place.
   */
  #repath(from: string, to: string | null): void {
    const hit = (path: string) => path === from || path.startsWith(`${from}/`);
    const at = (path: string) => (to === null ? null : `${to}${path.slice(from.length)}`);
    const keyed = <T>(record: Record<string, T>): Record<string, T> =>
      Object.fromEntries(
        Object.entries(record).flatMap(([path, value]): [string, T][] => {
          if (!hit(path)) return [[path, value]];
          const now = at(path);
          return now === null ? [] : [[now, value]];
        }),
      );
    this.buffers = keyed(this.buffers);
    this.diagnostics = keyed(this.diagnostics);
    this.#told = Object.fromEntries(Object.entries(this.#told).filter(([path]) => !hit(path)));
    this.views.script.unfolded = keyed(this.views.script.unfolded);
    this.views.folded = this.views.folded.flatMap((path) => (hit(path) ? (at(path) ?? []) : path));
    const tab = (one: string): string | null => {
      const path = tabPath(one);
      if (path === null || !hit(path)) return one;
      const now = at(path);
      return now === null ? null : fileTab(now);
    };
    const shown = this.views.active === null ? null : tab(this.views.active);
    this.views.tabs = this.views.tabs.flatMap((one) => tab(one) ?? []);
    // A file that is gone leaves the script's place to the main script, or the first one open.
    if (!this.views.tabs.some((one) => tabPath(one)?.endsWith(".zeff"))) {
      this.views.tabs = [fileTab(MAIN), ...this.views.tabs];
    }
    this.views.active =
      shown ??
      (this.views.active !== null && tabPath(this.views.active) === null
        ? this.views.active
        : (this.views.tabs.find((one) => tabPath(one) !== null) ?? null));
    for (const run of [this.lastRun, this.refusal]) {
      if (run !== null && hit(run.script)) {
        const now = at(run.script);
        if (now !== null) run.script = now;
      }
    }
    if (to === null) {
      // The results of a script that is gone go with it.
      if (this.lastRun !== null && hit(this.lastRun.script)) this.clear();
      if (this.refusal !== null && hit(this.refusal.script)) this.refusal = null;
    }
    if (this.now !== null && hit(this.now.path)) this.now = null;
    if (this.checked !== null && hit(this.checked.script)) this.checked = null;
    if (this.cursor !== null && hit(this.cursor.path)) this.cursor = null;
    this.#keep();
  }

  /**
   * Give a file or a folder another path in the project: a new name where it stands, or
   * another folder (open decision #208). What is typed is saved first; what is open follows,
   * with the results of its run; the engine and the language engine forget the old path and
   * are given the new; and where a script names the old path, the reader is told which.
   * Gives the reason, as a sentence, where it cannot be done, and `null` where it was.
   */
  async moveTo(from: string, to: string): Promise<string | null> {
    if (from === to) return null;
    try {
      await this.settle();
      const folder = (await this.project.kind(from)) === "folder";
      const naming = await this.#naming(from, folder);
      await this.project.move(from, to);
      this.#repath(from, to);
      this.session.gone(from);
      this.language?.gone(from);
      await this.refresh();
      for (const path of this.#under(to)) {
        this.session.changed(path);
        this.language?.changed(path);
        // A script open in the editor is known to the language server by its path.
        const buffer = this.buffers[path];
        if (buffer?.loaded) void this.#tell(path, buffer.text);
      }
      const at = (script: string) =>
        script === from || script.startsWith(`${from}/`)
          ? `${to}${script.slice(from.length)}`
          : script;
      this.named =
        naming.length === 0
          ? null
          : { was: from, where: naming.map((one) => ({ script: at(one.script), line: one.line })) };
      this.status =
        placeOf(from).parent === placeOf(to).parent
          ? `renamed to ${placeOf(to).name}`
          : `moved to ${to}`;
      return null;
    } catch (error) {
      return error instanceof ProjectError ? error.message : String(error);
    }
  }

  /** How many files a path of the project is: one, or those a folder holds. */
  filesAt(path: string): number {
    return this.#under(path).length;
  }

  /**
   * Make a copy of a file or a folder beside it, under a name with "copy" in it (open decision
   * #208). What is typed is saved first, so a script copied is the script as it stands.
   */
  async duplicate(path: string): Promise<void> {
    this.problem = "";
    try {
      await this.settle();
      const made = await this.project.duplicate(path);
      await this.refresh();
      for (const file of this.#under(made)) {
        this.session.changed(file);
        this.language?.changed(file);
      }
      this.status = `copied as ${placeOf(made).name}`;
    } catch (error) {
      this.problem = error instanceof ProjectError ? error.message : String(error);
    }
  }

  /**
   * Delete a file, or a folder with all it holds (open decision #208). It cannot be brought
   * back: the browser's storage has no bin, and the reader has confirmed it in the row. What
   * was open of it leaves the editor, the results of a script deleted go with it, the engine
   * and the language engine forget it, and where a script names it the reader is told which.
   * Gives the reason, as a sentence, where it cannot be done, and `null` where it was.
   */
  async deleteAt(path: string): Promise<string | null> {
    try {
      await this.settle();
      const folder = (await this.project.kind(path)) === "folder";
      const naming = (await this.#naming(path, folder)).filter(
        (one) => one.script !== path && !one.script.startsWith(`${path}/`),
      );
      const gone = await this.project.remove(path);
      this.#repath(path, null);
      this.session.gone(path);
      this.language?.gone(path);
      await this.refresh();
      // The script now shown, where the one shown went, is read if it was not open before.
      const shown = this.activePath;
      if (shown !== null) await this.#load(shown);
      this.named = naming.length === 0 ? null : { was: path, where: naming };
      this.status = folder
        ? `deleted ${placeOf(path).name} and the ${gone === 1 ? "file" : `${gone} files`} in it`
        : `deleted ${placeOf(path).name}`;
      return null;
    } catch (error) {
      return error instanceof ProjectError ? error.message : String(error);
    }
  }

  /** Show what a folder holds, where it is folded away. */
  unfoldFolder(path: string): void {
    if (path !== "" && this.views.folded.includes(path)) this.toggleFolder(path);
  }
}
