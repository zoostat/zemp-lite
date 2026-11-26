import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { brotliDecompressSync } from "node:zlib";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { packedOf } from "./tools/paper-lib.mjs";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

const manifest = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as {
  version: string;
};

// The page is cross-origin isolated, here as wherever it is hosted (Zemp Specification,
// section 10): only such a page is given the shared memory through which a run is cancelled.
// The headers are those the host sends with every answer, read from its headers file
// (`public/_headers`, the block of `/*`), so that the page is served here as it is there.
const headersFile = readFileSync(new URL("./public/_headers", import.meta.url), "utf8");
const isolation = hostHeaders(headersFile, "/*");
if (isolation["Cross-Origin-Embedder-Policy"] !== "require-corp") {
  throw new Error("public/_headers does not make the page cross-origin isolated");
}
// The built files are named by what they hold, and the host tells a browser to keep them and
// never ask again (the block of `/assets/*`). The preview of the build says the same, so that a
// browser keeps the engine here as it does at the address, and the loading screen's "already
// in this browser" is seen by the tests as a visitor sees it (open decision #220, item 10).
const kept = hostHeaders(headersFile, "/assets/*");

/** The headers of one block of a headers file of the host: `/*`, for every path, or another. */
function hostHeaders(text: string, block: string): Record<string, string> {
  const headers: Record<string, string> = {};
  let inBlock = false;
  for (const line of text.split("\n")) {
    if (line.trim() === "" || line.trimStart().startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      inBlock = line.trim() === block;
      continue;
    }
    const at = line.indexOf(":");
    if (inBlock && at > 0) headers[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  return headers;
}

/** Whether a browser that asks says it takes brotli. */
const takesBrotli = (said: string | string[] | undefined): boolean =>
  /(^|,)\s*br\s*(,|$)/i.test(Array.isArray(said) ? said.join(",") : (said ?? ""));

/**
 * The preview of the build answers as the host does. A built file is sent with the host's
 * headers for built files; the engine, the Paper module and its fonts are sent packed tight
 * to a browser that takes brotli (release 0.2.5, step 4; open decision #224), as the host's
 * function sends them (`tools/host-worker.js`): the packed file the build put beside each,
 * marked as brotli;
 * and an address under `/assets/` that holds no file is answered "not yet", not to be kept, as
 * that function answers it, and never with the app's page (release 0.3, step 4; risk R13).
 */
const asAtTheHost: Plugin = {
  name: "zemp-as-at-the-host",
  configurePreviewServer(server) {
    const out = path.resolve(server.config.root, server.config.build.outDir);
    server.middlewares.use((request, response, next) => {
      const asked = (request.url ?? "").split("?")[0] ?? "";
      if (asked.startsWith("/assets/")) {
        for (const [name, value] of Object.entries(kept)) response.setHeader(name, value);
      }
      const asks = request.method === "GET" || request.method === "HEAD";
      if (asks && asked.startsWith("/assets/") && !existsSync(path.join(out, asked))) {
        for (const [name, value] of Object.entries(isolation)) response.setHeader(name, value);
        response.statusCode = 503;
        response.setHeader("Content-Type", "text/plain; charset=utf-8");
        response.setHeader("Cache-Control", "no-store");
        response.setHeader("Retry-After", "5");
        response.end(
          request.method === "HEAD"
            ? undefined
            : "This file is not at this place of the host yet.\n",
        );
        return;
      }
      const packed = path.join(out, `${asked}.br`);
      const kind = /^\/assets\/[^/]+\.(wasm|otf|ttf)$/.exec(asked)?.[1];
      if (
        asks &&
        kind !== undefined &&
        takesBrotli(request.headers["accept-encoding"]) &&
        existsSync(packed)
      ) {
        const bytes = readFileSync(packed);
        for (const [name, value] of Object.entries(isolation)) response.setHeader(name, value);
        response.setHeader("Content-Type", kind === "wasm" ? "application/wasm" : `font/${kind}`);
        response.setHeader("Content-Encoding", "br");
        response.setHeader("Vary", "Accept-Encoding");
        response.setHeader("Content-Length", bytes.length);
        response.end(request.method === "HEAD" ? undefined : bytes);
        return;
      }
      next();
    });
  },
};

/**
 * What the host sends packed tight, as it is (release 0.2.5, step 4; open decision #224): the
 * engine; and from release 0.3, step 11b, the Paper module and the fonts a paper is set in.
 * Once the build is written: the packed file each WebAssembly's own build made is put beside
 * it under its built name, and each font is packed beside itself; `_routes.json` names the
 * built files (`/assets/*`) as what the host's function answers, and nothing else passes
 * through it (from release 0.3, step 4: until then the engine's address alone); and the
 * function is written as `_worker.js`, with the headers of `public/_headers`, which the host
 * does not add to what a function answers. The build stops where a packed file is not the
 * file of this build.
 */
function enginePacked(): Plugin {
  let out = "";
  return {
    name: "zemp-engine-packed",
    apply: "build",
    configResolved(config) {
      out = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const assets = path.join(out, "assets");
      const built = existsSync(assets) ? readdirSync(assets) : [];
      // Each WebAssembly file of the build with the packed file its own build made beside
      // it: the engine's, and the Paper module's (release 0.3, step 11b), told apart by the
      // names their builds give them.
      const sources: [RegExp, string, string][] = [
        [/^zemp_worker_bg-.*\.wasm$/, "./worker/pkg/web/zemp_worker_bg.wasm.br", "worker"],
        [/^zemp_paper_bg-.*\.wasm$/, "./paper/pkg/web/zemp_paper_bg.wasm.br", "paper"],
      ];
      const wasm = built.filter((name) => name.endsWith(".wasm"));
      for (const [named, beside, what] of sources) {
        const found = wasm.filter((name) => named.test(name));
        if (found.length !== 1) {
          throw new Error(
            `the build has ${found.length} WebAssembly files of the ${what}, not one: nothing can be packed for the host`,
          );
        }
        const file = found[0] as string;
        const source = new URL(beside, import.meta.url);
        if (!existsSync(source)) {
          throw new Error(`the ${what} is not packed: run \`npm run build:${what}\` first`);
        }
        const packed = readFileSync(source);
        if (!brotliDecompressSync(packed).equals(readFileSync(path.join(assets, file)))) {
          throw new Error(
            `the packed ${what} is not the ${what} of this build: run \`npm run build:${what}\` again`,
          );
        }
        writeFileSync(path.join(assets, `${file}.br`), packed);
      }
      if (wasm.length !== sources.length) {
        throw new Error(
          `the build has ${wasm.length} WebAssembly files, not the ${sources.length} it is known to carry`,
        );
      }
      // The fonts a paper is set in, packed as tight, each beside itself.
      const cache = fileURLToPath(new URL("./node_modules/.cache/zemp-lite", import.meta.url));
      for (const font of built.filter((name) => /\.(otf|ttf)$/.test(name))) {
        writeFileSync(
          path.join(assets, `${font}.br`),
          packedOf(path.join(assets, font), cache).packed,
        );
      }
      writeFileSync(
        path.join(out, "_routes.json"),
        `${JSON.stringify({ version: 1, include: ["/assets/*"], exclude: [] }, null, 2)}\n`,
      );
      const source = readFileSync(new URL("./tools/host-worker.js", import.meta.url), "utf8");
      const put = "const HEADERS = __HOST_HEADERS__;";
      if (source.split(put).length !== 2) {
        throw new Error("tools/host-worker.js has no one place for the host's headers");
      }
      writeFileSync(
        path.join(out, "_worker.js"),
        source
          .replace("/* global __HOST_HEADERS__ */\n", "")
          .replace(put, `const HEADERS = ${JSON.stringify({ ...isolation, ...kept }, null, 2)};`),
      );
    },
  };
}

// The engine's WebAssembly, as the worker's build made it: the Start screen of a first visit
// fetches it, checks that it is this file (its SHA-256) and says how far the fetching has gone
// (its size). Before the worker is built there is none, and the Start screen says so.
const engineFile = new URL("./worker/pkg/web/zemp_worker_bg.wasm", import.meta.url);
const engineBytes = existsSync(engineFile) ? readFileSync(engineFile) : null;

/**
 * What the loading screen says of the engine's size, taken from the engine this build carries
 * (release 0.2.4, step 4; `tools/facts.mjs`): its travelling size. The build stops where it
 * cannot be had; the development server and the unit tests, before the worker is built, go on
 * without it.
 */
function engineFacts(building: boolean): unknown {
  const tool = fileURLToPath(new URL("./tools/facts.mjs", import.meta.url));
  const ran = spawnSync(process.execPath, [tool], { encoding: "utf8" });
  if (ran.status === 0) return JSON.parse(ran.stdout) as unknown;
  if (building) {
    throw new Error(ran.stderr.trim() || "the facts of the engine could not be had");
  }
  return null;
}

/**
 * What the Paper module is as it travels (release 0.3, step 11b; `tools/paper-facts.mjs`): its
 * WebAssembly and each font, with the digest the page checks what it fetched against. The
 * build stops where it cannot be had; the development server and the unit tests, before the
 * module is built, go on without it.
 */
function paperFacts(building: boolean): unknown {
  const tool = fileURLToPath(new URL("./tools/paper-facts.mjs", import.meta.url));
  const ran = spawnSync(process.execPath, [tool], { encoding: "utf8" });
  if (ran.status === 0) return JSON.parse(ran.stdout) as unknown;
  if (building) {
    throw new Error(ran.stderr.trim() || "the facts of the Paper module could not be had");
  }
  return null;
}

export default defineConfig(({ command }) => {
  const building = command === "build";
  return {
    plugins: [svelte(), asAtTheHost, enginePacked()],
    server: { headers: isolation },
    preview: { headers: isolation },
    // The engine's worker is a module worker, which waits for the engine to load before it
    // listens.
    worker: { format: "es" },
    // Two pages over one `/assets/` (release 0.2.5, step 2; open decision #225): the app at the
    // root, and at `/app/`, where it stood in 0.2.4 alone, a page that goes on to the root.
    build: {
      target: "es2022",
      rollupOptions: {
        input: {
          app: fileURLToPath(new URL("./index.html", import.meta.url)),
          moved: fileURLToPath(new URL("./app/index.html", import.meta.url)),
        },
      },
    },
    define: {
      __ZEMP_VERSION__: JSON.stringify(manifest.version),
      __ENGINE_SHA256__: JSON.stringify(
        engineBytes === null ? null : createHash("sha256").update(engineBytes).digest("hex"),
      ),
      __ENGINE_BYTES__: JSON.stringify(engineBytes?.length ?? null),
      __ZEMP_FACTS__: JSON.stringify(engineFacts(building)),
      __PAPER_FACTS__: JSON.stringify(paperFacts(building)),
    },
    test: {
      include: ["src/**/*.test.ts"],
    },
  };
});
