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

## 15 November 2026, release 0.1, step 8 (Run and the Output panel)

**Done.** Step 8 `[function]`: each statement's output sits under the line that made it, with its time; a warning is a card with its code and sentence, an error sits under its line with the engine's excerpt and advice; the running statement is marked, with Cancel; output of an edited script is marked "edited · not run".

**Green.** `npm run routine`: 80 unit tests, the worker's 15, the measure, and 74 browser tests in the two browsers (2 skipped by design). Four short scripts and the example are shown as the released `zeff run` 0.7.0 prints them, to the byte. The run on GitHub for step 7 was green.

**Next.** Step 9 `[function]`: the Inline layout (one column, each statement's output directly under it), which then becomes the layout a new project opens in.

**For the owner to decide.** Nothing.

## 15 November 2026, release 0.1, step 9 (the Inline layout)

**Done.** Step 9 `[function]`: the Inline layout, which a project now opens in. One centred column, each statement's output directly under it inside the editor (never in the script), its time or state in the right margin; Inline | Panes switches with one click and is kept with the project.

**Green.** `npm run routine`: 88 unit tests, the worker's 15, the measure, and 94 browser tests in the two browsers (2 skipped by design). The run on GitHub for step 8 was green.

**Next.** Step 10 `[function]`: ⌘K and the console line.

**For the owner to decide.** Nothing.

## 15 November 2026, release 0.1, step 10 (⌘K and the console line)

**Done.** Step 10 `[function]`: the command palette (⌘K) with the commands that exist, and the console line at the foot of both layouts, which runs a statement after the script without adding it to the script, with its history, its drawer and the status.

**Green.** `npm run routine`: 96 unit tests, the worker's 15, the measure, and 108 browser tests in the two browsers (2 skipped by design). The run on GitHub for step 9 was green.

**Next.** Step 11 `[engine]`: a plot from the engine, at the size of its pane.

**For the owner to decide.** Nothing.

## 15 November 2026, release 0.1, step 11 (a plot at the size of its pane)

**Done.** Step 11 `[engine]`: each statement that ends in a plot has its figure under it, drawn by the engine itself at the size of the place it is shown in, and laid out afresh when the place is resized; the Plots tab of Panes shows the plots of the run. The interface asks for a figure by running the script with an `export` added; the script and its output are untouched.

**Green.** `npm run routine`: the worker's 15, the measure, 106 unit tests (one runs the engine and holds the figures to the bytes the released `zeff run` 0.7.0 writes), and 120 browser tests in the two browsers (2 skipped by design). The run on GitHub for step 10 was green. A redraw of the example's two figures takes about 47 ms.

**Next.** Step 12 `[function]`: the plot viewer (gallery strip, compare, pop out, journal sizes, export).

**For the owner to decide.** Nothing.

## 15 November 2026, release 0.1, step 12 (the plot viewer)

**Done.** Step 12 `[function]`: the plot viewer. The plot shown is drawn to fit or at a journal's one-column, two-column or slide size; the gallery strip holds every plot of the run as a thumbnail, clicked to show and dragged to reorder; two to four plots are pinned side by side; a plot pops out into its own window, which redraws to fit; a figure is saved as SVG, PDF or PNG by the engine's `export`, with the statement that does the same beside it.

**Green.** `npm run routine`: the worker's 15, the measure, 114 unit tests, and 144 browser tests in the two browsers (2 skipped by design). A figure saved in each of the three formats is the file the released `zeff run` 0.7.0 writes, byte for byte. The run on GitHub for step 11 was green.

**Next.** Step 13 `[function]`: the pre-release routine (the whole suite in both browsers on GitHub, the example and the sample script read by eye against `zeff run`, the measures recorded, the notes drafted). The release is then the owner's to try and to call: "Release 0.1".

**For the owner to decide.** Nothing until the prototype is tried.

## 15 November 2026, release 0.1, step 13 (the pre-release routine, up to the owner's trial)

**Done.** Steps 2 to 12 were built this day, each at a green commit, under the owner's instruction to work on through them. Step 13 `[function]` is done up to its last line: the whole routine is green; the eight sample projects of Zeff 0.7.0 print through this build what Zeff expects, byte for byte, and that check is in the routine; the measures are recorded; the notes are drafted in `docs/releases/0.1-notes.md`.

**Green.** `npm run routine`: format, lint, type check; the worker's 7 native and 8 message tests; the measure (2,549.7 kB compressed, cold start 53.5 ms); the eight sample projects; 114 unit tests; 152 browser tests in Chromium and WebKit (2 skipped by design).

**Next.** The owner tries the prototype (`npm run build`, then `npm run preview`, in `~/dev/zemp-lite`; the Scratch project, Run). When he says "Release 0.1": the closing routine of the standing instructions (the version set to 0.1.0, the notes made final, the tag and the GitHub release). After it, "Start release 0.2" once Zeff 0.8.0 is released.

**For the owner to decide.** Whether the prototype is what he wants of 0.1, after trying it. For the Zeff sessions (a note is in the shared folder): the hand-over of plots to an interface, which the alpha needs of Zeff 0.8.0 and no step there names yet; and the amendment of section 5's paragraph "The look" with #146.

## 15 November 2026, release 0.1, after the owner's first trial

**Done.** The owner tried the prototype and reported that a run in Inline moved the page to its top: mended in both layouts, with tests. He asked how a dataset is viewed: answered (the Objects tab; `head` and `describe`; the viewer is the alpha's), and asked whether he wants the viewer brought forward.

**Green.** `npm run routine`: 114 unit tests, the worker's 15, the measure, the eight sample projects, and the browser tests in both browsers.

**Next.** The owner's further trial; then "Release 0.1", or his changes.

**For the owner to decide.** Nothing: he ruled the same day that the data viewer stays with the 0.2 alpha.

## 15 November 2026, release 0.1, the owner's trial continued

**Done.** The owner asked what Check does and what `zeff.toml` is (answered), ruled that the data viewer stays with the 0.2 alpha, and chose that `zeff.toml` carry the comments the `zeff` command writes: a new project's file is now the command's, to the character.

**Green.** `npm run routine`, whole.

**Next.** The owner's further trial; then "Release 0.1", or his changes.

**For the owner to decide.** Nothing.

## 16 November 2026, release 0.1, the owner's review of notebook features

**Done.** The owner asked which of 26 notebook features Zemp Lite should adopt; they were sorted into what the prototype already does, what the specification already promises, six new suggestions, five small ones and those not adopted. On his word the eight resulting proposals were left for a Zeff session to enter in the open-decisions register (`docs/decisions.md`, 16 November). No code changed.

**Green.** Nothing to run: documents only.

**Next.** The owner's further trial; then "Release 0.1", or his changes.

**For the owner to decide.** The eight proposals, once they stand in the register with their numbers; none is due at 0.1.

## 16 November 2026, release 0.1, the reader's place made sure in Safari's engine

**Done.** Two of five runs on GitHub had failed in WebKit on the test of 15 November's fix (a run moving the page). The cause was found and mended: the reader's place is now asked of the editor, which knows where every statement and its output stand whether or not they are drawn; the page is held the instant before a run clears anything; a result not drawn is reckoned at the height it last had; and a reader who scrolls is left where they went (`docs/decisions.md`, 16 November). The test now compares what the reader sees, line by line, and a second test was added.

**Green.** `npm run routine`, whole: 114 unit tests, the worker's 7 and 8, the eight sample projects identical, 159 browser tests passed and 1 skipped by design. The three scrolling tests thirty times each in each browser, six at a time, without a failure.

**Next.** The owner's further trial; then "Release 0.1", or his changes.

**For the owner to decide.** Nothing new. Seen once on GitHub and not explained: WebKit not loading the page at the start of one test; it is a known issue in the notes.
