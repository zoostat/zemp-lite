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

## 15 November 2026, release 0.1, step 2 (the jobs on GitHub)

**Done.** Step 2 `[function]`: every push now runs two jobs on GitHub, the forbidden-words check (names, contents, the whole history) and the routine with the browser tests in Chromium and WebKit. The repository variable the first reads was set, as the owner allowed. The owner's instruction of this day: work on through the steps, each with a note that it is finished, his approval given to the recommended course wherever a decision arises.

**Green.** `npm run routine` here; the first run on GitHub, both jobs.

**Next.** Step 3 `[engine]`: the worker (the engine Zeff 0.7.0 built to WebAssembly here, with a file of the project given back).

**For the owner to decide.** Nothing.

## 15 November 2026, release 0.1, step 3 (the worker)

**Done.** Step 3 `[engine]`: the released engine Zeff 0.7.0 built here to WebAssembly as Zemp's worker, by the compiler, the profile, the flags and the dependency versions of its release; the messages of the engine's own worker, with a file of the project given back. The example of the prototype is written (`examples/scratch/`).

**Green.** `npm run routine`, now with the worker's Rust (format, lint, 7 tests) and its messages under Node (8 tests); the example prints in the worker what `zeff run` 0.7.0 prints, byte for byte. The worker is 2,550 kB compressed, against the limit of 5 MB.

**Next.** Step 4 `[engine]`: the interface's side of the worker (start it on a cross-origin-isolated page, run, hear each step, cancel), with the size and the cold start measured in the routine.

**For the owner to decide.** Nothing.

## 15 November 2026, release 0.1, step 4 (the interface's side of the worker)

**Done.** Step 4 `[engine]`: the interface starts the engine's worker on a cross-origin-isolated page, opens a project, runs Zeff, hears each step, cancels between steps or stops outright, and reads back frames and files. The page is a bench: a box of Zeff, Run, Cancel, and what it printed.

**Green.** `npm run routine`: 14 unit tests, the worker's 7 native and 8 message tests, the measure (2,549.7 kB compressed, cold start 52.8 ms, both inside risk R4) and 8 browser tests (4 in each of Chromium and WebKit). The run on GitHub for step 3 was green.

**Next.** Step 5 `[function]`: projects in the browser (the private file system, the welcome screen, the Scratch project with the example).

**For the owner to decide.** Nothing.

## 15 November 2026, release 0.1, step 5 (projects in the browser)

**Done.** Step 5 `[function]`: projects kept in the browser's private file system, the welcome screen of the design guide (New project, Scratch project, recent projects, the light and dark button, the watermark), a data file added from the computer, and the Scratch project with the example. The colours of both themes, the three font families (shipped, with their licences) and the kept theme were brought forward from step 6. An open project shows an interim page (files, the script in a box, Run, Cancel, output) until the workspace of step 6.

**Green.** `npm run routine`: 49 unit tests, the worker's 15, the measure, and 19 browser tests (10 in Chromium, 9 of 10 in WebKit plus its private-window test). The runs on GitHub for steps 3 and 4 were green.

**Next.** Step 6 `[engine]`: the shell of the workspace in Panes (the top bar, the tabbed left panel, the editor tabs, the Output panel under the script, the view state kept for the project).

**For the owner to decide.** Nothing.

## 15 November 2026, release 0.1, step 6 (the shell of the workspace)

**Done.** Step 6 `[engine]`: the workspace in Panes as the owner's mockup has it. The top bar, the tabbed left panel (Project, Objects), no right panel, the editor tabs, and the Output panel under the script; panels resized by dragging or by the keyboard and folded away; the layout kept with the project; the code size control; a line for windows narrower than 1,200 pixels. A fault was found and mended: WebKit refused a second project its engine.

**Green.** `npm run routine`: 61 unit tests, the worker's 15, the measure, and 42 browser tests in the two browsers (2 skipped by design: the private-window test in Chromium, the mouse-drag test in WebKit on this Mac). The run on GitHub for step 5 was green.

**Next.** Step 7 `[function]`: the editor (CodeMirror 6, code coloured in the seven categories, line numbers, the current line marked).

**For the owner to decide.** Nothing.

## 15 November 2026, release 0.1, step 7 (the editor)

**Done.** Step 7 `[function]`: the script's tab is a CodeMirror 6 editor with line numbers, the current line marked, the code coloured in the design guide's categories by a small reader of Zeff's words, saving as it is typed, and Run from the keyboard (⌘↵, ⌘⇧↵).

**Green.** `npm run routine`: 69 unit tests, the worker's 15, the measure, and 52 browser tests in the two browsers (2 skipped by design). The run on GitHub for step 6 was green.

**Next.** Step 8 `[function]`: Run and the Output panel (each statement's output under the line that made it, warnings as cards, errors under their line, the running mark).

**For the owner to decide.** Nothing.
