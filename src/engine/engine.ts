// The interface's side of the engine's worker. One `Engine` belongs to one window: it starts
// the worker, opens the window's project in it, puts the project's files there, runs a script
// and hears each step as it goes, cancels a run, and reads back a frame or a file. When a
// project closes the worker is ended, which returns its memory to the browser (Engine and
// Project Specification, section 8.3, point 7), and the next project starts a new one.
import type { FromWorker, Outcome, Reply, Request, RunEvent } from "./messages";

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

export class Engine {
  readonly #spawn: () => WorkerLike;
  #worker: WorkerLike | null = null;
  #ready: Promise<string> | null = null;
  #version: string | null = null;
  #waiting = new Map<number, Waiting>();
  #nextId = 1;
  #flag: Int32Array | null = null;
  #running: Running | null = null;
  #project: string | null = null;

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
   * Run the text of a script of the project (`script` is its path there). `listener` hears
   * each step as it starts and ends, each pass of a loop, and each piece of output. One run
   * goes at a time.
   */
  run(script: string, text: string, listener?: (event: RunEvent) => void): Promise<Outcome> {
    if (this.#running !== null) {
      return Promise.reject(new EngineError("a run is already going in this window"));
    }
    if (this.#project === null) {
      return Promise.reject(new EngineError("no project is open in the engine"));
    }
    // The flag is the interface's: cleared before a run is asked for.
    if (this.#flag !== null) {
      Atomics.store(this.#flag, 0, 0);
    }
    return new Promise<Outcome>((resolve, reject) => {
      const running: Running = {
        listener: listener ?? null,
        stdout: "",
        stderr: "",
        stop: resolve,
      };
      this.#running = running;
      // This run is over; a run started since is not touched.
      const over = () => {
        if (this.#running === running) {
          this.#running = null;
        }
      };
      this.#ask({ type: "run", script, text }).then(
        (reply) => {
          over();
          try {
            const done = expect(reply, "done");
            resolve({
              exitCode: done.exit_code,
              stdout: done.stdout,
              stderr: done.stderr,
              frames: done.frames,
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
      frames: [],
      stopped: true,
    });
  }

  /** Close the project: the worker is ended, and the next project starts a new one. */
  close(): void {
    this.stop();
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
      said.type === "started" ||
      said.type === "finished" ||
      said.type === "pass" ||
      said.type === "output"
    ) {
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
