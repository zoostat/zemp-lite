// Every screen at a tablet's width, 1,024 by 768 pixels, the narrowest window Zemp Lite is laid
// out for (release 0.3.1, step 3; open decision #243, option A: a tablet held sideways is a
// small laptop): the computer's layout with nothing hidden, cut or overlapping, no sideways
// scroll, nothing under 12.5 pixels and nothing fainter than 4.5 to 1, in both themes. Each
// screen has tests of its own for what it does; this one takes every place through its states
// at that size, and each step of the release adds the screen it draws.
import type { Locator, Page } from "@playwright/test";
import { expect, faintText, notWhole, smallestText, test, useExample } from "./support";

const READY = "engine Zeff 0.9.0 ready";
const TABLET = { width: 1024, height: 768 };

type Press = (target: Locator) => Promise<void>;

/**
 * The screen as it stands is whole, and keeps to the floor of sizes and contrast. A control
 * that cannot be pressed in this state is drawn faint on purpose, and is named in `off`.
 */
async function whole(page: Page, what: string, off: string[] = []): Promise<void> {
  expect(page.viewportSize(), what).toEqual(TABLET);
  expect(await notWhole(page), `${what}: not whole`).toEqual([]);
  expect(await smallestText(page), `${what}: the smallest text`).toBeGreaterThanOrEqual(12.5);
  const faint = await faintText(page.locator("body"));
  expect(
    faint.filter((one) => !off.some((name) => one.startsWith(`${name}: `))),
    `${what}: faint text`,
  ).toEqual([]);
  // No page says that the window is too narrow: this one is wide enough.
  await expect(page.getByTestId("computer-notice"), what).toHaveCount(0);
}

const places = (page: Page) => page.getByRole("navigation", { name: "Places" });
const bar = (page: Page, place: string) =>
  page.getByRole("toolbar", { name: `${place}: its panes and its controls` });

/** Open every pane of a place that is closed, by its link in the place's bar. */
async function openPanes(page: Page, press: Press, place: string): Promise<void> {
  const closed = bar(page, place).locator('button.link[aria-pressed="false"]');
  for (let left = await closed.count(); left > 0; left -= 1) await press(closed.first());
  await expect(closed).toHaveCount(0);
}

async function scratch(page: Page, press: Press): Promise<void> {
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await useExample(page);
}

test.use({ viewport: TABLET });

for (const theme of ["light", "dark"] as const) {
  test.describe(`at 1,024 by 768 in the ${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
    });

    test.describe("a first visit", () => {
      test.use({ firstVisit: true });

      test("the front page, once the engine runs", async ({ page }) => {
        await page.goto("/");
        await expect(page.getByRole("button", { name: "Start" })).toBeEnabled();
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await whole(page, "the front page");
      });
    });

    test("the projects screen: as it opens, a name asked, a row's menu", async ({
      page,
      press,
    }) => {
      await page.goto("/");
      await expect(page.getByRole("button", { name: /^Scratch project/ })).toBeVisible();
      await whole(page, "the projects screen");
      await press(page.getByRole("button", { name: /^New project/ }));
      const name = page.getByLabel("The name of the new project");
      await expect(name).toBeVisible();
      await whole(page, "the projects screen, a name asked");
      await name.fill("Seven");
      await name.press("Enter");
      await expect(page.getByRole("status")).toHaveText(READY);
      await press(page.getByRole("button", { name: "Projects ▾" }));
      const recent = page.getByRole("region", { name: "Recent projects" });
      await press(recent.getByRole("button", { name: "Actions for Seven", exact: true }));
      await expect(page.getByRole("menu", { name: "Actions for Seven" })).toBeVisible();
      await whole(page, "the projects screen, a row's menu open");
    });

    test("Script: as it opens, run, with every pane open, the commands, the largest code", async ({
      page,
      press,
    }) => {
      await scratch(page, press);
      await whole(page, "Script, not run");
      await press(page.getByRole("button", { name: "Run", exact: true }));
      await expect(page.getByRole("status")).toHaveText("done");
      await whole(page, "Script, run");
      await openPanes(page, press, "Script");
      await whole(page, "Script, every pane open");
      await page.keyboard.press("ControlOrMeta+k");
      await expect(page.getByRole("dialog", { name: "Commands" })).toBeVisible();
      await whole(page, "Script, the commands open");
      await page.keyboard.press("Escape");
      const larger = page.getByRole("button", { name: "Larger code text" });
      while (await larger.isEnabled()) await press(larger);
      await expect(larger).toBeDisabled();
      await whole(page, "Script, the largest code text", ["A+"]);
    });

    for (const place of ["Data", "Plots", "Paper", "Help"]) {
      test(`${place}: as it opens after a run, and with every pane open`, async ({
        page,
        press,
      }) => {
        test.slow(place === "Paper");
        await scratch(page, press);
        await press(page.getByRole("button", { name: "Run", exact: true }));
        await expect(page.getByRole("status")).toHaveText("done");
        await press(places(page).getByRole("button", { name: place, exact: true }));
        await expect(bar(page, place)).toBeVisible();
        if (place === "Help") await expect(page.getByTestId("help-counts")).toBeVisible();
        if (place === "Paper") {
          await expect(page.getByRole("region", { name: "No paper is open" })).toBeVisible();
        }
        await whole(page, `${place}, as it opens`);
        await openPanes(page, press, place);
        await whole(page, `${place}, every pane open`);
      });
    }

    test("Help: a function's page, the search's list, a page of Using Zemp Lite", async ({
      page,
    }) => {
      await page.goto("/#/help/name/reg");
      await expect(page.getByTestId("help-title")).toHaveText("reg");
      await expect(page.getByRole("status")).toHaveText(READY);
      await whole(page, "Help, the page of reg");
      const field = bar(page, "Help").getByRole("combobox");
      await field.fill("lm");
      await expect(bar(page, "Help").getByRole("listbox")).toBeVisible();
      await whole(page, "Help, the search's list open");
      await field.press("Escape");
      await page.goto("/#/help/using/the-data-place");
      await expect(page.getByTestId("help-title")).toBeVisible();
      await whole(page, "Help, a page of Using Zemp Lite");
    });
  });
}
