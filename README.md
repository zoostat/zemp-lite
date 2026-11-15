# Zemp Lite

Zemp Lite is the code-first workspace for the [Zeff](https://github.com/zoostat/zeff) language: a project
panel, an editor with the Zeff language server, the data, results and plot viewers, and the Zeff engine
running in the browser or, later, on the desktop. Every analysis is Zeff code run by the open engine.

Work starts with release 0.1, the prototype. The plan is section 15 of the Zemp Specification in
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

`npm run browsers` fetches the two browsers the tests use into the project's own `node_modules/`, once.
`npm run routine` is the whole routine of a change: format, lint, type check, unit tests and browser
tests. `npm run dev` serves the interface on this computer while it is being written.
