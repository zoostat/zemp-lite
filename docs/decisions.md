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
