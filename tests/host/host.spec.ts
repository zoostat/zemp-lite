// After each deployment (release 0.2, step 17): the page at the address is cross-origin
// isolated, so that a run can be cancelled; the engine of the release starts and runs the
// example; and the first start, from a browser that has never seen the page to the engine
// ready, is measured against the Zemp Specification's 2 seconds (section 14).
import { expect, test } from "@playwright/test";

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
  // Timed in the page: from the key to the status saying "done" again after it changed.
  const timed = page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const status = document.querySelector('[role="status"]')!;
        let from = 0;
        let left = false;
        document.addEventListener("keydown", () => (from = performance.now()), {
          capture: true,
          once: true,
        });
        new MutationObserver(() => {
          const now = status.textContent ?? "";
          if (now !== "done") left = true;
          else if (left) resolve(Math.round(performance.now() - from));
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
      `${statement} ms for ⌘↵ on the last statement, from the key to done (${ran})`,
    ],
    ["redraw", redraw],
  ] as const) {
    test.info().annotations.push({ type, description });
    console.log(`${type}: ${description}`);
  }
});
