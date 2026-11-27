// Tables and figures from scripts, refreshed by Run (release 0.3, step 15a): a paper sets what
// scripts wrote with `export`; an export it lacks is named with the script that writes it;
// **Run** in the Paper place runs the scripts whose files the paper uses, and the page is set
// again with what they wrote; and a file a run writes again redraws the page, whichever place
// the run was asked from.
import type { Locator, Page } from "@playwright/test";
import { countRuns, expect, scriptText, test, write } from "./support";

const READY = "engine Zeff 0.9.0 ready";
const SET = /^Typst 0\.15\.1 · set in \d+ ms$/;

type Press = (target: Locator) => Promise<void>;

const places = (page: Page) => page.getByRole("navigation", { name: "Places" });
const bar = (page: Page) =>
  page.getByRole("toolbar", { name: "Paper: its panes and its controls" });
const source = (page: Page) => page.getByRole("textbox", { name: "The paper's source" });
const foot = (page: Page) => page.getByTestId("paper-typst");
const sheets = (page: Page) => page.getByTestId("paper-page");
const standing = (page: Page) => page.getByTestId("paper-standing");
const lacking = (page: Page) => page.getByTestId("paper-lacking");
const stale = (page: Page) => page.getByTestId("paper-stale");
const run = (page: Page) => page.getByRole("button", { name: "Run", exact: true });

/** A script that writes a table for a paper and a figure, from the wages that ship with Zeff. */
const script = (terms: string) =>
  [
    "let w = dataset(wages).where(year == 2019)",
    `let m = w.reg(wage ~ ${terms}, se: robust)`,
    'report([m]).export("output/fit.typ")',
    'w.scatter(educ, wage).export("output/wages.svg")',
    "",
  ].join("\n");

const PAPER = [
  '#show math.equation: set text(font: "Libertinus Math")',
  "= Wages and schooling",
  "",
  '#include "../output/fit.typ"',
  "",
  '#image("../output/wages.svg", width: 70%)',
  "",
].join("\n");

/** The Scratch project with the script of the test in place of its first, not run. */
async function opened(page: Page, press: Press, terms = "educ"): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await write(page, script(terms));
  await expect(page.getByText("saving")).toHaveCount(0);
}

/** Make a paper with this text, in the Paper place. */
async function paper(page: Page, press: Press, text: string): Promise<void> {
  await press(places(page).getByRole("button", { name: "Paper" }));
  await press(bar(page).getByRole("button", { name: "New paper…" }));
  await page.getByRole("textbox", { name: "The new paper's name" }).press("Enter");
  await expect(page.getByTestId("paper-path")).toHaveText("paper/paper.typ");
  await source(page).focus();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.insertText(text);
  await expect(page.locator("header .file")).toHaveText("/ paper.typ · saved");
}

/** The first page's picture, once the browser has drawn it: its address. */
async function drawn(page: Page): Promise<string> {
  const picture = sheets(page).first().locator("img");
  await expect
    .poll(() => picture.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
    .toBe(true);
  return (await picture.getAttribute("src")) ?? "";
}

test("an export the paper lacks is named with the script that writes it, and Run in Paper makes it and sets the page", async ({
  page,
  press,
}) => {
  test.slow();
  const runs = await countRuns(page);
  await opened(page, press);
  await paper(page, press, PAPER);
  // Nothing has run: Typst lacks the table, and the pane says which script writes it.
  await expect(standing(page)).toContainText("Typst refuses the text as it stands (1 error).");
  await expect(lacking(page)).toHaveText([
    "output/fit.typ is written by scripts/main.zeff: press Run to make it.",
  ]);
  await expect(sheets(page)).toHaveCount(0);
  expect(await runs()).toBe(0);
  // Run, in the Paper place: the script is run, and the paper is set with what it wrote.
  await press(run(page));
  await expect(page.getByRole("status")).toHaveText("done", { timeout: 30_000 });
  await expect(standing(page)).toHaveCount(0, { timeout: 30_000 });
  await expect(lacking(page)).toHaveCount(0);
  await expect(page.getByTestId("paper-pages")).toHaveText("1 page");
  await expect(foot(page)).toHaveText(SET);
  expect(await drawn(page)).toMatch(/^blob:/);
  expect(await runs()).toBe(1);
  // The reader is still in Paper, and what the script wrote is in the project.
  await expect(places(page).getByRole("button", { name: "Paper" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await press(bar(page).getByRole("button", { name: "Project", exact: true }));
  const project = page
    .getByRole("complementary", { name: "Paper: the left pane" })
    .getByRole("region", { name: "Project" });
  await expect(project.getByText("fit.typ", { exact: true })).toBeVisible();
  await expect(project.getByText("wages.svg", { exact: true })).toBeVisible();
  // (That a figure is given to Typst as the very bytes the engine wrote is held where the
  // files are given: `src/paper/live.test.ts`.)
});

test("a script changed and run again changes the page: by Run in Paper, and by a run asked from Script", async ({
  page,
  press,
}) => {
  test.slow();
  const runs = await countRuns(page);
  await opened(page, press);
  await paper(page, press, PAPER);
  await press(run(page));
  await expect(standing(page)).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByRole("status")).toHaveText("done", { timeout: 30_000 });
  const first = await drawn(page);
  // The script changed: another term in the model, so another row in the table.
  await press(places(page).getByRole("button", { name: "Script" }));
  await write(page, script("educ + exper"));
  await expect(page.getByText("saving")).toHaveCount(0);
  await press(places(page).getByRole("button", { name: "Paper" }));
  expect(await drawn(page)).toBe(first);
  await press(run(page));
  await expect(page.getByRole("status")).toHaveText("done", { timeout: 30_000 });
  await expect.poll(() => drawn(page), { timeout: 30_000 }).not.toBe(first);
  await expect(standing(page)).toHaveCount(0);
  const second = await drawn(page);
  expect(await runs()).toBe(2);
  // Changed again and run from the Script place: the paper, come back to, is of that run.
  await press(places(page).getByRole("button", { name: "Script" }));
  await write(page, script("educ + exper + female"));
  await expect(page.getByText("saving")).toHaveCount(0);
  await press(run(page));
  await expect(page.getByRole("status")).toHaveText("done", { timeout: 30_000 });
  expect(await scriptText(page)).toContain("educ + exper + female");
  await press(places(page).getByRole("button", { name: "Paper" }));
  await expect.poll(() => drawn(page), { timeout: 30_000 }).not.toBe(second);
  await expect(standing(page)).toHaveCount(0);
  expect(await runs()).toBe(3);
});

test("Run in Paper, on a paper that uses no file a script exports, says so and runs nothing", async ({
  page,
  press,
}) => {
  const runs = await countRuns(page);
  await opened(page, press);
  await paper(page, press, "= Only words\n\nNothing from a script.\n");
  await expect(foot(page)).toHaveText(SET, { timeout: 60_000 });
  await press(run(page));
  await expect(page.getByRole("status")).toHaveText(
    "this paper uses no file a script of the project exports: there is nothing to run",
  );
  expect(await runs()).toBe(0);
  await expect(lacking(page)).toHaveCount(0);
  // A file no script writes is left to Typst's own words.
  await source(page).focus();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.insertText('#image("../output/nowhere.svg")\n');
  await expect(standing(page)).toContainText("Typst refuses the text as it stands (1 error).");
  await expect(lacking(page)).toHaveCount(0);
  await press(run(page));
  await expect(page.getByRole("status")).toHaveText(
    "this paper uses no file a script of the project exports: there is nothing to run",
  );
  expect(await runs()).toBe(0);
});

test("a table and a figure whose script has changed since it wrote them are marked stale, and the mark is cleared by the run that writes them again", async ({
  page,
  press,
}) => {
  test.slow();
  await opened(page, press);
  await paper(page, press, PAPER);
  await press(run(page));
  await expect(page.getByRole("status")).toHaveText("done", { timeout: 30_000 });
  await expect(standing(page)).toHaveCount(0, { timeout: 30_000 });
  // Fresh from the run: nothing is stale.
  await expect(stale(page)).toHaveCount(0);
  const fresh = await drawn(page);
  // The script changed, and not run: back in Paper both its files are said to be stale, in
  // words, above the page, which is still drawn from them as they are.
  await press(places(page).getByRole("button", { name: "Script" }));
  await write(page, script("educ + exper"));
  await expect(page.getByText("saving")).toHaveCount(0);
  await press(places(page).getByRole("button", { name: "Paper" }));
  await expect(stale(page)).toHaveText([
    "output/fit.typ and output/wages.svg are stale: scripts/main.zeff has changed since it wrote them. Press Run to write them again.",
  ]);
  expect(await drawn(page)).toBe(fresh);
  await expect(standing(page)).toHaveCount(0);
  // The script put back as it was when it wrote them: nothing is stale.
  await press(places(page).getByRole("button", { name: "Script" }));
  await write(page, script("educ"));
  await expect(page.getByText("saving")).toHaveCount(0);
  await press(places(page).getByRole("button", { name: "Paper" }));
  await expect(page.getByTestId("paper-pages")).toHaveText("1 page");
  await expect(stale(page)).toHaveCount(0);
  // Changed again, and run from Paper: the mark is set, and cleared by the run.
  await press(places(page).getByRole("button", { name: "Script" }));
  await write(page, script("educ + female"));
  await expect(page.getByText("saving")).toHaveCount(0);
  await press(places(page).getByRole("button", { name: "Paper" }));
  await expect(stale(page)).toHaveCount(1);
  await press(run(page));
  await expect(page.getByRole("status")).toHaveText("done", { timeout: 30_000 });
  await expect(stale(page)).toHaveCount(0, { timeout: 30_000 });
  await expect.poll(() => drawn(page), { timeout: 30_000 }).not.toBe(fresh);
  // A paper that uses only one of the two files says it of that one alone.
  await press(places(page).getByRole("button", { name: "Script" }));
  await write(page, script("educ + female + union"));
  await expect(page.getByText("saving")).toHaveCount(0);
  await press(places(page).getByRole("button", { name: "Paper" }));
  await source(page).focus();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.insertText('= Only the table\n\n#include "../output/fit.typ"\n');
  await expect(stale(page)).toHaveText([
    "output/fit.typ is stale: scripts/main.zeff has changed since it wrote it. Press Run to write it again.",
  ]);
});
