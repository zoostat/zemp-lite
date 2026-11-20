// A run, as the Output panel shows it: what each statement printed and said, under the line
// that made it (open decision #146, item 7; Zemp Specification, section 5). The engine tells
// a run as events (a statement started, a piece of output, a statement finished) and then its
// outcome; this file turns them into blocks, one for each line that has something to show.
// The words are the engine's: nothing here writes a message of its own.
import type { Outcome, Ranged, RunEvent, StatementInfo } from "../engine/messages";

/** One thing the engine said: a warning, a note or an error. */
export interface Said {
  kind: "warning" | "note" | "error";
  /** Its code, as `W0201`; a note has none. */
  code: string | null;
  /** Its one sentence, without the code before it and the line after it. */
  sentence: string;
  /** The line of the script it speaks of, where it names one. */
  line: number | null;
  /** The engine's advice, each `= help:` line of it. */
  help: string[];
  /** What an error shows of the script: the place, and the line with its mark. */
  detail: string;
  /** The message exactly as the engine wrote it. */
  raw: string;
}

const FIRST = /^(warning|error|note)(?:\[([A-Z]\d{4})\])?: (.*)$/;

/** The messages in what a run said (its `stderr`), in order. */
export function said(text: string): Said[] {
  const found: Said[] = [];
  let current: Said | null = null;
  const detail: string[] = [];
  const close = () => {
    if (current !== null) {
      // The frame of an error's excerpt is kept; blank edges of it are not.
      current.detail = detail.join("\n").replace(/^\n+|\s+$/g, "");
      found.push(current);
    }
    detail.length = 0;
  };
  for (const line of text.split("\n")) {
    const first = FIRST.exec(line);
    if (first !== null) {
      close();
      const [, kind, code, rest] = first as unknown as [
        string,
        Said["kind"],
        string | undefined,
        string,
      ];
      const at = /^(.*) \(line (\d+)\)$/.exec(rest);
      current = {
        kind,
        code: code ?? null,
        sentence: at === null ? rest : (at[1] as string),
        line: at === null ? null : Number(at[2]),
        help: [],
        detail: "",
        raw: `${line}\n`,
      };
    } else if (current !== null) {
      if (line !== "" || detail.length > 0) current.raw += `${line}\n`;
      const help = /^\s*= help: (.*)$/.exec(line);
      const place = /^\s*--> .*:(\d+):\d+$/.exec(line);
      if (help !== null) {
        current.help.push(help[1] as string);
      } else {
        if (place !== null && current.line === null) current.line = Number(place[1]);
        detail.push(line);
      }
    }
  }
  close();
  // The text ends with a line break, which is not a line of the last message.
  const last = found.at(-1);
  if (last !== undefined && text.endsWith("\n")) {
    last.raw = last.raw.replace(/\n\n$/, "\n");
  }
  return found;
}

/** One statement of a run. */
export interface Statement {
  /** Which statement, counted from 1, and the line it begins on. */
  statement: number;
  line: number;
  state: "running" | "done" | "failed";
  /** What it printed, and what the engine said while it ran, as written. */
  printed: string;
  saidRaw: string;
  /** How long it took, in milliseconds, by the interface's clock; `null` while it runs. */
  ms: number | null;
  /** The pass of a loop it is at, where it is a loop. */
  pass: { pass: number; of: number | null } | null;
  startedAt: number;
}

export interface Run {
  /** The script that ran, and its text as it was when Run was pressed. */
  script: string;
  text: string;
  /** How many statements the script has, once the engine has said. */
  of: number | null;
  /** The statements of the text as the engine reads them, once it has said: where each ends. */
  ranges: Ranged[] | null;
  statements: Statement[];
  /** Each statement as the outcome gives it: what it printed, said and made. Empty until the end. */
  info: StatementInfo[];
  /** The run's number in this window, counted from 1; 0 for a run that is not of the script. */
  number: number;
  /** Whether this is a Check alone, which runs nothing, and not a run. */
  checkOnly: boolean;
  /** What the engine said before the first statement started: what its check found. */
  beforeRaw: string;
  /** What was printed or said after the last statement finished. */
  afterPrinted: string;
  afterRaw: string;
  state: "running" | "done" | "failed" | "cancelled" | "stopped";
  /** When it started, as the time of day, and how long it took. */
  startedAt: number;
  clock: string;
  ms: number | null;
}

/** The time of day as the panel writes it, "9:05" or "15:42", from milliseconds since 1970. */
export function clockOf(time: number): string {
  const at = new Date(time);
  return `${at.getHours()}:${String(at.getMinutes()).padStart(2, "0")}`;
}

/** A run that has just been asked for. `now` is the interface's clock, in milliseconds. */
export function begin(script: string, text: string, now: number, clock: string): Run {
  return {
    script,
    text,
    of: null,
    ranges: null,
    number: 0,
    checkOnly: false,
    info: [],
    statements: [],
    beforeRaw: "",
    afterPrinted: "",
    afterRaw: "",
    state: "running",
    startedAt: now,
    clock,
    ms: null,
  };
}

/** Take an event of the run into it. */
export function hear(run: Run, event: RunEvent, now: number): void {
  const current = run.statements.at(-1);
  const going = current !== undefined && current.state === "running" ? current : null;
  switch (event.type) {
    case "ranges":
      run.ranges = event.statements;
      break;
    case "started":
      run.of = event.of;
      run.statements.push({
        statement: event.statement,
        line: event.line,
        state: "running",
        printed: "",
        saidRaw: "",
        ms: null,
        pass: null,
        startedAt: now,
      });
      break;
    case "output":
      if (going !== null) {
        going.printed += event.stdout;
        going.saidRaw += event.stderr;
      } else if (current === undefined) {
        run.beforeRaw += event.stderr;
        run.afterPrinted += event.stdout;
      } else {
        run.afterPrinted += event.stdout;
        run.afterRaw += event.stderr;
      }
      break;
    case "pass":
      if (going !== null) going.pass = { pass: event.pass, of: event.of };
      break;
    case "finished":
      if (going !== null) {
        going.state = event.failed ? "failed" : "done";
        going.ms = now - going.startedAt;
      }
      break;
  }
}

/** The run is over: how it ended. */
export function end(run: Run, outcome: Outcome, now: number): void {
  run.info = outcome.statements;
  // A run whose ranges were not told before it began has them from its outcome.
  if (run.ranges === null && outcome.statements.length > 0) {
    run.ranges = outcome.statements.map(({ line, end, kind }) => ({ line, end, kind }));
  }
  run.ms = now - run.startedAt;
  // A statement still marked as running did not finish: the run was ended under it.
  for (const statement of run.statements) {
    if (statement.state === "running") {
      statement.state = "failed";
      statement.ms = now - statement.startedAt;
    }
  }
  if (outcome.stopped) {
    run.state = "stopped";
  } else if (outcome.exitCode === 0) {
    run.state = "done";
  } else {
    run.state = /^error\[Z0705\]/m.test(outcome.stderr) ? "cancelled" : "failed";
  }
}

/**
 * Whether the engine's check refused the script: the run is over, no statement of it started,
 * and the engine named an error before the first. Nothing of the script was run.
 */
export function refused(run: Run): boolean {
  return (
    run.state === "failed" &&
    run.statements.length === 0 &&
    said(run.beforeRaw).some((one) => one.kind === "error")
  );
}

/** A block of the Output panel: what there is to show for one line of the script. */
export interface Block {
  /** The line of the script it stands under; `null` for what belongs to no line. */
  line: number | null;
  state: "running" | "done" | "failed";
  printed: string;
  said: Said[];
  ms: number | null;
  pass: { pass: number; of: number | null } | null;
}

/**
 * The blocks of a run, in the order of the script: a statement that printed or said
 * something, or is running, or failed; and what the engine's check found before the run,
 * each finding under the line it names.
 */
export function blocks(run: Run): Block[] {
  const found: Block[] = [];
  // What the check found: the run did not start, so these stand for the whole of it.
  const before = new Map<number | null, Said[]>();
  for (const one of said(run.beforeRaw)) {
    before.set(one.line, [...(before.get(one.line) ?? []), one]);
  }
  for (const [line, messages] of [...before].sort(([a], [b]) => (a ?? 0) - (b ?? 0))) {
    found.push({
      line,
      state: messages.some((one) => one.kind === "error") ? "failed" : "done",
      printed: "",
      said: messages,
      ms: null,
      pass: null,
    });
  }
  for (const statement of run.statements) {
    const messages = said(statement.saidRaw);
    if (statement.printed === "" && messages.length === 0 && statement.state === "done") {
      continue;
    }
    found.push({
      line: statement.line,
      state: statement.state,
      printed: statement.printed,
      said: messages,
      ms: statement.ms,
      pass: statement.pass,
    });
  }
  if (run.afterPrinted !== "" || run.afterRaw !== "") {
    found.push({
      line: null,
      state: "done",
      printed: run.afterPrinted,
      said: said(run.afterRaw),
      ms: null,
      pass: null,
    });
  }
  return found;
}

/** A time as the panel writes it: "42 ms" under a second, "0.31 s" under a minute, then "2 min 05 s". */
export function took(ms: number): string {
  if (ms < 999.5) {
    return `${Math.round(ms)} ms`;
  }
  if (ms < 59_995) {
    return `${(ms / 1000).toFixed(2)} s`;
  }
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)} min ${String(seconds % 60).padStart(2, "0")} s`;
}
