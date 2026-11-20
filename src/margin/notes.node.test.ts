// The notes of the example, from the engine itself under Node (it needs the worker built,
// `npm run build:worker`): one note for each statement on its first line, and every word and
// number of every note found in what the engine returned (the design's acceptance test: "No
// number in a note is formatted by the interface").
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { Outcome, RunEvent, StatementInfo } from "../engine/messages";
import { begin, end, hear } from "../output/run";
import { notesOf } from "./notes";

const root = new URL("../../", import.meta.url);
const built = fileURLToPath(new URL("worker/pkg/node/zemp_worker.js", root));

interface Project {
  run(script: string, text: string, deviceBytes: number, width: number): string;
}

/** The example run through the engine, its events heard into a run as the interface hears them. */
function exampleRun() {
  expect(existsSync(built), "the worker is not built: run `npm run build:worker` first").toBe(true);
  const heard: RunEvent[] = [];
  (globalThis as { zeffHost?: unknown }).zeffHost = {
    event: (json: string) => heard.push(JSON.parse(json) as RunEvent),
    cancelled: () => false,
  };
  const engine = createRequire(import.meta.url)(built) as {
    Project: new (name: string) => Project;
    statements: (script: string, text: string) => string;
  };
  const text = readFileSync(new URL("examples/scratch/scripts/main.zeff", root), "utf8");
  const done = JSON.parse(new engine.Project("scratch").run("scripts/main.zeff", text, 0, 0)) as {
    exit_code: number;
    stdout: string;
    stderr: string;
    statements: StatementInfo[];
  };
  const ranges = JSON.parse(engine.statements("scripts/main.zeff", text)) as {
    statements: RunEvent & { type: "statements" };
  };
  const run = begin("scripts/main.zeff", text, 0, "9:42");
  hear(
    run,
    { type: "ranges", statements: (ranges as unknown as { statements: never }).statements },
    0,
  );
  for (const event of heard) hear(run, event, 1);
  const outcome: Outcome = {
    exitCode: done.exit_code,
    stdout: done.stdout,
    stderr: done.stderr,
    statements: done.statements,
    frames: [],
    stopped: false,
  };
  end(run, outcome, 2);
  return { run, done };
}

describe("the notes of the example", () => {
  it("are one on the first line of each statement, saying what it made and how large", () => {
    const { run } = exampleRun();
    const notes = notesOf(run);
    expect(notes.map((note) => note.line)).toEqual([4, 5, 8, 12, 13, 16, 17, 20, 21]);
    expect(notes.every((note) => note.state === "fresh")).toBe(true);
    const at = (line: number) => notes.find((note) => note.line === line)!;
    expect(at(4).main).toBe("wages");
    expect(at(4).sub).toBe("Frame · 18,412 × 11");
    expect(at(5).main).toBe("w2010");
    expect(at(5).sub).toMatch(/^Frame · [\d,]+ × 11$/);
    expect(at(8).main).toBe("summary");
    expect(at(8).sub).toBe("Table · by female");
    expect(at(8).tags).toEqual([{ text: "W0201", kind: "warning" }]);
    expect(at(12).main).toBe("fit");
    expect(at(17).place).toBe("plots");
    expect(at(17).main).toBe("plot");
    // A `let` that printed and said nothing has nothing to unfold; one the engine said a
    // note of has (line 16: rows with NA dropped), and so has a statement that printed.
    expect(at(4).opens).toBe(false);
    expect(at(16).opens).toBe(true);
    expect(at(17).opens).toBe(true);
  });

  it("hold no word or number that the engine did not return", () => {
    const { run, done } = exampleRun();
    const returned = JSON.stringify(done);
    for (const note of notesOf(run)) {
      for (const word of [
        note.main,
        ...note.sub.split(" · "),
        ...note.tags.map((tag) => tag.text),
      ]) {
        if (word === "") continue;
        // A frame's size is written as the engine writes a count, with its thousands set apart.
        const parts = word.split(" × ").map((part) => part.replaceAll(",", ""));
        for (const part of parts) {
          expect(returned.includes(part) || returned.includes(word), `${note.line}: ${word}`).toBe(
            true,
          );
        }
      }
    }
  });
});
