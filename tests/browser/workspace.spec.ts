// The shell of the workspace (open decisions #146 and #203): the top bar, the files of the
// project in the Project pane at the script's left, a file of the project shown in the Script
// place, the size of code text, and the theme.
import type { Page } from "@playwright/test";
import { editor, expect, faintText, scriptText, smallestText, test, useExample } from "./support";

const READY = "engine Zeff 0.9.0 ready";

type Press = (target: ReturnType<Page["locator"]>) => Promise<void>;

async function scratch(page: Page, press: Press) {
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await useExample(page);
}

const bar = (page: Page) =>
  page.getByRole("toolbar", { name: "Script: its panes and its controls" });
const leftPane = (page: Page) => page.getByRole("complementary", { name: "Script: the left pane" });

/** Open the Project pane at the script's left, and give the tree of the project's files. */
async function project(page: Page, press: Press) {
  await press(bar(page).getByRole("button", { name: "Project", exact: true }));
  const tree = leftPane(page).getByRole("region", { name: "Project" });
  await expect(tree).toBeVisible();
  return tree;
}

test("the top bar carries its controls in order, Run the one filled, and the side menu marks Script as the place shown", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  const top = page.locator("header.top");
  await expect(top).toContainText("Projects ▾");
  await expect(top.getByRole("heading", { level: 1 })).toHaveText("Scratch");
  await expect(top).toContainText("/ main.zeff · saved");
  const names = await top
    .getByRole("button")
    .evaluateAll((buttons) =>
      buttons.map((button) =>
        (button.getAttribute("aria-label") ?? button.textContent ?? "").trim(),
      ),
    );
  // One bar of 38 pixels (open decision #245); the places are not in it: they are the side menu.
  expect(names).toEqual([
    "Projects ▾",
    "Commands",
    "Smaller code text",
    "Larger code text",
    "Check",
    "Run",
  ]);
  expect((await top.boundingBox())!.height).toBe(38);
  await expect(top.getByRole("switch", { name: "Dark" })).toBeVisible();
  await expect(top.getByRole("button", { name: "Check" })).toBeEnabled();
  // Of the five places, the script's is the one shown, and the only one marked.
  const places = page.getByRole("navigation", { name: "Places" });
  await expect(top.getByRole("navigation")).toHaveCount(0);
  await expect(places.getByRole("button", { name: "Script" })).toHaveClass(/\bon\b/);
  await expect(places.locator("button.on")).toHaveCount(1);
  // Run is filled with the logo's cobalt (open decision #244); the others are outlined words.
  const run = top.getByRole("button", { name: "Run", exact: true });
  expect(await run.evaluate((button) => getComputedStyle(button).backgroundColor)).toBe(
    "rgb(36, 72, 168)",
  );
});

test("the Project pane lists the files with their sizes, and a folder folds away and comes back", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  const tree = await project(page, press);
  await expect(tree.getByRole("listitem").filter({ hasText: "main.zeff" }).last()).toContainText(
    "B",
  );
  await expect(tree.getByRole("listitem").filter({ hasText: "zeff.toml" })).toBeVisible();
  // A folder folds away and comes back.
  const scripts = tree.getByRole("button", { name: "scripts", exact: true });
  await expect(scripts).toHaveAttribute("aria-expanded", "true");
  await press(scripts);
  await expect(scripts).toHaveAttribute("aria-expanded", "false");
  await expect(tree.getByRole("button", { name: /^main\.zeff/ })).toHaveCount(0);
  await press(scripts);
  await expect(tree.getByRole("button", { name: /^main\.zeff/ })).toBeVisible();
  // The pane stands at the script's left, and the script reaches the window's right edge:
  // nothing stands at its right.
  const pane = (await leftPane(page).boundingBox())!;
  const script = (await page
    .getByRole("region", { name: "Script with its notes and output" })
    .boundingBox())!;
  // (At the pane's own left is the side menu, 52 pixels wide.)
  expect(pane.x).toBe(52);
  expect(script.x).toBeGreaterThanOrEqual(pane.x + pane.width);
  expect(script.x + script.width).toBe(page.viewportSize()!.width);
});

test("the left pane is resized by dragging its edge", async ({ page, press, mouseWorks }) => {
  test.skip(!mouseWorks, "this test browser does not deliver the mouse where it is aimed");
  await scratch(page, press);
  await project(page, press);
  const edge = page.getByRole("separator", { name: "The width of the left pane" });
  await expect(edge).toHaveAttribute("aria-valuenow", "268");
  const box = (await edge.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 200);
  await page.mouse.down();
  // The pane begins beside the side menu, 52 pixels in.
  await page.mouse.move(52 + 400, box.y + 200, { steps: 4 });
  await page.mouse.up();
  await expect(edge).toHaveAttribute("aria-valuenow", "400");
  expect(Math.round((await leftPane(page).boundingBox())!.width)).toBe(400);
});

test("a file opened from the Project pane or from ⌘K is shown in the Script place, named in the top bar and marked in the tree", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  const tree = await project(page, press);
  const top = page.locator("header.top");
  const main = tree.getByRole("button", { name: /^main\.zeff/ });
  const toml = tree.getByRole("button", { name: /^zeff\.toml/ });
  await expect(main).toHaveClass(/\bon\b/);
  await press(toml);
  await expect.poll(() => scriptText(page)).toMatch(/^\[project\]\nname = "Scratch"/);
  await expect(top).toContainText("/ zeff.toml · saved");
  await expect(toml).toHaveClass(/\bon\b/);
  await expect(main).not.toHaveClass(/\bon\b/);
  // One file is shown at a time: the script comes back in its place, here from ⌘K.
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByRole("combobox", { name: "Type a command" }).fill("open file main.zeff");
  await page.keyboard.press("Enter");
  await expect.poll(() => scriptText(page)).toMatch(/^\/\/ A first look at the wages/);
  await expect(top).toContainText("/ main.zeff · saved");
  await expect(main).toHaveClass(/\bon\b/);
  await expect(toml).not.toHaveClass(/\bon\b/);
  await expect(page.getByRole("textbox", { name: "The script", exact: true })).toHaveCount(1);
});

test("Output: clear, from ⌘K, takes the run's outputs and its notes off the page", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await expect(page.locator(".cm-zemp-output").first()).toContainText("summary · by female");
  await expect(page.getByTestId("note").first()).toBeVisible();
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByRole("combobox", { name: "Type a command" }).fill("output clear");
  await page.keyboard.press("Enter");
  await expect(page.locator(".cm-zemp-output")).toHaveCount(0);
  await expect(page.getByTestId("note")).toHaveCount(0);
  await expect(page.getByTestId("run-facts")).toHaveText("not run yet");
});

test("the Dark switch of the top bar switches the theme", async ({ page, press }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await scratch(page, press);
  const dark = page.getByRole("switch", { name: "Dark" });
  await expect(dark).toHaveAttribute("aria-checked", "false");
  await press(dark);
  await expect(dark).toHaveAttribute("aria-checked", "true");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
    "rgb(13, 14, 18)",
  );
});

test("the code size control changes the code and its output together, and is remembered", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  const size = (target: ReturnType<Page["locator"]>) =>
    target.evaluate((node) => getComputedStyle(node).fontSize);
  const script = editor(page);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  const output = page.getByTestId("printed").first();
  expect(await size(script)).toBe("14px");
  expect(await size(output)).toBe("13px");
  await press(page.getByRole("button", { name: "Larger code text" }));
  await press(page.getByRole("button", { name: "Larger code text" }));
  await press(page.getByRole("button", { name: "Larger code text" }));
  await expect(page.getByRole("group", { name: "Code text size" })).toContainText("18");
  expect(await size(script)).toBe("18px");
  expect(await size(output)).toBe("17px");
  // The size is the user's, not the project's: it is there again on a later visit.
  await scratch(page, press);
  await expect(page.getByRole("group", { name: "Code text size" })).toContainText("18");
  expect(await size(editor(page))).toBe("18px");
  for (let press_ = 0; press_ < 8; press_++) {
    const smaller = page.getByRole("button", { name: "Smaller code text" });
    if (await smaller.isDisabled()) break;
    await press(smaller);
  }
  await expect(page.getByRole("group", { name: "Code text size" })).toContainText("12");
  await expect(page.getByRole("button", { name: "Smaller code text" })).toBeDisabled();
});

// Until release 0.3.1 a test here held the line a window narrower than 1,200 pixels was shown
// (open decision #33). From 1,024 pixels the layout is now the computer's with nothing said,
// and below 1,000 a page says that Zemp Lite is made for a computer (#243): `computer.spec.ts`.

test("app screens are set at 13.5 pixels and never below 12.5", async ({ page, press }) => {
  await scratch(page, press);
  // With the left pane open on Project and Outline, and a run's notes and outputs on the page.
  await project(page, press);
  await press(bar(page).getByRole("button", { name: "Outline", exact: true }));
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await expect(page.locator(".cm-zemp-output").first()).toBeVisible();
  expect(await page.evaluate(() => getComputedStyle(document.body).fontSize)).toBe("13.5px");
  expect(await smallestText(page)).toBeGreaterThanOrEqual(12.5);
});

for (const theme of ["light", "dark"] as const) {
  test(`the menus, the naming rows and the questions of the Project pane and of the start screen are set no smaller than 12.5 pixels and no fainter than 4.5 to 1, in the ${theme} theme`, async ({
    page,
    press,
  }) => {
    await page.emulateMedia({ colorScheme: theme });
    await scratch(page, press);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const tree = await project(page, press);
    const sound = async (within: ReturnType<Page["locator"]>) => {
      await expect(within).toBeVisible();
      expect(await smallestText(page)).toBeGreaterThanOrEqual(12.5);
      expect(await faintText(within)).toEqual([]);
    };
    // The pane's own menu, and the row in which a new script is named, with a name refused.
    await press(tree.getByRole("button", { name: "Add to the project" }));
    await sound(page.getByRole("menu", { name: "Add to the project" }));
    await press(page.getByRole("menuitem", { name: "New script" }));
    await page.getByLabel("The name of the new script").fill("main");
    await page.keyboard.press("Enter");
    await expect(tree.getByRole("alert")).toBeVisible();
    await sound(tree);
    await page.keyboard.press("Escape");
    // A file's menu, a copy made, and the copy renamed, moved and deleted: each question.
    const more = (path: string) =>
      tree.getByRole("button", { name: `Actions for ${path}`, exact: true });
    const item = (path: string, name: string) =>
      page
        .getByRole("menu", { name: `Actions for ${path}`, exact: true })
        .getByRole("menuitem", { name, exact: true });
    await press(more("scripts/main.zeff"));
    await sound(page.getByRole("menu", { name: "Actions for scripts/main.zeff", exact: true }));
    await press(item("scripts/main.zeff", "Duplicate"));
    const copy = "scripts/main copy.zeff";
    for (const [asks, shown] of [
      ["Rename…", tree.getByLabel("The new name of main copy.zeff")],
      ["Move to…", tree.getByLabel("The folder to move main copy.zeff into")],
      ["Delete…", tree.getByRole("group", { name: "Delete main copy.zeff?" })],
    ] as const) {
      await press(more(copy));
      await press(item(copy, asks));
      await expect(shown).toBeVisible();
      await sound(tree);
      await page.keyboard.press("Escape");
      await expect(shown).toHaveCount(0);
    }
    // The start screen: a project's menu, its name being changed, and its deletion asked.
    await press(page.getByRole("button", { name: "All projects" }));
    await press(page.getByRole("button", { name: "New project…" }));
    await page.getByLabel("The name of the new project").fill("Wages");
    await press(page.getByRole("button", { name: "Create" }));
    await expect(page.getByRole("status")).toHaveText(READY);
    await press(page.getByRole("button", { name: "All projects" }));
    const recent = page.getByRole("region", { name: "Recent projects" });
    await sound(page.getByRole("region", { name: "Start" }));
    for (const [asks, shown] of [
      ["Rename…", recent.getByLabel("The new name of Wages")],
      ["Duplicate…", recent.getByLabel("The name of the copy of Wages")],
      ["Delete…", recent.getByRole("group", { name: "Delete Wages?" })],
    ] as const) {
      await press(recent.getByRole("button", { name: "Actions for Wages", exact: true }));
      const menu = page.getByRole("menu", { name: "Actions for Wages", exact: true });
      await sound(menu);
      await press(menu.getByRole("menuitem", { name: asks, exact: true }));
      await expect(shown).toBeVisible();
      await sound(recent);
      await page.keyboard.press("Escape");
      await expect(shown).toHaveCount(0);
    }
    await press(recent.getByRole("button", { name: "Actions for Scratch", exact: true }));
    await press(page.getByRole("menuitem", { name: "Reset…", exact: true }));
    await sound(recent);
  });
}

test("a project is closed and another opened, each with an engine of its own", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  for (let round = 0; round < 3; round++) {
    // Closing a project ends its worker; the next project starts a new one.
    await press(page.getByRole("button", { name: "All projects" }));
    await expect(page.getByText("No project open")).toBeVisible();
    await press(page.getByRole("button", { name: /^Scratch project/ }));
    await expect(page.getByRole("status")).toHaveText(READY);
  }
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
});
