// A plot from the engine, at the size of its pane (Zemp Specification, section 7: "the engine
// returns a resolution-independent scene, and the viewer redraws it to the exact size of its
// pane"). At Zeff 0.7.0 the engine's browser build hands no scene and no plot to an
// interface; a figure leaves it only as a file that `export` writes. So the interface draws a
// plot by running Zeff: to the text of the script it adds, for each plot to be shown, an
// `export` to an SVG file at the size of the place it will be shown in, in millimetres, and
// reads the file the engine wrote. The script the user sees is never changed
// (docs/decisions.md, 15 November 2026).
import { endOf, linesOf } from "../output/place";
import type { Run } from "../output/run";

/** A statement of a run whose value is a plot: the engine printed a plot's summary for it. */
export interface PlotStatement {
  /** The lines it begins and ends on, counted from 1. */
  line: number;
  last: number;
  /** Its text, as the script has it. */
  source: string;
  /** What the plot is, as the engine's summary heads it: "w2010 · log(wage) against educ". */
  title: string;
}

/** The first words of what the engine prints for a statement that ends in a plot. */
const HEAD = "plot · ";

/** The statements of a run that ended in a plot, in the order of the script. */
export function plotsOf(run: Run): PlotStatement[] {
  const lines = linesOf(run);
  return run.statements
    .filter((statement) => statement.state === "done" && statement.printed.startsWith(HEAD))
    .map((statement) => {
      const last = endOf(run, statement.line, true);
      return {
        line: statement.line,
        last,
        source: lines.slice(statement.line - 1, last).join("\n"),
        title: (statement.printed.split("\n")[0] ?? "").slice(HEAD.length),
      };
    });
}

/** A figure asked for: which plot, by the line its statement begins on, and how large. */
export interface Wanted {
  line: number;
  /** In pixels of the screen, whole numbers. */
  width: number;
  height: number;
}

/** The name a figure asked for is kept under. */
export const keyOf = (wanted: Wanted) => `${wanted.line}@${wanted.width}x${wanted.height}`;

/** A length of the screen in millimetres, to a hundredth: a pixel is 1/96 of an inch. */
export function millimetres(pixels: number): number {
  return Math.round(((pixels * 25.4) / 96) * 100) / 100;
}

/** A length in millimetres in pixels of the screen. */
export function pixels(mm: number): number {
  return (mm * 96) / 25.4;
}

/** The file a figure is written to, in the project's `output/` folder in the worker's memory. */
export const fileOf = (index: number) => `zemp-figure-${index + 1}.svg`;

export interface WithExports {
  /** The text the engine is given: the script, then one `export` for each figure. */
  text: string;
  /** The first line the interface added: what the engine prints or says from there on is not the script's. */
  from: number;
  /** For each figure asked for: where its file is, and the line its `export` begins on. */
  figures: { key: string; file: string; line: number }[];
}

/**
 * The script with an `export` added for each figure asked for. Each plot's own statement is
 * written again inside brackets, with `.export(...)` after it on a line of its own, so that a
 * comment at the end of the statement cannot swallow what is added.
 */
export function withExports(text: string, plots: PlotStatement[], wanted: Wanted[]): WithExports {
  const script = text.replace(/\n+$/, "");
  let line = script === "" ? 1 : script.split("\n").length + 1;
  const from = line;
  const added: string[] = [];
  const figures: WithExports["figures"] = [];
  wanted.forEach((one, index) => {
    const plot = plots.find((candidate) => candidate.line === one.line);
    if (plot === undefined) {
      return;
    }
    const file = fileOf(index);
    const statement =
      `(${plot.source}\n` +
      `).export("${file}", size: [${millimetres(one.width)}, ${millimetres(one.height)}])`;
    figures.push({ key: keyOf(one), file: `output/${file}`, line });
    added.push(statement);
    line += statement.split("\n").length;
  });
  return {
    text: `${script === "" ? "" : `${script}\n`}${added.map((one) => `${one}\n`).join("")}`,
    from,
    figures,
  };
}

/** An SVG as the address of an image, which a page shows without running anything in it. */
export function imageOf(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** The width and height an SVG of the engine gives itself, in pixels of the screen (it writes them in points). */
export function sizeOf(svg: string): { width: number; height: number } | null {
  const found = /<svg[^>]*\swidth="([\d.]+)pt"\sheight="([\d.]+)pt"/.exec(svg);
  return found === null
    ? null
    : { width: (Number(found[1]) * 96) / 72, height: (Number(found[2]) * 96) / 72 };
}
