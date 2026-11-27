// The Paper place, in what it knows without a screen (release 0.3, step 12): which files of a
// project are papers, where a new paper is made and what it is called, what a new paper
// holds, what the place shows, and the words of the fetching of Typst.
import type { Progress } from "./fetching";
import { share } from "./fetching";

/** The folder a new paper is made in (the owner's answer to question 3 of release 0.3). */
export const PAPERS = "paper";

/** Whether a file of this path is a paper: a Typst source, anywhere in the project. */
export const isPaper = (path: string): boolean => /\.typ$/i.test(path);

interface Node {
  kind: "file" | "folder";
  path: string;
  children?: Node[];
}

/**
 * The papers of a project, each by its path: those of the folder `paper` first, then every
 * other Typst source (a table a script exported is one, and opens as a paper does), each
 * group in the order of its paths. The app's own folders hold none.
 */
export function papersOf(tree: readonly Node[]): string[] {
  const found: string[] = [];
  const walk = (nodes: readonly Node[]) => {
    for (const node of nodes) {
      if (node.kind === "folder") walk(node.children ?? []);
      else if (isPaper(node.path) && !/^\.(zemp|zeff)\//.test(node.path)) found.push(node.path);
    }
  };
  walk(tree);
  const own = (path: string) => path.startsWith(`${PAPERS}/`);
  const ordered = (paths: string[]) => paths.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return [...ordered(found.filter(own)), ...ordered(found.filter((path) => !own(path)))];
}

/**
 * The name a new paper is offered: `paper` for the first of the folder, then `paper-2`,
 * `paper-3`, the first that no file of the folder has, capitals apart.
 */
export function offeredName(papers: readonly string[]): string {
  const taken = new Set(papers.map((path) => path.toLowerCase()));
  for (let count = 1; ; count += 1) {
    const name = count === 1 ? "paper" : `paper-${count}`;
    if (!taken.has(`${PAPERS}/${name}.typ`)) return name;
  }
}

/** The file's name a typed name gives: `.typ` after it where it lacks it. */
export function fileNamed(typed: string): string {
  const name = typed.trim();
  return name === "" || isPaper(name) ? name : `${name}.typ`;
}

/** The line that names the face of a paper's mathematics (`paper/fonts/SOURCE.md`). */
export const MATHEMATICS = '#show math.equation: set text(font: "Libertinus Math")';

/**
 * What a new paper holds: the line that names the face of its mathematics, with why it is
 * there, and a heading to write under. Typst names its own face for mathematics, which Zemp
 * Lite does not carry; without the line a formula is set in a face not made for it.
 */
export function firstLines(file: string): string {
  const title = file.replace(/\.typ$/i, "");
  return [
    "// Mathematics is set in Libertinus Math, the face Zemp Lite carries for it.",
    MATHEMATICS,
    "",
    `= ${title.charAt(0).toUpperCase()}${title.slice(1)}`,
    "",
    "",
  ].join("\n");
}

/** What the middle of the place shows. */
export type Shown =
  /** No paper is open: what Paper is, the papers of the project, and New paper…. */
  | { kind: "none"; papers: string[] }
  /** A paper is open and its text is being read. */
  | { kind: "reading"; path: string }
  /** A paper is open: its source in the editor. */
  | { kind: "paper"; path: string };

/**
 * What the place shows: the paper it has open where that file is still in the project, and
 * otherwise what it shows with none.
 */
export function shownOf(
  open: string | null,
  papers: readonly string[],
  loaded: (path: string) => boolean,
): Shown {
  if (open === null || !papers.includes(open)) return { kind: "none", papers: [...papers] };
  return loaded(open) ? { kind: "paper", path: open } : { kind: "reading", path: open };
}

/** A count of bytes as megabytes with one decimal, as the fetching says it: `6.9 MB`. */
export const megabytes = (bytes: number): string => `${(bytes / 1_000_000).toFixed(1)} MB`;

/** Where the module of the page stands. */
export type Fetching =
  | { state: "waiting" }
  | { state: "fetching"; progress: Progress | null }
  | { state: "ready"; typst: string }
  | { state: "failed"; message: string };

/**
 * What the page's pane says of Typst: before it is fetched, while it comes, once it is here,
 * and where it could not be fetched. `travels` is the bytes that travel, as the build says
 * them; `null` where it does not.
 */
export function fetchingWords(fetching: Fetching, travels: number | null): string {
  const size = travels === null ? "" : `, ${megabytes(travels)}`;
  switch (fetching.state) {
    case "waiting":
      return `Typst sets the page. It is fetched the first time a paper is opened${size}, and this browser keeps it afterwards.`;
    case "fetching": {
      const done = fetching.progress === null ? 0 : share(fetching.progress);
      return `Fetching Typst${size}: ${done}%. This browser keeps it afterwards.`;
    }
    case "ready":
      return `Typst ${fetching.typst} is ready.`;
    case "failed":
      return `Typst could not be fetched: ${fetching.message}`;
  }
}
