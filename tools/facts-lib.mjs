// What the loading screen says of the engine's size, taken from the engine the release carries
// when the app is built (release 0.2.4, step 4; open decision #220, item 3): the size of the
// engine as it travels, which from 0.2.5 is the size of the engine packed by the build. It is not written by hand, and where it cannot be had the build stops
// with a sentence saying so. Until 0.2.5 the landing page took more from here (the engine's
// version and counts, and the Scratch project's regressions with their print); they went with
// that page (open decision #225), and Help has its counts from the engine as it runs.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { packedName, unpacksTo } from "./pack-lib.mjs";

/** A fact that could not be had: the build says it and stops. */
export class FactError extends Error {}

/**
 * The setting at which the host compresses a file as it sends it. Cloudflare Pages compresses
 * with brotli as the file goes out, at a low setting: measured at the address on 24 November
 * 2026, the engine of 0.2.3 travelled as 4,080,713 bytes, where brotli's setting 2 gives
 * 4,059,984 for the same file (half of one per cent less). From 0.2.5 the engine's WebAssembly
 * is not left to that: the build packs it at brotli's highest setting and the host sends that
 * file as it is (open decision #224; `tools/pack-lib.mjs`). The worker's script, a small file,
 * is still packed by the host as it goes, and is reckoned at this setting.
 */
export const HOST_QUALITY = 2;

/**
 * The size of the engine as it travels from the host, in bytes: the engine's WebAssembly as
 * the build packed it, which is the file the host sends, and the worker's script compressed as
 * the host sends it (`HOST_QUALITY`). The check after each deployment holds the figure the
 * loading screen gives to the bytes the address really sends (`tests/host/host.spec.ts`). The
 * script's size is kept beside the tools, by what the file holds, and read again while the
 * file is the same.
 */
export function travelling(web, kept = null) {
  if (!fs.existsSync(web)) {
    throw new FactError("the worker is not built: run `npm run build:worker` first");
  }
  const names = fs
    .readdirSync(web)
    .filter((name) => name.endsWith(".wasm") || name.endsWith(".js"))
    .sort();
  if (!names.some((name) => name.endsWith(".wasm"))) {
    throw new FactError("the worker is not built: run `npm run build:worker` first");
  }
  let before = {};
  if (kept !== null && fs.existsSync(kept)) {
    try {
      before = JSON.parse(fs.readFileSync(kept, "utf8"));
    } catch {
      before = {};
    }
  }
  const now = {};
  let bytes = 0;
  for (const name of names) {
    const file = path.join(web, name);
    if (name.endsWith(".wasm")) {
      // The file the host sends: it must be there, and be this engine packed.
      const beside = packedName(file);
      if (!fs.existsSync(beside)) {
        throw new FactError(
          "the engine is not packed (no `.wasm.br` beside it): run `npm run build:worker` first",
        );
      }
      const packed = fs.readFileSync(beside);
      if (!unpacksTo(packed, fs.readFileSync(file))) {
        throw new FactError(
          "the packed engine is not this engine packed: run `npm run build:worker` again",
        );
      }
      bytes += packed.length;
      continue;
    }
    const buffer = fs.readFileSync(file);
    const digest = createHash("sha256").update(buffer).digest("hex");
    const key = `${digest} q${HOST_QUALITY}`;
    const known = before[key];
    const size =
      typeof known === "number"
        ? known
        : zlib.brotliCompressSync(buffer, {
            params: {
              [zlib.constants.BROTLI_PARAM_QUALITY]: HOST_QUALITY,
              [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buffer.length,
            },
          }).length;
    now[key] = size;
    bytes += size;
  }
  if (kept !== null) {
    fs.mkdirSync(path.dirname(kept), { recursive: true });
    fs.writeFileSync(kept, JSON.stringify(now));
  }
  return bytes;
}
