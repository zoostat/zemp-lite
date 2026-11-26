// The interface's side of the engine's worker. One `Engine` belongs to one window: it starts
// the worker, opens the window's project in it, puts the project's files there, runs a script
// and hears each step as it goes, cancels a run, and reads back a frame or a file. When a
// project closes the worker is ended, which returns its memory to the browser (Engine and
// Project Specification, section 8.3, point 7), and the next project starts a new one.
import type {
  Report,
  Rows,
  Filtered,
  View,
  Checked,
  ExplainedPage,
  CodeFamily,
  ExampleOutcome,
  FromWorker,
  HelpIndex,
  LaidOut,
  Needs,
  Outcome,
  Ranged,
  Reply,
  Reprinted,
  Sectioned,
  Request,
  RunEvent,
} from "./messages";

/** As much of a Web Worker as the interface uses, so that a test can stand in for one. */
export interface WorkerLike {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: ((event: { message?: string }) => void) | null;
  terminate(): void;
}

/** The engine could not do what it was asked: the worker's own words, or how the worker failed. */
export class EngineError extends Error {
  override name = "EngineError";
}

interface Waiting {
  resolve: (reply: Reply) => void;
  reject: (error: Error) => void;
}

interface Running {
  listener: ((event: RunEvent) => void) | null;
  stdout: string;
  stderr: string;
  /** Ends the run from this side, when the worker is ended under it. */
  stop: (outcome: Outcome) => void;
}

/**
 * The time an example of Help may run, in milliseconds: beyond it the example is stopped
 * before its next step and said to be too slow.
 */
export const EXAMPLE_LIMIT = 10_000;

export class Engine {
  readonly #spawn: () => WorkerLike;
  #worker: WorkerLike | null = null;
  #ready: Promise<string> | null = null;
  #version: string | null = null;
  #waiting = new Map<number, Waiting>();
  /** Runs asked for of this worker: the worker holds a filter until the next run. */
  #runs = 0;
  #filter: { name: string; condition: string; runs: number; answer: Filtered } | null = null;
  #nextId = 1;
  #flag: Int32Array | null = null;
  #running: Running | null = null;
  #project: string | null = null;
  /** Resolves when the run that is going ends; resolved where none is. */
  #idle: Promise<void> = Promise.resolve();
  /** The example of Help that is running: who hears it, and the flag that stops it. */
  #example: { listener: ((event: RunEvent) => void) | null; flag: Int32Array | null } | null = null;

  /** `spawn` starts a worker; the browser's is in `browser.ts`. */
  constructor(spawn: () => WorkerLike) {
    this.#spawn = spawn;
  }

  /** The version of the Zeff engine in the worker, once it has started. */
  get version(): string | null {
    return this.#version;
  }

  /** The project open in the worker, by its name, or `null`. */
  get project(): string | null {
    return this.#project;
  }

  /** Whether a run is going. */
  get running(): boolean {
    return this.#running !== null;
  }

  /**
   * Whether a run can be cancelled between two of its steps, through memory the two sides
   * share. Where the page is not cross-origin isolated there is no such memory, and a run is
   * stopped only by ending the worker ([`stop`]).
   */
  get cancellable(): boolean {
    return this.#flag !== null;
  }

  /** Start the worker, if it is not started, and give the engine's version. */
  start(): Promise<string> {
    if (this.#ready !== null) {
      return this.#ready;
    }
    const worker = this.#spawn();
    this.#worker = worker;
    // A new worker holds no filter.
    this.#filter = null;
    this.#ready = new Promise<string>((resolve, reject) => {
      worker.onerror = (event) => {
        const error = new EngineError(
          `the engine's worker failed: ${event.message ?? "no reason given"}`,
        );
        reject(error);
        this.#end(error);
      };
      worker.onmessage = (event) => {
        const said = event.data as FromWorker;
        if (said.type === "ready") {
          this.#version = said.version;
          resolve(said.version);
          return;
        }
        this.#hear(said);
      };
    });
    return this.#ready;
  }

  /** Open a project called `name` in the worker; the one that was open there is gone. */
  async open(name: string): Promise<void> {
    await this.start();
    this.#flag = sharedFlag();
    const reply = await this.#ask({
      type: "open",
      name,
      cancel: this.#flag === null ? null : (this.#flag.buffer as SharedArrayBuffer),
    });
    expect(reply, "opened");
    this.#project = name;
  }

  /**
   * Put a file into the project, by its path from the project's folder; a file of that path
   * is replaced. The bytes are passed to the worker and are no longer the caller's.
   */
  async put(path: string, bytes: Uint8Array): Promise<void> {
    expect(await this.#ask({ type: "file", path, bytes }, [bytes.buffer]), "filed");
  }

  /**
   * Forget a file of the project, or a folder with all it holds, by its path from the
   * project's folder: one renamed, moved or deleted in the project itself. The frames of the
   * last run are kept. Whether the engine had one to forget.
   */
  async remove(path: string): Promise<boolean> {
    return expect(await this.#ask({ type: "remove", path }), "removed").was;
  }

  /**
   * Run the text of a script of the project (`script` is its path there). `listener` hears
   * the statements of the text first, then each step as it starts and ends, each pass of a
   * loop, and each piece of output. `width` is the characters tables are printed at, 0 for the
   * engine's own; `only`, where given, the lines of the statements to run alone. One run goes
   * at a time.
   */
  run(
    script: string,
    text: string,
    listener?: (event: RunEvent) => void,
    width = 0,
    only?: number[],
  ): Promise<Outcome> {
    if (this.#running !== null) {
      return Promise.reject(new EngineError("a run is already going in this window"));
    }
    if (this.#project === null) {
      return Promise.reject(new EngineError("no project is open in the engine"));
    }
    this.#runs += 1;
    // The flag is the interface's: cleared before a run is asked for.
    if (this.#flag !== null) {
      Atomics.store(this.#flag, 0, 0);
    }
    // The reader's run goes before an example of Help: one that is running is stopped before
    // its next step, and whoever asked for it runs it again afterwards (`examples.ts`).
    this.stopExample();
    let ended: () => void = () => {};
    this.#idle = new Promise<void>((resolve) => (ended = resolve));
    return new Promise<Outcome>((resolve, reject) => {
      const running: Running = {
        listener: listener ?? null,
        stdout: "",
        stderr: "",
        stop: (outcome) => {
          ended();
          resolve(outcome);
        },
      };
      this.#running = running;
      // This run is over; a run started since is not touched.
      const over = () => {
        ended();
        if (this.#running === running) {
          this.#running = null;
        }
      };
      const asked: Request = { type: "run", script, text, width };
      if (only !== undefined) asked.only = only;
      this.#ask(asked).then(
        (reply) => {
          over();
          try {
            const done = expect(reply, "done");
            resolve({
              exitCode: done.exit_code,
              stdout: done.stdout,
              stderr: done.stderr,
              statements: done.statements,
              frames: done.frames,
              written: done.written,
              stopped: false,
            });
          } catch (error) {
            reject(error as Error);
          }
        },
        (error: Error) => {
          over();
          reject(error);
        },
      );
    });
  }

  /** Resolves once no run of the reader's is going: at once where none is. */
  whenIdle(): Promise<void> {
    return this.#idle;
  }

  /**
   * Run the text of an example of Help in a session of its own in the worker (release 0.3,
   * step 8): it sees the datasets the engine ships and the small files the engine's pages
   * read, and nothing of the project open here; what it writes is gone with it; and the
   * reader's run and everything kept of it stay as they were. `listener` hears its steps as a
   * run's are heard. It needs no project. One goes at a time (`examples.ts` keeps the queue);
   * it is stopped before its next step where it runs beyond `limit` milliseconds.
   */
  async example(
    text: string,
    listener?: (event: RunEvent) => void,
    width = 0,
    limit = EXAMPLE_LIMIT,
  ): Promise<ExampleOutcome> {
    await this.start();
    if (this.#example !== null) {
      throw new EngineError("an example is already running in this window");
    }
    const flag = sharedFlag();
    const going = { listener: listener ?? null, flag };
    this.#example = going;
    try {
      const done = expect(
        await this.#ask({
          type: "example",
          text,
          width,
          limit,
          cancel: flag === null ? null : (flag.buffer as SharedArrayBuffer),
        }),
        "exampleDone",
      );
      return {
        exitCode: done.exit_code,
        stdout: done.stdout,
        stderr: done.stderr,
        statements: done.statements,
        plots: done.plots,
        stopped: done.stopped,
      };
    } finally {
      if (this.#example === going) this.#example = null;
    }
  }

  /**
   * Ask the example that is running to end before its next step. `false` where none is
   * running, or there is no memory shared with the worker to ask through: it then runs to its
   * end, or to its limit.
   */
  stopExample(): boolean {
    const flag = this.#example?.flag ?? null;
    if (flag === null) return false;
    Atomics.store(flag, 0, 1);
    return true;
  }

  /**
   * The plot the statement on `line` of the last example made, as an SVG on a page `width` by
   * `height` millimetres, as `plotSvg` gives a plot of the reader's run.
   */
  async examplePlot(line: number, width: number, height: number): Promise<LaidOut> {
    const plot = expect(await this.#ask({ type: "examplePlot", line, width, height }), "plot");
    return { ran: plot.ran, held: plot.held, svg: plot.svg, message: plot.message };
  }

  /**
   * Ask the run to end before its next step. The engine answers with its own message and the
   * project stays as it is. `false` where there is no run, or no memory shared with the
   * worker to ask through.
   */
  cancel(): boolean {
    if (this.#running === null || this.#flag === null) {
      return false;
    }
    Atomics.store(this.#flag, 0, 1);
    return true;
  }

  /**
   * End the worker at once: the way to stop a run inside one long step, or where it cannot
   * be cancelled. The run ends as stopped, with what it had printed; the project in the
   * worker is gone, and must be opened and filled again before the next run.
   */
  stop(): void {
    const running = this.#running;
    this.#end(new EngineError("the engine's worker was ended"));
    running?.stop({
      exitCode: null,
      stdout: running.stdout,
      stderr: running.stderr,
      statements: [],
      frames: [],
      written: [],
      stopped: true,
    });
  }

  /** Close the project: the worker is ended, and the next project starts a new one. */
  close(): void {
    this.stop();
  }

  /** The statements of a text as the engine reads them, without running it. */
  async statements(script: string, text: string): Promise<Ranged[]> {
    return expect(await this.#ask({ type: "statements", script, text }), "statements").statements;
  }

  /**
   * The engine's reading of a text, without running it: its statements, and its sections
   * (open decision #178), which are of the same text by the one question.
   */
  async reading(
    script: string,
    text: string,
  ): Promise<{ ranges: Ranged[]; sections: Sectioned[] }> {
    const read = expect(await this.#ask({ type: "statements", script, text }), "statements");
    return { ranges: read.statements, sections: read.sections ?? [] };
  }

  /**
   * What each statement of the last run printed, made again at `width` characters without a
   * new run: what `zeff run --width` prints for it, character for character. `null` where the
   * engine's last run was not of this text (a run of some statements alone, a console line, a
   * worker started afresh): the text is then run again to have it.
   */
  async printedAt(script: string, text: string, width: number): Promise<Reprinted[] | null> {
    return expect(await this.#ask({ type: "printedAt", script, text, width }), "printed")
      .statements;
  }

  /**
   * The plot the statement on `line` of the last run made, as an SVG on a page `width` by
   * `height` millimetres, laid out by the engine from what the run kept, with nothing run: at
   * a size, the file `export` writes for it, byte for byte. Not `held` where the engine's last
   * run was not of this text, or the statement gave no plot of its own.
   */
  async plotSvg(
    script: string,
    text: string,
    line: number,
    width: number,
    height: number,
  ): Promise<LaidOut> {
    const plot = expect(
      await this.#ask({ type: "plotSvg", script, text, line, width, height }),
      "plot",
    );
    return { ran: plot.ran, held: plot.held, svg: plot.svg, message: plot.message };
  }

  /** The engine's check of a text of the project, as `zeff check` makes it. */
  async check(script: string, text: string): Promise<Checked> {
    const checked = expect(await this.#ask({ type: "check", script, text }), "checked");
    return {
      exitCode: checked.exit_code,
      said: checked.said,
      found: checked.found,
      summary: checked.summary,
      findings: checked.findings,
      ranges: checked.ranges,
    };
  }

  /**
   * One message of the Language Server Protocol for the engine's language server, over the
   * project this engine holds; the bodies of the messages it answers with, in order.
   */
  async language(body: string): Promise<string[]> {
    return expect(await this.#ask({ type: "language", body }), "language").messages;
  }

  /**
   * The help page of a function, as `zeff help <name>` prints it in the project this engine
   * holds; `page` is null where there is none, and `message` says why in the engine's words.
   */
  async help(name: string): Promise<{ page: string | null; message: string }> {
    const found = expect(await this.#ask({ type: "help", name }), "help");
    return { page: found.page, message: found.message };
  }

  /**
   * The index of the help: the packages the engine ships, their functions with their one
   * lines and their R and Stata names, and the shipped datasets. It needs no project.
   */
  async helpIndex(): Promise<HelpIndex> {
    const found = expect(await this.#ask({ type: "helpIndex" }), "helpIndex");
    return { engine: found.engine, packages: found.packages, datasets: found.datasets };
  }

  /** Every code with an explained page, by family, as `zeff explain` lists them. It needs no project. */
  async codes(): Promise<CodeFamily[]> {
    return expect(await this.#ask({ type: "codes" }), "codes").families;
  }

  /** A code's explained page, as `zeff explain` gives it. It needs no project. */
  async explain(code: string): Promise<ExplainedPage> {
    return expect(await this.#ask({ type: "explain", code }), "explained").page;
  }

  /** What each statement of a text of the project needs, from the engine's dependency graph. */
  async dependencies(script: string, text: string): Promise<Needs[]> {
    return expect(await this.#ask({ type: "dependencies", script, text }), "dependencies")
      .statements;
  }

  /**
   * Rows of a frame of the last run as the data viewer shows it, from `offset`, at most
   * `limit`, each cell as the engine prints it: kept to the rows of `view.where` as
   * `name.where(…)` keeps them, sorted as `data.sort` sorts, and kept to the rows a search
   * finds. The worker holds a filter until the next run, so one is run again where a run has
   * been made since; a filter the engine cannot run leaves every row, with what it said.
   */
  async rows(
    name: string,
    offset: number,
    limit: number,
    view: View = { where: "", sort: null, search: "" },
  ): Promise<Rows> {
    const where = view.where.trim();
    // A run that comes between the filter and the rows takes the worker's filter with it, and
    // the rows asked for would then be the whole frame's under a condition's name: so where a
    // run has started meanwhile, the filter is made again on the new frames and the rows
    // asked again.
    let filter: Filtered | null;
    let found;
    for (let tries = 0; ; tries += 1) {
      const runs = this.#runs;
      filter = null;
      if (where !== "") {
        const held = this.#filter;
        filter =
          held !== null && held.name === name && held.condition === where && held.runs === runs
            ? held.answer
            : await this.filter(name, where);
      }
      const asked: Request = {
        type: "rows",
        name,
        offset,
        limit,
        sort: view.sort?.variable ?? "",
        desc: view.sort?.desc ?? false,
        filtered: filter?.ok === true,
        search: view.search,
      };
      found = expect(await this.#ask(asked), "rows");
      if (filter?.ok !== true || this.#runs === runs || tries >= 4) break;
    }
    return {
      name: found.name,
      header: found.header,
      total: found.total,
      kept: found.kept,
      offset: found.offset,
      variables: found.variables,
      rows: found.rows,
      filter,
    };
  }

  /** The bug report of a script's failure, as `zeff report-bug` builds it: built in the worker and sent nowhere. */
  async report(script: string, text: string): Promise<Report> {
    const found = expect(await this.#ask({ type: "report", script, text }), "report");
    return found.ok
      ? {
          ok: true,
          kind: found.kind,
          code: found.code,
          name: found.name,
          text: found.text,
          kept: found.kept,
          of: found.of,
          reduced: found.reduced,
        }
      : { ok: false, message: found.message };
  }

  /** The bindings of a text with their types, as `zeff repl`'s `:vars` lists them: what it prints and says. */
  async vars(script: string, text: string): Promise<{ printed: string; said: string }> {
    const found = expect(await this.#ask({ type: "vars", script, text }), "vars");
    return { printed: found.printed, said: found.said };
  }

  /** Keep a frame of the last run to the rows of a condition, as `name.where(condition)` keeps them. */
  async filter(name: string, condition: string): Promise<Filtered> {
    const runs = this.#runs;
    const found = expect(await this.#ask({ type: "filter", name, condition }), "filter");
    const answer = { ok: found.ok, rows: found.rows, said: found.said };
    this.#filter = { name, condition, runs, answer };
    return answer;
  }

  /** A frame of the last run, by the name of its binding, as the bytes of an Arrow stream. */
  async frame(name: string): Promise<Uint8Array> {
    return expect(await this.#ask({ type: "frame", name }), "frame").bytes;
  }

  /** A file of the project, one put in or one a run wrote, or `null` where there is none. */
  async read(path: string): Promise<Uint8Array | null> {
    return expect(await this.#ask({ type: "read", path }), "read").bytes;
  }

  #ask(request: Request, transfer?: Transferable[]): Promise<Reply> {
    const worker = this.#worker;
    if (worker === null) {
      return Promise.reject(new EngineError("the engine's worker is not started"));
    }
    const id = this.#nextId++;
    return new Promise<Reply>((resolve, reject) => {
      this.#waiting.set(id, { resolve, reject });
      worker.postMessage({ ...request, id }, transfer);
    });
  }

  #hear(said: Exclude<FromWorker, { type: "ready" }>): void {
    if (
      said.type === "ranges" ||
      said.type === "started" ||
      said.type === "finished" ||
      said.type === "pass" ||
      said.type === "output"
    ) {
      if (said.example === true) {
        // An example's, not the reader's run's.
        this.#example?.listener?.(said);
        return;
      }
      const running = this.#running;
      if (running !== null) {
        if (said.type === "output") {
          running.stdout += said.stdout;
          running.stderr += said.stderr;
        }
        running.listener?.(said);
      }
      return;
    }
    const waiting = said.id === undefined ? undefined : this.#waiting.get(said.id);
    if (said.id === undefined || waiting === undefined) {
      return;
    }
    this.#waiting.delete(said.id);
    waiting.resolve(said);
  }

  /** End the worker and everything that waits on it. */
  #end(error: Error): void {
    this.#worker?.terminate();
    this.#worker = null;
    this.#ready = null;
    this.#project = null;
    this.#flag = null;
    this.#running = null;
    this.#example = null;
    const waiting = [...this.#waiting.values()];
    this.#waiting.clear();
    for (const one of waiting) {
      one.reject(error);
    }
  }
}

/** The reply, where it is of the kind asked for; the worker's own words as an error otherwise. */
function expect<Kind extends Reply["type"]>(
  reply: Reply,
  kind: Kind,
): Extract<Reply, { type: Kind }> {
  if (reply.type === kind) {
    return reply as Extract<Reply, { type: Kind }>;
  }
  throw new EngineError(
    reply.type === "error"
      ? reply.message
      : `the worker answered \`${reply.type}\`, not \`${kind}\``,
  );
}

/**
 * The cancel flag: four bytes the interface and the worker share. A browser gives shared
 * memory only to a page that is cross-origin isolated; elsewhere there is none.
 */
function sharedFlag(): Int32Array | null {
  const isolated = (globalThis as { crossOriginIsolated?: boolean }).crossOriginIsolated;
  if (typeof SharedArrayBuffer === "undefined" || isolated === false) {
    return null;
  }
  return new Int32Array(new SharedArrayBuffer(4));
}
