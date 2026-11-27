// The other kinds of variable in the Variables pane (open decision #209; release 0.3, step
// 21): a text of few values with its line naming `category()`; a variable whose every value
// differs; an ordered category in the order of its levels; and a number with the unit its
// data carries. Every figure is the engine's: the kept prints of
// `tests/scripts/properties-kinds.json`, which a test under Node holds to the engine.
import { readFileSync } from "node:fs";
import type { Locator, Page } from "@playwright/test";
import { expect, faintText, smallestText, test, write } from "./support";

const READY = "engine Zeff 0.9.0 ready";
const FEW_TEXT = "Text of few values: category() would make it a category.";
const IDENTIFIER = "Every value is different: this looks like an identifier.";

type Press = (target: Locator) => Promise<void>;

const kept = JSON.parse(
  readFileSync(new URL("../scripts/properties-kinds.json", import.meta.url), "utf8"),
) as { setup: string };

const framesPane = (page: Page) =>
  page
    .getByRole("complementary", { name: "Data: the left pane" })
    .getByRole("region", { name: "Frames of the run" });
const variablesPane = (page: Page) =>
  page
    .getByRole("complementary", { name: "Data: the right pane" })
    .getByRole("region", { name: "Variables" });

/** The Scratch project with the kept frames run, in the Data place. */
async function ran(page: Page, press: Press): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await write(page, kept.setup);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await press(
    page.getByRole("navigation", { name: "Places" }).getByRole("button", { name: "Data" }),
  );
}

/** Choose a variable of a frame, and wait until the engine has answered. */
async function chosen(page: Page, press: Press, frame: string, name: string): Promise<Locator> {
  await press(framesPane(page).getByRole("button", { name: new RegExp(`^${frame}\\b`) }));
  await expect(page.getByTestId("frame-header")).toContainText(`${frame} ·`);
  await press(
    page
      .getByRole("grid")
      .getByRole("columnheader", { name, exact: true })
      .getByRole("button")
      .first(),
  );
  const pane = variablesPane(page);
  await expect(pane.getByRole("heading", { name, exact: true })).toBeVisible();
  await expect(pane.getByTestId("variable-asking")).toHaveCount(0);
  return pane;
}

const rowsOf = (table: Locator) =>
  table
    .locator("tbody tr")
    .evaluateAll((rows) =>
      rows.map((row) => [...row.children].map((cell) => cell.textContent?.trim() ?? "")),
    );

test("a text of few values is counted as before and said to be text; an ordered category is said to be ordered, in its levels' order", async ({
  page,
  press,
}) => {
  await ran(page, press);
  // A country code kept as text: its bars and its counts, and one line naming `category()`.
  const country = await chosen(page, press, "people", "country");
  await expect(country.getByTestId("variable-facts")).toHaveText(/Type\s*Str\s*Rows\s*40/);
  await expect(country.getByTestId("variable-shape")).toBeVisible();
  expect((await rowsOf(country.getByTestId("variable-values"))).map((row) => row[0])).toEqual([
    "BR",
    "DE",
    "FR",
    "IN",
  ]);
  await expect(country.getByTestId("variable-few-text")).toHaveText(FEW_TEXT);
  await expect(country.getByTestId("variable-differing")).toHaveCount(0);
  // An ordered category: said to be ordered, with the measure the engine gives it, its bars
  // and its counts in the order of its levels, which is not the order of their counts.
  const agree = await chosen(page, press, "people", "agree");
  await expect(agree.getByTestId("variable-facts")).toHaveText(
    /Type\s*Category · ordered\s*Measure\s*ordinal\s*Rows\s*40/,
  );
  await expect(agree.getByTestId("variable-shape")).toHaveAttribute(
    "aria-label",
    /^disagree .*neutral .*agree /,
  );
  expect(await rowsOf(agree.getByTestId("variable-values"))).toEqual([
    ["disagree", "14", "35.0"],
    ["neutral", "13", "32.5"],
    ["agree", "13", "32.5"],
  ]);
  // A category is no text: the line of a text of few values is not said of it.
  await expect(agree.getByTestId("variable-few-text")).toHaveCount(0);
});

test("a variable whose every value differs is said to look like an identifier: a text with no chart, a whole number with its statistics", async ({
  page,
  press,
}) => {
  await ran(page, press);
  // A text of few values, all different: no chart and no table of values, the line, and its
  // first and last value in the order of the rows.
  const id = await chosen(page, press, "few", "id");
  await expect(id.getByTestId("variable-differing")).toHaveText(IDENTIFIER);
  await expect(id.getByTestId("variable-shape")).toHaveCount(0);
  await expect(id.getByTestId("variable-values")).toHaveCount(0);
  await expect(id.getByTestId("variable-few-text")).toHaveCount(0);
  expect(await rowsOf(id.getByTestId("variable-ends"))).toEqual([
    ["first value", "a1"],
    ["last value", "a6"],
  ]);
  // The column beside it, whose values repeat, is a text of few values as any other.
  const group = await chosen(page, press, "few", "group");
  await expect(group.getByTestId("variable-differing")).toHaveCount(0);
  await expect(group.getByTestId("variable-few-text")).toHaveText(FEW_TEXT);
  await expect(group.getByTestId("variable-shape")).toBeVisible();
  // A text of many values, all different and all of one length.
  const code = await chosen(page, press, "people", "code");
  await expect(code.getByTestId("variable-differing")).toHaveText(IDENTIFIER);
  await expect(code.getByTestId("variable-lengths")).toBeVisible();
  await expect(code.getByTestId("variable-repeats")).toHaveText("No value repeats.");
  // A whole number: the histogram and the statistics stay, with the same line.
  const serial = await chosen(page, press, "people", "serial");
  await expect(serial.getByTestId("variable-differing")).toHaveText(IDENTIFIER);
  await expect(serial.getByTestId("variable-shape")).toBeVisible();
  const statistics = await rowsOf(serial.getByTestId("variable-statistics"));
  expect(statistics[0]).toEqual(["N", "40"]);
  expect(statistics.at(-1)).toEqual(["distinct values", "40"]);
});

test("a number is shown with the unit its data carries, and one that carries none has no such row", async ({
  page,
  press,
}) => {
  await ran(page, press);
  const wage = await chosen(page, press, "wages", "wage");
  await expect(wage.getByTestId("variable-facts")).toHaveText(
    /Type\s*Float\s*Unit\s*USD per hour\s*Rows\s*18,412/,
  );
  // Its values do not all differ, and it is no whole number: nothing is said of an identifier.
  await expect(wage.getByTestId("variable-differing")).toHaveCount(0);
  const union = await chosen(page, press, "wages", "union");
  await expect(union.getByTestId("variable-facts")).toHaveText(/Type\s*Int\s*Rows\s*18,412/);
  await expect(union.getByTestId("variable-facts")).not.toContainText("Unit");
  await expect(union.getByTestId("variable-facts")).not.toContainText("Measure");
});

for (const theme of ["light", "dark"] as const) {
  test(`the pane of each of these kinds keeps to the sizes and the contrast in the ${theme} theme`, async ({
    page,
    press,
  }) => {
    await ran(page, press);
    if (theme === "dark") await press(page.getByRole("switch", { name: "Dark" }));
    for (const [frame, name] of [
      ["few", "id"],
      ["people", "country"],
      ["people", "agree"],
    ] as const) {
      const pane = await chosen(page, press, frame, name);
      expect(await smallestText(page)).toBeGreaterThanOrEqual(12.5);
      expect(await faintText(pane)).toEqual([]);
    }
  });
}
