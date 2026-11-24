// The frame of a place (release 0.2.1, step 2; open decision #203): a bar with one link for
// each pane, above that pane, which opens and closes it; the left pane, the place in the
// middle and the right pane. Whether the panes are kept after a reload is held in `kept.spec`.
import type { Page } from "@playwright/test";
import { editor, expect, scriptText, test } from "./support";

const READY = "engine Zeff 0.8.0 ready";

async function scratch(page: Page, press: (target: ReturnType<Page["locator"]>) => Promise<void>) {
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
}

const bar = (page: Page) =>
  page.getByRole("toolbar", { name: "Script: its panes and its controls" });
const leftPane = (page: Page) => page.getByRole("complementary", { name: "Script: the left pane" });

test("the Script place opens with Notes open and Project closed, each link over its side", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  const project = bar(page).getByRole("button", { name: "Project", exact: true });
  const notes = bar(page).getByRole("button", { name: "Notes", exact: true });
  await expect(project).toHaveAttribute("aria-pressed", "false");
  await expect(notes).toHaveAttribute("aria-pressed", "true");
  await expect(leftPane(page)).toHaveCount(0);
  // The links of the left panes stand at the bar's left, those of the right at its right, and
  // the run's facts with the two controls of the view between them.
  const at = async (target: ReturnType<Page["locator"]>) => (await target.boundingBox())!.x;
  const facts = bar(page).getByTestId("run-facts");
  const unfold = bar(page).getByRole("button", { name: "Unfold all", exact: true });
  expect(await at(project)).toBeLessThan(await at(facts));
  expect(await at(facts)).toBeLessThan(await at(unfold));
  expect(await at(unfold)).toBeLessThan(await at(notes));
  // What a link holds is said on resting over it.
  await expect(project).toHaveAttribute("title", "Show or hide the files of the project");
});

test("a link opens and closes its pane, and so does the pane's own ×", async ({ page, press }) => {
  await scratch(page, press);
  const project = bar(page).getByRole("button", { name: "Project", exact: true });
  await press(project);
  await expect(project).toHaveAttribute("aria-pressed", "true");
  const pane = leftPane(page).getByRole("region", { name: "Project" });
  await expect(pane.getByRole("heading", { name: "Project" })).toBeVisible();
  await expect(pane.getByRole("button", { name: /^main\.zeff/ })).toBeVisible();
  await expect(pane.getByRole("button", { name: /^instruments\.zeff/ })).toBeVisible();
  await expect(pane.getByRole("button", { name: /^plots\.zeff/ })).toBeVisible();
  await press(project);
  await expect(leftPane(page)).toHaveCount(0);
  await press(project);
  await press(pane.getByRole("button", { name: "Close Project" }));
  await expect(leftPane(page)).toHaveCount(0);
  await expect(project).toHaveAttribute("aria-pressed", "false");
  // The notes are the script's right pane: their link takes them from beside the code.
  const notes = bar(page).getByRole("button", { name: "Notes", exact: true });
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await expect(page.getByTestId("note").first()).toBeVisible();
  await press(notes);
  await expect(notes).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("note")).toHaveCount(0);
  await press(notes);
  await expect(page.getByTestId("note").first()).toBeVisible();
});

test("a script opened from Project is shown in the Script place, and marked in the list", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await press(bar(page).getByRole("button", { name: "Project", exact: true }));
  const pane = leftPane(page).getByRole("region", { name: "Project" });
  await press(pane.getByRole("button", { name: /^instruments\.zeff/ }));
  await expect.poll(() => scriptText(page)).toMatch(/staff/);
  await expect(pane.getByRole("button", { name: /^instruments\.zeff/ })).toHaveClass(/\bon\b/);
  await expect(pane.getByRole("button", { name: /^main\.zeff/ })).not.toHaveClass(/\bon\b/);
  await press(pane.getByRole("button", { name: /^main\.zeff/ }));
  await expect.poll(() => scriptText(page)).toMatch(/^\/\/ Returns to schooling/);
});

test("the edge of the left pane is moved with the keyboard, inside its limits", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await press(bar(page).getByRole("button", { name: "Project", exact: true }));
  const edge = page.getByRole("separator", { name: "The width of the left pane" });
  await expect(edge).toHaveAttribute("aria-valuenow", "268");
  await edge.focus();
  await page.keyboard.press("ArrowRight");
  await expect(edge).toHaveAttribute("aria-valuenow", "284");
  const width = async () => (await leftPane(page).boundingBox())!.width;
  expect(Math.round(await width())).toBe(284);
  for (let i = 0; i < 12; i += 1) await page.keyboard.press("ArrowLeft");
  await expect(edge).toHaveAttribute("aria-valuenow", "180");
  for (let i = 0; i < 30; i += 1) await page.keyboard.press("ArrowRight");
  await expect(edge).toHaveAttribute("aria-valuenow", "520");
});

test("each pane's link is a command of ⌘K, named by what it would do", async ({ page, press }) => {
  await scratch(page, press);
  const box = page.getByRole("combobox", { name: "Type a command" });
  const listed = page.getByRole("dialog", { name: "Commands" }).getByRole("option");
  await page.keyboard.press("ControlOrMeta+k");
  await box.fill("script: project");
  await expect(listed).toHaveText([/^Script: show Project/]);
  await page.keyboard.press("Enter");
  await expect(leftPane(page).getByRole("region", { name: "Project" })).toBeVisible();
  await page.keyboard.press("ControlOrMeta+k");
  await box.fill("script: notes");
  await expect(listed).toHaveText([/^Script: hide Notes/]);
  await page.keyboard.press("Enter");
  await expect(bar(page).getByRole("button", { name: "Notes", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.keyboard.press("ControlOrMeta+k");
  await box.fill("script: project");
  await expect(listed).toHaveText([/^Script: hide Project/]);
});

test("a note stands inside the page, in the 300 pixels at the right of its statement's line", async ({
  page,
  press,
}) => {
  // Found at this step: in 0.2 the notes were drawn 300 pixels further right, outside the
  // sheet, where no reader saw them; a test asked only that a note was there.
  for (const width of [1280, 1440, 1720]) {
    await page.setViewportSize({ width, height: 900 });
    await scratch(page, press);
    // A line of 100 characters at the script's foot, a comment, which makes no note; the
    // project keeps it for the widths that follow.
    if (width === 1280) {
      await editor(page).focus();
      await page.keyboard.press("ControlOrMeta+End");
      await page.keyboard.insertText(`// ${"x".repeat(97)}`);
    }
    await press(page.getByRole("button", { name: "Run", exact: true }));
    await expect(page.getByRole("status")).toHaveText("done");
    // Folded, the whole script and its nine notes are on the page (the editor draws only
    // what is near the window, and Run unfolds every output).
    await press(page.getByRole("button", { name: "Fold all", exact: true }));
    await expect(page.getByTestId("note")).toHaveCount(9);
    const at = await page.evaluate(() => {
      const box = (one: Element) => one.getBoundingClientRect();
      const sheet = box(document.querySelector(".sheet")!);
      const notes = [...document.querySelectorAll('[data-testid="note"]')].map((note) => ({
        left: box(note).left,
        right: box(note).right,
        top: box(note).top,
        line: box(note.closest(".cm-line")!),
      }));
      return { sheet, notes, window: window.innerWidth };
    });
    expect(at.notes.length).toBe(9);
    for (const note of at.notes) {
      expect(note.right - note.left).toBe(300);
      // Inside the sheet and the window, beginning where its line of code ends, on its row.
      expect(note.right).toBeLessThanOrEqual(at.sheet.right);
      expect(note.right).toBeLessThanOrEqual(at.window);
      expect(note.left).toBeGreaterThan(at.sheet.left);
      expect(Math.abs(note.left - note.line.right)).toBeLessThanOrEqual(1);
      expect(Math.abs(note.top - note.line.top)).toBeLessThanOrEqual(1);
    }
    // The code's column takes the longest line the formatter leaves, 100 characters, on one
    // row beside the notes, where the window gives the room (here, from 1,440 pixels).
    if (width >= 1440) {
      const rows = await page.evaluate(() => {
        const lines = [...document.querySelectorAll(".cm-content > .cm-line")];
        const height = (one: Element) => one.getBoundingClientRect().height;
        return { first: height(lines[0]!), all: lines.map(height) };
      });
      expect(Math.max(...rows.all)).toBe(rows.first);
    }
    // With the notes closed the code has the whole column.
    await press(bar(page).getByRole("button", { name: "Notes", exact: true }));
    const code = await page.locator(".cm-content").evaluate((one) => ({
      padding: getComputedStyle(one).paddingRight,
    }));
    expect(code.padding).toBe("0px");
    await press(bar(page).getByRole("button", { name: "Notes", exact: true }));
  }
});
