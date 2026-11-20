// The Data place (release 0.2, step 13; open decision #75): the frames of the run, each by the
// statement that made it, and the frame chosen as a grid drawn as it is scrolled, every cell
// as the engine prints it.
import type { Page } from "@playwright/test";
import { expect, test, useExample } from "./support";

const READY = "engine Zeff 0.8.0 ready";

// Copying asks the browser for the clipboard; Chromium under test grants it only when told.
test.beforeEach(async ({ browserName, context }) => {
  if (browserName === "chromium") {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  }
});

async function ran(page: Page, press: (target: ReturnType<Page["locator"]>) => Promise<void>) {
  await page.goto("/");
  await press(page.getByRole("button", { name: "Scratch project" }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await useExample(page);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await press(
    page.getByRole("navigation", { name: "Places" }).getByRole("button", { name: "Data" }),
  );
}

test("the frames of the run are listed by the statement that made them", async ({
  page,
  press,
}) => {
  await ran(page, press);
  const list = page.getByRole("complementary", { name: "The frames of the run" });
  await expect(list.getByRole("button", { name: "‹ Hide" })).toBeVisible();
  await expect(list.locator("ul.frames").getByRole("button")).toHaveText([
    /wages\s*18,412 × 11 · line 4/,
    /w2010/,
  ]);
  await expect(page.getByTestId("frame-header")).toHaveText(
    "wages · 18,412 rows × 11 variables · panel worker × year",
  );
  await press(list.getByRole("button", { name: /^w2010/ }));
  await expect(page.getByTestId("frame-header")).toHaveText(
    /^w2010 · [\d,]+ rows × 11 variables( · panel worker × year)?$/,
  );
});

test("the grid draws only the rows near its window, and every row is reached by scrolling", async ({
  page,
  press,
}) => {
  await ran(page, press);
  const grid = page.getByRole("grid");
  const rows = grid.getByTestId("data-row");
  await expect(rows.first()).toContainText("1");
  // Of 18,412 rows, only those near the window are on the page.
  expect(await rows.count()).toBeLessThan(120);
  // A row number and its cells; numbers to the right.
  await expect(grid.getByRole("columnheader", { name: "wage", exact: true })).toBeVisible();
  // Down to the last row: it is fetched and drawn.
  await grid.evaluate((node) => node.scrollTo(0, node.scrollHeight));
  const last = grid.locator('[data-testid="data-row"][aria-rowindex="18413"]');
  await expect(last).toBeVisible();
  await expect(last.getByRole("rowheader")).toHaveText("18412");
  await expect(last.getByRole("gridcell").first()).not.toHaveText("…");
  // The header stays at the top of the grid's window.
  const head = (await grid.getByRole("columnheader", { name: "wage", exact: true }).boundingBox())!;
  const box = (await grid.boundingBox())!;
  expect(Math.abs(head.y - box.y)).toBeLessThan(2);
});

test("a missing value is written NA, never blank", async ({ page, press }) => {
  await ran(page, press);
  const grid = page.getByRole("grid");
  // The example's summary says 6 rows of wage in 2010 are missing; in the whole frame some are.
  const missing = grid.getByRole("gridcell", { name: "NA", exact: true });
  for (let step = 0; step < 60 && (await missing.count()) === 0; step++) {
    await grid.evaluate((node) => node.scrollBy(0, node.clientHeight * 3));
    await page.waitForTimeout(60);
  }
  await expect(missing.first()).toBeVisible();
  expect(await grid.getByRole("gridcell", { name: "", exact: true }).count()).toBe(0);
});

test("a variable is hidden and shown by its box, by the keyboard, and from its header", async ({
  page,
  press,
}) => {
  await ran(page, press);
  const grid = page.getByRole("grid");
  const educ = grid.getByRole("columnheader", { name: "educ", exact: true });
  await expect(educ).toBeVisible();
  const box = page.getByRole("checkbox", { name: "Show educ in the grid" });
  await box.uncheck();
  await expect(educ).toHaveCount(0);
  await expect(page.getByTestId("shown-count")).toHaveText("10 of 11 shown");
  await expect(page.getByText("1 hidden ·")).toBeVisible();
  // By the keyboard, the focus staying on the box.
  await box.focus();
  await page.keyboard.press("Space");
  await expect(educ).toBeVisible();
  await expect(box).toBeFocused();
  // From the column's header.
  await press(grid.getByRole("button", { name: "Hide educ" }));
  await expect(educ).toHaveCount(0);
  await press(page.getByRole("button", { name: "Show all", exact: true }));
  await expect(educ).toBeVisible();
});

test("Hide all and Show all act on every variable, and hiding is kept for each frame", async ({
  page,
  press,
}) => {
  await ran(page, press);
  await press(page.getByRole("button", { name: "Hide all" }));
  await expect(page.getByTestId("shown-count")).toHaveText("0 of 11 shown");
  await expect(page.getByRole("grid").getByRole("columnheader")).toHaveCount(1);
  // Another frame keeps its own: every variable of w2010 is shown.
  const frames = page.getByRole("complementary", { name: "The frames of the run" });
  await press(frames.getByRole("button", { name: /^w2010/ }));
  await expect(page.getByTestId("shown-count")).toHaveText("11 of 11 shown");
  await press(frames.getByRole("button", { name: /^wages/ }));
  await expect(page.getByTestId("shown-count")).toHaveText("0 of 11 shown");
  await press(page.getByRole("button", { name: "Show all", exact: true }));
  await expect(page.getByTestId("shown-count")).toHaveText("11 of 11 shown");
});

test("Find a variable narrows the list, and the inspector gives the engine's summary of one", async ({
  page,
  press,
}) => {
  await ran(page, press);
  await page.getByRole("searchbox", { name: "Find a variable" }).fill("ex");
  await expect(page.getByRole("checkbox", { name: /^Show .* in the grid$/ })).toHaveCount(1);
  await expect(page.getByRole("checkbox", { name: "Show exper in the grid" })).toBeVisible();
  await page.getByRole("searchbox", { name: "Find a variable" }).fill("");
  // Choosing a variable opens the inspector with what the engine says of it.
  const grid = page.getByRole("grid");
  await press(
    grid.getByRole("columnheader", { name: "wage", exact: true }).getByRole("button").first(),
  );
  const inspector = page.getByTestId("inspector");
  await expect(inspector).toContainText("Float");
  await expect(inspector).toContainText("missing");
  const summary = inspector.getByTestId("variable-summary");
  await expect(summary).toContainText("summary");
  await expect(summary).toContainText("wage");
  await expect(summary).not.toHaveText("…");
  // Hidden from the inspector, the variable leaves the grid and stays inspected.
  await press(inspector.getByRole("button", { name: "Hide from the grid" }));
  await expect(grid.getByRole("columnheader", { name: "wage", exact: true })).toHaveCount(0);
  await expect(inspector.getByRole("button", { name: "Show in the grid" })).toBeVisible();
});

// Step 14b: the view kept to a condition, sorted and searched by the engine; the headers'
// distributions; copying a range; Copy as Zeff (#114).

/** The numbers of a column among the rows drawn, in order. */
async function numbers(page: Page, column: number): Promise<number[]> {
  const rows = page.getByRole("grid").getByTestId("data-row");
  const count = Math.min(await rows.count(), 8);
  const found: number[] = [];
  for (let at = 0; at < count; at++) {
    const cell = rows.nth(at).getByRole("gridcell").nth(column);
    found.push(Number(await cell.textContent()));
  }
  return found;
}

test("a header sorts the rows as data.sort does, and Copy as Zeff copies the sort", async ({
  page,
  press,
}) => {
  await ran(page, press);
  const grid = page.getByRole("grid");
  const sort = grid.getByRole("button", { name: "Sort by wage" });
  await press(sort);
  await expect(sort).toHaveText("↑");
  await press(sort);
  await expect(sort).toHaveText("↓");
  // wage is the third variable: its column is the third cell of a row.
  await expect
    .poll(async () => {
      const wages = await numbers(page, 2);
      return wages.length > 3 && wages.every((one, at) => at === 0 || one <= wages[at - 1]!);
    })
    .toBe(true);
  // Sorting keeps every row.
  await expect(page.getByTestId("kept-count")).toHaveCount(0);
  await press(page.getByRole("button", { name: "Copy as Zeff" }));
  await expect(page.getByTestId("data-copied")).toHaveText("copied wages.sort(wage, desc: true)");
  // Pressed once more, the sort is gone and nothing is left to copy.
  await press(sort);
  await expect(sort).toHaveText("↕");
  await expect(page.getByRole("button", { name: "Copy as Zeff" })).toBeDisabled();
});

test("a condition keeps the rows where gives, with a live count, and says what the engine said", async ({
  page,
  press,
}) => {
  await ran(page, press);
  const where = page.getByRole("textbox", { name: "Keep rows where" });
  await where.fill("year == 2015 && female == 1");
  await where.press("Enter");
  await expect(page.getByTestId("kept-count")).toHaveText(/^[\d,]+ of 18,412 rows$/);
  // year is the second variable: every row drawn is of 2015.
  await expect.poll(async () => (await numbers(page, 1)).every((one) => one === 2015)).toBe(true);
  await press(page.getByRole("button", { name: "Copy as Zeff" }));
  await expect(page.getByTestId("data-copied")).toHaveText(
    "copied wages.where(year == 2015 && female == 1)",
  );
  // The note of rows dropped where the condition was NA, in the engine's words.
  await where.fill("exper > 10");
  await where.press("Enter");
  await expect(page.getByTestId("filter-said")).toHaveText(/^note/);
  // A condition the engine cannot run: its error, and every row.
  await where.fill("yaer > 1");
  await where.press("Enter");
  await expect(page.getByTestId("filter-said")).toHaveText(/^error/);
  await expect(page.getByRole("alert")).toBeVisible();
  await press(page.getByRole("button", { name: "Clear" }));
  await expect(where).toHaveValue("");
  await expect(page.getByTestId("kept-count")).toHaveCount(0);
});

test("a search keeps the rows with a cell that holds it, and marks the cells", async ({
  page,
  press,
}) => {
  await ran(page, press);
  await page.getByRole("searchbox", { name: "Search the cells" }).fill("mining");
  await expect(page.getByTestId("kept-count")).toHaveText(/^[\d,]+ of 18,412 rows$/);
  const rows = page.getByRole("grid").getByTestId("data-row");
  await expect(rows.first().locator(".cell.match")).toHaveText("Mining");
  // A search is the viewer's alone: there is nothing to copy as Zeff.
  await expect(page.getByRole("button", { name: "Copy as Zeff" })).toBeDisabled();
  await page.getByRole("searchbox", { name: "Search the cells" }).fill("");
  await expect(page.getByTestId("kept-count")).toHaveCount(0);
});

test("each header draws the variable's distribution, as the engine counts it", async ({
  page,
  press,
}) => {
  await ran(page, press);
  const female = page
    .getByRole("grid")
    .getByRole("columnheader", { name: "female", exact: true })
    .getByTestId("spark");
  await expect(female).toHaveAttribute("aria-label", "male 9,491 · female 8,921");
  await expect(female.locator("rect")).toHaveCount(2);
  const wage = page
    .getByRole("grid")
    .getByRole("columnheader", { name: "wage", exact: true })
    .getByTestId("spark");
  await expect(wage).toHaveAttribute("aria-label", /^\d+ bins of the engine's histogram$/);
});

test("a range of cells is copied as the engine wrote them", async ({
  page,
  press,
  browserName,
}) => {
  await ran(page, press);
  const rows = page.getByRole("grid").getByTestId("data-row");
  await rows.nth(0).getByRole("gridcell").nth(1).click();
  await rows
    .nth(2)
    .getByRole("gridcell")
    .nth(3)
    .click({ modifiers: ["Shift"] });
  await expect(page.getByRole("button", { name: "Copy 3 × 3 cells" })).toBeVisible();
  await expect(page.getByRole("gridcell", { selected: true })).toHaveCount(9);
  await page.getByRole("grid").press("ControlOrMeta+c");
  await expect(page.getByTestId("data-copied")).toHaveText("copied 3 rows × 3 columns of cells");
  if (browserName === "chromium") {
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    const lines = copied.trimEnd().split("\n");
    expect(lines).toHaveLength(3);
    for (let at = 0; at < 3; at++) {
      const cells = await rows.nth(at).getByRole("gridcell").allTextContents();
      expect(lines[at]).toBe(cells.slice(1, 4).join("\t"));
    }
  }
});

test("the inspector copies a change of type, of contrast and of labels as Zeff", async ({
  page,
  press,
}) => {
  await ran(page, press);
  const grid = page.getByRole("grid");
  const inspector = page.getByTestId("inspector");
  await press(
    grid.getByRole("columnheader", { name: "industry", exact: true }).getByRole("button").first(),
  );
  await inspector
    .getByRole("combobox", { name: "Another contrast for industry" })
    .selectOption("sum");
  await press(inspector.getByRole("button", { name: "Copy the contrast" }));
  await expect(page.getByTestId("data-copied")).toHaveText(
    "copied let wages = wages.add(industry = category(industry, contrast: sum))",
  );
  await press(
    grid.getByRole("columnheader", { name: "educ", exact: true }).getByRole("button").first(),
  );
  await inspector.getByRole("combobox", { name: "Another type for educ" }).selectOption("Float");
  await press(inspector.getByRole("button", { name: "Copy the change of type" }));
  await expect(page.getByTestId("data-copied")).toHaveText(
    "copied let wages = wages.add(educ = to(educ, Float))",
  );
  await press(
    grid.getByRole("columnheader", { name: "union", exact: true }).getByRole("button").first(),
  );
  // The codes come with the labels they have.
  await expect(inspector.getByRole("textbox", { name: "The label of 0" })).toHaveValue("no");
  await inspector.getByRole("textbox", { name: "The label of 0" }).fill("not a member");
  await inspector.getByRole("textbox", { name: "The label of 1" }).fill("member");
  await press(inspector.getByRole("button", { name: "Copy the labels" }));
  await expect(page.getByTestId("data-copied")).toHaveText(
    'copied let wages = wages.label(union, [0 => "not a member", 1 => "member"])',
  );
});
