// The pages of Using Zemp Lite name the controls of the app in bold, as the screen names them
// (release 0.2.3, step 9a; finding 7 of its plan). Here each page is read from its file, and
// every control it names is looked for on the screens the page speaks of: a page that goes
// stale, naming a button the app no longer has or has renamed, fails.
import { readFileSync, readdirSync } from "node:fs";
import type { Locator, Page } from "@playwright/test";
import { readUsing, type Piece } from "../../src/using/read";
import { expect, test, write } from "./support";

const READY = "engine Zeff 0.9.0 ready";
const folder = new URL("../../src/using/pages/", import.meta.url);
type Press = (target: Locator) => Promise<void>;

/** The controls a page names in bold, in its order, each once. */
function controlsOf(slug: string): string[] {
  const doc = readUsing(readFileSync(new URL(`${slug}.md`, folder), "utf8"));
  const pieces: Piece[] = doc.blocks.flatMap((block) =>
    block.kind === "paragraph" ? block.pieces : block.kind === "list" ? block.items.flat() : [],
  );
  return [
    ...new Set(pieces.filter((piece) => piece.kind === "control").map((piece) => piece.text)),
  ];
}

/**
 * What the controls on the screen are called: for each button, link, field, box and menu
 * item, its name for a screen reader, its words, and what it says on resting.
 */
async function named(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const names = new Set<string>();
    const controls = document.querySelectorAll<HTMLElement>(
      "button, a[href], input, select, textarea, label, summary, [role='button'], [role='menuitem'], [role='checkbox'], [role='switch'], [role='option'], [role='tab'], [role='combobox']",
    );
    for (const one of controls) {
      // Its own words, and those of each part of it (a button's word beside its key).
      for (const text of [
        one.getAttribute("aria-label"),
        one.textContent,
        one.getAttribute("title"),
        one.getAttribute("placeholder"),
        ...[...one.children].map((part) => part.textContent),
      ]) {
        const name = text?.replace(/\s+/g, " ").trim();
        if (name) names.add(name);
      }
    }
    return [...names];
  });
}

const places = (page: Page) => page.getByRole("navigation", { name: "Places" });
const bar = (page: Page, place: string) =>
  page.getByRole("toolbar", { name: `${place}: its panes and its controls` });

async function scratch(page: Page, press: Press): Promise<void> {
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
}
async function run(page: Page, press: Press): Promise<void> {
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
}

/**
 * The screens each page speaks of: the app is brought to each, as a reader would, and `see`
 * notes what the controls there are called. Every page begins on the screen of projects.
 */
const SCREENS: Record<
  string,
  (page: Page, press: Press, see: () => Promise<void>) => Promise<void>
> = {
  "getting-started": async (page, press, see) => {
    await see();
    await scratch(page, press);
    await see();
  },
  "projects-scripts-and-files": async (page, press, see) => {
    // A project of the reader's own, so that the list has a row with its menu.
    await press(page.getByRole("button", { name: "New project…" }));
    await page.getByLabel("The name of the new project").fill("Named controls");
    await press(page.getByRole("button", { name: "Create" }));
    await expect(page.getByRole("status")).toHaveText(READY);
    await see();
    // Its files: the pane, what the + adds, and a file's own menu.
    await press(bar(page, "Script").getByRole("button", { name: "Project", exact: true }));
    await see();
    await press(page.getByRole("button", { name: "Add to the project" }));
    await see();
    // A script of the reader's own, whose menu has every item (the main script keeps its place).
    await press(page.getByRole("menuitem", { name: "New script" }));
    await page.getByRole("textbox", { name: "The name of the new script" }).fill("second");
    await page.keyboard.press("Enter");
    await press(page.getByRole("button", { name: /^Actions for .*second\.zeff$/ }));
    await see();
    await page.keyboard.press("Escape");
    // Back on the screen of projects, the project's row and its menu.
    await press(page.getByTitle("Back to the projects of this browser"));
    await see();
    await press(page.getByRole("button", { name: "Actions for Named controls" }));
    await see();
  },
  "running-a-script": async (page, press, see) => {
    await scratch(page, press);
    await run(page, press);
    await see();
  },
  "the-notes": async (page, press, see) => {
    await scratch(page, press);
    await run(page, press);
    await see();
  },
  "sections-and-the-outline": async (page, press, see) => {
    await scratch(page, press);
    await see();
  },
  "the-data-place": async (page, press, see) => {
    await scratch(page, press);
    await run(page, press);
    await see();
    await press(places(page).getByRole("button", { name: "Data" }));
    await expect(page.getByRole("grid")).toBeVisible();
    await press(bar(page, "Data").getByRole("button", { name: "Variables", exact: true }));
    await expect(page.getByRole("region", { name: "Variables" })).toBeVisible();
    await see();
  },
  "the-plots-place": async (page, press, see) => {
    await scratch(page, press);
    await run(page, press);
    await see();
    await press(places(page).getByRole("button", { name: "Plots" }));
    const strip = page.getByRole("list", { name: "Plots of the last run" });
    await expect(strip).toBeVisible();
    await see();
    // Two plots compared, for what is offered then.
    await strip.getByRole("checkbox", { name: "Compare" }).nth(0).check();
    await strip.getByRole("checkbox", { name: "Compare" }).nth(1).check();
    await see();
  },
  commands: async (page, press, see) => {
    await scratch(page, press);
    await see();
  },
  // The page of keys names keys, not controls; its keys are held by a test of their own.
  "keyboard-shortcuts": async () => {},
  "exporting-and-opening-a-project": async (page, press, see) => {
    await see();
    await scratch(page, press);
    await see();
  },
  "where-the-work-is-kept": async (page, press, see) => {
    await scratch(page, press);
    await see();
  },
  "reporting-a-problem": async (page, press, see) => {
    await scratch(page, press);
    await run(page, press);
    await see();
    // A script that fails, and its report.
    await write(
      page,
      readFileSync(new URL("../scripts/report/error.zeff", import.meta.url), "utf8"),
    );
    await press(page.getByRole("button", { name: "Run", exact: true }));
    await expect(page.getByRole("status")).toHaveText(/^ended with exit code \d$/);
    await page.keyboard.press("ControlOrMeta+k");
    await page.getByRole("combobox", { name: "Type a command" }).fill("report a problem");
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("dialog", { name: "Report a problem" }).getByTestId("report-text"),
    ).toBeVisible();
    await see();
  },
  "finding-help": async (page, press, see) => {
    await scratch(page, press);
    await run(page, press);
    await see();
    await press(places(page).getByRole("button", { name: "Help" }));
    await expect(page.getByTestId("help-counts")).toBeVisible();
    await see();
  },
};

const pages = readdirSync(folder)
  .filter((file) => file.endsWith(".md"))
  .map((file) => file.slice(0, -3))
  .sort();

test("every page of Using Zemp Lite has its screens here", () => {
  expect(Object.keys(SCREENS).sort()).toEqual(pages);
});

for (const slug of pages) {
  test(`every control the page ${slug} names is on the screen by that name`, async ({
    page,
    press,
  }) => {
    const controls = controlsOf(slug);
    await page.goto("/");
    await expect(page.getByRole("button", { name: /^Scratch project/ })).toBeVisible();
    const seen = new Set<string>();
    await SCREENS[slug]?.(page, press, async () => {
      for (const name of await named(page)) seen.add(name);
    });
    // A control is there under the name the page gives it: that name whole, or the words a
    // longer name begins with ("Projects ▾"; "Scratch project", with its line under it).
    const there = (control: string) =>
      [...seen].some((name) => name === control || name.startsWith(`${control} `));
    expect(controls.filter((control) => !there(control))).toEqual([]);
  });
}
