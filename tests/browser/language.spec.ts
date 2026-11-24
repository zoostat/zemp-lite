// The engine's language server in the browser (release 0.2, step 10a): its diagnostics as
// one types, what it knows of a word on resting over it, and no wait while a run goes, since
// it runs in a worker of its own.
import type { Page } from "@playwright/test";
import { editor, expect, test, write, useExample } from "./support";

const READY = "engine Zeff 0.8.0 ready";

async function scratch(page: Page, press: (target: ReturnType<Page["locator"]>) => Promise<void>) {
  await page.goto("/app/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await useExample(page);
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

test("completion after a dot offers the methods of a frame, and one is taken", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await write(page, "let w = dataset(wages)\nw.summ");
  const list = page.locator(".cm-tooltip-autocomplete");
  await expect(list).toBeVisible();
  await expect(list).toContainText("summary");
  // A press on the offer takes it: it waits for the offer itself, where a key pressed while
  // a later answer replaces the list could fall between the two lists (seen on GitHub).
  await press(list.getByRole("option", { name: /^summary/ }).first());
  await expect.poll(() => editor(page).locator(".cm-line").nth(1).textContent()).toBe("w.summary");
});

test("the usage of a call is shown as it is opened, the parameter at the cursor in bold", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await write(page, "let w = dataset(wages)\nw.reg");
  await page.keyboard.press("Escape");
  await page.keyboard.type("(");
  const usage = page.getByTestId("usage");
  await expect(usage).toBeVisible();
  await expect(usage).toContainText("reg(");
  await page.keyboard.press("Escape");
  await expect(usage).toHaveCount(0);
});

test("Format the script, from ⌘K, lays the script out as zeff fmt does", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await write(page, "let  a=1\nprint( a )\n");
  await page.keyboard.press("ControlOrMeta+k");
  await page.keyboard.type("format the script");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toHaveText("formatted");
  await expect
    .poll(async () =>
      (await editor(page).locator(".cm-line").allTextContents()).slice(0, 2).join("\n"),
    )
    .toBe("let a = 1\nprint(a)");
});

test("Tab completes a statement in the console line, as if it followed the script", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  const line = page.getByRole("textbox", { name: /Console/ });
  await line.click();
  await page.keyboard.type("w2010.summ");
  await page.keyboard.press("Tab");
  await expect(line).toHaveValue("w2010.summary");
});
