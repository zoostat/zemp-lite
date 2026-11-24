import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { brotliDecompressSync } from "node:zlib";
import { svelte } from "@sveltejs/vite-plugin-svelte";
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
 * headers for built files; and the engine is sent packed tight to a browser that takes brotli
 * (release 0.2.5, step 4; open decision #224), as the host's function sends it
 * (`tools/host-worker.js`): the packed file the build put beside the engine, marked as brotli.
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
      const packed = path.join(out, `${asked}.br`);
      if (
        asks &&
        /^\/assets\/[^/]+\.wasm$/.test(asked) &&
        takesBrotli(request.headers["accept-encoding"]) &&
        existsSync(packed)
      ) {
        const bytes = readFileSync(packed);
        for (const [name, value] of Object.entries(isolation)) response.setHeader(name, value);
        response.setHeader("Content-Type", "application/wasm");
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
 * The engine packed tight, for the host to send as it is (release 0.2.5, step 4; open decision
 * #224). Once the build is written: the packed engine the worker's build made is put beside
 * the engine under the engine's built name; `_routes.json` names the engine's address as the
 * one the host's function answers, so that no other file passes through it; and the function
 * is written as `_worker.js`, with the headers of `public/_headers`, which the host does not
 * add to what a function answers. The build stops where the packed file is not this engine.
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
      const engines = existsSync(assets)
        ? readdirSync(assets).filter((name) => name.endsWith(".wasm"))
        : [];
      const [engine, ...more] = engines;
      if (engine === undefined || more.length > 0) {
        throw new Error(
          `the build has ${engines.length} WebAssembly files, not the engine's one: nothing can be packed for the host`,
        );
      }
      const beside = new URL("./worker/pkg/web/zemp_worker_bg.wasm.br", import.meta.url);
      if (!existsSync(beside)) {
        throw new Error("the engine is not packed: run `npm run build:worker` first");
      }
      const packed = readFileSync(beside);
      if (!brotliDecompressSync(packed).equals(readFileSync(path.join(assets, engine)))) {
        throw new Error(
          "the packed engine is not the engine of this build: run `npm run build:worker` again",
        );
      }
      writeFileSync(path.join(assets, `${engine}.br`), packed);
      writeFileSync(
        path.join(out, "_routes.json"),
        `${JSON.stringify({ version: 1, include: [`/assets/${engine}`], exclude: [] }, null, 2)}\n`,
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
    },
    test: {
      include: ["src/**/*.test.ts"],
    },
  };
});
