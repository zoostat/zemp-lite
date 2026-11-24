// On this page, a part of the page (release 0.2.4, step 10; open decision #220, item 7, which
// replaces the pane of #211, item 13): the list of the open page's sections has no link in
// Help's bar, no pane and no command of ⌘K. It stands at the right of the page's text on the
// page's own ground, stays in view as the page is read with the part in view marked, and in a
// place too narrow for it stands once under the page's title. A page with no sections has none.
import type { Page } from "@playwright/test";
import { expect, test } from "./support";

const bar = (page: Page) => page.getByRole("toolbar", { name: "Help: its panes and its controls" });
const list = (page: Page) => page.getByRole("navigation", { name: "On this page" });
const parts = (page: Page) => list(page).getByRole("button");
const shown = (page: Page) => page.getByTestId("help-page");
const title = (page: Page) => page.getByTestId("help-title");
const marked = (page: Page) => list(page).locator('[aria-current="location"]');

/** Where the list stands against the page's text, and what is painted behind it. */
async function placed(page: Page) {
  return page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="On this page"]') as HTMLElement;
    const text = document.querySelector('[data-testid="help-page"]') as HTMLElement;
    const pane = document.querySelector('[data-testid="help"] .page') as HTMLElement;
    const a = nav.getBoundingClientRect();
    const b = text.getBoundingClientRect();
    const painted = (node: HTMLElement) => getComputedStyle(node).backgroundColor;
    return {
      rightOfText: a.left >= b.right - 1,
      insideText: text.contains(nav),
      top: Math.round(a.top - pane.getBoundingClientRect().top),
      ground: painted(nav),
      border: getComputedStyle(nav).borderLeftWidth,
      inAPane: nav.closest("aside") !== null,
    };
  });
}

test("the list is beside a function's page, on the page's own ground, with no link, pane or command", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto("/app/#/help/name/reg");
  await expect(title(page)).toHaveText("reg");
  await expect(list(page)).toBeVisible();
  await expect(list(page)).toHaveCount(1);
  await expect(list(page)).toContainText("On this page");
  await expect(parts(page).first()).toHaveText("Usage");
  await expect(parts(page)).toContainText(["Usage", "Description", "Arguments", "Examples"]);
  const at = await placed(page);
  expect(at.rightOfText).toBe(true);
  expect(at.insideText).toBe(false);
  // No shade and no rule of its own: nothing is painted behind it but the page.
  expect(at.ground).toBe("rgba(0, 0, 0, 0)");
  expect(at.border).toBe("0px");
  expect(at.inAPane).toBe(false);
  // Nothing of the pane remains: no link in the bar, no right pane, no ×, no command.
  await expect(bar(page).getByRole("button", { name: "On this page" })).toHaveCount(0);
  await expect(page.getByRole("complementary", { name: "Help: the right pane" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Close On this page" })).toHaveCount(0);
  await page.keyboard.press("ControlOrMeta+k");
  const palette = page.getByRole("dialog", { name: "Commands" });
  await palette.getByRole("combobox").fill("on this page");
  await expect(palette.getByRole("option")).toHaveCount(0);
  await palette.getByRole("combobox").fill("help: hide");
  await expect(palette.getByRole("option")).toHaveText([/^Help: hide Topics/]);
  await page.keyboard.press("Escape");
});

test("the list stays in view as the page is read, marks the part in view, and goes to a part pressed", async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await page.goto("/app/#/help/name/reg");
  await expect(title(page)).toHaveText("reg");
  const pane = page.getByTestId("help").locator(".page");
  // Far down the page the list is still at the top of the place.
  await pane.evaluate((node) => node.scrollTo(0, 2400));
  await expect(list(page)).toBeInViewport();
  // (It rests under the place's own margin at the top, of 18 pixels.)
  expect((await placed(page)).top).toBeLessThanOrEqual(20);
  await expect(marked(page)).toHaveCount(1);
  await expect(marked(page)).not.toHaveText("Usage");
  // A part pressed is gone to and marked.
  await parts(page)
    .filter({ hasText: /^Arguments$/ })
    .click();
  await expect(marked(page)).toHaveText("Arguments");
  const head = shown(page).getByRole("heading", { name: "Arguments", exact: true });
  await expect(head).toBeInViewport();
  // From the keyboard: the list's parts are stops of the Tab key, and Return goes to one.
  const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
  await parts(page)
    .filter({ hasText: /^Usage$/ })
    .focus();
  await page.keyboard.press(tab);
  await expect(parts(page).filter({ hasText: /^Description$/ })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(marked(page)).toHaveText("Description");
});

test("a code's page, a page of the app and Home have their list; a page that is a list has none", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto("/app/#/help/code/Z0101");
  await expect(title(page)).toHaveText("Z0101");
  await expect(parts(page)).toHaveText(["Meaning", "Common causes", "Example", "Fix"]);
  await page.goto("/app/#/help/using/finding-help");
  await expect(title(page)).toHaveText("Finding help");
  await expect(parts(page).first()).toBeVisible();
  expect((await placed(page)).rightOfText).toBe(true);
  await page.goto("/app/#/help");
  await expect(page.getByTestId("help-counts")).toBeVisible();
  await expect(parts(page)).toHaveText([
    "Zeff",
    "Zemp Lite",
    "Packages",
    "Errors and warnings",
    "Using Zemp Lite",
  ]);
  // A package's page, the codes by family and the list of the app's pages have no sections.
  for (const address of ["package/regress", "codes", "using", "packages"]) {
    await page.goto(`/app/#/help/${address}`);
    await expect(shown(page)).toBeVisible();
    await expect(list(page), address).toHaveCount(0);
  }
});

test("in a place too narrow for it the list stands once under the page's title", async ({
  page,
}) => {
  // 1,000 pixels with Topics open leaves the page less room than the list needs beside it.
  await page.setViewportSize({ width: 1000, height: 800 });
  await page.goto("/app/#/help/name/reg");
  await expect(title(page)).toHaveText("reg");
  await expect(list(page)).toHaveCount(1);
  const narrow = await placed(page);
  expect(narrow.insideText).toBe(true);
  expect(narrow.rightOfText).toBe(false);
  // Under the title and its line, before the first section.
  const order = await shown(page).evaluate((article) => {
    const top = (selector: string) =>
      (article.querySelector(selector) as HTMLElement).getBoundingClientRect().top;
    return { title: top("h3"), list: top('nav[aria-label="On this page"]'), first: top("h4") };
  });
  expect(order.list).toBeGreaterThan(order.title);
  expect(order.first).toBeGreaterThan(order.list);
  // It still goes to a part.
  await parts(page)
    .filter({ hasText: /^Arguments$/ })
    .click();
  await expect(
    shown(page).getByRole("heading", { name: "Arguments", exact: true }),
  ).toBeInViewport();
  // With Topics closed there is room again, and the list is beside the text.
  await bar(page).getByRole("button", { name: "Topics", exact: true }).click();
  await expect.poll(async () => (await placed(page)).rightOfText).toBe(true);
  await expect(list(page)).toHaveCount(1);
  // Home and a page of the app, narrow: under their titles too.
  await bar(page).getByRole("button", { name: "Topics", exact: true }).click();
  await page.goto("/app/#/help");
  await expect(page.getByTestId("help-counts")).toBeVisible();
  expect((await placed(page)).insideText).toBe(true);
  await page.goto("/app/#/help/using/finding-help");
  await expect(title(page)).toHaveText("Finding help");
  expect((await placed(page)).insideText).toBe(true);
});
