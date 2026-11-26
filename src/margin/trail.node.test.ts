// The error's trail on the engine itself, under Node (it needs the worker built, `npm run
// build:worker`): the kept script of the trail and a loop are run through the worker, and the
// trail is read from the record of the error the outcome carries (release 0.3, step 6d; open
// decision #175, C22). The trail of the kept script is the one the interface read from the
// printed message until then, link for link.
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { StatementInfo } from "../engine/messages";
import { trailOf } from "./trail";

const root = new URL("../../", import.meta.url);
const built = fileURLToPath(new URL("worker/pkg/node/zemp_worker.js", root));

/** A text run through the engine: the statement that stopped the run, and what the run said. */
function stopped(text: string): { error: StatementInfo["error"]; said: string } {
  expect(existsSync(built), "the worker is not built: run `npm run build:worker` first").toBe(true);
  (globalThis as { zeffHost?: unknown }).zeffHost = { event: () => {}, cancelled: () => false };
  const engine = createRequire(import.meta.url)(built) as {
    Project: new (name: string) => {
      run(script: string, text: string, deviceBytes: number, width: number): string;
    };
  };
  const done = JSON.parse(new engine.Project("demo").run("scripts/main.zeff", text, 0, 0)) as {
    stderr: string;
    statements: StatementInfo[];
  };
  return {
    error: done.statements.find((one) => one.error !== null)?.error ?? null,
    said: done.stderr,
  };
}

describe("the error's trail, on the engine", () => {
  it("is the chain of the kept script, from the script's line to the line that raised it", () => {
    const text = readFileSync(new URL("tests/scripts/trail.zeff", root), "utf8");
    const { error, said } = stopped(text);
    expect(said).toBe(readFileSync(new URL("tests/scripts/trail.stderr", root), "utf8"));
    const place = { file: "scripts/main.zeff", raised: false, pass: false };
    expect(trailOf(error)).toEqual([
      {
        ...place,
        line: 14,
        column: 7,
        text: "in_year(data: a frame of 18,412 rows × 11 variables, y: 1900)",
      },
      { ...place, line: 9, column: 5, text: "returns(data: a frame of 0 rows × 11 variables)" },
      {
        ...place,
        line: 3,
        column: 20,
        text: "no row remains to fit the model: the frame has no rows",
        raised: true,
      },
    ]);
    // Each call is written as the engine's own message writes it.
    for (const link of trailOf(error).filter((one) => !one.raised)) {
      expect(said).toContain(
        `= in: \`${link.text}\`, called at ${link.file}:${link.line}:${link.column}`,
      );
    }
  });

  it("names the pass of a loop, which the engine's printed message does not", () => {
    const { error, said } = stopped(
      [
        "/// One over a number.",
        "fn inv(x: Float) -> Float {",
        '    if x == 0 { error("zero") }',
        "    1 / x",
        "}",
        "for k in [2.0, 1.0, 0.0] {",
        "    print(inv(k))",
        "}",
        "",
      ].join("\n"),
    );
    expect(trailOf(error).map((link) => [link.line, link.text])).toEqual([
      [6, "pass 3 of 3: k = 0"],
      [7, "inv(x: 0)"],
      [3, "zero"],
    ]);
    expect(said).not.toContain("pass");
  });

  it("is empty for an error raised at the script's own line", () => {
    expect(trailOf(stopped('print(1)\nerror("stop")\n').error)).toEqual([]);
  });
});
