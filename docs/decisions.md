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
