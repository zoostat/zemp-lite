// Check (release 0.2, step 4): the engine's check of the script as `zeff check` makes it,
// with nothing run. What it finds stands under the lines it names, as a refused run's
// findings do, the results on the page stay, and the status gives the engine's last line.
import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { expect, printed, test, write, useExample } from "./support";

const READY = "engine Zeff 0.8.0 ready";
const file = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

async function scratch(page: Page, press: (target: ReturnType<Page["locator"]>) => Promise<void>) {
  await page.goto("/");
  await press(page.getByRole("button", { name: "Scratch project" }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await useExample(page);
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
  await write(page, file("tests/scripts/example/scripts/main.zeff") + "print(1)\n");
  await expect(page.getByTestId("sync")).toHaveText("not run yet");
});

test("what Check finds stands under its line, and the results of the run before stay", async ({
  page,
  press,
}) => {
  // A window tall enough for the whole script with its outputs: the editor draws only the
  // lines near its window.
  await page.setViewportSize({ width: 1280, height: 3600 });
  await scratch(page, press);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByTestId("sync")).toHaveText("in sync · 1 warning");
  // The run unfolded its seven outputs, each under its statement.
  await expect(page.getByTestId("block")).toHaveCount(7);
  const before = await printed(page);

  await write(page, file("tests/scripts/example/scripts/main.zeff") + "let z = nosuch(3)\n");
  await press(page.getByRole("button", { name: "Check" }));
  await expect(page.getByTestId("sync")).toHaveText("not run · 1 error found by the check");
  // What the check found is the one block more, under the line it names, the last of the script.
  await expect(page.getByTestId("block")).toHaveCount(8);
  const found = page.getByTestId("block").last();
  await expect(found).toContainText("no function is called `nosuch`");
  await expect(found).toHaveAttribute("data-line", "22");
  expect(await printed(page)).toBe(before);
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
