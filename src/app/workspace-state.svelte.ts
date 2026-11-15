// The state of one window with a project open in it: the project and its engine, what the
// left panel and the tabs show, the scripts being edited, and the last run. Every screen of
// the workspace reads this one object and changes it through its methods.
import type { Engine } from "../engine/engine";
import type { FrameInfo } from "../engine/messages";
import { ProjectError, type Project, type TreeNode } from "../project/projects";
import { begin, blocks, clockOf, end, hear, type Run } from "../output/run";
import { Session } from "../project/session";
import { History, composed, consoleRun, outcomeOf, type Entry } from "./console";
import {
  fileTab,
  leftWidth,
  outputShare,
  readViews,
  tabPath,
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
  /** The frames the last run left. */
  frames = $state<FrameInfo[]>([]);
  /** Something the user asked for that could not be done, in words. */
  problem = $state("");

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

  constructor(project: Project, engine: Engine) {
    this.project = project;
    this.engine = engine;
    this.session = new Session(project, engine);
    void this.#begin();
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
    buffer.saved = false;
    this.#saving = this.#saving
      .then(() => this.project.writeText(path, text))
      .then(() => {
        this.session.changed(path);
        const now = this.buffers[path];
        if (now !== undefined && now.text === text) {
          now.saved = true;
          // The tree shows each file's size, which has changed.
          void this.refresh();
        }
      });
  }

  // Runs.

  /** Run the script, as the editor holds it. */
  async run(): Promise<void> {
    if (this.running) {
      return;
    }
    const work = this.#run();
    this.#busy = work;
    await work;
  }

  async #run(): Promise<void> {
    const script = this.scriptPath;
    await this.#load(script);
    const text = this.buffers[script]?.text ?? "";
    this.running = true;
    this.lastRun = begin(script, text, performance.now(), clockOf(Date.now()));
    // The run is read through the state, so that what the panel shows follows each event.
    const run = this.lastRun;
    try {
      await this.#saving;
      const outcome = await this.session.run(script, text, (event) =>
        hear(run, event, performance.now()),
      );
      end(run, outcome, performance.now());
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

  /** How the output stands to the script: not run yet, running, in sync, or edited since. */
  get sync(): string {
    if (this.running) return "running";
    if (this.lastRun === null) return "not run yet";
    return this.edited ? "edited · not run" : "in sync";
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
      if (statement === ":clear") {
        this.entries = [];
        this.#kept = [];
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
      } catch (error) {
        this.problem = error instanceof ProjectError ? error.message : String(error);
      }
    }
    await this.refresh();
  }
}
