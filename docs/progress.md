# Progress

## 15 November 2026: the repository

**Done.** The repository is created with the specification copied from Zeff (commit 9f2b74b), the record
of the choice of repository in `docs/decisions.md`, the Apache 2.0 licence, and no code.

**Next.** Release 0.1, the prototype (Zemp Specification, section 15): the owner says "Start release 0.1"
in a session opened in this folder. Zeff 0.7.0 is released, which is the engine 0.1 runs on.

**For the owner to decide.** Nothing.

## 15 November 2026: release 0.1 planned

**Done.** "Start release 0.1": the row of section 15, sections 3, 5, 7 and 10 of the Zemp Specification, the testing handbook, the risk register and the open decisions were read, with the owner's design guide and the browser build of Zeff 0.7.0. The checklist is `docs/releases/0.1.md`: 13 steps, with what the reading found and what 0.1 leaves out. No code is written.

**Green.** Nothing to run yet: the repository holds documents only.

**Next.** The owner's "go" and his answers to the three questions at the top of the checklist. Then step 1 `[engine]`: open the release (the copy of the specification refreshed, the decisions recorded, the project created).

**For the owner to decide.** The three questions of `docs/releases/0.1.md`: the licence of the three fonts, the forbidden-words setting on GitHub, and the example the prototype opens with.

## 15 November 2026, release 0.1, step 1 (the release opened)

**Done.** The owner said "go" and took the three questions as recommended (the fonts under the SIL Open Font Licence, the forbidden-words setting on GitHub, the `wages` example). Step 1 `[engine]`: the copy of the specification brought to Zeff commit 2e90407 (the plan of releases after 1.0, and the ruling on the repositories, #148); the decisions of the planning recorded; the project created, Svelte 5 with TypeScript under Vite, one page that says "Zemp Lite 0.1-dev" and names the engine Zeff 0.7.0, every tool at an exact version with its licence in `docs/decisions.md`.

**Green.** `npm run routine` (format, lint, type check, one unit test file, the browser test in Chromium and WebKit), here and on a fresh clone installed from the lock file. No job runs on GitHub yet: that is step 2.

**Next.** Step 2 `[function]`: the jobs on GitHub (the forbidden-words job, with the repository variable the owner allowed, the routine and the browser tests).

**For the owner to decide.** Nothing.
