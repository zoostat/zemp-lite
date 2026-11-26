// The Paper module as the app holds it: not there until a paper is opened, then fetched and
// started once, and the same module for every paper of the window afterwards (release 0.3,
// step 11b). The part of the app that knows the module's files (`browser.ts`) is itself
// asked for only then, so the app's start fetches no byte of the module.
import type { Progress } from "./fetching";
import type { PaperModule } from "./module";

/** What the build says of the module as it travels; `null` before the module is built. */
export const PAPER_FACTS = __PAPER_FACTS__;

/** The bytes that travel the first time a paper is opened: the module and its fonts, packed. */
export const PAPER_TRAVELS: number | null = PAPER_FACTS?.travels ?? null;

/** What loads the module: the browser's, or a stand-in for it. */
export type Load = (tell?: (progress: Progress) => void) => Promise<PaperModule>;

export class Papers {
  readonly #load: Load;
  #loading: Promise<PaperModule> | null = null;
  #module: PaperModule | null = null;

  constructor(load: Load = async (tell) => (await import("./browser")).loadPaper(tell)) {
    this.#load = load;
  }

  /** Whether the module is here: fetched and started. */
  get ready(): boolean {
    return this.#module !== null;
  }

  /**
   * The module, fetched and started the first time it is asked for. `tell` hears how far the
   * fetching has gone; whoever asks while it is being fetched waits for the same fetching,
   * and does not hear of it. Where it fails, the next asking fetches afresh.
   */
  module(tell?: (progress: Progress) => void): Promise<PaperModule> {
    if (this.#loading === null) {
      const loading = this.#load(tell).then(
        (module) => {
          this.#module = module;
          return module;
        },
        (error: unknown) => {
          if (this.#loading === loading) this.#loading = null;
          throw error;
        },
      );
      this.#loading = loading;
    }
    return this.#loading;
  }

  /** End the module's worker, which returns its memory to the browser. */
  close(): void {
    this.#module?.close();
    this.#module = null;
    this.#loading = null;
  }
}
