// Export script with output (release 0.3, step 18): the script with what the engine printed,
// said and drew under each statement, set by Typst and saved as a PDF; the same bytes in both
// browsers and at any width of the window; Typst fetched the first time it is needed, and not
// again; and a script that has not been run offered **Run** first.
import type { Locator, Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { countRuns, expect, test, useExample } from "./support";

const READY = "engine Zeff 0.9.0 ready";
/**
 * The example's script with its output, as a PDF, by its SHA-256: the digest the engine and
 * Typst give for the same script under Node (`src/paper/script-document.node.test.ts`).
 */
const PDF = "eb52760f754b5e80187f1282448ab3239f9d662674af1964826f67f68d800fd2";

type Press = (target: Locator) => Promise<void>;

const bar = (page: Page) =>
  page.getByRole("toolbar", { name: "Script: its panes and its controls" });
const command = (page: Page) =>
  bar(page).getByRole("button", { name: "Export script with output" });
const asking = (page: Page) => page.getByRole("group", { name: "Export script with output" });
const run = (page: Page) => page.getByRole("button", { name: "Run", exact: true });
const digest = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

async function opened(page: Page, press: Press): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await useExample(page);
}

/** What the browser is given to save when `ask` is done: its name and its bytes. */
async function saved(
  page: Page,
  ask: () => Promise<void>,
): Promise<{ name: string; bytes: Buffer }> {
  const [download] = await Promise.all([page.waitForEvent("download", { timeout: 90_000 }), ask()]);
  return { name: download.suggestedFilename(), bytes: readFileSync(await download.path()) };
}

/** The addresses the page asks for that are of the Paper module. */
function askedOfTypst(page: Page): string[] {
  const asked: string[] = [];
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (/zemp_paper_bg.*\.wasm$|\.(otf|ttf)$/.test(path)) asked.push(path);
  });
  return asked;
}

test("a script that has run is saved with its output as a PDF: the kept bytes, Typst fetched the first time and not the second", async ({
  page,
  press,
}) => {
  test.slow();
  const asked = askedOfTypst(page);
  await opened(page, press);
  await press(run(page));
  await expect(page.getByRole("status")).toHaveText("done", { timeout: 30_000 });
  // Typst has not been asked for: no paper was opened.
  expect(asked).toEqual([]);
  const first = await saved(page, () => press(command(page)));
  expect(first.name).toBe("main.pdf");
  expect(first.bytes.subarray(0, 5).toString()).toBe("%PDF-");
  await expect(page.getByRole("status")).toHaveText("saved as main.pdf");
  // The first use fetched Typst and its nine fonts.
  expect(asked.filter((path) => /\.(otf|ttf)$/.test(path))).toHaveLength(9);
  expect(asked.some((path) => path.endsWith(".wasm"))).toBe(true);
  // No time is in the file; the script's name is its title.
  const text = first.bytes.toString("latin1");
  expect(text).not.toContain("/CreationDate");
  expect(text).toContain("Typst 0.15.1");
  test.info().annotations.push({ type: "pdf", description: digest(first.bytes) });
  expect(digest(first.bytes)).toBe(PDF);
  // A second time: the same bytes, and nothing more fetched.
  const before = asked.length;
  const again = await saved(page, () => press(command(page)));
  expect(digest(again.bytes)).toBe(PDF);
  expect(asked.length).toBe(before);
  // In a narrower window, where the screen prints its tables narrower: the same file, since
  // the document holds each print as `zeff run` prints it.
  await page.setViewportSize({ width: 1000, height: 800 });
  await expect(page.getByRole("status")).toHaveText("saved as main.pdf");
  const narrow = await saved(page, async () => {
    await page.keyboard.press("ControlOrMeta+k");
    const box = page.getByRole("combobox", { name: "Type a command" });
    await box.fill("export script with output");
    await expect(
      page.getByRole("dialog", { name: "Commands" }).getByRole("option").first(),
    ).toContainText("Export script with output");
    await box.press("Enter");
  });
  expect(digest(narrow.bytes)).toBe(PDF);
  // The page is as it was: the run's results are still the script's.
  await expect(bar(page).getByTestId("run-facts")).toContainText("run 1");
});

test("a script that has not been run is offered Run first, or is exported alone", async ({
  page,
  press,
}) => {
  test.slow();
  const runs = await countRuns(page);
  await opened(page, press);
  // Not run: nothing is saved yet; the place asks, in a line of its own.
  let downloads = 0;
  page.on("download", () => (downloads += 1));
  await press(command(page));
  await expect(asking(page)).toContainText(
    "scripts/main.zeff has not been run, so it has no output to set.",
  );
  expect(downloads).toBe(0);
  // Cancel: the line goes, and nothing has happened.
  await press(asking(page).getByRole("button", { name: "Cancel" }));
  await expect(asking(page)).toHaveCount(0);
  expect(await runs()).toBe(0);
  // The script alone: a PDF of the script, with no output and no run.
  await press(command(page));
  const alone = await saved(page, () =>
    press(asking(page).getByRole("button", { name: "Export the script alone" })),
  );
  expect(alone.name).toBe("main.pdf");
  await expect(asking(page)).toHaveCount(0);
  expect(await runs()).toBe(0);
  expect(digest(alone.bytes)).not.toBe(PDF);
  // Run, then export: the script is run, its results are on the page, and the PDF is the
  // one a run and an export give.
  await press(command(page));
  const both = await saved(page, () =>
    press(asking(page).getByRole("button", { name: "Run, then export" })),
  );
  await expect(page.getByRole("status")).toHaveText("saved as main.pdf");
  await expect(bar(page).getByTestId("run-facts")).toContainText("run 1");
  expect(digest(both.bytes)).toBe(PDF);
  expect(alone.bytes.length).toBeLessThan(both.bytes.length);
  // Run once, it is not asked again.
  const once = await saved(page, () => press(command(page)));
  expect(digest(once.bytes)).toBe(PDF);
});

test("a paper open in Paper is set again after Typst was borrowed for a script's PDF", async ({
  page,
  press,
}) => {
  test.slow();
  await opened(page, press);
  await press(run(page));
  await expect(page.getByRole("status")).toHaveText("done", { timeout: 30_000 });
  const places = page.getByRole("navigation", { name: "Places" });
  await press(places.getByRole("button", { name: "Paper" }));
  await press(
    page
      .getByRole("toolbar", { name: "Paper: its panes and its controls" })
      .getByRole("button", { name: "New paper…" }),
  );
  await page.getByRole("textbox", { name: "The new paper's name" }).press("Enter");
  await expect(page.getByTestId("paper-pages")).toHaveText("1 page", { timeout: 60_000 });
  // From Paper, by ⌘K: the script is shown, and its PDF saved.
  const got = await saved(page, async () => {
    await page.keyboard.press("ControlOrMeta+k");
    const box = page.getByRole("combobox", { name: "Type a command" });
    await box.fill("export script with output");
    await box.press("Enter");
  });
  expect(digest(got.bytes)).toBe(PDF);
  await expect(places.getByRole("button", { name: "Script" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  // Back in Paper the paper is set as before, and typing sets it again.
  await press(places.getByRole("button", { name: "Paper" }));
  await expect(page.getByTestId("paper-pages")).toHaveText("1 page", { timeout: 60_000 });
  await expect(page.getByTestId("paper-standing")).toHaveCount(0);
  const source = page.getByRole("textbox", { name: "The paper's source" });
  await source.focus();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.insertText("#pagebreak()\nA second page.\n");
  await expect(page.getByTestId("paper-pages")).toHaveText("2 pages");
});
