// The methods Zeff 0.9.0 brought, through the screens (release 0.3, step 5; open decision
// #112): a logistic regression with `glm`, its odds ratios, a marginal effect, the
// classification table and the ROC curve of `curve`. The app builds nothing for them: the
// engine gives each its print, its type, its page and its plot, and what is held here is that
// the app shows them as it shows every other function's. What the page prints for the script
// is held to the released `zeff run` in `output.spec.ts`, and Zeff's own sample project of
// binary outcomes in `samples.spec.ts`.
import { readFileSync } from "node:fs";
import type { Locator, Page } from "@playwright/test";
import { cursorTo, editor, expect, test, wholeScript, write } from "./support";

const READY = "engine Zeff 0.9.0 ready";
const SCRIPT = readFileSync(new URL("../scripts/binary.zeff", import.meta.url), "utf8");
type Press = (target: Locator) => Promise<void>;

const note = (page: Page, line: number) =>
  page.locator(`[data-testid="note"][data-line="${line}"]`);
const block = (page: Page, line: number) =>
  page.locator(`[data-testid="block"][data-line="${line}"]`);
const places = (page: Page) => page.getByRole("navigation", { name: "Places" });
const shown = (page: Page) => page.getByTestId("help-page");
const title = (page: Page) => page.getByTestId("help-title");

async function scratch(page: Page, press: Press) {
  await page.emulateMedia({ colorScheme: "light" });
  await page.setViewportSize({ width: 1280, height: 3200 });
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await write(page, SCRIPT);
  await expect(page.locator("header.top")).toContainText("· saved");
}

/** The colour a word of the code is drawn in. */
async function drawn(page: Page, word: string) {
  const span = editor(page)
    .locator("span", { hasText: new RegExp(`^${word}$`) })
    .first();
  return span.evaluate((node) => getComputedStyle(node).color);
}

test("a binary model runs as any other: each statement with its note and its print, and the separated fit under its line", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("ended with exit code 1");
  await wholeScript(page);
  // The notes: the name each statement binds and the type the engine names; a statement that
  // prints is named by the first line of its print.
  await expect(note(page, 2)).toHaveText(/^lg\s*GlmFit · N 18,390\s*›?$/);
  await expect(note(page, 3)).toContainText("glm");
  await expect(note(page, 3)).toContainText("union ~ educ + exper + female");
  await expect(note(page, 5)).toContainText("margins");
  await expect(note(page, 7)).toHaveText(/^roc\s*TestResult · N 18,390\s*›?$/);
  // The odds ratios, the marginal effect and the classification table, as the engine prints them.
  await expect(block(page, 4)).toContainText("odds ratio");
  await expect(block(page, 4)).toContainText("exp of the coefficients");
  await expect(block(page, 5)).toContainText("average marginal effects");
  await expect(block(page, 5)).toContainText("on the scale of the probability");
  await expect(block(page, 6)).toContainText("sensitivity");
  await expect(block(page, 6)).toContainText("specificity");
  // The fit that cannot be made: the engine's error under its line, and nothing after it run.
  const failed = block(page, 10);
  await expect(failed).toHaveClass(/failed/);
  const error = failed.getByTestId("said");
  await expect(error).toContainText("Z0803");
  await expect(error).toContainText("`dose` perfectly predicts `cured` (separation)");
  await expect(error).toContainText("estimates diverge; maximum likelihood does not exist");
  await expect(error).toContainText("drop or combine the predictor");
  await expect(note(page, 10)).toContainText("Z0803");
  await expect(block(page, 11)).toHaveCount(0);
  await expect(note(page, 11)).toContainText("not run");
  // Explain opens the engine's page for the code, in place.
  await press(failed.getByRole("button", { name: "Explain" }));
  await expect(failed.getByTestId("explained")).toContainText("Z0803");
});

test("the ROC curve is drawn under its statement and stands in the Plots place, in both themes of the app", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("ended with exit code 1");
  await wholeScript(page);
  // Under its statement, by the engine, from the plot its run kept: the fit that fails
  // further down the script takes no figure with it (release 0.3, step 7b).
  const figure = page.locator('[data-testid="figure"][data-line="8"] img');
  await expect(figure).toBeVisible({ timeout: 30_000 });
  expect(await figure.getAttribute("src")).toMatch(/^data:image\/svg\+xml/);
  await press(places(page).getByRole("button", { name: "Plots" }));
  const list = page
    .getByRole("complementary", { name: "Plots: the left pane" })
    .getByRole("region", { name: "Plots of the run" });
  await expect(list.getByRole("listitem")).toHaveCount(1);
  const large = page.getByTestId("plots").locator(".stage img");
  await expect(large).toBeVisible({ timeout: 30_000 });
  const light = await large.getAttribute("src");
  expect(light).toMatch(/^data:image\/svg\+xml/);
  // In the dark theme it is there as it was: a figure stays light, as its exports are.
  await press(page.getByRole("switch", { name: "Dark" }));
  await expect(large).toBeVisible();
  expect(await large.getAttribute("src")).toBe(light);
});

test("the new names are the engine's in the editor: coloured, completed, their usage shown, and F1 opens the page", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  // Coloured as functions, as `reg` is (the design guide's blue), in both themes.
  for (const name of ["glm", "margins", "confusion", "curve"]) {
    expect(await drawn(page, name), name).toBe("rgb(31, 99, 194)");
  }
  await press(page.getByRole("switch", { name: "Dark" }));
  expect(await drawn(page, "glm")).toBe("rgb(140, 188, 255)");
  await press(page.getByRole("switch", { name: "Dark" }));
  // Completed after a dot, from the language server.
  await write(page, "let wages = dataset(wages)\nwages.gl");
  const offers = page.locator(".cm-tooltip-autocomplete");
  await expect(offers).toBeVisible();
  await press(offers.getByRole("option", { name: /^glm/ }).first());
  await expect.poll(() => editor(page).locator(".cm-line").nth(1).textContent()).toBe("wages.glm");
  // The usage as the call is opened.
  await page.keyboard.press("Escape");
  await page.keyboard.type("(");
  const usage = page.getByTestId("usage");
  await expect(usage).toBeVisible();
  await expect(usage).toContainText("glm(");
  await expect(usage).toContainText("family");
  await page.keyboard.press("Escape");
  // F1 on the name opens its page in Help.
  await write(page, SCRIPT);
  await cursorTo(page, 2);
  await editor(page).locator(".cm-line").nth(1).getByText("glm", { exact: true }).click();
  await page.keyboard.press("F1");
  await expect(title(page)).toHaveText("glm");
  await expect(shown(page)).toContainText("logistic and probit regression of a binary outcome");
});

test("Help holds the package glm and the pages of the new functions, found by their names in R and Stata", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await press(places(page).getByRole("button", { name: "Help" }));
  const field = page.getByRole("combobox", { name: /^Search Help/ });
  const options = page.getByRole("listbox", { name: "What was found" }).getByRole("option");
  // Stata's `logit`: Zeff's own `logit` and `inv_logit` first, then `glm`, which is Stata's.
  await field.fill("logit");
  await expect(options).toHaveCount(3);
  await expect(options.nth(2)).toContainText("glm");
  await expect(options.nth(2)).toContainText("Stata logit");
  await press(options.nth(2));
  await expect(title(page)).toHaveText("glm");
  // The page is read whole: its sections, and the table of R and Stata.
  const sections = page
    .getByRole("navigation", { name: "On this page" })
    .getByRole("list")
    .getByRole("button");
  for (const name of ["Usage", "Arguments", "Coming from R or Stata", "Examples"]) {
    await expect(sections.filter({ hasText: new RegExp(`^${name}$`) })).toHaveCount(1);
  }
  await expect(shown(page).getByRole("columnheader")).toHaveText(["Zeff", "R", "Stata"]);
  // R's name for the ROC curve, and the marginal effects by their own name.
  await field.fill("lroc");
  await expect(options.first()).toContainText("curve");
  await field.fill("margins");
  await press(options.first());
  await expect(title(page)).toHaveText("margins");
  await expect(shown(page)).toContainText("Marginal effects and adjusted predictions");
  // The package's page lists its three functions.
  await field.fill("confusion");
  await press(options.first());
  await expect(title(page)).toHaveText("confusion");
  await press(
    page
      .getByRole("navigation", { name: "Where this page stands" })
      .getByRole("button", { name: "glm", exact: true }),
  );
  await expect(title(page)).toHaveText("glm");
  await expect(shown(page).getByRole("row")).toHaveCount(3);
  await expect(shown(page)).toContainText("3 functions in Zeff 0.9.0");
});
