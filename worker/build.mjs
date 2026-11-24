// Builds the engine's worker for the browser: the Rust of this folder, on the released Zeff
// engine, compiled to WebAssembly and bound for JavaScript twice, as the Zeff repository does
// it: `pkg/web/` for the browser (a module the worker script imports) and `pkg/node/` for the
// tests under Node; and the engine packed tight beside the browser's (`.wasm.br`). The output is
// not committed.
//
// Usage: node worker/build.mjs
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { packedBeside } from "../tools/pack-lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
// The binding tool must be the version the engine's `wasm-bindgen` is pinned to.
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

// The flags of the build (SIMD128, a stack of 8 MB) are in `.cargo/config.toml`, the profile
// in `Cargo.toml`, and the compiler in `rust-toolchain.toml`.
run("cargo", ["build", "--release", "--locked", "--target", "wasm32-unknown-unknown"]);

const wasm = path.join("target", "wasm32-unknown-unknown", "release", "zemp_worker.wasm");
for (const target of ["web", "nodejs"]) {
  const out = path.join("pkg", target === "web" ? "web" : "node");
  fs.rmSync(path.join(here, out), { recursive: true, force: true });
  run("wasm-bindgen", ["--target", target, "--out-dir", out, wasm]);
}
// The build for Node is a CommonJS module, in a project whose own modules are ES modules.
fs.writeFileSync(path.join(here, "pkg", "node", "package.json"), '{ "type": "commonjs" }\n');
// The engine packed tight beside itself, for the host to send as it is (release 0.2.5, step 4;
// open decision #224). Kept by what the engine holds, so an engine built again to the same
// bytes is not packed again.
const packed = packedBeside(
  path.join(here, "pkg", "web", "zemp_worker_bg.wasm"),
  path.join(here, "..", "node_modules", ".cache", "zemp-lite"),
);
console.log(
  `The worker is built: worker/pkg/web and worker/pkg/node. The engine packed tight is ${packed.bytes} bytes of ${packed.of}.`,
);
