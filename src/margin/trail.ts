// The error's trail (open decision #183; the margin editor's design, 7.16.1). When an error is
// raised inside a function, the engine's message names the chain: the line that raised it
// (` --> file:line:col`) and, for each call that led there, what the call was given and where
// it was called (`= in: `call`, called at file:line:col`). The trail is that chain read back,
// from the script's line to the line that raised the error, every word the engine's. Nothing
// is run again; where a link is a pass of a loop, the engine does not yet say which (C22).

export interface Link {
  /** The file and the line of the link, counted from 1. */
  file: string;
  line: number;
  column: number;
  /** What the call was given, in the engine's words; for the last link, the error itself. */
  text: string;
  /** Whether this is the line that raised the error. */
  raised: boolean;
}

const CALL = /^\s*= in: `(.*)`, called at (.+):(\d+):(\d+)$/;
const PLACE = /^\s*--> (.+):(\d+):(\d+)$/;

/**
 * The trail of an error as the engine wrote it (`raw`, the message whole), from the script's
 * line to the line that raised it; empty where the error was not raised inside a function.
 */
export function trailOf(raw: string, sentence: string): Link[] {
  const lines = raw.split("\n");
  const calls: Link[] = [];
  let raisedAt: Link | null = null;
  for (const line of lines) {
    const place = PLACE.exec(line);
    if (place !== null && raisedAt === null) {
      raisedAt = {
        file: place[1] as string,
        line: Number(place[2]),
        column: Number(place[3]),
        text: sentence,
        raised: true,
      };
    }
    const call = CALL.exec(line);
    if (call !== null) {
      calls.push({
        file: call[2] as string,
        line: Number(call[3]),
        column: Number(call[4]),
        text: call[1] as string,
        raised: false,
      });
    }
  }
  if (calls.length === 0 || raisedAt === null) return [];
  // The engine names the innermost call first; the trail reads from the script's line down.
  return [...calls.reverse(), raisedAt];
}
