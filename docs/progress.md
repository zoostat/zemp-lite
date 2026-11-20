# Progress

## 15 November 2026: the repository

**Done.** The repository is created with the specification copied from Zeff (commit 9f2b74b), the record
of the choice of repository in `docs/decisions.md`, the Apache 2.0 licence, and no code.

**Next.** Release 0.1, the prototype (Zemp Specification, section 15): the owner says "Start release 0.1"
in a session opened in this folder. Zeff 0.7.0 is released, which is the engine 0.1 runs on.

**For the owner to decide.** Nothing.

## 15 to 20 November 2026: release 0.1, the prototype (folded)

**Done.** Planned on 15 November (`docs/releases/0.1.md`, 13 steps; the owner's three answers: the fonts under the SIL Open Font Licence, the forbidden-words setting on GitHub, the `wages` example) and built the same day under his instruction to work on through the steps: the specification copied from Zeff 2e90407; the jobs on GitHub; Zemp's own worker, the released Zeff 0.7.0 built to WebAssembly; the interface's side of it; projects in the browser's private file system with the welcome screen and both themes; the workspace in Panes; the CodeMirror editor; Run with the output under each line; the Inline layout; ⌘K and the console line; plots drawn by the engine at the size of their place; the plot viewer; the pre-release routine, with the eight sample projects of 0.7.0 identical byte for byte. The owner's trial (15 and 16 November) brought three changes: a run no longer moves the page (made sure in Safari's engine on 16 November), a script the check refuses keeps the last results, and the Run button names its keys; he ruled the data viewer and the key for one statement to the 0.2 alpha and `zeff.toml` to be written as the `zeff` command writes it. Closed on 18 November: version 0.1.0, the tag `v0.1.0`, the GitHub release marked a pre-release. Alongside, on his questions, proposals were written for the register (notebook features, the margin editor with its mockup and design document, the diagram plan, Paper, Models withdrawn, finding a fault, polynomial terms); on 18 November he adopted the margin editor as the editor of the 0.2 alpha (R1). Each is in `docs/decisions.md` under its date; the register holds them as #174 to #197 since Zeff 08a18a4.

## 21 November 2026: release 0.2 planned

**Done.** "Start release 0.2": v0.1.0 tagged and the tree clean; the row of section 15 and sections 2, 3, 5, 7, 8, 10, 13 and 14 of the Zemp Specification, the testing handbook, risks R4, R10 and R11, the open decisions due at the alpha and the register's entries #174 to #197 (Zeff 08a18a4) were read, with the margin editor's design (version 0.9) and what the released Zeff 0.8.0 gives an interface. The checklist is `docs/releases/0.2.md`: 19 steps, with what the reading found, what 0.2 leaves out, and 17 questions. A note for the Zeff 0.9.0 session on what 0.8.0 gives an interface is in the shared notes folder. No code is written.

**Green.** Nothing to run: documents only.

**Next.** The owner's "go" and his answers. Then step 1 `[engine]`: open the release (the copy of the specification brought to 08a18a4, the decisions recorded, the amendments of the Zemp Specification written for a Zeff session).

**For the owner to decide.** The questions of `docs/releases/0.2.md`, among them #27, #37, #74, #75, #177, R2, R4, R8, R9, R14, R15, #181, R19, the reader test and the example; and, as actions, the Cloudflare account and address, the deployment token, the trademark filing.

## 21 November 2026, release 0.2, step 1 (the release opened)

**Done.** The owner said "Go, as recommended" to the plan and its seventeen questions. Step 1 `[engine]`: the copy of the specification brought to Zeff commit 08a18a4 (the release 0.8.0, then 1614f7c and the register's #174 to #197), byte for byte; the answers and what Zeff 0.8.0 gives the worker recorded in `docs/decisions.md`; the version set to 0.2.0-dev; the answers for the register and the amended text of the Zemp Specification (sections 2, 5, 7, 8, 15, 17) and of the Engine Specification's section 12 written for a Zeff session, as `zemp-lite-0.2-amendments-and-answers-for-zeff.md` in the shared notes folder.

**Next.** Step 2 `[engine]`: the worker on Zeff 0.8.0, best begun in a fresh session on the most capable model.

**For the owner to decide or do.** Nothing to decide. A Zeff session is to enter the answers and the amendments from the note; then this copy is refreshed again.

## 21 November 2026, release 0.2, step 2 (the worker on Zeff 0.8.0)

**Done.** Step 2 `[engine]`: the worker built on the released Zeff 0.8.0 (6bfa6c5) with its own lock file's versions; every expected output re-made by the released 0.8.0 command line, all byte for byte as before; the interface names the engine 0.8.0. The owner's instruction of this day: work on through the steps, each with its note, his approval given to the recommended course.

**Green.** `npm run routine`: the nine sample projects of 0.8.0 identical; 2,785.2 kB compressed, cold start 55.1 ms; 117 unit tests; 163 browser tests passed and 1 skipped by design.

**Next.** Step 3 `[engine]`: what a run tells the interface.

## 21 November 2026, release 0.2, step 3 (what a run tells the interface)

**Done.** Step 3 `[engine]`: the worker tells, for a text, where each statement begins and ends, as the engine's outline reads it (also as the first event of every run), and with each run's outcome, for each statement, what it printed and said at the width asked, the name and the engine's type of what it made, and a frame's rows, variables and memory. Results are placed by the engine's ranges; the interface's own reading of a statement's end is retired.

**Green.** `npm run routine`: 12 native tests and 10 message tests of the worker; the nine samples identical; 2,789.3 kB, cold start 59.5 ms; 117 unit tests; 163 browser tests passed and 1 skipped by design.

**Next.** Step 4 `[engine]`: Check, dependencies and a run of chosen statements.

## 21 November 2026, release 0.2, step 4 (Check, dependencies, chosen statements)

**Done.** Step 4 `[engine]`: **Check** works (top bar and ⌘K), saying what `zeff check` says, to the byte, with its findings under their lines and nothing run; the worker gives the engine's dependency graph (what each statement reads and needs) and runs chosen statements alone, the others blanked so that every line stays where it was.

**Green.** `npm run routine`: 15 native and 12 message tests of the worker; the nine samples identical; 2,794.3 kB, cold start 54.1 ms; 120 unit tests; 171 browser tests passed and 1 skipped by design.

**Next.** Step 5 `[engine]`: the margin.

## 21 November 2026, release 0.2, step 5a (the margin)

**Done.** Step 5 split into 5a and 5b. Step 5a `[engine]`: the margin editor replaces Inline. A note beside each statement in the engine's words (`wages Frame · 18,412 × 11`, `summary Table · by female W0201`); a script opens folded; a note unfolds its output; **Notes · Fold all · Unfold all**; what is unfolded and the notes kept with the project and following the script's edits; the switch reads **Margin | Panes**. The Inline tests are kept, after **Unfold all**.

**Green.** `npm run routine`: 137 unit tests; 181 browser tests passed and 1 skipped by design; the worker's tests, the nine samples identical.

**Next.** Step 5b `[function]`: the quiet look.

## 21 November 2026, release 0.2, step 5b (the quiet look)

**Done.** Step 5b `[function]`: the quiet look's colours; the top bar of words, ⌘K as a search field, **Run** reading **Stop** while the engine runs; the results bar (`run 2 · 9:42 · 9 statements in 32 ms`, and Notes · Fold all · Unfold all); the foot on one line with the state after a coloured dot. Step 5a's run on GitHub had failed on one WebKit test, which read results the editor had not drawn; mended here.

**Green.** `npm run routine`: 137 unit tests; 185 browser tests passed and 1 skipped by design; the worker's tests, the nine samples identical.

**Next.** Step 6 `[function]`: opening a result.

## 21 November 2026, release 0.2, step 6 (opening a result)

**Done.** Step 6 `[function]`: an unfolded output is printed by the engine at the width of its place, and laid out afresh when the place changes; its header gives its lines, its time, **Copy as text** (the print at 118, as `zeff run` writes it), **Open in Plots ↗** and **Fold**; what the engine said comes first, each warning and error with **Explain**, the engine's page in place; ⌥↵ unfolds the statement at the cursor. Steps 4, 5a and 5b are green on GitHub (5a's run had failed on one WebKit test, mended in 5b).

**Green.** `npm run routine`: 16 native and 13 message tests of the worker; the nine samples identical; 2,792.2 kB; 138 unit tests; 193 browser tests passed and 1 skipped by design.

**Next.** Step 7 `[engine]`: running less than the script, and staleness.

## 21 November 2026, release 0.2, step 7a (running less than the script, and what is stale)

**Done.** Step 7 split into 7a and 7b. Step 7a `[engine]`: ⌘↵ runs the statement at the cursor with what it needs; the page keeps every other result where its statement now stands. As the script is edited, an edited statement is marked `edited · not run` and every result below the first change `stale`, the safe rule while the engine cannot say which statements read a file or draw (asked of Zeff 0.9.0 in the shared note); a comment or a new last line marks nothing. Step 6 is green on GitHub.

**Green.** `npm run routine`: 145 unit tests; 197 browser tests passed and 1 skipped by design; the worker's tests, the nine samples identical.

**Next.** Step 7b `[function]`: Run to here and Run from here.

## 21 November 2026, release 0.2, step 7b (Run to here and Run from here)

**Done.** Step 7b `[function]`: **Run to here** in ⌘K and as words on resting over a statement's line number; **Run from here** and **Run the statement at the cursor** in ⌘K; `not run · line n failed` where what a statement needs fails. A start-up race mended (the first reading of a script's statements now waits for the engine's worker). 7a's run on GitHub had failed on a test helper that expected outputs the editor had not drawn in a short window; mended here.

**Green.** `npm run routine`: 145 unit tests; 203 browser tests passed and 1 skipped by design; the worker's tests, the nine samples identical.

**Next.** Step 8 `[function]`: the run's facts and what the run said.

## 21 November 2026, release 0.2, step 8 (the run's facts, what it said, the error's trail)

**Done.** Step 8 `[function]`: the run's facts from the results bar (the engine, the seed, where the time and the memory went); what the run said from the foot (every message with its code, sentence and line, statistical warnings apart); the error's trail under an error raised inside a function, each link a way to its line, with notes on the lines it names.

**Green.** `npm run routine`: 147 unit tests; 209 browser tests passed and 1 skipped by design; the worker's tests, the nine samples identical.

**Next.** Step 9 `[function]`: the loop inspector.

## 21 November 2026, release 0.2, step 9 (the loop inspector)

**Done.** Step 9 `[function]`: a loop's unfolded output carries its passes as the engine reports them, by number with their time, a long list folded to its first three and last three until **Show all**; a failed loop ends on the pass the engine stopped at. What each pass printed and said, and its variable and rows, wait for the engine (C23). Steps 7a and 7b are green on GitHub.

**Green.** `npm run routine`: 148 unit tests; 213 browser tests passed and 1 skipped by design; the worker's tests, the nine samples identical.

**Next.** Step 10 `[engine]`: language services in the browser.

## 21 November 2026, release 0.2, step 10a (the language server in the browser)

**Done.** Step 10 split into 10a and 10b. Step 10a `[engine]`: the engine's own language server in a second worker, its diagnostics underlined as one types and what it knows of a word shown on resting over it, with no wait while a run goes. Step 8 is green on GitHub.

**Green.** `npm run routine`: 148 unit tests; 218 browser tests passed and 2 skipped by design; 2,901.9 kB, cold start 53.9 ms; the worker's tests, the nine samples identical.

**Next.** The copy of the specification refreshed from Zeff c6d55e7, where the owner's answers now stand; then step 10b `[function]`.

## 21 November 2026, release 0.2, step 10b (completion, the usage of a call, formatting)

**Done.** Step 10b `[function]`: completion from the engine's language server as one types, each offer making the server's own edit; the usage of a call shown as it is opened, its parameter at the cursor in bold; **Format the script** in ⌘K; Tab completes in the console line. The copy of the specification was brought to Zeff c6d55e7, where the owner's answers and the amendments of step 1 now stand.

**Green.** `npm run routine`: 148 unit tests; 226 browser tests passed and 2 skipped by design; the worker's tests, the nine samples identical.

**Next.** Step 11 `[function]`: Help.

## 21 November 2026, release 0.2, step 11 (Help)

**Done.** Step 11 `[function]`: the Help panel beside the script, opened by F1, ⌘K or Explain from what the run said; it shows a function's page as `zeff help` prints it, or a code's as `zeff explain` does, and follows the function under the cursor unless switched off; `:help name` in the console line. Steps 9 and 10a are green on GitHub (by the run of fefee70, whose tree holds them).

**Green.** `npm run routine`: 151 unit tests; 234 browser tests passed and 2 skipped by design; the worker's tests, the nine samples identical.

**Next.** Step 12 `[function]`: the places, and Plots with its list.

## 21 November 2026, release 0.2, step 12 (the places, and Plots with its list)

**Done.** Step 12 `[function]`: **Script · Plots** in the top bar, the current one underlined; Plots keeps 0.1's viewer with its strip replaced by a list at the left (each plot's picture, name, line and kind), which hides. 10b's run on GitHub had failed on the completion test, Enter falling between two lists of offers on a slow machine; the test now presses the offer.

**Green.** `npm run routine`: 152 unit tests; 236 browser tests passed and 2 skipped by design; the worker's tests, the nine samples identical.

**Next.** Step 13 `[engine]`: Data, the grid.

## 21 November 2026, release 0.2, step 13 (Data, the grid)

**Done.** Step 13 `[engine]`: the Data place, in the top bar and both layouts: the frames of the run, each by the statement that made it, and the frame chosen as a grid drawn as it is scrolled, its rows fetched a page at a time, every cell written by the engine's own display. Step 11's run on GitHub had failed on two WebKit tests, the completion test (mended in step 12) and a reload half a second after a change; the reloading tests now wait a second and a half.

**Green.** `npm run routine`: 153 unit tests; 242 browser tests passed and 2 skipped by design; the worker's tests, the nine samples identical.

**Next.** Step 14 `[function]`: Data, the variables.

## 21 November 2026, release 0.2, step 14a (Data: the variables, and the inspector)

**Done.** Step 14 split into 14a and 14b. Step 14a `[function]`: the variables of a frame shown and hidden by their box, the keyboard or a header's ×, with Show all, Hide all and Find, kept for each frame; each column's header with its type and missing count; the inspector with the engine's own summary of the variable chosen. Steps 10b to 12 are green on GitHub.

**Green.** `npm run routine`: 153 unit tests; 248 browser tests passed and 2 skipped by design; the worker's tests, the nine samples identical.

**Next.** Step 14b `[function]`: sorting, search, copying, Copy as Zeff.
