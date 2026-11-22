// A project, or a folder of one, as a zip for the computer (release 0.2.2, steps 3 and 4;
// open decision #208; the owner's answer to question 5). The zip is `<the project's name>.zip`
// with one folder of that name in it, holding the project as the `zeff` command line would
// find it: `zeff.toml`, `scripts/`, `functions/`, `data/`, `output/` and whatever else the
// visitor put there. Left out are the interface's own view state (`.zemp/`) and the engine's
// own folder (`.zeff/`: its caches, run records, lock and console session), all of which
// `zeff new` keeps out of Git too. Unpacked, it is a project `zeff run` runs.
import type { Project, TreeNode } from "./projects";
import { writeZip, type ZipHeld } from "./zip";

/** The folders at a project's top that are not the project's to share. */
const OWN = [".zemp", ".zeff"];

/**
 * A name as one part of a path on any computer: the characters a file's name may not hold
 * there become a hyphen, and a name that would be empty, or hidden, is `project`.
 */
export function fileNameOf(name: string): string {
  const clean = [...name]
    .map((character) =>
      (character.codePointAt(0) as number) < 32 || '\u007f<>:"/\\|?*'.includes(character)
        ? "-"
        : character,
    )
    .join("")
    .replace(/-{2,}/g, "-")
    .replace(/^[\s.-]+|[\s.-]+$/g, "");
  return clean === "" ? "project" : clean;
}

/** What lies under some nodes of a project's tree: the files' paths, and the folders that hold nothing. */
function under(nodes: TreeNode[]): { files: string[]; folders: string[] } {
  const found = { files: [] as string[], folders: [] as string[] };
  for (const node of nodes) {
    if (node.kind === "file") {
      found.files.push(node.path);
    } else if (node.children.length === 0) {
      found.folders.push(node.path);
    } else {
      const inner = under(node.children);
      found.files.push(...inner.files);
      found.folders.push(...inner.folders);
    }
  }
  return found;
}

/** The nodes of a tree read into what a zip holds, each path set under `top` and taken from under `from`. */
async function held(
  project: Project,
  nodes: TreeNode[],
  top: string,
  from: string,
): Promise<ZipHeld> {
  const inside = (path: string) => `${top}/${from === "" ? path : path.slice(from.length + 1)}`;
  const { files, folders } = under(nodes);
  const read: ZipHeld = { files: [], folders: folders.map(inside) };
  for (const path of files) {
    const bytes = await project.read(path);
    if (bytes !== null) read.files.push({ path: inside(path), bytes });
  }
  // A folder with nothing in it at all is still a folder of the zip.
  if (read.files.length === 0 && read.folders.length === 0) read.folders.push(top);
  return read;
}

/** A zip ready for the computer: the name of its file, and its bytes. */
export interface Exported {
  name: string;
  bytes: Uint8Array;
}

/** The whole project as a zip, written at the moment `at` (milliseconds since 1970). */
export async function exportProject(project: Project, at: number): Promise<Exported> {
  const top = fileNameOf(project.info.name);
  const nodes = (await project.tree()).filter((node) => !OWN.includes(node.name));
  const zip = await writeZip(await held(project, nodes, top, ""), new Date(at));
  return { name: `${top}.zip`, bytes: zip };
}

/** One folder of the project as a zip, named by the folder and holding it. */
export async function exportFolder(project: Project, path: string, at: number): Promise<Exported> {
  const top = fileNameOf(path.split("/").pop() ?? path);
  const nodes = await project.tree(path);
  const zip = await writeZip(await held(project, nodes, top, path), new Date(at));
  return { name: `${top}.zip`, bytes: zip };
}
