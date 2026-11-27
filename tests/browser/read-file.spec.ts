// A project's other text files opened to be read (release 0.3, step 19; open decision #228,
// option A): a file that is text and that the app neither edits nor sets as a paper opens in
// a tab, read only; the tab says so, and of a file under `output` that the next run writes it
// again; nothing typed changes it; and a file that is not text stays a row with no action.
import type { Locator, Page } from "@playwright/test";
import { expect, faintText, smallestText, test } from "./support";

const READY = "engine Zeff 0.9.0 ready";

type Press = (target: Locator) => Promise<void>;

const bar = (page: Page) =>
  page.getByRole("toolbar", { name: "Script: its panes and its controls" });
const tree = (page: Page) =>
  page
    .getByRole("complementary", { name: "Script: the left pane" })
    .getByRole("region", { name: "Project" });
const file = (page: Page) => page.getByRole("textbox", { name: "The file, read only" });
const note = (page: Page) => page.getByTestId("read-only");
const run = (page: Page) => page.getByRole("button", { name: "Run", exact: true });

const textOf = async (page: Page): Promise<string> =>
  (await file(page).locator(".cm-line").allTextContents()).join("\n");

/** The Scratch project with its Project pane open, and the script that exports a LaTeX table run. */
async function opened(page: Page, press: Press): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await press(bar(page).getByRole("button", { name: "Project", exact: true }));
  await press(tree(page).getByRole("button", { name: /^instruments\.zeff/ }));
  await press(run(page));
  await expect(page.getByRole("status")).toHaveText("done", { timeout: 60_000 });
}

test("a table a script exported for LaTeX is opened and read: its text, that it is read only, and that the next run writes it again", async ({
  page,
  press,
}) => {
  test.slow();
  await opened(page, press);
  // The file the run wrote is a row that opens, as a script's is.
  const row = tree(page).getByRole("button", { name: /^table_iv\.tex/ });
  await expect(row).toBeVisible();
  await press(row);
  await expect(row).toHaveClass(/\bon\b/);
  await expect(page.locator("header .file")).toHaveText("/ table_iv.tex · read only");
  await expect(note(page)).toHaveText(
    "Read only: this file is shown to be read, and is not changed here. scripts/instruments.zeff wrote it: Run runs that script, and writes it again.",
  );
  // Its text, as the engine wrote it.
  await expect.poll(() => textOf(page)).toContain("\\begin{tabular}");
  const before = await textOf(page);
  expect(before).toContain("Took the course");
  await expect(file(page)).toHaveAttribute("aria-readonly", "true");
  // The cursor moves through it, and it can be copied from; nothing typed changes it.
  await file(page).focus();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.type("typed into a file that is read");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Backspace");
  await page.keyboard.insertText("pasted");
  expect(await textOf(page)).toBe(before);
  await expect(page.locator("header .file")).toHaveText("/ table_iv.tex · read only");
  // It is no script: nothing of a run stands beside it, and it is not what Export sets.
  await expect(bar(page).getByRole("button", { name: "Export script with output" })).toHaveCount(0);
  // Save a copy… is still in its row's menu.
  await press(tree(page).getByRole("button", { name: "Actions for output/table_iv.tex" }));
  await expect(
    page
      .getByRole("menu", { name: "Actions for output/table_iv.tex" })
      .getByRole("menuitem", { name: "Save a copy…" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  // The script is come back to, and is a script as before.
  await press(tree(page).getByRole("button", { name: /^instruments\.zeff/ }));
  await expect(page.locator("header .file")).toHaveText("/ instruments.zeff · saved");
  await expect(note(page)).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "The script", exact: true })).toBeVisible();
});

test("a data file that is text opens to be read; one that is not text stays a row with no action", async ({
  page,
  press,
}) => {
  await opened(page, press);
  const chooser = tree(page).getByLabel("Data files to add");
  await chooser.setInputFiles([
    { name: "pay.csv", mimeType: "text/csv", buffer: Buffer.from("id,wage\n1,23.5\n2,31.0\n") },
    {
      name: "raw.bin",
      mimeType: "application/octet-stream",
      buffer: Buffer.from(new Uint8Array(300).map((_, at) => (at * 7) % 256)),
    },
    // Text in Latin-1, which is not UTF-8: it is not shown as text it is not.
    { name: "old.txt.dat", mimeType: "text/plain", buffer: Buffer.from([76, 0xf6, 104, 110, 101]) },
  ]);
  const csv = tree(page).getByRole("button", { name: /^pay\.csv/ });
  await expect(csv).toBeVisible();
  // What is not text is a row that is read, with its size, and is no button.
  for (const name of ["raw.bin", "old.txt.dat"]) {
    await expect(tree(page).getByText(name, { exact: true })).toBeVisible();
    await expect(
      tree(page).getByRole("button", { name: new RegExp(`^${name.replace(".", "\\.")}`) }),
    ).toHaveCount(0);
  }
  await press(csv);
  await expect.poll(() => textOf(page)).toBe("id,wage\n1,23.5\n2,31.0\n");
  await expect(note(page)).toHaveText(
    "Read only: this file is shown to be read, and is not changed here.",
  );
  await expect(page.locator("header .file")).toHaveText("/ pay.csv · read only");
  // From ⌘K, by its path, as a script is opened.
  await press(tree(page).getByRole("button", { name: /^instruments\.zeff/ }));
  await page.keyboard.press("ControlOrMeta+k");
  const box = page.getByRole("combobox", { name: "Type a command" });
  await box.fill("open file table_iv");
  await expect(
    page.getByRole("dialog", { name: "Commands" }).getByRole("option").first(),
  ).toContainText("Open file: output/table_iv.tex");
  await box.press("Enter");
  await expect(page.locator("header .file")).toHaveText("/ table_iv.tex · read only");
  // A file that is not text is not among what ⌘K opens.
  await page.keyboard.press("ControlOrMeta+k");
  await box.fill("open file raw.bin");
  await expect(page.getByRole("dialog", { name: "Commands" })).not.toContainText("raw.bin");
  await page.keyboard.press("Escape");
});

for (const theme of ["light", "dark"] as const) {
  test(`a file being read keeps to the sizes and the contrast in the ${theme} theme, and shows what a run has written again`, async ({
    page,
    press,
  }) => {
    test.slow();
    await opened(page, press);
    if (theme === "dark") await press(page.getByRole("switch", { name: "Dark" }));
    await press(tree(page).getByRole("button", { name: /^table_iv\.tex/ }));
    await expect.poll(() => textOf(page)).toContain("\\begin{tabular}");
    expect(await smallestText(page)).toBeGreaterThanOrEqual(12.5);
    expect(await faintText(page.locator('[data-place="Script"]'))).toEqual([]);
    // The script changed and run again while the table is shown: the tab shows the new table.
    const before = await textOf(page);
    await press(tree(page).getByRole("button", { name: /^instruments\.zeff/ }));
    const script = page.getByRole("textbox", { name: "The script", exact: true });
    await script.focus();
    await page.keyboard.press("ControlOrMeta+End");
    await page.keyboard.insertText(
      '\nreport([ols], title: "Another table").export("output/table_iv.tex")\n',
    );
    await expect(page.getByText("saving")).toHaveCount(0);
    await press(tree(page).getByRole("button", { name: /^table_iv\.tex/ }));
    await expect.poll(() => textOf(page)).toBe(before);
    await press(run(page));
    await expect(page.getByRole("status")).toHaveText("done", { timeout: 60_000 });
    await expect.poll(() => textOf(page)).toContain("Another table");
    await expect(page.locator("header .file")).toHaveText("/ table_iv.tex · read only");
  });
}
