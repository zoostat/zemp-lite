# Progress

## 15 November 2026: the repository

**Done.** The repository is created with the specification copied from Zeff (commit 9f2b74b), the record
of the choice of repository in `docs/decisions.md`, the Apache 2.0 licence, and no code.

**Next.** Release 0.1, the prototype (Zemp Specification, section 15): the owner says "Start release 0.1"
in a session opened in this folder. Zeff 0.7.0 is released, which is the engine 0.1 runs on.

**For the owner to decide.** Nothing.

## 15 to 20 November 2026: release 0.1, the prototype (folded)

**Done.** Planned on 15 November (`docs/releases/0.1.md`, 13 steps; the owner's three answers: the fonts under the SIL Open Font Licence, the forbidden-words setting on GitHub, the `wages` example) and built the same day under his instruction to work on through the steps: the specification copied from Zeff 2e90407; the jobs on GitHub; Zemp's own worker, the released Zeff 0.7.0 built to WebAssembly; the interface's side of it; projects in the browser's private file system with the welcome screen and both themes; the workspace in Panes; the CodeMirror editor; Run with the output under each line; the Inline layout; ⌘K and the console line; plots drawn by the engine at the size of their place; the plot viewer; the pre-release routine, with the eight sample projects of 0.7.0 identical byte for byte. The owner's trial (15 and 16 November) brought three changes: a run no longer moves the page (made sure in Safari's engine on 16 November), a script the check refuses keeps the last results, and the Run button names its keys; he ruled the data viewer and the key for one statement to the 0.2 alpha and `zeff.toml` to be written as the `zeff` command writes it. Closed on 18 November: version 0.1.0, the tag `v0.1.0`, the GitHub release marked a pre-release. Alongside, on his questions, proposals were written for the register (notebook features, the margin editor with its mockup and design document, the diagram plan, Paper, Models withdrawn, finding a fault, polynomial terms); on 18 November he adopted the margin editor as the editor of the 0.2 alpha (R1). Each is in `docs/decisions.md` under its date; the register holds them as #174 to #197 since Zeff 08a18a4.

## 21 to 22 November 2026: release 0.2, the alpha (folded)

**Done.** Planned on 21 November (`docs/releases/0.2.md`; the owner's "Go, as recommended" to its seventeen questions) and built in one long session under his instruction to work on through the steps: the worker on Zeff 0.8.0; the margin editor (a note beside each statement, outputs unfolded under their statements, ⌘↵, Run to here and Run from here, the run's facts, the loop inspector); the engine's language server in a second worker; Help; the places Script, Data and Plots, with the data viewer and the list of plots; the console line; Report a problem and the edition check; the host on Cloudflare Pages at `https://lite.zeff-lang.dev`, deployed from every green commit and checked at both addresses; the first visit, the Scratch project's three examples with the showcase of plots; the reader test made ready. Found and mended on the way: a plot bound with `let` was never drawn; each column of the Data grid is as wide as its header (the owner's report). On 21 November the owner decided the layout of three panes for a release 0.2.1 and moved the reader test and the checks by hand there (#203). Released on 22 November on his "Release 0.2": version 0.2.0, tag `v0.2.0`, a GitHub release marked a pre-release; the routine green here and on GitHub (166 unit tests, 288 browser tests, 28 native tests, the nine samples identical). The details of each step are in `docs/decisions.md` and `docs/releases/0.2-notes.md`.

## 22 November 2026, release 0.2.1 planned

**Done.** "Start release 0.2.1": v0.2.0 tagged; the tree made clean (a generated copy of the reader test's sheet, never committed, moved to the shared notes on the owner's word); `docs/spec/` brought to Zeff 1beefc7, where #203 and the 0.2.1 row stand, byte for byte; the row, #203, the sections it amends and the code as it stands read; the checklist written (`docs/releases/0.2.1.md`: 12 steps, five questions). No code written.

**Next.** The owner's "go" and his answers to the five questions; then step 1 `[engine]`, opening the release.

## 22 November 2026, release 0.2.1, step 1

**Done.** The owner's "Go, as recommended": Help a place only, a run of part unfolding what it ran, the statistics of a variable by its type, the example's opening comment. Step 1 `[engine]`: version `0.2.1-dev`, the answers and the plan's engineering choices in `docs/decisions.md`.

**Green.** `npm run routine`: 166 unit tests; 288 browser tests passed and 2 skipped by design; 28 native tests; the nine samples identical.

**Next.** Step 2 `[engine]`: the view state at version 3 and the frame of a place, the Script place on it with Project and Notes.

## 22 November 2026, release 0.2.1, step 2

**Done.** Step 2 `[engine]`: the view state at version 3 (which panes of each place are open, the right pane's width; versions 1 and 2 read); the frame of a place (`Place.svelte`: the bar of links, the left pane, the middle, the right pane, × and the edges); the Script place on it, with **Project** at the left and **Notes** at the right, each a command of ⌘K. **Found and mended:** in 0.2 the notes were drawn 300 pixels too far right, outside the sheet, so no reader saw them (the owner's "there is no notes pane"); a test now holds where each note stands. With the notes in place the code's column is made 920 pixels, for the formatter's 100 characters, and an unfolded table no longer keeps the column from narrowing. Step 1 is green on GitHub and deployed (9ea83f1).

**Green.** `npm run routine`: 169 unit tests; 302 browser tests passed and 2 skipped by design; 28 native tests; the nine samples identical.

**Next.** Step 3 `[function]`: the Outline from the comments `// # Title` and `// ## Title`, with **Run section**.

## 22 November 2026, release 0.2.1, step 3

**Done.** Step 3 `[function]`: the sections of a script read from the comments `// # Title` and `// ## Title` (`src/editor/sections.ts`, until the engine reports them at Zeff 0.9.0); the **Outline** pane under Project, each section with its line, gone to by a click and marked where the cursor is; **Run section** on each entry and in ⌘K, running the section's statements with what they need.

**Green.** `npm run routine`: 176 unit tests; 312 browser tests passed and 2 skipped by design; 28 native tests; the nine samples identical.

**Next.** Step 4 `[engine]`: one layout, the Panes layout removed with its tests rewritten or removed, each named.

## 22 November 2026, release 0.2.1, step 5 (before step 4), and two mends

**Done.** Step 5 `[function]`, done before step 4 so that the tests of Panes can move by losing one press: **Run** unfolds every output, each as its statement ends; a run of part unfolds what was asked for and leaves the rest as it was; ten tests moved, none weakened. **Mended:** the test of the samples finds the window at which the place is 118 characters by measuring (a character is wider in Chromium on GitHub's machines); a file gone while the project is read no longer leaves the window without hover, help and explained pages (seen on GitHub as a failed Explain). Steps 2 and 3 failed on GitHub by the first of these, a fault of the test; the head is checked again with this push.

**Green.** Here: 177 unit tests; 314 browser tests passed and 2 skipped by design; 28 native tests; the nine samples identical. Once, with the machine under load, seven WebKit tests of typing failed together and passed when run again, as at the close of 0.2.

**Next.** Step 4 `[engine]`: one layout, the Panes layout removed (its removal is already written and set aside).

## 22 November 2026, release 0.2.1, step 4

**Done.** Step 4 `[engine]`: one layout. The Panes layout, its Output panel and editor tabs, the left panel with Objects, and the **Margin** and **Panes** links are removed; the view state no longer says a layout. Six tests removed, each named in `docs/decisions.md` (three with the thing they held, three held by another test), two added (the Project pane's tree; "Output: clear"), the rest rewritten to read the outputs Run unfolds. Steps 2, 3 and 5 are green on GitHub and deployed (10339f9).

**Green.** `npm run routine`: 176 unit tests; 306 browser tests passed and 2 skipped by design; 28 native tests; the nine samples identical.

**Next.** Step 6 `[function]`: Plots on the frame, its list as the left pane and **The plot** at the right.

## 22 November 2026, release 0.2.1, step 6

**Done.** Step 6 `[function]`: the Plots place on the frame, with **Plots of the run** at its left and **The plot** at its right (the plot's statement coloured as code, its line as a link to the script, its kind and the size it is saved at), both open at first; the list's own **‹ Hide** and **‹ Script** gone with the links and the places in their stead.

**Green.** `npm run routine`: 176 unit tests; 306 browser tests passed and 2 skipped by design; 28 native tests; the nine samples identical.

**Next.** Step 7a `[function]`: Data on the frame, the frames at the left and the list of variables at the right.

## 22 November 2026, release 0.2.1, step 7a

**Done.** Step 7a `[function]`: the Data place on the frame, **Frames of the run** at its left (open) and **Variables** at its right (closed until asked for or until a variable is chosen); the pane shows the list of variables or, in its place, the one chosen, with **‹ All variables** back; the copying of a change of type, contrast or labels removed with its four cases and its test. Step 4 is green on GitHub (1058371).

**Green.** Format, lint, types, the edition check, the worker's checks and 28 native tests, the nine samples identical, 172 unit tests (four fewer: the cases of the copying removed); the browser tests all green in Chromium. In WebKit on this Mac six tests failed in two runs, the six that need a real click of the mouse (`console.spec` :95, `data.spec` :106 and :304, `help.spec` :46, `language.spec` :67 and :114), with the suite's own probe saying WebKit's mouse was not landing (the fault `tests/browser/support.ts` describes; the drag test skipped itself for it); GitHub's WebKit is the test of record for them.

**Next.** Step 7b `[engine]`: one variable's properties, each number a cell of the engine's print.

## 22 November 2026, release 0.2.1, step 7b

**Done.** Step 7b `[engine]`: one variable's properties in the Variables pane, each number a cell of what the engine prints for a few statements asked after the script (a summary and the quartiles for a number; each value's count and share for a variable of few values; the least and the greatest of a date; the distinct values and the rows without a value for all), on the frame as the view shows it, so a condition's statistics are its own. The 24 statements are kept with the released `zeff run`'s prints and held by a native test, the unit tests and the browser tests. **Mended on the way:** rows asked under a condition while a run starts were answered with the whole frame; they are now asked again.

**Green.** Format, lint, types, the edition check, the worker's checks and 29 native tests, the nine samples identical, 180 unit tests; the browser tests all green in Chromium, and in WebKit all but the same six that need a real click of the mouse, which this Mac's headless WebKit is not delivering today (see step 7a).

**Next.** Step 8 `[function]`: Help, a place, with the page's outline at its left and its related functions at its right.

## 22 November 2026, release 0.2.1, step 8

**Done.** Step 8 `[function]`: Help is the fourth place, with the engine's page in the middle, the page's outline at its left (each section gone to, the one in view marked; a page of two functions of a name named by each) and its related functions at its right (the page's SEE ALSO, each with what it does, a click opening it); F1, **Explain** in what a run said and a field open a page. The Help panel beside the script and its switch that followed the cursor are gone. Steps 4, 6 and 7a are green on GitHub in both browsers and deployed; a deployment's check of the address failed once between two deployments four minutes apart and passed on the next.

**Green.** Format, lint, types, the edition check, the worker's checks and 29 native tests, the nine samples identical, 185 unit tests; the browser tests all green in Chromium, and in WebKit all but the five that need a real click of the mouse on this Mac (see step 7a; all of them pass on GitHub).

**Next.** Step 9 `[function]`: the first visit in the new layout, the reader test's sheet, the draft notes.

## 22 November 2026, release 0.2.1, step 9

**Done.** Step 9 `[function]`: the opening comments of `main.zeff` and of the showcase of plots say what Run now does (their lines and outputs as they were); the Start and welcome screens and "What is counted" read again and left; a narrow window as before; the visit counter's report that WebKit refuses found to be the host's own script, and recorded as it stands; the reader test's README and sheet brought to the hosted 0.2.1 and its layout; the notes drafted (`docs/releases/0.2.1-notes.md`). Step 7b is green on GitHub in both browsers and deployed (33f8950).

**Green.** As at step 8: all but the five WebKit tests that need a real click of the mouse on this Mac, which pass on GitHub.

**Next.** Step 10 `[function]`: the design's acceptance tests gone through again, and the measures at the address.

## 22 November 2026, release 0.2.1, step 10

**Done.** Step 10 `[function]`: each acceptance test of the design gone through against the one layout and set down in the draft notes with the test that holds it, or as not built, or as left for the hand. Three corrections of 0.2's notes, added at their foot: the notes were not seen; the console line's plots are not listed apart (no test held it; not built); ⌘↵ on the last statement takes tens of milliseconds, not 2.2 s. The check after a deployment now times ⌘↵ on the script's true last line and reports the run's own time beside it. A page's load that never ends in WebKit on GitHub's machines is asked for once more (step 8's commit failed there by it, twice in one run; steps 7b and 9 are checked with this push).

**Green.** As at step 8 here. On GitHub: 33f8950 (step 7b) green and deployed; 09698a5 (step 8) failed by the WebKit page load alone.

**Next.** Step 11 `[function]`: the pre-release routine on the hosted 0.2.1, which waits for the owner: the reader test, the checks by hand, his trial, and "Release 0.2.1".

## 22 November 2026, release 0.2.1, step 11 begun: the hosted alpha read, and a fault of the Plots place mended

**Done.** Steps 8, 9 and 10 are green on GitHub in both browsers and deployed (5f6f369; first start 1.1 s in Chromium and 1.4 s in WebKit, ⌘↵ on the last statement 55 and 34 ms). Reading the hosted alpha found the plot shown in the Plots place of the showcase saying "The engine wrote no figure": a plot of twelve panels refused at a thumbnail's size ended the run that drew every figure, and files left from an earlier drawing were read as the new ones. Mended: a figure counts only where its own statement ended in the run, and the figures after a refused one are asked for again. Seen too, and left: a statement that is not a loop (`dataset(...).drop_missing(...).add(...)`) shows a list "Passes · 1 pass" under it, as the engine reports passes for it.

**Green.** As at step 8 here (the five WebKit tests of the mouse on this Mac apart).

**A second fault found by the same reading, and mended:** with the showcase run, the Variables pane gave the statistics of the other example's frame of the same name (`wages`); the statements are now asked after the script that ran last. The first mend is green on GitHub and deployed (4e73085).

**Next.** The mend checked on GitHub and at the address, the examples read by eye again there; then the owner's part of step 11: the reader test, the checks by hand, his trial, "Release 0.2.1".

## 22 November 2026, release 0.2.1: steps 1 to 10 done, step 11 waits for the owner

**Done.** Both mends of the reading are green on GitHub in both browsers and deployed (494ebff), and seen at the address: with the showcase run, the Data place gives its own frame's statistics (18,201 rows, none missing), and the Plots place lists 21 plots, draws 20 thumbnails, says the engine's sentence for the plot of twelve panels and draws the plot shown. At the address from GitHub's machines: first start 1.1 s (Chromium) and 1.5 s (WebKit); ⌘↵ on the last statement 38 and 32 ms; a plot drawn afresh 87 and 133 ms. Four pictures of the hosted alpha are in the shared notes (`zemp-lite-0.2.1-hosted-alpha/`).

**Green.** GitHub: the whole routine in both browsers on 494ebff, and the checks at both addresses. Here: all but the five WebKit tests that need a real click of the mouse, which this Mac's headless WebKit did not deliver through this session and which pass on GitHub.

**Next.** Step 11 `[function]`, the owner's part: the reader test with five to eight readers on the hosted alpha (`docs/releases/0.2-reader-test/`); the checks by hand (the keyboard alone, VoiceOver, a fit's table at the largest code size and in the dark theme); his own trial; then "Release 0.2.1". **Decided by the owner, and done (22 November 2026):** the notes of the GitHub release of 0.2 are corrected as `docs/releases/0.2-notes.md` now is (three corrections at its foot; the released text above them, the title and the tag as they were). Seen and left: a statement that is not a loop can show "Passes · 1 pass" under it.

**After that entry, the same day.** GitHub's routine failed once on 0c74438, a commit of this file alone: in WebKit the sample project "plots" read with its last print missing. Not made to fail here in 44 runs; reasoned to be the test reading before the editor had drawn every line. The helper `wholeScript` now waits until it has, and GitHub keeps the page where a browser test fails (`docs/decisions.md`). Here the whole routine is green in both browsers (318 browser tests, 185 unit tests, 29 native tests).

**And: ⌘↵ sometimes slow on GitHub's machine.** The check after de84a4a gave 2,468 ms from the key to "done" in Chromium (38 and 47 ms at the deployments before and after; 14 to 20 ms from this Mac). Cause not found; the notes of 0.2 (its third correction, published again) and of 0.2.1 say only what is shown, it is a known issue, and the check now reports the time before the run begins. **To find before "Release 0.2.1"** if a deployment shows it again.

## 22 November 2026, release 0.2.1: the formatted Help page, steps 10a and 10b

**Decided by the owner** (in the session of release 0.1, passed on): Help shows the engine's page formatted, the mockup's look C, every word the engine's. Two steps were written into the checklist before step 11.

**Done, step 10a `[engine]`.** The reader of a help page (`src/help/read.ts`): the print read into its parts, held on every page the engine has (596 names, 144 codes): each of a known shape, no word lost, added or moved. Green here: the whole routine in both browsers (318 browser tests, 198 unit tests).

**Done, step 10b `[function]`, to be checked on GitHub and at the address.** The Help place draws the page from what the reader gives (`src/help/HelpPage.svelte`): title, facts, headings, prose with code and links, arguments with their types, codes by kind, the table of R and Stata, usage and examples as code. With both panes open the page no longer runs past the middle (held at 1,200 pixels, at every code size). Green here: the whole routine in both browsers (326 browser tests, 197 unit tests). A note for the register is in the shared notes (`zemp-lite-0.2.1-formatted-help-for-the-register.md`).

**Checked.** GitHub: the whole routine green in both browsers on f312621, deployed, the checks at both addresses green. At the address the page of `reg` was read by eye in the light theme and in the dark at the largest code size (22): inside its place with both panes open, an example's table scrolling in its block. Steps 10a and 10b are ticked.

**⌘↵, narrowed.** The same deployment's check gave 3,245 ms from the key to "done" in Chromium, 3,188 ms of it before the run began: the statement waits its turn, it does not run slowly. The engine does one thing at a time, and what stands before it is, by reasoning not yet shown, the first drawing of the run's figures. The check now times that first drawing (here 330 to 460 ms after "done"); the next deployments on GitHub's machine will show whether it takes seconds there.

**Next.** Step 11 `[function]`, the owner's part, on the page as it will ship: the reader test, the checks by hand (the formatted Help page with VoiceOver among them), his trial; then "Release 0.2.1".

**Decided by the owner (22 November 2026, through the coordinating session): release 0.2.2**, on Zeff 0.8.0, after 0.2.1 is released: **Export project…** as a zip and the opening of one, in every browser; the request for persistent storage and the reminder to export; **New script**, and a file renamed, moved and deleted in the project tree; a project deleted from the start screen. **Open folder…** stays at the 0.5 desktop beta. Found on the way: **Open folder…** was in no release's row (promised for the alpha by 0.1's notes, dropped unrecorded by 0.2's plan). The row and the register's entry are the Zeff session's to enter, from the shared note `zemp-lite-saving-a-project-for-the-register.md`. Nothing of 0.2.2 is started; its checklist is written at "Start release 0.2.2". **Widened by the owner the same day** ("Add file actions, folder actions, project actions"): files (new script, add into any folder, rename, move, duplicate, delete, save a copy), folders (new, rename, move, delete, save as a zip) and projects (rename, duplicate, delete, export, open a zip). The points settled and the three questions kept for him are in `docs/decisions.md`; it is now a release of eight to ten steps.

**Entered in the specification (22 November 2026).** The Zeff session entered release 0.2.2 as register entry #208 and as a row of section 15 of the Zemp Specification (Zeff 3159c99), and the Help page set in type under #74 and #203. `docs/spec/` here is brought to that commit, byte for byte.

## 22 November 2026: release 0.2.1 closed

**Done.** On the owner's "Release 0.2.1": the pre-release routine green here in both browsers; the three examples and the Help page read at the address; the notes finished (`docs/releases/0.2.1-notes.md`); version 0.2.1, the commit "Release 0.2.1", the tag `v0.2.1`, a GitHub pre-release. By the owner's answers at the release the reader test was not run (owed at Zeff 0.9.0) and the checks by hand were not made; the notes say so. The review of the registers is in the shared notes for the Zeff session.

**Green.** The whole routine here and on GitHub in both browsers; the checks at both addresses.

**Next.** "Start release 0.2.2" (#208): its checklist, with three questions for the owner. Its first steps are `[engine]`: the zip, written and read. **Still the owner's:** the reader test, on this alpha, for Zeff 0.9.0; the checks by hand; the trademarks (#37) before the address is announced.
