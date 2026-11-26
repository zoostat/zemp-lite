// The examples of one help page, as the page holds them while it is shown (release 0.3, step
// 9; open decision #211, item 11): each with its statements as they stand, what is shown under
// them, and where it is in its life. The page opens with the engine's kept text; its examples
// are run at once in a session of their own, and each then shows what the reader's engine
// gave. Pure logic is in `examples.ts`; this keeps the state a page draws from.
import type { ExampleOutcome } from "../engine/messages";
import {
  answered,
  composed,
  examplesOf,
  fresh,
  givenBy,
  linesOf,
  type Held,
  type PageExample,
} from "./examples";
import type { Block, HelpDoc } from "./read";

/** A figure of an example: the engine's SVG, or its words where it drew none. */
export interface Drawn {
  svg: string | null;
  problem: string;
  /** The size it was laid out at, in pixels of the screen. */
  width: number;
  height: number;
}

/** What a run of examples came back with: the outcome, and each plot by its statement's line. */
export interface Ran {
  outcome: ExampleOutcome;
  figures: Record<number, Drawn>;
  /** How long the engine took over the script, in milliseconds, its wait for its turn apart. */
  ms: number;
}

/** As much of the app as a page's examples use. */
export interface ExampleRuns {
  /**
   * Run a script in the examples' session when its turn comes, its plots laid out `width`
   * pixels wide; `began` is called when its turn has come. `null` where it was dropped before
   * it ended.
   */
  run(owner: string, text: string, width: number, began?: () => void): Promise<Ran | null>;
  /** Drop what an owner has asked for and not yet had. */
  drop(owner: string): void;
  /** The seconds an example may run. */
  readonly seconds: number;
}

/** One example of the page, with what it shows. */
export class Item {
  readonly example: PageExample;
  /**
   * Whether it is one of the page's EXAMPLES, which run one after another as one script; an
   * example elsewhere on the page (a common mistake) runs after all of those.
   */
  readonly chained: boolean;
  held: Held;
  /** Its figures, by the place of each plot among its pieces. */
  figures = $state<Record<number, Drawn>>({});

  constructor(example: PageExample, chained: boolean) {
    this.example = example;
    this.chained = chained;
    this.held = $state(fresh(example));
  }

  /** Whether it has statements to run. */
  get runnable(): boolean {
    return this.example.code.length > 0;
  }
}

let pages = 0;

export class PageRuns {
  readonly #runs: ExampleRuns;
  /** The name this page's examples are asked under, by which they are dropped together. */
  readonly owner: string;
  /** The examples of each block of the page, by the block. */
  readonly #byBlock: { block: Block; items: Item[] }[] = [];
  /** The page's EXAMPLES, in order, and the examples that stand elsewhere on it. */
  readonly chain: Item[] = [];
  readonly apart: Item[] = [];
  readonly illustrated: boolean;
  /** The width its figures are laid out at, in pixels. */
  width = 560;
  #left = false;

  /**
   * `illustrated`: the page's examples are illustrations the engine does not hold to itself
   * (an explained code's: it may name a frame the page does not make, or stand for a longer
   * text). They are not run as the page opens, and say so; **Run** runs one as it stands.
   */
  constructor(doc: HelpDoc, runs: ExampleRuns, illustrated = false) {
    this.#runs = runs;
    this.illustrated = illustrated;
    pages += 1;
    this.owner = `help-page-${pages}`;
    for (const entry of doc.entries) {
      for (const section of entry.sections) {
        const chained = section.heading === "EXAMPLES" || section.heading === "EXAMPLE";
        for (const block of section.blocks) {
          if (block.kind !== "example") continue;
          const items = examplesOf(block.lines).map((example) => new Item(example, chained));
          this.#byBlock.push({ block, items });
          for (const item of items) {
            if (!item.runnable) continue;
            (chained ? this.chain : this.apart).push(item);
          }
        }
      }
    }
  }

  get seconds(): number {
    return this.#runs.seconds;
  }

  /** The examples of a block of the page. */
  of(block: Block): Item[] {
    return this.#byBlock.find((one) => one.block === block)?.items ?? [];
  }

  /** Every example of the page that can be run. */
  get all(): Item[] {
    return [...this.chain, ...this.apart];
  }

  /**
   * The page has opened: its examples are run, each by itself, the kept text standing until
   * its own output arrives.
   */
  async open(): Promise<void> {
    if (this.illustrated) return;
    const last = this.chain.at(-1);
    await Promise.all([
      ...(last === undefined ? [] : [this.run(last)]),
      ...this.apart.map((item) => this.run(item)),
    ]);
  }

  /** The page is left: what it asked for and has not had is dropped. */
  leave(): void {
    this.#left = true;
    this.#runs.drop(this.owner);
  }

  /** The statements of an example are put back as the page has them, and run. */
  async reset(item: Item): Promise<void> {
    item.held = { ...item.held, text: item.held.own };
    await this.run(item);
  }

  /**
   * Run an example as it stands: one of the page's EXAMPLES with those above it, which are
   * shown afresh with it; one that stands apart after all of them, alone shown afresh.
   */
  async run(item: Item): Promise<void> {
    await this.#run(item, (one) => one.held.text);
  }

  /**
   * Lay the figures out again at a new width: each example is run again as it last ran (not
   * as it may have been edited since), since a session holds the plots of its last run only.
   */
  async relayout(width: number): Promise<void> {
    if (Math.abs(width - this.width) < 8) return;
    this.width = width;
    const drawn = (item: Item) => Object.keys(item.figures).length > 0;
    const asRan = (one: Item) => one.held.ranText ?? one.held.own;
    const lastDrawn = this.chain.filter(drawn).at(-1);
    await Promise.all([
      ...(lastDrawn === undefined ? [] : [this.#run(lastDrawn, asRan, true)]),
      ...this.apart.filter(drawn).map((item) => this.#run(item, asRan, true)),
    ]);
  }

  async #run(item: Item, textOf: (one: Item) => string, quiet = false): Promise<void> {
    if (this.#left || !item.runnable) return;
    // The examples the script runs, and those shown afresh from it.
    const at = this.chain.indexOf(item);
    const before = at >= 0 ? this.chain.slice(0, at) : this.chain;
    const ran = [...before, item];
    const shown = at >= 0 ? ran : [item];
    const texts = ran.map(textOf);
    const script = composed(texts);
    const was = shown.map((one) => one.held.phase);
    if (!quiet) for (const one of shown) one.held = { ...one.held, phase: "waiting" };
    let back: Ran | null;
    try {
      back = await this.#runs.run(this.owner, script.text, this.width, () => {
        for (const one of shown) {
          if (one.held.phase === "waiting") one.held = { ...one.held, phase: "running" };
        }
      });
    } catch (error) {
      for (const one of shown) {
        one.held = { ...one.held, phase: "refused", problem: (error as Error).message };
      }
      return;
    }
    if (back === null || this.#left) {
      // Dropped: each is as it was before it was asked for.
      shown.forEach((one, index) => {
        if (one.held.phase === "waiting" || one.held.phase === "running") {
          one.held = { ...one.held, phase: was[index] ?? "kept" };
        }
      });
      return;
    }
    const ms = back.ms;
    const given = givenBy(back.outcome, script.ranges, ran.length - 1);
    for (const one of shown) {
      const index = ran.indexOf(one);
      const mine = given[index];
      if (mine === undefined) continue;
      one.held = answered(one.held, texts[index] ?? "", mine, back.outcome, ms);
      // An example the run never reached keeps its figures with what it showed.
      if (one.held.phase === "unreached" || (one.held.phase === "slow" && !mine.ran)) continue;
      const figures: Record<number, Drawn> = {};
      mine.parts.forEach((part, place) => {
        const drawn = part.kind === "plot" ? back.figures[part.line] : undefined;
        if (drawn !== undefined) figures[place] = drawn;
      });
      one.figures = figures;
    }
  }
}

/** The statements of an example as a reader copies or runs them: its lines, as they stand. */
export const statementsOf = (item: Item): string => linesOf(item.held.text).join("\n");
