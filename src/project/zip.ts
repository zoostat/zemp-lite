// A zip, written and read (release 0.2.2, step 2; open decisions #208 and #117). A project
// leaves the browser as one zip (**Export project…**, a folder saved) and comes back as one
// (**Open project…**). Every browser the alpha supports, and Node, where the tests
// run, has the deflate of a zip built in (`CompressionStream`, "deflate-raw"); what is written
// here is the container: each file's header, the directory at the end, and a CRC-32. So the
// zip is this repository's own and no dependency is taken for it.
//
// Reading trusts nothing the archive says of itself. A path that would leave the folder, two
// files that one folder cannot both hold, a size beyond the limit given (counted as the file
// is unpacked, not as the archive claims) and a file that does not unpack to what its CRC
// says are each refused, in a sentence, before the caller writes anything.

/** A file of an archive: its path from the top, with `/` between the parts, and its bytes. */
export interface ZipFile {
  path: string;
  bytes: Uint8Array;
}

/** What an archive holds: its files, and the folders it names that hold none. */
export interface ZipHeld {
  files: ZipFile[];
  /** Folders with an entry of their own, without the `/` at the end. */
  folders: string[];
}

/** The most an archive may unpack to. */
export interface ZipLimits {
  /** The bytes of all its files together. */
  whole: number;
  /** How many files and folders. */
  entries: number;
}

/** An archive that is not written, or not opened, with the reason as a sentence for the reader. */
export class ZipError extends Error {
  override name = "ZipError";
}

const LOCAL = 0x04034b50;
const CENTRAL = 0x02014b50;
const END = 0x06054b50;
const END64 = 0x07064b50;
/** The most a zip of the ordinary kind counts: sizes in 32 bits, entries in 16. */
const MOST_BYTES = 0xffffffff;
const MOST_ENTRIES = 0xffff;
/** Names are UTF-8 (the flag's bit 11). */
const UTF8 = 0x0800;

const TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

/** The CRC-32 of some bytes, as a zip keeps it. */
export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (TABLE[(crc ^ byte) & 0xff] as number) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Bytes through the platform's deflate or inflate. `most` stops an inflation that grows
 * beyond it, and gives `null`: an archive may claim a size it does not have.
 */
async function through(
  bytes: Uint8Array,
  format: CompressionStream | DecompressionStream,
  most = Infinity,
): Promise<Uint8Array | null> {
  const reader = new Blob([bytes as Uint8Array<ArrayBuffer>])
    .stream()
    .pipeThrough(format)
    .getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > most) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const whole = new Uint8Array(length);
  let at = 0;
  for (const chunk of chunks) {
    whole.set(chunk, at);
    at += chunk.length;
  }
  return whole;
}

/** A moment as a zip writes it: two seconds to a unit, the year from 1980, the reader's own clock. */
function dosTime(at: Date): { time: number; date: number } {
  const year = Math.min(Math.max(at.getFullYear(), 1980), 2107);
  return {
    time: (at.getHours() << 11) | (at.getMinutes() << 5) | (at.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((at.getMonth() + 1) << 5) | at.getDate(),
  };
}

/** The parts of a path, or `null` where it is not a path inside a folder. */
function partsOf(path: string): string[] | null {
  if (path === "" || path.includes("\\") || path.startsWith("/") || /^[A-Za-z]:/.test(path)) {
    return null;
  }
  const parts = path.split("/");
  return parts.some((part) => part === "" || part === "." || part === "..") ? null : parts;
}

/**
 * Write files, and the folders that hold none, as one zip. Each file is deflated, or stored
 * as it is where deflating would not make it smaller; every entry carries the moment `at`.
 * The same files at the same moment give the same bytes.
 */
export async function writeZip(held: ZipHeld, at: Date): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const { time, date } = dosTime(at);
  const entries = [
    ...held.folders.map((path) => ({ path: `${path}/`, bytes: new Uint8Array(0), folder: true })),
    ...held.files.map((file) => ({ ...file, folder: false })),
  ].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  if (entries.length > MOST_ENTRIES) {
    throw new ZipError(
      `A zip of this kind holds at most 65,535 files and folders; this would hold ${entries.length.toLocaleString("en-GB")}.`,
    );
  }
  const seen = new Set<string>();
  const parts: Uint8Array[] = [];
  const directory: Uint8Array[] = [];
  let offset = 0;
  for (const entry of entries) {
    const inside = partsOf(entry.folder ? entry.path.slice(0, -1) : entry.path);
    if (inside === null || seen.has(entry.path)) {
      throw new ZipError(
        `\`${entry.path}\` cannot be written into a zip: it is not a path of its own inside the folder.`,
      );
    }
    seen.add(entry.path);
    const name = encoder.encode(entry.path);
    const deflated = entry.folder
      ? null
      : await through(entry.bytes, new CompressionStream("deflate-raw"));
    const packed = deflated !== null && deflated.length < entry.bytes.length;
    const data = packed ? deflated : entry.bytes;
    if (entry.bytes.length > MOST_BYTES || offset + data.length + name.length + 30 > MOST_BYTES) {
      throw new ZipError("A zip of this kind holds at most 4 GB; this would be larger.");
    }
    const crc = crc32(entry.bytes);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, LOCAL, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, UTF8, true);
    local.setUint16(8, packed ? 8 : 0, true);
    local.setUint16(10, time, true);
    local.setUint16(12, date, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, entry.bytes.length, true);
    local.setUint16(26, name.length, true);
    local.setUint16(28, 0, true);
    parts.push(new Uint8Array(local.buffer), name, data);
    const central = new DataView(new ArrayBuffer(46));
    central.setUint32(0, CENTRAL, true);
    central.setUint16(4, 20, true);
    central.setUint16(6, 20, true);
    central.setUint16(8, UTF8, true);
    central.setUint16(10, packed ? 8 : 0, true);
    central.setUint16(12, time, true);
    central.setUint16(14, date, true);
    central.setUint32(16, crc, true);
    central.setUint32(20, data.length, true);
    central.setUint32(24, entry.bytes.length, true);
    central.setUint16(28, name.length, true);
    // No extra field, no comment, the first disk, no attributes within; a folder is marked one.
    central.setUint32(38, entry.folder ? 0x10 : 0, true);
    central.setUint32(42, offset, true);
    directory.push(new Uint8Array(central.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const size = directory.reduce((sum, part) => sum + part.length, 0);
  if (offset + size + 22 > MOST_BYTES) {
    throw new ZipError("A zip of this kind holds at most 4 GB; this would be larger.");
  }
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, END, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, size, true);
  end.setUint32(16, offset, true);
  const whole = new Uint8Array(offset + size + 22);
  let written = 0;
  for (const part of [...parts, ...directory, new Uint8Array(end.buffer)]) {
    whole.set(part, written);
    written += part.length;
  }
  return whole;
}

const NOT_A_ZIP = "That file is not a zip, or it is cut short.";

/** A size as a reader says it: `12 MB`, `1.5 GB`. */
function sizeOf(bytes: number): string {
  const units = ["bytes", "kB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit += 1;
  }
  return `${unit === 0 || value >= 10 ? Math.round(value) : Math.round(value * 10) / 10} ${units[unit]}`;
}

/**
 * Read a zip: its files, each unpacked and held to its CRC-32, and its empty folders. What
 * cannot be opened safely is refused whole, with a `ZipError` whose message says why.
 */
export async function readZip(archive: Uint8Array, limits: ZipLimits): Promise<ZipHeld> {
  const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
  // The directory's end: the last 22 bytes, or before a comment of up to 65,535.
  let end = -1;
  for (let at = archive.length - 22; at >= Math.max(0, archive.length - 22 - 0xffff); at -= 1) {
    if (
      view.getUint32(at, true) === END &&
      at + 22 + view.getUint16(at + 20, true) === archive.length
    ) {
      end = at;
      break;
    }
  }
  if (end < 0) throw new ZipError(NOT_A_ZIP);
  const count = view.getUint16(end + 10, true);
  const size = view.getUint32(end + 12, true);
  const start = view.getUint32(end + 16, true);
  const split = view.getUint16(end + 4, true) !== 0 || view.getUint16(end + 6, true) !== 0;
  const wide =
    count === MOST_ENTRIES ||
    size === MOST_BYTES ||
    start === MOST_BYTES ||
    (end >= 20 && view.getUint32(end - 20, true) === END64);
  if (split || wide || view.getUint16(end + 8, true) !== count) {
    throw new ZipError(
      "That zip is split over several files, or is of the kind made for more than 4 GB or 65,535 files. Zemp Lite does not open it.",
    );
  }
  if (start + size > end) throw new ZipError(NOT_A_ZIP);
  if (count > limits.entries) {
    throw new ZipError(
      `That zip holds ${count.toLocaleString("en-GB")} files and folders, more than the ${limits.entries.toLocaleString("en-GB")} a project here may hold.`,
    );
  }
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const held: ZipHeld = { files: [], folders: [] };
  /** Each path met, by its lower case, with what it is: a file, or a folder (named or implied). */
  const met = new Map<string, { path: string; kind: "file" | "folder" }>();
  const meet = (path: string, kind: "file" | "folder", own: boolean): void => {
    const before = met.get(path.toLowerCase());
    if (before === undefined) {
      met.set(path.toLowerCase(), { path, kind });
    } else if (before.path !== path) {
      throw new ZipError(
        `That zip holds \`${before.path}\` and \`${path}\`, which differ only in capitals; most computers cannot keep both.`,
      );
    } else if (before.kind !== kind) {
      throw new ZipError(`That zip holds \`${path}\` both as a file and as a folder.`);
    } else if (kind === "file" && own) {
      throw new ZipError(`That zip holds \`${path}\` twice.`);
    }
  };
  let unpacked = 0;
  let at = start;
  for (let n = 0; n < count; n += 1) {
    if (at + 46 > end || view.getUint32(at, true) !== CENTRAL) throw new ZipError(NOT_A_ZIP);
    const flags = view.getUint16(at + 8, true);
    const method = view.getUint16(at + 10, true);
    const crc = view.getUint32(at + 16, true);
    const packed = view.getUint32(at + 20, true);
    const length = view.getUint32(at + 24, true);
    const nameLength = view.getUint16(at + 28, true);
    const local = view.getUint32(at + 42, true);
    const next =
      at + 46 + nameLength + view.getUint16(at + 30, true) + view.getUint16(at + 32, true);
    if (next > end) throw new ZipError(NOT_A_ZIP);
    let path: string;
    try {
      path = decoder.decode(archive.subarray(at + 46, at + 46 + nameLength));
    } catch {
      throw new ZipError(
        "That zip holds a file whose name is not written in UTF-8. Zemp Lite does not open it.",
      );
    }
    at = next;
    const folder = path.endsWith("/");
    const inside = partsOf(folder ? path.slice(0, -1) : path);
    if (inside === null) {
      throw new ZipError(
        `That zip holds \`${path}\`, which would be written outside the project. It is not opened.`,
      );
    }
    if (flags & 1) {
      throw new ZipError("That zip is protected by a password. Zemp Lite does not open it.");
    }
    if (packed === MOST_BYTES || length === MOST_BYTES || local === MOST_BYTES) {
      throw new ZipError(
        "That zip is split over several files, or is of the kind made for more than 4 GB or 65,535 files. Zemp Lite does not open it.",
      );
    }
    // The folders a path lies in are folders, whether or not the zip names them.
    for (let depth = 1; depth < inside.length; depth += 1) {
      meet(inside.slice(0, depth).join("/"), "folder", false);
    }
    const clean = inside.join("/");
    if (folder) {
      if (length !== 0 || packed > 2) throw new ZipError(NOT_A_ZIP);
      meet(clean, "folder", false);
      held.folders.push(clean);
      continue;
    }
    meet(clean, "file", true);
    if (method !== 0 && method !== 8) {
      throw new ZipError(
        `That zip holds \`${path}\` packed in a way Zemp Lite does not read. Make the zip again in the ordinary way.`,
      );
    }
    if (local + 30 > start || view.getUint32(local, true) !== LOCAL) throw new ZipError(NOT_A_ZIP);
    const from = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    if (from + packed > start) throw new ZipError(NOT_A_ZIP);
    const data = archive.subarray(from, from + packed);
    const room = limits.whole - unpacked;
    let bytes: Uint8Array | null;
    if (method === 0) {
      if (packed !== length) {
        throw new ZipError(
          `That zip is damaged: \`${path}\` does not unpack to what the zip says it holds.`,
        );
      }
      bytes = packed > room ? null : data.slice();
    } else {
      try {
        bytes = await through(data, new DecompressionStream("deflate-raw"), room);
      } catch {
        throw new ZipError(
          `That zip is damaged: \`${path}\` does not unpack to what the zip says it holds.`,
        );
      }
    }
    if (bytes === null) {
      throw new ZipError(
        `That zip unpacks to more than ${sizeOf(limits.whole)}, the most a project here may hold. It is not opened.`,
      );
    }
    if (bytes.length !== length || crc32(bytes) !== crc) {
      throw new ZipError(
        `That zip is damaged: \`${path}\` does not unpack to what the zip says it holds.`,
      );
    }
    unpacked += bytes.length;
    held.files.push({ path: clean, bytes });
  }
  // A folder the zip names is empty only if nothing lies in it.
  const filled = new Set<string>();
  for (const file of held.files) {
    const parts = file.path.split("/");
    for (let depth = 1; depth < parts.length; depth += 1)
      filled.add(parts.slice(0, depth).join("/"));
  }
  for (const folder of held.folders) {
    const parts = folder.split("/");
    for (let depth = 1; depth < parts.length; depth += 1)
      filled.add(parts.slice(0, depth).join("/"));
  }
  held.folders = [...new Set(held.folders)].filter((folder) => !filled.has(folder));
  return held;
}
