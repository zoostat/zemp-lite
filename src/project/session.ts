// A project open in a window, with the engine it runs in. The project's files are kept in
// the browser's private file system; the engine has its own copy in the worker's memory. A
// session keeps the second in step with the first: before a run it gives the engine every
// file once, and afterwards only the files changed since.
import type { Outcome, RunEvent } from "../engine/messages";
import type { Project } from "./projects";

/** As much of the engine as a session uses. */
export interface Runs {
  readonly project: string | null;
  open(name: string): Promise<void>;
  put(path: string, bytes: Uint8Array): Promise<void>;
  run(
    script: string,
    text: string,
    listener?: (event: RunEvent) => void,
    width?: number,
  ): Promise<Outcome>;
}

export class Session {
  readonly project: Project;
  readonly #engine: Runs;
  /** The files changed since the engine was last given them. */
  readonly #changed = new Set<string>();
  /** Whether the engine must be given the whole project again. */
  #refill = true;

  constructor(project: Project, engine: Runs) {
    this.project = project;
    this.#engine = engine;
  }

  /** A file of the project was written: the engine is given it before the next run. */
  changed(path: string): void {
    this.#changed.add(path);
  }

  /** A file was removed or renamed: the engine is given the whole project afresh. */
  removed(): void {
    this.#refill = true;
  }

  /**
   * Run the text of a script of the project, the engine first brought in step with the
   * project's files. The text is what the editor holds, saved or not; `width` is the
   * characters tables are printed at, 0 for the engine's own.
   */
  async run(
    script: string,
    text: string,
    listener?: (event: RunEvent) => void,
    width = 0,
  ): Promise<Outcome> {
    // A worker that was ended and started again holds no project.
    if (this.#refill || this.#engine.project === null) {
      await this.#engine.open(this.project.info.name);
      for (const file of await this.project.files()) {
        await this.#engine.put(file.path, file.bytes);
      }
      this.#refill = false;
    } else {
      for (const path of this.#changed) {
        const bytes = await this.project.read(path);
        if (bytes !== null) {
          await this.#engine.put(path, bytes);
        }
      }
    }
    this.#changed.clear();
    return this.#engine.run(script, text, listener, width);
  }
}
