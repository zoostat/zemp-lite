// Help (open decisions #74 and #203; release 0.2.1, step 8): a place of its own, with the
// engine's page in the middle, the page's outline at its left and its related functions at
// its right; opened by F1 on a name, by Explain in what a run said, and by its own field; and
// `:help` in the console line. Every page is the engine's.
import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { cursorTo, expect, test, write, useExample } from "./support";

const READY = "engine Zeff 0.8.0 ready";
const file = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

async function scratch(page: Page, press: (target: ReturnType<Page["locator"]>) => Promise<void>) {
  await page.goto("/");
  await press(page.getByRole("button", { name: "Scratch project" }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await useExample(page);
}

/** Put the cursor at a column of a line of the script (both counted from 1). */
async function cursorAt(page: Page, line: number, column: number) {
  await cursorTo(page, line);
  for (let at = 1; at < column; at++) await page.keyboard.press("ArrowRight");
}

const places = (page: Page) => page.getByRole("navigation", { name: "Places" });
const bar = (page: Page) => page.getByRole("toolbar", { name: "Help: its panes and its controls" });
const outline = (page: Page) =>
  page
    .getByRole("complementary", { name: "Help: the left pane" })
    .getByRole("region", { name: "Outline" });
const related = (page: Page) =>
  page
    .getByRole("complementary", { name: "Help: the right pane" })
    .getByRole("region", { name: "Related functions" });

test("F1 on a function's name opens the Help place at its page, as zeff help prints it", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await write(page, "let w = dataset(wages)\nw.summary([wage])\n");
  await expect(page.getByTestId("help")).toHaveCount(0);
  await cursorAt(page, 2, 4);
  await page.keyboard.press("F1");
  const help = page.getByTestId("help");
  await expect(help).toBeVisible();
  // Help is a place, the one shown now; the script's place is a press of the top bar away.
  await expect(places(page).getByRole("button", { name: "Help" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(help.getByTestId("help-title")).toHaveText("summary");
  // The page is the engine's, whole and unchanged, however the place divides it.
  const shown = await help.getByTestId("help-page").evaluate((node) => node.textContent);
  expect(shown).toBe(file("tests/scripts/help-summary.txt"));
  await press(places(page).getByRole("button", { name: "Script" }));
  await expect(help).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "The script", exact: true })).toBeVisible();
  // Back in Help, the page is still the one that was open.
  await press(places(page).getByRole("button", { name: "Help" }));
  await expect(help.getByTestId("help-title")).toHaveText("summary");
});

test("the Help place has the page's outline at its left, each section gone to and marked", async ({
  page,
  press,
}) => {
  await page.setViewportSize({ width: 1280, height: 600 });
  await scratch(page, press);
  await press(places(page).getByRole("button", { name: "Help" }));
  // With no page open, the place says how one is opened.
  await expect(page.getByTestId("help")).toContainText("Press F1 on a function's name");
  await expect(outline(page)).toContainText("No page is open.");
  const field = bar(page).getByRole("searchbox", {
    name: "Open the page of a function or a code",
  });
  await field.fill("summary");
  await field.press("Enter");
  await expect(page.getByTestId("help-title")).toHaveText("summary");
  // `summary` is a function of a frame and of a result: the outline names each, over its sections.
  const entries = outline(page).locator("ul").getByRole("button");
  await expect(entries).toHaveText([
    "summary · data",
    "Usage",
    "Description",
    "Arguments",
    "Value",
    "Details",
    "Warnings and notes",
    "Accuracy",
    "References",
    "See also",
    "Examples",
    "summary · results",
    "Usage",
    "Description",
    "Arguments",
    "Value",
    "Accuracy",
    "See also",
    "Examples",
  ]);
  // A section gone to stands at the top of the page's own pane, and is the one marked.
  const examples = entries.nth(10);
  await press(examples);
  await expect(examples).toHaveAttribute("aria-current", "location");
  await expect
    .poll(async () => {
      const pane = (await page.getByTestId("help").locator(".page").boundingBox())!;
      const part = (await page.getByTestId("help-page").locator('[data-line="65"]').boundingBox())!;
      return Math.round(part.y - pane.y);
    })
    .toBeLessThan(30);
  await expect(outline(page).locator('[aria-current="location"]')).toHaveCount(1);
  // The outline closes and opens by its link, and by its own ×.
  const link = bar(page).getByRole("button", { name: "Outline", exact: true });
  await expect(link).toHaveAttribute("aria-pressed", "true");
  await press(link);
  await expect(outline(page)).toHaveCount(0);
  await press(link);
  await press(outline(page).getByRole("button", { name: "Close Outline" }));
  await expect(link).toHaveAttribute("aria-pressed", "false");
});

test("the Help place has the page's related functions at its right, each with what it does", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await press(places(page).getByRole("button", { name: "Help" }));
  const field = bar(page).getByRole("searchbox", {
    name: "Open the page of a function or a code",
  });
  await field.fill("summary");
  await field.press("Enter");
  // Those the page names under SEE ALSO, in its order, each with the first line of its own page.
  const listed = related(page).locator("ul").getByRole("button");
  await expect(listed).toHaveText([
    /^mean\s*Mean of a variable\s*data$/,
    /^sd\s*Sample standard deviation\s*data$/,
    /^describe\s*Type, non-missing and missing count of each variable\s*data$/,
    /^estimates\s*The estimates of a result as a frame\s*results$/,
    /^export\s*Write a table, a result or a plot to a file\s*results$/,
    /^reg\s*Linear regression by least squares, with fixed effects\s*regress$/,
  ]);
  // One opened: its page, its own outline and its own related functions.
  await press(listed.nth(5));
  await expect(page.getByTestId("help-title")).toHaveText("reg");
  await expect(page.getByTestId("help-page")).toContainText(
    "reg — Linear regression by least squares, with fixed effects",
  );
  await expect(outline(page).locator("ul").getByRole("button").first()).toHaveText("Usage");
  await expect(related(page).locator("ul").getByRole("button")).toHaveText([
    /^category/,
    /^base/,
    /^interact/,
    /^summary/,
    /^r_squared/,
    /^report/,
  ]);
  // A name the engine has no page for shows what the engine says, and names nothing related.
  await field.fill("nosuch");
  await field.press("Enter");
  await expect(page.getByTestId("help-title")).toHaveText("nosuch");
  await expect(page.getByTestId("help-page")).toContainText("nosuch");
  await expect(related(page)).toContainText("This page names no related function.");
  // The pane closes and opens by its link.
  const link = bar(page).getByRole("button", { name: "Related functions", exact: true });
  await press(link);
  await expect(related(page)).toHaveCount(0);
  await expect(link).toHaveAttribute("aria-pressed", "false");
});

test("a code's explained page opens in the Help place from what the run said, and from the field", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await press(page.locator("footer.bottom button.state"));
  await press(
    page.getByTestId("run-said").locator("li.warning").getByRole("button", { name: "Explain" }),
  );
  const help = page.getByTestId("help");
  await expect(help.getByTestId("help-title")).toHaveText("W0201");
  const shown = await help.getByTestId("help-page").evaluate((node) => node.textContent);
  expect(shown).toBe(file("tests/scripts/explain-W0201.txt"));
  await expect(outline(page).locator("ul").getByRole("button")).toHaveText([
    "Meaning",
    "Common causes",
    "Example",
    "Fix",
  ]);
  // A code typed in the field opens its page too.
  const field = bar(page).getByRole("searchbox", {
    name: "Open the page of a function or a code",
  });
  await field.fill("summary");
  await field.press("Enter");
  await expect(help.getByTestId("help-title")).toHaveText("summary");
  await field.fill("W0201");
  await field.press("Enter");
  await expect(help.getByTestId("help-title")).toHaveText("W0201");
  await expect(help.getByTestId("help-page")).toContainText(
    "missing values skipped by a statistic",
  );
});

test(":help in the console line prints a function's page, as zeff repl does", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  const line = page.getByRole("textbox", { name: /Console/ });
  await line.fill(":help summary");
  await line.press("Enter");
  await expect(page.getByTestId("console-printed").last()).toHaveText(
    file("tests/scripts/help-summary.txt").trimEnd(),
  );
});
