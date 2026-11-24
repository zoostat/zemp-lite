import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";

const manifest = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as {
  version: string;
};

// The page is cross-origin isolated, here as wherever it is hosted (Zemp Specification,
// section 10): only such a page is given the shared memory through which a run is cancelled.
// The headers are those the host sends with every answer, read from its headers file
// (`public/_headers`, the block of `/*`), so that the page is served here as it is there.
const isolation = hostHeaders(readFileSync(new URL("./public/_headers", import.meta.url), "utf8"));

/** The headers of the block for every path, `/*`, of a headers file of the host. */
function hostHeaders(text: string): Record<string, string> {
  const headers: Record<string, string> = {};
  let inBlock = false;
  for (const line of text.split("\n")) {
    if (line.trim() === "" || line.trimStart().startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      inBlock = line.trim() === "/*";
      continue;
    }
    const at = line.indexOf(":");
    if (inBlock && at > 0) headers[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  if (headers["Cross-Origin-Embedder-Policy"] !== "require-corp") {
    throw new Error("public/_headers does not make the page cross-origin isolated");
  }
  return headers;
}

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

export default defineConfig(({ command }) => ({
  plugins: [svelte()],
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
    __ZEMP_FACTS__: JSON.stringify(engineFacts(command === "build")),
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
}));
