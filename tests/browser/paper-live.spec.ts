// The live page of a paper (release 0.3, step 13): the source set by Typst a short pause
// after the last key and drawn page by page at the pane's width, with **Fit width**, a size
// smaller and larger and the count of pages; the page always in the light print theme; where
// Typst refuses the source, its words at their line in the editor and the last pages that set
// kept, marked as not of the present text; and the files a paper reads taken from the project.
import type { Locator, Page } from "@playwright/test";
import { expect, faintText, smallestText, test } from "./support";

const READY = "engine Zeff 0.9.0 ready";
const SET = /^Typst 0\.15\.1 · set in \d+ ms$/;
const MATHEMATICS = '#show math.equation: set text(font: "Libertinus Math")';

type Press = (target: Locator) => Promise<void>;

const places = (page: Page) => page.getByRole("navigation", { name: "Places" });
const bar = (page: Page) =>
  page.getByRole("toolbar", { name: "Paper: its panes and its controls" });
const source = (page: Page) => page.getByRole("textbox", { name: "The paper's source" });
const thePage = (page: Page) => page.getByRole("region", { name: "The page" });
const tools = (page: Page) =>
  page.getByRole("toolbar", { name: "The page: its pages and its size" });
const foot = (page: Page) => page.getByTestId("paper-typst");
const sheets = (page: Page) => page.getByTestId("paper-page");
const standing = (page: Page) => page.getByTestId("paper-standing");
const said = (page: Page) => source(page).getByTestId("said");
const count = (page: Page) => page.getByTestId("paper-pages");
const size = (page: Page) => page.getByTestId("paper-size");

/** The Scratch project with a paper of this name made, and set for the first time. */
async function paper(page: Page, press: Press, name: string | null = null): Promise<void> {
  if (
    !(await places(page)
      .isVisible()
      .catch(() => false))
  ) {
    await page.goto("/");
    await press(page.getByRole("button", { name: /^Scratch project/ }));
    await expect(page.getByRole("status")).toHaveText(READY);
  }
  await press(places(page).getByRole("button", { name: "Paper" }));
  await press(bar(page).getByRole("button", { name: "New paper…" }));
  const field = page.getByRole("textbox", { name: "The new paper's name" });
  await expect(field).toBeFocused();
  if (name !== null) await field.fill(name);
  await field.press("Enter");
  // The new paper is the one open, before its page is looked at: a paper open before it
  // stays on the screen until this one has been made.
  await expect(page.getByTestId("paper-path")).toHaveText(`paper/${name ?? "paper"}.typ`);
  await expect(source(page)).toBeVisible();
  await expect(foot(page)).toHaveText(SET, { timeout: 60_000 });
}

/** Replace all the paper's source by `text`, as typing it would. */
async function write(page: Page, text: string): Promise<void> {
  await source(page).focus();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.insertText(text);
}

/** Add `text` at the end of the paper's source. */
async function add(page: Page, text: string): Promise<void> {
  await source(page).focus();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.insertText(text);
}

/** A page's picture, once the browser has drawn it: its address. */
async function drawn(page: Page, index = 0): Promise<string> {
  const picture = sheets(page).nth(index).locator("img");
  await expect
    .poll(() => picture.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
    .toBe(true);
  return (await picture.getAttribute("src")) ?? "";
}

test("a new paper is set at once, and what is typed is on the page a moment after the last key", async ({
  page,
  press,
}) => {
  await paper(page, press);
  // One page, drawn as a picture of Typst's own, named for a reader who cannot see it.
  await expect(count(page)).toHaveText("1 page");
  await expect(sheets(page)).toHaveCount(1);
  await expect(sheets(page).locator("img")).toHaveAttribute("alt", "Page 1 of 1");
  const first = await drawn(page);
  expect(first).toMatch(/^blob:/);
  // Nothing is said of a new paper: its mathematics has its face.
  await expect(standing(page)).toHaveCount(0);
  await expect(said(page)).toHaveCount(0);
  // Typed, the page is drawn again: another picture in its place, and the first let go.
  await add(page, "The mean wage was 27.37, and $x^2 + y^2$.\n");
  await expect.poll(() => drawn(page)).not.toBe(first);
  await expect(foot(page)).toHaveText(SET);
  await expect(standing(page)).toHaveCount(0);
  const second = await drawn(page);
  // The picture holds what was typed: Typst's SVG of the page, larger than the first.
  const bytes = (address: string) =>
    page.evaluate(async (url) => (await (await fetch(url)).text()).length, address);
  expect(await bytes(second)).toBeGreaterThan(5_000);
  await expect(page.evaluate((url) => fetch(url).then(() => "kept"), first)).rejects.toThrow();
  // A text put back as it was is the page as it was, with nothing more to say.
  await page.keyboard.press("ControlOrMeta+z");
  await expect.poll(() => drawn(page)).not.toBe(second);
  await expect(count(page)).toHaveText("1 page");
});

test("the page is drawn to the width of its pane, and a size smaller or larger at the reader's word, kept with the project", async ({
  page,
  press,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await paper(page, press);
  await write(page, `#set page(paper: "a4")\n= A paper\n`);
  await expect(foot(page)).toHaveText(SET);
  const fit = tools(page).getByRole("button", { name: "Fit width" });
  const smaller = tools(page).getByRole("button", { name: "Smaller page" });
  const larger = tools(page).getByRole("button", { name: "Larger page" });
  await expect(fit).toHaveAttribute("aria-pressed", "true");
  const view = page.getByTestId("paper-pages-view");
  // The page's size and the room its pane has for it, read at one moment of the screen.
  const widths = () =>
    view.evaluate((node) => {
      const sheet = node.querySelector('[data-testid="paper-page"]')?.getBoundingClientRect();
      const style = getComputedStyle(node);
      return {
        sheet: sheet?.width ?? 0,
        height: sheet?.height ?? 0,
        room: node.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
      };
    });
  /** How far the page's width is from what it should be, once the screen has caught up. */
  const off = (wanted: (now: Awaited<ReturnType<typeof widths>>) => number) =>
    expect.poll(async () => {
      const now = await widths();
      return Math.abs(now.sheet - wanted(now));
    });
  // To fit: the page as wide as its pane has room, and as tall as an A4 page of that width.
  await off((now) => now.room).toBeLessThan(1);
  const fitted = await widths();
  expect(Math.abs(fitted.height / fitted.sheet - 841.89 / 595.276)).toBeLessThan(0.005);
  const percent = Number((await size(page).textContent())?.replace("%", ""));
  expect(Math.abs(percent - (fitted.sheet / (595.276 * (96 / 72))) * 100)).toBeLessThan(1);
  // A size larger: the next of the sizes above the fitted one; the page then scrolls in its pane.
  await press(larger);
  await expect(fit).toHaveAttribute("aria-pressed", "false");
  const next = [50, 67, 80, 90, 100, 110, 125, 150, 175, 200].find((one) => one > percent + 0.5);
  await expect(size(page)).toHaveText(`${next}%`);
  await off(() => 595.276 * (96 / 72) * ((next as number) / 100)).toBeLessThan(1);
  // To its printed size, 100 per cent: a point of the page is 96/72 of a pixel.
  for (let step = 0; step < 12 && (await size(page).textContent()) !== "100%"; step += 1) {
    await press(
      Number((await size(page).textContent())?.replace("%", "")) > 100 ? smaller : larger,
    );
  }
  await expect(size(page)).toHaveText("100%");
  await off(() => 793.7).toBeLessThan(1);
  // The smallest size is the last: the control then stands idle.
  for (let step = 0; step < 6; step += 1) {
    if (await smaller.isEnabled()) await press(smaller);
  }
  await expect(size(page)).toHaveText("50%");
  await expect(smaller).toBeDisabled();
  expect(await drawn(page)).toMatch(/^blob:/);
  // Fit width again, and the pane made narrower: the page follows the pane.
  await press(fit);
  await expect(fit).toHaveAttribute("aria-pressed", "true");
  await off(() => fitted.sheet).toBeLessThan(1);
  const edge = page.getByRole("separator", { name: "The width of the page" });
  await edge.focus();
  for (let step = 0; step < 5; step += 1) await page.keyboard.press("ArrowRight");
  await expect.poll(async () => (await widths()).sheet).toBeLessThan(fitted.sheet - 40);
  await off((now) => now.room).toBeLessThan(1);
});

for (const theme of ["light", "dark"] as const) {
  test(`a page is in the light print theme, whichever theme the window is in (${theme})`, async ({
    page,
    press,
  }) => {
    await page.goto("/");
    await press(page.getByRole("button", { name: /^Scratch project/ }));
    await expect(page.getByRole("status")).toHaveText(READY);
    if (theme === "dark") await press(page.getByRole("switch", { name: "Dark" }));
    await paper(page, press);
    await drawn(page);
    expect(
      await sheets(page)
        .first()
        .evaluate((sheet) => getComputedStyle(sheet).backgroundColor),
    ).toBe("rgb(255, 255, 255)");
    // The picture itself is Typst's, with black ink: the window's theme is not in it.
    const svg = await page.evaluate(async (url) => (await fetch(url)).text(), await drawn(page));
    expect(svg).toMatch(/^<svg/);
    expect(svg).not.toMatch(/var\(--/);
  });
}

test("where Typst refuses the text its words stand at their line, and the page of the text before stays, marked", async ({
  page,
  press,
}) => {
  await paper(page, press);
  await add(page, "A sentence that sets.\n");
  await expect(foot(page)).toHaveText(SET);
  const kept = await drawn(page);
  // An unknown name, on the seventh line.
  await add(page, "#nosuch(3)\n");
  await expect(standing(page)).toHaveText(
    "Typst refuses the text as it stands (1 error). The page is of the text as it last set, not of the present text.",
  );
  await expect(standing(page)).toHaveClass(/refused/);
  // In the editor: Typst's words under the line they are of.
  await expect(said(page)).toHaveCount(1);
  await expect(said(page)).toHaveText("error unknown variable: nosuch");
  const under = await said(page).evaluate((note) => {
    const lines = [...(note.parentElement?.querySelectorAll(":scope > .cm-line") ?? [])];
    const before = lines.filter(
      (line) => line.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING,
    );
    return before.at(-1)?.textContent ?? "";
  });
  expect(under).toBe("#nosuch(3)");
  // The page of the text before is still drawn, the same picture, quieter and said to be so.
  await expect(sheets(page)).toHaveCount(1);
  await expect(sheets(page).first()).toHaveClass(/stale/);
  await expect(sheets(page).first().locator("figcaption")).toHaveText("not the present text");
  expect(await drawn(page)).toBe(kept);
  await expect(count(page)).toHaveText("1 page");
  // What Typst says is listed above the page, and its line is gone to from there.
  const told = thePage(page).getByRole("list", { name: "What Typst says of the paper" });
  await expect(told.getByRole("listitem")).toHaveText(["line 7 unknown variable: nosuch"]);
  await source(page).focus();
  await page.keyboard.press("ControlOrMeta+Home");
  await press(told.getByRole("button", { name: "line 7" }));
  await expect(page.locator(".cm-lineNumbers .cm-activeLineGutter")).toHaveText("7");
  // Typed on while it is refused, the words stay with their line.
  await source(page).focus();
  await page.keyboard.press("ControlOrMeta+Home");
  await page.keyboard.insertText("// a first line\n");
  await expect(told.getByRole("button", { name: "line 8" })).toBeVisible();
  // Put right, the page is of the present text again, and nothing is said.
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.press("Backspace");
  for (let letter = 0; letter < "#nosuch(3)".length; letter += 1) {
    await page.keyboard.press("Backspace");
  }
  await expect(standing(page)).toHaveCount(0);
  await expect(said(page)).toHaveCount(0);
  await expect(sheets(page).first()).not.toHaveClass(/stale/);
  await expect(sheets(page).first().locator("figcaption")).toHaveCount(0);
});

for (const theme of ["light", "dark"] as const) {
  test(`what Typst says, in the editor and above the page, keeps to the sizes and the contrast in the ${theme} theme`, async ({
    page,
    press,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await press(page.getByRole("button", { name: /^Scratch project/ }));
    await expect(page.getByRole("status")).toHaveText(READY);
    if (theme === "dark") await press(page.getByRole("switch", { name: "Dark" }));
    await paper(page, press);
    // A warning and an error at once: a formula without its face, and an unknown name.
    await write(page, "= A paper\n\nThe sum $x^2$.\n\n#nosuch(3)\n");
    await expect(standing(page)).toContainText("Typst refuses the text as it stands");
    await expect(said(page)).toHaveCount(1);
    await expect(sheets(page).first().locator("figcaption")).toBeVisible();
    const frame = page.locator('[data-place="Paper"]');
    expect(await smallestText(page)).toBeGreaterThanOrEqual(12.5);
    expect(await faintText(frame)).toEqual([]);
    // And a warning alone.
    await write(page, "= A paper\n\nThe sum $x^2$.\n");
    await expect(standing(page)).toHaveText("Typst set the paper, with 1 warning.");
    await expect(said(page)).toHaveClass(/warning/);
    expect(await smallestText(page)).toBeGreaterThanOrEqual(12.5);
    expect(await faintText(frame)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      1280,
    );
  });
}

test("a formula in a paper without the line for its mathematics is set, with Typst's warning and the line to add", async ({
  page,
  press,
}) => {
  await paper(page, press);
  await write(page, "= A paper from elsewhere\n\nThe sum $x^2 + y^2$.\n");
  await expect(standing(page)).toHaveText("Typst set the paper, with 1 warning.");
  await expect(standing(page)).not.toHaveClass(/refused/);
  await expect(said(page)).toHaveText(
    `warning current font is not designed for math (rendering may be poor). Begin the paper with the line: ${MATHEMATICS}`,
  );
  await expect(said(page)).toHaveClass(/warning/);
  // The paper is set all the same: its page is of the present text.
  await expect(sheets(page).first()).not.toHaveClass(/stale/);
  await drawn(page);
  // With the line, nothing is said.
  await source(page).focus();
  await page.keyboard.press("ControlOrMeta+Home");
  await page.keyboard.insertText(`${MATHEMATICS}\n`);
  await expect(standing(page)).toHaveCount(0);
  await expect(said(page)).toHaveCount(0);
});

test("a paper of several pages says how many, and draws the pages near the reader's view", async ({
  page,
  press,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await paper(page, press);
  const pages = Array.from({ length: 24 }, (_, index) => `Page ${index + 1} of the paper.`);
  await write(page, `#set page(paper: "a4")\n${pages.join("\n#pagebreak()\n")}\n`);
  await expect(count(page)).toHaveText("24 pages");
  await expect(sheets(page)).toHaveCount(24);
  await drawn(page, 0);
  await expect(sheets(page).nth(0).locator("img")).toHaveAttribute("alt", "Page 1 of 24");
  // The last page is far from view: its place is kept, at its size, and its picture not asked for.
  const last = sheets(page).nth(23);
  await expect(last.locator("img")).toHaveCount(0);
  const box = await last.evaluate((sheet) => ({
    width: sheet.clientWidth,
    height: sheet.clientHeight,
  }));
  expect(box.height / box.width).toBeCloseTo(841.89 / 595.276, 2);
  expect(await sheets(page).locator("img").count()).toBeLessThan(12);
  // Scrolled to, it is drawn.
  await last.scrollIntoViewIfNeeded();
  await drawn(page, 23);
  await expect(last.locator("img")).toHaveAttribute("alt", "Page 24 of 24");
  // A page taken out: one fewer, and the reader's place kept.
  await write(page, `#set page(paper: "a4")\n${pages.slice(0, 23).join("\n#pagebreak()\n")}\n`);
  await expect(count(page)).toHaveText("23 pages");
  await expect(sheets(page)).toHaveCount(23);
});

test("a paper reads the other files it names from the project, and one that is not there is named", async ({
  page,
  press,
}) => {
  // A table as a Typst file beside the paper, as a script's export writes one.
  await paper(page, press, "table");
  await write(page, "#table(columns: 2, [educ], [0.08])\n");
  await expect(foot(page)).toHaveText(SET);
  await expect(page.locator("header .file")).toHaveText("/ table.typ · saved");
  await paper(page, press, "paper");
  const before = await drawn(page);
  const drawing = (address: string) =>
    page.evaluate(async (url) => (await (await fetch(url)).text()).length, address);
  const small = await drawing(before);
  // The table included, and a file of the project read as it is: both are found.
  await add(page, '#include "table.typ"\n#raw(read("../zeff.toml"))\n');
  await expect.poll(() => drawn(page)).not.toBe(before);
  await expect(standing(page)).toHaveCount(0);
  await expect(said(page)).toHaveCount(0);
  // The page now holds the table and the manifest's lines: its drawing is several times the larger.
  expect(await drawing(await drawn(page))).toBeGreaterThan(small * 3);
  // A figure no script has written yet: Typst names the file, at its line, and the page stays.
  await add(page, '#image("../output/wages.svg")\n');
  await expect(standing(page)).toContainText("Typst refuses the text as it stands (1 error).");
  await expect(said(page)).toHaveText("error file not found (searched at output/wages.svg)");
  await expect(sheets(page).first()).toHaveClass(/stale/);
});

test("from a key to the page drawn again is within the measure of the spike", async ({
  page,
  press,
}) => {
  await paper(page, press);
  await add(page, "A paragraph to type into, of some length, that the page is set from.\n");
  await expect(foot(page)).toHaveText(SET);
  await drawn(page);
  await source(page).focus();
  // From the key pressed to another picture of the page drawn by the browser.
  const took = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const picture = document.querySelector<HTMLImageElement>('[data-testid="paper-page"] img');
        if (picture === null) throw new Error("no page is drawn");
        const was = picture.src;
        const began = performance.now();
        const look = () => {
          const now = document.querySelector<HTMLImageElement>('[data-testid="paper-page"] img');
          if (now !== null && now.src !== was && now.complete && now.naturalWidth > 0) {
            resolve(performance.now() - began);
          } else {
            requestAnimationFrame(look);
          }
        };
        document.execCommand("insertText", false, "x");
        look();
      }),
  );
  test.info().annotations.push({
    type: "from a key to the page",
    description: `${Math.round(took)} ms, of which 200 ms are the pause after the last key`,
  });
  // The spike set a page again in 26 ms at most and the browser drew a heavy one in half a
  // second; with the pause of 200 ms, a second and a half is the measure held here.
  expect(took).toBeGreaterThan(190);
  expect(took).toBeLessThan(1_500);
  // And Typst's own part of it is said at the pane's foot.
  const ms = Number(/set in (\d+) ms/.exec((await foot(page).textContent()) ?? "")?.[1]);
  expect(ms).toBeLessThan(300);
});
