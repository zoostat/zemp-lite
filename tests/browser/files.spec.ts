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
  await expect(menu(page, "output").getByRole("menuitem").first()).toBeFocused();
  await expect(menu(page, "output").getByRole("menuitem").last()).toHaveText("Save as a zip…");
  // The End key goes to the last of the list, Home to the first, and the arrows go round.
  await page.keyboard.press("End");
  await expect(item).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(menu(page, "output").getByRole("menuitem").first()).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(item).toBeFocused();
  await page.keyboard.press("Home");
  await expect(menu(page, "output").getByRole("menuitem").first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu(page, "output")).toHaveCount(0);
  await expect(button).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("End");
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
  await page.keyboard.press("End");
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

const adding = (page: Page) =>
  tree(page).getByRole("button", { name: "Add to the project", exact: true });
const header = (page: Page) => page.locator("header.top");

test("a script and a folder are made from the Project pane, each named in the row where it will stand", async ({
  page,
  press,
}) => {
  await opened(page, press);
  // The pane's + lists what can be made: a script, a folder, files from the computer.
  await press(adding(page));
  await expect(
    page.getByRole("menu", { name: "Add to the project" }).getByRole("menuitem"),
  ).toHaveText(["New script", "New folder", "Add files…"]);
  await press(page.getByRole("menuitem", { name: "New script" }));
  const name = tree(page).getByRole("textbox", { name: "The name of the new script" });
  await expect(name).toBeFocused();
  // A name that is taken is refused in the row, in a sentence, and nothing is made.
  await name.fill("main");
  await name.press("Enter");
  await expect(tree(page).getByRole("alert")).toHaveText(
    "`scripts/main.zeff` is already in this project. Choose another name.",
  );
  await expect(tree(page).getByRole("button", { name: /^\S+\.zeff/ })).toHaveCount(3);
  // Typing takes the sentence away; a name that is free makes the script, with `.zeff`, and opens it.
  await name.fill("robustness");
  await expect(tree(page).getByRole("alert")).toHaveCount(0);
  await name.press("Enter");
  await expect(name).toHaveCount(0);
  await expect(tree(page).getByRole("button", { name: /^robustness\.zeff/ })).toHaveClass(/\bon\b/);
  await expect(header(page)).toContainText("robustness.zeff");
  // It is a script of the project: what is typed in it runs.
  await write(page, "print(6 * 7)\n");
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await expect(page.getByTestId("printed")).toHaveText("42\n");
  // A folder in the project; then, from that folder's own menu, a script in it.
  await press(adding(page));
  await press(page.getByRole("menuitem", { name: "New folder" }));
  const folder = tree(page).getByRole("textbox", { name: "The name of the new folder" });
  await folder.fill("Data");
  await folder.press("Enter");
  await expect(tree(page).getByRole("alert")).toContainText(
    "differs from that name only in capitals",
  );
  await folder.fill("drafts");
  await folder.press("Enter");
  await expect(tree(page).getByRole("button", { name: "drafts", exact: true })).toBeVisible();
  await press(more(page, "drafts"));
  await expect(menu(page, "drafts").getByRole("menuitem")).toHaveText([
    "New script",
    "New folder",
    "Add files…",
    "Save as a zip…",
  ]);
  await press(menu(page, "drafts").getByRole("menuitem", { name: "New script" }));
  await name.fill("idea.zeff");
  await name.press("Enter");
  await expect(header(page)).toContainText("idea.zeff");
  await expect(
    tree(page).getByRole("button", { name: "Actions for drafts/idea.zeff" }),
  ).toBeVisible();
  // Escape, or Cancel, makes nothing.
  await press(adding(page));
  await press(page.getByRole("menuitem", { name: "New folder" }));
  await folder.fill("never");
  await folder.press("Escape");
  await expect(folder).toHaveCount(0);
  await expect(tree(page).getByRole("button", { name: "never", exact: true })).toHaveCount(0);
});

test("by the keyboard alone a folder is made and files are added into it, which a run then reads", async ({
  page,
  press,
}) => {
  await opened(page, press);
  // The + is a stop of the Tab key: Enter opens its list, the arrow goes down it, Enter chooses.
  await adding(page).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menuitem", { name: "New script" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "New folder" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    tree(page).getByRole("textbox", { name: "The name of the new folder" }),
  ).toBeFocused();
  await page.keyboard.type("survey");
  await page.keyboard.press("Enter");
  await expect(tree(page).getByRole("button", { name: "survey", exact: true })).toBeVisible();
  // Files from the computer, into that folder and not `data/`.
  await more(page, "survey").focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(menu(page, "survey").getByRole("menuitem", { name: "Add files…" })).toBeFocused();
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.keyboard.press("Enter"),
  ]);
  await chooser.setFiles([
    {
      name: "pay.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("id,wage\n1,23.5\n2,19\n3,31.25\n"),
    },
    { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("three rows") },
  ]);
  await expect(
    tree(page).getByRole("button", { name: "Actions for survey/pay.csv" }),
  ).toBeVisible();
  await expect(
    tree(page).getByRole("button", { name: "Actions for survey/notes.txt" }),
  ).toBeVisible();
  await expect(tree(page).getByRole("button", { name: "Actions for data/pay.csv" })).toHaveCount(0);
  // Adding writes no `import`: the script is as it was, and the reader writes it.
  await write(page, 'print(import("survey/pay.csv").mean(wage))\n');
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await expect(page.getByTestId("printed")).toHaveText("24.5833\n");
  // The language engine has the file too: a variable it does not hold is underlined as it is
  // typed, and one it holds is not.
  await write(page, 'let pay = import("survey/pay.csv")\nprint(pay.mean(wge))\n');
  await expect(page.locator(".cm-lintRange-error")).toHaveText(["wge"]);
  await write(page, 'let pay = import("survey/pay.csv")\nprint(pay.mean(wage))\n');
  await expect(page.locator(".cm-lintRange-error")).toHaveCount(0);
  // A second file of a name already there is refused, in a sentence, and the first is kept.
  const [again] = await Promise.all([
    page.waitForEvent("filechooser"),
    (async () => {
      await more(page, "survey").focus();
      await page.keyboard.press("Enter");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
    })(),
  ]);
  await again.setFiles([{ name: "PAY.csv", mimeType: "text/csv", buffer: Buffer.from("x\n") }]);
  await expect(tree(page).getByRole("alert")).toContainText(
    "`survey/pay.csv` is already in this project, and differs from that name only in capitals",
  );
  // The pane's own + still adds into `data/`, as it did.
  await tree(page)
    .getByLabel("Data files to add")
    .setInputFiles({ name: "more.csv", mimeType: "text/csv", buffer: Buffer.from("id\n7\n") });
  await expect(tree(page).getByRole("button", { name: "Actions for data/more.csv" })).toBeVisible();
});
