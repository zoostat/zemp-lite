// The loading screen redrawn (release 0.2.4, step 6; open decision #220, item 3; the design
// guide, section 9, "Loading screen"): the name large with **Open Zemp Lite**, grey until the
// engine runs; the card **Starting the engine**, one bar over three steps; the size that
// travels, which the build takes from the engine; a failure with its sentence and **Try
// again**; the four promises in their band.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { Page, Route } from "@playwright/test";
import { expect, faintText, smallestText, test } from "./support";

test.use({ firstVisit: true });

const start = (page: Page) => page.getByTestId("start");
const open = (page: Page) => page.getByRole("button", { name: "Open Zemp Lite" });
const whole = (page: Page) => page.getByTestId("start-whole");

/** The facts the build took from the engine (`tools/facts.mjs`), asked for as the build asks. */
function facts(): { travels: number } {
  const tool = fileURLToPath(new URL("../../tools/facts.mjs", import.meta.url));
  const ran = spawnSync(process.execPath, [tool], { encoding: "utf8" });
  if (ran.status !== 0) throw new Error(ran.stderr);
  return JSON.parse(ran.stdout) as { travels: number };
}

test("while the engine is fetched the button is grey and says when it will open; then it opens, by Return too", async ({
  page,
}) => {
  // The engine's file is held back until the test lets it go.
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/*.wasm", async (route: Route) => {
    await held;
    await route.continue();
  });
  await page.goto("/app/");
  await expect(start(page).getByRole("heading", { level: 1 })).toHaveText("Zemp Lite");
  await expect(start(page)).toContainText("Zeff in your browser.");
  await expect(open(page)).toBeDisabled();
  await expect(page.getByTestId("open-hint")).toHaveText("Opens as soon as the engine is ready.");
  await expect(whole(page)).toHaveText(/Step 1 of 3\s*0 %/);
  await expect(page.getByTestId("step-fetch")).toHaveClass(/going/);
  await expect(page.getByTestId("step-check")).toHaveClass(/waiting/);
  await expect(page.getByTestId("step-start")).toContainText("waiting");
  const bar = page.getByRole("progressbar", { name: "Starting the engine" });
  await expect(bar).toHaveAttribute("aria-valuenow", "0");

  release();
  await expect(open(page)).toBeEnabled({ timeout: 30_000 });
  await expect(whole(page)).toHaveText(/Ready\s*100 %/);
  await expect(bar).toHaveAttribute("aria-valuenow", "100");
  await expect(page.getByTestId("open-hint")).toHaveText("or press ↵");
  // The cursor is on the button once the engine runs: Return opens the app.
  await expect(open(page)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: /^Scratch project/ })).toBeVisible();
});

test("the size given is the size the engine travels at, not its size unpacked", async ({
  page,
}) => {
  const { travels } = facts();
  const said = `${(travels / 1_000_000).toFixed(1)} MB`;
  await page.goto("/app/");
  await expect(open(page)).toBeEnabled({ timeout: 30_000 });
  await expect(page.getByTestId("step-fetch")).toContainText(`${said}, once`);
  // The file unpacked is five times that; nothing on the screen gives it.
  expect(travels).toBeLessThan(5_000_000);
  await expect(start(page)).not.toContainText(/1\d\.\d MB/);
});

test("a fetching that fails says so in the engine's step, and Try again starts it afresh", async ({
  page,
}) => {
  let failing = true;
  await page.route("**/*.wasm", async (route: Route) => {
    if (failing) await route.fulfill({ status: 503, body: "not now" });
    else await route.continue();
  });
  await page.goto("/app/");
  const problem = start(page).getByRole("alert");
  await expect(problem).toContainText("the engine could not be fetched: the host answered 503.");
  await expect(page.getByTestId("step-fetch")).toHaveClass(/failed/);
  await expect(page.getByTestId("step-fetch")).toContainText("failed");
  await expect(open(page)).toBeDisabled();
  // The control is reached by the keyboard.
  const again = problem.getByRole("button", { name: "Try again" });
  await again.focus();
  failing = false;
  await page.keyboard.press("Enter");
  await expect(open(page)).toBeEnabled({ timeout: 30_000 });
  await expect(problem).toHaveCount(0);
  await expect(page.getByTestId("step-fetch")).toHaveClass(/done/);
});

for (const theme of ["light", "dark"] as const) {
  test(`the screen holds 12.5 pixels and 4.5 to 1, at a desk's width and a phone's (${theme})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: theme });
    for (const width of [1440, 1000, 375]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/app/");
      await expect(open(page)).toBeEnabled({ timeout: 30_000 });
      expect(await smallestText(page), `the smallest text at ${width}`).toBeGreaterThanOrEqual(
        12.5,
      );
      expect(await faintText(page.locator("body")), `faint text at ${width}`).toEqual([]);
      // Nothing is cut off at the side: the page is as wide as the window and no wider.
      const over = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(over, `wider than the window at ${width}`).toBeLessThanOrEqual(0);
      // The four promises are all there, and the way on can be reached.
      await expect(
        page.getByRole("region", { name: "What Zemp Lite promises" }).getByRole("listitem"),
      ).toHaveCount(4);
      await open(page).scrollIntoViewIfNeeded();
      await expect(open(page)).toBeVisible();
    }
  });
}
