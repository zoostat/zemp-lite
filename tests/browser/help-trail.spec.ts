// The trail of the Help place and the pages its steps open (release 0.2.3, step 3b; open
// decision #211, part 3 and item 7): where a page stands, each step before the last a link;
// a package's page, its functions each with its one line, set from the engine's index for
// every package alike (`zeff help plot` prints the function of that name, not the package);
// and the codes by family, as the engine lists them.
import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { expect, faintText, smallestText, test, useExample } from "./support";

const READY = "engine Zeff 0.8.0 ready";
const file = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

async function scratch(page: Page, press: (target: ReturnType<Page["locator"]>) => Promise<void>) {
  await page.goto("/");
  await press(page.getByRole("button", { name: "Scratch project" }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await useExample(page);
  await press(
    page.getByRole("navigation", { name: "Places" }).getByRole("button", { name: "Help" }),
  );
}

const bar = (page: Page) => page.getByRole("toolbar", { name: "Help: its panes and its controls" });
const trail = (page: Page) => bar(page).getByRole("navigation", { name: "Where this page stands" });
const step = (page: Page, name: string) => trail(page).getByRole("button", { name, exact: true });
const back = (page: Page) => bar(page).getByRole("button", { name: "Back" });
const title = (page: Page) => page.getByTestId("help-title");
const shown = (page: Page) => page.getByTestId("help-page");
const field = (page: Page) => bar(page).getByRole("combobox", { name: /^Search Help/ });
/** The sections of the page open, in the Topics pane. */
const outline = (page: Page) =>
  page
    .getByRole("complementary", { name: "Help: the left pane" })
    .getByRole("region", { name: "Topics" })
    .getByRole("list", { name: "On this page" });

/** The trail as it reads, its marks between the steps as drawn. */
const reads = async (page: Page) =>
  (await trail(page).getByRole("listitem").allInnerTexts())
    .map((text) => text.replace(/\s+/g, " ").trim())
    .join(" ");

async function ask(page: Page, name: string) {
  await field(page).fill(name);
  await field(page).press("Enter");
  await expect(title(page)).toHaveText(name);
}

/** The rows of the list shown: each name with its one line. */
const rows = async (page: Page, within = shown(page)) =>
  within
    .getByRole("row")
    .evaluateAll((all) =>
      all.map((row) => [...row.children].map((cell) => (cell as HTMLElement).innerText.trim())),
    );

/** What the released `zeff help <package>` printed: each function with its one line. */
const printed = (name: string) =>
  file(`tests/scripts/packages/${name}.txt`)
    .split("\n")
    .filter((line) => line.startsWith("  "))
    .map((line) => {
      const [first, ...rest] = line.trim().split(/\s+/);
      return [first, rest.join(" ")];
    });

test("the trail says where a page stands, and each step opens its page", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  // Home: the trail is Help, and no link.
  await expect.poll(() => reads(page)).toBe("Help");
  await expect(trail(page).getByRole("button")).toHaveCount(0);
  await expect(title(page)).toHaveAttribute("aria-current", "page");

  await ask(page, "t_test");
  await expect.poll(() => reads(page)).toBe("Help › Packages › stats › t_test");
  // The package's step: its page, the functions the released engine lists, in its order.
  await press(step(page, "stats"));
  await expect(title(page)).toHaveText("stats");
  await expect.poll(() => reads(page)).toBe("Help › Packages › stats");
  await expect(shown(page).getByRole("heading", { level: 3 })).toHaveText("stats");
  await expect(
    shown(page).getByRole("list", { name: "Facts of stats" }).getByRole("listitem"),
  ).toHaveText(["package · tier 1", "14 functions in Zeff 0.8.0"]);
  expect(await rows(page)).toEqual(printed("stats"));
  // A function of the list opens its page; the steps went into the history, one by one.
  await press(shown(page).getByRole("button", { name: "anova", exact: true }));
  await expect(title(page)).toHaveText("anova");
  await expect.poll(() => reads(page)).toBe("Help › Packages › stats › anova");
  await expect(shown(page)).toContainText("Analysis of variance");
  await press(back(page));
  await expect(title(page)).toHaveText("stats");
  await press(back(page));
  await expect(title(page)).toHaveText("t_test");
  // Packages and Help both open Home, where the packages are listed.
  await press(step(page, "Packages"));
  await expect.poll(() => reads(page)).toBe("Help");
  await expect(bar(page).getByRole("button", { name: "Home" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await press(back(page));
  await press(step(page, "Help"));
  await expect.poll(() => reads(page)).toBe("Help");

  // A name two packages have names both, each a link to its own page.
  await ask(page, "summary");
  await expect.poll(() => reads(page)).toBe("Help › Packages › data · results › summary");
  await press(step(page, "results"));
  await expect(title(page)).toHaveText("results");
  expect(await rows(page)).toEqual(printed("results"));
  // A name the engine has no page for stands under Help alone, with what the engine says.
  await ask(page, "a_learning");
  await expect.poll(() => reads(page)).toBe("Help › a_learning");
});

test("a package has a page of its own, apart from the function of its name", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  // `plot` typed is the function, as `zeff help plot` prints it; its package is a step away.
  await ask(page, "plot");
  await expect.poll(() => reads(page)).toBe("Help › Packages › plot › plot");
  await expect(shown(page).getByRole("heading", { level: 4, name: "Usage" }).first()).toBeVisible();
  await press(step(page, "plot"));
  await expect.poll(() => reads(page)).toBe("Help › Packages › plot");
  await expect(
    shown(page).getByRole("list", { name: "Facts of plot" }).getByRole("listitem"),
  ).toHaveText(["package · tier 1", "31 functions in Zeff 0.8.0"]);
  const listed = await rows(page);
  expect(listed).toHaveLength(31);
  expect(listed.map(([name]) => name)).toEqual(expect.arrayContaining(["plot", "text", "points"]));
  // No name is listed twice, though the package has two functions called `plot`.
  expect(new Set(listed.map(([name]) => name)).size).toBe(31);
  // The function from its package's page, and back: two pages of the history.
  await press(shown(page).getByRole("button", { name: "plot", exact: true }));
  await expect.poll(() => reads(page)).toBe("Help › Packages › plot › plot");
  await press(back(page));
  await expect.poll(() => reads(page)).toBe("Help › Packages › plot");
  await press(back(page));
  await expect.poll(() => reads(page)).toBe("Help › Packages › plot › plot");

  // A name that is a package's alone opens the package's page from the field.
  await ask(page, "regress");
  await expect.poll(() => reads(page)).toBe("Help › Packages › regress");
  expect(await rows(page)).toEqual(printed("regress"));

  // `datasets` lists the shipped datasets after its two functions, each with its page.
  await ask(page, "datasets");
  await press(step(page, "datasets"));
  await expect(
    shown(page).getByRole("list", { name: "Facts of datasets" }).getByRole("listitem"),
  ).toHaveText(["package · tier 1", "2 functions in Zeff 0.8.0", "4 datasets"]);
  const parts = shown(page).locator("section");
  expect((await rows(page, parts.nth(0))).map(([name]) => name)).toEqual(["dataset", "datasets"]);
  await expect(parts.nth(1).getByRole("heading", { level: 4 })).toHaveText("Datasets");
  expect((await rows(page, parts.nth(1))).map(([name]) => name)).toEqual([
    "firms",
    "sleep",
    "staff",
    "wages",
  ]);
  await expect(outline(page).getByRole("button")).toHaveText(["Datasets"]);
  await press(parts.nth(1).getByRole("button", { name: "wages" }));
  await expect.poll(() => reads(page)).toBe("Help › Packages › datasets › wages");
  await expect(shown(page)).toContainText("Synthetic hourly wages");
});

test("the codes by family are a page, and a code stands under its family", async ({
  page,
  press,
}) => {
  await page.setViewportSize({ width: 1280, height: 620 });
  await scratch(page, press);
  await ask(page, "W0201");
  await expect.poll(() => reads(page)).toBe("Help › Errors and warnings › W0xxx › W0201");
  // Errors and warnings: every family the engine lists, each with its codes and their titles.
  await press(step(page, "Errors and warnings"));
  await expect(title(page)).toHaveText("Errors and warnings");
  await expect.poll(() => reads(page)).toBe("Help › Errors and warnings");
  await expect(
    shown(page).getByRole("list", { name: "Facts of Errors and warnings" }).getByRole("listitem"),
  ).toHaveText(["144 codes", "12 families"]);
  const families = shown(page).getByRole("heading", { level: 4 });
  await expect(families).toHaveCount(12);
  await expect(families.first()).toHaveText(/^Z00xx\s*Errors a script raises itself$/);
  await expect(families.nth(1)).toHaveText(
    /^Z01xx\s*Names: variables, bindings, functions, packages$/,
  );
  expect(await rows(page)).toHaveLength(144);
  expect((await rows(page, shown(page).locator("section").nth(1)))[0]).toEqual([
    "Z0101",
    "no such name",
  ]);
  // The outline lists the families, each going to its place.
  const entries = outline(page).getByRole("button");
  await expect(entries).toHaveCount(12);
  await expect(entries.nth(1)).toHaveText(
    "Z01xx · Names: variables, bindings, functions, packages",
  );
  await press(entries.nth(10));
  await expect(entries.nth(10)).toHaveAttribute("aria-current", "location");
  // A code of the list opens its page, under its family.
  await press(shown(page).getByRole("button", { name: "Z0101" }));
  await expect(title(page)).toHaveText("Z0101");
  await expect.poll(() => reads(page)).toBe("Help › Errors and warnings › Z01xx › Z0101");
  await expect(shown(page)).toContainText("no such name");

  // A family's step opens the codes at that family: its heading at the top of the page.
  await ask(page, "W0201");
  await press(step(page, "W0xxx"));
  await expect.poll(() => reads(page)).toBe("Help › Errors and warnings › W0xxx");
  await expect(title(page)).toHaveText("W0xxx");
  const heading = shown(page).getByRole("heading", { level: 4, name: /^W0xxx/ });
  await expect(heading).toBeInViewport();
  const pane = page.getByTestId("help").locator(".page");
  await expect
    .poll(async () => {
      const top = (await pane.boundingBox())!.y;
      return Math.abs((await heading.boundingBox())!.y - top);
    })
    .toBeLessThan(60);
  await expect(entries.nth(10)).toHaveAttribute("aria-current", "location");
  // Back returns to the code, and the codes opened afresh are read from their top.
  await press(back(page));
  await expect(title(page)).toHaveText("W0201");
  await press(step(page, "Errors and warnings"));
  await expect(families.first()).toBeInViewport();
});

for (const theme of ["light", "dark"] as const) {
  test(`the trail and the lists keep to the bar, the sizes and the contrast, in the ${theme} theme`, async ({
    page,
    press,
    browserName,
  }) => {
    await page.setViewportSize({ width: 1200, height: 700 });
    await scratch(page, press);
    if (theme === "dark") await press(page.getByRole("switch", { name: "Dark" }));
    // The longest trails, with both panes open: nothing leaves the bar, and the field stays.
    const fits = async () => {
      const box = await bar(page).evaluate((node) => ({
        wide: node.scrollWidth,
        room: node.clientWidth,
        high: node.getBoundingClientRect().height,
      }));
      expect(box.wide).toBeLessThanOrEqual(box.room);
      expect(box.high).toBeLessThan(60);
      await expect(field(page)).toBeInViewport();
      const here = (await title(page).boundingBox())!;
      expect(here.width).toBeGreaterThan(20);
    };
    for (const name of ["summary", "proportion_test", "W0201"]) {
      await ask(page, name);
      await fits();
      expect(await smallestText(page)).toBeGreaterThanOrEqual(12.5);
      expect(await faintText(bar(page))).toEqual([]);
    }
    // In a narrower window the field and then the page's own name give way, and nothing
    // leaves the bar.
    await page.setViewportSize({ width: 1000, height: 700 });
    await ask(page, "proportion_test");
    await fits();
    await page.setViewportSize({ width: 1200, height: 700 });

    // The two lists, as painted.
    await press(step(page, "stats"));
    await expect(shown(page).getByRole("row")).toHaveCount(14);
    expect(await smallestText(page)).toBeGreaterThanOrEqual(12.5);
    expect(await faintText(shown(page))).toEqual([]);
    await ask(page, "Z0101");
    await press(step(page, "Errors and warnings"));
    await expect(shown(page).getByRole("row")).toHaveCount(144);
    expect(await smallestText(page)).toBeGreaterThanOrEqual(12.5);
    expect(await faintText(shown(page))).toEqual([]);

    // From the keyboard alone: a step of the trail and a row of a list are stops of the Tab
    // key and answer to Enter. (Safari gives a button the Tab key with Option held.)
    const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
    await ask(page, "t_test");
    await step(page, "Help").focus();
    await page.keyboard.press(tab);
    await expect(step(page, "Packages")).toBeFocused();
    await page.keyboard.press(tab);
    await expect(step(page, "stats")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(title(page)).toHaveText("stats");
    await shown(page).getByRole("button", { name: "t_test" }).focus();
    await page.keyboard.press(tab);
    await expect(shown(page).getByRole("button", { name: "proportion_test" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(title(page)).toHaveText("proportion_test");
  });
}
