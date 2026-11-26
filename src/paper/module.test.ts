import { describe, expect, it } from "vitest";
import type { WorkerLike } from "../engine/engine";
import { Papers } from "./lazy";
import { PaperError, PaperModule } from "./module";

/** A stand-in for the paper's worker: it keeps what was sent, and says what a test tells it to. */
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

  get last(): Record<string, unknown> {
    const last = this.sent.at(-1);
    if (last === undefined) throw new Error("nothing was sent");
    return last;
  }

  answer(reply: Record<string, unknown>): void {
    this.say({ ...reply, id: this.last["id"] });
  }
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

async function started(): Promise<{ module: PaperModule; worker: Stand; workers: Stand[] }> {
  const workers: Stand[] = [];
  const module = new PaperModule(() => {
    const worker = new Stand();
    workers.push(worker);
    return worker;
  });
  const start = module.start();
  const worker = workers[0] as Stand;
  worker.say({ type: "ready", typst: "0.15.1" });
  await start;
  return { module, worker, workers };
}

describe("the paper's worker, from the interface's side", () => {
  it("starts one worker and gives Typst's version", async () => {
    const { module, workers } = await started();
    expect(module.typst).toBe("0.15.1");
    expect(await module.start()).toBe("0.15.1");
    expect(workers).toHaveLength(1);
  });

  it("gives a font and a figure by passing their bytes, not copying them", async () => {
    const { module, worker } = await started();
    const font = new Uint8Array([1, 2, 3]);
    const given = module.font(font);
    await settle();
    expect(worker.last).toMatchObject({ type: "font" });
    expect(worker.transfers.at(-1)).toEqual([font.buffer]);
    worker.answer({ type: "fonted", faces: 1, families: ["Libertinus Serif"] });
    expect(await given).toEqual({ faces: 1, families: ["Libertinus Serif"] });
    const figure = new Uint8Array([4, 5]);
    const put = module.putBytes("output/figure.svg", figure);
    await settle();
    expect(worker.last).toMatchObject({ type: "bytes", path: "output/figure.svg" });
    expect(worker.transfers.at(-1)).toEqual([figure.buffer]);
    worker.answer({ type: "put", path: "output/figure.svg" });
    await put;
  });

  it("opens a paper, puts its files, and has it set: what Typst said, and its pages", async () => {
    const { module, worker } = await started();
    const opened = module.open("paper/paper.typ");
    await settle();
    expect(worker.last).toMatchObject({ type: "open", main: "paper/paper.typ" });
    worker.answer({ type: "opened", main: "paper/paper.typ" });
    await opened;
    const put = module.putText("paper/paper.typ", "= A paper\n");
    await settle();
    expect(worker.last).toMatchObject({
      type: "text",
      path: "paper/paper.typ",
      text: "= A paper\n",
    });
    worker.answer({ type: "put", path: "paper/paper.typ" });
    await put;
    const day = module.today(new Date(2026, 10, 27));
    await settle();
    expect(worker.last).toMatchObject({ type: "today", year: 2026, month: 11, day: 27 });
    worker.answer({ type: "dated" });
    await day;
    const set = module.set();
    await settle();
    const said = {
      severity: "warning",
      message: "unknown font family: no such face",
      hints: [],
      file: "paper/paper.typ",
      line: 1,
      column: 17,
      end_line: 1,
      end_column: 31,
      from: 16,
      to: 30,
    };
    worker.answer({ type: "set", ok: true, pages: [[595.276, 841.89]], said: [said] });
    expect(await set).toEqual({ ok: true, pages: [[595.276, 841.89]], said: [said] });
    const page = module.page(0);
    await settle();
    expect(worker.last).toMatchObject({ type: "page", index: 0 });
    worker.answer({ type: "page", index: 0, svg: "<svg/>" });
    expect(await page).toBe("<svg/>");
    const gone = module.remove("paper/tables/fit.typ");
    await settle();
    worker.answer({ type: "removed", path: "paper/tables/fit.typ", was: false });
    expect(await gone).toBe(false);
  });

  it("asks for the PDF at a time, or at none, and for the place of a point of a page", async () => {
    const { module, worker } = await started();
    const pdf = module.pdf(new Date(Date.UTC(2026, 10, 27, 12, 0, 0)));
    await settle();
    expect(worker.last).toMatchObject({ type: "pdf", created: 1_795_780_800 });
    worker.answer({ type: "pdf", bytes: new Uint8Array([37, 80, 68, 70]) });
    expect([...(await pdf)]).toEqual([37, 80, 68, 70]);
    const timeless = module.pdf();
    await settle();
    expect(worker.last).toMatchObject({ type: "pdf", created: null });
    worker.answer({ type: "error", message: "no paper is set" });
    await expect(timeless).rejects.toThrow(new PaperError("no paper is set"));
    const found = module.click(0, 30, 28);
    await settle();
    expect(worker.last).toMatchObject({ type: "click", page: 0, x: 30, y: 28 });
    worker.answer({ type: "place", file: "paper/paper.typ", offset: 55, line: 2, column: 3 });
    expect(await found).toEqual({ file: "paper/paper.typ", offset: 55, line: 2, column: 3 });
    const nowhere = module.click(0, 290, 190);
    await settle();
    worker.answer({ type: "place", file: null });
    expect(await nowhere).toBeNull();
  });

  it("ends its worker, fails what waited on it, and starts another when asked again", async () => {
    const { module, worker, workers } = await started();
    const set = module.set();
    await settle();
    module.close();
    expect(worker.ended).toBe(true);
    await expect(set).rejects.toThrow("the paper's worker was ended");
    await expect(module.set()).rejects.toThrow("the paper's worker is not started");
    const again = module.start();
    expect(workers).toHaveLength(2);
    (workers[1] as Stand).say({ type: "ready", typst: "0.15.1" });
    expect(await again).toBe("0.15.1");
  });

  it("says how its worker failed", async () => {
    const workers: Stand[] = [];
    const module = new PaperModule(() => {
      const worker = new Stand();
      workers.push(worker);
      return worker;
    });
    const start = module.start();
    (workers[0] as Stand).onerror?.({ message: "the module did not load" });
    await expect(start).rejects.toThrow("the paper's worker failed: the module did not load");
  });
});

describe("the Paper module as the app holds it", () => {
  it("is not fetched until it is asked for, then once, and is the same module to all who ask", async () => {
    let loads = 0;
    const { module } = await started();
    const papers = new Papers((tell) => {
      loads += 1;
      tell?.({ received: 5, of: 10, files: 0, among: 1 });
      return Promise.resolve(module);
    });
    expect(papers.ready).toBe(false);
    expect(loads).toBe(0);
    const heard: number[] = [];
    const first = papers.module((progress) => heard.push(progress.received));
    const second = papers.module();
    expect(await first).toBe(module);
    expect(await second).toBe(module);
    expect(loads).toBe(1);
    expect(heard).toEqual([5]);
    expect(papers.ready).toBe(true);
    // Closed, it is gone, and the next asking fetches it again.
    papers.close();
    expect(papers.ready).toBe(false);
    await papers.module();
    expect(loads).toBe(2);
  });

  it("fetches afresh after a fetching that failed", async () => {
    let loads = 0;
    const { module } = await started();
    const papers = new Papers(() => {
      loads += 1;
      return loads === 1
        ? Promise.reject(new Error("font.otf could not be fetched: the host answered 503"))
        : Promise.resolve(module);
    });
    await expect(papers.module()).rejects.toThrow("the host answered 503");
    expect(papers.ready).toBe(false);
    expect(await papers.module()).toBe(module);
    expect(loads).toBe(2);
  });
});
