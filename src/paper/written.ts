// Which script wrote which file, and from what text (release 0.3, step 15b). A paper sets the
// tables and figures scripts wrote with `export`. Each time a run writes a file, the script
// that ran and a digest of its text are noted and kept with the project; a file whose script
// reads differently now than when it wrote the file is stale, and the page says so until a
// run writes it again. A change of any kind marks it, a comment included: too many marked is
// safe, too few is not (the Zemp Specification, section 5, "Stale output").

/** The file the record is kept in: the interface's own, beside the view state. */
export const WRITTEN = ".zemp/written.json";

/** The script that wrote a file, by its path, and the SHA-256 of its text when it did, in hex. */
export interface Wrote {
  script: string;
  digest: string;
}

/** The record: for each file a run wrote, by its path in the project, what wrote it. */
export type Written = Record<string, Wrote>;

/** The record a file holds; what cannot be read is passed over, and an unread file is empty. */
export function readWritten(text: string | null): Written {
  let held: unknown;
  try {
    held = JSON.parse(text ?? "");
  } catch {
    return {};
  }
  const files = (held as { files?: unknown } | null)?.files;
  if (typeof files !== "object" || files === null || Array.isArray(files)) return {};
  const record: Written = {};
  for (const [path, wrote] of Object.entries(files as Record<string, unknown>)) {
    const one = wrote as Partial<Wrote> | null;
    if (typeof one?.script === "string" && typeof one.digest === "string") {
      record[path] = { script: one.script, digest: one.digest };
    }
  }
  return record;
}

/** The record as the file holds it, its files in the order of their paths. */
export function writeWritten(record: Written): string {
  const files = Object.fromEntries(
    Object.entries(record).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );
  return `${JSON.stringify({ version: 1, files }, null, 2)}\n`;
}

/** The record with these files noted as written by a script whose text has this digest. */
export function noted(
  record: Written,
  files: readonly string[],
  script: string,
  digest: string,
): Written {
  const next = { ...record };
  for (const file of files) next[file] = { script, digest };
  return next;
}

/**
 * The record with a path given another, or taken out where nothing takes its place: a file
 * written, and a script that wrote files, are each followed when renamed or moved, a folder
 * with all under it.
 */
export function repathed(record: Written, from: string, to: string | null): Written {
  const hit = (path: string) => path === from || path.startsWith(`${from}/`);
  const at = (path: string) => (to === null ? null : `${to}${path.slice(from.length)}`);
  const next: Written = {};
  for (const [file, wrote] of Object.entries(record)) {
    const path = hit(file) ? at(file) : file;
    const script = hit(wrote.script) ? at(wrote.script) : wrote.script;
    // A file that is gone, and a file whose script is gone, are no longer in the record.
    if (path !== null && script !== null) next[path] = { script, digest: wrote.digest };
  }
  return next;
}

/** The SHA-256 of a text, in hex. */
export async function digestOf(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** A file of a paper that is stale, with the script that wrote it. */
export interface Stale {
  file: string;
  script: string;
}

/**
 * The files of a paper that are stale: those a script wrote whose text is no longer what it
 * was then. `digests` is each script's digest as it now stands; a script that is not among
 * them (it is gone from the project) marks nothing, since no run of it can write the file again.
 */
export function staleOf(
  record: Written,
  files: readonly string[],
  digests: Readonly<Record<string, string>>,
): Stale[] {
  return [...files].sort().flatMap((file): Stale[] => {
    const wrote = record[file];
    if (wrote === undefined) return [];
    const now = digests[wrote.script];
    return now === undefined || now === wrote.digest ? [] : [{ file, script: wrote.script }];
  });
}

/** What the page says of its stale files, one sentence for each script that wrote them. */
export function staleWords(stale: readonly Stale[]): string[] {
  const scripts = [...new Set(stale.map((one) => one.script))].sort();
  return scripts.map((script) => {
    const files = stale.filter((one) => one.script === script).map((one) => one.file);
    const names =
      files.length <= 1
        ? files.join("")
        : `${files.slice(0, -1).join(", ")} and ${files[files.length - 1]}`;
    return files.length === 1
      ? `${names} is stale: ${script} has changed since it wrote it. Press Run to write it again.`
      : `${names} are stale: ${script} has changed since it wrote them. Press Run to write them again.`;
  });
}
