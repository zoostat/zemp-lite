// The state of one window with a project open in it: the project and its engine, what the
// left panel and the tabs show, the scripts being edited, and the last run. Every screen of
// the workspace reads this one object and changes it through its methods.
import type { Engine } from "../engine/engine";
import { Language, type Diagnostic, type Range } from "../engine/language";
import type { Checked, FrameInfo, Ranged } from "../engine/messages";
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
import { History, composed, consoleRun, outcomeOf, type Entry } from "./console";
import {
  PLOTS,
  fileTab,
  leftWidth,
  outputShare,
  readViews,
  tabPath,
  unfoldToggled,
  usual,
  withTab,
  withoutTab,
  writeViews,
  type Layout,
  type LeftTab,
  type ViewState,
} from "./views";

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
  /** The last run, as the Output panel shows it, or `null` before the first and after Clear. */
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
   * The Help panel (#74): shown or not; whether it follows the function under the cursor; and
   * the page it shows, a function's as `zeff help` prints it or a code's as `zeff explain` does.
   */
  help = $state<{
    shown: boolean;
    follow: boolean;
    title: string;
    page: string;
  }>({ shown: false, follow: true, title: "", page: "" });
  #following: ReturnType<typeof setTimeout> | null = null;
  /** What floats over the window about the last run: its facts, or what it said. */
  panel = $state<"facts" | "said" | null>(null);
  /** A line to be brought into view, with the cursor on it (`goTo`). */
  reveal = $state<{ path: string; line: number; count: number } | null>(null);
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

  constructor(project: Project, engine: Engine, language: Engine | null = null) {
    this.project = project;
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
    const views = readViews(await this.project.readText(VIEWS));
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

  // What is shown. Each change is kept with the project.

  setLayout(layout: Layout): void {
    this.views.layout = layout;
    this.#keep();
  }

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
    this.views.script.notes = shown;
    this.#keep();
  }

  setLeftTab(tab: LeftTab): void {
    this.views.left.tab = tab;
    this.#keep();
  }

  setLeftWidth(width: number): void {
    this.views.left.width = leftWidth(width);
    this.#keep();
  }

  toggleLeft(): void {
    this.views.left.shown = !this.views.left.shown;
    this.#keep();
  }

  setOutputShare(share: number): void {
    this.views.output.share = outputShare(share);
    this.#keep();
  }

  toggleOutput(): void {
    this.views.output.shown = !this.views.output.shown;
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
  async goTo(path: string, line: number): Promise<void> {
    await this.open(path);
    this.reveal = { path, line, count: (this.reveal?.count ?? 0) + 1 };
  }

  show(tab: string): void {
    if (this.views.tabs.includes(tab)) {
      this.views.active = tab;
      this.#keep();
    }
  }

  close(tab: string): void {
    Object.assign(this.views, withoutTab(this.views, tab));
    this.#keep();
  }

  #keep(): void {
    if (this.#keeping !== null) clearTimeout(this.#keeping);
    this.#keeping = setTimeout(() => {
      this.#keeping = null;
      const text = writeViews($state.snapshot(this.views));
      this.#saving = this.#saving.then(() => this.project.writeText(VIEWS, text));
    }, 200);
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
  async runPart(kind: "statement" | "to" | "from", line: number): Promise<void> {
    if (this.running) return;
    this.running = true;
    const work = this.#runPart(this.#busy, kind, line);
    this.#busy = work;
    await work;
  }

  async #runPart(
    before: Promise<void>,
    kind: "statement" | "to" | "from",
    line: number,
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
        kind === "statement"
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

  /** Show the Help panel on a function's page (F1, ⌘K). */
  async showHelp(name: string): Promise<void> {
    const found = await this.helpPage(name);
    this.help = {
      ...this.help,
      shown: true,
      title: found.page === null ? name : name,
      page: found.page ?? found.message,
    };
  }

  /** Show the Help panel on a code's explained page. */
  async showCode(code: string): Promise<void> {
    const page = await this.explain(code).catch((error: Error) => error.message);
    this.help = { ...this.help, shown: true, title: code, page };
  }

  /** Show or hide the Help panel. */
  setHelpShown(shown: boolean): void {
    this.help = { ...this.help, shown };
  }

  /** Whether the Help panel follows the function under the cursor. */
  setHelpFollow(follow: boolean): void {
    this.help = { ...this.help, follow };
  }

  /** The cursor is on a function's name: the Help panel, where shown and following, turns to it. */
  atFunction(name: string | null): void {
    if (name === null || !this.help.shown || !this.help.follow || name === this.help.title) return;
    if (this.#following !== null) clearTimeout(this.#following);
    this.#following = setTimeout(() => {
      this.#following = null;
      void this.helpPage(name).then((found) => {
        // A word with no page leaves the page shown as it is.
        if (found.page !== null && this.help.follow) {
          this.help = { ...this.help, title: name, page: found.page };
        }
      });
    }, 200);
  }

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
      const sent = withExports(run.text, plotsOf(run), wanted);
      const told = consoleRun(run.script, sent.text);
      const started = performance.now();
      try {
        const outcome = await this.session.run(run.script, sent.text, told.hear);
        told.end(outcome);
        // What the engine said of the lines the interface added, each under its own figure.
        const said = blocks(told.run).flatMap((block) => block.said);
        for (const [index, figure] of sent.figures.entries()) {
          const next = sent.figures[index + 1]?.line ?? Infinity;
          const bytes = outcome.stopped ? null : await this.engine.read(figure.file);
          const problem = said
            .filter((one) => one.line !== null && one.line >= figure.line && one.line < next)
            .filter((one) => one.kind === "error")
            .map((one) => one.sentence)
            .join(" ");
          this.figures[figure.key] = {
            svg: bytes === null ? null : new TextDecoder().decode(bytes),
            problem: bytes === null ? problem || "The engine wrote no figure." : "",
          };
        }
        this.drawMs = performance.now() - started;
      } catch (error) {
        for (const figure of sent.figures) {
          this.figures[figure.key] = { svg: null, problem: (error as Error).message };
        }
      }
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
      const help = /^:help(?:\s+(\S+))?$/.exec(statement);
      if (statement === ":clear") {
        this.entries = [];
        this.#kept = [];
      } else if (help !== null) {
        // `:help name` prints the page as `zeff repl` does; `:help` alone names how.
        const name = help[1];
        if (name === undefined) {
          this.entries.push({
            statement,
            state: "done",
            printed: "",
            said: [],
            told: "`:help name` gives a function's page; F1 opens it beside the script.",
          });
        } else {
          const found = await this.helpPage(name);
          this.entries.push({
            statement,
            state: "done",
            printed: found.page ?? "",
            said: [],
            told: found.page === null ? found.message : "",
          });
        }
      } else {
        this.entries.push({
          statement,
          state: "done",
          printed: "",
          said: [],
          told: `\`${statement.split(/\s/)[0]}\` comes with the alpha; \`:clear\` empties the console.`,
        });
      }
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

  /** End the run: before its next step where that can be asked, at once where it cannot. */
  cancel(): void {
    if (this.running && !this.engine.cancel()) {
      this.engine.stop();
    }
  }

  /** Empty the Output panel. A run that is going is left to show. */
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

  /** Add data files chosen from the computer; nothing is written into a script. */
  async addData(files: Iterable<File>): Promise<void> {
    this.problem = "";
    for (const file of files) {
      try {
        const path = await this.project.addData(
          file.name,
          new Uint8Array(await file.arrayBuffer()),
        );
        this.session.changed(path);
        this.language?.changed(path);
      } catch (error) {
        this.problem = error instanceof ProjectError ? error.message : String(error);
      }
    }
    await this.refresh();
  }
}
