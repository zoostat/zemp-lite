import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { expect, printed, saidAsWritten, scriptText, test, write } from "./support";

const example = (file: string) =>
  readFileSync(new URL(`../../examples/scratch/${file}`, import.meta.url), "utf8");

const READY = "engine Zeff 0.8.0 ready";

/** Open the Scratch project from the welcome screen and wait for the engine. */
async function scratch(page: Page, press: (target: ReturnType<Page["locator"]>) => Promise<void>) {
  await page.goto("/");
  await press(page.getByRole("button", { name: "Scratch project" }));
  await expect(page).toHaveURL(/#\/p\/scratch$/);
  await expect(page.getByRole("status")).toHaveText(READY);
  // These tests are of the Panes layout; a project opens in Inline.
  await press(page.getByRole("button", { name: "Panes", exact: true }));
}

test("the welcome screen opens, names the release and says where projects are kept", async ({
  page,
  browserName,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Zemp Lite 0.2");
  // The page is cross-origin isolated, so the cancel flag can be shared with the worker.
  expect(await page.evaluate(() => crossOriginIsolated)).toBe(true);
  await expect(page.getByRole("button", { name: "New project…" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Open folder…" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Scratch project" })).toBeEnabled();
  // WebKit's test profile behaves as a private window does, which keeps nothing; that
  // projects are kept, in both browsers, is tested in `kept.spec.ts`.
  await expect(
    page.getByText(browserName === "webkit" ? "Not kept." : "Kept on this computer."),
  ).toBeVisible();
  await expect(page.getByText("No project yet.")).toBeVisible();
  await expect(page.getByText("engine Zeff 0.8.0 · in this browser")).toBeVisible();
  // The shipped fonts are the ones drawn: no outside server is asked for one.
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('16px "Atkinson Hyperlegible Next"'))).toBe(
    true,
  );
  expect(await page.evaluate(() => document.fonts.check('34px "Newsreader"'))).toBe(true);
  expect(errors).toEqual([]);
});

test("the light and dark button switches the theme, and the choice is remembered", async ({
  page,
  press,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const ground = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(await ground()).toBe("rgb(255, 255, 255)");
  await press(page.getByRole("button", { name: "Switch to the dark theme" }));
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await ground()).toBe("rgb(22, 23, 27)");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "Switch to the light theme" })).toBeVisible();
});

test("with no choice made, the theme is the system's", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("the Scratch project holds the example, which prints what `zeff run` 0.8.0 prints, byte for byte", async ({
  page,
  press,
}) => {
  const before = Date.now();
  await scratch(page, press);
  // For the notes of the release, not a limit: from asking for the page to the engine ready.
  test.info().annotations.push({ type: "engine ready", description: `${Date.now() - before} ms` });
  await expect.poll(() => scriptText(page)).toBe(example("scripts/main.zeff"));
  await press(page.getByRole("button", { name: "Run" }));
  await expect(page.getByRole("status")).toHaveText("done");
  expect(await printed(page)).toBe(example("expected/stdout.txt"));
  expect(await saidAsWritten(page)).toBe(example("expected/stderr.txt"));
});

test("a data file chosen from the computer is added under data/, read by a run, and no script is changed", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await page.getByLabel("Data files to add").setInputFiles({
    name: "pay.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("id,wage\n1,23.5\n2,19\n3,31.25\n"),
  });
  await expect(page.getByRole("listitem").filter({ hasText: "pay.csv" }).last()).toContainText(
    "28 B",
  );
  await expect.poll(() => scriptText(page)).toBe(example("scripts/main.zeff"));
  await write(page, 'print(import("data/pay.csv").n_rows())\n');
  await press(page.getByRole("button", { name: "Run" }));
  await expect(page.getByRole("status")).toHaveText("done");
  await expect.poll(() => printed(page)).toBe("3\n");
  // The same name a second time is refused, in words.
  await page.getByLabel("Data files to add").setInputFiles({
    name: "pay.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("id\n9\n"),
  });
  await expect(page.getByRole("alert")).toContainText("`data/pay.csv` is already in this project");
});

test("a long run is cancelled between two steps and the page stays usable", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await write(
    page,
    'print("started")\nfor i in 1..200000 {\n    let rows = dataset(wages).where(year == 2015).n_rows()\n}\nprint("never")\n',
  );
  await press(page.getByRole("button", { name: "Run" }));
  // The loop is under way, and the page still answers: the engine is in its own worker.
  await expect(page.getByTestId("running")).toContainText("pass");
  await press(page.getByRole("button", { name: "Cancel" }));
  await expect(page.getByRole("status")).toHaveText("ended with exit code 1");
  await expect.poll(() => printed(page)).toBe("started\n");
  await expect(page.getByTestId("said")).toContainText("Z0705");
  await expect(page.getByTestId("said")).toContainText(
    /the run was cancelled before pass \d+ of this loop/,
  );
  // The project is still open in the worker, and the next run goes to its end.
  await write(page, "print(6 * 7)\n");
  await press(page.getByRole("button", { name: "Run" }));
  await expect(page.getByRole("status")).toHaveText("done");
  await expect.poll(() => printed(page)).toBe("42\n");
});

test("in a private window, where the browser keeps nothing, the screen says so and projects still work", async ({
  page,
  press,
  browserName,
}) => {
  // Only WebKit refuses a private window its storage; the others keep it for the session.
  test.skip(browserName !== "webkit", "this browser gives a private window storage");
  await page.goto("/");
  await expect(page.getByText("Not kept.")).toBeVisible();
  await press(page.getByRole("button", { name: "Scratch project" }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await press(page.getByRole("button", { name: "Run" }));
  await expect(page.getByRole("status")).toHaveText("done");
  expect(await printed(page)).toBe(example("expected/stdout.txt"));
});
