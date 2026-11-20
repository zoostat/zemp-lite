// The edition check tried on deliberate breaches (the testing handbook, section 1, "Edition
// builds"): a small project like this one is made in a temporary folder, once as it should be
// and once with each kind of breach, and the check must pass the first and fail each other.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const checker = path.join(path.dirname(fileURLToPath(import.meta.url)), "check-edition.mjs");

/** A project of `files` (path → text) in a new temporary folder, checked; what the check said. */
function checked(t, files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "edition-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const all = {
    "package.json": JSON.stringify({ dependencies: { svelte: "5.0.0" } }),
    "src/app/App.svelte": '<script lang="ts">\n  import { shown } from "./shown";\n</script>\n',
    "src/app/shown.ts": "export const shown = 1;\n",
    ...files,
  };
  for (const [name, text] of Object.entries(all)) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), text);
  }
  const done = spawnSync(process.execPath, [checker, root], { encoding: "utf8" });
  return { status: done.status, said: done.stdout + done.stderr };
}

const main = (more = "") =>
  `import { mount } from "svelte";\nimport App from "./app/App.svelte";\n${more}`;

test("a build of the shared interface alone passes", (t) => {
  const { status, said } = checked(t, { "src/main.ts": main() });
  assert.equal(status, 0, said);
  assert.match(said, /The edition check holds: 3 modules reached/);
});

test("a dialog, a guide or a builder module in the build fails it", (t) => {
  for (const [file, kind] of [
    ["src/app/MethodDialog.svelte", "dialog"],
    ["src/guides/regression.ts", "guide"],
    ["src/app/formula-builder.ts", "builder"],
  ]) {
    const specifier = `./${file.slice(4).replace(/\.ts$/, "")}`;
    const { status, said } = checked(t, {
      "src/main.ts": main(`import "${specifier}";\n`),
      [file]: "export {};\n",
    });
    assert.equal(status, 1, `${kind}: ${said}`);
    assert.match(
      said,
      new RegExp(`a dialog, guide or builder module is in the Lite build: ${file}`),
    );
  }
});

test("an import of Zemp Studio's, even through another module, fails the build", (t) => {
  const { status, said } = checked(t, {
    "src/main.ts": main(),
    "src/app/shown.ts":
      'export { methods } from "@zemp/studio-methods";\nexport const shown = 1;\n',
  });
  assert.equal(status, 1, said);
  assert.match(said, /a module of Zemp Studio is imported/);
  // The chain of imports that reached it is named.
  assert.match(said, /src\/app\/App\.svelte imports "\.\/shown"/);
  const path_ = checked(t, { "src/main.ts": main('import "../studio/methods";\n') });
  assert.equal(path_.status, 1, path_.said);
});

test("an import from outside the repository, or a package of Studio's, fails the build", (t) => {
  const outside = checked(t, { "src/main.ts": main('import "../../private/methods";\n') });
  assert.equal(outside.status, 1, outside.said);
  assert.match(outside.said, /an import leaves the repository/);
  const listed = checked(t, {
    "src/main.ts": main(),
    "package.json": JSON.stringify({ dependencies: { "zemp-studio": "1.0.0" } }),
  });
  assert.equal(listed.status, 1, listed.said);
  assert.match(listed.said, /a package of Zemp Studio is a dependency: zemp-studio/);
});
