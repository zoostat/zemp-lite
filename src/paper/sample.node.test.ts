// A test that runs the engine and Typst themselves, under Node, so it is named
// `.node.test.ts`; it needs both built (`npm run build:worker`, `npm run build:paper`).
//
// The sample paper of the Scratch project (release 0.3, step 15c): the table and the figure
// kept with it are, byte for byte, what its script writes when the engine runs it; and the
// paper sets, with those two files and the fonts the page carries, to one page with nothing
// said. With `ZEMP_KEEP_SAMPLE_PAPER=1` the two files are written afresh from the engine.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { exportsOf } from "./exports";

const root = new URL("../../", import.meta.url);
const at = (path: string) => fileURLToPath(new URL(path, root));
const read = (path: string) => readFileSync(at(path));
const SCRIPT = "scripts/paper.zeff";
const WRITTEN = ["output/returns.typ", "output/schooling.svg"];

interface Project {
  add_file(path: string, bytes: Uint8Array): boolean;
  run(script: string, text: string, deviceBytes: number): string;
  file(path: string): Uint8Array | undefined;
}
interface Paper {
  add_font(bytes: Uint8Array): number;
  put_text(path: string, text: string): boolean;
  put_bytes(path: string, bytes: Uint8Array): boolean;
  set(): string;
  outline(): string;
}

function engine(): { Project: new (name: string) => Project } {
  const built = at("worker/pkg/node/zemp_worker.js");
  expect(existsSync(built), "the worker is not built: run `npm run build:worker` first").toBe(true);
  (globalThis as { zeffHost?: unknown }).zeffHost = { event() {}, cancelled: () => false };
  return createRequire(import.meta.url)(built) as { Project: new (name: string) => Project };
}

function typst(): { Paper: new (main: string) => Paper } {
  const built = at("paper/pkg/node/zemp_paper.js");
  expect(existsSync(built), "the Paper module is not built: run `npm run build:paper` first").toBe(
    true,
  );
  return createRequire(import.meta.url)(built) as { Paper: new (main: string) => Paper };
}

describe("the sample paper of the Scratch project", () => {
  it("has a script that exports its table and its figure, and nothing else", () => {
    expect(exportsOf(read(`examples/scratch/${SCRIPT}`).toString("utf8"))).toEqual(WRITTEN);
  });

  it("keeps the table and the figure its script writes, byte for byte as the engine writes them", () => {
    const project = new (engine().Project)("scratch");
    project.add_file("zeff.toml", read("examples/scratch/zeff.toml"));
    const text = read(`examples/scratch/${SCRIPT}`).toString("utf8");
    project.add_file(SCRIPT, new TextEncoder().encode(text));
    const done = JSON.parse(project.run(SCRIPT, text, 0)) as {
      exit_code: number;
      stderr: string;
      written: string[];
    };
    expect(done.exit_code, done.stderr).toBe(0);
    expect(done.written).toEqual(WRITTEN);
    for (const path of WRITTEN) {
      const written = project.file(path);
      expect(written, path).toBeDefined();
      if (process.env["ZEMP_KEEP_SAMPLE_PAPER"] === "1") {
        writeFileSync(at(`examples/scratch/${path}`), written as Uint8Array);
      }
      expect(
        Buffer.from(written as Uint8Array).equals(read(`examples/scratch/${path}`)),
        path,
      ).toBe(true);
    }
  });

  it("sets to one page with nothing said, reading its table and its figure and no other file", () => {
    const paper = new (typst().Paper)("paper/paper.typ");
    for (const name of readdirSync(at("paper/fonts")).sort()) {
      if (/\.(otf|ttf)$/.test(name)) paper.add_font(read(`paper/fonts/${name}`));
    }
    paper.put_text("paper/paper.typ", read("examples/scratch/paper/paper.typ").toString("utf8"));
    paper.put_text(
      "output/returns.typ",
      read("examples/scratch/output/returns.typ").toString("utf8"),
    );
    paper.put_bytes("output/schooling.svg", read("examples/scratch/output/schooling.svg"));
    const set = JSON.parse(paper.set()) as {
      ok: boolean;
      pages: [number, number][];
      said: unknown[];
      missing: string[];
      read: string[];
    };
    expect(set.ok).toBe(true);
    expect(set.said).toEqual([]);
    expect(set.missing).toEqual([]);
    expect(set.read).toEqual(WRITTEN);
    // One page of A4.
    expect(set.pages).toHaveLength(1);
    expect(Math.round(set.pages[0]?.[0] ?? 0)).toBe(595);
    const headings = (JSON.parse(paper.outline()) as { headings: { text: string }[] }).headings;
    expect(headings.map((one) => one.text)).toEqual(["Returns to schooling"]);
  });

  it("begins its mathematics with the line every new paper begins with", () => {
    expect(read("examples/scratch/paper/paper.typ").toString("utf8")).toContain(
      '\n#show math.equation: set text(font: "Libertinus Math")\n',
    );
  });
});
