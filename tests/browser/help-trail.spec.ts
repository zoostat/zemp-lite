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
  await page.goto("/app/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
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
/** The pane at the right, On this page, and the sections it lists. */
const onThisPage = (page: Page) => page.getByRole("navigation", { name: "On this page" });
const outline = (page: Page) => onThisPage(page).getByRole("list");
const home = (page: Page) => bar(page).getByRole("button", { name: "Home" });

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
  within.getByRole("row").evaluateAll((all) =>
    all.map((row) =>
      [...row.children].map((cell, at) =>
        // The name alone: a function of a name that has two says which it is beside it.
        (
          (at === 0 ? cell.querySelector<HTMLElement>("button span") : null) ??
          (cell as HTMLElement)
        ).innerText.trim(),
      ),
    ),
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
  // Home has no trail: its own button, marked, says where one is.
  await expect(trail(page)).toHaveCount(0);
  await expect(home(page)).toHaveAttribute("aria-current", "page");

  await ask(page, "t_test");
  await expect.poll(() => reads(page)).toBe("Packages › stats › t_test");
  // The package's step: its page, the functions the released engine lists, in its order.
  await press(step(page, "stats"));
  await expect(title(page)).toHaveText("stats");
  await expect.poll(() => reads(page)).toBe("Packages › stats");
  await expect(shown(page).getByRole("heading", { level: 3 })).toHaveText("stats");
  await expect(
    shown(page).getByRole("list", { name: "Facts of stats" }).getByRole("listitem"),
  ).toHaveText(["package · tier 1", "14 functions in Zeff 0.8.0"]);
  expect(await rows(page)).toEqual(printed("stats"));
  // A function of the list opens its page; the steps went into the history, one by one.
  await press(shown(page).getByRole("button", { name: "anova", exact: true }));
  await expect(title(page)).toHaveText("anova");
  await expect.poll(() => reads(page)).toBe("Packages › stats › anova");
  await expect(shown(page)).toContainText("Analysis of variance");
  await press(back(page));
  await expect(title(page)).toHaveText("stats");
  await press(back(page));
  await expect(title(page)).toHaveText("t_test");
  // The trail begins under Home: its first step is Packages, and the word Help is not in it.
  await expect(trail(page).getByRole("listitem").first()).toHaveText("Packages");
  await expect(trail(page).getByText("Help", { exact: true })).toHaveCount(0);
  // Packages opens the list of the packages, a page of its own; Home's button opens Home.
  await press(step(page, "Packages"));
  await expect(title(page)).toHaveText("Packages");
  await expect.poll(() => reads(page)).toBe("Packages");
  await expect(shown(page).getByRole("heading", { level: 3 })).toHaveText("Packages");
  await expect(shown(page).getByRole("row")).toHaveCount(10);
  await expect(onThisPage(page)).toHaveCount(0);
  await press(back(page));
  await expect(title(page)).toHaveText("t_test");
  await press(home(page));
  await expect(trail(page)).toHaveCount(0);
  await expect(home(page)).toHaveAttribute("aria-current", "page");
  await expect(shown(page).getByRole("heading", { level: 3 })).toHaveText("Help");

  // A name two packages have names both, each a link to its own page.
  await ask(page, "summary");
  await expect.poll(() => reads(page)).toBe("Packages › data · results › summary");
  await press(step(page, "results"));
  await expect(title(page)).toHaveText("results");
  expect(await rows(page)).toEqual(printed("results"));
  // A name the engine has no page for stands under Help alone, with what the engine says.
  await ask(page, "a_learning");
  await expect.poll(() => reads(page)).toBe("a_learning");
});

test("a package has a page of its own, apart from the function of its name", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  // `plot` typed is the name of the functions, as `zeff help plot` prints them: it names two
  // (#215), and the chooser of the two is shown; its package is a step away.
  await ask(page, "plot");
  await expect.poll(() => reads(page)).toBe("Packages › plot › plot");
  await expect(shown(page)).toContainText("plot is two functions.");
  await press(step(page, "plot"));
  await expect.poll(() => reads(page)).toBe("Packages › plot");
  await expect(
    shown(page).getByRole("list", { name: "Facts of plot" }).getByRole("listitem"),
  ).toHaveText(["package · tier 1", "35 functions in Zeff 0.8.0"]);
  const listed = await rows(page);
  expect(listed).toHaveLength(35);
  expect(listed.map(([name]) => name)).toEqual(expect.arrayContaining(["plot", "text", "points"]));
  // Four names are listed twice, the package having two functions of each, every one a row.
  expect(new Set(listed.map(([name]) => name)).size).toBe(31);
  expect(listed.filter(([name]) => name === "plot")).toHaveLength(2);
  // One of the two functions from its package's page, and back: pages of the history.
  await press(shown(page).getByRole("button", { name: "plot · of a frame", exact: true }));
  await expect.poll(() => reads(page)).toBe("Packages › plot › plot › of a frame");
  await press(back(page));
  await expect.poll(() => reads(page)).toBe("Packages › plot");
  await press(back(page));
  await expect.poll(() => reads(page)).toBe("Packages › plot › plot");

  // A name that is a package's alone opens the package's page from the field.
  await ask(page, "regress");
  await expect.poll(() => reads(page)).toBe("Packages › regress");
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
  // A list has no sections for the pane at the right, which says so.
  await expect(outline(page)).toHaveCount(0);
  await expect(onThisPage(page)).toHaveCount(0);
  await press(parts.nth(1).getByRole("button", { name: "wages" }));
  await expect.poll(() => reads(page)).toBe("Packages › datasets › wages");
  await expect(shown(page)).toContainText("Synthetic hourly wages");
});

test("the codes by family are a page, and a code stands under its family", async ({
  page,
  press,
}) => {
  await page.setViewportSize({ width: 1280, height: 620 });
  await scratch(page, press);
  await ask(page, "W0201");
  await expect.poll(() => reads(page)).toBe("Errors and warnings › W0xxx › W0201");
  // Errors and warnings: every family the engine lists, each with its codes and their titles.
  await press(step(page, "Errors and warnings"));
  await expect(title(page)).toHaveText("Errors and warnings");
  await expect.poll(() => reads(page)).toBe("Errors and warnings");
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
  // The page is a list: the pane at the right has no sections of it to show.
  await expect(onThisPage(page)).toHaveCount(0);
  // A code of the list opens its page, under its family.
  await press(shown(page).getByRole("button", { name: "Z0101" }));
  await expect(title(page)).toHaveText("Z0101");
  await expect.poll(() => reads(page)).toBe("Errors and warnings › Z01xx › Z0101");
  await expect(shown(page)).toContainText("no such name");

  // A family's step opens the codes at that family: its heading at the top of the page.
  await ask(page, "W0201");
  await press(step(page, "W0xxx"));
  await expect.poll(() => reads(page)).toBe("Errors and warnings › W0xxx");
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
    // Home, and after it the first step of the trail.
    await home(page).focus();
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

test("the bar of Help: Topics, Back, Forward, Home, the trail, and the search field at the right end, with nothing after it", async ({
  page,
  press,
}) => {
  await page.setViewportSize({ width: 1200, height: 700 });
  await scratch(page, press);
  const field = bar(page).getByRole("combobox", { name: /^Search Help/ });
  const order = async () => {
    const parts = [
      bar(page).getByRole("button", { name: "Topics", exact: true }),
      back(page),
      bar(page).getByRole("button", { name: "Forward" }),
      home(page),
      ...((await trail(page).count()) > 0 ? [trail(page)] : []),
      field,
    ];
    const boxes = [];
    for (const part of parts) boxes.push((await part.boundingBox())!);
    // Each begins where the one before it has ended, on one line.
    for (let at = 1; at < boxes.length; at++) {
      expect(boxes[at]!.x).toBeGreaterThanOrEqual(boxes[at - 1]!.x + boxes[at - 1]!.width - 1);
      expect(
        Math.abs(boxes[at]!.y + boxes[at]!.height / 2 - (boxes[0]!.y + boxes[0]!.height / 2)),
      ).toBeLessThan(8);
    }
    // Nothing stands after the field: it ends the bar (the list of the page's sections has no
    // link there from 0.2.4; open decision #220, item 7).
    const end = (await bar(page).boundingBox())!;
    const last = boxes[boxes.length - 1]!;
    expect(end.x + end.width - (last.x + last.width)).toBeLessThan(24);
    const between = await bar(page).evaluate((node) => {
      const input = node.querySelector("input")!.getBoundingClientRect();
      return [...node.querySelectorAll("button")].filter(
        (one) => one.getBoundingClientRect().left >= input.right,
      ).length;
    });
    expect(between).toBe(0);
  };
  // On Home, where there is no trail; on a page; and in a narrower window.
  await order();
  await ask(page, "proportion_test");
  await order();
  // A window this narrow says so in a line at its top, which moves the bar down: the bar is
  // measured once that line stands, and again once it has gone.
  const narrow = page.getByRole("note").filter({ hasText: "1,200 pixels wide" });
  await page.setViewportSize({ width: 1000, height: 700 });
  await expect(narrow).toBeVisible();
  await order();
  // With Topics closed the bar is in the same order.
  await page.setViewportSize({ width: 1200, height: 700 });
  await expect(narrow).toHaveCount(0);
  await press(bar(page).getByRole("button", { name: "Topics", exact: true }));
  await order();
});
