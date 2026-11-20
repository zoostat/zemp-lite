// The messages the interface and the engine's worker exchange (`worker/js/host.mjs`; Engine
// and Project Specification, section 8.3, point 7), as types. The interface sends Zeff source
// text and receives what the engine printed, the frames a run left and the files it wrote:
// it never calls the engine in any other way (Zemp Specification, section 1, principle 2).

/** A frame a run's bindings hold, as the outcome of the run lists it. */
export interface FrameInfo {
  name: string;
  rows: number;
  variables: number;
}

/**
 * One statement of a script as the engine reads it: the lines it begins and ends on, counted
 * from 1, and its kind. A chain written over several lines is one statement.
 */
export interface Ranged {
  line: number;
  end: number;
  kind: "statement" | "function" | "use";
}

/**
 * One statement of a run, as its outcome gives it: its range; the name it binds and the type
 * the engine names for what it makes (`Frame`, `RegFit`, `Plot`), where the engine knows
 * them; whether it ran, and what it printed and said; for a frame bound by `let`, its rows and
 * variables, and the bytes the engine counts for it. Every word and number is the engine's.
 */
export interface StatementInfo extends Ranged {
  name: string | null;
  type: string | null;
  ran: boolean;
  stdout: string;
  stderr: string;
  frame: { rows: number; variables: number } | null;
  memory: { own: number; kept: number } | null;
}

/** The engine's check of a text, as `zeff check` makes it. */
export interface Checked {
  /** 1 where it found an error, 0 otherwise. */
  exitCode: number;
  /** All it says, as `zeff check` writes it. */
  said: string;
  /** What it found, as `zeff check` writes it, without its last line. */
  found: string;
  /** Its last line: "checked scripts/main.zeff: no problems", "scripts/main.zeff: 1 error, 0 warnings". */
  summary: string;
  /** Each finding as the engine's own record of it. */
  findings: Record<string, unknown>[];
  /** The statements of the text, as the engine reads them. */
  ranges: Ranged[];
}

/**
 * What one statement needs, from the engine's dependency graph: the line it begins on, the
 * name it makes, the lines of the statements it reads from, whether it sets the seed, and the
 * lines of every statement it needs to run as it ran, itself included.
 */
export interface Needs {
  line: number;
  makes: string | null;
  reads: number[];
  seeds: boolean;
  needs: number[];
}

/** A code's explained page, as `zeff explain <code> --format json` gives it. */
export interface ExplainedPage {
  code: string;
  kind: string;
  title: string;
  /** The page as `zeff explain <code>` prints it. */
  text: string;
}

/**
 * The small distribution in a column's header, from the engine: for a number, a date or a
 * time, the count in each bin of the histogram it draws where a script asks for none, with
 * where the bins begin and how wide each is; for a category, a truth value, or a text or a
 * whole number of few values, the count of each value, by the cell the engine prints for it.
 */
export interface Bars {
  counts: number[];
  start?: number;
  width?: number;
  levels?: string[];
}

/** A variable of a frame as the data viewer shows it. */
export interface Variable {
  name: string;
  type: string;
  label: string;
  missing: number;
  /** Whether its cells line up on the right, as the engine prints them. */
  right: boolean;
  /** A category's contrast, as the engine names it; `null` for another type. */
  contrast: string | null;
  bars: Bars | null;
  /** A whole-number variable of few values: each value, and the cell printed for it. */
  codes: { code: number; shown: string }[] | null;
}

/** The answer to a filter: whether the engine ran it, how many rows it kept, and what it said. */
export interface Filtered {
  ok: boolean;
  rows: number;
  said: string;
}

/** How the data viewer shows a frame: kept to the rows of a condition, sorted, searched. */
export interface View {
  where: string;
  sort: { variable: string; desc: boolean } | null;
  search: string;
}

/**
 * Rows of a frame of the last run, for the data viewer: the engine's header line of the frame
 * and its count of rows; how many rows the view keeps; each variable; the rows of the view
 * from `offset`, each cell as the engine prints it; and the answer to the view's filter.
 */
export interface Rows {
  name: string;
  header: string;
  total: number;
  kept: number;
  offset: number;
  variables: Variable[];
  rows: string[][];
  filter: Filtered | null;
}

/** What the worker tells while a run goes. */
export type RunEvent =
  /** First, before any statement: the statements of the text, as the engine reads them. */
  | { type: "ranges"; statements: Ranged[] }
  /** A statement is about to run: which, counted from 1, of how many, and the line it begins on. */
  | { type: "started"; statement: number; of: number; line: number }
  /** The statement ran, or stopped with an error. */
  | { type: "finished"; statement: number; of: number; line: number; failed: boolean }
  /** A pass of a loop, with the number of passes where the loop knows it. */
  | { type: "pass"; pass: number; of: number | null; line: number }
  /** A piece of what the run prints (`stdout`) and says (`stderr`: warnings, notes, errors). */
  | { type: "output"; stdout: string; stderr: string };

/** A message the interface sends. Each carries an `id`, which its answer carries back. */
export type Request =
  | { type: "open"; name: string; cancel: SharedArrayBuffer | null }
  | { type: "file"; path: string; bytes: Uint8Array }
  /**
   * `width`: the characters tables are printed at; 0 or none for the engine's own, 118.
   * `only`: the lines of the statements to run alone, the others blanked.
   */
  | { type: "run"; script: string; text: string; width?: number; only?: number[] }
  | { type: "check"; script: string; text: string }
  | { type: "explain"; code: string }
  | { type: "language"; body: string }
  | { type: "help"; name: string }
  | {
      type: "rows";
      name: string;
      offset: number;
      limit: number;
      sort?: string;
      desc?: boolean;
      filtered?: boolean;
      search?: string;
    }
  | { type: "filter"; name: string; condition: string }
  | { type: "vars"; script: string; text: string }
  | { type: "dependencies"; script: string; text: string }
  /** The statements of a text as the engine reads them, without running it. */
  | { type: "statements"; script: string; text: string }
  | { type: "frame"; name: string }
  | { type: "read"; path: string };

/** The worker's answer to a request. */
export type Reply =
  | { type: "opened"; name: string }
  | { type: "filed"; path: string }
  | {
      type: "done";
      exit_code: number;
      stdout: string;
      stderr: string;
      statements: StatementInfo[];
      frames: FrameInfo[];
    }
  | { type: "statements"; statements: Ranged[] }
  | {
      type: "checked";
      exit_code: number;
      said: string;
      found: string;
      summary: string;
      findings: Record<string, unknown>[];
      ranges: Ranged[];
    }
  | { type: "dependencies"; statements: Needs[] }
  | { type: "explained"; page: ExplainedPage }
  | { type: "language"; messages: string[] }
  | { type: "help"; page: string | null; message: string }
  | ({ type: "rows" } & Omit<Rows, "filter">)
  | ({ type: "filter" } & Filtered)
  | { type: "vars"; printed: string; said: string }
  | { type: "frame"; name: string; bytes: Uint8Array }
  | { type: "read"; path: string; bytes: Uint8Array | null }
  | { type: "error"; message: string };

/** Everything the worker may say. */
export type FromWorker = { type: "ready"; version: string } | RunEvent | (Reply & { id?: number });

/** How a run ended. */
export interface Outcome {
  /** The engine's exit code: 0 where every statement ran. `null` where the run was stopped by ending the worker. */
  exitCode: number | null;
  /** Everything the run printed. */
  stdout: string;
  /** Everything the run said: its warnings, notes and errors. */
  stderr: string;
  /** Each statement of the text, with what it printed, said and made; none where the run was stopped. */
  statements: StatementInfo[];
  /** The frames the run's bindings hold. */
  frames: FrameInfo[];
  /** Whether the interface ended the worker to stop the run, so that the project in it is gone. */
  stopped: boolean;
}
