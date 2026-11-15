// A folder of files, as much of one as Zemp needs. Projects are kept in the browser's private
// file system (the Origin Private File System; Zemp Specification, section 10), which
// `OpfsFolder` reaches; `MemoryFolder` is the same thing in memory, for the tests.
//
// A path is written from the folder, with `/` between its parts: `scripts/main.zeff`. A part
// is never empty, `.` or `..`, so no path leaves the folder.

/** One thing in a folder. A folder's size is 0. */
export interface Entry {
  name: string;
  kind: "file" | "folder";
  size: number;
}

export interface Folder {
  /** What `path` holds, by name; nothing where there is no such folder. `""` is the folder itself. */
  list(path: string): Promise<Entry[]>;
  /** What is at `path`: a file, a folder, or nothing. */
  kind(path: string): Promise<"file" | "folder" | null>;
  /** The bytes of a file, or `null` where there is none. */
  read(path: string): Promise<Uint8Array | null>;
  /** Write a file, making the folders above it; a file of that path is replaced. */
  write(path: string, bytes: Uint8Array): Promise<void>;
  /** Make a folder, and the folders above it. */
  make(path: string): Promise<void>;
  /** Remove a file, or a folder with all it holds; nothing where there is none. */
  remove(path: string): Promise<void>;
}

/** A path that is not one: an empty part, `.`, `..`, or a `\`. */
export class BadPath extends Error {
  override name = "BadPath";
  constructor(path: string) {
    super(`\`${path}\` is not a path inside the folder`);
  }
}

/** The parts of a path; `[]` for the folder itself. */
export function parts(path: string): string[] {
  if (path === "") {
    return [];
  }
  const found = path.split("/");
  for (const part of found) {
    if (part === "" || part === "." || part === ".." || part.includes("\\")) {
      throw new BadPath(path);
    }
  }
  return found;
}

const byName = (a: Entry, b: Entry) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);

type Node = Uint8Array | Map<string, Node>;

/** A folder in memory. */
export class MemoryFolder implements Folder {
  readonly #root = new Map<string, Node>();

  #folder(at: string[], make: boolean): Map<string, Node> | null {
    let here = this.#root;
    for (const part of at) {
      let next = here.get(part);
      if (next === undefined) {
        if (!make) return null;
        next = new Map<string, Node>();
        here.set(part, next);
      }
      if (!(next instanceof Map)) return null;
      here = next;
    }
    return here;
  }

  list(path: string): Promise<Entry[]> {
    const folder = this.#folder(parts(path), false);
    const entries: Entry[] = [];
    for (const [name, node] of folder ?? []) {
      entries.push(
        node instanceof Map
          ? { name, kind: "folder", size: 0 }
          : { name, kind: "file", size: node.byteLength },
      );
    }
    return Promise.resolve(entries.sort(byName));
  }

  kind(path: string): Promise<"file" | "folder" | null> {
    const at = parts(path);
    const name = at.pop();
    if (name === undefined) {
      return Promise.resolve("folder");
    }
    const node = this.#folder(at, false)?.get(name);
    return Promise.resolve(node === undefined ? null : node instanceof Map ? "folder" : "file");
  }

  read(path: string): Promise<Uint8Array | null> {
    const at = parts(path);
    const name = at.pop();
    const node = name === undefined ? undefined : this.#folder(at, false)?.get(name);
    return Promise.resolve(node instanceof Uint8Array ? node.slice() : null);
  }

  write(path: string, bytes: Uint8Array): Promise<void> {
    const at = parts(path);
    const name = at.pop();
    const folder = name === undefined ? null : this.#folder(at, true);
    if (name === undefined || folder === null || folder.get(name) instanceof Map) {
      return Promise.reject(new BadPath(path));
    }
    folder.set(name, bytes.slice());
    return Promise.resolve();
  }

  make(path: string): Promise<void> {
    return this.#folder(parts(path), true) === null
      ? Promise.reject(new BadPath(path))
      : Promise.resolve();
  }

  remove(path: string): Promise<void> {
    const at = parts(path);
    const name = at.pop();
    if (name !== undefined) {
      this.#folder(at, false)?.delete(name);
    }
    return Promise.resolve();
  }
}

/** A folder of the browser's private file system, under the handle given. */
export class OpfsFolder implements Folder {
  readonly #root: Promise<FileSystemDirectoryHandle>;

  constructor(root: Promise<FileSystemDirectoryHandle>) {
    this.#root = root;
  }

  /**
   * The private file system of this origin, where the browser gives the page one it can
   * write to; `null` where it does not. Asking is not enough: a private window of some
   * browsers has the calls and refuses them, so a file is written and removed to find out.
   */
  static async open(): Promise<OpfsFolder | null> {
    try {
      const root = await navigator.storage.getDirectory();
      const probe = await root.getFileHandle(".zemp-probe", { create: true });
      const writer = await probe.createWritable();
      await writer.write(new Uint8Array([1]));
      await writer.close();
      await root.removeEntry(".zemp-probe");
      return new OpfsFolder(Promise.resolve(root));
    } catch {
      return null;
    }
  }

  async #folder(at: string[], make: boolean): Promise<FileSystemDirectoryHandle | null> {
    let here = await this.#root;
    for (const part of at) {
      try {
        here = await here.getDirectoryHandle(part, { create: make });
      } catch {
        return null;
      }
    }
    return here;
  }

  async list(path: string): Promise<Entry[]> {
    const folder = await this.#folder(parts(path), false);
    const entries: Entry[] = [];
    if (folder !== null) {
      for await (const [name, handle] of folder.entries()) {
        if (handle.kind === "directory") {
          entries.push({ name, kind: "folder", size: 0 });
        } else {
          const file = await (handle as FileSystemFileHandle).getFile();
          entries.push({ name, kind: "file", size: file.size });
        }
      }
    }
    return entries.sort(byName);
  }

  async kind(path: string): Promise<"file" | "folder" | null> {
    const at = parts(path);
    const name = at.pop();
    if (name === undefined) {
      return "folder";
    }
    const folder = await this.#folder(at, false);
    if (folder === null) {
      return null;
    }
    try {
      await folder.getFileHandle(name);
      return "file";
    } catch {
      // Not a file.
    }
    try {
      await folder.getDirectoryHandle(name);
      return "folder";
    } catch {
      return null;
    }
  }

  async read(path: string): Promise<Uint8Array | null> {
    const at = parts(path);
    const name = at.pop();
    const folder = name === undefined ? null : await this.#folder(at, false);
    if (name === undefined || folder === null) {
      return null;
    }
    try {
      const file = await (await folder.getFileHandle(name)).getFile();
      return new Uint8Array(await file.arrayBuffer());
    } catch {
      return null;
    }
  }

  async write(path: string, bytes: Uint8Array): Promise<void> {
    const at = parts(path);
    const name = at.pop();
    const folder = name === undefined ? null : await this.#folder(at, true);
    if (name === undefined || folder === null) {
      throw new BadPath(path);
    }
    const handle = await folder.getFileHandle(name, { create: true });
    const writer = await handle.createWritable();
    await writer.write(bytes as Uint8Array<ArrayBuffer>);
    await writer.close();
  }

  async make(path: string): Promise<void> {
    if ((await this.#folder(parts(path), true)) === null) {
      throw new BadPath(path);
    }
  }

  async remove(path: string): Promise<void> {
    const at = parts(path);
    const name = at.pop();
    const folder = name === undefined ? null : await this.#folder(at, false);
    if (name === undefined || folder === null) {
      return;
    }
    try {
      await folder.removeEntry(name, { recursive: true });
    } catch {
      // There was none.
    }
  }
}

/** A folder inside another: every path is taken from `base`. */
export class Inside implements Folder {
  readonly #outer: Folder;
  readonly #base: string;

  constructor(outer: Folder, base: string) {
    parts(base);
    this.#outer = outer;
    this.#base = base;
  }

  #at(path: string): string {
    parts(path);
    return path === "" ? this.#base : `${this.#base}/${path}`;
  }

  list(path: string): Promise<Entry[]> {
    return this.#outer.list(this.#at(path));
  }
  kind(path: string): Promise<"file" | "folder" | null> {
    return this.#outer.kind(this.#at(path));
  }
  read(path: string): Promise<Uint8Array | null> {
    return this.#outer.read(this.#at(path));
  }
  write(path: string, bytes: Uint8Array): Promise<void> {
    return this.#outer.write(this.#at(path), bytes);
  }
  make(path: string): Promise<void> {
    return this.#outer.make(this.#at(path));
  }
  remove(path: string): Promise<void> {
    return this.#outer.remove(this.#at(path));
  }
}
