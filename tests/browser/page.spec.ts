import { readFileSync } from "node:fs";
import { expect, test } from "./support";

const example = (file: string) =>
  readFileSync(new URL(`../../examples/scratch/${file}`, import.meta.url), "utf8");

test("the page opens, names the release, and starts the released engine", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const before = Date.now();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Zemp Lite 0.1");
  // The page is cross-origin isolated, so the cancel flag can be shared with the worker.
  expect(await page.evaluate(() => crossOriginIsolated)).toBe(true);
  await expect(page.getByRole("status")).toHaveText("engine Zeff 0.7.0 ready");
  // For the notes of the release, not a limit: from asking for the page to the engine ready.
  test.info().annotations.push({ type: "engine ready", description: `${Date.now() - before} ms` });
  expect(errors).toEqual([]);
});

test("a script runs in the worker and what it prints is shown", async ({ page, press }) => {
  await page.goto("/");
  await expect(page.getByRole("status")).toHaveText("engine Zeff 0.7.0 ready");
  await press(page.getByRole("button", { name: "Run" }));
  await expect(page.getByRole("status")).toHaveText("done");
  await expect(page.getByTestId("output")).toHaveText("Hello from Zeff\n2\n");
});

test("the example prints in the browser what `zeff run` 0.7.0 prints, byte for byte", async ({
  page,
  press,
}) => {
  await page.goto("/");
  await expect(page.getByRole("status")).toHaveText("engine Zeff 0.7.0 ready");
  await page.getByLabel("A Zeff script").fill(example("scripts/main.zeff"));
  await press(page.getByRole("button", { name: "Run" }));
  await expect(page.getByRole("status")).toHaveText("done");
  expect(await page.getByTestId("output").textContent()).toBe(example("expected/stdout.txt"));
  expect(await page.getByTestId("messages").textContent()).toBe(example("expected/stderr.txt"));
});

test("a long run is cancelled between two steps and the page stays usable", async ({
  page,
  press,
}) => {
  await page.goto("/");
  await expect(page.getByRole("status")).toHaveText("engine Zeff 0.7.0 ready");
  const script = page.getByLabel("A Zeff script");
  await script.fill(
    'print("started")\nfor i in 1..200000 {\n    let rows = dataset(wages).where(year == 2015).n_rows()\n}\nprint("never")\n',
  );
  await press(page.getByRole("button", { name: "Run" }));
  // The loop is under way, and the page still answers: the engine is in its own worker.
  await expect(page.getByTestId("step")).toContainText("pass");
  await press(page.getByRole("button", { name: "Cancel" }));
  await expect(page.getByRole("status")).toHaveText("ended with exit code 1");
  await expect(page.getByTestId("output")).toHaveText("started\n");
  await expect(page.getByTestId("messages")).toContainText(
    /error\[Z0705\]: the run was cancelled before pass \d+ of this loop/,
  );
  // The project is still open in the worker, and the next run goes to its end.
  await script.fill("print(6 * 7)\n");
  await press(page.getByRole("button", { name: "Run" }));
  await expect(page.getByRole("status")).toHaveText("done");
  await expect(page.getByTestId("output")).toHaveText("42\n");
});
