import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
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

/** The preview of the build answers a built file with the host's headers for built files. */
const keptAsAtTheHost: Plugin = {
  name: "zemp-kept-as-at-the-host",
  configurePreviewServer(server) {
    server.middlewares.use((request, response, next) => {
      if (request.url?.startsWith("/assets/") === true) {
        for (const [name, value] of Object.entries(kept)) response.setHeader(name, value);
      }
      next();
    });
  },
};

// The engine's WebAssembly, as the worker's build made it: the Start screen of a first visit
// fetches it, checks that it is this file (its SHA-256) and says how far the fetching has gone
// (its size). Before the worker is built there is none, and the Start screen says so.
const engineFile = new URL("./worker/pkg/web/zemp_worker_bg.wasm", import.meta.url);
const engineBytes = existsSync(engineFile) ? readFileSync(engineFile) : null;

/**
 * What the landing page and the loading screen say of the engine, taken from the engine this
 * build carries (release 0.2.4, step 4; `tools/facts.mjs`): its version, its counts, the
 * Scratch project's regressions with what it prints for them, and its travelling size. The
 * build stops where one cannot be had; the development server and the unit tests, before the
 * worker is built, go on without them.
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
 * The landing page links a release to its notes in the repository (open decision #220, item 1:
 * every link goes to an address that exists). So a build of a release, whose version has
 * nothing after its three numbers, stops where the notes of that version are not written; a
 * build between two releases links to the list of releases instead.
 */
function notesWritten(building: boolean): void {
  if (!building || !/^\d+\.\d+\.\d+$/.test(manifest.version)) return;
  const notes = new URL(`./docs/releases/${manifest.version}-notes.md`, import.meta.url);
  if (!existsSync(notes)) {
    throw new Error(
      `the notes of release ${manifest.version} are not written (docs/releases/${manifest.version}-notes.md), and the landing page links to them`,
    );
  }
}

export default defineConfig(({ command }) => {
  const building = command === "build";
  notesWritten(building);
  return {
    plugins: [svelte(), keptAsAtTheHost],
    server: { headers: isolation },
    preview: { headers: isolation },
    // The engine's worker is a module worker, which waits for the engine to load before it
    // listens.
    worker: { format: "es" },
    // Two pages over one `/assets/` (release 0.2.4, step 2; open decision #220, item 2): the
    // front page at the root and the app at `/app/`. One folder of built files for both, so a
    // file keeps its address whichever page asks for it.
    build: {
      target: "es2022",
      rollupOptions: {
        input: {
          front: fileURLToPath(new URL("./index.html", import.meta.url)),
          app: fileURLToPath(new URL("./app/index.html", import.meta.url)),
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
