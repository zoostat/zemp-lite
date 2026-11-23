// The Topics pane of the Help place (release 0.2.3, step 5a; the row of 0.2.3; open decision
// #211, items 4 and 9): the left pane, which was Outline, holds sections that fold, each with
// its count: the sections of the page open; the packages, each opening its page; the errors
// and warnings by family, each family folding to its codes. It opens and closes by its link
// and its ×, as every pane does.
import type { Locator, Page } from "@playwright/test";
import { expect, faintText, smallestText, test, useExample } from "./support";

const READY = "engine Zeff 0.8.0 ready";

async function scratch(page: Page, press: (target: Locator) => Promise<void>) {
  await page.goto("/");
  await press(page.getByRole("button", { name: "Scratch project" }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await useExample(page);
  await press(
    page.getByRole("navigation", { name: "Places" }).getByRole("button", { name: "Help" }),
  );
}

const bar = (page: Page) => page.getByRole("toolbar", { name: "Help: its panes and its controls" });
const topics = (page: Page) =>
  page
    .getByRole("complementary", { name: "Help: the left pane" })
    .getByRole("region", { name: "Topics" });
/** The button at the head of a section, which folds and unfolds it. */
const head = (page: Page, name: string) =>
  topics(page)
    .getByRole("heading", { level: 3 })
    .getByRole("button", { name: new RegExp(`^\\S?\\s*${name}`) });
const listOf = (page: Page, name: string) => topics(page).getByRole("list", { name, exact: true });
const family = (page: Page, name: string) =>
  listOf(page, "Errors and warnings").getByRole("button", { name: new RegExp(`${name} `) });
const title = (page: Page) => page.getByTestId("help-title");
const shown = (page: Page) => page.getByTestId("help-page");
const field = (page: Page) =>
  bar(page).getByRole("searchbox", { name: "Open the page of a function or a code" });

async function ask(page: Page, name: string) {
  await field(page).fill(name);
  await field(page).press("Enter");
  await expect(title(page)).toHaveText(name);
}

const PACKAGES = [
  ["core", 71],
  ["time", 16],
  ["text", 13],
  ["data", 56],
  ["dist", 19],
  ["results", 23],
  ["stats", 14],
  ["plot", 31],
  ["datasets", 2],
  ["regress", 10],
] as const;

test("Topics holds sections that fold, each with its count, by the mouse and by the keyboard", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  // On Home: the packages and the codes, each section open, with its count.
  await expect(topics(page).getByRole("heading", { level: 3 })).toHaveText([
    /^▾\s*Packages\s*10$/,
    /^▾\s*Errors and warnings\s*144$/,
  ]);
  await expect(listOf(page, "Packages").getByRole("button")).toHaveText(
    PACKAGES.map(([name, count]) => new RegExp(`^${name}\\s*${count}$`)),
  );
  // The families as the engine lists them, each folded to its name, with its count.
  const families = listOf(page, "Errors and warnings").locator("> li > button");
  await expect(families).toHaveCount(12);
  await expect(families.first()).toHaveText(/^▸\s*Z00xx\s+Errors a script raises itself\s*1$/);
  await expect(families.nth(1)).toHaveText(
    /^▸\s*Z01xx\s+Names: variables, bindings, functions, packages\s*10$/,
  );
  for (const one of await families.all())
    await expect(one).toHaveAttribute("aria-expanded", "false");
  const counts = await families.evaluateAll((all) =>
    all.map((one) => Number(one.querySelector(".count")?.textContent)),
  );
  expect(counts.reduce((sum, count) => sum + count, 0)).toBe(144);

  // By the mouse: a section folds to its head and unfolds.
  await expect(head(page, "Packages")).toHaveAttribute("aria-expanded", "true");
  await press(head(page, "Packages"));
  await expect(head(page, "Packages")).toHaveAttribute("aria-expanded", "false");
  await expect(head(page, "Packages")).toHaveText(/^▸\s*Packages\s*10$/);
  await expect(listOf(page, "Packages")).toHaveCount(0);
  await press(head(page, "Packages"));
  await expect(listOf(page, "Packages").getByRole("button")).toHaveCount(10);
  // A family unfolds to its codes with their titles.
  await press(family(page, "Z01xx"));
  await expect(family(page, "Z01xx")).toHaveAttribute("aria-expanded", "true");
  const codes = listOf(page, "The codes of Z01xx").getByRole("button");
  await expect(codes).toHaveCount(10);
  await expect(codes.first()).toHaveText(/^Z0101\s*no such name$/);

  // By the keyboard: Enter and Space on a head fold and unfold it.
  await head(page, "Errors and warnings").focus();
  await page.keyboard.press("Enter");
  await expect(head(page, "Errors and warnings")).toHaveAttribute("aria-expanded", "false");
  await expect(listOf(page, "Errors and warnings")).toHaveCount(0);
  await page.keyboard.press("Space");
  await expect(head(page, "Errors and warnings")).toHaveAttribute("aria-expanded", "true");
  // The family is as it was left, unfolded; the keyboard folds it.
  await expect(codes).toHaveCount(10);
  await family(page, "Z01xx").focus();
  await page.keyboard.press("Enter");
  await expect(listOf(page, "The codes of Z01xx")).toHaveCount(0);

  // What is folded is the reader's for the place: it stands after the Script place and back.
  await press(head(page, "Packages"));
  await press(family(page, "W1xxx"));
  await press(
    page.getByRole("navigation", { name: "Places" }).getByRole("button", { name: "Script" }),
  );
  await press(
    page.getByRole("navigation", { name: "Places" }).getByRole("button", { name: "Help" }),
  );
  await expect(head(page, "Packages")).toHaveAttribute("aria-expanded", "false");
  await expect(listOf(page, "The codes of W1xxx").getByRole("button")).toHaveCount(6);
});

test("every package and every code of Topics opens its page", async ({ page, press }) => {
  test.slow();
  await scratch(page, press);
  // The packages, one by one: each its own page, marked in the pane while it is shown.
  for (const [name, count] of PACKAGES) {
    const row = listOf(page, "Packages").getByRole("button", { name: new RegExp(`^${name}\\s`) });
    await press(row);
    await expect(title(page)).toHaveText(name);
    await expect(shown(page).getByRole("heading", { level: 3 })).toHaveText(name);
    await expect(shown(page).locator("section").first().getByRole("row")).toHaveCount(count);
    await expect(row).toHaveAttribute("aria-current", "page");
  }
  await expect(listOf(page, "Packages").locator('[aria-current="page"]')).toHaveCount(1);

  // Every family unfolded, every code pressed: each opens the engine's page of that code.
  for (const one of await listOf(page, "Errors and warnings").locator("> li > button").all()) {
    await press(one);
  }
  const rows = listOf(page, "Errors and warnings").locator("ul button");
  await expect(rows).toHaveCount(144);
  const missing = await page.evaluate(async () => {
    const pane = document.querySelector('[data-testid="help"]')!;
    const rows = () => [
      ...pane.querySelectorAll<HTMLButtonElement>('[data-pane="topics"] ul ul button'),
    ];
    const settled = (done: () => boolean) =>
      new Promise<boolean>((resolve) => {
        const started = Date.now();
        const look = () =>
          done()
            ? resolve(true)
            : Date.now() - started > 4000
              ? resolve(false)
              : setTimeout(look, 5);
        look();
      });
    const wrong: string[] = [];
    const count = rows().length;
    for (let at = 0; at < count; at++) {
      const row = rows()[at]!;
      const code = row.querySelector(".mono")!.textContent!.trim();
      const words = row.querySelector(".title")!.textContent!.trim();
      row.click();
      const title = () => pane.querySelector('[data-testid="help-title"]')?.textContent?.trim();
      const page = () => pane.querySelector<HTMLElement>('[data-testid="help-page"]');
      const there = await settled(
        () => title() === code && page()?.querySelector("h3")?.textContent?.trim() === code,
      );
      // The page is that code's, the title the pane gave it among its words, and the row marked.
      const marked = rows()[at]!.getAttribute("aria-current") === "page";
      const flat = (text: string) => text.replaceAll("`", "").replace(/\s+/g, " ");
      if (!there || !marked || !flat(page()?.innerText ?? "").includes(flat(words)))
        wrong.push(code);
    }
    return wrong;
  });
  expect(missing).toEqual([]);
  // The last of them is the page left open.
  await expect(title(page)).toHaveText(/^W1\d{3}$/);
});

test("the sections of the page open stand first in Topics, and fold as the others do", async ({
  page,
  press,
}) => {
  await page.setViewportSize({ width: 1280, height: 640 });
  await scratch(page, press);
  // Home has no sections of its own.
  await expect(topics(page).getByRole("region", { name: "On this page" })).toHaveCount(0);
  await ask(page, "t_test");
  await expect(topics(page).getByRole("heading", { level: 3 })).toHaveText([
    /^▾\s*On this page\s*\d+$/,
    /^▾\s*Packages\s*10$/,
    /^▾\s*Errors and warnings\s*144$/,
  ]);
  const sections = listOf(page, "On this page").getByRole("button");
  await expect(sections.first()).toHaveText("Usage");
  const count = await sections.count();
  await expect(head(page, "On this page")).toHaveText(
    new RegExp(`^▾\\s*On this page\\s*${count}$`),
  );
  // One goes to its place and is marked, as in the Outline pane it was.
  await press(sections.filter({ hasText: /^Examples$/ }));
  await expect(sections.filter({ hasText: /^Examples$/ })).toHaveAttribute(
    "aria-current",
    "location",
  );
  await expect(shown(page).getByRole("heading", { level: 4, name: "Examples" })).toBeInViewport();
  // Folded, the packages come up under its head; it stays folded on the next page.
  await press(head(page, "On this page"));
  await expect(listOf(page, "On this page")).toHaveCount(0);
  await ask(page, "reg");
  await expect(head(page, "On this page")).toHaveAttribute("aria-expanded", "false");
  await press(head(page, "On this page"));
  await expect(sections.first()).toHaveText("Usage");
});

for (const theme of ["light", "dark"] as const) {
  test(`Topics closes and opens by its link, its × and ⌘K, the middle taking its width; sizes and contrast in the ${theme} theme`, async ({
    page,
    press,
  }) => {
    await page.setViewportSize({ width: 1200, height: 760 });
    await scratch(page, press);
    if (theme === "dark") await press(page.getByRole("switch", { name: "Dark" }));
    const link = bar(page).getByRole("button", { name: "Topics", exact: true });
    await expect(link).toHaveAttribute("aria-pressed", "true");
    await expect(link).toHaveAttribute("title", "Show or hide the topics of Help");
    const middle = page.getByTestId("help").locator(".page");
    const width = async () => Math.round((await middle.boundingBox())!.width);
    const beside = await width();
    const pane = Math.round((await topics(page).boundingBox())!.width);
    // Its ×: the pane goes, and the middle is wider by the pane and its edge.
    await press(topics(page).getByRole("button", { name: "Close Topics" }));
    await expect(topics(page)).toHaveCount(0);
    await expect(link).toHaveAttribute("aria-pressed", "false");
    expect((await width()) - beside).toBeGreaterThanOrEqual(pane);
    // Its link: back, the middle as it was.
    await press(link);
    await expect(topics(page)).toBeVisible();
    expect(await width()).toBe(beside);
    // ⌘K: named for what it does.
    await page.keyboard.press("ControlOrMeta+k");
    const box = page.getByRole("combobox", { name: "Type a command" });
    await box.fill("help hide topics");
    await expect(
      page.getByRole("dialog", { name: "Commands" }).getByRole("option").first(),
    ).toContainText("Help: hide Topics");
    await box.press("Enter");
    await expect(topics(page)).toHaveCount(0);
    await page.keyboard.press("ControlOrMeta+k");
    await box.fill("help show topics");
    await box.press("Enter");
    await expect(topics(page)).toBeVisible();

    // As painted, with a page's sections, a family unfolded and a code marked.
    await ask(page, "W0201");
    await press(family(page, "W0xxx"));
    await expect(listOf(page, "The codes of W0xxx").locator('[aria-current="page"]')).toHaveText(
      /^W0201/,
    );
    expect(await smallestText(page)).toBeGreaterThanOrEqual(12.5);
    expect(await faintText(topics(page))).toEqual([]);
    // Nothing of the pane runs off its side.
    const sideways = await topics(page).evaluate((node) => node.scrollWidth - node.clientWidth);
    expect(sideways).toBeLessThanOrEqual(0);
  });
}
