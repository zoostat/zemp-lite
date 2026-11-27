// The whole of what release 0.3 drew (step 22): Help with its examples run, Paper in each of
// its states, a script asked about its PDF, a file being read, and the Variables pane for a
// text, each held to the same floor in both themes, at a desk's width and a tablet's held
// sideways (until release 0.3.1, a phone's: open decision #243): nothing under 12.5 pixels,
// nothing fainter than 4.5 to 1, nothing wider than the window; and through the keyboard, every stop of the Tab key with a name. Each screen has
// tests of its own for what it does; this one holds them all to one floor, state by state.
import type { Locator, Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { expect, faintText, smallestText, test, write } from "./support";

const READY = "engine Zeff 0.9.0 ready";
const SET = /^Typst 0\.15\.1 · set in \d+ ms$/;
const DESK = { width: 1280, height: 800 };
const TABLET = { width: 1024, height: 768 };

type Press = (target: Locator) => Promise<void>;

const reviews = (
  JSON.parse(readFileSync(new URL("../scripts/properties-text.json", import.meta.url), "utf8")) as {
    setup: string;
  }
).setup;

/**
 * The floor every screen keeps to, at a desk's width and then at a tablet's held sideways, the
 * narrowest window Zemp Lite is laid out for (open decision #243): sizes and contrast at both,
 * and nothing wider than the window at either.
 */
async function floor(page: Page, what: string): Promise<void> {
  for (const [size, where] of [
    [DESK, "at a desk's width"],
    [TABLET, "at a tablet's width"],
  ] as const) {
    await page.setViewportSize(size);
    expect(await smallestText(page), `${what}, ${where}: the smallest text`).toBeGreaterThanOrEqual(
      12.5,
    );
    expect(await faintText(page.locator("body")), `${what}, ${where}: faint text`).toEqual([]);
    const over = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(over, `${what}, ${where}: wider than the window`).toBeLessThanOrEqual(0);
  }
  await page.setViewportSize(DESK);
}

/**
 * The stops of the Tab key from where the focus is, each by its name, until one comes round
 * that this walk or an earlier one on the page has stopped at.
 */
async function stops(page: Page, tab: string, most = 60): Promise<string[]> {
  const names: string[] = [];
  await page.evaluate(() => {
    (window as unknown as { stopped?: Set<Element> }).stopped ??= new Set();
  });
  for (let at = 0; at < most; at += 1) {
    await page.keyboard.press(tab);
    const name = await page.evaluate(() => {
      const seen = (window as unknown as { stopped: Set<Element> }).stopped;
      const on = document.activeElement as HTMLElement | null;
      if (on === null || on === document.body) return null;
      if (seen.has(on)) return "";
      seen.add(on);
      // Its name as a reader of the screen hears it: its label, else its words, else its title.
      const said = on.cloneNode(true) as HTMLElement;
      for (const hidden of said.querySelectorAll('[aria-hidden="true"]')) hidden.remove();
      const words = (on.getAttribute("aria-label") ?? said.textContent ?? "")
        .replace(/\s+/g, " ")
        .trim();
      return words || (on.getAttribute("title") ?? "").trim() || "(no name)";
    });
    if (name === null) continue;
    if (name === "") break;
    names.push(name);
  }
  return names;
}

const places = (page: Page) => page.getByRole("navigation", { name: "Places" });
const bar = (page: Page, place: string) =>
  page.getByRole("toolbar", { name: `${place}: its panes and its controls` });

async function scratch(page: Page, press: Press): Promise<void> {
  await page.setViewportSize(DESK);
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
}

for (const theme of ["light", "dark"] as const) {
  test.describe(`in the ${theme} theme`, () => {
    test("Help, a function's page with its examples run", async ({ page, press }) => {
      await scratch(page, press);
      if (theme === "dark") await press(page.getByRole("switch", { name: "Dark" }));
      await press(places(page).getByRole("button", { name: "Help" }));
      await page.getByRole("combobox", { name: /^Search Help/ }).fill("mean");
      await page.keyboard.press("Enter");
      await expect(page.getByTestId("help-title")).toHaveText("mean");
      await expect(page.getByTestId("example-status").first()).toHaveText(/^run by the engine in/, {
        timeout: 30_000,
      });
      await floor(page, "a function's page, its examples run");
      // An example edited, and not run: its words, and its buttons.
      const first = page.getByTestId("example").first();
      await first.getByRole("textbox").first().focus();
      await page.keyboard.press("End");
      await page.keyboard.type(" ");
      await expect(first.getByTestId("example-status")).toHaveText("edited · not run");
      await floor(page, "an example edited and not run");
    });

    test("Paper in each of its states", async ({ page, press, browserName }) => {
      test.slow();
      await scratch(page, press);
      if (theme === "dark") await press(page.getByRole("switch", { name: "Dark" }));
      // A script that writes a table, not run: the paper will lack it.
      await write(
        page,
        'let w = dataset(wages).where(year == 2019)\nreport([w.reg(wage ~ educ)]).export("output/fit.typ")\n',
      );
      await expect(page.getByText("saving")).toHaveCount(0);
      await press(places(page).getByRole("button", { name: "Paper" }));
      await expect(page.getByRole("region", { name: "No paper is open" })).toBeVisible();
      await floor(page, "Paper with no paper");
      // The line that asks a name, with a refusal in it.
      await press(bar(page, "Paper").getByRole("button", { name: "New paper…" }));
      const field = page.getByRole("textbox", { name: "The new paper's name" });
      await field.fill("a/b");
      await field.press("Enter");
      await expect(page.getByRole("form", { name: "A new paper" }).getByRole("note")).toContainText(
        "one part of a path",
      );
      await floor(page, "the line that asks a paper's name, refusing one");
      await field.fill("paper");
      await field.press("Enter");
      await expect(page.getByTestId("paper-typst")).toHaveText(SET, { timeout: 60_000 });
      for (const pane of ["Project", "Outline"]) {
        await press(bar(page, "Paper").getByRole("button", { name: pane, exact: true }));
      }
      await floor(page, "a paper open and set, with its panes");
      // Through the keyboard: every stop has a name, the place's own controls among them. The
      // editor keeps the Tab key for itself, and says so; Escape and then Tab moves on from it.
      await bar(page, "Paper").getByRole("button", { name: "Project", exact: true }).focus();
      // (Safari on a Mac keeps the plain Tab key for fields of text: Option and Tab stops at all.)
      const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
      const names = await stops(page, tab);
      if (tab === "Tab") {
        expect(names.at(-1)).toBe("The paper's source");
        await page.keyboard.press("Escape");
        names.push(...(await stops(page, tab)));
      }
      expect(names).not.toContain("(no name)");
      for (const name of [
        "Outline",
        "Close",
        "Export PDF…",
        "New paper…",
        "Page",
        "Fit width",
        "Smaller page",
        "Larger page",
        "The paper's source",
        "The pages of the paper",
      ]) {
        expect(names, name).toContain(name);
      }
      // A formula without its face, an unknown name and a file the project lacks: a warning,
      // an error and a file named with its script, all at once.
      const source = page.getByRole("textbox", { name: "The paper's source" });
      await source.focus();
      await page.keyboard.press("ControlOrMeta+a");
      await page.keyboard.insertText(
        '= A paper\n\nThe sum $x^2$.\n\n#include "../output/fit.typ"\n',
      );
      await expect(page.getByTestId("paper-lacking")).toBeVisible();
      await expect(page.getByTestId("paper-standing")).toContainText("Typst refuses the text");
      await floor(page, "a paper refused, with a file it lacks named");
      // Run: the table is written and the paper set; then the script changed, the table stale.
      await press(page.getByRole("button", { name: "Run", exact: true }));
      await expect(page.getByTestId("paper-lacking")).toHaveCount(0, { timeout: 60_000 });
      await expect(page.getByTestId("paper-standing")).toHaveText(
        "Typst set the paper, with 1 warning.",
      );
      await press(places(page).getByRole("button", { name: "Script" }));
      await write(
        page,
        'let w = dataset(wages).where(year == 2019)\nreport([w.reg(wage ~ educ + exper)]).export("output/fit.typ")\n',
      );
      await expect(page.getByText("saving")).toHaveCount(0);
      await press(places(page).getByRole("button", { name: "Paper" }));
      await expect(page.getByTestId("paper-stale")).toBeVisible();
      await floor(page, "a paper set with a warning, its table stale");
    });

    test("a script asked about its PDF, a file being read, and a text in the Variables pane", async ({
      page,
      press,
    }) => {
      test.slow();
      await scratch(page, press);
      if (theme === "dark") await press(page.getByRole("switch", { name: "Dark" }));
      // Export script with output, on a script not yet run: the line that asks.
      await press(bar(page, "Script").getByRole("button", { name: "Export script with output" }));
      await expect(page.getByRole("group", { name: "Export script with output" })).toBeVisible();
      await floor(page, "a script not run, asked about its PDF");
      await press(
        page
          .getByRole("group", { name: "Export script with output" })
          .getByRole("button", { name: "Cancel" }),
      );
      // A file being read: the LaTeX table the second example writes.
      await press(bar(page, "Script").getByRole("button", { name: "Project", exact: true }));
      const tree = page
        .getByRole("complementary", { name: "Script: the left pane" })
        .getByRole("region", { name: "Project" });
      await press(tree.getByRole("button", { name: /^instruments\.zeff/ }));
      await press(page.getByRole("button", { name: "Run", exact: true }));
      await expect(page.getByRole("status")).toHaveText("done", { timeout: 60_000 });
      await press(tree.getByRole("button", { name: /^table_iv\.tex/ }));
      await expect(page.getByTestId("read-only")).toBeVisible();
      await floor(page, "a file being read");
      // The Variables pane for a column of reviews.
      await press(tree.getByRole("button", { name: /^main\.zeff/ }));
      await write(page, reviews);
      await press(page.getByRole("button", { name: "Run", exact: true }));
      await expect(page.getByRole("status")).toHaveText("done");
      await press(places(page).getByRole("button", { name: "Data" }));
      await press(
        page
          .getByRole("grid")
          .getByRole("columnheader", { name: "review", exact: true })
          .getByRole("button")
          .first(),
      );
      const pane = page
        .getByRole("complementary", { name: "Data: the right pane" })
        .getByRole("region", { name: "Variables" });
      await expect(pane.getByTestId("variable-repeats")).toBeVisible();
      await floor(page, "the Variables pane for a text of many values");
    });
  });
}
