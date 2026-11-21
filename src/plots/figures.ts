// A plot from the engine, at the size of its pane (Zemp Specification, section 7: "the engine
// returns a resolution-independent scene, and the viewer redraws it to the exact size of its
// pane"). At Zeff 0.7.0 and 0.8.0 the engine's browser build hands no scene and no plot to an
// interface; a figure leaves it only as a file that `export` writes. So the interface draws a
// plot by running Zeff: to the text of the script it adds, for each plot to be shown, an
// `export` to an SVG file at the size of the place it will be shown in, in millimetres, and
// reads the file the engine wrote. The script the user sees is never changed
// (docs/decisions.md, 15 November 2026).
import { endOf, linesOf } from "../output/place";
import { boundPlots, type Run } from "../output/run";

/**
 * A statement of a run whose value is a plot: the engine printed a plot's summary for it, or
 * it binds a name to a plot, which prints nothing.
 */
export interface PlotStatement {
  /** The lines it begins and ends on, counted from 1. */
  line: number;
  last: number;
  /**
   * What gives the plot again after the script: its text, as the script has it, or for a
   * plot bound with `let` the name it is bound to.
   */
  source: string;
  /** What the plot is, as the engine's summary heads it: "w2010 · log(wage) against educ". */
  title: string;
  /** Its kind: the marks of its layers, as the engine's table of what it drew names them. */
  kind: string;
}

/**
 * The marks of a plot's layers, from the engine's table of what it drew ("layer   mark …"):
 * `points`, `fit band, points, fit line`. Empty where the engine printed no such table.
 */
export function kindOf(printed: string): string {
  const lines = printed.split("\n");
  const head = lines.findIndex((line) => /^\s*layer\s+mark\b/.test(line));
  if (head < 0) return "";
  const at = (lines[head] as string).indexOf("mark");
  const marks: string[] = [];
  for (const line of lines.slice(head + 1)) {
    if (line.trim() === "") break;
    const mark =
      line
        .slice(at)
        .split(/\s{2,}/)[0]
        ?.trim() ?? "";
    if (mark !== "" && !marks.includes(mark)) marks.push(mark);
  }
  return marks.join(", ");
}

/** The first words of what the engine prints for a statement that ends in a plot. */
const HEAD = "plot · ";

/** The statements of a run that ended in a plot, in the order of the script. */
export function plotsOf(run: Run): PlotStatement[] {
  const lines = linesOf(run);
  const bound = boundPlots(run);
  return run.statements
    .filter((statement) => statement.state === "done")
    .flatMap((statement) => {
      const last = Math.min(endOf(run.ranges, statement.line), Math.max(lines.length, 1));
      if (statement.printed.startsWith(HEAD)) {
        return [
          {
            line: statement.line,
            last,
            source: lines.slice(statement.line - 1, last).join("\n"),
            title: (statement.printed.split("\n")[0] ?? "").slice(HEAD.length),
            kind: kindOf(statement.printed),
          },
        ];
      }
      // A plot bound with `let`, drawn by its name and named by it (`boundPlots`).
      const name = bound.get(statement.line);
      return name === undefined
        ? []
        : [{ line: statement.line, last, source: name, title: name, kind: "" }];
    });
}

/** A page of a journal or a slide, by the word `export` knows it by (Language Reference, section 7.6). */
export type Page = "one_column" | "two_column" | "slide";

/** The pages, with their sizes in millimetres as `export` has them. */
export const PAGES: Record<Page, { name: string; width: number; height: number }> = {
  one_column: { name: "One column", width: 89, height: 66 },
  two_column: { name: "Two columns", width: 183, height: 110 },
  slide: { name: "Slide", width: 254, height: 143 },
};

/**
 * A figure asked for: which plot, by the line its statement begins on, and how large: the
 * size of a place on the screen, in whole pixels, or a named page.
 */
export type Wanted =
  { line: number; width: number; height: number; page?: undefined } | { line: number; page: Page };

/** The name a figure asked for is kept under. */
export const keyOf = (wanted: Wanted) =>
  wanted.page === undefined
    ? `${wanted.line}@${wanted.width}x${wanted.height}`
    : `${wanted.line}@${wanted.page}`;

/** The size of a figure as `export` is given it: a named page, or millimetres. */
export const sizeArgument = (wanted: Wanted) =>
  wanted.page === undefined
    ? `[${millimetres(wanted.width)}, ${millimetres(wanted.height)}]`
    : wanted.page;

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
    const statement = `(${plot.source}\n).export("${file}", size: ${sizeArgument(one)})`;
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

/** The formats `export` writes a plot in. */
export type Format = "svg" | "pdf" | "png";

/**
 * The script with one `export` added, of a plot to a file of the format and size chosen: what
 * the interface runs to save a figure. Gives the file to read back.
 */
export function withExport(
  text: string,
  plot: PlotStatement,
  format: Format,
  size: string,
): { text: string; file: string } {
  const script = text.replace(/\n+$/, "");
  const file = `zemp-export.${format}`;
  return {
    text: `${script === "" ? "" : `${script}\n`}(${plot.source}\n).export("${file}", size: ${size})\n`,
    file: `output/${file}`,
  };
}

/** A name for a plot's file: the name it is bound to, where its statement is a name alone. */
export function nameOf(plot: PlotStatement): string {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(plot.source.trim())
    ? plot.source.trim()
    : `figure-line-${plot.line}`;
}

/**
 * The Zeff statement that writes this plot to a file, for the user to copy into a script:
 * what the viewer's Export does, written as code (Zemp Specification, section 7, "Export").
 */
export function exportStatement(plot: PlotStatement, format: Format, size: string): string {
  const source = plot.source.trim();
  const named = /^[A-Za-z_][A-Za-z0-9_]*$/.test(source);
  return `${named ? source : `(${plot.source}\n)`}.export("output/${nameOf(plot)}.${format}", size: ${size})`;
}
