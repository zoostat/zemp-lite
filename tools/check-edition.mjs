// The edition check (the testing handbook, section 1, "Edition builds"; the Zemp Specification,
// section 3): Zemp Lite is the shared interface and never depends on Zemp Studio's modules,
// which are kept in a private repository of their own; and the Lite build holds no dialog,
// guide or builder module, the point-and-click that writes Zeff being Studio's (section 6).
//
// The check follows every import the build reaches from `src/main.ts`, and refuses:
//   1. an import of a module of Zemp Studio: a package or a path with `studio` in a part of
//      its name (`@zemp/studio`, `zemp-studio`, `../studio/methods`), or a path that leaves the
//      repository;
//   2. a module reached whose file or folder name makes it a dialog, a guide or a builder
//      (`MethodDialog.svelte`, `guides/regression.ts`, `formula-builder.ts`);
//   3. a dependency of `package.json` with `studio` in its name.
// It says each breach with the chain of imports that reached it, and fails.
//
// Usage: node tools/check-edition.mjs [root]      (the root is this repository by default)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), ".."),
);

/** A name of Zemp Studio's: `studio` as a part of a package's or a path's name. */
const STUDIO = /(^|[^a-z])studio([^a-z]|$)/i;
/** A module that is a dialog, a guide or a builder, by its file's or a folder's name. */
const POINT_AND_CLICK = /(dialog|guide|builder)s?([^a-z]|$)/i;
/** Where the imports of a module are written: `import … from "x"`, `export … from "x"`, `import "x"`, `import("x")`. */
const IMPORTS = /(?:\bfrom\s*|\bimport\s*\(?\s*)["']([^"']+)["']/g;
const SOURCES = [".ts", ".js", ".mjs", ".svelte"];
/** Files a build makes, which the check does not need to read: the worker's WebAssembly build. */
const GENERATED = [path.join("worker", "pkg")];

const breaches = [];
const seen = new Set();

/** The file a relative import names, as the bundler finds it; `null` where there is none. */
function resolved(from, specifier) {
  const bare = specifier.replace(/[?#].*$/, "");
  const base = path.resolve(path.dirname(from), bare);
  for (const candidate of [
    base,
    ...SOURCES.map((ext) => base + ext),
    ...SOURCES.map((ext) => path.join(base, `index${ext}`)),
  ]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function walk(file, chain) {
  if (seen.has(file)) return;
  seen.add(file);
  const within = path.relative(root, file);
  const named = within.split(path.sep);
  if (named.some((part) => POINT_AND_CLICK.test(part.replace(/\.[^.]+$/, "")))) {
    breaches.push(`a dialog, guide or builder module is in the Lite build: ${within}`);
  }
  if (!SOURCES.some((ext) => file.endsWith(ext))) return;
  const text = fs.readFileSync(file, "utf8");
  for (const match of text.matchAll(IMPORTS)) {
    const specifier = match[1];
    const reached = [...chain, `${within} imports "${specifier}"`];
    if (STUDIO.test(specifier)) {
      breaches.push(`a module of Zemp Studio is imported:\n    ${reached.join("\n    ")}`);
      continue;
    }
    if (!specifier.startsWith(".") && !specifier.startsWith("/")) continue;
    const target = resolved(file, specifier);
    const outside = path.relative(root, path.resolve(path.dirname(file), specifier));
    if (outside.startsWith("..") || path.isAbsolute(outside)) {
      breaches.push(`an import leaves the repository:\n    ${reached.join("\n    ")}`);
      continue;
    }
    if (target === null) {
      if (GENERATED.some((made) => outside.startsWith(made))) continue;
      breaches.push(`an import names no file:\n    ${reached.join("\n    ")}`);
      continue;
    }
    walk(target, reached);
  }
}

const entry = path.join(root, "src", "main.ts");
if (!fs.existsSync(entry)) {
  console.error(`the build's entry is not there: ${path.relative(process.cwd(), entry)}`);
  process.exit(1);
}
walk(entry, []);
// The page at `/app/`, which goes on to the root, is a second, small entry of the build
// (release 0.2.5, step 2); what it reaches is held to the same rule.
const moved = path.join(root, "src", "moved", "main.ts");
if (fs.existsSync(moved)) walk(moved, []);

const manifest = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
for (const field of ["dependencies", "devDependencies", "optionalDependencies"]) {
  for (const name of Object.keys(manifest[field] ?? {})) {
    if (STUDIO.test(name)) breaches.push(`a package of Zemp Studio is a dependency: ${name}`);
  }
}

if (breaches.length > 0) {
  console.error(
    `The edition check failed: ${breaches.length} breach(es) of the rule that Lite never depends on Zemp Studio.\n`,
  );
  for (const breach of breaches) console.error(`- ${breach}`);
  process.exit(1);
}
console.log(
  `The edition check holds: ${seen.size} modules reached from src/main.ts and the entry of the page at /app/, none of Zemp Studio's, and no dialog, guide or builder.`,
);
