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
