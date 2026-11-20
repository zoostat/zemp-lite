// The Data place (release 0.2, step 13; open decision #75): the frames of the run, each by the
// statement that made it, and the frame chosen as a grid drawn as it is scrolled, every cell
// as the engine prints it.
import type { Page } from "@playwright/test";
import { expect, test } from "./support";

const READY = "engine Zeff 0.8.0 ready";

async function ran(page: Page, press: (target: ReturnType<Page["locator"]>) => Promise<void>) {
  await page.goto("/");
  await press(page.getByRole("button", { name: "Scratch project" }));
  await expect(page.getByRole("status")).toHaveText(READY);
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
