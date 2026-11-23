// The Help place as a whole (release 0.2.3, step 10): every kind of page it shows, in both
// themes, at 1,200 pixels and in a narrower window, with no text under 12.5 pixels, every
// text at 4.5 to 1 against its ground, and nothing wider than its column.
import type { Locator, Page } from "@playwright/test";
import { expect, faintText, smallestText, test, useExample } from "./support";

const READY = "engine Zeff 0.8.0 ready";

async function scratch(page: Page, press: (target: Locator) => Promise<void>) {
  await page.goto("/");
  await press(page.getByRole("button", { name: "Scratch project" }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await useExample(page);
}

const places = (page: Page) => page.getByRole("navigation", { name: "Places" });
const bar = (page: Page) => page.getByRole("toolbar", { name: "Help: its panes and its controls" });
const title = (page: Page) => page.getByTestId("help-title");
const shown = (page: Page) => page.getByTestId("help-page");
const field = (page: Page) => bar(page).getByRole("combobox", { name: /^Search Help/ });

for (const theme of ["light", "dark"] as const) {
  test(`every kind of page of Help keeps to 12.5 pixels, to 4.5 to 1 and to its column, at 1,200 pixels and narrower, in the ${theme} theme`, async ({
    page,
    press,
  }) => {
    test.slow();
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.emulateMedia({ colorScheme: theme });
    await scratch(page, press);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await press(places(page).getByRole("button", { name: "Help" }));
    await expect(page.getByTestId("help-counts")).toBeVisible();
    const narrow = page.getByRole("note").filter({ hasText: "1,200 pixels wide" });
    /** The page shown is sound, here and in a narrower window. */
    const sound = async (what: string) => {
      for (const width of [1200, 1000]) {
        await page.setViewportSize({ width, height: 800 });
        await (width < 1200 ? expect(narrow).toBeVisible() : expect(narrow).toHaveCount(0));
        expect(await smallestText(page), `${what} at ${width}`).toBeGreaterThanOrEqual(12.5);
        expect(await faintText(page.getByTestId("help")), `${what} at ${width}`).toEqual([]);
        const pane = page.getByTestId("help").locator(".page");
        expect(
          await pane.evaluate((node) => node.scrollWidth - node.clientWidth),
          `${what} at ${width}`,
        ).toBe(0);
        // The bar stays on one line: nothing of it is pushed under.
        const high = (await bar(page).boundingBox())!.height;
        expect(high, `${what} at ${width}`).toBeLessThan(48);
      }
      await page.setViewportSize({ width: 1200, height: 800 });
      await expect(narrow).toHaveCount(0);
    };
    const ask = async (name: string) => {
      await field(page).fill(name);
      await field(page).press("Enter");
      await expect(title(page)).toHaveText(name);
    };
    const panel = (name: string) =>
      shown(page).getByRole("heading", { name, level: 4 }).getByRole("button");

    await sound("Home");
    await press(panel("Packages"));
    await expect(title(page)).toHaveText("Packages");
    await sound("the packages");
    await press(shown(page).getByRole("button", { name: "data", exact: true }));
    await expect(title(page)).toHaveText("data");
    await sound("a package");
    await ask("reg");
    await sound("a function");
    await ask("quantile");
    await sound("a chooser");
    await press(shown(page).getByRole("button", { name: "quantile · of a distribution" }));
    await expect(title(page)).toHaveText("of a distribution");
    await sound("one function of two");
    await press(bar(page).getByRole("button", { name: "Home" }));
    await press(panel("Errors and warnings"));
    await expect(title(page)).toHaveText("Errors and warnings");
    await sound("the codes");
    await ask("Z0103");
    await sound("a code");
    await press(bar(page).getByRole("button", { name: "Home" }));
    await press(panel("Using Zemp Lite"));
    await expect(title(page)).toHaveText("Using Zemp Lite");
    await sound("the app's pages");
    await press(shown(page).getByRole("button", { name: "Finding help" }));
    await expect(title(page)).toHaveText("Finding help");
    await sound("a page of the app");
    await ask("a_learning");
    await sound("a name the engine has no page for");
    // The search's list, open over a page.
    await field(page).fill("summ");
    const list = page.getByRole("listbox", { name: "What was found" });
    await expect(list.getByRole("option").first()).toBeVisible();
    expect(await smallestText(page)).toBeGreaterThanOrEqual(12.5);
    expect(await faintText(list)).toEqual([]);
    await field(page).fill("xtreg");
    await expect(page.getByText("Nothing here is called")).toBeVisible();
    expect(await faintText(page.locator(".found"))).toEqual([]);
  });
}
