// The app's own pages in Help, Using Zemp Lite (release 0.2.3, step 8a; open decision #211,
// item 9): kept as text files of the app, set in the type of the engine's pages, and reached
// as every page is: from the Topics pane, from search, by the trail and by links.
import { readFileSync } from "node:fs";
import type { Locator, Page } from "@playwright/test";
import { expect, faintText, smallestText, test, useExample } from "./support";

const READY = "engine Zeff 0.8.0 ready";
const file = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

async function scratch(page: Page, press: (target: Locator) => Promise<void>) {
  await page.goto("/");
  await press(page.getByRole("button", { name: "Scratch project" }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await useExample(page);
  await press(
    page.getByRole("navigation", { name: "Places" }).getByRole("button", { name: "Help" }),
  );
  await expect(page.getByTestId("help-counts")).toBeVisible();
}

const bar = (page: Page) => page.getByRole("toolbar", { name: "Help: its panes and its controls" });
const topics = (page: Page) =>
  page
    .getByRole("complementary", { name: "Help: the left pane" })
    .getByRole("region", { name: "Topics" });
const trail = (page: Page) => bar(page).getByRole("navigation", { name: "Where this page stands" });
const field = (page: Page) => bar(page).getByRole("combobox", { name: /^Search Help/ });
const back = (page: Page) => bar(page).getByRole("button", { name: "Back" });
const title = (page: Page) => page.getByTestId("help-title");
const shown = (page: Page) => page.getByTestId("help-page");
const using = (page: Page) =>
  topics(page).getByRole("list", { name: "Using Zemp Lite", exact: true });
const reads = async (page: Page) =>
  (await trail(page).getByRole("listitem").allInnerTexts())
    .map((text) => text.replace(/\s+/g, " ").trim())
    .join(" ");

/** The pages there are, in the order they are read. */
const PAGES = [
  "Getting started",
  "Projects, scripts and files",
  "Running a script",
  "The notes beside each statement",
  "Sections and the outline",
  "The Data place",
  "The Plots place",
  "Finding help",
  "Commands with ⌘K",
  "Keyboard shortcuts",
  "Exporting and opening a project",
  "Where the work is kept",
  "Reporting a problem",
];

/** The words of a text, without the marks of the page's file, or its pictures' own words. */
const wordsOf = (text: string) =>
  text
    .replace(/^!\[.*$/gm, " ")
    .replace(/<\/?kbd>/g, " ")
    .replace(/\]\([^)]*\)/g, " ")
    .replace(/^\d+\. |^- |^#+ /gm, " ")
    .replace(/[*`[\]]/g, "")
    .split(/\s+/)
    .filter((word) => word !== "");

test("a page of Using Zemp Lite opens from Topics, set in type, every word its file's", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  // The section of Topics lists the pages there are, by their titles.
  await expect(
    topics(page)
      .getByRole("heading", { level: 3 })
      .getByRole("button", { name: /Using Zemp Lite/ }),
  ).toHaveText(new RegExp(`^▾\\s*Using Zemp Lite\\s*${PAGES.length}$`));
  await expect(using(page).getByRole("button")).toHaveText(PAGES);
  await press(using(page).getByRole("button", { name: "Getting started" }));
  await expect(title(page)).toHaveText("Getting started");
  await expect.poll(() => reads(page)).toBe("Using Zemp Lite › Getting started");

  // The title, the one line, the headings; a numbered list and a plain one.
  await expect(shown(page).getByRole("heading", { level: 3 })).toHaveText("Getting started");
  await expect(shown(page).locator(".does")).toHaveText(
    "Open the Scratch project, run a script, and read what each statement made.",
  );
  await expect(shown(page).getByRole("heading", { level: 4 })).toHaveText([
    "Run the example",
    "The four places",
    "Change something",
    "Where to go next",
  ]);
  await expect(shown(page).locator("ol > li")).toHaveCount(3);
  await expect(shown(page).locator("ul > li")).toHaveCount(4);
  // A control is named as the screen names it, a key is a key, and code is code.
  await expect(shown(page).locator("b.control")).toHaveText([
    "Scratch project",
    "Run",
    "Script",
    "Data",
    "Plots",
    "Help",
  ]);
  await expect(shown(page).locator("kbd")).toHaveText(["⌘⇧↵", "Ctrl ⇧ ↵"]);
  await expect(shown(page).locator("code")).toHaveText(["edited · not run", "stale"]);
  // Every letter of the page is its file's, in its order, and nothing more (the spaces apart,
  // which the marks of the file and the type of the page set differently).
  const seen = (await shown(page).innerText()).replace(/\s+/g, "");
  expect(seen).toBe(wordsOf(file("src/using/pages/getting-started.md")).join(""));
  // The page's sections stand in Topics, each going to its place; beside it, all the pages.
  await expect(
    page
      .getByRole("complementary", { name: "Help: the right pane" })
      .getByRole("list", { name: "On this page" })
      .getByRole("button"),
  ).toHaveText(["Run the example", "The four places", "Change something", "Where to go next"]);
  const beside = topics(page).getByRole("list", { name: "The pages of Using Zemp Lite" });
  await expect(beside.getByRole("button")).toHaveText(PAGES);
  await expect(beside.locator('[aria-current="page"]')).toHaveText("Getting started");
});

test("links go from one page to another and to the engine's pages, each into the history", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await press(using(page).getByRole("button", { name: "Getting started" }));
  await expect(title(page)).toHaveText("Getting started");
  // To another of these pages.
  await press(shown(page).getByRole("button", { name: "Finding help" }));
  await expect(title(page)).toHaveText("Finding help");
  await expect.poll(() => reads(page)).toBe("Using Zemp Lite › Finding help");
  await expect(shown(page).locator("kbd")).toHaveText([
    "/",
    "↓",
    "↑",
    "↵",
    "Esc",
    "F1",
    "⌘[",
    "⌘]",
  ]);
  // To a function's page, to a code's, and back to where one was.
  await press(shown(page).getByRole("button", { name: "t_test" }));
  await expect(title(page)).toHaveText("t_test");
  await expect.poll(() => reads(page)).toBe("Packages › stats › t_test");
  await press(back(page));
  await expect(title(page)).toHaveText("Finding help");
  await press(shown(page).getByRole("button", { name: "W0201" }));
  await expect(title(page)).toHaveText("W0201");
  await press(back(page));
  await press(shown(page).getByRole("button", { name: "Getting started" }));
  await expect(title(page)).toHaveText("Getting started");
  await press(shown(page).getByRole("button", { name: "reg", exact: true }));
  await expect(title(page)).toHaveText("reg");
  // Back through all of it.
  for (const name of ["Getting started", "Finding help", "Getting started"]) {
    await press(back(page));
    await expect(title(page)).toHaveText(name);
  }
});

test("the pages are found by search and by the trail, and listed on a page of their own", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  // By the title begun, and by a word of the one line.
  await field(page).fill("getting");
  const options = bar(page).getByRole("listbox", { name: "What was found" }).getByRole("option");
  await expect(options.first()).toHaveText(
    /^page\s*Getting started\s*Open the Scratch project, run a script, and read what each statement made\.\s*$/,
  );
  await field(page).fill("finding");
  await expect(options.first()).toHaveText(
    /^page\s*Finding help\s*Search by a name you know, browse/,
  );
  // A word of a one line finds the pages that have it.
  await field(page).fill("zip");
  await expect(options.first()).toHaveText(/^page\s*Exporting and opening a project/);
  await field(page).fill("finding");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(title(page)).toHaveText("Finding help");
  // The trail's step: the list of the pages, each with its one line; its row opens a page.
  await press(trail(page).getByRole("button", { name: "Using Zemp Lite" }));
  await expect(title(page)).toHaveText("Using Zemp Lite");
  await expect.poll(() => reads(page)).toBe("Using Zemp Lite");
  await expect(shown(page).getByRole("heading", { level: 3 })).toHaveText("Using Zemp Lite");
  await expect(
    shown(page).getByRole("list", { name: "Facts of Using Zemp Lite" }).getByRole("listitem"),
  ).toHaveText([`${PAGES.length} pages`, "on the app itself, in Zemp's own words"]);
  // Each page with its one line, in the order they are read.
  const rows = shown(page).getByRole("row");
  await expect(rows.getByRole("button")).toHaveText(PAGES);
  await expect(rows.first()).toHaveText(
    /^Getting started\s*Open the Scratch project, run a script/,
  );
  await expect(rows.last()).toHaveText(/^Reporting a problem\s*When a script fails/);
  await press(shown(page).getByRole("button", { name: "Getting started" }));
  await expect(title(page)).toHaveText("Getting started");
  await press(bar(page).getByRole("button", { name: "Home" }));
  await expect(shown(page).getByRole("heading", { level: 3 })).toHaveText("Help");
});

test("a page's text is fetched when the page is opened, not with the app", async ({
  page,
  press,
}) => {
  const fetched: string[] = [];
  page.on("request", (request) => fetched.push(new URL(request.url()).pathname));
  await scratch(page, press);
  // The app, Help and Home are on the screen, and no page's text has been asked for.
  const texts = () => fetched.filter((path) => /getting-started|finding-help/.test(path));
  expect(texts()).toEqual([]);
  await press(using(page).getByRole("button", { name: "Finding help" }));
  await expect(title(page)).toHaveText("Finding help");
  expect(texts()).toHaveLength(1);
  expect(texts()[0]).toMatch(/^\/assets\/finding-help-[\w-]+\.js$/);
  // Opened again, it is not fetched again.
  await press(back(page));
  await press(using(page).getByRole("button", { name: "Finding help" }));
  await expect(title(page)).toHaveText("Finding help");
  expect(texts()).toHaveLength(1);
});

test("a page's picture is fetched when the page is opened, with its words, and keeps its place", async ({
  page,
  press,
}) => {
  await page.setViewportSize({ width: 1200, height: 760 });
  const fetched: string[] = [];
  page.on("request", (request) => fetched.push(new URL(request.url()).pathname));
  await scratch(page, press);
  // With the app, Help and Home on the screen, no picture has been asked for.
  const pictures = () => fetched.filter((path) => path.endsWith(".webp"));
  expect(pictures()).toEqual([]);
  await press(using(page).getByRole("button", { name: "Getting started" }));
  await expect(title(page)).toHaveText("Getting started");
  const picture = shown(page).getByRole("img");
  await expect(picture).toHaveCount(1);
  // Its words, for a reader who cannot see it.
  await expect(picture).toHaveAttribute(
    "alt",
    /^The Script place after a run: the script with its line numbers, a note beside each statement/,
  );
  // Brought into view, it arrives: the picture as it was taken, 1,200 by 750.
  await picture.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      picture.evaluate((node: HTMLImageElement) => `${node.naturalWidth}×${node.naturalHeight}`),
    )
    .toBe("1200×750");
  expect(pictures()).toHaveLength(1);
  expect(pictures()[0]).toMatch(/^\/assets\/the-script-after-a-run-[\w-]+\.webp$/);
  // It keeps to the page: no wider than its column, its shape kept, and nothing pushed sideways.
  const fits = async () => {
    const at = await picture.evaluate((node) => {
      const box = node.getBoundingClientRect();
      const column = node.closest("article")!.getBoundingClientRect();
      const pane = node.closest(".page")!;
      return {
        wide: box.width,
        shape: box.width / box.height,
        column: column.width,
        sideways: pane.scrollWidth - pane.clientWidth,
      };
    });
    expect(at.wide).toBeGreaterThan(300);
    expect(at.wide).toBeLessThanOrEqual(at.column + 0.5);
    expect(at.shape).toBeCloseTo(1200 / 750, 1);
    expect(at.sideways).toBeLessThanOrEqual(0);
    return at.wide;
  };
  const beside = await fits();
  // With the panes closed there is more room, and the picture is never wider than it was taken.
  await press(bar(page).getByRole("button", { name: "Topics", exact: true }));
  await press(bar(page).getByRole("button", { name: "On this page", exact: true }));
  expect(await fits()).toBeGreaterThanOrEqual(beside);
  expect(await fits()).toBeLessThanOrEqual(1200);
  await page.setViewportSize({ width: 1000, height: 760 });
  await fits();
  // The other page's picture is its own, fetched when that page is opened.
  await page.setViewportSize({ width: 1200, height: 760 });
  await press(shown(page).getByRole("button", { name: "Finding help" }));
  await expect(title(page)).toHaveText("Finding help");
  await expect(shown(page).getByRole("img")).toHaveAttribute(
    "alt",
    /^The Help place with lm typed in its search field/,
  );
  await shown(page).getByRole("img").scrollIntoViewIfNeeded();
  await expect.poll(() => pictures().length).toBe(2);
  expect(pictures()[1]).toMatch(/^\/assets\/search-in-help-[\w-]+\.webp$/);
});

for (const theme of ["light", "dark"] as const) {
  test(`a page of the app's own keeps to the sizes and the contrast, and to its place, in the ${theme} theme`, async ({
    page,
    press,
    browserName,
  }) => {
    await page.setViewportSize({ width: 1200, height: 760 });
    await scratch(page, press);
    if (theme === "dark") await press(page.getByRole("switch", { name: "Dark" }));
    for (const name of PAGES) {
      if ((await topics(page).getByRole("button", { name: "All topics" }).count()) > 0) {
        await press(topics(page).getByRole("button", { name: "All topics" }));
      }
      await press(using(page).getByRole("button", { name }));
      await expect(title(page)).toHaveText(name);
      expect(await smallestText(page)).toBeGreaterThanOrEqual(12.5);
      expect(await faintText(shown(page))).toEqual([]);
      expect(await faintText(topics(page))).toEqual([]);
      // The picture is on the page in either theme, with its edge to set it off.
      const picture = shown(page).getByRole("img");
      await picture.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          picture.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth),
        )
        .toBe(1200);
      expect(await picture.evaluate((node) => getComputedStyle(node).borderTopWidth)).toBe("1px");
      const pane = page.getByTestId("help").locator(".page");
      expect(
        await pane.evaluate((node) => node.scrollWidth - node.clientWidth),
      ).toBeLessThanOrEqual(0);
    }
    // From the keyboard alone: a link of the page is a stop of the Tab key and answers to Enter.
    const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
    await press(
      topics(page)
        .getByRole("list", { name: "The pages of Using Zemp Lite" })
        .getByRole("button", { name: "Finding help" }),
    );
    await expect(title(page)).toHaveText("Finding help");
    await shown(page).getByRole("button", { name: "t_test" }).focus();
    await page.keyboard.press(tab);
    await expect(shown(page).getByRole("button", { name: "W0201" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(title(page)).toHaveText("W0201");
  });
}
