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
    slug: "finding-help",
    title: "Finding help",
    line: "Search by a name you know, browse the functions by package, or press F1 on a name in the script.",
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
