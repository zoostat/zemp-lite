// A place of the page and its place in the source (release 0.3, step 14): a press on a word,
// a heading, a table or a figure of the page puts the cursor at its place in the source; and
// the **Outline** pane lists the paper's headings by level, each going to its place in the
// source and on the page, the one the cursor is under marked.
//
// Where a thing stands on a page is asked of Typst itself: the module's build for Node sets
// the same paper beside the test, and says which points of a page lead to which line. The
// test then presses those points in the browser.
import type { Locator, Page } from "@playwright/test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { expect, test } from "./support";

const READY = "engine Zeff 0.9.0 ready";
const SET = /^Typst 0\.15\.1 · set in \d+ ms$/;
const MAIN = "paper/paper.typ";
const TABLE = "paper/table.typ";
const FIGURE = "data/figure.svg";

type Press = (target: Locator) => Promise<void>;

const places = (page: Page) => page.getByRole("navigation", { name: "Places" });
const bar = (page: Page) =>
  page.getByRole("toolbar", { name: "Paper: its panes and its controls" });
const source = (page: Page) => page.getByRole("textbox", { name: "The paper's source" });
const foot = (page: Page) => page.getByTestId("paper-typst");
const sheets = (page: Page) => page.getByTestId("paper-page");
const outline = (page: Page) =>
  page
    .getByRole("complementary", { name: "Paper: the left pane" })
    .getByRole("region", { name: "Outline" });
const activeLine = (page: Page) => page.locator(".cm-lineNumbers .cm-activeLineGutter");

/** The module as it is built for Node, which is Typst. */
interface Built {
  Paper: new (main: string) => {
    add_font(bytes: Uint8Array): number;
    put_text(path: string, text: string): boolean;
    put_bytes(path: string, bytes: Uint8Array): boolean;
    set(): string;
    click(page: number, x: number, y: number): string;
    outline(): string;
  };
}
const root = path.resolve(import.meta.dirname, "../..");
function typst(): Built {
  const built = path.join(root, "paper/pkg/node/zemp_paper.js");
  if (!existsSync(built))
    throw new Error("the Paper module is not built: run `npm run build:paper`");
  return createRequire(import.meta.url)(built) as Built;
}

/** A small figure, as a script's `export` writes one. */
const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60"><rect width="120" height="60" fill="#444"/></svg>';

const TABLE_TEXT = "#table(columns: 2, [educ], [0.08], [exper], [0.03])\n";

/** A paper of two pages: a heading, a paragraph, a table of its own, one included, and a figure. */
const TEXT = [
  '#show math.equation: set text(font: "Libertinus Math")',
  "#set page(width: 300pt, height: 420pt, margin: 20pt)",
  "= Returns to schooling",
  "",
  "A paragraph of the paper, long enough to be pressed anywhere along its first line.",
  "",
  "== Its own table",
  "",
  "#table(columns: 2, [wage], [27.37])",
  "",
  "== An included table",
  "",
  '#include "table.typ"',
  "",
  '#image("../data/figure.svg", width: 120pt)',
  "#pagebreak()",
  "= Results",
  "",
  "The last words of the paper.",
  "",
].join("\n");

interface Point {
  page: number;
  x: number;
  y: number;
}

/**
 * For each file and line a point of a page leads to, a point that leads there, by Typst's
 * word: the first met going down the page and across it, and under `far:` the last met on
 * that same row of points (a place further along the line).
 */
function pointsOf(): Map<string, Point> {
  const paper = new (typst().Paper)(MAIN);
  const fonts = path.join(root, "paper/fonts");
  for (const name of readdirSync(fonts).sort()) {
    if (/\.(otf|ttf)$/.test(name)) paper.add_font(readFileSync(path.join(fonts, name)));
  }
  paper.put_text(MAIN, TEXT);
  paper.put_text(TABLE, TABLE_TEXT);
  paper.put_bytes(FIGURE, new TextEncoder().encode(SVG));
  const set = JSON.parse(paper.set()) as { ok: boolean; pages: [number, number][] };
  if (!set.ok) throw new Error("the paper of the test does not set");
  const found = new Map<string, Point>();
  const leads = (page: number, x: number, y: number): string | null => {
    const place = JSON.parse(paper.click(page, x, y)) as { file: string | null; line?: number };
    return place.file === null ? null : `${place.file}:${place.line}`;
  };
  set.pages.forEach(([width, height], page) => {
    for (let y = 4; y < height; y += 2) {
      for (let x = 4; x < width; x += 2) {
        const key = leads(page, x, y);
        if (key === null) continue;
        // A point well inside the thing: every point within two points of it leads there
        // too, so that a press a pixel off is still a press on it.
        const about = [-2, -1, 0, 1, 2];
        const inside = about.every((right) =>
          about.every((down) => leads(page, x + right, y + down) === key),
        );
        if (!inside) continue;
        const first = found.get(key);
        if (first === undefined) found.set(key, { page, x, y });
        else if (first.page === page && first.y === y) found.set(`far:${key}`, { page, x, y });
      }
    }
  });
  return found;
}

/** The Scratch project with the paper of the test, its table and its figure, set. */
async function opened(page: Page, press: Press): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await page.getByLabel("Files to add to the project's data").setInputFiles({
    name: "figure.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from(SVG),
  });
  await press(places(page).getByRole("button", { name: "Paper" }));
  for (const [name, text] of [
    ["table", TABLE_TEXT],
    ["paper", TEXT],
  ] as const) {
    await press(bar(page).getByRole("button", { name: "New paper…" }));
    const field = page.getByRole("textbox", { name: "The new paper's name" });
    await field.fill(name);
    await field.press("Enter");
    await expect(page.getByTestId("paper-path")).toHaveText(`paper/${name}.typ`);
    await source(page).focus();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.insertText(text);
    await expect(page.locator("header .file")).toHaveText(`/ ${name}.typ · saved`);
    await expect(foot(page)).toHaveText(SET, { timeout: 60_000 });
  }
  await expect(page.getByTestId("paper-pages")).toHaveText("2 pages");
  await expect(page.getByTestId("paper-standing")).toHaveCount(0);
}

/** Press a point of a page, given in points from the page's top left. */
async function pressAt(page: Page, at: Point): Promise<void> {
  // The point is brought to the middle of the page's pane first: a page is taller than the pane.
  await page.getByTestId("paper-pages-view").evaluate((view, to) => {
    const sheet = view.querySelectorAll<HTMLElement>('[data-testid="paper-page"]')[to.page];
    if (sheet === undefined) throw new Error(`the paper shows no page ${to.page + 1}`);
    const box = sheet.getBoundingClientRect();
    const top = box.top - view.getBoundingClientRect().top + view.scrollTop;
    view.scrollTop = top + to.y * (box.width / 300) - view.clientHeight / 2;
  }, at);
  const box = (await sheets(page).nth(at.page).boundingBox())!;
  const scale = box.width / 300;
  await page.mouse.click(box.x + at.x * scale, box.y + at.y * scale);
}

/** Put the cursor at the start of a line of the paper's source, however its lines wrap. */
async function cursorTo(page: Page, line: number): Promise<void> {
  await expect(async () => {
    await source(page).focus();
    // From the paper's first line, so that the editor has drawn its lines from the first.
    await page.keyboard.press("ControlOrMeta+Home");
    await expect(activeLine(page)).toHaveText("1", { timeout: 1_000 });
    await source(page).evaluate((content, at) => {
      const row = content.querySelectorAll(":scope > .cm-line")[at - 1];
      if (row === undefined) throw new Error(`the paper shows no line ${at}`);
      getSelection()?.collapse(row, 0);
    }, line);
    await expect(activeLine(page)).toHaveText(String(line), { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
}

test("a press on a heading, a word, a table or a figure of the page puts the cursor at its place in the source", async ({
  page,
  press,
  mouseWorks,
}) => {
  test.skip(
    !mouseWorks,
    "a press on a point of a picture needs the mouse to land where it is aimed",
  );
  const points = pointsOf();
  const at = (file: string, line: number): Point => {
    const point = points.get(`${file}:${line}`);
    if (point === undefined)
      throw new Error(`no point of the pages leads to ${file}, line ${line}`);
    return point;
  };
  await opened(page, press);
  // The heading of the first page, on line 3; then a word of the paragraph, on line 5.
  await pressAt(page, at(MAIN, 3));
  await expect(activeLine(page)).toHaveText("3");
  await expect(source(page)).toBeFocused();
  await pressAt(page, at(MAIN, 5));
  await expect(activeLine(page)).toHaveText("5");
  // A word further along the line: the cursor is in the word pressed, not at the line's start.
  const far = points.get(`far:${MAIN}:5`);
  expect(far).toBeDefined();
  expect((far as Point).x).toBeGreaterThan(at(MAIN, 5).x + 60);
  await pressAt(page, far as Point);
  await expect(activeLine(page)).toHaveText("5");
  await expect
    .poll(() =>
      source(page).evaluate((content) => {
        const selection = getSelection();
        const line = content.querySelector(".cm-activeLine");
        if (selection === null || selection.focusNode === null || line === null) return -1;
        const before = document.createRange();
        before.setStart(line, 0);
        before.setEnd(selection.focusNode, selection.focusOffset);
        return before.toString().length;
      }),
    )
    .toBeGreaterThan(10);
  // A cell of the paper's own table, on line 9; and the figure, on line 15.
  await pressAt(page, at(MAIN, 9));
  await expect(activeLine(page)).toHaveText("9");
  await pressAt(page, at(MAIN, 15));
  await expect(activeLine(page)).toHaveText("15");
  // A cell of the included table came from another file: the cursor goes to the line of the
  // paper that includes it, and the paper stays the one open.
  await pressAt(page, at(TABLE, 1));
  await expect(activeLine(page)).toHaveText("13");
  await expect(page.getByTestId("paper-path")).toHaveText(MAIN);
  // The second page: its heading, on line 17, and its words, on line 19.
  await pressAt(page, at(MAIN, 17));
  await expect(activeLine(page)).toHaveText("17");
  await pressAt(page, at(MAIN, 19));
  await expect(activeLine(page)).toHaveText("19");
  // The margin leads nowhere: the cursor stays.
  await pressAt(page, { page: 1, x: 4, y: 4 });
  await pressAt(page, at(MAIN, 3));
  await expect(activeLine(page)).toHaveText("3");
  // What is typed after a press goes into the source at that place, and onto the page.
  await page.keyboard.press("End");
  await page.keyboard.insertText(", revisited");
  await expect
    .poll(async () =>
      (await source(page).locator(".cm-line").nth(2).textContent())?.endsWith(", revisited"),
    )
    .toBe(true);
});

test("the Outline lists the headings by level with their lines, marks the one the cursor is under, and goes to each by the keyboard", async ({
  page,
  press,
}) => {
  await opened(page, press);
  await press(bar(page).getByRole("button", { name: "Outline", exact: true }));
  const rows = outline(page).getByTestId("paper-outline").getByRole("button");
  await expect(rows).toHaveText([
    "Returns to schooling 3",
    "Its own table 7",
    "An included table 11",
    "Results 17",
  ]);
  // A heading under another stands further in.
  const indent = (row: Locator) =>
    row.evaluate((button) => parseFloat(getComputedStyle(button).paddingLeft));
  expect(await indent(rows.nth(1))).toBeGreaterThan(await indent(rows.nth(0)));
  expect(await indent(rows.nth(3))).toBe(await indent(rows.nth(0)));
  await expect(rows.nth(0)).toHaveAttribute("title", "Go to line 3, and to page 1");
  await expect(rows.nth(3)).toHaveAttribute("title", "Go to line 17, and to page 2");
  // By the keyboard: a heading of the second page, in the source and on the page.
  const view = page.getByTestId("paper-pages-view");
  expect(await view.evaluate((node) => node.scrollTop)).toBe(0);
  await rows.nth(3).focus();
  await page.keyboard.press("Enter");
  await expect(activeLine(page)).toHaveText("17");
  await expect(source(page)).toBeFocused();
  await expect(rows.nth(3)).toHaveAttribute("aria-current", "location");
  await expect(rows.nth(0)).not.toHaveAttribute("aria-current", "location");
  // The page's pane has come to the second page, its heading a little under the pane's top,
  // or as far as the pane scrolls where the pages end before that.
  await expect
    .poll(async () => {
      const second = (await sheets(page).nth(1).boundingBox())!;
      const pane = (await view.boundingBox())!;
      const atEnd = await view.evaluate(
        (node) => node.scrollTop + node.clientHeight >= node.scrollHeight - 1,
      );
      return second.y - pane.y < 60 || (atEnd && second.y - pane.y < pane.height / 2);
    })
    .toBe(true);
  // The mark follows the cursor through the source: under a heading's own words, it is that one.
  await cursorTo(page, 1);
  await expect(rows.nth(0)).not.toHaveAttribute("aria-current", "location");
  for (const [line, row] of [
    [5, 0],
    [9, 1],
    [13, 2],
    [15, 2],
    [19, 3],
  ] as const) {
    await cursorTo(page, line);
    await expect(rows.nth(row)).toHaveAttribute("aria-current", "location");
    await expect(outline(page).locator('[aria-current="location"]')).toHaveCount(1);
  }
  // And back to the first heading, with the mouse or the keyboard as the reader has it.
  await press(rows.nth(0));
  await expect(activeLine(page)).toHaveText("3");
  await expect.poll(() => view.evaluate((node) => node.scrollTop)).toBeLessThan(40);
});

test("the Outline follows the paper as it is typed, names a heading that came from another file, and says where there is none", async ({
  page,
  press,
}) => {
  await opened(page, press);
  await press(bar(page).getByRole("button", { name: "Outline", exact: true }));
  const rows = outline(page).getByTestId("paper-outline").getByRole("button");
  await expect(rows).toHaveCount(4);
  // A heading typed is listed a moment after; one taken out is gone.
  await source(page).focus();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.insertText("=== A last word\n");
  await expect(rows).toHaveCount(5);
  await expect(rows.nth(4)).toHaveText("A last word 20");
  // While Typst refuses the text the headings of the pages that stay are those listed.
  await page.keyboard.insertText("#nosuch()\n");
  await expect(page.getByTestId("paper-standing")).toContainText("Typst refuses the text");
  await expect(rows).toHaveCount(5);
  await page.keyboard.press("ControlOrMeta+z");
  await expect(page.getByTestId("paper-standing")).toHaveCount(0);
  // A paper with one heading of its own and one inside the table it includes.
  await source(page).focus();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.insertText('= Only this\n\n#include "table.typ"\n');
  await expect(rows).toHaveText(["Only this 1"]);
  await press(bar(page).getByRole("button", { name: "Close", exact: true }));
  await press(
    page
      .getByRole("region", { name: "No paper is open" })
      .getByRole("button", { name: "paper/table.typ" }),
  );
  await source(page).focus();
  await page.keyboard.press("ControlOrMeta+Home");
  await page.keyboard.insertText("== The fit\n\n");
  await expect(page.locator("header .file")).toHaveText("/ table.typ · saved");
  await press(bar(page).getByRole("button", { name: "Close", exact: true }));
  await press(
    page
      .getByRole("region", { name: "No paper is open" })
      .getByRole("button", { name: "paper/paper.typ" }),
  );
  await expect(rows).toHaveText(["Only this 1", "The fit 3"]);
  await expect(rows.nth(1)).toHaveAttribute(
    "title",
    "Go to line 3, which names paper/table.typ, and to page 1",
  );
  await press(rows.nth(1));
  await expect(activeLine(page)).toHaveText("3");
  // No heading at all: the pane says what makes one.
  await source(page).focus();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.insertText("Only a paragraph.\n");
  await expect(rows).toHaveCount(0);
  await expect(outline(page)).toContainText("This paper has no headings, tables or figures.");
});
