// An address that opens a page of Help (release 0.2.4, step 3; open decision #220, item 1): the
// landing page's links lead into Help, which is a place inside a project, so such an address
// opens the Scratch project on the Help place at the page named.
import type { Page } from "@playwright/test";
import { expect, test } from "./support";

const READY = "engine Zeff 0.8.0 ready";
const bar = (page: Page) => page.getByRole("toolbar", { name: "Help: its panes and its controls" });
const title = (page: Page) => page.getByTestId("help-title");
const shown = (page: Page) => page.getByTestId("help-page");
const places = (page: Page) => page.getByRole("navigation", { name: "Places" });

/** The app has opened the Scratch project on the Help place. */
async function inHelp(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/app\/#\/p\/scratch$/);
  await expect(places(page).getByRole("button", { name: "Help" })).toHaveAttribute(
    "aria-current",
    "page",
  );
}

test("the address of Help alone opens Home, in the Scratch project", async ({ page }) => {
  await page.goto("/app/#/help");
  await inHelp(page);
  await expect(page.getByTestId("help-counts")).toBeVisible();
  await expect(bar(page).getByRole("button", { name: "Home" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  // It is the first page of this visit's reading: there is nowhere to go back to in Help.
  await expect(bar(page).getByRole("button", { name: "Back" })).toBeDisabled();
});

test("an address opens a page of Using Zemp Lite, a function's, a package's and a code's", async ({
  page,
}) => {
  await page.goto("/app/#/help/using/finding-help");
  await inHelp(page);
  await expect(title(page)).toHaveText("Finding help");
  await expect(shown(page).getByRole("heading", { level: 3 })).toHaveText("Finding help");

  await page.goto("/app/#/help/name/reg");
  await inHelp(page);
  await expect(title(page)).toHaveText("reg");
  await expect(shown(page)).toContainText("Linear regression by least squares");

  await page.goto("/app/#/help/package/regress");
  await inHelp(page);
  await expect(title(page)).toHaveText("regress");
  await expect(shown(page).getByRole("button", { name: "reg", exact: true })).toBeVisible();

  await page.goto("/app/#/help/code/Z0101");
  await inHelp(page);
  await expect(title(page)).toHaveText("Z0101");
  await expect(shown(page)).toContainText("no such name");

  await page.goto("/app/#/help/codes/Z01xx");
  await inHelp(page);
  await expect(shown(page).getByRole("button", { name: "Z0101", exact: true })).toBeVisible();
});

test("an address opens one function of a name with two, and the bare name its chooser", async ({
  page,
}) => {
  await page.goto("/app/#/help/name/histogram/plot/Frame");
  await inHelp(page);
  await expect(title(page)).toHaveText("of a frame");
  await expect(shown(page)).toContainText("A histogram of a variable of a frame");
  await page.goto("/app/#/help/name/histogram");
  await inHelp(page);
  await expect(shown(page)).toContainText("histogram is two functions.");
});

test("an address that names no page opens Home, and a name the engine has not is answered by the engine", async ({
  page,
}) => {
  await page.goto("/app/#/help/using/no-such-page");
  await inHelp(page);
  await expect(page.getByTestId("help-counts")).toBeVisible();
  await page.goto("/app/#/help/name/nonesuch");
  await inHelp(page);
  await expect(shown(page)).toContainText("no function or package is called");
});

test("an address of Help given while a project is open goes to the Scratch project's Help", async ({
  page,
  press,
}) => {
  await page.goto("/app/");
  await press(page.getByRole("button", { name: "Scratch project" }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await page.evaluate(() => {
    window.location.hash = "#/help/using/getting-started";
  });
  await inHelp(page);
  await expect(title(page)).toHaveText("Getting started");
  // The script is a click away, and Help returns to the page.
  await press(places(page).getByRole("button", { name: "Script" }));
  await press(places(page).getByRole("button", { name: "Help" }));
  await expect(title(page)).toHaveText("Getting started");
});

test.describe("a first visit", () => {
  test.use({ firstVisit: true });

  test("an address of Help waits for the engine to be started, then opens its page", async ({
    page,
  }) => {
    await page.goto("/app/#/help/using/getting-started");
    const open = page.getByRole("button", { name: "Open Zemp Lite" });
    await expect(open).toBeEnabled({ timeout: 30_000 });
    await open.click();
    await inHelp(page);
    await expect(title(page)).toHaveText("Getting started");
  });
});
