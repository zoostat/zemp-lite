// The live page of a paper, as a screen draws it (release 0.3, step 13): what the paper last
// set to, what Typst says of the text as it stands, and each page as a picture, asked for
// when it is near the reader's view. The source is set a short pause after the last key. The
// logic is in `live.ts`; this keeps the state a place draws from.
import { Live, type Outcome, type Read, type Typesetter } from "./live";
import type { Place } from "./messages";

/** The pause after the last key before the paper is set, in milliseconds. */
export const PAUSE = 200;

export class LivePage {
  readonly #live: Live;
  /** The paper's main file, by its path in the project. */
  readonly main: string;
  /** The paper as it last set, with what Typst said of the text then; `null` before the first. */
  outcome = $state<Outcome | null>(null);
  /** Whether a text typed is waiting to be set, or being set. */
  busy = $state(false);
  /** Why the paper could not be set at all (the module's worker failed), or `null`. */
  failed = $state<string | null>(null);
  /** The pictures of the pages held, each by its page's mark, as addresses a picture is drawn from. */
  pictures = $state<Record<string, string>>({});
  /**
   * The picture drawn at each place of the paper, from 0: the page's own once it has come, and
   * until then the one last drawn there, so that a page being set again does not go blank.
   */
  shown = $state<(string | undefined)[]>([]);
  /** Every address made and not yet let go. */
  #made: string[] = [];
  /**
   * From a text given (a key pressed) to its setting told, in milliseconds, for the last text
   * set: the pause, the wait for a setting before it, and Typst's own time.
   */
  took = $state<number | null>(null);
  #text: string;
  #timer: ReturnType<typeof setTimeout> | null = null;
  #since = 0;
  /** The marks of the pages asked for and not yet come. */
  #asked: string[] = [];
  /** Those waiting for the paper to be set from its text as it stands (`settled`). */
  #waiting: (() => void)[] = [];
  #closed = false;

  /** A paper of the project, with its text as it stands: it is set at once. */
  constructor(module: Typesetter, read: Read, main: string, text: string) {
    this.#live = new Live(module, read, main);
    this.main = main;
    this.#text = text;
    this.#since = performance.now();
    this.busy = true;
    void this.#set();
  }

  /** The text changed: it is set a short pause after the last change. */
  edit(text: string): void {
    if (this.#closed || text === this.#text) return;
    this.#text = text;
    if (!this.busy || this.#timer !== null) this.#since = performance.now();
    this.busy = true;
    if (this.#timer !== null) clearTimeout(this.#timer);
    this.#timer = setTimeout(() => {
      this.#timer = null;
      void this.#set();
    }, PAUSE);
  }

  /**
   * Set the paper again from its text as it stands, at once: a file it reads has changed (a
   * run wrote it), or one it lacked may now be there.
   */
  again(): void {
    if (this.#closed) return;
    if (this.#timer !== null) clearTimeout(this.#timer);
    this.#timer = null;
    this.#since = performance.now();
    this.busy = true;
    void this.#set();
  }

  async #set(): Promise<void> {
    const text = this.#text;
    const since = this.#since;
    let outcome: Outcome;
    try {
      outcome = await this.#live.set(text);
    } catch (error) {
      if (this.#closed) return;
      this.failed = error instanceof Error ? error.message : String(error);
      this.busy = false;
      this.#tell();
      return;
    }
    if (this.#closed) return;
    this.failed = null;
    this.outcome = outcome;
    // The pictures of pages that are no longer the paper's are no longer held by their marks;
    // one still drawn at a place stays there until its place is taken.
    const marks = outcome.pages.map((page) => page.mark);
    this.pictures = Object.fromEntries(
      Object.entries(this.pictures).filter(([mark]) => marks.includes(mark)),
    );
    this.#asked = this.#asked.filter((mark) => marks.includes(mark));
    this.#place();
    // A text typed while this one was being set waits for its own pause, or is being set.
    if (this.#text === text && this.#timer === null) {
      this.busy = false;
      this.took = performance.now() - since;
      this.#tell();
    }
  }

  /**
   * A page is near the reader's view: its picture is asked for, once for its mark. The page
   * draws it when `pictures` holds it.
   */
  want(index: number): void {
    const outcome = this.outcome;
    const page = outcome?.pages[index];
    if (this.#closed || outcome === null || page === undefined) return;
    if (this.pictures[page.mark] !== undefined || this.#asked.includes(page.mark)) return;
    this.#asked.push(page.mark);
    const come = () => (this.#asked = this.#asked.filter((mark) => mark !== page.mark));
    void this.#live.drawn(outcome.pages, index).then(
      (svg) => {
        come();
        if (svg === null || this.#closed) return;
        // Only a page still among the paper's is kept.
        if (!this.outcome?.pages.some((one) => one.mark === page.mark)) return;
        const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
        this.#made.push(url);
        this.pictures = { ...this.pictures, [page.mark]: url };
        this.#place();
      },
      () => {
        come();
      },
    );
  }

  /**
   * What is drawn at each place: the page's own picture where it has come, and otherwise what
   * was drawn there before. An address drawn nowhere and held for no page is let go.
   */
  #place(): void {
    const pages = this.outcome?.pages ?? [];
    this.shown = pages.map((page, index) => this.pictures[page.mark] ?? this.shown[index]);
    const live = [...this.shown, ...Object.values(this.pictures)];
    for (const url of this.#made) {
      if (!live.includes(url)) URL.revokeObjectURL(url);
    }
    this.#made = this.#made.filter((url) => live.includes(url));
  }

  /**
   * Files of the project were written (a run exported them): where any is a file of this
   * paper, the paper is set again at once, with the file as it now is.
   */
  wrote(paths: readonly string[]): void {
    if (!this.#closed && this.#live.written(paths)) this.again();
  }

  /** The files of the project the paper reads: those it was given, and those it lacks. */
  get files(): string[] {
    return this.#live.files;
  }

  /**
   * Where in the sources a point of a page came from: `x` and `y` in points from the page's
   * top left. `null` where it leads nowhere, or the page is no longer that one.
   */
  place(index: number, x: number, y: number): Promise<Place | null> {
    const outcome = this.outcome;
    if (this.#closed || outcome === null) return Promise.resolve(null);
    return this.#live.place(outcome.pages, index, x, y).catch(() => null);
  }

  /**
   * The PDF of the paper as it stands, once it has been set from its present text: Typst's
   * own file, with no time in it. `null` where Typst refuses the text, or the paper is left.
   */
  async pdf(): Promise<Uint8Array | null> {
    await this.settled();
    const outcome = this.outcome;
    if (this.#closed || outcome === null || !outcome.ok || this.failed !== null) return null;
    return this.#live.pdf(outcome.pages);
  }

  /** Resolves once the paper has been set from its text as it stands, or is left. */
  settled(): Promise<void> {
    if (!this.busy || this.#closed) return Promise.resolve();
    return new Promise((resolve) => this.#waiting.push(resolve));
  }

  #tell(): void {
    const waiting = this.#waiting;
    this.#waiting = [];
    for (const resolve of waiting) resolve();
  }

  /** The paper is left: its pictures are let go, and nothing more is set. */
  close(): void {
    this.#closed = true;
    this.#tell();
    if (this.#timer !== null) clearTimeout(this.#timer);
    this.#timer = null;
    for (const url of this.#made) URL.revokeObjectURL(url);
    this.#made = [];
    this.pictures = {};
    this.shown = [];
  }
}
