// The scenes of the pictures of Using Zemp Lite (release 0.2.3, step 8b; `npm run pictures`).
// Each brings the app to what its picture shows, as a reader would, in Chromium, in the light
// theme and in a window of one size; the screen is then taken and written, compressed, into
// `src/using/pictures/<name>.webp`, under the name the page gives the picture. A page of
// `src/using/pages/` names its picture as `![words](name)`; a unit test holds the pages and
// the pictures to each other.
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Locator, Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { cursorTo, expect, test, write } from "../../tests/browser/support";

/** The size every picture is taken at: the narrowest window the app is laid out for. */
const SIZE = { width: 1200, height: 750 };
/** How closely a picture is kept, of 1: enough that the letters of the screen stay sharp. */
const KEPT = 0.86;

const folder = fileURLToPath(new URL("../../src/using/pictures/", import.meta.url));
const READY = "engine Zeff 0.8.0 ready";
type Press = (target: Locator) => Promise<void>;

/** The Scratch project as a reader first opens it, with its own example. */
async function scratch(page: Page, press: Press): Promise<void> {
  await page.goto("/app/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
}

/** A script that fails, as the tests of the report have it: a file that is not there. */
const FAILING = readFileSync(
  new URL("../../tests/scripts/report/error.zeff", import.meta.url),
  "utf8",
);

const places = (page: Page) => page.getByRole("navigation", { name: "Places" });
const bar = (page: Page, place: string) =>
  page.getByRole("toolbar", { name: `${place}: its panes and its controls` });

/** The scenes: the name of each picture, and how the app is brought to it. */
const SCENES: Record<string, (page: Page, press: Press) => Promise<void>> = {
  // Getting started: the example run, a note beside each statement.
  "the-script-after-a-run": async (page, press) => {
    await scratch(page, press);
    await press(page.getByRole("button", { name: "Run", exact: true }));
    await expect(page.getByRole("status")).toHaveText("done");
  },
  // Projects, scripts and files: the Project pane, with the files of the Scratch project.
  "the-project-pane": async (page, press) => {
    await scratch(page, press);
    await press(bar(page, "Script").getByRole("button", { name: "Project", exact: true }));
    await expect(page.getByRole("region", { name: "Project" })).toBeVisible();
  },
  // Running a script: the commands that run, in the list of commands.
  "the-ways-to-run": async (page, press) => {
    await scratch(page, press);
    await cursorTo(page, 10);
    await page.keyboard.press("ControlOrMeta+k");
    await page.getByRole("combobox", { name: "Type a command" }).fill("run");
    await expect(page.getByRole("dialog", { name: "Commands" })).toBeVisible();
  },
  // The notes: a run, and every output folded, so that the notes alone are beside the script.
  "the-notes": async (page, press) => {
    await scratch(page, press);
    await press(page.getByRole("button", { name: "Run", exact: true }));
    await expect(page.getByRole("status")).toHaveText("done");
    await press(page.getByRole("button", { name: "Fold all", exact: true }));
  },
  // Sections and the outline: the Outline pane, listing the sections of the example.
  "the-outline": async (page, press) => {
    await scratch(page, press);
    await press(page.getByRole("button", { name: "Run", exact: true }));
    await expect(page.getByRole("status")).toHaveText("done");
    await press(page.getByRole("button", { name: "Fold all", exact: true }));
    await press(bar(page, "Script").getByRole("button", { name: "Outline", exact: true }));
    await expect(page.getByRole("region", { name: "Outline" })).toBeVisible();
  },
  // The Data place: the frames of the run, and a frame as a table.
  "the-data-place": async (page, press) => {
    await scratch(page, press);
    await press(page.getByRole("button", { name: "Run", exact: true }));
    await expect(page.getByRole("status")).toHaveText("done");
    await press(places(page).getByRole("button", { name: "Data" }));
    await expect(page.getByRole("grid")).toBeVisible();
  },
  // The Plots place: the strip of the run's plots, one drawn large, and its facts.
  "the-plots-place": async (page, press) => {
    await scratch(page, press);
    await press(page.getByRole("button", { name: "Run", exact: true }));
    await expect(page.getByRole("status")).toHaveText("done");
    await press(places(page).getByRole("button", { name: "Plots" }));
    await expect(page.getByRole("list", { name: "Plots of the last run" })).toBeVisible();
  },
  // Commands: the list of commands, before anything is typed.
  "the-commands": async (page, press) => {
    await scratch(page, press);
    await page.keyboard.press("ControlOrMeta+k");
    await expect(page.getByRole("dialog", { name: "Commands" })).toBeVisible();
  },
  // Keyboard shortcuts: the console line, a statement typed and run in it.
  "the-console-line": async (page, press) => {
    await scratch(page, press);
    await press(page.getByRole("button", { name: "Run", exact: true }));
    await expect(page.getByRole("status")).toHaveText("done");
    await press(page.getByRole("button", { name: "Fold all", exact: true }));
    await page.keyboard.press("Control+Backquote");
    await page.keyboard.type("print(6 * 7)");
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("log", { name: "Console output" }).getByTestId("entry"),
    ).toHaveCount(1);
  },
  // Exporting and opening a project: the menu of a project's row on the screen of projects.
  "the-menu-of-a-project": async (page, press) => {
    await page.goto("/app/");
    await press(page.getByRole("button", { name: "New project…" }));
    await page.getByLabel("The name of the new project").fill("Returns to schooling");
    await press(page.getByRole("button", { name: "Create" }));
    await expect(page.getByRole("status")).toHaveText(READY);
    await press(page.getByTitle("Back to the projects of this browser"));
    await press(page.getByRole("button", { name: "Actions for Returns to schooling" }));
    await expect(page.getByRole("menuitem", { name: "Export project…" })).toBeVisible();
  },
  // Where the work is kept: the screen of projects, with its sentence on where they are kept.
  "the-screen-of-projects": async (page) => {
    await page.goto("/app/");
    await expect(page.getByRole("button", { name: /^Scratch project/ })).toBeVisible();
  },
  // Reporting a problem: the report of a script that fails, shown whole.
  "the-report": async (page, press) => {
    await scratch(page, press);
    await write(page, FAILING);
    await press(page.getByRole("button", { name: "Run", exact: true }));
    await expect(page.getByRole("status")).toHaveText(/^ended with exit code \d$/);
    await page.keyboard.press("ControlOrMeta+k");
    await page.getByRole("combobox", { name: "Type a command" }).fill("report a problem");
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("dialog", { name: "Report a problem" }).getByTestId("report-text"),
    ).toBeVisible();
  },
  // Finding help: a name of R typed in the search field of Help.
  "search-in-help": async (page, press) => {
    await scratch(page, press);
    await press(
      page.getByRole("navigation", { name: "Places" }).getByRole("button", { name: "Help" }),
    );
    await expect(page.getByTestId("help-counts")).toBeVisible();
    await page.getByRole("combobox", { name: /^Search Help/ }).pressSequentially("lm");
    await expect(page.getByRole("listbox", { name: "What was found" })).toBeVisible();
  },
};

/** A picture as the browser itself compresses it: no tool beside the test browser is needed. */
async function compressed(page: Page, png: Buffer): Promise<Buffer> {
  const blank = await page.context().newPage();
  const data = await blank.evaluate(
    async ([base64, kept]) => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext("2d")?.drawImage(image, 0, 0);
      return canvas.toDataURL("image/webp", kept).split(",")[1] ?? "";
    },
    [png.toString("base64"), KEPT] as const,
  );
  await blank.close();
  return Buffer.from(data, "base64");
}

for (const [name, scene] of Object.entries(SCENES)) {
  test(`the picture ${name}`, async ({ page, press }) => {
    await page.setViewportSize(SIZE);
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await scene(page, press);
    // The pointer out of the way, and the page given a moment to finish drawing.
    await page.mouse.move(0, 0);
    await page.waitForTimeout(400);
    const picture = await compressed(page, await page.screenshot({ type: "png" }));
    expect(picture.length).toBeGreaterThan(4_000);
    mkdirSync(folder, { recursive: true });
    writeFileSync(`${folder}${name}.webp`, picture);
  });
}
