import { describe, expect, it } from "vitest";
import { Engine, EngineError, type WorkerLike } from "./engine";
import type { RunEvent } from "./messages";

/**
 * A stand-in for the worker: it keeps what the interface sent, and says what a test tells it
 * to say. `ended` is true once the interface has ended it.
 */
class Stand implements WorkerLike {
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: { message?: string }) => void) | null = null;
  sent: Record<string, unknown>[] = [];
  transfers: (Transferable[] | undefined)[] = [];
  ended = false;

  postMessage(message: unknown, transfer?: Transferable[]): void {
    this.sent.push(message as Record<string, unknown>);
    this.transfers.push(transfer);
  }

  terminate(): void {
    this.ended = true;
  }

  say(message: Record<string, unknown>): void {
    this.onmessage?.({ data: message });
  }

  /** The last message the interface sent. */
  get last(): Record<string, unknown> {
    const last = this.sent.at(-1);
    if (last === undefined) throw new Error("nothing was sent");
    return last;
  }

  /** Answer the last message sent, with its `id`. */
  answer(reply: Record<string, unknown>): void {
    this.say({ ...reply, id: this.last["id"] });
  }
}

/** One statement of a run, as the worker's outcome gives it. */
const one = {
  line: 1,
  end: 1,
  kind: "statement",
  name: null,
  type: "Nothing",
  ran: true,
  stdout: "one\n",
  stderr: "",
  frame: null,
  memory: null,
};

/** An engine, and the stand-ins it has started, the newest last. */
function engine(): { engine: Engine; workers: Stand[] } {
  const workers: Stand[] = [];
  const made = new Engine(() => {
    const worker = new Stand();
    workers.push(worker);
    return worker;
  });
  return { engine: made, workers };
}

/** An engine started, with a project open in it. */
async function opened(): Promise<{ engine: Engine; worker: Stand; workers: Stand[] }> {
  const { engine: made, workers } = engine();
  const start = made.start();
  const worker = workers[0]!;
  worker.say({ type: "ready", version: "0.8.0" });
  await start;
  const open = made.open("demo");
  await Promise.resolve();
  worker.answer({ type: "opened", name: "demo" });
  await open;
  return { engine: made, worker, workers };
}

/** Let the promises that are ready run. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("the engine, from the interface's side", () => {
  it("starts one worker and gives the engine's version", async () => {
    const { engine: made, workers } = engine();
    expect(made.version).toBeNull();
    const first = made.start();
    const second = made.start();
    expect(workers).toHaveLength(1);
    workers[0]!.say({ type: "ready", version: "0.8.0" });
    expect(await first).toBe("0.8.0");
    expect(await second).toBe("0.8.0");
    expect(made.version).toBe("0.8.0");
  });

  it("opens a project with a cancel flag the two sides share", async () => {
    const { engine: made, worker } = await opened();
    expect(worker.last).toMatchObject({ type: "open", name: "demo" });
    expect(worker.last["cancel"]).toBeInstanceOf(SharedArrayBuffer);
    expect((worker.last["cancel"] as SharedArrayBuffer).byteLength).toBe(4);
    expect(made.project).toBe("demo");
    expect(made.cancellable).toBe(true);
  });

  it("gives every message an id of its own and matches each answer to its question", async () => {
    const { engine: made, worker } = await opened();
    const figure = made.read("output/a.svg");
    const missing = made.read("output/b.svg");
    await settle();
    const [first, second] = worker.sent.slice(-2);
    expect(first!["id"]).not.toBe(second!["id"]);
    // Answered out of order, each goes to the one that asked.
    worker.say({ type: "read", path: "output/b.svg", bytes: null, id: second!["id"] });
    worker.say({
      type: "read",
      path: "output/a.svg",
      bytes: new Uint8Array([1, 2]),
      id: first!["id"],
    });
    expect(await missing).toBeNull();
    expect(await figure).toEqual(new Uint8Array([1, 2]));
  });

  it("puts a file into the project, passing its bytes and not copying them", async () => {
    const { engine: made, worker } = await opened();
    const bytes = new TextEncoder().encode("id\n1\n");
    const put = made.put("data/pay.csv", bytes);
    await settle();
    expect(worker.last).toMatchObject({ type: "file", path: "data/pay.csv" });
    expect(worker.transfers.at(-1)).toEqual([bytes.buffer]);
    worker.answer({ type: "filed", path: "data/pay.csv" });
    await put;
  });

  it("runs a script, tells each event as it comes, and gives the outcome", async () => {
    const { engine: made, worker } = await opened();
    const heard: RunEvent[] = [];
    const run = made.run("scripts/main.zeff", 'print("one")\n', (event) => heard.push(event));
    await settle();
    expect(made.running).toBe(true);
    expect(worker.last).toMatchObject({
      type: "run",
      script: "scripts/main.zeff",
      text: 'print("one")\n',
      width: 0,
    });
    worker.say({ type: "ranges", statements: [{ line: 1, end: 1, kind: "statement" }] });
    worker.say({ type: "started", statement: 1, of: 1, line: 1 });
    worker.say({ type: "output", stdout: "one\n", stderr: "" });
    worker.say({ type: "finished", statement: 1, of: 1, line: 1, failed: false });
    worker.answer({
      type: "done",
      exit_code: 0,
      stdout: "one\n",
      stderr: "",
      statements: [one],
      frames: [{ name: "pay", rows: 3, variables: 2 }],
    });
    expect(await run).toEqual({
      exitCode: 0,
      stdout: "one\n",
      stderr: "",
      statements: [one],
      frames: [{ name: "pay", rows: 3, variables: 2 }],
      stopped: false,
    });
    expect(heard.map((event) => event.type)).toEqual(["ranges", "started", "output", "finished"]);
    expect(made.running).toBe(false);
  });

  it("lets one run go at a time, and none without a project", async () => {
    const { engine: made, worker } = await opened();
    const run = made.run("scripts/main.zeff", "1\n");
    await expect(made.run("scripts/main.zeff", "2\n")).rejects.toThrow("a run is already going");
    await settle();
    worker.answer({ type: "done", exit_code: 0, stdout: "", stderr: "", frames: [] });
    await run;
    const { engine: closed } = engine();
    await expect(closed.run("scripts/main.zeff", "1\n")).rejects.toThrow("no project is open");
  });

  it("cancels a run by writing the flag, which it clears before the next run", async () => {
    const { engine: made, worker } = await opened();
    expect(made.cancel()).toBe(false);
    const flag = new Int32Array(worker.sent[0]!["cancel"] as SharedArrayBuffer);
    const run = made.run("scripts/main.zeff", "for i in 1..9 { }\n");
    await settle();
    expect(made.cancel()).toBe(true);
    expect(flag[0]).toBe(1);
    // The engine answers in its own words: the interface writes none.
    worker.answer({
      type: "done",
      exit_code: 1,
      stdout: "",
      stderr: "error[Z0705]: the run was cancelled before pass 4 of this loop\n",
      frames: [],
    });
    const outcome = await run;
    expect(outcome.exitCode).toBe(1);
    expect(outcome.stopped).toBe(false);
    expect(made.project).toBe("demo");
    const again = made.run("scripts/main.zeff", "1\n");
    await settle();
    expect(flag[0]).toBe(0);
    worker.answer({ type: "done", exit_code: 0, stdout: "", stderr: "", frames: [] });
    await again;
  });

  it("stops a run by ending the worker, keeping what the run had printed", async () => {
    const { engine: made, worker, workers } = await opened();
    const run = made.run("scripts/main.zeff", "long()\n");
    await settle();
    worker.say({ type: "output", stdout: "so far\n", stderr: "note: a note\n" });
    const pending = made.read("output/a.svg");
    pending.catch(() => undefined);
    made.stop();
    expect(await run).toEqual({
      exitCode: null,
      stdout: "so far\n",
      stderr: "note: a note\n",
      statements: [],
      frames: [],
      written: [],
      stopped: true,
    });
    await expect(pending).rejects.toBeInstanceOf(EngineError);
    expect(worker.ended).toBe(true);
    expect(made.project).toBeNull();
    expect(made.running).toBe(false);
    // The next project starts a new worker.
    const start = made.start();
    expect(workers).toHaveLength(2);
    workers[1]!.say({ type: "ready", version: "0.8.0" });
    await start;
  });

  it("ends the worker when the project closes", async () => {
    const { engine: made, worker } = await opened();
    made.close();
    expect(worker.ended).toBe(true);
    expect(made.project).toBeNull();
  });

  it("gives the worker's own words when it cannot do what was asked", async () => {
    const { engine: made, worker } = await opened();
    const frame = made.frame("n");
    await settle();
    worker.answer({ type: "error", message: "no frame called `n` in the last run" });
    await expect(frame).rejects.toThrow("no frame called `n` in the last run");
    const good = made.frame("pay");
    await settle();
    worker.answer({ type: "frame", name: "pay", bytes: new Uint8Array([255, 255, 255, 255]) });
    expect(await good).toEqual(new Uint8Array([255, 255, 255, 255]));
  });

  it("fails everything that waits when the worker fails", async () => {
    const { engine: made, worker } = await opened();
    const run = made.run("scripts/main.zeff", "1\n");
    await settle();
    worker.onerror?.({ message: "out of memory" });
    await expect(run).rejects.toThrow("the engine's worker failed: out of memory");
    expect(made.project).toBeNull();
  });
});

describe("what the engine tells of statements", () => {
  it("asks for a run at a width, and gives the statements of a text without running it", async () => {
    const { engine: made, worker } = await opened();
    const run = made.run("scripts/main.zeff", "1 + 1\n", undefined, 60);
    await settle();
    expect(worker.last).toMatchObject({ type: "run", width: 60 });
    worker.answer({
      type: "done",
      exit_code: 0,
      stdout: "",
      stderr: "",
      statements: [],
      frames: [],
    });
    await run;
    const asked = made.statements("scripts/main.zeff", "let a = 1\nlet b =\n  2\n");
    await settle();
    expect(worker.last).toMatchObject({
      type: "statements",
      script: "scripts/main.zeff",
      text: "let a = 1\nlet b =\n  2\n",
    });
    const told = [
      { line: 1, end: 1, kind: "statement" },
      { line: 2, end: 3, kind: "statement" },
    ];
    worker.answer({ type: "statements", statements: told });
    expect(await asked).toEqual(told);
  });
});

describe("Check and the dependencies", () => {
  it("asks for the check of a text and gives the engine's answer", async () => {
    const { engine: made, worker } = await opened();
    const asked = made.check("scripts/main.zeff", "nosuch(1)\n");
    await settle();
    expect(worker.last).toMatchObject({ type: "check", script: "scripts/main.zeff" });
    worker.answer({
      type: "checked",
      exit_code: 1,
      said: "error[Z0103]: …\n\nscripts/main.zeff: 1 error, 0 warnings\n",
      found: "error[Z0103]: …\n",
      summary: "scripts/main.zeff: 1 error, 0 warnings",
      findings: [{ code: "Z0103" }],
      ranges: [{ line: 1, end: 1, kind: "statement" }],
    });
    expect(await asked).toEqual({
      exitCode: 1,
      said: "error[Z0103]: …\n\nscripts/main.zeff: 1 error, 0 warnings\n",
      found: "error[Z0103]: …\n",
      summary: "scripts/main.zeff: 1 error, 0 warnings",
      findings: [{ code: "Z0103" }],
      ranges: [{ line: 1, end: 1, kind: "statement" }],
    });
  });

  it("asks for the dependencies, and for a run of chosen statements", async () => {
    const { engine: made, worker } = await opened();
    const asked = made.dependencies("scripts/main.zeff", "let a = 1\na\n");
    await settle();
    const told = [
      { line: 1, makes: "a", reads: [], seeds: false, needs: [1] },
      { line: 2, makes: null, reads: [1], seeds: false, needs: [1, 2] },
    ];
    worker.answer({ type: "dependencies", statements: told });
    expect(await asked).toEqual(told);
    const run = made.run("scripts/main.zeff", "let a = 1\na\n", undefined, 0, [1, 2]);
    await settle();
    expect(worker.last).toMatchObject({ type: "run", only: [1, 2] });
    worker.answer({
      type: "done",
      exit_code: 0,
      stdout: "",
      stderr: "",
      statements: [],
      frames: [],
    });
    await run;
    // A whole run sends no `only`.
    const whole = made.run("scripts/main.zeff", "1\n");
    await settle();
    expect(worker.last).not.toHaveProperty("only");
    worker.answer({
      type: "done",
      exit_code: 0,
      stdout: "",
      stderr: "",
      statements: [],
      frames: [],
    });
    await whole;
  });
});

describe("a code's explained page", () => {
  it("is asked for by its code, and given as the engine words it", async () => {
    const { engine: made, worker } = await opened();
    const asked = made.explain("W0201");
    await settle();
    expect(worker.last).toMatchObject({ type: "explain", code: "W0201" });
    const page = { code: "W0201", kind: "warning", title: "missing values", text: "W0201 — …\n" };
    worker.answer({ type: "explained", page });
    expect(await asked).toEqual(page);
    const none = made.explain("Q9999");
    await settle();
    worker.answer({ type: "error", message: "no code `Q9999` has an explained page" });
    await expect(none).rejects.toThrow("no code `Q9999` has an explained page");
  });
});

describe("a function's help page", () => {
  it("is asked for by its name, and given with the engine's reason where there is none", async () => {
    const { engine: made, worker } = await opened();
    const asked = made.help("summary");
    await settle();
    expect(worker.last).toMatchObject({ type: "help", name: "summary" });
    worker.answer({ type: "help", page: "summary — …\n", message: "" });
    expect(await asked).toEqual({ page: "summary — …\n", message: "" });
  });
});

describe("the index of the help", () => {
  it("is asked for without a project's name, and given as the engine lists it", async () => {
    const { engine: made, worker } = await opened();
    const asked = made.helpIndex();
    await settle();
    expect(worker.last).toMatchObject({ type: "helpIndex" });
    const index = {
      engine: "0.8.0",
      packages: [
        {
          name: "regress",
          tier: 2,
          functions: [
            {
              name: "reg",
              summary: "Linear regression",
              names: [
                { of: "R" as const, name: "lm", shown: "lm()", from: "catalogue" as const },
                {
                  of: "Stata" as const,
                  name: "regress",
                  shown: "regress",
                  from: "catalogue" as const,
                },
              ],
            },
          ],
        },
      ],
      datasets: [{ name: "wages", title: "wages", summary: "Synthetic hourly wages" }],
    };
    worker.answer({ type: "helpIndex", ...index });
    expect(await asked).toEqual(index);
  });
});

describe("rows of a frame", () => {
  const page = {
    name: "pay",
    header: "pay · 3 rows × 1 variable",
    total: 3,
    kept: 3,
    offset: 200,
    variables: [
      {
        name: "id",
        type: "Int",
        label: "",
        missing: 0,
        right: true,
        contrast: null,
        bars: { counts: [1, 1, 1], levels: ["1", "2", "3"] },
        codes: null,
      },
    ],
    rows: [],
  };

  it("are asked for a page at a time, and given as the engine writes them", async () => {
    const { engine: made, worker } = await opened();
    const asked = made.rows("pay", 200, 200);
    await settle();
    expect(worker.last).toMatchObject({
      type: "rows",
      name: "pay",
      offset: 200,
      limit: 200,
      sort: "",
      filtered: false,
      search: "",
    });
    worker.answer({ type: "rows", ...page });
    expect(await asked).toEqual({ ...page, filter: null });
  });

  it("are kept to a condition by the engine first, and again after a run", async () => {
    const { engine: made, worker } = await opened();
    const view = { where: "id > 1", sort: { variable: "id", desc: true }, search: "" };
    const asked = made.rows("pay", 0, 200, view);
    await settle();
    expect(worker.last).toMatchObject({ type: "filter", name: "pay", condition: "id > 1" });
    worker.answer({ type: "filter", ok: true, rows: 2, said: "" });
    await settle();
    expect(worker.last).toMatchObject({ type: "rows", sort: "id", desc: true, filtered: true });
    worker.answer({ type: "rows", ...page, kept: 2 });
    expect((await asked).filter).toEqual({ ok: true, rows: 2, said: "" });
    // Asked again before any run, the filter the worker holds is used.
    const again = made.rows("pay", 200, 200, view);
    await settle();
    expect(worker.last).toMatchObject({ type: "rows", offset: 200 });
    worker.answer({ type: "rows", ...page, kept: 2 });
    await again;
    // After a run, the worker holds no filter: it is run again.
    const ran = made.run("scripts/main.zeff", "let pay = 1\n");
    await settle();
    worker.answer({
      type: "done",
      exit_code: 0,
      stdout: "",
      stderr: "",
      statements: [],
      frames: [],
    });
    await ran;
    const after = made.rows("pay", 0, 200, view);
    await settle();
    expect(worker.last).toMatchObject({ type: "filter", condition: "id > 1" });
    worker.answer({ type: "filter", ok: false, rows: 0, said: "error[Z0201]: …" });
    await settle();
    // A condition the engine cannot run leaves every row.
    expect(worker.last).toMatchObject({ type: "rows", filtered: false });
    worker.answer({ type: "rows", ...page });
    expect((await after).filter?.ok).toBe(false);
  });

  it("are asked again where a run came between the filter and the rows", async () => {
    const { engine: made, worker } = await opened();
    const view = { where: "id > 1", sort: null, search: "" };
    const asked = made.rows("pay", 0, 200, view);
    await settle();
    worker.answer({ type: "filter", ok: true, rows: 2, said: "" });
    await settle();
    const rows = worker.last;
    expect(rows).toMatchObject({ type: "rows", filtered: true });
    // A run starts before the rows are answered (a statement asked after the script, for a
    // variable's statistics): the worker's filter goes with the frames of the run before, and
    // what it answers for the rows is the whole frame.
    const ran = made.run("scripts/main.zeff", "let pay = 1\n");
    await settle();
    const run = worker.last;
    expect(run).toMatchObject({ type: "run" });
    worker.say({ type: "rows", ...page, kept: 3, id: rows["id"] });
    worker.say({
      type: "done",
      exit_code: 0,
      stdout: "",
      stderr: "",
      statements: [],
      frames: [],
      id: run["id"],
    });
    await ran;
    await settle();
    // The filter is made again on the new frames, and the rows asked again.
    expect(worker.last).toMatchObject({ type: "filter", name: "pay", condition: "id > 1" });
    worker.answer({ type: "filter", ok: true, rows: 2, said: "" });
    await settle();
    expect(worker.last).toMatchObject({ type: "rows", filtered: true });
    worker.answer({ type: "rows", ...page, kept: 2 });
    const found = await asked;
    expect(found.kept).toBe(2);
    expect(found.filter).toEqual({ ok: true, rows: 2, said: "" });
  });
});
