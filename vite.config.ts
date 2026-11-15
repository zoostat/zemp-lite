import { readFileSync } from "node:fs";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";

const manifest = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as {
  version: string;
};

// The page is cross-origin isolated, here as wherever it is hosted (Zemp Specification,
// section 10): only such a page is given the shared memory through which a run is cancelled.
const isolation = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};

export default defineConfig({
  plugins: [svelte()],
  server: { headers: isolation },
  preview: { headers: isolation },
  // The engine's worker is a module worker, which waits for the engine to load before it
  // listens.
  worker: { format: "es" },
  build: { target: "es2022" },
  define: {
    __ZEMP_VERSION__: JSON.stringify(manifest.version),
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
