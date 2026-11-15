# Zemp Lite

Zemp Lite is the code-first workspace for the [Zeff](https://github.com/zoostat/zeff) language: a project
panel, an editor with the Zeff language server, the data, results and plot viewers, and the Zeff engine
running in the browser or, later, on the desktop. Every analysis is Zeff code run by the open engine.

Release 0.1, the prototype, is built: the workspace in its two layouts, the editor, Run with each result
under the line that made it, and the plot viewer, in the browser, on the released engine Zeff 0.7.0. Its
checklist and its notes are in `docs/releases/`. The plan is section 15 of the Zemp Specification in
`docs/spec/zemp_specification.md`; the Zeff documents beside it are copies of those in the Zeff repository.

Zemp Lite is licensed under the Apache License, Version 2.0. The full text is in the file LICENSE, and
the copyright notice is in the file NOTICE.

## Working on it

Node 24 is needed (`.nvmrc`). In a fresh clone:

```
npm ci
npm run browsers
npm run routine
```

Rust is needed too, for the engine's worker: the toolchain `worker/rust-toolchain.toml` names, which
`rustup` installs when it is first asked for, and `wasm-bindgen` 0.2.129
(`cargo install wasm-bindgen-cli --version '=0.2.129' --locked`).

`npm run browsers` fetches the two browsers the tests use into the project's own `node_modules/`, once.
`npm run routine` is the whole routine of a change: format, lint, type check, the worker built from the
released engine and tested, the engine's sample projects, unit tests and browser tests.

To try Zemp Lite on this computer: `npm run build:worker`, `npm run build`, then `npm run preview`, and
open the address it prints. `npm run dev` serves the interface while it is being written.
