// A text of many values in the Variables pane (open decision #209; release 0.3, step 20): a
// histogram of the lengths of its values, the rows with text, of empty text and missing each
// counted, the shortest, median and longest length, its first five values in full, and the
// values that repeat. Every figure is a cell of what the engine prints: the kept prints of
// `tests/scripts/properties-text.json`, which a test under Node holds to the engine.
import { readFileSync } from "node:fs";
import type { Locator, Page } from "@playwright/test";
import { chooseVariable, expect, faintText, smallestText, test, write } from "./support";

const READY = "engine Zeff 0.9.0 ready";

type Press = (target: Locator) => Promise<void>;

const kept = JSON.parse(
  readFileSync(new URL("../scripts/properties-text.json", import.meta.url), "utf8"),
) as { setup: string; cases: { key: string; printed: string }[] };
const printed = (key: string) => kept.cases.find((one) => one.key === key)?.printed ?? "";

/** The Scratch project with the kept frame of reviews run, in the Data place. */
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

/** Choose a variable in the Variables view, and wait until the engine has answered. */
async function chosen(page: Page, press: Press, name: string): Promise<Locator> {
  return chooseVariable(page, press, name);
}

const rowsOf = (table: Locator) =>
  table
    .locator("tbody tr")
    .evaluateAll((rows) =>
      rows.map((row) => [...row.children].map((cell) => cell.textContent?.trim() ?? "")),
    );

test("a column of reviews is shown by its lengths, its empty and missing rows, its first values and its repeats, each the engine's", async ({
  page,
  press,
}) => {
  await ran(page, press);
  const pane = await chosen(page, press, "review");
  await expect(pane.getByTestId("variable-facts")).toHaveText(
    /Type\s*Str\s*Rows\s*40\s*Missing\s*1 · 2\.5 %/,
  );
  // The rows by what they hold, and the lengths: the engine's cells, and no other figure.
  const statistics = await rowsOf(pane.getByTestId("variable-statistics"));
  expect(statistics).toEqual([
    ["rows with text", "38"],
    ["rows of empty text", "1"],
    ["shortest", "0"],
    ["median length", "47"],
    ["longest", "200"],
    ["distinct values", "37"],
  ]);
  expect(printed("empty")).toMatch(/false\s+38\b/);
  expect(printed("empty")).toMatch(/true\s+1\b/);
  expect(printed("lengthRange")).toBe("0\n47\n200\n");
  expect(printed("distinct")).toBe("37\n");
  // The chart is of the lengths, drawn from the engine's own bins, with the shortest and the
  // longest at its ends; a text has no chart of its values.
  await expect(pane.getByRole("heading", { name: "Lengths, in characters" })).toBeVisible();
  await expect(pane.getByTestId("variable-lengths")).toHaveAttribute(
    "aria-label",
    /^The lengths of the values: \d+ bins of the engine's histogram$/,
  );
  expect(await pane.getByTestId("variable-lengths").locator("rect").count()).toBeGreaterThan(3);
  await expect(pane.locator(".ends")).toHaveText(/^0\s*200$/);
  await expect(pane.getByTestId("variable-shape")).toHaveCount(0);
  // Its first five values, each in full, the empty one said to be so.
  await expect(pane.getByRole("heading", { name: "The first 5 values" })).toBeVisible();
  await expect(pane.getByTestId("variable-first").getByRole("listitem")).toHaveText([
    "Good value, arrived on time. (1)",
    "Works as described; the manual is thin. (2)",
    "Too small for me; returned it after a week of trying. (3)",
    "an empty text",
    "Fine. (5)",
  ]);
  for (const text of ["Good value, arrived on time. (1)", "Fine. (5)"]) {
    expect(printed("first")).toContain(text);
  }
  // The values that repeat, with the rows that hold each.
  expect(await rowsOf(pane.getByTestId("variable-repeats"))).toEqual([
    ["As described.", "3"],
    ["No comment.", "2"],
  ]);
  expect(printed("repeats")).toMatch(/As described\.\s+3\n/);
  // Nothing the engine said is left unread.
  await expect(pane.getByTestId("variable-said")).toHaveCount(0);
});

test("a text of many values kept to some rows is shown for those rows; with none repeating, the pane says so", async ({
  page,
  press,
}) => {
  await ran(page, press);
  // The rows from the twenty-fourth on: the condition is the engine's, and so are the figures.
  const condition = page.getByRole("textbox", { name: "Keep rows where" });
  await condition.fill("id >= 24");
  await condition.press("Enter");
  const pane = await chosen(page, press, "review");
  await expect(pane.getByTestId("variable-facts")).toHaveText(/Rows\s*17\s*Missing\s*0/);
  const statistics = await rowsOf(pane.getByTestId("variable-statistics"));
  expect(statistics.slice(0, 2)).toEqual([
    ["rows with text", "17"],
    ["rows of empty text", "0"],
  ]);
  expect(statistics.at(-1)).toEqual(["distinct values", "17"]);
  await expect(pane.getByTestId("variable-repeats")).toHaveText("No value repeats.");
  await expect(pane.getByTestId("variable-first").getByRole("listitem")).toHaveText([
    "The colour is not the one in the picture, but I have kept it. (24)",
    "Fine. (25)",
    "Exactly what the kitchen needed, and quiet. (26)",
    "Stopped charging after a month. The shop replaced it without a word of trouble. (27)",
    "A gift for my father, who uses it every morning. (28)",
  ]);
  // A number beside it is shown as a number is, as before.
  const stars = await chosen(page, press, "stars");
  await expect(stars.getByTestId("variable-values")).toBeVisible();
  await expect(stars.getByTestId("variable-lengths")).toHaveCount(0);
  await expect(stars.getByTestId("variable-first")).toHaveCount(0);
});

for (const theme of ["light", "dark"] as const) {
  test(`the pane of a text keeps to the sizes and the contrast in the ${theme} theme`, async ({
    page,
    press,
  }) => {
    await ran(page, press);
    if (theme === "dark") await press(page.getByRole("switch", { name: "Dark" }));
    const pane = await chosen(page, press, "review");
    await expect(pane.getByTestId("variable-repeats")).toBeVisible();
    await expect(pane.getByTestId("variable-lengths")).toBeVisible();
    expect(await smallestText(page)).toBeGreaterThanOrEqual(12.5);
    expect(await faintText(pane)).toEqual([]);
  });
}
