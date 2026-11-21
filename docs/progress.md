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

## 21 November 2026, release 0.2, steps 1 to 12 (folded)

The owner said "Go, as recommended" to the plan and its seventeen questions, and asked for the steps to be worked through, each with its note. Steps 1 to 4 `[engine]`: the specification's copy brought to Zeff (now c6d55e7, where the owner's answers and the amendments stand), the worker on the released Zeff 0.8.0 with every expected output re-made by its command line, the statements' places and each statement's output, name, type and memory in the engine's words, **Check** as `zeff check` says it, the dependency graph and chosen statements run alone. Steps 5a to 9: the margin editor (a note per statement, folded outputs, Notes · Fold all · Unfold all, kept with the project), the quiet look and the top bar, outputs printed at the width of their place with Copy as text and Explain, ⌘↵ and the safe rule of what is stale, Run to here and from here, the run's facts, what it said and the error's trail, a loop's passes. Steps 10a to 12: the engine's own language server in a second worker (diagnostics, hover, completion, the usage of a call, formatting), the Help panel (F1, `:help`), the places Script · Plots with the list of plots. Each step was green in the routine and on GitHub; three runs on GitHub failed on tests (a read of results not yet drawn, a test helper, Enter between two lists of offers), each mended in the next step, its checks unchanged.

## 21 November 2026, release 0.2, step 13 (Data, the grid)

**Done.** Step 13 `[engine]`: the Data place, in the top bar and both layouts: the frames of the run, each by the statement that made it, and the frame chosen as a grid drawn as it is scrolled, its rows fetched a page at a time, every cell written by the engine's own display. Step 11's run on GitHub had failed on two WebKit tests, the completion test (mended in step 12) and a reload half a second after a change; the reloading tests now wait a second and a half.

**Green.** `npm run routine`: 153 unit tests; 242 browser tests passed and 2 skipped by design; the worker's tests, the nine samples identical.

**Next.** Step 14 `[function]`: Data, the variables.

## 21 November 2026, release 0.2, step 14a (Data: the variables, and the inspector)

**Done.** Step 14 split into 14a and 14b. Step 14a `[function]`: the variables of a frame shown and hidden by their box, the keyboard or a header's ×, with Show all, Hide all and Find, kept for each frame; each column's header with its type and missing count; the inspector with the engine's own summary of the variable chosen. Steps 10b to 12 are green on GitHub.

**Green.** `npm run routine`: 153 unit tests; 248 browser tests passed and 2 skipped by design; the worker's tests, the nine samples identical.

**Next.** Step 14b `[function]`: sorting, search, copying, Copy as Zeff.

## 21 November 2026, release 0.2, step 14b (Data: sorting, a condition, search, copying, Copy as Zeff)

**Done.** Step 14b `[function]`: a sort from each header, made by the kernel function `data.sort` calls; **Keep rows where**, a condition run by the engine as `wages.where(…)` with only the statements it needs, its note or error in the engine's words; a search that keeps and marks the cells that hold it; the live count of rows kept; each header's small distribution in the engine's own histogram bins; a range of cells copied as the engine wrote them; **Copy as Zeff** for the view and, in the inspector, for a change of type, contrast or labels, each statement run by the engine in a native test and held to what the view showed. Steps 13 and 14a are green on GitHub.

**Green.** `npm run routine`: 164 unit tests; 262 browser tests passed and 2 skipped by design; 23 native tests of the worker; the nine samples identical; the worker within its limits.

**Next.** Step 15 `[function]`: the console line and Panes.

## 21 November 2026, release 0.2, step 15 (the console line and Panes)

**Done.** Step 15 `[function]`: the console line's `:help`, `:vars` and `:save` as the released `zeff repl` has them, in its words (held to its outputs, kept in `tests/scripts/repl/`), `:clear` the console's own, each command answered in turn; a console statement marked *not in the script*; ⌘↵ copying the console line into the script at the cursor, an edit undo takes back; Panes with F1 and the Help panel beside its language services. The specification's "`:clear` … as in `zeff repl`" is wrong at 0.8.0 (the REPL has no `:clear`); the correction is passed to the Zeff session in the shared notes.

**Green.** `npm run routine`: 164 unit tests; 270 browser tests passed and 2 skipped by design; 24 native tests of the worker; the nine samples identical; the worker within its limits.

**Next.** Step 16 `[function]`: Report a problem, and the edition check.

## 21 November 2026, release 0.2, step 16 (Report a problem, and the edition check)

**Done.** Step 16 `[function]`: **Report a problem**, at an internal error and in ⌘K: the engine's own report of the failure, built in the worker as `zeff report-bug` builds it (byte for byte, but for the platform), shown whole and saved as a file; nothing sent. The edition check (`npm run check:edition`, in the routine and on GitHub): nothing of Zemp Studio's and no dialog, guide or builder in the Lite build, tried on deliberate breaches.

**Green.** `npm run routine`: 164 unit tests; 274 browser tests passed and 2 skipped by design; 26 native tests; the edition check and its four tests; the nine samples identical.

**Next.** Step 17 `[engine]`: the host (Cloudflare Pages at `lite.zeff-lang.dev`), which needs the owner's account, the DNS record and a token in the repository's secrets.

## 21 November 2026, release 0.2, step 17a (the host, made ready)

**Done.** Step 17 split into 17a and 17b. Step 17a `[engine]`: the host's headers file, read by the preview server too; the deployment job, which sends the build a green run tested to Cloudflare Pages with the owner's token, then checks every answer's headers ("not modified" included) and the engine's start in both browsers, measuring the first start; the page on what is counted and never collected, linked from the welcome screen. Without the token nothing is deployed. Steps 14b and 15 are green on GitHub.

**Green.** `npm run routine`: 164 unit tests; 274 browser tests passed and 2 skipped by design; the after-deployment browser check passed on the local build (first start 352 and 422 ms).

**Next.** Step 17b `[engine]` waits for the owner (a Cloudflare account; the token and account ID in the repository's secrets; the address `lite.zeff-lang.dev` and the visit count switched on in the Pages project). Meanwhile step 18 `[function]`: the first visit.

## 21 November 2026, release 0.2, step 18a (the first visit: the Scratch project's examples)

**Done.** Step 18 split into 18a and 18b. Step 18a `[function]`: the Scratch project holds the returns to schooling on `wages` (the margin editor's own script, its sections `// # Sample` and so on) and `instruments.zeff`, the engine's sample of 0.8.0 on `staff`; both print what the released `zeff run` prints, natively and in both browsers. The example of 0.1 became the browser tests' fixture (`tests/scripts/example/`), written in by each test that opens the Scratch project. The progress entries of steps 1 to 12 were folded into one paragraph. Steps 16 and 17a are on GitHub.

**Green.** `npm run routine`: 164 unit tests; 278 browser tests passed and 2 skipped by design; 27 native tests; the nine samples identical.

**Next.** Step 18b `[function]`: the Start screen of a first visit. Step 17b still waits for the owner.

## 21 November 2026, release 0.2, step 18b (the first visit: the Start screen)

**Done.** Step 18b `[function]`: a first visit opens on the Start screen (the engine fetched with its progress, checked against the digest it was built with, started; four promises; **Open Zemp Lite**), the next straight on the welcome screen; **alpha** and what it means, with the place of **Report a problem** and **What is counted**; the narrow-window line on every screen. A test made steady on GitHub's WebKit (a plot measured before its new layout). Steps 16 and 17a are green on GitHub.

**Green.** `npm run routine`: 164 unit tests; 282 browser tests passed and 2 skipped by design; 27 native tests; the after-deployment check on the local build (first start 200 and 336 ms).

**Next.** Step 19 (the close): the pre-release routine, the reader test and the owner's trial, which need the deployed alpha, so step 17b (the owner's account, token, address and visit count) comes first; then "Release 0.2".

## 21 November 2026, release 0.2, step 19a (the close, prepared)

**Done.** Step 19 split into 19a and 19b. Step 19a `[function]`: the reader test made ready (ten scripts that run on 0.8.0, the readers' sheet, the owner's key, how to run it, in `docs/releases/0.2-reader-test/`); the design's acceptance tests gone through in the draft notes (`docs/releases/0.2-notes.md`), which found and mended two faults of the console's styles; the measures that need no host. Steps 18a, 18b and 19a are green on GitHub; step 17b waits for the owner's Cloudflare account and the two secrets.

**Green.** `npm run routine`: 164 unit tests; 282 browser tests passed and 2 skipped by design; 28 native tests.

**Next.** Step 17b waits for the owner: a Cloudflare account, the token and account ID in the repository's secrets, then the address `lite.zeff-lang.dev` and the visit count switched on in the Pages project. Then 19b `[function]`: the routine on the hosted alpha, the reader test the owner runs, his trial, and "Release 0.2".

## 21 November 2026, release 0.2, step 17b (first half: deployed at the project's address)

**Done.** The owner made the token (*Cloudflare Pages · Edit* alone) and put both secrets in; `zeff-lang.dev`, registered by him through Cloudflare on 6 November, is locked, private, auto-renewing, with DNSSEC switched on (pending). The deployment job made the Pages project `zemp-lite` and sent the tested build to `https://zemp-lite.pages.dev`. Its check failed on two faults of the check, mended: it now checks the project's own address on every deployment and the alpha's once it is linked, and asks "not modified" of every answer that carries a tag (Cloudflare gives the page none). At the project's address: every header right, the engine 4.07 MB with brotli, the first start 2.3 s in Chromium and 2.9 s in WebKit from this machine.

**Green.** `npm run routine`: 164 unit tests; 282 browser tests passed and 2 skipped by design; 28 native tests; the after-deployment checks at `zemp-lite.pages.dev` in both browsers.

**Next.** The owner links `lite.zeff-lang.dev` to the project and switches on Web Analytics; then the alpha is checked at its address and step 17b is ticked; then 19b `[function]`.

## 21 November 2026, release 0.2, step 18c (the showcase of plots) and step 17b (the address)

**Done.** The owner linked `lite.zeff-lang.dev` and switched on Web Analytics: the alpha answers there with every header right, the engine starting in both browsers, DNSSEC active and the count's script in the page; the deployment of 2ceb14d checked both addresses. Step 18c `[function]`, the owner's answer of this day: a third Scratch script, `plots.zeff`, 21 plots of the 0.8.0 grammar on `wages`, `firms` and `staff`, from one line to a finished figure for a journal; its figures held byte for byte to the released command line by their digests; shown to the owner from the Plots tab, who said to commit it. A Scratch project made before an example came is now given it once (the owner's browser, which had opened the alpha before, showed two scripts). The console test emptied the script by inserting no text, which did not always take; it now deletes it. Seen once under the full load and not again in 15 runs alone: "Run to here, on a statement's line number" in WebKit; to watch.

**Green.** `npm run routine`: 165 unit tests; 284 browser tests passed and 2 skipped by design; 28 native tests.

**Next.** 19b `[function]`: the routine on the hosted alpha, the reader test he runs, his trial, the notes finished, and "Release 0.2".

## 21 November 2026, release 0.2, step 17b closed

**Done.** The owner opened the alpha at `https://lite.zeff-lang.dev` in his own browsers and ran it ("it opens"), with `plots.zeff` in his Scratch project after the mend of 0cb1005; step 17b ticked. GitHub green on 92f2794, deployed and checked at both addresses.

**Next.** 19b `[function]`: the measures at the address, the samples read in the hosted alpha, the checks by hand (keyboard alone, VoiceOver, the print at every size), the reader test the owner runs, the notes finished; then "Release 0.2".

## 21 November 2026, release 0.2, step 19b begun

**Done.** Timing the alpha at its address found that a plot bound with `let` was never drawn, the two plots of the first example among them; mended (f0857e8): drawn under its statement, its note opening to it, listed in Plots. A check after each deployment now times a statement run alone and a plot drawn afresh as well as the first start (630ee2a). At the address from GitHub's machines: first start 1.4 s (Chromium) and 2.0 s (WebKit), a redraw 160 to 175 ms. The draft notes carry the address, the showcase and these measures. Three tests mended for GitHub's slower machine (92f2794); one WebKit page load that hung there was run again and passed.

**Green.** `npm run routine`: 166 unit tests; 286 browser tests passed and 2 skipped by design; 28 native tests. GitHub green on 630ee2a, deployed and checked.

**Next.** What 19b needs of the owner: the reader test with five to eight readers (`docs/releases/0.2-reader-test/README.md`); his own trial at the address; the checks by hand (the keyboard alone, VoiceOver, a fit's table at the sizes the design names); WebKit's timing of ⌘↵ checked by hand. Then the notes are finished and he says "Release 0.2".

**Mend (21 November 2026).** The owner saw only the first letter of each variable's name in the Data grid; each column is now as wide as its header, with the type, the count of NA and the buttons, as well as its cells. A browser test checks that no header is cut.

## 21 November 2026, release 0.2: the layout of 0.2.1 decided

**Done.** The owner decided one layout of three panes on every place, each pane with its own link (the mockup in the shared notes), for a release 0.2.1 on Zeff 0.8.0, and moved the reader test and the checks by hand there. Recorded in `docs/decisions.md`, step 19b and the draft notes; the register's entry and the Zemp Specification's 0.2.1 row are left for a Zeff session (`zemp-lite-0.2.1-three-panes-for-the-register.md`).

**Next.** The owner's "Release 0.2": the samples read by eye in the hosted alpha, the notes finished, the version, the tag and the GitHub release. Then "Start release 0.2.1".

## 22 November 2026, release 0.2 closed

**Done.** The owner said "Release 0.2". The routine run again in full, green on this Mac in both browsers (166 unit tests; 288 browser tests, 2 skipped by design; 28 native tests; the nine samples identical) and on GitHub; the three examples run at `https://lite.zeff-lang.dev` in Chromium and WebKit as a first visitor and read by eye; the notes completed (one finding: WebKit refuses the visit counter's report, so visits from Safari may go uncounted); step 19b ticked; version 0.2.0, tag `v0.2.0`, a GitHub release marked a pre-release. The review of the registers is left for a Zeff session (`zemp-lite-0.2-release-review-for-zeff.md`), with the entry of 0.2.1's layout.

**Green.** GitHub green on 6c354f6, deployed and checked at both addresses (first start 1.3 s in Chromium, 2.5 s in WebKit); the release at `https://github.com/zoostat/zemp-lite/releases/tag/v0.2.0`. To watch: the browser test of resting on a function's name failed once in Chromium on GitHub (on 2624b75) and passed on the next run.

**Next.** "Start release 0.2.1": the layout of three panes, the reader test and the checks by hand. The owner's: the trademarks before the address is announced (#37).

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
