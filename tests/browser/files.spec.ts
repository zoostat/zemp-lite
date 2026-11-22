// The files and folders of a project, from the menu of each row of the Project pane (open
// decision #208; release 0.2.2, step 4): a file saved to the computer as it is, a folder as a
// zip, by the mouse and by the keyboard alone.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import type { Download, Page } from "@playwright/test";
import { readZip } from "../../src/project/zip";
import { expect, test, write } from "./support";

const READY = "engine Zeff 0.8.0 ready";
const LIMITS = { whole: 50_000_000, entries: 1_000 };

const tree = (page: Page) =>
  page
    .getByRole("complementary", { name: "Script: the left pane" })
    .getByRole("region", { name: "Project" });
const more = (page: Page, path: string) =>
  tree(page).getByRole("button", { name: `Actions for ${path}`, exact: true });
const menu = (page: Page, path: string) =>
  page.getByRole("menu", { name: `Actions for ${path}`, exact: true });

/** A project open on a script that has written a figure and a frame, with the Project pane shown. */
async function opened(page: Page, press: (target: ReturnType<Page["locator"]>) => Promise<void>) {
  await page.goto("/");
  await press(page.getByRole("button", { name: "Scratch project" }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await press(
    page
      .getByRole("toolbar", { name: "Script: its panes and its controls" })
      .getByRole("button", { name: "Project", exact: true }),
  );
  await expect(tree(page)).toBeVisible();
}

const SCRIPT =
  "let pay = frame(educ = [10.0, 12, 14, 16], wage = [11.0, 14, 19, 26])\n" +
  'pay.plot(x: educ, y: wage).points().export("output/figure.svg", size: [120, 80])\n' +
  'pay.save("pay.csv")\n';

const bytesOf = async (download: Download) => new Uint8Array(readFileSync(await download.path()));
const textOf = async (download: Download) => new TextDecoder().decode(await bytesOf(download));

test("a file's row has a menu that saves a copy of it to the computer: a script, a data file, what a run wrote", async ({
  page,
  press,
}) => {
  await opened(page, press);
  await write(page, SCRIPT);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  // A script, as it stands: what was typed is saved first.
  await press(more(page, "scripts/main.zeff"));
  await expect(menu(page, "scripts/main.zeff").getByRole("menuitem")).toHaveText(["Save a copy…"]);
  const [script] = await Promise.all([
    page.waitForEvent("download"),
    press(menu(page, "scripts/main.zeff").getByRole("menuitem", { name: "Save a copy…" })),
  ]);
  expect(script.suggestedFilename()).toBe("main.zeff");
  expect(await textOf(script)).toBe(SCRIPT);
  await expect(page.getByRole("status")).toHaveText("saved as main.zeff");
  // A figure and a frame the run wrote, each the bytes the engine wrote.
  await press(more(page, "output/figure.svg"));
  const [figure] = await Promise.all([
    page.waitForEvent("download"),
    press(menu(page, "output/figure.svg").getByRole("menuitem", { name: "Save a copy…" })),
  ]);
  expect(figure.suggestedFilename()).toBe("figure.svg");
  const drawn = await textOf(figure);
  expect(drawn).toMatch(/^<\?xml[^>]*\?>\n<svg [^>]*width="340\.157pt" height="226\.772pt"/);
  expect(drawn.trimEnd().endsWith("</svg>")).toBe(true);
  await press(more(page, "output/pay.csv"));
  const [frame] = await Promise.all([
    page.waitForEvent("download"),
    press(menu(page, "output/pay.csv").getByRole("menuitem", { name: "Save a copy…" })),
  ]);
  expect(await textOf(frame)).toBe("educ,wage\n10.0,11.0\n12.0,14.0\n14.0,19.0\n16.0,26.0\n");
  // A data file put in from the computer comes back as it went in, whatever its bytes.
  const put = new Uint8Array(300).map((_, at) => (at * 7) % 256);
  await tree(page)
    .getByLabel("Data files to add")
    .setInputFiles({
      name: "raw.bin",
      mimeType: "application/octet-stream",
      buffer: Buffer.from(put),
    });
  await press(more(page, "data/raw.bin"));
  const [data] = await Promise.all([
    page.waitForEvent("download"),
    press(menu(page, "data/raw.bin").getByRole("menuitem", { name: "Save a copy…" })),
  ]);
  expect(data.suggestedFilename()).toBe("raw.bin");
  expect([...(await bytesOf(data))]).toEqual([...put]);
  // The file shown is saved from ⌘K too.
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByRole("combobox", { name: "Type a command" }).fill("save a copy of main.zeff");
  const [again] = await Promise.all([page.waitForEvent("download"), page.keyboard.press("Enter")]);
  expect(await textOf(again)).toBe(SCRIPT);
});

test("a folder's row has a menu that saves the folder as a zip, by the keyboard alone", async ({
  page,
  press,
}) => {
  await opened(page, press);
  await write(page, SCRIPT);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  // The button is a stop of the Tab key, named for its row; Enter opens its list with the
  // first item in focus; Escape closes it and gives the focus back.
  const button = more(page, "output");
  await button.focus();
  await expect(button).toBeFocused();
  await page.keyboard.press("Enter");
  const item = menu(page, "output").getByRole("menuitem", { name: "Save as a zip…" });
  await expect(item).toBeFocused();
  await expect(menu(page, "output").getByRole("menuitem")).toHaveText(["Save as a zip…"]);
  await page.keyboard.press("Escape");
  await expect(menu(page, "output")).toHaveCount(0);
  await expect(button).toBeFocused();
  await page.keyboard.press("Enter");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.keyboard.press("Enter"),
  ]);
  expect(download.suggestedFilename()).toBe("output.zip");
  await expect(page.getByRole("status")).toHaveText("saved as output.zip");
  await expect(button).toBeFocused();
  // The zip holds the folder, under its name, and a reference reads it.
  const path = await download.path();
  const zip = await readZip(new Uint8Array(readFileSync(path)), LIMITS);
  expect(zip.files.map((file) => file.path)).toEqual(["output/figure.svg", "output/pay.csv"]);
  expect(new TextDecoder().decode(zip.files[1]?.bytes)).toBe(
    "educ,wage\n10.0,11.0\n12.0,14.0\n14.0,19.0\n16.0,26.0\n",
  );
  const script =
    "import json, sys, zipfile\nz = zipfile.ZipFile(sys.argv[1])\nassert z.testzip() is None\n" +
    "print(json.dumps(sorted(z.namelist())))";
  const ran = spawnSync("python3", ["-I", "-c", script, path], { encoding: "utf8" });
  expect(JSON.parse(ran.stdout)).toEqual(["output/figure.svg", "output/pay.csv"]);
  // A folder that holds nothing is a zip of that folder; opening a menu folds nothing.
  await more(page, "data").focus();
  await page.keyboard.press("Enter");
  const [empty] = await Promise.all([page.waitForEvent("download"), page.keyboard.press("Enter")]);
  expect(empty.suggestedFilename()).toBe("data.zip");
  expect((await readZip(new Uint8Array(readFileSync(await empty.path())), LIMITS)).folders).toEqual(
    ["data"],
  );
  await expect(tree(page).getByRole("button", { name: "scripts", exact: true })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
});
