// The files and folders of a project, from the menu of each row of the Project pane (open
// decision #208; release 0.2.2, step 4): a file saved to the computer as it is, a folder as a
// zip, by the mouse and by the keyboard alone.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import type { Download, Page } from "@playwright/test";
import { readZip } from "../../src/project/zip";
import { expect, scriptText, test, write } from "./support";

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
  await expect(menu(page, "scripts/main.zeff").getByRole("menuitem")).toHaveText([
    "Duplicate",
    "Save a copy…",
  ]);
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
    "Rename…",
    "Move to…",
    "Duplicate",
    "Delete…",
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
  await expect(menu(page, "survey").getByRole("menuitem").first()).toBeFocused();
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
      await expect(menu(page, "survey").getByRole("menuitem").first()).toBeFocused();
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      await expect(
        menu(page, "survey").getByRole("menuitem", { name: "Add files…" }),
      ).toBeFocused();
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

test("a script is renamed while it is open and being edited: nothing typed is lost, its results stay with it, and it runs", async ({
  page,
  press,
}) => {
  await opened(page, press);
  await press(adding(page));
  await press(page.getByRole("menuitem", { name: "New script" }));
  const naming = tree(page).getByRole("textbox", { name: "The name of the new script" });
  await naming.fill("clean");
  await naming.press("Enter");
  await expect(header(page)).toContainText("clean.zeff");
  await write(page, "let pay = frame(a = [1.0, 2])\nprint(pay.mean(a))\n");
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await expect(page.getByTestId("printed")).toHaveText("1.5\n");
  // A line typed, and the rename asked for at once, by the keyboard alone: what is typed is
  // saved first.
  await page.getByRole("textbox", { name: "The script", exact: true }).focus();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.insertText("// typed just before the rename");
  const button = more(page, "scripts/clean.zeff");
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(menu(page, "scripts/clean.zeff").getByRole("menuitem")).toHaveText([
    "Rename…",
    "Move to…",
    "Duplicate",
    "Delete…",
    "Save a copy…",
  ]);
  await page.keyboard.press("Enter");
  // The name stands in the row, its ending left alone: what is typed takes the name's place.
  const name = tree(page).getByRole("textbox", { name: "The new name of clean.zeff" });
  await expect(name).toBeFocused();
  await expect(name).toHaveValue("clean.zeff");
  expect(
    await name.evaluate((box: HTMLInputElement) => [box.selectionStart, box.selectionEnd]),
  ).toEqual([0, 5]);
  // A name that is taken is refused in the row, and nothing is renamed.
  await page.keyboard.type("main");
  await page.keyboard.press("Enter");
  await expect(tree(page).getByRole("alert")).toHaveText(
    "`scripts/main.zeff` is already in this project. Choose another name.",
  );
  await expect(more(page, "scripts/clean.zeff")).toBeVisible();
  await name.fill("tidy.zeff");
  await expect(tree(page).getByRole("alert")).toHaveCount(0);
  await name.press("Enter");
  await expect(name).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveText("renamed to tidy.zeff");
  // The file is the same file under its new name: open, marked, with what was typed.
  await expect(more(page, "scripts/clean.zeff")).toHaveCount(0);
  await expect(tree(page).getByRole("button", { name: /^tidy\.zeff/ })).toHaveClass(/\bon\b/);
  await expect(header(page)).toContainText("tidy.zeff");
  expect(await scriptText(page)).toBe(
    "let pay = frame(a = [1.0, 2])\nprint(pay.mean(a))\n// typed just before the rename",
  );
  // The results of its run are still under its statements.
  await expect(page.getByTestId("printed")).toHaveText("1.5\n");
  await expect(page.locator('[data-testid="note"][data-line="1"]')).toContainText("pay");
  // And it runs under its new name: the engine has it there.
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await expect(page.getByTestId("run-facts")).toHaveText(/^run 2 · /);
  // Saved to the computer, it is the text as it stands, under its new name.
  await press(more(page, "scripts/tidy.zeff"));
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    press(menu(page, "scripts/tidy.zeff").getByRole("menuitem", { name: "Save a copy…" })),
  ]);
  expect(download.suggestedFilename()).toBe("tidy.zeff");
  expect(await textOf(download)).toBe(
    "let pay = frame(a = [1.0, 2])\nprint(pay.mean(a))\n// typed just before the rename",
  );
  // Escape leaves a rename; what the engine and Zemp open by name is not renamed, moved or
  // deleted, and has no such items (a copy of it can be made); ⌘K
  // renames the file shown, in its row.
  await press(more(page, "scripts/tidy.zeff"));
  await press(menu(page, "scripts/tidy.zeff").getByRole("menuitem", { name: "Rename…" }));
  await tree(page).getByRole("textbox", { name: "The new name of tidy.zeff" }).press("Escape");
  await expect(tree(page).getByRole("textbox")).toHaveCount(0);
  await press(more(page, "scripts/main.zeff"));
  await expect(menu(page, "scripts/main.zeff").getByRole("menuitem")).toHaveText([
    "Duplicate",
    "Save a copy…",
  ]);
  await page.keyboard.press("Escape");
  await press(more(page, "zeff.toml"));
  await expect(menu(page, "zeff.toml").getByRole("menuitem")).toHaveText([
    "Duplicate",
    "Save a copy…",
  ]);
  await page.keyboard.press("Escape");
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByRole("combobox", { name: "Type a command" }).fill("rename tidy.zeff");
  await page.keyboard.press("Enter");
  await expect(
    tree(page).getByRole("textbox", { name: "The new name of tidy.zeff" }),
  ).toBeFocused();
});

test("a data file is moved to another folder: the line of a script that names it is said and gone to, and no script is rewritten", async ({
  page,
  press,
}) => {
  await opened(page, press);
  await tree(page)
    .getByLabel("Data files to add")
    .setInputFiles({
      name: "pay.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("id,wage\n1,23.5\n2,19\n3,31.25\n"),
    });
  const script =
    '// The pay of three workers.\n\nlet pay = import("data/pay.csv")\nprint(pay.mean(wage))\n';
  await write(page, script);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await expect(page.getByTestId("printed")).toHaveText("24.5833\n");
  await press(adding(page));
  await press(page.getByRole("menuitem", { name: "New folder" }));
  const folder = tree(page).getByRole("textbox", { name: "The name of the new folder" });
  await folder.fill("survey");
  await folder.press("Enter");
  // Move to… lists the folders it may go to: not the one it is in, and not Zemp's own.
  await press(more(page, "data/pay.csv"));
  await press(menu(page, "data/pay.csv").getByRole("menuitem", { name: "Move to…" }));
  const where = tree(page).getByRole("combobox", { name: "The folder to move pay.csv into" });
  await expect(where).toBeFocused();
  await expect(where.locator("option")).toHaveText([
    "the project's own folder",
    "scripts",
    "survey",
  ]);
  await where.selectOption("survey");
  await press(tree(page).getByRole("button", { name: "Move", exact: true }));
  await expect(page.getByRole("status")).toHaveText("moved to survey/pay.csv");
  await expect(more(page, "survey/pay.csv")).toBeVisible();
  await expect(more(page, "data/pay.csv")).toHaveCount(0);
  // The script that names the old path is said, with its line; a press goes there. The script
  // is not rewritten.
  const named = page.getByTestId("named");
  await expect(named).toContainText(
    "data/pay.csv is named in a line of the project's scripts, which is not changed:",
  );
  await press(named.getByRole("button", { name: "scripts/main.zeff, line 3" }));
  await expect(page.locator(".cm-lineNumbers .cm-activeLineGutter")).toHaveText("3");
  expect(await scriptText(page)).toBe(script);
  // The engine no longer has the file where the script names it, as `zeff run` would not.
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("ended with exit code 1");
  // The reader mends his script, and it runs; the language engine has the file at its new place.
  await write(page, script.replace("data/pay.csv", "survey/pay.csv"));
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await expect(page.getByTestId("printed")).toHaveText("24.5833\n");
  await write(page, script.replace("data/pay.csv", "survey/pay.csv").replace("wage)", "wge)"));
  await expect(page.locator(".cm-lintRange-error")).toHaveText(["wge"]);
  await press(named.getByRole("button", { name: "Dismiss" }));
  await expect(named).toHaveCount(0);
  // Moved back into the project's own folder by ⌘K's way to the row; a place taken is refused.
  await tree(page)
    .getByLabel("Data files to add")
    .setInputFiles({ name: "pay.csv", mimeType: "text/csv", buffer: Buffer.from("other\n") });
  await press(more(page, "survey/pay.csv"));
  await press(menu(page, "survey/pay.csv").getByRole("menuitem", { name: "Move to…" }));
  await where.selectOption("data");
  await press(tree(page).getByRole("button", { name: "Move", exact: true }));
  await expect(tree(page).getByRole("alert")).toHaveText(
    "`data/pay.csv` is already in this project. Choose another name.",
  );
  await expect(more(page, "survey/pay.csv")).toBeVisible();
  await press(tree(page).getByRole("button", { name: "Cancel", exact: true }));
  await expect(where).toHaveCount(0);
});

test("a file is duplicated beside itself, and deleted after one question in its row", async ({
  page,
  press,
}) => {
  await opened(page, press);
  const script = "let pay = frame(a = [1.0, 2])\nprint(pay.mean(a))\n// typed just before the copy";
  await write(page, script);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  // A copy beside it, under a name with "copy" in it, and a free one each time; what was typed
  // a moment before is in it. Even the main script can be copied: the copy is an ordinary file.
  await press(more(page, "scripts/main.zeff"));
  await press(menu(page, "scripts/main.zeff").getByRole("menuitem", { name: "Duplicate" }));
  await expect(page.getByRole("status")).toHaveText("copied as main copy.zeff");
  await press(more(page, "scripts/main.zeff"));
  await press(menu(page, "scripts/main.zeff").getByRole("menuitem", { name: "Duplicate" }));
  await expect(page.getByRole("status")).toHaveText("copied as main copy 2.zeff");
  await expect(more(page, "scripts/main copy.zeff")).toBeVisible();
  await expect(more(page, "scripts/main copy 2.zeff")).toBeVisible();
  // The script shown is still the one that was copied, with its results.
  await expect(header(page)).toContainText("main.zeff");
  await expect(page.getByTestId("printed")).toHaveText("1.5\n");
  // The copy opens, holds the text, and runs: the engine has it.
  await press(tree(page).getByRole("button", { name: /^main copy\.zeff/ }));
  await expect.poll(() => scriptText(page)).toBe(script);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  // Delete… asks once, in the row: what goes, and that it cannot be brought back.
  await press(more(page, "scripts/main copy.zeff"));
  await press(menu(page, "scripts/main copy.zeff").getByRole("menuitem", { name: "Delete…" }));
  const asked = tree(page).getByRole("group", { name: "Delete main copy.zeff?" });
  await expect(asked).toContainText("Delete main copy.zeff? It cannot be brought back.");
  await expect(asked.getByRole("button")).toHaveText(["Delete", "Keep"]);
  // The safe answer has the focus; Keep, and Escape, delete nothing.
  await expect(asked.getByRole("button", { name: "Keep" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(asked).toHaveCount(0);
  await expect(more(page, "scripts/main copy.zeff")).toBeVisible();
  await press(more(page, "scripts/main copy.zeff"));
  await press(menu(page, "scripts/main copy.zeff").getByRole("menuitem", { name: "Delete…" }));
  await page.keyboard.press("Escape");
  await expect(asked).toHaveCount(0);
  await expect(more(page, "scripts/main copy.zeff")).toBeVisible();
  // Delete deletes: the script that was shown gives its place to the main script, its results
  // going with it, and the status line says what went.
  await press(more(page, "scripts/main copy.zeff"));
  await press(menu(page, "scripts/main copy.zeff").getByRole("menuitem", { name: "Delete…" }));
  await press(asked.getByRole("button", { name: "Delete" }));
  await expect(page.getByRole("status")).toHaveText("deleted main copy.zeff");
  await expect(more(page, "scripts/main copy.zeff")).toHaveCount(0);
  await expect(header(page)).toContainText("main.zeff");
  await expect(header(page)).not.toContainText("copy");
  await expect.poll(() => scriptText(page)).toBe(script);
  await expect(page.getByTestId("printed")).toHaveCount(0);
  // From ⌘K, for the file shown: the copy of a copy, then its deletion asked in its row.
  await press(tree(page).getByRole("button", { name: /^main copy 2\.zeff/ }));
  await expect(header(page)).toContainText("main copy 2.zeff");
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByRole("combobox", { name: "Type a command" }).fill("File: delete main copy 2");
  await page.keyboard.press("Enter");
  const second = tree(page).getByRole("group", { name: "Delete main copy 2.zeff?" });
  await press(second.getByRole("button", { name: "Delete" }));
  await expect(more(page, "scripts/main copy 2.zeff")).toHaveCount(0);
  await expect(header(page)).toContainText("main.zeff");
});

test("a data file a script names is deleted: the script is said, with its line, and is left as it is", async ({
  page,
  press,
  browserName,
}) => {
  await opened(page, press);
  await tree(page)
    .getByLabel("Data files to add")
    .setInputFiles({
      name: "pay.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("id,wage\n1,23.5\n2,19\n"),
    });
  const script = 'let pay = import("data/pay.csv")\nprint(pay.n_rows())\n';
  await write(page, script);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await expect(page.getByTestId("printed")).toHaveText("2\n");
  // By the keyboard alone: the menu, its fourth item, the question, the answer that deletes.
  await more(page, "data/pay.csv").focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(menu(page, "data/pay.csv").getByRole("menuitem", { name: "Delete…" })).toBeFocused();
  await page.keyboard.press("Enter");
  const asked = tree(page).getByRole("group", { name: "Delete pay.csv?" });
  await expect(asked.getByRole("button", { name: "Keep" })).toBeFocused();
  // (Safari gives a button the Tab key with Option held, unless the reader has set it otherwise.)
  await page.keyboard.press(browserName === "webkit" ? "Alt+Shift+Tab" : "Shift+Tab");
  await expect(asked.getByRole("button", { name: "Delete" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toHaveText("deleted pay.csv");
  await expect(more(page, "data/pay.csv")).toHaveCount(0);
  // The script that names it is said and gone to, and is as it was; its results stay, being
  // what the run before printed.
  const named = page.getByTestId("named");
  await expect(named).toContainText("data/pay.csv is named in a line of the project's scripts");
  await expect(named.getByRole("button", { name: "scripts/main.zeff, line 1" })).toBeVisible();
  await expect.poll(() => scriptText(page)).toBe(script);
  await expect(page.getByTestId("printed")).toHaveText("2\n");
  // The engine has forgotten it, as the project has: the next run says there is no such file.
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("ended with exit code 1");
  // And the folder it lay in, which the engine knows by name, is still there, with no Delete….
  await press(more(page, "data"));
  await expect(menu(page, "data").getByRole("menuitem", { name: "Delete…" })).toHaveCount(0);
});

test("a folder is renamed, moved, duplicated and deleted with all it holds, and a script open in it follows", async ({
  page,
  press,
}) => {
  await opened(page, press);
  const item = (path: string, name: string) =>
    menu(page, path).getByRole("menuitem", { name, exact: true });
  const made = async (from: string, what: "New script" | "New folder", name: string) => {
    await press(more(page, from));
    await press(item(from, what));
    const box = tree(page).getByRole("textbox", {
      name: what === "New script" ? "The name of the new script" : "The name of the new folder",
    });
    await box.fill(name);
    await box.press("Enter");
    await expect(box).toHaveCount(0);
  };
  // A folder of scripts in `scripts`, with a folder in it that holds nothing, and a file.
  await made("scripts", "New folder", "drafts");
  await made("scripts/drafts", "New folder", "old");
  await made("scripts/drafts", "New script", "two");
  await made("scripts/drafts", "New script", "one");
  const script = "let pay = frame(a = [1.0, 2])\nprint(pay.mean(a))\n";
  await write(page, script);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await expect(page.getByTestId("printed")).toHaveText("1.5\n");
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    (async () => {
      await press(more(page, "scripts/drafts"));
      await press(item("scripts/drafts", "Add files…"));
    })(),
  ]);
  await chooser.setFiles([
    { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("kept") },
  ]);
  await expect(more(page, "scripts/drafts/notes.txt")).toBeVisible();
  // The folder in it is folded away, and stays so through what follows.
  const old = (under: string) =>
    tree(page)
      .getByRole("button", { name: "old", exact: true })
      .and(tree(page).locator(`.line:has([aria-label="Actions for ${under}/old"]) button.row`));
  await press(old("scripts/drafts"));
  await expect(old("scripts/drafts")).toHaveAttribute("aria-expanded", "false");
  // Renamed where it stands: its name, with no ending to leave alone, is all selected.
  await press(more(page, "scripts/drafts"));
  await press(item("scripts/drafts", "Rename…"));
  const name = tree(page).getByRole("textbox", { name: "The new name of drafts" });
  await expect(name).toHaveValue("drafts");
  expect(
    await name.evaluate((box: HTMLInputElement) => [box.selectionStart, box.selectionEnd]),
  ).toEqual([0, 6]);
  await page.keyboard.type("sketches");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toHaveText("renamed to sketches");
  for (const file of ["one.zeff", "two.zeff", "notes.txt"]) {
    await expect(more(page, `scripts/sketches/${file}`)).toBeVisible();
  }
  await expect(more(page, "scripts/drafts")).toHaveCount(0);
  // The script open in it follows: shown and marked under its new path, its text and its
  // results as they were; the folder in it still folded; and it runs where it now is.
  await expect(tree(page).getByRole("button", { name: /^one\.zeff/ })).toHaveClass(/\bon\b/);
  await expect.poll(() => scriptText(page)).toBe(script);
  await expect(page.getByTestId("printed")).toHaveText("1.5\n");
  await expect(old("scripts/sketches")).toHaveAttribute("aria-expanded", "false");
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await expect(page.getByTestId("run-facts")).toHaveText(/^run 2 · /);
  // Moved: not into itself, nor into what lies in it, nor to where it is.
  await press(more(page, "scripts/sketches"));
  await press(item("scripts/sketches", "Move to…"));
  const where = tree(page).getByRole("combobox", { name: "The folder to move sketches into" });
  await expect(where.locator("option")).toHaveText(["the project's own folder", "data"]);
  await where.selectOption({ label: "the project's own folder" });
  await press(tree(page).getByRole("button", { name: "Move", exact: true }));
  await expect(page.getByRole("status")).toHaveText("moved to sketches");
  await expect(more(page, "sketches/one.zeff")).toBeVisible();
  await expect(more(page, "scripts/sketches")).toHaveCount(0);
  await expect.poll(() => scriptText(page)).toBe(script);
  await expect(page.getByTestId("printed")).toHaveText("1.5\n");
  // Duplicated: a folder beside it with all it holds.
  await press(more(page, "sketches"));
  await press(item("sketches", "Duplicate"));
  await expect(page.getByRole("status")).toHaveText("copied as sketches copy");
  for (const file of ["one.zeff", "two.zeff", "notes.txt"]) {
    await expect(more(page, `sketches copy/${file}`)).toBeVisible();
  }
  await expect(more(page, "sketches copy/old")).toBeVisible();
  // Deleted: the question says how many files go with it; an empty folder has none to count.
  await press(more(page, "sketches copy/old"));
  await press(item("sketches copy/old", "Delete…"));
  await expect(tree(page).getByRole("group", { name: "Delete old?" })).toContainText(
    "Delete old? It cannot be brought back.",
  );
  await press(
    tree(page).getByRole("group", { name: "Delete old?" }).getByRole("button", { name: "Keep" }),
  );
  await press(more(page, "sketches copy"));
  await press(item("sketches copy", "Delete…"));
  const asked = tree(page).getByRole("group", { name: "Delete sketches copy?" });
  await expect(asked).toContainText(
    "Delete sketches copy and the 3 files in it? It cannot be brought back.",
  );
  await press(asked.getByRole("button", { name: "Delete" }));
  await expect(page.getByRole("status")).toHaveText("deleted sketches copy and the 3 files in it");
  await expect(more(page, "sketches copy")).toHaveCount(0);
  await expect(more(page, "sketches copy/one.zeff")).toHaveCount(0);
  // The script shown was not in it: it is still shown, with its results.
  await expect(tree(page).getByRole("button", { name: /^one\.zeff/ })).toHaveClass(/\bon\b/);
  await expect(page.getByTestId("printed")).toHaveText("1.5\n");
  // The folder that holds the script shown, deleted: the main script takes its place.
  await press(more(page, "sketches"));
  await press(item("sketches", "Delete…"));
  await press(
    tree(page)
      .getByRole("group", { name: "Delete sketches?" })
      .getByRole("button", { name: "Delete" }),
  );
  await expect(more(page, "sketches")).toHaveCount(0);
  await expect(header(page)).toContainText("main.zeff");
  await expect(tree(page).getByRole("button", { name: /^main\.zeff/ })).toHaveClass(/\bon\b/);
  await expect(page.getByTestId("printed")).toHaveCount(0);
  // The folders the engine knows by name are not renamed, moved or deleted; a copy can be made.
  for (const fixed of ["scripts", "data"]) {
    await press(more(page, fixed));
    await expect(menu(page, fixed).getByRole("menuitem")).toHaveText([
      "New script",
      "New folder",
      "Add files…",
      "Duplicate",
      "Save as a zip…",
    ]);
    await page.keyboard.press("Escape");
  }
});

test("a row's menu stands inside the window: over its button where there is no room below", async ({
  page,
  press,
}) => {
  // Found at step 8d: at the window's foot the list ran off the screen, and its last items
  // could not be reached.
  await page.setViewportSize({ width: 1280, height: 420 });
  await opened(page, press);
  const within = async (path: string) => {
    const window = page.viewportSize()!;
    const list = (await menu(page, path).boundingBox())!;
    const button = (await more(page, path).boundingBox())!;
    expect(list.y).toBeGreaterThanOrEqual(0);
    expect(list.y + list.height).toBeLessThanOrEqual(window.height);
    expect(list.x + list.width).toBeLessThanOrEqual(window.width);
    return { list, button };
  };
  // A row high in the pane: the list under its button.
  await press(more(page, "data"));
  const high = await within("data");
  expect(high.list.y).toBeGreaterThanOrEqual(high.button.y + high.button.height);
  await page.keyboard.press("Escape");
  // The lowest row, with a list of five and no room for it below: the list over its button,
  // every item of it to be pressed.
  await press(more(page, "scripts/plots.zeff"));
  await expect(menu(page, "scripts/plots.zeff").getByRole("menuitem")).toHaveCount(5);
  const low = await within("scripts/plots.zeff");
  expect(low.list.y + low.list.height).toBeLessThanOrEqual(low.button.y);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    press(menu(page, "scripts/plots.zeff").getByRole("menuitem", { name: "Save a copy…" })),
  ]);
  expect(download.suggestedFilename()).toBe("plots.zeff");
});
