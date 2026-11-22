// After each deployment (release 0.2, step 17): the page at the address is cross-origin
// isolated, so that a run can be cancelled; the engine of the release starts and runs the
// example; and the first start, from a browser that has never seen the page to the engine
// ready, is measured against the Zemp Specification's 2 seconds (section 14).
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { readZip } from "../../src/project/zip";

const READY = "engine Zeff 0.8.0 ready";

test("the page is isolated, and the engine starts and runs the example", async ({ page }) => {
  const from = Date.now();
  await page.goto("/");
  expect(await page.evaluate(() => window.crossOriginIsolated)).toBe(true);
  // A first visit: the Start screen fetches, checks and starts the engine.
  const open = page.getByRole("button", { name: "Open Zemp Lite" });
  await expect(open).toBeEnabled({ timeout: 30_000 });
  const started = Date.now() - from;
  test.info().annotations.push({
    type: "first start",
    description: `${started} ms from the first request to the engine ready (the goal: 2,000 ms)`,
  });
  console.log(`first start: ${started} ms (the goal: 2,000 ms)`);
  await expect(page.getByTestId("step-check")).toHaveClass(/done/);
  await open.click();
  await page.getByRole("button", { name: "Scratch project" }).click();
  await expect(page.getByRole("status")).toHaveText(READY, { timeout: 30_000 });
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("done", { timeout: 30_000 });
});

test("what is counted, and what is never collected, is said on a page of its own", async ({
  page,
}) => {
  await page.goto("/counted.html");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What is counted");
  await expect(page.getByText("No cookie", { exact: false }).first()).toBeVisible();
});

test("a statement run alone and a plot drawn afresh are timed at the address", async ({ page }) => {
  await page.goto("/");
  const open = page.getByRole("button", { name: "Open Zemp Lite" });
  await expect(open).toBeEnabled({ timeout: 30_000 });
  await open.click();
  await page.getByRole("button", { name: "Scratch project" }).click();
  await expect(page.getByRole("status")).toHaveText(READY, { timeout: 30_000 });
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("done", { timeout: 30_000 });
  // ⌘↵ on the last statement of the script: it runs with what it needs, from the top. Run
  // has unfolded every output, and the editor draws only the lines near its window: folded,
  // the whole script is drawn, and its last line is the script's last, which is held.
  await page.getByRole("button", { name: "Fold all", exact: true }).click();
  await page.locator(".cm-content .cm-line").last().click();
  await expect(page.locator(".cm-lineNumbers .cm-activeLineGutter")).toHaveText("24");
  // Timed in the page: from the key to the status saying "done" again after it changed, and
  // of that, how long before the status first changed (the run had not begun until then).
  const timed = page.evaluate(
    () =>
      new Promise<{ whole: number; before: number }>((resolve) => {
        const status = document.querySelector('[role="status"]')!;
        let from = 0;
        let left = 0;
        document.addEventListener("keydown", () => (from = performance.now()), {
          capture: true,
          once: true,
        });
        new MutationObserver(() => {
          const now = status.textContent ?? "";
          const at = performance.now();
          if (now !== "done") {
            if (left === 0) left = at;
          } else if (left !== 0) {
            resolve({ whole: Math.round(at - from), before: Math.round(left - from) });
          }
        }).observe(status, { childList: true, characterData: true, subtree: true });
      }),
  );
  await page.keyboard.press("ControlOrMeta+Enter");
  const statement = await timed;
  // That a second run was made, and how long the engine took over it, as the run's own facts
  // say: the time from the key to "done" holds more than the run (the check before it, and
  // the page drawn after it), so both are reported.
  const facts = page.getByTestId("run-facts");
  await expect(facts).toHaveText(/^run 2 · .* in [\d.,]+ m?s$/);
  const ran = (await facts.textContent()) ?? "";
  // A plot drawn afresh for a new place: the interface reports how long the run took.
  await page
    .getByRole("navigation", { name: "Places" })
    .getByRole("button", { name: "Plots", exact: true })
    .click();
  const drawn = page.getByTestId("draw-time");
  await expect(drawn).toHaveText(/drawn by a run of the script in \d/, { timeout: 30_000 });
  const redraw = (await drawn.textContent()) ?? "";
  for (const [type, description] of [
    [
      "one statement",
      `${statement.whole} ms for ⌘↵ on the last statement, from the key to done, ${statement.before} ms of it before the run began (${ran})`,
    ],
    ["redraw", redraw],
  ] as const) {
    test.info().annotations.push({ type, description });
    console.log(`${type}: ${description}`);
  }
});

test("the first drawing of a run's figures is timed at the address", async ({ page }) => {
  // The engine does one thing at a time: a statement asked for while the figures of the run
  // before are being drawn waits its turn. So how long that first drawing takes, on a machine
  // that has drawn no figure yet, is what a ⌘↵ pressed just after Run may wait (the check
  // above has shown 2.5 to 3.2 s before its run began, at some deployments in Chromium).
  // The window is tall, so that the editor draws every line and each figure is asked for.
  await page.setViewportSize({ width: 1280, height: 3000 });
  await page.goto("/");
  const open = page.getByRole("button", { name: "Open Zemp Lite" });
  await expect(open).toBeEnabled({ timeout: 30_000 });
  await open.click();
  await page.getByRole("button", { name: "Scratch project" }).click();
  await expect(page.getByRole("status")).toHaveText(READY, { timeout: 30_000 });
  // Timed in the page: from the status saying "done" to the first figure standing on it.
  const timed = page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const status = document.querySelector('[role="status"]')!;
        let done = 0;
        const look = () => {
          if (done === 0 && status.textContent === "done") done = performance.now();
          if (done !== 0 && document.querySelector('[data-testid="figure"] img') !== null) {
            watch.disconnect();
            resolve(Math.round(performance.now() - done));
          }
        };
        const watch = new MutationObserver(look);
        watch.observe(document.body, { childList: true, characterData: true, subtree: true });
      }),
  );
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("done", { timeout: 30_000 });
  await expect(page.locator('[data-testid="figure"] img').first()).toBeVisible({
    timeout: 30_000,
  });
  const description = `the run's figures first drawn ${await timed} ms after done`;
  test.info().annotations.push({ type: "first drawing", description });
  console.log(`first drawing: ${description}`);
});

test("a project is exported at the address as a zip, and the zip opened there again", async ({
  page,
}) => {
  // A reader's way out of the browser, and back (open decision #208): what the hosted alpha
  // gives the computer is read here by the reader of this repository, and then opened at the
  // address as a new project that runs.
  await page.goto("/");
  const open = page.getByRole("button", { name: "Open Zemp Lite" });
  await expect(open).toBeEnabled({ timeout: 30_000 });
  await open.click();
  await page.getByRole("button", { name: "Scratch project" }).click();
  await expect(page.getByRole("status")).toHaveText(READY, { timeout: 30_000 });
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByRole("combobox", { name: "Type a command" }).fill("Project: export");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.keyboard.press("Enter"),
  ]);
  expect(download.suggestedFilename()).toBe("Scratch.zip");
  const path = await download.path();
  const zip = await readZip(new Uint8Array(readFileSync(path)), {
    whole: 50_000_000,
    entries: 1_000,
  });
  expect(zip.files.map((file) => file.path)).toEqual([
    "Scratch/scripts/instruments.zeff",
    "Scratch/scripts/main.zeff",
    "Scratch/scripts/plots.zeff",
    "Scratch/zeff.toml",
  ]);
  expect(zip.folders).toEqual(["Scratch/data"]);
  // Opened again from the start screen: a project of its own name, which runs.
  await page.getByRole("button", { name: "Projects ▾" }).click();
  await page.getByLabel("A project's zip to open").setInputFiles(path);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Scratch 2");
  await expect(page.getByRole("status")).toHaveText(READY, { timeout: 30_000 });
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("done", { timeout: 30_000 });
});
