/// <reference types="vite/client" />
// The pictures of Using Zemp Lite (release 0.2.3, step 8b): each a file of the app, named as
// its page names it, made from the running app by `npm run pictures`. The app's first load
// carries where each picture is, and none of the pictures: a picture is fetched when the
// page that shows it is opened.

/** The size every picture is taken at, in pixels: a page keeps its place while one arrives. */
export const PICTURE = { width: 1200, height: 750 } as const;

const PICTURES = import.meta.glob<string>("./pictures/*.webp", {
  query: "?url",
  import: "default",
  eager: true,
});

/** Where a picture is, by its name, or none where there is no such picture. */
export const pictureOf = (name: string): string | null =>
  PICTURES[`./pictures/${name}.webp`] ?? null;

/** The names of the pictures there are, for the test that holds the pages to them. */
export const pictureNames = (): string[] =>
  Object.keys(PICTURES)
    .map((path) => path.replace(/^\.\/pictures\/(.+)\.webp$/, "$1"))
    .sort();
