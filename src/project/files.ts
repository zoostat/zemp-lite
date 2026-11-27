// The operations on a project's files and folders (release 0.2.2, step 7; open decision #208):
// a script and a folder made, files added, a file or a folder renamed, moved, duplicated and
// deleted. They work on the project's folder in the browser's storage, which has no moving and
// no undoing of its own: a move is a copy that is checked and only then the removal of what was
// copied, so that a tab closed half-way leaves the original whole; and what fails leaves no
// half of a copy behind. The rules of a name are here, in one place, and every refusal is a
// sentence that says what to do.
import { ProjectError } from "./error";
import type { Folder } from "./folder";

/** The interface's own folder and the engine's own: not the reader's to change. */
const OWN = [".zemp", ".zeff"];
/** What a project is known by: the engine and the app open these by name. */
const FIXED = ["zeff.toml", "scripts", "functions", "data", "scripts/main.zeff"];

/** The folder a path lies in (`""` for the project's own), and its name there. */
export function placeOf(path: string): { parent: string; name: string } {
  const at = path.lastIndexOf("/");
  return at < 0
    ? { parent: "", name: path }
    : { parent: path.slice(0, at), name: path.slice(at + 1) };
}

/** A name in a folder, as a path from the project's folder. */
export const inside = (parent: string, name: string): string =>
  parent === "" ? name : `${parent}/${name}`;

const under = (path: string, folder: string): boolean =>
  path === folder || path.startsWith(`${folder}/`);

/** Whether a path is the interface's or the engine's own, or lies in what is. */
export const own = (path: string): boolean => OWN.some((folder) => under(path, folder));

/**
 * Whether a file or a folder may not be renamed, moved or deleted: `zeff.toml`, without which
 * a folder is no project; the folders the engine knows by name; the script the engine runs
 * where none is named (the owner's answer to question 2 of release 0.2.2); and what is the
 * interface's or the engine's own. What a fixed folder holds is not fixed by that.
 */
export const fixed = (path: string): boolean => FIXED.includes(path) || own(path);

/** Why a name cannot be a file's or a folder's, as a sentence; `null` where it can. */
export function nameProblem(name: string): string | null {
  if (name.trim() === "") return "It needs a name.";
  if (name !== name.trim()) return "A name does not begin or end with a space.";
  if (name === "." || name === "..") return "`.` and `..` are not names: choose another.";
  if (/[/\\]/.test(name))
    return "A name is one part of a path: it holds no `/` and no `\\`. Make the folder first.";
  if ([...name].some((character) => (character.codePointAt(0) as number) < 32)) {
    return "A name holds no line break or other control character.";
  }
  if ([...name].length > 120) return "A name is at most 120 characters.";
  return null;
}

/**
 * Hold that `name` can be made in the folder `parent`: a name that is one, a folder that is
 * there and is not the app's or the engine's own, and no neighbour of that name, or of a name
 * that differs from it only in capitals (most computers cannot keep both, and a project is
 * meant to leave the browser). `but` is a neighbour that does not count: the thing renamed.
 */
async function free(
  files: Folder,
  parent: string,
  name: string,
  but: string | null = null,
): Promise<void> {
  const problem = nameProblem(name);
  if (problem !== null) throw new ProjectError(problem);
  if (own(inside(parent, name))) {
    throw new ProjectError(
      `\`${parent === "" ? name : parent}\` is kept by Zemp and the engine. Choose another place.`,
    );
  }
  if ((await files.kind(parent)) !== "folder") {
    throw new ProjectError(`There is no folder \`${parent}\` in this project.`);
  }
  for (const entry of await files.list(parent)) {
    if (entry.name === but) continue;
    const there = inside(parent, entry.name);
    if (entry.name === name) {
      throw new ProjectError(`\`${there}\` is already in this project. Choose another name.`);
    }
    if (entry.name.toLowerCase() === name.toLowerCase()) {
      throw new ProjectError(
        `\`${there}\` is already in this project, and differs from that name only in capitals; most computers cannot keep both. Choose another name.`,
      );
    }
  }
}

/** Every file under a path, each by its path, and every folder that holds nothing. */
async function walk(files: Folder, path: string): Promise<{ files: string[]; empty: string[] }> {
  const found = { files: [] as string[], empty: [] as string[] };
  const entries = await files.list(path);
  if (entries.length === 0) found.empty.push(path);
  for (const entry of entries) {
    const at = inside(path, entry.name);
    if (entry.kind === "file") {
      found.files.push(at);
    } else {
      const inner = await walk(files, at);
      found.files.push(...inner.files);
      found.empty.push(...inner.empty);
    }
  }
  return found;
}

/** How many files a path is: one for a file, those it holds for a folder, none where there is nothing. */
export async function count(files: Folder, path: string): Promise<number> {
  const kind = await files.kind(path);
  return kind === null ? 0 : kind === "file" ? 1 : (await walk(files, path)).files.length;
}

/**
 * Copy a file or a folder to a path that is free, and hold the copy to the original: every
 * file there, each with the bytes of its own. A copy that cannot be finished is removed, and
 * the reason given.
 */
async function copy(files: Folder, from: string, to: string): Promise<void> {
  const same = (one: Uint8Array, other: Uint8Array | null): boolean =>
    other !== null && one.length === other.length && one.every((byte, at) => byte === other[at]);
  try {
    if ((await files.kind(from)) === "file") {
      const bytes = await files.read(from);
      if (bytes === null) throw new Error(`\`${from}\` could not be read`);
      await files.write(to, bytes);
      if (!same(bytes, await files.read(to))) throw new Error(`\`${to}\` was not written whole`);
      return;
    }
    const found = await walk(files, from);
    await files.make(to);
    for (const path of found.empty) await files.make(to + path.slice(from.length));
    for (const path of found.files) {
      const bytes = await files.read(path);
      if (bytes === null) throw new Error(`\`${path}\` could not be read`);
      const at = to + path.slice(from.length);
      await files.write(at, bytes);
      if (!same(bytes, await files.read(at))) throw new Error(`\`${at}\` was not written whole`);
    }
  } catch (error) {
    await files.remove(to).catch(() => undefined);
    throw error;
  }
}

/** Hold that something is at `path`, and give what it is. */
async function there(files: Folder, path: string): Promise<"file" | "folder"> {
  const kind = path === "" ? null : await files.kind(path);
  if (kind === null) throw new ProjectError(`There is no \`${path}\` in this project.`);
  return kind;
}

/** Make a script in a folder, empty, with `.zeff` after its name where the name lacks it. */
export async function newScript(files: Folder, name: string, folder = "scripts"): Promise<string> {
  const named = name.trim();
  const whole = named === "" || named.toLowerCase().endsWith(".zeff") ? named : `${named}.zeff`;
  await free(files, folder, whole);
  const path = inside(folder, whole);
  await files.write(path, new Uint8Array(0));
  return path;
}

/**
 * Make a paper, a Typst source, in a folder at the project's top, which is made where it is
 * not there: `.typ` after its name where the name lacks it, and `text` in it. Where the name
 * cannot be given, nothing is made, the folder included.
 */
export async function newPaper(
  files: Folder,
  name: string,
  folder: string,
  text: Uint8Array,
): Promise<string> {
  const named = name.trim();
  const whole = named === "" || named.toLowerCase().endsWith(".typ") ? named : `${named}.typ`;
  const there = await files.kind(folder);
  if (there === "file") {
    throw new ProjectError(
      `\`${folder}\` is a file of this project, so no folder of that name can hold the paper. Rename the file first.`,
    );
  }
  if (there === null) {
    // The name is held to the rules before the folder is made for it.
    const problem = nameProblem(whole);
    if (problem !== null) throw new ProjectError(problem);
    await free(files, "", folder);
    await files.make(folder);
  }
  await free(files, folder, whole);
  const path = inside(folder, whole);
  await files.write(path, text);
  return path;
}

/** Make a folder in a folder (`""` is the project's own). */
export async function newFolder(files: Folder, name: string, parent = ""): Promise<string> {
  await free(files, parent, name.trim());
  const path = inside(parent, name.trim());
  await files.make(path);
  return path;
}

/**
 * Add a file chosen from the computer into a folder, under its own name. Nothing is written
 * into a script: in Zemp Lite the reader writes the `import` (Zemp Specification, section 2).
 */
export async function add(
  files: Folder,
  folder: string,
  name: string,
  bytes: Uint8Array,
): Promise<string> {
  // A file comes with the name its computer gave it; what a path cannot hold becomes a hyphen.
  const clean = name.replace(/[/\\]/g, "-").trim();
  await free(files, folder, clean);
  const path = inside(folder, clean);
  await files.write(path, bytes);
  return path;
}

/**
 * Give a file or a folder another path: a new name, another folder, or both. What is fixed is
 * not moved; a folder is not moved into itself; the place must be free. The copy is made and
 * checked before the original is removed: what goes wrong before that leaves the original
 * whole and no copy.
 */
export async function move(files: Folder, from: string, to: string): Promise<void> {
  const kind = await there(files, from);
  if (from === to) return;
  if (fixed(from)) {
    throw new ProjectError(
      `\`${from}\` is not renamed or moved: ${from === "zeff.toml" ? "without it this is no project" : "the engine and Zemp open it by this name"}.`,
    );
  }
  if (kind === "folder" && under(to, from)) {
    throw new ProjectError(`A folder is not moved into itself: \`${to}\` lies in \`${from}\`.`);
  }
  const { parent, name } = placeOf(to);
  // Renamed where it stands, it is no neighbour of its own (a change of capitals alone is a rename).
  await free(files, parent, name, placeOf(from).parent === parent ? placeOf(from).name : null);
  try {
    await copy(files, from, to);
  } catch (error) {
    throw new ProjectError(
      `\`${from}\` could not be moved, and is where it was: ${(error as Error).message}.`,
    );
  }
  await files.remove(from);
}

/** A name with "copy" in it that no neighbour has: `main copy.zeff`, then `main copy 2.zeff`. */
async function copyName(files: Folder, path: string, kind: "file" | "folder"): Promise<string> {
  const { parent, name } = placeOf(path);
  const dot = kind === "file" ? name.lastIndexOf(".") : -1;
  const [stem, ending] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ""];
  const taken = new Set((await files.list(parent)).map((entry) => entry.name.toLowerCase()));
  for (let n = 1; ; n += 1) {
    const wanted = `${stem} copy${n === 1 ? "" : ` ${n}`}${ending}`;
    if (!taken.has(wanted.toLowerCase())) return wanted;
  }
}

/** Make a copy of a file or a folder beside it, under a name with "copy" in it; its path. */
export async function duplicate(files: Folder, path: string): Promise<string> {
  const kind = await there(files, path);
  if (own(path))
    throw new ProjectError(`\`${path}\` is kept by Zemp and the engine, and is not copied.`);
  const to = inside(placeOf(path).parent, await copyName(files, path, kind));
  try {
    await copy(files, path, to);
  } catch (error) {
    throw new ProjectError(`\`${path}\` could not be copied: ${(error as Error).message}.`);
  }
  return to;
}

/** Delete a file, or a folder with all it holds; how many files went. What is fixed is not deleted. */
export async function remove(files: Folder, path: string): Promise<number> {
  await there(files, path);
  if (fixed(path)) {
    throw new ProjectError(
      `\`${path}\` is not deleted: ${path === "zeff.toml" ? "without it this is no project" : "the engine and Zemp open it by this name"}.`,
    );
  }
  const gone = await count(files, path);
  await files.remove(path);
  return gone;
}
