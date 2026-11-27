// A paper set as it is typed (release 0.3, step 13): the source is given to Typst, the files
// the paper reads are taken from the project as Typst asks for them, and the pages that set
// are kept to be drawn, each asked of the module only where it is not the page already held.
// This file is the logic, with the module and the project behind two small interfaces so that
// a test can stand in for either; what a screen draws from it is in `live.svelte.ts`.
import type { Heading, Place, Said, Setting } from "./messages";

/** As much of the module as a paper's setting uses. */
export interface Typesetter {
  open(main: string): Promise<void>;
  today(day: Date): Promise<void>;
  putText(path: string, text: string): Promise<void>;
  putBytes(path: string, bytes: Uint8Array): Promise<void>;
  remove(path: string): Promise<boolean>;
  set(): Promise<Setting>;
  page(index: number): Promise<string>;
  outline(): Promise<Heading[]>;
  click(page: number, x: number, y: number): Promise<Place | null>;
  pdf(created: Date | null): Promise<Uint8Array>;
}

/** A file of the project, as its bytes; `null` where the project holds none at that path. */
export type Read = (path: string) => Promise<Uint8Array | null>;

/** A page of the paper as it last set. */
export interface Page {
  /** Its width and height, in points. */
  width: number;
  height: number;
  /** Its mark: two pages of one mark are drawn the same. */
  mark: string;
}

/** A paper as it last set, and what Typst said of the text as it now stands. */
export interface Outcome {
  /** The text that was set, or refused. */
  text: string;
  /** Whether Typst set that text: where it did not, the pages are those of the text before. */
  ok: boolean;
  pages: Page[];
  /** The headings of those pages, in the paper's order. */
  headings: Heading[];
  /** What Typst said: its errors where it refused the text, and its warnings. */
  said: Said[];
  /** The files the paper asks for that the project does not hold, by their paths. */
  absent: string[];
  /** How long Typst took over the setting, the reading of the project's files apart, in milliseconds. */
  ms: number;
}

/** How many times a paper is set again for the files it asks for, before it is left as it is. */
export const ROUNDS = 24;

/** Whether a file is given to Typst as text (a source it may `#include`) and not as bytes. */
const isSource = (path: string) => /\.typ$/i.test(path);

const decoder = new TextDecoder();

/**
 * One paper in the module. Settings are made one at a time, in the order asked; where the text
 * changes while one is being made, the next is of the text as it then stands.
 */
export class Live {
  readonly #module: Typesetter;
  readonly #read: Read;
  readonly #now: () => number;
  /** The paper's main file, by its path in the project. */
  readonly main: string;
  /** The files of the project the paper has been given, by their paths. */
  readonly #given = new Set<string>();
  /** The files the last setting asked for and the project did not hold, by their paths. */
  #lacked: string[] = [];
  /** The files the last setting read: those the paper uses as it now stands. */
  #used: string[] = [];
  /** The files given that the project has since written again: read again at the next setting. */
  readonly #rewritten = new Set<string>();
  /** The pages held, each by its mark: what the module was asked for and need not be again. */
  readonly #drawn = new Map<string, string>();
  /** The marks of the pages of the last setting, in their order: what the module now holds. */
  #current: string[] = [];
  /** The headings of those pages; `null` before the paper has been asked for them. */
  #headings: Heading[] | null = null;
  #opened: Promise<void> | null = null;
  #last: Promise<unknown> = Promise.resolve();

  constructor(
    module: Typesetter,
    read: Read,
    main: string,
    now: () => number = () => performance.now(),
  ) {
    this.#module = module;
    this.#read = read;
    this.main = main;
    this.#now = now;
  }

  /** The paper is opened in the module the first time it is set, with the reader's day. */
  #open(): Promise<void> {
    this.#opened ??= (async () => {
      await this.#module.open(this.main);
      await this.#module.today(new Date());
    })();
    return this.#opened;
  }

  /** One after another: what is asked waits for what was asked before it, whatever became of that. */
  #inTurn<T>(work: () => Promise<T>): Promise<T> {
    const next = this.#last.then(work, work);
    this.#last = next.catch(() => undefined);
    return next;
  }

  /**
   * Set the paper from this text. The files Typst asks for and the paper does not hold are
   * looked for in the project; those found are given and the paper set again, until Typst
   * asks for nothing more that the project holds. What it asks for that the project does not
   * hold is left to Typst's own words, and named in `absent`.
   */
  set(text: string): Promise<Outcome> {
    return this.#inTurn(async () => {
      await this.#open();
      await this.#module.putText(this.main, text);
      // A file given before that the project has written again since (a run exported it) is
      // read again; one that is gone from the project is gone from the paper.
      for (const path of [...this.#rewritten]) {
        this.#rewritten.delete(path);
        const bytes = await this.#read(path);
        if (bytes === null) {
          this.#given.delete(path);
          await this.#module.remove(path);
        } else {
          await this.#give(path, bytes);
        }
      }
      let ms = 0;
      let setting: Setting;
      const absent = new Set<string>();
      for (let round = 0; ; round += 1) {
        const before = this.#now();
        setting = await this.#module.set();
        ms += this.#now() - before;
        const wanted = setting.missing.filter((path) => !absent.has(path));
        if (wanted.length === 0 || round >= ROUNDS) break;
        let found = 0;
        for (const path of wanted) {
          const bytes = await this.#read(path);
          if (bytes === null) {
            absent.add(path);
            continue;
          }
          found += 1;
          await this.#give(path, bytes);
        }
        // Nothing more to give: Typst's words of what is not there stand.
        if (found === 0) break;
      }
      const pages = setting.pages.map(([width, height], index) => ({
        width,
        height,
        mark: setting.marks[index] ?? `${index}`,
      }));
      // The headings of the pages that stand: asked again only where the pages have changed.
      const marks = pages.map((page) => page.mark);
      if (this.#headings === null || marks.join() !== this.#current.join()) {
        this.#headings = await this.#module.outline();
      }
      this.#current = marks;
      // A page that is no longer among the paper's is no longer held.
      for (const mark of [...this.#drawn.keys()]) {
        if (!marks.includes(mark)) this.#drawn.delete(mark);
      }
      this.#lacked = [...setting.missing];
      this.#used = [...setting.read];
      return {
        text,
        ok: setting.ok,
        pages,
        headings: this.#headings,
        said: setting.said,
        absent: [...setting.missing],
        ms,
      };
    });
  }

  /** Give a file of the project to the paper: a source as text, anything else as bytes. */
  async #give(path: string, bytes: Uint8Array): Promise<void> {
    this.#given.add(path);
    if (isSource(path)) await this.#module.putText(path, decoder.decode(bytes));
    else await this.#module.putBytes(path, bytes);
  }

  /**
   * Files of the project were written (a run exported them, or took them away). Whether any
   * is a file of this paper as it now stands: one it reads, or one it asked for and the
   * project did not hold. A file the paper was given, read now or not, is read again from the
   * project the next time the paper is set.
   */
  written(paths: readonly string[]): boolean {
    let concerned = false;
    for (const path of paths) {
      if (this.#given.has(path)) this.#rewritten.add(path);
      if (this.#used.includes(path) || this.#lacked.includes(path)) concerned = true;
    }
    return concerned;
  }

  /**
   * The files of the project the paper uses, as it now stands: those its last setting read,
   * and those it asked for and lacks. A file it read once and names no more is not among them.
   */
  get files(): string[] {
    return [...new Set([...this.#used, ...this.#lacked])].sort();
  }

  /**
   * A page of the paper as it last set, as Typst's own SVG: asked of the module once for a
   * mark, and from what is held afterwards. `pages` are those of the outcome the page is of;
   * `null` where the paper has been set again since and the page is no longer that one.
   */
  drawn(pages: readonly Page[], index: number): Promise<string | null> {
    const page = pages[index];
    if (page === undefined) return Promise.resolve(null);
    const held = this.#drawn.get(page.mark);
    if (held !== undefined) return Promise.resolve(held);
    return this.#inTurn(async () => {
      const again = this.#drawn.get(page.mark);
      if (again !== undefined) return again;
      // The paper was set again while this waited its turn: the module's page at this place
      // is another's.
      if (this.#current[index] !== page.mark) return null;
      const svg = await this.#module.page(index);
      if (svg === "") return null;
      this.#drawn.set(page.mark, svg);
      return svg;
    });
  }

  /**
   * Where in the sources a point of a page came from (a click on it): `x` and `y` in points
   * from the page's top left. `null` where it leads to no place of the paper, or where the
   * paper has been set again since and the page is no longer that one.
   */
  place(pages: readonly Page[], index: number, x: number, y: number): Promise<Place | null> {
    const page = pages[index];
    if (page === undefined) return Promise.resolve(null);
    return this.#inTurn(async () =>
      this.#current[index] === page.mark ? this.#module.click(index, x, y) : null,
    );
  }

  /**
   * The PDF of the paper as it last set, as Typst writes it, with no time in it: the same
   * bytes whenever and wherever it is written. `pages` are those of the outcome it is asked
   * of; `null` where the paper has been set again since, or has no page.
   */
  pdf(pages: readonly Page[]): Promise<Uint8Array | null> {
    if (pages.length === 0) return Promise.resolve(null);
    return this.#inTurn(async () =>
      pages.map((page) => page.mark).join() === this.#current.join()
        ? this.#module.pdf(null)
        : null,
    );
  }

  /** The files of the project the paper has been given, in the order of their paths. */
  get given(): string[] {
    return [...this.#given].sort();
  }
}
