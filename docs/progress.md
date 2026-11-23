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

**The cause was another, found at step 5.** The same test failed again with that mend in. A probe that read the storage itself showed the view state had never been written: it was written a fifth of a second after the last change, and each change put it off. It is now written a fifth of a second after the first change not yet written (`Workspace.#keep`), with a test that fails on the old code. The first diagnosis is corrected in `docs/decisions.md`; its mend stays, as a guard that is right in itself.

**Done, step 5 `[function]`.** **Open a project's zip…** on the start screen: the zip proved whole, its one folder taken off, the project named for its manifest with a number where the name is taken, written whole or not at all (`src/project/from-zip.ts`, `Projects.adopt`).

**And its consequence, found at step 6.** With the new timing a change made as the page is left could be lost while one a moment earlier was kept (a test of the notes failed four times in ten). As the page is left the view state is now noted in the browser's own record and taken up at the next opening (`src/app/left.ts`).

**Done, step 6 `[function]`.** The browser is asked to keep the storage when a project is first made; the status bar of a project says where the browser may clear it or it has not been exported for 30 days, with **Export project…** beside it; the start screen says which holds (`src/project/keeping.ts`).

**Checked at the address (steps 3 and 5's last condition).** The Scratch project exported from the hosted alpha in Chromium unpacks on this Mac and the released `zeff run` 0.8.0 runs it: exit 0, what it prints and says the example's expected output to the character. The same zip opened at the address is "Scratch 2", and runs.

**Done, step 7 `[engine]`.** The operations on a project's files and folders (`src/project/files.ts`): made, added, renamed and moved (a copy, checked, then a removal), duplicated, deleted; the rules of a name and what is fixed, in one place.

**Done, step 8a `[function]`.** The Project pane's **+** is a menu: **New script**, **New folder**, **Add files…**, and each folder has the same for itself; the name is typed in the row, a refusal is a sentence under it.

**Done, step 8b `[function]`, with a piece of the worker.** The worker forgets one file or folder, keeping the last run's frames (`worker/src/written.rs`, the message `remove`, `Session.gone`). **Rename…** and **Move to…** in a file's menu and in ⌘K, answered in the row; what is open follows, with its results; a script that names the old path is said, with its line, and not rewritten.

**Done, step 8c `[function]`.** **Duplicate** and **Delete…** in a file's menu and in ⌘K; a deletion asked once in the row, **Keep** in focus; the editor, the results and the engines follow.

**Done, step 8d `[function]`.** A folder's menu has **Rename…**, **Move to…**, **Duplicate** and **Delete…**; what it holds follows it, an open script among it; a deletion says how many files go. Found and mended: a row's menu near the window's foot ran off the screen; it now opens over its button where there is no room below.

**Done, step 9 `[function]`.** A project's row has **Rename…**, **Duplicate…**, **Export project…** and **Delete…**, each answered in the row, and the Scratch project **Duplicate…**, **Export project…** and **Reset…**; the same from ⌘K for the project open. A project's name and its folder now part company: names are refused by name, and folders are the first free.

**Done, step 10 `[function]`.** The start screen says how a project is taken out. ⌘K gained **Project: new script…**, **Project: new folder…** and **Project: add files…**, and lists first the commands that hold the words as typed (so "new project" still finds **New project…**). Every menu, naming row and question is checked from the keyboard, and for size and contrast as painted, in both themes. After each deployment the Scratch project is exported at the address, its zip read, and opened there again.

**Done, step 11 `[function]`, the pre-release routine.** The whole routine is green here and on GitHub in both browsers; the nine sample projects are identical to `zeff run`; at the address, as a first visitor in both engines, a project was made, filled, renamed, moved, exported (and its zip run by the released `zeff run`), deleted, opened again from its zip and run. The look by eye found the export reminder squeezing the console at 1,200 pixels; mended with a test. Two older tests that read the page too soon on GitHub were made to wait. The notes are written (`docs/releases/0.2.2-notes.md`), and the review of the registers is left for the Zeff session in the shared notes.

## 23 November 2026: release 0.2.2 closed

**Done.** On the owner's "Release 0.2.2": the notes finished (`docs/releases/0.2.2-notes.md`); version 0.2.2, the commit "Release 0.2.2", the tag `v0.2.2`, a GitHub pre-release. The reader test and the checks by hand are not done, and the notes say so. The review of the registers is in the shared notes for the Zeff session.

**Green.** The whole routine on GitHub in both browsers, and here in Chromium; here in WebKit all but the five tests that need the mouse, which this Mac's WebKit did not take at the close (they passed here an hour before on the same code). The checks at both addresses; the first-visitor walk at the address in both engines.

**Decided after the release, 23 November 2026** (the owner, through the coordinating session: "Yes, as planned"): Paper for `.typ` files moves into Zemp 0.3, with Typst fetched on first use (#172, option A); its stages are in `docs/decisions.md` under that date. The Zeff session is entering it in the register and the Zemp Specification; the copy in `docs/spec/` is brought up when that commit lands.

**Found and mended after the release, 23 November 2026.** GitHub's check of a commit of documents failed a test of the Project pane; the fault was the app's, in the released 0.2.2: files chosen while an earlier, large choice was still being written went into that choice's folder. Mended on the main branch with a test; the tag stands where it was, and the notes in the repository say so.

**Next.** Nothing is begun. Zemp 0.3 is opened by the owner's "Start release 0.3", after Zeff 0.9.0 is released; its plan holds stage 1 of Paper, and its first step is the spike of the Typst module `[engine]` (the licences, the size, the time to set a page, the PDF's bytes against the desktop Typst). Before that: the copy of the specification brought to the Zeff commit that enters the ruling. **Still the owner's:** the reader test, on this alpha, for Zeff 0.9.0; the checks by hand; the trademarks (#37) before the address is announced.

## 23 November 2026, release 0.2.3: planned, waiting for "go"

**Done.** On the owner's "Start release zemp-lite 0.2.3": `v0.2.2` is tagged and the tree clean; the copy of the specification brought to Zeff 635f19f, where the row of 0.2.3 and #211 stand; the row, #211 with its mockup, section 7's Help row, the Help place's code and what the engine of 0.8.0 gives read; `docs/releases/0.2.3.md` written: twelve steps in seven parts (opening; what the engine gives; moving about; Home and Topics; search; Using Zemp Lite; the whole and the close), with three questions for the owner. No code is written.

**The owner's "Go, as recommended"** took the three answers as recommended (`docs/decisions.md`).

**Done, step 1 `[engine]`.** The release opened: version `0.2.3-dev`; the answers and what the reading found recorded. Nothing of the app changes. Green here: the whole routine in both browsers.

**Found and mended after step 1.** The deployment of step 1's commit was reported failed though the build had arrived: the check after a deployment looked one second after the host said it was done. It now looks again, for a minute at most, where the build has not arrived whole (`tools/check-host.mjs`).

**Done, step 2 `[engine]`.** The worker answers `helpIndex`: the 10 packages of Zeff 0.8.0 in the tiers' order, their 255 functions each with its one line and its R and Stata names (from the page's table and from the catalogue, each saying which), and the 4 datasets (`worker/src/index.rs`); held to the catalogue and to what the released `zeff help <package>` prints. The workspace asks once, when Help is first shown, and keeps it. Nothing on the screen changes yet. The worker is 7 kB larger (2,928.5 kB of 5,000). Green here: the whole routine in both browsers (the browser tests were run a second time whole, five of WebKit's having run out of time in the first while the Zeff repository's tests held the machine).

**Found at step 2, for the Zeff session.** `zeff help text`, `zeff help plot` and `zeff help datasets` print the function of that name, so those three packages' lists are printed by no command; Zemp Lite sets every package's page from the index instead. A way to ask for a package by name would mend it in the engine.

**Step 3 split.** Too large for one session: 3a is the history with Home, Back and Forward; 3b the trail and the pages its steps open (a package's page from the index, the codes by family).

**Done, step 3a `[engine]`.** The Help place has **Back**, **Forward** and **Home** at its head: the pages opened are a history, as a browser's (`src/help/history.ts`); Home is lit while one is there, the arrows greyed at either end and saying where they go; ⌘[ and ⌘] and the mouse's side buttons do the same while Help is shown and are kept from the browser, so Help never leaves the app. Home shows the old sentence until step 4. Green here: the whole routine in both browsers.

**Done, step 3b `[function]`.** A trail in the Help place's bar says where a page stands, each step a link: _Help › Packages › stats › t_test_, _Help › Errors and warnings › Z01xx › Z0101_ (`src/help/trail.ts`). A package has a page of its own, its functions with their one lines from the index, for every package alike and apart from the function of its name; the codes by family are a page, **Errors and warnings** (`src/help/pages.ts`). Green here: the whole routine in both browsers.

**Found and mended after step 3b.** The deployment of step 3b's commit was again reported failed by the check's timing (a file asked for twice, two seconds after the upload); the check now looks again for a minute wherever anything is lacking (`tools/check-host.mjs`).

**Done, step 4 `[function]`.** Home is the **Index of functions**: "Zeff 0.8.0 · 255 functions in 10 packages", each package with its count and its functions as links in columns, the datasets under `datasets`; a function's one line shows while the pointer or the keyboard rests on its name; **Help: index of functions** in ⌘K (`src/help/HomePage.svelte`). Green here: the whole routine in both browsers.

**Done, step 5a `[function]`.** The left pane of Help is **Topics**, with sections that fold, each with its count: **On this page** (the page's sections, as Outline held them), **Packages** (each opening its page) and **Errors and warnings** (the families, each folding to its codes); what is folded is kept with the project, and a reader's choice of the old Outline pane is carried over (`src/help/TopicsPane.svelte`, `src/app/views.ts`). Found and mended: a project reloaded while in Help came back with Help empty. Green here: the whole routine in both browsers.

**Done, step 5b `[function]`.** Beside a page Topics holds **‹ All topics**, what the page stands in with its neighbours (a function's package with its functions, a code's family with its codes), the page open marked and in view, and **On this page** under them; All topics returns the pane to its sections without leaving the page (`src/help/around.ts`). Green here: the whole routine in both browsers.

**Done, step 6 `[engine]`.** What the search of Help finds, as a tested module with no screen yet (`src/help/search.ts`): from the second letter, up to eight matches in #211's order (a name exact, a name begun, a word of a name or a one line, an R or a Stata name, a code begun, a slip of one key from the fourth letter), each saying why it matched; a sentence and the nearest names where nothing is found. Held on the whole index of 0.8.0: every name finds itself first, 25 R and Stata names find their functions, every keystroke is answered within a frame. Green here: the whole routine in both browsers.

**For the owner to know (step 6).** With eight places, one lines that merely contain a word crowded out an R or Stata name typed exactly (`table` did not find `tabulate`). Two places are now kept for such names; the order of the rules is #211's, unchanged. Say if another order is wanted.

**Done, step 7 `[function]`.** The field of Help's bar suggests as one types: from the second letter a list of up to eight matches, each with what it is, its one line and why it matched ("matched R lm()"); ↑ ↓ ↵ Esc, and `/` to reach the field; nothing found is a sentence and the nearest names; with none marked ↵ opens the name as typed, as before (`src/help/SearchField.svelte`). Two refinements of step 6 from the real index: `lm` gives `reg` before `anova`, and `ttest` no longer guesses `test`. Green here: the whole routine in both browsers.

**Next.** Step 8 `[engine]`: the frame of the app's own pages (Using Zemp Lite).

## 23 November 2026: session closed, release 0.2.3 at step 7

**Done this session.** Release 0.2.3 opened on the owner's "Go, as recommended" and steps 1 to 7 finished, each at a green commit: the index of the help from the worker (2); the history with Home, Back and Forward (3a) and the trail with the pages its steps open (3b); Home, the Index of functions (4); the Topics pane (5a) and Topics beside a page (5b); what search finds (6) and the suggestions under the field (7). Step 3 was split in two. The check after a deployment was mended twice for a fault of its own timing.

**Green.** The whole routine here at every step; at the last, 443 browser tests in both browsers and 334 unit tests. On GitHub: the checks and the deployments of every commit up to step 5b (6d175c1). The checks of step 6 (c06eb38) and step 7 (76843f8) were still running at the close: the next session reads their result first.

**For the owner.** (1) Search keeps #211's order of rules, with two of the eight places kept for an R or Stata name typed exactly, so that `table` finds `tabulate`; say if another order is wanted. (2) For the Zeff session: `zeff help text`, `zeff help plot` and `zeff help datasets` print the function of that name, so no command lists those three packages. (3) Still his from before: the reader test, the checks by hand, the trademarks (#37).

**Next.** Step 8 `[engine]`: the frame of the app's own pages, Using Zemp Lite (the thirteen pages as text files read at build, their pictures made from the running app, loaded only when a page is opened).

## 24 November 2026: release 0.2.3, steps 8a onward

**On GitHub at the start:** step 6 (c06eb38) passed its checks and was deployed; the check of step 7 (76843f8) was still running when step 8a was committed.

**Step 8 split.** 8a is the frame of the app's own pages with the first two; 8b their pictures, made by a script. 9a and 9b have the eleven pages that remain.

**Done, step 8a `[engine]`.** The pages of Using Zemp Lite are text files of the repository (`src/using/pages/`), in a small part of Markdown, read into the type of the engine's pages (`src/using/read.ts`): controls, keys, code, lists and links to another page or to the engine's. They are pages of Help as any other: in Topics, in search, with a trail and a list of their own; a page's text is fetched when it is opened. **Getting started** and **Finding help** are written. The first load grew 3.3 kB compressed for the reader and the page. Green here: the whole routine in both browsers.

**Found: the routine needs the display awake on this Mac.** WebKit's test browser takes no mouse while the display is dark, which failed seven tests at night and explains the five at the close of 0.2.2. The routine is run as `caffeinate -d -u npm run routine` (`docs/decisions.md`).

**Done, step 8b `[engine]`.** Each page of Using Zemp Lite has a picture of the screen, made from the running app by a script (`npm run pictures`, `tools/pictures/`): 1,200 by 750, light theme, WebP, about 55 kB each, committed, fetched when its page is opened; the first load of the app does not carry them. A unit test holds the pages and the pictures to each other. Green here: the whole routine in both browsers, the display kept awake.

**Done, step 9a `[function]`.** Six pages more, each with its picture: projects, scripts and files; running a script; the notes beside each statement; sections and the outline; the Data place; the Plots place (eight of the thirteen now). A new test looks for every control a page names in bold on the screens the page speaks of, in both browsers, so a page that falls behind the app fails; it found at once that the main script's menu has no **Move to…**. Getting started corrected: ⌘⇧↵ runs the whole script. Green here: the whole routine in both browsers.

**Done, step 9b `[function]`.** The last five pages, each with its picture: commands with ⌘K; keyboard shortcuts; exporting and opening a project; where the work is kept; reporting a problem. All thirteen are written. A unit test holds the page of shortcuts to the app: each key it lists is one a browser test presses, and every key of the script's editor is on the page. Green here: the whole routine in both browsers.

**The owner changed the layout of Help (24 November 2026, through the coordinating session; #211, item 13, Zeff 8caf4c4):** the right pane becomes **On this page**, **Related functions** goes, Topics keeps the neighbours without the page's sections, the search field stands at the right end of the bar. The same day he took the word Help off the head of the trail (Zeff 58c3c2d), and set a standing rule (#211, item 12): the pages Zemp keeps agree with the engine a release carries, checked at the build. The layout is step 9c, the check of the rule step 9d, and his reading of the pages step 9e, after both.

**Done, step 9c `[function]`.** The copy of the specification brought to Zeff 58c3c2d, and Help laid out as the owner asked (#211, item 13): the right pane is **On this page**; **Related functions** is gone, See also keeping its links; Topics holds a page's neighbours and no sections; the search field is at the right end of the bar; the trail begins under Home, without the word Help, and Home has none. A reader's old choices of the two panes are carried over. Every picture made again. Green here: the whole routine in both browsers.

**Done, step 9d `[engine]`.** The owner's standing rule (#211, item 12) has its check: every piece of code in the thirteen pages is held to the engine or to the running app (`src/using/held.ts`): a name of the engine's is looked for in its index; what a page says the search finds is searched for; a command is read from ⌘K; what a page quotes from the screen is made in the app and read there, in both browsers. A piece held in no way fails the build. Green here: the whole routine in both browsers.

**Done, step 9e `[function]`.** The owner read the thirteen pages: "The pages stand as they are". Nothing is changed.

**Next.** Step 10 `[function]`: the words, the keyboard and the address (every new control a stop of the Tab key with a name and a command of ⌘K where it acts; the check after a deployment opens Home, searches for `lm` and opens `reg`; the notes drafted). Then step 11, the pre-release routine.
