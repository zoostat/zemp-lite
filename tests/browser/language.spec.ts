// The engine's language server in the browser (release 0.2, step 10a): its diagnostics as
// one types, what it knows of a word on resting over it, and no wait while a run goes, since
// it runs in a worker of its own.
import type { Page } from "@playwright/test";
import { editor, expect, test, write } from "./support";

const READY = "engine Zeff 0.8.0 ready";

async function scratch(page: Page, press: (target: ReturnType<Page["locator"]>) => Promise<void>) {
  await page.goto("/");
  await press(page.getByRole("button", { name: "Scratch project" }));
  await expect(page.getByRole("status")).toHaveText(READY);
}

test("the language server's diagnostics are underlined as one types, and go when mended", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await write(page, "let w = dataset(wages)\nlet z = nosuch(3)\n");
  const error = page.locator(".cm-lintRange-error");
  await expect(error).toHaveCount(1);
  await expect(error).toHaveText("nosuch");
  await write(page, "let w = dataset(wages)\nlet z = sqrt(3)\n");
  await expect(error).toHaveCount(0);
});

test("resting on a function's name shows what the language server knows of it", async ({
  page,
  press,
  browserName,
}) => {
  test.skip(browserName === "webkit", "the test browser's mouse is not dependable in WebKit here");
  await scratch(page, press);
  await write(page, "let w = dataset(wages)\nw.summary([wage])\n");
  await page.waitForTimeout(400);
  const word = editor(page).locator(".cm-line").nth(1).getByText("summary");
  await word.hover();
  const hover = page.getByTestId("hover");
  await expect(hover).toBeVisible();
  await expect(hover).toContainText("summary");
});

test("the language server answers while a long run goes", async ({ page, press }) => {
  await scratch(page, press);
  await write(
    page,
    "for i in 1..200000 {\n    let rows = dataset(wages).where(year == 2015).n_rows()\n}\nlet z = nosuch(1)\n",
  );
  // The check refuses the script while nosuch stands; mended, it runs, and typing goes on.
  await write(
    page,
    'for i in 1..200000 {\n    let rows = dataset(wages).where(year == 2015).n_rows()\n}\nprint("end")\n',
  );
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.locator('[data-testid="note"][data-line="1"]')).toContainText("running…");
  // A mistake typed while the run goes is underlined at once: the run does not hold it up.
  await editor(page).focus();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.insertText("let q = nosuch(2)\n");
  await expect(page.locator(".cm-lintRange-error")).toHaveCount(1);
  await expect(page.locator('[data-testid="note"][data-line="1"]')).toContainText("running…");
  await press(page.locator("header.top").getByRole("button", { name: "Stop", exact: true }));
});
