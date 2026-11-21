// Help (release 0.2, step 11; open decision #74): the Help panel beside the script, F1 on a
// name, following the function under the cursor, a code's explained page from what the run
// said, and `:help` in the console line. Every page is the engine's.
import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { cursorTo, expect, test, write, useExample } from "./support";

const READY = "engine Zeff 0.8.0 ready";
const file = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

async function scratch(page: Page, press: (target: ReturnType<Page["locator"]>) => Promise<void>) {
  await page.goto("/");
  await press(page.getByRole("button", { name: "Scratch project" }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await useExample(page);
}

/** Put the cursor at a column of a line of the script (both counted from 1). */
async function cursorAt(page: Page, line: number, column: number) {
  await cursorTo(page, line);
  for (let at = 1; at < column; at++) await page.keyboard.press("ArrowRight");
}

test("F1 on a function's name opens its page beside the script, as zeff help prints it", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await write(page, "let w = dataset(wages)\nw.summary([wage])\n");
  await expect(page.getByTestId("help")).toHaveCount(0);
  await cursorAt(page, 2, 4);
  await page.keyboard.press("F1");
  const help = page.getByTestId("help");
  await expect(help).toBeVisible();
  await expect(help.getByTestId("help-page")).toHaveText(
    file("tests/scripts/help-summary.txt").trimEnd(),
  );
  // It stands beside the script, not over it.
  const panel = (await help.boundingBox())!;
  const script = (await page.getByRole("region", { name: /Script/ }).boundingBox())!;
  expect(panel.x).toBeGreaterThanOrEqual(script.x + script.width - 1);
  await press(help.getByRole("button", { name: "‹ Hide" }));
  await expect(help).toHaveCount(0);
});

test("the Help panel follows the function under the cursor, unless switched off", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await write(page, "let w = dataset(wages)\nw.summary([wage])\nw.reg(log(wage) ~ educ)\n");
  await cursorAt(page, 2, 4);
  await page.keyboard.press("F1");
  const title = page.getByTestId("help").getByRole("heading");
  await expect(title).toHaveText("summary");
  await cursorAt(page, 3, 4);
  await expect(title).toHaveText("reg");
  await page.getByTestId("help").getByRole("checkbox", { name: "Follows the cursor" }).uncheck();
  await cursorAt(page, 2, 4);
  await page.waitForTimeout(400);
  await expect(title).toHaveText("reg");
});

test("a code's explained page opens in the Help panel from what the run said", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await press(page.locator("footer.bottom button.state"));
  await press(
    page.getByTestId("run-said").locator("li.warning").getByRole("button", { name: "Explain" }),
  );
  const help = page.getByTestId("help");
  await expect(help.getByRole("heading")).toHaveText("W0201");
  await expect(help.getByTestId("help-page")).toHaveText(
    file("tests/scripts/explain-W0201.txt").trimEnd(),
  );
});

test(":help in the console line prints a function's page, as zeff repl does", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  const line = page.getByRole("textbox", { name: /Console/ });
  await line.fill(":help summary");
  await line.press("Enter");
  await expect(page.getByTestId("console-printed").last()).toHaveText(
    file("tests/scripts/help-summary.txt").trimEnd(),
  );
});
