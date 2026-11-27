// A test that runs the engine and Typst themselves, under Node, so it is named
// `.node.test.ts`; it needs both built (`npm run build:worker`, `npm run build:paper`).
//
// A script with its output as a document (release 0.3, step 17): each script of the Scratch
// project is run by the engine, the document is made from the run as the app hears it, and
// Typst sets it with the fonts the page carries: nothing refused, every print in it as the
// engine printed it, every figure the engine's own. With `ZEMP_KEEP_SCRIPT_SAMPLES=1` the PDF
// of each is written to `docs/releases/0.3-samples/`, for the owner to read.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { Outcome, Ranged, RunEvent } from "../engine/messages";
import { begin, end, hear, type Run } from "../output/run";
import { plotsOf } from "../plots/figures";
import { quotedIn, scriptDocument } from "./script-document";

const root = new URL("../../", import.meta.url);
const at = (path: string) => fileURLToPath(new URL(path, root));
const read = (path: string) => readFileSync(at(path));

interface Project {
  add_file(path: string, bytes: Uint8Array): boolean;
  run(script: string, text: string, deviceBytes: number, width: number): string;
  plot_svg(script: string, text: string, line: number, width: number, height: number): string;
}
interface Engine {
  Project: new (name: string) => Project;
  statements(script: string, text: string): string;
  engineVersion(): string;
}
interface Paper {
  add_font(bytes: Uint8Array): number;
  put_text(path: string, text: string): boolean;
  set(): string;
  pdf(created: number): Uint8Array;
}

/** The events of the run now going, as the engine tells them. */
let heard: (event: RunEvent) => void = () => {};

function engine(): Engine {
  const built = at("worker/pkg/node/zemp_worker.js");
  expect(existsSync(built), "the worker is not built: run `npm run build:worker` first").toBe(true);
  (globalThis as { zeffHost?: unknown }).zeffHost = {
    event: (json: string) => heard(JSON.parse(json) as RunEvent),
    cancelled: () => false,
  };
  return createRequire(import.meta.url)(built) as Engine;
}

function typst(): { Paper: new (main: string) => Paper } {
  const built = at("paper/pkg/node/zemp_paper.js");
  expect(existsSync(built), "the Paper module is not built: run `npm run build:paper` first").toBe(
    true,
  );
  return createRequire(import.meta.url)(built) as { Paper: new (main: string) => Paper };
}

const zeff = engine();

/** A script of the Scratch project, run: the run as the app hears it, and its figures. */
function ran(name: string): {
  text: string;
  ranges: Ranged[];
  run: Run;
  figures: Record<number, string>;
} {
  const script = `scripts/${name}`;
  const text = read(`examples/scratch/${script}`).toString("utf8");
  const project = new zeff.Project("scratch");
  project.add_file("zeff.toml", read("examples/scratch/zeff.toml"));
  project.add_file(script, new TextEncoder().encode(text));
  const ranges = (JSON.parse(zeff.statements(script, text)) as { statements: Ranged[] }).statements;
  const run = begin(script, text, 0, "9:05");
  hear(run, { type: "ranges", statements: ranges }, 0);
  heard = (event) => hear(run, event, 1);
  const done = JSON.parse(project.run(script, text, 0, 0)) as {
    exit_code: number;
    stdout: string;
    stderr: string;
    statements: Outcome["statements"];
    frames: Outcome["frames"];
    written: string[];
  };
  heard = () => {};
  end(
    run,
    {
      exitCode: done.exit_code,
      stdout: done.stdout,
      stderr: done.stderr,
      statements: done.statements,
      frames: done.frames,
      written: done.written,
      stopped: false,
    },
    2,
  );
  // Each plot as the engine lays it out on a page of 150 by 100 millimetres.
  const figures: Record<number, string> = {};
  for (const plot of plotsOf(run)) {
    const laid = JSON.parse(project.plot_svg(script, text, plot.line, 150, 100)) as {
      svg: string | null;
    };
    if (laid.svg !== null) figures[plot.line] = laid.svg;
  }
  return { text, ranges, run, figures };
}

/** The document set by Typst with the fonts the page carries: what Typst said, its pages, its PDF. */
function set(made: ReturnType<typeof scriptDocument>) {
  const paper = new (typst().Paper)(made.main);
  for (const name of readdirSync(at("paper/fonts")).sort()) {
    if (/\.(otf|ttf)$/.test(name)) paper.add_font(read(`paper/fonts/${name}`));
  }
  paper.put_text(made.main, made.text);
  for (const file of made.files) paper.put_text(file.path, file.text);
  const told = JSON.parse(paper.set()) as {
    ok: boolean;
    pages: unknown[];
    said: { message: string; line: number | null }[];
    missing: string[];
    read: string[];
  };
  return { told, pdf: told.ok ? paper.pdf(Number.NaN) : null };
}

describe("a script of the Scratch project with its output, set by Typst", () => {
  for (const name of ["main.zeff", "instruments.zeff", "plots.zeff"]) {
    it(`${name}: the document sets, with every print as the engine printed it and every figure the engine's`, () => {
      const { text, ranges, run, figures } = ran(name);
      expect(run.state).toBe("done");
      const made = scriptDocument({
        project: "Scratch",
        script: `scripts/${name}`,
        engine: zeff.engineVersion(),
        text,
        ranges,
        run,
        figures,
      });
      const { told, pdf } = set(made);
      expect(told.said).toEqual([]);
      expect(told.ok).toBe(true);
      expect(told.missing).toEqual([]);
      expect(told.pages.length).toBeGreaterThan(0);
      // Every figure the document places is read, and there is one for each plot of the run.
      expect(told.read).toEqual(made.files.map((file) => file.path).sort());
      expect(made.files).toHaveLength(plotsOf(run).length);
      // What each statement printed is in the document, to the character.
      const held = quotedIn(made.text);
      for (const statement of run.statements) {
        if (statement.printed !== "") {
          expect(held, `line ${statement.line}`).toContain(statement.printed.replace(/\n+$/, ""));
        }
      }
      // And the whole of what `zeff run` prints is there, in the order printed.
      const printed = [...made.text.matchAll(/^#printed\([\d.]+pt, ("(?:[^"\\]|\\.)*")\)$/gm)]
        .map((match) => quotedIn(match[1] as string)[0])
        .join("\n");
      expect(printed.replace(/\n+/g, "\n")).toBe(
        read(`examples/scratch/expected/${name.replace(".zeff", "")}.stdout`)
          .toString("utf8")
          .replace(/\n+$/, "")
          .replace(/\n+/g, "\n"),
      );
      expect(pdf).not.toBeNull();
      expect(Buffer.from((pdf as Uint8Array).subarray(0, 5)).toString()).toBe("%PDF-");
      // Set again from the same run, it is the same file: no time is in it.
      expect(Buffer.from(set(made).pdf as Uint8Array).equals(Buffer.from(pdf as Uint8Array))).toBe(
        true,
      );
      // The samples kept for the owner: the first two scripts (the third's 21 figures make a
      // file of 1.5 MB, which is not kept in the repository).
      if (process.env["ZEMP_KEEP_SCRIPT_SAMPLES"] === "1" && name !== "plots.zeff") {
        mkdirSync(at("docs/releases/0.3-samples"), { recursive: true });
        writeFileSync(
          at(`docs/releases/0.3-samples/${name.replace(".zeff", "")}.pdf`),
          pdf as Uint8Array,
        );
      }
    });
  }
});
