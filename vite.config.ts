import { readFileSync } from "node:fs";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";

const manifest = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as {
  version: string;
};

export default defineConfig({
  plugins: [svelte()],
  define: {
    __ZEMP_VERSION__: JSON.stringify(manifest.version),
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
