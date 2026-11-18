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

## 17 November 2026, release 0.1, the owner's plan for a margin editor reviewed

**Done.** The owner gave a plan, "Zemp Lite: the Margin IDE" (a proposal of 17 November, kept outside the repository), which would replace the Inline layout by a column of one-line notes beside the code, with six places, seven viewers and writing. It was read whole and set against the specification, the function catalogue, the design guide and the prototype. The assessment given to him: take the plan's central idea (running never moves the code; a note beside every statement; out-of-date results marked in place) into the one editor, with the full result opened under its statement at the reader's asking, and leave the rest of the plan to the decisions already taken on reports (#73, #124, #141) and on the look (#146). A mockup of that revised editor, on the shipped example with the engine's own numbers, is in `~/dev/handbook/zemp-lite-margin-editor/`. Nothing in the repository's code or specification was changed.

**Green.** Nothing to run: documents only.

**Next.** The owner's ruling on the editor, which is a design question for the open-decisions register and for the plan of the 0.2 alpha, not for 0.1; then "Release 0.1", or his changes.

**For the owner to decide.** Whether the margin editor, as revised or otherwise, replaces the Inline layout. On his word of the same day the proposal was left for a Zeff session to enter in the open-decisions register (`docs/decisions.md`, 17 November).

## 17 November 2026, release 0.1, the margin editor's second mockup

**Done.** The owner gave his own clickable mockup of the Margin IDE (fifteen screens) and asked that the revised mockup be refined from it, to the specification, and taken further. It was studied screen by screen. The second mockup takes from it the notes for each step of a chain, the comparison with an earlier run, the rows followed to the estimation sample, the models side by side and the variables as cards; fits them to the specification (the thread for the one name clicked, differences stated and no cause written, the engine's own print and figures); and adds an outline of sections, "the same rows?", the run record, the list of what the run said, a warning explained in place and help on a function's name. Every number, table and figure in it is the released engine's for a script on the shipped `wages` data. It is in `~/dev/handbook/zemp-lite-margin-editor/`, with its screenshots and sources; the note for the register carries an addendum. On the owner's asking, the review itself (for and against, the ratings, what the mockup takes, fits and adds, fifteen of its screens, what it asks of the engine, the statistical cautions) was also written as one page, `zemp-lite-margin-editor-review.html`, in the same folder. The details of the proposed IDE were then written out in full as `zemp_lite_margin_editor_specification.md` there (a proposal: 22 sections, each feature marked built, planned or proposed, with eight decisions for the owner), and the mockup's journal sizes were corrected to those the prototype uses (89 × 66, 183 × 110 and 254 × 143 mm). Nothing in the repository's code or specification was changed.

**Green.** Nothing to run: documents only.

**Next.** The owner's ruling on the editor, for the plan of the 0.2 alpha; then "Release 0.1", or his changes.

**For the owner to decide.** As on the same day: whether the margin editor, in this form or another, replaces the Inline layout.

## 18 November 2026, release 0.1, the proposed editor's document revised after a review

**Done.** The owner gave a review of the document of the proposed margin editor. Its points were checked against the specification, and the document is now version 0.2, in `~/dev/handbook/zemp-lite-margin-editor/` with version 0.1 kept beside it. Taken: the print defined at a width the engine lays out; staleness defined as "the engine would not reuse it", with its cases; six rules for a run of less than the script; Models made to say first whether fits can be compared; Data split into what is always shown and what is fetched when asked; the switch keeping its position; a grammar for section comments; a section on the edges (a refusal, a run going, large scripts, versions, undo, language, privacy) and one on testing; acceptance tests that can fail; and the engine's part written as a contract of sixteen items. Answered differently or declined, with reasons, in its Appendix C. Two decisions were added for the owner (R9, R10). The mockup's switch was changed to match. Nothing in the repository's code or specification was changed.

**Green.** Nothing to run: documents only.

**Next.** The owner's ruling on the editor, for the plan of the 0.2 alpha; then "Release 0.1", or his changes.

**For the owner to decide.** The ten decisions of the document's section 20.2, of which R1 is the editor itself.

## 18 November 2026, release 0.1, a quieter look for the proposed editor

**Done.** The owner asked for a fresh, modern, minimal design. A second variant of the mockup was drawn, `zemp-lite-margin-editor-mockup-minimal.html` in `~/dev/handbook/zemp-lite-margin-editor/`, with its screenshots: the same editor and the same engine output, on one surface with hairlines in place of boxes, words in place of bordered controls, tags as words with a dot, one line at the foot for the state, the console and the keys. What the owner has ruled is kept: the logo, the violet, the three fonts, light and dark, no text under 12.5 pixels, the code size control and the Dark switch in the top bar. Nothing in the repository's code or specification was changed.

**Green.** Nothing to run: documents only.

**Next.** The owner's ruling on the editor and on which look; then "Release 0.1", or his changes.

**For the owner to decide.** Which of the two looks the margin editor takes, if it is adopted; the quiet one would need the design guide's section on Zemp Lite brought into line.

## 18 November 2026, release 0.1, the owner's four rulings on the proposed editor

**Done.** The owner ruled on the mockup: no strip of rows in an unfolded output; a script opens with every output folded; *Notes · Fold all · Unfold all* in place of the earlier switch; a narrower notes column holding type and dimensions only (`docs/decisions.md`, 18 November). Both looks of the mockup, their screenshots, the document (now version 0.3) and the review page were brought into line, in `~/dev/handbook/zemp-lite-margin-editor/`. Nothing in the repository's code or specification was changed.

**Green.** Nothing to run: documents only.

**Next.** The owner's ruling on the editor itself and on its look; then "Release 0.1", or his changes.

**For the owner to decide.** Two readings to confirm: "Notes" as showing or hiding the margin, and the notes column staying at the right of the code.

