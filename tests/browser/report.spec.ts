// Report a problem (release 0.2, step 16; the Zemp Specification, section 5): the engine
// builds the bug report of the run's failure in the worker, as `zeff report-bug` builds it;
// the window shows it whole; the user saves it as a file. Nothing is sent. The report of
// tests/scripts/report/error.zeff is held to what the released `zeff report-bug` wrote for it,
// the platform named as the browser.
import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { expect, test, write } from "./support";

const READY = "engine Zeff 0.8.0 ready";
const file = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

async function ranWith(
  page: Page,
  press: (target: ReturnType<Page["locator"]>) => Promise<void>,
  text: string,
) {
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await write(page, text);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText(/^(done|ended with exit code \d)$/);
}

async function report(page: Page): Promise<void> {
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByRole("combobox", { name: "Type a command" }).fill("report a problem");
  await page.keyboard.press("Enter");
}

test("Report a problem builds the report zeff report-bug writes, shows it whole, and saves it", async ({
  page,
  press,
}) => {
  await ranWith(page, press, file("tests/scripts/report/error.zeff"));
  await report(page);
  const window_ = page.getByRole("dialog", { name: "Report a problem" });
  await expect(window_.getByTestId("report-what")).toHaveText(
    "an error, Z0715; 1 of the 4 statements of scripts/main.zeff are kept",
  );
  const released = file("tests/scripts/report/main-Z0715-2c0bfa05.md").replace(
    "- platform: aarch64 macos",
    "- platform: wasm32 browser",
  );
  expect(await window_.getByTestId("report-text").textContent()).toBe(released);
  await expect(window_).toContainText("nothing has been sent");
  // Saved as a file of the user's own; the name is the engine's.
  const saving = page.waitForEvent("download");
  await press(window_.getByRole("button", { name: "Save the report…" }));
  const download = await saving;
  expect(download.suggestedFilename()).toMatch(/^main-Z0715-[0-9a-f]{8}\.md$/);
  expect(readFileSync(await download.path(), "utf8")).toBe(released);
  await expect(window_.getByTestId("report-saved")).toHaveText(/^saved as main-Z0715-/);
  await page.keyboard.press("Escape");
  await expect(window_).toHaveCount(0);
});

test("a script that runs through has nothing to report, in the engine's words", async ({
  page,
  press,
}) => {
  await ranWith(page, press, "print(1)\n");
  await report(page);
  await expect(
    page.getByRole("dialog", { name: "Report a problem" }).getByTestId("report-none"),
  ).toHaveText("the script ran without an error: there is nothing to report");
  await press(page.getByRole("button", { name: "Close" }));
  await expect(page.getByRole("dialog", { name: "Report a problem" })).toHaveCount(0);
});
