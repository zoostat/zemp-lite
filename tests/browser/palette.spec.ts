// ⌘K and the console line (release 0.1, step 10).
import type { Page } from "@playwright/test";
import { editor, expect, printed, scriptText, test, write } from "./support";

const READY = "engine Zeff 0.7.0 ready";

async function scratch(page: Page, press: (target: ReturnType<Page["locator"]>) => Promise<void>) {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await press(page.getByRole("button", { name: "Scratch project" }));
  await expect(page.getByRole("status")).toHaveText(READY);
}

/** Open the palette, type, and run the first command listed. */
async function command(page: Page, typed: string): Promise<void> {
  await page.keyboard.press("ControlOrMeta+k");
  const box = page.getByRole("combobox", { name: "Type a command" });
  await box.fill(typed);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Commands" })).toHaveCount(0);
}

test("⌘K opens the palette, typing narrows it, the arrows choose, Escape closes", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  const palette = page.getByRole("dialog", { name: "Commands" });
  await expect(palette).toHaveCount(0);
  await page.keyboard.press("ControlOrMeta+k");
  await expect(palette).toBeVisible();
  const options = palette.getByRole("option");
  await expect(options.first()).toHaveText(/Run the script/);
  await expect(options.first()).toHaveAttribute("aria-selected", "true");
  const box = page.getByRole("combobox", { name: "Type a command" });
  await expect(box).toBeFocused();
  await box.fill("code");
  await expect(options).toHaveText([
    /Code text: larger/,
    /Code text: smaller/,
    /Code text: default size/,
  ]);
  await page.keyboard.press("ArrowDown");
  await expect(options.nth(1)).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowUp");
  await expect(options.nth(2)).toHaveAttribute("aria-selected", "true");
  await box.fill("no such thing");
  await expect(palette).toContainText("No command of that name.");
  await page.keyboard.press("Escape");
  await expect(palette).toHaveCount(0);
  // The top bar's ⌘K opens it too, and a press outside the box closes it.
  await press(page.getByRole("button", { name: "Commands" }));
  await expect(palette).toBeVisible();
  await page.keyboard.press("ControlOrMeta+k");
  await expect(palette).toHaveCount(0);
});

test("each command does what it says", async ({ page, press }) => {
  await scratch(page, press);
  const panes = page.getByRole("button", { name: "Panes", exact: true });
  const inline = page.getByRole("button", { name: "Inline", exact: true });
  await command(page, "layout panes");
  await expect(panes).toHaveAttribute("aria-pressed", "true");
  await command(page, "left panel hide");
  await expect(page.getByRole("complementary")).toHaveCount(0);
  await command(page, "left panel show");
  await expect(page.getByRole("complementary")).toBeVisible();
  await command(page, "output hide");
  await expect(page.getByRole("button", { name: "Show the output" })).toBeVisible();
  await command(page, "output show");
  await expect(page.getByRole("button", { name: "Hide the output" })).toBeVisible();
  await command(page, "layout inline");
  await expect(inline).toHaveAttribute("aria-pressed", "true");

  await command(page, "theme dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await command(page, "theme light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  const size = page.getByRole("group", { name: "Code text size" });
  await command(page, "code larger");
  await command(page, "code larger");
  await expect(size).toContainText("16");
  await command(page, "code smaller");
  await expect(size).toContainText("15");
  await command(page, "default size");
  await expect(size).toContainText("14");

  await write(page, "print(6 * 7)\n");
  await command(page, "run the script");
  await expect.poll(() => printed(page)).toBe("42\n");
  await command(page, "output clear");
  await expect.poll(() => printed(page)).toBe("");

  // A file is opened from the palette, which is how Inline reaches a second file.
  await command(page, "open file zeff.toml");
  await expect.poll(() => scriptText(page)).toMatch(/^\[project\]\nname = "Scratch"/);
  await command(page, "open file main.zeff");
  await expect.poll(() => scriptText(page)).toBe("print(6 * 7)\n");

  await command(page, "console");
  await expect(page.getByRole("textbox", { name: /^Console/ })).toBeFocused();
});

test("New project… and Projects, from the palette, go to the welcome screen", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await command(page, "new project");
  const name = page.getByLabel("The name of the new project");
  await expect(name).toBeFocused();
  await name.fill("From the palette");
  await press(page.getByRole("button", { name: "Create" }));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("From the palette");
  await expect(page.getByRole("status")).toHaveText(READY);
  await command(page, "projects back");
  await expect(page.getByText("No project open")).toBeVisible();
});

test("a statement typed in the console sees the script's bindings and leaves the script unchanged", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await write(page, "let a = 6\n");
  const console_ = page.getByRole("textbox", { name: /^Console/ });
  const entries = page.getByTestId("entry");
  await console_.fill("print(a * 7)");
  await console_.press("Enter");
  await expect(entries).toHaveCount(1);
  await expect(entries.first().getByTestId("console-printed")).toHaveText("42\n");
  await expect(console_).toHaveValue("");
  // The script is as it was typed: the console wrote nothing into it.
  expect(await scriptText(page)).toBe("let a = 6\n");
  await expect(page.locator("header.top")).toContainText("· saved");

  // What a console statement made is there for the next one.
  await console_.fill("let b = a + 1");
  await console_.press("Enter");
  await console_.fill("print(b)");
  await console_.press("Enter");
  await expect(entries).toHaveCount(3);
  await expect(entries.nth(2).getByTestId("console-printed")).toHaveText("7\n");

  // A statement that fails says why, in the engine's words, and is not kept.
  await console_.fill("print(nosuch)");
  await console_.press("Enter");
  await expect(entries.nth(3)).toContainText("error");
  await expect(entries.nth(3)).toHaveClass(/failed/);
  await console_.fill("print(b + 1)");
  await console_.press("Enter");
  await expect(entries.nth(4).getByTestId("console-printed")).toHaveText("8\n");
  expect(await scriptText(page)).toBe("let a = 6\n");
});

test("the console recalls what was typed, grows into a drawer, shrinks with Escape, and is emptied", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await write(page, "let a = 6\n");
  const console_ = page.getByRole("textbox", { name: /^Console/ });
  const drawer = page.getByRole("log", { name: "Console output" });
  await expect(drawer).toHaveCount(0);
  // ⌃` puts the keyboard in the console from anywhere.
  await editor(page).focus();
  await page.keyboard.press("Control+Backquote");
  await expect(console_).toBeFocused();
  await page.keyboard.type("print(1)");
  await page.keyboard.press("Enter");
  await page.keyboard.type("print(2)");
  await page.keyboard.press("Enter");
  await expect(drawer.getByTestId("entry")).toHaveCount(2);
  await page.keyboard.type("pri");
  await page.keyboard.press("ArrowUp");
  await expect(console_).toHaveValue("print(2)");
  await page.keyboard.press("ArrowUp");
  await expect(console_).toHaveValue("print(1)");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(console_).toHaveValue("pri");
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  await expect(console_).not.toBeFocused();
  await console_.focus();
  await expect(drawer.getByTestId("entry")).toHaveCount(2);
  // A word to the console itself: one that waits for the alpha, and the one that empties it.
  await console_.fill(":vars");
  await console_.press("Enter");
  await expect(drawer.getByTestId("entry").last()).toContainText("`:vars` comes with the alpha");
  await console_.fill(":clear");
  await console_.press("Enter");
  await expect(drawer).toHaveCount(0);
});

test("the last line says how the output stands to the script, and names the engine", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  const sync = page.getByTestId("sync");
  await expect(sync).toHaveText("not run yet");
  await press(page.getByRole("button", { name: "Run" }));
  await expect(sync).toHaveText("in sync · 1 warning");
  await editor(page).focus();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.type("\nprint(1)");
  await expect(sync).toHaveText("edited · not run · 1 warning");
  await expect(page.getByText("engine Zeff 0.7.0 · in this browser")).toBeVisible();
});

test("every control of the window can be reached from the keyboard", async ({ page, press }) => {
  await scratch(page, press);
  await press(page.getByRole("button", { name: "Panes", exact: true }));
  await press(page.getByRole("button", { name: "Run" }));
  await expect(page.getByRole("status")).toHaveText("done");
  // Every control is one the Tab key stops at, and has a name a screen reader can say.
  const controls = await page
    .locator(
      "button, input:not([hidden]), [role='separator'], [role='switch'], [contenteditable='true']",
    )
    .evaluateAll((nodes) =>
      nodes
        .filter((node) => !(node as HTMLButtonElement).disabled)
        .map((node) => ({
          name: (
            node.getAttribute("aria-label") ??
            node.getAttribute("placeholder") ??
            node.textContent ??
            ""
          ).trim(),
          // The editor is a text the browser lets the Tab key into without being told.
          stops: (node as HTMLElement).tabIndex >= 0 || (node as HTMLElement).isContentEditable,
        })),
    );
  expect(controls.length).toBeGreaterThan(15);
  expect(controls.filter((control) => !control.stops)).toEqual([]);
  expect(controls.filter((control) => control.name === "")).toEqual([]);
  // And ⌘K holds a command for each thing the top bar does.
  await page.keyboard.press("ControlOrMeta+k");
  const names = await page.getByRole("option").allTextContents();
  for (const word of [
    "Run the script",
    "Layout:",
    "Theme:",
    "Code text: larger",
    "Code text: smaller",
    "Projects:",
  ]) {
    expect(
      names.some((name) => name.includes(word)),
      word,
    ).toBe(true);
  }
});
