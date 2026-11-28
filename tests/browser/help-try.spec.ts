// Try in the console, under an example of a help page (release 0.3.1, step 11b; open decision
// #245, as completed on 28 November 2026: it joins 0.3's Run and Copy to script). The
// example's last statement, as it stands in the page, goes to the console's field at the foot
// of the window, with the cursor, for the reader to change and to run with Return in their own
// project; what it needs of the statements above it is run in the console first. Help stays
// shown, and the script is not changed.
import type { Locator, Page } from "@playwright/test";
import { expect, faintText, scriptText, smallestText, test, write } from "./support";

const READY = "engine Zeff 0.9.0 ready";
const shown = (page: Page) => page.getByTestId("help-page");
const title = (page: Page) => page.getByTestId("help-title");
const places = (page: Page) => page.getByRole("navigation", { name: "Places" });
/** Those of the page's EXAMPLES, which run one after another as one script. */
const listed = (page: Page) =>
  shown(page).getByRole("region", { name: "Examples", exact: true }).getByTestId("example");
const tryIt = (example: Locator) => example.getByRole("button", { name: "Try in the console" });
const typed = (example: Locator) =>
  example.getByRole("textbox", { name: /^The statements of the example/ });
const status = (example: Locator) => example.getByTestId("example-status");
const line = (page: Page) => page.getByRole("textbox", { name: /^Console/ });
const entries = (page: Page) =>
  page.getByRole("log", { name: "Console output" }).getByTestId("entry");
const RAN = /^run by the engine in [\d.]+ m?s$/;
const IN_CONSOLE = "in the console below: press Return there to run it";

/** The Scratch project with a short script of its own, and Help open at the page of `mean`. */
async function atMean(page: Page, press: (target: Locator) => Promise<void>): Promise<void> {
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await write(page, "let a = 6\n");
  await press(places(page).getByRole("button", { name: "Help" }));
  await page.getByRole("combobox", { name: /^Search Help/ }).fill("mean");
  await page.keyboard.press("Enter");
  await expect(title(page)).toHaveText("mean");
  await expect(status(listed(page)).filter({ hasNotText: RAN })).toHaveCount(0, {
    timeout: 20_000,
  });
}

test("Try in the console puts an example's last statement in the console's field, runs what it needs first, and Return runs it there", async ({
  page,
  press,
}) => {
  await atMean(page, press);
  const first = listed(page).first();
  await expect(typed(first)).toHaveValue("let wages = dataset(wages)\nwages.mean(wage)");
  // After Run, Reset and Copy to script, in the example's row.
  await expect(first.locator(".bar button")).toHaveText([
    "Run",
    "Reset",
    "Copy to script",
    "Try in the console",
  ]);
  await press(tryIt(first));
  // Its last statement stands in the console's field, with the cursor at its end.
  await expect(line(page)).toHaveValue("wages.mean(wage)");
  await expect(line(page)).toBeFocused();
  expect(
    await line(page).evaluate((field: HTMLInputElement) => [
      field.selectionStart,
      field.selectionEnd,
    ]),
  ).toEqual([16, 16]);
  await expect(status(first)).toHaveText(IN_CONSOLE);
  // What it needs was run in the console first: the binding above it, and nothing else.
  await expect(entries(page)).toHaveCount(1);
  await expect(entries(page).first()).toContainText("let wages = dataset(wages)");
  await expect(entries(page).first()).toHaveClass(/done/);
  // Help is still the place shown, on the same page.
  await expect(places(page).getByRole("button", { name: "Help" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(title(page)).toHaveText("mean");
  // Return runs it there, in the reader's project: what the page says it prints.
  await page.keyboard.press("Enter");
  await expect(entries(page)).toHaveCount(2);
  await expect(entries(page).nth(1)).toContainText("wages.mean(wage)");
  await expect(entries(page).nth(1).getByTestId("console-printed")).toHaveText("27.3695");
  await expect(line(page)).toHaveValue("");

  // The next example uses what the first bound, which the console has kept: it is not run
  // again. The statement is taken as it stands in the page, changed by the reader.
  const second = listed(page).nth(1);
  await typed(second).fill("wages.mean(hours)");
  await press(tryIt(second));
  await expect(line(page)).toHaveValue("wages.mean(hours)");
  await expect(line(page)).toBeFocused();
  await expect(entries(page)).toHaveCount(2);
  // Changed in the console before it is run.
  await line(page).fill("wages.mean(hours) + a");
  await page.keyboard.press("Enter");
  await expect(entries(page)).toHaveCount(3);
  // It ran after the script, whose own binding it sees: the mean of the hours, and six.
  await expect(entries(page).nth(2)).toHaveClass(/done/);
  await expect(entries(page).nth(2).getByTestId("console-printed")).toHaveText("43.9446");
  // ↑ recalls what the reader ran, never what was brought along for it.
  await line(page).press("ArrowUp");
  await expect(line(page)).toHaveValue("wages.mean(hours) + a");
  await line(page).press("ArrowUp");
  await expect(line(page)).toHaveValue("wages.mean(wage)");
  await line(page).press("ArrowUp");
  await expect(line(page)).toHaveValue("wages.mean(wage)");
  await line(page).fill("");

  // The script is as it was: nothing was added to it.
  await press(places(page).getByRole("button", { name: "Script" }));
  expect(await scriptText(page)).toBe("let a = 6\n");
});

test("an example tried by the keyboard alone, one that stands apart from the page's examples, and one with nothing to try", async ({
  page,
  press,
}) => {
  await atMean(page, press);
  // The wrong call of "A common mistake": one statement, with the bindings of the examples.
  const apart = shown(page)
    .getByRole("region", { name: "A common mistake", exact: true })
    .getByTestId("example");
  await tryIt(apart).focus();
  await page.keyboard.press("Enter");
  await expect(line(page)).toHaveValue("dataset(wages).mean(log(wage))");
  await expect(line(page)).toBeFocused();
  await expect(entries(page)).toHaveCount(1);
  await expect(entries(page).first()).toContainText("let wages = dataset(wages)");
  // Run there, it says what the page says: the engine's error, with its code.
  await page.keyboard.press("Enter");
  await expect(entries(page)).toHaveCount(2);
  await expect(entries(page).nth(1)).toHaveClass(/failed/);
  await expect(entries(page).nth(1)).toContainText("Z0401");
  // An example the reader has emptied has nothing to try, and says so; the console is as it was.
  const first = listed(page).first();
  await typed(first).fill("// nothing here\n");
  await press(tryIt(first));
  await expect(status(first)).toHaveText("there is no statement here to try");
  await expect(line(page)).toHaveValue("");
  await expect(entries(page)).toHaveCount(2);
  // Run takes the words away.
  await typed(first).fill("mean([1, 2, 3])");
  await press(first.getByRole("button", { name: "Run the example" }));
  await expect(status(first)).toHaveText(RAN);
});

for (const theme of ["light", "dark"] as const) {
  test(`Try in the console and what it brings to the console keep to the sizes and the contrast, in the ${theme} theme`, async ({
    page,
    press,
  }) => {
    await atMean(page, press);
    if (theme === "dark") await press(page.getByRole("switch", { name: "Dark" }));
    const first = listed(page).first();
    await expect(tryIt(first)).toHaveAttribute(
      "title",
      /^Put the example's last statement in the console below/,
    );
    await press(tryIt(first));
    await expect(entries(page)).toHaveCount(1);
    await expect(status(first)).toHaveText(IN_CONSOLE);
    expect(await smallestText(page)).toBeGreaterThanOrEqual(12.5);
    expect(await faintText(first)).toEqual([]);
    expect(await faintText(page.getByRole("log", { name: "Console output" }))).toEqual([]);
    // The button is as high as its neighbours and on their line.
    const boxes = await first
      .locator(".bar button")
      .evaluateAll((all) =>
        all.map((one) => one.getBoundingClientRect()).map((b) => [b.top, b.height]),
      );
    expect(new Set(boxes.map(([top]) => Math.round(top!))).size).toBe(1);
    expect(new Set(boxes.map(([, height]) => Math.round(height!))).size).toBe(1);
  });
}
