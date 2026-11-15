import js from "@eslint/js";
import svelte from "eslint-plugin-svelte";
import globals from "globals";
import ts from "typescript-eslint";
import svelteConfig from "./svelte.config.js";

export default ts.config(
  {
    ignores: [
      "dist/",
      "node_modules/",
      "**/target/",
      "worker/pkg/",
      "docs/",
      "test-results/",
      "playwright-report/",
    ],
  },
  js.configs.recommended,
  ...ts.configs.strict,
  ...svelte.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
  {
    files: ["*.config.ts", "*.config.js", "tests/**/*.ts"],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    // The worker's scripts run in a Web Worker of the browser and, for the tests, under Node.
    files: ["worker/**/*.mjs", "worker/**/*.js"],
    languageOptions: {
      globals: { ...globals.node, ...globals.worker },
    },
  },
  {
    files: ["**/*.svelte", "**/*.svelte.ts"],
    languageOptions: {
      parserOptions: {
        parser: ts.parser,
        extraFileExtensions: [".svelte"],
        svelteConfig,
      },
    },
  },
);
