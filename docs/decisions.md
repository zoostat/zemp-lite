# Decisions

Each entry: the date, the choice and the reason.

## 15 November 2026: the repository

**Choice.** Zemp Lite is developed in its own public repository, `zoostat/zemp-lite`, in the folder
`~/dev/zemp-lite`. Zemp Studio, when its work starts, is developed in a separate private repository and
builds on this one; nothing in this repository depends on Studio's modules.

**The specification.** `docs/spec/` is a copy of the Zeff repository's `docs/spec/` at commit 9f2b74b
(release 0.8.0 in progress there). The copy is brought up to date at the start of each Zemp release; the
Zeff repository's copy is the one that is amended.

**Licence.** The Apache License, Version 2.0, as Zeff's (the owner's choice of 15 November 2026), with
the same copyright notice in `NOTICE`. Zemp Studio's own modules are not covered: they live in Studio's
private repository.

**Reason.** The owner's ruling of 15 November 2026: Zemp Lite public, Zemp Studio private in a repository
of its own. It replaces the private repository of open decision #125.

## 15 November 2026: release 0.1 opened, and the owner's answers (release 0.1, step 1)

**The owner's word.** "Go, as recommended", to the checklist of `docs/releases/0.1.md` (13 steps) and its three questions. (1) The fonts: Atkinson Hyperlegible Next, JetBrains Mono and Newsreader are allowed under the SIL Open Font Licence 1.1, as IBM Plex was for Zeff 0.7.0; they are fetched once from their publishers' own releases and shipped inside the app with their licence files, at step 6, so that no outside server is asked for a font. (2) The forbidden-words check: the repository variable the Zeff repository's job reads is set on `zoostat/zemp-lite` too, at step 2, and nothing else of the repository's settings is changed. (3) The example the prototype opens with: the shipped `wages` dataset of Zeff 0.7.0 with a short script of that release (a summary, a regression, a scatter with its fit, a histogram); the instrumental-variables example of the mockup comes with the alpha.

**The specification.** `docs/spec/` is brought to the Zeff repository's commit 2e90407 (15 November 2026), its latest: the plan of 29 releases after 1.0 in the catalogue and the three volumes (#113, #123), and the owner's ruling on Zemp's repositories recorded as #148, with the opening paragraph and sections 2, 3, 15, 16 and 17 of the Zemp Specification amended for it. Each file was taken from the commit, not from the working folder, and compared with it byte for byte. The rows of Zemp 0.1 and 0.2 and sections 5, 7 and 10 are unchanged, so the checklist stands.

**The two tags.** Zemp has no catalogued functions. `[engine]` marks a hard or foundational piece (the engine's build and its worker, the hand-over of plots, the structure every later screen stands on); `[function]` marks interface work on machinery that already exists. Reason: the owner chooses the model for a session from the tag, which is the tags' purpose in the Zeff repository too.

**The look.** The prototype follows the owner's rulings of #146 and his design guide (the three families above, the logo's violet, one type scale), not the paragraph "The look" of section 5 of the Zemp Specification, which still carries #115 (IBM Plex, a blue accent). Reason: #146 is the later ruling; its entry says no normative text fixes these items, which is mistaken, and the amendment it places at the first step of the 0.2 alpha is asked to cover that paragraph (a note was left for the Zeff sessions, whose copy is the one amended).

**The route to a plot at 0.7.0.** The released browser build keeps no plot of a run and draws none at a size, and the engine's public crates hand none out. The prototype therefore draws a plot by running Zeff: the interface adds an `export` to an SVG file at the size of the pane, in millimetres, to the text it sends, and reads the file the engine wrote; the script the user sees is never changed. A redraw to fit is a new run. Reason: it is the one way a figure leaves the released engine, and it keeps principle 2 (the interface writes Zeff and never calls the engine directly). The target of section 14 (a redraw within 16 ms) waits for Zeff 0.8.0 to hand plots over, which the note to the Zeff sessions asks for.

**The worker.** Zemp builds a small worker of its own in Rust, to WebAssembly, on the engine's public crates at the commit of the tag v0.7.0 (9a3cabd), at step 3: the messages of `zeff-web`'s `host.mjs` and one more, which gives back a file of the project. Reason: `zeff-web` keeps its project in memory to itself, so a file the engine wrote cannot be read through it; a dependency on the released tag by its commit uses the engine through its released version and changes nothing in the Zeff repository. The tag carries no built files, so the build is made here from source.

## 15 November 2026: the project and its tools (release 0.1, step 1)

**Choice.** The interface is a Svelte 5 project in TypeScript, bundled by Vite (open decision #24), at the root of the repository, with every version exact in `package.json`, the lock file committed and `.npmrc` making any later addition exact too. The version is `0.1.0-dev` until the release sets `0.1.0`. Node 24 (`.nvmrc`), the version the Zeff repository's jobs use for the browser build.

**The routine.** `npm run routine` runs, in order and stopping at the first failure: the format check (Prettier), the lint (ESLint with the strict rules of `typescript-eslint` and the recommended rules of `eslint-plugin-svelte`), the type check (`svelte-check`, warnings refused, and the TypeScript compiler on the configuration files and the browser tests), the unit tests (Vitest, beside the code they test as `*.test.ts`) and the browser tests (Playwright, in `tests/browser/`, against the built interface, in Chromium and WebKit). The worker's Rust joins it at step 3. `npm run browsers` fetches the two test browsers into the project's own `node_modules/`, so that nothing is put outside `~/dev`; a fresh clone runs `npm ci`, `npm run browsers`, `npm run routine`. The documents and the copied specification are not laid out by Prettier.

**The folders.** `src/` is the shared interface, which is all of Zemp Lite (#148): `src/app/` holds the window, and the later steps add `src/engine/` (the worker's side in the interface), `src/project/`, `src/theme/`, `src/editor/`, `src/output/` and `src/plots/`. Nothing in `src/` imports from outside it, so nothing of Zemp Studio's could be needed; Studio's modules, in their own repository, import these. The check that enforces it starts at Zemp 0.2 (testing handbook, section 1).

**Dependencies, each a tool of the build or of the tests except Svelte, whose runtime is the one thing shipped in the app.**

| Package | Version | Licence | What it is for |
| --- | --- | --- | --- |
| `svelte` | 5.57.3 | MIT | The interface framework (#24) |
| `vite` | 8.3.8 | MIT | The bundler and the development server (#24) |
| `@sveltejs/vite-plugin-svelte` | 7.3.1 | MIT | Svelte under Vite |
| `typescript` | 6.0.3 | Apache-2.0 | The language and its compiler |
| `svelte-check` | 4.7.8 | MIT | The type check of Svelte files |
| `@types/node` | 24.19.2 | MIT | The types of Node, for the configuration files |
| `vitest` | 5.1.0 | MIT | The unit tests |
| `@playwright/test` | 1.65.1 | Apache-2.0 | The browser tests, in Chromium and WebKit |
| `eslint`, `@eslint/js` | 10.15.0, 10.0.1 | MIT | The lint |
| `typescript-eslint` | 8.72.2 | MIT | The lint's rules for TypeScript |
| `eslint-plugin-svelte` | 3.24.1 | MIT | The lint's rules for Svelte |
| `globals` | 17.14.0 | MIT | The names a browser and Node define, for the lint |
| `prettier`, `prettier-plugin-svelte` | 3.10.1, 4.1.1 | MIT | The format |

TypeScript is 6.0.3, not the 7.0.2 that is its latest: `svelte-check` and `typescript-eslint` accept no version above 6. It moves to 7 when both do, as one upgrade with the whole routine. CodeMirror 6 (MIT) is added at step 7, where the editor is built.

**The licences of what these tools bring with them.** All 176 installed packages were read: MIT, Apache 2.0, BSD, ISC, and two licences outside the standing list, both on tools of the build alone. Blue Oak 1.0.0, a permissive licence, on `minimatch` and its helper, which ESLint uses to match file names; and MPL 2.0 on `lightningcss`, which Vite uses to shrink style sheets. Neither is linked into the app, which the built files confirm, so the rule on what is linked holds, as it does for the GPL packages of R that Zeff uses as reference tooling. No GPL, LGPL or AGPL package is installed.

**Known.** `npm audit` reports two advisories, both in tools and neither in the app: `deepmerge` (in the Svelte plugin of Vite, no fix published) and `minimatch` (in `typescript-eslint`, whose only offered fix is an older version). They read the project's own files, never a user's; each is looked at again when its tool is next upgraded.

**Held by.** One unit test of the version the page shows; one browser test, in both browsers, that the page opens, names the release and its engine, and raises no error; the lint tried once on a deliberately bad TypeScript file and a bad Svelte file, both refused.

**Reason.** The checklist's step 1; the standing rules on dependencies (exact versions, permissive licences, each recorded).

## 15 November 2026: the jobs on GitHub (release 0.1, step 2)

**Choice.** One workflow, `.github/workflows/ci.yml`, on every push and pull request, with two jobs. `words` is the Zeff repository's job, line for line: it refuses a forbidden word in a tracked name, in a tracked file or anywhere in the history, and fails when the list is missing. `routine` installs the pinned Node and the tools from the lock file, then runs the steps of `npm run routine` one by one, so that the page of a failed run names the step: format, lint, type check, unit tests, and the browser tests in headless Chromium and WebKit, whose browsers go into `node_modules/` as on the owner's machine.

**The repository setting.** With the owner's word of this day (question 2 of the release), the repository variable the `words` job reads was set on `zoostat/zemp-lite` to the value the Zeff repository holds, copied from one to the other without being written anywhere; no other setting was touched.

**Held by.** The first run (commit 0fa6c20), green in both jobs. That a break is refused was shown on this machine, since nothing is pushed broken to the main branch and no branch is made to be deleted: `npm run routine` ends in failure for a line out of format, for a lint error and for a failing test, and the job runs the same commands.

**Known.** GitHub notes that the two actions used (`actions/checkout@v4`, `actions/setup-node@v4`) were written for Node 20 and now run on Node 24; they are moved to their next major version when the worker's job is added at step 3, as one change.

**Reason.** The checklist's step 2; the standing rule that the CI job checks the forbidden words again.

## 15 November 2026: the worker (release 0.1, step 3)

**Choice.** `worker/` is a Rust package of this repository, `zemp-worker`, built to WebAssembly: a project in memory, a file put into it, a run that tells its steps, a frame of the last run, and a file of the project given back. It depends on four crates of the Zeff repository at the commit of the tag v0.7.0 (9a3cabd), and on nothing else of Zeff: `zeff-engine`, `zeff-columns`, `zeff-diagnostics`, and `zeff-web` for the two things of the engine's own browser build that an interface must not word for itself, the events of a run as JSON and the default memory budget.

**Built as the released engine is.** The compiler is the one the Zeff repository pins for 0.7.0 (Rust 1.99.1, `worker/rust-toolchain.toml`); the release profile is its profile (`opt-level = 3`, one code-generation unit, fat link-time optimisation, overflow checked); the flags are its flags (SIMD128 and a stack of 8 MB, `worker/.cargo/config.toml`); and `worker/Cargo.lock` began as the lock file of v0.7.0, so every crate the engine links is at the version it was released with (the lock file a dependency carries is not otherwise read, and a fresh resolution had moved five crates). `wasm-bindgen` is 0.2.129, the version the engine pins, and `worker/build.mjs` refuses any other.

**The messages.** Those of the Zeff repository's `host.mjs`, with two additions. `read` gives back a file of the project, its bytes passed and not copied, or `null` where there is none. A message that carries an `id` is answered with the same `id`, so that the interface can tell its answers apart; the events of a run carry none. A file put into the project is now answered (`filed`), and a path that would leave the project (`..`) is refused when written and gives nothing when read.

**Not chosen.** Using `zeff-web`'s own `Engine` as it is: its project in memory is private to it, so a figure a run wrote could not be read. Copying the engine's event wording here: it would drift from the engine's.

**Measured.** The build for the browser is 13,453 kB, 2,550 kB compressed with Brotli (3,684 kB with gzip), against the 5 MB of risk R4; Zeff 0.7.0's own worker measured 2,535 kB. Step 4 puts the measure, with the cold start, into the routine.

**Held by.** Seven native tests (`cargo test`): the engine's version, a run's events and outcome, a file put in and read back, a figure exported and read back with the same bytes on a second run, a missing file and six paths that leave the project, a frame as an Arrow stream, and the example. Eight tests of the messages on the WebAssembly build under a worker thread of Node, as the Zeff repository tests its own. The example of the prototype (`examples/scratch/`, on the shipped `wages`) prints through the host natively and through the worker in WebAssembly what `zeff run` of the released 0.7.0 printed, byte for byte; the expected output was written by the released command line, built from the same commit into `worker/target/`, which is not committed.

**Noticed.** A figure `export` writes as SVG gives its size in points (120 mm by 80 mm is 340.157 pt by 226.772 pt), which step 11 uses. A test of the messages that fails must still end its worker, or the run of the tests never ends: each test now ends its own.

**The routine.** `npm run routine` gains the worker's format and lint (`cargo fmt --check`, `cargo clippy` with warnings denied), its native tests, its build and the tests of its messages; the job on GitHub runs them too, keeping the engine's build between runs, and its actions are moved to their current major versions.

**Reason.** The checklist's step 3 and the decision of this day on the route to a plot.

## 15 November 2026: the interface's side of the worker (release 0.1, step 4)

**Choice.** `src/engine/` holds the one module through which the interface reaches the engine. `Engine` starts the worker, opens the window's project in it, puts the project's files there (their bytes passed, not copied), runs a script and hears each step, each pass of a loop and each piece of output as it comes, and reads back a frame or a file. Every message carries an `id` and its answer is matched by it. The types of the messages are written once (`messages.ts`).

**Two ways to end a run.** `cancel` writes the flag the two sides share, and the engine ends before its next step with its own message (Z0705), the project left as it was. `stop` ends the worker at once: the way out of one long step, and the only way where a page has no shared memory; the run then ends as stopped, with what it had printed, the project in the worker is gone, and the next project starts a new worker. Closing a project is `stop` too, which returns the worker's memory to the browser (Engine Specification, section 8.3, point 7). The interface writes no message of the engine's in either case.

**The page is cross-origin isolated.** The development server and the preview send `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`, as the host of the alpha will (section 10), since a browser shares memory only with such a page. The worker is a module worker, bundled by Vite with the engine beside it.

**The measure.** `npm run measure:worker`, in the routine and in the job on GitHub, is the Zeff repository's own measure: the worker's files compressed with Brotli, and a cold start under Node (the engine loaded, a project opened and a one-line script run, the median of five fresh processes), failing above 5 MB or 1,000 ms (risk R4). Measured: 2,549.7 kB and 52.8 ms; Zeff 0.7.0's own worker gave 2,535 kB and 52 ms. The time from asking for the page to the engine ready in a browser is written into the report of the browser tests, for the notes; it is not a limit, since it varies with the machine.

**A fault of a test browser, worked round in the tests alone.** On this Mac the headless WebKit that Playwright ships delivers the mouse to the wrong place (seen on an empty page with none of this project's code: a click aimed at 120, 110 arrives outside the window). So each worker of the browser tests first tries the mouse on an empty page; where it lands, a test uses it, and where it does not, a button is pressed by sending it its click event, and a test that needs a real drag will be skipped. On GitHub the fallback is refused: there the mouse must work, so the tests of record use the real mouse in both browsers. Chromium is not affected.

**Held by.** Eleven unit tests of `Engine` against a stand-in worker (the start, the flag, the ids, a file's bytes passed, a run's events and outcome, one run at a time, cancel, stop with what was printed, close, the worker's own words as an error, a worker that fails). Four browser tests in Chromium and WebKit: the page is isolated and the engine reads 0.7.0; a script runs and its output is shown; the example prints on the page what `zeff run` 0.7.0 prints, byte for byte; a long loop is cancelled while the page still answers, and the next run goes to its end.

**The page.** A box of Zeff, Run, Cancel and what was printed: the bench this step's "done when" asks for, which the workspace of step 6 replaces.

**Reason.** The checklist's step 4.

## 15 November 2026: projects in the browser, the welcome screen and the theme (release 0.1, step 5)

**Projects.** A project is a folder under `projects/` in the browser's private file system, holding `zeff.toml` (its name, the engine it is pinned to, the edition), `scripts/main.zeff` and `data/`, as section 4 of the Zemp Specification lays one out. Its folder is named from its name (letters and digits, in lower case), and a name whose folder is taken is refused in words. The Scratch project is always there: made with the example the first time it is asked for, and left as the user leaves it. When each project was last opened is remembered in the browser's own settings, not in the project, since it is the user's and not the project's. One window holds one project, named in the window's address after `#/p/`, so that a reload comes back to it and a second tab can hold another. Closing a project ends the engine's worker.

**Where the browser keeps nothing.** A page asks for the private file system and then writes and removes a file to find out whether it was really given one: a private window of Safari has the calls and refuses them. There the projects are kept in memory for the life of the tab, and the welcome screen says "Not kept" in the place of "Kept on this computer".

**Not built here.** **Open folder…** is shown and not active: reading a folder of the computer is a browser feature only some browsers have, and belongs with the alpha. The Start screen of the design guide (the engine fetched and checked on a first visit) belongs with the hosted alpha too. The shortcuts the mockup shows beside the three actions are left out on the web, where a browser keeps ⌘N and ⌘O for itself. The note on the welcome screen does not promise that the browser has agreed to keep the storage, nor an Export command, since neither exists before 0.11.0 (#117).

**The engine in step with the project.** `Session` gives the engine every file of the project before the first run and only the files changed since before the next, and fills it afresh after a file is removed or the worker was ended. The interface's own folder, `.zemp/`, is never given to the engine.

**The theme, brought forward from step 6.** The welcome screen is the first screen, so the colours, the fonts and the kept theme were built with it; the checklist is amended to say so. One file (`src/theme/tokens.ts`) names every colour with its value in the light and in the dark theme, and a test computes the contrast of every text colour against each ground it is written on: all reach 4.5 to 1 in both themes. The values are those of the owner's mockup of Zemp Lite and of his design guide. One departs from the guide: the guide's colour for a comment in code (`#80838d` on white, `#7d808b` on the dark ground) reaches only 3.8 to 1 on white, under the guide's own rule, so the mockup's `#6b6b73` and `#8f919c` are used, which reach it. The theme is the system's until the user chooses, and the choice is kept under `zeff-theme`, the key the website uses.

**The fonts.** With the owner's word (question 1): Atkinson Hyperlegible Next (two variable files), JetBrains Mono (regular, medium, italic) and Newsreader (one variable file), 598 kB in all, each fetched from its publisher's own repository at a commit named in `src/theme/fonts/SOURCE.md`, unchanged, with its licence file, the SIL Open Font License 1.1. A test holds each file to its SHA-256. Newsreader's italic is not shipped until a screen uses it. The built app carries the six files and asks no outside server for a font, which a browser test confirms by asking the page whether the families are loaded.

**The tests and WebKit's storage.** WebKit's test browser gives a page no private file system in the short-lived profile a test normally has, and keeps the private file system of every profile on disk in one place on the machine (`~/Library/WebKit/org.webkit.Playwright/`), shared by all tests and all runs. So most browser tests run in WebKit as in a private window, which is itself a case to test; the tests of kept projects are one file, run one after another with a profile on disk, and they empty that storage before and after each test, so nothing of a test is left on the machine. Chromium keeps each test's storage apart by itself.

**Held by.** 49 unit tests in all, of which this step adds: the folder and its paths, projects created, listed, opened, removed, a name taken, the Scratch project, a project's tree, rename, a data file added, the wording of "today, 10:42", the session in step with the engine, the tokens and their contrast, the theme chosen and kept, the fonts' bytes, the watermark's geometry. Ten browser tests in each of Chromium and WebKit (one of them WebKit's alone): the welcome screen, the theme switched and remembered, the system's theme, the example in the Scratch project byte for byte, a data file added and read by a run, a run cancelled, a private window; and, with storage kept, a project made, reloaded, listed as opened today, its name refused a second time, and the Scratch project keeping what was written in it.

**Reason.** The checklist's step 5; the design guide, sections 2 to 6 and 9; open decision #146.

## 15 November 2026: the shell of the workspace, in Panes (release 0.1, step 6)

**The structure.** One object holds the state of a window with a project open (`src/app/workspace-state.svelte.ts`): the project, its engine and the session between them; what is shown; the files open in the editor, each saved as it is typed; and the last run. Every screen reads it and changes it through its methods, so the screens of the later steps (the editor, the output, Inline, the plots) are added without a second place where the state lives.

**View state.** What is shown is kept with the project in `.zemp/views.json`, as section 5 has it, a moment after each change: the layout, the left panel's tab, width and whether it is shown, the share of the script's pane the output takes and whether it is shown, the open tabs and the one shown, the folders folded in the tree. A part of the file that cannot be read is replaced by the usual one and the rest kept, so a file from a later version, or a damaged one, never keeps a project from opening. The engine is never given this folder.

**The Panes layout of #146.** The top bar, from the left: the logo and **Projects ▾** (back to the projects of this browser), the project and its file with "saved", ⌘K, **A− 14 A+**, **Inline | Panes**, the **Dark** switch, **Check**, and **Run**, the one filled control, in the logo's violet; **Cancel** stands beside Run while a run goes. One left panel with the tabs Project (the tree, folders folding, each file with its size, a + that adds a data file) and Objects (the frames of the last run with their rows and variables, and the engine with its memory budget); no right panel. The editor tabs, a strip saying what is open, and under the script the Output panel, resized by dragging its upper edge, folding away, with Clear.

**Shown and not yet active**, each saying when it comes: ⌘K (step 10), Inline (step 9), Check (the alpha, with the language server). A project opens in Panes until step 9 builds Inline, which is then the layout a new project opens in, as section 5 says. Past runs, which the mockup lists under the tree, are not shown: nothing in the browser keeps a run record at 0.7.0. The Objects tab shows the memory budget and not the memory used, which the engine does not tell an interface at 0.7.0.

**The edges.** An edge between two panels is dragged with the pointer or moved with the arrow keys, and says to a screen reader what it separates and where it stands. The left panel goes from 180 to 520 pixels; the output from 12 to 85 per cent of the script's pane. Rearranging panels, which section 5 also names, is left for the alpha.

**The narrow window.** Below 1,200 pixels of width a line says that no smaller layout exists yet (#33), and the workspace is shown as it is.

**The code size.** The control and its setting are built here, since the top bar carries them: eight sizes from 12 to 22 pixels, 14 the usual, kept for the user under `zemp-code-size`, written into the page as one value that the editor and the output read (the output one pixel smaller). Step 7 gives it the editor's line numbers.

**A fault found and mended.** When a project was closed and another opened, WebKit refused the second project its engine. A worker's script must arrive with the page's isolation headers, and the local preview server leaves them off a "not modified" answer, which is what a second request for the same script gets. Each worker is now asked for under an address of its own, so the script is always fetched afresh (7 kB). A test closes and opens a project three times in both browsers. **For the alpha:** the host must send the two isolation headers on every answer, the "not modified" ones included; this mend holds whichever way the host behaves.

**Held by.** Unit tests: the view state written and read back, each unreadable part replaced, the limits of the two sizes, tabs opened once and closed to their neighbour; the code sizes; sizes and counts as they are written. Browser tests, in both browsers: the top bar's controls in order with Run alone filled and Check not active; the two tabs of the left panel, a folder folding, the frames after a run, and no right panel; the left panel resized with the keyboard inside its limits and folded; both edges dragged with the mouse (where the test browser's mouse works); the output under the script, resized, folded and cleared; a file in a tab of its own and a tab closed to its neighbour; the Dark switch; the code size changing the code and its output and remembered; the narrow window's line; no text on an app screen below 12.5 pixels; a project closed and opened three times; and, with storage kept, the whole layout coming back after a reload.

**Reason.** The checklist's step 6; Zemp Specification, section 5; open decisions #146 and #33.

## 15 November 2026: the editor (release 0.1, step 7)

**Choice.** The script's tab holds a CodeMirror 6 editor (`src/editor/`), as open decision #24 names it: line numbers, the current line marked (a faint ground, its number in the accent, a bar at the left edge, as the mockup draws it), matching brackets, undo and redo, Tab to indent by four spaces. The script runs from the keyboard with ⌘↵ and with ⌘⇧↵ (Ctrl on Windows and Linux); both run the whole script until the statement ranges of Zeff 0.8.0. For those who use the keyboard alone, Escape and then Tab leaves the editor, and the editor says so to a screen reader.

**The colours of code.** A small reader of Zeff's words, written here (`zeff.ts`), puts each word of a line into one of the design guide's categories: keyword, function, option, operator, text in quotes, number, comment, and variable, which keeps the main ink of code. It goes by shape alone: a name before `(` is a function; a name before `:` at the start of an argument or of a record's field is an option, a reserved word included, as section 3.1 of the Language Reference has it, so that the interaction `firm:year` in a formula is not taken for one; `true`, `false`, `NA` and `Inf` are coloured as numbers are; a name in backticks is a variable whatever it holds. A line is read on its own, which is enough, since neither a comment nor a text spans lines in Zeff. It is the prototype's stand-in: from the alpha the colours are the language server's semantic tokens, which know what a name is. The colours themselves are the theme's tokens, so they follow the theme without the editor being told.

**Dependencies, all MIT, linked into the app.** `@codemirror/state` 6.7.6, `@codemirror/view` 6.43.15, `@codemirror/language` 6.13.1, `@codemirror/commands` 6.11.1 and `@lezer/highlight` 1.2.5, with the six small packages they bring (`@codemirror/streamparser`, `@lezer/common`, `@lezer/lr`, `style-mod`, `crelt`, `w3c-keyname`, `@marijn/find-cluster-break`), each MIT. The umbrella package `codemirror` is not used: it would bring the editor's own completion, search and lint, which the language server replaces in the alpha. The app's script grows to 383 kB (128 kB compressed).

**Known.** The undo history of a file is kept while its tab is the one shown; switching to another tab and back starts it afresh. The file itself is always as it was typed.

**Held by.** Eight unit tests of the reader, two of them over whole scripts: every word of the specification's sample script (`docs/spec/zeff_samples.zeff`) and of the Scratch example falls in a category, no reserved word is left uncoloured, every comment begins with `//` and runs to the end of its line, every text is a closed text, every option stands before a colon, and all eight categories occur in the sample. Five browser tests in each browser: each category drawn in its colour in the light theme and the keyword, function and comment in the dark; the lines numbered, a pixel and a half smaller than the code, and the current line marked; typing saved, undone, and indented by Tab, and the file the same after another tab was shown; the script run by both keys without a character written into it.

**Reason.** The checklist's step 7; the design guide, sections 2 and 9; open decision #24.

## 15 November 2026: Run, and the Output panel (release 0.1, step 8)

**Choice.** A run is shown as blocks, one for each line of the script that has something to show: what the statement printed, in the engine's own layout; what the engine said while it ran; the line number, and the time the statement took. A statement that printed nothing and said nothing has no block. The blocks are made from the engine's events (a statement started, a piece of output, a statement finished) by one small module (`src/output/run.ts`) that writes no message of its own: taken together, the blocks' printed text is what `zeff run` prints, to the byte, and the cards hold every word of what it says.

**What the engine says.** A warning is a card with its code and its one sentence, on the warning ground, with the engine's advice under it where it gives any. A note is a line of small print. An error is a card under the line it names, with the engine's excerpt of the script and its advice, and its block is outlined. What the engine's check refuses before a run starts (an unknown function, a variable a frame does not have) is shown the same way, each finding under the line it names, and nothing is run, as on the command line. The design guide names no colour for an error; one red is added to the theme (`#b3261e` on light, `#f2a39b` on dark, with a soft ground), held to the contrast of every other text colour by the same test.

**While a run goes.** The statement that is running is marked, with the pass of a loop it is at; the line beside the panel's title says "statement 2 of 9"; **Cancel** stands in the panel's head and nowhere else, so the top bar keeps the controls the design guide gives it; Run and Clear wait. When the run ends the same line says how: the number of statements and the time, or "ended with an error", "cancelled" or "stopped".

**The time of a statement** is taken by the interface's clock between the engine's two events, since the engine does not report one at 0.7.0; it includes the passing of the two messages, a fraction of a millisecond.

**Edited, not run.** When the script the panel's run was made from has been edited since, the whole output is marked "edited · not run", dashed and faded, until the script is run again or typed back to what ran. This is all of section 5's "stale output" that the prototype has: the finer rule, by which only the outputs that depend on the edited statement go stale, needs the dependencies the engine does not yet tell an interface, and comes with the alpha. A stale result can never be taken for a current one, which is the point of the rule.

**Run from the keyboard** answers ⌘↵ and ⌘⇧↵ wherever the focus is, not in the editor alone.

**The Objects tab** lists the frames the last run left, as step 6 built it; a file's size in the tree follows each save.

**Held by.** Eleven unit tests of the module: the messages read (a warning, a note, an error with its place, excerpt and advice) and written back to the byte; output under the line that made it; the printed text kept whole; a failed statement; the check's findings under their lines; the running statement and its pass; a run cancelled and a run stopped; times and the time of day as they are written. Eleven browser tests in each browser: the example's seven blocks under their lines with their times, its warning as a card, and its printed text equal to `zeff run`'s; the panel's text held to a kept text (`tests/browser/snapshots/example-output.txt`); four short scripts (`tests/scripts/`: plain, with warnings, stopping at an error, refused by the check), each shown as the released `zeff run` 0.7.0 printed and said it, to the byte; an error under its line with excerpt and advice; a refused script running nothing; the running mark with Cancel, Run and Clear waiting; the edited mark, removed by a run or by typing the script back; Run from the keyboard with the focus outside the editor.

**Reason.** The checklist's step 8; Zemp Specification, section 5 (the Log's and the Inline layout's wording of warnings, errors and stale output); open decision #146, item 7.

## 15 November 2026: the Inline layout (release 0.1, step 9)

**Choice.** Inline is one centred column holding the script, at most 760 pixels wide at the usual code size and wider in step with the code (977 at 18 pixels), with each statement's output directly under it in a soft box and its time or state in a margin of 120 pixels at the right, as section 5 of the Zemp Specification sets it out. A project of Zemp Lite opens in Inline, as that section says; **Inline | Panes** switches with one click, the run is not made again, and the choice is kept with the project. There is no panel beside the column: the files and the objects are in Panes, and from step 10 a file is opened from ⌘K.

**Output inside the editor, never in the script.** The blocks of a run are drawn by the editor between its lines, as things of its own: the script stays a plain `.zeff` file, a browser test holds the editor's text to the file after a run, and what is saved has no output in it. The same block is drawn in both layouts (`OutputBlock`), so a warning, a note and an error read the same in each. In the one column a long line of code wraps.

**Where a block stands.** At 0.7.0 the engine tells an interface the line a statement begins on and not the line it ends on; the ranges of statements arrive with Zeff 0.8.0. Until then the end is found here (`src/output/place.ts`). A statement reaches to the last line before the next statement began that is neither blank nor a comment. For a statement after which none began and which did not end well (it is running, or it failed and nothing ran after it), the end is read from its shape: the first line where every bracket is closed, the line does not end with an operator or a comma, and the next line of code does not carry it on with a dot or a closing bracket. From the alpha both are replaced by the engine's own ranges.

**While the script is edited.** The blocks keep their places beside their statements as lines are typed above or between them, and each is marked "edited · not run" in its margin, dashed and faded, until the script is run again. They are placed afresh only when a run gives them new places.

**While a run goes** the running statement is marked in its margin, with the pass of a loop and **Cancel** beside it; a failed statement's margin says "failed".

**Known.** The editor draws the part of a script near the window and the rest as it is scrolled to, as editors do; the tests of Inline are given a tall window so that they read all of it. A printed table wider than the column's box scrolls sideways inside its box.

**Held by.** Eight unit tests of the placing (after blank lines and comments; the example; a statement of several lines; the check's findings; the end by shape with brackets in texts and comments, a chain of methods, an unclosed call; a failed statement; a running one; never past the end). Nine browser tests in each browser: a project opening in Inline, one centred column of at most 760 pixels with no panel; the seven results of the example each under its statement, printed and said as `zeff run` 0.7.0 has them, the script unchanged; the time in a margin of 120 pixels to the right of the output; the same run in both layouts with one click each way; the Inline text of the example held to a kept text (`example-inline.txt`); an error and a refused script under their lines; the running mark and Cancel in the margin; the edited mark in each margin, the blocks moving with their statements; the column widening with the code. With storage kept: the layout chosen coming back after a reload, and another project opening in Inline.

**Reason.** The checklist's step 9; Zemp Specification, section 5 ("The Inline layout", "Stale output", "The look").

## 15 November 2026: ⌘K and the console line (release 0.1, step 10)

**The command palette.** ⌘K (Ctrl K on Windows and Linux), or a press on the top bar's ⌘K, opens a box to type in over a list of commands; typing keeps the commands whose names hold every word typed, the arrow keys choose, Enter runs, Escape or a press outside closes. The commands are those that exist: run the script; the layout; the theme; the three of the code size; the console; clear the output; in Panes, show or hide the output and the left panel; open each file of the project the editor opens, which is how Inline reaches a second file; new project; back to the projects. "Open the plot viewer" joins them at step 12. A command names what it will do ("Layout: Panes" while the layout is Inline), with what stands now beside it.

**The console line** is the foot of the window in both layouts: a one-line box that runs a statement after the script without adding it to the script, with the status at its right. Entering a line opens a drawer above it with what was typed and what came of it; Escape shrinks it to one line; ↑ and ↓ recall what was typed, keeping the line being typed; ⌃` puts the keyboard in the console from anywhere.

**How a console statement runs at 0.7.0.** The engine keeps nothing between two runs in a browser, so the console does what `zeff repl` does: it runs the script as the editor holds it, then the statements the console has kept, then the new one, and shows what the new one printed and said. A statement that ran is kept, so that the next one sees what it made; one that failed is not. Where the script itself stops before the statement is reached, the console shows the engine's reason. A statement entered while something runs waits its turn. The script is never changed, which a test holds. This is slow for a long script, and is replaced when the engine keeps a session for an interface.

**Waiting for the alpha:** `:help`, `:vars` and `:save`, Tab to complete, and ⌘↵ copying a console line into the script; a line that begins with a colon other than `:clear`, which empties the console, says so.

**The last line** says how the output stands to the script ("not run yet", "running", "in sync", "edited · not run"), the warnings of the last run, how the last run ended, and the engine with its version.

**Held by.** Unit tests: the palette's matching; the text a console statement is run in and the line it begins on; what it printed and said read apart from the script's; the reason shown where the script stopped first; the history. Seven browser tests in each browser: the palette opened, narrowed, chosen from and closed, by keys and by the pointer; each command doing what it says; New project and Projects from the palette; a console statement seeing the script's bindings, a second seeing the first's, a failed one not kept, the script unchanged; the history, the drawer, Escape, ⌃`, `:clear` and a word that waits for the alpha; the last line; and every control of the window reached by the Tab key with a name a screen reader can say, with a command in ⌘K for each thing the top bar does.

**Reason.** The checklist's step 10; Zemp Specification, section 5 ("The Inline layout": the console and ⌘K).

## 15 November 2026: a plot from the engine, at the size of its pane (release 0.1, step 11)

**Which statements end in a plot.** The engine tells an interface no types at 0.7.0. It does print a plot's summary for a statement whose value is a plot, headed "plot · …", as it prints a table's for a table; so the statements of a run that ended in a plot are those that printed such a summary. A plot that is bound to a name and never written as a statement of its own is not drawn, exactly as it prints nothing: a plot shows when a statement ends in it.

**How a figure is drawn.** After a run, for each place a plot is shown in, the interface runs the text of that run once more with one `export` added per figure: the plot's own statement written again inside brackets, with `.export("zemp-figure-N.svg", size: [width, height])` after it on a line of its own, so that a comment at the end of the statement cannot swallow what is added; the size is the place's, in millimetres to a hundredth, a pixel being 1/96 of an inch. The engine writes the files into `output/` in the worker's memory, the interface reads them back through the worker (step 3) and shows each as an image. The script is never changed, the files are never copied into the project, and nothing the engine prints or says of the added lines is shown: the output, the warnings and the count of statements are the script's own, which the tests hold.

**It is the engine's figure.** The interface draws nothing: a figure is the SVG `export` writes, with the engine's fonts as outlines, shown at its own size. A unit test runs the engine's worker build on the text the interface composes for the example at 567 by 352 pixels and holds the two files to those the released `zeff run` 0.7.0 wrote for the same text, byte for byte (`tests/scripts/figures/`).

**Redraw to fit.** A figure watches the size of its place. When the place is resized the figure is asked for again at the new size, a quarter of a second after the last change, so a pane being dragged is drawn once, when the dragging has stopped; the engine lays the plot out afresh for the new page, with its text at the same sizes in points, and until the new figure arrives the one before it stays at its own size: a figure is never stretched. A figure asked for at a size it was already drawn at is not drawn twice. A new run draws its own figures.

**Measured.** One drawing of the example's two figures, which is one run of the script with its two exports, takes about 47 ms in Chromium on this Mac; the Plots tab says the time under the figures, and the browser test writes it into its report for the notes. The target of section 14, a redraw within one frame (16 ms), needs the engine to hand a plot over without a run, which is asked of Zeff 0.8.0. A long script makes a redraw as slow as the script.

**Where a plot is shown.** Under its statement, in both layouts; and in the **Plots** tab of Panes, which joins the script's tab the first time a run draws a plot, without taking the script's place. Step 12 makes that tab the plot viewer.

**The light ground.** A figure is drawn in the engine's light print theme, which is what `export` writes, and is shown on white in both themes of the interface. A dark ground on screen needs a scene and a theme the interface can ask for (Zeff 0.8.0).

**Order of the routine.** The unit tests now run after the worker is built, here and on GitHub, since one of them runs the engine.

**Held by.** Ten unit tests of the composing (the plots of a run; a statement of several lines taken whole with its comment; no plot, and a failed one; pixels to millimetres and back; the size read from a figure; the text sent, held to the kept file; one plot at two sizes; a trailing comment), the test against the released engine's bytes, and six browser tests in each browser: each plot of the example under its statement, an SVG of the engine's, its own size the size it is shown at to a pixel; the script, its output, its warnings and its nine statements unchanged by what was added; in Panes a plot in the Output panel and, larger and laid out afresh, in the Plots tab; a pane made narrower giving a new figure of new proportions with every text at the same size in points; a plot without a name, drawn, on white in the dark theme; a new run drawing its own figures and a script without a plot drawing none.

**Reason.** The checklist's step 11; Zemp Specification, section 7 ("Redraw to fit") and section 1, principle 2; the decision of this day on the route to a plot.

## 15 November 2026: the plot viewer (release 0.1, step 12)

**Choice.** The Plots tab is the plot viewer of section 7 of the Zemp Specification, with the features the released engine allows. In Inline it is opened from ⌘K ("Open the plot viewer") in the script's place, with **‹ Script** to go back; the layout is not changed.

**The plot shown** is drawn by the engine to fit the viewer's pane, as step 11 has it, or at a page: **Fit | One column | Two columns | Slide**, the three pages of `export` (89 by 66, 183 by 110 and 254 by 143 mm), each asked of the engine by its own word (`size: one_column`), so that the preview is the figure a paper would carry, shown at its true size on a sheet.

**The gallery strip** holds every plot of the last run as a thumbnail, which is a small picture of the figure the engine drew at a readable size; a click shows the plot; a thumbnail is dragged to another's place, or moved with Alt and an arrow key, and keeps the keyboard where it lands. The prototype's session is the last run: plots of earlier runs, which section 7 keeps under "History", need run records, which a browser does not keep at 0.7.0.

**Compare.** A thumbnail's **Compare** box pins its plot; from two pinned on, up to four, the plots stand side by side (three and four in two rows), each drawn afresh for its share of the pane. They are not yet on shared axes, which needs the scenes (Zeff 0.8.0).

**Pop out** opens the plot in a window of its own, which belongs to this one: it carries this window's fonts, colours and theme, the plot in it is drawn by this window's engine at the popped window's size, and it is drawn afresh when that window is resized. It closes when the project closes.

**Save.** A figure is saved as SVG, PDF or PNG at the page chosen, or at the size it is shown at: the interface runs the script with one `export` of that format and size, reads the file the engine wrote, and hands it to the browser to save under the plot's name. Beside it stands the Zeff statement that does the same (`schooling.export("output/schooling.pdf", size: one_column)`), with **Copy as Zeff**, which puts it on the clipboard and never into the script (#114). A PNG is at the engine's 300 dots to the inch; "any DPI" of section 7 waits for the engine to take one.

**View state.** The order of the strip, the plots pinned, the plot shown and the page chosen are kept with the project in `.zemp/views.json`; a plot is named there by the text of its statement, which is what stays the same from one run to the next.

**Left for the engine's scenes (Zeff 0.8.0 and later), as the checklist said:** Focus on a panel of a faceted plot, Inspect (the values under the pointer, a point's row), Compare on shared axes, History, the dark ground on screen, and causal graphs (Zeff 0.10.0).

**Held by.** Nine unit tests of the viewer's logic (the strip's order kept from run to run, a plot moved, pins put on and off with four at most, the comparison from two on; a figure asked for by a page's word; the text run to save a figure; the statement offered, named after the plot or wrapped where it has no name) and the view state read back. Eleven browser tests in each browser: the plot drawn to fit and the strip's thumbnails, a click showing a plot; thumbnails reordered by the keyboard, and by dragging in Chromium; two plots pinned side by side, each drawn for its half; the three pages at their sizes in pixels and in points; a figure saved as SVG, as PDF and as PNG at one-column size, each the file the released `zeff run` 0.7.0 writes for the same `export`, byte for byte, under the plot's name, with the statement offered; saving to fit; a plot popped out, drawn to fit its window and afresh when the window is resized, in this window's look, and closed with the project; the viewer opened from ⌘K in Inline and left with Script; and what it says where no plot was drawn. With storage kept: the strip's order, the pins and the page coming back after a reload.

**Reason.** The checklist's step 12; Zemp Specification, section 7; open decision #114.

## 15 November 2026: the pre-release routine (release 0.1, step 13)

**What stands in for the sample script.** The checklist asked for the statements of `docs/spec/zeff_samples.zeff` that are valid at 0.7.0 to be run through the prototype. That script is written for Zeff 1.0 and opens with a `use` of a module of a project of its own, so the engine of 0.7.0 refuses the whole of it before a statement runs, and no part of it can be run as it stands. In its place: the eight sample projects the Zeff repository keeps for release 0.7.0, each with the output `zeff run` is expected to print, which are the script tests the testing handbook names. `tools/check-samples.mjs` runs all eight through this repository's worker and holds what each prints and says to Zeff's expected files, byte for byte; it reads them from the engine's source that cargo fetched at the pinned commit, so nothing of Zeff's is copied here. It is in the routine and in the job on GitHub. Three of the eight are also run through the interface in both browsers, and the specification's sample script is shown refused as the command line refuses it.

**Result.** All eight identical; the three through the interface identical in what is printed and in what is said. With the example, the four short scripts and the figures, every output the prototype shows of the engine has been held to the released `zeff run` 0.7.0.

**The notes** are drafted in `docs/releases/0.1-notes.md`: what the prototype is, what it leaves out and why, the four things it does in a way of its own until the engine tells an interface more, the measures, the validation, the versions and nine known issues.

**What is not done.** Step 13 is left unticked: its "done when" is the owner's trial of the prototype and his "Release 0.1". Setting the version, the tag and the GitHub release belong to that word, and are not made before it.

**Reason.** The checklist's step 13; testing handbook, section 2.4.

## 15 November 2026: a run leaves the reader where they were (after the owner's trial of the prototype)

**What the owner found.** In Inline, each time a statement was written and the script run, the page went to its top.

**Why.** When a run starts, the results of the run before are taken away and the new ones arrive statement by statement. For a moment the script with its output is much shorter than it was, so the browser can no longer be as far down it as the reader was, and puts them at the top; when the new results arrive it leaves them there. The Output panel of Panes did the same.

**Choice.** The content is held at its height for the length of the run, and what stood at the top of the reader's view is noted: in Inline the line of the script, by its number; in the Output panel the block, by its line. When the run has ended the reader is brought back to that mark, over the few frames in which the new results reach their sizes (a figure's place is measured after it is drawn), and then the content is let take its own height again (`src/app/steady.ts`).

**Held by.** Two browser tests in each browser: in Inline, the reader scrolled down a long script with its output, the script run from the keyboard and then from the button, the same line at the top of the view after each; in Panes, the Output panel where it was after a run.

**The owner's second question, how a dataset is looked at.** The data and variables viewers belong to the 0.2 alpha (open decisions #75 and #146, item 8), and 0.1 has none. In 0.1 a frame is listed in the Objects tab of Panes with its rows and variables, and is looked at with Zeff: `wages.head(10)` prints its first rows and `wages.describe()` its variables, in the script or in the console line. Whether the viewer is brought forward is the owner's to say; it is put to him.

**Reason.** The owner's trial of 15 November 2026.

## 15 November 2026: the data viewer stays with the 0.2 alpha

**The owner's word.** "Keep it for 0.2", to the question whether the data and variables viewers should be brought forward into 0.1.

**Choice.** Release 0.1 has no data viewer. It is built at the 0.2 alpha, with Zeff 0.8.0, to the owner's mockup (open decisions #75 and #146, item 8), as section 15 of the Zemp Specification places it. In 0.1 a frame is listed in the Objects tab and looked at with `head` and `describe`.

**Reason.** The release plan, and the standing rule that work is not pulled forward from a later release.

## 15 November 2026: `zeff.toml` as the `zeff` command writes it

**The owner's question and word.** Since the engine's version in `zeff.toml` is not to be changed lightly, should the file say so in comments? Shown two wordings, he chose "Version A": the comments the `zeff` command already writes.

**Choice.** A project made in Zemp Lite now has the `zeff.toml` that `zeff new` of the same engine writes, to the character: each of its three settings set in 26 columns with its short comment ("the project's name"; "the engine this project runs on, exactly"; "\"2027\" from Zeff 1.0.0"). Until now Zemp Lite wrote the three settings bare, which was an oversight: a project should look the same whichever tool made it (Zemp Specification, section 2, "Same projects"). A name with a quote in it is written with its escapes, which the command, taking a folder's name, never meets.

**Not chosen.** A longer caveat of Zemp Lite's own at the top of the file: the two tools would differ again. If a stronger caveat is wanted, it belongs in `zeff new`, in the Zeff repository, and is then taken from there.

**Existing projects** keep the file they have; the change is for projects made from now on.

**Held by.** A unit test holding the file for `demo` to what the released command line of 0.7.0 writes for `zeff new demo`, and reading the name back from it, from a name too long for the 26 columns and from one with quotes; the released engine was run on a file with such a long name.

**Reason.** The owner's ruling of 15 November 2026.

## 16 November 2026: notebook features, sorted and passed to the register

**The owner's question and word.** He gave a list of 26 features of notebook applications (cells run one at a time, a kernel whose variables persist, output under each cell, rich output, a semicolon that hides output) and asked which Zemp Lite must, should or may adopt. Shown the answer in groups, he said: "Yes, record them."

**Choice.** Nothing is built or changed in this repository. The answer was: the statement is the cell, and the script stays one plain text file run from top to bottom. What the specification already promises (running the statement at the cursor, stale output, **Run to here**, the **Outputs** switch, folding) needs no new entry. Eight proposals go to the open-decisions register, each still the owner's to decide: that Zemp Lite is not a notebook, with the reasons for the features not adopted; sections in a script, from a comment written as a heading; the last run's output shown when a project is opened; **Run from a fresh session**; **Run from here**; copying a result and saving a figure from its place in the Inline layout; from an entry of the Objects panel to the line that made it; and a group of five small conveniences for after 1.0.

**Where they are.** The register is edited in the Zeff repository, never from here, so the eight entries were left, written in the register's form, as a note for a session opened there; this repository's copy of the register gains them when `docs/spec/` is next refreshed.

**Reason.** The specification freeze (open decision #40): a design question is recorded in the register with a deadline, never settled by building it. None of the eight belongs to release 0.1.

## 16 November 2026: the reader's place is asked of the editor, not of what is drawn

**What was found.** Two of the five runs on GitHub since the fix of 15 November failed in WebKit, the engine of Safari, on the test of that fix: after a run the page stood some 330 pixels from where the reader had been. On this computer the same test failed about one time in five when six were run at once.

**Why.** The reader's place was noted by a mark on the page, the line number at the top of their view. The editor draws only the lines and results near the window. When the top of the view was inside a block of results, there was no line number there to note, and the reader was put back against another mark; and where a result above the view had not been drawn again after the run, the page was a different length. Which of these happened depended on the order in which the browser did its work, hence a failure some of the time.

**Choice.** Four changes, in `src/app/steady.ts`, `src/editor/Editor.svelte` and `src/editor/inline.ts`.

1. The reader's place in Inline is asked of the editor, which knows where every statement and its output stand whether or not they are drawn: the statement that holds the top of the view, by its line, and how far its top is above it. After the run the reader is put back so that the same statement stands as far above the view as before. The Output panel of Panes, where every block is on the page, keeps its marks.
2. The page is held, and the place noted, the instant before a run takes anything off the page (the window tells the panes), no longer when the panes notice that a run has begun: by then the figures of the run before could already be gone, and the height held was too small.
3. Each block of results is reckoned, while it is not drawn, at the height a block of the same results was last seen at. A run that gives the same results therefore leaves the page exactly as long as it was, and nothing shifts when the reader scrolls back up, in a browser that does not steady a page by itself (Safari).
4. A reader who scrolls during a run, or in the moment its results settle, is left where they went. They are known by what they do (the wheel, a touch, a key, a press), never by the page having moved, since the editor moves its page too.

**Held by.** In each browser: the test of 15 November, now comparing every line of the script in the window and how far down it stands, before and after, to within 3 pixels, and the page's position to within 3 pixels (it allowed 30); a new test that a reader who scrolls as a run ends, or while it goes, is left where they went; the Output panel's test as before. The three were run thirty times each in each browser, six at a time, with no failure, where the old test failed one time in five.

**Also seen, once, and not explained.** In one run on GitHub, WebKit did not load the page at the start of one test within its thirty seconds. It was not seen again in several hundred runs on this computer. It is noted in the release notes and watched; no test was changed for it.

**Reason.** A fix the owner asked for has to hold in every browser the prototype is tested in, and a test that fails some of the time hides the next real failure.

## 16 November 2026: a script the check refuses leaves the last results on the page

**What the owner found.** "A single error in the scripts halts outputs of previous lines": with a misspelt function on one line, Run showed the error and nothing else.

**Why.** Zeff checks a whole script before it runs any of it (Language Reference, section 1, "Typing", and section 11, "Checking before running"), so that a mistake late in a long script stops the run at once. That is the engine's behaviour and is right. What was the interface's own doing: on every press of Run it cleared the page first, so the results of the run before were lost to a typing slip, although nothing had been run in their place.

**The owner's choice,** from three put to him: keep the last results (taken, as recommended); run the lines above the mistake, as R and Stata do (not taken: it departs from checking first, and would have needed an entry in the register); leave it as it was.

**How it is built.** The results on the page are left there until the first statement of the new run starts. If the check refuses the script, no statement starts: the results of the run before stay, with their figures and the Objects of that run, marked "edited · not run" as any results of an edited script are, and what the check found is shown as the engine writes it, under the line it names in Inline and at the head of the Output panel in Panes, with a sentence saying that the run did not start and which run the results are of. The status line reads "not run · 1 error found by the check". Editing the script again marks the finding too; the next run that starts replaces everything. In a project with no results yet, a refused script shows what it showed before. A script that stops at one of its statements is unchanged: the statements before it ran, and their results are shown.

**Held by.** Unit tests of what a refused script is; a browser test in each layout, in each browser: the example run, a mistaken line added, Run, and every result, both figures and the frames of the run before still there, the finding under its line and not faded, the status line; then, in Inline, a further edit, and the slip mended and run.

**Reason.** The owner's ruling of 16 November 2026.

## 16 November 2026: the key for one statement stays with the 0.2 alpha

**The owner's request.** Keys to run a line and to run the whole script.

**As it stands.** ⌘↵ and ⌘⇧↵ (Ctrl on Windows and Linux) both run the script in 0.1, from the editor or from anywhere in the window. The specification gives ⌘↵ to the statement at the cursor (Zemp Specification, section 5); that waits for Zeff 0.8.0, which tells the interface where each statement ends and keeps results between two runs, and is in the plan of the 0.2 alpha.

**The owner's choice,** from two put to him: wait for 0.2 (taken, as recommended); a provisional key in 0.1 that would run the lines above again each time and be rebuilt at 0.2 (not taken: work pulled forward and thrown away).

**Done in 0.1.** The Run button names its keys when the pointer rests on it, and carries them for a screen reader.

**Reason.** The owner's ruling of 16 November 2026, and the rule that no work is pulled forward from a later release.


## 17 November 2026: the margin editor, reviewed and passed to the register

**The owner's question and word.** He gave a plan of his own, "Zemp Lite: the Margin IDE" (a proposal of 17 November 2026, kept outside the repository), which would replace the Inline layout by a column of one-line notes beside the code, with six places, seven viewers and writing; and asked for its advantages and disadvantages against the present editor, a rating of both, a choice, the changes wanted, and a mockup. Given them, he said: "Yes, record it."

**The assessment, in brief.** The plan's central idea is right and worth taking: running never moves the code, every statement (a `let` too) has a result beside it, and what an edit puts out of date is marked in place. Taken whole, the plan loses what Inline gives (a full result readable where it is, in the engine's own print, several at once), cannot hold a printed regression table in its 424-pixel card, asks the engine for a headline for every function, multiplies the work before 1.0, and meets decisions already taken on the look (#146) and on reports (#73, #124, #141). Rated out of ten, as a judgement and not a measurement: the present editor 6.5, the plan as written 6, the plan revised 8.5.

**What is proposed.** One editor: a note beside every statement, the full result opened under its statement when the reader asks, a switch **Notes · As written · All open** in place of two layouts, three places (Script, Data, Plots), no lens, shelf or thread rail, the look of the design guide, and keys a browser allows. It is one proposal for the open-decisions register, with three options (this, the plan as written, the Inline layout as planned), what it asks of the engine, where the plan meets earlier decisions, and five statistical cautions on the plan's viewers.

**Where it is.** The register is edited in the Zeff repository, never from here, so the entry was left, in the register's form, as a note for a session opened there, beside the note of 16 November. The mockup is `~/dev/handbook/zemp-lite-margin-editor/zemp-lite-margin-editor-mockup.html`, outside the repository as the other mockups are.

**Not done, on purpose.** Nothing of it is built, and the specification is unchanged: it is a question for the plan of the 0.2 alpha, and release 0.1 is the Inline prototype as it stands.

**Reason.** A change of layout is the owner's to decide and belongs in the register with a deadline, not in the code of a release that is waiting to be closed.

## 18 November 2026: the owner's four rulings on the proposed margin editor

**What he saw.** The mockup of the proposed editor, in its quieter look.

**His rulings.** (1) The strip of rows shown when an output is unfolded ("18,412 rows in dataset(wages), −2,841 where …") is not wanted. (2) A script opens whole, with no output unfolded. (3) The controls *Notes · As written · All open* are replaced by *Notes · Fold all · Unfold all*. (4) The notes pane is to be narrower and to say less: no distribution, no R² and the like; dimensions and type are right.

**How they were taken.** An unfolded output holds what the engine said and printed for its statement and nothing the interface adds; the rows stay in the Models place. Every output is folded when a project is first opened. **Notes** shows or hides the margin; **Fold all** and **Unfold all** act on every output. The margin is 300 pixels, from 500, and a note holds a name, a type and dimensions, with a warning's code. Two readings were taken and are put to him: "Notes" as showing or hiding the margin, and "the left pane (note)" as the notes margin, which stands at the right of the code. He confirmed both the same day ("Yes, both"): **Notes** shows or hides the notes column, and the column stays at the right of the code.

**Where.** Both looks of the mockup, their screenshots, version 0.3 of `zemp_lite_margin_editor_specification.md` (Appendix D; 0.2 kept beside it) and the review page, all in `~/dev/handbook/zemp-lite-margin-editor/`. The note for the register carries them.

**What they make simpler.** The engine need not write a one-line headline for every function, and no term has to head a fit: a result's type and dimensions are enough, and it has them.

**Still open.** Whether the margin editor replaces the Inline layout at all. These are rulings on a proposal, and nothing in this repository's code or specification was changed.

**Reason.** The owner's rulings of 18 November 2026.

## 18 November 2026: the quiet look adopted for the proposed editor; variables shown and hidden in Data; a list of plots in Plots

**The owner's rulings.** "Adopt the quiet look for the margin editor. Add hide/show capabilities of frames variables in data page. Plot page should contain something like list of plots at the left pane which can be hide."

**How they were taken.** The quiet look is the look of the proposed margin editor (decision R11 of its document). The mockup is now drawn in it alone, as `zemp-lite-margin-editor-mockup.html`; the earlier look is kept unchanged as `zemp-lite-margin-editor-mockup-earlier-look.html`, and the screenshots of each are in `screenshots/` and `screenshots-earlier-look/`. In Data, each variable of a frame has a box in the left pane that shows it in the grid or hides it, with Show all, Hide all and a field to find a variable; a column's header and the inspector can hide it too; hiding is view state, kept for each frame, and a hidden variable stays in every result and export. In Plots, the plots of the run are listed at the left with a small picture, a name, a line and a kind, the console line's plots apart as not in the script; choosing one shows it alone with what the engine drew. In both places the list folds away with "‹ Hide". One reading was taken: "frames variables" as the variables of a frame; the Data list can also be hidden in case the list of frames was meant.

**Checked.** In the test browser: a variable hidden and shown by its box, by the keyboard (the focus staying on the box), from its header and with Show all and Hide all; hiding kept apart for each frame; both lists hidden and brought back; no page wider than its window. Every pair of a text colour and its ground in the quiet look reaches 4.5 to 1 in both themes; the one pair that did not (the operator colour on an edited line, 4.40) was mended by giving edited lines the design guide's lighter tint (now 4.64).

**Where.** `~/dev/handbook/zemp-lite-margin-editor/`: the mockup, 27 screenshots, version 0.4 of `zemp_lite_margin_editor_specification.md` (sections 8.2, 10 and 14; Appendix D; 0.3 kept beside it) and the review page. The note for the register carries them.

**Still open.** Whether the margin editor replaces the Inline layout (R1). If it does, the design guide's section 9 on Zemp Lite is brought into line with the quiet look, by the owner's word since the guide is his. Nothing in this repository's code or specification was changed.

**Reason.** The owner's rulings of 18 November 2026.

## 18 November 2026: five refinements of Zeff's diagram plan, passed to the register

**The owner's question and word.** What plan would be best for Zeff for SEM path diagrams, causal diagrams and flowcharts. He was told the plan he decided on 11 November is the right one (#121, with #118, #119 and #122, from his proposal `docs/proposals/zeff_diagrams.md` in the Zeff repository): one deterministic layout engine of Zeff's own for causal graphs (`g.plot()`, 0.10.0), the script's pipeline (`zeff graph`, 1.1), flowcharts and sample flows (`diagram { }`, `sample_flow`, 1.2) and SEM path diagrams (`m.plot()`, `fit.path_plot()`, 1.12), with positions in the script for export. Five refinements were suggested; he said: "Yes, write them up."

**The five.** (A) The layout engine built in stages, each with the release that first needs it: layered layout and curved edges at 0.10.0, cycles, orthogonal routing and groups at 1.2, the SEM templates at 1.12. (B) One graph form (nodes, edges, groups, ports, with stable names) under every diagram, kept in the plot's scene, so the viewer, the table view, the text forms and the Mermaid and DOT exports are written once. (C) Layouts tested against known figures (dagitty's examples, the Holzinger–Swineford CFA, Bollen's Political Democracy model, a CONSORT trial, a sample flow of `wages`) for crossings, overlaps and the smallest text, with Graphviz run in the tests only as a yardstick, or fixed targets if the owner wants nothing EPL even in tooling. (D) Zemp Lite's Copy as Zeff (#114) extended to dragged positions, as a `layout:` grid on the clipboard, since Lite has no Add to script. (E) Statistical guard rails written into the diagram rules: no edge ever drawn because the data suggest it; stars only beside an estimate in `path_plot`; with #158, `mi:` off by default and non-significant paths shown kept where they are.

**Where.** The register is edited in the Zeff repository, never from here, so the five were left, in the register's form, as `zeff-diagrams-refinements-for-the-register.md` in the shared notes folder, for a session opened there.

**Reason.** The owner's word of 18 November 2026. None changes a decision taken; each is his to decide when it stands in the register.

## 18 November 2026: the diagrams shown in a mockup

**The owner's request.** "How can we visualise them in Zeff? Show in mockup", of the causal graphs, SEM path diagrams and flowcharts of Zeff's diagram plan.

**What was made.** A mockup in the quiet look, `zemp-lite-diagrams-mockup.html` in `~/dev/handbook/zemp-lite-margin-editor/`, with 15 screenshots and its sources. A script makes a sample flow (`m.sample_flow()`), a causal graph (`dag { }`, its adjustment sets, its implied independencies tested on the 2019 rows, the check of a fit against it, `g.plot()`), a research model (`diagram { }` with a moderation arrow onto an arrow) and Bollen's Political Democracy SEM (`model { }`, `m.plot()`, `fit.path_plot()`). Each diagram unfolds under its statement; in Plots each has its own panel: the paths between exposure and outcome traced one at a time, the identification in a sentence, the tests with their intervals, the warnings W0510 and W0511 as the Language Reference words them; for the SEM, standardised and raw estimates, the indirect effect traced and decomposed, R², and the fit.

**What is real, and what is not.** The sample flow's counts are the released engine's; the tests were computed with R on the shipped data; the SEM is lavaan 0.6.21's fit, the reference Zeff's `sem` is held to. Every diagram is drawn by the mockup in the layout decision #121 plans, since the engine draws none before 0.10.0 (causal graphs), 1.2 (flowcharts) and 1.12 (SEM); each note in the script carries its release.

**Two findings,** passed with the mockup to the note for the register: the graph is contradicted by two tests on `wages`, and the mockup draws no arrow for it; and three implications cannot be tested on `wages`, since `exper` is `max(0, age − educ − 6)` in every row, which #158's print should say rather than print a number.

**Reason.** The owner's request of 18 November 2026. Nothing in this repository's code or specification was changed.

## 18 November 2026: the diagrams joined into the margin editor mockup

**The owner's request.** "Add the diagrams to the margin editor mockup."

**How.** The project in the mockup now has two scripts: `main.zeff`, as before, and `diagrams.zeff`, the script of the diagrams mockup (a sample flow, a causal graph, a research model, an SEM). The script's name in the top bar is a menu of the project's scripts, and the mockup's strip has a switch for them. Each diagram unfolds under its statement like any output, and Plots lists the plots of both scripts, each under its script's name, with each diagram opening its own panel: paths traced, tests, the check, the effect decomposition, the view-state switches and the edge list. The numbers stay real: the engine's counts, R's tests, lavaan's SEM. A second script was chosen over adding the diagrams to `main.zeff` because the check of a fit against the graph needs a fit whose terms are all in the graph, and the fits of `main.zeff` hold `exper2`, which a causal graph does not name.

**Where.** `~/dev/handbook/zemp-lite-margin-editor/`: the mockup and its 37 screenshots, version 0.5 of the document (section 10.1 and Appendix B; 0.4 kept beside it) and the review page. The diagrams mockup on its own is kept.

**Reason.** The owner's request of 18 November 2026. Nothing in this repository's code or specification was changed.

## 18 November 2026: Paper, the place for writing, in the proposed editor

**The owner's question and word.** How a Typst editor and live viewer could be added, named "Paper". He was reminded of his ruling of 13 November (decision #141: papers are written in Markdown, `.zmd`, with Typst underneath for the PDF) and offered two readings: (A) Paper edits `.zmd` by default and also opens and edits `.typ` files (templates, raw Typst blocks, or a paper written in Typst by hand), the page always set by Typst; (B) Typst as the writing format, which would reverse #141. He chose: "Yes, as recommended", option A, and that Paper be added to the mockup.

**What Paper is, as proposed.** A fifth place in the top bar (Script · Data · Models · Plots · Paper): an outline and the paper's files at the left, which can be hidden; the source in the middle; the page at the right, as Typst sets it, redrawn as it is typed; clicking the page finds the source, and the cursor's place is lit on the page; checks as you type (a name not in the run, a citation not in the `.bib`, a broken cross-reference, a stale value, a number typed by hand that matches a result). Numbers come from the engine's chunks and their cache, never from Paper. Lite has all of it; Studio adds the Document settings dialog of #124.

**When.** The live preview of `.typ` files once the Typst library passes the measurement of Zeff 0.8.0, step 21b (licences, identical PDF bytes, size against the browser bundle's limit); the `.zmd` paper with its chunks after 1.0, as #141 places it.

**Reason.** The owner's ruling of 18 November 2026. Nothing in this repository's code or specification was changed.

## 18 November 2026: Models withdrawn from the proposed editor

**The owner's question and word.** Whether the proposed margin editor needs its Models place (decision R5 of the proposal, which had recommended keeping it in two steps). He was advised to drop it: it repeats what `report()` already prints, unfolded in the script and in a paper's Table 1; what a viewer shows never reaches an export; it needed engine work for one screen; and it invites causal readings of coefficients that change across columns. He answered: "Yes, as recommended".

**What follows, as proposed.** The places are Script, Data, Plots and Paper. What Models offered goes where it reaches the script, the exports and the paper: fits side by side stay with `report([...])`; whether columns can be compared (a different outcome, estimator or sample) becomes a note printed by `report()` itself, in its table's footer; one coefficient across fits on one scale becomes a coefficient plot of several fits, `coef_plot([m1, m2, m3])`, beside the existing `fit.coef_plot()`; the rows from the data to the estimation sample stay with `fit.sample_flow()` (#121, at 1.2). The two new pieces are written up as proposals for a Zeff session to enter in the register, each the owner's to decide, with 0.10.0 recommended, the release at which #141 moves `report()` into `publish`.

**Reason.** The owner's ruling of 18 November 2026. Nothing in this repository's code or specification was changed.

## 18 November 2026: the margin editor adopted as the editor of Zemp Lite, from the 0.2 alpha

**The owner's question and word.** Whether the margin editor could be built before release 0.1 is closed. He was advised not: 0.1 is built and frozen, waiting only on his trial; the editor is not yet in the specification, which is frozen (#40), and no work is pulled forward into a release whose row does not hold it; and its first step rests on what Zeff 0.8.0 brings (the statement ranges, built there at step 8b; each result's type and dimensions; the run record). He was offered instead to adopt it now as the editor of the 0.2 alpha, and answered: "Yes, adopt it". This settles R1 of the proposal, option (a).

**What it means.** The margin editor of `~/dev/handbook/zemp-lite-margin-editor/zemp_lite_margin_editor_specification.md` (version 0.8) is the design of Zemp Lite's editor, in place of the Inline layout of the Zemp Specification, section 5. Its steps 1 and 2 (section 22 of the document: the margin, notes of type and dimensions, outputs unfolded under their statements, Notes · Fold all · Unfold all, a refused script, the run record, the list of what the run said, Plots with its list; then ⌘↵ and Run to here) are the editor of the 0.2 alpha, on Zeff 0.8.0. Every later piece comes at the release it rests on, as the register places it: nothing is pulled forward, and release 0.1 is closed as it stands. The decisions the document leaves open (R2, R4, R8, R9, R10, R12, R13) stay open, and the engine items it asks of the Zeff side (section 12) stay proposals until that side agrees them.

**How it becomes normative.** A session in the Zeff repository enters the ruling in the register (`docs/spec/zeff_open_decisions.md`) as decided, from the note left for it; the Zemp Specification's sections 2, 5, 7, 8 and 15 are amended when the 0.2 alpha is planned, each change logged in `docs/spec_changes.md` then; and `docs/spec/` here is refreshed from the Zeff repository at the start of the 0.2 alpha, as step 1 of a release does.

**Reason.** The owner's ruling of 18 November 2026. Nothing in this repository's code or specification was changed.

## 18 November 2026: closing release 0.1

**The test of a plot in a narrowed pane waits for the last redraw.** Twice on GitHub, in WebKit, on 17 November and with no change to the code between, `tests/browser/figure.spec.ts` ("when its pane is made narrower a plot is laid out afresh…") found the figure shown at a size other than its place's. The test narrows the pane by twelve key presses, each of which asks for a figure, and it measured as soon as the figure was narrower by 100 pixels, which an earlier figure can be for a moment before the last one arrives. **Choice:** it now waits until the figure is both narrower and at the size of its place, then makes the same checks as before. Nothing is weakened: the checks are unchanged, and a figure that never reached its place would still fail. Run five times over in both browsers here (60 of 60), then in the whole routine.

**The version and the tag.** The version is 0.1.0 in `package.json`, `package-lock.json`, `worker/Cargo.toml` and `worker/Cargo.lock`, and the tag is `v0.1.0`, in the form of Zeff's tags (`v0.7.0`), since npm and cargo both need three numbers; the release is named "Zemp Lite 0.1 — The prototype", as the Zemp Specification's row names it. **The GitHub release is marked a pre-release:** the prototype is not meant for others, as its notes say, and the alpha is the first release that is.

**The reviews of the release.** No open decision was due at Zemp 0.1. Of the risk register, R4 (the limits of the browser build) was measured: 2,549.7 kB compressed of 5 MB, a cold start of 54.4 ms of 1,000 ms; its early warning was not seen. The intermittent page loads of WebKit on GitHub's machines are noted for the Zeff sessions, who keep the register, in the shared notes folder.

**Reason.** The testing handbook, section 2.4, and the closing of a release in the standing instructions.

## 18 November 2026: finding a fault, compared and written up for the register

**The owner's question and word.** How Zemp Lite's debugger compares with RStudio, Jupyter and VS Code, and what the margin editor should add. Given the comparison and six proposals, he said: "Yes, write them up."

**The comparison, in brief.** Zemp Lite 0.1 has no debugger. #76 (decided 6 November 2026) gives the traceback through functions (in Zeff 0.7.0), and Run to here and the loop inspector (at the 0.2 alpha); it rejects breakpoints and stepping. Because a binding never changes and every result is kept, the margin editor shows after a run what a debugger shows by stopping at a line, for every line at once. It is ahead of the three on staleness, on the rows lost at each step, on comparison with an earlier run and on determinism. It is behind on looking inside a function call, stopping a loop at the pass that goes wrong, and evaluating an expression where a failure happened. Rated out of ten, as a judgement and not a measurement: RStudio 7, VS Code 7.5 (for Python; less for R), Jupyter 5, Zemp Lite 0.1 3, as planned 7.5, with the proposals 9.

**The six proposals.** (A) The error's trail, shown in the margin of every file it passes through. (B) Run to here in the gutter as well as in ⌘K, as #76 decided. (C) The passes of a block searched (the first pass that failed, warned or kept no rows), and a field of `iterate`'s state drawn across them. (D) A pass or a call opened by replay, with a note on every line: possible because a Zeff function is pure, does not recurse and draws random numbers by its place. (E) The console line inside an opened pass or call. (F) Where the time and memory went, in the run record. Not taken: breakpoints, stepping, changing a value while stopped, and watch expressions.

**Where they are.** Section 7.16 of the margin editor document, now version 0.9, with the engine items C22 to C27 and the decisions R14 to R19, in `~/dev/handbook/zemp-lite-margin-editor/`. The mockup has a third script, `by_year.zeff` with two functions, shown on the released engine's output in screens 48 to 57; nine of them are on the review page. The register is edited in the Zeff repository, never from here, so the six entries were left, in the register's form, as `zemp-lite-finding-faults-for-the-register.md` in the shared notes folder.

**A correction found on the way.** Section 22 of the document, version 0.8, had left the loop inspector out of the 0.2 alpha's step 2, although #76 places it at the 0.2 alpha; version 0.9 puts it back.

**Reason.** The owner's word of 18 November 2026. Nothing in this repository's code or specification was changed; none of the six belongs to release 0.1, and each is the owner's to decide when it stands in the register.

## 20 November 2026: polynomial terms, an addendum to open decision #164 written for the register

**The owner's question and word.** Whether Zeff has R's `I(x^2)`, `poly(x, 2)` and orthogonal polynomials, and how it fits a polynomial regression; then: "Write up poly(x, k) for the register."

**What was found.** The register already holds the entry, #164 (17 November 2026): `poly(x, degree:, raw:)` in `regress` at 1.2, recommended, deadline 1.1. So it was not proposed again; the note `zeff-poly-addendum-to-164-for-the-register.md` in the shared notes folder adds what #164 leaves open: (1) the names of a `poly` term's columns, which #164 gives as R's although the owner's ruling of 23 October 2026 names the `poly` contrast's columns `var=linear`, `var=quadratic` (recommended `poly(exper)=quadratic`, the degree left out so that fits of different degrees line up in `report`); (2) the rows and weights the basis is orthogonal on (the estimation rows, unweighted; R differs when rows are dropped); (3) for `margins` at 0.9.0, the slope taken through `exper` and `exper^2` together, as Stata's `margins` and R's `marginaleffects` do; (4) two messages an R user meets today, `I(exper^2)` answered "did you mean `PI`?" and `poly(exper, 2)` given no route, with Z0103's help to show the Zeff form at 0.9.0.

**Reason.** The owner's word of 20 November 2026. The register is edited in the Zeff repository, never from here; nothing in this repository's code or specification was changed.

## 21 November 2026: release 0.2 opened, and the owner's answers (release 0.2, step 1)

**The owner's word.** "Go, as recommended", to the checklist of `docs/releases/0.2.md` (19 steps) and its seventeen questions. So, each as recommended there:

1. **#27, a Zemp server.** None before 1.0. The alpha sends nothing to any server but the host's cookie-free count of visits (#116); section 13 of the Zemp Specification stands as written; the question returns with the paid tiers (#35, #36).
2. **#37, the trademarks.** The alpha is built and hosted now; its address is announced (the website, colleagues, the article) only once the applications for "Zeff" and "Zemp" are filed in the owner's home jurisdiction, which is his to do.
3. **The reader test.** One test serves Zemp 0.2 and Zeff 0.9.0: five to eight readers the owner chooses, about ten short scripts each in the hosted alpha, asked what each model does; the scripts and the form are prepared at step 19, the owner runs it, and what is misread is fixed or recorded before "Release 0.2".
4. **#74, the Help pane.** Yes: a Help panel at the side of the Script place, hidden until asked for (F1, ⌘K, **Explain**), following the function under the cursor unless switched off, showing a code's explained page; the engine's pages, shipped with it (step 11).
5. **#75, the data viewer.** Option A in the Data place: a grid drawn as scrolled, the first column frozen, a statistics header per column asked of the engine, search with matches marked, a live row count under a filter, copying a range, variables shown and hidden; read-only, with **Copy as Zeff** (#114). Option A's Objects tree is replaced by Data's list of frames, each by its statement (steps 13 and 14).
6. **#177.** Zemp Lite is not a notebook: no cells; the statement is what is run, shown, folded and marked stale.
7. **The example.** The Scratch project holds the margin editor's script on `wages` (Appendix A of its document) and a second script, `instruments.zeff`, from Zeff 0.8.0's sample `instruments` on `staff` (step 18).
8. **R2.** Panes is kept for this release beside the margin editor, as 0.1 built it, and reviewed at 0.3.
9. **R8.** The keys of the editor's document, section 15: ⌘↵ the statement, ⌘⇧↵ the script, ⌘K everything, ⌥↵ open or fold a result, F1 help, ⌃` the console; every action also in ⌘K.
10. **R9.** ⌘↵ runs the statement with every statement it reads; at 0.8.0 those run again from the top, since a browser keeps nothing between runs. The Engine Specification's paragraph "Running code interactively" (section 12) is to be amended to match (below).
11. **R4 (#178).** A section begins with a comment written `// # Title`, `// ## Title` a level below. Only the form is decided here; the outline comes with #178.
12. **R14 (#183).** The error's trail at this alpha (step 8).
13. **R15 (#76).** *Run to here* shown on resting over a statement's line number, beside the command in ⌘K (step 7).
14. **#181.** **Run from here**, in ⌘K, at this alpha (step 7).
15. **R19 (#187).** Each statement's time and each frame's memory in the run's facts at this alpha (step 8); the times measured by the interface between the engine's messages until the engine reports them.
16. **R16 to R18 (#184 to #186).** Yes to each, before 1.0, at the Zeff release that gives the engine pieces; not built here.
17. **The `poly` addendum (#164, #195, #196).** The columns named `poly(exper)=quadratic`; the basis orthogonal on the fit's rows, unweighted; `margins` taking the slope through `exper^2`; Z0103 showing the Zeff form for `I(...)` and `poly(...)`. Zeff's to build, at 0.9.0 and 1.1.

**Where the answers go.** The register is edited in the Zeff repository only. Answers 1, 2, 4 to 6 and 8 to 17 settle entries of it (#27, #37, #74, #75, #164, #176 to #178, #181, #183 to #187, #195, #196), and answer 10 asks for an amendment of the Engine Specification; all are passed, with the amendments of the Zemp Specification, in the note `zemp-lite-0.2-amendments-and-answers-for-zeff.md` in the shared notes folder, for a Zeff session to enter and log in `docs/spec_changes.md`. This copy is refreshed again when they stand there. The build follows the answers meanwhile, as 0.1 followed #146 before section 5 carried it.

**The specification.** `docs/spec/` is brought to the Zeff repository's commit 08a18a4 (20 November 2026): the release 0.8.0 (the tag `v0.8.0`, commit 6bfa6c5), the closing of #18 and the moving of #151 and #31 to 0.11.0 (1614f7c), and the notes of Zemp Lite entered as #174 to #197 (08a18a4). Each file was taken from the commit, not from the working folder, and compared with it byte for byte. Of the Zemp Specification only the counts of section 11 and the 1.1 row of section 15 changed; the 0.2 row and sections 5, 7, 8 and 10 are as the checklist read them, so no step moves.

**The two tags** keep the meaning of 0.1 (15 November 2026): **[engine]** a hard or foundational piece, **[function]** interface work on machinery that exists.

**The version** is `0.2.0-dev` in `package.json`, `package-lock.json`, `worker/Cargo.toml` and `worker/Cargo.lock` until the release sets `0.2.0`; the welcome screen says "Zemp Lite 0.2-dev", and its browser test now looks for "Zemp Lite 0.2". The engine stays 0.7.0 until step 2 moves the worker.

**Reason.** The standing instructions for starting a release; the owner's "go" of 21 November 2026.

## 21 November 2026: what Zeff 0.8.0 gives Zemp's worker (release 0.2, step 1)

**How it was read.** At the tag `v0.8.0` (6bfa6c5) of the Zeff repository, through Git alone (`git show`, `git grep`), so that nothing in `~/dev/zeff`, where another session works, was touched.

**The same as at 0.7.0.** The events of a run (`zeff_engine::control::Event`: a statement started with its first line and its number of *n*; finished, or failed; a pass of a loop by its number, about a hundred passes reported for a long loop, the first and last among them; printed text). The compiler (1.99.1), `wasm-bindgen` (0.2.129) and the release profile. `zeff-web` gains only `explain`, `explained_codes`, `report_bug` and `Host::holds`; it still keeps its project to itself, so Zemp keeps its own host in its worker.

**What the worker will take from `zeff-engine`, by step.**

| Need | At 0.8.0 | Step |
| --- | --- | --- |
| Where each statement begins and ends (C1) | `language::outline::statement_at`, `statements_in` (`StatementRange`, a chain one statement); `folding_ranges` for blocks. Not in the run's events, which give the first line: the worker matches the two | 3 |
| Each statement's print at a width (C6) | `Outcome.output.statements` (line, printed text, what it said) at `RunOptions.width` for the whole run; another width is another run | 3 |
| What a statement made (C5) | The name and type of each binding from the checked program; a frame's rows, variables and memory (`output.frames`, `output.memory`). No size for a value that is not a frame: the note gives the type and the first line the engine printed | 3 |
| The check (the **Check** button) | `run::check_in_project`, findings as records with `Diagnostic::to_json` | 4 |
| What a statement reads and makes (C4) | `dependencies::graph`, `needed_by`; no dependency through a file | 4 |
| Results kept between runs (C14), identity and reuse (C2, C3), run records (C12) | Absent until 0.11.0. A run of one statement runs what it needs from the top; staleness follows the graph, a statement that reads a file or draws random numbers counted stale whenever anything above it is edited | 7 |
| The chain of an error inside a function (C22) | In the printed text only (`= in: …, called at …`), which the trail reads | 8 |
| Each pass of a loop (C23) | Its number and line only | 9 |
| Language services | `zeff_engine::language`: completion, signature help, hover, diagnostics, formatting, folding, snippets; the protocol server `zeff-lsp` (`Server::handle`), not yet built for WebAssembly in Zeff's jobs. No semantic tokens before 1.1 | 10 |
| Help pages and explained codes | `help::help_text`; `zeff_web::explain`, `explained_codes` | 6, 11 |
| A frame's rows in pages, and its variables' metadata | `Column::slice` or `Table::take_rows` and `write_ipc`; labels, value labels, missing codes, measure, unit, question, source, contrast in the Arrow's field metadata | 13 |
| Report a problem | `bug_report::build`, as `zeff-web`'s `report_bug` calls it | 16 |
| A plot handed over (C16, #197) | Absent: the `export` route of 0.1 stays, and no dark theme for a plot on screen | — |

**Also found.** Zeff 0.8.0's own worker is 2,782 kB compressed with a cold start of 143 ms (R4). `wage2` is not shipped; the shipped datasets are `wages`, `firms`, `sleep` and `staff`, with nine sample projects. Six functions are renamed at 0.8.0 (`days_between` and `months_between` to `time_between`, `add_days` and `add_months` to `add_time`, `quantile_group` to `bin`, `fill_forward` to `fill_missing`, `running_sum` to `running`, `row_mean` to `row`), and `x == NA` is refused; step 2 holds the examples to them.

**Passed on.** A note for the Zeff 0.9.0 session, which places the items of #175 and #197: `zemp-lite-0.2-what-zeff-0.8.0-gives-an-interface.md` in the shared notes folder.

**Reason.** The checklist's step 1 records the crates, functions and messages each later step rests on, so that no step is planned on an engine feature that is not there.

## 21 November 2026: the browser tests serve the build on a port of their own (release 0.2, step 1)

**What was found.** The routine of step 1 could not start its browser tests: Vite's usual preview port, 4173, was held by the preview of Zemp Lite 0.1 started on 19 November for the owner's own trial, and the tests' server refuses a port in use.

**Choice.** The tests serve the build on 4174 (`playwright.config.ts`); `npm run preview` keeps 4173 for the owner. The owner's preview was left running. Nothing else of the tests changed, and GitHub's runs are unaffected.

**Reason.** A window the owner keeps open must never stop the routine, nor be closed by it.

## 21 November 2026: the worker on Zeff 0.8.0 (release 0.2, step 2)

**Choice.** `worker/Cargo.toml` depends on the same four crates at the commit of the tag `v0.8.0` (6bfa6c55a5584e4e038fc828fef900a30f0856c3). `worker/Cargo.lock` was begun afresh from the lock file of `v0.8.0`, so that every crate the engine links is at the version it was released with: cargo kept all of them and changed only the Zeff crates' source and version. The compiler (1.99.1), the profile, the flags and `wasm-bindgen` 0.2.129 are those 0.8.0 pins, unchanged from 0.7.0. The interface, the worker's tests and the browser tests name the engine 0.8.0, and a new project is pinned to it.

**The released command line,** built from the same commit into `worker/target/zeff-0.8.0/` (not committed), made every expected output of this repository again: the example, the four short scripts, the specification's sample, and the five figure files. All were byte for byte those of 0.7.0, so no kept file changed; `tests/scripts/README.md` says so. `zeff new` of 0.8.0 writes the same `zeff.toml` as Zemp Lite's, to the character.

**Measured.** The worker is 2,785.2 kB compressed with Brotli (2,552.1 kB on 0.7.0; Zeff 0.8.0's own worker 2,782 kB) and its cold start 55.1 ms under Node, against the 5 MB and the second of risk R4. `check:samples` now runs the nine sample projects of 0.8.0, `instruments` among them, all identical.

**A project pinned to 0.7.0.** The engine of 0.8.0 refuses to run it, with its own message (Z0710, "this project needs Zeff 0.7.0, but this is Zeff 0.8.0", advising to change the pin in `zeff.toml`); the interface shows it as the engine words it and rewrites nothing, since moving a project to another engine is "Update engine" (Zemp Specification, section 9.1), which is not in this release. Only the projects of the owner's own trial of 0.1, in the browser on this computer, are pinned to 0.7.0; the hosted alpha starts with none. A known issue of the notes.

**Reason.** The checklist's step 2; the standing rule that Zemp uses the engine through its released versions.

## 21 November 2026: what a run tells the interface (release 0.2, step 3)

**Choice.** The worker passes on what Zeff 0.8.0 knows of each statement, in the engine's own words, through two additions to its messages (`worker/js/host.mjs`):

- **The statements of a text** (`statements`, and as the first event of every run, `ranges`): each statement's first and last line and its kind (`statement`, `function`, `use`), from the engine's outline (`language::outline::statements_in`). A chain written over several lines is one statement. It needs no project and runs nothing.
- **Each statement of a run**, in the outcome (`done.statements`): its range; the name a `let` binds and the type the engine names for what the statement makes (`Frame`, `RegFit`, `Plot`, `Table`, `Nothing`), read from the engine's check of the same text (`run::check_in_project`, the checked program's bindings and expressions); whether it ran; what it printed and said (`Outcome.output.statements`); for a frame bound by `let`, its rows and variables (the kept frames, matched to the `let`s in the order they were bound) and the bytes the engine counts for it (`MemoryNote::Bound`).
- **A run at a width** (`run`'s `width`, characters; 0 for the engine's 118), as `zeff run --width` prints.

**The interface** keeps the ranges in the run as they arrive (`Run.ranges`), from the outcome where none were told, and a result stands under the last line the engine gives its statement (`src/output/place.ts`). The interface's own reading of where a statement ends, by blank lines, comments and the shape of brackets (0.1, 15 November 2026, step 9), is retired with its tests, as the checklist says. A finding of the check on a line no statement holds stands on that line.

**Dependencies.** `zeff-ir`, a crate of the released engine, at the same commit as the other four, for the checked program's types; and, for the native tests alone, `serde_json` at `=1.0.154` (MIT or Apache-2.0), the version Zeff 0.8.0's language server pins, with `itoa` held to 1.0.18 as in Zeff's lock file. Neither adds to what the engine links beyond `zeff-ir`, which it already linked: the worker is 2,789.3 kB compressed (2,785.2 kB at step 2), the 4 kB being the new code, and its cold start 59.5 ms.

**Not chosen.** Asking the interface to fetch the ranges before each run, as a second message: the worker tells them as the run's first event, so no caller can forget them. Matching a frame to its statement by the hash of the statement's text (`Output.frames`): the hash is the engine's internal one, which no public function computes.

**Held by.** Five native tests (the statements of a text, a chain and a function among them; each statement of the example with its name, type, frame and memory, and what each printed put together equal to `zeff run`'s; the example at widths 40 and 80 equal to `zeff run --width`; a failed run and a refused script, with the statements not reached listed as not run). Three message tests (a run's first event and its outcome's statements; the width; the statements of a text without a project). The released command line's output of the example at widths 40 and 80 is kept in `tests/scripts/widths/`. Unit tests of placing by the engine's ranges, of the engine module's width and `statements`, and of the plots of a run.

**Reason.** The checklist's step 3; finding 3 of `docs/releases/0.2.md`; the margin editor's principle that every character is the engine's (P4, P10).

## 21 November 2026: Check, what a statement needs, and a run of chosen statements (release 0.2, step 4)

**Check.** The worker checks a text as `zeff check` does (`run::check_in_project` on the project as the engine holds it) and answers with all the command says, to the byte (held to `tests/scripts/check/`, written by the released 0.8.0 command line), that text in its two parts (what it found; its last line), each finding as the engine's JSON record, and the statements of the text. The project is brought in step with the browser's files first, since the check reads the variables of the data files. In the window, **Check** (top bar and ⌘K) runs nothing: what it finds stands under the lines it names, as a refused run's findings do (16 November 2026), with the results on the page kept; the line above them says "The check of 9:42 found 1 error; nothing was run."; and the status line gives the engine's last line ("checked scripts/main.zeff: no problems") while the script is as it was checked. Where nothing is on the page yet, an error it finds is shown as a refused run is. Warnings and notes of the check alone are not shown under lines: a run shows them, with what the engine said at run time.

**What a statement needs.** The engine's dependency graph (`zeff_engine::dependencies`, built for its bug reports at 0.8.0, step 20a), for each top-level statement: the name it makes, the lines of the statements it reads from, whether it sets the seed, and the lines of everything it needs, itself included (`needed_by`): what it reads, theirs in turn, and every earlier statement that sets the seed. Tested on shadowing (a statement reads the `let` above it), on a seed, and on a chain over several lines. The graph does not see one statement depending on another through a file; step 7 counts such statements on the safe side.

**A run of chosen statements.** A run may name the lines of the statements to run (`only`). The worker blanks every other statement's characters, line breaks kept, so that every line and column of what runs is where it was and the engine's messages name the script's own lines; functions, `use`s and comments stay. Each statement that runs prints and says exactly what it does in the whole run (tested on the example).

**Not chosen.** Writing a text of the chosen statements alone: the engine would then name the wrong lines. Rendering the check in the interface from the engine's JSON records: the records are kept for later screens, and the text shown is the engine's.

**Reason.** The checklist's step 4; Zemp Specification, section 5 ("**Check** and **Run**"); the margin editor's rule that the interface keeps no dependency rule of its own (section 7.9).

## 21 November 2026: the margin (release 0.2, step 5a)

**Split.** Step 5 of the checklist was split, as too large for one session: 5a, the margin and its notes, what the window shows of the results and its view state, which every later screen stands on (`[engine]`); 5b, the quiet look, the top bar, the results bar and the one-line foot (`[function]`).

**Choice.** The margin editor (#174) replaces the Inline layout. The pane (`src/app/MarginPane.svelte`) is the editor of 0.1's Inline, which already drew each result under its statement, with three things added:

- **Notes** (`src/margin/notes.ts`, drawn by `src/editor/margin.ts`): one on the first row of each statement, in a column of 300 pixels at the right of the code, a widget of the editor and never text of the script. A note's words are the engine's: the name a `let` binds; the type the engine names; for a frame, its rows and variables, written as the engine writes a count, thousands set apart by commas (`18,412`); for a statement that is not a `let`, the head of what it printed (`summary`, and after the type, `by female`); a loop's passes; the codes of what it said. The interface adds the state in words (`running…`, `waiting`, `failed`, `not run`, `edited · not run`) and nothing else. A note with something to unfold is a button whose name is its whole text and whether it unfolds or folds; one with nothing is text. A function and a `use` have none, since the engine does not yet name a function's type to an interface.
- **Folding.** A script opens with every output folded. A note unfolds its statement's output under the statement's last line, or folds it; **Notes · Fold all · Unfold all** stand over the script, words with a dashed underline, as view state is marked. What failed, and what the check refused, is always shown; so, until step 5b puts **Stop** in the top bar, is the output of the statement that is running, which carries Cancel.
- **View state.** `.zemp/views.json` gains `version: 2`, whether the notes are shown, and for each script the lines of the statements unfolded; a file of version 1, whose layout is `inline`, is read as the margin editor; and the parts of the file this build does not know are kept as they were and written back. The layout switch reads **Margin | Panes**; Panes stays as built (R2).

**What is unfolded follows the script.** Outputs are unfolded by the line their statement begins on. Before each run, the lines unfolded in the text that ran last are carried to the text that runs now (`src/margin/follow.ts`: the lines the two texts share, in order, by their common start and end and the longest common run of lines between), so that typing a line above a statement keeps its output unfolded. A browser test found this: without it the wrong statement stayed unfolded.

**The tests of Inline** are kept as tests of the margin editor (`tests/browser/margin.spec.ts`): with every output unfolded the page reads as Inline did, so their checks hold after **Unfold all**, the kept text included (`example-unfolded.txt`, the same bytes as 0.1's `example-inline.txt`). The browser tests now name **Run**, **Fold all** and **Unfold all** exactly, since a note's spoken name may hold "not run".

**Reason.** The checklist's step 5a; the margin editor's design, sections 5 to 7.5, 7.10, 11, 16 (a note is a real control, colour never alone) and 18; the owner's rulings of 18 November 2026 (R3).

## 21 November 2026: the quiet look (release 0.2, step 5b)

**Choice.** The window takes the quiet look the owner adopted for the margin editor (18 November 2026; its design, section 14):

- **Colours.** `src/theme/tokens.ts` takes the design's tokens: the window `#ffffff` and `#111216`, `soft`, and two new grounds, `softer` (an unfolded output) and `tint` (an edited line); the hairlines; the ink; the violet's soft ground. Every accent, state and code colour is unchanged. The contrast test now also holds every text colour on the new grounds it may be written on: all reach 4.5 to 1 in both themes.
- **The top bar.** Every control is a word, with a soft ground when pointed at; the layout shown (Margin or Panes) is underlined in violet; ⌘K is a search field, *Search or run a command*, with its key at its end. **Run** is the one filled control, and reads **Stop** while the engine runs (a script, a drawing of figures, the console), which cancels the run as Cancel does; a Check, which cannot be cancelled, leaves Run as it is. With Stop in the top bar, the output of the statement running is no longer shown unasked (5a): its note says `running…` with its passes.
- **The results bar** over the script: at the left the run's facts in words, `run 2 · 9:42 · 9 statements in 32 ms` (runs numbered in the window), or `statement 4 of 9` while it goes, or how it ended; at the right **Notes · Fold all · Unfold all**.
- **The foot**, one line: the state of the page after a coloured dot (green in step, amber edited, red refused), its words always beside it; the console; the keys; the status; the engine.

**Not done here.** The places (**Script · Data · Plots**) in the top bar are step 12's; the run record behind the run's facts is step 8's.

**Held by.** The contrast test; browser tests of Stop (the top bar's Run gone and Stop ending the run, in the margin editor and in Panes), of the results bar's facts and numbering, and of the foot on one line in the design's order with its dot; the earlier tests of the top bar's order, Run the one filled, and no text under 12.5 pixels; the dark ground held to the new token.

**Reason.** The checklist's step 5b; open decisions #146 and #174 (R11).

**A test mended with it.** The run on GitHub of step 5a (6e1f266) failed in WebKit on one test, "in a private window, where the browser keeps nothing…": it read the example's results in the margin editor in a window of ordinary height, where the editor draws only what is near the window, so the outputs far down the script were not on the page. The test is of a private window, not of the editor, so it now reads the results in Panes, where every output is on the page; its checks are unchanged. The margin tests' helper that runs and unfolds now waits until every output is drawn before the page is read.

## 21 November 2026: opening a result (release 0.2, step 6)

**The print at the width of its place.** The engine prints its tables at a width in characters (`--width`, never under 40). The margin editor measures how many characters of the print's own font fit across an unfolded output (a hidden run of a hundred characters in JetBrains Mono at the print's size, against the width of the code's column and the notes' less the output's edge and padding), and runs the script at that width. When the width changes (the window resized, the code size changed, the notes shown or hidden), the last run's prints are laid out afresh a quarter of a second after the last change, as a figure is redrawn: the text that ran is run again at the new width, and only what each statement printed is replaced, the run keeping its number, its time and what it said; by the engine's determinism the results are the same. A print still wider than its place scrolls sideways inside it. Panes prints at the engine's own 118, as before. Every character shown is the engine's: the browser tests hold every printed line within the width asked, and the worker's tests hold the prints at 40 and 80 to the released `zeff run --width`, byte for byte.

**The header of an output.** In the margin editor an unfolded output stands across the code's column and the notes', on the `softer` ground with a hairline, and has a header: its lines (`line 8`, `lines 12–13`), its time or state, and its actions in words, **Copy as text**, **Open in Plots ↗** for a plot, and **Fold**. What the engine said comes first, then the print or the figure (the design, 7.4); Panes keeps its order.

**Copy as text** puts on the clipboard what `zeff run` prints for the statement, at the engine's own width of 118, whatever the window: where the run was printed at another width, the text that ran is run again at 118 for it. The results bar says what was copied. LaTeX and Word, which the design offers "only where the result has them", wait for the engine's exports of a single result.

**Explain** on each warning and error opens the engine's explained page of its code in place, as `zeff explain` prints it (`zeff_web::explain`, which needs no project; held byte for byte to the released command's page of W0201), and closes it again.

**⌥↵** (Alt ↵ on Windows and Linux) unfolds or folds the output of the statement at the cursor, as the design's keys have it (R8).

**Not done here.** An opened result keeping its height while its statement runs again rests on the reckoned heights of 0.1 and the page held during a run; the print's tables as cells for a screen reader wait for the engine (C7, R10).

**Reason.** The checklist's step 6; the margin editor's design, sections 7.4, 7.13 and 15; open decision #175 (C6), worked round at 0.8.0 by a run at the width.

## 21 November 2026: running less than the script, and what is stale (release 0.2, step 7a)

**Split.** Step 7 was split, as too large for one session: 7a, the machinery of a run of less than the script and the marking of results (`[engine]`); 7b, Run to here and Run from here on it (`[function]`).

**⌘↵ (R9).** In the margin editor, ⌘↵ (Ctrl ↵) runs the statement at the cursor with every statement it needs, as the engine's dependency graph gives them (`needed_by`: what it reads, theirs in turn, and every earlier statement that sets the seed); ⌘⇧↵ runs the script. The whole script is checked first, as Zeff checks before it runs; a refused script runs nothing and shows what the check found. The engine of 0.8.0 keeps nothing between two runs in a browser, so what is needed runs again from the top, the other statements blanked (step 4). In Panes ⌘↵ still runs the script.

**The page after it** (`src/margin/stale.ts`, `merged`): the results the run made, and every other result of the page before, moved to the line its statement now begins on; a result whose statement is gone is gone. Runs are numbered as any run.

**What is marked.** At 0.8.0 the engine can say neither whether it would reuse a result (C3) nor which statements read a file or draw random numbers, which its dependency graph does not see. So the rule is the safe one, as the design asks until the engine answers ("too many marked is safe, too few is not"): a statement whose own text changed is `edited · not run`; every result at or below the line after the first change (a statement changed or added, or where one was taken out) is `stale`, keeping its last value; every result above it is fresh. A comment, a blank line and a statement added at the end mark nothing. The marks are worked out as the script is edited, against the engine's own reading of its statements a moment after the last keystroke, and an output says `edited · not run` or `stale` accordingly. A change of spacing inside a statement is marked as an edit, where the engine would see none: safe, and mended when C3 comes.

**What is unfolded follows the script** through edits, a line changed in place included: it is placed by the nearest unchanged line above it (`placeOf` in `src/margin/follow.ts`), which the marking uses too. A browser test found that without it an edited statement's output folded itself on the next run.

**Asked of the Zeff side.** For exact marks before the cache of 0.11.0: the dependency graph's nodes to say whether a statement reads a file, writes one, or draws random numbers. Added to the note for the Zeff 0.9.0 session in the shared notes folder.

**Reason.** The checklist's step 7a; the margin editor's design, sections 7.8 and 7.9; open decisions #76 and #176 (R9).

## 21 November 2026: Run to here and Run from here (release 0.2, step 7b)

**Choice.** On the machinery of step 7a:

- **Run to here** (#76; R15) runs the statements before the statement the cursor is on, or whose line number is pressed, as the design's table has it ("the statements before the cursor"), so that a reader stops just before a statement to look at what it is given. It is in ⌘K, and on resting over a statement's line number the words *Run to here* appear beside it: a gutter of no width of its own lays a button over each statement's first line number, and the words show while the pointer rests on it. The first statement has none, having nothing before it. The buttons are not stops of the Tab key, one for every statement; the keyboard has the command in ⌘K.
- **Run from here** (#181) runs the statement at the cursor and every statement after it, with what they need; in ⌘K.
- **Run the statement at the cursor** is in ⌘K too, beside ⌘↵.
- Where what a statement asked for needs fails, the run stops there, and the statement's note says `not run · line n failed`, whether or not it had a result before.

**A fault found and mended.** A window is ready before its engine's worker has started, so the first reading of a script's statements (which places the words on the line numbers) could be asked of no worker and fail without a word. The reading now waits for the worker.

**Reason.** The checklist's step 7b; the margin editor's design, sections 7.8 and 15; open decisions #76 and #181.

**A test mended with it.** The run on GitHub of step 7a (ab0746d) failed in Chromium on the margin tests' helper that runs and unfolds: since step 5b it waited for every output of the example to be drawn, but in a window of ordinary height the editor draws only the outputs near the window (three of seven there). The helper now waits until no note on the page is folded, an output is drawn, and their number holds steady; the tests' checks are unchanged.

## 21 November 2026: the run's facts, what the run said, and the error's trail (release 0.2, step 8)

**The run's facts** (R19, #187): a press on the facts of the results bar opens them over the window: the engine, the run's number, time of day and time, whether it was of part of the script; where the seed is set (the statements the engine's dependency graph marks as setting it, each a link to its line); **where the time went**, every statement of the run by the time it took with its share of the run, each a link; **where the memory went**, every frame bound by the bytes the engine counts for it, and those of a parent it keeps alive. The times are the interface's, measured between the engine's messages as in 0.1, until the engine reports them (C26), and the panel says so; the bytes are the engine's (`MemoryNote::Bound`), written as counts with their thousands set apart. A line says that full run records come with Zeff 0.11.0.

**What the run said:** a press on the state at the foot opens every warning, note and error of the run, with its code, its sentence and its line, each a link that takes the cursor there; statistical warnings (W1…) are listed apart under their own heading. The same code is the tag of the statement's note.

**The error's trail** (R14, #183): an error raised inside a function carries, under what the engine said in the failing statement's output, the trail: each link of the chain the engine named (`= in: …, called at file:line:col`), from the script's line to the line that raised it (` --> file:line:col`), each a link to its line, with what the call was given in the engine's words (`src/margin/trail.ts`). The lines the trail names carry notes of their own, what the call there was given or the error raised there, in whatever file of the project they stand in; following a link opens that file and puts the cursor on its line. Nothing is run again. The pass of a loop, which the engine does not yet name, waits for C22. Held to a script of two functions (`tests/scripts/trail.zeff`) and what the released `zeff run` 0.8.0 says of it.

**Reason.** The checklist's step 8; the margin editor's design, sections 7.12, 7.16.1 and 7.16.5; open decisions #183 and #187.

## 21 November 2026: the loop inspector (release 0.2, step 9)

**Choice.** A loop's unfolded output carries its **Passes** (#76; the margin editor's design, 7.16.2): every pass the engine reported, by its number of how many, with its time; a list of up to 20 is shown whole, a longer one by its first three and last three passes with **Show all**. The note of a loop says how many passes it made (`20,000 passes`), and has something to unfold even when the loop printed nothing. In a loop that failed, the last row is the pass the engine stopped at, marked failed, and the output is unfolded without asking as any failure is.

**What 0.8.0 tells, and what it does not.** The engine reports a loop's passes by their number alone, about a hundred of a long loop, the first and the last among them (the head of the list says how many were reported); the time of each is the interface's, between the engine's messages. It tells what a statement printed and said once, at the statement's end, so nothing is shown pass by pass; the loop variable, the rows after each step, the result's type and dimensions and what each pass said wait for the engine (C23), and a sentence under the list says so. *Find the first pass that* and a field drawn across the passes (#184) are not built: they are before 1.0, at the Zeff release that gives C23 and C27.

**Reason.** The checklist's step 9; open decision #76 (the loop inspector at the 0.2 alpha).

## 21 November 2026: the language server in the browser (release 0.2, step 10a)

**Split.** Step 10 was split, as too large for one session: 10a, the engine's language server hosted in the browser with its diagnostics and hover (`[engine]`); 10b, completion, signature help and formatting on it (`[function]`).

**Choice.** The worker hosts the engine's own protocol server, `zeff-lsp` at the commit of `v0.8.0` (its `Server::handle`, which takes one message of the Language Server Protocol and gives the messages to send, as `zeff lsp` serves an editor), over the project the worker holds: a document is named `file:///project/…`. Of the two ways the planning left open, this one keeps the protocol's wording the engine's own, and the engine's language functions are not called one by one here.

**A second worker.** The window has two engines of the same build: the one that runs, and a language engine whose project is a second copy kept in step with the browser's files as the first is (`src/engine/language.ts`), so that completion, diagnostics and hover never wait on a run; a browser test types a mistake during a run of 200,000 passes and sees it underlined at once. Both are ended when the project closes. The price is a second copy of the project's data in memory, which the alpha accepts.

**In the editor.** Each script is opened as a document when it is read and sent whole a moment (150 ms) after the last keystroke; the server's diagnostics, which it publishes after each, are underlined where it places them, with their code, in the margin editor and in Panes (`@codemirror/lint`); resting on a word shows what the server knows of it, as plain text (a function's page, a binding's type and size).

**Dependencies.** `zeff-lsp`, a crate of the released engine; `serde_json` 1.0.154, which it brings, now linked (MIT or Apache-2.0). In the app, `@codemirror/lint` 6.9.8 and `@codemirror/autocomplete` 6.20.4 (for step 10b), both MIT, everything they need already installed. The worker is 2,901.9 kB compressed (2,792.2 kB before), its cold start 53.9 ms (risk R4: 5 MB and a second).

**Reason.** The checklist's step 10a; Zemp Specification, section 5 ("Completion, signature help, hover, live diagnostics and formatting from the Zeff language server"); Engine Specification, section 12.

## 21 November 2026: the specification brought to Zeff c6d55e7, where the owner's answers stand

**Done.** The Zeff 0.9.0 session entered the note of step 1 (`zemp-lite-0.2-amendments-and-answers-for-zeff.md`) in Zeff's commit c6d55e7: the owner's seventeen answers in the register, the Zemp Specification's sections 2, 5, 7, 8, 15 and 17 as written there (the margin editor, the look, Help and the data viewer, the plot list, Paper, the 0.2 row, hosting and no server), and the Engine Specification's paragraph "Running code interactively" (R9). It also places C5, C6, C16 (#197) and C22 at Zeff 0.9.0 and C23 to C27 at 0.11.0, adds to its step 26 the dependency graph's flags asked for at step 7a (whether a statement reads a file, writes one, or draws random numbers), and makes the reader test one test for both releases (its step 45). `docs/spec/` is brought to that commit, each file taken from the commit and compared with it byte for byte; seven files changed.

**What else the copy now carries.** The commit stands on the first steps of Zeff 0.9.0 (among them `glm` and `curve` in the place of `logistic`, `probit` and `roc` in the catalogue and the sample script). They are plans of the engine's next release; this alpha runs the released 0.8.0, which still refuses the specification's sample script with the same words (`tests/scripts/specification-sample.stderr`, re-made by the released command line and unchanged), and the colouring test of that script holds.

**Reason.** Step 1 of the checklist: the copy is refreshed again once the amendments stand in Zeff's copy, which is the normative one.

## 21 November 2026: completion, the usage of a call, formatting (release 0.2, step 10b)

**Choice.** On the language server of step 10a, every offer and every word the server's:

- **Completion** (`@codemirror/autocomplete`) asks the server at the cursor as a word is typed or after a dot: the methods of a value, the options of a call, the names of the script, the variables of a frame, the shipped datasets and the server's templates; each offer makes exactly the edit the server names (its range and new text), shows what the server says it is, and is found by the word the server gives.
- **The usage of a call** is shown over the cursor when a call is opened or an argument begun, from the server's signature help, the parameter at the cursor in bold; it goes when the call is closed, the cursor leaves its line, or Escape is pressed. The server is asked once the edit has been passed on to it, which a browser test found missing at first.
- **Format the script**, in ⌘K, lays the script out by the server's edits, as `zeff fmt` does, as one edit that undo takes back.
- **Tab in the console line** asks the server at the end of the statement being typed, read as if it followed the script; one offer is taken, of several the text they all begin with.
- The server is told the script as it stands before each question, so that it never answers about an older text.

**Not done here.** The colours of code stay those of 0.1's reader until the server gives semantic tokens (Zeff 1.1); quick fixes, going to a definition and renaming are 1.1's (Zemp Specification, section 5). Folding of code, which the server offers, is left for when a script's sections come (#178).

**A fault found and mended.** In WebKit the editor's own Escape takes the key before a handler inside the editor sees it, so the usage did not close; Escape is now heard on the editor's element as it comes in, and goes on to do what it does in the editor.

**Reason.** The checklist's step 10b; Zemp Specification, section 5.

## 21 November 2026: Help (release 0.2, step 11)

**Choice** (#74, as the owner answered it): a **Help panel** at the side of the script, hidden until asked for, with **‹ Hide**. It shows a function's page as `zeff help <name>` prints it inside the project (the project's own module functions first, then the engine's; `help::project_help` and `help::help_text`, held byte for byte to the released command), or a code's explained page as `zeff explain` prints it. It opens by **F1** on a name in the script, by ⌘K (*Help: show*), and by **Explain** on a code in the list of what the run said; Explain under a warning in an unfolded output keeps opening the page in place (step 6). While shown it **follows the function under the cursor**, a moment after the cursor stops, unless *Follows the cursor* is switched off; a name with no page leaves the page as it is. Which name the cursor is on is read from the line's shape (a name followed by an opening bracket, `src/editor/at.ts`); the page is always the engine's. The pages are asked of the language worker, so that a run never holds them up.

**`:help name`** in the console line prints the function's page into the console's drawer, as `zeff repl` does, or the engine's sentence where it has none. `:vars` and `:save` are step 15's.

**Reason.** The checklist's step 11; open decision #74; Zemp Specification, section 5 (the Help row of the table of panels).

## 21 November 2026: the places, and Plots with its list (release 0.2, step 12)

**The places.** The top bar carries the places of the margin editor (its design, section 6), **Script** and **Plots**, the current one underlined in violet and marked as the current page; each is in ⌘K too (*Place: Script*, *Place: Plots*). **Data** joins them at step 13, with its viewer, so that no place is shown before it exists; **Paper** comes with the documents of #141.

**Plots with its list.** The plot viewer of 0.1 is kept (fit or a page's size, compare two to four, pop out, save as SVG, PDF or PNG with the statement that does the same), with the gallery strip replaced by a list at the left: each plot of the run with its small picture, its name, its line and its kind, which is the marks of its layers as the engine's table of what it drew names them (`fit band, points, fit line`; `histogram`); reordering by dragging or with Alt and an arrow, and Compare, as before. **‹ Hide** folds the list away, giving its width to the plot, and *Show the list of plots ›* brings it back; whether it is shown is view state (`plots.list`). Two browser tests of sizes now hide the list before they measure.

**Not built here.** Plots typed in the console line are not yet collected into the list, which the design lists apart; the console's statements are run with the script and their plots are not kept. Resting on a mark to read its row, and hiding a layer, wait for the engine's scene (C16, Zeff 0.9.0).

**Reason.** The checklist's step 12; the margin editor's design, sections 6 and 10; the owner's ruling of 18 November 2026 on a hideable list of plots.

**A test mended with it.** The run on GitHub of step 10b (fae1247) failed on the completion test: Enter was pressed in the moment between one list of offers and the next, as a later answer of the server replaced the list on GitHub's slower machines, and typed a new line. The list was watched here for a second and a quarter and never closed. The test now takes the offer by pressing it, which waits for the offer itself; its checks are unchanged.

## 21 November 2026: Data, the grid (release 0.2, step 13)

**Choice** (#75, option A as the owner answered it; the margin editor's design, section 8): the **Data** place, beside Script and Plots in the top bar, in both layouts, and in ⌘K. At its left, the frames of the last run, each with its rows and variables and the line of the statement that made it (**‹ Hide** folds the list away; view state). At its right, the frame chosen: the engine's own header line of it (`wages · 18,412 rows × 11 variables · panel worker × year`) and a grid with a row number, numbers to the right, the header row and the row numbers with the first variable held in place as it scrolls.

**Every cell the engine's.** The worker gives the rows of a frame of the last run a page at a time (`rows`, 200 rows), each cell written by the engine's own `zeff_core::display::labelled_cell`, as it prints a frame: a labelled value by its label, a date in ISO form, a missing value `NA`, never blank; each variable with its type, its label, its count of missing values and the alignment the engine gives it. The interface formats no value; a test holds a page to what the engine prints for the same frame, cell by cell. `zeff-core`, a crate of the released engine, is added at the same commit for it.

**Drawn as it is scrolled.** The grid draws only the rows near its window and asks the worker for the pages they fall in; a frame of 18,412 rows keeps fewer than 120 rows on the page, and its last row is reached by scrolling. The pages come from the run engine, which holds the run's frames; while a run goes they wait for it.

**Not here.** The statistics header of each column, the variables shown and hidden, the inspector, sorting, searching, copying a range and **Copy as Zeff** are step 14's. The rate of 60 frames a second while scrolling is measured with the others at step 19.

**Reason.** The checklist's step 13; open decision #75; the margin editor's design, sections 8 and 8.1 (what is always shown).

**A test given more time.** The run on GitHub of step 11 (6e89886) failed in WebKit on "the layout chosen is kept with the project": the test reloaded the page half a second after choosing Panes, and the view state, written a fifth of a second after a change and behind any file still being saved, had not yet reached the browser's storage on that slower runner. The tests that reload the page after a change now wait a second and a half; their checks are unchanged. A reload within half a second of a change can lose that change: a known issue of the notes.

## 21 November 2026: Data, the variables shown and hidden, and the inspector (release 0.2, step 14a)

**Split.** Step 14 was split: 14a, the variables shown and hidden and the inspector; 14b, sorting, search, a row count, copying a range, Copy as Zeff and each column's small distribution.

**Choice** (the owner's ruling of 18 November 2026; the margin editor's design, 8.2): under the frames, the list of the frame's variables, each with a box that shows it in the grid or hides it, with **Show all**, **Hide all**, *Find a variable*, and how many are shown (`10 of 11 shown`); a column's header hides its variable with ×; the facts line says how many are hidden, with *show all*. Hiding is view state, kept for each frame (`data.hidden`); a hidden variable is still listed, still chosen for the inspector, and in every result and export, and nothing is written into the script.

**Each column's header** gives its name, its type and its count of missing values (amber where above nought), as the engine reports them.

**The inspector:** choosing a variable (its header or its name in the list) shows its type, label and missing count, and the engine's own summary of it, as the engine prints `frame.summary([variable])` run after the script, the way the console line runs a statement, so that every number is the engine's; with **Hide from the grid** or **Show in the grid**.

**Not here.** A small distribution in each header, which the engine would draw, comes with 14b, beside sorting and search.

**Reason.** The checklist's step 14a; open decision #75; the owner's ruling of 18 November 2026.

## 21 November 2026: Data, sorting, a condition, search, copying and Copy as Zeff (release 0.2, step 14b)

**Choice** (#75, option A; #114; the margin editor's design, 8.2): each column's header has a sort button (↕, then ↑, then ↓, then none again); above the grid, **Keep rows where** takes a Zeff condition, given to the engine on Enter (Escape empties it); **Search the cells** keeps the rows with a cell that holds the text, whatever its case, and marks those cells; the bar says how many rows the view keeps (`2,179 of 18,412 rows`) whenever it keeps fewer or a condition or search is set; **Clear** empties all three. Sort, condition and search are view state, kept for each frame in `.zemp/views.json` (`data.shown`); the script never holds them.

**Done by the engine.** A sort is made by `zeff_columns::sort_rows`, the kernel function `data.sort` itself calls (stable, `NA` last, text by code point). A condition is made by running the statement `wages.where(condition)` after the text of the last run, with only the statements it needs by the engine's dependency graph, as a run of chosen statements is made (step 6): so what the view keeps is exactly what that statement keeps, the engine's note of rows dropped where the condition was `NA` and its error for a condition it cannot run come in its own words (each diagnostic by its first line), and the frame of the run is not changed. The worker holds the filtered frame until the next run; the interface runs the filter again after any run. A search compares the cells as the engine prints them (a labelled value by its label). The alternative, reading the frame back into a second engine, was not open: at Zeff 0.8.0 `import` reads CSV alone, which would lose the frame's types, labels and categories.

**Each header's small distribution, from the engine.** For a number, a date or a time, the counts in the bins of the histogram the engine draws where a script asks for none (`histogram()`, the rule of Freedman and Diaconis, `zeff_plot::bins::Bins`); for a category, a truth value, a text of at most 12 values or a whole number of at most 12 values, a bar for each value by the cell the engine prints for it, as the layer `bar()` counts them (a 0/1 variable with labels reads *male · female*, not a histogram with a gap). The interface draws the bars from those counts and adds no number of its own. `zeff-plot`, a crate of the released engine (Apache-2.0, as the engine is), is added at the same commit; the engine links it already, so the worker grows by nothing.

**Copying a range.** A range of cells is chosen by pressing a cell and letting go over another, or pressing one with Shift; ⌘C (or **Copy 3 × 3 cells**) puts the cells on the clipboard as the engine wrote them, a tab between columns and a line for each row.

**Copy as Zeff** (#114): the statement equivalent to the view, put on the clipboard and never written into the script: a condition and a sort as one expression, `wages.where(year >= 2010).sort(wage, desc: true)`, which prints the frame as the view shows it. In the inspector, a change of type (`let wages = wages.add(educ = to(educ, Float))`, and `category(x)` for a category, as the sample writes it), of a category's contrast (`category(x, contrast: sum)`, as the sample's line 232) and of the labels of a whole-number variable of at most 12 values (`wages.label(union, [0 => "no", 1 => "yes"])`, its codes given with the labels they have). A search and a range of rows are never copied as a statement. Each statement is held, in a unit test, to the cases in `tests/scripts/copy-as-zeff.json`, and the worker's native test runs each case through the engine and holds it to what the view showed.

**Not here.** Sorting by several variables; a condition built by pointing at a cell; the rate of 60 frames a second while scrolling, measured with the others at step 19.

**Reason.** The checklist's step 14b; open decisions #75 and #114; the Zemp Specification, section 2 (the table of what Lite has).

## 21 November 2026: The console line's commands, ⌘↵ into the script, and Panes (release 0.2, step 15)

**Choice** (the Zemp Specification, section 5, the margin editor's paragraph): `:help`, `:vars` and `:save` work as the released `zeff repl` has them, in its words, with the console line's statements (those that ran, which the next statement sees) standing for its session. `:vars` lists the bindings of the script and the console's statements as the engine's checker types them, each name once, lined up, a later `let` last (the worker's `vars`, the engine's own check); only the top level is listed, never a function's parameters or its own `let`s. `:save <path>` writes the console's statements as a script of the project: only a new file, or one it wrote in this window; in a folder that is there; never outside the project (`Z0707`) nor into `.zemp/`. `:help` lists the commands in the form `zeff repl` lists its own; `:help name` gives the engine's page. An unknown command is named in `zeff repl`'s words. Each command takes its place in the console as it is typed and waits its turn behind what runs, so that its answer follows what came before it. A console statement's value is marked *not in the script*.

**`:clear`** is the console line's own: it empties the console and forgets its statements. The specification says it works "as in `zeff repl`", but `zeff repl` of 0.8.0 has no `:clear` and says it does not know it; the correction of that sentence is passed to the Zeff session in the shared notes (it alone edits the specification), with a proposed wording.

**⌘↵ on the console line** copies the statement into the script at the cursor, on the cursor's line where that is blank and on a line of its own after it otherwise, as one edit that undo takes back; the script is shown where another place was, the console line is emptied and ↑ recalls it. A command is never copied. The editor carries out each request once (it is counted, and cleared when made), so a request is never made twice when the editor is drawn again.

**Panes** (R2) keeps the engine's language services as the margin editor has them: the Check findings in its Output panel, hover, completion, the usage of a call and the diagnostics, and now F1 and the Help panel beside the script.

**Held by.** A native test holding `:vars` to what the released `zeff repl` printed for the same statements (`tests/scripts/repl/`); browser tests holding `:vars`, `:save` (four answers, a folder not there and a path outside the project) and the file `:save` writes to `zeff repl`'s, line for line; `:help`, an unknown command and `:clear`; ⌘↵ and undo; F1 in Panes.

**Reason.** The checklist's step 15; the Zemp Specification, section 5; R2 of #176.

## 21 November 2026: Report a problem, and the edition check (release 0.2, step 16)

**Choice** (the Zemp Specification, section 5, the Log's row; section 15's row of 0.2): **Report a problem** builds the bug report of the last run's failure with the engine's own `bug_report::build`, as `zeff report-bug` builds it: the engine runs the script, keeps the failing statement and only the statements it needs, runs them alone to see that they fail in the same way, and writes what went wrong, its version, edition and platform, those statements, the seed, and the schema of the data, never a row. It is built in the worker from the text that ran, and shown whole in a window; **Save the report…** saves it as a file of the user's own computer under the engine's name for it (`main-Z0715-2c0bfa05.md`). Nothing is sent, and nothing is written into the project (the command line writes `.zeff/reports/`; the browser's project is the user's, so the report goes where the user saves it). Where nothing failed, the engine's own sentence says there is nothing to report (its first line: the rest names the command line's flags).

**Where it is offered.** At an internal error (a `Z9…` code, a bug in Zeff), beside **Explain**, in the run's output and in the panel of what the run said, as the specification has it; and always in ⌘K, where it reports a script's error too, as `zeff report-bug` does. The platform is named `wasm32 browser` (the command line names its machine as `aarch64 macos`; the browser's build knows no more of the machine than that). The window is called `ReportWindow`, not a dialog, so that the edition check can go by name.

**Not here.** `--include-data`, `--synthetic` and a result believed wrong (`--line`, `--reference`) are the command line's; a report with the data shrunk waits for a reader's need. An internal error cannot be caused from a script on purpose, so the offer at a `Z9…` code is held by the native test of the report (the engine's own test hook plants one) and not by a browser test.

**The edition check** (the testing handbook, section 1, "Edition builds"; the Zemp Specification, section 3): `tools/check-edition.mjs` follows every import the build reaches from `src/main.ts` and refuses an import of a module of Zemp Studio (`studio` as a part of a package's or a path's name) or from outside the repository, a module whose file or folder name makes it a dialog, a guide or a builder, and a package of Studio's among the dependencies; it names the chain of imports that reached each breach. It runs in the routine after the type check and as its own step on GitHub (`npm run check:edition`), with `tools/check-edition.test.mjs`, which makes each kind of breach on purpose in a temporary project and holds the check to failing it. It was also tried once on this repository: a `src/app/MethodDialog.ts` imported by `App.svelte` failed it, and was taken out again.

**Held by.** Two native tests (the reports of two scripts byte for byte those of the released `zeff report-bug`, kept in `tests/scripts/report/`; an internal error planted by the engine's test hook, reported as a bug in Zeff; nothing to report said); a message test; two browser tests (the report built, shown whole and saved, in both browsers; nothing to report); the edition check's four tests.

**Reason.** The checklist's step 16; the Zemp Specification, sections 3 and 5; the testing handbook, section 1.

## 21 November 2026: The host, made ready (release 0.2, step 17a)

**Split.** Step 17 was split: 17a, everything that needs no account, done now; 17b, the first deployment and its check at the address, which waits for the owner's account, token, address and switch (below).

**The headers** (the Zemp Specification, section 10; #27): `public/_headers`, the file Cloudflare Pages reads, gives every answer `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` (the page is then given the shared memory through which a run is cancelled), with `Cross-Origin-Resource-Policy: same-origin`, `X-Content-Type-Options: nosniff` and `Referrer-Policy: no-referrer`; the built files, named by what they hold, are kept a year as never changing. The preview server reads its headers from the same file, so that every browser test runs under the host's own headers; one source, not two. No content security policy at this alpha: the engine's WebAssembly, its worker and the styles Svelte writes would each need an exception, and the isolation already keeps out what is not served with leave to be embedded.

**The deployment** (`.github/workflows/deploy.yml`): after a green run of CI on a push to the main branch, the build that run tested (kept by it as an artifact) is sent to the Pages project `zemp-lite` with Wrangler, Cloudflare's own tool (MIT or Apache-2.0, at the pinned 4.158.0, the newest at least two weeks old; used by the job alone, never part of the app), which makes the project on the first deployment. The token and the account's ID come from the repository's secrets, which the owner fills himself; without them nothing is deployed and the run says so in a notice. `actions/upload-artifact@v7` and `actions/download-artifact@v8` carry the build from one workflow to the other.

**The checks after each deployment.** `tools/check-host.mjs <address>` fetches the page, every file it names, the worker and the engine's WebAssembly, and the page again as a browser that has it asks (`If-None-Match`): every answer must carry the isolation headers, the "not modified" answer too, and the built files must be kept as never changing; it says what it finds in plain words and fails on any lack. `playwright.host.config.ts` runs `tests/host/` at the address in Chromium and WebKit: the page is isolated, the engine starts and runs the example, and the first start, from the first request to the engine ready, is measured and reported against section 14's 2 seconds; it is reported, not failed on, since a runner's network is not the typical laptop and broadband the target names: the owner's trial at step 19 is the measure of record. Both were tried on the local build: the browser check passed in both browsers (first start 352 and 422 ms here); the header check failed there as it should, for the preview server keeps no built file a year and gives its "not modified" answers no headers, which is what a host can get wrong and the check is for.

**The count of visits** (#116, layer 1; section 13): the host's own Web Analytics of Cloudflare, which keeps nothing in the browser and sets no cookie, switched on by the owner in the Pages project, which then adds its small script to the page; nothing in this repository changes for it. Its script is served with `Cross-Origin-Resource-Policy: cross-origin`, so the isolated page may load it. It counts visits, countries, browsers and kinds of device; section 13's "screen sizes" are counted as the kinds of device it tells apart. `public/counted.html` says what is counted and what is never collected, in the words of section 13, and the welcome screen links it (**What is counted**).

**Reason.** The checklist's step 17; open decisions #27 and #116; the Zemp Specification, sections 10, 13 and 14.

## 21 November 2026: The first visit, the Scratch project's examples (release 0.2, step 18a)

**Split.** Step 18 was split: 18a, the Scratch project's two examples; 18b, the Start screen of a first visit, "alpha", the line below 1,200 pixels and the places of the count and of Report a problem.

**Choice** (the owner's answer to question 7 of this release, "as recommended"): the Scratch project, made the first time it is asked for, holds two scripts. `scripts/main.zeff`, which opens: the returns to schooling on `wages`, the script the margin editor's design is drawn on (its appendix), with its sections begun `// # Sample`, `// # Describe`, `// # Models`, `// # Figure`, the form the owner chose (R4, #178), and a second line saying to press Run and click a note. And `scripts/instruments.zeff`: the engine's own sample project of 0.8.0 on `staff` (an encouragement design, `ivreg`, a weak instrument and the Anderson–Rubin set), as the engine ships it, its first paragraph, which spoke of its own expected files and of the conformance suite, replaced by four lines for a visitor; its last section exports `output/table_iv.tex` into the project, as the sample does. What the released `zeff run` 0.8.0 prints and says for each is kept in `examples/scratch/expected/` (`main.stdout`, `main.stderr`, `instruments.stdout`, `instruments.stderr`); both run without an error (a warning `W1007` of the weak instrument, and notes).

**The tests' example.** The example of 0.1, on which most browser tests are written (their lines, names and figures), moved to `tests/scripts/example/` with its expected outputs, and every test that opens the Scratch project writes it in first (`useExample` in `tests/browser/support.ts`, which puts the cursor back at the start and leaves the editor, as a script just opened is). Re-holding some two hundred checks to a new script would have tested nothing more. The unit and native tests read the example from there; new native and browser tests hold the two scripts a visitor opens to the released command line's outputs, and the design's script to its notes.

**Found on the way.** In WebKit, a run started from the keyboard after typing in the script brings the cursor's line into view, where Chromium leaves the page where the reader is; the test of the reader's place now runs on an editor never typed into (the project closed and opened again), as it did before. A known issue of the notes.

**Reason.** The checklist's step 18; question 7 of this release; R4 of #176.

## 21 November 2026: The first visit, the Start screen (release 0.2, step 18b)

**Choice** (the design guide, section 9, "Start (first visit)"): a browser that has never opened this build opens on the **Start** screen: the mark and "Zemp Lite 0.2-dev" with **alpha** beside it and what it means (the first public preview; much to come and to change; every result the released engine's own); three steps, each with its state: *Fetching the engine* (with how far it has come, `64 % of 15.1 MB`, counted against the file's size as the build knows it, so that a host's compression does not mislead the count: 15.1 MB as the browser holds it, about 2.9 MB as it travels, compressed by brotli), *Checking that it is the engine of this release*, *Starting it in this browser* (`Zeff 0.8.0 ready`); the four promises (it runs here; your data stays on this computer; no account; the next visit opens at once); and **Open Zemp Lite**, which waits for the engine. A step that fails says why, with **Try again**. Once it is opened the browser keeps a note of it (`zemp-started`, the build's version and the engine's digest, in local storage), and the next visit opens straight on the welcome screen; a new engine opens the Start screen afresh. A browser that keeps nothing opens on it each time.

**The check is of a digest, not a signature.** The page fetches the engine's file itself (which also puts it in the browser's cache, so the worker's own load that follows is at once), and holds its SHA-256 to the one the build was made with (`vite.config.ts` reads the worker's file at build time); the worker then starts. Signed releases checked against a key built into the app are section 13's, later; this alpha checks that the file is the one its release was built with, and says no more.

**Alpha, and where things are.** The welcome screen carries **alpha** and the same sentence, with where **Report a problem** is (⌘K in a project; a report built here, read and saved, never sent), and **What is counted** in its foot; the Start screen has the same link. The line below 1,200 pixels (#33) is one component, drawn on the Start screen, the welcome screen and in a project alike.

**Tests.** Every browser test arrives as a returning visitor (`tests/browser/support.ts` puts the note into each test's browser before its pages load, unless the test asks for `firstVisit`); the first-visit tests open in a fresh browser: the Start screen with its three steps done and its promises, **Open Zemp Lite**, the welcome screen, the next visit straight to it, and the example run and read from there; the narrow line on both screens. The check made after each deployment goes through the Start screen and measures the first start up to **Open Zemp Lite** being ready (200 and 336 ms on the local build).

**Reason.** The checklist's step 18; the design guide, section 9; #33; the Zemp Specification, sections 13 and 14.

## 21 November 2026: The close, prepared (release 0.2, step 19a)

**Split.** Step 19 was split: 19a, what needs neither the host nor the owner, done now; 19b, the pre-release routine on the hosted alpha, the reader test and the owner's trial, after step 17b.

**The reader test** (the testing handbook, section 2.4, item 4; question 3 of this release, "as recommended": one test serving Zemp Lite 0.2 and Zeff 0.9.0): ten scripts of two to eight lines on the shipped data (`wages`, `staff`, `sleep`), without comments, since the test is whether the code alone is read as meant. Each is there to catch a misreading a reader could make: a quadratic term, a band of ages, clustered errors, two-way fixed effects, an interaction written `*`, a sum contrast, analytic weights, the side an instrument stands on, a range that includes its end, a test's default, the order of `case` and of `levels:`. All ten run on the released 0.8.0 (each checked by its command line, and held by a native test); the key states for each what it does as the engine's output confirms it (the defaults among them: classical errors where `se:` is not given; Welch's test). `docs/releases/0.2-reader-test/` holds `README.md` (how the owner runs it: five to eight readers, answers written before running, misreadings copied word for word), `sheet.md` (for the readers) and `key.md` (for the owner alone).

**The acceptance tests** of the design's section 21 were gone through one by one in the draft notes. Going through them found two faults, mended in this step: a console mark set at 12 px (the floor is 12.5), and a rule of the console's styles split by step 15, which had taken the indent from what a console statement said. It also named one more writer of the script than the console line's copy: **Format the script**, which writes the engine's formatted text when it is asked for.

**The notes** (`docs/releases/0.2-notes.md`) drafted: what shipped, breaking changes (none), reference versions (the released command line alone), what is left out and why, known issues, the acceptance tests as they stand, the measures, the validation suite; the parts that need the hosted alpha are marked "at the close".

**Reason.** The checklist's step 19; the testing handbook, section 2.4; the design's section 21.

## 21 November 2026: The first deployment (release 0.2, step 17b, first half)

**What happened.** The owner put the two secrets in (a token with *Cloudflare Pages · Edit* alone, made by him; the account's ID). The deployment job, run again on the last green commit, made the Pages project `zemp-lite` and sent the tested build to `https://zemp-lite.pages.dev`. Its check then failed, for two faults of the check, not of the host, both mended in this step.

**The check looks at the project's own address until the alpha's is linked.** The job checked `lite.zeff-lang.dev` alone, which does not exist until the owner links it to the project. It now checks `zemp-lite.pages.dev` on every deployment, and also `lite.zeff-lang.dev` once that name is found, running the browser checks at the alpha's address when there is one and at the project's otherwise, with a notice saying which.

**"Not modified" is asked of every answer that carries a tag.** Cloudflare Pages gives the page itself neither `etag` nor `last-modified`, so a browser fetches the page whole each time (391 bytes), with its headers; the built files carry an `etag`. The check demanded a tag on the page. What it is for (the decision of release 0.1 on WebKit and the worker's script) is that a "not modified" answer, where the host gives one, still carries the isolation headers. It now asks again for every answer that carries a tag and requires each to be answered "not modified" with the isolation headers; an answer without a tag needs none.

**The measures at the project's address** (from this machine, on its own network, through Cloudflare's Mumbai edge): every answer with the isolation headers; the engine sent compressed with brotli, 4.07 MB as it travels (Cloudflare compresses less tightly than the build's own measure of 2.92 MB; risk R4's limit is 5 MB), fetched in 1.1 s; the first start, from the first request to the engine ready, 2.3 s in Chromium and 2.9 s in WebKit against section 14's 2 seconds. It is reported, not failed on, as decided at step 17a: the owner's trial at the address is the measure of record. A next visit fetches only the 391-byte page, the rest being kept as never changing.

**Reason.** The checklist's step 17b; decision #27; the Zemp Specification, section 14.

## 21 November 2026: The showcase of plots (release 0.2, step 18c)

**The owner's answer.** Asked whether a showcase of plots should join the Scratch project in 0.2, before the freeze of step 19b, the owner answered: "yes in 0.2 but it should showcase more complex plots as well." Step 18c was added to the checklist for it.

**The script** (`examples/scratch/scripts/plots.zeff`, 151 lines, 21 plots) uses only the plot functions released by Zeff 0.8.0, each option read from its help page in the released command line: four sections, *Data*, *Basic* (nine quick plots and a line of yearly means: histogram, density by sex, boxes by industry, bars, a scatter with its fitted line, a normal quantile plot, a heat map of correlations, lines by sex, the coefficients of a regression), *Layered* (means with error bars over the years; the rows jittered, the mean by schooling and its 95% band, from a frame of the layer's own; densities with a rug) and *Complex* (facets by industry with free scales on a log axis and the Okabe–Ito colours; tiles on viridis; industries placed by schooling and wage, sized by workers, named by a text layer of their own, with reference lines at the averages and an annotation; a direct legend; boxes without outliers and jittered rows faceted by region; flipped bars; bars in polar coordinates; a step over its area), and *Publication* (a ribbon, lines and points, set breaks, the colours, a title, subtitle, caption and every label, the legend below and the journal theme). A seed is set at the top, since jitter draws at random. The text is the engine's own formatting (`zeff fmt`), so **Format the script** leaves it as it is.

**Each plot stands as a statement of its own**, not bound with `let`: the interface draws the plots a run prints, and a binding prints nothing. The frames the plots are drawn from are bound.

**Three of the industries are left unnamed** in the plot of industries: they sit on the average wage, one over another, and their names cannot be read there; the names are a layer with a frame of its own, which is itself one of the things shown.

**The figures held byte for byte by their digests.** The 21 figures, at the size the interface asks for (567 by 352 pixels), are what the released command line writes for the same text, checked by a unit test that runs the engine's worker build; since the files come to 2.2 MB, their SHA-256 digests are kept (`tests/scripts/figures/plots-figures.sha256`) in place of the files, which holds them as strictly.

**What the browser test holds.** The Output panel prints at its own width, and two of the plots' tables are wider than the 80 columns at which `expected/plots.stdout` was written, so they are laid out otherwise there. The native test holds the whole text at 80 columns and the width tests hold printing at a place's width; the browser test holds what does not depend on the width: the head of each of the 21 plots in order, and every message as the engine words it.

**A Scratch project made before an example came is given it, once** (a mend of the same day, found when the owner's own browser, which had opened the alpha before, showed two scripts). Opening the Scratch project adds each example it has not yet been given, never writing over a file of that name; the examples given are remembered in the browser, so one the user deletes or renames is not given again. Where the browser kept no record (a project made before this mend), the files there stand for what was given. So every visitor of the alpha before this day finds `plots.zeff` beside what was there, and a later release's example reaches them the same way.

**Reason.** The owner's answer of 21 November 2026; the checklist's step 18c; the Zemp Specification, section 15 (the release's examples).

## 21 November 2026: A plot bound with `let` is drawn (release 0.2, a mend found at step 19b)

**What was found.** Timing the alpha at its address found that the first script a visitor opens, the returns to schooling, showed none of its two plots: both are bound with `let` (`let shape = …`, `let schooling = …`), and the interface drew only the plots a run prints. Their notes said "Plot" and opened to nothing, and the Plots place had nothing to show. The same held of any plot a user binds, which is the usual way of writing one.

**Choice.** A statement whose value the engine names `Plot`, which binds a name and printed nothing, is a plot of the run like a printed one: it is drawn by adding `(name).export(…)` after the script, as a printed plot is drawn by its own text; its note opens to its figure and offers **Open in Plots**; it is listed in Plots by its name. Where a later statement binds the same name again, the name at the end of the script holds another value, so that plot is not drawn (a known limit, until the engine hands plots over, C16). Where a later statement that is the name alone prints the plot (`let schooling = …`, then `schooling`), it is drawn there, as it was printed, and not twice. The rule is one function of the run (`boundPlots` in `src/output/run.ts`), read by the list of plots, the notes and the output's blocks alike. Tests: unit (the whole suite), browser (the returns to schooling draws its two plots under their statements, and lists them in Plots).

**Reason.** The design's principle that a plot is shown under the statement that made it (its section 7); the checklist's step 19b, which found it.

## 21 November 2026: Each column of the Data grid is as wide as its header (release 0.2, a mend found at step 19b)

**What was found.** The owner, trying the alpha, saw only the first letter of each variable's name in the Data grid, then an ellipsis. A column was made as wide as its name or its widest cell in characters, but the header also holds the type with the count of NA and the sort and hide buttons, so a column of short values (`year`, `educ`, `union`) left the name about 21 pixels, two or three letters.

**Choice.** A column is the widest of three: its header (the name in the code face at 8 pixels a character, or the type with the count of NA in the text face at 7 pixels a character, whichever is longer, plus 52 pixels for the buttons and the padding), its widest cell of the first page, and 64 pixels; never wider than 280. A name longer than the widest column still ends in an ellipsis, and the whole name shows when the pointer rests on it. Tests: browser (every header of the returns to schooling shows its whole name and its facts, in Chromium and WebKit).

**Reason.** The design's rule that the grid writes what the engine names, in full (the Zemp Specification, the Data place); the owner's report of 21 November 2026.

## 21 November 2026: Three panes on every page, for release 0.2.1; the reader test and the checks by hand move there

**What the owner decided.** Trying the hosted alpha, the owner proposed one layout for every place in place of the margin and Panes; a mockup was drawn twice to his corrections (kept in the shared notes, `zemp-lite-three-panes-mockup.html`), and he answered "looks fine", then "Yes, record it as 0.2.1 and reader test, your checks by hand etc will move to 0.2.1".

**The layout.** Every place has a left pane, the place in the middle and a right pane, each pane opened and closed by its own link in a bar above it (and by its own ×); **Panes** and the **Margin** link go, and each place remembers its panes.
- Script: left, **Project** and **Outline** (sections `// # Title`, subsections `// ## Title`, each going to its line, with **Run section**), each with its own link, both closed at first, open together one above the other; right, **Notes**, open at first, which take over from the Objects panel (removed). **Run** unfolds every output; a script opened stays folded.
- Data: left, **Frames of the run**, open at first; right, **Variables**, closed at first, showing the list (with each variable's box) or, once a column's header or a name is clicked, that one variable's properties in place of the list: label, type, missing count and share, histogram, and for a number N, mean, sd, min, the quartiles and median, max and the distinct values, for a category each level's count and share; "‹ All variables" goes back. Read-only: the change of type, contrast and labels and their Copy as Zeff leave the pane.
- Plots: left, the plots of the run; right, the plot's statement, line, kind and export size; both open at first.
- Help: left, the outline of the help page; right, the related functions (the page's See also, each with its title); both open at first.

**When, and on what.** Release 0.2.1, after 0.2 is released, on Zeff 0.8.0: a Zemp fix needs no engine release (the Zemp Specification, section 15). The statistics are the engine's (`quantile` and `median` are in 0.8.0); until the language server reports sections (#178, Zeff 0.9.0), the interface reads the comments `// # Title` and `// ## Title` itself.

**What moves to 0.2.1.** The reader test, the acceptance tests left for the hand (the keyboard alone, VoiceOver, the print at every size and in the dark theme) and the check by hand of ⌘↵'s timing in Safari; step 19b of 0.2 keeps the rest. 0.2 is then released on the owner's "Release 0.2".

**The register and the specification.** They are edited in the Zeff repository, so the entry, its revision of #174 and #176 R2, the moved reader test (Zeff 0.9.0, step 45) and the amendments of the Zemp Specification's section 15 (a 0.2.1 row) are left as a note for a session opened there: `zemp-lite-0.2.1-three-panes-for-the-register.md` in the shared notes. The checklist `docs/releases/0.2.1.md` is written at "Start release 0.2.1". **Entered on 22 November 2026** as register entry **#203** (Zeff commit `1beefc7`, on the owner's word there), with dated paragraphs in #174, #176 and #178; the Zemp Specification gains the 0.2.1 row of section 15 (the reader test moved to it) and a sentence each in sections 5, 7 and 8; Zeff 0.9.0's step 45 names the hosted 0.2.1. This repository's copy of `docs/spec/` gains them at the next refresh.

**Reason.** The owner's ruling of 21 November 2026.

## 22 November 2026: Release 0.2.1 opened (step 1)

**The owner's answers.** "Go, as recommended", to the plan of `docs/releases/0.2.1.md` and its questions:
1. Help is a place only: F1, `:help`, ⌘K and **Explain** open the Help place at their page; the panel beside the script goes, with the switch that follows the cursor.
2. A run of part of the script (⌘↵, **Run to here**, **Run from here**, **Run section**) unfolds the outputs of the statements it ran and leaves the others as they were; **Run** unfolds every output (#203).
3. A variable's statistics are the engine's own, by its type: for a number N, missing with its share, mean, sd, min, first quartile, median, third quartile, max and the count of distinct values, the quartiles by the engine's default (type 7); for a category, a truth value, or a text or whole number of few values, each value's count and share; for a date or a time N, missing, min, max and distinct values; for a text of many values N, missing and distinct values.
4. The example's opening comment becomes "Press Run: each statement's result opens under it, and a note beside it says what it made."; the reader test's sheet follows the new layout, its scripts unchanged.

**The specification.** `docs/spec/` is a copy of the Zeff repository's at commit 1beefc7 (made when the release was planned, each file from the commit and compared byte for byte), where #203 and the 0.2.1 row of the Zemp Specification's section 15 stand.

**The version** is `0.2.1-dev` in `package.json` and the worker's `Cargo.toml`. The engine stays the released Zeff 0.8.0; none of its crates moves.

**Engineering choices of the plan**, each for the step that builds it: the view state goes to version 3 and reads versions 1 and 2 (step 2); the sections of a script are read by the interface from the comments until the engine reports them at Zeff 0.9.0 (step 3, #178); a test of the Panes layout is rewritten to hold the same behaviour in the one layout or removed with the thing it held, each named here when it is done, none weakened (step 4); the Variables pane's numbers are cells of the engine's print of `summary`, `quantile`, `n_distinct` and `tabulate`, run after the script as the inspector's summary is in 0.2 (step 7b).

**Reason.** The checklist's step 1; the owner's word of 22 November 2026.

## 22 November 2026: The view state at version 3 and the frame of a place (release 0.2.1, step 2)

**The view state.** `.zemp/views.json` is at version 3. It gains `panes`, which says for each place which of its panes are open (`script`: `project`, `outline`, `notes`; `data`: `frames`, `variables`; `plots`: `list`, `about`; `help`: `outline`, `related`), a project opened for the first time having them as #203 rules, and `right.width`, the width of a place's right pane (240 to 560 pixels, 310 at first); the left pane keeps `left.width` (180 to 520, 268). The two widths are the same in every place: the ruling asks that a place remember which panes are open, and one width for each side keeps the code from jumping as the reader goes from place to place. A file of version 1 or 2 is read as before, and the three panes it said where the viewers then kept them (`script.notes`, `data.list`, `plots.list`) are taken from there; a pane a file does not name, or names with anything but a truth value, stands as in a new project. The table of the panes and their defaults is `PANES` in `src/app/views.ts`.

**The frame.** One component, `src/app/Place.svelte`, which every place stands on from this release: a bar (a toolbar named for its place) with the links of the left panes at its left, those of the right panes at its right and the place's own controls between them; under it the left pane, the middle and the right pane. A link is a button that says whether its pane is open (`aria-pressed`) and, on resting over it, what the pane holds; an open pane is a region with its name as a heading and a × that closes it; the edge between a pane and the middle is the separator of 0.1, dragged or moved by the arrow keys. The words of every pane are in one table (`src/app/panes.ts`), from which the link, the heading and the command of ⌘K ("Script: show Project") are all written.

**The Script place on the frame.** Its bar holds **Project** at the left; the run's facts, **Fold all** and **Unfold all** in the middle, which were the results bar over the script; and **Notes** at the right, which was the first of the three controls. The notes stay the editor's own margin, row for row with the code, so the Notes pane is drawn by the place and has its link alone. **Project** is the tree of the project's files that the Panes layout's left panel had, now a component of its own (`ProjectTree.svelte`) which that panel also shows until step 4 removes it.

**Found: in 0.2 the notes stood outside the page.** The margin gives the code a right padding of 300 pixels and stands each note in it. A rule of the editor's look set the code's whole padding by a shorthand and so set that right padding to nothing; the notes were drawn 300 pixels further right, beyond the sheet, where a reader saw none (seen at the address in both browsers: the owner's "there is no notes pane" of 21 November). It has been so since the margin editor was built (step 5a of 0.2); every test asked that a note was there and what it said, never where it stood. Mended here: the look sets the space above and below the code only. A browser test now holds every note of the example inside the sheet and the window, 300 pixels wide, on its statement's row and beginning where the line of code ends, at three widths of window.

**The code's column is 920 pixels, for 100 characters.** With the notes really beside it, the design's 760 pixels of code left 80 characters to a line, and the longest line Zeff's formatter leaves is 100 (Language Reference, section 3): most long lines of the engine's own `instruments` sample would have wrapped. The column is therefore 920 pixels at the usual code size (the line numbers and 100 characters), widening with the code size as before, where the window gives the room; in a narrower window a long line wraps, as it must. A browser test holds a line of 100 characters on one row beside the notes from 1,440 pixels.

**An unfolded table no longer keeps the column from narrowing.** With the right padding in force, the widest printed line set a least width for the code's area, so in a narrowed window the area stopped at the width of the print it held and the engine was never asked to print again narrower. The code's area may now be narrower than what it holds (`min-width: 0`), and the test of the print's width waits for a width the old print does not fit.

**The samples are compared at 118 characters.** The test that holds three sample projects to what `zeff run` prints passed in 0.2 because the place happened to be 123 characters wide, which lays those tables out as 118 does; in the wider column it was 144 and one table of the plots sample was laid out otherwise. The test now gives the window the width at which the place is 118 characters, `zeff run`'s own, and holds that width before it compares anything.

**A test's cursor.** Three tests went to a line by pressing the down arrow, which moves by the rows drawn and so went astray once a long line wrapped. They now set the cursor on the line itself (`cursorTo` in `tests/browser/support.ts`), and wait until the editor marks that line.

**Tests.** Unit: the defaults of #203; a file of version 3 read, a pane wrongly said passed over; the three panes of a version 2 file; the right width within its limits. Browser (`panes.spec`, and `kept.spec` for the reload): the links in order with the controls between them; a link and a × each open and close a pane; a script opened from Project; the edge moved by the keyboard within its limits; each link as a command of ⌘K; the panes and the width kept after a reload; where a note stands.

**Reason.** The checklist's step 2; open decision #203; the Zemp Specification, section 5 ("From Zemp Lite 0.2.1").

## 22 November 2026: The Outline, read from the comments (release 0.2.1, step 3)

**What is a section.** A comment alone on its line, begun at the line's first column, of one or two `#` and then a title: `// # Title` a section, `// ## Title` a subsection (the form the owner chose for #178). Spaces round the marks are passed over (`//# Data` is read), the title is kept as written. Not a section: a comment further in (inside a block), three or more `#`, a heading with no title, a comment after code on the same line, and a heading-like line inside a statement the engine reads over several lines (a call whose arguments are written over lines with a comment between them), which the engine's own reading of the statements (`language::outline`, step 3 of 0.2) tells apart. A text cannot hold one: in Zeff a text ends on the line it begins on (Z0311). A section runs to the line before the next heading of its own level or above, so a section holds its subsections, and a subsection ends at the next heading of any level.

**Where it lives.** One small reader, `src/editor/sections.ts`, with unit tests; it is the only place that knows the comment's form, to be replaced by the language server's sections when Zemp moves to Zeff 0.9.0 (#178, step 28 there). The workspace gives the sections of the script shown (`Workspace.sections`), read again as the script is typed.

**The pane.** **Outline** is the second left pane of the Script place, under Project, closed at first (#203). Each entry is a button with the section's title and line; a click puts the cursor on the heading and brings it to the top of the script's view (the editor's reveal, which the error's trail brings to the middle); the section the cursor is in is marked (`aria-current`), a subsection before the section that holds it. A script without sections says how one is written.

**Run section.** On each entry (a ▶ that shows on resting over the entry or on reaching it by the keyboard) and in ⌘K as "Run section", which names the section the cursor is in and its lines. It runs the statements from the heading to the section's last line with every statement they need, from the top, as ⌘↵ does for one statement (R9; the machinery of 0.2's step 7a, `runPart` with the kind `section`); the other results stay as they were, marked `not run` where they had not run.

**Tests.** Unit: the reader (headings, levels, ends, what is not a heading, a line inside a statement, the section a line is in). Browser (`outline.spec`): the sections of the returns to schooling and of the showcase of plots with their lines, and the engine's `instruments` sample, written in numbered paragraphs, with none; a heading gone to and marked; Run section on a section and on a subsection, each running exactly its statements and what they read; the command of ⌘K; the outline following the script as it is typed.

**Reason.** The checklist's step 3; open decisions #178 and #203.

## 22 November 2026: Run unfolds every output (release 0.2.1, step 5, done before step 4)

**The order.** Step 5 is done before step 4. The tests of the Panes layout hold, nearly all of them, that everything a run printed and said is on the page after **Run**; the one layout shows that only once Run unfolds every output. Done first, step 5 lets those tests move in step 4 by losing the press of **Panes** alone, each still holding what it held.

**Run.** When a run's first statement starts, every line of the script is unfolded, so each output opens under its statement as that statement ends, the running statement's among them (with its passes and **Cancel**, as an unfolded block always showed them); when the run ends, what is kept is the lines of the statements that have an output to open. A script the check refuses changes nothing, as before. A script opened shows no output until it is run: a reload keeps what was unfolded, and a run of part of the script then leaves it as it was.

**A run of part** (⌘↵, **Run to here**, **Run from here**, **Run section**; the owner's answer to question 2) unfolds the outputs of the statements asked for and leaves every other as it was: not those of the statements run only because the ones asked for read them, which at Zeff 0.8.0 run again from the top (a later engine keeps their results and will not run them at all).

**The tests moved, none weakened.** Ten browser tests began from a run that left every output folded. Six now press **Fold all** after the run, or read the notes folded, and hold what they held (a note unfolds and folds; ⌥↵; each statement's note; where a note stands; the showcase's first visit; the loop's passes, which are open already). Three hold more than before: a script opens with no output and **Run** puts a note beside each statement and opens all seven outputs in order; an error stays open through **Fold all**; the statement that has ended has its output open while the loop still runs. One is rewritten: what is unfolded is kept with the project, shown after a reload by a run of one statement, which leaves the kept output open and opens its own. The helper that pressed **Unfold all** after every run no longer presses it, so the tests that hold the page to `zeff run`'s text (statement by statement, at each width) now hold it for Run alone. New: a run of part unfolds what was asked for and no other (⌘↵, Run to here, then Run again); Run section opens its section's outputs.

**Reason.** The checklist's step 5; open decision #203; the owner's answer of 22 November 2026.

## 22 November 2026: A file gone while the project is read no longer leaves the window without its language services

**What was found.** On GitHub a test of **Explain** showed, where the engine's page should be, the browser's own sentence "A requested file or directory could not be found at the time an operation was processed"; a test of resting on a function's name had failed there once before (the close of 0.2). Both ask the language worker, which on its first use is given every file of the project. Listing a folder asked each file for its size, and a file listed can be gone before it is asked: while a file is written, Chromium keeps a swap file beside it for a moment (`name.crswap`). The reading then failed, the language worker's start failed with it, and the failed start was kept: hover, completion, help and explained pages were gone for as long as the window stayed open.

**Choice.** Listing a folder passes over a swap file and any file gone since it was listed (`OpfsFolder.list`). A start of the language worker that fails is tried again by the next thing asked of it, not kept (`Language.start`). Tests: unit (the language worker starts again after a failed start, once).

**Reason.** A fault of the app seen in a test of record; mended where it lies, not by a second try of the test.

## 22 November 2026: One layout (release 0.2.1, step 4)

**What is removed.** The Panes layout and what only it held: `MainPane` (the editor's tabs and the Output panel under the script), `LeftPanel` (the tabs Project and Objects; the tree of files lives on as the Project pane, `ProjectTree`), `OutputPanel`; the **Margin** and **Panes** links of the top bar; the commands "Layout: …", "Output: hide/show" and "Left panel: hide/show"; from the view state, `layout`, the left panel's tab and whether it was shown, and the output's share (a file of version 1 or 2 that says them is read, and they are passed over, not kept). A block of output has one form, the output unfolded under its statement; the option that drew it as a card of the panel is gone. What was opened is still kept as `tabs` with the one shown as `active`, which is what makes a place the place shown; nothing draws tabs.

**The Objects panel** is gone with the left panel (#203): what a statement made is in its note. Its line on the engine and the memory budget is not shown elsewhere; the foot keeps "engine Zeff 0.8.0 · in this browser".

**The tests, each named.** Removed with the thing it held:
- `margin.spec`, "the same run reads the same unfolded in the margin editor and in Panes, and one click switches": there is one layout.
- `workspace.spec`, "the Output panel sits under the script, folds away, is resized and is cleared": the panel is gone; its clearing is kept as a new test, "Output: clear, from ⌘K, takes the run's outputs and its notes off the page".
- `workspace.spec`, "the left panel has two tabs, Project with the files and Objects with what a run left": the tree's half is a new test of the Project pane ("the Project pane lists the files with their sizes, and a folder folds away and comes back"); the Objects half is gone with the tab.

Removed because another test holds the same:
- `output.spec`, "in Panes a run leaves the Output panel where the reader was in it": `margin.spec`, "a run leaves the reader where they were in the script, not at the top of the page".
- `workspace.spec`, "the left panel is resized with the keyboard, inside its limits, and folds away": `panes.spec`, "the edge of the left pane is moved with the keyboard, inside its limits" and "a link opens and closes its pane, and so does the pane's own ×".
- `console.spec`, "Panes keeps the engine's help, F1 opening the Help panel beside the script": `help.spec`, "F1 on a function's name opens its page beside the script, as zeff help prints it".

Rewritten to hold the same behaviour in the one layout: the tests of `output.spec` (each result under its line with its time; the kept text of the example; the four short scripts as `zeff run` prints them; an error with its excerpt and advice; a refused script leaving the results before; the running statement with Cancel; edited output marked; ⌘↵ wherever the focus is), of `check.spec`, `page.spec`, `first.spec`, `samples.spec`, `figure.spec` and `viewer.spec` (Plots reached as a place, not a tab), of `kept.spec` (the file shown and a folded folder come back after a reload; a new project opens with Project closed and Notes open), of `palette.spec` (the commands of the panes in place of those of the layout; every control a Tab stop with the left pane open) and of `workspace.spec` (the top bar without the two links; the left pane's edge dragged; a file opened from Project or ⌘K shown in the Script place). Each now reads the outputs Run unfolds, in a window tall enough for the editor to draw them all (`wholeScript` for the long scripts), and at 118 characters where it is compared with `zeff run`'s text (`placeOf`). Three things the panel alone said are not said elsewhere and left their tests with it: the sentences "found 1 error; nothing was run" and "did not start", which the foot's "not run · 1 error found by the check" stands for, and the fading of results kept under a refusal.

**Two things noted on the way, left as they are.** The words *Run to here* over a line number are not Tab stops, by the decision of 0.2 (the keyboard has the command in ⌘K); the test of the keyboard now meets them, excepts them by name and holds that ⌘K has the command. A plot drawn to fit is at most 1,100 pixels wide, so in a window wider than about 1,330 it no longer fills the Plots place, which lost the left panel beside it; the test of the fit runs at 1,280.

**Reason.** The checklist's step 4; open decision #203 (which settles #176, R2).

## 22 November 2026: Plots on the frame (release 0.2.1, step 6)

**The place.** The Plots place stands on the frame of step 2. Its bar holds the link **Plots of the run** at the left, the viewer's own controls in the middle (the size, **Pop out**, **Save as**), and the link **The plot** at the right; both panes are open at first (#203). The list of plots is the left pane as it was (each plot's small picture, name, line and kind, clicked to show, dragged or moved by the keyboard to reorder, ticked to compare); its own **‹ Hide** and "Show the list of plots ›" are gone with the links in their place. **‹ Script** is gone too: the place is left by the top bar's places, as every place is.

**The plot.** The right pane says of the plot shown: its statement, coloured as the editor colours code (`src/editor/Code.svelte`, on the window's ground, the ground the code's colours are held to); its line, a link to the statement in the script; its kind, as the engine's table of what it drew names it (not said for a plot bound with `let` and never printed, of which the engine printed no table); and the size it is saved at, a page's or, drawn to fit, the size it is shown at. Where the plot's statement is a name alone (`schooling`, printing a plot bound before it), the statement that bound the name stands over it, since that is where the plot is written. While plots are compared the pane says so; with no plot it says that none is shown.

**Tests.** Browser (`viewer.spec`): both panes open at first, each closed and opened by its link and by its ×; the right pane names the statement, line, kind and size of the plot shown, follows the plot chosen and the page chosen, and its line goes to the statement in the script. The tests that hid the list by **‹ Hide** to give a plot the whole place now close both panes by their links; the tests of the plot's own heading read it in the stage, the panes having headings too.

**Reason.** The checklist's step 6; open decision #203; the Zemp Specification, section 7 (the list of plots, from 0.2.1).

## 22 November 2026: Data on the frame, with the list of variables in its right pane (release 0.2.1, step 7a)

**The place.** The Data place stands on the frame. Its bar holds the link **Frames of the run** at the left; the frame's heading, the count of rows kept and of variables hidden in the middle; and the link **Variables** at the right. The frames are the left pane, open at first, as they were listed in 0.2; **Variables** is the right pane, closed at first (#203). The row of the view's own controls (**Keep rows where**, the search, **Copy as Zeff** for the view, **Clear**) stays over the grid. The list's **‹ Hide**, "Show frames and variables ›" and **‹ Script** are gone with the links and the places in their stead.

**The Variables pane shows one of two things.** The list of the frame's variables, as 0.2 had it under the frames (each with its box, *Find a variable*, **Show all**, **Hide all**, how many are shown); or, once a variable is chosen, that one variable in the list's place, with **‹ All variables** back to the list. A variable is chosen by its column's header or by its name in the list, and choosing one opens the pane where it was closed (`Workspace.chooseVariable`). Closed and opened again, the pane is on what it showed. At this step the one variable is what 0.2's inspector said of it (its type, label and count of missing, the engine's `summary`, and the button that hides it from the grid); step 7b gives it its properties.

**Nothing in the pane changes a variable.** The inspector's **Copy as Zeff** for a change of type, of contrast and of labels is removed (#203; the Zemp Specification, section 7, "Variable view", from 0.2.1), with what made the statements (`typeAsZeff`, `contrastAsZeff`, `labelsAsZeff` in `src/data/zeff.ts`), their four cases of `tests/scripts/copy-as-zeff.json` and the branch of the worker's native test that ran them. **Copy as Zeff** for the view (a sort, a condition) stays, with its three cases (#114).

**Tests.** Removed with the thing it held: `data.spec`, "the inspector copies a change of type, of contrast and of labels as Zeff"; in its place, "the Variables pane is for looking: nothing in it changes a variable or offers the statement that would", which holds for a category, a whole number and a variable with labelled codes that the pane has no field, no choice and no copy button, and that the script is as it was. Rewritten: the frames in the left pane, its link closing and opening it, the right pane closed at first; hiding by the box, by the keyboard and from the header, and Hide all and Show all, with the pane opened first; and "the Variables pane shows the list, or one variable in its place once a variable is chosen" (a header opens the pane on its variable, the list comes back by **‹ All variables**, a name in the list opens it again, × closes the pane and its link opens it on what it showed).

**Reason.** The checklist's step 7a; open decision #203.

## 22 November 2026: One variable's properties, each number the engine's (release 0.2.1, step 7b)

**What is asked.** For the variable chosen the interface asks the engine a few statements, run after the script as the console line runs one, in one run (`Workspace.askAfter`), on the frame as the view shows it: its name, or the name kept to the rows of the view's condition, so a condition's statistics are the condition's. Which statements, by the variable's type (`src/data/properties.ts`; the owner's answer to question 3):
- a number (`Int`, `Float`): `data.summary([v])` for N, mean, sd, min and max, and `data.quantile(v, p: [0.25, 0.5, 0.75])` for the quartiles and the median, by the engine's default (type 7);
- a date or a time of many values: `data.min(v)` and `data.max(v)`;
- a variable the engine counts value by value in its column's header (a category, a truth value, a text or a whole number of few values): `data.tabulate(v)`, each value's count and percentage with the total;
- every variable: `n_distinct(data["v"])`, and `data.add(zemp_missing = is_missing(v)).tabulate(zemp_missing)`, from which come the rows, the rows without a value and their share, and for a variable that is not a number its N.

**"Few values" is the engine's reading, not the interface's.** Whether a variable is counted value by value is what the engine already does for the small distribution in its header. So years of schooling, a whole number of thirteen values, which the engine draws as a histogram, has a number's statistics and no table of values; union membership, a whole number of two labelled values, has both. A number of few values is given both, where the answer to question 3 named only the counts: it is a number still, and its mean is worth reading.

**No number is the interface's.** The pane shows cells read out of the engine's prints: a table's columns stand two spaces or more apart, and a cell is shown as it is printed (`18,201`, `27.370`, `17.56`, `1.1`). Nothing is computed, rounded or formatted here; the share of missing rows is the engine's own percentage. Where a print is not the table asked for (a type the engine refuses, a failed run), the pane shows what the engine said, never a blank. The distribution is drawn larger from the same bins or counts as the header's, with the summary's least and greatest at its ends for a number.

**Held to the released command line.** `tests/scripts/properties.json` holds the 24 statements for six variables (a number, a whole number of many values, one of few labelled values, a category, a date, and a number under a condition), each with what the released `zeff run` 0.8.0 printed. The worker's native test runs each through the engine and holds the print byte for byte; the unit tests hold the statements the interface writes to those, in order, and the cells it reads to the kept prints; the browser tests hold every cell of the pane to those prints.

**Found on the way: rows asked under a condition while a run starts.** Asking a frame's rows under a condition is two messages to the worker, the filter and then the rows, and a run that starts between them takes the worker's filter with its frames: the rows answered were then the whole frame's, shown as the condition's. Nothing ran between the two before this step; a variable's statistics, asked when the condition changes, now can. `Engine.rows` makes the filter again and asks again where a run has started meanwhile. Tests: unit (a run between the filter and the rows).

**Tests.** Script (the native test above); unit (`properties.node.test`: the statements by kind, the cells of each print, a name that is not an identifier; `engine.test`: the rows asked again); browser (`data.spec`: a number, a category, a whole number of many values and one of few labelled values, a date, and a number under a condition asked again when the condition changes).

**Reason.** The checklist's step 7b; open decision #203; the owner's answer of 22 November 2026.

## 22 November 2026: Help, a place (release 0.2.1, step 8)

**The place.** **Help** is the fourth place of the top bar, beside Plots, and "Place: Help" in ⌘K (#203; the owner's answer to question 1: a place only). In its middle is the engine's page, a function's as `zeff help` prints it or a code's as `zeff explain` does, whole and unchanged: the place divides the text into its sections so that each can be gone to, and the divided text is still the page, character for character. Its bar holds the link **Outline** at the left, the name of what is open and a field that opens a function's page or a code's by its name, and the link **Related functions** at the right; both panes are open at first.

**The outline** is the page's sections, read from the engine's text (`src/margin/helppage.ts`): a heading is a line of capitals begun at the first column (USAGE, WARNINGS AND NOTES), shown in the outline's case (Usage, Warnings and notes). A click brings the section to the top of the page's own pane; the section in view is marked. A page can hold more than one function of a name (`summary` of a frame and `summary` of a result): the outline then names each by its package over its own sections.

**The related functions** are those the page names under SEE ALSO, in its order and once each, each with what the first line of its own page says it does and its package, asked of the engine as they are listed; a click opens that page. A code's page names none.

**What opens it.** F1 on a name in the script, **Explain** in the list of what a run said, a related function, and the field. The page stays the one open when the reader goes to another place and comes back. **Explain** on a warning under its statement still opens the page in place, there, as 0.2 had it; `:help` in the console line still prints in the console.

**What is gone.** The Help panel beside the script (`HelpPanel.svelte`), its **‹ Hide**, and its switch "Follows the cursor" with what watched the function under the cursor (the owner's answer to question 1); the command "Help: show/hide".

**Tests.** Removed with the thing it held: `help.spec`, "the Help panel follows the function under the cursor, unless switched off". Rewritten: F1 opens the Help place at the page, the text the engine's whole (compared character for character with the kept page, where before it was compared with space collapsed); a code's page from what the run said, and from the field. New: the outline of a page of two functions, a section gone to and marked, the pane closed by its link and its ×; the related functions each with what it does, one opened with its own outline and related functions, a name the engine has no page for. Unit (`helppage.node.test`): the sections, the functions of a page of several, the related functions, the first line, a code's page. `workspace.spec`: the top bar's four places.

**Reason.** The checklist's step 8; open decisions #74 and #203; the owner's answer of 22 November 2026.

## 22 November 2026: The first visit in the new layout (release 0.2.1, step 9)

**The examples' opening comments** (the owner's answer to question 4). `main.zeff` said "click a note to open its result", which Run unfolding every output made untrue; it now reads "Press Run: each statement's result opens under it, and a note beside it says what it made." The showcase of plots said "unfold a note to see its figure"; it now reads "press Run and each figure opens under its statement; Plots shows them all." Each change is of a comment on its own line, so no line of either script moves and what `zeff run` prints and says for them is as it was (held again against the kept outputs); the composed text of the showcase with its exports (`tests/scripts/figures/plots-with-exports.zeff`) carries the same line. A Scratch project made before keeps its own text: an example is given once and never written over. The engine's `instruments` sample is as the engine ships it.

**The Start and welcome screens and "What is counted"** were read again: none speaks of the margin, of Panes, of notes or of a panel, so none is changed.

**A narrow window.** The line shown under 1,200 pixels stands as it is, and a narrow window opens with the same panes as any other (in Script, the notes alone): no smaller layout exists before 1.0 (#33), and a reader in a narrow window closes a pane by its link.

**The visit counter and WebKit.** The report WebKit refuses is made by Cloudflare's own Web Analytics script, added to the page by the host, to Cloudflare's own address; the page's isolation headers are as the host test holds them, and Chromium sends the report under the same headers. There is nothing of this repository's to mend, so it is recorded as it stands: visits from Safari may go uncounted (the notes' known issues; risk R10's measure).

**The reader test** keeps its folder (`docs/releases/0.2-reader-test/`, which a native test reads) and its ten scripts. Its README says that it was made ready at 0.2 and is run on the hosted 0.2.1, and its sheet tells a reader how a script is run there: the Scratch project, the script pasted in place of the one there, **Run**, each result under its statement.

**The draft notes** are `docs/releases/0.2.1-notes.md`.

**Reason.** The checklist's step 9; the owner's answer of 22 November 2026.

## 22 November 2026: The acceptance tests gone through again, and three corrections of 0.2's notes (release 0.2.1, step 10)

**Done.** Each acceptance test of the design's section 21 that 0.2's notes listed was gone through against the one layout and is set down in `docs/releases/0.2.1-notes.md` with the test that holds it now, by its name, or as not built, or as left for the hand at step 11.

**Three things in 0.2's notes were wrong**, and are corrected in a section added at the foot of `docs/releases/0.2-notes.md`, the released text above it left as it was:
1. The notes were not seen in 0.2 (found at step 2).
2. "The list of plots with the console line's apart: holds (`viewer.spec`)". No test held it and nothing in the list of plots knows a plot of the console line; the list holds the plots of the script's run. It is recorded as not built. The notes of the GitHub release of 0.2 say the same wrong thing; changing a published release is the owner's to decide.
3. The measure "⌘↵ on the last statement: 2.2 s in Chromium" took in the drawing of the figures after the run. The run's own facts give a few milliseconds for the statement with the two frames it reads, and the key to "done" tens of milliseconds in both engines, as WebKit's figure had it.

**The check after each deployment** timed ⌘↵ after clicking the last line the editor had drawn, which since Run unfolds every output is no longer the script's last. It now folds the outputs first, holds that the cursor is on the script's last line, holds that a second run was made, and reports the key-to-done time with the run's own time from its facts.

**A page's load is tried once more.** On GitHub's Linux machines WebKit at times never ends the load of a page at the start of a test (twice before 0.1's release, once at 0.2, and twice in the one run of step 8's commit, in tests of the editor's colours and of a pane's edge, neither of which that commit touched). The remedy named at 0.1's release is taken: in the tests' own `page`, a load that has not ended in twelve seconds is asked for once more. Only the load is tried again, never a test; no assertion is changed, and a page that loads and then fails still fails.

**Reason.** The checklist's step 10; the testing handbook's rule that a release's notes say what was validated.

## 22 November 2026: A figure the engine refuses costs itself alone (found reading the hosted alpha, step 11)

**What was found.** Reading the showcase of plots in the hosted alpha, the plot shown in the Plots place said "The engine wrote no figure." The Plots place asks for the thumbnails of every plot of the run and for the plot shown in one run of the script with an `export` for each. One plot of the showcase has twelve panels, which the engine will not draw on a page as small as a thumbnail's (Z0401, rightly); the engine ends a run at its first error; so every figure asked for after that one was never written, the plot shown among them. And where files of the same names were left from a drawing before, they were read as this run's: thumbnails of another size shown as drawn, and the refusal not seen at all. It has been so since the showcase was added at 0.2 (step 18c), whose test asked only that the list had 21 entries and that a figure was to be seen.

**Choice.** (1) A figure is this run's only where its own `export` statement ended in this run, by the run's own record of its statements; a file of its name left from before is not read. (2) Where a figure is refused, those asked for after it are asked for again without it, until none is left: a refused figure costs itself and one more run of the script. The refused thumbnail says what the engine said; chosen, the same plot is drawn at the size of the Plots place, where it has room. (`Workspace.#draw`.)

**Tests.** Browser (`first.spec`, the showcase): the plot shown is drawn, twenty thumbnails are drawn and the one refused says the engine's sentence, nothing says "The engine wrote no figure.", and the refused plot chosen is drawn at the place's size.

**Reason.** The checklist's step 11 (the examples read by eye in the hosted alpha); a fault of the app, mended where it lies.

## 22 November 2026: A variable's statistics are asked of the script that ran (found reading the hosted alpha, step 11)

**What was found.** In the hosted alpha, with the showcase of plots run, the Data place showed its frame `wages` (18,201 rows) and the Variables pane gave that variable's statistics for 15,571 rows: those of the returns to schooling, which also makes a frame `wages`. The statements were added after the text of the project's first script, not after the text of the script that ran last. (0.2's inspector asked its `summary` the same way; with one script run it was not seen.)

**Choice.** The statements are asked after the text of the last run, as it ran (`Workspace.askAfter`): the frames the Data place shows are that run's, whichever script is open now and however it has been edited since. Tests: browser (`data.spec`: with the showcase run, the pane's rows and N are the showcase's frame's).

**Reason.** The checklist's step 11 (the examples read by eye in the hosted alpha).

## 22 November 2026: The published notes of 0.2 carry the corrections

**Choice.** On the owner's word ("Yes, correct them"), the text of the GitHub release of v0.2.0 is `docs/releases/0.2-notes.md` as it now stands: the released text unchanged, and under it the section "Corrections, found while 0.2.1 was built" (the notes were not seen; the console line's plots are not listed apart; ⌘↵ on the last statement takes tens of milliseconds). The title, the tag (6c354f6) and the pre-release mark are untouched; nothing of the history is rewritten. Read back from GitHub and held to the file: the same.

**Reason.** A reader of the release page should not be told three things that were found wrong; the corrections stand apart from the released text so that what was said at the release can still be read.

## 22 November 2026: A test that reads every output waits until the editor has drawn every line

**What was found.** On GitHub the routine failed once in WebKit on a commit that changed the progress file alone (0c74438): the sample project "plots" read with its last print missing, the 18 lines of the statement `panels`. The same code had passed on the commit before. It could not be made to fail here in 44 runs under load. No picture of the page was kept, so the cause is reasoned, not seen: the editor draws the lines near the window; the helper `wholeScript` makes the window taller until nothing is left to scroll to, and a window just made taller has nothing to scroll to until the editor measures again and draws the lines it left out. The helper took two looks 150 ms apart as settled; on a slow machine the editor can take longer.

**Choice.** `wholeScript` holds only when nothing is left to scroll to and the editor holds no gap in the lines' place (`.cm-gap`, what it sets where lines are not drawn): the helper asks more before a test reads, and what the tests compare is unchanged. And the workflow keeps `test-results/` for 14 days where a browser test fails (the page as it stood, which Playwright writes there), so that a failure of this kind is read the next time.

**Reason.** A test that fails by its own timing teaches nothing and hides the day a real fault fails it; if the reasoning is wrong and the page itself was at fault, the test still fails, and the page kept will show it.

## 22 November 2026: ⌘↵ is sometimes slow on GitHub's machine, and the notes say only what is shown

**What was found.** The check after the deployment of de84a4a gave 2,468 ms from the key to "done" for ⌘↵ in Chromium, the run itself 31 ms; the deployments before and after gave 38 and 47 ms, WebKit 31 to 35 ms each time, and this Mac 14 to 20 ms at the address in every trial, whenever after Run the key was pressed. So 0.2's 2.2 s was not only a fault of the measure, and the correction published an hour before ("tens, in both engines"; "the page drawing its figures") said more than is shown. Probes from this Mac could not make it slow.

**Choice.** The correction in `docs/releases/0.2-notes.md` and the measure in the draft notes of 0.2.1 are reworded to what is shown, the cause given as not found, and it is a known issue of 0.2.1; the published notes of 0.2 are set to the file again. The check after a deployment now reports how much of the time passes before the run begins (the status leaving "done"), so that the next slow one says where the time goes: waiting for work before it, or the run and what follows.

**Reason.** A correction must itself be right. The cause is to be found before "Release 0.2.1" if a deployment shows it again; until then nothing is claimed.

## 22 November 2026: Help shows the engine's page formatted, and a reader of the print (release 0.2.1, steps 10a and 10b)

**The owner's choice.** "C, formatted", given in the session of release 0.1 on the mockup `zemp-lite-help-page-looks-mockup.html` of the shared notes and passed on from there: the Help place sets the engine's page in type (headings, prose in the app's type, code in the code's, each argument with its type, codes as coloured labels, names and codes as links, the examples as code) and no longer shows the terminal's print. Every word stays the engine's. It began with what was seen in the hosted alpha: with both panes open, as Help opens, a page 118 characters wide ran past the middle's edge in any window under about 1,560 pixels.

**What it supersedes.** The choice of this morning (step 8) that the page be shown "whole and unchanged", compared character for character with the kept page. From step 10b the tests compare the page's words, in order.

**The specification.** Section 5's row for Help says what the place shows and how it is opened, not how the page is set; nothing normative changes. A note for the register (an addendum to #74 and #203) is left in the shared notes for the Zeff session.

**Placing.** In 0.2.1, as two steps before step 11: Help is in this release's row, the engine is unchanged, and the reader test and the checks by hand should be made on the page as it will ship.

**The reader (step 10a, `src/help/read.ts`).** The engine gives a page only as its print, so the print is read: a function's first line (name, a dash, what it does, then its facts after a run of spaces); a heading, a line of capitals at the first column; a section's body, four characters in. By heading: USAGE one statement; ARGUMENTS rows of a name and a description that opens with its type, `(shared)` at the right edge; WARNINGS AND NOTES rows by `Note` or a code; VALUE its sentences, those of the form "Result interface: a, b" as lists of names; REFERENCES one by one, a new one where a full stop is followed by authors and a year; SEE ALSO names; EXAMPLES lines typed (`> `) and printed. Every other section is prose in blocks: a paragraph, a list (`- `), a sub-heading (a short line alone that ends no sentence), a table (the comparison with R and Stata, cells under the first row's columns), an example. In prose, backticks set code, `name()` is a function named, `W1001` a code; an asterisk sets a title in REFERENCES alone, since elsewhere it multiplies; a line whose backticks do not pair (Stata's quotation) is given as it is. A page of no known shape, a package's list among them, is kept as printed, and any line the rules do not account for makes the whole page so: the reader never guesses.

**Tests.** Unit, through the worker as built: every page the engine has (the 597 names of the catalogue, of which 596 answer, and the 144 codes) is of a known shape, and the words of what was read, in order, are the words of the print; each function has its first line, five facts and its usage, each code its four sections; nothing of a function's page is left as printed; every table is Zeff, R, Stata. On the kept pages: a page of two functions, a code's page, the engine's sentence for a name it has not, a package's list kept as printed. The pieces of a line of prose.

**Reason.** A page the reader has seen in a terminal should read better here, not differently: so no word is the interface's, and that is held for every page, not for the one drawn in the mockup.

## 22 November 2026: The formatted Help page as it is drawn (release 0.2.1, step 10b)

**Choice** (`src/help/HelpPage.svelte`, on the mockup's look C). The name is the title, in the code's type; what it does stands under it; the facts are a list of small labels. A section's heading is a heading, in sentence case, `R` and `Stata` keeping their capitals. Prose is in the app's type at one pixel over the code size, at most 800 pixels wide. Code between backticks is set in the code's type on a soft ground. The usage and what an example typed are coloured by the editor's own reader of Zeff (`editor/Code.svelte`, now also within a line); what an example printed is as printed, in a block that scrolls sideways and is a stop of the Tab key named "Example", so that a keyboard reaches what is out of sight. An argument is its name, its type and, where the print marks it, "shared", then its description: the mark stands by the name, where the print has it at the line's right edge, the one thing the page moves. Warnings and notes are a table by code: a note grey, a warning amber, an error red. The comparison with R and Stata is a table of three columns whose cells break. References stand one to a line, a title in italics. A code's page is set the same way.

**Links.** A function the prose names as a call (`base()`), a name under SEE ALSO or in one of VALUE's lists, and a code (`W1001`) in the prose or in the table each open their own page; they are buttons, since they act in the place and lead to no address. A bare name between backticks (`update`) is not a link: the print does not say which names are functions, and `wage` and `NA` are set the same way. Recorded as a known issue.

**The headings' levels.** The place's bar holds the page's name as the heading of the place; in the page a function is the next level down, its sections the next, a sub-heading of DETAILS the next: an outline a screen reader can walk.

**Colours.** No new colour and no new pair: code stands on `soft`, which the code's colours are already held to; a label is `ink-2` on `soft`, a link `accent` on `accent-soft`, a warning's code `warning` on `warning-soft`, an error's `error` on `error-soft`, each a pair `tokens.test` holds at 4.5 to 1. The mockup's prompt in `ink-4` would be text in a colour kept for decoration, so the prompt is `ink-3`.

**Sizes.** The app's own type in the page is never under 12.5 pixels at any code size (the labels are 12.5; code set within prose is the larger of 12.5 and 0.86 of the prose). A block of code is one pixel under the code size, as the page was before, and follows the reader's choice of it.

**What was removed.** `src/margin/helppage.ts`, the reader of step 8 that found a page's headings and its SEE ALSO: the outline and the related functions now come from the one reader. Its tests are kept as tests of that reader.

**Tests.** Browser (`help.spec`): the words shown are the print's, in order, for a page of two functions, a page of every kind of part (`add`, kept as `tests/scripts/help-add.txt` and held to the worker's) and a code's page, the comparison leaving out only what the type replaces (the backticks and asterisks, the dash and dots of the first line, a list's hyphen, the punctuation at a word's edge, a heading's capitals), and counting the marks of "shared"; the parts of a page each in its form; a name in the prose, a code in the prose and in the table, a name under VALUE and under SEE ALSO each open their page; the page inside its place at 1,200 pixels with both panes open, at the smallest and the largest code size, a 500-character line of an example scrolling in its block; a package's list as printed; a function to come as its line. Unit: the outline, the related names, every kind of part.

**Reason.** The owner's choice of the look; the rest follows from holding every word to the engine and every pair of colours and every size to the rules the app already keeps.

## 22 November 2026: A whole project saved to the computer is not in any release's row; where it should go, for the owner to place

**The owner's request**, passed on by the coordinating session ("Yes, ask it"): that saving a project to the computer be scheduled. A project of Zemp Lite lives in the browser's private storage alone; a visitor can copy a script's text and save a plot, and nothing else leaves the browser.

**What the reading found.**

1. **Open folder…** is on the welcome screen of the Zemp Specification (section 5) with no release named, and in no row of the release plan (section 15). The notes of 0.1 promised it "for the alpha"; the checklist of 0.2 neither built it nor listed it among what it left out; the start screen still shows it greyed, "not in this prototype yet". It fell between two plans. That is a fault of the planning of 0.2, recorded here.
2. **Export project** (the specification's paragraph on Zemp web, section 10; #117) is decided and placed with Zeff 0.11.0, the Zemp 0.5 desktop beta, together with asking the browser for persistent storage, the reminder to export, and **Open a replication package…**. Until then the browser may clear a project, and the visitor has no copy.
3. Nothing in either needs an engine later than 0.8.0, except the replication package itself (its run record is Zeff 0.11.0's).

**Two pieces, which differ.** (a) **Export project…**: the project's files as one zip, downloaded; with it, opening such a zip as a new project, so that what was saved can be brought back. Every browser; small; a copy, which the visitor must make again after more work. (b) **Open folder…**: the project lives in a folder of the computer and every save goes there. Only Chrome and Edge let a page do this; Safari and Firefox do not. The app's `Folder` (`src/project/folder.ts`) was written so that such a folder is one more kind of it, but the browser asks leave again in each session, and the list of recent projects must hold what it was given.

**Choice, as far as it is engineering's.** Nothing is pulled forward here: release 0.2.1 keeps its row, and its features stay frozen for the reader test. The placing is a priority, and the plan's rows are the specification's (section 15, under the freeze of #40), so it is put to the owner with a recommendation, and a note for the register is left in the shared notes (`zemp-lite-saving-a-project-for-the-register.md`).

**Recommended.** A small release of its own, 0.2.2 on Zeff 0.8.0, after 0.2.1 closes: **Export project…** and the opening of an exported zip, with the request for persistent storage and the reminder to export (the parts of #117 that wait on no engine), in every browser the alpha supports. **Open folder…** with the 0.5 desktop beta, where a folder of the computer is the project's own home, and on the web in Chrome and Edge at the same release; until then the greyed line says where it comes, not "this prototype".

**Reason.** A public preview that can lose a visitor's work, with no way to take a copy, should not wait five engine releases for one; the zip serves every browser and is small. A folder on the computer serves the browsers of some readers only and belongs with the edition whose storage it is.

## 22 November 2026: Release 0.2.2 is decided: a project saved to the computer, and the actions on its files

**The owner's word**, given in the coordinating session and passed on: to the recommendation of the entry above, yes; and, asked whether the file actions go with it, "Yes, into 0.2.2".

**What 0.2.2 holds**, on Zeff 0.8.0, after 0.2.1 is released:

1. **Export project…**: the project's files as one zip, downloaded, in every browser the alpha supports; and the opening of such a zip as a new project.
2. The request to the browser for persistent storage when a project is first made, and the reminder to export (the parts of #117 that wait on no engine).
3. **New script**, and in the project tree a file renamed, moved and deleted.
4. A project deleted from the start screen.

**Open folder…** stays for the 0.5 desktop beta (Zeff 0.11.0), on the desktop and, on the web, in the browsers that allow it. Until then the greyed line of the start screen says where it comes; its wording is changed in 0.2.2, not in 0.2.1, whose features are frozen for the reader test.

**What the reading found for item 3 and 4.** The project's own code can already rename and remove a file (`Project.rename`, `Project.remove`) and remove a project (`Projects.remove`), each with its tests, and nothing on screen calls them: the Project pane offers only **+**, to add a data file. A script is made today only by `:save` in the console line. So these are controls over machinery that exists.

**Left by the owner to engineering, with what is intended:** how a deletion is confirmed and whether it can be undone. Intended: a deletion asks once, naming the file or the project and saying that it cannot be brought back, since the browser's storage has no bin; the deletion of a project offers **Export project…** first. This changes what a reader sees, so it is put to the owner among the questions of the plan of 0.2.2, with this as the recommendation.

**The plan's row and the register.** The row of 0.2.2 in section 15 of the Zemp Specification, the register's entry and the line in `docs/spec_changes.md` are the Zeff repository's, which this session may not edit, and this repository's `docs/spec/` is its copy: the note `zemp-lite-saving-a-project-for-the-register.md` in the shared notes now carries the owner's decision and the row's words, for the Zeff session to enter, as #203 was entered for 0.2.1. The copy here is brought up to date when that is done.

**Not started.** `docs/releases/0.2.2.md` is written at "Start release 0.2.2", after 0.2.1 is tagged; no step of it is taken before.

**Reason.** The owner's decision; and a release's work is never pulled into the one before it.

## 22 November 2026: Release 0.2.2 widened: actions on files, folders and projects

**The owner's word**, given in the coordinating session and passed on, after his "Yes, into 0.2.2": "Add file actions, folder actions, project actions". He named the three groups; the list under each was proposed to him by the coordinating session and is taken here as the starting scope, adjusted below on engineering grounds. Nothing is built before 0.2.1 is released; the checklist is written at "Start release 0.2.2", where the questions marked for him are put.

**Scope kept.**

- **Files** (a menu on each row of the Project pane, every item also a command of ⌘K): new script; add files from the computer into any folder, not `data/` alone; rename; move to another folder; duplicate; delete; save a copy to the computer.
- **Folders:** new folder; rename; move; delete with what it holds, saying how many files go; save to the computer as a zip.
- **Projects** (the start screen and **Projects ▾**): new, as now; rename; duplicate; delete; **Export project…** as a zip; open an exported zip as a new project. With them, from the entry above: the request for persistent storage and the reminder to export.

**One thing found on the way, a reason of its own for "save a copy".** What a script writes with `export` (a table, a figure) goes into the project in the browser's storage, and nothing on screen takes it out: a visitor's exported table cannot be had today. Saving a file to the computer ends that.

**Adjusted.** Moving by dragging a row is left out of 0.2.2: **Move to…** in the row's menu does the same and is reached by the keyboard, which every control must be; dragging is a second way to the same end, and costs its own tests in two browsers. It is put to the owner at the plan as left out, his to bring back.

**The points settled.**

1. **`zeff.toml` is not deleted, moved or renamed**: a folder without it is not a project. The folders the engine knows by name (`scripts`, `functions`, `data`) are not renamed, moved or deleted either, though what they hold is: a `functions` folder under another name would stop a project's functions from being found, without a word.
2. **`.zemp/` stays hidden**, and is left out of an exported zip, as the specification leaves it out of a replication package (section 5): it is the interface's view state, not the project's. A project duplicated in the browser keeps it.
3. **Renaming a project changes its name in `zeff.toml`; its folder in the browser's storage does not follow.** That folder is the app's own key (the time each project was opened is kept by it); moving a whole tree there is a copy and then a deletion, which a closed tab can leave half done, for a name the visitor does not meet. An exported zip is named by the project's name.
4. **Renaming, moving or deleting a file rewrites no script**, as in R and Stata, and by the rule of Zemp Lite that no control writes a statement. **The app says so where it matters:** if a script's text names the old path, a line says which scripts and lines do, each a way to its place, and changes nothing.
5. **An open file follows.** Renamed or moved, the editor holds it under its new path, what was typed saved first; deleted, the editor shows another script. The results of a run stay with their script under its new path, and go with a script deleted.
6. **Names.** A name is one part of a path (no `/` or `\`, not `.` or `..`); a name taken is refused, in a sentence, and so is one that differs from a neighbour only in capitals, since the computers a zip is opened on mostly cannot hold both.
7. **No dialog.** A name is typed, and a deletion confirmed, in the row itself, as **New project…** is named now: the Lite build holds no dialog (the edition check).
8. **An exported zip opened** is refused where a path would leave the project or the whole is larger than the memory budget, as the specification says of a replication package. Whether the zip is written and read by a few lines of this repository's own or by a dependency is decided at the step, by the rule for dependencies.

**For the owner, at the plan of 0.2.2** (each with its recommendation): how a deletion is confirmed and whether it can be undone (asked once, in the row, naming what goes and how many files, and saying it cannot be brought back; a project's deletion offering **Export project…** first; no bin in 0.2.2); whether `scripts/main.zeff`, which the engine and the app both open by name, may be renamed or deleted (recommended: not); dragging to move (recommended: left out).

**The size.** This is no longer a small release: about eight to ten steps. The checklist will put **Export project…** and the saving of a file first, since each green step reaches the address, so that a visitor's way out arrives before the rest.

**The plan's row.** The words of the row for the Zeff session, in the shared note `zemp-lite-saving-a-project-for-the-register.md`, are widened to match.

**Reason.** The owner's decision of the scope; the adjustments keep to rules the app already holds (the keyboard, no dialog, no statement written for the user) and to what the browser's storage can do safely.

## 22 November 2026: The specification's copy is brought to Zeff 3159c99, where release 0.2.2 stands

**What was entered there**, by the Zeff session on the owner's word in it ("Yes, enter it"), from the shared notes of this session: the register's entry #208 (a project saved to the computer and the actions on files, folders and projects, with the three questions still to be put to the owner); the row "0.2.2 | 0.8.0" of section 15 of the Zemp Specification, and **Open folder…** in the row of the 0.5 desktop beta; a dated paragraph under #117 (built at 0.2.2: Export project, the opening of an exported zip without Verify, persistent storage and the reminder; staying at 0.11.0: **Open a replication package…** with Verify); the line in Zeff's `docs/spec_changes.md`. Also, with nothing normative: a paragraph under #74 and a line under #203 on the Help page set in type, and in Zeff's own decisions that the layout of the print of `zeff help` and `zeff explain` is from now on changed only knowingly, said in the release notes and told to Zemp Lite before the engine that carries it is released; a structured form of a help page is a candidate for the planning of Zeff 0.11.0.

**Choice.** `docs/spec/` is the Zeff repository's at commit 3159c99, each of its ten files taken from the commit and compared byte for byte. Four differ from the copy of 1beefc7: the register and the Zemp Specification, by the entries above; the catalogue and the Language Reference, by the work of Zeff 0.9.0 since (three functions' status, the codes Z0414, Z0417 and Z0717), none of which Zemp Lite on Zeff 0.8.0 reads.

**Reason.** The specification is the authority, and a release is planned from its row: the copy must hold the row of 0.2.2 before "Start release 0.2.2".

## 22 November 2026: Release 0.2.1 is closed

**The owner's word:** "Release 0.2.1". Asked what the notes should say of his part of step 11, he answered: the reader test, "Not run; carry it forward"; the checks by hand and his own trial, "Not done; say so".

**What that means, and where it is written.** The reader test is one test for Zemp Lite and Zeff 0.9.0 and stays owed at Zeff 0.9.0; what it needs is ready and it can be run on this alpha. The checks by hand are listed in the notes' known issues as not checked at this release, each held only as far as the automatic test named for it holds it. Step 11 is ticked on its own condition, the owner's word; nothing is said to have been checked that was not.

**The routine at the close.** Here: the whole routine green in both browsers (29 native tests, 18 message tests, the nine sample projects identical, 197 unit tests, 326 browser tests, 2 skipped by design). On GitHub: green in both browsers on the commit before the release, and again on the release's own. At the address, in Chromium, as a first visitor from the Start screen: the three examples print and say what `zeff run` does, every figure drawn (2, none and 21); the Help page read by eye in both themes. WebKit at the address is held by GitHub's check after each deployment, not by this Mac, whose WebKit takes no mouse.

**The registers.** They are the Zeff repository's. The review is left for it in the shared notes (`zemp-lite-0.2.1-release-review-for-zeff.md`): the reader test still owed at 0.9.0; R4's figures; the first start in WebKit at and over its goal; the dependence on the layout of the help print; #203 built, #208 decided for 0.2.2; #37 still the owner's.

**The release.** Version 0.2.1 in `package.json`, `worker/Cargo.toml` and their lock files; the commit "Release 0.2.1"; the tag `v0.2.1`; a GitHub release marked a pre-release, as 0.2 was, carrying `docs/releases/0.2.1-notes.md`.

**Carried to later.** The cause of the occasional slow ⌘↵ on GitHub's machine, which was to be found before this release and was not: the checks narrowed it to a wait before the run begins and did not show what stands before it. It is a known issue, with what is and is not shown.

## 22 November 2026: After the tag: a test's helper mended, and the notes brought to the release's own deployment

**What was found.** GitHub ran the release's commit twice, for the branch and for the tag. The tag's run passed whole. The branch's failed one test in WebKit (`margin.spec`, "Run from here, from ⌘K…"), and a failed run deploys nothing, so the address still served the build before. The page kept from the failure (kept since this morning's change to the workflow) shows the engine ready and the editor in focus: the test's helper `cursorTo` had set the selection on the page and the editor had not taken it. The helper set it once and then waited.

**Choice.** The failed job was run again on the same commit, passed, and the release was deployed and checked at both addresses: no test was changed to make the release green, and the tag stands on the commit as it was. Then, in the commit after the tag: `cursorTo` sets the selection again until the editor holds it; and the workflow keeps from a failure only the page as it stood and its pictures, not the whole folder, which held the browsers' own profiles (224 MB).

**The notes.** The text published with the GitHub release is `docs/releases/0.2.1-notes.md` as of that commit, which differs from the tag's in two places, both facts learned from the release's own run and deployment: that run's failure and re-run, and the slow ⌘↵, which appeared at the release's deployment too (2,529 ms, 2,503 of it before the run began) while the first drawing of the figures took 435 ms there. So the drawing is not what the statement waits for; the suspicion is withdrawn, and the cause stays not found.

**Reason.** A release is said done when it is deployed and checked, and its notes should not say less than was known when they were published.

## 22 November 2026: Release 0.2.2 opened (step 1)

**The owner's word:** "Start release 0.2.2", and, to the plan and its five questions, "Go, as recommended". Each answer is his to overturn.

**His answers, as recommended.**

1. **A deletion** asks once, in the row: it names the file, or the folder and how many files go with it, says that it cannot be brought back, and offers **Delete** and **Keep**. Nothing is undone in 0.2.2. The deletion of a project offers **Export project…** first.
2. **`scripts/main.zeff`** is not renamed, moved or deleted; every other script is.
3. **Dragging a row to move a file** is left out of 0.2.2; **Move to…** in the row's menu does it.
4. **The Scratch project** is not renamed; **Duplicate…** makes a named project of it; in place of **Delete** it has **Reset…**, which puts back its examples as a first visit has them.
5. **An exported zip** is `<the project's name>.zip` with one folder of that name in it, holding `zeff.toml`, `scripts/`, `functions/`, `data/`, `output/` and anything else the visitor put in the project; without `.zemp/` and without what `zeff new` keeps out of Git (the engine's caches, run records, lock and console session).

**What the reading found** is in `docs/releases/0.2.2.md`: the operations on a file exist and nothing on screen calls them; a project's folder in the browser's storage is made from its name, so a rename parts the two; what a script writes with `export` cannot be had today; the engine is told of files already; a zip needs no dependency, the browsers having its deflate built in.

**Choices of this step.** Version `0.2.2-dev` in `package.json`, `worker/Cargo.toml` and their lock files. The greyed line of **Open folder…** on the start screen says "comes with the desktop app, and then in Chrome and Edge" in place of "not in this prototype yet": it is no prototype, and #208 places the folder with the 0.5 desktop beta. Tests: browser (`page.spec`, the line's words).

**Reason.** The owner's decisions; and a line that says a thing is not here should say when it will be.

## 22 November 2026: A zip of this repository's own (release 0.2.2, step 2)

**Choice** (`src/project/zip.ts`). No dependency: the deflate of a zip is the platform's own (`CompressionStream` and `DecompressionStream`, "deflate-raw", in every browser the alpha supports and in Node), and the container is written here: each file's header, the directory at the end, a CRC-32. A file is deflated, or stored as it is where deflating does not make it smaller; names are UTF-8; a folder that holds nothing has an entry of its own, so that an empty `data/` comes back. Every entry carries the moment given, so the same files at the same moment are the same bytes. The 64-bit form is neither written nor read: a project of this browser is far under 4 GB and 65,535 files.

**Reading trusts nothing the archive says of itself.** The sizes and the CRC are taken from the directory at the end, never from a file's own header (so a zip written to a pipe, with each size after its bytes, is read). Refused whole, with a sentence, before a caller writes anything: what is no zip or is cut short; a zip split, or of the 64-bit kind; one protected by a password; a file packed otherwise than stored or deflated; a name not in UTF-8; a path that would leave the folder (`..`, `.`, an empty part, a path from the root, a drive, a backslash); a path twice; two paths that differ only in capitals, a folder's among them; one path as a file and as a folder; a file that does not unpack to its length and its CRC; and a whole larger than the limit given, counted as it unpacks, so that a hundred megabytes of zeros claimed as one kilobyte stops at the limit. A small file whose own header alone is in the 64-bit way (as a cautious writer does) is an ordinary zip and is read.

**Tests** (`zip.node.test.ts`, under Node, with Python's `zipfile` as the reference; 15 tests). What is written is read back the same; is the same bytes twice; deflates what shrinks and stores what does not; is read by the reference, every name, byte, folder and moment. What the reference writes is read: stored; deflated, with folders' entries and a comment at the end; written to a pipe. Each refusal by an archive made for it, with its sentence. The CRC-32 by its known value.

**The build.** The module is in no page yet: step 3 is its first use, and the measure is taken there.

**Reason.** A dependency is added only where it saves real work; here the platform does the hard part, and what is left is small enough to hold whole in tests against a reference.

## 22 November 2026: What a run writes is brought into the project (release 0.2.2, step 2b)

**What was found, building Export project.** The plan of 0.2.2 said that a file a script writes with `export` "goes into the project in the browser's storage". It does not. The engine works on its own copy of the project, in the worker's memory; `export` and `save` write there, and the interface had only ever read back the figures it asked for itself. A visitor's saved frame or exported figure was in no pane, could not be taken out, and was gone when the tab closed. The plan's finding is corrected in `docs/releases/0.2.2.md`, and a step is added before Export project, which would otherwise have given a zip without anything a script wrote.

**What the specification says.** The Engine and Project Specification, section 2: `save` and `export` "write only under the project folder (`output/` by default)". In the browser the project's folder is the browser's storage. So this is the behaviour the specification already asks for, and no entry of the register is needed.

**Choice.** (1) *The worker* (`worker/src/written.rs`): the host gives the engine a file store of its own, which passes every call to the engine's store in memory and notes each path written; the note is cleared when a run begins, and the run's outcome names what was written and is still there, by its path from the project's folder, without the engine's own `.zeff/`. It depends on the engine's `FileSystem` trait alone, which is its public way in, and on nothing of how the engine's store keeps its times. A file the interface puts in is not noted. (2) *The interface* (`Workspace.#keepWritten`): after a run the visitor asked for (**Run**, a part of the script, a statement of the console line) each file named is read from the engine and written into the project, the language engine is told, and the Project pane is read again. Not after the runs the interface makes for itself (figures, a print laid out afresh, a variable's statistics, a condition of the data viewer): they run the same script and write nothing of the visitor's that his own run did not. A path under `.zemp/` is never taken from the engine.

**What it changes for a visitor.** A file a script writes appears under `output/` in the Project pane when the run ends, is kept with the project, and from steps 3 and 4 is in an exported zip and can be saved to the computer. A run that writes large files takes the time to copy them.

**Tests.** Native (`host.rs`): a run that exports a figure and saves a frame names both, in order; one that writes nothing names none; a file put in by the interface is not named; the next run names only its own; a run that stops at an error names what it wrote before; `.zeff/` is never named. The worker's messages: the outcome carries the names. Browser (`kept.spec`, with a browser that keeps its storage, in Chromium and WebKit): the files stand in the Project pane with their sizes; in the browser's storage each is what the engine wrote (the figure's size in points, the frame's CSV to the character); a second run at another size replaces the figure; a statement of the console line that saves a frame brings it; all are there after the page is loaded again.

**Reason.** The specification's own rule; and a project given to the computer must hold what its scripts made.

## 22 November 2026: Export project… (release 0.2.2, step 3)

**Choice.** **Project: export…** in ⌘K, and **Export project…** in the menu of a project's row on the start screen, which exports it without opening it (`Projects.peek`: no time of opening is noted, so the list keeps its order). What is typed is saved first. The zip is as question 5 was answered: `<the project's name>.zip` with one folder of that name, holding everything of the project but `.zemp/` and `.zeff/` (`src/project/export.ts`). Both of those are what `zeff new` keeps out of Git; `data/`, which it also keeps out of Git, is in the zip, for the zip is the visitor's copy of his work and not a repository. A folder that holds nothing is kept, so an empty `data/` comes back. The name of the file and of the folder in it is the project's name with the characters no computer's file may hold replaced by a hyphen. The same project at the same moment gives the same bytes.

**When it was exported is remembered** by the project's folder, in the browser's own small record beside the time it was opened (`zemp-exported`): step 6's reminder counts from it.

**The row's menu** (`src/app/RowMenu.svelte`) is made here and used again by the Project pane's rows from step 4: a button at the row's end named for its row ("Actions for Scratch"), a stop of the Tab key, which opens a list; the arrow keys, Home and End move through it; Escape, a press elsewhere, the Tab key or a change of the window's size close it; focus goes back to the button. An action that does not apply to a row is not in its list. It is a list in the page, not a dialog. The start screen's list of projects became a list of rows, each a button that opens the project and its menu beside it, since a button may not hold another.

**The download** is the browser's own (`src/app/save.ts`): the bytes are the page's, nothing is sent anywhere. What the screen did is said where a screen reader hears it: the status line in a project ("exported as Scratch.zip"), a line under the list on the start screen.

**Tests.** Unit (`export.test`, 8 tests): the one folder and what it holds; an empty folder kept; `.zemp/` and `.zeff/` left out and a visitor's own dot-file kept; the same bytes twice; the name made safe; the time remembered and listed; a project looked into without being opened; a folder as a zip (for step 4). Browser (`export.spec`, both browsers): from ⌘K, the downloaded file's name, its entries read back by this repository's reader and by Python's `zipfile` with every CRC tested, the script as typed a moment before, the file the run wrote, the manifest to the character, nothing of `.zemp/` or `.zeff/`, the script unchanged; from the start screen, by the mouse and by the keyboard alone, with the project not opened.

**Reason.** The owner's answer to question 5; the rest is what makes the zip a project the command line runs, and the control one a keyboard reaches.

## 22 November 2026: A file saved to the computer, and a folder as a zip (release 0.2.2, step 4)

**Choice.** Every row of the Project pane has the menu made at step 3, named for its row by its path ("Actions for output/figure.svg"). A file's has **Save a copy…**, which gives the file to the computer as it is, under its own name; a folder's has **Save as a zip…**, which gives a zip named for the folder and holding it under its name (`exportFolder`). What is typed is saved first, so a script saved is the script as it stands. The file shown is saved from ⌘K too ("File: save a copy of main.zeff"). The status line says what was saved. A file is given with no type of its own, so that the browser saves it and does not open it.

**What it gives with step 2b.** A table saved and a figure exported by a script can now be taken out of the browser, one at a time or as the whole `output` folder.

**The rows.** A row is now its button, or its plain line where the file is not one the editor opens, and its menu beside it; opening a menu folds and opens nothing.

**Tests.** Browser (`files.spec`, both browsers): a script saved is what was typed a moment before; a figure and a frame a run wrote are the engine's bytes; a data file of every byte value comes back as it went in; the file shown is saved from ⌘K; a folder saved by the keyboard alone (the button in focus, Enter, Escape giving the focus back, Enter on the item), its zip read by this repository's reader and by Python's `zipfile`; an empty folder is a zip of that folder.

**Reason.** The row of the plan; and what a script writes is the visitor's work as much as the script.

## 22 November 2026: A file being rewritten is not a file that is gone (found on GitHub at step 3)

**Corrected the same day: this was not the cause of the failure it was written for.** The entry "A change of the view is written though others follow it at once", below, gives the cause, found when the same test failed again with this mend in place. What follows was reasoned from one page kept from a failure, and the reasoning was wrong: the view state was not read as absent, it had never been written. The mend itself stays: the race it guards against is real (it was met in release 0.2 as a swap file listed beside a file being written), and its tests hold it. The paragraph "What was found" below is kept as it was written, as the record of a wrong diagnosis.

**What was found.** GitHub's run of step 3's commit failed step 2b's new test in Chromium: after the page was loaded again, the Project pane was closed, though it had been open, and the script's place was empty. The page kept from the failure shows the project open by its name, with the panes as a new project has them. The test loads the page again a moment after a statement of the console line, while the view state is being written. In Chromium a file being written is replaced when the write ends, and a read at that instant fails: the browser says the file is not found, or has changed since it was looked at. `OpfsFolder.read` took every failure for "no such file". So `.zemp/views.json` was read as absent, and the project opened with a new project's view. A script read at such an instant would have been taken for gone and not opened. Nothing in the storage is lost by it; the page shows less than is there, and the view state of that moment is then written over by the default. The fault is as old as release 0.1; this release's test, which loads the page again straight after a write, is the first to meet it.

**Choice.** A read that fails is asked for again where the folder still lists the file, or the swap file Chromium keeps beside one being written (`name.crswap`): a little later each time (25, 50, 75 ms and on), twelve tries, about two seconds in all. A file the folder does not list is gone, and said so at once, so that asking for a file that is not there costs one look at the folder and no wait. After the tries a file listed and never read is given as absent, as before: the page must open.

**Tests.** Unit (`opfs.test`, on a stand-in for the browser's handles, with the waits counted and not waited): read at once where nothing is in the way; read after three failures, the waits growing; read where only the swap file is listed; gone at once where the folder does not list it; given up after twelve tries. Browser: the test that found it (`kept.spec`, "what a run writes is brought into the project…"), which cannot make the instant happen at will, so the unit test is what holds the mend.

**Reason.** A project must open as it was left; and a reader of the page must never be shown an empty script for one that is there.

## 22 November 2026: An exported zip opened as a new project (release 0.2.2, step 5)

**Choice.** **Open a project's zip…** on the start screen: a file is chosen; it is read and proved whole by step 2's reader, the limit being the memory budget the engine gives a window of the browser (the smaller of 3.5 GB and half the memory the device reports; the Engine Specification, section 8.3, point 7) and 65,534 entries; then it is made into a project (`src/project/from-zip.ts`, `Projects.adopt`). The project's files may lie at the zip's top or, all of them, in one folder there, which is taken off: **Export project…** writes the second, and so does a folder zipped on a computer. A zip with no `zeff.toml` there is refused, in a sentence that says what a project's zip holds. Nothing is written until all of that holds, and if a file then cannot be written what was written is removed: there is the whole project or none of it.

**What is left out of what the zip holds.** What a computer's file manager adds beside the files (`__MACOSX/`, `.DS_Store`): a visitor who unpacks a project, works on it and zips it again on a Mac sends these without knowing. And `.zemp/` and `.zeff/`, the interface's and the engine's own, which an exported zip does not hold either: a view state from elsewhere is not taken on trust.

**The name.** The project takes the name its `zeff.toml` gives, or its file's name where the manifest gives none, with a number after it where a project of that name is here already, whatever the capitals, the Scratch project's name being always taken (`Scratch 2`). Where the name had to change, the manifest's line of the name is rewritten (`renamed`): its comment stays in its column where the new name leaves room, and every other character of the file is as it was. Step 9 renames a project by the same function. The project's folder in the browser's storage is the first free one for the name (`wages`, `wages-2`).

**Not a replication package.** No **Verify**, no first page, no engine pinned and loaded: those wait for the run record of Zeff 0.11.0 (#117). A project whose manifest pins another engine than this one opens as any project does here.

**Not built: a zip dropped on the window.** The specification has a replication package "chosen or dropped"; this is the choosing. Dropping can come with that package at 0.11.0.

**Tests.** Unit (`from-zip.test`, 12 tests): the one folder taken off, and not where `zeff.toml` is at the top; the file manager's files and the two own folders left out, a visitor's `.gitignore` kept; each zip with no project refused; the name's line rewritten with its comment's column, there and back to the character; a manifest with no name given one; a free name; the project written and listed; the number after a name taken, in the manifest too; the file's name where the manifest gives none; a write that fails leaving nothing; the limit. Browser (`open-zip.spec`, both browsers): a project exported and opened again is the same script, runs to the same output, holds the same files, and its manifest reads "Scratch 2" with the comment in its column; a project's folder zipped by Python's `zipfile`, with folders' entries and a file manager's files, opens and runs; a file that is no zip, a zip with no project, one with a path that leaves the project and one with two names differing in capitals are each refused in their sentence, with no project made.

**Reason.** The row of the plan and #117's paragraph; a project given to the computer must be able to come back.

## 22 November 2026: A change of the view is written though others follow it at once (found at step 5)

**What was found.** The test of what a run writes (step 2b) failed once on GitHub in Chromium, and once here in WebKit after the mend of the entry "A file being rewritten is not a file that is gone" was in: after the page was loaded again the Project pane, opened earlier in the test, was closed. A probe that followed the test's own steps sixteen times in each browser, and read the browser's storage before and after the page was loaded again, showed it every time: `.zemp/views.json` did not exist. The view state was written a fifth of a second after the last change, and every change put the writing off. In the test the changes follow one another (a pane opened, two runs that unfold their outputs, a statement of the console line) with no fifth of a second between them, so nothing had been written when the page was loaded again; where the test passed, some step had happened to take longer. A reader who opened a pane and went straight on working would have found it closed the next time. As old as the view state itself (release 0.1).

**The first diagnosis was wrong.** It was read off one page kept from one failure, and took a view state never written for one that could not be read. What settled it was reading the storage itself, in a probe that could be run until it showed the fault each time. Recorded for the next time: a page shows what the app made of the storage, not the storage.

**Choice.** `Workspace.#keep` writes a fifth of a second after the first change not yet written, however many follow; the writing takes the state as it then stands, so later changes are in it or in the next. A pane's edge being dragged is thus written five times a second while it moves, a file of a few hundred characters. And a page being left writes what waits (`pagehide`), as far as the browser lets a page that is going finish it; nothing relies on that.

**Tests.** Browser (`kept.spec`, "a change of the view is kept though others follow it at once, and the page is loaded again in the middle of them"): a pane opened, then a second of changes each within 60 ms of the last, then the page loaded again at once: the pane is open. It was run against the code as it was, where it fails in both browsers, and against the mend, where it passes.

**Reason.** What a reader sets should be there the next time, whatever he does in the fifth of a second after.

## 22 November 2026: The browser asked to keep the storage, and the reminder to export (release 0.2.2, step 6)

**The specification** (section 10; #117): "Zemp web asks the browser for persistent storage when the first project is created; when that is refused, or a project has not been exported for 30 days, a line in the status bar says so, with **Export project** in ⌘K, and nothing is exported without the user."

**Choice.** (1) *The asking* (`src/project/keeping.ts`, `App.svelte`): when a project is made here (a new project, a zip opened, the Scratch project) the browser is asked for persistent storage, the first time only, which a note in the browser's own small record remembers; at every opening what it has already agreed to is read, without asking. A browser that cannot be asked, or fails when asked, is one that may clear. (2) *Three cases*: the browser has agreed (`kept`); it keeps the projects but may clear them (`may-clear`); it gives the page no storage at all, so a project lasts until the tab is closed (`none`, a private window, and WebKit's test profile). (3) *The line*, in the status bar of a project, with **Export project…** beside it as a button: where the browser may clear, always, "the browser may clear this project · not exported yet" or "· exported today", "yesterday", "12 days ago"; where it keeps nothing, "this browser keeps no project after the tab is closed · …"; where it has agreed, nothing, until the project has not been exported for 30 days ("not exported for 41 days") or, never exported, is 30 days old ("not exported yet, 30 days after it was made"). The export it offers is the one of step 3, and nothing is exported unless the button, or ⌘K, is pressed. (4) *The start screen* says which case holds, after "Kept on this computer."

**When a project was made** is now kept by its folder, beside when it was opened and exported; a project made by a release before this is noted when it is first seen, so its 30 days count from then. A project removed is forgotten in all three records.

**What a reader will meet.** Most browsers do not agree to keep a site's storage on a first visit, and say so without asking the reader anything. So for most readers the line will stand in the status bar from the first project on. That is the specification's rule, and it is the truth of where the work is kept; the line is quiet, in the colour of the status bar's other words, and tells when the last copy was taken.

**Tests.** Unit (`keeping.test`, 9 tests): agreed already, and not asked again; asked when a project is made, agreeing and refusing; not asked otherwise; cannot be asked, fails when asked; no storage at all; each wording of the line; silent within 30 days; speaking on the day they are up, from the export or from the making; when a project was made, kept, first seen, forgotten. Browser (`keeping.spec`): with the browser's answer stood in for, since a test cannot make one agree: refusing, the start screen and the line say so, the browser is asked once and not again, the button exports and the line says "exported today" (in WebKit's test profile, which gives no storage, the third case's words); agreeing, the line is absent, appears 31 days on by the page's clock, goes with an export, and returns 31 days after it (Chromium; skipped in WebKit, whose test profile has no storage to keep, the third test skipped by design in the suite).

**Reason.** The specification's rule, built as it is written.

## 22 November 2026: What a reader set as the page was left is kept too (found at step 6)

**What was found.** The mend of the entry "A change of the view is written though others follow it at once" had a consequence of its own. A test of where the notes stand (`panes.spec`) closes the Notes pane, opens it again, and leaves the page within a few milliseconds. With the writing a fifth of a second after the first change, a writing already under way could catch the pane closed, and the opening that followed was lost with the page: the project opened next with Notes closed, and the test failed about four times in ten (ten in ten passed with the old timing, which lost both changes together and so happened to leave what stood before). Either way a change made in the last fifth of a second before a page is left was lost: with the old timing every such change, with the new one the last of them. A page that is being left cannot be relied on to finish a writing to the browser's file storage that it has begun.

**Choice** (`src/app/left.ts`, `Workspace.leave`). The browser's own small record (`localStorage`) is written at once and outlasts the page. As the page is left (`pagehide`) the view state is noted there, by the project's folder; the next opening of that project takes the note up in place of what the project holds, writes it to the project, and forgets it. A project still being opened notes nothing, having no view state of its own yet. Where the browser keeps no such record, things are as before. The writing a fifth of a second after a change stays: it is what keeps the view state where the page ends without being left (a browser that is killed).

**Tests.** Unit (`left.test`): noted and taken up once; each project's own; nothing where the record holds no note or not one; quiet where the browser keeps none. Browser (`kept.spec`, "a change of the view made as the page is left is kept…"): Notes closed and the page loaded again in the same breath shows it closed; panes changed in quick turns, the last as the page is left, stand as the reader left them; and the project's own file holds them a moment later. The test that showed the fault passes twenty times in twenty.

**Reason.** What a reader sets should be there the next time, to the last press.

## 22 November 2026: The operations on a project's files and folders (release 0.2.2, step 7)

**Choice** (`src/project/files.ts`; `Project` passes them on). A script made, empty, with `.zeff` after its name where the name lacks it; a folder made; a file added into any folder under its own name (`addData` is that, into `data/`); a file or a folder renamed or moved, which are one operation, a new path; duplicated beside itself under a name with "copy" in it, the first that is free (`clean copy.zeff`, `clean copy 2.zeff`); deleted, with the files that go counted.

**A move is a copy, checked, and then a removal.** The browser's storage has no moving of its own. So the copy is made and held to the original, every file read back and compared, and only then is the original removed: a tab closed half-way, or a storage that fills, leaves the original whole. A copy that cannot be finished is itself removed, and the reader is told the thing "is where it was", with the reason. A folder's files and the folders in it that hold nothing all go.

**The rules of a name, in one place.** One part of a path: no `/` and no `\`, not `.` or `..`, no control character, no space at an end, at most 120 characters. Not taken in its folder, and not differing from a neighbour only in capitals, since most computers cannot keep both and a project is meant to leave the browser; a change of capitals alone in a thing's own name is a rename and is allowed. A folder is not moved into itself. A file added from the computer keeps its name, with what a path cannot hold made a hyphen.

**What is fixed** (the points settled on 22 November; question 2): `zeff.toml`; the folders `scripts`, `functions` and `data`; `scripts/main.zeff`; and `.zemp/` and `.zeff/` with all they hold. None is renamed, moved or deleted, and nothing is made or put in the last two. What a fixed folder holds is free, and what is fixed can be copied: the copy is an ordinary file.

**Every refusal is a sentence that says what to do**, and nothing is changed by an operation that is refused.

**`ProjectError`** moved to a file of its own (`error.ts`), so that the operations and the projects can both use it without depending on each other in a circle; it is still given out by `projects.ts`.

**Tests.** Unit (`files.test`, 12 tests, on a folder in memory and on one that fails at a write the test names): the rules of a name; what is fixed; a script, a folder and a file made, in the project and in folders of it; each refusal, with its sentence, and nothing made by any of them; a file renamed and moved, a change of capitals alone; a folder moved with its empty folders; what is fixed, a place taken, a folder into itself and a thing not there refused; a move that fails at a file's write, and at a folder's second file, leaving the original whole and no copy; duplicates under free names, of files and of a folder; the count, and the deletions, with what is fixed and what is not there refused.

**Reason.** The row of the plan; and that an operation on a reader's files must never leave him with less than he had.

## 22 November 2026: New script, new folder, and files added into a folder (release 0.2.2, step 8a)

**Choice.** The Project pane's **+** is now the menu of step 3, named "Add to the project", with **New script**, **New folder** and **Add files…**; a folder's own menu has the same three, for itself, above **Save as a zip…** (none of them in the app's own folder or the engine's). From the pane's **+** a script is made in `scripts/`, a folder in the project, and files go into `data/`, as the **+** did before. The name is typed in a row where the new thing will stand, the folder unfolded if it was folded: Enter or **Create** makes it, Escape or **Cancel** makes nothing. A name that cannot be is refused under the row, in the sentence of step 7, and typing takes the sentence away. A script made is opened. Adding files writes no `import` (section 2): the reader writes it.

**What the engine is told.** A script made and a file added are given to the engine and to the language engine before their next use (`changed`); a folder that holds nothing is nothing to either.

**How the language engine's having the file is held.** The plan named "by a run that imports it and by completion". The language server of Zeff 0.8.0 completes no paths of files (its own account of completion names bindings, functions, datasets, arguments and a frame's variables), so the test is another: a variable the added file does not hold is underlined as it is typed, and one it holds is not, which the language engine can only know from the file. A run that imports the file holds that the engine has it.

**Tests.** Browser (`files.spec`, both browsers): the **+** lists its three; a script named in the row, a name taken refused in its sentence with nothing made, a free name made with `.zeff`, opened, marked in the tree, and run; a folder whose name differs from `data` only in capitals refused; a folder made, and a script made in it from the folder's own menu; Escape making nothing. By the keyboard alone: the **+** in focus, Enter, the arrow, Enter, the name typed; files added into the new folder through its menu, listed there and not under `data/`; a run that imports one of them; a misspelt variable of it underlined and the right one not; a second file whose name differs only in capitals refused; the pane's own **+** still adding into `data/`. The keys of the list (End, Home, the arrows going round) are held in the folder's test of step 4.

**Reason.** The row of the plan.

## 22 November 2026: A file renamed and moved, and the engine made to forget one file (release 0.2.2, step 8b)

**The engine first.** The engine works on its own copy of the project, in the worker's memory. Until now the only way to take a file out of that copy was to give the engine the whole project afresh, which makes a new project there and with it loses the frames of the last run: every rename would have emptied the Data place. And left alone, the engine would go on having the file under its old name, so that a script naming it would run in the browser and nowhere else. So the worker learns to forget: its own file store (`worker/src/written.rs`, of step 2b) keeps a list of the files that are gone, each still in the engine's store beneath and there for no call (not read, not listed, not a file) until it is written or put in again; a folder is removed outright, which the engine's store can do. A message `remove` carries it, `Engine.remove` asks it, and a session (`Session.gone`) has the engine forget what is gone before it is given what changed. The manifest is never forgotten. The frames of the last run are kept.

**Choice** (`Workspace.moveTo`, `ProjectTree.svelte`). **Rename…** and **Move to…** in the menu of a file that is not fixed (`zeff.toml` and `scripts/main.zeff` have neither), and for the file shown in ⌘K, which opens the Project pane at its row. Both are answered in the row itself. *Rename*: the name stands in a field with its ending left alone and the rest selected, so that what is typed takes the name's place; Enter renames, Escape leaves. *Move to…*: a list of the project's folders, without the one the file is in and without Zemp's own, "the project's own folder" among them; **Move** moves. A refusal is the sentence of step 7, under the row.

**What follows the file.** What is typed is saved first. Then everything the window keeps by the file's path is kept by its new one (`#repath`): the text open in the editor, its tab and whether it is the one shown, which outputs are unfolded, which folders are folded, the last run and its results. The engine and the language engine forget the old path and are given the new, and a script open in the editor is made known to the language server under its new path, the old one closed there.

**Scripts that name the old path are said, not rewritten.** As in R and Stata, and by the rule that no control of Zemp Lite writes a statement. Where a script's text holds the old path, the pane says under the tree that the path "is named in a line of the project's scripts, which is not changed", with each place as a link to its line, twenty at most, and **Dismiss**. It is a group that a screen reader hears when it appears, and not a second status line, of which the window has one.

**Tests.** Native (`host.rs`): a file forgotten is not read back and a script naming it fails; the frame the last run left is still given; its neighbours stand; put in again it is there; a file a run wrote is forgotten and written again; a folder goes with all it holds; the manifest, a path that is not there and one above the project are not forgotten. The worker's messages; the session (`session.test`: what is gone is forgotten before what changed is given, once; a file changed and then gone is not given again). Browser (`files.spec`, both browsers): a script made, run, a line typed and the rename asked for at once by the keyboard: the name's stem selected, a name taken refused, the rename made, the file open and marked under its new name with what was typed, its printed result and its note still there, a second run green, the saved copy the text as it stands; Escape; no such items for what is fixed; ⌘K opening the row. A data file moved: the list of folders, the status line, the place named with its line and gone to, the script unchanged; a run that still names the old path ends with an error, as `zeff run` would; mended, it runs; the language engine underlines a wrong variable of the file at its new place; a place taken refused; Cancel.

**Reason.** The row of the plan and its points 4 and 5; and that the browser's engine must hold the project as it is, no more and no less.

## 22 November 2026: A file duplicated and deleted (release 0.2.2, step 8c)

**Choice.** **Duplicate** and **Delete…** in a file's menu, between the moving and the saving, and for the file shown in ⌘K. *Duplicate* makes the copy at once, beside the file, under the first free name with "copy" in it; what is typed is saved first, so a script's copy is the script as it stands; the status line says the copy's name; the script shown stays shown. Anything of the reader's can be copied, the main script and the manifest among it, since the copy is an ordinary file. *Delete…* is asked once, in the row (the owner's answer to question 1): "Delete pay.csv? It cannot be brought back.", with **Delete** and **Keep**. **Keep** has the focus, so that the Enter key, pressed without thought, deletes nothing; Escape keeps too. What is fixed has no **Delete…**. Nothing is undone in 0.2.2: the browser's storage has no bin.

**What a deletion takes with it.** The file leaves the editor: where it was the script shown, the main script takes its place. The results of a script deleted go with it. The engine and the language engine forget the file (step 8b's forgetting). Where another script names it, the pane says which, with the line, as for a rename; the script is left as it is, and its own results stay on the page, being what its last run printed.

**The question is not a dialog.** It is a group in the row, named by its question, with two buttons: no window over the page, nothing that takes the keyboard away. The edition's rule of no dialog is about the method dialogs of Zemp Studio; this keeps to its spirit all the same.

**Safari and the Tab key.** Safari gives a button the Tab key only with Option held, unless its owner has set otherwise. The test that goes from **Keep** to **Delete** by the keyboard does so in WebKit with Option held, which is how a reader there does it.

**Tests.** Browser (`files.spec`, both browsers): the main script copied twice, the names free each time, the script shown unchanged with its results; a copy opened holds the text and runs; **Delete…** asks in the row, its words and its two buttons, **Keep** in focus; Enter on it, and Escape, delete nothing; **Delete** deletes, the main script takes the place, the deleted script's results are gone, the status line says what went; from ⌘K for the file shown. A data file a script names deleted by the keyboard alone: the script named with its line and unchanged, its results still there, the next run ending with the engine's error, the folder `data` with no **Delete…**.

**Reason.** The row of the plan and the owner's answer to question 1.

## 23 November 2026: A folder renamed, moved, duplicated and deleted; and a menu that stays in the window (release 0.2.2, step 8d)

**Choice.** A folder's menu has what a file's has, after its own three for making: **Rename…**, **Move to…**, **Duplicate**, **Delete…**, then **Save as a zip…**. The operations are step 7's and the workspace's are steps 8b's and 8c's, which were written for a path of either kind. A folder's name has no ending to leave alone, so all of it is selected to be typed over. **Move to…** offers neither the folder itself, nor a folder inside it, nor the one it is in. The question of a deletion says how many files go with the folder ("Delete sketches copy and the 3 files in it? It cannot be brought back."), and for a folder that holds nothing says only its name. The folders the engine knows by name (`scripts`, `functions`, `data`) have no **Rename…**, **Move to…** or **Delete…**; a copy of one can be made.

**What follows a folder.** Every file in it: a script open in the editor is held under its new path with its text and its results; the folders in it that are folded stay folded; the engine and the language engine forget the old folder whole and are given each file at its new place. A folder deleted takes with it the script shown, where that lay in it, and the main script takes its place.

**Found on GitHub: the keyboard a moment ahead of the menu.** GitHub's run of step 8b failed step 8a's keyboard test in Chromium: the menu was opened by Enter and the arrow keys pressed, and a folder was being named where files should have been chosen. The menu gave its first item the focus in a way that could come before the list was drawn, on a slow machine; with nothing in focus, the first arrow went to the first item and not past it. The focus is now given once the list is drawn (Svelte's `tick`), and the test waits to see it there, as a reader's eye does, before it presses on.

**Found on the way: a menu that left the window.** A row near the window's foot opened its list downward, off the screen, and the list's last items could not be reached; with a file's menu at one item, then three, it had not shown. The list now stands under its button where there is room for it and over the button where there is not, and where neither is enough it takes the larger of the two and scrolls within itself. It is always inside the window.

**Tests.** Browser (`files.spec`, both browsers): a folder made in `scripts` with a folder and two scripts and a file in it, one script open and run; renamed, its whole name selected; the files under the new name, the open script marked, its text and printed result as they were, the folder in it still folded, a second run green; moved to the project's own folder, the list offering no folder it may not go to; duplicated with all it holds; a folder that holds nothing asked about by name alone; one of three files asked about with their count, deleted, the status line saying what went, the script shown untouched; the folder of the script shown deleted, the main script shown, the results gone; the fixed folders' menus without the three. And a row's menu in a window 420 pixels high: under its button for a row high in the pane, over it for the lowest, inside the window both times, its last item pressed.

**Reason.** The row of the plan.

## 23 November 2026: A project renamed, duplicated and deleted, and the Scratch project's own items (release 0.2.2, step 9)

**Choice.** Each project's row of the start screen has the menu of step 3, now of four: **Rename…**, **Duplicate…**, **Export project…**, **Delete…**. Each is answered in the row. *Rename…*: the name stands in a field, all of it selected; the line of the name in `zeff.toml` is rewritten and every other character of the file left (`renamed`, of step 5). *Duplicate…*: a name is asked, "Wages copy" offered; every file of the project is copied into a folder of its own, the interface's view state with it, the manifest naming the copy; the whole copy or none. *Delete…*: asked once (question 1), "Delete Wages and the 2 files in it? It cannot be brought back.", with **Export project… first**, **Delete** and **Keep**; **Keep** has the focus, and Escape keeps. The export offered leaves the question standing, to be answered after it. What the screen did is said in the line under the list, which a screen reader hears.

**A project's name and its folder part company.** A project renamed keeps its folder in the browser's storage (the points settled on 22 November). So a name is now refused where another project *has it*, whatever the capitals, not where a folder of that spelling exists; and a new project, a copy and an opened zip each take the first free folder for their name (`wages`, `wages-2`). A name freed by a rename can be taken again. The sentence of the refusal names the project that is here, as it is written.

**The Scratch project** (question 4). Its menu is **Duplicate…**, **Export project…** and **Reset…**. It is not renamed: it is found by its name. **Duplicate…** is the one step by which its work becomes a named project, which the specification asks for (section 3). **Reset…** stands where **Delete…** would: after the same question, with the count of its files, what it holds is deleted and it is made again with its examples as a first visit has them.

**From ⌘K, for the project open:** **Project: rename…**, **Project: duplicate…**, **Project: delete…**, and in the Scratch project **Project: duplicate…** and **Project: reset…**. Each writes what is typed, closes the project, and opens the start screen with the question in the project's row: one place where a project is asked about, and a project is not deleted from inside itself.

**Tests.** Unit (`projects.test`, the five of "a project renamed, duplicated and deleted"): the manifest's line alone changed and the folder kept, the old name then free in a folder of its own; names refused, its own name in other capitals a rename, the Scratch project not renamed; a copy with all it holds, the view state among it, an empty folder kept, the original untouched; the whole copy or none; the count without the app's and the engine's own, and the reset. Browser (`projects.spec`, both browsers): a project renamed in its row, the Scratch project's name refused, opened under its new name with its script and a manifest changed in one line; duplicated, a name taken refused, the freed name taken; the copy runs; Escape. Deleted: the question with its count and its three buttons, Enter and Escape keeping, the export from the question, the deletion, the address that no longer opens it, the name taken anew, and the exported zip opened again. The Scratch project's three items, a copy of its work under the reader's name, the reset with its question, the copy untouched. And each from ⌘K, what was typed a moment before being kept.

**Reason.** The row of the plan and the owner's answers to questions 1 and 4.

## 23 November 2026: The words, the keyboard and the address (release 0.2.2, step 10)

**The row of the plan.** The start screen says how a project is taken out; every new control is a stop of the Tab key with a name, and a command of ⌘K where it acts on what is open; no text under 12.5 pixels and every pair of colours at 4.5 to 1, the menus open; the check after a deployment exports the Scratch project at the address and reads the zip.

**Choice.** (1) *The words.* The start screen's paragraph on where projects are kept ends, in both its cases: "To take a project out, as a zip saved on this computer, choose **Export project…** in its menu (⋯) in the list, or in ⌘K while it is open; **Open a project's zip…** opens it again, here or in another browser." (2) *Three commands that were missing.* What the Project pane's **+** makes had no command: **Project: new script…** and **Project: new folder…** open the pane with the row in which the name is typed (in `scripts`, and at the project's top), and **Project: add files…** asks the computer for files and puts them into `data`. For them the naming of a new script or folder moved from the pane into the workspace's state (`Workspace.making`), as the questions of a row are (`asking`), and ⌘K has a file chooser of its own, so that it works with the pane closed. (3) *⌘K lists first what holds the words as typed.* With those commands in the list, "new project" typed in ⌘K found **Project: new script…** before **New project…**: the palette listed every command that holds every word, in the commands' own order. It now puts first the commands that hold the words one after another as they were typed (`matching`), and keeps the order otherwise. Found by the test of 0.1 that makes a project from the palette.

**Tests.** Unit (`commands.test`): the order for "new project", "project new", one word. Browser, both browsers: `palette.spec`, one test through every menu, naming row and question of the Project pane and the start screen, each open: every control shown is a stop of the Tab key or an item of a menu (reached with the arrows, `files.spec`), and has a name; ⌘K has the commands of the Scratch project and its main script and not those they are refused, those of a script and a project of the reader's own, and each of the three new commands does what it says. `workspace.spec`, in the light theme and the dark: with each menu, naming row, refusal and question open, no text under 12.5 pixels and none fainter than 4.5 to 1 against what is painted behind it. The second is a new measure (`faintText` in the tests' support): `tokens.test` holds each text colour to the grounds it is meant for, and this one reads the page as painted, so a colour set on a ground it was not meant for is found; it was seen to fail when asked for 7 to 1. `page.spec`: the paragraph's words. At the address (`host.spec`): the Scratch project exported from ⌘K is `Scratch.zip`, read by this repository's reader (its four files and its empty `data`), and opened again from the start screen as "Scratch 2", which runs.

**Reason.** The row of the plan; the testing handbook's accessibility items; and a reader who works from the keyboard must not need the pointer for anything this release added.

## 23 November 2026: A test that read the page a moment too soon (release 0.2.2, step 10)

**Found.** GitHub's run of step 10's commit (2469d2a) failed one test of release 0.2 in WebKit, and passed everything else: "when the check refuses a script, the results of the run before stay on the page" (`margin.spec`). At its end the whole script is written anew and run, and the test read what the page prints once, at the instant the run was said to be in step; the editor had not yet drawn the last output, so the last figure's description was missing from what was read. Nothing of step 10 touches it, and on this Mac it passed in the whole routine and twice more in both browsers.

**Choice.** The test reads the page until it holds what the run before printed (`expect.poll`), as the other tests of what a run prints do. What it asserts is unchanged: the same text, whole.

**Reason.** The editor draws its outputs a moment after the run ends; a test must wait for the page it reads. The same kind of slip as the one mended on 22 November in `wholeScript`.

## 23 November 2026: A test that asked for the file chooser as it pressed the key (release 0.2.2, step 10)

**Found.** GitHub's run of the commit after (1ffedbe), which changed one line of another test, failed one test of step 8a in Chromium and passed everything else: "by the keyboard alone a folder is made and files are added into it" (`files.spec`). The page kept from the failure shows the app as it should be after Enter on **Add files…**: the menu closed and the focus back on the row's button. The test was still waiting for the computer's file chooser, which it had begun to listen for in the same instant as it pressed Enter. The same test had passed on GitHub in the five runs before, and here.

**Choice.** The test begins to listen for the chooser before it opens the menu, and presses Enter after. What it asserts is unchanged. The cause is taken to be the test's: the test tool takes over the chooser only once it has been told to listen, and a key pressed in that instant can open the browser's own chooser, which no test sees. It is not shown by a failure brought about on purpose: the old form did not fail here in any trial. If the test fails again in this place, the fault is the app's and is looked for there.

**Reason.** A reader's Enter on **Add files…** runs the item at once, in the key's own turn, which is what a browser asks before it shows a chooser; nothing in the app waits between the key and the chooser.

## 23 November 2026: The reminder left the console no room in a narrow window (release 0.2.2, step 11)

**Found** by eye at the pre-release look, in pictures taken at the address. In the status bar the reminder of step 6 stands between the console's field and the keys. At 1,200 pixels, the narrowest window Zemp Lite lays out, it left the field 146 pixels in Chromium ("the browser may clear this project · not exported yet", which is what most first visitors see) and 39 pixels where the browser keeps nothing: the field's own hint was cut short, and a statement could hardly be typed in it. No test held the field's width.

**Choice** (`ConsoleLine.svelte`). The console's field keeps at least 240 pixels, whatever else the line holds; the reminder gives way before it, cut short with an ellipsis, its whole text then its title. And in a window under 1,440 pixels the keys ("⌘↵ run · ⌘K") are left out while the reminder stands: the top bar names both, beside Run and in the search box. With that the shorter reminder stands whole at 1,200 pixels.

**Tests.** Browser (`keeping.spec`, both browsers): at 1,200 pixels with the reminder standing the field is at least 240 pixels wide, before and after a run, nothing runs past the window's edge, the shorter reminder is whole, the line's title is its whole text and **Export project…** is there; at 1,600 pixels the keys stand beside it. The test of 0.2 that holds the status bar to one line in the design's order (`margin.spec`) now reads the line at both widths: the keys among its parts in the wide window, and in the narrower one only where no reminder stands.

**Reason.** The console is where a reader tries a statement; a reminder must not take its place. Features are frozen at this step, and this is a fault of the release's own making, mended before it is released.

## 23 November 2026: Release 0.2.2 is closed

**The owner's word:** "Release 0.2.2".

**The routine at the close.** Here, on the release's own tree, which differs from the commit before it in the version and the documents alone: format, lint, types, the edition check, the Rust checks, 31 native tests, 18 message tests, the measure, the nine sample projects identical, 271 unit tests, and the browser tests whole in Chromium. In WebKit all passed but five, the five that need the mouse (`console.spec` 95, `data.spec` 107 and 301, `language.spec` 67 and 114): at that hour this Mac's WebKit took no mouse, as it has at times since 0.1 (the tests' own probe found it so and four more tests stood aside by design); run again at once they failed the same way. The same five had passed here an hour before on the same code, and pass on GitHub. So the order of the release was changed to keep its promise: the commit "Release 0.2.2" was pushed without its tag, GitHub ran it whole in both browsers, and only when that was green was the commit tagged and the release published. On GitHub: green in both browsers on the commit before the release (`e894167`), which was deployed and checked at the address, and on the release's own. At the address, as a first visitor, in Chromium and in WebKit: a project made, a script and a data file added, renamed and moved, the project exported, its zip run by the released `zeff run` 0.8.0, the project deleted, opened again from its zip, and run; the new screens looked at by eye in both themes, which found the one fault mended at step 11.

**Not done, and said so in the notes.** The reader test (owed at Zeff 0.9.0 by the owner's decision at 0.2.1) and the checks by hand (a real keyboard, VoiceOver, Safari itself). The cause of the occasional wait before ⌘↵ on GitHub's machine in Chromium is still not found.

**The registers.** They are the Zeff repository's. The review is left for it in the shared notes (`zemp-lite-0.2.2-release-review-for-zeff.md`): #208 built as decided, with the owner's five answers; **Open folder…** and the replication package left for later under it; R4's figures; R10 answered as far as a way out of the browser goes; a browser's storage named as not a safe place; two things an engine could offer that Zemp Lite now does around it (what a run wrote, and a path told gone). No catalogued function shipped, so the catalogue's status column is not touched.

**The release.** Version 0.2.2 in `package.json`, `worker/Cargo.toml` and their lock files; the commit "Release 0.2.2"; the tag `v0.2.2`; a GitHub release marked a pre-release, as 0.2 and 0.2.1 were, carrying `docs/releases/0.2.2-notes.md`.

**What comes next for Zemp Lite** is not begun: the next row of section 15 of the Zemp Specification waits for the engine it names, and for the owner's "Start release".

## 23 November 2026: Paper for `.typ` files moves into Zemp 0.3, with Typst fetched on first use (#172, option A)

**The owner's ruling**, given in the coordinating session and passed to this one by it. He was asked: "Shall Paper start at Zemp 0.3, with Typst fetched on first use?" His answer, word for word: "Yes, as planned".

**What was decided.** Open decision #172 is decided as its option A: Typst inside Zemp is a module of Zemp's own, about 7 MB, fetched the first time a paper is opened and never part of the start bundle, built with a copy of the hyphenation crate that holds only the 33 languages under permissive licences. And Paper comes in three stages:

1. **At Zemp 0.3, with Zeff 0.9.0:** Paper for `.typ` files. The source and the live page side by side; a click on the page finds the source; an outline; tables and figures come from scripts through `export` (`.typ` and SVG) and are refreshed by Run; the PDF set by Typst in the browser, the same bytes everywhere; **Export script with output** as PDF.
2. **At Zemp 0.4, with Zeff 0.10.0:** the settings file beside the paper (#124), `refs.bib` with citations and cross-references checked as they are typed, and the Article template.
3. **After 1.0, unchanged:** `.zmd` with Zeff chunks.

**The specification.** The register and the Zemp Specification (sections 8 and 15) are the Zeff repository's, and the Zeff 0.9.0 session is entering the ruling there with the change logged. At the time of this entry it has not landed: the register committed there still shows #172 open. The copy in `docs/spec/` here is brought to that commit when it lands, each file taken from the commit and compared byte for byte, as was done for 0.2.2 (the entry of 22 November on Zeff 3159c99). Nothing in `docs/spec/` is changed by this entry.

**What this session does with it, and when.** Nothing of 0.3 is begun: a release is opened by the owner's "Start release", and 0.3 stands on Zeff 0.9.0, which is not yet released. When 0.3 is opened, stage 1 is planned in its checklist, and its first step is the spike of the Typst module, `[engine]`, which settles four things before anything is built on it: the licences of everything linked and shipped, the default font of the Article template (New Computer Modern) among them; the built size as it travels, compressed; the time to set a page in the browser; and the PDF's bytes against those of the desktop Typst for the same document.

**Still the owner's, from 0.2.2:** the reader test and the checks by hand.

**Reason.** The owner's ruling. The spike comes first because each of the four could change the plan: a licence that cannot ship, a module too large to fetch, a page too slow to keep live, or bytes that differ from the desktop's would each have to be known before the place is designed around them.

## 23 November 2026: Files chosen while an earlier choice was being written went into the wrong folder (found after release 0.2.2)

**Found.** GitHub's run of the commit after the release (`ab9a8f3`, which changed two documents and no code) failed one test in Chromium, the same test of step 8a that failed once on 23 November before the release ("by the keyboard alone a folder is made and files are added into it", `files.spec`), this time at its last lines: a file chosen with the pane's own chooser, for `data/`, was not in `data/`. The entry of that day said that a second failure in this place would be taken as the app's and looked for there. It is the app's.

**The fault** (`ProjectTree.svelte`, in the app since step 8a, and so in the released 0.2.2). When files are chosen the pane wrote them and only afterwards emptied its chooser and set the folder for the next choice back to `data`. A second choice made while the first was still being written therefore went into the first choice's folder; and the emptying of the chooser, when the first finished, could cut the second choice short, since the browser's list of chosen files is emptied with it. A reader meets it only by choosing files twice in quick succession, the first lot large enough to take a while: then the second lot lands in the first's folder, or part of it is not added. Nothing on the computer is harmed, and the pane shows where each file went. The chooser of ⌘K, added at step 10, emptied itself after the wait in the same way.

**Choice.** Both choosers take the list of files, and the pane the folder they were chosen for, before anything waits; the chooser is emptied and the folder set back at once. Each choice is then its own.

**Tests.** Browser (`files.spec`, both browsers): a large file and a small one chosen for a new folder, and at once a file chosen for `data/`: each is where it was sent, none in the other's folder, nothing refused. Before the mend it failed in both browsers in each of six trials; with it, it passes. The test that found the fault is unchanged.

**The first failure of that test** (23 November, before the release) was at another line, where the test waited for the computer's chooser to open. That one is still taken to be the test's, as recorded then; it is not shown to be the same fault, and nothing was being written at that point of the test.

**The release.** The tag `v0.2.2` stands on the commit before this; the mend is on the main branch, and so in the hosted alpha, which is built from it and still shows 0.2.2. The notes in the repository say so under the known issues, and so do the notes published with the GitHub release, which were brought to the repository's on the owner's word the same day ("Yes, add it"): the one item added, nothing else changed. No release is opened for it: that is the owner's to say.

**Reason.** A promise in the record is kept: the second failure was looked for in the app, and it was there.

## 23 November 2026: The specification's copy is brought to Zeff 635f19f, where release 0.2.3 stands

**What was entered there**, by the Zeff session on the owner's word in it ("Yes, enter 0.2.3"): the register's entries #209 (what the Variables pane shows for each kind of variable, due at the plan of Zemp 0.3), #210 (symbolic data, due at 1.0.0) and #211 (the Help place redesigned, decided on four drafts of a mockup kept outside the repositories, and its first stage placed); the row "0.2.3 | 0.8.0" of section 15 of the Zemp Specification, and a clause in the Help row of its section 7; the line in Zeff's `docs/spec_changes.md`.

**Choice.** `docs/spec/` is the Zeff repository's at commit 635f19f, each of its ten files taken from the commit, not from that repository's working folder, and compared byte for byte. Six differ from the copy of 3159c99: the register and the Zemp Specification, by the entries above; the catalogue, the Language Reference, the Engine Specification and the sample script, by the work of Zeff 0.9.0 since (`n_chars`, `row_number`, the sections of a script, and others), none of which Zemp Lite on Zeff 0.8.0 reads. The ruling on Paper of the same day (#172) is not yet entered there; the copy is brought up again when it is.

**Reason.** The specification is the authority, and a release is planned from its row: the copy must hold the row of 0.2.3 before its plan is written.

## 23 November 2026: Release 0.2.3 opened (step 1)

**The owner's word:** "Start release zemp-lite 0.2.3", and, to the plan and its three questions, "Go, as recommended". Each answer is his to overturn.

**His answers, as recommended.**

1. **R and Stata names in search** are found from the page's _Coming from R or Stata_ where it has one, and from the catalogue's `equivalent` column for every function; a match says where it was found.
2. **Home shows the names alone**, in columns under each package's heading; a function's one line is shown when the pointer or the keyboard rests on its name, on the package's page, and in search.
3. **The thirteen pages of Using Zemp Lite** are drafted in the steps from the app as it is, their pictures made from the app in the light theme; the thirteen are put to him to read before the release (step 9b) and changed on his word.

**What the reading found** is in `docs/releases/0.2.3.md`: the Help place keeps one page and no history; the worker, which builds the released engine in, can read the registry's packages, functions, summaries, datasets and the catalogue's `equivalent` through its public interface; the codes by family are given already; the engine has no one-line description of a package, and none is written here; 106 of the 250 pages of 0.8.0 have their comparison with R and Stata; the browser's own Back and Forward keys are settled at step 3.

**Choices of this step.** Version `0.2.3-dev` in `package.json`, `worker/Cargo.toml` and their lock files. Nothing of the app changes.

**Reason.** The owner's decisions.

## 23 November 2026: the check after a deployment waits for the build to arrive whole

**Found.** The deployment of the commit that opened 0.2.3 (52a0332) was reported failed: `tools/check-host.mjs` said that neither the worker nor the engine's WebAssembly was found from the page. The build had been sent whole; the check looked one second after the host said "deployment complete", when the files a script names were still answered with the page, as files not yet there. The same check, run from here some minutes later, passed at both addresses. It had happened once before, on 21 November, at the alpha's address.

**Choice.** Where neither the worker nor the WebAssembly is found, the build has not arrived whole and the check looks again, every 5 seconds, for a minute at most; then it reports what the last look found. Every other lack (a header missing, a file not kept, a "not modified" answer without its headers) fails as before at the first look that finds the build whole, and a build that never arrives fails after the minute, with the same two sentences.

**Reason.** A fault of timing in the check, not of the host or the build. Nothing is weakened: the conditions are unchanged, and only the one sign of a build still arriving is waited for. Tried against a stand-in host of the local build: whole at once (passes at the first look), arriving after 12 seconds (passes at the fourth), never arriving (fails after 60 seconds).

## 23 November 2026: the index of the help, from the worker (release 0.2.3, step 2)

**Choice.** A message of the worker, `helpIndex`, which needs no project, answers one line of JSON (`worker/src/index.rs`, `help_index`): the engine's version; `packages`, the registry's `packages_shipped` in the tiers' order, each with its `tier` and its `functions` in the order `zeff help <package>` lists them, each with its `name`, its `summary` (the page's one line) and its `names`; and `datasets`, each with its `name`, `title` and `summary`. Zeff 0.8.0 gives 255 functions in 10 packages and 4 datasets, 68 kB of JSON. A name a package has twice (a function of a frame and a function of a plot: `plot`, `histogram`, `density` and `boxplot` in `plot`) is listed once, where it is first printed, with the names of both; a name of two packages (`summary`, `min`) is listed in each.

**The R and Stata names** (question 1, as the owner answered it). Each is `{of, name, shown, from}`: the language (`R` or `Stata`), what a reader types (`feols`), how the source writes it (`fixest::feols()`), and which gave it: `page`, the table under _Coming from R or Stata_, or `catalogue`, the `equivalent` cell. The page's names come first; the catalogue's follow where the page did not give them; a name is kept once for each language. Both sources are prose and code mixed, so the names are read by rules, the same for every function:

- _R:_ every function called (`lm(`), with its package where one is written (`fixest::feols(`, and `car::deltaMethod` without brackets); every operator between percent signs (`%in%`); in the catalogue, an item between commas that is one bare name (`pnorm`, a package such as `haven`), and for "`dlnorm` family" the four functions of the distribution (`dlnorm`, `plnorm`, `qlnorm`, `rlnorm`); in a page's cell, the cell itself where it is one name (`pi`).
- _Stata:_ every function called (`inlist(`), and the first word of every command. A command begins the text, follows a semicolon, or follows "or", "then", "and", "after". In the catalogue, which lists commands between commas ("regress, reghdfe"), it follows every comma too; in a page's cell, which writes a statement ("tabulate x, missing"; "bysort g: gen s = sum(x)"), it follows a colon and never a plain comma, after which Stata writes options.
- _Both:_ nothing is read inside quotes or a Stata macro; a name of one letter is left out (in the examples it is an argument far more often than a function), unless a package is written before it (`fixest::i()`); a cell that says there is none ("no single function", "None built in") gives nothing; "Same name in R and Stata" is the function's own name in both.
- _The catalogue's languages:_ a piece between semicolons is of R until the word `Stata` stands in it, and of Stata from there until the word `R`. A piece that names neither is of R, as a package's function is, unless it is one bare word after a piece of Stata ("Stata estat firststage, …; ivreg2; weakivtest").

The rules are generous on purpose: a name too many is a match low in a list, a name missed is a reader who does not find the function (R10). What they are known to read amiss: an option of Stata written after a comma in the catalogue is taken for a command ("tabulate, chi2"; "summarize, detail"); "local n : word count" gives `word`; a pattern (`scale_x_*()`, `as.*`, `d*`), an index (`x[[1]]`), a returned value (`e(N)`, `r(table)`, `t$statistic`) and the time-series operators (`L.`, `D.`) give nothing. Step 6 ranks a match by an R or a Stata name below a match by a name or a title.

**Where the names are read.** In the worker, not in the interface: the message carries the names ready, as the checklist asks, and the reading is tested beside the registry it reads (9 tests of the rules in `worker/src/index.rs`; 4 of the index in `worker/tests/host.rs`, against the catalogue and against what the released `zeff help <package>` printed, kept in `tests/scripts/packages/`).

**A dependency named.** `zeff-registry`, the engine's own kernel crate (Apache-2.0), at the commit of `v0.8.0` as the other Zeff crates: the table of a page is of its type `Block`, which the worker must name. The engine links it already, and `worker/Cargo.lock` gains only the line of the dependency.

**Found: three packages have no page of their own.** `zeff help text`, `zeff help plot` and `zeff help datasets` print the page of the _function_ of that name (`text` and `plot` of the `plot` package, `datasets` of `datasets`), since `zeff help` looks for a function before a package; so the list of those three packages is printed by no command of 0.8.0. The plan's finding 4 said a package's page is `zeff help <package>`'s print; it is corrected, and step 5a sets a package's page from the index (the same names and one lines, in the same order) for every package alike. For the Zeff session: a way to ask for a package by name where a function has it (noted in `docs/progress.md`).

**The interface.** `Engine.helpIndex()` and the language worker's, which a run never holds up; the workspace asks the first time the Help place is shown and keeps the answer (`Workspace.indexHelp`, `helpIndex`; `src/help/once.ts`, which forgets an asking that failed so that the next asks again). Nothing on the screen changes at this step.

**The measure (R4).** The worker is 2,928.5 kB compressed, 7.0 kB more than at step 1 (2,921.5 kB), of 5,000 kB. The cold start read 120 to 259 ms at this step against 55.7 ms at step 1; the unchanged worker of step 1, built again and measured in the same minutes, read 174 ms, while two test runs of the Zeff repository held two processors: the difference is the machine's, not the change's. The limit is 1,000 ms.

**Reason.** The row of 0.2.3 and #211: Home, Topics and search are all drawn from one list of what this engine runs, in the engine's words.

## 23 November 2026: the history of the Help place (release 0.2.3, step 3a)

**The step split.** Step 3 (Back, Forward, Home and the trail) was too large for one session: a trail whose every step is a link needs pages that do not exist yet (a package's page for `plot`, `text` and `datasets`, which `zeff help` cannot print; a page of the codes by family). So the checklist has 3a, the history with its three buttons, its keys and the mouse (done here), and 3b, the trail and the pages its steps open.

**Choice.** The pages of Help this reader opened are a history (`src/help/history.ts`, pure, 8 unit tests): a stop is Home, a name (what `zeff help <name>` prints) or a code; a page opened follows the one shown and drops what lay forward; the page already shown is not entered again; past 200 pages the oldest is forgotten. `Workspace.helpHistory` holds it for the life of the window; nothing of it is kept with the project. A page gone back to is read from the engine afresh, so that the page of a function of the project follows its script; where two pages are asked for in quick succession, the later one stands.

**Where the history begins.** With the first page shown: Home where Help is opened with no page asked for, and the page itself where F1 or **Explain** opens Help the first time; **Back** is then greyed, as in a browser's new tab, and Home is one press away. The buttons go through what the reader opened, and the reader did not open Home.

**The buttons** stand at the head of the place, after the link of the left pane, as the mockup draws them: **Back** and **Forward** (arrows, named for a screen reader, saying on resting where they go: "Back: reg"), disabled where there is nowhere to go; **Home**, with its word, lit and marked as the current page while one is there. Home shows the sentence the place had with no page open until step 4 gives it the index. The page's name stays in the bar until the trail takes its place at 3b.

**The keys and the mouse (finding 6).** While the Help place is shown, ⌘[ and ⌘] (Ctrl with a bracket on other keyboards) and the mouse's fourth and fifth buttons go back and forward through Help's own history, and the page keeps them from the browser (`preventDefault` at the key, and at the press, the release and the click of a side button). The other way, an entry of the browser's own history for each page of Help, was not taken: the browser's Back would then also be the way out of the app from Help's first page, a press in the Script place would move Help unseen, and the address would have to carry Help's page. Outside Help these keys and buttons are the browser's, as before; so is the browser's own toolbar everywhere. **Help: back** and **Help: forward** in ⌘K come at step 10, as planned.

**Tested.** Five browser tests in both engines (`tests/browser/help-history.spec.ts`): Home lit, the buttons greyed at either end and saying where they go; a page from the field, from a link of the right pane, from F1 and from **Explain**'s code; the branch dropped and a page not doubled; the place kept when one leaves Help and returns; ⌘[ and ⌘] with the cursor in the field, each kept from the browser, more presses than pages; the three buttons from the keyboard alone (Safari gives a button the Tab key with Option held); the side buttons as events in both engines and, in Chromium, as the mouse sends them, the address unchanged. Not kept: where a page was scrolled to when one goes back to it; it opens at its top.

**Reason.** #211, part 3: a help system is read by jumping, so Back and Forward go through the reader's own path, and nothing a reader does in Help takes them out of the app.

## 23 November 2026: the trail of the Help place, and the pages its steps open (release 0.2.3, step 3b)

**Choice.** A trail stands in the bar of the Help place, where the page's name stood, after **Home**: where the page is, each step before the last a link, the last the page itself (`src/help/trail.ts`, worked out from the index of the help and the codes by family, both the engine's):

- a function: _Help › Packages › stats › t_test_; a name two packages have names both, side by side, each a link (_Help › Packages › data · results › summary_); a shipped dataset stands under `datasets`;
- a package: _Help › Packages › stats_;
- a code: _Help › Errors and warnings › Z01xx › Z0101_, the family by its pattern as the engine names it, which is short and exact, with what the family is of on the page it opens;
- a name the index does not know (a function of a later release, a name mistyped): _Help › a_learning_, over what the engine says of it;
- Home: _Help_ alone.

**Help** and **Packages** both open Home: in this stage Home is the index of functions by package, so it is the page of the packages too; at stage 2 of #211, when Home becomes the index of methods, **Packages** needs a page of its own. A name of the engine's (a package, a function, a family, a code) is set in the code's type, the words in the app's.

**A package's page** is set from the index of step 2 for every package alike (`src/help/pages.ts`, `src/help/ListPage.svelte`), as #211, item 7, draws it without the two parts that wait for the engine (a package's one line, and the methods that use it): the package's name; "package · tier 1" and "14 functions in Zeff 0.8.0"; its functions in the engine's order, each a link with its one line; under `datasets`, the four shipped datasets after its two functions, under the heading **Datasets**. It is a place of the history apart from the function of the same name: `plot`, `text` and `datasets` typed in the field open the function, as `zeff help` does, and the function's trail has its package one step back; a name that is a package's alone (`stats`, `regress`) opens the package. The engine's print of a package (`zeff help stats`) is no longer shown; the seven it prints are held to the same names and one lines in the same order by a test.

**The codes by family** are a page, **Errors and warnings**: every family the engine lists (12, with 144 codes at 0.8.0), its pattern and what it is of as a heading, each code a link with its title; the Outline pane lists the families. A family's step of a trail opens the page at that family's heading; it is one page, shown from different places, and each place is a stop of the history. The worker's message `codes`, there since 0.2.1 and unused, is now asked for with the index and kept (`Workspace.helpCodes`).

**A page and its trail come together.** The page shown is kept with the stop it is of (`Workspace.help.stop`), set when the page has been read, so that a trail never stands over the page before it. The index and the codes are asked for before the first page is shown.

**Known.** A function of the project's own with the name of a package that has no function of that name (`fn regress`) opens the package's page from F1, not its own; none of the samples has one, and it is left until a reader meets it. In a window narrower than the 1,200 pixels the app is laid out for, the field gives way first and then the page's own name, cut at its end.

**Words that are Zemp's.** "Packages", "Errors and warnings", "Datasets", "package", and the counts ("14 functions in Zeff 0.8.0", "144 codes", "12 families"): labels of the place, as "Outline" and "Related functions" are. Every name, one line, family and title is the engine's.

**Tested.** Unit: the trail of each kind of page, a name of two packages, a package and the function of its name, a dataset, an unknown name, a code with and without its family; the two lists (11 tests, `src/help/trail.test.ts`). The worker's `codes` under Node. Browser, both engines (`tests/browser/help-trail.spec.ts`, 5 tests): each step of a trail opens its page and goes into the history; the pages of `stats`, `results` and `regress` row for row what the released `zeff help` prints; `plot` the function and `plot` the package; `datasets` with its datasets; the 12 families and 144 codes, a family's step at its heading; the bar at 1,200 and 1,000 pixels; 12.5 pixels and 4.5 to 1 in both themes; the keyboard alone.

**Reason.** #211, part 3 and item 7; and step 2's finding that three packages have no page the engine prints.

## 23 November 2026: the check after a deployment looks again for any lack, not one

**Found.** The deployment of step 3b's commit (2eb7df7) was reported failed: two seconds after the host said it was done, the style sheet asked for a second time was answered whole (200) where a browser that has it is answered "not modified" (304). Run from here some minutes later, the check passed at both addresses. It is the fault of this morning in another form: a place of the host that had only just been given the build. The mend of this morning waited only where the worker or the WebAssembly was not found.

**Choice.** Where a look finds anything lacking, the check looks again, every 5 seconds, for a minute at most, and reports what the last look found.

**Reason.** In the first seconds after a deployment the check cannot tell a host still being given the build from a host at fault, whatever the lack is; a minute later it can. A fault of the host or of the build (a header missing, a file not kept, a "not modified" answer without its headers) is there at every look and fails as before, a minute later than it did. Nothing of what is checked changes. Tried against the stand-in host of the local build: whole at once, arriving after 12 seconds, never arriving (fails after the minute).

## 23 November 2026: Home, the Index of functions (release 0.2.3, step 4)

**Choice.** Home, the page Help starts on and **Home** returns to, is the **Index of functions** (`src/help/HomePage.svelte`), set from the index of step 2: the title; under it "Zeff 0.8.0 · 255 functions in 10 packages"; then each package the engine ships, in the tiers' order, a heading with the package's name (a link to its page) and its count, and its functions as links, in the engine's order, in as many columns as the middle has room for (three at 1,200 pixels with both panes open, more with them closed); under `datasets`, after its two functions, the four shipped datasets under **Datasets**. Only what this engine runs is listed. The Outline pane lists the packages, each going to its place, until it becomes Topics at step 5a.

**The names alone, and the one line on resting** (question 2, as the owner answered it). A function's one line, the engine's, is shown in a small box under its name while the pointer rests on it (after a third of a second) or the Tab key does (at once); it goes when the pointer or the key moves on and at Escape, follows its name if the page scrolls, and is tied to the name for a screen reader. It is the app's own box, not the browser's, which shows nothing for the keyboard.

**The counts.** A name two packages have (`summary` of `data` and of `results`) is listed under each and counted in each, as each package's own count has it: 255 is the sum of the ten counts, where the engine has 250 different names. A name a package has twice (`plot`, `histogram`, `density` and `boxplot` of `plot`) is one name, as in the index.

**Before the index is there.** Until the worker has given the index (a moment, the first time Help is shown), and where it cannot, Home shows the sentence it had: how a page is opened by F1, by Explain and by the field.

**A command of ⌘K:** **Help: index of functions**, which opens Home from any place, as a page of the history.

**Tested** (`tests/browser/help-home.spec.ts`, 6 tests in both engines): the title, the line of counts, the ten headings with their counts; the functions of `core`, `data`, `stats` and `regress` name for name what the released `zeff help` prints; the datasets; no function of 0.9.0 or of the roadmap; every one of the 259 names opened in turn, each giving the engine's page headed by that name; a package's heading opening its page; the one line by the pointer and by the keyboard, under its name and inside the window; three columns at 1,200 pixels with both panes, more with them closed, no name cut and nothing sideways at 1,000; 12.5 pixels and 4.5 to 1 in both themes, the box of the one line too; the command.

**Reason.** The row of 0.2.3: "Home an Index of functions by package until the methods arrive with the engine"; #211, part 1: Home lists only what the engine in use can run.

## 23 November 2026: the Topics pane and its sections (release 0.2.3, step 5a)

**Choice.** The left pane of the Help place is **Topics** (it was **Outline**): the link over it, its heading with its ×, and its command of ⌘K (**Help: show Topics**, **Help: hide Topics**) say so, from the one table of the panes (`src/app/panes.ts`). It holds sections that fold, each headed by a button with its mark (▾ open, ▸ folded), its words and its count (`src/help/TopicsPane.svelte`):

- **On this page**, where the page open has sections: what the Outline pane held, each section going to its place, the one in view marked. Home has none. It stands first so that nothing the pane did before is lost at this step; step 5b puts the page's neighbours over it and **‹ All topics** beside them.
- **Packages** (10): each package the engine ships, in its order, with its count; a click opens the package's page, and the package whose page is shown is marked.
- **Errors and warnings** (144): the 12 families as the engine lists them, each with its pattern, what it is of and its count; a family folds to its codes, each with its title, a click opening the code's page, the code shown marked.
- **Using Zemp Lite** is not listed until its pages exist (step 8).

**As they first stand:** the three sections open, every family folded to its name (144 codes unfolded would bury the pane). **Kept with the project:** which sections and families the reader folded or unfolded, as the part `help.topics` of `.zemp/views.json`, each by its key (`page`, `packages`, `codes`, `codes:Z01xx`) with whether it is open; a key the file does not name stands as it first does (`topicOpen`).

**The view state is of version 4.** The pane of Help is `panes.help.topics`. A file of 0.2.1 or 0.2.2, which says `panes.help.outline`, is read with the reader's choice carried over: a project whose Outline pane of Help was closed opens with Topics closed. An earlier build that reads a file of this one finds no `outline` and opens the pane, and keeps `help` as a part it does not know.

**Found and mended: a project left in Help opened in it empty.** The index of the help was asked for when the Help button was pressed; a project reloaded while Help was the place shown never pressed it, and came back with Home blank and, now, Topics without its sections. The Help place asks for its index and takes its stand on Home when it comes on the screen, however it came (`Workspace.readyHelp`). The test of what is kept reloads the page in Help.

**A row rested on.** The count and the mark of a row are set in the faintest ink, which on the darker ground a row takes under the pointer stood at 4.47 to 1; under the pointer they are one step stronger. Found by the test of the pane as painted.

**Tested.** Unit (`src/app/views.test.ts`): the old choice carried over, both ways, and gone when written back; the folded sections written, read and defaulted; a damaged part passed over. Browser, both engines (`tests/browser/help-topics.spec.ts`, 5 tests): the heads with their counts; a section and a family folded and unfolded by the mouse and by Enter and Space; what is folded standing after the Script place and back; each of the 10 packages and each of the 144 codes pressed in turn, each opening the engine's page, the row marked; **On this page** first, its sections as the Outline pane's tests had them; the pane closed by its ×, opened by its link and by ⌘K, the middle wider by the pane; 12.5 pixels and 4.5 to 1 in both themes; nothing off the pane's side. In `kept.spec.ts`: what is folded after a reload, and a project written as 0.2.2 left it, its Outline pane closed, opening with Topics closed.

**Reason.** The row of 0.2.3 and #211, items 4 and 9: the left pane lists what there is to read, in sections that fold, and is opened and closed as every pane is (#203).

## 23 November 2026: Topics beside a page (release 0.2.3, step 5b)

**Choice.** Beside a page that has neighbours the Topics pane holds, in place of the packages and the codes (`src/help/around.ts`, `src/help/TopicsPane.svelte`):

- **‹ All topics**, at its head;
- what the page stands in, as a heading with its count, and its neighbours under it, each a link, the page open marked and brought into view: beside a function, its package (the heading a link to the package's page) with the package's functions, a function's one line shown on resting; beside a shipped dataset, `datasets` with its two functions and, under **Datasets**, the four datasets; beside a package's page, its own functions, none marked, the heading plain; beside a code, its family (its pattern and what it is of, a link to the codes at that family) with the family's codes and their titles;
- **On this page**, the page's sections, as before, folding as before.

A name two packages have (`summary` of `data` and of `results`) has both beside it, each with the name marked. Home, the codes by family and a name the index does not know have nothing beside them, and the pane keeps to its sections.

**‹ All topics** returns the pane to its sections (On this page, Packages, Errors and warnings) without leaving the page: the page, the trail and the history are as they were. The next page opened has its neighbours beside it again. There is no button from the sections back to the neighbours of the same page: the package or the code open is marked in the sections, and any page opened brings its neighbours.

**The neighbours keep to a box of their own.** The plan and the mockup put the neighbours over **On this page**; a package has up to 71 functions, where the mockup's topics had five or ten methods, and a list of that length would push the page's own sections, the pane's commonest use, out of sight. So the neighbours scroll inside a box of at most 38 hundredths of the window's height (two packages share it), the page open brought to its middle, and **On this page** stays in view under it.

**Tested.** Unit (`src/help/around.test.ts`, 6 tests): each kind of page, a name of two packages, a package and the function of its name, a dataset, a code, and the pages with nothing beside them. Browser, both engines (`tests/browser/help-topics.spec.ts`, now 6 tests): the neighbours of a function with the open one marked, a neighbour pressed and gone back from, the package's head, All topics and the page unchanged, On this page folded across pages; both packages of `summary`, a function far down `core` in view with the page's sections, a dataset, a code and its family's head; each of the 10 packages from the sections and each of the 144 codes from beside its family, every page the engine's; the pane as painted beside a code, beside a function and in its sections, in both themes; All topics and a neighbour from the keyboard alone.

**Reason.** #211, item 4: beside a page the reader sees where it sits and has the pages around it one click away; and the sections are one press away without losing the page.

## 23 November 2026: what the search of Help finds, and in what order (release 0.2.3, step 6)

**Choice.** `src/help/search.ts`, a module with no screen yet (the list under the field is step 7): `entriesOf` makes what is searched from the index of the help, the codes by family and the pages of Using Zemp Lite (none until step 8), and `search` answers what was typed. It runs in the browser on what the engine has given; no request leaves the page.

**What is searched.** Each function once, as it is one page: a name two packages have (`min`, `max`, `append`, `quantile`, `summary`) with both packages, the first one's one line and the R and Stata names of both; 250 functions at 0.8.0. Each package (its line "14 functions", there being no one line of a package yet). Each shipped dataset, each code with its title, each page of the app by its title.

**The rules, in the order #211 sets (part 4), best first, from the second letter typed:**

1. a name typed exactly, whatever the capitals: a function's, a package's, a dataset's, a code, a page's title;
2. a name beginning with what is typed;
3. a word beginning with it: of a name after its first (`test` in `t_test`, `normal` in `dist.normal`), then of a title or a one line;
4. an R or a Stata name: one typed exactly, then one begun; typed as the name (`feols`) or as its source writes it (`fixest::feols`), with or without the brackets of a call;
5. a code begun (`W02`);
6. from the fourth letter, a name one key's slip away (a letter wrong, missing or added, or two changed over), of a function, a package, a dataset or a code.

A match is entered once, by the best rule that finds it, with why it matched where that is not its name: "R lm()", "Stata regress", as the source writes it; and the word of the name or the one line that matched, for the list to mark. Up to eight matches.

**Choices the register leaves open.**

- _A part of a name_ is counted with "a word of a method's name" of #211, before a word of a one line: `test` finds the tests by their names before the functions whose lines mention a test.
- _A code typed exactly_ is a name typed exactly (rule 1); only a code begun waits for rule 5.
- _A slip is not offered beside a name typed exactly._ `W0202` typed is that code, and `W0201`, one key away, is not a guess worth a place.
- _Ties_ within a rule: by the name as a dictionary has it, and for one name by its kind (function, package, dataset, code, page), so `plot` gives the function and then the package. The same letters give the same list, in whatever order the entries are held.
- _Two places kept for R and Stata names typed exactly._ The words of one lines are the commonest match and the weakest, and with eight places they crowded the better evidence out: `table` gave the function `table` and seven matches by a word of a one line or a title, and not `tabulate`, which is R's `table()`. Where more than eight are found, the one lines give up two places at the most to R and Stata names typed exactly. The order shown stays the order of the rules; no name gives up a place. This keeps #211's order and its purpose ("so a reader finds `reg` by the name they know").
- _Names of one letter_ (`E`, `n`) are not searched for, the list opening at the second letter; the field opens them by name with Enter, as before.

**Nothing found** is never an empty answer: the sentence "Nothing here is called or described by “xtreg”. The nearest names:" with up to three names of functions, packages or datasets, nearer first (one slip away for a word of up to four letters, two from the fifth; `xtreg` gives `ivreg` and `reg`); or, where no name is near, "… Try a function's name, a word of what it does, an R or a Stata name, or a code." The sentences are Zemp's words.

**Tested.** Unit (`src/help/search.test.ts`, 22 tests): what is searched; each rule by itself; the order between the rules, with a code begun and a slip; a match entered once; ties, and the same list from the entries turned about; eight at the most; the two places kept, one, none, and never from a name; nothing found, near and far; the measure of slips. On the whole index of Zeff 0.8.0 as the worker gives it (`src/help/search.node.test.ts`, 7 tests): every function, package, dataset and code found first by its own name; 25 names of R and of Stata each finding its function with why (`lm`, `feols`, `t.test`, `ttest`, `left_join`, `mutate`, `xtset`, `rnorm`, `geom_point`, `%in%` and others); a name begun, a part, a word, a code begun, a slip; `table` still finding `tabulate`; `xtreg`; and every keystroke of twenty words (169 different beginnings) answered in under a sixtieth of a second, each timed three times and its best time taken, since another program on the machine can make a timing longer and never shorter (the first form of the test, one timing each, failed once at 42 ms while the whole suite ran beside it).

**Reason.** The row of 0.2.3 and #211, part 4; R10: a reader who cannot find a function by the name they know is a reader lost.

## 23 November 2026: the suggestions under the field of the Help place's bar (release 0.2.3, step 7)

**Choice.** The field of the Help place's bar (`src/help/SearchField.svelte`) is the one that was there, as the owner asked, now a combobox: from the second letter typed a list opens under it with what step 6 finds, refreshed at each key. Each match is a row: what it is (function, package, dataset, code), its name, for a function its package (both, for a name of two), its one line with the word that matched in bold where it matched by a word, and under it why it matched where that is not its name ("matched R lm()", "matched Stata ttest"). Where nothing is found the list holds the sentence of step 6 and, under it, the nearest names as rows of the same kind.

**The keys.** ↓ marks the first match and then moves down, to the last and no further; ↑ moves up, and from the first to none marked; ↵ opens the one marked. With none marked ↵ opens the page of the name or the code as typed, as the field did before (a code in either case); so a name typed whole and entered opens its page whatever the list offers, and the names of one letter (`E`, `n`) are still opened. Esc closes the list and keeps what was typed; a key opens it again. `/` puts the cursor in the field from anywhere in the Help place that is not itself a field, and is a letter when typed in one. The pointer marks the row it rests on and a click opens it. Leaving the field closes the list. A page opened from the list is a page of the history as any other; the field is left empty.

**The Open button is gone:** ↵ does what it did, and the mockup's field has none. The field's own words: "Search functions, codes, R and Stata names", with a `/` at its right; to a screen reader it is "Search Help: a function, a package, a dataset, a code, or an R or Stata name", a combobox that controls the list "What was found", whose rows are options, the marked one told through the field (`aria-activedescendant`), the sentence of nothing found a status.

**The list waits for the index.** Typed in the moment before the worker has given the index (the first time Help is shown), the field would have answered "Nothing here is called…" of an index it had not read. The list stays closed until the index is there, and then answers. Found on the first picture taken of it.

**Two refinements of step 6, found on the engine's own index.**

- _`lm` found `anova` before `reg`_ (R writes `anova(lm())`, and ties went by name). Among the functions an R or a Stata name finds, the one that has it earlier among its own names now comes first: `lm` is the first R name of `reg` and the fifth of `anova`.
- _`ttest` found `test` beside `t_test`_, as a slip of one key. A slip is not offered beside a name typed exactly; that now holds of R's and Stata's names as of the engine's: `ttest` is Stata's name, not `test` mistyped.

**Tested.** Browser, both engines (`tests/browser/help-search.spec.ts`, 7 tests): one letter opens nothing, the second does; `lm`, `ttest`, `W02`, `regg`, a word of a one line (`kolmo`, marked), a name of two packages, a package beside the function of its name, a dataset; a match opened by ↵ and by the mouse, each into the history, the field emptied; nothing found, near (`xtreg`) and far, a nearest name opened; every key named above, with the cursor staying in the field; `/` from the page and from a button, and as a letter; typed before the index arrives; no request made while five words are typed and a match is opened; the list inside the window and under its field at 1,200 and at 1,000 pixels; the roles and names; 12.5 pixels and 4.5 to 1 in both themes. Unit: two tests more for the refinements (`src/help/search.test.ts`, 23; `search.node.test.ts`, 7). The older tests of Help type in the same field and enter, unchanged but for its role.

**Reason.** The row of 0.2.3 and #211, part 4, with the owner's word that the search is the field already in the bar.

## 24 November 2026: the frame of the app's own pages, Using Zemp Lite (release 0.2.3, step 8a)

**The step split.** Step 8 was the frame of the pages and their pictures made by a script; it is 8a, the frame with the first two pages (done here), and 8b, the pictures. Two pages were written at 8a because a frame cannot be shown, or a link from one page to another tested, without them; 9a and 9b have the eleven that remain (six and five).

**Where the pages are kept, and how they are written.** Each page is a text file of this repository, `src/using/pages/<name>.md`, in a small part of Markdown, so that it reads as a page wherever it is opened and Prettier keeps it tidy: `# Title`; the first paragraph, the page's one line, in plain words; `## Heading`; paragraphs; lists, plain (`- `) or numbered (`1. `), an indented line going on with its item; a picture, `![words for a screen reader](its-name)`. Within a line: `**a control**` as the screen names it; `` `code` ``; `<kbd>a key</kbd>`; and a link, `[to another page](its-name)`, `[to a function](help:reg)`, `[to a package](package:stats)`, `[to a code](code:W0201)`. Nothing else: no link out of the app, no heading below `##`, no HTML but the key.

**The reader** (`src/using/read.ts`) reads a page into its parts, and any mark it does not know, or that is not closed, is an error that names its line; a page with a slip is not half shown. The tests read every page there is, so a slip is found before it is shipped.

**The list of the pages** (`src/using/pages.ts`) is kept by hand: the name of each file, its title and its one line, in the order the pages are read. It is what the Topics pane, the trail and the search need at once; a test holds each entry to what its own file begins with, and the list to the files there are. The text of a page is not in the app's first load: each is a file of the build (about 0.9 kB compressed), fetched when its page is first opened, and a test watches that it is so.

**In the Help place** the pages are pages as any other: a kind of stop of the history (`using`, with the page's name, or none for the list of them); the trail _Help › Using Zemp Lite › Finding help_, whose middle step opens a list of the pages with their one lines; a section of Topics, **Using Zemp Lite**, with its count, and beside a page all of them with the open one marked; found by search as the kind "page", by a title begun or a word of a title or a one line; set in the type of the engine's pages (`src/using/UsingPage.svelte`), a control in bold, a key as a key, a link to the engine's page in the code's type. The Topics section lists the pages there are (two now), not the thirteen to come.

**The words are Zemp's,** the one exception #211 makes to the rule that every word of Help is the engine's; the list page says so ("on the app itself, in Zemp's own words"). Getting started and Finding help are drafted from the app as it is, short, in plain words, and are put to the owner with the rest at step 9b (question 3).

**The build, measured (R4).** The app's first load: the script 217.2 kB compressed (213.9 kB at step 7; the reader, the page and the list are 3.3 kB), the style sheet 10.8 kB (10.6 kB). The two pages are files of their own, 0.87 and 0.82 kB compressed, fetched when opened. The worker is unchanged.

**Tested.** Unit (`src/using/read.test.ts`, 9 tests): each kind of part; the pieces of a line; a paragraph of several lines and Windows' line ends; twelve slips, each named with its line; the list held to the files; links only to pages there are. Browser, both engines (`tests/browser/help-using.spec.ts`, 6 tests): a page opened from Topics, its title, one line, headings, lists, controls, keys and code, and every letter of it its file's; links to another page, a function and a code, each into the history; found by search; the trail and the list of pages; a page's text fetched on opening and once; 12.5 pixels and 4.5 to 1 in both themes; a link from the keyboard alone.

**Reason.** #211, item 9: how the app is used is the app's to say, kept with the app and changed with it.

## 24 November 2026: the routine is run with the display awake

**Found.** The routine of step 8a failed here on seven tests of WebKit, five of them in parts of the app the step does not touch (the console line, the data viewer, completion): every one a test that needs the mouse where it is aimed, or the pointer to rest on something. The display of this Mac had gone dark (it sleeps after two minutes, and it was past midnight), and while it is dark the WebKit of the test tool does not take the mouse. With the display woken and kept awake the seven passed, and then the whole suite, 455 tests in both browsers. It is the fault noted at the close of 0.2.2 ("the five tests that need the mouse, which this Mac's WebKit did not take at the close"), whose cause was not then known. GitHub's machines have no such display and were never affected; there a mouse that does not land is an error of the test tool's probe, as before.

**Choice.** On this Mac the routine is run with the display kept awake for as long as it runs: `caffeinate -d -u npm run routine` (a tool of macOS that holds the display on while the command runs and changes no setting). Nothing in the repository changes; no test is skipped or weakened.

**Reason.** A failure of the machine's, not of the app or the tests; and a routine that fails at night for no fault of the work would teach its reader to distrust it.

## 24 November 2026: the pictures of the app's own pages (release 0.2.3, step 8b)

**Choice.** A page of Using Zemp Lite shows a picture of the screen where its text has `![words](name)`: the file `src/using/pictures/<name>.webp`, drawn as wide as the page's column allows and never wider than it was taken, with an edge to set it off in either theme, its words those a screen reader says. The picture's place is kept before it arrives (its size is known), so the page does not jump.

**Made by a script, not by hand** (finding 7): `npm run pictures` builds the interface, serves it as the browser tests do, and runs `tools/pictures/pictures.spec.ts` in Chromium, where each picture has a scene: the steps a reader would take to the screen it shows (the Scratch project opened and run; `lm` typed in the search field of Help). The screen is taken in the light theme, in a window of 1,200 by 750 pixels, the narrowest the app is laid out for, and written as WebP, compressed by the test browser itself (a canvas), so that no tool is added to the repository; Safari, Chrome and the web views of the desktop app all show WebP. The scenes use the fixtures of the browser tests. The pictures are committed; they are made afresh when the screen they show has changed, and before a release (added to step 11). They are no part of the routine, and are not held byte for byte: a browser on another machine draws its letters a little differently.

**One size, and how sharp.** Every picture is 1,200 by 750, taken at one pixel to the point. A page shows it at 760 points at the widest, so on a screen of two pixels to the point it has about 1.6 pixels to the point, sharp enough to read the words of the screen, at half the bytes of a picture taken at two.

**Loaded when its page is opened.** The app's first load carries where each picture is (a short address for each) and none of the pictures; the browser fetches a picture when the page that shows it is on the screen and the picture is near. A test watches the requests: none for a picture until its page is opened, then that page's alone.

**Held to the pages** by a unit test: every picture a page names is a file there is, with words enough to say what it shows; no picture is left that no page shows; each page has its picture.

**The build, measured (R4).** The two pictures are 52.6 and 55.3 kB. The app's first load: the script 217.4 kB compressed (217.2 kB at step 8a), the style sheet 10.8 kB. Thirteen pictures of this size would be about 0.7 MB of the build, none of it in the first load. The worker is unchanged.

**Found by the test of the picture's place:** its edge made it two pixels wider than its column; the edge is now counted in its width.

**Tested.** Unit (`src/using/read.test.ts`, one test more). Browser, both engines (`tests/browser/help-using.spec.ts`, one test more and the two of the themes extended): no picture asked for with the app, Help and Home on the screen; opened, the page's picture arrives as it was taken (1,200 by 750) with its words; no wider than its column with the panes open, with them closed and at 1,000 pixels, its shape kept, nothing pushed sideways; the other page's picture fetched when that page is opened; on the page with its edge in both themes.

**Reason.** #211, item 9: "a picture of the screen stands where a method has its example"; finding 7: a picture taken by hand goes stale with each release.

## 24 November 2026: six pages more of Using Zemp Lite, and the test of the controls they name (release 0.2.3, step 9a)

**The pages**, drafted from the app as it is (question 3), each short, in plain words, with its picture: **Projects, scripts and files**; **Running a script**; **The notes beside each statement**; **Sections and the outline**; **The Data place**; **The Plots place**. With Getting started first and Finding help last they are eight of the thirteen; the order in Topics is the order they are read. What each says was taken from the tests of the place it describes, which state in plain words what the app does, and from the screen itself.

**Every control a page names is looked for on the screen** (`tests/browser/using-controls.spec.ts`; finding 7). A page names a control in bold, as the screen names it. The test reads each page from its file, takes the controls it names, brings the app to the screens that page speaks of (the screen of projects, a project with its panes and menus open, a run, the Data and Plots places, Help), and looks for each name among what the controls there are called: by a screen reader, in their own words, or on resting. A name is there whole, or as the words a longer name begins with ("Projects ▾"). A page with no screens in the test fails, so a new page cannot be added without them. A control that the app renames or drops now fails the page that names it, in both engines.

**What the test found at once:** the page said every file's menu has **Move to…**; the main script's has not, since what Zeff opens by name keeps its name and place. The page now says so.

**Corrected in Getting started:** the whole script is run by ⌘⇧↵; ⌘↵, with the cursor in the script, runs the statement at the cursor. The page said ⌘↵.

**Left unnamed on purpose:** Stop (the Run button reads so only while a run goes) and the arrow that runs a section (shown when the pointer or the Tab key rests on the section) are described in words, not in bold: a name in bold is one the test can find standing on the screen.

**The pictures:** eight now, each of its page's place as a reader comes to it (the Project pane; the commands that run; the notes with every output folded; the Outline pane; the Data place; the Plots place), 33 to 58 kB, 407 kB together, none in the first load; the first load's script is 218.1 kB compressed (217.4 kB at step 8b), the six entries of the list of pages.

**Tested.** The controls of the eight pages on their screens (9 tests in both engines). The tests of step 8a and 8b now run over all eight pages: each opens from Topics set in type, with its picture arrived as taken, at 12.5 pixels and 4.5 to 1 in both themes. Unit: each page read, held to the list, its links and its picture.

**Reason.** Finding 7 of the plan: a page that names a control is checked by a test to name one that is on the screen, so that the pages cannot fall behind the app unnoticed.

## 24 November 2026: the last five pages of Using Zemp Lite, and the keys held to the app (release 0.2.3, step 9b)

**The pages**, drafted as the eight before them: **Commands with ⌘K**; **Keyboard shortcuts**; **Exporting and opening a project**; **Where the work is kept**; **Reporting a problem**. The thirteen of #211, item 9, are all written, in the order they are read: Getting started first, the places of the app, Finding help, and then these five. Each has its picture (the list of commands; the console line with a statement run in it; the menu of a project's row; the screen of projects; the report of a script that fails).

**The page of keyboard shortcuts is held to the app** by a unit test (`src/using/shortcuts.node.test.ts`), both ways as far as can be: every key the page lists is named in the test with a test of the browser that presses that key and watches the app answer, by its file and its title, which must be there; the page's keys and the test's are the same set, so that neither can gain or lose a key alone; and every key the script's own editor is given (`Mod-Enter`, `Shift-Mod-Enter`, `Alt-Enter`, `F1`, read from `Editor.svelte`) is on the page. A key of the app that is neither the editor's nor yet on the page is not found by this; the page is read against the code at each release (#211, item 12).

**What the pages say of the engine** was taken from it: the report holds what `zeff report-bug` says it holds, in its own first lines (statements of the script, the names and types of the variables, the names of the files they were read from, no rows of data, and a message may name a value).

**The owner's reading is moved** from this step to a step of its own, 9e: on 24 November 2026 the coordinating session passed the owner's change of the Help place's layout (#211, item 13), which changes what several pictures show; it is step 9c; the check of his standing rule that the pages agree with the engine (#211, item 12) is step 9d; and the pages are put to him at step 9e, when both are done and the pictures are made again.

**The pictures:** thirteen, 34 to 63 kB, 679 kB together, none in the first load.

**Tested.** Unit: the three tests of the keys; each page read, held to the list, its links and its picture (13 pages). Browser, both engines: the controls each of the thirteen pages names, on its screens; each page opened from Topics with its picture, at 12.5 pixels and 4.5 to 1 in both themes; found by search by a title begun and by a word of a one line.

**Reason.** #211, item 9; and the plan's own rule for the page of shortcuts, that its list be held by a test to the shortcuts the app has.

## 24 November 2026: The specification's copy is brought to Zeff 58c3c2d, where the owner's layout of Help stands

**What came.** On 24 November 2026 the coordinating session passed two changes the owner made to the Help place of 0.2.3 after seeing it as step 5b left it: "remove "related functions" move search bar to right end, Move "on this pane" to the right pane", and "Also I want to remove "Help" from right to "Home"". They are recorded in the Zeff repository as item 13 of #211 (commits 8caf4c4 and 58c3c2d), with the row of 0.2.3 in section 15 of the Zemp Specification and the Help row of section 7 amended; items 11 (a Run button under each example, at Zemp 0.3) and 12 (the owner's standing rule that each release's Help agrees with the engine it carries, checked at the build, in force from 0.2.3) were added since the last copy.

**Checked before acting.** A message from another session is not the owner's word by itself. Both commits were read in the Zeff repository through Git alone (`git log`, `git show`), on its main branch as pushed, under the owner's name, before anything was changed here; `~/dev/zeff` was not touched.

**Choice.** `docs/spec/` is the Zeff repository's at commit 58c3c2d, each file taken from the commit and compared byte for byte. Four differ from the copy of 635f19f: the register and the Zemp Specification, by the entries above (and #212 to #214, of the engine); the testing handbook and the Language Reference, by the work of Zeff 0.9.0, none of which Zemp Lite on Zeff 0.8.0 reads.

**Reason.** The specification is the authority, and a step is built from what it says.

## 24 November 2026: the layout of Help as the owner changed it (release 0.2.3, step 9c)

**Choice,** as #211, item 13, has it:

- **The right pane of Help is On this page**: the sections of the page open, each going to its place, the one in view marked, as the Outline pane of 0.2.1 and the Topics pane of step 5a held them. It is opened and closed by its own link, the last thing of the bar, and by its ×; ⌘K has **Help: show On this page** and **Help: hide On this page**.
- **Related functions is removed**: the pane, its link, its command, and the asking of each related function's first line. A page's own **See also** keeps its links, as before. `relatedOf`, which only the pane used, is gone with its test.
- **Topics no longer holds the page's sections.** It holds its three sections that fold, and beside a page the page's neighbours with **‹ All topics**. With the sections gone the neighbours have the pane: each holder's list is as tall as 72 hundredths of the window (two packages share it), the page open brought into view.
- **The search field stands at the right end of the bar**, after Back, Forward, Home and the trail, with nothing after it but the link of the right pane. It was already there; a test now holds the order.
- **The trail no longer begins with the word Help.** It begins with the first step under Home: _Packages › stats › t_test_, _Errors and warnings › Z01xx › Z0101_, _Using Zemp Lite › Finding help_; a name the index does not know is its own name alone. **On Home there is no trail**: Home's button, marked, says where one is.

**What a list shows at the right.** The register says a list, "such as a package's page or Home", has no sections, and the pane says so: "This page has no sections." That is taken for every page that is a list: a package's page (the heading **Datasets** on that of `datasets` too), the codes by family, the list of the pages of Using Zemp Lite, and Home. The families of the codes are reached from Topics and from the trail's step, which still opens the codes at a family's heading. `partsOf`, which gave a list's parts to the pane, is gone with its tests.

**The view state** stays of version 4, which no release has carried: the panes of Help are `topics` and `page`. A file of 0.2.1 or 0.2.2, which says `outline` and `related`, is read with both choices carried over: a reader who had closed Related functions has the right pane closed. The key `page` of the folded sections of Topics is no longer read.

**The pages of Using Zemp Lite:** Finding help says where the page's sections are; nothing else in the thirteen spoke of what changed. Every picture was made again (`npm run pictures`), seven of them changed: those that show Help, and those whose run carries its time of day.

**Tested.** Unit: the trail of each kind of page without the word, and none on Home (12 tests); the view state, both old choices carried and the old keys gone when written back. Browser, both engines: the sections at the right, marked and gone to, on a function's page, a code's and a page of the app's own; "This page has no sections." on Home, a package's page, the codes and a name the engine has no page for; no pane, link or command called Related functions, and See also still a list of links, each opening its page; Topics beside a page with its neighbours and nothing of the page's sections; the trail beginning with its first step, never with Help, and absent on Home; the bar's order on Home, on a page, at 1,000 pixels and with the right pane closed; a project of 0.2.2 opening with its choices kept. The older tests of the outline, of the related functions and of the trail were rewritten to the new places; none was dropped but the one of the pane that is gone.

**Reason.** The owner's decision of 24 November 2026, #211, item 13.

## 24 November 2026: the pages Zemp keeps, held to the engine and to the app (release 0.2.3, step 9d)

**The rule** (#211, item 12; the owner, 24 November 2026: "you must update the help pages (including codes and figures) as per the zeff engine"): at every release the pages Zemp keeps agree with the engine the release carries; the build fails where they do not. In force from this release.

**Choice.** A page of Using Zemp Lite gives code between backticks, and every such piece is held in one of five ways; a piece held in none fails the build, so nothing can be written into a page that no test reads (`src/using/held.ts` lists the pieces by page; the two tests go through every page).

1. _A name of the engine's_ (a function, a package, a dataset, a code) needs no entry: it is looked for in the index of the engine the worker carries, under that name. A link to the engine's page (`help:`, `package:`, `code:`) is held the same way.
2. _What a page says the search finds_ ("`lm` and `reghdfe` both find `reg`"): searched for on that engine's own index, and the function found.
3. _A command of ⌘K_: read from the list of commands in the running app, by its name, or by the words it begins with (`Open file:`).
4. _What a page quotes from the screen_ (what a note says, `wages Frame · 15,571 × 13`; how a result stands to the script, `edited · not run`, `stale`, `not run`, `failed`, `running…`, `waiting`; the file `zeff.toml`; a section's comment; `saved`): each has a scene, which the browser's test makes in the app, in both engines, and the piece is read among the words the window shows. Where the piece is what the reader types (a condition of the Data place, `year == 2012`; `run` in the list of commands; a subsection's comment), the scene types it and looks at what the engine and the app answer: the rows kept and their count, the commands listed, the subsection in the Outline pane.
5. _A word of the command line or of a project's files_ which the app has no screen to show (`zeff run`, `zeff help`): listed with why, and read by a person when the engine changes.

**The pictures** are the third part of the rule: made again from the running app of each release, by `npm run pictures`, in the pre-release routine (step 11).

**What it does not reach.** A sentence of prose that says what the app does, with no code and no control named in it, is held by no test; it is read against the app at each release, and the owner reads the thirteen at step 9e. The controls a page names in bold are held by the test of step 9a.

**Tested.** Unit, on the engine as the worker carries it (`src/using/engine.node.test.ts`, 4 tests): the links of every page; every piece of code of every page held; nothing listed that a page no longer gives; the four things the search is said to find. Browser, both engines (`tests/browser/using-engine.spec.ts`, 12 tests): the ten scenes, each with the pieces the pages quote from it, and none made for nothing; the commands the pages name (twenty-one namings, nineteen commands), each in the list.

**Reason.** #211, item 12: no release ships a page that the engine it carries would contradict.

## 24 November 2026: the owner has read the thirteen pages of Using Zemp Lite (release 0.2.3, step 9e)

**The owner's word:** put the thirteen pages to read (question 3 of the plan, as he answered it), he answered: "The pages stand as they are".

**Choice.** No page is changed and no picture is made again for this step. The pages are those of steps 8a, 9a and 9b, as corrected at 9c for the layout of Help; their pictures are those made at 9c, and are made again from the app as it is released, at step 11.

**Also put to him at 9c, and not answered apart:** that a page which is a list (the codes by family among them) says "This page has no sections." in the pane at the right, as the register has it for a list; it stands so.

**Reason.** The owner's decision.

## 24 November 2026: The specification's copy is brought to Zeff af5b7a3, where the owner's Home for Help stands

**What came.** On 24 November 2026 the coordinating session passed the owner's choice of a new Home for Help in 0.2.3 (#211, item 14): of five drawings he chose the soft panels ("Soft panel is final and record it"), one panel under another and never side by side, with no Index of functions ("not required", as every function is reached from its package). It is recorded in the Zeff repository at commit af5b7a3, which was read through Git before anything was done: it is on the main branch there, under the owner's name.

**Choice.** `docs/spec/` is the Zeff repository's at commit af5b7a3, each file taken from the commit and compared byte for byte. Two differ from the copy of 58c3c2d: the register of open decisions (#211, item 14) and the Zemp Specification (the row of 0.2.3 in section 15).

**Reason.** The specification is the authority, and the copy here is the Zeff repository's at a named commit.

## 24 November 2026: Home of Help is a landing page of soft panels (release 0.2.3, step 9f)

**The owner's choice** (#211, item 14): a landing page with a few words on Zeff and on Zemp Lite, their versions, and every main topic with a few words; one after another, not side by side; no Index of functions; of five drawings, the soft panels.

**What Home is.** Under the title **Help**: a panel for **Zeff** (its version, three sentences, and the counts "255 functions · 10 packages · 144 codes") and one for **Zemp Lite** (its version, its stage **alpha**, two sentences); then, under the label **Topics**, a panel for each section of the Topics pane, with its count, a sentence and an arrow: **Packages** (with the ten packages' names as small links inside it, in the engine's order), **Errors and warnings**, **Using Zemp Lite**. The panels keep one width, at most 700 pixels, and stand one under another at every width of the window. Zeff's version and every count are read from the engine; Zemp Lite's version is the app's own; the words are those of the drawing the owner chose (`src/help/home.ts`).

**Engineering choices.**

1. _The Index of functions is removed whole_, with its columns, its one line on resting the pointer on a name, and its command of ⌘K. A test goes through the ten packages and opens every one of the 255 functions from its package's page, so that nothing is lost with the index; search and links reach them as before.
2. _A page of the packages._ The panel **Packages** has to open something, as the other two open the codes by family and the list of the app's pages. It opens a new page, **Packages**: the ten packages, each with its count of functions and its tier, a click opening the package. It is a page of the history as any other, and it is now where the first step of the trail of a package and of a function leads (that step led to Home while Home was the index).
3. _A panel answers anywhere on it._ The panel's heading holds its button, which is stretched over the whole panel; the packages' links inside the Packages panel stand over it. So the keyboard and a screen reader meet one button for each panel, named by the topic and its count, and then the ten links.
4. _The command of ⌘K is renamed_, **Help: home**, in place of **Help: index of functions**: it opens Home from any place, as before. The page **Commands with ⌘K** and one paragraph of **Finding help** (what Home is) are changed to match, after the owner's reading of step 9e; this is said to him.
5. _On this page lists Home's panels_: Zeff, Zemp Lite, Packages, Errors and warnings, Using Zemp Lite. A panel near the page's end cannot reach the top of the page, so the pane now keeps the section gone to marked while the page stands at its end, on every page of Help (before, the mark fell back to an earlier section).
6. _Home's words are held to the engine_ by the rule of item 12 (`src/using/engine.node.test.ts`): the code Home gives as its example (Z0103) is a code of the engine the app carries, and its page has the four parts Home says it has (meaning, common causes, example, fix); the counts are the engine's; every function has its one line. What Home says in prose of Zeff (that the same script gives the same numbers on every computer, that every function is checked against R and Stata) is the owner's wording and is read by a person, as any prose is.

**Found on GitHub while this step was made: the check of step 9c failed once, in Chromium on Linux**, in the test of the order of Help's bar. The fault was the test's: in a window narrower than 1,200 pixels the app shows a line at its top, which moves the bar down, and the test measured the first control before that line stood and the rest after. The test now waits for the line, and for its going. The app was right: the two commits after it, which carry the same layout, passed GitHub's check as they stood, the race not showing again, and it is they that were deployed.

**Tested.** Unit (`src/help/trail.test.ts`, `history.test.ts`): the counts, the panels and what each opens, the page of the packages, the trail under it. Node, on the built engine (`src/using/engine.node.test.ts`, 2 tests more). Browser, both engines (`tests/browser/help-home.spec.ts`, 6 tests): the panels with their versions, counts and words; one under another at one width; each topic's panel and each package's link opening its page, the panel answering anywhere on it; all 255 functions reached from the packages, and no Index of functions nor a command for it; **Help: home**; the sizes, the contrast and the keyboard in both themes. The pictures made again (`npm run pictures`); six changed.

**Reason.** The owner's decision; the choices under it keep every function one click from its package and every panel a single plain control.

## 24 November 2026: The specification's copy is brought to Zeff 860eb63, where the owner's rule for a name with two functions stands

**What came.** On 24 November 2026 the coordinating session passed the owner's decision on a name with two functions in the help (open decision #215, new: "Yes, option A"), recorded in the Zeff repository at commit 860eb63, which was read through Git before anything was done: it is on the main branch there, under the owner's name.

**Choice.** `docs/spec/` is the Zeff repository's at commit 860eb63, each file taken from the commit and compared byte for byte. Two differ from the copy of af5b7a3: the register of open decisions (#215) and the Zemp Specification (the row of 0.2.3 in section 15).

**Reason.** The specification is the authority, and the copy here is the Zeff repository's at a named commit.

## 24 November 2026: A name with two functions has a page for each, and a chooser (release 0.2.3, step 9g)

**The owner's decision** (#215, option A): one page for each function, told apart by what it is called on; the bare name opens a short chooser of the two; search, Topics and a package's page list the two apart; hover and F1 go to the one in use; On this page lists one page's sections. In Zemp Lite 0.2.3 on Zeff 0.8.0, from what the engine already gives; the engine's own part (`zeff help` printing the chooser) is for Zeff 0.10.0.

**What the engine gives, and what was added to the worker.** The engine registers 259 functions under 250 names: nine names name two (`histogram`, `boxplot` and `density`, each a layer of a plot and a plot of a frame's variable; `plot`, of a frame and of a result; `min` and `max`, of values and of a frame; `append`, of a list and of a frame; `quantile`, of a frame and of a distribution; `summary`, of a frame and of a result). The worker's index (`worker/src/index.rs`) listed a name once in a package; it now lists every registered function, each with the line its page gives under Usage (`usage`), whether it is written after the value it is called on (`method`), and that first value by the name the usage writes it with and its type (`first`), all read from the engine's registry, none written here. Each function now has its own R and Stata names, where two of a package shared theirs.

**Engineering choices.**

1. _The words are made from the type by one rule_ (`src/help/forms.ts`, `wordsOn`): one type is named with its article, in small letters, without what it holds ("of a frame", "of a plot", "of a result", "of a distribution", "of a list"); several types, which a function written before its values takes (`min(a, b, ...)` is of `Float | Date | DateTime`), are "of values". Should two functions of a name ever be called on the same type, each says its package too ("of a frame, in data"); a test on the built engine holds that the nine read apart. Nothing is written by hand for any name, as the decision asks. The register's own example said "of a fit" for `plot`; the engine's type is `Result`, so the app says "of a result".
2. _Which function a page is of_ is the package that has it and the type it is called on, kept in the page's place in the history (`form`). The bare name is another page, the chooser.
3. _The engine's print is cut in the app, not in the worker._ `zeff help histogram` prints both pages one after the other; the reader of pages (`read.ts`) already reads the print into one part for each function, and each function of the index finds its own part by its package and, where a package has two of the name, by its one line. A test on the built engine holds, for all nine, that each function finds a part, that no part is given to two, and that the part's usage is the function's own. Where the print is not of the index's functions (a function of the project's own of that name is printed in the engine's place) it is shown as it came, with no chooser.
4. _The chooser is a list_, as a package's page is: the name, a sentence ("histogram is two functions. Choose one by what it is called on."), and a row for each with what it is called on, its one line and its usage. It has no sections. It is a page of the history, and a step of each function's trail: _Packages › plot › histogram › of a frame_, the name opening the chooser. The chooser's own trail is the name's, under every package that has it.
5. _The counts follow_: a package's page, Topics and Home count every function, so `plot` has 35 where it had 31 and Home says 259 functions where it said 255. This is the engine's own count of what it registers.
6. _Search_ has an entry for each function: the two of a name stand apart, each with what it is called on beside its name, its package, its own line and its own R and Stata names; two of one name are ordered by package, then by what each is called on, so that the same letters always give the same list.
7. _Topics_ lists a package's functions with the two of a name apart; beside one function's page its own package is shown and it alone is marked; beside the chooser both are.
8. _F1 in the script_ asks the engine's language server for its hover at the name, with the script as it stands: the hover is the page of the function the call would run, and its first line (name, one line, package) says which. That function's page is opened directly, not the chooser. Where the hover is of neither, F1 opens the chooser. Hover itself is unchanged.
9. _A section is added to the page **Finding help**_ ("A name with two functions"), after the owner's reading of step 9e; this is said to him.

**Tested.** Rust (`worker/tests/host.rs`): the index lists each function once for each type it is called on, 259 in all, with its usage; `histogram`, `min` and `append` by what each is called on. Unit (`src/help/forms.test.ts`, 15 tests; the search's tests brought to two entries for a name of two): the words, the cut of the print, the chooser, the history, the trail, the lists, Topics, the hover. Node, on the built engine (`src/help/forms.node.test.ts`, 4 tests): the nine names and their words; each function's own part of the print; the hover; every other name one page. Browser, both engines (`tests/browser/help-forms.spec.ts`, 6 tests): the chooser and each function's page, with its title, its sections once and its trail; all nine names; search, Topics and the package's page; F1 on a frame, on a plot, before its values and on a frame's column; sizes, contrast and the keyboard in both themes. The older tests that opened `summary` as one long page now choose one of its two.

**Reason.** The owner's decision; the choices under it take every word from the engine and leave the engine's print untouched until Zeff 0.10.0 prints one function at a time.

## 24 November 2026: The words, the keyboard and the address of the Help place (release 0.2.3, step 10)

**Choice.**

1. _Three commands of ⌘K more_, beside **Help: home**: **Help: search** shows Help from any place with the cursor in its search field, as `/` puts it there in Help (the field takes the cursor once it is on the screen and the list of commands has closed); **Help: back** and **Help: forward** are listed only where there is a page to go to, each saying where it goes ("to reg; ⌘[ in Help"), and show Help if another place is shown. A command that could do nothing is not offered, as with the commands of the cursor.
2. _The keyboard._ One test goes through the Help place as release 0.2.3 leaves it (Home; a function's page; the chooser of a name with two functions and one of the two; a code; the list of the app's pages) and holds that every control on the screen is a stop of the Tab key and has a name; and that the four commands do what they say, from Help and from the Script place.
3. _Sizes, contrast and width._ One test, in each theme, goes through every kind of page Help shows (Home, the packages, a package, a function, a chooser, one function of two, the codes, a code, the app's list, a page of the app, a name the engine has no page for, and the search's list open and saying it found nothing), at 1,200 pixels and in a window of 1,000: no text under 12.5 pixels, every text at 4.5 to 1 against its ground, the page never wider than its column, and the bar on one line. No new pair of colours was made for the release: every one is of the tokens the unit test already holds.
4. _The check after a deployment_ has a sixth test, in both engines: at the address Help opens on Home with the engine's version and its counts; `lm` in the search finds `reg` by R's name and its page opens; and a page of the app's own is read with its picture, which is a file of the address.
5. _The notes_ are drafted (`docs/releases/0.2.3-notes.md`); what can only be measured at the close is marked so.

**Tested.** Browser, both engines: `palette.spec` (1 test more), `help-whole.spec` (2 tests). Host: `tests/host/host.spec.ts` (1 test more), tried here against the build served on this Mac before it was pushed.

**Reason.** The row of 0.2.3 and the design guide's rules for every release: the whole app from the keyboard, 12.5 pixels, 4.5 to 1.

## 24 November 2026: The owner keeps the nine wordings of #215; the specification's copy is brought to Zeff ca4c070

**The owner's word**, passed by the coordinating session on 24 November 2026 and read in the Zeff repository before it was taken (commits f0ba9ca and ca4c070, on the main branch there under the owner's name): put the words that tell the two functions of each of the nine names apart, as step 9g made them, he answered "Keep them". So `plot` and `summary` of a fitted model read "of a result", and `min` and `max` written before their values "of values".

**Choice.** Nothing is changed in the app. `docs/spec/` is the Zeff repository's at commit ca4c070, compared byte for byte; one file differs from the copy of 860eb63, the register of open decisions (#215: what was built, what the engine owes at 0.10.0, and the owner's answer).

**Reason.** The owner's decision; the copy here is the Zeff repository's at a named commit.

## 24 November 2026: A question to the language server waits for the text it was to be told (found on GitHub at step 10 of 0.2.3)

**Found.** GitHub's check of step 10 failed once, in WebKit, in a test of 0.2.1: **Format the script**, from ⌘K, said "formatted" and left the script as it was typed. What the page held, kept by the check, showed more: the typed lines stood unformatted and under them scraps of the script the project had held before. The test passed here forty times in a row, so the page was read, not the test changed.

**The cause, a fault of the app since 0.2.1.** A script's text is told to the language server a moment after the last key. The telling first brings the language worker in step with the project's files, which takes as long as a file just saved takes to read; only then is the text sent. The workspace noted the text as told when the telling _began_. A question asked meanwhile (formatting, completion, the usage of a call, a hover) was sent at once and overtook the text: the server answered of the text it still held. For formatting the answer is a list of edits, and they were made in the newer text, at places that were another text's. A reader who typed and asked for **Format the script** while the file was still being read could have had the script garbled; it is undone with ⌘Z, but nothing said that it had happened. On this Mac the file is read too fast for it to be seen; on GitHub's machine in WebKit it was slow enough once.

**Choice.**

1. _In the client of the language server_ (`src/engine/language.ts`): the tellings of a text go one after another, in the order they were given, and every question waits for the tellings begun before it. The opening of the conversation, which a telling itself waits for, is sent at once as before. A telling that failed holds up neither the next nor a question.
2. _In **Format the script**_ (`workspace-state.svelte.ts`): the edits are made in the text the server was asked about; where the script was changed while the server answered, it is asked again (three times at most), and never are the edits of one text made in another.
3. _The hover under the pointer_ is asked as the other questions are, of the script as it stands; it was asked without the script being told first.

**Tested.** Unit (`src/engine/language.test.ts`, 3 tests more), on a project whose file is slow to read: a question asked while a text is on its way is sent after it (this one fails on the code as it was); texts reach the server in the order given; a telling that failed holds nothing up. The browser test that found it is unchanged.

**Reason.** A formatter must never make edits in a text they were not computed for; and the language server's answers are of the script the reader sees.

## 24 November 2026: Release 0.2.3 is closed

**The owner's word:** "Release 0.2.3".

**The routine at the close.** Here, on the release's own tree, which differs from the commit before it in the version, the pictures and the documents alone: format, lint, types, the edition check, the Rust checks, 36 native tests, the worker's message tests, the measure (2,925.7 kB as it travels, of 5,000), the nine sample projects identical, 377 unit tests, and the browser tests whole in Chromium and in WebKit (529 passed, 3 skipped by design). The thirteen pictures of Using Zemp Lite were made again after the version was set, since the screen of projects and Home of Help show it; nine of the files changed. The walk of a first visitor at the address and the checks at both addresses were made at step 11 on the commit before, whose app is the same but for the version it shows.

**Not done, and said so in the notes.** The reader test (owed at Zeff 0.9.0 by the owner's decision at 0.2.1) and the checks by hand (a real keyboard, VoiceOver, Safari itself). The cause of the occasional wait before ⌘↵ on GitHub's machines is still not found. A function of R named with its brackets in a page's prose is still set as a link.

**The registers.** They are the Zeff repository's. The review was sent to the Zeff session at step 11: #211's first stage built as decided, with items 13 and 14; #215 built for Zemp Lite and its nine wordings kept by the owner; R4's figures; R10 unchanged. No catalogued function shipped, so the catalogue's status column is not touched.

**The release.** Version 0.2.3 in `package.json`, `worker/Cargo.toml` and their lock files; the commit "Release 0.2.3"; the tag `v0.2.3`; a GitHub release marked a pre-release, as 0.2 to 0.2.2 were, carrying `docs/releases/0.2.3-notes.md`.

**What comes next for Zemp Lite.** The owner has decided the content of 0.2.4 (open decision #220, Zeff 674aa9b): a landing page, the loading and project screens redrawn, the name drawn with a badge. The specification's copy is brought up to it after this release; nothing of it is begun before his "Start release 0.2.4".

## 24 November 2026: The specification's copy is brought to Zeff 674aa9b, where release 0.2.4 is entered (#220)

**The owner's word**, passed by the coordinating session on 24 November 2026 and read in the Zeff repository before it was taken (commit 674aa9b, on the main branch there under the owner's name): the content of Zemp Lite 0.2.4 is a landing page at the root of the address with the app at `/app/`, the loading and project screens redrawn, and the name drawn as "Zemp" with a raised "Lite" badge ("Record for 0.2.4", open decision #220).

**Choice.** `docs/spec/` is the Zeff repository's at commit 674aa9b, compared byte for byte, made after release 0.2.3 was tagged. Four files differ from the copy of ca4c070: the Zemp Specification (the row 0.2.4 of section 15), the register of open decisions (#220, and the entries Zeff's own release 0.9.0 added since), the function catalogue and the help examples (Zeff 0.9.0's own work, nothing of Zemp Lite's). Nothing is changed in the app and nothing of 0.2.4 is begun: it opens on the owner's "Start release 0.2.4".

**Reason.** The copy here is the Zeff repository's at a named commit, brought up to date before a release of Zemp Lite is planned from it.

## 24 November 2026: The owner's first answers on the pages of Help redrawn (not yet placed in a release's plan)

**The owner's words**, in this session, after release 0.2.3: "make the help place more smart and aesthetic. show mockups"; then, on the first draft, "reorder, restructure the individual help pages. completely revamp. don't make too much flashy"; then, on the second draft, "A, one page".

**Answered, on the second draft** (`~/dev/handbook/zemp-lite-help-pages-mockup.html`, outside the repositories): a function's page is one page, not tabs; its long parts are always shown whole, nothing folded; the one plain line about the reader's own script is kept, on a function's page and on a code's; the work is a release of its own after 0.2.4. The order of the parts he wishes changed, and has not yet said how. The third draft shows the page whole in the order proposed, the other examples at its foot.

**Not answered:** the first draft's proposals for Home and for search (`~/dev/handbook/zemp-lite-help-smarter-mockup.html`).

**Reason for recording here.** They are the owner's rulings on a screen of Zemp Lite; the register of open decisions is the Zeff repository's, and the coordinating session enters them there. Nothing is built: no release of Zemp Lite is open.

## 24 November 2026: The owner adds three things of the Help place to release 0.2.4 (not yet in the checklist)

**The owner's words**, in this session: "add few more things in 0.2.4: 1. If I hover over functions in scripts it should not show entire help instead it should show only the usage block. 2. in Help place, on the page button should be removed and on the page pane should be permanent, no grey shade, in the same help page (should look like a part of the help page) 3. Every new run will open the script place and when the help is ckicked, all the topics should be collapsed in the left pane and landing page should be shown. Revise the landing page of the help place as per new design."

**His answers to what three of the phrases mean** (asked by the question card, the same day): "every new run" is each start of the app, which opens the Script place whatever place was open before; the landing page with every topic of the left pane closed is what the first click on Help after a start shows, and later in the same visit Help returns to the page being read; "the new design" is the look of 0.2.4's screens (the cards with their hexagon icons, the name drawn as Zemp with the raised Lite badge), the landing page's content staying as it is.

**So, for the checklist of 0.2.4, when he says "Start release 0.2.4":** (1) the hover on a function's name in the script shows the function's usage block alone, F1 still opening its page; (2) On this page is no longer a pane: no button in Help's bar, always shown at the right of the text on the page's own ground, with no shade and no border; this changes item 13 of open decision #211, where each pane had its link; (3) the app starts on the Script place; Help, first opened after a start, shows Home with the Topics pane's sections closed; (4) Home of Help redrawn in the look of 0.2.4's screens. A drawing of the four is outside the repositories, `~/dev/handbook/zemp-lite-0.2.4-help-mockup.html`. Taken as engineering and said to him: in a window too narrow for the list beside the text, On this page stands once under the page's title.

**Shown the drawing, the owner answered:** "Yes, as drawn" (24 November 2026). So the four are as the drawing shows them, the narrow window's rule with them.

**Reason for recording here.** The owner's rulings on screens of Zemp Lite, given in this session; the row of 0.2.4 in section 15 of the Zemp Specification and the register are the Zeff repository's, and the coordinating session is told. Nothing is built: release 0.2.4 is not opened.

## 24 November 2026: Release 0.2.4 is planned; the specification's copy is brought to Zeff a110b4c

**The owner's word:** "Start release 0.2.4".

**The specification.** `docs/spec/` is the Zeff repository's at commit a110b4c, compared byte for byte; two files differ from the copy of 674aa9b: the Zemp Specification (the row of 0.2.4, extended with the four changes of Help) and the register of open decisions (#220's items 6 to 9 with the owner's words and his "Yes, as drawn"; item 13 of #211 marked replaced; #221 to #223).

**The engine.** Zeff 0.8.0, the row's, since Zeff 0.9.0 is not released (#220: "on the engine it carries"). The worker is not touched in this release.

**The plan.** `docs/releases/0.2.4.md`, 16 steps, with what the reading found and four questions for the owner. Engineering choices taken in the plan, each to be recorded at its step: the build keeps one `/assets/` for the root and for `/app/`, so the engine's file keeps its address and a browser that has it does not fetch it again; an address kept from before with a project in it is forwarded from the root to `/app/`; the root is a plain page that opens the app until the landing page stands, so that no commit leaves the address without a way in; a link of the landing page into Help opens the Scratch project on the Help place at the page named.

**Reason.** The standing instructions for the start of a release: the plan is shown and no code is written before the owner's "go".

## 24 November 2026: Release 0.2.4 opened, and the owner's answers (release 0.2.4, step 1)

**The owner's word:** "Go, as recommended", to the checklist of `docs/releases/0.2.4.md` (16 steps) and its four questions. So: (1) the landing page stands at the root of the address and the app at `/app/`; a reader who returns to the root sees the landing page each time; (2) "Report a problem" on the landing page leads to the page **Reporting a problem** of Using Zemp Lite, in the app, not to the public list of issues; (3) the two faults of Help's search are mended in this release (↵ opens the first match when the text typed is not a name; a suggested name is a link); (4) the paragraphs of Using Zemp Lite that this release changes are put to him to read before the release.

**Choices of this step.** Version `0.2.4-dev` in `package.json`, `worker/Cargo.toml` and their lock files. Nothing of the app changes. The lock file of the tools names one tool whose own version is 0.2.3; it is left as it is, the version of the project alone being changed.

**Reason.** The standing instructions: a release is opened on the owner's "go" to its plan, and his answers are recorded before the first step of work.

## 24 November 2026: The app at `/app/`, and the root that leads to it (release 0.2.4, step 2)

**Choices.**

1. _Two pages of one build._ The build has two pages over one folder of built files, `/assets/`: the front page at the root (`index.html`, entered at `src/root/main.ts`) and the app at `/app/` (`app/index.html`, entered at `src/main.ts` as before). The built files are named by what they hold and asked for by their address from the root, so a file has one address whichever page asks for it; the engine's file among them.
2. _The engine is fetched once for each release, as before, and the move adds no fetch._ The engine's file carries the worker's version, so each release's file differs from the last and a reader's browser fetches it once at each release (the Start screen then shows, as it has at every release). What #220 asks, that the stored engine survives the move, holds within a release: the file's address does not depend on the page.
3. _Projects._ The browser's private file system and the app's notes in the browser's storage belong to the origin, not to a path: nothing is moved or copied, and a project made at the root is there at `/app/`.
4. _An address kept from before._ Until 0.2.4 a project's address was the root with `#/p/<folder>` after it, and `#/new` asked for a new project's name. The root, given either, goes on to the same at `/app/` before anything is drawn, and replaces its own address, so that Back does not return to an address that would only forward again (`src/root/forward.ts`). Any other address at the root is the front page's own.
5. _The front page until the landing page stands_ (step 8): the name, the landing page's one line, **Open Zemp Lite** as a link to `/app/`, the version and the engine, and **What is counted**. It fetches nothing of the engine.
6. _What is counted_ stays at the root (`/counted.html`), linked from the app's screens and from the front page; its foot leads back to the app and to the front page.
7. _The checks._ The edition check walks from both entries of the build. The check of the host after a deployment asks for both pages and every file they name. The browser tests, the pictures' script and the checks at the address open the app at `/app/`.

**Tested.** Unit (`src/root/forward.test.ts`): an old address of a project and of the naming of a new one goes to the app, and nothing else does. Browser (`tests/browser/address.spec.ts`, and one test of `kept.spec.ts`): the root is the front page, opens the app and asks for nothing of the engine or its worker; a project made at `/app/` is opened, with what was written in it, by the address it would have had at the root, and Back then leaves the app; an old address of a project that is not here opens the app's welcome screen; `/#/new` asks the name in the app; the worker and the engine are asked for in `/assets/` alone; what is counted is reached from both pages and leads back to both. At the address (`tests/host/host.spec.ts`): the root is isolated, opens the app, and forwards an old address.

**Reason.** The owner's decision (#220, item 2, taken as recommended and confirmed by his "Go, as recommended"): a visitor first sees what Zemp Lite is, and a click opens it; nobody's work or bookmark is lost by the move.

## 24 November 2026: An address that opens a page of Help (release 0.2.4, step 3)

**Choices.**

1. _The address._ The app's address with `#/help` after it, and after that the page: nothing (Home); `using` and `using/<page>` (the list and a page of Using Zemp Lite, by the name of the page's file); `name/<name>`, and for one function of a name with two (#215) `name/<name>/<package>/<what it is called on>`; `packages`; `package/<name>`; `codes` and `codes/<family>`; `code/<code>` (`src/help/address.ts`, which reads an address into a page and writes a page's address).
2. _Which project._ Help is a place inside a project. An address of Help opens the Scratch project, made first where the browser has none, on the Help place at the page named. Given while another project is open, it closes that project and opens the Scratch project, as any change of the address to another project does.
3. _The browser's history._ The address of Help is replaced by the Scratch project's own without a step of the history, so that Back leaves the app for the page the link was on, and a reload comes back to the project, not to the link.
4. _An address that cannot be read_ (no such kind of page, no such page of the app, parts too many or too few) opens Home. Whether the engine has the function, the package or the code named is for the engine to say: its own sentence stands on the page, as it does for a name typed into Help. The checklist's sentence is reworded so.
5. _A first visit._ The Start screen comes first; once the engine is started the page asked for opens.

**Tested.** Unit (`src/help/address.test.ts`): every kind of page is read from its address and written back to it; a name with letters an address cannot hold; what is not an address of Help; twelve addresses that name no page. Browser (`tests/browser/help-address.spec.ts`): Home, with nowhere to go back to in Help; a page of the app, a function's, a package's, a code's and a family of codes; one function of a name with two, and the bare name's chooser; a wrong page and a name the engine has not; the address given while a project is open, the page still there after a look at the script; a first visit.

**Reason.** The landing page's links lead to pages of Help (#220, item 1: "every link goes to an address that exists"), and the app had no address for one.

## 24 November 2026: The facts the build takes from the engine (release 0.2.4, step 4)

**Choices.**

1. _One tool, asked by the build._ `tools/facts.mjs` loads the worker as built for Node and prints one line: the engine's version as the engine says it; the counts of functions, packages and explained codes, from the index of the help and the codes by family; the Scratch project's regressions with what the engine prints for them; and the size of the engine as it travels. The build (`vite.config.ts`) asks for the line and gives it to the pages as `FACTS` (`src/app/facts.ts`). A build stops, with the tool's sentence, where a fact cannot be had; the development server and the unit tests, before the worker is built, go on without them.
2. _The script shown._ The landing page's drawing shows the Scratch project's script without its description and its figure. So what is shown is taken from the script itself by rule: its first line, which says what it is, and the statements of its sections **Sample** and **Models**, without the lines that name the sections. That excerpt is a script of its own, which the tool runs; its print is the table of the three regressions with its notes.
3. _Held to the released engine._ The print must be a part, byte for byte, of what the released `zeff run` printed for the whole script (`examples/scratch/expected/main.stdout`, which the browser tests already hold the app to); a build whose engine prints anything else stops.
4. _The size that travels_ is the worker's script and its WebAssembly, each compressed as the host sends it (brotli at its highest setting), which is the measure of risk R4; a test holds the tool's figure to the measure's. Compressing the engine takes seconds, so the sizes are kept beside the tools by what the files hold (`node_modules/.cache/`), and measured again when a file changes.
5. _The tool's tests_ run under Node as the edition check's do (`npm run check:facts`), in the routine after the sample projects and in GitHub's job.

**The facts of this build:** Zeff 0.8.0; 259 functions in 10 packages; 144 explained codes; 2,926,416 bytes as it travels (2.9 MB; the file unpacked is 15.1 MB); the script shown is 10 lines and its print 21.

**Tested.** Under Node (`tools/facts.test.mjs`): each fact is the worker's own; every line shown is a line of the Scratch script in its order, and the print is the end of what `zeff run` printed; a script that lacks a section, an engine that does not say its version or lists nothing, a script that fails, prints nothing or prints something else, and a size of nought each stop with a sentence saying which; the travelling size is the files' own and is kept by what they hold; the tool's line agrees with the measure of risk R4. Unit (`src/app/facts.test.ts`): the app has the facts, they are of the engine it names, and sizes and counts are written as the screens write them. By hand: with the worker put aside, `npm run build` stops with "the worker is not built".

**Reason.** #220, item 1, and #211, item 12 (the owner's standing rule): every number, version and output on the pages is the carried engine's, and the build fails where one is not.

## 24 November 2026: The name drawn (release 0.2.4, step 5)

**Choices.**

1. _One drawing._ `src/theme/Name.svelte` draws _Zemp_ with the raised _Lite_ badge: a rounded pill in the text face at weight 700, violet on the soft violet with a violet hairline, 0.3 of the name's size and never under 11.5 pixels, as the approved drawings set it (the design guide's rule is "never under 11"). Inside the one filled button the badge is of the button's own ink.
2. _The name is still "Zemp Lite" to everything but the eye._ The space between the two words is in the page, set at no size. So a screen reader reads "Zemp Lite", a search of the page finds it, a copy of the text carries it, and every test and every control that finds a button or a heading by the name finds it as before. No label was added to say the name: the words themselves say it.
3. _Where a text may hold the name._ `named` (`src/theme/named.ts`) cuts a text at the name, and `Named.svelte` sets it with the name drawn: the titles and trails of Help, the Topics pane, On this page, the lists, the results of search, the commands of ⌘K and their hints, the messages of the welcome screen, and every sentence, heading and control of the pages of Using Zemp Lite. Where the name is written into a screen it is drawn there directly: the Start and welcome screens, the front page, the narrow window's line, the run's facts, Home of Help.
4. _Plain words stay_ where text cannot be drawn: the tab's title, a report, an export, a file, the labels read aloud of a region or a list, and this repository's documents.
5. _The page of what is counted_ is no part of the app's build, so the same drawing is written into it by hand, with its rules.
6. _The smallest text of a screen._ The app's rule is 12.5 pixels for the text of the interface. The badge is a mark of the name, whose size the owner ruled for it (#220, item 5: about 0.3 of the name, never under 11 pixels). So the tests' measure of the smallest text leaves the badge out, and a test of its own holds the badge to its floor on every screen. Nothing else is left out of that measure.

**Tested.** Unit (`src/theme/named.test.ts`): a text is cut at the name and nowhere else; a text without it is one piece; the pieces put together are the text. Browser (`tests/browser/name.spec.ts`), in both themes: on the front page, the page of what is counted, the Start screen, the welcome screen, a project in a narrow window, Home of Help, the list and a page of Using Zemp Lite, and ⌘K, the name is drawn, is read as "Zemp Lite" each time, stands written plainly nowhere, its badge is never under 11 pixels, and nothing on those screens falls under 4.5 to 1; the heading, the link and the button are still found by the name; the tab's titles write it. The test found one place the first pass had missed, the heading of the Topics pane beside a page, which is now drawn.

**Reason.** The owner's ruling (#220, item 5; the design guide, section 9, "The name drawn"): the name is drawn so wherever it is shown, read aloud as "Zemp Lite", and written plainly where text cannot be drawn.

## 24 November 2026: The loading screen redrawn (release 0.2.4, step 6)

**Choices.**

1. _As drawn_ (`~/dev/handbook/zemp-lite-start-screens-mockup.html`, the states "fetching" and "ready"; the design guide, section 9, "Loading screen"): the top bar with the mark, the drawn name, the version and the theme button; the alpha notice as a thin strip under it; the name at 84 pixels with the landing page's line and **Open Zemp Lite**; the card **Starting the engine**; the four promises in the deep violet band, each with its icon in a hexagon; the bottom line as before. The bar and the strip are one component (`src/app/FrontBar.svelte`), which the project screen takes at step 7; the icons are one component (`src/theme/HexIcon.svelte`).
2. _One bar over the three steps._ The fetching is the long step and has seven tenths of the bar, the check and the start fifteen hundredths each. Under it "Step n of 3" with the percentage, and "Ready" at the end. Each step has its mark (its number while it waits, a turning ring while it runs, a green tick when done, a red mark where it failed), a line on what it does, and its state at the right. The ring does not turn for a reader who has asked the computer for less motion.
3. _The size that travels._ The first step says "2.9 MB, once": the build's own figure (step 4), in place of the 15.1 MB of the file unpacked that the screen gave until now. While the engine comes, the step's state is the share of it that has come.
4. _Return opens it too._ Once the engine runs the cursor is put on **Open Zemp Lite**, and the line under the button says "or press ↵"; until then the button is grey and the line says when it will open.
5. _A failure_ keeps its sentence and **Try again**, in the card under the steps, and the step that failed is marked.
6. _Three colours are added to the theme_ for the deep band and the two inks written on it (`deep`, `deep-ink`, `deep-muted`), held to 4.5 to 1 in both themes as every colour of text is.
7. _A narrow window and a phone:_ one column, the name smaller, the promises two and then one to a row. The line that says the app is laid out for 1,200 pixels still stands at the top of a narrower window (open decision #33): it is true of the project's own screens.

**Tested.** Browser (`tests/browser/start.spec.ts`, and the first-visit test of `first.spec.ts` brought to the screen): with the engine's file held back, the button is grey, the bar at nought, "Step 1 of 3", the steps waiting; let go, "Ready" and 100 %, the cursor on the button and Return opening the app; the size given is the build's own travelling size, and no figure of the unpacked file is on the screen; a fetching answered 503 says so, marks its step, keeps the button grey, and **Try again**, by the keyboard, starts it afresh; in both themes, at 1,440, 1,000 and 375 pixels, nothing under 12.5 pixels or 4.5 to 1, nothing wider than the window, the four promises there and the button reachable.

**Reason.** The owner's ruling (#220, item 3; the design guide, section 9).

## 24 November 2026: The project screen redrawn, and Open project… (release 0.2.4, step 7)

**Choices.**

1. _As drawn_ (`~/dev/handbook/zemp-lite-start-screens-mockup.html`, the states "first visit" and "with recent"; the design guide, section 9, "Project screen"): the top bar and the alpha strip of the loading screen, with "Something wrong? In a project, ⌘K → **Report a problem**" at the right; no heading of the screen's own; four cards in two rows, each with its icon in a hexagon, its name at 16.5 pixels and its line at 13.5; under them the note on where the work is kept, in two columns; at the right the card **Recent**.
2. _The screen's heading_ is the name in the bar, so that a reader who moves by headings still finds one of the first rank; the drawing has no other.
3. _The cards._ **New project…** (its naming row takes the card's place, as it took the row's); **Open project…**, the name the owner gave what was **Open a project's zip…**; **Open folder…**, which waits for the desktop app and says so in a dashed tag (the drawing's words; the words "and then in Chrome and Edge" are no longer on the card); **Scratch project**, on the soft violet, with "Start here →". The card that waits is set in the small-print ink, not faded, so that its words keep 4.5 to 1.
4. _The rename._ "Open a project's zip…" was the name of one control, on this screen, and of nothing in ⌘K. It is **Open project…** on the card, in the storage note and in the two pages of Using Zemp Lite that name it. "A project's zip", the thing, keeps its words: in the card's line, the chooser's label and the sentences that refuse a zip.
5. _Recent._ The count above the list ("8 projects · the last opened first"; "1 project" for one). Each row has the mark, the name at 16 pixels, "in this browser · " and when, and its ⋯ menu, all as they were. Five rows are in view; the lower 64 pixels fade while more lie below, and the fade goes at the end of the list and is never there for a list that fits. The list is measured again when its rows, a question asked in a row, or the window change.
6. _A first visit_ has, in place of the list, "No project yet", a sentence, and a button that opens the Scratch project.
7. _A phone:_ one column, the cards and the note one to a row, and the list of projects first when there are any. Under 900 pixels the bar's sentence on reporting a problem gives way.
8. _The badge's sizes_ are set as the design guide gives them: 11 pixels in the bar, 0.26 of the name in the loading screen's title.
9. _The tests' way to the Scratch card._ Seventy-seven tests opened it by a button whose name holds "Scratch project", which the first visit's new button ("Open the Scratch project") also does; they now name the card by how its name begins. Nothing they hold is changed.

**Tested.** Browser (`tests/browser/welcome.spec.ts`; and `page.spec.ts`, `kept.spec.ts`, `keeping.spec.ts`, `open-zip.spec.ts` brought to the screen's words): one heading of the first rank, the name; the four cards, their words, two to a row, level with the list; **Open folder…** inactive with its tag; the note in two columns; the old name nowhere; a first visit's card and its button; the count with one, three and eight projects, the last opened first; five rows in view of eight, the fade there, gone at the end and back at the top, and absent for three; a row's menu and a row's opening as before; every card and row a stop of the Tab key in the screen's order, the inactive card passed over, Return on **New project…** asking the name; in both themes at 1,440, 1,000 and 375 pixels nothing under 12.5 pixels or 4.5 to 1 and nothing wider than the window; on a phone one column with the list first.

**Reason.** The owner's ruling (#220, item 4; the design guide, section 9).

## 24 November 2026: The landing page (release 0.2.4, step 8)

**Choices.**

1. _As drawn_ (`~/dev/handbook/zemp-lite-landing-mockup.html`; the design guide, section 9, "Landing page"), in the app's own components, in place of the plain front page of step 2: the top bar, which stays at the top as the page is read; the name at 92 pixels with its line, and **Open Zemp Lite** with the version and the engine under it; the bands **Why Zemp Lite?**, **See it work**, **Made for**, **In version …** and **Learn and take part**, each title with a short rule under it; the dark foot with its three columns and the tagline.
2. _Every number, version and output is the build's_ (step 4): the size that travels, the counts of functions, packages and codes, the engine's version, the Scratch project's regressions and the table the engine prints for them. The count of the app's own pages is counted from the pages and written in words ("thirteen"). The version is the app's.
3. _The script is coloured without the editor_, which the landing page does not carry: a small reading of the script into comments, keywords, functions, options, numbers and operators (`src/root/colour.ts`), in the code colours of the design guide. No letter of the script is changed.
4. _Where the links lead._ **Open Zemp Lite** and "Open the app" to `/app/`. Into Help, by the addresses of step 3: "Getting started", "Finding help", "The Data place", "Exporting a project" and "Privacy: where your work is kept" to their pages of Using Zemp Lite; "Open Help" and "Help in the app" to Home; "The 259 functions, in Help" to the list of packages; "Errors and warnings, in Help" to the codes. **Report a problem**, in the band and in the foot, to the page **Reporting a problem** (the owner's answer to question 2). The source, the licence and the notices to the repository. **What is counted** is added to the foot's terms, since both pages link to it.
5. _A version's notes._ A release links to its notes in the repository (`docs/releases/<version>-notes.md`), and a build of a release stops where that file is not written. A build between two releases, whose notes are not yet written, links to the repository's list of releases.
6. _The "Run" mark_ in the head of the script is a picture of the app's button, as drawn, and is hidden from a screen reader: the way into the app is the page's button.
7. _A page to read:_ its text is at the reading size (16.5 pixels), it scrolls as a document, and on a phone its bands are one column. The table of results keeps 12.5 pixels on a phone and is moved sideways inside its own frame (the drawing set it at 11.5 there, under the floor of 12.5).
8. _Four colours are added to the theme:_ the foot and its two inks, held to 4.5 to 1, and the rule under a band's title, which is decoration.
9. _The tests' measure of contrast_ read a colour mixed from two (`color-mix`) wrongly, taking its parts as of 255 where the browser gives them from 0 to 1; found on this page's bar, which is such a colour. It now reads them rightly, which makes the measure stricter everywhere.

**Tested.** Unit: the colouring changes no letter and tells the kinds apart, a digit inside a name left alone (`src/root/colour.test.ts`); a small count in words, the addresses into Help, and where a version's notes are read (`src/root/words.test.ts`). Browser (`tests/browser/landing.spec.ts`): the bar's links, the five bands and their ten parts, the foot; the bar still in view far down the page; the counts, the size, the version, the engine's version, the script and the table, each equal to what the facts tool gives for this build; no request for the engine or its worker; the keyboard's order through the bar to the way in, and Return opening the app; every link within the site answered, every part of the page a link names there, every link out of the site the repository's own, the notes' link as the version requires; each of eight links into Help opening its page in the Scratch project, Back returning to the landing page; in both themes at 1,440, 900 and 375 pixels nothing under 12.5 pixels or 4.5 to 1 and nothing wider than the window; one column on a phone. At the address (`tests/host/host.spec.ts`): the root is the landing page with the engine's counts and table, every link out of the site answers, and a link into Help opens its page on a first visit.

**The page's weight:** its own script 13.3 kB and its styles 7.3 kB before compression (4.7 kB and 1.8 kB with gzip), with the shared 52 kB of the interface's runtime and the fonts; nothing of the engine.

**Reason.** The owner's ruling (#220, item 1; the design guide, section 9).

## 24 November 2026: The hover shows the usage alone (release 0.2.4, step 9)

**Choices.**

1. _Read from the engine's own answer._ The language server answers a hover on a function's name with that function's page, as `zeff help` prints it, the one the call would run where a name has two functions (#215). The card now shows the page's usage block and nothing else, read out of that answer (`src/help/hover.ts`); so the usage is always the engine's own for the function under the pointer, and nothing is looked up by name.
2. _Anything else is shown as the server says it:_ a word that is not a function, and an answer that is not one function's page or gives no usage. Nothing is hidden that has no usage to stand for it.
3. _F1 is unchanged:_ it opens the whole page in Help, and still asks the server for the whole answer to tell which of two functions is meant.
4. _The test of the card uses the mouse itself_ and stands aside where a test browser does not deliver the mouse where it is aimed, as the older tests that need the pointer do; on GitHub it is made in both engines.

**Tested.** Under Node, on the engine the app carries (`src/help/hover.node.test.ts`): for every function of one name the usage read from its page is the usage the engine's index gives for it, and the card holds nothing else; for each of the nine names with two functions, the usage of the one the hover is the page of, and the print of both at once shown as it is; a sentence that is no function's page shown as it is. Browser (`tests/browser/hover.spec.ts`): the card on `reg` begins with its usage, ends with it, and holds no first line, heading or sentence of the page; F1 on the same word opens the whole page, whose Usage is the card's word for word; `histogram` called on a frame and on a plot each show their own usage, and the two differ.

**For the specification.** Section 3 of the Zemp Specification says in its table that the hover gives "every function's help page". The coordinating session amended it and logged the change (Zeff 011f2e4: "hover in a script gives its usage block (the one the call would run, where a name has two functions; from 0.2.4, #220)"), and `docs/spec/` here is the Zeff repository's at that commit, compared byte for byte; one file differs from the copy of a110b4c, the Zemp Specification.

**Reason.** The owner's ruling (#220, item 6): "If I hover over functions in scripts it should not show entire help instead it should show only the usage block."

## 24 November 2026: On this page, a part of the page (release 0.2.4, step 10)

**Choices.**

1. _No pane._ Help has one pane, **Topics**, at the left. The list of the open page's sections is drawn inside the place itself: the words "On this page" and, under them, the sections, with a hairline at their left and the part in view marked in violet. Nothing is painted behind it and no rule divides it from the text. Its link in Help's bar, its × and its command of ⌘K are gone, and the bar ends with the search field.
2. _Beside the text_ where the place is at least 860 pixels wide: a column of 190 pixels at the right of the text, which stays in view as the page is read. At 1,200 pixels with Topics open it is beside the text; so it is at 1,000 pixels with Topics closed.
3. _Under the title_ where the place is narrower (1,000 pixels with Topics open): once, after the page's title and its line and before its first section, with a hairline under it. The page is measured as its place changes, so opening or closing Topics moves the list at once. This is the session's choice, told to the owner and approved with the drawing.
4. _A page with no sections has no list:_ a package's page, the codes by family, the list of the app's pages, a chooser, and what the engine says of a name it has not. The sentence "This page has no sections." is no longer shown.
5. _What is kept with a project._ Which panes are open is kept for each project; a project left with this pane open or closed is opened as any other, and what its file says of the pane is passed over. The old name of the left pane is still carried over to Topics.
6. _The page that names it._ **Finding help** said "**On this page**, at the right, lists the sections of the page you are reading", naming a control that is no longer one. It now says: "At the right of a page its sections are listed, under the words On this page; press one to go to it." It is among the paragraphs put to the owner at step 14.

**Tested.** Unit (`src/app/views.test.ts`): a project's file that speaks of the old pane is read, the pane passed over, and written back without it. Browser (`tests/browser/help-onpage.spec.ts`, and seven older files brought to the list's new place): on a function's page at 1,440 pixels the list is at the right of the text, outside it, with nothing painted behind it, no border and no pane, and there is no link, pane, × or command of it; far down the page it is still at the top of the place, one part marked; a part pressed is gone to and marked, by the mouse and by the keyboard; a code's page, a page of the app and Home have their lists, and four pages that are lists have none; at 1,000 pixels with Topics open the list is once inside the page, after its title and before its first section, and still goes to a part; with Topics closed it is beside the text again; Home and a page of the app do the same.

**Reason.** The owner's ruling (#220, item 7): "on the page button should be removed and on the page pane should be permanent, no grey shade, in the same help page (should look like a part of the help page)".

## 24 November 2026: Each start on the Script place, and Help first on Home (release 0.2.4, step 11)

**Choices.**

1. _What a start is._ A project opened: by its address, by a reload, from the project screen. Each is a start, since each makes the project's window anew.
2. _The Script place._ Whatever place a project was left on (Data, Plots or Help), it opens on the Script place, with the file it last showed there: the file it was left on if it was left on one, otherwise the first script among the files open, otherwise a file, otherwise none. The files open, the panes, what is unfolded, the plot viewer's and the data viewer's state are as the project keeps them; gone to, a place is as it was left.
3. _Help._ The pages a reader opened were never kept between visits, so the first click on Help after a start shows Home. Every section of the Topics pane is then closed (Packages, Errors and warnings, Using Zemp Lite, and each family of codes inside its section), whatever the reader had unfolded before. Within a visit nothing is reset: Help returns to the page being read, and Topics is as the reader left it.
4. _What changes of what is kept._ Until 0.2.4 a project opened on the place it was left on, and what was folded in Topics was kept with the project. Both are now the start's own (`started`, in `src/app/views.ts`): the project's file still records them, and a start does not follow them. Whether Topics itself is open or closed is still the reader's choice, kept with the project.

**Tested.** Unit (`src/app/views.test.ts`): left on Help, Data or Plots, the first script open is shown; left on a file, that file; with no script, a file, and with no file, none; every section of Topics closed, the families with them; the files open, the panes and everything else unchanged, and the state given not altered. Browser (`tests/browser/kept.spec.ts`, where a browser keeps what was made): the first click on Help shows Home with the three sections closed and no list; the reader unfolds two sections and a family and reads a code's page; from Script back to Help the page and Topics are as they were; after a reload the Script place is shown with the project's script, and Help, clicked, is on Home with every section and the family closed again; left on Data and reloaded, Script; a project as 0.2.2 left it, on Help with its left pane closed, opens on Script, Help has the pane closed, and opened it has its sections closed. The tests of what Topics holds unfold its sections first, as a reader does; the plot viewer's test goes to Plots after the reload and finds it as it was left.

**Reason.** The owner's ruling (#220, item 8), with his answers of the same day: "every new run" is each start of the app; the landing page with the topics closed is what the first click on Help after a start shows; later in the visit Help returns to the page being read.

## 24 November 2026: The loading bar glides, and the size the screens give is the size the host sends (release 0.2.4, step 6b)

**The owner's word**, passed by the coordinating session and read in the Zeff repository before it was taken (commit 437e8f9, #220, item 10): shown the live loading screen, where with the engine kept the bar was full before it could be seen, "Yes, make it glide". `docs/spec/` is brought to that commit, compared byte for byte; one file differs from the copy of 011f2e4, the register of open decisions. The step is added to the checklist as 6b.

**Choices.**

1. _Two things kept apart:_ where the three steps have got to, and what the bar shows. The bar moves towards the steps at each frame, never faster than the whole bar in a second and never ahead of them (`src/app/start.ts`). So a start that is done in a third of a second is still seen to be made, over about a second; a slow fetching is followed as it comes, as before.
2. _The marks follow the bar._ A step is marked done once it is done and the bar has reached its end of the bar (seven tenths for the fetching, then fifteen hundredths for each of the others). So the marks, "Step n of 3" and the bar never disagree, and **Open Zemp Lite** turns violet, takes the cursor and answers Return when the bar is full, not before. A step that failed is marked at once.
3. _Less motion._ A reader who has asked the computer for less motion is shown where the steps are at once, with no glide.
4. _How the engine came._ The browser keeps its own record of each fetch (Resource Timing). Where a file has a body and nothing of it travelled, or only the short answer that it has not changed, the engine was already in this browser, and the first step says "already in this browser". Where it was fetched, the step gives the bytes that travelled, to a tenth of a megabyte. While it is still coming, and where a browser's record does not say, the step gives the size the build reckons.
5. _The measures._ The first start at the address is timed to the engine running, which the card says of itself, and not to the bar's end; so the figures stay comparable with those of earlier releases.

**Found on the way: the size the screens gave was not the size that travels.** The host, Cloudflare Pages, compresses a file with brotli as it sends it, at a low setting. Measured at `https://lite.zeff-lang.dev` on 24 November 2026, the engine of 0.2.3 (15,145,953 bytes) travelled as **4,080,713 bytes** with brotli and 4,182,045 with gzip. The 2.9 MB that the loading screen and the landing page gave, and that the notes of 0.1 to 0.2.3 call "as it travels", is the same file at brotli's highest setting (2,922,126 bytes here), which takes most of a minute to make and which this host does not use: it is the least a host could send, not what this one sends. So:

- the build now reckons the travelling size at brotli's setting 2, which comes within half of one per cent of what the host sent (`tools/facts-lib.mjs`); for this build, **4,063,622 bytes, 4.1 MB**, and that is what the landing page and the loading screen say;
- the check after each deployment holds the landing page's figure to the bytes the address really sends, within a tenth of a megabyte, and to the limit of risk R4;
- the measure of risk R4 (`tools/measure-worker.mjs`, the Zeff repository's own) is not changed here: it still prints the size at brotli's highest setting and with gzip. Against the limit of 5 MB the engine stands at 4.1 MB as this host sends it, not 2.9: the room left is 0.9 MB, not 2.1. This is told to the owner and to the coordinating session, whose the risk register is; it recorded the finding there the same day (Zeff 7a7a8ee: R4's early warning now says that "compressed" means as the host sends it, and #220 reads 4.1 MB), and `docs/spec/` here is brought to that commit, compared byte for byte.
- Whether the engine could be sent smaller (already compressed at the highest setting, and served so, which would send 2.9 MB) is an engineering experiment with the host for a later release; it is no part of 0.2.4's row and nothing of it is done here.
- The notes of 0.1 to 0.2.3 call the smaller figure the size "as it travels". They are corrected with a dated line when the notes of this release are written (step 15).

**The preview of the build** now answers a built file with the host's own headers for built files, as it already answered every page with the host's isolation headers, so that a browser is told here what it is told at the address. A test browser still does not keep a file of 15 MB between two visits, so the kept case is tested by giving the screen the browser's record as it stands for a kept file, and at the address by what the record there says.

**Tested.** Unit (`src/app/start.test.ts`): where the steps have got to; a start done at once fills the bar in about sixty frames; a slow fetching followed, never ahead and never back, a long wait between frames carrying it no further than the steps, and the steps begun again; the marks against the bar at each of its thirds, while a step runs, and where one failed; how the engine came, for a fetched file, an uncompressed one, a kept one, one answered "not changed", and a record that does not say. Under Node (`tools/facts.test.mjs`): the travelling size at the host's setting, kept by what the files hold; more than the measure's least, less than gzip, under 5 MB. Browser (`tests/browser/start.spec.ts`): the glide, frame by frame; the first step's three wordings. At the address (`tests/host/host.spec.ts`): the screens' figure against the bytes sent, and the kept case.

**Reason.** The owner's ruling (#220, item 10), and his standing rule that every number on a screen is true of the release that shows it (#211, item 12).

## 24 November 2026: Home of Help in the look of the screens (release 0.2.4, step 12)

**Choices.**

1. _As drawn_ (`~/dev/handbook/zemp-lite-0.2.4-help-mockup.html`, which the owner approved: "Yes, as drawn"): each part of Home is a card of the project screen's kind, white with a hairline, rounded, a soft shade under it, its icon in a hexagon at the left, its name in bold and its line under it. The title **Help** and the word **Topics** are in the display type. The versions are set plainly beside the names, the stage in a small outlined pill.
2. _The way on._ A topic's card says "Open →" at its foot, as the Scratch project's card says "Start here →". It is drawn, not read out: the card's button, whose name is the topic and its count, is the control, and it still covers the whole card. The arrow that stood at a panel's right is gone.
3. _The icons:_ a letter Z for Zeff, a window for Zemp Lite, a box for the packages, a warning sign for the errors and warnings, an open book for the pages on the app. They say nothing to a screen reader; the words beside them do.
4. _What Home holds is unchanged_ (#211, item 14): Zeff and Zemp Lite one after the other, each with its version and its words, the engine's counts, then the three topics, the packages' names as small links inside their card. Its sizes still follow the size chosen for code.

**Tested.** Browser (`tests/browser/help-home.spec.ts`): the tests of 0.2.3 hold what Home says, its counts, its panels' buttons and links, the keyboard, its column, 12.5 pixels and 4.5 to 1 in both themes, unchanged and green; a new test holds the look: five cards, each on the window's own white, rounded, with a shade, its icon a hexagon at the left of the words and hidden from a screen reader; the title and **Topics** in the display type; "Open →" on the three topics' cards and on no other, drawn and not read out; the name drawn twice; a card opened by its button.

**Reason.** The owner's ruling (#220, item 9): Help's landing page takes the look of 0.2.4's screens, and what it holds is unchanged.

## 24 November 2026: The small faults (release 0.2.4, step 13)

**The owner's word:** "Go, as recommended" took question 3 of the plan as recommended: the two faults of Help's search are mended in this release.

**Choices.**

1. _The font._ One rule of a list page of Help (the words that tell two functions of a name apart, as "of a frame") named a font the app does not ship, so the reader's computer chose one. It names the app's text font. Every rule of the app that names a font is now read by a test: the first font named must be one of the three shipped, and what follows it only the computer's own faces of the same kind, for the instant before the shipped font has come (#222).
2. _Return in Help's search, with no match marked._ It opens the page of what was typed where that is a name the engine has (a function, a package, a dataset) or a function of the project's own, as before; so `histogram` still opens the chooser of its two functions, and a name is never passed over for a longer one that begins with it. Otherwise it opens the first match the field offers: `lm` opens `reg`, `ttest` opens `t_test`, and a name with a slip of one key opens the name meant. Where the field offers nothing, the engine's own sentence is shown, as before. Whether a name the index has not is a function of the project's own is asked of the engine, since no index holds those.
3. _A suggested name is a link._ Where the engine says it has no such name and asks "did you mean" another, that other name is a link to its page. The name that was not found is said, not offered. Only the name after "did you mean" is linked; every other word of the engine's sentence is as it was.

**Tested.** Unit: every source of a screen read for the fonts it names, in style sheets and in the editor's theme, more than forty rules, none naming a font not shipped (`src/theme/fonts.node.test.ts`; with the old rule put back it fails and names it); the suggestion read from the engine's sentence, and none where it suggests nothing (`src/help/suggested.test.ts`). Browser (`tests/browser/help-search.spec.ts`): `lm`, `ttest` and `regg`, each with Return, open `reg`, `t_test` and `reg`; `histogram` opens its chooser and `reg` its own page; a word nothing matches shows the engine's sentence; on the page of a name the engine has not, the suggested name is a button with its title, the name not found is none, and the button, by the mouse and by the keyboard, opens the suggested name's page.

**Reason.** Faults found after 0.2.3 (`docs/progress.md`, 24 November 2026), and the owner's answer.

## 24 November 2026: The pages of Using Zemp Lite brought to this release (release 0.2.4, step 14)

**The standing rule** (#211, item 12): at every release the pages Zemp keeps itself agree with the app that release ships; every control they name is on the screen under that name, and every picture is made again from the running app.

**What changed in the words**, each put to the owner to read before the release (his answer to question 4):

1. **Finding help**, under _Search_, one sentence added: "With no match marked, ↵ opens the page of what you typed where that is a name of Zeff's, and otherwise the first match of the list: `lm` and ↵ opens `reg`." (Step 13.)
2. **Finding help**, under _Browse_: "a panel for each kind of page" is "a card for each kind of page" (step 12); "The **Topics** pane at the left lists the packages and the errors and warnings; beside a page it lists the pages around it" is "The **Topics** pane at the left has a section for each of the three; press a section's name to unfold it. Beside a page the pane lists the pages around it" (step 11: the sections are closed when Help is first opened); and "**On this page**, at the right, lists the sections of the page you are reading" is "At the right of a page its sections are listed, under the words On this page; press one to go to it" (step 10).
3. **Finding help**, under _From the script_, one sentence added before the one on F1: "Rest the pointer on a function's name in the script, and its usage is shown: the function's name with its arguments." (Step 9.)
4. **Projects, scripts and files** and **Exporting and opening a project**: **Open a project's zip…** is **Open project…** (step 7).
5. **Where the work is kept**: the words of its picture, for a reader who cannot see it, now describe the redrawn screen of projects: its four cards, the note under them, and at the right "No project yet" with the button that opens the Scratch project.

**The pictures.** All thirteen made again from the app by the pictures' script (`npm run pictures`), in the light theme; nine of the files changed: every one that shows the screen of projects, the Help place, the name, or the version. The script needed no change but the address of the app, made at step 2.

**Tested.** The tests of the pages as at 0.2.3, green: every control a page names is on the screen under that name; every function, package and code a page names is the engine's; what a page says the search finds, it finds; every picture is there with its words. One test that lists the keys **Finding help** names is brought to the page's new sentence.

**Reason.** The owner's standing rule, and his answer to question 4 of this release's plan.

## 24 November 2026: The check of the landing page's links out of the site asks GitHub's interface, not its pages (found on GitHub after step 8)

**What was seen.** Two deployments (of steps 8 and 9, commits a5c139b and cc1a83f) were reported failed, though each was deployed and every check of the site itself passed there, in both browsers. The one test that failed was step 8's own: it asked for each address the landing page links to out of the site (the repository's front page, its licence, its notices, its list of releases), and GitHub's pages answered 429, "too many requests", to GitHub's own machines, which ask often. A 429 says nothing of whether a page is there.

**Choice.** The question is put to GitHub's interface for programs instead: the repository, a file of its main branch, its releases. After a deployment it is asked with that run's own token, which the deployment job now gives the checks; from a desk it is asked without one. A link that is none of the three kinds the landing page uses fails the check outright, so a link added later has to be one the check knows how to ask about.

**Tested.** From this Mac at `https://lite.zeff-lang.dev`, in both browsers: the check passes, each of the five addresses answered 200 by the interface.

**Reason.** A check that fails for the asker's own frequency hides the failures that matter; #220, item 1, asks that every link goes to an address that exists, which is what is now asked.

## 24 November 2026: The whole, the measures and the notes (release 0.2.4, step 15)

**Choices.**

1. _One test of the whole_ (`tests/browser/front-whole.spec.ts`), in both themes: the landing page and the page of what is counted at a desk's width and a phone's; the loading screen while the engine comes and once it runs, at both widths; the project screen empty, naming with a name refused, with six projects, with a row's menu open, with a deletion and a new name asked, and on a phone; Home of Help and a function's page at 1,440, 1,200 and 1,000 pixels. Each state is held to the same floor: nothing under 12.5 pixels, nothing under 4.5 to 1, nothing wider than the window; and where the keyboard is walked, every stop of the Tab key has a name. The walk presses the key until it comes round to a control it has already stopped at, so every stop is seen wherever the cursor began; what a control says is taken without what is drawn for the eye alone.
2. _Two faults it found, before any release carried them, both mended here:_
   - _A row's menu cut by the fade._ With enough projects for the list to fade (step 7), the fade was a mask of the list, and a mask is laid over everything drawn inside it: a row's menu, which opens out of the list, was faded and cut with it, and its lower items could not be pressed with the mouse. The fade is now drawn over the list's lower edge, on the card's own ground, and takes no press; the list is not masked. The project screen's own test now presses the last item of a menu in a list of eight, and holds that nothing above it is masked.
   - _The badge in the grey button._ While the engine comes, **Open Zemp Lite** is grey, and the badge of the name inside it stood at 3.9 to 1: the small-print ink on a ground tinted with the same ink. In the grey button the badge has no ground of its own.
   - Besides: the badge written by hand on the page of what is counted was not marked as the badge it is, so the measure of the smallest text counted it; it is marked.
3. _The measures at the address._ The check after a deployment now times the landing page to its first drawing and adds up what it fetched, holds that nothing of the engine is among it, and that the whole is under a megabyte. From this Mac at `https://lite.zeff-lang.dev`: 2.2 and 2.6 s to its first drawing on a first request, 491 kB in 10 or 11 files.
4. _The notes_ are drafted (`docs/releases/0.2.4-notes.md`), their measures and their record of the checks to be completed at the release.
5. _The correction of the earlier notes._ Under the line of the measures of 0.2, 0.2.1, 0.2.2 and 0.2.3 that gives the engine "with brotli as it travels", one dated line says what the figure is (the least a host could send) and what a visitor downloads (about 4.1 MB). The old lines are left as they were written. The known issues of 0.2 had already said that the host sends 4.07 MB; the measures and the screens did not follow.

**Tested.** As above; and from this Mac at the address, the new measure and the corrected check of the links, in both browsers.

**Reason.** The checklist's step 15; the testing handbook's routine before a release; and the owner's rule that what a release says of itself is true.

## 24 November 2026: The test of the gliding bar does not count frames (found on GitHub after steps 12 and 13)

**What was seen.** GitHub's check of steps 12 and 13 (commits 0bbf2e4 and fbb380f) failed in one test, in one browser and then in both: the test of the gliding bar, written at step 6b and loosened once at step 12. On GitHub's machines, which run many browsers at once, the loading screen drew six to ten frames in the second the bar takes; the test asked for more than twenty, and judged the bar's pace between two of its own looks at the screen, which do not fall at the instants the screen draws.

**What it is not.** A fault of the bar. The bar is paced by the clock: at each frame it moves by the time that has passed, never more than the whole bar in a second and never past where the steps are (`glided`, held by unit tests). Few frames make it move in larger steps over the same second.

**Choice.** The test holds what does not depend on how many frames there were: the bar was seen short of full and ended full; it never went back; the button stayed grey, and the first step unmarked, until the bar had passed them; and from where the bar was first seen to full took at least that share of a second. The count of frames and the pace from frame to frame are no longer asserted; the pace is the unit tests' to hold.

**The steps' record.** The commits of steps 6b to 15 carry the test as it was, so GitHub's check of each may fail in it and in nothing else; the routine was green here at each. The check must be green on the commit that mends the test before step 16 is begun, and the notes of the release say so.

**Reason.** A test must fail for the fault it is of. This one failed for the speed of the machine it ran on.

## 24 November 2026: The test of the gliding bar notes each change as it is made (found on GitHub after the commit that mended it)

**What was seen.** GitHub's check of commit cc81972, which had mended the test of the gliding bar, failed in that test again, in one browser: the last thing the test's record held was the bar at 97, where the test expects it full.

**What it is not.** A fault of the bar or of the button. The screen's number and the button are drawn from one value in one stroke, and the button opens only when that value is full.

**What it was.** The test kept its record by looking at the screen once in each frame, before the screen drew that frame, so the record ran one frame behind the screen; and it read the record as soon as the button was seen open. Where frames are a sixth of a second apart the record did not yet hold the last frame. Reproduced here, in both browsers and every time, by slowing the frames to 160 ms and reading the record at once.

**Choice.** (1) The test notes the bar, the button and the first step at each change of the page as it is made, so the record is what the screen showed, and when; and it waits until the record itself holds the open button. (2) The test is run at two paces of frame: the machine's own, and frames 160 ms apart, so that what a busy machine does is tried on every run and not only on GitHub. (3) The number on the bar is the bar's value rounded down, not to the nearest: it says 100 only when the bar is full, which is when the button opens (rounded to the nearest, it could say 100 for one frame while the button was still grey). The test holds that too: the button is grey for as long as the number is short of 100.

**Reason.** As before: a test must fail for the fault it is of. And a machine's slowness that only GitHub has is found late and dearly; the second pace brings it to this Mac.

## 24 November 2026: The project screen shows no first-visit card before its list is read (found on GitHub at step 16)

**What was seen.** GitHub's check of commit 0b9606a passed the test of the gliding bar and failed in the whole-screen test of step 15, in one browser: on the project screen, after six projects were made, the Tab key reached **Open the Scratch project**, the button of a first visit's card, and no row of the list. The same test had failed once before, at the commit of step 15, among the failures of the gliding bar, and passed at the commit between.

**What it was.** A fault of the screen, of step 7. The list of projects is read from the browser's storage after the screen is drawn, and until it had been read the screen showed the card of a first visit, "No project yet", to a visitor who has projects. On this Mac that is a few thousandths of a second; on a busy machine it was long enough to be read.

**Choice.** (1) Until the list has been read the screen shows neither the list nor the card: the heading **Recent** alone. (2) A test notes every change of the page from the moment the project screen is asked for, and holds that the card's words never stand on it for a visitor with a project; it failed in both browsers before the mend. (3) The whole-screen test waits for the list's rows before it measures the screen with six projects, and for the card before it measures the empty one.

**Reason.** A visitor must not be told, even for a moment, that work is not there. And the test that found it did so by the chance of a slow machine; the new test finds it on any.

## 24 November 2026: Release 0.2.4 is closed

**The owner's word:** "Release 0.2.4".

**The routine at the close.** Here, on the release's own tree, which differs from the checked and deployed commit bce5ed5 in the version, the pictures and the documents alone: format, lint, types, the edition check, the Rust checks, the native tests of the worker, the worker's message tests, the measure (2,926.6 kB at brotli's highest setting; 4.1 MB as the host sends it, of 5 MB), the nine sample projects identical, the seven tests of the build's facts, 422 unit tests, and the browser tests whole in Chromium and in WebKit (635 passed, 3 skipped by design). The thirteen pictures of Using Zemp Lite were made again after the version was set, since the project screen shows it; eight of the files changed. The walk of a first and of a returning visitor at the address and the checks at both addresses were made at step 16, on bce5ed5.

**Not done, and said so in the notes.** The reader test (owed at Zeff 0.9.0 by the owner's decision at 0.2.1) and the checks by hand (a real keyboard, VoiceOver, Safari itself). The cause of the occasional wait before ⌘↵ on GitHub's machines is still not found.

**The registers.** They are the Zeff repository's. The review was sent to the coordinating session at step 16, which holds its edits for this release: #220 done in all ten items; #211's item 13 as replaced; #215 built; R4's figures (4.08 MB sent, 0.9 MB of room, no early warning seen); the seven red checks that only GitHub's slower machines showed. That session has added two details of this release to the design guide, section 9 (the bar's number rounded down; **Recent** alone until the list is read); they are not yet committed there, so `docs/spec/` here stays the copy at Zeff 7a7a8ee and is brought up when they are. No catalogued function shipped, so the catalogue's status column is not touched.

**The release.** Version 0.2.4 in `package.json`, `worker/Cargo.toml` and their lock files; the commit "Release 0.2.4"; the tag `v0.2.4`; a GitHub release marked a pre-release, as 0.2 to 0.2.3 were, carrying `docs/releases/0.2.4-notes.md`.

**What comes next for Zemp Lite.** The pages of a function and of a code reordered (#223), a release of its own, once the owner has typed the order of the parts; then Zemp 0.3 on "Start release 0.3", after Zeff 0.9.0 is released. Nothing of either is begun before his word.

## 24 November 2026: The specification's copy brought to Zeff 6e57f99, after the release

**What.** `docs/spec/` is the copy of the Zeff repository's `docs/spec/` at commit 6e57f99 ("Record the release of Zemp Lite 0.2.4 in the registers"), compared with it byte for byte. Two files differ from the copy at 7a7a8ee: the open decisions (#220 marked done in all ten items, with the two details the build settled; #211's item 13 built as changed; #215's hover) and the risk register (R4's figures at this release, and the seven red checks that only GitHub's slower machines showed; R4's rating unchanged, with the owner).

**The design guide** is not in `docs/spec/`: it is kept outside both repositories, and its section 9 now says the two details (the bar's number rounded down; **Recent** alone until the list is read). The sentence of the entry above that waited for a commit of it is answered by this.

**Reason.** The copy here names one commit of the Zeff repository and is that commit's, whole. This commit follows the tag `v0.2.4`, which carries the copy at 7a7a8ee.


## 24 November 2026: Proposed for the next release: the engine sent packed at the tightest setting

**The owner's words**, in this session, after release 0.2.4: "how to reduce engine download"; then, given the measures below and five ways with their costs, "enter tight packing as a proposal for the next release".

**What is proposed.** The build packs the engine's WebAssembly with brotli at its highest setting, once, and the host sends that file as it is, in place of packing it afresh at a low setting each time it is sent. Nothing of the engine changes, and no result: the browser unpacks the same bytes. The size the landing page and the loading screen give would then be reckoned at the highest setting, and the check after a deployment, which already holds that figure to the bytes the address sends, would prove it at the address.

**Measured**, on the engine of 0.2.4 (15,148,342 bytes unpacked: the compiled program 7,980,020, the data it carries 5,679,565, the table of internal names 1,467,616):

- as the host sends it now, brotli at about setting 2: 4,058,127 bytes;
- brotli at its highest setting: 2,918,859 bytes, which is 1,139,268 bytes less, 28 per cent;
- with the script of the worker, the measure of risk R4: 2,926.6 kB of 5,000 kB, against 4.1 MB as it travels today.

**To be tried before it is promised.** The host, Cloudflare Pages, does not send a file packed beforehand by itself. The trial at the address must show that the file arrives as packed and is not packed a second time; that the isolation headers and the year-long keeping of a built file are sent with it as now; that the browser still compiles the engine as it arrives; and that the first start is no slower in either engine. Where the host cannot be made to do so, the proposal falls and the download stays as it is.

**Not proposed here**, though measured and told to the owner in the same answer: leaving out the table of internal names (0.11 MB more at the highest setting); an optimiser run over the compiled program (not measured: the tool is not installed); compiling for size, which slows every run; and the help pages, their examples and the sample datasets as a separate download fetched when first asked for (about 0.4 to 0.5 MB of the download; a change of the engine's design, for the Zeff repository's register).

**Which release.** "The next release" is read here as whichever release of Zemp Lite the owner opens next: the pages of Help reordered (#223) or 0.3. That reading is this record's, not his word; the plan of that release puts it to him.

**Reason for recording here.** It is the owner's word on what a release of Zemp Lite is to carry; the register of open decisions is the Zeff repository's, and the coordinating session enters it there. Nothing is built: no release of Zemp Lite is open.

## 24 November 2026: The owner opens release 0.2.5: the app back at the root, the landing page removed, the tight packing its second step

**The owner's words**, in this session, after release 0.2.4: "I want "https://lite.zeff-lang.dev/app/" content would be landing page instead of content of https://lite.zeff-lang.dev". Asked what should become of the present landing page, he typed in place of an option: "I want moving I want "https://lite.zeff-lang.dev/app/" to https://lite.zeff-lang.dev"; asked when, he chose "A small release now, 0.2.5". Asked again whether the present page is kept at an address of its own or removed, he chose "Remove it". Asked whether 0.2.5 carries the tight packing (#224), he chose "Yes, as a second step": the release moves the app first, then tries the packing at the address, and goes out without it where the host cannot do it.

**What it means.** The app opens at the root of `lite.zeff-lang.dev`, as before 0.2.4. The landing page of 0.2.4 (open decision #220, items 1 and 2) is deleted with its tests, and its text and its table of the three regressions are shown nowhere. What else 0.2.4 brought stays: the loading screen and the project screen redrawn, the name drawn with its badge, the four changes of Help, and the address for a page of Help, now `/#/help` and a page after it.

**Engineering, taken here.** An address with `/app/` in it, kept from 0.2.4, goes on to the same place at the root, as an address of the root went on to `/app/` in 0.2.4. How is settled in the release's plan.

**Not begun.** The row 0.2.5 of section 15 of the Zemp Specification and the entry of the register are the Zeff repository's; the coordinating session was asked for them the same day. The plan is written from that row and shown to the owner, and no code is written before his "go".

**Reason.** The owner's word on what a visitor meets at the address; a change of what the specification says of 0.2.4, so a release of its own carries it.

## 24 November 2026: Release 0.2.5 planned; the specification's copy brought to Zeff b1597bf

**The owner's word**, passed back by the coordinating session and read in the Zeff repository before it was taken (commit b1597bf, on the main branch there under the owner's name, "Enter Zemp Lite 0.2.5: the app back at the root, the landing page removed (#225, #224)"): the row 0.2.5 of section 15 of the Zemp Specification; open decision #225, decided, with his four answers as he gave them here; #224 placed as this release's second step; #220 noted as undone in its items 1 and 2 alone; #223's deadline now "its own release after 0.2.5".

**Choice.** `docs/spec/` is the Zeff repository's at commit b1597bf, compared byte for byte. Two files differ from the copy at 6e57f99: the Zemp Specification (the row 0.2.5) and the register of open decisions (#224, #225, the notes on #220 and #223). The plan is `docs/releases/0.2.5.md`: six steps, and no question for the owner, since his four answers settle what the release carries.

**Engineering, chosen in the plan.**

1. _`/app/` is a page that goes on_, not a rule of the host: a page that draws nothing and replaces its address by the same place at the root. It is the way 0.2.4 led an old root address to `/app/`, turned about; it is served and tested here as at the host, and it would go with the app to another host.
2. _The landing page is deleted in the step that moves the app_, and what only it used is cleared out in the step after, so that neither commit leaves a page with no address or a check of a page that is gone.
3. _The tight packing is tried on a deployment beside the real one first_ (a preview of the host under its own address), and the real address is given the packed engine only when the checks pass there: a fault in how the engine is sent would leave the app unable to start.
4. _If the trial falls_, the step's changes are taken out by a commit of their own, never by rewriting history.

**Reason.** The checklist is written from the row, as the standing instructions ask; no code is written before the owner's "go".

## 24 November 2026: Release 0.2.5 is opened (step 1)

**The owner's word:** "Go", on the plan of `docs/releases/0.2.5.md`, which put no question to him.

**Choice.** Version `0.2.5-dev`, in the app's manifest and the worker's. The findings of the reading and the four engineering choices are those of the entry above ("Release 0.2.5 planned"): `/app/` a page that goes on; the landing page deleted in the step that moves the app and its leavings cleared in the step after; the tight packing tried on a deployment beside the real one first; a fallen trial taken out by a commit of its own.

**Reason.** The checklist's step 1.

## 24 November 2026: The app at the root, and `/app/` a page that goes on (release 0.2.5, step 2)

**Choice.**

1. _Two pages still, turned about._ The build's page of the root is the app's (`index.html`, `src/main.ts`); `app/index.html` is a page with no element to draw in and one small script (`src/moved/`), which replaces the address by the same place at the root. One folder of built files for both, as before.
2. _What goes on, and how._ Whatever follows the `#` of an address of `/app/` is carried to the root unread: a project, the naming of a new one, a page of Help, or nothing. The app reads it there as it reads any address, so the page at `/app/` knows nothing of what an address may name and need never change. The address is replaced, not followed, so Back does not return to `/app/` to be sent on again. `/app/index.html` is the same file and goes on the same way.
3. _An address of before 0.2.4_ (the root with a project after its `#`) is the app's own again: nothing sends it on, and a test holds that.
4. _The landing page is deleted whole in this step_, its page, its helpers (the words, the colours of the printed table, the going-on of 0.2.4) and its tests: the helper of its words read the going-on that this step removes, so the two could not be parted as the plan had them. Step 3 keeps what else the plan gave it: the facts of the build that no screen shows now, the build's stop on unwritten notes, and the comments.
5. _The page of what is counted_ leads back to Zemp Lite by one link, to the root; its link to "the front page" is gone with that page.
6. _The size the build reckons, kept on the loading screen for the check._ The check after a deployment held the landing page's figure of the engine's size to the bytes the address sent. With that page gone, the loading screen's first step carries the build's figure as a mark of its own (`data-reckoned`) beside what it says, and the check reads it there: the step itself says the figure only until the engine has come, which is too short a time for a check to read it.
7. _The checks at the address_ (`tests/host/host.spec.ts`, `tools/check-host.mjs`): the root answers with the app's page and starts the engine; `app/` answers with the page that goes on, with the isolation headers, and goes on with nothing after it, with a project and with a page of Help; `/#/help/…` opens its page. Gone with the landing page: its links out of the site, its weight and its first drawing.

**Tested.** Unit: where an address of `/app/` leads, for a project, the naming of a new one, a page of Help, nothing, and anything else. Browser, in both engines: the root is the project screen with nothing of the landing page; a first visit opens on the loading screen, which starts the engine at once; each kind of `/app/` address goes on and Back does not return; a project made is found by its address of 0.2.4; an address of before 0.2.4 is not sent on; the page of what is counted leads back. Forty-one files of tests that opened `/app/` open the root.

**Found by the routine.** The test that reads every rule naming a font, and holds each to the three shipped faces, first makes sure its reading finds the rules at all: it asked for more than 40, and finds 35 now that the landing page's own are gone. That floor is of the reading, not of the fonts; it is set at 30 with the count beside it, and what the test holds of each rule is unchanged.

**Reason.** The checklist's step 2; open decision #225, items 1 to 3.

## 24 November 2026: What only the landing page used, cleared out (release 0.2.5, step 3)

**Choice.**

1. _The facts the build takes from the engine are the engine's travelling size alone_ (`tools/facts.mjs`, `tools/facts-lib.mjs`, `src/app/facts.ts`). The engine's version, the three counts, the part of the Scratch script and its print were shown by the landing page and by nothing else: the app names its engine from the engine itself, and Help's Home counts from the engine as it runs. With them go the build's run of the Scratch script under Node and the five tests of what could stop it; the two tests of the size stay, with the hold to the measure of risk R4.
2. _The build no longer stops where a release's notes are not written._ It stopped because the landing page linked to them; nothing in the app does. The notes are still a part of closing a release, which the standing instructions ask for.
3. _Four colours go from the tokens_ (the landing page's foot with its two inks, and the short rule under a band's title), with their pairings in the test of contrast; no rule of the app names them. The deep violet band stays: the loading screen has it.
4. _The check after a deployment no longer asks GitHub's interface about links_, so the deployment's workflow no longer hands it a token.
5. _A test holds that the build carries nothing of the landing page_: the built pages are three (the app, the page at `/app/`, what is counted); no built page, script or style holds one of the landing page's headings or its marks; and the page at `/app/` has no style, no element to draw in, and one script under a thousand characters that names no file but the small helper the build tool puts before every page's script (under two thousand characters, naming nothing).

**The words, read again.** No page of **Using Zemp Lite** names the landing page, `/app/`, an address or **Open Zemp Lite**; `README.md` names neither. None of the thirteen pictures shows the landing page or an address. Nothing is changed, and nothing is put to the owner to read.

**Reason.** The checklist's step 3; open decision #225, item 3.

## 24 November 2026: The engine packed tight by the build, sent by a function of the host, and tried beside the address first (release 0.2.5, step 4)

**What the reading of the host's documents found**, before anything was written (Cloudflare's own pages, read on 24 November 2026): Pages does not send a file packed beforehand by itself, and a `Content-Encoding` set through the headers file is not a supported way. What is supported: a function of the host (`_worker.js` in the built folder) may answer with a body that is packed already, saying so (`encodeBody: "manual"`), and the host then sends it untouched to a browser that takes that packing; `_routes.json` names the addresses a function answers, and every other file is served without it and without its cost; the headers file is not applied to what a function answers; a preview of the host (a deployment under a branch's name) runs functions as the real address does.

**Choice.**

1. _The worker's build packs the engine_ (`worker/build.mjs`, `tools/pack-lib.mjs`): brotli at its highest setting, 11, with the widest window a browser unpacks, 24; written beside the engine as `zemp_worker_bg.wasm.br`. It takes 26 seconds on this machine, so the packed bytes are kept by the engine's digest (`node_modules/.cache/zemp-lite/`) and an engine built again to the same bytes is not packed again; what is kept is used only if it unpacks to the engine. Measured on this build's engine: 2,917,778 bytes of 15,148,342.
2. _The build of the app puts three things into the built folder_ (`vite.config.ts`): the packed engine beside the engine under the engine's built name; `_routes.json`, which names the engine's address alone; and the host's function as `_worker.js`, with the headers of `public/_headers` written into it, so that the headers have one source. The build stops where the packed file does not unpack to the engine it carries.
3. _The function_ (`tools/host-worker.js`) answers the engine's address for a browser that takes brotli with the packed file, marked as brotli, as WebAssembly, with the headers and the file's tag; it answers "not modified" to a browser that has it; and whatever it does not know (a browser that does not take brotli, no packed file beside the engine, the host failing to find it, another method, another file) it hands to the host to answer as it always did. Nothing in it can leave the engine unsent.
4. _The size the loading screen gives_ is the packed file's own size with the small script reckoned as the host packs it: 2,923,265 bytes, "2.9 MB". It is no longer a reckoning of what the host will do to the engine, but the size of the file the host is given to send.
5. _The server of the tests answers as the function does_, so the browser tests meet an engine sent packed: Chromium asks for brotli over the plain connection of the tests and is sent it; WebKit asks for it only over a secure connection, so here it is sent the engine whole, as the function would send it, and meets the packed engine at the address.
6. _Tried beside the address first, at every deployment from now on_ (`.github/workflows/deploy.yml`). The build is sent to a preview of the host (`https://trial.zemp-lite.pages.dev`), and the whole check of the address is made there, in both engines; only then is it sent to the address and checked again. A build that cannot start the engine never reaches the address. It costs each deployment about a minute.
7. _The check of a host asks for the engine twice_ (`tools/check-host.mjs`), as it travels and not as Node unpacks it: packed, it must be marked as brotli, be WebAssembly, carry the headers, unpack to the engine sent whole, and be the build's packed file to a byte where the build is at hand (elsewhere: under two ninths of the engine, which the host's own packing does not reach); whole, it must not be packed. Run against the address as it stands today, it finds the fault this step removes: "the host packed the engine itself".

**Left as it is.** The measure of risk R4 (`tools/measure-worker.mjs`, the Zeff repository's own): it packs at setting 11 with the usual window and reads 2,928.6 kB for the two files; the engine now travels 5 kB under that, by the wider window.

**A limit to know.** Each fetch of the engine by a browser that has not kept it is one call of the function, and the host's free plan allows 100,000 a day over all functions of the account. The engine is kept by a browser for a year, so only first visits and new versions call it. For the notes' known issues.

**Tested.** Under Node: the packing (it unpacks to the same bytes; packed once and kept by what the file holds; what is kept for other bytes is never used); the function, run as the host runs it with a host of the test's making (packed to a browser that takes brotli, with every header; "not modified"; the headers alone; whole to a browser that does not take it, in five ways of not taking it; whole where no packed file stands or the host fails; nothing else touched); the size reckoned. In the browser, both engines: the build carries the packed engine and the one route; the function as the build wrote it carries every header of the headers file; the engine asked for packed and whole is the same engine; a first visit fetches it, checks its digest, compiles it as it arrives and runs a script.

**Reason.** The checklist's step 4; open decision #224; findings 7 and 8 of the plan.

## 24 November 2026: The loading screen's button is named Start (release 0.2.5, step 4b)

**The owner's word**, given in the coordinating session and read in the Zeff repository before it was taken (commit d934ffb, on the main branch there under the owner's name, "Name the loading screen's button Start in Zemp Lite 0.2.5 (#225)"): "open zemp lite ->" should be replaced by "Start". It is item 5 of open decision #225, placed in 0.2.5, and the row 0.2.5 of section 15 names it. The coordinating session then passed his "go" for building it within this release. `docs/spec/` is the copy at d934ffb, compared byte for byte; two files differ from the copy at b1597bf (the row, and #225 with the note on #220).

**Choice.**

1. _A step of its own, 4b_, added to the checklist after the plan and the owner's "go", before the closing steps, so that the whole-screen test, the measures, the pictures and the notes all carry the new name.
2. _The button says "Start" and nothing else_: the name drawn with its badge and the arrow are gone from it, with the three rules of style that served them. It is drawn in capitals, as the drawing has it, and is read aloud and found as "Start". Grey until the bar is full, then open with the cursor on it, Return pressing it; the line under it says what it said ("Opens as soon as the engine is ready.", then "or press ↵").
3. _Nothing else names the button._ No page of **Using Zemp Lite**, no page of Help and no picture shows or names it, and `README.md` does not; so no sentence is put to the owner to read.

**Tested.** Browser, in both engines: the button is the loading screen's one button, says "Start" and is read as "Start", grey and then open; nothing is drawn inside it and no arrow stands on the screen; the line under it in both states; no button is named **Open Zemp Lite**. Fifteen places of the tests that pressed the button by its old name press it by its new one, and the whole-screen test finds "Start" among the stops of the Tab key. The test of the name drawn counts it twice on the loading screen (its heading and its sentence), not three times.

**Reason.** The checklist's step 4b; open decision #225, item 5.

## 24 November 2026: The trial of the tight packing held (release 0.2.5, step 4)

**What was seen**, on GitHub, for commit f8956dd. Its check was green in both browsers. The deployment sent the build to the trial address (`https://trial.zemp-lite.pages.dev`) and there: the host sent the engine, to a browser that takes brotli, as the build packed it, to a byte (2,929,528 bytes of 15,145,953, GitHub's own build of the engine, which differs by a few thousand bytes from this machine's), marked as brotli and as WebAssembly, with every header of the headers file and the year's keeping; it unpacked to the engine sent whole; and sent whole to a browser that does not take brotli. All 16 checks of the address passed in Chromium and WebKit: the digest of what arrived was the engine's, the engine was compiled as it arrived (no word of the binding on the console), a kept engine was said to be kept, and the first start took 0.8 s in Chromium and 1.8 s in WebKit. Then the build was sent to the address, and both addresses and the 16 checks passed again: the engine travelled as 2,929,528 and 2,932,876 bytes as the two engines count them, against 4,081,843 and 4,085,764 at the deployment before; the first start took 1.5 s and 2.0 s (at the three deployments of this release before it: 1.3 to 1.6 s in Chromium, 1.6 to 2.1 s in WebKit). Read again from this machine at `https://lite.zeff-lang.dev`: the same bytes.

**So.** Each of the conditions of open decision #224 is shown: the engine arrives as about 2.9 MB and is the engine; the isolation headers and the keeping are sent with it; it is compiled as it arrives; "already in this browser" is still said; the first start is no slower. The step stays, and 0.2.5 carries the tight packing. The engine travels 1.15 MB lighter, 28 per cent.

**Reason.** The checklist's step 4, its "done when".

## 24 November 2026: The whole, the measures and the notes (release 0.2.5, step 5)

**Choice.**

1. _The whole-screen test stays as 0.2.4 wrote it_, without the landing page's states (taken out at step 2) and with **Start** among the stops of the Tab key (step 4b): the loading screen while the engine comes and once it runs, the project screen empty, naming, with projects, with a menu open and with a question asked, the page of what is counted, and Help's Home and a function's page, each through 12.5 pixels, 4.5 to 1, both themes, a desk's width and a phone's. Nothing new is drawn by this release, so no state is added.
2. _One test is added_: an address of a part of the landing page of 0.2.4 (the root with `#see-it-work` after it) opens the app, as the notes say.
3. _The measures_ are those the checks at the address print at each deployment, read from GitHub's record of each; the notes give them as ranges over the deployments of the release, and the size of the engine before and after the packing.
4. _The notes_ (`docs/releases/0.2.5-notes.md`) are drafted: what shipped, the three changes a reader meets (the address, the landing page gone, **Start**), the reference versions, what is left out, known issues (the function's limit of calls a day among them), the measures so far. The record of the pre-release routine and the last measures are added at step 6.
5. _The specification's copy_ is brought to Zeff 6dfb777 ("Record that the tight packing held in Zemp Lite 0.2.5 (#224, R4)"), read there before it was taken and compared byte for byte: the register of open decisions and the risk register differ from the copy at d934ffb.

**Reason.** The checklist's step 5.


## 24 November 2026: The host's page is never passed on as the engine (found at the pre-release routine of 0.2.5)

**Found.** At the deployment of the commit of step 4b, one check at the trial address needed its second try: in Chromium the engine had not started within thirty seconds of the first request, and started in three seconds on the retry. The record does not say what the loading screen showed. Looking for a cause, an old weakness of the host was found and confirmed at the address: an address under `/assets/` that is no file is answered with the app's page (status 200, `text/html`), and with the headers the headers file gives a built file, `Cache-Control: public, max-age=31536000, immutable`. For some seconds after a deployment a place of the host may not have been given a new file yet (the check of a host has always allowed for this), and a browser asking that place for the new engine would be sent the page and told to keep it for a year: the loading screen would say the digest differs, and **Try again** would be answered from the browser's own keeping with the same page. It is not of this release's making: it has been so since the alpha was first deployed (release 0.2, step 17). Whether the second try above was this is not known.

**Choice.**

1. _The function added at step 4 no longer hands such an answer on._ Asked for the engine, where the host answers with a page, it answers "not yet": status 503, not to be kept (`no-store`), with the isolation headers. The loading screen then says the host answered 503, and **Try again** fetches afresh, which a test of the screen already holds. This covers the engine for every browser, since the engine's address is the function's; it is the file a reader waits for and the one the function already answers.
2. _The check after a deployment prints what the loading screen says_ where the engine does not start, so that another such failure names its cause.
3. _Not done here: the other built files_ (the app's scripts, styles and fonts, and the worker's script). They are served by the host without the function, which is why they cost nothing, and the same weakness stands for them in the seconds after a deployment. A remedy is a design question (the function over every built file, at a cost against the host's daily limit; or files named so that the host cannot answer a missing one with a page), so it is put to the coordinating session for the registers and named in the notes' known issues.

**Tested.** Under Node: the host answering with its page, to a browser that takes brotli, to one that does not, and for the headers alone, is answered 503, not to be kept, with the isolation headers and no page in the body; with the packed file there and the engine not, the packed engine is still sent to a browser that takes it.

**Reason.** The pre-release routine (testing handbook, section 2.4, item 1): only fixes from here on, and this mends the release's own new piece so that it cannot carry on a fault of the host.

## 24 November 2026: The pre-release routine of 0.2.5 (step 6)

**What was done**, of the testing handbook's section 2.4, the items that exist here.

1. _Features frozen_ after step 4b. One change followed, a mending: the host's function no longer passes the host's page on as the engine (the entry above).
2. _The whole suite_, on the last commit that changes the app or its host (b30d349): green on this Mac and on GitHub in both browsers. GitHub's check was green on every commit of the release it checked (b52b563, 4b1ca01, f8956dd, 44b14fc, e1fd6e3, b30d349), and each was deployed.
3. _The samples and the pictures._ The nine sample projects are identical to what `zeff run` prints, at every run of the routine. The thirteen pictures were made afresh and looked at: four identical, nine differing only in the version a screen shows (0.2.5-dev for 0.2.4) and in a time of day or a run's duration. They are made once more at the release, when the version is 0.2.5.
4. _At the address._ The commit was sent to the trial address and then to the address, and the 16 checks passed at each in both engines; from this Mac both addresses answer as they must. The walk in both engines (a scratch test, not kept in the repository): a first visitor and a returning one, as the notes set out. In Chromium the returning visitor's project was found by its address of 0.2.4 and by its address of before 0.2.4; WebKit's test browser keeps no project between pages, so there the addresses were seen to go on to the app.
5. _The notes_ are completed: the measures over the six deployments, the record of the trial and of this routine, the known issues.
6. _The registers_ are the Zeff repository's: the review is sent to the coordinating session (#225 done in its five items; #224 held and built; R4's figures; the weakness of the host for the registers to place).

**Not done, and said in the notes:** the reader test (carried to Zeff 0.9.0 by the owner's decision at 0.2.1) and the checks by hand.

**Reason.** The checklist's step 6. The release itself waits for the owner's word.

## 24 November 2026: Release 0.2.5 is closed

**The owner's word:** "Release 0.2.5", after the report of step 6.

**What was done.** Version 0.2.5 in the app's manifest and the worker's. The worker built again (the version is in it): the engine of the release packs to 2,918,316 bytes of 15,148,342 on this machine, and the measure of risk R4 reads 2,928.2 kB. The thirteen pictures made again: nine differ, in the version a screen shows and in a time of day or a run's duration. The notes dated, with those two figures of the release's own tree.

**The routine at the close.** Here, on the release's own tree, which differs from the checked and deployed commit b30d349 in the version, the pictures and the documents alone: format, lint, types, the edition check, the Rust checks and tests, the worker's messages, the measure, the nine samples identical, the eleven tests of the engine's size, its packing and the host's function, 418 unit tests, and 647 browser tests in both browsers (3 skipped by design). Green. GitHub's check of the release's commit and its deployment are read after the tag is pushed, and what they show is told to the owner.

**The functions' catalogue** has no row of a Zemp release; its status column is the Zeff repository's.

**The registers.** They are the Zeff repository's. The review was sent to the coordinating session at step 6, which entered the finding of the host as risk R13 and holds what says "released" for this word: #225 done in its five items; #224 held and built; R4's figures.

**Reason.** The standing instructions' closing of a release.

## 24 November 2026: The specification's copy brought to Zeff 6af2614, after the release

**What.** `docs/spec/` is the copy of the Zeff repository's `docs/spec/` at commit 6af2614 ("Record the release of Zemp Lite 0.2.5 in the registers (#225, #224, R4)"), read there before it was taken and compared byte for byte. Two files differ from the copy at 6dfb777, which the tag `v0.2.5` carries: the open decisions (#225 done in its five items, with the tag and the commit; #224 done) and the risk register (the owner's rating of R4, Low, given in the coordinating session; R4's figures at this release; and the new risk R13, "A browser keeps a wrong file of Zemp Lite for a year", which is the weakness of the host found at step 6, its remedy for the app's other built files left as this repository's engineering at its next release).

**Reason.** The copy here names one commit of the Zeff repository and is that commit's, whole. This commit follows the tag `v0.2.5`.

## 24 November 2026: A test of the project screen waits for the list before it presses Tab (found on GitHub at the release's commit)

**Found.** GitHub checked the commit "Release 0.2.5" twice, once for the branch and once for the tag. The check for the tag was green; the check for the branch failed in one browser test of 647, in Chromium: "every card and every row is reached by the Tab key, in the order of the screen" did not find the project's row among the stops. The commit after it, which changes documents alone, was green and is the one deployed; both addresses show version 0.2.5 and send the engine packed.

**The cause, reproduced here.** Since 0.2.4 the project screen draws its list only once the list has been read from the browser's storage, so that a visitor with projects is never shown the card of a first visit. The test made a project, returned to the project screen and pressed Tab at once. Where the storage answers late, the Tab key has passed the place of the list before the row is drawn. With the storage made to answer 400 ms late, the test fails here every time, with the same words as on GitHub; with a wait for the row, it passes in both browsers. The screen is right: the row is there a moment later, and a reader who presses Tab then reaches it. The same thing was mended for another test at 0.2.4 (the whole-screen test); this one was missed.

**Choice.** The helper of the project screen's tests that makes a project and returns to the screen now waits for that project's row before it hands back. Nothing of the app changes, and nothing a test holds is loosened. The tag `v0.2.5` is not moved: the release's commit carries the test as it was, and its app is the app that passed.

**Reason.** A failure of GitHub's check is read and its cause found, never passed over because another run was green.

## 24 November 2026: One run of the routine failed in an unrelated test, once, and the commit was pushed before it was read (after release 0.2.5)

**What happened.** The commit that makes the project screen's tests wait for the list (23f1b6c) was committed and pushed before the result of its routine had been read: the command that read the result went straight on to the commit. That run had failed, in one browser test of 647, in WebKit: "Run to here, on a statement's line number, runs the statements before it" pressed **Run to here** and no run began within five seconds. The test is not one the commit touches, and the commit changes no part of the app: one helper of the project screen's tests, and documents.

**What was done about it.** The test was run forty times over in WebKit and passed forty times. The whole routine was run again on the pushed commit and was green (418 unit tests, 647 browser tests, 3 skipped by design). The cause of the one failure is not found; it has not been seen in the twenty-odd runs of the routine of this release, here or on GitHub. It is recorded so that a second sighting is known for one.

**For the working.** The result of a routine is read, as a step of its own, before anything is committed on it. A command never both reads the result and commits.

**Reason.** A step is committed only when the routine is green, and a failure is told as it was.


## 27 November 2026: Release 0.3 is planned; the specification's copy is brought to Zeff f0c83be

**The owner's word.** On 26 November 2026 he asked for 0.3 and was told that it stands on Zeff 0.9.0, then finished and not released; he released it that evening, and on 27 November wrote "ready to start 0.3". That is taken as "Start release 0.3".

**What was confirmed.** `v0.2.5` is tagged (b6ded13) and the working tree was clean, the three commits after the tag changing a test's helper and documents. Zeff 0.9.0 is released: the tag `v0.9.0` on commit 670e73f of the Zeff repository, with a GitHub release.

**The copy.** `docs/spec/` is the copy of the Zeff repository's `docs/spec/` at commit f0c83be ("Record the signing, the installation check and the publishing of release 0.9.0"), each file taken from the commit and compared with it byte for byte. Two files differ from the copy at 6af2614: the register of open decisions (#226 to #230 entered, among them #228, a project's other text files opened to be read, decided by the owner on 25 November 2026 and placed in the next Zemp Lite release, and #230, the reader test moved to 0.11.0; the status at the close of 0.9.0) and the risk register (the review at 0.9.0).

**The plan.** `docs/releases/0.3.md`: 23 steps in seven parts, with what the reading found, what the release leaves out and four questions for the owner. Three readings of it are this session's, and are said in the plan so that he may overturn them:

1. _The spike of the Typst module is step 2_, straight after the opening, as the record of 23 November 2026 asks, and before the engine's steps, though Paper's own steps come later: what it finds of licences and fonts may need his answer, and the other steps go on while he gives it. A fifth thing is added to the four it settles: whether a place on the set page is traced to its place in the source, on which two pieces of the row rest.
2. _#228 is in this release._ Its decision places it in "the release of #223 if it comes before 0.3, otherwise 0.3"; the release of #223 has not come.
3. _What the editor asked of the engine (#175: C5, C6, C22; #197; #178) is taken up here_, in steps 6 and 7. The row names the release's methods alone, but the app's stand-ins were each recorded as lasting until the engine gave its own (the sections read from comments, 0.2.1; the plot of a name bound twice, 0.2), and Zeff 0.9.0 gives them. No screen changes by it but the one known limit lifted.

**Left out, and why.** **Run section** (#178) is named by the Zemp Specification as planned "before Zemp Lite 1.0" and by no release's row, so it is not pulled into this one. The remedy of R13 is in (step 4): it was left to this release at 0.2.5, and the Typst module is one more built file to guard.

**Nothing is built.** No file of the app is changed by this entry; step 1 opens the release on the owner's "go".

**Reason.** A release is planned before any code, and the plan is put to the owner in plain words with the questions only he can answer.

## 27 November 2026: Release 0.3 is opened; the owner's four answers

**The owner's word.** On the plan of `docs/releases/0.3.md` and its four questions, each put with a recommendation: "Go, as recommended".

**His answers, so given.**

1. _The Variables pane (#209): option A._ Every kind of variable in the register's table, at this release: long text by the lengths of its values, with its empty and missing rows, five values in full and the values that repeat; text of few values with a line naming `category()`; a variable whose every value differs said to look like an identifier; an ordered category in the order of its levels; a number with its unit and measure where the data carries them; an opaque column counted, with its first values as printed. Steps 20 and 21 are both in the release.
2. _What **Run** does in Paper: the scripts whose exported files the paper uses_, in the order of their names, the page set again with what they wrote; a paper that uses none says so.
3. _Where a new paper is made: a folder `paper/` of the project._ **New paper…** asks its name and makes it there (`paper/paper.typ` for the first); a `.typ` file anywhere in a project opens in Paper.
4. _The Scratch project carries a short sample paper_: one page that sets a table and a figure its scripts export, fetched and set only when Paper is opened.

**#228 stays in this release** (a project's other text files opened to be read): he was told it is here by its own words and is his to move, and did not move it.

**For the coordinating session**, which alone edits the register and the specification: #209 decided as A at Zemp 0.3; the row of 0.3 in section 15 of the Zemp Specification to name #209 and #228; the folder `paper/` (answer 3), which the project's folders in section 2 of the Engine Specification do not name. Nothing in `docs/spec/` is changed here; the copy is brought up when those entries are made.

**The version.** `0.3.0-dev` in `package.json`, `package-lock.json`, `worker/Cargo.toml` and `worker/Cargo.lock`, as each release since 0.2.1 is opened; the interface writes it as 0.3-dev (`src/app/version.ts`: the patch left out where it is 0). The engine stays Zeff 0.8.0 until step 3.

**Four tests that named the release.** One unit test and three browser tests held the version to the 0.2 line (`/^0\.2\./`, "0.2" on the Start and welcome screens) or, in Help's Home, compared the screen with the version as `package.json` writes it, where the screen writes it by the app's own rule (`0.3.0-dev` is shown as 0.3-dev; the two agreed at every release since 0.2.1 because its patch was never 0). The screens were right. The tests now name the 0.3 line, and Home's test writes the version as the interface does. Each holds what it held; none is weakened. Found by the routine, which was run three times: the unit test stopped the first, the three browser tests the second, the third is green.

**The engineering choices of the plan**, recorded with it in the entry above (the spike as step 2; what the editor asked of the engine taken up in steps 6 and 7; R13's remedy in step 4), stand.

**Reason.** The owner's "go". A release is opened by a commit that changes the version and the records and nothing of the app, so that the routine is seen green before the first change.

## 27 November 2026: The spike of the Typst module (release 0.3, step 2; #172, option A)

**What was done.** Typst was built as a module for the browser outside the app and outside both repositories (`~/dev/handbook/zemp-paper-spike-0.3/`, with a note of what the folder holds): `typst`, `typst-layout`, `typst-pdf`, `typst-svg` and `typst-ide` 0.15.1, bound with `wasm-bindgen` 0.2.129 as the engine's worker is, with the flags of the worker's build. It was given a sample paper of eight pages (A4, justified, numbered headings, two displayed formulas, cross-references, a table and the lines of a test as `export` wrote them to `.typ`, and a scatter of 18,000 points as the engine's SVG, 846 kB), and measured under Node and in Chromium and WebKit through Playwright. Nothing of the app is changed. The five things the step was to settle:

**(a) Licences.**

- _The crates._ 294 are linked for the browser's target. Each is under MIT, Apache-2.0, BSD, ISC, Zlib, the Unicode licence, or more permissive (0BSD, CC0, the Unlicense, the Boost licence offered beside Apache-2.0, Apache-2.0 with the LLVM exception offered beside the others). None names the GPL, the LGPL, the AGPL, the MPL or the LPPL. Read from the licence field of every crate in the build's tree.
- _The hyphenation patterns._ A copy of the crate `hypher` 0.1.8 with fifteen languages taken out, the patterns deleted and their features removed: the thirteen under the LPPL alone (Afrikaans, Catalan, Greek, Croatian, Icelandic, Georgian, Kurmanji, Dutch, Russian, Serbian, Swedish, Turkish, Ukrainian), Hungarian (MPL, GPL or LGPL) and Slovak (the crate's copy still states the GPL). It is put in place of the published crate by a `[patch]`, and the build takes it. 33 languages remain, as the Zeff session read their licences at this version (Zeff's record of 19 November 2026). A paper in a language taken out sets without an error and without a warning, its words unbroken: tried with Dutch and Russian, whose page is the same whether hyphenation is asked for or forbidden, while the pages of German and English differ, so their words are broken.
- _The data inside Typst's assets_ (the fonts that stand for a PDF's standard fonts, the colour profiles, the line-breaking data, the tables of HTML and MathML) are permissive, as Zeff's record found for this version; Typst's own bundled fonts are behind a feature that is left off.
- _The fonts, which is where a choice is needed._ Typst names three faces by default. Text, Libertinus Serif: SIL Open Font Licence 1.1, allowed by the ruling of 0.1. Mathematics, New Computer Modern Math: the GUST Font Licence, which is the LPPL with a request added, **not allowed**. Code, DejaVu Sans Mono: the Bitstream Vera terms, free and permissive, but not the Open Font Licence, and so **not yet ruled on**. Typst's choice of the mathematics font is fixed by name: where that font is absent it sets formulas in the text face and warns "current font is not designed for math" at each formula (seen in the trial). A line in the paper, `#show math.equation: set text(font: "…")`, changes it, and with that line the formulas set without a warning (tried with STIX Two Math, which is under the Open Font Licence and was on this machine).

**The choices taken on the owner's behalf** (his instruction of this day, "take all decisions of my behalf"), each his to overturn before step 11 builds on it:

1. _Text:_ Libertinus Serif (regular, italic, bold, bold italic), Typst's own default, so that a paper looks in Zemp Lite as it does in Typst.
2. _Mathematics:_ Libertinus Math, of the same family and under the Open Font Licence, in place of New Computer Modern Math. Because Typst fixes its default by name, **a new paper begins with the line that names the font**; a paper brought from elsewhere without it is told, in words, the one line to add. The trial measured with STIX Two Math; Libertinus Math is fetched at step 11 from its publisher's repository at a named commit, unchanged, with its licence file, as the app's fonts were at 0.1, and its size measured then.
3. _Code:_ kept strictly inside what he has ruled: JetBrains Mono, the app's own code face (Open Font Licence), named by a second line at the head of a new paper. **One question is left with him, and nothing waits on it until step 11:** whether the module may carry DejaVu Sans Mono under the Bitstream Vera terms. If yes, code in a paper sets as Typst sets it with no line in the paper, and a paper brought from elsewhere needs nothing for its code.
4. _New Computer Modern_ (the Article template's face at stage 2, #124) is under the same GUST licence, and one of its files under the GPL with exceptions. That is a matter for Zemp 0.4 and is told to the coordinating session; nothing of stage 1 needs it.

**(b) The size as it travels.** The module with seven font files compiled in (2.74 MB of fonts unpacked) is 30.1 MB, **7.98 MB packed at brotli's highest setting**. Without the fonts 6.59 MB, so the fonts cost about 1.5 MB. The parts by which a click finds the source cost about 1 kB; painting a page inside the module, which is not needed, 0.15 MB more. Compiled for size, the whole is 7.37 MB (`opt-level = "s"`) or 7.04 MB (`"z"`), against 8.06 MB for the same sources compiled for speed. The limit recorded for step 11's measure: **8.5 MB packed, the module and its fonts together**; whether the fonts travel inside the module or as files of their own, and the level of optimisation, are settled there by its measures (the trial favours size: see (c)).

**(c) The time.** With the module's bytes in hand:

| | Node | Chromium | WebKit |
| --- | ---: | ---: | ---: |
| The eight pages set for the first time | 183 ms | 164 ms | 149 ms |
| Set again after one letter typed on page 1 (ten times) | 6 to 26 ms | 5 to 9 ms | 4 to 7 ms |
| Set again after one letter typed on the last page | 2 to 3 ms | 2 to 3 ms | 2 to 3 ms |
| The eight pages written as SVG | 48 ms | 47 ms | 46 ms |
| Those SVGs drawn by the browser, all eight at once | | 275 ms | 513 ms |
| The PDF (1.12 MB) | 143 ms | 136 ms | 130 ms |

A paper is held between settings, so a second setting reuses what the first worked out. Compiled for size the first setting takes 194 ms (`"s"`) or 255 ms (`"z"`) under Node and a letter typed costs the same as before. The slow part is the browser drawing the page that holds the heavy figure, not Typst. So the live page is affordable at every keystroke after a short pause, and only the pages in view are to be drawn.

**(d) The PDF's bytes.**

- The module gives **the same bytes under Node, in Chromium and in WebKit** for the sample (one SHA-256), and its own code built for this Mac gives those bytes too.
- Against the desktop Typst 0.15.1 (built here from the published crate with its own lock file, into the trial's folder; the Typst installed on this machine is 0.15.0 and was left alone), given the same font files and no others (`--ignore-system-fonts --ignore-embedded-fonts --font-path`) and the same creation time: **the first build differed** in the full sample by 398 bytes, and in some small papers and not others. Every stream of the two files unpacked to the same content; what differed was how some streams were compressed, and the identifier that Typst derives from the file. The cause: a build that chooses its crates afresh takes 160 of them at later versions than the released program pins, the compressor among them (`zlib-rs` 0.6.9 against 0.5.1; `flate2` 1.1.11 against 1.1.2) and the line-breaking data (ICU 2.4.0 against 2.2.0).
- **Built from the released program's own lock file, the module's PDF is the desktop Typst's, byte for byte**: six papers (plain text, formulas, a long ragged paper, a justified one, the full sample with and without its figure), natively and as the browser's module, in Node, Chromium and WebKit.
- So: **the module is built from the lock file of the released Typst it carries**, with its own few crates added, and the creator and the identifier are left as Typst writes them ("Typst 0.15.1"), since a PDF that Typst set says so truthfully and only so can the bytes be the desktop's.
- _The one departure, and what it costs._ The released program pins `hypher` 0.1.5, which holds 35 languages, fifteen of them the ones taken out here; the copy is made from 0.1.8, whose licences were read and which adds twelve Indian languages and Galician. Of the 33 kept: sixteen have the same patterns in both versions, English and French among them (Belarusian, Bulgarian, Czech, Danish, English, Spanish, Estonian, French, Italian, Latin, Lithuanian, Mongolian, Norwegian, Polish, Slovenian, Turkmen), and a paper in one of them is set to the desktop's bytes; four changed between the versions (German, Finnish, Portuguese, Albanian), and thirteen the released program does not hyphenate at all, so a justified paper in one of these seventeen may break its lines differently from the released desktop program, as it would from any desktop Typst built with another version of the patterns. This is said in the notes and on the page about Paper.
- An upgrade of Typst changes the bytes; the module pins one version, and the notes of each release name it.

**(e) From a point of the page to the source, and how a page is drawn.** `typst-ide` answers a click with a file and a place in it. Tried over the first two pages of the sample: the title, headings, paragraphs and formulas lead to their lines; a cross-reference leads to the place on the page it points at; the figure leads to the line that places it; text inside an included file leads into that file where it is written as markup. **A table as `export` writes it is the exception:** its cells are written as strings, which carry no place, so a click on a cell finds nothing; a click on one of its rules finds the table's file, and a click on its caption the line of the paper. Step 14 therefore adds a small piece of its own: a click inside an exported table or figure leads to the line of the paper that brings it in. A page is drawn from Typst's own SVG of it (46 to 48 ms for eight pages, and no weight in the module), not painted.

**What changes in the plan.** No step is added, removed or blocked. Taken into the steps as they stand: step 11, the module built from the released Typst's lock file with the hyphenation copy of 0.1.8, the fonts fetched from their publishers, the limit of 8.5 MB; step 12, a new paper beginning with the lines that name its mathematics and code fonts; step 13, pages drawn as SVG and only those in view, and the missing mathematics font said in words; step 14, the piece for exported tables; step 16, the creator and identifier left to Typst, and the test of the bytes against a hash kept from the desktop Typst.

**Scripts the three faces do not hold.** Libertinus Serif covers Latin, Greek and Cyrillic. A paper in another script (Devanagari, Bengali and the other Indian scripts whose hyphenation the copy keeps, Arabic, Chinese) needs a face that holds it, which the module does not carry. Taken as engineering for steps 11 and 13: a font file (`.ttf`, `.otf`) kept in the project is given to Typst with the module's own, so a paper can name it; the page about Paper says so.

**Not measured.** The time to fetch 8 MB at a visitor's line (it is a second fetch, made once, after the app has started); the module's memory over a long sitting (what no setting has used for ten settings is dropped, by Typst's own means); a paper of a hundred pages.

**Reason.** Each of the five could have changed the plan. Two did change how the module must be built: the fonts Typst assumes are not all ones this project may ship, and the same bytes as the desktop are had only from the same pinned parts.

## 27 November 2026: The worker on Zeff 0.9.0 (release 0.3, step 3)

**Decision.** The worker is built on the released Zeff 0.9.0: its nine pins name the commit of the tag `v0.9.0` (670e73f) in place of that of `v0.8.0`, and `worker/Cargo.lock` is brought to them. The lock file changes in the engine's own crates alone (0.8.0 to 0.9.0, and `zeff-glm` added); no third-party crate changes version, so nothing is added to the list of dependencies. The compiler is the one Zeff pins for 0.9.0, the same 1.99.1, and the binding tool the same `wasm-bindgen` 0.2.129.

**What the engine's changed interfaces required of the worker: nothing.** It compiles and passes `clippy` with warnings denied without a line of its code changed.

**The ten sample projects** of the released engine, `binary` among them, run through the worker and print and say what the Zeff repository keeps for them, byte for byte.

**Measured (R4).** The engine as it travels: 3,069,812 bytes packed at brotli's highest setting, of 15,870,911 (2,918,316 of 15,148,342 on 0.8.0), 5 per cent more than at 0.2.5; by the measure of R4, with the worker's script, 3,082.8 kB of the 5,000 allowed. Cold start under Node 56 ms.

**The released command line** was built from the same commit with its own lock file (`cargo install --git … --rev 670e73f… --locked zeff-cli`; kept at `worker/target/zeff-0.9.0/`, not committed, beside that of 0.8.0), and made every kept output of this repository again. The way of making each was first proved by making the kept files of 0.8.0 again with the command line of 0.8.0, to the byte, and then used with 0.9.0. What it found:

- _The same bytes as 0.8.0:_ the five short scripts with what they print, say and what `zeff check` says of them; the example; the Scratch project's `main` and `plots`; the specification's sample refused; `zeff explain W0201`; `zeff help` of a name that is none; the lists of `time`, `dist`, `stats` and `regress`; what `:vars` prints and the script `:save` writes; and every figure: the example's two, the 21 of the showcase by their digests, and the saved plot as SVG, PDF and PNG.
- _Changed, each as the notes of 0.9.0 say:_ the Scratch project's `instruments` (a coefficient that printed as `0.000` in `report` is written to two significant digits, `-0.00041`, and the columns are wider by it); the pages of `add` (a second note, of `len` of a text variable, naming `n_chars`) and of `summary` (the frame's page in the fuller form); the lists of `core` (`timer`; the words of `first` and `last`), `data` (`row_number`; the words of `row`) and `results` (`margins`); the console's first line, which names the engine; and the two reports, whose line of the version and so whose names changed.
- The `zeff.toml` that `zeff new` writes is the same but for the version.

**Counts of this engine**, held by the tests: 266 functions of 262 names by package, nine names with two functions as before; 11 packages (`glm`, tier 2, last); 148 codes with an explained page (Z0708, Z0711, Z0717 and W1008 are new) in the same 12 families; 4 datasets.

**The tests brought to it.** No behaviour of the app is changed by this step, and no test is weakened: each that named the engine, a count, a list or the order of a page's sections now names what 0.9.0 gives, checked against the released command line or the engine's own index. Three kinds are worth saying:

1. _A page's first section._ The pages of `data`, `datasets`, `dist` and `stats` are in the fuller form and begin with **In brief**, where tests took **Usage** to be first. The reader of a page reads every part of the fuller form already (it was written on the page of `add` at 0.2.3); the tests now say In brief where it is, and still hold that Usage is there.
2. _R and Stata names from the pages._ Eighty-four more pages carry the table under **Coming from R or Stata**, so their names are now the page's and no longer the catalogue's (`rnorm()` where the catalogue wrote `rnorm`; `lm` now also leads to `posthoc`, whose page writes it). From a Stata cell the index reads a word written with brackets as it reads a function called, so the options `by()` and `level()` are among the names of `t_test`, as `vce()` has been among those of `ivreg` since 0.2.3. That is the rule as it was written, generous on purpose, and it is left; whether common options now crowd the search's suggestions is looked at in step 5, through the screens.
3. _Four tests that named a release's line_ were mended at step 1; the same file's `ENGINE` is now 0.9.0.

**Found, and made a step of its own (3b).** A project whose `zeff.toml` names Zeff 0.8.0 **runs on this engine without a word**. At 0.2 the engine itself refused a project pinned to another version (Z0710), and the interface showed its refusal (the record of 21 November 2026). In Zeff 0.9.0 that check is made by the command line, which now stands behind a launcher that finds the engine a project pins; the engine's library runs what it is given. Every project a visitor made in the hosted alpha names 0.8.0, so this is no longer the owner's own trial projects alone. The Zemp Specification says what the desktop does (several engines side by side, and **Update engine**, section 9.1) and nothing of the web, which carries one engine. The design question goes to the coordinating session for the register. What is built meanwhile, taken on the owner's behalf under his instruction of this day, is step 3b in the checklist, and its reasons are recorded with it.

**Reason.** The row of 0.3; the standing rule that Zemp uses the engine through its released versions.

## 27 November 2026: A project that names another engine (release 0.3, step 3b)

**The question, and why it is answered here.** A project's `zeff.toml` names the engine it runs on, exactly (Engine Specification, section 2). Zemp Lite in a browser carries one engine. From this release that engine is Zeff 0.9.0, and every project made in the hosted alpha names 0.8.0. The Zemp Specification says what the desktop does (engines side by side, each project on the one it names, **Update engine** showing the differences before `zeff.toml` is changed; section 9.1) and nothing of the web. At 0.2 the engine itself refused such a project; from Zeff 0.9.0 the engine's library runs it and only the command line refuses (step 3's record). Left alone, a project would print the results of 0.9.0 under a manifest that says 0.8.0. The choice is taken on the owner's behalf, under his instruction of this day, and is his to overturn; the design question goes to the coordinating session for the register.

**The choices that were open.** (a) Run it on the carried engine without a word: no friction, and a manifest that says what is not so; a project exported would ask a desktop Zeff for 0.8.0 and print other numbers than the browser showed. (b) Refuse it and offer nothing: every project of the alpha could no longer be run. (c) Rewrite every project's manifest as it is opened: no friction, and a file of the reader's changed without the asking, which the app does nowhere else (the record of 21 November 2026: "rewrites nothing"). (d) **Refuse the run as the command line does, say why in plain words in a line under the bar, and offer the move as one press.** Taken: (d).

**What is built.**

1. _The worker makes the command line's check_ wherever it would run a project's code: a run, a check, the list of bindings, a filter of the data viewer, a report. It gives the engine's own diagnostic (Z0710), rendered by the engine's own code against the manifest, and is held to what the released `zeff run` and `zeff check` of 0.9.0 say of the manifest `zeff new` of 0.8.0 wrote, byte for byte (`tests/scripts/pin/`), with exit code 4. For a run it tells the refusal as the engine tells what its check says before a first statement, so the interface has it as a run the engine refused.
2. _The line_ (`src/app/EngineLine.svelte`), under the top bar, as the line of a narrow window is: "This project names Zeff 0.8.0 in its zeff.toml, and Zemp Lite carries Zeff 0.9.0. A project runs only on the engine it names." with **Move to Zeff 0.9.0**. After a run the engine refused, the line also carries the engine's own first line. The move is in ⌘K too (**Project: move to Zeff 0.9.0**), while it applies.
3. _The move_ rewrites the version in the one line of `zeff.toml`, its comment kept at its column, and nothing else (`movedTo` in `src/project/projects.ts`): the manifest `zeff new` of 0.8.0 wrote becomes, to the character, the one this engine's `zeff new` writes. An open tab of the manifest shows it. The line then says "This project now names Zeff 0.9.0; it named 0.8.0. Run it to see its results on this engine.", until it is closed or the project is left. No result is shown as if it were already this engine's: nothing has run.
4. _The manifest edited by hand_ names what it names: the line comes and goes with the text as it is typed.
5. _The Scratch project_ is the app's own example, and is moved without the asking, as the engine moves its own scratch project; whether it is come back to by the Scratch card, by its row or by its address. What the reader left in its scripts is not touched.
6. _A manifest that names no engine that can be read_ gets no line: the engine says of it what it says.
7. _A project exported_ keeps the engine its manifest names, moved or not.

**Not built, and why.** A comparison of the project's results on the two engines before the move, as the desktop's **Update engine** makes: a browser carries one engine, and fetching a second (3 MB) to run every script twice is a design of its own, not this step's. The line does not link to the notes of the engine's release: the page **Projects, scripts and files** says that they tell what changed.

**The words for the owner to read.** One new section at the foot of **Projects, scripts and files** (Using Zemp Lite), _A project that names another Zeff_, seven sentences. It names no control in bold, since the button's words carry the version.

**A note on the tests' WebKit.** A reload in the middle of a test showed the project gone in WebKit, which for a while looked like a fault of the app. It is the test browser's short-lived profile, which keeps a private file system only for the life of the tab, as a private window does, and the suite already says so (`tests/browser/support.ts`; the tests of kept projects are in `kept.spec.ts`). The new tests leave a project and open it again from its row in place of a reload.

**Tests.** Rust (the refusal at a run, a check, the bindings and a report, in the command line's words; the same project moved runs). Unit (the engine a manifest names; the move: the version alone, the comment at its column, a longer version, a line written otherwise, a manifest with no such line left as it is; the Scratch project of an earlier engine moved by either way back to it, and no project of the reader's). Browser, both engines (a project of the earlier engine opened from a zip: the line, a run refused with exit code 4 and the engine's words in the line, sizes and contrast in both themes, the move from the keyboard, the run, the manifest as saved, the line closed and not back when the project is opened again; the manifest edited by hand and the command of ⌘K; the Scratch project of an earlier visit).

**Reason.** A project runs on the engine it names and on no other; the app says what is so, changes a reader's file only when asked, and leaves no visitor of the alpha with a project that cannot be run.

## 27 November 2026: Step 3 at the address, and one measure not yet explained

**The deployment of step 3** (commit 0b58c22). GitHub's check is green in both browsers; the build was sent to the trial address and then to the address, and all 16 checks passed at each. The engine travels as 3,068,246 bytes to Chromium and 3,071,711 to WebKit (2,929,173 and 2,932,485 on 0.8.0); the loading screen says 3.1 MB. First start at the address: 1.70 s in Chromium and 1.97 s in WebKit (0.88 s and 1.64 s at the deployment before, on 0.8.0; 1.5 s and 2.0 s at the release of 0.2.5). At the trial address the same build started in 0.81 s and 2.25 s. So the first start is within what earlier deployments showed, and in WebKit it is at the goal of 2 s, with no room: one of the two WebKit starts was over it. The check of the address reports the time and does not fail on it. It is a figure to watch at each step of this release, and is told to the owner.

**The measure not yet explained.** A statement run alone with ⌘↵, after a run of the Scratch project's script: on GitHub's machine, in Chromium, 3.4 s and 3.6 s passed between the key and the start of the run (at the address and at the trial address), where the deployment before, on 0.8.0, took 9 to 60 ms; in WebKit on the same machine it took 10 to 14 ms, as before.

**What was tried.** The same measure at the address from this Mac: 18 to 32 ms in both browsers, four times. With the browser held to low priority here: about 200 ms, of which the engine's check of the script is about 100 ms, what the statement needs 10 ms, and waiting for the engine to end what it was doing 1 ms. The engine's check of the same script by the released command lines of 0.8.0 and 0.9.0, natively: 10 ms each. So the engine's check has not become slower, this machine does not show the wait, and a slower machine by itself explains a tenth of it at most.

**What is done about it.** The app now notes, in the browser's own user timings, the three parts of the time before a one-statement run (waiting for the engine, the check, what the statement needs), and the measure at the address reports them and presses the key a second time, so that what is paid once is told from what is paid at every statement. The next deployment says where the time goes. Until it is explained it is listed as an open matter of this release, not as a known fault of the app: no reader's machine has shown it.

**Reason.** A measure that moves by a hundredfold on one machine is not passed over because the checks are green; and it is not called a fault before it is seen where a reader would meet it.

## 27 November 2026: A wrong file never kept for a year (release 0.3, step 4; risk R13)

**The risk, as it stands at the address before this step**, shown by the check written for it: an address under `assets/` that holds no file is answered with status 200, with the app's page, and with `Cache-Control: public, max-age=31536000, immutable`. For some seconds after a deployment a place of the host may not yet hold a new file; a browser that asked then would be told to keep a page for a year as the script, style or font it asked for, and the app would not start in it until its data was cleared. From 0.2.5 the engine alone was guarded.

**The three remedies the register names, and the choice.**

1. _The host's function over every built file._ Taken. The function that already answers the engine's address answers `/assets/*`: it asks the host for the file, passes it on untouched where it is the file, and answers "not yet" (503, `no-store`, to be asked again in 5 seconds) where the host gives a page in its place; whatever else is not the file (not found, a fault of the host) is passed on by its status, `no-store`. The year's keeping of a real file is as it was.
2. _A page for a missing file_, so that the host answers an unknown address as not found. Not taken: whether the host then puts the year's keeping on that answer under `/assets/*` is not in our hands, and a "not found" kept for a year breaks the app as surely as a page does. It would also change what every unknown address of the site answers.
3. _The year's keeping given up for a short one with a question at each visit._ Not taken: some nineteen questions at every start, the engine among them, against the start-up goal of 2 s, which the measure of step 3 already touches in WebKit.

**What it costs, and its limit.** The function is called once for each built file a browser asks for: about nineteen on a first visit, none on a later one while the browser keeps them. The host's free plan allows 100,000 calls a day, so some 5,000 first visits a day. That is far above an alpha whose address is not announced, and it is a ceiling to be raised (the host's paid plan allows a hundred times as many) before it is reached; it is said in the notes and to the coordinating session for the register.

**The page's own word.** With the guard, a script of the app that is asked for in those seconds does not arrive, where before a wrong one was kept. The app cannot say so, being what did not arrive. So the page itself carries one small script of its own: where a script of it fails to arrive and nothing is drawn, it says "Zemp Lite could not be loaded: a file of it did not arrive. That can happen for a few seconds while a new version is put in place." with **Load again**. Where every file arrives it is never seen.

**The preview of the build** answers as the function does: an address under `/assets/` that holds no file is answered "not yet", not to be kept. `_routes.json` names `/assets/*`.

**Tests.** The function under Node (a script, a style and a font that are there passed on untouched and asked for once, and "not modified" when asked again; each kind of built file answered "not yet", not to be kept, with the isolation headers, for GET and HEAD, where the host gives its page; a "not found" and a fault of the host passed on by status and not to be kept; what is not a built file asked for left to the host). Browser, both engines (an address under `/assets/` that holds no file; every built file still sent whole with the year's keeping; a page whose script did not arrive says so and loads again; the line never shown where every file arrives). The check after a deployment: three addresses under `assets/` that hold no file must be answered as no file, without a page, `no-store`, with the isolation headers. Run against the address as it stands today the check fails on all three, which is the risk shown; run against the preview of this build it passes.

**The trial.** Every deployment sends the build to the trial address first and makes every check there; only then is it sent to the address. So the function over every built file is tried at the host before a visitor meets it, and a fault in it leaves the address as it was.

**Reason.** Risk R13; the promise of 0.2.5 that the remedy for the app's other built files would be chosen at the next release.

## 27 November 2026: The measure of a one-statement run, read by phase

**What the next deployment said** (commit 5bdb4d5, which carries steps 3 and 3b; all 16 checks passed at the trial address and at the address). In Chromium at the trial address the first ⌘↵ on a statement again took 2.97 s from the key to done, 2.94 s of it before the run began. Of that, by the app's own notes: waiting for the engine 0 ms, the engine's check 23 ms, what the statement needs 11 ms. The key pressed a second time: 40 ms in all. At the address, the same build, minutes later, in the same browser: 32 ms for the first press. In WebKit: 28 and 39 ms.

**What that settles.** The engine and the worker are not slow: their part of the wait is 34 ms on that machine. The wait is paid once, not at every statement. And it is not always there on that machine: twice of twice at step 3, once of twice here. The time passes between the key and the moment the app's own code is run for it, which means the page itself was busy with something else on GitHub's machine, in Chromium, shortly after the first run of a script that draws figures.

**What is not known.** What the page was busy with. The measure now also reports the stretches for which the browser says the page could answer no key (Chromium's long tasks), so a later deployment that shows the wait will say whether it was one such stretch and how long. No reader's machine has shown it: at the address from this Mac, 18 to 32 ms, in both browsers, with the browser at full speed and held to low priority (about 200 ms).

**What is done.** Nothing in the app. It stays an open matter of this release, read at each deployment, and is said in the notes if it is still unexplained at the release.

**The first start, on the same deployments.** 0.59 s and 1.20 s at the trial address, 0.81 s and 1.57 s at the address (Chromium, WebKit), against 1.70 s and 1.97 s at the deployment before for the same engine. So the first start moves by a factor of two from one run of GitHub's machine to the next, and the figures of step 3 were a slow run, not a slower engine.

**Reason.** A measure is read until it is understood or shown to be the machine's; here it is shown to be neither the engine's nor the worker's, and the rest is still to be seen.

## 27 November 2026: The release's methods in the app (release 0.3, step 5; #112)

**Decision.** Nothing is built for the methods of Zeff 0.9.0: the engine gives each its print, its type, its page and its plot, and the app shows them as it shows every other function's. The step is the tests that hold this through the screens, and the pictures made again.

**Held by tests, in both browsers.**

1. _A script of the methods_ (`tests/scripts/binary.zeff`, eleven lines: a logit with `glm`, the same read as odds ratios, a marginal effect, the classification table, the ROC curve drawn, and a fit the engine refuses for separation) is shown in the page as the released `zeff run` of 0.9.0 prints and says it, to the byte, and checked as `zeff check` checks it; its kept output was made with the released command line.
2. _Zeff's own sample project of binary outcomes_ (`samples/binary`, 79 lines of script, 216 printed) reads in the page as `zeff run` prints it, beside the three samples held before.
3. _Through the screens_ (`tests/browser/binary.spec.ts`): each statement's note with the name it binds and the type the engine names (`lg`, `GlmFit`); the odds ratios, the marginal effect and the classification table in their blocks; the separated fit's error under its line (Z0803, with the engine's excerpt and advice), its code on the note, the statement after it not run, and **Explain** opening the code's page in place; the ROC curve drawn under its statement and standing in the Plots place, where it stays light in the dark theme as every figure does; the new names coloured as functions in both themes, `glm` completed after a dot, its usage shown as the call is opened, and F1 opening its page; in Help, `glm` found by Stata's `logit` after Zeff's own `logit` and `inv_logit`, its page read whole (its sections, the table of R and Stata), `curve` found by Stata's `lroc`, `margins` by its own name, and the package's page listing its three functions.

**The search, looked at as step 3 promised.** With 84 more pages carrying a table of R and Stata, more words of those tables are names the search knows (`by()`, `level()`, `predict`, `table()`). Typed, each gives Zeff's own names first and then the functions matched by a name of R or Stata, in a list of eight at most, as the search was built at 0.2.3 (`by`: six of Zeff's own, then `kruskal_test` and `t_test`; `predict`: `predict` and `margins`, then `influence`, `confusion` and `curve`). The suggestions are not crowded, and the rule is left as it is.

**A limit met, and placed.** A plot is drawn by a run of the script with the lines the interface adds after it, so where a later statement of the run fails, the plot of an earlier one is not drawn. The script of the tests ends in a fit that fails, so its ROC curve is tested in the same script without those lines. It is the limit the engine's handing-over of plots lifts, and step 7's text in the checklist now names it beside the plot of a name bound twice.

**The pictures.** All thirteen are made again from the running app: they show Zeff 0.9.0, its 266 functions, 11 packages and 148 codes, and the package `glm` on Help's Home; the picture of the search shows three functions for `lm` where it showed two. Its description in the page **Finding help** says so now: one sentence changed, "a list of three functions, reg, anova and posthoc", for the owner to read with the others.

**Reason.** The row of 0.3: the preview gains the release's methods through the engine. What the app adds is the proof that it shows them truly.

## 27 November 2026: Step 6 split in four; a statement's result as the engine gives it (release 0.3, step 6a; #175, C5)

**The split.** Step 6 of the checklist ("what the editor asked of the engine, taken from the engine") covered four stand-ins that share nothing but their reason: each statement's facts, a print made again at another width, a script's sections, an error's chain of calls. They are steps 6a to 6d, each a commit of its own.

**What the worker did until now (6a).** After each run it checked the script again and read, from the checked program, the name each `let` binds and the type the check gives it; and it matched the frames the run kept to the statements that bound them by their order. A fit's or a test's observations it could not say.

**What it does now.** It takes the engine's own facts of each statement (`zeff_engine::statements::statement_facts`, new in Zeff 0.9.0 for this purpose, C5), exactly as the engine's own host for the browser takes them: the name a statement binds; the type of what it made, as `type_of` names it; the rows and columns of a frame or a table; the length of a column or a list; the observations a fit or a test used; and, where the statement stopped the run, the engine's record of the error with its chain as fields (which step 6d reads). The worker's own reading of the checked program (`made`) is removed. The outcome of a run gains `rows`, `columns`, `length`, `n` and `error` for each statement, and keeps every field it had.

**What changes on the screen.**

1. _The note of a fit or a test bound to a name carries its N_: `m3 RegFit · N 15,366`, as section 5 of the Zemp Specification writes a note, which the app could not until the engine gave the number. A table bound to a name carries its rows and columns, as a frame does. (The record of the plan said no screen would change by these steps but one limit lifted: that was wrong for this one, and the specification is the authority.)
2. _A statement that gives nothing has no type._ The worker wrote `Nothing` for `print(...)`, from the check; the engine names the type of a result, and such a statement has none. No note showed the word, so nothing is seen of it.
3. _A statement that did not run has no type beside its name._ The type was the check's forecast; the engine's facts are of what ran. Its note says "not run", as before.
4. _The type is the type of the value made_, not the check's forecast of it. They agree wherever both exist; a value an `attempt` kept as a failure is named as what it is.

**Not shown.** The length of a column or a list bound to a name: the specification's notes show a frame's size and a fit's N and no other, so the length is carried and not written. It is the owner's to add.

**The words.** One sentence of **The notes** (Using Zemp Lite) now says that a fit or a test carries the observations it used, with the example `m3 RegFit · N 15,366`, held to the screen by a scene of its own (a run with its outputs folded, where the whole script's notes are on the page). The pictures that show notes are made again.

**Tests.** Rust (the facts of the example's nine statements: a frame's rows and columns, a table's, a fit's N, which is the N its print gives; of the script of binary models: a `GlmFit` and three results of tests with N 18,390, a table of 4 by 6, the statement that stops the run with the engine's record of the error, code Z0803, and the statement after it not run). Unit (a note for a frame, a fit, a test, a table, a column and a number; the test that every word of a note is one the engine returned now also holds a fit's N to the engine's number). Browser, both engines (the Scratch project's notes with `m3 RegFit · N 15,366`; the binary script's `lg GlmFit · N 18,390`).

**Reason.** Open decision #175, C5: the app says beside a statement what the engine says of its result, and counts nothing itself.

## 27 November 2026: Step 4 tried at the host, and the measure read again

**The trial of step 4** (commit 21eb677). GitHub's check is green in both browsers. The build was sent to the trial address, where the check of the host found nothing lacking: 45 answers with the isolation headers, 19 files, 19 answered "not modified" when asked again, **the three addresses under `assets/` that hold no file answered as no file and not to be kept**, and the engine sent packed as the build packed it (3,069,496 bytes of 15,871,958); and all 16 checks in the two browsers passed. It was then sent to the address, where the same held at `zemp-lite.pages.dev` and at `lite.zeff-lang.dev`. The risk R13 is closed for every built file at the address. First start with the function over every built file: 0.93 s and 2.03 s at the trial address, 1.68 s and 1.91 s at the address (Chromium, WebKit): within what the same machines showed before it (0.59 to 1.70 s and 1.20 to 2.25 s on this engine), so the function costs nothing that can be seen in the start.

**The wait before a one-statement run, a third reading.** Seen again once, in Chromium at the trial address: 3.03 s before the run began; the engine's check and what the statement needs took 12 ms of it; the browser's long tasks in that time add to 0.29 s (102, 58, 82 and 52 ms), so the page was not busy either; pressed again, 37 ms. At the address, 48 ms and 18 ms. So the app is waiting, not working. Between the key and the engine's check it waits for two things: the engine to end what it was doing (measured, 0 ms) and the browser's storage to take what waits to be written (not measured until now). The app now notes that wait too. If it is the storage, it is the test machine's disk under a file being written, and what a reader would see of it is a first statement that starts late once after a run; the next deployment says.

**Reason.** The checklist's "done when" of step 4: the checks pass at the trial address and at both addresses.

## 27 November 2026: A print made again at another width, without a run (release 0.3, step 6b; #175, C6)

**What the app did until now.** When the place an output is unfolded in changed its width, the app ran the script again at the new width, relying on the engine giving the same results. So did **Copy as text** where the place was not 118 characters wide. A window dragged narrower ran the whole script once more.

**What it does now.** The worker runs a script with the engine's `run_script_showing` (new in Zeff 0.9.0), which gives back, for each statement, the values it printed and their places in what it printed. The worker keeps them, and a new message, `printedAt`, answers with each statement's print made again at any width by the engine's own `printed_at`: what `zeff run --width` prints, character for character, with nothing run. The workspace asks for it when the width changes and for **Copy as text**.

**Where the script is still run again, as before.** The engine holds the prints of its last run only. So the app runs again, exactly as it did, where they are not the page's: after a run of some statements alone (the page then holds results of two runs of the engine's); after a line of the console; and where the engine's worker was started afresh. The worker answers "none" unless its last run was of the same script and of the same text, or of that text with lines after it (the run the interface makes of a script to draw its figures, whose statements stand on the same lines); and the workspace takes the prints only where every statement the page shows is among them. Too many runs is safe; a print that is not the page's would not be.

**Not changed.** A figure is still redrawn by a run when its place changes size: that is step 7.

**Tests.** Rust: after one run of the example, its statements' prints at 40 and at 80 characters, put together, are what the released `zeff run --width` printed at each (`tests/scripts/widths/`); at the run's own width they are what the run printed; no event of a run is told for any of them; the same script with a line after it; another text, another script, a run of two statements alone and a project in which nothing ran give none; under 40 characters it is refused in words. Under Node: the same through the worker's messages. Browser, both engines: every run asked of the engine is counted by its message to the worker; a script that prints a wide frame is run once, the window is made narrower (the tables wrap, the run keeps its number), **Copy as text** gives the print at 118, the window is made wide again (the prints are what they were, to the character), and the count is still one; then, after a statement run alone, a narrower window does run the script again, and the prints fit.

**Reason.** Open decision #175, C6: what a statement printed is laid out again by the engine that printed it, and a reader who drags a window does not wait for a script to run.

## 27 November 2026: The sections of a script from the engine (release 0.3, step 6c; #178)

**What the app did until now.** It read the sections of a script from its comments itself (`sectionsOf` in `src/editor/sections.ts`, Zemp Lite 0.2.1, step 3), with the engine's reading of the statements to tell a heading from a line of that look inside a statement. The record of 0.2.1 said the reader would be replaced when the engine reported sections, at Zeff 0.9.0.

**What it does now.** The worker gives the sections with the statements of a text, by the engine's own `sections_of` (the function from which the engine's language server reports the outline of a document as `textDocument/documentSymbol`): for each, the line of its heading, its last line, its level and its title. The workspace keeps them with the statements, and the Outline pane, **Run section** and the section the cursor is in read them. The reader is removed, with its tests; which section a line is in (`sectionAt`) is still the interface's.

**Why with the statements, and not by a question to the language server.** The outline must be of the text as it stands, and the app already asks the engine for the statements of the text a moment after each key, for the marks of what is stale. The sections ride on that one question, so the outline and the statements are never of two different texts; a second question, to the language server, which is told the text on a timer of its own, could be. They are the same reading either way: one function of the engine.

**Between a key and the engine's answer** (about a tenth of a second) the outline shows the sections of the text as it was last read, where the reader, which was the interface's own, answered at once. The outline does not empty and fill at each letter.

**One case the engine reads otherwise, and rightly.** A heading set in from the margin, between two statements (`  // # Title`): the reader passed it over, taking any indent for the inside of a block; the engine knows where each statement begins and ends, and counts a heading wherever it stands between two. Every other case the reader's tests held, the engine answers the same: the headings of a script with their lines, levels, titles and last lines; none in a script without headings or in an empty one; the spaces round the marks; the title as written; no title, no space after the mark, three marks, a comment after code, no comment, a line of help text and the mark at the end are not headings; a heading-like line inside a statement that runs over several lines is a comment; a subsection ends at the next heading of any level and a section at the next section.

**Tests.** Rust: all of those cases, on the engine's reading, and the one case said above; the line of JSON with the statements. Unit: which section a line is in, on sections as the engine gives them (the six tests of the reader are gone with it, each case now held in the worker's test). Browser, both engines: the Outline pane's tests as they were, but for one line of one test's script, which was the indented heading and is now another line that is no heading.

**The page of Using Zemp Lite** (**Sections and the Outline**) says nothing of the margin or of an indent, so no word of it changes.

**Folding.** The engine also says where a text folds, a section among the places (`folds_of`). The app's editor folds outputs, not code, so nothing reads it yet; it is there for when code folds.

**Reason.** Open decision #178, and the promise of 0.2.1: the sections are the engine's to read, and the app no longer reads Zeff's comments itself.

## 27 November 2026: An error's chain of calls from the engine's fields (release 0.3, step 6d; #175, C22)

**What the app did until now.** It read the trail of an error (open decision #183) out of the engine's printed message, line by line: the place after `-->`, and each line that begins `= in:` for a call and where it was called. The message does not say which pass of a loop an error was raised in, so the trail could not either; its own comment said so.

**What it does now.** The outcome of a run carries, for the statement that stopped it, the engine's own record of the error (step 6a), with its chain as fields: for each call the function, what each argument was given, and the file, line and column it was called at; and for a loop the pass, of how many, the loop's variable and what it held. The trail is read from that record: from the script's line down to the line that raised the error. The reading of the printed message is removed.

**A pass of a loop is a link of the trail**, written `pass 3 of 3: k = 0`: the number of the pass and of the passes, the variable and its value, each the engine's field; the three small words between them are the app's. A loop that does not know how many passes it has says the pass alone. Its link leads to the loop's line, as a call's leads to the call's.

**What is the same.** For the kept script of the trail (`tests/scripts/trail.zeff`) the trail is, link for link, the one read from the message until now, and each call is written exactly as the engine's message writes it (`returns(data: a frame of 0 rows × 11 variables)`); this is held on the engine itself. The trail stands under the error, each link a way to its line; the lines it names have their notes.

**One difference in time.** The record comes with the outcome of the run, which is when the run has stopped; the message was told a moment earlier, as the statement failed. So the trail appears as the run ends, with the notes, and not a moment before it. Nothing is seen of the difference: an error stops the run.

**Tests.** Unit (the trail of a record of two calls; of a call inside a pass of a loop; a loop of unknown length and one with no variable; no chain, no record and a record that is not one give no trail). Unit on the engine, under Node (the kept script's error has the trail it had, and what the run said is the kept message; a function called in the third pass of a loop over three numbers gives `pass 3 of 3: k = 0`, the call and the error, and the printed message has no word of the pass; an error raised at the script's own line has no trail). Browser, both engines (the kept script's trail as before; the loop's trail of three links, the pass first, its link putting the cursor on the loop's line, with nothing run again).

**Reason.** Open decision #175, C22, and #183: the trail is the engine's own account of how an error came about, read as the engine gives it and not out of its print.

## 27 November 2026: The wait before a one-statement run, read a fourth time and set down

**The deployment of steps 5 to 6b** (commit c2c9be4): GitHub's check green; all 16 checks at the trial address and at the address. First start 0.52 s and 1.16 s at the trial address, 0.74 s and 1.59 s at the address (Chromium, WebKit).

**The wait, with every part of it now measured.** At the trial address, in Chromium: 2.99 s between the key and the start of the run. Of it, by the app's own notes: waiting for the engine 0 ms, for the browser's storage 0 ms, the engine's check 13 ms, what the statement needs 5 ms. The page itself was busy for 61 ms. Pressed again: 32 ms in all. At the address, the same build, a minute later: 15 ms before the run, 34 ms in all. In WebKit: 7 and 9 ms.

**What four deployments show together.**

| Deployment | Trial address, Chromium | Address, Chromium | WebKit, either |
| --- | ---: | ---: | ---: |
| step 3 (0b58c22) | 3.56 s | 3.41 s | 10 to 14 ms |
| steps 3 and 3b (5bdb4d5) | 2.94 s | 12 ms | 8 to 9 ms |
| step 4 (21eb677) | 3.03 s | 48 ms | 13 to 18 ms |
| steps 5 to 6b (c2c9be4) | 2.99 s | 15 ms | 7 to 9 ms |

The wait is there at the trial address every time and at the address once in four; the trial address is the first the checks are made at, on a machine GitHub has only just prepared, with the browser only just installed. It is about three seconds each time, whatever the app waits for, which is 12 to 34 ms. It is paid once: the second press is always tens of milliseconds. It is never in WebKit, and never on this Mac, at the same addresses, with the browser at full speed or held back.

**Conclusion.** It is the first session of the test machine's Chromium, not the app, the engine or the host: nothing the app does takes the time, the page is not busy, and the same build at the address a minute later does not wait. What that browser is doing in those three seconds is not known and is not looked for further. The measure stays as it is, with its parts, so that a wait that did belong to the app would show in one of them; and the figure at the trial address in Chromium is read with this in mind. It is not listed as a known issue of the release.

**Not concluded from it.** That the measure at the address before 0.3 never showed it (9 to 94 ms on 0.8.0, at both addresses): that was four readings on two deployments, and the wait has since been absent at the address three times in four. It is not evidence that the new engine brought it.

**Reason.** A measure is read until it is understood or shown to be the machine's. Here it is shown not to be the app's by measuring every part of the app's wait, which is as far as can be seen from outside that machine.

## 27 November 2026: The worker keeps a run's plots and lays one out at a size (release 0.3, step 7a; #197)

**The split.** Step 7 is two steps: the worker's half (7a), which is whole and proven by itself and changes no screen, and the screens' half (7b), which replaces how every figure is drawn. The first is committed green before the second is begun.

**What the app does today.** A plot leaves the engine only as a file `export` writes. So to draw a figure the interface runs the script again with an `export` added after it, at the size of the figure's place, and reads the file (the record of 15 November 2026). A window made narrower runs the script once more for its figures. Two limits follow from adding lines after the script: the plot of a name bound again further down is not drawn, since the name then holds another value; and no plot of a run is drawn where a later statement fails, since the lines added are never reached.

**What the worker does now.** `run_script_showing` gives back the plots the statements of a run made, each with the line of its statement and the name that binds it. The worker keeps them, lists them in the run's outcome (line, name, kind, theme, as the engine's own host for the browser lists them), and answers a new message, `plotSvg`, with the plot of a statement laid out on a page of a size by the engine's `svg_at`: the same layout and the same writer as `export`.

**The size is given in millimetres**, as the interface already reckons a place (a pixel is 1/96 of an inch, to a hundredth of a millimetre), and becomes points in the worker exactly as `export` makes them (72 to the inch of 25.4, multiplied before divided). So a figure on the screen is, byte for byte, the file `export(…, size: [width, height])` writes for the same plot, and the statement the plot viewer shows for it is true of what is seen. This is held to the two figures kept from the released `zeff run`.

**Not held.** As for the prints (step 6b): the engine holds the plots of its last run, and gives one only where that run was of the text asked about. Where the statement gave no plot of its own (`print(p)` prints a plot's summary and gives nothing), it is not held either, and the interface draws it as before.

**The kind in the engine's list is the mark a layer is drawn with** (`bars`, `ribbon, points, lines`), where a plot's print names the layer (`histogram`, `fit band, points, fit line`). The interface shows the print's words, as it does now, and does not show the list's.

**Tests.** Rust: the outcome's list for the example (four plots: two bound, and the two statements that are those names alone); each laid out at the size `export` was given is the kept file, byte for byte; another size is another figure; nothing is told of a run; a page of 8 by 6 mm gives the engine's words and says the size is at fault; a statement that made no plot, another text and a project in which nothing ran are not held. The two limits: in a script that binds `p` to a plot, then to another, then makes a third, then fails, each of the three is held as its own statement's, and each is what `export` writes for that plot in a script of its own; the statement after the failure made nothing. Under Node: the same through the worker's messages.

**Reason.** Open decision #197: the engine hands the plots of a run to the interface, and a figure is laid out, not run for.

## 27 November 2026: The screens draw from the plots the engine kept (release 0.3, step 7b; #197)

**What changed.** A figure under its statement, in the Plots place, in a comparison and in a window of its own is laid out by the engine from the plot its run kept, at the size of its place. Nothing is run for it, and nothing is run when a place changes its size. The Plots place says so under the figure: `laid out by the engine in 3 ms`, where it said `drawn by a run of the script in …`.

**The two limits are lifted.** A name bound to a plot and bound again further down: each statement's plot is drawn, its own. A run that fails at a later statement: the plots made before it are drawn.

**Where the engine's last run was not the page's** (a line of the console after the script was edited, a plot saved as a file, a worker started afresh), the text of the page's run is run again once, with nothing told, and the engine is asked again; the place then says `drawn by a run of the script in …`. The worker's answer says which of two things "not held" is (`ran`): the last run was of another text, where a run brings the plot; or it was of this text and the statement gave no plot of its own (a list of plots, say), where the figure is drawn as it was, by a run with an `export`.

**After a statement run alone** the page shows results of more than one run of the engine's, which holds the plots of the last only. The figures are then drawn as before, by a run with an `export` after the script, and with the limits as before (a name bound again is left out). The next whole run puts it right.

**Save… stays a run with an `export`**, which is what writes PDF and PNG. Its `export` is now written straight after the plot's own statement, not after the script: there the name still holds that plot, and the file is written before anything further down can fail. So a saved file is the plot seen, in both cases the limits covered.

**A fault found by the new test, and mended.** The Plots place knew a plot by the text of its statement. Two plots of one run with the same text (a name bound twice; a name printed twice, which was there before this step) broke its list. Each plot now has an identity of its own: its text, and for a second of the same text the text with ` · 2` after it. Views kept by a browser from before are read as they were.

**Not done, and why.** The engine's list of the plots of a run (step 7a) is not what decides which statements are plots: the page still reads the engine's facts of each statement (a print that begins `plot ·`, or a value named `Plot` that printed nothing), which say the same and are there after a statement run alone too.

**Tests.** Unit: the plots of a run with a name bound twice, each with its identity; the same on a page of more than one run; the size in millimetres; the `export` written after the plot's statement. Browser, both engines: a window made narrower in four steps with one run asked of the engine in all; a name bound twice drawn at each statement, listed twice in Plots, saved as its own, then laid out again after the save by one run and after that by none; a plot drawn above a fit that fails (and the ROC curve of the binary script, which now runs whole with its failing fit); after a statement run alone, drawn by a run; the kept figures of the example and of the showcase's 21 plots as before. The worker's tests hold `ran`.

**Reason.** Open decision #197 and the Zemp Specification, section 7 ("the engine returns a resolution-independent scene, and the viewer redraws it to the exact size of its pane"): a figure is laid out, not run for.

## 27 November 2026: A session of its own for an example of Help (release 0.3, step 8; #211, item 11)

**What the worker does now.** A new message, `example`, runs a text in a session that is not the reader's, and needs no project to be open. The session is a project of its own in the worker's memory, made afresh for each example, so nothing is left from one to the next. It tells its steps as a run does (each marked as an example's), and gives its outcome with the plots its statements made; `examplePlot` lays one of them out at a size, as for a run.

**The session is the engine's own project for the examples of its pages** (`zeff_engine::examples`): called `examples`, with the three small files the pages read (`data/wages.csv`, `data/staff.csv`, `data/wages_de.csv`), the datasets the engine ships, and the pages' clock (1 November 2026, 09:30), and the text is run as `examples.zeff`, the name the pages' own diagnostics show. So an example prints here what its page says, which step 10 holds page by page. The engine runs the examples of one page as one script, in order, because a later example uses what an earlier one bound; step 9 follows it.

**Nothing of the reader's project is seen or changed.** The session has its own store: a file of the reader's at the same path is not read, a name of the reader's script is no name, a frame of the reader's run is not there; what an example writes stays in the session and is gone with it; and the reader's kept prints, plot, frame and file are byte for byte as they were afterwards.

**The order of work (`src/engine/examples.ts`).** One example runs at a time, in the order asked. An example waits behind a run of the reader's. Where the reader begins a run while an example is going, the example is stopped before its next step and run again, from its start, when the run has ended: the reader never waits for Help. The examples of a page that is left are dropped: those that wait are never run and the one running is stopped.

**The time.** An example may run ten seconds (`EXAMPLE_LIMIT`); beyond that it is stopped before its next step and told as too slow. The worker's own script keeps the time, so it holds where the page shares no memory with the worker. Stopping at once (the reader's run, a page left) is asked through a flag of the example's own, apart from the run's; where the browser gives no shared memory, the example runs on to its end or its limit, and a reader's run waits that long at most. As with a run, the engine reads the flag between steps, not inside one long statement.

**Tests.** Rust: a reader's project whose file, names and frame would clash; the session's file, datasets and clock; a name of the reader's refused, in a diagnostic of `examples.zeff`; a file written in the session and not in the project; a plot laid out; the reader's prints, plot, frame and file unchanged; a seeded draw the same twice, each in a session made afresh. Worker under Node: the same through the messages, with no project open; every event marked; an example beyond its time stopped as slow, one stopped by its flag (the reader's flag untouched), and the worker usable afterwards for an example and for a run. Unit: the engine's calls and the routing of events; the queue (order, behind the reader's run, run again after an interruption, dropped by page, all dropped, too slow, a worker ended).

**Reason.** Open decision #211, item 11, and finding 5 of the plan: an example must run in the page without touching the reader's work.

## 27 November 2026: Run under every example of Help (release 0.3, step 9; #211, item 11)

**What a reader meets.** Every example of a function's page is a block of its own: its line of comment, its statements in the editor's colours, **Run** and **Reset** with one line beside them, and under them what the engine printed and said, each plot drawn by the engine. The statements can be changed where they stand; **Run** (or ⌘↵ in them) runs them, **Reset** puts the page's own back and runs them. The code of a warning or an error (`warning[W0201]`) opens its page. As a page opens its examples are run, and until an example's own output arrives the page's kept text stands under it, so nothing jumps: the output that arrives is the same text. The existing tests that hold a page word for word to the engine's print now read the page after its examples have run, so they hold the live output to the print as well.

**How an example is run.** As the engine runs the examples of its own pages: those of a page's EXAMPLES are one script, in order, because a later one uses what an earlier one bound and a warning names its line of that script. So **Run** on an example runs it with those above it, as they stand, and shows each of them afresh; the examples under it are left as they were. An example that stands elsewhere on a page (the wrong call of _A common mistake_) is run after all the page's examples, as the engine runs it. One script for the examples and one for each such call go to the engine as a page opens.

**A diagnostic is shown as the engine's pages show one**: without its source excerpt, which would name the examples' script and a line of it that the page does not show, and with its `= help:` line two spaces in. This is the engine's own rule for its pages (`is_source_excerpt`, `help_line`), followed here. An error the check finds before anything runs is put under the example whose line it points at.

**An explained code's example is an illustration, and is not run as its page opens.** Measured over the 148 codes of Zeff 0.9.0, each example run as it stands: 21 print what their page says. With the shipped datasets bound by their names, 26 print it, 33 print it and more, and 89 print something else: they name a frame, a variable or a fit the page does not make, stand for a longer text with `...`, or the engine's words have moved since the page was written. The engine does not hold these examples to itself as it holds a function's. To run them on opening would put another message under the page that explains this one. So the page's text stands, the line beside the buttons says `the page's illustration · not run`, and **Run** runs the statements as they stand, for a reader who completes them. Step 10 lists them. For the coordinating session: the examples of the explained codes are not held to the engine in Zeff.

**Plots.** Laid out by the engine at the width of the page, to 620 pixels at most and 0.62 as high, on white in both themes. Where the page is made wider or narrower they are laid out again, once the change has stopped, by a run of the examples as they last ran (not as they may have been edited since): a session holds the plots of its last run only.

**Names for a reader who does not see the page.** The buttons are named _Run the example_ and _Reset the example_, apart from the top bar's **Run**, which runs the script; the line beside them is announced politely and is not the app's one status line.

**Words of the app's own, the owner's to change:** `waiting to run`, `running…`, `run by the engine in 12 ms`, `edited · not run`, `stopped: the examples ran for more than 10 seconds`, `not run: the engine stopped at an error in another example`, `the page's illustration · not run`. They are marked apart in the page; every other word is the engine's.

**Not there.** The engine prints no page of the language itself at 0.9.0, so there is none in Help to carry a **Run**. **Copy to script** is step 10.

**Tests.** Unit: the examples of a block read apart (comment, statements, kept output; no empty line between two; a common mistake); the script and its lines; what each example got from a run (a plot after its statement, a diagnostic without its excerpt, a check error under the example it points at); an example's states (kept, waiting, running, ran, edited, reset, too slow, not reached, the engine not there); a code in a line of output; the queue asking a session for its plots before the next example. Browser, both engines: a page opened and its examples run, by the count of what went to the engine, with no run of the reader's; an example changed, run, run by ⌘↵ and reset; an error, its code opening its page, the example under it saying it was not run; two plots drawn, light in the dark theme, laid out again narrower at their own size; the reader's script, prints and figure untouched, the reader's run not kept waiting by a slow example, and the engine still holding the reader's run; a code's illustration not run until **Run**; an example stopped after ten seconds; the keyboard and 12.5 pixels.

**Reason.** Open decision #211, item 11, as the row of 0.3 has it (option A: an example runs by itself when its page opens).
