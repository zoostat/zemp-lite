// Search as one types, in the field at the top of Help's index (release 0.2.3, step 7; open
// decision #211, part 4; from release 0.3.1, step 11a, in the Topics pane at the left, where
// #245 draws it, and no longer in the place's bar): from the second letter a list stands
// under the field, in the index's place, with up to eight matches, each saying what it is and
// why it matched; the arrows move through it, Enter opens the one marked, Escape closes it,
// and `/` puts the cursor in the field, opening the pane where it is closed. Nothing found is
// a sentence and the nearest names. No request leaves the page.
import type { Locator, Page } from "@playwright/test";
import { expect, faintText, smallestText, test, useExample } from "./support";

const READY = "engine Zeff 0.9.0 ready";

async function scratch(page: Page, press: (target: Locator) => Promise<void>) {
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await useExample(page);
  await press(
    page.getByRole("navigation", { name: "Places" }).getByRole("button", { name: "Help" }),
  );
  await expect(page.getByTestId("help-counts")).toBeVisible();
}

const bar = (page: Page) => page.getByRole("toolbar", { name: "Help: its panes and its controls" });
const field = (page: Page) => index(page).getByRole("combobox", { name: /^Search Help/ });
/** The Topics pane, the index of Help, which holds the field and what it finds. */
const index = (page: Page) => page.locator('[data-pane="topics"]');
const list = (page: Page) => index(page).getByRole("listbox", { name: "What was found" });
const options = (page: Page) => list(page).getByRole("option");
const title = (page: Page) => page.getByTestId("help-title");
const shown = (page: Page) => page.getByTestId("help-page");
const back = (page: Page) => bar(page).getByRole("button", { name: "Back" });

/** An option as it reads: its kind, its name and the rest, with one space between the parts. */
const reads = async (option: Locator) => (await option.innerText()).replace(/\s+/g, " ").trim();

test("the field suggests from the second letter: what each match is, its one line, and why it matched", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await expect(field(page)).toHaveAttribute("placeholder", "Search: a name, a word, R or Stata");
  await expect(field(page)).toHaveAttribute("aria-expanded", "false");
  // One letter opens nothing; the second does.
  await field(page).pressSequentially("l");
  await expect(list(page)).toBeHidden();
  await field(page).pressSequentially("m");
  await expect(field(page)).toHaveAttribute("aria-expanded", "true");
  // `reg`, whose first R name it is, before `anova`, which R also writes with `lm`, and
  // `posthoc`, whose page writes it in R from Zeff 0.9.0.
  await expect(options(page)).toHaveCount(3);
  expect(await reads(options(page).first())).toBe(
    "function reg regress Linear regression by least squares, with fixed effects matched R lm()",
  );
  expect(await reads(options(page).nth(1))).toMatch(/^function anova stats .* matched R lm\(\)$/);
  // The arrow marks it, the field says which is marked, and Enter opens it.
  await expect(options(page).first()).toHaveAttribute("aria-selected", "false");
  await page.keyboard.press("ArrowDown");
  await expect(options(page).first()).toHaveAttribute("aria-selected", "true");
  await expect(field(page)).toHaveAttribute("aria-activedescendant", "help-found-0");
  await page.keyboard.press("Enter");
  await expect(title(page)).toHaveText("reg");
  // The page went into the history; the field is empty and the list gone.
  await expect(back(page)).toHaveAttribute("title", "Back: Home");
  await expect(field(page)).toHaveValue("");
  await expect(list(page)).toBeHidden();
  await expect(field(page)).toHaveAttribute("aria-expanded", "false");

  // A Stata name; the list is refreshed at each key, and the mouse opens a match too.
  await field(page).pressSequentially("tte");
  await expect(options(page).first()).toContainText("t_test");
  await field(page).pressSequentially("st");
  await expect(options(page)).toHaveCount(1);
  expect(await reads(options(page).first())).toBe(
    "function t_test stats t-tests for one mean, two groups or paired measurements matched Stata ttest",
  );
  await press(options(page).first());
  await expect(title(page)).toHaveText("t_test");
  await expect(back(page)).toHaveAttribute("title", "Back: reg");

  // A code begun: the codes, each with its title.
  await field(page).fill("W02");
  await expect(options(page)).toHaveCount(8);
  expect(await reads(options(page).first())).toBe(
    "code W0201 missing values skipped by a statistic",
  );
  // A slip of one key, from the fourth letter.
  await field(page).fill("regg");
  expect(await reads(options(page).first())).toMatch(/^function reg regress Linear regression/);
  // A word of a one line: the word that matched is marked in it.
  await field(page).fill("kolmo");
  expect(await reads(options(page).first())).toBe(
    "function ks_test stats Kolmogorov–Smirnov test of a variable against a distribution",
  );
  await expect(options(page).first().locator("b")).toHaveText("Kolmogorov");
  // A name with two functions lists the two apart, each saying which it is and its package
  // (#215); a package, a dataset and the functions of a name.
  await field(page).fill("summary");
  expect(await reads(options(page).nth(0))).toMatch(/^function summary of a frame data Table of N/);
  expect(await reads(options(page).nth(1))).toMatch(
    /^function summary of a result results The printed summary/,
  );
  await field(page).fill("plot");
  expect(await reads(options(page).nth(0))).toMatch(/^function plot of a frame plot /);
  expect(await reads(options(page).nth(1))).toMatch(/^function plot of a result plot /);
  expect(await reads(options(page).nth(2))).toBe("package plot 35 functions");
  await field(page).fill("wages");
  expect(await reads(options(page).first())).toMatch(/^dataset wages Synthetic hourly wages/);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(title(page)).toHaveText("wages");
});

test("typed before the engine has given its index, the list waits for it and never says nothing was found", async ({
  page,
  press,
}) => {
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  // Whether the sentence of nothing found was ever on the page, from before Help is opened.
  await page.evaluate(() => {
    const seen = { nothing: false };
    (window as unknown as { seen: typeof seen }).seen = seen;
    new MutationObserver(() => {
      if (document.querySelector(".found .nothing") !== null) seen.nothing = true;
    }).observe(document.body, { childList: true, subtree: true });
  });
  await press(
    page.getByRole("navigation", { name: "Places" }).getByRole("button", { name: "Help" }),
  );
  // At once, with no wait for Home to be drawn.
  await field(page).fill("ttest");
  await expect(options(page)).toHaveCount(1);
  await expect(options(page).first()).toContainText("t_test");
  expect(
    await page.evaluate(() => (window as unknown as { seen: { nothing: boolean } }).seen),
  ).toEqual({
    nothing: false,
  });
});

test("nothing found is a sentence and the nearest names, never an empty list", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await field(page).fill("xtreg");
  const said = index(page).getByRole("status");
  await expect(said).toHaveText(
    "Nothing here is called or described by “xtreg”. The nearest names:",
  );
  await expect(options(page)).toHaveCount(2);
  expect(await reads(options(page).nth(0))).toMatch(/^function ivreg regress /);
  expect(await reads(options(page).nth(1))).toMatch(/^function reg regress /);
  // A nearest name is opened as a match is.
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(title(page)).toHaveText("reg");
  // Where no name is near, the sentence says what can be typed, and there is nothing to mark.
  await field(page).fill("qqqqqqqq");
  await expect(said).toHaveText(
    "Nothing here is called or described by “qqqqqqqq”. Try a function's name, a word of what it does, an R or a Stata name, or a code.",
  );
  await expect(options(page)).toHaveCount(0);
  await page.keyboard.press("ArrowDown");
  await expect(field(page)).not.toHaveAttribute("aria-activedescendant", /./);
});

test("the arrows move through the list, Enter opens the marked or the name as typed, Escape closes, and / goes to the field", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await field(page).fill("test");
  await expect(options(page)).toHaveCount(8);
  const marked = () => list(page).locator('[aria-selected="true"]');
  await expect(marked()).toHaveCount(0);
  // Down through the list to its last, where it stays; up to the first, and then to none.
  for (let at = 0; at < 3; at++) await page.keyboard.press("ArrowDown");
  await expect(marked()).toHaveCount(1);
  await expect(field(page)).toHaveAttribute("aria-activedescendant", "help-found-2");
  for (let at = 0; at < 9; at++) await page.keyboard.press("ArrowDown");
  await expect(field(page)).toHaveAttribute("aria-activedescendant", "help-found-7");
  for (let at = 0; at < 7; at++) await page.keyboard.press("ArrowUp");
  await expect(field(page)).toHaveAttribute("aria-activedescendant", "help-found-0");
  await page.keyboard.press("ArrowUp");
  await expect(marked()).toHaveCount(0);
  // The cursor stays in the field throughout, and what was typed is as it was.
  await expect(field(page)).toBeFocused();
  await expect(field(page)).toHaveValue("test");
  // A key typed marks none again.
  await page.keyboard.press("ArrowDown");
  await field(page).pressSequentially("_");
  await expect(marked()).toHaveCount(0);
  await expect(field(page)).toHaveValue("test_");

  // Escape closes the list and keeps what was typed; a key opens it again.
  await field(page).fill("summ");
  await expect(list(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(list(page)).toBeHidden();
  await expect(field(page)).toHaveValue("summ");
  await expect(page.getByTestId("help")).toBeVisible();
  await field(page).pressSequentially("a");
  await expect(list(page)).toBeVisible();
  // With none marked, Enter opens the page of the name as typed, as the field always did.
  await field(page).fill("summary");
  await page.keyboard.press("Enter");
  await expect(title(page)).toHaveText("summary");
  await field(page).fill("w0201");
  await page.keyboard.press("Enter");
  await expect(title(page)).toHaveText("W0201");
  await field(page).fill("nosuchname");
  await page.keyboard.press("Enter");
  await expect(title(page)).toHaveText("nosuchname");
  await expect(page.getByTestId("help-page")).toContainText("no function or package is called");

  // The pointer marks what it rests on, and leaving the field closes the list.
  await field(page).fill("test");
  await options(page).nth(3).hover();
  await expect(options(page).nth(3)).toHaveAttribute("aria-selected", "true");
  // (A press on the page, beside the pane that holds the list.)
  await page
    .getByTestId("help")
    .locator(".page")
    .click({ position: { x: 6, y: 300 } });
  await expect(list(page)).toBeHidden();
  await expect(field(page)).not.toBeFocused();

  // `/` puts the cursor in the field, and is not typed into it; typed in the field it is a letter.
  await page.keyboard.press("/");
  await expect(field(page)).toBeFocused();
  await expect(field(page)).toHaveValue("test");
  await field(page).fill("");
  await field(page).pressSequentially("a/b");
  await expect(field(page)).toHaveValue("a/b");
  // From a button of the place too.
  await field(page).fill("");
  await bar(page).getByRole("button", { name: "Home" }).focus();
  await page.keyboard.press("/");
  await expect(field(page)).toBeFocused();
  await expect(field(page)).toHaveValue("");
});

test("no request leaves the page while one types and opens what was found", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  const asked: string[] = [];
  page.on("request", (request) => asked.push(request.url()));
  for (const word of ["regression", "lm", "W02", "xtreg", "sumnary"]) {
    await field(page).fill("");
    await field(page).pressSequentially(word);
    await expect(list(page)).toBeVisible();
  }
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  // The first found is one of the two functions `summary` names: its own page.
  await expect(title(page)).toHaveText("of a frame");
  expect(asked).toEqual([]);
});

for (const theme of ["light", "dark"] as const) {
  test(`the list stands in the index's place under the field, is read as a combobox's, and keeps to the sizes and the contrast, in the ${theme} theme`, async ({
    page,
    press,
  }) => {
    await page.setViewportSize({ width: 1200, height: 700 });
    await scratch(page, press);
    if (theme === "dark") await press(page.getByRole("switch", { name: "Dark" }));
    const inside = async () => {
      // The list, its field and their pane, measured at one moment.
      const at = await index(page).evaluate((node) => {
        const box = node.querySelector(".found")!.getBoundingClientRect();
        const under = node.querySelector("input")!.getBoundingClientRect();
        const pane = node.getBoundingClientRect();
        return {
          left: box.left,
          right: box.right,
          top: box.top,
          field: under.bottom,
          pane: { left: pane.left, right: pane.right },
          // The index gives its place to the list: none of its sections is drawn beside it.
          sections: [...node.querySelectorAll("section")].filter(
            (one) => one.getBoundingClientRect().height > 0,
          ).length,
          across: node.scrollWidth - node.clientWidth,
          sideways: document.documentElement.scrollWidth - innerWidth,
        };
      });
      // In the pane, under the field, and nothing pushed sideways by it.
      expect(at.left).toBeGreaterThanOrEqual(at.pane.left);
      expect(at.right).toBeLessThanOrEqual(at.pane.right);
      expect(at.top).toBeGreaterThanOrEqual(at.field);
      expect(at.sections).toBe(0);
      expect(at.across).toBeLessThanOrEqual(0);
      expect(at.sideways).toBe(0);
    };
    // Eight matches, the longest lines there are; then the same in a narrower window.
    await field(page).fill("test");
    await expect(options(page)).toHaveCount(8);
    await inside();
    // Read as a combobox with its list: the field names the list it controls and has a popup's
    // manners; each match is an option with its words.
    await expect(field(page)).toHaveAttribute("aria-controls", "help-found");
    await expect(field(page)).toHaveAttribute("aria-autocomplete", "list");
    await expect(list(page)).toHaveAttribute("id", "help-found");
    await expect(field(page)).toHaveAccessibleName(
      "Search Help: a function, a package, a dataset, a code, or an R or Stata name",
    );
    await page.keyboard.press("ArrowDown");
    expect(await smallestText(page)).toBeGreaterThanOrEqual(12.5);
    expect(await faintText(index(page).locator(".found"))).toEqual([]);
    await field(page).fill("lm");
    await expect(options(page)).toHaveCount(3);
    expect(await faintText(index(page).locator(".found"))).toEqual([]);
    await page.keyboard.press("ArrowDown");
    expect(await faintText(index(page).locator(".found"))).toEqual([]);
    await field(page).fill("xtreg");
    await expect(index(page).getByRole("status")).toBeVisible();
    expect(await faintText(index(page).locator(".found"))).toEqual([]);
    // The field's own words, where nothing is typed, and the index under it.
    await field(page).fill("");
    expect(await faintText(index(page))).toEqual([]);

    await page.setViewportSize({ width: 1000, height: 700 });
    await field(page).fill("test");
    await expect(options(page)).toHaveCount(8);
    await inside();
    // The index is back in its place once the field is left, and the bar holds its trail still.
    await page.keyboard.press("Escape");
    await expect(index(page).getByRole("region", { name: "Start here" })).toBeVisible();
    const fits = await bar(page).evaluate((node) => node.scrollWidth <= node.clientWidth);
    expect(fits).toBe(true);
  });
}

test("Return with no match marked opens what was typed where that is a name, and otherwise the first match", async ({
  page,
  press,
}) => {
  // Release 0.2.4, step 13. Until 0.2.4, Return with no match marked always opened the page of
  // what was typed: for a name known from R or Stata that was the engine's sentence that it has
  // no such name, though the list under the field showed the function it had found.
  await scratch(page, press);
  const typed = async (text: string) => {
    await field(page).fill(text);
    await expect(options(page).first()).toBeVisible();
    await field(page).press("Enter");
  };
  // A name of R: the function it finds.
  await typed("lm");
  await expect(title(page)).toHaveText("reg");
  await expect(shown(page)).toContainText("Linear regression by least squares");
  // A name of Stata.
  await typed("ttest");
  await expect(title(page)).toHaveText("t_test");
  // A slip of one key in a name: the name meant.
  await typed("regg");
  await expect(title(page)).toHaveText("reg");
  // What was typed is a name: its own page, though other names begin with it. `plot` is a
  // package and two functions; `histogram` is two functions, and opens their chooser.
  await typed("histogram");
  await expect(title(page)).toHaveText("histogram");
  await expect(shown(page)).toContainText("histogram is two functions.");
  await typed("reg");
  await expect(title(page)).toHaveText("reg");
  // Nothing found: the engine's own sentence, as before.
  await field(page).fill("zzqqzz");
  await field(page).press("Enter");
  await expect(shown(page)).toContainText("no function or package is called");
});

test("a name the engine suggests in its sentence is a link to that name's page", async ({
  page,
}) => {
  // Release 0.2.4, step 13: the sentence said "did you mean" a name, and the name was not a link.
  await page.goto("/#/help/name/lm");
  await expect(shown(page)).toContainText("no function or package is called");
  await expect(shown(page)).toContainText("did you mean");
  const meant = shown(page).getByRole("button", { name: "lp", exact: true });
  await expect(meant).toHaveAttribute("title", "Open the page of lp");
  // The name that was not found is said, not offered.
  await expect(shown(page).getByRole("button", { name: "lm", exact: true })).toHaveCount(0);
  await meant.click();
  await expect(title(page)).toHaveText("lp");
  await expect(shown(page)).not.toContainText("no function or package is called");
  // From the keyboard too.
  await page.goto("/#/help/name/regg");
  const other = shown(page).getByRole("button", { name: "reg", exact: true });
  await other.focus();
  await page.keyboard.press("Enter");
  await expect(title(page)).toHaveText("reg");
});

test("the field stands at the top of the index and not in the bar, and stays there while the index moves under it", async ({
  page,
  press,
}) => {
  // Release 0.3.1, step 11a (open decision #245): until then the field stood at the right end
  // of the place's bar.
  await page.setViewportSize({ width: 1280, height: 600 });
  await scratch(page, press);
  await expect(bar(page).getByRole("combobox")).toHaveCount(0);
  await expect(field(page)).toBeVisible();
  await expect(field(page)).toHaveAttribute("title", /an R or a Stata name, or a code$/);
  // Above every section of the index.
  const top = async (of: Locator) => (await of.boundingBox())!.y;
  const first = index(page).getByRole("region", { name: "Start here" });
  expect(await top(field(page))).toBeLessThan(await top(first));
  // A long list unfolded, and the pane moved to its end: the field is where it was.
  await press(index(page).getByRole("button", { name: /^Functions/ }));
  await expect(index(page).getByRole("list", { name: "Functions" })).toBeVisible();
  const before = await top(field(page));
  const side = page.locator("aside", { has: index(page) });
  await side.evaluate((node) => (node.scrollTop = node.scrollHeight));
  expect(await side.evaluate((node) => node.scrollTop)).toBeGreaterThan(500);
  await expect(field(page)).toBeInViewport();
  expect(await top(field(page))).toBeLessThanOrEqual(before);
  // And it answers there as it did: a name typed and found, from the end of the long list.
  await field(page).fill("ttest");
  await expect(options(page)).toHaveCount(1);
  await expect(options(page).first()).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(title(page)).toHaveText("t_test");
});

test("/ and Help: search open the index where it is closed, and put the cursor in its field", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  const topics = bar(page).getByRole("button", { name: "Topics", exact: true });
  await press(topics);
  await expect(topics).toHaveAttribute("aria-pressed", "false");
  await expect(index(page)).toHaveCount(0);
  await bar(page).getByRole("button", { name: "Home" }).focus();
  await page.keyboard.press("/");
  await expect(topics).toHaveAttribute("aria-pressed", "true");
  await expect(field(page)).toBeFocused();
  await expect(field(page)).toHaveValue("");
  // From ⌘K too, and from another place.
  await press(topics);
  await press(
    page.getByRole("navigation", { name: "Places" }).getByRole("button", { name: "Script" }),
  );
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByRole("combobox", { name: "Type a command" }).fill("help search");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("help")).toBeVisible();
  await expect(field(page)).toBeFocused();
});
