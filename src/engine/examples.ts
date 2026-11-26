// The examples of Help waiting to run (release 0.3, step 8; open decision #211, item 11). The
// engine's worker does one thing at a time, and an example is run in it beside the reader's
// own work, in a session of its own. This keeps the examples in their order and out of the
// reader's way:
//
// - one example runs at a time, in the order asked;
// - an example waits its turn behind a run of the reader's, and where the reader begins a run
//   while an example is going, the example is stopped before its next step and run again,
//   from its start, once the reader's run has ended;
// - the examples of a page that is left are dropped: those that wait are never run, and the
//   one that is running is stopped; whoever asked is told `null`, not an outcome.
import type { ExampleOutcome, RunEvent } from "./messages";

/** As much of the engine as the queue uses, so that a test can stand in for it. */
export interface ExampleRunner {
  /** Resolves once no run of the reader's is going. */
  whenIdle(): Promise<void>;
  example(
    text: string,
    listener?: (event: RunEvent) => void,
    width?: number,
    limit?: number,
  ): Promise<ExampleOutcome>;
  /** Ask the example that is running to end before its next step. */
  stopExample(): boolean;
}

/** An example asked for. */
export interface Asked {
  /** Who asks: the page it stands on, by which its examples are dropped together. */
  owner: string;
  text: string;
  /**
   * Hears its steps as a run's are heard. An example the reader's run interrupted is run
   * again and heard again from its first event, `ranges`.
   */
  listener?: (event: RunEvent) => void;
  /** The characters its tables are printed at; 0 for the engine's own. */
  width?: number;
  /** The milliseconds it may run; the engine's own limit where none is given. */
  limit?: number;
}

interface Entry extends Asked {
  dropped: boolean;
  resolve: (outcome: ExampleOutcome | null) => void;
  reject: (error: Error) => void;
}

export class Examples {
  readonly #runner: ExampleRunner;
  /** Those asked for and not yet answered, the first of them the one that runs next. */
  readonly #waiting: Entry[] = [];
  /** The one in the worker now. */
  #going: Entry | null = null;
  #pumping = false;

  constructor(runner: ExampleRunner) {
    this.#runner = runner;
  }

  /** How many are asked for and not yet answered. */
  get length(): number {
    return this.#waiting.length;
  }

  /**
   * Run an example when its turn comes. Its outcome; or `null` where it was dropped before it
   * ended (`drop`). Rejects where the engine could not run it (its worker was ended).
   */
  ask(asked: Asked): Promise<ExampleOutcome | null> {
    return new Promise((resolve, reject) => {
      this.#waiting.push({ ...asked, dropped: false, resolve, reject });
      void this.#pump();
    });
  }

  /**
   * Drop the examples of an owner (its page was left), or of every owner: those that wait are
   * never run, and the one that is running is stopped before its next step.
   */
  drop(owner?: string): void {
    for (const entry of [...this.#waiting]) {
      if (owner !== undefined && entry.owner !== owner) continue;
      entry.dropped = true;
      if (entry === this.#going) {
        // Answered when the worker gives it back (`#pump`).
        this.#runner.stopExample();
      } else {
        this.#waiting.splice(this.#waiting.indexOf(entry), 1);
        entry.resolve(null);
      }
    }
  }

  async #pump(): Promise<void> {
    if (this.#pumping) return;
    this.#pumping = true;
    try {
      for (;;) {
        const entry = this.#waiting[0];
        if (entry === undefined) break;
        // Behind the reader's own run.
        await this.#runner.whenIdle();
        // Dropped while it waited: it is gone from the queue already.
        if (this.#waiting[0] !== entry) continue;
        this.#going = entry;
        let outcome: ExampleOutcome;
        try {
          outcome = await this.#runner.example(
            entry.text,
            entry.listener,
            entry.width,
            entry.limit,
          );
        } catch (error) {
          this.#going = null;
          this.#waiting.shift();
          if (entry.dropped) entry.resolve(null);
          else entry.reject(error as Error);
          continue;
        }
        this.#going = null;
        if (entry.dropped) {
          this.#waiting.shift();
          entry.resolve(null);
        } else if (outcome.stopped === "asked") {
          // Not dropped, and yet stopped: the reader began a run. It keeps its place, and is
          // run again once that run has ended.
          continue;
        } else {
          this.#waiting.shift();
          entry.resolve(outcome);
        }
      }
    } finally {
      this.#pumping = false;
    }
  }
}
