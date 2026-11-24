// The project screen redrawn (release 0.2.4, step 7; open decision #220, item 4; the design
// guide, section 9, "Project screen"): no heading of its own; four cards in two rows; the note
// on where the work is kept in two columns; **Recent**, with its count, five rows in view and
// the lower edge fading until the end of the list; a first visit's card; one column on a
// phone. **Open a project's zip…** is **Open project…**.
import type { Page } from "@playwright/test";
import { expect, faintText, smallestText, test } from "./support";

const READY = "engine Zeff 0.8.0 ready";
type Press = (target: ReturnType<Page["locator"]>) => Promise<void>;

const start = (page: Page) => page.getByRole("region", { name: "Start" });
const recent = (page: Page) => page.getByRole("region", { name: "Recent projects" });
const rows = (page: Page) => recent(page).getByRole("button", { name: /in this browser · / });
const box = (page: Page) => recent(page).locator(".recent-box");

/** Make a project by its card and come back to the project screen. */
async function made(page: Page, press: Press, name: string): Promise<void> {
  await press(page.getByRole("button", { name: "New project…" }));
  await page.getByLabel("The name of the new project").fill(name);
  await press(page.getByRole("button", { name: "Create" }));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  await press(page.getByRole("button", { name: "Projects" }));
  await expect(page.getByRole("button", { name: "New project…" })).toBeVisible();
  // The list of projects is drawn once it has been read from the browser's storage, a moment
  // after the cards (release 0.2.4, the first-visit card); a test that goes on at once, on a
  // slow machine, would meet the screen without its rows.
  await expect(page.getByRole("button", { name: `Actions for ${name}` })).toBeVisible();
}

/** Whether the lower edge of the list of projects fades: the fade drawn over it is there. */
const fades = (page: Page) =>
  recent(page)
    .locator(".recent-wrap")
    .evaluate((node) => getComputedStyle(node, "::after").display !== "none");

test("the screen has no heading of its own: the name in the bar, the alpha strip, and four cards in two rows", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  // The one heading of the first rank is the name, in the bar; nothing is titled "Start".
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Zemp Lite");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByTestId("alpha")).toHaveText("alpha");
  await expect(
    page.getByText("Something wrong? In a project, ⌘K → Report a problem"),
  ).toBeVisible();

  const cards = start(page).locator(".actions > *");
  await expect(cards).toHaveCount(4);
  await expect(cards.nth(0)).toHaveText(
    /^\s*New project…\s*A folder with zeff\.toml, scripts and data\.\s*$/,
  );
  await expect(cards.nth(1)).toContainText("Open project…");
  await expect(cards.nth(1)).toContainText(
    "A project's zip: one that Export project… wrote, or a project's folder zipped on this computer.",
  );
  await expect(cards.nth(2)).toContainText("Open folder…");
  await expect(cards.nth(2)).toContainText("comes with the desktop app");
  await expect(cards.nth(2)).toBeDisabled();
  await expect(cards.nth(3)).toContainText("Scratch project");
  await expect(cards.nth(3)).toContainText("Start here");
  // Two rows of two: the first two share a top, the last two another, below it.
  const tops = await cards.evaluateAll((all) =>
    all.map((one) => Math.round(one.getBoundingClientRect().top)),
  );
  expect(tops[0]).toBe(tops[1]);
  expect(tops[2]).toBe(tops[3]);
  expect(tops[2]).toBeGreaterThan(tops[0] as number);
  // The cards begin level with the list of projects.
  const list = await recent(page).evaluate((node) => Math.round(node.getBoundingClientRect().top));
  expect(Math.abs(list - (tops[0] as number))).toBeLessThanOrEqual(1);

  // The note under the cards, in two columns.
  const note = page.getByTestId("kept").locator("> div");
  await expect(note).toHaveCount(2);
  await expect(note.nth(1)).toContainText("Taking a project out.");
  const sides = await note.evaluateAll((all) =>
    all.map((one) => Math.round(one.getBoundingClientRect().top)),
  );
  expect(sides[0]).toBe(sides[1]);
  // The old name of the card is nowhere on the screen.
  await expect(page.getByText("Open a project's zip…")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open project…" })).toBeEnabled();
});

test("a first visit's list says there is no project yet, and its button opens the Scratch project", async ({
  page,
  press,
}) => {
  await page.goto("/");
  await expect(recent(page).getByRole("heading", { level: 2 })).toHaveText("Recent");
  await expect(recent(page).getByText("No project yet", { exact: true })).toBeVisible();
  await expect(recent(page)).toContainText(
    "Start with the Scratch project: two worked examples, ready to run.",
  );
  await expect(page.getByTestId("recent-count")).toHaveCount(0);
  await press(recent(page).getByRole("button", { name: "Open the Scratch project" }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await press(page.getByRole("button", { name: "Projects" }));
  await expect(rows(page)).toHaveCount(1);
  await expect(page.getByTestId("recent-count")).toHaveText("1 project");
  await expect(recent(page).getByText("No project yet", { exact: true })).toHaveCount(0);
});

test("a visitor with a project is never shown the card of a first visit, not for the moment the list takes to be read", async ({
  page,
  press,
}) => {
  await page.goto("/");
  await press(page.getByRole("button", { name: "New project…" }));
  await page.getByLabel("The name of the new project").fill("Wages");
  await press(page.getByRole("button", { name: "Create" }));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Wages");
  // From here, every change of the page is looked at for the card's words.
  await page.evaluate(() => {
    const seen = window as unknown as { firstVisitCard: boolean };
    seen.firstVisitCard = false;
    new MutationObserver(() => {
      if (document.body.textContent.includes("No project yet")) seen.firstVisitCard = true;
    }).observe(document, { subtree: true, childList: true, characterData: true });
  });
  await press(page.getByRole("button", { name: "Projects" }));
  await expect(rows(page)).toHaveCount(1);
  expect(
    await page.evaluate(() => (window as unknown as { firstVisitCard: boolean }).firstVisitCard),
  ).toBe(false);
  await expect(recent(page).getByText("No project yet", { exact: true })).toHaveCount(0);
});

test("the list counts its projects, shows five with the lower edge fading, and loses the fade at its end", async ({
  page,
  press,
}) => {
  test.slow();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  for (const name of ["One", "Two", "Three"]) await made(page, press, name);
  await expect(rows(page)).toHaveCount(3);
  await expect(page.getByTestId("recent-count")).toHaveText("3 projects · the last opened first");
  // The last opened first.
  await expect(rows(page).first()).toContainText("Three");
  // Three fit: nothing lies below, and nothing fades.
  expect(await fades(page)).toBe(false);

  for (const name of ["Four", "Five", "Six", "Seven", "Eight"]) await made(page, press, name);
  await expect(rows(page)).toHaveCount(8);
  await expect(page.getByTestId("recent-count")).toHaveText("8 projects · the last opened first");
  // Five rows are in view, and the edge fades over the rest.
  const view = await box(page).evaluate((node) => ({
    height: node.clientHeight,
    whole: node.scrollHeight,
    row: (node.querySelector("li") as HTMLElement).offsetHeight,
  }));
  expect(view.whole).toBeGreaterThan(view.height);
  expect(Math.round(view.height / view.row)).toBe(5);
  await expect.poll(() => fades(page)).toBe(true);
  // At the end of the list the fade is gone; back at the top it returns.
  await box(page).evaluate((node) => node.scrollTo(0, node.scrollHeight));
  await expect.poll(() => fades(page)).toBe(false);
  await expect(rows(page).last()).toBeVisible();
  await box(page).evaluate((node) => node.scrollTo(0, 0));
  await expect.poll(() => fades(page)).toBe(true);
  // A row's menu is as it was, and a row opens its project.
  await press(recent(page).getByRole("button", { name: "Actions for Eight", exact: true }));
  const menu = page.getByRole("menu", { name: "Actions for Eight", exact: true });
  await expect(menu.getByRole("menuitem")).toHaveText([
    "Rename…",
    "Duplicate…",
    "Export project…",
    "Delete…",
  ]);
  // The menu opens out of the list and is not faded or cut with it: its last item is in view
  // whole, on its own ground, and takes a press where it is drawn. (Found by the test of the
  // whole, step 15: the fade was first a mask of the list, which cut the menu too.)
  const last = menu.getByRole("menuitem", { name: "Delete…" });
  const drawn = await last.evaluate((node) => {
    const box = node.getBoundingClientRect();
    const at = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    let masked = false;
    for (let up: Element | null = node; up !== null; up = up.parentElement) {
      const style = getComputedStyle(up);
      if ((style.maskImage || style.webkitMaskImage || "none") !== "none") masked = true;
    }
    return { hit: at === node || node.contains(at), masked };
  });
  expect(drawn).toEqual({ hit: true, masked: false });
  await press(last);
  await expect(recent(page).getByRole("group", { name: "Delete Eight?" })).toBeVisible();
  await press(recent(page).getByRole("button", { name: "Keep" }));
  await press(rows(page).first());
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Eight");
});

test("every card and every row is reached by the Tab key, in the order of the screen", async ({
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
  for (let at = 0; at < 14; at++) {
    await page.keyboard.press(tab);
    const name = await page.evaluate(() => {
      const on = document.activeElement as HTMLElement | null;
      if (on === null || on === document.body) return "";
      return (on.getAttribute("aria-label") ?? on.textContent ?? "").replace(/\s+/g, " ").trim();
    });
    order.push(name);
  }
  const at = (starts: string) => order.findIndex((name) => name.startsWith(starts));
  // The disabled card is passed over; the others come in the order they are drawn, then the
  // list, then the foot.
  expect(at("New project…")).toBeGreaterThanOrEqual(0);
  expect(at("Open project…")).toBeGreaterThan(at("New project…"));
  expect(at("Scratch project")).toBeGreaterThan(at("Open project…"));
  expect(at("Wages in this browser")).toBeGreaterThan(at("Scratch project"));
  expect(at("Actions for Wages")).toBeGreaterThan(at("Wages in this browser"));
  expect(at("What is counted")).toBeGreaterThan(at("Actions for Wages"));
  expect(order.some((name) => name.startsWith("Open folder…"))).toBe(false);
  // Return on the card asks the new project's name, in the card's place.
  await page.getByRole("button", { name: "New project…" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("The name of the new project")).toBeFocused();
});

for (const theme of ["light", "dark"] as const) {
  test(`the screen holds 12.5 pixels and 4.5 to 1, at a desk's width and a phone's (${theme})`, async ({
    page,
    press,
  }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await made(page, press, "Wages");
    for (const width of [1440, 1000, 375]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.getByRole("button", { name: "New project…" })).toBeVisible();
      expect(await smallestText(page), `the smallest text at ${width}`).toBeGreaterThanOrEqual(
        12.5,
      );
      expect(await faintText(page.locator("body")), `faint text at ${width}`).toEqual([]);
      const over = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(over, `wider than the window at ${width}`).toBeLessThanOrEqual(0);
    }
    // On a phone everything is one column, and the list of projects comes first.
    const cards = start(page).locator(".actions > *");
    const lefts = await cards.evaluateAll((all) =>
      all.map((one) => Math.round(one.getBoundingClientRect().left)),
    );
    expect(new Set(lefts).size).toBe(1);
    const tops = await page.evaluate(() => {
      const top = (selector: string) =>
        (document.querySelector(selector) as HTMLElement).getBoundingClientRect().top;
      return { list: top('section[aria-label="Recent projects"]'), cards: top(".actions") };
    });
    expect(tops.list).toBeLessThan(tops.cards);
  });
}
