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
      "paper/pkg/",
      "paper/hypher/",
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
    files: ["*.config.ts", "*.config.js", "tests/**/*.ts", "tools/**/*.mjs"],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    // A test names the element it has just counted.
    files: ["**/*.test.ts", "tests/**/*.ts"],
    rules: { "@typescript-eslint/no-non-null-assertion": "off" },
  },
  {
    // The workers' scripts run in a Web Worker of the browser and, for the tests, under Node.
    files: ["worker/**/*.mjs", "worker/**/*.js", "paper/**/*.mjs", "paper/**/*.js"],
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
