// The sample paper of the Scratch project (release 0.3, step 15c; the owner's answer to
// question 4): a first visitor who opens Paper meets a page, set from a table and a figure a
// script of the project exports; the sample is fetched only then; and **Run** makes its table
// and its figure again, to the same page.
import type { Locator, Page } from "@playwright/test";
import { countRuns, expect, test, write } from "./support";

const READY = "engine Zeff 0.9.0 ready";
const SET = /^Typst 0\.15\.1 · set in \d+ ms$/;

test.use({ samplePaper: true });

type Press = (target: Locator) => Promise<void>;

const places = (page: Page) => page.getByRole("navigation", { name: "Places" });
const bar = (page: Page) =>
  page.getByRole("toolbar", { name: "Paper: its panes and its controls" });
const left = (page: Page) => page.getByRole("complementary", { name: "Paper: the left pane" });
const foot = (page: Page) => page.getByTestId("paper-typst");
const sheets = (page: Page) => page.getByTestId("paper-page");
const run = (page: Page) => page.getByRole("button", { name: "Run", exact: true });

async function scratch(page: Page, press: Press): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
}

/** The first page's picture, once the browser has drawn it: its address. */
async function drawn(page: Page): Promise<string> {
  const picture = sheets(page).first().locator("img");
  await expect
    .poll(() => picture.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
    .toBe(true);
  return (await picture.getAttribute("src")) ?? "";
}

test("a visitor who opens Paper in the Scratch project meets a page, with its table and its figure, and nothing has run", async ({
  page,
  press,
}) => {
  test.slow();
  const runs = await countRuns(page);
  // The sample is a part of the app of its own: nothing of it is asked for before Paper.
  const asked: string[] = [];
  page.on("request", (request) => asked.push(new URL(request.url()).pathname));
  const ofSample = () => asked.filter((path) => /\/assets\/sample-[\w-]+\.js$/.test(path));
  await scratch(page, press);
  await press(places(page).getByRole("button", { name: "Data" }));
  await press(places(page).getByRole("button", { name: "Help" }));
  expect(ofSample()).toEqual([]);
  await press(places(page).getByRole("button", { name: "Paper" }));
  // The paper is open, and its page is set: one page, with nothing to say of it.
  await expect(page.getByTestId("paper-path")).toHaveText("paper/paper.typ");
  await expect(page.locator("header .file")).toHaveText("/ paper.typ · saved");
  await expect(foot(page)).toHaveText(SET, { timeout: 60_000 });
  await expect(page.getByTestId("paper-pages")).toHaveText("1 page");
  await expect(page.getByTestId("paper-standing")).toHaveCount(0);
  await expect(page.getByTestId("paper-lacking")).toHaveCount(0);
  await expect(page.getByTestId("paper-stale")).toHaveCount(0);
  expect(await drawn(page)).toMatch(/^blob:/);
  expect(ofSample()).toHaveLength(1);
  expect(await runs()).toBe(0);
  // Its heading is in the Outline, and its files are in the project: the paper, the script
  // that writes its table and its figure, and the two as the engine writes them.
  await press(bar(page).getByRole("button", { name: "Outline", exact: true }));
  await expect(
    left(page).getByRole("region", { name: "Outline" }).getByTestId("paper-outline"),
  ).toHaveText("Returns to schooling 9");
  await press(bar(page).getByRole("button", { name: "Project", exact: true }));
  const project = left(page).getByRole("region", { name: "Project" });
  for (const name of ["paper.typ", "paper.zeff", "returns.typ", "schooling.svg"]) {
    await expect(project.getByText(name, { exact: true })).toBeVisible();
  }
  await expect(project.getByRole("button", { name: /^paper\.typ/ })).toHaveClass(/\bon\b/);
  // The reader's own scripts are as they were.
  await expect(project.getByRole("button", { name: /^main\.zeff/ })).toBeVisible();
});

test("Run in the sample paper runs its script and makes the same page again; the script changed, its table and figure are stale", async ({
  page,
  press,
}) => {
  test.slow();
  const runs = await countRuns(page);
  await scratch(page, press);
  await press(places(page).getByRole("button", { name: "Paper" }));
  await expect(foot(page)).toHaveText(SET, { timeout: 60_000 });
  const given = await drawn(page);
  // Run: the one script the paper's files come from is run, and writes what was given, to
  // the byte, so the page is the page it was.
  await press(run(page));
  await expect(page.getByRole("status")).toHaveText("done", { timeout: 60_000 });
  expect(await runs()).toBe(1);
  await expect(foot(page)).toHaveText(SET);
  await expect(page.getByTestId("paper-standing")).toHaveCount(0);
  await expect(page.getByTestId("paper-stale")).toHaveCount(0);
  expect(await drawn(page)).toBe(given);
  await expect(places(page).getByRole("button", { name: "Paper" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  // The script changed: the sample's files are the script's, and are said to be stale.
  await press(bar(page).getByRole("button", { name: "Project", exact: true }));
  await press(
    left(page)
      .getByRole("region", { name: "Project" })
      .getByRole("button", { name: /^paper\.zeff/ }),
  );
  await expect(places(page).getByRole("button", { name: "Script" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await write(
    page,
    'let w = dataset(wages).where(year == 2019)\nreport([w.reg(wage ~ educ)]).export("output/returns.typ")\nw.scatter(educ, wage).export("output/schooling.svg")\n',
  );
  await expect(page.getByText("saving")).toHaveCount(0);
  await press(places(page).getByRole("button", { name: "Paper" }));
  await expect(page.getByTestId("paper-stale")).toHaveText([
    "output/returns.typ and output/schooling.svg are stale: scripts/paper.zeff has changed since it wrote them. Press Run to write them again.",
  ]);
  // Run again: another table and another figure, and so another page.
  await press(run(page));
  await expect.poll(runs, { timeout: 30_000 }).toBe(2);
  await expect(page.getByRole("status")).toHaveText("done", { timeout: 60_000 });
  await expect(page.getByTestId("paper-stale")).toHaveCount(0, { timeout: 30_000 });
  await expect.poll(() => drawn(page), { timeout: 30_000 }).not.toBe(given);
});

test("the sample is given once: taken out of Paper, it is not put back when Paper is opened again", async ({
  page,
  press,
}) => {
  test.slow();
  await scratch(page, press);
  await press(places(page).getByRole("button", { name: "Paper" }));
  await expect(page.getByTestId("paper-path")).toHaveText("paper/paper.typ");
  await press(bar(page).getByRole("button", { name: "Close", exact: true }));
  const none = page.getByRole("region", { name: "No paper is open" });
  await expect(none.getByRole("button", { name: "paper/paper.typ" })).toBeVisible();
  // Closed, and Paper left and come back to: the place has no paper open, as the reader left it.
  await press(places(page).getByRole("button", { name: "Script" }));
  await press(places(page).getByRole("button", { name: "Paper" }));
  await expect(none).toBeVisible();
  await expect(page.getByTestId("paper-path")).toHaveCount(0);
  // The note that it was given is kept by the browser.
  expect(await page.evaluate(() => localStorage.getItem("zemp-scratch-paper"))).toBe("given");
});
