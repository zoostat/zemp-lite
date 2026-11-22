// A zip opened as a new project (release 0.2.2, step 5; open decisions #208 and #117). What
// **Export project…** writes comes back by it, and so does a project folder zipped on the
// computer. The zip is read and proved first (`zip.ts`); here what it holds is made into a
// project: the one folder that holds everything is taken off, what is not the project's is
// left out, and a zip with no `zeff.toml` at its top is refused. Nothing is written until all
// of that holds.
import { ProjectError, nameIn, type FromZip } from "./projects";
import type { ZipHeld } from "./zip";

/** What a computer's own file manager puts into a zip beside the files: not the project's. */
const theirs = (path: string): boolean =>
  path === "__MACOSX" || path.startsWith("__MACOSX/") || path.split("/").pop() === ".DS_Store";

/** The interface's own folder and the engine's own, which an exported zip leaves out too. */
const own = (path: string): boolean =>
  [".zemp", ".zeff"].some((folder) => path === folder || path.startsWith(`${folder}/`));

/**
 * The project a zip holds. Its files may lie at the zip's top or, all of them, in one folder
 * there, as **Export project…** and a folder zipped on the computer both have them.
 */
export function projectOf(held: ZipHeld): FromZip {
  let files = held.files.filter((file) => !theirs(file.path));
  let folders = held.folders.filter((folder) => !theirs(folder));
  const tops = new Set(
    [...files.map((file) => file.path), ...folders].map((path) => path.split("/")[0]),
  );
  if (!files.some((file) => file.path === "zeff.toml") && tops.size === 1) {
    // One folder holds everything: the project is what is in it.
    const [top = ""] = tops;
    const inside = (path: string) => path.slice(top.length + 1);
    files = files
      .filter((file) => file.path !== top)
      .map((file) => ({ ...file, path: inside(file.path) }));
    folders = folders.filter((folder) => folder !== top).map(inside);
  }
  const manifest = files.find((file) => file.path === "zeff.toml");
  if (manifest === undefined) {
    throw new ProjectError(
      "That zip holds no project: a project's zip has `zeff.toml` at its top, or in the one folder at its top, as Export project… writes it.",
    );
  }
  let toml: string;
  try {
    toml = new TextDecoder("utf-8", { fatal: true }).decode(manifest.bytes);
  } catch {
    throw new ProjectError("That zip's `zeff.toml` is not text. It is not opened.");
  }
  return {
    toml,
    name: nameIn(toml),
    files: files.filter((file) => !own(file.path)),
    folders: folders.filter((folder) => !own(folder)),
  };
}

/**
 * The most a zip may unpack to: the memory budget the engine gives a window of the browser
 * where the project sets none (Engine Specification, section 8.3, point 7), which is the
 * smaller of 3.5 GB and half the memory the device reports, and 3.5 GB where it reports none.
 * `deviceGiB` is what the browser says of the device (`navigator.deviceMemory`), if anything.
 */
export function limitsFor(deviceGiB: number | undefined): { whole: number; entries: number } {
  const largest = 3_500_000_000;
  const whole =
    deviceGiB === undefined || deviceGiB <= 0
      ? largest
      : Math.min(largest, (deviceGiB * 2 ** 30) / 2);
  // A zip of the ordinary kind counts its entries in 16 bits, and 65,535 marks the other kind.
  return { whole, entries: 65_534 };
}
