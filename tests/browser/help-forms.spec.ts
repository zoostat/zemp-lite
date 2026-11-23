// A name with two functions (release 0.2.3, step 9g; open decision #215, the owner's choice of
// 24 November 2026): each function has a page of its own, its title saying what it is called
// on ("histogram · of a frame", "histogram · of a plot"); the bare name, from the field's
// Enter or a link that does not say which, opens a short chooser of the two; search, Topics
// and a package's page list the two apart; F1 from the script opens the one the call would
// run; and On this page lists one page's sections only.
import type { Locator, Page } from "@playwright/test";
import { cursorTo, expect, faintText, smallestText, test, useExample, write } from "./support";

const READY = "engine Zeff 0.8.0 ready";

async function scratch(page: Page, press: (target: Locator) => Promise<void>) {
  await page.goto("/");
  await press(page.getByRole("button", { name: "Scratch project" }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await useExample(page);
}

/** Put the cursor at a column of a line of the script (both counted from 1). */
async function cursorAt(page: Page, line: number, column: number) {
  await cursorTo(page, line);
  for (let at = 1; at < column; at++) await page.keyboard.press("ArrowRight");
}

const places = (page: Page) => page.getByRole("navigation", { name: "Places" });
const bar = (page: Page) => page.getByRole("toolbar", { name: "Help: its panes and its controls" });
const trail = (page: Page) => bar(page).getByRole("navigation", { name: "Where this page stands" });
const step = (page: Page, name: string) => trail(page).getByRole("button", { name, exact: true });
const back = (page: Page) => bar(page).getByRole("button", { name: "Back" });
const forward = (page: Page) => bar(page).getByRole("button", { name: "Forward" });
const title = (page: Page) => page.getByTestId("help-title");
const shown = (page: Page) => page.getByTestId("help-page");
const field = (page: Page) => bar(page).getByRole("combobox", { name: /^Search Help/ });
const options = (page: Page) =>
  page.getByRole("listbox", { name: "What was found" }).getByRole("option");
const topics = (page: Page) =>
  page
    .getByRole("complementary", { name: "Help: the left pane" })
    .getByRole("region", { name: "Topics" });
const onThisPage = (page: Page) =>
  page
    .getByRole("complementary", { name: "Help: the right pane" })
    .getByRole("region", { name: "On this page" });
const sections = (page: Page) =>
  onThisPage(page).getByRole("list", { name: "On this page" }).getByRole("button");
/** The trail as it reads. */
const reads = async (page: Page) =>
  (await trail(page).getByRole("listitem").allInnerTexts())
    .map((one) => one.replace(/\s+/g, " ").trim())
    .join(" ");
/** A row of the chooser, or of a package's page: the function of a name called on something. */
const row = (page: Page, name: string, which: string) =>
  shown(page).getByRole("button", { name: `${name} · ${which}`, exact: true });

async function ask(page: Page, name: string) {
  await field(page).fill(name);
  await field(page).press("Enter");
  await expect(title(page)).toHaveText(name);
}

async function open(page: Page, press: (target: Locator) => Promise<void>) {
  await scratch(page, press);
  await press(places(page).getByRole("button", { name: "Help" }));
  await expect(page.getByTestId("help-counts")).toBeVisible();
}

/** The nine names of Zeff 0.8.0 with two functions, each by what its two are called on. */
const NAMES: [string, string, string][] = [
  ["append", "of a list", "of a frame"],
  ["boxplot", "of a plot", "of a frame"],
  ["density", "of a plot", "of a frame"],
  ["histogram", "of a plot", "of a frame"],
  ["max", "of values", "of a frame"],
  ["min", "of values", "of a frame"],
  ["plot", "of a frame", "of a result"],
  ["quantile", "of a frame", "of a distribution"],
  ["summary", "of a frame", "of a result"],
];

test("the bare name opens a chooser of the two functions, each with its usage and its one line", async ({
  page,
  press,
}) => {
  await open(page, press);
  await ask(page, "histogram");
  // The chooser: the name, a sentence, and the two, each saying what it is called on.
  await expect(shown(page).getByRole("heading", { level: 3 })).toHaveText("histogram");
  await expect(shown(page)).toContainText(
    "histogram is two functions. Choose one by what it is called on.",
  );
  const rows = shown(page).getByRole("row");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText("A histogram layer: the rows counted in bins along x");
  await expect(rows.nth(0).locator("code.usage")).toHaveText(/^p\.histogram\(data: Frame, bins: /);
  await expect(rows.nth(1)).toContainText(
    "A histogram of a variable of a frame: its values counted in bins",
  );
  await expect(rows.nth(1).locator("code.usage")).toHaveText(/^data\.histogram\(var, bins: /);
  await expect(row(page, "histogram", "of a plot")).toBeVisible();
  await expect(row(page, "histogram", "of a frame")).toBeVisible();
  // It is a page as any other: in the trail, with no sections, and in the history.
  expect(await reads(page)).toBe("Packages › plot › histogram");
  await expect(onThisPage(page)).toContainText("This page has no sections.");
  await expect(back(page)).toHaveAttribute("title", "Back: Home");

  // One chosen: its own page, the title saying which, its sections alone at the right.
  await press(row(page, "histogram", "of a frame"));
  await expect(title(page)).toHaveText("of a frame");
  await expect(shown(page).getByRole("heading", { level: 3 })).toHaveText(
    /^histogram\s*· of a frame$/,
  );
  await expect(shown(page).getByRole("heading", { level: 3 })).toHaveCount(1);
  await expect(shown(page)).toContainText(
    "A histogram of a variable of a frame: its values counted in bins",
  );
  await expect(shown(page)).not.toContainText("A histogram layer: the rows counted in bins");
  await expect(shown(page).getByRole("heading", { level: 4, name: "Usage" })).toHaveCount(1);
  const listed = await sections(page).allInnerTexts();
  expect(listed[0]).toBe("Usage");
  expect(listed).toContain("Examples");
  // Each section once, and no function named over them.
  expect(new Set(listed).size).toBe(listed.length);
  expect(listed.filter((one) => one.includes("histogram"))).toEqual([]);
  // The trail: the name is a step, which opens the chooser again.
  expect(await reads(page)).toBe("Packages › plot › histogram › of a frame");
  await expect(back(page)).toHaveAttribute("title", "Back: histogram");
  await press(step(page, "histogram"));
  await expect(title(page)).toHaveText("histogram");
  await expect(shown(page).getByRole("row")).toHaveCount(2);
  // The other: its own page, and Back and Forward go through all of them.
  await press(row(page, "histogram", "of a plot"));
  await expect(title(page)).toHaveText("of a plot");
  await expect(shown(page).getByRole("heading", { level: 3 })).toHaveText(
    /^histogram\s*· of a plot$/,
  );
  await expect(shown(page)).toContainText("A histogram layer: the rows counted in bins");
  await expect(back(page)).toHaveAttribute("title", "Back: histogram");
  await press(back(page));
  await press(back(page));
  await expect(title(page)).toHaveText("of a frame");
  await expect(forward(page)).toHaveAttribute("title", "Forward: histogram");
  await press(forward(page));
  await press(forward(page));
  await expect(title(page)).toHaveText("of a plot");
  // A link of a page that names a name with two functions opens its chooser.
  await press(
    shown(page)
      .getByRole("region", { name: "See also" })
      .getByRole("button", { name: "plot", exact: true }),
  );
  await expect(title(page)).toHaveText("plot");
  await expect(shown(page)).toContainText("plot is two functions.");
});

test("each of the nine names with two functions has its chooser and a page for each function", async ({
  page,
  press,
}) => {
  test.slow();
  await open(page, press);
  for (const [name, first, second] of NAMES) {
    await ask(page, name);
    await expect(shown(page)).toContainText(`${name} is two functions.`);
    await expect(shown(page).getByRole("row")).toHaveCount(2);
    for (const which of [first, second]) {
      await press(row(page, name, which));
      await expect(title(page)).toHaveText(which);
      await expect(shown(page).getByRole("heading", { level: 3 })).toHaveCount(1);
      await expect(shown(page).getByRole("heading", { level: 3 })).toContainText(`· ${which}`);
      await expect(shown(page).getByRole("heading", { level: 4, name: "Usage" })).toHaveCount(1);
      const listed = await sections(page).allInnerTexts();
      expect(new Set(listed).size, `${name} ${which}`).toBe(listed.length);
      await press(back(page));
      await expect(title(page)).toHaveText(name);
    }
  }
});

test("search, Topics and a package's page list the two functions apart", async ({
  page,
  press,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open(page, press);
  // Search: two matches, each saying which it is; one chosen opens its own page.
  await field(page).fill("histogram");
  await expect(options(page)).toHaveCount(2);
  const said = (await options(page).allInnerTexts()).map((one) => one.replace(/\s+/g, " ").trim());
  expect(said[0]).toMatch(/^function histogram of a frame plot A histogram of a variable/);
  expect(said[1]).toMatch(/^function histogram of a plot plot A histogram layer/);
  await press(options(page).nth(1));
  await expect(title(page)).toHaveText("of a plot");
  expect(await reads(page)).toBe("Packages › plot › histogram › of a plot");

  // Topics, beside the page: the package's functions, the two of the name apart, the open
  // one marked and the other not.
  const beside = topics(page).getByRole("list", { name: "The functions of plot" });
  await expect(beside.getByRole("button")).toHaveCount(35);
  const both = beside.getByRole("button", { name: /^histogram/ });
  await expect(both).toHaveText([/^histogram\s*of a plot$/, /^histogram\s*of a frame$/]);
  await expect(beside.locator('[aria-current="page"]')).toHaveText(/^histogram\s*of a plot$/);
  await expect(beside.locator('[aria-current="page"]')).toBeInViewport();
  await press(both.nth(1));
  await expect(title(page)).toHaveText("of a frame");
  await expect(beside.locator('[aria-current="page"]')).toHaveText(/^histogram\s*of a frame$/);
  // Beside the chooser both are marked: it is the page of the two.
  await press(step(page, "histogram"));
  await expect(beside.locator('[aria-current="page"]')).toHaveCount(2);

  // The package's page: 35 functions, the two apart, each opening its own page.
  await press(step(page, "plot"));
  await expect(shown(page).getByRole("list", { name: "Facts of plot" })).toContainText(
    "35 functions in Zeff 0.8.0",
  );
  await expect(row(page, "histogram", "of a plot")).toBeVisible();
  await press(row(page, "histogram", "of a frame"));
  await expect(title(page)).toHaveText("of a frame");
  // A name two packages have: each package lists its own, and the function stands in its own.
  await ask(page, "min");
  expect(await reads(page)).toBe("Packages › core · data › min");
  await press(row(page, "min", "of values"));
  await expect(title(page)).toHaveText("of values");
  expect(await reads(page)).toBe("Packages › core › min › of values");
  await expect(topics(page).getByRole("region", { name: /^Beside this page/ })).toHaveCount(1);
  await expect(
    topics(page)
      .getByRole("list", { name: "The functions of core" })
      .locator('[aria-current="page"]'),
  ).toHaveText(/^min\s*of values$/);
  await expect(shown(page).getByRole("list", { name: "Facts of min" })).toContainText("core");
});

test("F1 in the script opens the function the call would run, not the chooser", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await write(
    page,
    "let w = dataset(wages)\nw.histogram(wage)\nw.plot(x: wage).histogram()\nmin(1, 2)\nw.min(wage)\n",
  );
  const from = async (line: number, column: number, which: string, says: string) => {
    await press(places(page).getByRole("button", { name: "Script" }));
    await cursorAt(page, line, column);
    await page.keyboard.press("F1");
    await expect(title(page)).toHaveText(which);
    await expect(shown(page).getByRole("heading", { level: 3 })).toHaveCount(1);
    await expect(shown(page)).toContainText(says);
  };
  // The same name on a frame and on a plot; before its values and on a frame.
  await from(2, 5, "of a frame", "A histogram of a variable of a frame");
  await from(3, 20, "of a plot", "A histogram layer");
  await from(4, 1, "of values", "Smallest of two or more values, row by row");
  await from(5, 3, "of a frame", "Smallest non-missing value");
  // Opened directly: the chooser is not a page of the history before it.
  await expect(back(page)).toHaveAttribute("title", "Back: min · of values");
});

for (const theme of ["light", "dark"] as const) {
  test(`the chooser and a function's page keep to 12.5 pixels and 4.5 to 1, and answer the keyboard, in the ${theme} theme`, async ({
    page,
    press,
    browserName,
  }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await open(page, press);
    if (theme === "dark") await press(page.getByRole("switch", { name: "Dark" }));
    await ask(page, "summary");
    expect(await smallestText(page)).toBeGreaterThanOrEqual(12.5);
    expect(await faintText(shown(page))).toEqual([]);
    expect(await faintText(topics(page))).toEqual([]);
    // The chooser fits its column: a long usage is broken inside its block.
    const pane = page.getByTestId("help").locator(".page");
    expect(await pane.evaluate((node) => node.scrollWidth - node.clientWidth)).toBe(0);
    // By the keyboard alone: the first function, then the second, then Enter.
    const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
    await row(page, "summary", "of a frame").focus();
    await page.keyboard.press(tab);
    await expect(row(page, "summary", "of a result")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(title(page)).toHaveText("of a result");
    expect(await smallestText(page)).toBeGreaterThanOrEqual(12.5);
    expect(await faintText(shown(page).locator("header"))).toEqual([]);
    expect(await faintText(bar(page))).toEqual([]);
    // In the search's list too.
    await field(page).fill("summary");
    await expect(options(page).first()).toBeVisible();
    expect(await faintText(page.getByRole("listbox", { name: "What was found" }))).toEqual([]);
  });
}
