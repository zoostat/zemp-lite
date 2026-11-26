import { describe, expect, it } from "vitest";
import { Examples, type ExampleRunner } from "./examples";
import type { ExampleOutcome, RunEvent } from "./messages";

const outcome = (stdout: string, stopped: ExampleOutcome["stopped"] = null): ExampleOutcome => ({
  exitCode: stopped === null ? 0 : 1,
  stdout,
  stderr: "",
  statements: [],
  plots: [],
  stopped,
});

/**
 * A stand-in for the engine: it keeps the examples given to it, each ended by the test; a
 * reader's run is begun and ended by the test too.
 */
class Stand implements ExampleRunner {
  /** The texts given to the worker, in order. */
  ran: string[] = [];
  stops = 0;
  #end: ((outcome: ExampleOutcome) => void) | null = null;
  #fail: ((error: Error) => void) | null = null;
  #idle: Promise<void> = Promise.resolve();
  #free: () => void = () => {};
  listener: ((event: RunEvent) => void) | undefined;

  whenIdle(): Promise<void> {
    return this.#idle;
  }

  example(text: string, listener?: (event: RunEvent) => void): Promise<ExampleOutcome> {
    if (this.#end !== null) return Promise.reject(new Error("two examples at once"));
    this.ran.push(text);
    this.listener = listener;
    return new Promise((resolve, reject) => {
      this.#end = resolve;
      this.#fail = reject;
    });
  }

  stopExample(): boolean {
    this.stops += 1;
    return true;
  }

  /** Whether an example is in the worker. */
  get going(): boolean {
    return this.#end !== null;
  }

  /** The example in the worker ends. */
  end(with_: ExampleOutcome): void {
    const end = this.#end;
    this.#end = null;
    end?.(with_);
  }

  /** The worker is ended under the example. */
  fail(error: Error): void {
    const fail = this.#fail;
    this.#end = null;
    fail?.(error);
  }

  /** The reader begins a run; what ends it. */
  readerRuns(): () => void {
    this.#idle = new Promise((resolve) => (this.#free = resolve));
    return () => this.#free();
  }
}

/** Let everything that waits on a settled promise go on. */
const settle = async () => {
  for (let turn = 0; turn < 10; turn += 1) await Promise.resolve();
};

describe("the examples of Help waiting to run", () => {
  it("run one at a time, in the order asked", async () => {
    const stand = new Stand();
    const queue = new Examples(stand);
    const first = queue.ask({ owner: "reg", text: "a" });
    const second = queue.ask({ owner: "reg", text: "b" });
    const third = queue.ask({ owner: "mean", text: "c" });
    await settle();
    expect(stand.ran).toEqual(["a"]);
    expect(queue.length).toBe(3);
    stand.end(outcome("A\n"));
    expect((await first)?.stdout).toBe("A\n");
    await settle();
    expect(stand.ran).toEqual(["a", "b"]);
    stand.end(outcome("B\n"));
    expect((await second)?.stdout).toBe("B\n");
    await settle();
    stand.end(outcome("C\n"));
    expect((await third)?.stdout).toBe("C\n");
    expect(stand.ran).toEqual(["a", "b", "c"]);
    expect(queue.length).toBe(0);
  });

  it("wait their turn behind a run of the reader's", async () => {
    const stand = new Stand();
    const queue = new Examples(stand);
    const ended = stand.readerRuns();
    const asked = queue.ask({ owner: "reg", text: "a" });
    await settle();
    expect(stand.ran).toEqual([]);
    ended();
    await settle();
    expect(stand.ran).toEqual(["a"]);
    stand.end(outcome("A\n"));
    expect((await asked)?.stdout).toBe("A\n");
  });

  it("are run again, from the start, where the reader's run stopped one, and keep their order", async () => {
    const stand = new Stand();
    const queue = new Examples(stand);
    const heard: string[] = [];
    const first = queue.ask({
      owner: "reg",
      text: "a",
      listener: (event) => heard.push(event.type),
    });
    const second = queue.ask({ owner: "reg", text: "b" });
    await settle();
    stand.listener?.({ type: "ranges", statements: [] });
    // The reader begins a run: the engine stops the example, which ends as stopped when asked.
    const ended = stand.readerRuns();
    stand.end(outcome("", "asked"));
    await settle();
    // It is not answered, and nothing is run while the reader's run goes.
    expect(stand.ran).toEqual(["a"]);
    expect(queue.length).toBe(2);
    ended();
    await settle();
    expect(stand.ran).toEqual(["a", "a"]);
    stand.listener?.({ type: "ranges", statements: [] });
    stand.end(outcome("A\n"));
    expect((await first)?.stdout).toBe("A\n");
    expect(heard).toEqual(["ranges", "ranges"]);
    await settle();
    expect(stand.ran).toEqual(["a", "a", "b"]);
    stand.end(outcome("B\n"));
    expect((await second)?.stdout).toBe("B\n");
  });

  it("are dropped with their page: those that wait are never run, the one running is stopped", async () => {
    const stand = new Stand();
    const queue = new Examples(stand);
    const running = queue.ask({ owner: "reg", text: "a" });
    const waiting = queue.ask({ owner: "reg", text: "b" });
    const other = queue.ask({ owner: "mean", text: "c" });
    await settle();
    queue.drop("reg");
    // The one that waited is answered at once, with no outcome.
    expect(await waiting).toBeNull();
    expect(stand.stops).toBe(1);
    // The one running is answered when the worker gives it back, whatever it gives.
    stand.end(outcome("", "asked"));
    expect(await running).toBeNull();
    await settle();
    // The other page's example runs, and the dropped ones never do.
    expect(stand.ran).toEqual(["a", "c"]);
    stand.end(outcome("C\n"));
    expect((await other)?.stdout).toBe("C\n");
    expect(queue.length).toBe(0);
  });

  it("are all dropped where no owner is named, and one dropped while the reader's run goes is never run", async () => {
    const stand = new Stand();
    const queue = new Examples(stand);
    const ended = stand.readerRuns();
    const first = queue.ask({ owner: "reg", text: "a" });
    const second = queue.ask({ owner: "mean", text: "b" });
    await settle();
    queue.drop();
    expect(await first).toBeNull();
    expect(await second).toBeNull();
    ended();
    await settle();
    expect(stand.ran).toEqual([]);
    expect(stand.stops).toBe(0);
    // The queue goes on: an example asked for afterwards runs.
    const third = queue.ask({ owner: "reg", text: "c" });
    await settle();
    stand.end(outcome("C\n"));
    expect((await third)?.stdout).toBe("C\n");
  });

  it("tell an example that ran beyond its time as it ended, and one the engine could not run as an error", async () => {
    const stand = new Stand();
    const queue = new Examples(stand);
    const slow = queue.ask({ owner: "reg", text: "a" });
    const lost = queue.ask({ owner: "reg", text: "b" });
    const after = queue.ask({ owner: "reg", text: "c" });
    await settle();
    stand.end(outcome("started\n", "slow"));
    expect((await slow)?.stopped).toBe("slow");
    await settle();
    stand.fail(new Error("the engine's worker was ended"));
    await expect(lost).rejects.toThrow("the engine's worker was ended");
    await settle();
    stand.end(outcome("C\n"));
    expect((await after)?.stdout).toBe("C\n");
  });

  it("ask an example's session for its plots before the next example takes its place", async () => {
    const stand = new Stand();
    const queue = new Examples(stand);
    const order: string[] = [];
    let laid: () => void = () => {};
    const first = queue.ask({
      owner: "scatter",
      text: "a",
      after: (given) => {
        order.push(`plots of ${given.stdout.trim()}`);
        return new Promise<void>((resolve) => (laid = resolve));
      },
    });
    const second = queue.ask({ owner: "scatter", text: "b" });
    await settle();
    stand.end(outcome("A\n"));
    await settle();
    // The plots are being laid out: the next example is not in the worker yet.
    expect(order).toEqual(["plots of A"]);
    expect(stand.ran).toEqual(["a"]);
    laid();
    expect((await first)?.stdout).toBe("A\n");
    await settle();
    expect(stand.ran).toEqual(["a", "b"]);
    stand.end(outcome("B\n"));
    expect((await second)?.stdout).toBe("B\n");
  });
});
