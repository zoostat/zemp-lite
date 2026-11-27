// The card of a word in a script (release 0.3.1, step 7; open decision #245, which redraws the
// card of #220, item 6, where it held the usage alone): on a function's name it holds the
// name and what the function does, its usage, what it matches in R and Stata, and the way to
// its page; where a name has two functions, the one the call would run. It is shown under the
// pointer, and for the keyboard by ⇧F1 with the cursor on the word; F1 opens the whole page.
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
  "w.summary([wage])",
  "",
].join("\n");

/** Put the cursor in a word of the script, as a press on it would. */
async function cursorIn(page: Page, word: Locator): Promise<void> {
  await editor(page).focus();
  await word.evaluate((node) => {
    const range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
}

const flat = (text: string | null) => (text ?? "").replace(/\s+/g, " ").trim();

test.beforeEach(async ({ page, press }) => {
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await write(page, SCRIPT);
});

test("resting on a function's name shows its card: its name and what it does, its usage, what it matches in R and Stata, and the way to its page", async ({
  page,
  mouseWorks,
}) => {
  test.skip(!mouseWorks, "this test browser does not deliver the mouse where it is aimed");
  const word = editor(page).locator(".cm-line").nth(1).getByText("reg", { exact: true });
  await rest(page, word);
  await expect(card(page)).toBeVisible();
  await expect(card(page).getByTestId("hover-name")).toHaveText("reg");
  const does = flat(await card(page).getByTestId("hover-does").textContent());
  expect(does.length).toBeGreaterThan(10);
  const usage = (await card(page).getByTestId("hover-usage").textContent()) ?? "";
  expect(usage.startsWith("data.reg(formula")).toBe(true);
  expect(usage.trimEnd().endsWith(")")).toBe(true);
  expect(usage.split("\n").length).toBeLessThanOrEqual(4);
  // The page of `reg` names no equivalent in Zeff 0.9.0: the card writes them from the engine's
  // index, as a page writes them.
  await expect(card(page).getByTestId("hover-equivalents")).toHaveText(
    "Equivalents: R lm(), fixest::feols(); Stata regress, reghdfe.",
  );
  // Nothing more of the page: no heading, no sentence of its description.
  const whole = (await card(page).textContent()) ?? "";
  for (const not of ["USAGE", "DESCRIPTION", "ARGUMENTS", "Fits the formula"]) {
    expect(whole, not).not.toContain(not);
  }
  // It is no smaller than the interface's smallest text, and no wider than 440 pixels.
  expect((await card(page).boundingBox())!.width).toBeLessThanOrEqual(440);
  expect(
    await card(page).evaluate((node) =>
      Math.min(
        ...[...node.querySelectorAll("*")].map((one) => parseFloat(getComputedStyle(one).fontSize)),
      ),
    ),
  ).toBeGreaterThanOrEqual(12.5);
  // The way to its page is in the card: the page's first line is what the card says the
  // function does, and its Usage is the card's, word for word.
  await card(page).getByTestId("hover-page").click();
  await expect(page.getByTestId("help-title")).toHaveText("reg");
  await expect(shown(page)).toContainText("Fits the formula by ordinary least squares");
  await expect(shown(page)).toContainText(does);
  const onPage = await shown(page).locator("pre").first().textContent();
  expect(flat(onPage)).toBe(flat(usage));
});

test("a name with two functions shows the card of the one the call would run", async ({
  page,
  mouseWorks,
}) => {
  test.skip(!mouseWorks, "this test browser does not deliver the mouse where it is aimed");
  const lines = editor(page).locator(".cm-line");
  await rest(page, lines.nth(2).getByText("histogram", { exact: true }));
  await expect(card(page)).toBeVisible();
  await expect(card(page).getByTestId("hover-name")).toHaveText("histogram");
  const ofFrame = (await card(page).getByTestId("hover-usage").textContent()) ?? "";
  expect(ofFrame).toContain("histogram(");
  // Away from the word the card goes; on the other call it is the other function's card.
  await rest(page, lines.nth(0).getByText("let", { exact: true }));
  await expect(card(page)).toHaveCount(0);
  await rest(page, lines.nth(3).getByText("histogram", { exact: true }));
  await expect(card(page)).toBeVisible();
  const ofPlot = (await card(page).getByTestId("hover-usage").textContent()) ?? "";
  expect(ofPlot).toContain("histogram(");
  expect(ofPlot).not.toBe(ofFrame);
});

test("⇧F1 shows the card of the word the cursor is on, by the keyboard alone, and Escape or a move of the cursor takes it away", async ({
  page,
}) => {
  const lines = editor(page).locator(".cm-line");
  // `dataset`: its page names what it matches, and the card says so in the page's words.
  await cursorIn(page, lines.nth(0).getByText("dataset", { exact: true }));
  await expect(card(page)).toHaveCount(0);
  await page.keyboard.press("Shift+F1");
  await expect(card(page)).toBeVisible();
  await expect(card(page).getByTestId("hover-name")).toHaveText("dataset");
  expect((await card(page).getByTestId("hover-usage").textContent()) ?? "").toContain("dataset(");
  await expect(card(page).getByTestId("hover-equivalents")).toHaveText(
    "Equivalents: R data(); Stata sysuse, webuse.",
  );
  await expect(card(page).getByTestId("hover-page")).toHaveText("Open its page →");
  // Escape takes it away and leaves the keyboard in the script.
  await page.keyboard.press("Escape");
  await expect(card(page)).toHaveCount(0);
  await expect(editor(page)).toBeFocused();
  // So does a move of the cursor.
  await page.keyboard.press("Shift+F1");
  await expect(card(page)).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(card(page)).toHaveCount(0);
  // `summary`, a name of two functions: the card of the one this call runs, a frame's.
  await cursorIn(page, lines.nth(4).getByText("summary", { exact: true }));
  await page.keyboard.press("Shift+F1");
  await expect(card(page).getByTestId("hover-name")).toHaveText("summary");
  expect((await card(page).getByTestId("hover-usage").textContent()) ?? "").toMatch(
    /^data\.summary\(/,
  );
  await expect(card(page).getByTestId("hover-equivalents")).toHaveText(
    "Equivalents: R summary(); Stata summarize.",
  );
  // `reg`, by the keyboard as under the pointer.
  await cursorIn(page, lines.nth(1).getByText("reg", { exact: true }));
  await page.keyboard.press("Shift+F1");
  await expect(card(page).getByTestId("hover-name")).toHaveText("reg");
  await expect(card(page).getByTestId("hover-equivalents")).toHaveText(
    "Equivalents: R lm(), fixest::feols(); Stata regress, reghdfe.",
  );
  // A word that is no function: what the language server says of it, as it says it, with no
  // way to a page.
  await cursorIn(page, lines.nth(1).getByText("w", { exact: true }).first());
  await page.keyboard.press("Shift+F1");
  await expect(card(page).getByTestId("hover-words")).toBeVisible();
  await expect(card(page).getByTestId("hover-page")).toHaveCount(0);
  await page.keyboard.press("Escape");
  // F1 opens the whole page, as before.
  await cursorIn(page, lines.nth(0).getByText("dataset", { exact: true }));
  await page.keyboard.press("F1");
  await expect(page.getByTestId("help-title")).toHaveText("dataset");
});
