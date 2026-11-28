// The projects screen redrawn (release 0.3.1, step 12b; open decision #245, as completed on 28
// November 2026; it was the screen of #220, item 4, until then). At the left a column of what
// can be done: **Scratch project**, filled, **New project…**, **Open project…** and **Open
// folder…**, which waits for the desktop app; at its foot the note on where the work is kept,
// the space the browser says the site uses, and **Export all projects…**. At its right the
// projects of this browser as a table, the one opened last first: each with its scripts, how
// its last run went, its size, when it was opened and exported, and **Open**, **Export…** and
// ⋯ at its end. A field over the table keeps the rows whose name or script holds what is
// typed. Under it three cards lead to a first analysis and into Help. A first visit's table
// has the Scratch project alone, not yet made. The watermark stands faint behind.
import type { Download, Page } from "@playwright/test";
import {
  expect,
  faintText,
  projectButton,
  projectCells,
  projectsOf,
  smallestText,
  test,
  write,
} from "./support";

const READY = "engine Zeff 0.9.0 ready";
type Press = (target: ReturnType<Page["locator"]>) => Promise<void>;

const start = (page: Page) => page.getByRole("region", { name: "Start" });
/** The rows of the projects, without a question asked under one. */
const rows = (page: Page) => projectsOf(page).locator("tbody tr.project");
const count = (page: Page) => page.getByTestId("project-count");
const find = (page: Page) => projectsOf(page).getByRole("searchbox", { name: "Find a project" });
const all = (page: Page) => page.getByRole("button", { name: "All projects" });
const said = (page: Page) => projectsOf(page).getByRole("status");
const cells = projectCells;

/** Make a project by its entry and come back to the projects screen. */
async function made(page: Page, press: Press, name: string, script?: string): Promise<void> {
  await press(page.getByRole("button", { name: "New project…" }));
  await page.getByLabel("The name of the new project").fill(name);
  await press(page.getByRole("button", { name: "Create" }));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  if (script !== undefined) {
    await expect(page.getByRole("status")).toHaveText(READY);
    await write(page, script);
    await press(page.getByRole("button", { name: "Run", exact: true }));
    await expect(page.getByRole("status")).toHaveText(/^(done|ended with exit code \d+)$/);
  }
  await press(all(page));
  await expect(page.getByRole("button", { name: "New project…" })).toBeVisible();
  // The table is drawn once the list has been read from the browser's storage, a moment
  // after the column at its left; a test that goes on at once, on a slow machine, would meet
  // the screen without its rows.
  await expect(page.getByRole("button", { name: `Actions for ${name}` })).toBeVisible();
}

test("the screen: the name in the bar, a column of what can be done, and the projects at its right", async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  // The one heading of the first rank is the name, in the bar.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Zemp Lite");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByTestId("alpha")).toHaveText("alpha");
  await expect(
    page.getByText("Something wrong? In a project, ⌘K → Report a problem"),
  ).toBeVisible();

  // The column: its heading, and four entries one under another.
  await expect(start(page).getByRole("heading", { level: 2 })).toHaveText("Start");
  const entries = start(page).locator(".act");
  await expect(entries).toHaveText([
    /^\s*Scratch project\s*Two worked examples, ready to run\s*$/,
    /^\s*New project…\s*An empty project with a first script\s*$/,
    /^\s*Open project…\s*A project's zip: one that Export project… wrote, or a folder zipped\s*$/,
    /^\s*Open folder…\s*desktop app\s*A project folder on this computer\s*$/,
  ]);
  await expect(entries.nth(3)).toBeDisabled();
  await expect(page.getByRole("button", { name: "Open project…" })).toBeEnabled();
  const boxes = await entries.evaluateAll((every) =>
    every.map((one) => {
      const box = one.getBoundingClientRect();
      return { left: Math.round(box.left), top: Math.round(box.top) };
    }),
  );
  expect(new Set(boxes.map((box) => box.left)).size).toBe(1);
  expect(boxes.map((box) => box.top)).toEqual(
    [...boxes.map((box) => box.top)].sort((a, b) => a - b),
  );
  // The Scratch project is the one filled entry: in the accent, its words in the button's ink.
  const painted = await page.evaluate(() => {
    const of = (query: string) =>
      getComputedStyle(document.querySelector(query) as HTMLElement).backgroundColor;
    const probe = document.createElement("i");
    probe.style.background = "var(--button)";
    document.body.append(probe);
    const button = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return { first: of(".act.primary"), second: of(".act:not(.primary)"), button };
  });
  expect(painted.first).toBe(painted.button);
  expect(painted.second).toBe("rgba(0, 0, 0, 0)");

  // The projects are at the column's right, under their heading, with the field at its end.
  await expect(projectsOf(page).getByRole("heading", { level: 2 })).toHaveText("Your projects");
  await expect(find(page)).toHaveAttribute("placeholder", "Find a project");
  await expect(projectsOf(page).getByRole("columnheader")).toHaveText([
    "Project",
    "Scripts",
    "Last run",
    "Size",
    "Opened",
    "Exported",
    "What can be done",
  ]);
  const sides = await page.evaluate(() => {
    const box = (query: string) =>
      (document.querySelector(query) as HTMLElement).getBoundingClientRect();
    const [side, main] = [
      box('section[aria-label="Start"]'),
      box('section[aria-label="Your projects"]'),
    ];
    return {
      beside: main.left >= side.right - 1,
      level: Math.abs(main.top - side.top) <= 1,
      side: side.width,
    };
  });
  expect(sides).toEqual({ beside: true, level: true, side: 260 });

  // The note at the column's foot, with what exports every project.
  const note = page.getByTestId("kept");
  // (The WebKit these tests drive gives a page no private storage, and the note says that.)
  if (browserName === "webkit") {
    await expect(note).toContainText(
      "Not kept. This browser gives a page no private storage, so a project lasts only until this tab is closed; export the ones you keep.",
    );
  } else {
    await expect(note).toContainText("Kept in this browser.");
    await expect(note).toContainText("Clearing the site's data removes the projects");
    await expect(note).toContainText("export the ones you keep.");
  }
  const everything = note.getByRole("button", { name: "Export all projects…" });
  await expect(everything).toBeDisabled();
  const foot = await page.evaluate(() => {
    const box = (query: string) =>
      (document.querySelector(query) as HTMLElement).getBoundingClientRect();
    return {
      note: box('[data-testid="kept"]').bottom,
      side: box('section[aria-label="Start"]').bottom,
    };
  });
  expect(foot.side - foot.note).toBeLessThan(24);
  // The watermark stands behind, at half the strength it had.
  const mark = page.locator(".watermark");
  await expect(mark).toHaveClass(/faint/);
  expect(await mark.evaluate((node) => getComputedStyle(node).opacity)).toBe("0.08");
  // What the screen was is nowhere on it.
  for (const old of [
    "Open a project's zip…",
    "Recent",
    "Taking a project out.",
    "No project yet",
  ]) {
    await expect(page.getByText(old, { exact: true })).toHaveCount(0);
  }
});

test("a first visit's table has the Scratch project alone, not yet made, and its row opens it", async ({
  page,
  press,
}) => {
  await page.goto("/");
  await expect(count(page)).toHaveText(
    "None yet. Start with the Scratch project: press its row to open it.",
  );
  const first = page.getByTestId("first-visit");
  await expect(rows(page)).toHaveCount(1);
  await expect(first.getByRole("rowheader")).toHaveText(
    /^\s*Scratch\s*Two worked examples, ready to run\s*$/,
  );
  await expect(first.locator("td")).toHaveText([
    "",
    "not run",
    "",
    "not opened yet",
    "never",
    /^\s*Open\s*Scratch\s*$/,
  ]);
  // It is not made yet: nothing to export, to rename or to delete.
  await expect(first.getByRole("button")).toHaveCount(2);
  await expect(projectsOf(page).getByRole("button", { name: /^Actions for/ })).toHaveCount(0);
  await press(first.getByRole("button", { name: "Open Scratch" }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await press(all(page));
  // Made: its own row, with what it holds.
  await expect(count(page)).toHaveText("1 project. Press its row to open it.");
  await expect(first).toHaveCount(0);
  await expect(rows(page)).toHaveCount(1);
  await expect(projectButton(page, "Scratch")).toHaveText(
    /^\s*Scratch\s*instruments\.zeff, main\.zeff, plots\.zeff\s*$/,
  );
  await expect(cells(page, "Scratch")).toHaveText([
    "3",
    "not run",
    /^\d+(\.\d)? (bytes|kB|MB)$/,
    /^today, \d{1,2}:\d\d$/,
    "never",
    /^\s*Open\s*Scratch\s*Export…\s*Scratch\s*⋯\s*$/,
  ]);
});

test("a visitor with a project is never shown the row of a first visit, not for the moment the list takes to be read", async ({
  page,
  press,
}) => {
  await page.goto("/");
  await press(page.getByRole("button", { name: "New project…" }));
  await page.getByLabel("The name of the new project").fill("Wages");
  await press(page.getByRole("button", { name: "Create" }));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Wages");
  // From here, every change of the page is looked at for the row and for its words.
  await page.evaluate(() => {
    const seen = window as unknown as { firstVisit: boolean };
    seen.firstVisit = false;
    new MutationObserver(() => {
      if (
        document.querySelector('[data-testid="first-visit"]') !== null ||
        document.body.textContent.includes("None yet.")
      ) {
        seen.firstVisit = true;
      }
    }).observe(document, { subtree: true, childList: true, characterData: true });
  });
  await press(all(page));
  await expect(rows(page)).toHaveCount(1);
  expect(await page.evaluate(() => (window as unknown as { firstVisit: boolean }).firstVisit)).toBe(
    false,
  );
  await expect(page.getByTestId("first-visit")).toHaveCount(0);
  await expect(count(page)).toHaveText("1 project. Press its row to open it.");
});

test("the table lists the projects, the last opened first, each with its scripts, its last run, its size and when it was opened and exported", async ({
  page,
  press,
  mouseWorks,
}) => {
  test.slow();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await made(page, press, "One");
  await made(page, press, "Two", 'print(1)\nlet w = import("data/none.csv")\n');
  await made(page, press, "Three", "print(1)\n");
  await expect(rows(page)).toHaveCount(3);
  await expect(count(page)).toHaveText(
    "3 projects, the last opened first. Press a row to open it.",
  );
  await expect(projectsOf(page).getByRole("rowheader")).toHaveText([
    /^\s*Three\s*main\.zeff\s*$/,
    /^\s*Two\s*main\.zeff\s*$/,
    /^\s*One\s*main\.zeff\s*$/,
  ]);
  // How each last ran, as this browser saw it.
  const size = /^\d+(\.\d)? (bytes|kB|MB)$/;
  const today = /^today, \d{1,2}:\d\d$/;
  await expect(cells(page, "Three")).toHaveText(["1", "clean", size, today, "never", /Open/]);
  await expect(cells(page, "Two")).toHaveText(["1", "1 error", size, today, "never", /Open/]);
  await expect(cells(page, "One")).toHaveText(["1", "not run", size, today, "never", /Open/]);
  // The count of scripts and the size are set to the right, under their headings.
  const set = await cells(page, "One").evaluateAll((every) =>
    every.map((one) => getComputedStyle(one).textAlign),
  );
  expect([set[0], set[2]]).toEqual(["right", "right"]);

  // Export… on a row saves the project without opening it, and the row says when.
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    press(projectsOf(page).getByRole("button", { name: "Export… One", exact: true })),
  ]);
  expect(download.suggestedFilename()).toBe("One.zip");
  await expect(said(page)).toHaveText("One exported as One.zip");
  await expect(cells(page, "One").nth(4)).toHaveText(today);
  await expect(cells(page, "Two").nth(4)).toHaveText("never");
  await expect(page.getByRole("button", { name: "New project…" })).toBeVisible();

  // A row's menu is as it was, and what it asks is asked under the row, in the table.
  await press(projectsOf(page).getByRole("button", { name: "Actions for Three", exact: true }));
  const menu = page.getByRole("menu", { name: "Actions for Three", exact: true });
  await expect(menu.getByRole("menuitem")).toHaveText([
    "Rename…",
    "Duplicate…",
    "Export project…",
    "Delete…",
  ]);
  await press(menu.getByRole("menuitem", { name: "Delete…" }));
  const asked = projectsOf(page).getByRole("group", { name: "Delete Three?" });
  await expect(asked).toBeVisible();
  const under = await page.evaluate(() => {
    const table = document.querySelector('section[aria-label="Your projects"] tbody')!;
    const lines = [...table.querySelectorAll("tr")];
    return lines.map((line) => line.className.split(" ")[0]);
  });
  expect(under).toEqual(["project", "asked", "project", "project"]);
  await press(asked.getByRole("button", { name: "Keep" }));
  await expect(asked).toHaveCount(0);

  // A project is opened by its name, by Open, and by a press anywhere on its row.
  await press(projectButton(page, "Three"));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Three");
  await press(all(page));
  await projectsOf(page).getByRole("button", { name: "Open Two", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Two");
  await press(all(page));
  // The last opened is first again.
  await expect(projectsOf(page).getByRole("rowheader").first()).toContainText("Two");
  if (mouseWorks) {
    await cells(page, "One").nth(3).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("One");
    await press(all(page));
    // A press on a control of the row is the control's alone: the menu opens, the project stays shut.
    await projectsOf(page).getByRole("button", { name: "Actions for One", exact: true }).click();
    await expect(page.getByRole("menu", { name: "Actions for One" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "New project…" })).toBeVisible();
  }
});

test("the field over the table keeps the rows whose name or script holds what is typed", async ({
  page,
  press,
}) => {
  await page.goto("/");
  await made(page, press, "Wages");
  await made(page, press, "Engagement survey");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await press(all(page));
  await expect(rows(page)).toHaveCount(3);
  const names = () => projectsOf(page).getByRole("rowheader").locator("b").allTextContents();
  // By a name, whatever the capitals; the order of the list is kept.
  await find(page).fill("WAG");
  await expect(rows(page)).toHaveCount(1);
  expect(await names()).toEqual(["Wages"]);
  await find(page).fill("s");
  expect(await names()).toEqual(["Scratch", "Engagement survey", "Wages"]);
  // By a script's name: the Scratch project alone has `plots.zeff`.
  await find(page).fill("plots");
  expect(await names()).toEqual(["Scratch"]);
  await find(page).fill("main");
  await expect(rows(page)).toHaveCount(3);
  // Nothing found is a sentence in the table's place, and the count is of all the projects.
  await find(page).fill("zzz");
  await expect(rows(page)).toHaveCount(0);
  await expect(page.getByTestId("none-found")).toHaveText(
    "No project is called “zzz”, and none has a script of that name.",
  );
  await expect(count(page)).toHaveText(
    "3 projects, the last opened first. Press a row to open it.",
  );
  // The field emptied, by the keyboard: every row again.
  await find(page).focus();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Backspace");
  await expect(rows(page)).toHaveCount(3);
  await expect(page.getByTestId("none-found")).toHaveCount(0);
  // A row found is opened from the keyboard.
  await find(page).fill("wages");
  await projectButton(page, "Wages").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Wages");
});

test("Export all projects… saves every project as a zip of its own, whatever the field keeps", async ({
  page,
  press,
}) => {
  await page.goto("/");
  await made(page, press, "Wages");
  await made(page, press, "Survey");
  const everything = page.getByTestId("kept").getByRole("button", { name: "Export all projects…" });
  await expect(everything).toBeEnabled();
  await expect(everything).toHaveAttribute(
    "title",
    "Save every project of this browser to this computer, each as a zip of its own",
  );
  // The field keeps one row; all are exported all the same.
  await find(page).fill("wag");
  await expect(rows(page)).toHaveCount(1);
  const saved: Download[] = [];
  page.on("download", (download) => saved.push(download));
  await everything.focus();
  await page.keyboard.press("Enter");
  await expect(said(page)).toHaveText("2 projects exported: Survey.zip, Wages.zip");
  await expect
    .poll(() => saved.map((one) => one.suggestedFilename()))
    .toEqual(["Survey.zip", "Wages.zip"]);
  // Each row says it was exported, and no project was opened.
  await find(page).fill("");
  for (const name of ["Survey", "Wages"]) {
    await expect(cells(page, name).nth(4)).toHaveText(/^today, \d{1,2}:\d\d$/);
  }
  await expect(page.getByRole("button", { name: "New project…" })).toBeVisible();
  // One project alone is said as one.
  await press(projectsOf(page).getByRole("button", { name: "Actions for Survey", exact: true }));
  await press(page.getByRole("menuitem", { name: "Delete…" }));
  await press(
    projectsOf(page)
      .getByRole("group", { name: "Delete Survey?" })
      .getByRole("button", { name: "Delete", exact: true }),
  );
  await expect(rows(page)).toHaveCount(1);
  await press(everything);
  await expect(said(page)).toHaveText("1 project exported: Wages.zip");
});

test("the space the site uses is said where the browser gives it, with its share, and left out where it gives none", async ({
  page,
  browser,
  browserName,
}) => {
  test.skip(
    browserName === "webkit",
    "the WebKit these tests drive gives a page no private storage: the note says the projects are not kept, and no space",
  );
  // A browser that says 4.6 megabytes of two gigabytes.
  await page.addInitScript(() => {
    Object.defineProperty(navigator.storage, "estimate", {
      value: () => Promise.resolve({ usage: 4_600_000, quota: 2_000_000_000 }),
    });
  });
  await page.goto("/");
  const note = page.getByTestId("kept");
  await expect(page.getByTestId("used")).toHaveText("4.6 MB used.");
  await expect(note).toContainText("Kept in this browser. 4.6 MB used. Clearing the site's data");
  // The bar under it: a small share, drawn wide enough to be seen.
  const bar = page.getByTestId("usage");
  await expect(bar).toHaveCount(1);
  expect(await bar.locator("i").evaluate((node) => (node as HTMLElement).style.width)).toBe("2%");
  // A browser that gives no number: the note is whole without it, and has no bar.
  const context = await browser.newContext();
  const other = await context.newPage();
  await other.addInitScript(() => {
    Object.defineProperty(navigator.storage, "estimate", { value: undefined });
  });
  await other.goto("/");
  await other.getByRole("button", { name: "Start", exact: true }).focus();
  await expect(other.getByRole("button", { name: "Start", exact: true })).toBeEnabled({
    timeout: 30_000,
  });
  await other.keyboard.press("Enter");
  await expect(other.getByTestId("kept")).toContainText(
    /Kept in this browser\.\s*Clearing the site's data removes the projects/,
  );
  await expect(other.getByTestId("used")).toHaveCount(0);
  await expect(other.getByTestId("usage")).toHaveCount(0);
  await context.close();
});

test("the three cards under the table lead to the Scratch project and into Help", async ({
  page,
  press,
}) => {
  await page.goto("/");
  const cards = projectsOf(page).getByRole("group", { name: "Where to begin" }).locator(".card");
  await expect(cards).toHaveText([
    "Learn Your first analysis Five steps in the Scratch project: a sample, a summary, three models, a table, a figure.",
    "Help Coming from R or Stata Search Help by the name you know: lm finds reg, and most pages say what they match in R and in Stata.",
    "Reference reg, the workhorse Least squares with fixed effects and clustered errors.",
  ]);
  // Side by side, and as high as one another.
  const boxes = await cards.evaluateAll((every) =>
    every.map((one) => {
      const box = one.getBoundingClientRect();
      return {
        top: Math.round(box.top),
        height: Math.round(box.height),
        left: Math.round(box.left),
      };
    }),
  );
  expect(new Set(boxes.map((box) => box.top)).size).toBe(1);
  expect(new Set(boxes.map((box) => box.height)).size).toBe(1);
  expect(boxes[1]!.left).toBeGreaterThan(boxes[0]!.left);
  // The first opens the Scratch project.
  await press(cards.nth(0));
  await expect(page.getByRole("status")).toHaveText(READY);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Scratch");
  await press(all(page));
  // The second and the third open Help, which is a place inside the Scratch project: at the
  // page on finding help, and at the page of `reg`.
  await cards.nth(1).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("help-title")).toHaveText("Finding help");
  await press(all(page));
  await press(cards.nth(2));
  await expect(page.getByTestId("help-title")).toHaveText("reg");
  await expect(page.getByTestId("help-page")).toContainText(
    "Linear regression by least squares, with fixed effects",
  );
});

test("every entry, the field, every row and every card is reached by the Tab key, in the order of the screen", async ({
  page,
  press,
  browserName,
}) => {
  // Safari moves through the controls of a page with Option and Tab, as its own setting has it.
  const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
  await page.goto("/");
  await made(page, press, "Wages");
  const order: string[] = [];
  await page.locator("body").focus();
  for (let at = 0; at < 18; at++) {
    await page.keyboard.press(tab);
    const name = await page.evaluate(() => {
      const on = document.activeElement as HTMLElement | null;
      if (on === null || on === document.body) return "";
      return (on.getAttribute("aria-label") ?? on.textContent ?? "").replace(/\s+/g, " ").trim();
    });
    order.push(name);
  }
  const at = (starts: string) => order.findIndex((name) => name.startsWith(starts));
  // The entry that waits for the desktop app is passed over; the others come in the order
  // they are drawn: the column, the field, the row, the cards, then the foot.
  const wanted = [
    "Scratch project",
    "New project…",
    "Open project…",
    "Export all projects…",
    "Find a project",
    "Wages main.zeff",
    "Open Wages",
    "Export… Wages",
    "Actions for Wages",
    "Learn Your first analysis",
    "Help Coming from R or Stata",
    "Reference reg, the workhorse",
    "What is counted",
  ];
  const places = wanted.map(at);
  expect(
    places.every((place) => place >= 0),
    `reached: ${order.join(" | ")}`,
  ).toBe(true);
  expect(places).toEqual([...places].sort((a, b) => a - b));
  expect(order.some((name) => name.startsWith("Open folder…"))).toBe(false);
  // Return on the entry asks the new project's name, in the entry's place.
  await page.getByRole("button", { name: "New project…" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("The name of the new project")).toBeFocused();
  const form = await page.evaluate(() => {
    const box = (query: string) =>
      (document.querySelector(query) as HTMLElement).getBoundingClientRect();
    const [naming, first, side] = [
      box("form.naming"),
      box(".act.primary"),
      box('section[aria-label="Start"]'),
    ];
    return { under: naming.top >= first.bottom, inside: naming.right <= side.right };
  });
  expect(form).toEqual({ under: true, inside: true });
});

for (const theme of ["light", "dark"] as const) {
  test(`the screen holds 12.5 pixels and 4.5 to 1, at a desk's width and a tablet's (${theme})`, async ({
    page,
    press,
  }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    // A project for each way a last run is said: clean, with a warning, stopped by an error.
    await made(page, press, "Wages", "print(1)\n");
    await made(page, press, "Warned", "dataset(wages).mean(wage)\n");
    await made(page, press, "Stopped", 'let w = import("data/none.csv")\n');
    await made(page, press, "A project with a long name that the table has to cut somewhere");
    for (const width of [1440, 1024, 1000]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.getByRole("button", { name: "New project…" })).toBeVisible();
      expect(await smallestText(page), `the smallest text at ${width}`).toBeGreaterThanOrEqual(
        12.5,
      );
      expect(await faintText(page.locator("body")), `faint text at ${width}`).toEqual([]);
      const over = await page.evaluate(() => {
        const main = document.querySelector('section[aria-label="Your projects"]') as HTMLElement;
        return {
          page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          table: main.scrollWidth - main.clientWidth,
        };
      });
      expect(over, `wider than its room at ${width}`).toEqual({ page: 0, table: 0 });
      // Every row ends with Open, Export… and its menu, inside the window.
      const ends = await projectsOf(page)
        .getByRole("button", { name: /^Actions for / })
        .evaluateAll((every) =>
          every.map((one) => one.getBoundingClientRect().right <= innerWidth),
        );
      expect(ends, `the rows' ends at ${width}`).toEqual([true, true, true, true]);
    }
    // At the narrowest window Zemp Lite is laid out for, the screen is the desk's: the column
    // and the table side by side; the count of scripts has given way, the scripts being named
    // under each project.
    const sides = await page.evaluate(() => {
      const box = (selector: string) =>
        (document.querySelector(selector) as HTMLElement).getBoundingClientRect();
      const [list, column] = [
        box('section[aria-label="Your projects"]'),
        box('section[aria-label="Start"]'),
      ];
      return { list: list.left, column: column.right, over: list.right - window.innerWidth };
    });
    expect(sides.list).toBeGreaterThanOrEqual(sides.column - 1);
    expect(sides.over).toBeLessThanOrEqual(0);
    await expect(projectsOf(page).getByRole("columnheader", { name: "Scripts" })).toBeHidden();
    await expect(projectsOf(page).getByRole("columnheader", { name: "Last run" })).toBeVisible();
    await expect(projectsOf(page).locator("tbody .chip")).toHaveText([
      "not run",
      "never",
      "1 error",
      "never",
      "1 warning",
      "never",
      "clean",
      "never",
    ]);
    // The row rested on is as readable: its quiet words are one step stronger on its ground.
    await page.setViewportSize({ width: 1440, height: 900 });
    await rows(page).first().hover();
    expect(await faintText(projectsOf(page))).toEqual([]);
  });
}
