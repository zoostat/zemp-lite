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

/** What the worker tells while a run goes. */
export type RunEvent =
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
  | { type: "run"; script: string; text: string }
  | { type: "frame"; name: string }
  | { type: "read"; path: string };

/** The worker's answer to a request. */
export type Reply =
  | { type: "opened"; name: string }
  | { type: "filed"; path: string }
  | { type: "done"; exit_code: number; stdout: string; stderr: string; frames: FrameInfo[] }
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
  /** The frames the run's bindings hold. */
  frames: FrameInfo[];
  /** Whether the interface ended the worker to stop the run, so that the project in it is gone. */
  stopped: boolean;
}
