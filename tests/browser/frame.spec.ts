// The frame of a project (release 0.3.1, step 4; open decision #245, and #33 as amended for
// the side menu alone): one top bar of 38 pixels, with **Projects ▾** and what it lists; and a
// side menu of 52 pixels at the left of every place, its entries icons that say their name,
// what they hold and their key when pointed at and when the keyboard is on them. Every place
// is reached four ways: by its icon, by the keyboard alone, by ⌘1 to ⌘5, and from ⌘K.
import type { Locator, Page } from "@playwright/test";
import { expect, test, useExample } from "./support";

const READY = "engine Zeff 0.9.0 ready";
const PLACES = ["Script", "Data", "Plots", "Paper", "Help"] as const;

type Press = (target: Locator) => Promise<void>;

const side = (page: Page) => page.getByRole("navigation", { name: "Places" });
const top = (page: Page) => page.getByRole("banner");
/** The place shown, by the bar it stands under. */
const shown = (page: Page, place: string) =>
  page.getByRole("toolbar", { name: `${place}: its panes and its controls` });

async function scratch(page: Page, press: Press): Promise<void> {
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await useExample(page);
}

test("the side menu stands at the left of every place, 52 pixels wide, under a top bar of 38", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  const window = page.viewportSize()!;
  const bar = (await top(page).boundingBox())!;
  expect([bar.x, bar.y, bar.width, bar.height]).toEqual([0, 0, window.width, 38]);
  for (const place of PLACES) {
    await press(side(page).getByRole("button", { name: place, exact: true }));
    await expect(shown(page, place)).toBeVisible();
    const menu = (await side(page).boundingBox())!;
    expect([menu.x, menu.width], place).toEqual([0, 52]);
    expect(menu.y, place).toBeGreaterThanOrEqual(38);
    // The place begins where the menu ends, and nothing of it is under the menu.
    expect((await shown(page, place).boundingBox())!.x, place).toBe(52);
    // The one shown is marked, for the eye and for a screen reader, and no other.
    const marked = side(page).locator('[aria-current="page"]');
    await expect(marked).toHaveCount(1);
    await expect(marked).toHaveAccessibleName(place);
    await expect(marked).toHaveClass(/\bon\b/);
  }
  // Its entries, in order: the four places, Help, and All projects at its foot.
  expect(
    await side(page)
      .getByRole("button")
      .evaluateAll((all) => all.map((one) => one.getAttribute("aria-label"))),
  ).toEqual([...PLACES, "All projects"]);
  const last = (await side(page).getByRole("button", { name: "All projects" }).boundingBox())!;
  const menu = (await side(page).boundingBox())!;
  expect(menu.y + menu.height - (last.y + last.height)).toBeLessThan(16);
  // Each is an icon of a size a finger and a pointer can take, with no word drawn in it.
  for (const entry of await side(page).getByRole("button").all()) {
    const box = (await entry.boundingBox())!;
    expect([box.width, box.height]).toEqual([38, 38]);
    await expect(entry.locator("svg")).toHaveAttribute("aria-hidden", "true");
  }
});

test("by the keyboard alone: Tab stops at each entry, which says its name, what it holds and its key; Enter opens it", async ({
  page,
  press,
  browserName,
}) => {
  await scratch(page, press);
  await press(top(page).getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
  const mac = await page.evaluate(() => /Mac|iPhone|iPad/.test(navigator.platform));
  const key = (figure: number) => (mac ? `⌘${figure}` : `Ctrl ${figure}`);
  // What each says under its name, after a run of the example with no paper open.
  const said: Record<string, RegExp> = {
    Script: new RegExp(`^Script\\s*main\\.zeff · ${key(1)}$`),
    Data: new RegExp(`^Data\\s*\\d+ frames? of the run · ${key(2)}$`),
    Plots: new RegExp(`^Plots\\s*\\d+ plots? of the run · ${key(3)}$`),
    Paper: new RegExp(`^Paper\\s*no paper yet · ${key(4)}$`),
    Help: new RegExp(`^Help\\s*functions, messages, Zemp Lite · ${key(5)}$`),
    "All projects": /^All projects\s*back to the projects of this browser$/,
  };
  // No entry's words are drawn until it is pointed at or the keyboard is on it.
  await expect(side(page).getByRole("tooltip")).toHaveCount(0);
  // From the top bar's last control the Tab key comes to the menu's first entry.
  await top(page).getByRole("button", { name: "Run", exact: true }).focus();
  for (const name of [...PLACES, "All projects"]) {
    const entry = side(page).getByRole("button", { name, exact: true });
    for (
      let pressed = 0;
      pressed < 4 && !(await entry.evaluate((one) => one === document.activeElement));
      pressed += 1
    ) {
      await page.keyboard.press(tab);
    }
    await expect(entry, name).toBeFocused();
    // Its words are drawn beside it, to the right of the menu, and are its description.
    const tip = entry.getByRole("tooltip");
    await expect(tip, name).toBeVisible();
    expect((await tip.innerText()).replace(/\s+/g, " ").trim(), name).toMatch(said[name]!);
    await expect(entry).toHaveAttribute("aria-describedby", (await tip.getAttribute("id"))!);
    expect((await tip.boundingBox())!.x, name).toBeGreaterThanOrEqual(46);
    // One at a time: no other entry's words are drawn.
    await expect(side(page).getByRole("tooltip")).toHaveCount(1);
  }
  // Enter on an entry opens its place; the focus stays where the keyboard was.
  for (const place of ["Plots", "Help", "Script"]) {
    const entry = side(page).getByRole("button", { name: place, exact: true });
    await entry.focus();
    await page.keyboard.press("Enter");
    await expect(shown(page, place)).toBeVisible();
    await expect(entry).toHaveAttribute("aria-current", "page");
  }
});

test("⌘1 to ⌘5 open the places, from the script, from a field and from another place; and so does ⌘K", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  // From the script, where the cursor is.
  await page.locator(".cm-content").first().focus();
  for (const [figure, place] of [
    [3, "Plots"],
    [2, "Data"],
    [4, "Paper"],
    [5, "Help"],
    [1, "Script"],
  ] as const) {
    await page.keyboard.press(`ControlOrMeta+${figure}`);
    await expect(shown(page, place), place).toBeVisible();
    await expect(side(page).locator('[aria-current="page"]')).toHaveAccessibleName(place);
    await expect(side(page).getByRole("button", { name: place, exact: true })).toHaveAttribute(
      "aria-keyshortcuts",
      `Meta+${figure} Control+${figure}`,
    );
  }
  // Nothing of the figure is typed into the script.
  await expect(page.locator(".cm-content").first()).not.toContainText("32451");
  // From a field: the console's line, and the field of Help's search.
  await page.keyboard.press("Control+`");
  await page.keyboard.type("1 + 1");
  await page.keyboard.press("ControlOrMeta+5");
  await expect(shown(page, "Help")).toBeVisible();
  await shown(page, "Help").getByRole("combobox").focus();
  await page.keyboard.press("ControlOrMeta+2");
  await expect(shown(page, "Data")).toBeVisible();
  // With the commands open, the key closes them and opens its place.
  await page.keyboard.press("ControlOrMeta+k");
  await expect(page.getByRole("dialog", { name: "Commands" })).toBeVisible();
  await page.keyboard.press("ControlOrMeta+3");
  await expect(page.getByRole("dialog", { name: "Commands" })).toHaveCount(0);
  await expect(shown(page, "Plots")).toBeVisible();
  // A figure with another key held, and a figure past the fifth, open nothing.
  await page.keyboard.press("ControlOrMeta+Shift+1");
  await page.keyboard.press("ControlOrMeta+6");
  await expect(shown(page, "Plots")).toBeVisible();
  // From ⌘K: each place is a command, which names its key.
  for (const place of PLACES) {
    await page.keyboard.press("ControlOrMeta+k");
    const commands = page.getByRole("dialog", { name: "Commands" });
    await commands.getByRole("combobox").fill(`place: ${place}`);
    const first = commands.getByRole("option").first();
    await expect(first).toContainText(`Place: ${place}`);
    await expect(first).toContainText(/(⌘|Ctrl )[1-5]$/);
    await page.keyboard.press("Enter");
    await expect(shown(page, place), place).toBeVisible();
  }
});

test("Projects ▾ lists what is done with the project as a whole, and each entry does it", async ({
  page,
  press,
}) => {
  await page.goto("/");
  await press(page.getByRole("button", { name: /^New project/ }));
  await page.getByLabel("The name of the new project").fill("Frame");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toHaveText(READY);
  const projects = top(page).getByRole("button", { name: "Projects ▾" });
  const list = page.getByRole("menu", { name: "Projects" });
  await expect(projects).toHaveAttribute("aria-haspopup", "menu");
  await press(projects);
  await expect(list.getByRole("menuitem")).toHaveText([
    "All projects",
    "Export project…",
    "Rename project…",
    "Report a problem…",
  ]);
  // By the keyboard: the arrows move, Escape closes it and gives the focus back.
  await expect(list.getByRole("menuitem").first()).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(list.getByRole("menuitem", { name: "Export project…" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(list).toHaveCount(0);
  await expect(projects).toBeFocused();
  // Export project…: the project's zip is saved.
  await page.keyboard.press("Enter");
  const saving = page.waitForEvent("download");
  await press(list.getByRole("menuitem", { name: "Export project…" }));
  expect((await saving).suggestedFilename()).toBe("Frame.zip");
  // Report a problem…: the window of the report.
  await press(projects);
  await press(list.getByRole("menuitem", { name: "Report a problem…" }));
  const report = page.getByRole("dialog", { name: "Report a problem" });
  await expect(report).toBeVisible();
  // Closed at once, while the engine may still be building the report: it stays closed.
  await page.keyboard.press("Escape");
  await expect(report).toHaveCount(0);
  await page.waitForTimeout(600);
  await expect(report).toHaveCount(0);
  // Rename project…: asked on the screen of projects, in the project's own row.
  await press(projects);
  await press(list.getByRole("menuitem", { name: "Rename project…" }));
  await expect(page.getByLabel("The new name of Frame")).toBeVisible();
  await page.keyboard.press("Escape");
  // All projects: back to the list; and the side menu's entry of that name does the same.
  await press(
    page
      .getByRole("region", { name: "Recent projects" })
      .getByRole("button", { name: /^Frame/ })
      .first(),
  );
  await expect(page.getByRole("status")).toHaveText(READY);
  await press(projects);
  await press(list.getByRole("menuitem", { name: "All projects" }));
  await expect(page.getByRole("button", { name: /^Scratch project/ })).toBeVisible();
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  // The Scratch project has no name of its own to change: its list has no Rename.
  await press(projects);
  await expect(list.getByRole("menuitem")).toHaveText([
    "All projects",
    "Export project…",
    "Report a problem…",
  ]);
  await page.keyboard.press("Escape");
  await press(side(page).getByRole("button", { name: "All projects" }));
  await expect(page.getByRole("button", { name: /^Scratch project/ })).toBeVisible();
});

test("an entry pointed at says its words, and one just pressed keeps them to itself until the pointer leaves", async ({
  page,
  press,
  mouseWorks,
}) => {
  test.skip(!mouseWorks, "this test browser does not deliver the mouse where it is aimed");
  await scratch(page, press);
  const data = side(page).getByRole("button", { name: "Data", exact: true });
  await data.hover();
  await expect(data.getByRole("tooltip")).toBeVisible();
  await expect(data.getByRole("tooltip")).toContainText("the frames of a run");
  await data.click();
  await expect(shown(page, "Data")).toBeVisible();
  // The words would stand over the place just opened.
  await expect(data.getByRole("tooltip")).toBeHidden();
  await page.mouse.move(600, 400);
  await data.hover();
  await expect(data.getByRole("tooltip")).toBeVisible();
});
