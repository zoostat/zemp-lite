// Builds the Paper module for the browser: the Rust of this folder, which is Typst, compiled
// to WebAssembly and bound for JavaScript twice, as the engine's worker is: `pkg/web/` for the
// browser (a module the paper's worker script imports) and `pkg/node/` for the tests under
// Node; and the module packed tight beside the browser's (`.wasm.br`), for the host to send
// as it is. The output is not committed.
//
// Usage: node paper/build.mjs
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { packedBeside } from "../tools/pack-lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
// The binding tool must be the version the module's `wasm-bindgen` is pinned to.
const BINDGEN = "0.2.129";

function run(command, args) {
  const done = spawnSync(command, args, { cwd: here, stdio: "inherit" });
  if (done.error) {
    console.error(`${command} could not be started: ${done.error.message}`);
    process.exit(1);
  }
  if (done.status !== 0) process.exit(done.status ?? 1);
}

const tool = spawnSync("wasm-bindgen", ["--version"], { encoding: "utf8" });
if (tool.status !== 0 || tool.stdout.trim() !== `wasm-bindgen ${BINDGEN}`) {
  console.error(
    `wasm-bindgen ${BINDGEN} is needed and was not found (found: ${tool.stdout?.trim() || "none"}).\n` +
      `Install it with: cargo install wasm-bindgen-cli --version '=${BINDGEN}' --locked`,
  );
  process.exit(1);
}

// The flags of the build are in `.cargo/config.toml`, the profile in `Cargo.toml` (compiled
// for size), and the compiler in `rust-toolchain.toml`.
run("cargo", ["build", "--release", "--locked", "--target", "wasm32-unknown-unknown"]);

const wasm = path.join("target", "wasm32-unknown-unknown", "release", "zemp_paper.wasm");
for (const target of ["web", "nodejs"]) {
  const out = path.join("pkg", target === "web" ? "web" : "node");
  fs.rmSync(path.join(here, out), { recursive: true, force: true });
  run("wasm-bindgen", ["--target", target, "--out-dir", out, wasm]);
}
// The build for Node is a CommonJS module, in a project whose own modules are ES modules.
fs.writeFileSync(path.join(here, "pkg", "node", "package.json"), '{ "type": "commonjs" }\n');
// Packed tight beside itself, kept by what the module holds, so that a module built again to
// the same bytes is not packed again (it takes most of a minute).
const packed = packedBeside(
  path.join(here, "pkg", "web", "zemp_paper_bg.wasm"),
  path.join(here, "..", "node_modules", ".cache", "zemp-lite"),
);
console.log(
  `The Paper module is built: paper/pkg/web and paper/pkg/node. Packed tight it is ${packed.bytes} bytes of ${packed.of}.`,
);
