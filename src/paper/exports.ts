// Which scripts a paper's files come from (release 0.3, step 15a). A paper sets what scripts
// wrote with `export`: a table as a Typst file, a figure as SVG. A script is read for the
// paths it exports to, as its text names them, so that **Run** in the Paper place runs the
// scripts whose files the paper uses, and an export the paper lacks is named with the script
// that writes it. This is a reading of the text, not a run: a path a script builds from other
// values is not seen here, and is found once the script has run and written it.

/** A script of the project, with its text as it stands. */
export interface Script {
  path: string;
  text: string;
}

/** A script with the files of the paper it writes. */
export interface Writer {
  script: string;
  files: string[];
}

/** A script's text without its comments: `//` to the end of a line, outside a text in quotes. */
function uncommented(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      let quoted = false;
      for (let at = 0; at < line.length; at += 1) {
        const character = line[at];
        if (character === "\\" && quoted) at += 1;
        else if (character === '"') quoted = !quoted;
        else if (!quoted && character === "/" && line[at + 1] === "/") return line.slice(0, at);
      }
      return line;
    })
    .join("\n");
}

/** A path as the project names it: no `./` before it, and `/` between its parts. */
const plain = (path: string) => path.replace(/\\/g, "/").replace(/^(\.\/)+/, "");

/**
 * The paths a script exports to, as its text names them, each once, in the order met: the
 * first text in quotes of each call of `export`, written after a value (`x.export("p")`) or
 * with the value given first (`export(x, "p")`). A path is under the project's folder, as the
 * engine writes it.
 */
export function exportsOf(text: string): string[] {
  const found: string[] = [];
  const calls = /\bexport\s*\(\s*(?:[^"()]*?,\s*)?"((?:[^"\\\n]|\\.)+)"/g;
  for (const call of uncommented(text).matchAll(calls)) {
    const path = plain(call[1] as string);
    if (!found.includes(path)) found.push(path);
  }
  return found;
}

/**
 * The scripts that write files a paper uses, each with those files, in the order of the
 * scripts' paths. `files` are the paths the paper reads, as the project names them.
 */
export function writersOf(scripts: readonly Script[], files: readonly string[]): Writer[] {
  const used = new Set(files.map(plain));
  return scripts
    .map((script) => ({
      script: script.path,
      files: exportsOf(script.text).filter((path) => used.has(path)),
    }))
    .filter((writer) => writer.files.length > 0)
    .sort((a, b) => (a.script < b.script ? -1 : a.script > b.script ? 1 : 0));
}

/** The paths as words: `a`, `a and b`, `a, b and c`. */
export function listed(paths: readonly string[]): string {
  if (paths.length <= 1) return paths.join("");
  return `${paths.slice(0, -1).join(", ")} and ${paths[paths.length - 1]}`;
}

/**
 * What the page's pane says of the files a paper lacks: each with the script that writes it,
 * and that **Run** makes it; a file no script of the project exports is left to Typst's own
 * words. Empty where the paper lacks nothing a script writes.
 */
export function lackingWords(absent: readonly string[], writers: readonly Writer[]): string[] {
  return writers
    .map((writer) => ({ ...writer, files: writer.files.filter((file) => absent.includes(file)) }))
    .filter((writer) => writer.files.length > 0)
    .map(
      (writer) =>
        `${listed(writer.files)} ${writer.files.length === 1 ? "is" : "are"} written by ${writer.script}: press Run to make ${writer.files.length === 1 ? "it" : "them"}.`,
    );
}

/** What Run says in the Paper place, of a paper that uses no file a script of the project exports. */
export const NOTHING_TO_RUN =
  "this paper uses no file a script of the project exports: there is nothing to run";
