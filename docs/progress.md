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

## 22 November 2026: release 0.2.1, three panes on every place (folded)

Planned, built and released in the day, on Zeff 0.8.0 (#203): one layout in place of two, every place (Script, Data, Plots, Help) with a left pane, the place and a right pane, each opened by its own link; the Outline read from the comments, with **Run section**; Run unfolding every output; Data's Variables pane with one variable's properties, every number the engine's print; Help a place of its own, and by the owner's choice during the release its page set in type from the engine's print, held for every page the engine has (steps 10a and 10b). Found and mended on the way: the notes drawn outside the page since 0.2; hover and help lost when a file was being saved; the showcase's plots after one the engine refuses; a variable's statistics asked of the wrong script; rows under a condition when a run starts. The published notes of 0.2 were corrected in three things on the owner's word. Released as `v0.2.1` (7754937) with a GitHub pre-release; by the owner's answers the reader test was not run (owed at Zeff 0.9.0) and the checks by hand were not made, and the notes say so. Carried on: the occasional slow ⌘↵ on GitHub's machine, its cause not found (the first drawing of the figures ruled out). The record is `docs/releases/0.2.1.md`, its notes, and `docs/decisions.md`.

## 22 November 2026: release 0.2.2 decided and entered

On the owner's words, passed on by the coordinating session ("Yes, ask it"; "Yes, into 0.2.2"; "Add file actions, folder actions, project actions"): a release on Zeff 0.8.0 for a project saved to the computer and the actions on files, folders and projects; **Open folder…** with the 0.5 desktop beta. Found on the way: **Open folder…** was in no release's row. Entered by the Zeff session as #208 and as a row of section 15 (Zeff 3159c99); `docs/spec/` here is at that commit.

## 22 November 2026, release 0.2.2: planned, waiting for "go"

**Done.** On the owner's "Start release 0.2.2": `v0.2.1` is tagged and the tree clean; the row, #208, #117's paragraph and sections 3, 5 and 10 of the Zemp Specification read, with the code the release touches; `docs/releases/0.2.2.md` written: fourteen steps in five parts (the zip and a project out of the browser and back; the storage kept and the reminder; files and folders; projects; the whole and the close), with five questions for the owner. No code is written.

**The owner's "Go, as recommended"** took the five answers as recommended (`docs/decisions.md`).

**Done, step 1 `[engine]`.** The release opened: version `0.2.2-dev`; the greyed line of **Open folder…** says where it comes. Green here: the whole routine in both browsers.

**Done, step 2 `[engine]`.** A zip written and read by this repository's own code (`src/project/zip.ts`), the deflate the platform's; held to Python's `zipfile` both ways, and to an archive made for each refusal (15 unit tests). Green here: the whole routine in both browsers.

**Found at step 3, and a step added.** A file a script writes with `export` or `save` never reached the project: it stayed in the engine's memory, in no pane, and was lost with the tab. The plan had it wrong; its finding 5 is corrected, and step 2b added.

**Done, step 2b `[engine]`.** The worker notes what a run writes and the run's outcome names it; after a run the visitor asked for, the interface writes each file into the project, where the Project pane shows it and it is kept (`worker/src/written.rs`, `Workspace.#keepWritten`). Green here: the whole routine in both browsers (30 native tests, 212 unit tests, 328 browser tests); the worker 2,918.9 kB with brotli.

**Done, step 3 `[function]`, but for the check at the address.** **Project: export…** in ⌘K and **Export project…** in the menu of a project's row on the start screen: the project as one zip, read back in tests by this repository's reader and by Python's `zipfile`. The row's menu is made here for the steps after. Green here but for the five WebKit tests that need a real press of the mouse, which this Mac's headless WebKit again did not deliver (the same five as through release 0.2.1; GitHub is the test of record for them).

**Done, step 4 `[function]`.** Every row of the Project pane has a menu: **Save a copy…** for a file, **Save as a zip…** for a folder; the file shown is saved from ⌘K. With step 2b, what a script writes can be taken out of the browser.

**Found on GitHub at step 3, and mended.** Step 2b's test failed once in Chromium on step 3's commit: after a page loaded again while its view state was being written, the project opened with its panes forgotten. A file being rewritten cannot be read for an instant, and the storage's reader took that for a file that is gone (as old as 0.1). A read is now tried again where the folder still lists the file (`OpfsFolder.read`, `opfs.test`). Green here: the whole routine in both browsers (30 native, 225 unit and 336 browser tests).

**Next.** Steps 3 and 4 seen green on GitHub with the mend; the export made at the address and run by the released `zeff run`; then step 5 `[function]`: an exported zip opened as a new project.
