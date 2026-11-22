// The projects of this browser. Zemp works only in projects (Zemp Specification, section 4):
// a project is a folder with `zeff.toml`, `scripts/` and `data/`, and the Scratch project is
// always there for quick exploration. On the web the folders live in the browser's private
// file system, under `projects/`.
import example from "../../examples/scratch/scripts/main.zeff?raw";
import instruments from "../../examples/scratch/scripts/instruments.zeff?raw";
import plots from "../../examples/scratch/scripts/plots.zeff?raw";
import { ENGINE } from "../app/version";
import type { Kept } from "../theme/theme";
import { ProjectError } from "./error";
import * as files from "./files";
import { Inside, type Entry, type Folder } from "./folder";
import type { ZipFile } from "./zip";

export { ProjectError };

/** A project as the welcome screen lists it. */
export interface ProjectInfo {
  /** The name of its folder, which is what the window's address carries. */
  folder: string;
  /** Its name, as `zeff.toml` has it. */
  name: string;
  /** When it was last opened in this browser, in milliseconds since 1970, or `null` if never. */
  opened: number | null;
  /** When it was last exported from this browser as a zip, or `null` if never. */
  exported: number | null;
  /** When it was made in this browser, or first seen by it, or `null` where that is not kept. */
  made: number | null;
}

/** A file or a folder of a project, with what a folder holds. */
export interface TreeNode extends Entry {
  /** Its path from the project's folder. */
  path: string;
  children: TreeNode[];
}

/** What the user asked for cannot be done, in words for the user. */

const ROOT = "projects";
const OPENED = "zemp-opened";
/** When each project was last exported, by its folder. */
const EXPORTED = "zemp-exported";
/** When each project was made here, or first seen, by its folder. */
const MADE = "zemp-made";
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

/** What a zip gives a new project: its manifest, its files and its empty folders. */
export interface FromZip {
  /** The text of its `zeff.toml`. */
  toml: string;
  /** The name its `zeff.toml` gives it, or `null` where it gives none that can be read. */
  name: string | null;
  /** Every file, `zeff.toml` among them, by its path from the project's folder. */
  files: ZipFile[];
  /** The folders that hold nothing. */
  folders: string[];
}

/**
 * A `zeff.toml` with its project named anew: the line of the name rewritten, its comment kept
 * at its column where the new name leaves room, and every other character as it was. A
 * manifest with no line of a name is given one under `[project]`, or at its head.
 */
export function renamed(toml: string, name: string): string {
  const line = /^([ \t]*name[ \t]*=[ \t]*)("(?:[^"\\]|\\.)*")([ \t]*)(#.*)?$/m;
  const found = line.exec(toml);
  const written = JSON.stringify(name);
  if (found === null) {
    const setting = `name = ${written}\n`;
    return /^\[project\][ \t]*$/m.test(toml)
      ? toml.replace(/^(\[project\][ \t]*\n?)/m, `$1${setting}`)
      : `[project]\n${setting}${toml}`;
  }
  const [whole, before = "", old = "", gap = "", comment = ""] = found;
  // The comment stays where it stood, or one space after a name that reaches past it.
  const space =
    comment === ""
      ? gap
      : " ".repeat(Math.max(1, [...old].length + gap.length - [...written].length));
  return toml.replace(whole, `${before}${written}${space}${comment}`);
}

/** A name not among those taken, whatever their capitals: `Wages`, then `Wages 2`, `Wages 3`. */
export function freeName(wanted: string, taken: string[]): string {
  const lower = new Set(taken.map((name) => name.toLowerCase()));
  if (!lower.has(wanted.toLowerCase())) return wanted;
  for (let n = 2; ; n += 1) {
    if (!lower.has(`${wanted} ${n}`.toLowerCase())) return `${wanted} ${n}`;
  }
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

  /** A record the browser keeps of a time for each project's folder; empty where it keeps none. */
  #times(key: string): Record<string, number> {
    try {
      const read = JSON.parse(this.#kept.getItem(key) ?? "{}") as unknown;
      return typeof read === "object" && read !== null ? (read as Record<string, number>) : {};
    } catch {
      return {};
    }
  }

  #opened(): Record<string, number> {
    return this.#times(OPENED);
  }

  /**
   * When a project was made here. One not yet noted (made by a release before this was kept)
   * is noted now, as first seen: the reminder to export counts from here.
   */
  #made(folder: string): number | null {
    const times = this.#times(MADE);
    if (times[folder] !== undefined) return times[folder];
    const at = this.#now();
    try {
      this.#kept.setItem(MADE, JSON.stringify({ ...times, [folder]: at }));
      return at;
    } catch {
      return null;
    }
  }

  /** Note that a project was exported now: the reminder to export counts from here. */
  noteExported(folder: string): number {
    const at = this.#now();
    try {
      this.#kept.setItem(EXPORTED, JSON.stringify({ ...this.#times(EXPORTED), [folder]: at }));
    } catch {
      // The time is not kept; the export is made all the same.
    }
    return at;
  }

  /** The projects, the one opened last first, and those never opened after them by name. */
  async list(): Promise<ProjectInfo[]> {
    const opened = this.#opened();
    const exported = this.#times(EXPORTED);
    const found: ProjectInfo[] = [];
    for (const entry of await this.#root.list(ROOT)) {
      if (entry.kind !== "folder") continue;
      const toml = await this.#root.read(`${ROOT}/${entry.name}/zeff.toml`);
      if (toml === null) continue;
      found.push({
        folder: entry.name,
        name: nameIn(decoder.decode(toml)) ?? entry.name,
        opened: opened[entry.name] ?? null,
        exported: exported[entry.name] ?? null,
        made: this.#made(entry.name),
      });
    }
    return found.sort(
      (a, b) => (b.opened ?? -1) - (a.opened ?? -1) || a.name.localeCompare(b.name),
    );
  }

  /** Make a project called `name`, with an empty script and the folders of a project. */
  async create(name: string): Promise<ProjectInfo> {
    const wanted = await this.#name(name, null);
    // The folder is the app's own key for the project, made from its name; a project renamed
    // keeps its folder, so the first free one is taken.
    const folder = await this.#freeFolder(wanted);
    await this.#fill(folder, wanted, `// ${wanted}\n`);
    return { folder, name: wanted, opened: null, exported: null, made: this.#made(folder) };
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
    return {
      folder: SCRATCH,
      name: "Scratch",
      opened: this.#opened()[SCRATCH] ?? null,
      exported: this.#times(EXPORTED)[SCRATCH] ?? null,
      made: this.#made(SCRATCH),
    };
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
    return this.#project(folder, decoder.decode(toml), opened[folder] ?? null);
  }

  /**
   * A project by its folder, to read what it holds without opening it: no time is noted, so
   * the order of the start screen's list is as it was. `null` where there is none.
   */
  async peek(folder: string): Promise<Project | null> {
    const toml = await this.#root.read(`${ROOT}/${folder}/zeff.toml`);
    return toml === null
      ? null
      : this.#project(folder, decoder.decode(toml), this.#opened()[folder] ?? null);
  }

  #project(folder: string, toml: string, opened: number | null): Project {
    const info: ProjectInfo = {
      folder,
      name: nameIn(toml) ?? folder,
      opened,
      exported: this.#times(EXPORTED)[folder] ?? null,
      made: this.#made(folder),
    };
    return new Project(info, new Inside(this.#root, `${ROOT}/${folder}`), () => {
      info.exported = this.noteExported(folder);
    });
  }

  /**
   * Make a new project of what a zip gave (`from-zip.ts`): under the name its manifest gives,
   * or `fallback` where it gives none, with a number after it where a project of that name is
   * here already; in a folder of its own. Its files are written as they are, but for the
   * manifest's line of the name where the name had to change. If a file cannot be written,
   * what was written is removed: there is the whole project or none of it.
   */
  async adopt(from: FromZip, fallback: string): Promise<ProjectInfo> {
    const wanted = (from.name ?? fallback).trim().slice(0, 80) || "Project";
    const here = await this.list();
    const name = freeName(wanted, ["Scratch", ...here.map((one) => one.name)]);
    const folder = await this.#freeFolder(name);
    const base = `${ROOT}/${folder}`;
    try {
      for (const file of from.files) {
        const bytes =
          file.path === "zeff.toml" && name !== from.name
            ? encoder.encode(renamed(from.toml, name))
            : file.bytes;
        await this.#root.write(`${base}/${file.path}`, bytes);
      }
      for (const path of from.folders) await this.#root.make(`${base}/${path}`);
    } catch (error) {
      await this.#root.remove(base);
      throw error;
    }
    return { folder, name, opened: null, exported: null, made: this.#made(folder) };
  }

  /**
   * Hold that `name` can be a project's: a name, of 80 characters at most, that no other
   * project here has, whatever the capitals, and that is not the Scratch project's. `but` is
   * the folder of the project being named, whose own name does not count against it.
   */
  async #name(name: string, but: string | null): Promise<string> {
    const wanted = name.trim();
    if (wanted === "") throw new ProjectError("A project needs a name.");
    if (wanted.length > 80) throw new ProjectError("A project's name is at most 80 characters.");
    if (wanted.toLowerCase() === "scratch" && but !== SCRATCH) {
      throw new ProjectError("That name is the Scratch project's. Choose another.");
    }
    for (const one of await this.list()) {
      if (one.folder !== but && one.name.toLowerCase() === wanted.toLowerCase()) {
        throw new ProjectError(
          `A project called "${one.name}" is already here. Choose another name.`,
        );
      }
    }
    return wanted;
  }

  /**
   * Give a project another name (open decision #208): the line of the name in its `zeff.toml`
   * is rewritten, and every other character of the file is as it was. Its folder in the
   * browser's storage keeps its name: it is the app's own key for the project, a reader does
   * not meet it, and moving a whole tree there is a copy and a deletion that a closed tab can
   * leave half done. The Scratch project is not renamed (the owner's answer to question 4).
   */
  async rename(folder: string, name: string): Promise<ProjectInfo> {
    if (folder === SCRATCH) {
      throw new ProjectError(
        "The Scratch project keeps its name. Duplicate it to make a project of your own name.",
      );
    }
    const path = `${ROOT}/${folder}/zeff.toml`;
    const toml = await this.#root.read(path);
    if (toml === null) throw new ProjectError("That project is no longer here.");
    const wanted = await this.#name(name, folder);
    await this.#root.write(path, encoder.encode(renamed(decoder.decode(toml), wanted)));
    return (await this.list()).find((one) => one.folder === folder) as ProjectInfo;
  }

  /**
   * Make a copy of a project under another name: every file of it, the interface's view state
   * among them, in a folder of its own, its manifest naming it anew. This is the one step by
   * which the Scratch project's work becomes a named project (Zemp Specification, section 3).
   * The whole copy or none: what was written is removed if a file cannot be.
   */
  async duplicate(folder: string, name: string): Promise<ProjectInfo> {
    const from = `${ROOT}/${folder}`;
    const toml = await this.#root.read(`${from}/zeff.toml`);
    if (toml === null) throw new ProjectError("That project is no longer here.");
    const wanted = await this.#name(name, null);
    const made = await this.#freeFolder(wanted);
    const to = `${ROOT}/${made}`;
    const copy = async (path: string): Promise<void> => {
      const entries = await this.#root.list(`${from}${path}`);
      if (entries.length === 0) await this.#root.make(`${to}${path}`);
      for (const entry of entries) {
        const at = `${path}/${entry.name}`;
        if (entry.kind === "folder") {
          await copy(at);
        } else {
          const bytes = await this.#root.read(`${from}${at}`);
          if (bytes === null)
            throw new ProjectError(`\`${at.slice(1)}\` could not be read, and nothing was copied.`);
          await this.#root.write(
            `${to}${at}`,
            at === "/zeff.toml" ? encoder.encode(renamed(decoder.decode(bytes), wanted)) : bytes,
          );
        }
      }
    };
    try {
      await copy("");
    } catch (error) {
      await this.#root.remove(to);
      throw error;
    }
    return { folder: made, name: wanted, opened: null, exported: null, made: this.#made(made) };
  }

  /**
   * Put the Scratch project back as a first visit has it: what it holds is deleted, and it is
   * made again with its examples (the owner's answer to question 4: in place of a deletion).
   */
  async resetScratch(): Promise<ProjectInfo> {
    await this.remove(SCRATCH);
    try {
      this.#kept.setItem(GIVEN, "[]");
    } catch {
      // The examples are given again all the same, the project being made anew.
    }
    return this.scratch();
  }

  /** How many files a project holds, the interface's and the engine's own not counted. */
  async count(folder: string): Promise<number> {
    const within = async (path: string): Promise<number> => {
      let files = 0;
      for (const entry of await this.#root.list(path)) {
        if (path === `${ROOT}/${folder}` && (entry.name === ".zemp" || entry.name === ".zeff"))
          continue;
        files += entry.kind === "file" ? 1 : await within(`${path}/${entry.name}`);
      }
      return files;
    };
    return within(`${ROOT}/${folder}`);
  }

  /** A folder for a project of this name that no project has: `wages`, then `wages-2`. */
  async #freeFolder(name: string): Promise<string> {
    const wanted = folderOf(name);
    for (let n = 1; ; n += 1) {
      const folder = n === 1 ? wanted : `${wanted}-${n}`;
      if (folder !== SCRATCH && (await this.#root.kind(`${ROOT}/${folder}`)) === null)
        return folder;
    }
  }

  /** Remove a project and all it holds. */
  async remove(folder: string): Promise<void> {
    await this.#root.remove(`${ROOT}/${folder}`);
    // What was kept of it is forgotten: a project made later in a folder of this name is new.
    for (const key of [OPENED, EXPORTED, MADE]) {
      const times = Object.fromEntries(
        Object.entries(this.#times(key)).filter(([name]) => name !== folder),
      );
      try {
        this.#kept.setItem(key, JSON.stringify(times));
      } catch {
        // Nothing to forget.
      }
    }
  }
}

/** One open project: its files. */
export class Project {
  readonly info: ProjectInfo;
  readonly #files: Folder;
  readonly #exported: () => void;

  /** `exported` is told when the project has been given to the computer as a zip. */
  constructor(info: ProjectInfo, files: Folder, exported: () => void = () => {}) {
    this.info = info;
    this.#files = files;
    this.#exported = exported;
  }

  /** The project was exported now: when is remembered, for the reminder to export. */
  noteExported(): void {
    this.#exported();
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

  /** Make a script, empty, in a folder of the project (`scripts` where none is named); its path. */
  newScript(name: string, folder = "scripts"): Promise<string> {
    return files.newScript(this.#files, name, folder);
  }

  /** Make a folder in a folder of the project (the project's own where none is named); its path. */
  newFolder(name: string, parent = ""): Promise<string> {
    return files.newFolder(this.#files, name, parent);
  }

  /**
   * Add a file chosen from the computer into a folder, under its own name; its path. Nothing is
   * written into a script: in Zemp Lite the reader writes the `import` (Zemp Specification,
   * section 2).
   */
  add(folder: string, name: string, bytes: Uint8Array): Promise<string> {
    return files.add(this.#files, folder, name, bytes);
  }

  /** Add a data file chosen from the computer, under `data/`, which is made where it is not there. */
  async addData(name: string, bytes: Uint8Array): Promise<string> {
    await this.#files.make("data");
    return files.add(this.#files, "data", name, bytes);
  }

  /**
   * Give a file or a folder another path in the project: another name, another folder, or
   * both. The place must be free; what the engine and Zemp open by name is not moved.
   */
  move(from: string, to: string): Promise<void> {
    return files.move(this.#files, from, to);
  }

  /** Make a copy of a file or a folder beside it, under a name with "copy" in it; its path. */
  duplicate(path: string): Promise<string> {
    return files.duplicate(this.#files, path);
  }

  /** How many files a path is: one, or those a folder holds. */
  count(path: string): Promise<number> {
    return files.count(this.#files, path);
  }

  /** Delete a file, or a folder with all it holds; how many files went. */
  remove(path: string): Promise<number> {
    return files.remove(this.#files, path);
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
