// The editor (release 0.1, step 7): CodeMirror, with line numbers, the current line marked,
// and the code coloured in the categories of the design guide.
import type { Page } from "@playwright/test";
import { editor, expect, printed, scriptText, test, write, useExample } from "./support";

const READY = "engine Zeff 0.8.0 ready";

async function scratch(page: Page, press: (target: ReturnType<Page["locator"]>) => Promise<void>) {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await press(page.getByRole("button", { name: "Scratch project" }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await useExample(page);
  // These tests are of the Panes layout; a project opens in the margin editor.
  await press(page.getByRole("button", { name: "Panes", exact: true }));
}

/** The colour and style a word of the code is drawn in. */
async function drawn(page: Page, word: string) {
  const span = editor(page).locator("span", { hasText: word }).first();
  return span.evaluate((node) => {
    const style = getComputedStyle(node);
    return `${style.color} ${style.fontStyle}`;
  });
}

test("the code is coloured in the categories of the design guide, the same words in both themes", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await write(
    page,
    '// a note\nlet fit = wages.reg(log(wage) ~ educ, cluster: worker)\nexport(fit, "output/t.docx", level: 0.95)\n',
  );
  expect(await drawn(page, "// a note")).toBe("rgb(107, 107, 115) italic");
  expect(await drawn(page, "let")).toBe("rgb(123, 79, 214) normal");
  expect(await drawn(page, "reg")).toBe("rgb(31, 99, 194) normal");
  expect(await drawn(page, "cluster")).toBe("rgb(163, 54, 124) normal");
  expect(await drawn(page, "~")).toBe("rgb(15, 123, 138) normal");
  expect(await drawn(page, '"output/t.docx"')).toBe("rgb(43, 122, 75) normal");
  expect(await drawn(page, "0.95")).toBe("rgb(168, 82, 12) normal");
  // A variable keeps the main ink of code: colour marks structure, never data.
  expect(await drawn(page, "wages")).toBe("rgb(58, 58, 66) normal");

  await press(page.getByRole("switch", { name: "Dark" }));
  expect(await drawn(page, "let")).toBe("rgb(196, 167, 255) normal");
  expect(await drawn(page, "reg")).toBe("rgb(140, 188, 255) normal");
  expect(await drawn(page, "// a note")).toBe("rgb(143, 145, 156) italic");
});

test("the lines are numbered and the current line is marked", async ({ page, press }) => {
  await scratch(page, press);
  const numbers = page.locator(".cm-lineNumbers .cm-gutterElement");
  await expect(numbers.filter({ hasText: /^21$/ })).toBeVisible();
  // Line numbers are a pixel and a half smaller than the code.
  expect(
    await numbers.filter({ hasText: /^4$/ }).evaluate((node) => getComputedStyle(node).fontSize),
  ).toBe("12.5px");
  await editor(page).focus();
  await page.keyboard.press("ControlOrMeta+Home");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  const current = page.locator(".cm-lineNumbers .cm-activeLineGutter");
  await expect(current).toHaveText("4");
  expect(await current.evaluate((node) => getComputedStyle(node).color)).toBe("rgb(91, 58, 158)");
  await expect(page.locator(".cm-activeLine")).toHaveText("let wages = dataset(wages)");
});

test("what is typed is saved as it is typed, undone with the keyboard, and Tab indents", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await write(page, "let a = 1\n");
  await expect.poll(() => scriptText(page)).toBe("let a = 1\n");
  await expect(page.locator("header.top")).toContainText("· saved");
  // Typing that follows within half a second is undone together with what came before it.
  await page.waitForTimeout(700);
  await page.keyboard.type("let b = 2");
  await expect.poll(() => scriptText(page)).toBe("let a = 1\nlet b = 2");
  await page.keyboard.press("ControlOrMeta+z");
  await expect.poll(() => scriptText(page)).toBe("let a = 1\n");
  await page.keyboard.press("Tab");
  await page.keyboard.type("x");
  await expect.poll(() => scriptText(page)).toBe("let a = 1\n    x");
  // The file in the project is what the editor holds: another tab and back shows it.
  await press(page.getByRole("complementary").getByRole("button", { name: /zeff\.toml/ }));
  await expect.poll(() => scriptText(page)).toMatch(/^\[project\]/);
  await press(page.getByRole("tab", { name: "main.zeff" }));
  await expect.poll(() => scriptText(page)).toBe("let a = 1\n    x");
});

test("the script runs from the keyboard, with ⌘↵ and with ⌘⇧↵", async ({ page, press }) => {
  await scratch(page, press);
  await write(page, "print(6 * 7)\n");
  await page.keyboard.press("ControlOrMeta+Enter");
  await expect(page.getByRole("status")).toHaveText("done");
  await expect.poll(() => printed(page)).toBe("42\n");
  // The key ran the script and wrote nothing into it.
  await expect.poll(() => scriptText(page)).toBe("print(6 * 7)\n");
  await write(page, "print(1 + 1)\n");
  await page.keyboard.press("Shift+ControlOrMeta+Enter");
  await expect.poll(() => printed(page)).toBe("2\n");
});

test("the sample script of the specification reads in the editor, coloured", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await write(
    page,
    "let m = wages.reg(lwage ~ educ + exper, se: robust)\nm.summary(standardized: true)\n",
  );
  expect(await drawn(page, "se")).toBe("rgb(163, 54, 124) normal");
  expect(await drawn(page, "true")).toBe("rgb(168, 82, 12) normal");
  expect(await drawn(page, "summary")).toBe("rgb(31, 99, 194) normal");
});
