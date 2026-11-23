// Help (open decisions #74 and #203; release 0.2.1, steps 8 and 10b): a place of its own, with
// the engine's page in the middle, set in type, the page's outline at its left and its related
// functions at its right; opened by F1 on a name, by Explain in what a run said, by a name or a
// code in the page itself, and by its own field; and `:help` in the console line. Every word
// of every page is the engine's.
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

/**
 * The words of a page, in order, without what the type takes the place of: the backticks of
 * code and the asterisks of a title, the print's marks; the dash of the first line, the dots
 * between the facts and the hyphen of a list's item; the full stop, comma, colon or bracket
 * at a word's edge, which a label or a list of links does without; and the capitals of a
 * heading, which is set in sentence case.
 */
const wordsOf = (text: string) =>
  text
    .replaceAll("`", "")
    .split(/\s+/)
    .map((word) => word.replace(/^[.,:;()*]+|[.,:;()*]+$/g, "").toLowerCase())
    .filter((word) => word !== "" && !/^[—·-]$/.test(word));

/** The print's mark of a description shared with other functions, at a line's right edge. */
const SHARED = /\s{2,}\(shared\)$/gm;

/** The words of a page as the engine prints it, and how many descriptions it marks as shared. */
const printed = (text: string) => ({
  words: wordsOf(text.replace(SHARED, "")),
  shared: (text.match(SHARED) ?? []).length,
});

/**
 * The words the Help place shows, as a reader sees them, and how many descriptions it marks
 * as shared: the mark stands by the argument's name, where the print has it at the line's end.
 */
const shown = async (page: Page) =>
  page.getByTestId("help-page").evaluate((node) => {
    const marks = [...node.querySelectorAll<HTMLElement>(".shared")];
    for (const mark of marks) mark.hidden = true;
    const text = (node as HTMLElement).innerText;
    for (const mark of marks) mark.hidden = false;
    return { text, shared: marks.length };
  });

/** Hold the page shown to a page as the engine prints it: the same words, in the same order. */
async function holdsPrint(page: Page, print: string) {
  const seen = await shown(page);
  expect({ words: wordsOf(seen.text), shared: seen.shared }).toEqual(printed(print));
}

const places = (page: Page) => page.getByRole("navigation", { name: "Places" });
const bar = (page: Page) => page.getByRole("toolbar", { name: "Help: its panes and its controls" });
const topics = (page: Page) =>
  page
    .getByRole("complementary", { name: "Help: the left pane" })
    .getByRole("region", { name: "Topics" });
/** The sections of the page open, in the Topics pane (the Outline pane, until 0.2.3). */
const outline = (page: Page) => topics(page).getByRole("list", { name: "On this page" });
const related = (page: Page) =>
  page
    .getByRole("complementary", { name: "Help: the right pane" })
    .getByRole("region", { name: "Related functions" });

test("F1 on a function's name opens the Help place at its page, every word the engine's", async ({
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
  // The page is the engine's, word for word and in its order, however the place sets it: a
  // page of two functions, each with its name as a heading over its sections.
  await holdsPrint(page, file("tests/scripts/help-summary.txt"));
  await expect(help.getByRole("heading", { level: 3, name: "summary" })).toHaveCount(2);
  await expect(help.getByRole("heading", { level: 4, name: "Usage" })).toHaveCount(2);
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
  // With no page asked for, Help is on Home, the index of functions, which has no sections
  // of its own: the Topics pane holds the packages and the codes (`help-topics.spec.ts`).
  await expect(page.getByTestId("help-page").getByRole("heading", { level: 3 })).toHaveText(
    "Index of functions",
  );
  await expect(outline(page)).toHaveCount(0);
  await expect(
    topics(page).getByRole("list", { name: "Packages" }).getByRole("button").first(),
  ).toHaveText(/^core\s*71$/);
  const field = bar(page).getByRole("searchbox", {
    name: "Open the page of a function or a code",
  });
  await field.fill("summary");
  await field.press("Enter");
  await expect(page.getByTestId("help-title")).toHaveText("summary");
  // `summary` is a function of a frame and of a result: the outline names each, over its sections.
  const entries = outline(page).getByRole("button");
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
  // The pane that holds them closes and opens by its link, and by its own ×.
  const link = bar(page).getByRole("button", { name: "Topics", exact: true });
  await expect(link).toHaveAttribute("aria-pressed", "true");
  await press(link);
  await expect(topics(page)).toHaveCount(0);
  await press(link);
  await press(topics(page).getByRole("button", { name: "Close Topics" }));
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
  await expect(page.getByTestId("help-page").getByRole("heading", { level: 3 })).toHaveText("reg");
  await expect(page.getByTestId("help-page")).toContainText(
    "Linear regression by least squares, with fixed effects",
  );
  await expect(outline(page).getByRole("button").first()).toHaveText("Usage");
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
  await holdsPrint(page, file("tests/scripts/explain-W0201.txt"));
  await expect(outline(page).getByRole("button")).toHaveText([
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

test("a page of every kind of part is set in type, and every word of it is the engine's", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await press(places(page).getByRole("button", { name: "Help" }));
  const field = bar(page).getByRole("searchbox", {
    name: "Open the page of a function or a code",
  });
  await field.fill("add");
  await field.press("Enter");
  await expect(page.getByTestId("help-title")).toHaveText("add");
  const formatted = page.getByTestId("help-page");
  await holdsPrint(page, file("tests/scripts/help-add.txt"));
  // The name is the title, what it does stands under it, and its facts are a list of labels.
  await expect(formatted.getByRole("heading", { level: 3 })).toHaveText("add");
  await expect(
    formatted.getByRole("list", { name: "Facts of add" }).getByRole("listitem"),
  ).toHaveText(["data", "tier 1", "since 0.2.0", "1.0", "exact"]);
  // Headings are headings, in sentence case, a name in one keeping its capitals.
  await expect(formatted.getByRole("heading", { level: 4 })).toHaveText([
    "In brief",
    "Usage",
    "Description",
    "Arguments",
    "Value",
    "Missing values",
    "Details",
    "Warnings and notes",
    "A common mistake",
    "Coming from R or Stata",
    "Related tasks",
    "Accuracy",
    "See also",
    "Examples",
  ]);
  await expect(formatted.getByRole("heading", { level: 5 })).toHaveText([
    "What a definition may contain",
    "Replacing a variable",
  ]);
  // An argument with its type and whether its description is shared; the codes in a table,
  // each by its kind; R and Stata in a table of three columns; a list in the prose.
  const by = formatted.locator("dl.arguments dt").nth(1);
  await expect(by.locator("code")).toHaveText(["by:", "Vars"]);
  await expect(by).toContainText("shared");
  const codes = formatted.locator("table.codes");
  await expect(codes.locator("th")).toHaveText([
    "Note",
    "W0102",
    "Z0101",
    "Z0217",
    "Z0219",
    "Z0401",
  ]);
  await expect(codes.locator(".badge.note")).toHaveCount(1);
  await expect(codes.locator("button.badge.warning")).toHaveCount(1);
  await expect(codes.locator("button.badge.error")).toHaveCount(4);
  await expect(formatted.getByRole("columnheader")).toHaveText(["Zeff", "R", "Stata"]);
  await expect(formatted.locator("table.compare tbody tr")).toHaveCount(3);
  await expect(formatted.locator("ul.list").first().getByRole("listitem")).toHaveCount(3);
  // The usage and what an example typed are code in the editor's colours; what an example
  // printed is as printed, in a block that scrolls and is reached by the Tab key, by its name.
  await expect(formatted.locator("pre.usage").getByTestId("code").locator(".function")).toHaveText(
    "add",
  );
  const last = formatted.getByRole("group", { name: "Example" }).last();
  await expect(last.locator(".prompt").first()).toHaveText("> ");
  await expect(last.getByTestId("code").first()).toHaveText("let wages = dataset(wages)");
  expect(await last.evaluate((node) => getComputedStyle(node).whiteSpace)).toBe("pre");
  await expect(last).toHaveAttribute("tabindex", "0");
  // Every link of the page has a name.
  const unnamed = await formatted
    .getByRole("button")
    .evaluateAll((all) => all.filter((one) => (one.textContent ?? "").trim() === "").length);
  expect(unnamed).toBe(0);
});

test("a function named in a page, a related name and a code each open their own page", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await press(places(page).getByRole("button", { name: "Help" }));
  const field = bar(page).getByRole("searchbox", {
    name: "Open the page of a function or a code",
  });
  const title = page.getByTestId("help-title");
  const formatted = page.getByTestId("help-page");
  const open = async (name: string) => {
    await field.fill(name);
    await field.press("Enter");
    await expect(title).toHaveText(name);
  };
  await open("reg");
  // A function the prose names as a call.
  await press(formatted.getByRole("button", { name: "base()", exact: true }).first());
  await expect(title).toHaveText("base");
  await expect(formatted.getByRole("heading", { level: 3 })).toHaveText("base");
  // A code the prose names, and a code of the warnings and notes.
  await open("reg");
  await press(formatted.locator("p").getByRole("button", { name: "W1001", exact: true }).first());
  await expect(title).toHaveText("W1001");
  await expect(formatted.getByRole("heading", { level: 3 })).toHaveText("W1001");
  await open("reg");
  await press(formatted.locator("table.codes").getByRole("button", { name: "Z0802", exact: true }));
  await expect(title).toHaveText("Z0802");
  // A name a result answers to, under VALUE, and a name under SEE ALSO.
  await open("reg");
  await press(
    formatted.locator(".answers").getByRole("button", { name: "coef_plot", exact: true }),
  );
  await expect(title).toHaveText("coef_plot");
  await open("reg");
  const also = formatted.locator("section", {
    has: page.getByRole("heading", { name: "See also" }),
  });
  await press(also.getByRole("button", { name: "interact", exact: true }));
  await expect(title).toHaveText("interact");
  // A reference's title is set apart, and each reference stands on its own.
  await open("reg");
  await expect(formatted.locator("ul.references li")).toHaveCount(5);
  await expect(formatted.locator("ul.references em").first()).toHaveText(
    "Econometric Theory and Methods",
  );
});

test("a help page stays inside its place and never under 12.5 pixels, at every code size", async ({
  page,
  press,
}) => {
  // The narrowest window, with both panes open, as Help opens.
  await page.setViewportSize({ width: 1200, height: 800 });
  await scratch(page, press);
  await press(places(page).getByRole("button", { name: "Help" }));
  await expect(topics(page)).toBeVisible();
  await expect(related(page)).toBeVisible();
  const field = bar(page).getByRole("searchbox", {
    name: "Open the page of a function or a code",
  });
  const sizes = async () =>
    page.getByTestId("help").evaluate((help) => {
      const pane = help.querySelector(".page") as HTMLElement;
      let least = Infinity;
      for (const node of pane.querySelectorAll("*")) {
        // A block of code is at the code's size, which is the reader's to choose: the app's
        // own type, and the code set within it, is what is held.
        if (node.closest("pre") !== null) continue;
        if (node.textContent?.trim() && node.children.length === 0) {
          least = Math.min(least, parseFloat(getComputedStyle(node).fontSize));
        }
      }
      return { least, sideways: pane.scrollWidth - pane.clientWidth };
    });
  for (const name of ["reg", "add", "plot"]) {
    await field.fill(name);
    await field.press("Enter");
    await expect(page.getByTestId("help-title")).toHaveText(name);
    // The page is read down, never sideways: a long line of an example scrolls in its block.
    const usual = await sizes();
    expect(usual.sideways, name).toBe(0);
    expect(usual.least, name).toBeGreaterThanOrEqual(12.5);
  }
  // `plot` has an example 500 characters wide: its block scrolls, the page does not.
  const wide = page.getByTestId("help-page").getByRole("group", { name: "Example" }).last();
  expect(await wide.evaluate((node) => node.scrollWidth - node.clientWidth)).toBeGreaterThan(0);
  // At the smallest code size and at the largest.
  const smaller = page.getByRole("button", { name: "Smaller code text" });
  while (await smaller.isEnabled()) await press(smaller);
  const small = await sizes();
  expect(small.least).toBeGreaterThanOrEqual(12.5);
  expect(small.sideways).toBe(0);
  const larger = page.getByRole("button", { name: "Larger code text" });
  while (await larger.isEnabled()) await press(larger);
  expect((await sizes()).sideways).toBe(0);
});

test("a package's page is set from the engine's list, and a line the reader does not know is shown as printed", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await press(places(page).getByRole("button", { name: "Help" }));
  const field = bar(page).getByRole("searchbox", {
    name: "Open the page of a function or a code",
  });
  // A package's page: its functions with their one lines, the engine's words in its order
  // (`help-trail.spec.ts` holds every row to what `zeff help regress` prints).
  await field.fill("regress");
  await field.press("Enter");
  await expect(page.getByTestId("help-title")).toHaveText("regress");
  const formatted = page.getByTestId("help-page");
  await expect(formatted.getByRole("heading", { level: 3 })).toHaveText("regress");
  await expect(formatted).toContainText("package · tier 2");
  await expect(formatted).toContainText("10 functions in Zeff 0.8.0");
  await expect(formatted.getByRole("row").first()).toHaveText(
    /^reg\s*Linear regression by least squares, with fixed effects$/,
  );
  // A function that arrives with a later release has a line, and no page: the line is shown.
  await field.fill("a_learning");
  await field.press("Enter");
  await expect(page.getByTestId("help-title")).toHaveText("a_learning");
  await expect(page.getByTestId("help-page")).toContainText(
    "arrives with a release after 1.0, in the decide package",
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
