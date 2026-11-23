// ⌘K and the console line (release 0.1, step 10).
import type { Page } from "@playwright/test";
import { cursorTo, editor, expect, printed, scriptText, test, write, useExample } from "./support";

const READY = "engine Zeff 0.8.0 ready";

async function scratch(page: Page, press: (target: ReturnType<Page["locator"]>) => Promise<void>) {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await press(page.getByRole("button", { name: "Scratch project" }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await useExample(page);
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
  // Each pane of the Script place is opened and closed by a command named for what it does.
  const bar = page.getByRole("toolbar", { name: "Script: its panes and its controls" });
  const left = page.getByRole("complementary", { name: "Script: the left pane" });
  await command(page, "script show project");
  await expect(left.getByRole("region", { name: "Project" })).toBeVisible();
  await command(page, "script show outline");
  await expect(left.getByRole("region", { name: "Outline" })).toBeVisible();
  await command(page, "script hide project");
  await expect(left.getByRole("region", { name: "Project" })).toHaveCount(0);
  await command(page, "script hide outline");
  await expect(left).toHaveCount(0);
  const notes = bar.getByRole("button", { name: "Notes", exact: true });
  await command(page, "script hide notes");
  await expect(notes).toHaveAttribute("aria-pressed", "false");
  await command(page, "script show notes");
  await expect(notes).toHaveAttribute("aria-pressed", "true");

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
  await expect(page.getByRole("status")).toHaveText("done");
  await press(page.getByRole("button", { name: "Unfold all", exact: true }));
  await expect.poll(() => printed(page)).toBe("42\n");
  await command(page, "output clear");
  await expect.poll(() => printed(page)).toBe("");

  // A file is opened from the palette, as it is from the Project pane.
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
  // A word to the console itself: the bindings, as `zeff repl` lists them, and the one that
  // empties it.
  await console_.fill(":vars");
  await console_.press("Enter");
  await expect(drawer.getByTestId("console-printed").last()).toHaveText("a  Int");
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
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(sync).toHaveText("in sync · 1 warning");
  await editor(page).focus();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.type("\nprint(1)");
  await expect(sync).toHaveText("edited · not run · 1 warning");
  await expect(page.getByText("engine Zeff 0.8.0 · in this browser")).toBeVisible();
});

test("every control of the window can be reached from the keyboard", async ({ page, press }) => {
  await scratch(page, press);
  // With the left pane open on Project and Outline, so that its controls and its edge are
  // among those held.
  const bar = page.getByRole("toolbar", { name: "Script: its panes and its controls" });
  await press(bar.getByRole("button", { name: "Project", exact: true }));
  await press(bar.getByRole("button", { name: "Outline", exact: true }));
  await expect(page.getByRole("separator", { name: "The width of the left pane" })).toBeVisible();
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  // Every control is one the Tab key stops at, and has a name a screen reader can say. One
  // kind is the pointer's alone: the words Run to here laid over a statement's line number,
  // one for every statement, whose command the keyboard has in ⌘K.
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
          runTo: node.getAttribute("data-testid") === "run-to-here",
        })),
    );
  expect(controls.length).toBeGreaterThan(15);
  expect(controls.filter((control) => !control.stops && !control.runTo)).toEqual([]);
  expect(controls.filter((control) => control.name === "")).toEqual([]);
  // The edge of the left pane is among them, and moves with the arrow keys (`panes.spec`).
  expect(controls.map((control) => control.name)).toContain("The width of the left pane");
  // And ⌘K holds a command for each thing the top bar does and for each pane's link, and,
  // with the cursor on a statement, for the words over its line number.
  await cursorTo(page, 8);
  await page.keyboard.press("ControlOrMeta+k");
  const names = await page.getByRole("option").allTextContents();
  for (const word of [
    "Run the script",
    "Check the script",
    "Place: Script",
    "Place: Data",
    "Place: Plots",
    "Script: hide Project",
    "Script: hide Outline",
    "Script: hide Notes",
    "Run to here",
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

/** The controls shown, each with its name and whether the Tab key stops at it. */
async function controlsOf(page: Page) {
  return page
    .locator(
      "button, select, input:not([hidden]), [role='separator'], [role='switch'], [contenteditable='true']",
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
          stops: (node as HTMLElement).tabIndex >= 0 || (node as HTMLElement).isContentEditable,
          // An item of a menu is reached from the menu's button with the arrow keys, as the
          // items of a menu are (`files.spec`, "by the keyboard alone"), not with Tab.
          item: node.getAttribute("role") === "menuitem",
          runTo: node.getAttribute("data-testid") === "run-to-here",
        })),
    );
}

test("what release 0.2.2 added is reached from the keyboard: every menu, naming row and question a stop of the Tab key with a name, and a command of ⌘K for what acts on the project open", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  const reached = async (...among: string[]) => {
    const controls = await controlsOf(page);
    expect(controls.filter((one) => !one.stops && !one.item && !one.runTo)).toEqual([]);
    expect(controls.filter((one) => one.name === "")).toEqual([]);
    for (const name of among) {
      expect(
        controls.some((one) => one.name.startsWith(name)),
        name,
      ).toBe(true);
    }
  };
  const names = async () => {
    await page.keyboard.press("ControlOrMeta+k");
    const listed = await page.getByRole("option").allTextContents();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Commands" })).toHaveCount(0);
    return listed;
  };
  const has = (listed: string[], word: string) => listed.some((name) => name.startsWith(word));

  // ⌘K in the Scratch project, its main script shown: what its menus offer, and no more (the
  // Scratch project is not renamed or deleted, nor the main script renamed, moved or deleted).
  const inScratch = await names();
  for (const word of [
    "Project: new script…",
    "Project: new folder…",
    "Project: add files…",
    "Project: export…",
    "Project: duplicate…",
    "Project: reset…",
    "File: save a copy of main.zeff",
    "File: duplicate main.zeff",
  ]) {
    expect(has(inScratch, word), word).toBe(true);
  }
  for (const word of ["Project: rename…", "Project: delete…", "File: rename", "File: move"]) {
    expect(has(inScratch, word), word).toBe(false);
  }
  expect(has(inScratch, "File: delete"), "File: delete").toBe(false);

  // Project: new script… opens the Project pane with the row in which it is named.
  const tree = page
    .getByRole("complementary", { name: "Script: the left pane" })
    .getByRole("region", { name: "Project" });
  await command(page, "project new script");
  const naming = tree.getByLabel("The name of the new script");
  await expect(naming).toBeFocused();
  await reached("The name of the new script", "Create", "Cancel", "Add to the project");
  await page.keyboard.type("wages");
  await page.keyboard.press("Enter");
  await expect(page.locator("header.top")).toContainText("wages.zeff");
  // A script of the reader's own is renamed, moved and deleted from ⌘K too.
  const inOwn = await names();
  for (const word of [
    "File: rename wages.zeff…",
    "File: move wages.zeff…",
    "File: duplicate wages.zeff",
    "File: delete wages.zeff…",
    "File: save a copy of wages.zeff",
  ]) {
    expect(has(inOwn, word), word).toBe(true);
  }
  // Each question, asked from ⌘K, stands in the file's row, with its controls.
  await command(page, "file rename wages");
  await expect(tree.getByLabel("The new name of wages.zeff")).toBeFocused();
  await reached("The new name of wages.zeff");
  await page.keyboard.press("Escape");
  await command(page, "file move wages");
  await expect(tree.getByLabel("The folder to move wages.zeff into")).toBeFocused();
  await reached("The folder to move wages.zeff into");
  await page.keyboard.press("Escape");
  await command(page, "file delete wages");
  const asked = tree.getByRole("group", { name: "Delete wages.zeff?" });
  await expect(asked.getByRole("button", { name: "Keep" })).toBeFocused();
  await reached("Delete", "Keep");
  await page.keyboard.press("Escape");
  await expect(asked).toHaveCount(0);

  // Project: new folder… names a folder at the project's top; and a menu open has its items.
  await command(page, "project new folder");
  await expect(tree.getByLabel("The name of the new folder")).toBeFocused();
  await page.keyboard.type("notes");
  await page.keyboard.press("Enter");
  const more = tree.getByRole("button", { name: "Actions for notes", exact: true });
  await expect(more).toBeVisible();
  await more.focus();
  await page.keyboard.press("Enter");
  const menu = page.getByRole("menu", { name: "Actions for notes", exact: true });
  await expect(menu.getByRole("menuitem").first()).toBeFocused();
  await reached("Actions for notes", "New script", "Rename…", "Save as a zip…");
  await page.keyboard.press("Escape");
  await expect(more).toBeFocused();

  // Project: add files… asks the computer for files and puts them into data.
  const choosing = page.waitForEvent("filechooser");
  await command(page, "project add files");
  await (
    await choosing
  ).setFiles({ name: "pay.csv", mimeType: "text/csv", buffer: Buffer.from("id,pay\n1,10\n") });
  await expect(tree.getByRole("button", { name: "Actions for data/pay.csv" })).toBeVisible();

  // The start screen: each project's row and its menu, and each question asked in the row.
  await command(page, "project duplicate");
  const recent = page.getByRole("region", { name: "Recent projects" });
  const copy = recent.getByLabel("The name of the copy of Scratch");
  await expect(copy).toBeFocused();
  await reached("The name of the copy of Scratch", "Actions for Scratch", "New project…");
  await page.keyboard.type("Wages");
  await page.keyboard.press("Enter");
  await expect(
    recent.getByRole("button", { name: "Actions for Wages", exact: true }),
  ).toBeVisible();
  await recent.getByRole("button", { name: "Actions for Wages", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page
      .getByRole("menu", { name: "Actions for Wages", exact: true })
      .getByRole("menuitem")
      .first(),
  ).toBeFocused();
  await reached("Rename…", "Duplicate…", "Export project…", "Delete…");
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  const going = recent.getByRole("group", { name: "Delete Wages?" });
  await expect(going.getByRole("button", { name: "Keep" })).toBeFocused();
  await reached("Export project… first", "Delete", "Keep");
  await page.keyboard.press("Escape");
  await expect(going).toHaveCount(0);
  // The copy opened has the commands of a project of the reader's own.
  await press(recent.getByRole("button", { name: /^Wages in this browser/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  const inWages = await names();
  for (const word of ["Project: rename…", "Project: duplicate…", "Project: delete…"]) {
    expect(has(inWages, word), word).toBe(true);
  }
  expect(has(inWages, "Project: reset…"), "Project: reset…").toBe(false);
});

test("what release 0.2.3 added is reached from the keyboard: every control of the Help place a stop of the Tab key with a name, and a command of ⌘K for Home, Back, Forward and the search", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  const reached = async (...among: string[]) => {
    const controls = await controlsOf(page);
    expect(controls.filter((one) => !one.stops && !one.item && !one.runTo)).toEqual([]);
    expect(controls.filter((one) => one.name === "")).toEqual([]);
    for (const name of among) {
      expect(
        controls.some((one) => one.name.startsWith(name)),
        name,
      ).toBe(true);
    }
  };
  const names = async () => {
    await page.keyboard.press("ControlOrMeta+k");
    const listed = await page.getByRole("option").allTextContents();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Commands" })).toHaveCount(0);
    return listed;
  };
  const has = (listed: string[], word: string) => listed.some((name) => name.startsWith(word));
  const shown = page.getByTestId("help-page");
  const title = page.getByTestId("help-title");
  const field = page.getByRole("combobox", { name: /^Search Help/ });
  const ask = async (name: string) => {
    await field.fill(name);
    await field.press("Enter");
    await expect(title).toHaveText(name);
  };

  // Before any page of Help was opened there is nowhere back or forward to go.
  const first = await names();
  expect(has(first, "Help: home")).toBe(true);
  expect(has(first, "Help: search")).toBe(true);
  expect(has(first, "Help: back")).toBe(false);
  expect(has(first, "Help: forward")).toBe(false);

  // Help: search, from the script: Help is shown, on Home, with the cursor in its field.
  await command(page, "help search");
  await expect(shown.getByRole("heading", { level: 3 })).toHaveText("Help");
  await expect(field).toBeFocused();
  // Home: the bar, the panels and the packages' links, the Topics pane and On this page.
  await reached(
    "Topics",
    "Home",
    "Search Help",
    "On this page",
    "Packages 10",
    "Errors and warnings 144",
    "Using Zemp Lite 13",
    "regress",
    "Close Topics",
    "Close On this page",
    "Zemp Lite",
  );

  // A function's page: the trail's steps, its neighbours and All topics, its sections.
  await page.keyboard.type("reg");
  await page.keyboard.press("Enter");
  await expect(title).toHaveText("reg");
  await reached("Back", "Packages", "regress", "‹ All topics", "ivreg", "Usage", "Examples");
  // A package's page, the chooser of a name with two functions, and one of the two.
  await command(page, "help search");
  await expect(field).toBeFocused();
  await ask("histogram");
  await reached("histogram · of a plot", "histogram · of a frame");
  await shown.getByRole("button", { name: "histogram · of a frame", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(title).toHaveText("of a frame");
  await reached("histogram", "plot", "Usage");
  // The codes by family, a code, and a page of the app's own.
  await ask("W0201");
  await reached("Errors and warnings", "W0xxx", "W0202", "Meaning");
  await command(page, "help home");
  await shown.getByRole("heading", { name: "Using Zemp Lite" }).getByRole("button").focus();
  await page.keyboard.press("Enter");
  await expect(title).toHaveText("Using Zemp Lite");
  await reached("Getting started", "Keyboard shortcuts");

  // Help: home, Help: back and Help: forward, each saying where it goes, from any place.
  await command(page, "help home");
  await expect(shown.getByRole("heading", { level: 3 })).toHaveText("Help");
  const onHome = await names();
  expect(onHome.find((name) => name.startsWith("Help: back"))).toContain("to Using Zemp Lite");
  expect(has(onHome, "Help: forward")).toBe(false);
  await command(page, "help back");
  await expect(title).toHaveText("Using Zemp Lite");
  const gone = await names();
  expect(gone.find((name) => name.startsWith("Help: forward"))).toContain("to Home");
  expect(gone.find((name) => name.startsWith("Help: back"))).toContain("to Home");
  await command(page, "help forward");
  await expect(shown.getByRole("heading", { level: 3 })).toHaveText("Help");
  // From the Script place the commands show Help and go.
  await command(page, "place script");
  await expect(page.getByTestId("help")).toHaveCount(0);
  await command(page, "help back");
  await expect(page.getByTestId("help")).toBeVisible();
  await expect(title).toHaveText("Using Zemp Lite");
  await command(page, "place script");
  await command(page, "help search");
  await expect(field).toBeFocused();
  await expect(title).toHaveText("Using Zemp Lite");
});
