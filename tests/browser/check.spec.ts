// Check (release 0.2, step 4): the engine's check of the script as `zeff check` makes it,
// with nothing run. What it finds stands under the lines it names, as a refused run's
// findings do, the results on the page stay, and the status gives the engine's last line.
import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { expect, printed, test, write } from "./support";

const READY = "engine Zeff 0.8.0 ready";
const file = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

async function scratch(page: Page, press: (target: ReturnType<Page["locator"]>) => Promise<void>) {
  await page.goto("/");
  await press(page.getByRole("button", { name: "Scratch project" }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await press(page.getByRole("button", { name: "Panes", exact: true }));
}

test("Check says what `zeff check` says of a script with no problems, and runs nothing", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await press(page.getByRole("button", { name: "Check" }));
  await expect(page.getByTestId("sync")).toHaveText("checked scripts/main.zeff: no problems");
  await expect(page.getByTestId("block")).toHaveCount(0);
  // Once the script is edited, what the check said is no longer of it.
  await write(page, file("examples/scratch/scripts/main.zeff") + "print(1)\n");
  await expect(page.getByTestId("sync")).toHaveText("not run yet");
});

test("what Check finds stands under its line, and the results of the run before stay", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByTestId("sync")).toHaveText("in sync · 1 warning");
  const before = await printed(page);
  const blocks = await page.getByTestId("block").count();

  await write(page, file("examples/scratch/scripts/main.zeff") + "let z = nosuch(3)\n");
  await press(page.getByRole("button", { name: "Check" }));
  await expect(page.getByTestId("sync")).toHaveText("not run · 1 error found by the check");
  await expect(page.getByTestId("refused")).toContainText("found 1 error; nothing was run");
  const first = page.getByTestId("block").first();
  await expect(first).toContainText("no function is called `nosuch`");
  await expect(first).toHaveAttribute("data-line", "22");
  expect(await printed(page)).toBe(before);
  await expect(page.getByTestId("block")).toHaveCount(blocks + 1);
});

test("a script Check refuses before any run shows what it found under its line", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await write(page, file("tests/scripts/refused.zeff"));
  await press(page.getByRole("button", { name: "Check" }));
  // With no results on the page to keep, the status gives the engine's own last line.
  await expect(page.getByTestId("sync")).toHaveText("scripts/main.zeff: 1 error, 0 warnings");
  await expect(page.getByTestId("block")).toHaveCount(1);
  await expect(page.getByTestId("block")).toHaveAttribute("data-line", "2");
  expect(await printed(page)).toBe("");
});

test("Check is in ⌘K", async ({ page, press }) => {
  await scratch(page, press);
  await page.keyboard.press("ControlOrMeta+k");
  await page.keyboard.type("check");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("sync")).toHaveText("checked scripts/main.zeff: no problems");
});
