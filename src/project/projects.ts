// The projects of this browser. Zemp works only in projects (Zemp Specification, section 4):
// a project is a folder with `zeff.toml`, `scripts/` and `data/`, and the Scratch project is
// always there for quick exploration. On the web the folders live in the browser's private
// file system, under `projects/`.
import example from "../../examples/scratch/scripts/main.zeff?raw";
import instruments from "../../examples/scratch/scripts/instruments.zeff?raw";
import plots from "../../examples/scratch/scripts/plots.zeff?raw";
import { ENGINE } from "../app/version";
import type { Kept } from "../theme/theme";
import { Inside, type Entry, type Folder } from "./folder";

/** A project as the welcome screen lists it. */
export interface ProjectInfo {
  /** The name of its folder, which is what the window's address carries. */
  folder: string;
  /** Its name, as `zeff.toml` has it. */
  name: string;
  /** When it was last opened in this browser, in milliseconds since 1970, or `null` if never. */
  opened: number | null;
}

/** A file or a folder of a project, with what a folder holds. */
export interface TreeNode extends Entry {
  /** Its path from the project's folder. */
  path: string;
  children: TreeNode[];
}

/** What the user asked for cannot be done, in words for the user. */
export class ProjectError extends Error {
  override name = "ProjectError";
}

const ROOT = "projects";
const OPENED = "zemp-opened";
/** The examples the Scratch project of this browser has been given, each given once. */
const GIVEN = "zemp-scratch-examples";

/**
 * The examples of the Scratch project besides `main.zeff`, in the order they came: one added
 * by a later release is given to a Scratch project made before it.
 */
const EXAMPLES: [string, string][] = [
  ["instruments.zeff", instruments],
  ["plots.zeff", plots],
];
/** The folder of the Scratch project. */
export const SCRATCH = "scratch";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** The folder a project of this name is kept in: its letters and digits, in lower case. */
export function folderOf(name: string): string {
  const folder = name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return folder === "" ? "project" : folder;
}

/**
 * The `zeff.toml` of a new project: its name, the engine it is pinned to, and the edition,
 * each with the short comment the `zeff` command writes beside it. The file is the one
 * `zeff new` of the same engine writes, to the character, so that a project looks the same
 * whichever of the two made it (Zemp Specification, section 2, "Same projects").
 */
export function manifest(name: string): string {
  // A setting is set in 26 columns, as the command sets it, and its comment follows.
  const line = (setting: string, comment: string) =>
    `${setting}${" ".repeat(Math.max(0, 26 - [...setting].length))}# ${comment}\n`;
  return (
    "[project]\n" +
    line(`name = ${JSON.stringify(name)}`, "the project's name") +
    line(`zeff = "${ENGINE}"`, "the engine this project runs on, exactly") +
    line('edition = "preview"', '"2027" from Zeff 1.0.0')
  );
}

/** The name a `zeff.toml` gives its project, or `null` where it gives none that can be read. */
export function nameIn(toml: string): string | null {
  const found = /^\s*name\s*=\s*("(?:[^"\\]|\\.)*")\s*(?:#.*)?$/m.exec(toml);
  if (found === null) {
    return null;
  }
  try {
    return JSON.parse(found[1] as string) as string;
  } catch {
    return null;
  }
}

export class Projects {
  readonly #root: Folder;
  readonly #kept: Kept;
  readonly #now: () => number;

  /** `root` holds the projects; `kept` remembers when each was opened; `now` is the clock. */
  constructor(root: Folder, kept: Kept, now: () => number = Date.now) {
    this.#root = root;
    this.#kept = kept;
    this.#now = now;
  }

  #opened(): Record<string, number> {
    try {
      const read = JSON.parse(this.#kept.getItem(OPENED) ?? "{}") as unknown;
      return typeof read === "object" && read !== null ? (read as Record<string, number>) : {};
    } catch {
      return {};
    }
  }

  /** The projects, the one opened last first, and those never opened after them by name. */
  async list(): Promise<ProjectInfo[]> {
    const opened = this.#opened();
    const found: ProjectInfo[] = [];
    for (const entry of await this.#root.list(ROOT)) {
      if (entry.kind !== "folder") continue;
      const toml = await this.#root.read(`${ROOT}/${entry.name}/zeff.toml`);
      if (toml === null) continue;
      found.push({
        folder: entry.name,
        name: nameIn(decoder.decode(toml)) ?? entry.name,
        opened: opened[entry.name] ?? null,
      });
    }
    return found.sort(
      (a, b) => (b.opened ?? -1) - (a.opened ?? -1) || a.name.localeCompare(b.name),
    );
  }

  /** Make a project called `name`, with an empty script and the folders of a project. */
  async create(name: string): Promise<ProjectInfo> {
    const wanted = name.trim();
    if (wanted === "") {
      throw new ProjectError("A project needs a name.");
    }
    if (wanted.length > 80) {
      throw new ProjectError("A project's name is at most 80 characters.");
    }
    const folder = folderOf(wanted);
    if ((await this.#root.kind(`${ROOT}/${folder}`)) !== null) {
      throw new ProjectError(
        folder === SCRATCH
          ? "That name is the Scratch project's. Choose another."
          : `A project called "${wanted}" is already here. Choose another name.`,
      );
    }
    await this.#fill(folder, wanted, `// ${wanted}\n`);
    return { folder, name: wanted, opened: null };
  }

  /**
   * The Scratch project, made the first time it is asked for with its three examples: the
   * returns to schooling on `wages`, which opens; instrumental variables on `staff`, the
   * engine's own sample of 0.8.0 (the owner's answer to question 7 of release 0.2); and the
   * showcase of plots, from one line to a finished figure (his answer of 21 November 2026).
   * A Scratch project made before an example came is given it, once: the examples given are
   * remembered, so one the user deletes or renames is not given again, and a file of that
   * name already there is never written over.
   */
  async scratch(): Promise<ProjectInfo> {
    const made = (await this.#root.read(`${ROOT}/${SCRATCH}/zeff.toml`)) === null;
    if (made) {
      await this.#fill(SCRATCH, "Scratch", example);
    }
    const given = made ? [] : this.#given();
    for (const [name, text] of EXAMPLES) {
      const path = `${ROOT}/${SCRATCH}/scripts/${name}`;
      if (!given.includes(name) && (await this.#root.kind(path)) === null) {
        await this.#root.write(path, encoder.encode(text));
      }
    }
    this.#kept.setItem(GIVEN, JSON.stringify(EXAMPLES.map(([name]) => name)));
    return { folder: SCRATCH, name: "Scratch", opened: this.#opened()[SCRATCH] ?? null };
  }

  /** The examples given before; none remembered where the browser kept no record of them. */
  #given(): string[] {
    try {
      const read = JSON.parse(this.#kept.getItem(GIVEN) ?? "[]") as unknown;
      return Array.isArray(read)
        ? read.filter((name): name is string => typeof name === "string")
        : [];
    } catch {
      return [];
    }
  }

  async #fill(folder: string, name: string, script: string): Promise<void> {
    const base = `${ROOT}/${folder}`;
    await this.#root.write(`${base}/zeff.toml`, encoder.encode(manifest(name)));
    await this.#root.write(`${base}/scripts/main.zeff`, encoder.encode(script));
    await this.#root.make(`${base}/data`);
  }

  /** Open a project by its folder, and note the time; `null` where there is none. */
  async open(folder: string): Promise<Project | null> {
    const toml = await this.#root.read(`${ROOT}/${folder}/zeff.toml`);
    if (toml === null) {
      return null;
    }
    const opened = this.#opened();
    opened[folder] = this.#now();
    try {
      this.#kept.setItem(OPENED, JSON.stringify(opened));
    } catch {
      // The time is not kept; the project opens all the same.
    }
    return new Project(
      { folder, name: nameIn(decoder.decode(toml)) ?? folder, opened: opened[folder] },
      new Inside(this.#root, `${ROOT}/${folder}`),
    );
  }

  /** Remove a project and all it holds. */
  async remove(folder: string): Promise<void> {
    await this.#root.remove(`${ROOT}/${folder}`);
    const opened = Object.fromEntries(
      Object.entries(this.#opened()).filter(([name]) => name !== folder),
    );
    try {
      this.#kept.setItem(OPENED, JSON.stringify(opened));
    } catch {
      // Nothing to forget.
    }
  }
}

/** One open project: its files. */
export class Project {
  readonly info: ProjectInfo;
  readonly #files: Folder;

  constructor(info: ProjectInfo, files: Folder) {
    this.info = info;
    this.#files = files;
  }

  /** The files and folders of the project, folders first and each by name, without `.zemp/`. */
  async tree(path = ""): Promise<TreeNode[]> {
    const nodes: TreeNode[] = [];
    for (const entry of await this.#files.list(path)) {
      if (path === "" && entry.name === ".zemp") continue;
      const at = path === "" ? entry.name : `${path}/${entry.name}`;
      nodes.push({
        ...entry,
        path: at,
        children: entry.kind === "folder" ? await this.tree(at) : [],
      });
    }
    return nodes.sort((a, b) =>
      a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === "folder" ? -1 : 1,
    );
  }

  /** Every file of the project with its bytes, as the engine is given them; `.zemp/` is the interface's own. */
  async files(): Promise<{ path: string; bytes: Uint8Array }[]> {
    const found: { path: string; bytes: Uint8Array }[] = [];
    const walk = async (nodes: TreeNode[]): Promise<void> => {
      for (const node of nodes) {
        if (node.kind === "folder") {
          await walk(node.children);
        } else {
          const bytes = await this.#files.read(node.path);
          if (bytes !== null) found.push({ path: node.path, bytes });
        }
      }
    };
    await walk(await this.tree());
    return found;
  }

  read(path: string): Promise<Uint8Array | null> {
    return this.#files.read(path);
  }

  /** Whether a path of the project is a file, a folder, or nothing. */
  kind(path: string): Promise<"file" | "folder" | null> {
    return this.#files.kind(path);
  }

  async readText(path: string): Promise<string | null> {
    const bytes = await this.#files.read(path);
    return bytes === null ? null : decoder.decode(bytes);
  }

  write(path: string, bytes: Uint8Array): Promise<void> {
    return this.#files.write(path, bytes);
  }

  writeText(path: string, text: string): Promise<void> {
    return this.#files.write(path, encoder.encode(text));
  }

  /** Give a file another path in the project; a path already taken is refused. */
  async rename(from: string, to: string): Promise<void> {
    const bytes = await this.#files.read(from);
    if (bytes === null) {
      throw new ProjectError(`There is no file \`${from}\` in this project.`);
    }
    if (from === to) {
      return;
    }
    if ((await this.#files.kind(to)) !== null) {
      throw new ProjectError(`\`${to}\` is already in this project. Choose another name.`);
    }
    await this.#files.write(to, bytes);
    await this.#files.remove(from);
  }

  remove(path: string): Promise<void> {
    return this.#files.remove(path);
  }

  /**
   * Add a data file chosen from the computer, under `data/`. Nothing is written into a script:
   * in Zemp Lite the user writes the `import` (Zemp Specification, section 2). A file of that
   * name already there is refused.
   */
  async addData(name: string, bytes: Uint8Array): Promise<string> {
    const clean = name.replace(/[/\\]/g, "-").trim();
    if (clean === "" || clean === "." || clean === "..") {
      throw new ProjectError("That file has no name that can be kept.");
    }
    const path = `data/${clean}`;
    if ((await this.#files.kind(path)) !== null) {
      throw new ProjectError(`\`${path}\` is already in this project. Rename the file first.`);
    }
    await this.#files.write(path, bytes);
    return path;
  }
}

/**
 * When a project was last opened, as the welcome screen says it: "today, 10:42", "yesterday",
 * "3 November", and with the year once it is not this one.
 */
export function when(opened: number | null, now: number): string {
  if (opened === null) {
    return "not opened yet";
  }
  const then = new Date(opened);
  const today = new Date(now);
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  if (opened >= midnight) {
    const minutes = String(then.getMinutes()).padStart(2, "0");
    return `today, ${then.getHours()}:${minutes}`;
  }
  if (opened >= midnight - 86_400_000) {
    return "yesterday";
  }
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const day = `${then.getDate()} ${months[then.getMonth()]}`;
  return then.getFullYear() === today.getFullYear() ? day : `${day} ${then.getFullYear()}`;
}
