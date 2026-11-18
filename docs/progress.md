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

## 15 November 2026, release 0.1, step 2 (the jobs on GitHub)

**Done.** Step 2 `[function]`: every push now runs two jobs on GitHub, the forbidden-words check (names, contents, the whole history) and the routine with the browser tests in Chromium and WebKit. The repository variable the first reads was set, as the owner allowed. The owner's instruction of this day: work on through the steps, each with a note that it is finished, his approval given to the recommended course wherever a decision arises.

## 15 November 2026, release 0.1, step 3 (the worker)

**Done.** Step 3 `[engine]`: the released engine Zeff 0.7.0 built here to WebAssembly as Zemp's worker, by the compiler, the profile, the flags and the dependency versions of its release; the messages of the engine's own worker, with a file of the project given back. The example of the prototype is written (`examples/scratch/`).

## 15 November 2026, release 0.1, step 4 (the interface's side of the worker)

**Done.** Step 4 `[engine]`: the interface starts the engine's worker on a cross-origin-isolated page, opens a project, runs Zeff, hears each step, cancels between steps or stops outright, and reads back frames and files. The page is a bench: a box of Zeff, Run, Cancel, and what it printed.

## 15 November 2026, release 0.1, step 5 (projects in the browser)

**Done.** Step 5 `[function]`: projects kept in the browser's private file system, the welcome screen of the design guide (New project, Scratch project, recent projects, the light and dark button, the watermark), a data file added from the computer, and the Scratch project with the example. The colours of both themes, the three font families (shipped, with their licences) and the kept theme were brought forward from step 6. An open project shows an interim page (files, the script in a box, Run, Cancel, output) until the workspace of step 6.

## 15 November 2026, release 0.1, step 6 (the shell of the workspace)

**Done.** Step 6 `[engine]`: the workspace in Panes as the owner's mockup has it. The top bar, the tabbed left panel (Project, Objects), no right panel, the editor tabs, and the Output panel under the script; panels resized by dragging or by the keyboard and folded away; the layout kept with the project; the code size control; a line for windows narrower than 1,200 pixels. A fault was found and mended: WebKit refused a second project its engine.

## 15 November 2026, release 0.1, step 7 (the editor)

**Done.** Step 7 `[function]`: the script's tab is a CodeMirror 6 editor with line numbers, the current line marked, the code coloured in the design guide's categories by a small reader of Zeff's words, saving as it is typed, and Run from the keyboard (⌘↵, ⌘⇧↵).

## 15 November 2026, release 0.1, step 8 (Run and the Output panel)

**Done.** Step 8 `[function]`: each statement's output sits under the line that made it, with its time; a warning is a card with its code and sentence, an error sits under its line with the engine's excerpt and advice; the running statement is marked, with Cancel; output of an edited script is marked "edited · not run".

## 15 November 2026, release 0.1, step 9 (the Inline layout)

**Done.** Step 9 `[function]`: the Inline layout, which a project now opens in. One centred column, each statement's output directly under it inside the editor (never in the script), its time or state in the right margin; Inline | Panes switches with one click and is kept with the project.

## 15 November 2026, release 0.1, step 10 (⌘K and the console line)

**Done.** Step 10 `[function]`: the command palette (⌘K) with the commands that exist, and the console line at the foot of both layouts, which runs a statement after the script without adding it to the script, with its history, its drawer and the status.

## 15 November 2026, release 0.1, step 11 (a plot at the size of its pane)

**Done.** Step 11 `[engine]`: each statement that ends in a plot has its figure under it, drawn by the engine itself at the size of the place it is shown in, and laid out afresh when the place is resized; the Plots tab of Panes shows the plots of the run. The interface asks for a figure by running the script with an `export` added; the script and its output are untouched.

## 15 November 2026, release 0.1, step 12 (the plot viewer)

**Done.** Step 12 `[function]`: the plot viewer. The plot shown is drawn to fit or at a journal's one-column, two-column or slide size; the gallery strip holds every plot of the run as a thumbnail, clicked to show and dragged to reorder; two to four plots are pinned side by side; a plot pops out into its own window, which redraws to fit; a figure is saved as SVG, PDF or PNG by the engine's `export`, with the statement that does the same beside it.

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

## 16 November 2026, release 0.1, the owner's trial: a refused script, and the run keys

**Done.** The owner found that one mistake in a script left the page with no results, and asked for keys to run a line and to run the script. He ruled on both (`docs/decisions.md`, 16 November). When the engine's check refuses a script, the results of the run before now stay on the page, marked "edited · not run", with what the check found under its line (Inline) or above them (Panes); nothing is run. The Run button names its keys when the pointer rests on it; the key for one statement stays with the 0.2 alpha. The run on GitHub of the scroll fix (5db50da) was green. The entries of steps 1 to 12 above were folded to their first paragraph, to keep this file under 200 lines.

**Green.** `npm run routine`, whole: 117 unit tests, the worker's 7 and 8, the eight sample projects identical, 163 browser tests passed and 1 skipped by design.

**Next.** The owner's further trial; then "Release 0.1", or his changes.

**For the owner to decide.** Nothing.

## 17 and 18 November 2026, release 0.1, the proposed margin editor (folded)

**Done.** The owner's plan "Zemp Lite: the Margin IDE" was reviewed and a revised margin editor proposed: one note beside each statement, the whole output unfolded under it at the reader's asking. It was drawn as a clickable mockup on the engine's real output and written out as `zemp_lite_margin_editor_specification.md` (now version 0.4, after a review and the owner's rulings), with a review page, all in `~/dev/handbook/zemp-lite-margin-editor/`, and passed to the register as a proposal. The owner ruled on 18 November: no rows strip in an unfolded output; a script opens folded; Notes · Fold all · Unfold all; a narrower notes column of type and dimensions, at the right of the code; the quiet look; variables shown and hidden in Data; a hideable list of plots in Plots (`docs/decisions.md`, 17 and 18 November). Nothing in the repository's code or specification was changed.

**Next.** The owner's ruling on whether the margin editor replaces the Inline layout (R1): given on 18 November, adopted from the 0.2 alpha.

## 18 November 2026, release 0.1, the diagram plan of Zeff

**Done.** The owner asked what plan is best for SEM path diagrams, causal diagrams and flowcharts. The plan he decided on 11 November (#121, with #118, #119 and #122) was found right; on his word five refinements were written up for a Zeff session to enter in the register: the layout engine built in stages; one graph form under every diagram; layouts tested against known figures; Copy as Zeff for dragged positions in Zemp Lite; statistical guard rails (`docs/decisions.md`, 18 November). Nothing in the repository's code or specification was changed.

**Green.** Nothing to run: documents only.

**Next.** The owner's trial and "Release 0.1"; then the 0.2 alpha, with the margin editor as its editor, once Zeff 0.8.0 is released.

**Then.** On his asking, the diagrams were drawn in a mockup in the quiet look, `zemp-lite-diagrams-mockup.html`, on real numbers (the engine's sample flow, R's tests on `wages`, lavaan's SEM), with two findings for the register (`docs/decisions.md`, 18 November). They were then joined into the margin editor mockup as a second script, `diagrams.zeff`, with each diagram in Plots under its script (document version 0.5). Last, on the owner's ruling (`docs/decisions.md`, 18 November, Paper), the mockup gained a fifth place, Paper: a `.zmd` paper beside its page, every number from the run, with checks as one types, and `.typ` files too (document version 0.6, section 25, screens 38 to 47). Then, on his ruling (`docs/decisions.md`, 18 November, Models withdrawn), the Models place was taken out of the proposal and the mockup: fits are compared by `report()`, and a note in its footer and a coefficient plot of several fits were written up for the register (document version 0.7, section 9; screen 17 shows the plot). Last, the owner adopted the margin editor as the editor of Zemp Lite from the 0.2 alpha, after being advised not to build it into 0.1 (R1, `docs/decisions.md`, 18 November; document version 0.8; written up for the register).

**For the owner to decide.** R12 and R13 of the document, on Paper; the two proposals on comparing fits, once they stand in the register; the five refinements, once they stand in the register; and in the third, whether Graphviz may be used in the tests as a yardstick.

## 18 November 2026, release 0.1 closed

**Done.** On the owner's "Release 0.1": the pre-release routine run again in full (testing handbook, section 2.4, the items that exist here). One test of a plot in a narrowed pane, which had failed twice in WebKit on GitHub by measuring before its last redraw, now waits for it, its checks unchanged (e84da31). The notes completed (`docs/releases/0.1-notes.md`): the owner's trial and its three changes, every failed run on GitHub and its cause, the measures, ten known issues, and what is due at the next release. Step 13 ticked; version 0.1.0; tag `v0.1.0`; a GitHub release, marked a pre-release.

**Green.** `npm run routine`, whole, twice: 117 unit tests, the worker's 7 and 8, the eight sample projects identical, 162 or 163 browser tests passed with 1 or 2 skipped by design; on GitHub, in both browsers.

**Next.** Zemp 0.2 alpha, with the margin editor as its editor, once Zeff 0.8.0 is released ("Start release 0.2").

**For the owner to decide.** At the 0.2 alpha: #27 (paid sync, server compute, self-hosting) and #37 (the trademarks, before the public alpha); R2, R4, R8 and R9 of the margin editor. Later: R12 and R13 (Paper); the two proposals on comparing fits and the five refinements of the diagram plan, once they stand in the register.
