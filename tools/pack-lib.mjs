// The engine packed tight (release 0.2.5, step 4; open decision #224). The host packs a file
// with brotli as it sends it, at a low setting; the build packs the engine's WebAssembly once,
// at brotli's highest setting, and the host sends that file as it is (`tools/host-worker.js`).
// Measured on the engine of 0.2.4: 2.9 MB travels in place of 4.1 MB. Nothing of the engine
// changes: a browser unpacks the same bytes, and the loading screen checks their digest.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

/** Brotli's highest setting, and the widest window a browser unpacks. */
export const PACKED_QUALITY = 11;
export const PACKED_WINDOW = 24;

/** What a packed file is called: the file's own name with `.br` after it. */
export const packedName = (name) => `${name}.br`;

/** The bytes packed at the highest setting. It takes most of half a minute for the engine. */
export function pack(buffer) {
  return zlib.brotliCompressSync(buffer, {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: PACKED_QUALITY,
      [zlib.constants.BROTLI_PARAM_LGWIN]: PACKED_WINDOW,
      [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buffer.length,
    },
  });
}

/** Whether packed bytes unpack to exactly the bytes given. */
export function unpacksTo(packed, buffer) {
  try {
    return zlib.brotliDecompressSync(packed).equals(buffer);
  } catch {
    return false;
  }
}

/**
 * Writes the file packed beside itself, and says where. The packing is kept by what the file
 * holds (`kept`, a folder), so that a file built again to the same bytes is not packed again.
 */
export function packedBeside(file, kept = null) {
  const buffer = fs.readFileSync(file);
  const beside = packedName(file);
  const digest = createHash("sha256").update(buffer).digest("hex");
  const before =
    kept === null
      ? null
      : path.join(kept, `packed-${digest}-q${PACKED_QUALITY}w${PACKED_WINDOW}.br`);
  let packed = null;
  if (before !== null && fs.existsSync(before)) {
    const known = fs.readFileSync(before);
    if (unpacksTo(known, buffer)) packed = known;
  }
  if (packed === null) {
    packed = pack(buffer);
    if (before !== null) {
      fs.mkdirSync(path.dirname(before), { recursive: true });
      fs.writeFileSync(before, packed);
    }
  }
  fs.writeFileSync(beside, packed);
  return { path: beside, bytes: packed.length, of: buffer.length };
}
