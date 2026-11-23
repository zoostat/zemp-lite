/// <reference types="vite/client" />
// The pages of Using Zemp Lite (release 0.2.3, step 8a; open decision #211, item 9): which
// there are, in their order, each with its title and its one line, for the Topics pane, the
// trail and the search; and the text of a page, fetched when the page is opened, so that the
// first load of the app carries the list and not the pages. A test holds each entry here to
// the title and the one line its own file begins with.

/** A page of Using Zemp Lite: the name of its file, its title, and what it is for in one line. */
export interface UsingPage {
  slug: string;
  title: string;
  line: string;
}

/** What the pages are called together, in the Topics pane and the trail. */
export const USING_TITLE = "Using Zemp Lite";

/** The pages there are, in the order they are read. */
export const USING: UsingPage[] = [
  {
    slug: "getting-started",
    title: "Getting started",
    line: "Open the Scratch project, run a script, and read what each statement made.",
  },
  {
    slug: "projects-scripts-and-files",
    title: "Projects, scripts and files",
    line: "A project is a folder of scripts and data kept in this browser: make one, fill it, and take it out as a zip.",
  },
  {
    slug: "running-a-script",
    title: "Running a script",
    line: "Run the whole script, one statement, or a part of it, and see how the run went.",
  },
  {
    slug: "the-notes",
    title: "The notes beside each statement",
    line: "Beside each statement a note says what it made; press one to see what the statement printed.",
  },
  {
    slug: "sections-and-the-outline",
    title: "Sections and the outline",
    line: "A comment that begins with a hash makes a section; the Outline pane lists them, goes to them and runs them.",
  },
  {
    slug: "the-data-place",
    title: "The Data place",
    line: "Look at the frames a run made: sort them, keep some rows, search them, and read about each variable.",
  },
  {
    slug: "the-plots-place",
    title: "The Plots place",
    line: "See every plot of the last run, compare them side by side, and save one at the size a journal or a slide asks for.",
  },
  {
    slug: "finding-help",
    title: "Finding help",
    line: "Search by a name you know, browse the functions by package, or press F1 on a name in the script.",
  },
  {
    slug: "commands",
    title: "Commands with ⌘K",
    line: "Everything the window can do has a command: press ⌘K, type a word of it, and press Enter.",
  },
  {
    slug: "keyboard-shortcuts",
    title: "Keyboard shortcuts",
    line: "The keys the app answers to, place by place. On Windows and Linux, Ctrl takes the place of ⌘.",
  },
  {
    slug: "exporting-and-opening-a-project",
    title: "Exporting and opening a project",
    line: "A project leaves the browser as one zip, and comes back from one: to keep it safe, to move it, or to run it with Zeff on a computer.",
  },
  {
    slug: "where-the-work-is-kept",
    title: "Where the work is kept",
    line: "Your projects are kept in this browser, on this computer, and nowhere else; export what matters.",
  },
  {
    slug: "reporting-a-problem",
    title: "Reporting a problem",
    line: "When a script fails in a way that looks like a fault of Zeff, the app builds a report for you to read and save; nothing is sent.",
  },
];

/** A page by the name of its file, or none. */
export const usingPage = (slug: string): UsingPage | null =>
  USING.find((page) => page.slug === slug) ?? null;

/** The texts of the pages, each a file of its own, fetched when asked for. */
const TEXTS = import.meta.glob<string>("./pages/*.md", { query: "?raw", import: "default" });

/** The names of the files there are, for the test that holds the list to them. */
export const usingFiles = (): string[] =>
  Object.keys(TEXTS)
    .map((path) => path.replace(/^\.\/pages\/(.+)\.md$/, "$1"))
    .sort();

/** The text of a page, or none where there is no such page. */
export async function usingText(slug: string): Promise<string | null> {
  const load = TEXTS[`./pages/${slug}.md`];
  return load === undefined ? null : load();
}
