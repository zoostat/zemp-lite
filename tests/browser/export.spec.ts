// A project given to the computer (open decision #208; release 0.2.2, step 3): **Export
// project…** from ⌘K in a project and from a project's row of the start screen. The zip is
// read back here by the reader of this repository and by a reference, Python's `zipfile`.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import type { Download, Page } from "@playwright/test";
import { readZip } from "../../src/project/zip";
import { expect, scriptText, test, write } from "./support";

const READY = "engine Zeff 0.9.0 ready";
const LIMITS = { whole: 50_000_000, entries: 1_000 };
const scratch = (file: string) =>
  readFileSync(new URL(`../../examples/scratch/${file}`, import.meta.url), "utf8");

/** What a downloaded zip holds, by this repository's reader: each file's text by its path, and its empty folders. */
async function held(download: Download) {
  const path = await download.path();
  const zip = await readZip(new Uint8Array(readFileSync(path)), LIMITS);
  const decoder = new TextDecoder();
  return {
    path,
    files: Object.fromEntries(zip.files.map((file) => [file.path, decoder.decode(file.bytes)])),
    folders: zip.folders,
  };
}

/** The names a reference reader finds in a zip, after testing every file's CRC. */
function reference(path: string): string[] {
  const script =
    "import json, sys, zipfile\nz = zipfile.ZipFile(sys.argv[1])\nassert z.testzip() is None\n" +
    "print(json.dumps(sorted(z.namelist())))";
  const ran = spawnSync("python3", ["-I", "-c", script, path], { encoding: "utf8" });
  if (ran.status !== 0) throw new Error(`the reference failed: ${ran.stderr}`);
  return JSON.parse(ran.stdout) as string[];
}

async function palette(page: Page, command: string) {
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByRole("combobox", { name: "Type a command" }).fill(command);
  await page.keyboard.press("Enter");
}

test("Export project…, from ⌘K, gives the project as a zip: its files, what a run wrote, and nothing of the app's own", async ({
  page,
  press,
}) => {
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  // A script that writes a file, typed and at once exported: what is typed is saved first.
  const typed =
    'let pay = frame(educ = [10.0, 12], wage = [11.0, 14])\npay.save("pay.csv")\n// typed just now\n';
  await write(page, typed);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    palette(page, "Project: export"),
  ]);
  expect(download.suggestedFilename()).toBe("Scratch.zip");
  await expect(page.getByRole("status")).toHaveText("exported as Scratch.zip");
  const zip = await held(download);
  // One folder of the project's name: its manifest, its scripts as they stand, what the run
  // wrote, and the empty folder of its data.
  expect(Object.keys(zip.files).sort()).toEqual([
    "Scratch/output/pay.csv",
    "Scratch/scripts/instruments.zeff",
    "Scratch/scripts/main.zeff",
    "Scratch/scripts/plots.zeff",
    "Scratch/zeff.toml",
  ]);
  expect(zip.folders).toEqual(["Scratch/data"]);
  expect(zip.files["Scratch/scripts/main.zeff"]).toBe(typed);
  expect(zip.files["Scratch/scripts/instruments.zeff"]).toBe(scratch("scripts/instruments.zeff"));
  expect(zip.files["Scratch/scripts/plots.zeff"]).toBe(scratch("scripts/plots.zeff"));
  // The manifest is the one `zeff new` writes (a unit test holds it to that, to the character).
  expect(zip.files["Scratch/zeff.toml"]).toBe(
    "[project]\n" +
      'name = "Scratch"          # the project\'s name\n' +
      'zeff = "0.9.0"            # the engine this project runs on, exactly\n' +
      'edition = "preview"       # "2027" from Zeff 1.0.0\n',
  );
  expect(zip.files["Scratch/output/pay.csv"]).toBe("educ,wage\n10.0,11.0\n12.0,14.0\n");
  // Nothing of the interface's view state or the engine's own folder.
  expect(Object.keys(zip.files).filter((path) => /\/\.zemp\/|\/\.zeff\//.test(path))).toEqual([]);
  // The reference reads the same names, every file's CRC holding.
  expect(reference(zip.path)).toEqual([
    "Scratch/data/",
    "Scratch/output/pay.csv",
    "Scratch/scripts/instruments.zeff",
    "Scratch/scripts/main.zeff",
    "Scratch/scripts/plots.zeff",
    "Scratch/zeff.toml",
  ]);
  // The script is as it was: exporting writes nothing into it.
  await expect.poll(() => scriptText(page)).toBe(typed);
});

test("a project's row of the start screen has a menu, by the mouse and by the keyboard, that exports it without opening it", async ({
  page,
  press,
}) => {
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await press(page.getByRole("button", { name: "Projects ▾" }));
  const recent = page.getByRole("region", { name: "Recent projects" });
  const more = recent.getByRole("button", { name: "Actions for Scratch" });
  await expect(more).toHaveAttribute("aria-expanded", "false");
  // By the mouse.
  await press(more);
  const menu = page.getByRole("menu", { name: "Actions for Scratch" });
  await expect(menu.getByRole("menuitem")).toHaveText(["Duplicate…", "Export project…", "Reset…"]);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    press(menu.getByRole("menuitem", { name: "Export project…" })),
  ]);
  expect(download.suggestedFilename()).toBe("Scratch.zip");
  await expect(recent.getByRole("status")).toHaveText("Scratch exported as Scratch.zip");
  expect(Object.keys((await held(download)).files)).toContain("Scratch/scripts/main.zeff");
  // The project was not opened: the start screen is still shown, and the menu is closed.
  await expect(menu).toHaveCount(0);
  await expect(page.getByRole("button", { name: "New project…" })).toBeVisible();
  // By the keyboard: the button is a stop of the Tab key; Enter opens the list with its first
  // item in focus; Escape closes it and gives focus back; Enter on the item exports.
  await more.focus();
  await page.keyboard.press("Enter");
  await expect(menu.getByRole("menuitem").first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(more).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(menu.getByRole("menuitem").first()).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("menuitem", { name: "Export project…" })).toBeFocused();
  const [again] = await Promise.all([page.waitForEvent("download"), page.keyboard.press("Enter")]);
  expect(again.suggestedFilename()).toBe("Scratch.zip");
  await expect(more).toBeFocused();
  // A press elsewhere closes the list.
  await press(more);
  await expect(menu).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(menu).toHaveCount(0);
  // The row itself still opens the project.
  await press(recent.getByRole("button", { name: /^Scratch/ }).first());
  await expect(page.getByRole("status")).toHaveText(READY);
});
