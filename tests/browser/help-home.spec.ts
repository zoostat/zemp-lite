// Home of the Help place (release 0.2.3, step 4; the row of 0.2.3; open decision #211, part 1
// and "Placed"): the **Index of functions**. The engine and the counts under the title; each
// package the engine ships, with its count, its functions as links in as many columns as
// there is room for; the shipped datasets under `datasets`; only what this engine runs. A
// function's one line is shown while the pointer or the keyboard rests on its name.
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
}

const places = (page: Page) => page.getByRole("navigation", { name: "Places" });
const bar = (page: Page) => page.getByRole("toolbar", { name: "Help: its panes and its controls" });
const home = (page: Page) => page.getByTestId("help-page");
const title = (page: Page) => page.getByTestId("help-title");
const back = (page: Page) => bar(page).getByRole("button", { name: "Back" });
const functionsOf = (page: Page, name: string) =>
  home(page).getByRole("list", { name: `The functions of ${name}`, exact: true });
const line = (page: Page) => page.getByRole("tooltip");
const outline = (page: Page) =>
  page
    .getByRole("complementary", { name: "Help: the left pane" })
    .getByRole("region", { name: "Outline" });

/** The names the released `zeff help <package>` printed, in its order. */
const printed = (name: string) =>
  file(`tests/scripts/packages/${name}.txt`)
    .split("\n")
    .filter((text) => text.startsWith("  "))
    .map((text) => text.trim().split(/\s+/)[0]);

const PACKAGES = [
  ["core", 71],
  ["time", 16],
  ["text", 13],
  ["data", 56],
  ["dist", 19],
  ["results", 23],
  ["stats", 14],
  ["plot", 31],
  ["datasets", 2],
  ["regress", 10],
] as const;

test("Home is the index of functions: the engine, the counts, and every package with its functions", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await press(places(page).getByRole("button", { name: "Help" }));
  await expect(home(page).getByRole("heading", { level: 3 })).toHaveText("Index of functions");
  await expect(page.getByTestId("help-counts")).toHaveText(
    "Zeff 0.8.0 · 255 functions in 10 packages",
  );
  // Each package in the engine's order, with its count; the counts add up to the line above.
  const headings = home(page).getByRole("heading", { level: 4 });
  await expect(headings).toHaveText(
    PACKAGES.map(([name, count]) => new RegExp(`^${name}\\s*${count}$`)),
  );
  expect(PACKAGES.reduce((sum, [, count]) => sum + count, 0)).toBe(255);
  for (const [name, count] of PACKAGES) {
    await expect(functionsOf(page, name).getByRole("button")).toHaveCount(count);
  }
  // The functions of a package are those the released engine lists for it, in its order.
  for (const name of ["core", "data", "stats", "regress"]) {
    expect(await functionsOf(page, name).getByRole("button").allInnerTexts()).toEqual(
      printed(name),
    );
  }
  // The shipped datasets stand under `datasets`, after its two functions.
  const shipped = home(page).getByRole("list", { name: /^Datasets/ });
  await expect(shipped.getByRole("button")).toHaveText(["firms", "sleep", "staff", "wages"]);
  // Only what this engine runs: a function of Zeff 0.9.0 and one of the roadmap are not there.
  for (const later of ["n_chars", "row_number", "a_learning"]) {
    await expect(home(page).getByRole("button", { name: later, exact: true })).toHaveCount(0);
  }
  // The outline of Home is the packages, each going to its place.
  const entries = outline(page).locator("ul").getByRole("button");
  await expect(entries).toHaveText(PACKAGES.map(([name]) => name));
  await press(entries.nth(9));
  await expect(home(page).getByRole("heading", { level: 4, name: /^regress/ })).toBeInViewport();
});

test("every name on Home opens its page", async ({ page, press }) => {
  test.slow();
  await scratch(page, press);
  await press(places(page).getByRole("button", { name: "Help" }));
  await expect(home(page).getByRole("heading", { level: 3 })).toHaveText("Index of functions");
  // A function, a dataset and a package's heading, by the mouse, each into the history.
  await press(functionsOf(page, "stats").getByRole("button", { name: "t_test" }));
  await expect(title(page)).toHaveText("t_test");
  await expect(home(page)).toContainText("t-tests for one mean, two groups or paired measurements");
  await press(back(page));
  await press(
    home(page)
      .getByRole("list", { name: /^Datasets/ })
      .getByRole("button", { name: "wages" }),
  );
  await expect(title(page)).toHaveText("wages");
  await expect(home(page)).toContainText("Synthetic hourly wages");
  await press(back(page));
  await press(home(page).getByRole("heading", { level: 4, name: /^plot/ }).getByRole("button"));
  await expect(title(page)).toHaveText("plot");
  await expect(home(page).getByRole("row")).toHaveCount(31);
  await press(back(page));
  await expect(home(page).getByRole("heading", { level: 3 })).toHaveText("Index of functions");

  // Every name of the index, one by one: its page is the engine's page of that name.
  const names = await home(page).locator("ul button").allInnerTexts();
  expect(names).toHaveLength(255 + 4);
  const opened = await page.evaluate(async () => {
    const missing: string[] = [];
    const pane = document.querySelector('[data-testid="help"]')!;
    const names = () => [
      ...pane.querySelectorAll<HTMLButtonElement>('[data-testid="help-page"] ul button'),
    ];
    const settled = (done: () => boolean) =>
      new Promise<boolean>((resolve) => {
        const started = Date.now();
        const look = () =>
          done()
            ? resolve(true)
            : Date.now() - started > 4000
              ? resolve(false)
              : setTimeout(look, 5);
        look();
      });
    const count = names().length;
    for (let at = 0; at < count; at++) {
      const button = names()[at]!;
      const name = button.innerText;
      button.click();
      const title = () => pane.querySelector('[data-testid="help-title"]')?.textContent?.trim();
      const page = () => pane.querySelector('[data-testid="help-page"]') as HTMLElement | null;
      const there = await settled(
        () => title() === name && (page()?.innerText.includes(name) ?? false),
      );
      // A page of the engine's is headed by the name; none says the name is unknown.
      const text = page()?.innerText ?? "";
      const headed = [...(page()?.querySelectorAll("h3") ?? [])].some(
        (heading) => heading.textContent?.trim() === name,
      );
      if (!there || !headed || /no function or package is called/.test(text)) missing.push(name);
      pane.querySelector<HTMLButtonElement>('button[aria-label="Back"]')!.click();
      await settled(() => title() === "Help" && names().length === count);
    }
    return missing;
  });
  expect(opened).toEqual([]);
});

test("a function's one line is shown while the pointer or the keyboard rests on its name", async ({
  page,
  press,
  browserName,
}) => {
  await scratch(page, press);
  await press(places(page).getByRole("button", { name: "Help" }));
  const name = functionsOf(page, "stats").getByRole("button", { name: "t_test" });
  await name.scrollIntoViewIfNeeded();
  await expect(line(page)).toHaveCount(0);
  // The pointer: the line comes when it rests, under the name, and goes when it leaves.
  await name.hover();
  await expect(line(page)).toHaveText("t-tests for one mean, two groups or paired measurements");
  const under = (await name.boundingBox())!;
  const shown = (await line(page).boundingBox())!;
  expect(shown.y).toBeGreaterThanOrEqual(under.y + under.height);
  expect(shown.y - (under.y + under.height)).toBeLessThan(12);
  expect(shown.x + shown.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await expect(name).toHaveAttribute("aria-describedby", "help-home-line");
  await places(page).hover();
  await expect(line(page)).toHaveCount(0);
  // The keyboard: the line of the name the Tab key rests on, and of the next; Escape puts it away.
  const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
  await name.focus();
  await expect(line(page)).toHaveText("t-tests for one mean, two groups or paired measurements");
  await page.keyboard.press(tab);
  await expect(
    functionsOf(page, "stats").getByRole("button", { name: "proportion_test" }),
  ).toBeFocused();
  await expect(line(page)).toHaveText("Test of one or two proportions");
  await page.keyboard.press("Escape");
  await expect(line(page)).toHaveCount(0);
  // Enter opens the page, and the line does not follow it there.
  await page.keyboard.press("Enter");
  await expect(title(page)).toHaveText("proportion_test");
  await expect(line(page)).toHaveCount(0);
  // A dataset has its line too.
  await press(back(page));
  const wages = home(page)
    .getByRole("list", { name: /^Datasets/ })
    .getByRole("button", { name: "wages" });
  await wages.focus();
  await expect(line(page)).toContainText("Synthetic hourly wages");
});

/** How many columns a list of names is set in, and whether the page runs off sideways. */
async function columns(page: Page) {
  const lefts = await functionsOf(page, "core")
    .getByRole("button")
    .evaluateAll((all) => [
      ...new Set(all.map((one) => Math.round(one.getBoundingClientRect().left))),
    ]);
  const pane = page.getByTestId("help").locator(".page");
  const sideways = await pane.evaluate((node) => node.scrollWidth - node.clientWidth);
  return { count: lefts.length, sideways };
}

for (const theme of ["light", "dark"] as const) {
  test(`Home sets the names in as many columns as there is room for, at 12.5 pixels and 4.5 to 1 at the least, in the ${theme} theme`, async ({
    page,
    press,
  }) => {
    await page.setViewportSize({ width: 1200, height: 700 });
    await scratch(page, press);
    if (theme === "dark") await press(page.getByRole("switch", { name: "Dark" }));
    await press(places(page).getByRole("button", { name: "Help" }));
    await expect(home(page).getByRole("heading", { level: 3 })).toHaveText("Index of functions");
    // At 1,200 pixels with both panes open; with both closed; and in a narrower window.
    const open = await columns(page);
    expect(open.count).toBe(3);
    expect(open.sideways).toBeLessThanOrEqual(0);
    expect(await smallestText(page)).toBeGreaterThanOrEqual(12.5);
    expect(await faintText(home(page))).toEqual([]);
    await press(bar(page).getByRole("button", { name: "Outline" }));
    await press(bar(page).getByRole("button", { name: "Related functions" }));
    const closed = await columns(page);
    expect(closed.count).toBeGreaterThan(open.count);
    expect(closed.sideways).toBeLessThanOrEqual(0);
    await press(bar(page).getByRole("button", { name: "Outline" }));
    await press(bar(page).getByRole("button", { name: "Related functions" }));
    await page.setViewportSize({ width: 1000, height: 700 });
    const narrow = await columns(page);
    expect(narrow.count).toBeGreaterThanOrEqual(1);
    expect(narrow.count).toBeLessThanOrEqual(open.count);
    expect(narrow.sideways).toBeLessThanOrEqual(0);
    // No name is cut: each stands whole inside the page.
    const cut = await home(page)
      .locator("ul button")
      .evaluateAll((all) => all.filter((one) => one.scrollWidth > one.clientWidth + 1).length);
    expect(cut).toBe(0);
    // The line shown on resting, as painted.
    await page.setViewportSize({ width: 1200, height: 700 });
    await functionsOf(page, "regress").getByRole("button", { name: "reg", exact: true }).focus();
    await expect(line(page)).toContainText("Linear regression by least squares");
    expect(await faintText(line(page))).toEqual([]);
    expect(await smallestText(page)).toBeGreaterThanOrEqual(12.5);
  });
}

test("Help: index of functions, from ⌘K, opens Home from any place", async ({ page, press }) => {
  await scratch(page, press);
  await page.keyboard.press("ControlOrMeta+k");
  const box = page.getByRole("combobox", { name: "Type a command" });
  await box.fill("index of functions");
  await expect(
    page.getByRole("dialog", { name: "Commands" }).getByRole("option").first(),
  ).toContainText("Help: index of functions");
  await box.press("Enter");
  await expect(home(page).getByRole("heading", { level: 3 })).toHaveText("Index of functions");
  await expect(bar(page).getByRole("button", { name: "Home" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  // From a page of Help it is Home too, and Back returns to the page.
  await press(functionsOf(page, "regress").getByRole("button", { name: "reg", exact: true }));
  await expect(title(page)).toHaveText("reg");
  await page.keyboard.press("ControlOrMeta+k");
  await box.fill("index of functions");
  await box.press("Enter");
  await expect(home(page).getByRole("heading", { level: 3 })).toHaveText("Index of functions");
  await press(back(page));
  await expect(title(page)).toHaveText("reg");
});
