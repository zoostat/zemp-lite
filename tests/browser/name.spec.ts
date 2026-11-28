// The name drawn (release 0.2.4, step 5; open decision #220, item 5; the design guide, section
// 9, "The name drawn"): on every screen Zemp Lite's name is drawn as Zemp with a small raised
// Lite badge, and is still read, found and copied as "Zemp Lite". Where text cannot be drawn,
// as in the tab's title, it is written in plain words.
import type { Page } from "@playwright/test";
import { expect, faintText, test } from "./support";

const READY = "engine Zeff 0.9.0 ready";

/**
 * What a screen shows of the name: how many times it is drawn; the words a reader of the
 * drawn name is given, each of which must be "Zemp Lite"; the size of the smallest badge; and
 * the texts where the name stands written plainly, which there must be none of.
 */
async function nameOn(page: Page) {
  return page.evaluate(() => {
    const drawn = [...document.querySelectorAll(".zl")].filter(
      (one) => one.getClientRects().length > 0,
    );
    const plain: string[] = [];
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) {
      const words = walk.currentNode.textContent ?? "";
      const element = walk.currentNode.parentElement;
      if (element === null || element.closest("script, style") !== null) continue;
      if (element.getClientRects().length === 0) continue;
      if (/Zemp\s+Lite/.test(words)) plain.push(words.trim());
    }
    const badges = drawn.map((one) =>
      parseFloat(getComputedStyle(one.querySelector(".lite") as Element).fontSize),
    );
    return {
      drawn: drawn.length,
      read: [...new Set(drawn.map((one) => one.textContent))],
      smallest: Math.min(...badges),
      plain,
    };
  });
}

/** A screen draws the name at least once, and writes it plainly nowhere. */
async function drawnOn(page: Page, what: string): Promise<void> {
  const found = await nameOn(page);
  expect(found.plain, `${what}: the name written plainly`).toEqual([]);
  expect(found.drawn, `${what}: the name drawn`).toBeGreaterThan(0);
  expect(found.read, `${what}: what the drawn name is read as`).toEqual(["Zemp Lite"]);
  expect(found.smallest, `${what}: the badge`).toBeGreaterThanOrEqual(11);
}

test("the page of what is counted draws the name, and the tab's title writes it", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Zemp Lite");
  await page.goto("/counted.html");
  await drawnOn(page, "what is counted");
  await expect(page).toHaveTitle("What is counted · Zemp Lite");
  await expect(page.getByRole("link", { name: "Back to Zemp Lite" })).toBeVisible();
});

test.describe("a first visit", () => {
  test.use({ firstVisit: true });

  test("the Start screen draws the name wherever it shows it, and its button says Start alone", async ({
    page,
  }) => {
    await page.goto("/");
    const open = page.getByRole("button", { name: "Start", exact: true });
    await expect(open).toBeEnabled({ timeout: 30_000 });
    await drawnOn(page, "the Start screen");
    const found = await nameOn(page);
    // In its bar and in its foot, with the version (until release 0.3.1 in its heading and in
    // its sentence: the heading is now the headline, open decision #245); the button, **Start**
    // from 0.2.5 (open decision #225, item 5), no longer carries it.
    expect(found.drawn).toBeGreaterThanOrEqual(2);
    await expect(open).toHaveText("Start");
    expect(await faintText(page.getByTestId("start"))).toEqual([]);
  });
});

for (const theme of ["light", "dark"] as const) {
  test(`the welcome screen, a project and Help draw the name wherever they show it (${theme})`, async ({
    page,
    press,
  }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.setViewportSize({ width: 1100, height: 800 });
    await page.goto("/");
    await expect(page.getByRole("button", { name: /^Scratch project/ })).toBeVisible();
    await drawnOn(page, "the welcome screen");
    expect(await faintText(page.locator("body"))).toEqual([]);

    await press(page.getByRole("button", { name: /^Scratch project/ }));
    await expect(page.getByRole("status")).toHaveText(READY);
    // (Until release 0.3.1 a project drew the name in the line a narrow window was shown; that
    // line is gone, open decision #243, and a project shows the mark alone.)

    // Help: Home, with Zemp Lite's panel and the topic Using Zemp Lite; Topics; On this page.
    await press(
      page.getByRole("navigation", { name: "Places" }).getByRole("button", { name: "Help" }),
    );
    await expect(page.getByTestId("help-counts")).toBeVisible();
    await drawnOn(page, "Home of Help");
    expect((await nameOn(page)).drawn).toBeGreaterThanOrEqual(5);
    expect(await faintText(page.getByTestId("help"))).toEqual([]);

    // The list of the app's pages, whose title and trail name it; and a page that speaks of it.
    await page.goto("/#/help/using");
    await expect(page.getByTestId("help-title")).toHaveText("Using Zemp Lite");
    await drawnOn(page, "the list of the pages of Using Zemp Lite");
    await page.goto("/#/help/using/getting-started");
    await expect(page.getByTestId("help-title")).toHaveText("Getting started");
    await drawnOn(page, "a page of Using Zemp Lite");
    expect(await faintText(page.getByTestId("help"))).toEqual([]);

    // ⌘K: a command and its hint that name the app.
    await page.keyboard.press("ControlOrMeta+k");
    const palette = page.getByRole("dialog", { name: "Commands" });
    await palette.getByRole("combobox").fill("help home");
    await expect(palette.getByRole("option").first()).toContainText("Zemp Lite");
    await drawnOn(page, "the commands");
    expect(await faintText(palette)).toEqual([]);
  });
}
