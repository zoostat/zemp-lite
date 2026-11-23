// Home of the Help place (release 0.2.3, step 9f; open decision #211, item 14, the owner's
// choice of 24 November 2026): a landing page of soft panels, one under another. A panel for
// Zeff and one for Zemp Lite, each with its version and a few words; then, under Topics, a
// panel for each section of the Topics pane, with its count, a sentence and an arrow, a click
// opening it. The Index of functions that stood here is gone: every function is reached from
// its package, from search and from links.
import { readFileSync } from "node:fs";
import type { Locator, Page } from "@playwright/test";
import { expect, faintText, smallestText, test, useExample } from "./support";

const READY = "engine Zeff 0.8.0 ready";
const VERSION = (
  JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
    version: string;
  }
).version;

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
const homeButton = (page: Page) => bar(page).getByRole("button", { name: "Home" });
const panel = (page: Page, name: string) => home(page).getByRole("region", { name, exact: true });
/** The button of a topic's panel, which opens it: it is the whole panel's. */
const opener = (page: Page, name: string) =>
  panel(page, name).getByRole("heading").getByRole("button");
const onThisPage = (page: Page) =>
  page
    .getByRole("complementary", { name: "Help: the right pane" })
    .getByRole("region", { name: "On this page" });

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
const PANELS = ["Zeff", "Zemp Lite", "Packages", "Errors and warnings", "Using Zemp Lite"];

async function open(page: Page, press: (target: Locator) => Promise<void>) {
  await scratch(page, press);
  await press(places(page).getByRole("button", { name: "Help" }));
  await expect(page.getByTestId("help-counts")).toBeVisible();
}

test("Home is a landing page: Zeff and Zemp Lite with their versions, and a panel for each topic", async ({
  page,
  press,
}) => {
  await open(page, press);
  await expect(home(page).getByRole("heading", { level: 3 })).toHaveText("Help");
  await expect(homeButton(page)).toHaveAttribute("aria-current", "page");
  // Zeff: its version and its counts are the engine's.
  await expect(panel(page, "Zeff 0.8.0").getByRole("heading")).toHaveText(/^Zeff\s*0\.8\.0$/);
  await expect(panel(page, "Zeff 0.8.0")).toContainText(
    "A language for statistics. You write a script; the engine reads the data, runs the tests, fits the models and prints tables and plots. The same script gives the same numbers on every computer, and every function is checked against R and Stata.",
  );
  await expect(page.getByTestId("help-engine")).toHaveText("0.8.0");
  await expect(page.getByTestId("help-counts")).toHaveText(
    "255 functions · 10 packages · 144 codes",
  );
  // Zemp Lite: its version is the app's own, and its stage.
  await expect(page.getByTestId("help-app")).toHaveText(VERSION);
  const zemp = home(page).getByRole("region", { name: /^Zemp Lite/ });
  await expect(zemp.getByRole("heading")).toHaveText(
    new RegExp(`^Zemp Lite\\s*${VERSION.replaceAll(".", "\\.")}\\s*alpha$`),
  );
  await expect(zemp).toContainText(
    "The editor for Zeff in a browser: a script with a note beside each statement, the data and the plots in places of their own, and this Help. Nothing is installed and nothing is sent; the engine runs on this computer and the projects stay in this browser.",
  );
  // Under Topics, a panel for each section of the Topics pane, with its count and a sentence.
  await expect(home(page).getByText("Topics", { exact: true })).toBeVisible();
  await expect(opener(page, "Packages 10")).toHaveText(/^Packages\s*10\s*$/);
  await expect(panel(page, "Packages 10")).toContainText(
    "Every function, grouped by what it does. A package's page lists its functions, each with one line.",
  );
  await expect(opener(page, "Errors and warnings 144")).toHaveText(
    /^Errors and warnings\s*144\s*$/,
  );
  await expect(panel(page, "Errors and warnings 144")).toContainText(
    "Every message Zeff gives has a code, such as Z0103. Its page gives the meaning, the usual causes, an example and the fix.",
  );
  await expect(opener(page, "Using Zemp Lite 13")).toHaveText(/^Using Zemp Lite\s*13\s*$/);
  await expect(panel(page, "Using Zemp Lite 13")).toContainText(
    "How to work in this app: projects and scripts, running a script and reading its notes, the Data and Plots places, shortcuts, and where the work is kept.",
  );
  // The packages' names as small links inside their panel, in the engine's order.
  await expect(
    panel(page, "Packages 10").getByRole("list", { name: "The packages" }).getByRole("button"),
  ).toHaveText(PACKAGES.map(([name]) => name));

  // One after another, not side by side: each panel under the one before, the same width.
  const boxes = await home(page)
    .locator("section.panel")
    .evaluateAll((all) =>
      all.map((one) => {
        const box = one.getBoundingClientRect();
        return { left: box.left, top: box.top, bottom: box.bottom, width: box.width };
      }),
    );
  expect(boxes).toHaveLength(5);
  for (let at = 1; at < boxes.length; at++) {
    expect(boxes[at]!.top).toBeGreaterThanOrEqual(boxes[at - 1]!.bottom);
    expect(Math.abs(boxes[at]!.left - boxes[0]!.left)).toBeLessThan(1);
    expect(Math.abs(boxes[at]!.width - boxes[0]!.width)).toBeLessThan(1);
  }
  // The pane at the right lists the panels, each going to its place.
  const parts = onThisPage(page).getByRole("list", { name: "On this page" }).getByRole("button");
  await expect(parts).toHaveText(PANELS);
  await page.setViewportSize({ width: 1280, height: 420 });
  await press(parts.nth(4));
  await expect(opener(page, "Using Zemp Lite 13")).toBeInViewport();
  // The last panel cannot reach the top of the page: it is marked all the same, as the one
  // gone to, until the page is moved.
  await expect(parts.nth(4)).toHaveAttribute("aria-current", "location");
  await page.waitForTimeout(150);
  await expect(parts.nth(4)).toHaveAttribute("aria-current", "location");
  await press(parts.nth(0));
  await expect(parts.nth(0)).toHaveAttribute("aria-current", "location");
  await expect(parts.nth(4)).not.toHaveAttribute("aria-current", "location");
});

test("each topic's panel opens its page, and a package's link its package", async ({
  page,
  press,
}) => {
  await open(page, press);
  // Packages: the list of the packages, each with its count, a page of the history.
  await press(opener(page, "Packages 10"));
  await expect(title(page)).toHaveText("Packages");
  await expect(home(page).getByRole("heading", { level: 3 })).toHaveText("Packages");
  await expect(
    home(page).getByRole("list", { name: "Facts of Packages" }).getByRole("listitem"),
  ).toHaveText(["10 packages", "255 functions in Zeff 0.8.0"]);
  await expect(home(page).getByRole("row")).toHaveText(
    PACKAGES.map(([name, count]) => new RegExp(`^${name}\\s*${count} functions · tier \\d$`)),
  );
  await press(home(page).getByRole("button", { name: "stats", exact: true }));
  await expect(title(page)).toHaveText("stats");
  await press(back(page));
  await expect(title(page)).toHaveText("Packages");
  await press(back(page));
  await expect(homeButton(page)).toHaveAttribute("aria-current", "page");
  // Errors and warnings: the codes by family.
  await press(opener(page, "Errors and warnings 144"));
  await expect(title(page)).toHaveText("Errors and warnings");
  await expect(home(page).getByRole("heading", { level: 4 })).toHaveCount(12);
  await press(back(page));
  // Using Zemp Lite: the list of the app's own pages.
  await press(opener(page, "Using Zemp Lite 13"));
  await expect(title(page)).toHaveText("Using Zemp Lite");
  await expect(home(page).getByRole("row")).toHaveCount(13);
  await press(back(page));
  // A package's own link, inside the panel, opens that package and not the list.
  await press(panel(page, "Packages 10").getByRole("button", { name: "regress", exact: true }));
  await expect(title(page)).toHaveText("regress");
  await expect(home(page).getByRole("row")).toHaveCount(10);
  await press(back(page));
  await expect(home(page).getByRole("heading", { level: 3 })).toHaveText("Help");
  // The panel answers anywhere on it, not on its heading alone.
  await panel(page, "Errors and warnings 144").scrollIntoViewIfNeeded();
  const box = (await panel(page, "Errors and warnings 144").boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height - 12);
  await expect(title(page)).toHaveText("Errors and warnings");
});

test("there is no Index of functions: every function is reached from its package, from search and from links", async ({
  page,
  press,
}) => {
  test.slow();
  await open(page, press);
  // Neither the page nor its command.
  await expect(page.getByText("Index of functions")).toHaveCount(0);
  await page.keyboard.press("ControlOrMeta+k");
  const box = page.getByRole("combobox", { name: "Type a command" });
  await box.fill("index");
  await expect(page.getByRole("dialog", { name: "Commands" }).getByRole("option")).toHaveCount(0);
  await page.keyboard.press("Escape");

  // From its package: every function of every package, one by one, opens the engine's page.
  const reached = await page.evaluate(async () => {
    const pane = document.querySelector('[data-testid="help"]')!;
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
    const title = () => pane.querySelector('[data-testid="help-title"]')?.textContent?.trim();
    const shown = () => pane.querySelector<HTMLElement>('[data-testid="help-page"]');
    const press = (name: string) =>
      pane.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)!.click();
    const packages = [...shown()!.querySelectorAll<HTMLButtonElement>(".packages button")].map(
      (one) => one.innerText,
    );
    const missing: string[] = [];
    let functions = 0;
    for (const name of packages) {
      [...shown()!.querySelectorAll<HTMLButtonElement>(".packages button")]
        .find((one) => one.innerText === name)!
        .click();
      await settled(() => title() === name && shown()?.querySelector("table") !== null);
      const rows = () => [
        ...shown()!.querySelectorAll<HTMLButtonElement>("section:first-of-type tr button"),
      ];
      const count = rows().length;
      for (let at = 0; at < count; at++) {
        const called = rows()[at]!.innerText;
        rows()[at]!.click();
        const there = await settled(
          () =>
            title() === called &&
            [...(shown()?.querySelectorAll("h3") ?? [])].some(
              (h) => h.textContent?.trim() === called,
            ),
        );
        if (!there) missing.push(`${name}.${called}`);
        functions += 1;
        press("Back");
        await settled(() => title() === name && rows().length === count);
      }
      press("Back");
      await settled(() => title() === undefined);
    }
    return { packages: packages.length, functions, missing };
  });
  expect(reached).toEqual({ packages: 10, functions: 255, missing: [] });

  // From search, and from a link of a page.
  const field = bar(page).getByRole("combobox", { name: /^Search Help/ });
  await field.fill("lm");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(title(page)).toHaveText("reg");
  await press(home(page).getByRole("region", { name: "See also" }).getByRole("button").first());
  await expect(title(page)).not.toHaveText("reg");
});

test("Help: home, from ⌘K, opens Home from any place", async ({ page, press }) => {
  await scratch(page, press);
  await page.keyboard.press("ControlOrMeta+k");
  const box = page.getByRole("combobox", { name: "Type a command" });
  await box.fill("help home");
  await expect(
    page.getByRole("dialog", { name: "Commands" }).getByRole("option").first(),
  ).toContainText("Help: home");
  await box.press("Enter");
  await expect(home(page).getByRole("heading", { level: 3 })).toHaveText("Help");
  await expect(homeButton(page)).toHaveAttribute("aria-current", "page");
  // From a page of Help it is Home too, and Back returns to the page.
  await press(panel(page, "Packages 10").getByRole("button", { name: "regress", exact: true }));
  await expect(title(page)).toHaveText("regress");
  await page.keyboard.press("ControlOrMeta+k");
  await box.fill("help home");
  await box.press("Enter");
  await expect(home(page).getByRole("heading", { level: 3 })).toHaveText("Help");
  await press(back(page));
  await expect(title(page)).toHaveText("regress");
});

for (const theme of ["light", "dark"] as const) {
  test(`Home keeps to its column, to 12.5 pixels and 4.5 to 1, and answers the keyboard, in the ${theme} theme`, async ({
    page,
    press,
    browserName,
  }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await open(page, press);
    if (theme === "dark") await press(page.getByRole("switch", { name: "Dark" }));
    const fits = async () => {
      const pane = page.getByTestId("help").locator(".page");
      expect(
        await pane.evaluate((node) => node.scrollWidth - node.clientWidth),
      ).toBeLessThanOrEqual(0);
      const wide = await home(page)
        .locator("section.panel")
        .first()
        .evaluate((node) => node.getBoundingClientRect().width);
      expect(wide).toBeGreaterThan(300);
      expect(wide).toBeLessThanOrEqual(700);
    };
    await fits();
    expect(await smallestText(page)).toBeGreaterThanOrEqual(12.5);
    expect(await faintText(home(page))).toEqual([]);
    expect(await faintText(onThisPage(page))).toEqual([]);
    // With the panes closed the panels keep their measure; in a narrower window they fit.
    await press(bar(page).getByRole("button", { name: "Topics" }));
    await press(bar(page).getByRole("button", { name: "On this page" }));
    await fits();
    await press(bar(page).getByRole("button", { name: "Topics" }));
    await press(bar(page).getByRole("button", { name: "On this page" }));
    await page.setViewportSize({ width: 1000, height: 800 });
    await fits();
    await page.setViewportSize({ width: 1200, height: 800 });
    // The pointer on a panel: its edge is the accent's, and its words are as readable.
    await panel(page, "Using Zemp Lite 13").hover();
    expect(await faintText(home(page))).toEqual([]);
    // From the keyboard alone: a panel's button, then the links inside it, then the next panel.
    const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
    await opener(page, "Packages 10").focus();
    await page.keyboard.press(tab);
    await expect(
      panel(page, "Packages 10").getByRole("button", { name: "core", exact: true }),
    ).toBeFocused();
    for (let at = 0; at < 10; at++) await page.keyboard.press(tab);
    await expect(opener(page, "Errors and warnings 144")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(title(page)).toHaveText("Errors and warnings");
  });
}
