// The pages of Using Zemp Lite held to the running app and the engine it carries (release
// 0.2.3, step 9d; open decision #211, item 12). A page quotes from the screen what a note
// says, how a result stands to the script, a condition typed in the Data place; and it names
// commands of ⌘K. Here each scene a page quotes from is made in the app, and every piece
// listed for it (`src/using/held.ts`) is read on the screen; every command a page names is
// found in the list of commands. A page that says what this engine, in this app, does not
// show fails the build.
import type { Locator, Page } from "@playwright/test";
import { HELD, type Scene } from "../../src/using/held";
import { cursorTo, editor, expect, test, write } from "./support";

const READY = "engine Zeff 0.8.0 ready";
type Press = (target: Locator) => Promise<void>;

async function scratch(page: Page, press: Press): Promise<void> {
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
}
async function run(page: Page, press: Press): Promise<void> {
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
}
const places = (page: Page) => page.getByRole("navigation", { name: "Places" });
const bar = (page: Page, place: string) =>
  page.getByRole("toolbar", { name: `${place}: its panes and its controls` });

/**
 * A piece is on the screen as it is written in the page: among the words the window shows,
 * read as a reader reads them (a note's name and its type are set apart, and read as one line).
 */
const shown = async (page: Page, quoted: string) =>
  expect
    .poll(() => page.evaluate(() => document.body.innerText.replace(/\s+/g, " ")), {
      message: quoted,
    })
    .toContain(quoted);

/**
 * The scenes: how the app is brought to each, as a reader would, and how a piece quoted from
 * it is looked for. Most pieces are read on the screen as written; where a piece is what the
 * reader types, the scene types it and looks at what the engine answers.
 */
const SCENES: Record<
  Scene,
  (page: Page, press: Press) => Promise<(quoted: string) => Promise<void>>
> = {
  // The Scratch project's own example, run: the notes, and the file's name with `saved`.
  "a run": async (page, press) => {
    await scratch(page, press);
    await run(page, press);
    return (quoted) => shown(page, quoted);
  },
  // A statement changed after a run: it, and what stands under it.
  "an edit after a run": async (page, press) => {
    await scratch(page, press);
    await write(page, "let a = 6\nprint(a * 7)\nprint(1)\n");
    await run(page, press);
    // The first statement changed: a digit typed at the end of its line.
    await editor(page).focus();
    await page.keyboard.press("ControlOrMeta+Home");
    await page.keyboard.press("End");
    await page.keyboard.type("0");
    return (quoted) => shown(page, quoted);
  },
  // A script that stops at an error: the statement that failed, and those after it.
  "a run that fails": async (page, press) => {
    await scratch(page, press);
    await write(page, 'print("a")\nlet w = import("data/none.csv")\nprint("b")\n');
    await press(page.getByRole("button", { name: "Run", exact: true }));
    await expect(page.getByRole("status")).toHaveText(/^ended with exit code \d$/);
    return (quoted) => shown(page, quoted);
  },
  // A run that takes long enough to be read while it goes: one statement running, one waiting.
  "a long run": async (page, press) => {
    await scratch(page, press);
    await write(
      page,
      'print("started")\nfor i in 1..200000 {\n    let rows = dataset(wages).where(year == 2015).n_rows()\n}\nprint("after")\n',
    );
    await press(page.getByRole("button", { name: "Run", exact: true }));
    await expect(page.locator('[data-testid="note"][data-line="2"]')).toContainText("running…");
    return async (quoted) => {
      await shown(page, quoted);
    };
  },
  "the Project pane": async (page, press) => {
    await scratch(page, press);
    await press(bar(page, "Script").getByRole("button", { name: "Project", exact: true }));
    await expect(page.getByRole("region", { name: "Project" })).toBeVisible();
    return (quoted) => shown(page, quoted);
  },
  // The example's own sections: the comment is in the script, and its section in the pane.
  "the Outline pane": async (page, press) => {
    await scratch(page, press);
    await press(bar(page, "Script").getByRole("button", { name: "Outline", exact: true }));
    const pane = page.getByRole("region", { name: "Outline" });
    await expect(pane).toBeVisible();
    return async (quoted) => {
      await shown(page, quoted);
      const title = quoted.replace(/^\/\/ #+ /, "");
      await expect(pane.getByRole("button", { name: new RegExp(`^${title}`) })).toBeVisible();
    };
  },
  // A subsection typed as the page writes it: it is listed under its section.
  "a subsection typed": async (page, press) => {
    await scratch(page, press);
    await press(bar(page, "Script").getByRole("button", { name: "Outline", exact: true }));
    const pane = page.getByRole("region", { name: "Outline" });
    return async (quoted) => {
      await write(page, `// # Describe\nlet a = 1\n${quoted}\nprint(a)\n`);
      const title = quoted.replace(/^\/\/ #+ /, "");
      await expect(
        pane.locator("li.sub").getByRole("button", { name: new RegExp(`^${title}`) }),
      ).toBeVisible();
    };
  },
  // What the page says to type in the list of commands: it lists the commands that run.
  "the commands, with run typed": async (page, press) => {
    await scratch(page, press);
    await cursorTo(page, 10);
    await page.keyboard.press("ControlOrMeta+k");
    return async (quoted) => {
      await page.getByRole("combobox", { name: "Type a command" }).fill(quoted);
      const options = page.getByRole("dialog", { name: "Commands" }).getByRole("option");
      await expect(options.first()).toContainText("Run the script");
      expect(await options.count()).toBeGreaterThanOrEqual(5);
    };
  },
  // A condition as the page writes it: the engine keeps the rows it holds for, and says how many.
  "the Data place, kept to a condition": async (page, press) => {
    await scratch(page, press);
    await run(page, press);
    await press(places(page).getByRole("button", { name: "Data" }));
    await expect(page.getByRole("grid")).toBeVisible();
    return async (quoted) => {
      const where = page.getByRole("textbox", { name: "Keep rows where" });
      await where.fill(quoted);
      await where.press("Enter");
      await expect(page.getByTestId("kept-count")).toHaveText(/^[\d,]+ of 15,571 rows$/);
    };
  },
  // The rows where a value is missing: the cell is written as the page says.
  "the Data place, kept to the missing": async (page, press) => {
    await scratch(page, press);
    await run(page, press);
    await press(places(page).getByRole("button", { name: "Data" }));
    await expect(page.getByRole("grid")).toBeVisible();
    const where = page.getByRole("textbox", { name: "Keep rows where" });
    await where.fill("is_missing(wage)");
    await where.press("Enter");
    await expect(page.getByTestId("kept-count")).toHaveText(/^188 of 15,571 rows$/);
    return async (quoted) => {
      await expect(page.getByRole("gridcell", { name: quoted, exact: true }).first()).toBeVisible();
    };
  },
};

/** What is quoted from each scene, by the pages: each piece with the page that gives it. */
const quotedFrom = new Map<Scene, { slug: string; quoted: string }[]>();
const commands: { slug: string; name: string }[] = [];
for (const [slug, listed] of Object.entries(HELD)) {
  for (const [code, held] of Object.entries(listed)) {
    if (held.by === "screen") {
      quotedFrom.set(held.scene, [...(quotedFrom.get(held.scene) ?? []), { slug, quoted: code }]);
    } else if (held.by === "command") {
      commands.push({ slug, name: code });
    }
  }
}

test("every scene a page quotes from is made here, and none is made for nothing", () => {
  expect([...quotedFrom.keys()].sort()).toEqual(Object.keys(SCENES).sort());
});

for (const [scene, pieces] of quotedFrom) {
  test(`what the pages quote from ${scene} is on the screen there`, async ({ page, press }) => {
    const read = await SCENES[scene](page, press);
    for (const { slug, quoted } of pieces) {
      await test.step(`${slug}: ${quoted}`, () => read(quoted));
    }
  });
}

test("every command a page names is a command of ⌘K, under that name", async ({ page, press }) => {
  await scratch(page, press);
  // With the cursor in a section of the script, so that the commands of the cursor are there.
  await cursorTo(page, 10);
  await page.keyboard.press("ControlOrMeta+k");
  const dialog = page.getByRole("dialog", { name: "Commands" });
  await expect(dialog).toBeVisible();
  const listed = await dialog
    .getByRole("option")
    .evaluateAll((all) => all.map((one) => one.querySelector("span")?.textContent?.trim() ?? ""));
  expect(listed.length).toBeGreaterThan(20);
  expect(commands.length).toBeGreaterThanOrEqual(20);
  const missing = commands.filter(
    ({ name }) => !listed.some((command) => command === name || command.startsWith(name)),
  );
  expect(missing).toEqual([]);
});
