// A project open in a window, with the engine it runs in. The project's files are kept in
// the browser's private file system; the engine has its own copy in the worker's memory. A
// session keeps the second in step with the first: before a run it gives the engine every
// file once, and afterwards only the files changed since, and has it forget those that are
// gone from the project.
import type { Checked, Needs, Outcome, RunEvent } from "../engine/messages";
import type { Project } from "./projects";

/** As much of the engine as a session uses. */
export interface Runs {
  readonly project: string | null;
  open(name: string): Promise<void>;
  put(path: string, bytes: Uint8Array): Promise<void>;
  remove(path: string): Promise<boolean>;
  run(
    script: string,
    text: string,
    listener?: (event: RunEvent) => void,
    width?: number,
    only?: number[],
  ): Promise<Outcome>;
  check(script: string, text: string): Promise<Checked>;
  dependencies(script: string, text: string): Promise<Needs[]>;
}

export class Session {
  readonly project: Project;
  readonly #engine: Runs;
  /** The files changed since the engine was last given them. */
  readonly #changed = new Set<string>();
  /** The files and folders gone from the project since then, which the engine still holds. */
  readonly #gone = new Set<string>();
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

  /**
   * A file or a folder is gone from the project (deleted, or renamed or moved, in which case
   * what it now is was `changed`): the engine forgets it before the next run, and keeps the
   * frames of the last one.
   */
  gone(path: string): void {
    this.#gone.add(path);
    // What lay in a folder that is gone is not given to the engine again.
    for (const changed of this.#changed) {
      if (changed === path || changed.startsWith(`${path}/`)) this.#changed.delete(changed);
    }
  }

  /** The engine is to be given the whole project afresh, whatever it holds. */
  removed(): void {
    this.#refill = true;
  }

  /**
   * Run the text of a script of the project, the engine first brought in step with the
   * project's files. The text is what the editor holds, saved or not; `width` is the
   * characters tables are printed at, 0 for the engine's own; `only`, where given, the lines
   * of the statements to run alone.
   */
  async run(
    script: string,
    text: string,
    listener?: (event: RunEvent) => void,
    width = 0,
    only?: number[],
  ): Promise<Outcome> {
    await this.sync();
    return this.#engine.run(script, text, listener, width, only);
  }

  /** The engine's check of a text, the engine first brought in step with the project's files. */
  async check(script: string, text: string): Promise<Checked> {
    await this.sync();
    return this.#engine.check(script, text);
  }

  /** What each statement of a text needs, from the engine's dependency graph. */
  async dependencies(script: string, text: string): Promise<Needs[]> {
    await this.sync();
    return this.#engine.dependencies(script, text);
  }

  /** Bring the engine in step with the project's files. */
  async sync(): Promise<void> {
    // A worker that was ended and started again holds no project.
    if (this.#refill || this.#engine.project === null) {
      await this.#engine.open(this.project.info.name);
      for (const file of await this.project.files()) {
        await this.#engine.put(file.path, file.bytes);
      }
      this.#refill = false;
    } else {
      // What is gone is forgotten first: a file moved to a path that was another's is given after.
      for (const path of this.#gone) await this.#engine.remove(path);
      for (const path of this.#changed) {
        const bytes = await this.project.read(path);
        if (bytes !== null) {
          await this.#engine.put(path, bytes);
        }
      }
    }
    this.#changed.clear();
    this.#gone.clear();
  }
}
