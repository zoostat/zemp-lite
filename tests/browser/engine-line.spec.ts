// A project that names another engine than the one Zemp Lite carries (release 0.3, step 3b).
// A project runs on the engine its `zeff.toml` names and on no other (Engine Specification,
// section 2); a browser carries one engine. So such a project opens as any project does, a
// line under the bar says which engine it names and offers to move it, the engine refuses a
// run in its own words (Z0710) until it is moved, and the move rewrites the one line of the
// manifest. The Scratch project, the app's own example, is moved without the asking.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Locator, Page } from "@playwright/test";
import {
  expect,
  faintText,
  printed,
  projectButton,
  scriptText,
  smallestText,
  test,
  wholeScript,
  write,
} from "./support";

const READY = "engine Zeff 0.9.0 ready";
const kept = (name: string) =>
  readFileSync(new URL(`../scripts/pin/${name}`, import.meta.url), "utf8");
/** The manifest `zeff new demo` of the released 0.8.0 wrote. */
const OF_080 = kept("zeff.toml");
/** What the released `zeff run` of 0.9.0 says of a project that holds it. */
const REFUSAL = kept("another-engine.stderr");
const SCRIPT = 'print("made on an earlier engine")\n';

const folder = mkdtempSync(join(tmpdir(), "zemp-engine-line-"));
test.afterAll(() => rmSync(folder, { recursive: true, force: true }));

/** A project of the earlier engine as **Export project…** would have written it then. */
function zipOf080(): string {
  const path = join(folder, "demo.zip");
  const ran = spawnSync(
    "python3",
    [
      "-I",
      "-c",
      "import sys, zipfile\n" +
        "z = zipfile.ZipFile(sys.argv[1], 'w', zipfile.ZIP_DEFLATED)\n" +
        "z.writestr('demo/zeff.toml', sys.argv[2])\n" +
        "z.writestr('demo/scripts/main.zeff', sys.argv[3])\nz.close()",
      path,
      OF_080,
      SCRIPT,
    ],
    { encoding: "utf8" },
  );
  if (ran.status !== 0) throw new Error(`the reference failed: ${ran.stderr}`);
  return path;
}

const line = (page: Page) => page.getByTestId("engine-line");
const run = (page: Page) => page.getByRole("button", { name: "Run", exact: true });
const tree = (page: Page) =>
  page
    .getByRole("complementary", { name: "Script: the left pane" })
    .getByRole("region", { name: "Project" });

async function palette(page: Page, command: string) {
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByRole("combobox", { name: "Type a command" }).fill(command);
  await page.keyboard.press("Enter");
}

async function showProject(page: Page, press: (target: Locator) => Promise<void>) {
  await press(
    page
      .getByRole("toolbar", { name: "Script: its panes and its controls" })
      .getByRole("button", { name: "Project", exact: true }),
  );
  await expect(tree(page)).toBeVisible();
}

/** The manifest as the project now holds it, saved to the computer from its row's menu. */
async function manifestOf(page: Page, press: (target: Locator) => Promise<void>): Promise<string> {
  await press(page.getByRole("button", { name: "Actions for zeff.toml", exact: true }));
  const [saved] = await Promise.all([
    page.waitForEvent("download"),
    press(page.getByRole("menuitem", { name: "Save a copy…" })),
  ]);
  return readFileSync(await saved.path(), "utf8");
}

test("a project that names another engine says so, is refused a run in the engine's words, and runs once it is moved", async ({
  page,
  press,
}) => {
  await page.goto("/");
  await page.getByLabel("A project's zip to open").setInputFiles(zipOf080());
  await expect(page).toHaveURL(/#\/p\/demo$/);
  // It opens as any project does: its name, its script, the engine ready.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("demo");
  await expect(page.getByRole("status")).toHaveText(READY);
  await expect.poll(() => scriptText(page)).toBe(SCRIPT);
  // The line under the bar, in plain words, with the one way on.
  await expect(line(page)).toHaveText(
    "This project names Zeff 0.8.0 in its zeff.toml, and Zemp Lite carries Zeff 0.9.0. A project runs only on the engine it names. Move to Zeff 0.9.0",
  );
  await expect(line(page)).toHaveAttribute("role", "note");
  const move = line(page).getByRole("button", { name: "Move to Zeff 0.9.0", exact: true });
  await expect(move).toBeVisible();
  await expect(page.getByTestId("engine-said")).toHaveCount(0);
  // A run is refused, in the words of the command line, and nothing is printed.
  await press(run(page));
  await expect(page.getByRole("status")).toHaveText("ended with exit code 4");
  expect(await printed(page)).toBe("");
  // The line now carries the engine's own first line, as `zeff run` of 0.9.0 writes it.
  await expect(page.getByTestId("engine-said")).toHaveText(REFUSAL.split("\n")[0]!);
  expect(REFUSAL.split("\n")[0]).toBe(
    "error[Z0710]: this project needs Zeff 0.8.0, but this is Zeff 0.9.0",
  );
  // The line keeps to the sizes and the contrast, in both themes.
  expect(await smallestText(page)).toBeGreaterThanOrEqual(12.5);
  expect(await faintText(line(page))).toEqual([]);
  await palette(page, "Theme: dark");
  expect(await faintText(line(page))).toEqual([]);
  await palette(page, "Theme: light");
  // Moved, from the keyboard: the button is a stop of the Tab key, and Enter presses it.
  await move.focus();
  await expect(move).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(line(page)).toHaveText(
    "This project now names Zeff 0.9.0; it named 0.8.0. Run it to see its results on this engine. Close",
  );
  expect(await faintText(line(page))).toEqual([]);
  // It runs, and prints what its script prints.
  await press(run(page));
  await expect(page.getByRole("status")).toHaveText("done");
  await wholeScript(page);
  expect(await printed(page)).toBe("made on an earlier engine\n");
  // The line is closed, and does not come back: the project names this engine now.
  await press(line(page).getByRole("button", { name: "Close", exact: true }));
  await expect(line(page)).toHaveCount(0);
  await expect(page.getByText("saving")).toHaveCount(0);
  // Left, and opened again from its row of the start screen.
  await press(page.getByRole("button", { name: "All projects" }));
  await press(projectButton(page, "demo"));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("demo");
  await expect(page.getByRole("status")).toHaveText(READY);
  await expect(line(page)).toHaveCount(0);
  // The manifest: the version alone rewritten, the comment at its column, as this engine's
  // own `zeff new demo` writes it.
  await showProject(page, press);
  expect(await manifestOf(page, press)).toBe(OF_080.replace('"0.8.0"', '"0.9.0"'));
});

test("the manifest edited by hand names what it names: the line comes and goes with it, and ⌘K has the move", async ({
  page,
  press,
}) => {
  await page.goto("/");
  await page.getByLabel("A project's zip to open").setInputFiles(zipOf080());
  await expect(page.getByRole("status")).toHaveText(READY);
  await expect(line(page)).toBeVisible();
  // The reader writes this engine into the manifest: the line goes.
  await showProject(page, press);
  await press(tree(page).getByRole("button", { name: /^zeff\.toml/ }));
  await expect.poll(() => scriptText(page)).toBe(OF_080);
  await write(page, OF_080.replace('"0.8.0"', '"0.9.0"'));
  await expect(line(page)).toHaveCount(0);
  // And another engine again: it is back, and the move is a command too.
  await write(page, OF_080.replace('"0.8.0"', '"0.7.0"'));
  await expect(line(page)).toContainText("This project names Zeff 0.7.0");
  await palette(page, "Project: move to Zeff 0.9.0");
  await expect(line(page)).toContainText("This project now names Zeff 0.9.0; it named 0.7.0.");
  // The open tab shows the manifest as it now is.
  await expect.poll(() => scriptText(page)).toBe(OF_080.replace('"0.8.0"', '"0.9.0"'));
});

test("the Scratch project of an earlier visit is moved to this engine without the asking", async ({
  page,
  press,
}) => {
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await expect(line(page)).toHaveCount(0);
  // As an earlier visit left it: its manifest names the engine of that visit.
  await showProject(page, press);
  await press(tree(page).getByRole("button", { name: /^zeff\.toml/ }));
  await expect.poll(() => scriptText(page)).toContain('zeff = "0.9.0"');
  const now = await scriptText(page);
  await write(page, now.replace('"0.9.0"', '"0.8.0"'));
  await expect(line(page)).toContainText("This project names Zeff 0.8.0");
  await expect(page.getByText("saving")).toHaveCount(0);
  // Left, and opened again from the start screen: it names this engine, and runs.
  await press(page.getByRole("button", { name: "All projects" }));
  await press(projectButton(page, "Scratch"));
  await expect(page.getByRole("status")).toHaveText(READY);
  await expect(line(page)).toHaveCount(0);
  await expect.poll(() => scriptText(page)).toBe(now);
  await press(tree(page).getByRole("button", { name: /^main\.zeff/ }));
  await press(run(page));
  await expect(page.getByRole("status")).toHaveText("done");
});
