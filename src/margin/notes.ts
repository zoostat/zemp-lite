// The notes of the margin editor (open decision #174; its design, section 7.3): one line
// beside each statement saying what it made and how large it is, and no more. Every word and
// number in a note is the engine's: the name a `let` binds, the type the engine names, a
// frame's rows and variables, the head of what the statement printed, the codes of what it
// said. The interface adds the state of the result (running, waiting, edited, failed) in words.
import { said, type Run } from "../output/run";
import type { Mark } from "./stale";

/** A word on a note: a warning's or an error's code, or the state of the result. */
export interface Tag {
  text: string;
  kind: "warning" | "error" | "state";
}

export interface Note {
  /** The line the statement begins on, counted from 1: the row the note stands on. */
  line: number;
  /** The name it binds, or the verb of a statement that is not a `let`. */
  main: string;
  /** The type the engine names, and the size where the engine gives one. */
  sub: string;
  tags: Tag[];
  state: "fresh" | "running" | "waiting" | "failed" | "not run" | "edited" | "stale";
  /** Whether it has an output to unfold: something printed or said. */
  opens: boolean;
  /** The place that shows what it made at length: Plots for a plot; none otherwise yet. */
  place: "plots" | null;
}

/**
 * A whole number as the engine writes one, its thousands set apart by commas ("18,412"), so
 * that a note reads as the engine's print does.
 */
export function counted(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** The first line of a text, its end trimmed. */
const firstLine = (text: string) => (text.split("\n")[0] ?? "").trimEnd();

/** What the engine prints first for a statement that ends in a plot. */
const PLOT = "plot · ";

/**
 * The notes of a run, one for each statement of its text, in order. `marked` gives, by the
 * line a statement began on in the run's text, how its result stands to the script as it is
 * now (`src/margin/stale.ts`); a result a run of less than the script kept carries its own mark.
 */
export function notesOf(run: Run, marked: ReadonlyMap<number, { mark: Mark }> = new Map()): Note[] {
  const ranges = (run.ranges ?? []).filter((range) => range.kind === "statement");
  const ended = run.state !== "running";
  return ranges.map((range) => {
    const event = run.statements.find((one) => one.line === range.line);
    const info = run.info.find((one) => one.line === range.line);
    const printed = info?.stdout ?? event?.printed ?? "";
    const spoken = info?.stderr ?? event?.saidRaw ?? "";
    const type = info?.type ?? null;

    let state: Note["state"] = "fresh";
    if (event?.state === "running") state = "running";
    else if (event?.state === "failed") state = "failed";
    else if (event === undefined) state = ended ? "not run" : "waiting";
    else if (event.mark !== undefined) state = event.mark;
    const live = marked.get(range.line)?.mark;
    if (ended && live !== undefined && live !== "fresh" && state !== "edited") state = live;
    // A run of less than the script that stopped before a statement it was asked for.
    const failed = run.statements.find((one) => one.state === "failed" && one.mark === undefined);
    const asked = run.partial?.includes(range.line) ?? false;
    const stopped =
      ended &&
      asked &&
      failed !== undefined &&
      failed.line < range.line &&
      (event === undefined || event.mark !== undefined);

    let main = "";
    let sub = "";
    if (info?.name != null) {
      main = info.name;
      sub =
        info.frame === null
          ? (type ?? "")
          : `${type ?? "Frame"} · ${counted(info.frame.rows)} × ${counted(info.frame.variables)}`;
    } else if (printed !== "") {
      const first = firstLine(printed);
      const at = first.indexOf(" · ");
      if (at > 0) {
        main = first.slice(0, at);
        sub = [type, first.slice(at + 3)]
          .filter((part) => part !== null && part !== "")
          .join(" · ");
      } else {
        main = first;
        sub = type ?? "";
      }
    } else if (type !== null && type !== "Nothing") {
      main = type;
    }
    if (event?.pass) {
      const passes = event.pass.of ?? event.pass.pass;
      sub = [sub, `${counted(passes)} pass${passes === 1 ? "" : "es"}`]
        .filter((part) => part !== "")
        .join(" · ");
    }

    const tags: Tag[] = [];
    for (const one of said(spoken)) {
      if ((one.kind === "warning" || one.kind === "error") && one.code !== null) {
        if (!tags.some((tag) => tag.text === one.code))
          tags.push({ text: one.code, kind: one.kind });
      }
    }
    const words: Partial<Record<Note["state"], string>> = {
      running: "running…",
      waiting: "waiting",
      failed: "failed",
      "not run": "not run",
      edited: "edited · not run",
      stale: "stale",
    };
    if (stopped) {
      state = "not run";
      tags.push({ text: `not run · line ${failed.line} failed`, kind: "state" });
    } else {
      const word = words[state];
      if (word !== undefined) tags.push({ text: word, kind: "state" });
    }

    return {
      line: range.line,
      main,
      sub,
      tags,
      state,
      opens: printed !== "" || spoken !== "" || (event?.passes.length ?? 0) > 0,
      place: printed.startsWith(PLOT) ? "plots" : null,
    };
  });
}
