// The hover in a script (release 0.2.4, step 9; open decision #220, item 6): the card under the
// pointer on a function's name holds that function's usage block and nothing else, the one the
// call would run where a name has two functions; F1 opens the whole page, as before.
import type { Locator, Page } from "@playwright/test";
import { editor, expect, test, write } from "./support";

const READY = "engine Zeff 0.9.0 ready";
const card = (page: Page) => page.getByTestId("hover");
const shown = (page: Page) => page.getByTestId("help-page");

/**
 * Rest the pointer on a word of the script, with the mouse itself. Where the test browser does
 * not deliver the mouse where it is aimed (WebKit on a Mac; see `support.ts`) these tests
 * stand aside, as the others that need the pointer do; on GitHub the mouse must work, so
 * there they are made in both engines.
 */
async function rest(page: Page, word: Locator): Promise<void> {
  const box = await word.boundingBox();
  if (box === null) throw new Error("the word is not on the screen");
  // Onto the word, and a little along it: a pointer that has just arrived is not yet resting.
  await page.mouse.move(box.x + box.width / 2 - 2, box.y + box.height / 2);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
}

const SCRIPT = [
  "let w = dataset(wages)",
  "let m = w.reg(wage ~ educ + exper, se: robust)",
  "let a = w.histogram(wage)",
  "let b = w.plot(x: wage).histogram()",
  "",
].join("\n");

test.beforeEach(async ({ page, press }) => {
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await write(page, SCRIPT);
});

test("resting on a function's name shows its usage block and nothing else of its page", async ({
  page,
  mouseWorks,
}) => {
  test.skip(!mouseWorks, "this test browser does not deliver the mouse where it is aimed");
  const word = editor(page).locator(".cm-line").nth(1).getByText("reg", { exact: true });
  await rest(page, word);
  await expect(card(page)).toBeVisible();
  const usage = (await card(page).textContent()) ?? "";
  expect(usage.startsWith("data.reg(formula")).toBe(true);
  expect(usage.trimEnd().endsWith(")")).toBe(true);
  // Nothing of the page but the usage: no first line, no heading, no sentence of it.
  for (const not of [
    "Linear regression",
    "USAGE",
    "DESCRIPTION",
    "ARGUMENTS",
    "Fits the formula",
  ]) {
    expect(usage, not).not.toContain(not);
  }
  expect(usage.split("\n").length).toBeLessThanOrEqual(4);

  // The whole page is a key away, and its Usage is the card's, word for word.
  await editor(page).focus();
  await word.evaluate((node) => {
    const range = document.createRange();
    range.selectNodeContents(node);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
  await page.keyboard.press("F1");
  await expect(page.getByTestId("help-title")).toHaveText("reg");
  await expect(shown(page)).toContainText("Fits the formula by ordinary least squares");
  const flat = (text: string) => text.replace(/\s+/g, " ").trim();
  const onPage = await shown(page).locator("pre").first().textContent();
  expect(flat(onPage ?? "")).toBe(flat(usage));
});

test("a name with two functions shows the usage of the one the call would run", async ({
  page,
  mouseWorks,
}) => {
  test.skip(!mouseWorks, "this test browser does not deliver the mouse where it is aimed");
  const lines = editor(page).locator(".cm-line");
  await rest(page, lines.nth(2).getByText("histogram", { exact: true }));
  await expect(card(page)).toBeVisible();
  const ofFrame = (await card(page).textContent()) ?? "";
  expect(ofFrame).toContain("histogram(");
  expect(ofFrame).not.toContain("DESCRIPTION");
  // Away from the word the card goes; on the other call it is the other function's usage.
  await rest(page, lines.nth(0).getByText("let", { exact: true }));
  await expect(card(page)).toHaveCount(0);
  await rest(page, lines.nth(3).getByText("histogram", { exact: true }));
  await expect(card(page)).toBeVisible();
  const ofPlot = (await card(page).textContent()) ?? "";
  expect(ofPlot).toContain("histogram(");
  expect(ofPlot).not.toContain("DESCRIPTION");
  expect(ofPlot).not.toBe(ofFrame);
});
