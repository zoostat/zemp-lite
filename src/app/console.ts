// The console line (Zemp Specification, section 5): a statement typed there runs after the
// script without being added to it. At Zeff 0.7.0 the engine keeps nothing between two runs
// in a browser, so the console does what `zeff repl` does: it runs the script, then the
// statements the console has kept, then the new one, and shows what the new one printed and
// said. The script is never changed.
import { blocks, begin, end, hear, type Block, type Run, type Said } from "../output/run";
import type { Outcome, RunEvent } from "../engine/messages";

/**
 * The console's commands, for `:help`: in the form `zeff repl` lists its own, with the
 * console's statements standing for its session, and `:clear`, the console's own.
 */
export const CONSOLE_HELP = `\
Type a statement to run it after the script; it is not added to the script. The console keeps
it, so that the next statement sees what it made. ↑ and ↓ recall what was typed, Tab completes,
and ⌘↵ (Ctrl ↵) copies the line into the script at the cursor.

  :vars             list the bindings and their types
  :save <path>      write the console's statements as a script of the project
  :clear            empty the console and forget its statements
  :help <name>      a function's help page, a package's functions, or a code such as Z0101
  :help             this text
`;

/** One statement typed in the console, with what came of it. */
export interface Entry {
  statement: string;
  state: "running" | "done" | "failed";
  printed: string;
  said: Said[];
  /** A word from the console itself, for a line that begins with a colon. */
  told: string;
}

/** The text the engine is given: the script, the statements kept, and the new one. */
export function composed(
  script: string,
  kept: string[],
  statement: string,
): { text: string; from: number } {
  const before = [script.replace(/\n+$/, ""), ...kept].join("\n");
  // The line the new statement begins on, counted from 1.
  const from = before === "" ? 1 : before.split("\n").length + 1;
  return { text: `${before === "" ? "" : `${before}\n`}${statement}\n`, from };
}

/**
 * What a console statement printed and said, read from the run of the composed text: the
 * blocks of the lines from `from` on; and, where the run stopped before reaching it, the
 * block that stopped it, since that is why nothing came of the statement.
 */
export function outcomeOf(
  run: Run,
  from: number,
): { state: "done" | "failed"; printed: string; said: Said[] } {
  const all = blocks(run);
  const own = all.filter((block) => block.line !== null && block.line >= from);
  const stopped = all.find((block) => block.state === "failed" && (block.line ?? 0) < from);
  const shown: Block[] = stopped === undefined ? own : [stopped, ...own];
  return {
    state: run.state === "done" ? "done" : "failed",
    printed: shown.map((block) => block.printed).join(""),
    said: shown.flatMap((block) => block.said),
  };
}

/** A run of the composed text, told by its events; what a test or the window calls. */
export function consoleRun(
  script: string,
  text: string,
): {
  run: Run;
  hear: (event: RunEvent) => void;
  end: (outcome: Outcome) => void;
} {
  const run = begin(script, text, 0, "");
  return {
    run,
    hear: (event) => hear(run, event, 0),
    end: (outcome) => end(run, outcome, 0),
  };
}

/** What was typed before, recalled with ↑ and ↓; what is being typed is kept while looking back. */
export class History {
  readonly #lines: string[] = [];
  /** How far back the console is looking: 0 is the line being typed. */
  #back = 0;
  #draft = "";

  /** A line was entered. One entered twice running is kept once. */
  add(line: string): void {
    if (line.trim() !== "" && this.#lines.at(-1) !== line) {
      this.#lines.push(line);
    }
    this.#back = 0;
    this.#draft = "";
  }

  /** The line before the one shown; `typing` is what the box holds now. */
  up(typing: string): string {
    if (this.#back === 0) this.#draft = typing;
    if (this.#back < this.#lines.length) this.#back += 1;
    return this.#back === 0
      ? this.#draft
      : (this.#lines[this.#lines.length - this.#back] as string);
  }

  /** The line after the one shown, down to the line that was being typed. */
  down(typing: string): string {
    if (this.#back === 0) return typing;
    this.#back -= 1;
    return this.#back === 0
      ? this.#draft
      : (this.#lines[this.#lines.length - this.#back] as string);
  }
}
