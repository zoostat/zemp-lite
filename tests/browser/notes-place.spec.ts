// A note in the margin leads to the place that shows what its statement made at length
// (release 0.3.1, step 6c; open decision #245): a frame's note opens the frame in Data; a
// plot's note still folds and unfolds its figure, and a small arrow at its end opens the plot
// in Plots; a table's or a fit's note folds and unfolds its result, as before.
import type { Locator, Page } from "@playwright/test";
import { expect, test, useExample, write } from "./support";

const READY = "engine Zeff 0.9.0 ready";

type Press = (target: Locator) => Promise<void>;

const note = (page: Page, line: number) =>
  page.locator(`[data-testid="note"][data-line="${line}"]`);
const arrow = (page: Page, line: number) =>
  page.locator(`[data-testid="note-go"][data-line="${line}"]`);
const shown = (page: Page, place: string) =>
  page.getByRole("toolbar", { name: `${place}: its panes and its controls` });

async function ran(page: Page, press: Press): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 3200 });
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await useExample(page);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
}

test("a frame's note opens that frame in Data, by a press and by the keyboard", async ({
  page,
  press,
}) => {
  await ran(page, press);
  // The two frames of the example: each note is a button named for what it does.
  const wages = note(page, 4);
  const w2010 = note(page, 5);
  await expect(wages).toHaveAccessibleName("wages, Frame · 18,412 × 11; open in Data");
  await expect(wages).toHaveAttribute("title", "Open wages in Data");
  await expect(wages).not.toHaveAttribute("aria-expanded");
  await expect(arrow(page, 4)).toHaveCount(0);
  // The second frame, not the first of the run: Data opens on the frame of the note pressed.
  await press(w2010);
  await expect(shown(page, "Data")).toBeVisible();
  await expect(shown(page, "Data")).toContainText(/^.*w2010 · [\d,]+ rows × 11 variables/);
  // Back in Script, the other by the keyboard: Enter on the note.
  await page.keyboard.press("ControlOrMeta+1");
  await wages.focus();
  await page.keyboard.press("Enter");
  await expect(shown(page, "Data")).toBeVisible();
  await expect(shown(page, "Data")).toContainText("wages · 18,412 rows × 11 variables");
});

test("a plot's note folds and unfolds its figure, and the arrow at its end opens that plot in Plots", async ({
  page,
  press,
}) => {
  await ran(page, press);
  // Two plots are drawn, at lines 17 and 21: each note has the arrow at its end.
  for (const line of [17, 21]) {
    await expect(note(page, line)).toHaveAttribute("aria-expanded", "true");
    await expect(arrow(page, line)).toHaveAccessibleName(/: open in Plots$/);
    // The arrow stands in the notes' column, at the note's right, on its row.
    const [words, go] = [
      (await note(page, line).boundingBox())!,
      (await arrow(page, line).boundingBox())!,
    ];
    expect(go.x).toBeGreaterThanOrEqual(words.x + words.width - 1);
    expect(Math.abs(go.y - words.y)).toBeLessThan(3);
  }
  // The note itself folds the figure away and brings it back, as before.
  const figure = page.locator('[data-testid="block"][data-line="21"]');
  await expect(figure).toBeVisible();
  await press(note(page, 21));
  await expect(figure).toHaveCount(0);
  await expect(note(page, 21)).toHaveAttribute("aria-expanded", "false");
  await press(note(page, 21));
  await expect(figure).toBeVisible();
  // The arrow of the second plot opens Plots on that plot, not on the first of the run.
  await press(arrow(page, 21));
  await expect(shown(page, "Plots")).toBeVisible();
  const title = page
    .locator('[data-place="Plots"] h2')
    .filter({ hasText: /^line \d+/ })
    .first();
  await expect(title).toContainText("line 21");
  await page.keyboard.press("ControlOrMeta+1");
  await arrow(page, 17).focus();
  await page.keyboard.press("Enter");
  await expect(shown(page, "Plots")).toBeVisible();
  await expect(title).toContainText("line 17");
  // Open in Plots, in a figure's header, opens that plot too.
  await page.keyboard.press("ControlOrMeta+1");
  await press(figure.getByRole("button", { name: "Open in Plots ↗" }));
  await expect(title).toContainText("line 21");
});

test("a table's and a fit's note fold and unfold their result, with no arrow; a note with nothing to unfold and no place is words alone", async ({
  page,
  press,
}) => {
  await ran(page, press);
  for (const line of [8, 13]) {
    await expect(note(page, line)).toHaveAttribute("aria-expanded", "true");
    await expect(arrow(page, line)).toHaveCount(0);
  }
  const summary = page.locator('[data-testid="block"][data-line="8"]');
  await press(note(page, 8));
  await expect(summary).toHaveCount(0);
  await press(note(page, 8));
  await expect(summary).toBeVisible();
  // A number bound by a `let` prints nothing and has no place of its own: its note is words.
  await write(page, "let half = 1 / 2\n");
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByTestId("run-facts")).toHaveText(/^run 2 · /);
  await expect(page.getByRole("status")).toHaveText("done");
  expect(await note(page, 1).evaluate((node) => node.tagName)).toBe("SPAN");
  await expect(note(page, 1)).toHaveAttribute("aria-label", /^line 1: half, /);
  await expect(arrow(page, 1)).toHaveCount(0);
});
