// What the Paper module is as it travels to a reader (release 0.3, step 11b): the module's
// WebAssembly and each font file a paper is set in, with the bytes of each, its SHA-256 (the
// page checks what it fetched against it) and its size packed at brotli's highest setting,
// which is how the host sends it. The build puts these into the app, so that it can say the
// size before it fetches; the routine holds their sum to the limit recorded for the module.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pack, unpacksTo, PACKED_QUALITY, PACKED_WINDOW } from "./pack-lib.mjs";

/** The limit recorded with step 2 of release 0.3: the module and its fonts together, packed. */
export const LIMIT_BYTES = 8_500_000;

export class PaperError extends Error {}

/** The font files a paper is set in: those of `paper/fonts/`, in the order of their names. */
export function fontFiles(root) {
  const folder = path.join(root, "paper", "fonts");
  return fs
    .readdirSync(folder)
    .filter((name) => /\.(otf|ttf)$/.test(name))
    .sort()
    .map((name) => path.join(folder, name));
}

/**
 * A file packed tight, kept by what the file holds (`kept`, a folder), so that a file that
 * has not changed is not packed again.
 */
export function packedOf(file, kept) {
  const buffer = fs.readFileSync(file);
  const digest = createHash("sha256").update(buffer).digest("hex");
  const before = path.join(kept, `packed-${digest}-q${PACKED_QUALITY}w${PACKED_WINDOW}.br`);
  if (fs.existsSync(before)) {
    const known = fs.readFileSync(before);
    if (unpacksTo(known, buffer)) return { buffer, digest, packed: known };
  }
  const packed = pack(buffer);
  fs.mkdirSync(kept, { recursive: true });
  fs.writeFileSync(before, packed);
  return { buffer, digest, packed };
}

/** The module and its fonts as they travel. Throws a `PaperError` where the module is not built. */
export function paperFacts(root) {
  const kept = path.join(root, "node_modules", ".cache", "zemp-lite");
  const wasm = path.join(root, "paper", "pkg", "web", "zemp_paper_bg.wasm");
  if (!fs.existsSync(wasm)) {
    throw new PaperError("the Paper module is not built: run `npm run build:paper` first");
  }
  const one = (file) => {
    const { buffer, digest, packed } = packedOf(file, kept);
    return {
      name: path.basename(file),
      bytes: buffer.length,
      sha256: digest,
      travels: packed.length,
    };
  };
  const module = one(wasm);
  const fonts = fontFiles(root).map(one);
  return {
    module,
    fonts,
    travels: module.travels + fonts.reduce((sum, font) => sum + font.travels, 0),
  };
}
