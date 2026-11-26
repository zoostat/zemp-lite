// The Paper module fetched the first time a paper is opened (release 0.3, step 11b): its
// WebAssembly and each font a paper is set in, one after another, with how far the fetching
// has gone told as it goes, and each file checked against the digest the build was made
// with, so that what a browser was sent or had kept is the file of this release and no other.
// The browser keeps each afterwards (the host marks a built file as never changing), so a
// later visit has them at once.

/** A file the module is made of, as the build carries it. */
export interface Carried {
  name: string;
  /** Its address in the build. */
  url: string;
  /** Its size in bytes, against which its fetching is counted; `null` where the build did not say. */
  bytes: number | null;
  /** Its SHA-256 in hex, which what is fetched must have; `null` where the build did not say. */
  sha256: string | null;
}

/** How far the fetching has gone. */
export interface Progress {
  /** The bytes received of all the files, and the bytes they are in all. */
  received: number;
  of: number;
  /** The files that have arrived whole, and how many there are. */
  files: number;
  among: number;
}

/** What `fetchAll` asks a file with: the browser's `fetch`, or a stand-in for it. */
export type Get = (url: string) => Promise<{
  ok: boolean;
  status: number;
  body: ReadableStream<Uint8Array> | null;
}>;

/** A file could not be fetched, or was not the file of this release. */
export class FetchError extends Error {
  override name = "FetchError";
}

/** The share of the fetching done, in whole per cent; 100 only when every byte has come. */
export function share(progress: Progress): number {
  if (progress.of <= 0) return progress.files >= progress.among ? 100 : 0;
  const done = Math.floor((progress.received / progress.of) * 100);
  return progress.received >= progress.of ? 100 : Math.min(done, 99);
}

const hex = (digest: ArrayBuffer) =>
  [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");

/**
 * Fetch the files, in order, telling how far it has gone after each piece received. Each
 * file's bytes, in the order given. Throws a `FetchError` where the host does not send a
 * file, or sends one whose digest is not the build's.
 */
export async function fetchAll(
  files: Carried[],
  get: Get,
  tell: (progress: Progress) => void = () => {},
  digest: (bytes: Uint8Array<ArrayBuffer>) => Promise<ArrayBuffer> = (bytes) =>
    crypto.subtle.digest("SHA-256", bytes),
): Promise<Uint8Array<ArrayBuffer>[]> {
  const of = files.reduce((sum, file) => sum + (file.bytes ?? 0), 0);
  let before = 0;
  const all: Uint8Array<ArrayBuffer>[] = [];
  tell({ received: 0, of, files: 0, among: files.length });
  for (const [index, file] of files.entries()) {
    const answer = await get(file.url);
    if (!answer.ok || answer.body === null) {
      throw new FetchError(`${file.name} could not be fetched: the host answered ${answer.status}`);
    }
    const reader = answer.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      // Never more than the file is said to hold: the bar does not pass its end.
      const counted = file.bytes === null ? 0 : Math.min(received, file.bytes);
      tell({ received: before + counted, of, files: index, among: files.length });
    }
    const whole = new Uint8Array(new ArrayBuffer(received));
    let at = 0;
    for (const chunk of chunks) {
      whole.set(chunk, at);
      at += chunk.length;
    }
    if (file.sha256 !== null && hex(await digest(whole)) !== file.sha256) {
      throw new FetchError(
        `${file.name} is not the file this release was built with: its digest differs`,
      );
    }
    before += file.bytes ?? 0;
    all.push(whole);
    tell({ received: before, of, files: index + 1, among: files.length });
  }
  return all;
}
