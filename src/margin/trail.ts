// The error's trail (open decision #183; the margin editor's design, 7.16.1). When an error is
// raised inside a function or a loop, the engine names the chain that led to it: the line
// that raised it and, for each call on the way, the function, what it was given and where it
// was called; and for a loop, the pass it was in. The trail is that chain read back, from the
// script's line to the line that raised the error, every word the engine's. Nothing is run
// again.
//
// The chain is read from the engine's own record of the error, as fields (open decision
// #175, C22; from Zeff 0.9.0), which the outcome of a run carries for the statement that
// stopped it. Until release 0.3 it was read from the printed message, line by line, which
// could not say the pass of a loop.

export interface Link {
  /** The file and the line of the link, counted from 1. */
  file: string;
  line: number;
  column: number;
  /**
   * What the call was given, in the engine's words; for a pass of a loop, which pass it was
   * and what the loop's variable held; for the last link, the error itself.
   */
  text: string;
  /** Whether this is the line that raised the error. */
  raised: boolean;
  /** Whether this is a pass of a loop, and not a call. */
  pass: boolean;
}

const text = (value: unknown): string => (typeof value === "string" ? value : "");
const count = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const fields = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

/** A link of the engine's chain as the trail writes it, or `null` where it has no place. */
function linkOf(step: Record<string, unknown>): Link | null {
  const line = count(step["line"]);
  if (line === null) return null;
  const at = { file: text(step["file"]), line, column: count(step["column"]) ?? 1 };
  if (step["kind"] === "pass") {
    // "pass 3 of 3: k = 0"; a loop that does not know its length says the pass alone.
    const pass = count(step["pass"]);
    const of = count(step["of"]);
    const variable = text(step["variable"]);
    const which = pass === null ? "a pass" : of === null ? `pass ${pass}` : `pass ${pass} of ${of}`;
    return {
      ...at,
      text: variable === "" ? which : `${which}: ${variable} = ${text(step["value"])}`,
      raised: false,
      pass: true,
    };
  }
  // A call: the function and what it was given, as the engine's message writes it.
  const given = (Array.isArray(step["given"]) ? step["given"] : [])
    .map(fields)
    .map((one) => `${text(one["name"])}: ${text(one["value"])}`);
  return {
    ...at,
    text: `${text(step["function"])}(${given.join(", ")})`,
    raised: false,
    pass: false,
  };
}

/**
 * The trail of an error, from the engine's record of it (`error`, as the outcome of a run
 * gives it for the statement that stopped the run): from the script's line to the line that
 * raised it. Empty where the error was not raised inside a function or a loop, and where
 * there is no record.
 */
export function trailOf(error: Record<string, unknown> | null | undefined): Link[] {
  if (error === null || error === undefined) return [];
  const chain = (Array.isArray(error["chain"]) ? error["chain"] : [])
    .map(fields)
    .map(linkOf)
    .filter((link) => link !== null);
  const span = fields(error["span"]);
  const line = count(span["line"]);
  if (chain.length === 0 || line === null) return [];
  // The engine names the innermost first; the trail reads from the script's line down.
  return [
    ...chain.reverse(),
    {
      file: text(error["file"]),
      line,
      column: count(span["column"]) ?? 1,
      text: text(error["message"]),
      raised: true,
      pass: false,
    },
  ];
}
