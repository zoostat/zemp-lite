// The examples of a help page, run in the page (release 0.3, step 9; open decision #211, item
// 11). A page of the engine prints its examples as a terminal would: a line of comment, the
// statements typed after `> `, and what they printed. This reads them apart, writes the script
// that runs one, and reads back what the engine printed and said for it. No word of an output
// is written here: it is the page's kept text until the engine's own arrives, and the
// engine's from then on.
//
// The engine runs the examples of one page as one script, in order, because a later example
// uses what an earlier one bound (`zeff_engine::examples`), and a warning of a page names the
// line of that script. So an example is run with those above it, as they stand in the page,
// and an example that stands outside the page's EXAMPLES (the wrong call of "A common
// mistake") is run after all of them, as the engine runs it.
import type { ExampleOutcome, StatementInfo } from "../engine/messages";
import type { ExampleLine } from "./read";

/** One example of a page. */
export interface PageExample {
  /** The lines of comment above its statements, as printed. */
  lead: string[];
  /** The statements typed, a line each, without their prompts. */
  code: string[];
  /** What the page says they print. */
  kept: string[];
}

/**
 * The examples of a block of a page, in order. An example begins at a statement typed after
 * something printed; the lines of comment straight above it are its own, not what the example
 * before it printed.
 */
export function examplesOf(lines: ExampleLine[]): PageExample[] {
  const all: PageExample[] = [];
  let now: PageExample = { lead: [], code: [], kept: [] };
  for (const line of lines) {
    if (line.typed) {
      if (now.kept.length > 0) {
        // The comment that leads the next example was read as printed by this one.
        const lead: string[] = [];
        while (now.kept.at(-1)?.trimStart().startsWith("//")) lead.unshift(now.kept.pop() ?? "");
        while (now.kept.at(-1) === "") now.kept.pop();
        all.push(now);
        now = { lead, code: [], kept: [] };
      }
      now.code.push(line.text);
    } else if (now.code.length === 0) {
      if (line.text !== "" || now.lead.length > 0) now.lead.push(line.text);
    } else {
      now.kept.push(line.text);
    }
  }
  while (now.kept.at(-1) === "") now.kept.pop();
  if (now.lead.length > 0 || now.code.length > 0 || now.kept.length > 0) all.push(now);
  return all;
}

/** The lines of a text an example holds, as it is typed in the page. */
export const linesOf = (text: string): string[] => text.replace(/\n+$/, "").split("\n");

/** A script that runs examples, and the lines each stands on in it, counted from 1. */
export interface Composed {
  text: string;
  ranges: { first: number; last: number }[];
}

/** The script of some examples, in order: each one's statements, as they stand. */
export function composed(texts: string[]): Composed {
  const lines: string[] = [];
  const ranges: Composed["ranges"] = [];
  for (const text of texts) {
    const own = linesOf(text);
    ranges.push({ first: lines.length + 1, last: lines.length + own.length });
    lines.push(...own);
  }
  return { text: `${lines.join("\n")}\n`, ranges };
}

/**
 * Whether a line of what the engine said is part of a diagnostic's source excerpt (the line
 * ` --> file:line:column`, the gutter and the statement quoted), as the engine's own pages
 * tell it (`is_source_excerpt`).
 */
export function isExcerpt(line: string): boolean {
  const trimmed = line.trimStart();
  if (trimmed.startsWith("-->") || trimmed.startsWith("|")) return true;
  return /^\d+ +\|/.test(trimmed);
}

/**
 * What the engine said, as its pages show a diagnostic: without the source excerpt, which
 * names the examples' script and a line of it and not the page; a `= help:` line two spaces
 * in, wherever the statement stood (`help_line`).
 */
export function asPages(said: string): string[] {
  return said
    .split("\n")
    .filter((line) => !isExcerpt(line))
    .map((line) => (line.trimStart().startsWith("= ") ? `  ${line.trimStart()}` : line));
}

/** The lines of a text, a last line break being no line. */
const lined = (text: string): string[] => (text === "" ? [] : text.replace(/\n$/, "").split("\n"));

/** A piece of what an example gave: lines printed and said, or the plot of a statement. */
export type Part = { kind: "text"; lines: string[] } | { kind: "plot"; line: number };

/** What a run gave for one example. */
export interface Given {
  /** What its statements printed and said, in order, each plot after its statement's lines. */
  parts: Part[];
  /** Whether a statement of it ran. */
  ran: boolean;
  /** Whether a statement of it stopped with an error. */
  failed: boolean;
}

/**
 * What each example of a script got from its run. An error found before anything ran (the
 * engine's check refuses the script) belongs to no statement: it is given to the example
 * whose line the engine points at, or to the example `asked` for (the last where none is
 * named) where it points at none.
 */
export function givenBy(
  outcome: ExampleOutcome,
  ranges: Composed["ranges"],
  asked = ranges.length - 1,
): Given[] {
  const plots = new Set(outcome.plots.map((plot) => plot.line));
  const within = (range: Composed["ranges"][number]) => (one: StatementInfo) =>
    one.line >= range.first && one.line <= range.last;
  const all = ranges.map((range): Given => {
    const parts: Part[] = [];
    let ran = false;
    let failed = false;
    for (const statement of outcome.statements.filter(within(range))) {
      ran ||= statement.ran;
      failed ||= statement.error !== null && statement.error !== undefined;
      // What it printed, then what the engine said of it, as the engine's pages order them.
      const text = [
        ...lined(statement.stdout),
        ...(statement.stderr === "" ? [] : asPages(statement.stderr.replace(/\n$/, ""))),
      ];
      const last = parts.at(-1);
      if (text.length > 0) {
        if (last?.kind === "text") last.lines.push(...text);
        else parts.push({ kind: "text", lines: text });
      }
      if (plots.has(statement.line)) parts.push({ kind: "plot", line: statement.line });
    }
    return { parts, ran, failed };
  });
  const placed = outcome.statements.some((one) => one.stderr !== "");
  if (outcome.exitCode !== 0 && !placed && outcome.stderr !== "") {
    // The example whose statement the engine points at (` --> examples.zeff:2:12`), where it
    // points at one.
    const at = Number(/^\s*--> [^\n:]*:(\d+):\d+/m.exec(outcome.stderr)?.[1] ?? Number.NaN);
    const pointed = ranges.findIndex((range) => at >= range.first && at <= range.last);
    const to = all[pointed >= 0 ? pointed : Math.min(Math.max(asked, 0), all.length - 1)];
    if (to !== undefined) {
      to.parts.push({ kind: "text", lines: asPages(outcome.stderr.replace(/\n$/, "")) });
      to.failed = true;
    }
  }
  return all;
}

/**
 * Where an example of the page is in its life: showing the page's kept text (`kept`); asked
 * for and waiting its turn; running; showing what the engine gave (`ran`); stopped as too
 * slow; not reached, because the engine stopped at an error in another example; or not run,
 * because the engine could not be asked.
 */
export type Phase = "kept" | "waiting" | "running" | "ran" | "slow" | "unreached" | "refused";

/** An example of a page as the page holds it. */
export interface Held {
  /** Its statements as the page has them, and as they stand now. */
  own: string;
  text: string;
  /** The text last run, where it has run. */
  ranText: string | null;
  phase: Phase;
  /** What it shows under its statements: the page's kept lines until the engine's arrive. */
  parts: Part[];
  /** How long the run that gave them took, in milliseconds. */
  ms: number | null;
  /** The engine's words where it could not be asked. */
  problem: string;
}

/** An example as its page opens: the page's statements and the page's kept output. */
export function fresh(example: PageExample): Held {
  const own = example.code.join("\n");
  return {
    own,
    text: own,
    ranText: null,
    phase: "kept",
    parts: example.kept.length > 0 ? [{ kind: "text", lines: example.kept }] : [],
    ms: null,
    problem: "",
  };
}

/** Whether its statements are not the page's own. */
export const changed = (held: Held): boolean => linesOf(held.text).join("\n") !== held.own;

/** Whether its statements have been changed since what is shown under them was made. */
export const stale = (held: Held): boolean =>
  linesOf(held.text).join("\n") !== (held.ranText ?? held.own);

/** Whether it is asked for and not yet answered. */
export const busy = (held: Held): boolean => held.phase === "waiting" || held.phase === "running";

/** The example after the engine's answer for it: what it gave, and how the run ended for it. */
export function answered(
  held: Held,
  ranText: string,
  given: Given,
  outcome: ExampleOutcome,
  ms: number,
): Held {
  // An example the run never reached keeps what it showed: nothing of it was run.
  if (!given.ran && given.parts.length === 0 && outcome.exitCode !== 0) {
    return { ...held, phase: outcome.stopped === "slow" ? "slow" : "unreached", ms: null };
  }
  // The one the engine was in when its time ran out says so beside what it had printed.
  const slow = outcome.stopped === "slow" && given.failed;
  return {
    ...held,
    ranText: linesOf(ranText).join("\n"),
    phase: slow ? "slow" : "ran",
    parts: given.parts,
    ms,
    problem: "",
  };
}

/**
 * What stands beside an example's buttons, in the app's words: nothing while it shows the
 * page's kept text unasked.
 */
export function statusOf(held: Held, seconds: number): string {
  if (held.phase === "waiting") return "waiting to run";
  if (held.phase === "running") return "running…";
  if (held.phase === "refused") return `not run: ${held.problem}`;
  if (stale(held)) return "edited · not run";
  if (held.phase === "slow") return `stopped: the examples ran for more than ${seconds} seconds`;
  if (held.phase === "unreached")
    return "not run: the engine stopped at an error in another example";
  if (held.phase === "ran" && held.ms !== null) return `run by the engine in ${took(held.ms)}`;
  return "";
}

/** A time for a reader: `12 ms`, `1.4 s`. */
function took(ms: number): string {
  return ms < 1000 ? `${Math.max(1, Math.round(ms))} ms` : `${(ms / 1000).toFixed(1)} s`;
}

/** A piece of a line of output: text, or a code of the engine's, which opens its page. */
export type Said = { kind: "text"; text: string } | { kind: "code"; code: string };

/** A line of output in its pieces: the code of a warning or an error apart (`warning[W0201]`). */
export function saidOf(line: string): Said[] {
  const found = /^(\s*(?:error|warning|note)\[)([A-Z]\d{4})(\].*)$/.exec(line);
  if (found === null) return [{ kind: "text", text: line }];
  return [
    { kind: "text", text: found[1] ?? "" },
    { kind: "code", code: found[2] ?? "" },
    { kind: "text", text: found[3] ?? "" },
  ];
}
