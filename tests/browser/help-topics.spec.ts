// The Topics pane of the Help place (release 0.2.3, step 5a; the row of 0.2.3; open decision
// #211, items 4 and 9): the left pane, which was Outline, holds sections that fold, each with
// its count: the sections of the page open; the packages, each opening its page; the errors
// and warnings by family, each family folding to its codes. It opens and closes by its link
// and its ×, as every pane does. Beside a page that has neighbours (step 5b) it holds those in
// place of the packages and the codes: a function's package with its functions, the open one
// marked; a code's family with its codes; and **‹ All topics**, which returns it to its
// sections without leaving the page.
import type { Locator, Page } from "@playwright/test";
import { expect, faintText, smallestText, test, useExample } from "./support";

const READY = "engine Zeff 0.8.0 ready";

async function scratch(page: Page, press: (target: Locator) => Promise<void>, unfolded = true) {
  await page.goto("/app/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await useExample(page);
  await press(
    page.getByRole("navigation", { name: "Places" }).getByRole("button", { name: "Help" }),
  );
  // Help, first opened after a start, has every section of Topics closed (open decision #220,
  // item 8; `kept.spec.ts` and the first test here hold that). These tests are of what the
  // sections hold, so each is unfolded, as a reader unfolds it.
  for (const name of ["Packages", "Errors and warnings", "Using Zemp Lite"]) {
    const fold = page
      .getByRole("complementary", { name: "Help: the left pane" })
      .getByRole("heading", { level: 3 })
      .getByRole("button", { name: new RegExp(`^\\S?\\s*${name}`) });
    if (unfolded) await press(fold);
  }
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
const onThisPage = (page: Page) => page.getByRole("navigation", { name: "On this page" });
const allTopics = (page: Page) => topics(page).getByRole("button", { name: "All topics" });
const back = (page: Page) => bar(page).getByRole("button", { name: "Back" });
const title = (page: Page) => page.getByTestId("help-title");
const shown = (page: Page) => page.getByTestId("help-page");
const field = (page: Page) => bar(page).getByRole("combobox", { name: /^Search Help/ });

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
  ["plot", 35],
  ["datasets", 2],
  ["regress", 10],
] as const;

test("Topics holds sections that fold, each with its count, by the mouse and by the keyboard", async ({
  page,
  press,
}) => {
  await scratch(page, press, false);
  // Help, first opened after a start: every section closed, each with its count.
  await expect(topics(page).getByRole("heading", { level: 3 })).toHaveText([
    /^▸\s*Packages\s*10$/,
    /^▸\s*Errors and warnings\s*144$/,
    /^▸\s*Using Zemp Lite\s*\d+$/,
  ]);
  await expect(topics(page).getByRole("list")).toHaveCount(0);
  for (const name of ["Packages", "Errors and warnings", "Using Zemp Lite"]) {
    await press(head(page, name));
  }
  // Unfolded: the packages and the codes, each section open, with its count.
  await expect(topics(page).getByRole("heading", { level: 3 })).toHaveText([
    /^▾\s*Packages\s*10$/,
    /^▾\s*Errors and warnings\s*144$/,
    /^▾\s*Using Zemp Lite\s*\d+$/,
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
  // The packages, one by one, each from the sections: its own page, and its row marked there.
  for (const [name, count] of PACKAGES) {
    const row = listOf(page, "Packages").getByRole("button", { name: new RegExp(`^${name}\\s`) });
    await press(row);
    await expect(title(page)).toHaveText(name);
    await expect(shown(page).getByRole("heading", { level: 3 })).toHaveText(name);
    await expect(shown(page).locator("section").first().getByRole("row")).toHaveCount(count);
    // Beside its page the pane holds the package's functions; All topics brings the sections back.
    await expect(listOf(page, `The functions of ${name}`).getByRole("button")).toHaveCount(count);
    await press(allTopics(page));
    await expect(row).toHaveAttribute("aria-current", "page");
    await expect(listOf(page, "Packages").locator('[aria-current="page"]')).toHaveCount(1);
  }

  // The codes: a family unfolded in the sections, its first code pressed; then, beside that
  // page, every code of the family in turn. Each opens the engine's page of that code.
  const families = await listOf(page, "Errors and warnings")
    .locator("> li > button .mono")
    .allInnerTexts();
  expect(families).toHaveLength(12);
  let pressed = 0;
  for (const name of families) {
    if ((await allTopics(page).count()) > 0) await press(allTopics(page));
    await press(family(page, name));
    await press(listOf(page, `The codes of ${name}`).getByRole("button").first());
    await expect(allTopics(page)).toBeVisible();
    const wrong = await page.evaluate(async () => {
      const pane = document.querySelector('[data-testid="help"]')!;
      const rows = () => [
        ...pane.querySelectorAll<HTMLButtonElement>('[data-pane="topics"] .around button'),
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
        const marked = () => rows()[at]?.getAttribute("aria-current") === "page";
        const there = await settled(
          () =>
            title() === code &&
            page()?.querySelector("h3")?.textContent?.trim() === code &&
            marked() &&
            rows().length === count,
        );
        // The page is that code's, with the title the pane gave it among its words.
        const flat = (text: string) => text.replaceAll("`", "").replace(/\s+/g, " ");
        if (!there || !flat(page()?.innerText ?? "").includes(flat(words))) wrong.push(code);
      }
      return { wrong, count };
    });
    expect(wrong.wrong).toEqual([]);
    pressed += wrong.count;
  }
  expect(pressed).toBe(144);
});

test("beside a function's page Topics holds its package, the open function marked; the page's sections are at the right", async ({
  page,
  press,
}) => {
  await page.setViewportSize({ width: 1280, height: 700 });
  await scratch(page, press);
  // Home has nothing beside it: the sections, and no way back to them to offer.
  await expect(allTopics(page)).toHaveCount(0);
  // Home's own parts, its panels, are in the pane at the right.
  await expect(onThisPage(page).getByRole("list").getByRole("button").first()).toHaveText("Zeff");

  await ask(page, "t_test");
  // All topics; the package with its count, a link to its page; and its functions.
  await expect(allTopics(page)).toBeVisible();
  const holder = topics(page).getByRole("region", { name: "Beside this page: stats" });
  await expect(holder.getByRole("heading", { level: 3 })).toHaveText(/^stats\s*14$/);
  const functions = listOf(page, "The functions of stats").getByRole("button");
  await expect(functions).toHaveCount(14);
  await expect(functions.first()).toHaveText("t_test");
  await expect(listOf(page, "The functions of stats").locator('[aria-current="page"]')).toHaveText(
    "t_test",
  );
  // The packages and the codes give way to them, and the pane holds nothing else: the page's
  // sections are in the pane at the right, On this page (#211, item 13).
  await expect(listOf(page, "Packages")).toHaveCount(0);
  await expect(listOf(page, "Errors and warnings")).toHaveCount(0);
  await expect(topics(page).getByRole("heading", { level: 3 })).toHaveText([/^stats\s*14$/]);
  await expect(topics(page).getByText("On this page")).toHaveCount(0);
  const sections = onThisPage(page).getByRole("list").getByRole("button");
  await expect(sections.first()).toHaveText("Usage");
  await expect(sections.first()).toBeInViewport();
  // A section goes to its place and is marked, as in the Outline pane it was.
  await press(sections.filter({ hasText: /^Examples$/ }));
  await expect(sections.filter({ hasText: /^Examples$/ })).toHaveAttribute(
    "aria-current",
    "location",
  );
  await expect(shown(page).getByRole("heading", { level: 4, name: "Examples" })).toBeInViewport();

  // A neighbour opens its page, is marked in its turn, and went into the history.
  await press(
    listOf(page, "The functions of stats").getByRole("button", { name: "anova", exact: true }),
  );
  await expect(title(page)).toHaveText("anova");
  await expect(listOf(page, "The functions of stats").locator('[aria-current="page"]')).toHaveText(
    "anova",
  );
  await press(back(page));
  await expect(title(page)).toHaveText("t_test");
  await expect(listOf(page, "The functions of stats").locator('[aria-current="page"]')).toHaveText(
    "t_test",
  );
  // The package's head opens the package's page: its functions beside it, none marked.
  await press(holder.getByRole("heading", { level: 3 }).getByRole("button"));
  await expect(title(page)).toHaveText("stats");
  await expect(listOf(page, "The functions of stats").getByRole("button")).toHaveCount(14);
  await expect(listOf(page, "The functions of stats").locator('[aria-current="page"]')).toHaveCount(
    0,
  );

  // All topics: the sections again, the page as it was; the next page has its neighbours.
  await press(back(page));
  await press(allTopics(page));
  await expect(title(page)).toHaveText("t_test");
  await expect(shown(page).getByRole("heading", { level: 3 })).toHaveText("t_test");
  await expect(topics(page).getByRole("heading", { level: 3 })).toHaveText([
    /^▾\s*Packages\s*10$/,
    /^▾\s*Errors and warnings\s*144$/,
    /^▾\s*Using Zemp Lite\s*\d+$/,
  ]);
  await expect(allTopics(page)).toHaveCount(0);
  // The page's sections are where they were, at the right; the next page has its neighbours.
  await expect(sections.first()).toHaveText("Usage");
  await ask(page, "reg");
  await expect(allTopics(page)).toBeVisible();
  await expect(
    listOf(page, "The functions of regress").locator('[aria-current="page"]'),
  ).toHaveText("reg");
  await expect(sections.first()).toHaveText("Usage");
  // The page's sections have no link in the bar: they are a part of the page (#220, item 7).
  await expect(bar(page).getByRole("button", { name: "On this page", exact: true })).toHaveCount(0);
  await expect(onThisPage(page)).toBeVisible();
  await expect(allTopics(page)).toBeVisible();
});

test("a name of two packages has both beside it, a dataset its package, and a code its family", async ({
  page,
  press,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await scratch(page, press);
  // `summary` is of `data` and of `results`: both, each with the name marked.
  await ask(page, "summary");
  await expect(
    topics(page)
      .getByRole("region", { name: /^Beside this page/ })
      .getByRole("heading", { level: 3 }),
  ).toHaveText([/^data\s*56$/, /^results\s*23$/]);
  for (const [name, which] of [
    ["data", "of a frame"],
    ["results", "of a result"],
  ] as const) {
    // Each package lists its own `summary`, which says what it is called on (#215).
    const marked = listOf(page, `The functions of ${name}`).locator('[aria-current="page"]');
    await expect(marked).toHaveText(new RegExp(`^summary\\s*${which}$`));
    // In a package of many functions the open one is brought into view in the list.
    await expect(marked).toBeInViewport();
  }
  // The two share the pane, each in a list of its own.
  // A function far down a long package is in view too.
  await ask(page, "assert");
  const far = listOf(page, "The functions of core").locator('[aria-current="page"]');
  await expect(far).toHaveText("assert");
  await expect(far).toBeInViewport();

  // A dataset stands among the datasets of `datasets`, after its two functions.
  await ask(page, "wages");
  await expect(listOf(page, "The functions of datasets").getByRole("button")).toHaveText([
    "dataset",
    "datasets",
  ]);
  const shipped = listOf(page, "The datasets of datasets");
  await expect(shipped.getByRole("button")).toHaveText(["firms", "sleep", "staff", "wages"]);
  await expect(shipped.locator('[aria-current="page"]')).toHaveText("wages");
  await press(shipped.getByRole("button", { name: "sleep" }));
  await expect(title(page)).toHaveText("sleep");
  await expect(shipped.locator('[aria-current="page"]')).toHaveText("sleep");

  // A code has its family's codes beside it, with their titles; the family's head opens the
  // codes at that family, which has nothing beside it: the sections are back.
  await ask(page, "W0201");
  const holder = topics(page).getByRole("region", { name: "Beside this page: W0xxx" });
  await expect(holder.getByRole("heading", { level: 3 })).toHaveText(
    /^W0xxx\s+Warnings, numbered by the same areas\s*26$/,
  );
  const codes = listOf(page, "The codes of W0xxx");
  await expect(codes.getByRole("button")).toHaveCount(26);
  await expect(codes.locator('[aria-current="page"]')).toHaveText(
    /^W0201\s*missing values skipped by a statistic$/,
  );
  await press(codes.getByRole("button", { name: /^W0101/ }));
  await expect(title(page)).toHaveText("W0101");
  await expect(codes.locator('[aria-current="page"]')).toHaveText(/^W0101/);
  await press(holder.getByRole("heading", { level: 3 }).getByRole("button"));
  await expect(title(page)).toHaveText("W0xxx");
  await expect(allTopics(page)).toHaveCount(0);
  await expect(head(page, "Errors and warnings")).toBeVisible();
  // A name the engine has no page for has nothing beside it either.
  await ask(page, "a_learning");
  await expect(allTopics(page)).toHaveCount(0);
  await expect(head(page, "Packages")).toBeVisible();
});

for (const theme of ["light", "dark"] as const) {
  test(`Topics closes and opens by its link, its × and ⌘K, the middle taking its width; sizes and contrast in the ${theme} theme`, async ({
    page,
    press,
    browserName,
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

    const painted = async () => {
      expect(await smallestText(page)).toBeGreaterThanOrEqual(12.5);
      expect(await faintText(topics(page))).toEqual([]);
      // Nothing of the pane runs off its side.
      const sideways = await topics(page).evaluate((node) => node.scrollWidth - node.clientWidth);
      expect(sideways).toBeLessThanOrEqual(0);
    };
    // As painted beside a code, its family's codes with the open one marked, the pointer on a row.
    await ask(page, "W0201");
    await expect(listOf(page, "The codes of W0xxx").locator('[aria-current="page"]')).toHaveText(
      /^W0201/,
    );
    await listOf(page, "The codes of W0xxx").getByRole("button").nth(1).hover();
    await painted();
    // Beside a function, its package's functions; and in the sections, a family unfolded.
    await ask(page, "summary");
    await painted();
    await press(allTopics(page));
    await press(family(page, "W0xxx"));
    await family(page, "W0xxx").hover();
    await painted();

    // From the keyboard alone: All topics and a neighbour are stops of the Tab key and answer
    // to Enter. (Safari gives a button the Tab key with Option held.)
    const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
    await ask(page, "t_test");
    await allTopics(page).focus();
    await page.keyboard.press(tab);
    await expect(
      topics(page)
        .getByRole("region", { name: "Beside this page: stats" })
        .getByRole("heading", { level: 3 })
        .getByRole("button"),
    ).toBeFocused();
    await page.keyboard.press(tab);
    await expect(listOf(page, "The functions of stats").getByRole("button").first()).toBeFocused();
    await page.keyboard.press(tab);
    await page.keyboard.press("Enter");
    await expect(title(page)).toHaveText("proportion_test");
    await allTopics(page).focus();
    await page.keyboard.press("Enter");
    await expect(head(page, "Packages")).toBeVisible();
    await expect(title(page)).toHaveText("proportion_test");
  });
}
