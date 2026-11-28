// On this page, a part of the page (release 0.2.4, step 10; open decision #220, item 7, which
// replaces the pane of #211, item 13): the list of the open page's sections has no link in
// Help's bar, no pane and no command of ⌘K. It stands at the right of the page's text on the
// page's own ground, stays in view as the page is read with the part in view marked, and in a
// place too narrow for it stands once under the page's title. A page with no sections has none.
//
// From release 0.3.1 (step 11b; open decision #245) **See also** stands under the list where
// it is beside the page: the names the page gives, each opening its page. A page with no
// sections has neither, and is drawn in two columns: the index and the page.
import type { Page } from "@playwright/test";
import { expect, faintText, smallestText, test } from "./support";

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
  await page.goto("/#/help/name/reg");
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
  await page.goto("/#/help/name/reg");
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
  await page.goto("/#/help/code/Z0101");
  await expect(title(page)).toHaveText("Z0101");
  await expect(parts(page)).toHaveText(["Meaning", "Common causes", "Example", "Fix"]);
  await page.goto("/#/help/using/finding-help");
  await expect(title(page)).toHaveText("Finding help");
  await expect(parts(page).first()).toBeVisible();
  expect((await placed(page)).rightOfText).toBe(true);
  await page.goto("/#/help");
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
    await page.goto(`/#/help/${address}`);
    await expect(shown(page)).toBeVisible();
    await expect(list(page), address).toHaveCount(0);
  }
});

test("in a place too narrow for it the list stands once under the page's title", async ({
  page,
}) => {
  // 1,000 pixels with Topics open leaves the page less room than the list needs beside it.
  await page.setViewportSize({ width: 1000, height: 800 });
  await page.goto("/#/help/name/reg");
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
  await page.goto("/#/help");
  await expect(page.getByTestId("help-counts")).toBeVisible();
  expect((await placed(page)).insideText).toBe(true);
  await page.goto("/#/help/using/finding-help");
  await expect(title(page)).toHaveText("Finding help");
  expect((await placed(page)).insideText).toBe(true);
});

const also = (page: Page) => page.getByRole("navigation", { name: "See also" });

for (const theme of ["light", "dark"] as const) {
  test(`See also stands under the list beside a page, each name opening its page, in the ${theme} theme`, async ({
    page,
    press,
  }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto("/#/help/name/mean");
    await expect(title(page)).toHaveText("mean");
    if (theme === "dark") await press(page.getByRole("switch", { name: "Dark" }));
    await expect(also(page)).toHaveCount(1);
    await expect(also(page)).toContainText("See also");
    // The names the page itself gives under See also, in its order.
    const own = shown(page).getByRole("region", { name: "See also", exact: true });
    const names = await own.getByRole("button").allTextContents();
    expect(names).toEqual(["sd", "summary", "describe"]);
    await expect(also(page).getByRole("button")).toHaveText(names);
    // Under the list, in its column at the right of the text, and in view with it.
    const at = await page.evaluate(() => {
      const box = (query: string) => document.querySelector(query)!.getBoundingClientRect();
      const list = box('nav[aria-label="On this page"]');
      const see = box('nav[aria-label="See also"]');
      const text = box('[data-testid="help-page"]');
      return {
        under: see.top >= list.bottom,
        sameColumn: Math.abs(see.left - list.left) < 2,
        rightOfText: see.left >= text.right - 1,
        inWindow: see.right <= innerWidth && see.bottom <= innerHeight,
      };
    });
    expect(at).toEqual({ under: true, sameColumn: true, rightOfText: true, inWindow: true });
    // It stays in view with the list as the page is read.
    await page.locator('[data-testid="help"] .page').evaluate((pane) => (pane.scrollTop = 1500));
    await expect(also(page)).toBeInViewport();
    expect(await smallestText(page)).toBeGreaterThanOrEqual(12.5);
    expect(await faintText(also(page))).toEqual([]);
    // A name opens its page, by the keyboard; Back returns.
    const sd = also(page).getByRole("button", { name: "sd", exact: true });
    await expect(sd).toHaveAttribute("title", "Open the page of sd");
    await sd.focus();
    await page.keyboard.press("Enter");
    await expect(title(page)).toHaveText("sd");
    await expect(also(page).getByRole("button").first()).toBeVisible();
    await press(bar(page).getByRole("button", { name: "Back" }));
    await expect(title(page)).toHaveText("mean");
    // A name that is two functions opens the page that chooses between them, as in the page.
    await press(also(page).getByRole("button", { name: "summary", exact: true }));
    await expect(title(page)).toHaveText("summary");
    await expect(shown(page)).toContainText("summary is two functions.");
  });
}

test("a page with no See also has none beside it; under the title, and on a page with no sections, there is none", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  // A code's page, a page of the app's own and Home have their list and no See also. Each is
  // waited for before the next is asked: on a slow machine an address asked while the one
  // before it was still being opened was passed over (seen on GitHub, in the check of step 11b).
  for (const [address, there] of [
    ["code/Z0101", "Z0101"],
    ["using/finding-help", "Finding help"],
    ["", null],
  ] as const) {
    await page.goto(`/#/help${address === "" ? "" : `/${address}`}`);
    if (there === null) await expect(page.getByTestId("help-counts")).toBeVisible();
    else await expect(title(page)).toHaveText(there);
    await expect(list(page), address).toHaveCount(1);
    await expect(also(page), address).toHaveCount(0);
  }
  // A page that is a list has no sections: neither stands beside it, and the page is drawn in
  // two columns, the index and the page, which has the room to the window's edge.
  await page.goto("/#/help/package/regress");
  await expect(title(page)).toHaveText("regress");
  await expect(list(page)).toHaveCount(0);
  await expect(also(page)).toHaveCount(0);
  const columns = await page.evaluate(() => {
    const pane = document.querySelector('[data-testid="help"] .page') as HTMLElement;
    const index = document.querySelector('[data-pane="topics"]') as HTMLElement;
    const columned = (pane.querySelector(".with") as HTMLElement).classList.contains("beside");
    return {
      columned,
      rightOfIndex: pane.getBoundingClientRect().left >= index.getBoundingClientRect().right,
      toTheEdge: Math.round(innerWidth - pane.getBoundingClientRect().right),
      asides: document.querySelectorAll('[data-testid="help"] aside').length,
    };
  });
  expect(columns).toEqual({ columned: false, rightOfIndex: true, toTheEdge: 0, asides: 1 });
  // In a place too narrow for the list beside the text, the list is under the title and the
  // page's own See also is the only one.
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/#/help/name/mean");
  await expect(title(page)).toHaveText("mean");
  await expect(list(page)).toHaveCount(1);
  // The list moves under the title once the page has measured its new width: waited for, not
  // read at once (read at once it was still beside the text on GitHub's machine, in WebKit,
  // at the check of the release's commit).
  await expect.poll(async () => (await placed(page)).insideText).toBe(true);
  await expect(also(page)).toHaveCount(0);
  await expect(shown(page).getByRole("region", { name: "See also", exact: true })).toHaveCount(1);
});
