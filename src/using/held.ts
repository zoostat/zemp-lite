// How each piece of code in the pages of Using Zemp Lite is held to the engine and to the app
// (release 0.2.3, step 9d; open decision #211, item 12, the owner's standing rule of 24
// November 2026): at every release the pages Zemp keeps agree with the engine the release
// carries, checked at the build. A page gives code between backticks. Every such piece is
// held in one of the ways below, and the tests go through every page: a piece that is held in
// no way fails the build, so nothing can be written into a page that no test reads.
//
// A piece that is a name of the engine's (a function, a package, a dataset, a code) needs no
// entry here: it is looked for in the engine's own index. The others are listed, by page.

/** How a piece of code is held. */
export type Held =
  /** Typed in the search field of Help: it finds this function, on the engine's own index. */
  | { by: "search"; finds: string }
  /** A command of ⌘K, by its name, or by the words its name begins with. */
  | { by: "command" }
  /** Quoted from the screen: in this scene of the app it is there to be read (the browser's test). */
  | { by: "screen"; scene: Scene }
  /** A word of the command line or of a project's files, which the app has no screen to show. */
  | { by: "word"; why: string };

/** The scenes of the app a page quotes from; the browser's test brings the app to each. */
export type Scene =
  | "a run"
  | "an edit after a run"
  | "a run that fails"
  | "a long run"
  | "the Project pane"
  | "the Outline pane"
  | "a subsection typed"
  | "the commands, with run typed"
  | "the Data place, kept to a condition"
  | "the Data place, kept to the missing";

const command: Held = { by: "command" };
const screen = (scene: Scene): Held => ({ by: "screen", scene });

/** Each page's pieces of code that are not names of the engine's, and how each is held. */
export const HELD: Record<string, Record<string, Held>> = {
  commands: Object.fromEntries(
    [
      "Run the script",
      "Check the script",
      "Run the statement at the cursor",
      "Run section",
      "Run to here",
      "Run from here",
      "Place: Data",
      "Open file:",
      "Help: index of functions",
      "Script: show Project",
      "Project: new script…",
      "Project: new folder…",
      "Project: add files…",
      "Project: export…",
      "Theme: dark",
      "Code text: larger",
      "Format the script",
      "Output: clear",
      "Report a problem",
    ].map((name) => [name, command]),
  ),
  "exporting-and-opening-a-project": {
    "Project: export…": command,
    "zeff run": { by: "word", why: "the command line of Zeff, which the app does not run" },
  },
  "finding-help": {
    summ: { by: "search", finds: "summary" },
    regression: { by: "search", finds: "reg" },
    lm: { by: "search", finds: "reg" },
    reghdfe: { by: "search", finds: "reg" },
    "zeff help": { by: "word", why: "the command line of Zeff, which the app does not run" },
  },
  "getting-started": {
    "edited · not run": screen("an edit after a run"),
    stale: screen("an edit after a run"),
  },
  "projects-scripts-and-files": {
    "zeff.toml": screen("the Project pane"),
  },
  "reporting-a-problem": {
    "Report a problem": command,
  },
  "running-a-script": {
    "not run": screen("a run that fails"),
    run: screen("the commands, with run typed"),
  },
  "sections-and-the-outline": {
    "// # Describe": screen("the Outline pane"),
    "// ## By group": screen("a subsection typed"),
  },
  "the-data-place": {
    NA: screen("the Data place, kept to the missing"),
    "year == 2012": screen("the Data place, kept to a condition"),
  },
  "the-notes": {
    "wages Frame · 15,571 × 13": screen("a run"),
    "edited · not run": screen("an edit after a run"),
    stale: screen("an edit after a run"),
    "not run": screen("a run that fails"),
    failed: screen("a run that fails"),
    "running…": screen("a long run"),
    waiting: screen("a long run"),
  },
  "where-the-work-is-kept": {
    saved: screen("a run"),
  },
};
