// A test that runs the engine itself, under Node, so it is named `.node.test.ts` and
// type-checked with the tools; it needs the worker built (`npm run build:worker`).
//
// The text the interface sends for the figures of the example, run through the engine's
// worker build, writes the files the released `zeff run` 0.8.0 wrote for the same text
// (`tests/scripts/figures/`), byte for byte: the figure a pane shows is the figure `export`
// writes at that size, and nothing of the interface's is in it.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = new URL("../../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root));
const built = fileURLToPath(new URL("worker/pkg/node/zemp_worker.js", root));

interface Project {
  run(script: string, text: string, deviceBytes: number): string;
  file(path: string): Uint8Array | undefined;
}

/** The engine's worker build, under Node, with nobody listening and nothing cancelled. */
function engine(): { Project: new (name: string) => Project } {
  expect(existsSync(built), "the worker is not built: run `npm run build:worker` first").toBe(true);
  (globalThis as { zeffHost?: unknown }).zeffHost = { event() {}, cancelled: () => false };
  return createRequire(import.meta.url)(built) as { Project: new (name: string) => Project };
}

describe("the figures the interface asks the engine for", () => {
  it("are, byte for byte, the files `zeff run` 0.8.0 writes for the same text", () => {
    const project = new (engine().Project)("figures");
    const text = read("tests/scripts/figures/example-with-exports.zeff").toString("utf8");
    const done = JSON.parse(project.run("scripts/main.zeff", text, 0)) as {
      exit_code: number;
      stdout: string;
      stderr: string;
    };
    expect(done.exit_code, done.stderr).toBe(0);
    // The script's own output is unchanged by what was added: the added lines print nothing.
    expect(done.stdout).toBe(read("tests/scripts/example/expected/stdout.txt").toString("utf8"));
    for (const index of [1, 2]) {
      const written = project.file(`output/zemp-figure-${index}.svg`);
      expect(written).toBeDefined();
      expect(
        Buffer.from(written as Uint8Array).equals(
          read(`tests/scripts/figures/example-figure-${index}.svg`),
        ),
      ).toBe(true);
    }
    // 150.02 mm by 93.13 mm, which is 567 by 352 pixels of the screen, written in points.
    expect(
      Buffer.from(project.file("output/zemp-figure-1.svg") as Uint8Array).toString("utf8"),
    ).toMatch(/<svg [^>]*width="425\.2\d*pt" height="26[34]\.\d+pt"/);
  });

  it("of the showcase of plots are, byte for byte, the 21 files `zeff run` 0.8.0 writes", () => {
    const project = new (engine().Project)("scratch");
    const text = read("tests/scripts/figures/plots-with-exports.zeff").toString("utf8");
    const done = JSON.parse(project.run("scripts/plots.zeff", text, 0)) as {
      exit_code: number;
      stdout: string;
      stderr: string;
    };
    expect(done.exit_code, done.stderr).toBe(0);
    expect(done.stdout).toBe(read("examples/scratch/expected/plots.stdout").toString("utf8"));
    const wanted = read("tests/scripts/figures/plots-figures.sha256")
      .toString("utf8")
      .trim()
      .split("\n")
      .map((line) => line.split(/\s+/));
    expect(wanted).toHaveLength(21);
    for (const [digest, file] of wanted) {
      const written = project.file(`output/${file}`);
      expect(written, file).toBeDefined();
      const got = createHash("sha256")
        .update(written as Uint8Array)
        .digest("hex");
      expect(got, file).toBe(digest);
    }
  });
});
