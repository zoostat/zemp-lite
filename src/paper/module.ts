// The interface's side of the paper's worker (release 0.3, step 11b; open decision #172,
// option A). A `PaperModule` starts the worker, which is Typst, gives it fonts and the files
// of a paper, has the paper set to pages, and asks for a page, the PDF, and the place in the
// source of a point on a page. The worker is apart from the engine's: a paper is set while a
// script runs, and neither waits for the other.
import type { WorkerLike } from "../engine/engine";
import type { Figure, FromWorker, Heading, Place, Reply, Request, Setting } from "./messages";

/** The module could not do what it was asked: the worker's own words, or how the worker failed. */
export class PaperError extends Error {
  override name = "PaperError";
}

interface Waiting {
  resolve: (reply: Reply) => void;
  reject: (error: Error) => void;
}

export class PaperModule {
  readonly #spawn: () => WorkerLike;
  #worker: WorkerLike | null = null;
  #ready: Promise<string> | null = null;
  #typst: string | null = null;
  #waiting = new Map<number, Waiting>();
  #nextId = 1;

  /** `spawn` starts a worker; the browser's is in `browser.ts`. */
  constructor(spawn: () => WorkerLike) {
    this.#spawn = spawn;
  }

  /** The version of Typst in the worker, once it has started. */
  get typst(): string | null {
    return this.#typst;
  }

  /** Start the worker, if it is not started, and give Typst's version. */
  start(): Promise<string> {
    if (this.#ready !== null) return this.#ready;
    const worker = this.#spawn();
    this.#worker = worker;
    this.#ready = new Promise<string>((resolve, reject) => {
      worker.onerror = (event) => {
        const error = new PaperError(
          `the paper's worker failed: ${event.message ?? "no reason given"}`,
        );
        reject(error);
        this.#end(error);
      };
      worker.onmessage = (event) => {
        const said = event.data as FromWorker;
        if (said.type === "ready") {
          this.#typst = said.typst;
          resolve(said.typst);
          return;
        }
        const waiting = said.id === undefined ? undefined : this.#waiting.get(said.id);
        if (said.id === undefined || waiting === undefined) return;
        this.#waiting.delete(said.id);
        waiting.resolve(said);
      };
    });
    return this.#ready;
  }

  /**
   * Give a font file: one of the module's own, or one of the project's. The fonts given stay
   * for every paper opened afterwards. How many faces the file held (none where it is no
   * font), and every family now there. The bytes are passed to the worker and are no longer
   * the caller's.
   */
  async font(bytes: Uint8Array): Promise<{ faces: number; families: string[] }> {
    const read = expect(await this.#ask({ type: "font", bytes }, [bytes.buffer]), "fonted");
    return { faces: read.faces, families: read.families };
  }

  /** Open a paper whose main file is at `main`, a path of the project; the one open is gone. */
  async open(main: string): Promise<void> {
    await this.start();
    expect(await this.#ask({ type: "open", main }), "opened");
  }

  /** Put a file of text into the paper (a source, a table), by its path in the project. */
  async putText(path: string, text: string): Promise<void> {
    expect(await this.#ask({ type: "text", path, text }), "put");
  }

  /** Put a file of bytes into the paper (a figure); the bytes are passed to the worker. */
  async putBytes(path: string, bytes: Uint8Array): Promise<void> {
    expect(await this.#ask({ type: "bytes", path, bytes }, [bytes.buffer]), "put");
  }

  /** Forget a file that is gone from the project. Whether the paper had one. */
  async remove(path: string): Promise<boolean> {
    return expect(await this.#ask({ type: "remove", path }), "removed").was;
  }

  /** The day `datetime.today()` gives in the paper: the reader's. */
  async today(day: Date): Promise<void> {
    expect(
      await this.#ask({
        type: "today",
        year: day.getFullYear(),
        month: day.getMonth() + 1,
        day: day.getDate(),
      }),
      "dated",
    );
  }

  /** Set the paper to pages. */
  async set(): Promise<Setting> {
    const set = expect(await this.#ask({ type: "set" }), "set");
    return {
      ok: set.ok,
      pages: set.pages,
      marks: set.marks,
      said: set.said,
      missing: set.missing,
      read: set.read,
    };
  }

  /** A page of the last document that set, counted from 0, as Typst's own SVG; empty where there is none. */
  async page(index: number): Promise<string> {
    return expect(await this.#ask({ type: "page", index }), "page").svg;
  }

  /**
   * The PDF of the last document that set. `created` is the time written into it; without
   * one the file names no time.
   */
  async pdf(created: Date | null = null): Promise<Uint8Array> {
    const seconds = created === null ? null : Math.floor(created.getTime() / 1000);
    return expect(await this.#ask({ type: "pdf", created: seconds }), "pdf").bytes;
  }

  /** The headings, and the tables and figures, of the last document that set, in the paper's order. */
  async outline(): Promise<{ headings: Heading[]; figures: Figure[] }> {
    const told = expect(await this.#ask({ type: "outline" }), "outline");
    return { headings: told.headings, figures: told.figures ?? [] };
  }

  /**
   * Where in the sources a point of a page came from: `page` counted from 0, `x` and `y` in
   * points from the page's top left. `null` where it leads to no place of the paper.
   */
  async click(page: number, x: number, y: number): Promise<Place | null> {
    const place = expect(await this.#ask({ type: "click", page, x, y }), "place");
    return place.file === null
      ? null
      : {
          file: place.file,
          offset: place.offset ?? 0,
          line: place.line ?? null,
          column: place.column ?? null,
        };
  }

  /** End the worker, which returns its memory to the browser; the next use starts a new one. */
  close(): void {
    this.#end(new PaperError("the paper's worker was ended"));
  }

  #ask(request: Request, transfer?: Transferable[]): Promise<Reply> {
    const worker = this.#worker;
    if (worker === null) {
      return Promise.reject(new PaperError("the paper's worker is not started"));
    }
    const id = this.#nextId++;
    return new Promise<Reply>((resolve, reject) => {
      this.#waiting.set(id, { resolve, reject });
      worker.postMessage({ ...request, id }, transfer);
    });
  }

  #end(error: Error): void {
    this.#worker?.terminate();
    this.#worker = null;
    this.#ready = null;
    const waiting = [...this.#waiting.values()];
    this.#waiting.clear();
    for (const one of waiting) one.reject(error);
  }
}

/** The reply, where it is of the kind asked for; the worker's own words as an error otherwise. */
function expect<Kind extends Reply["type"]>(
  reply: Reply,
  kind: Kind,
): Extract<Reply, { type: Kind }> {
  if (reply.type === kind) return reply as Extract<Reply, { type: Kind }>;
  throw new PaperError(
    reply.type === "error"
      ? reply.message
      : `the worker answered \`${reply.type}\`, not \`${kind}\``,
  );
}
