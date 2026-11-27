// A project renamed, duplicated and deleted, and the Scratch project's own items (open
// decision #208; release 0.2.2, step 9; the owner's answers to questions 1 and 4): from each
// project's row of the start screen, and for the project open, from ⌘K.
import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { expect, printed, scriptText, test, wholeScript, write } from "./support";

const READY = "engine Zeff 0.9.0 ready";
const recent = (page: Page) => page.getByRole("region", { name: "Recent projects" });
const row = (page: Page, name: string) =>
  recent(page).getByRole("button", { name: new RegExp(`^${name} in this browser`) });
const more = (page: Page, name: string) =>
  recent(page).getByRole("button", { name: `Actions for ${name}`, exact: true });
const item = (page: Page, project: string, name: string) =>
  page
    .getByRole("menu", { name: `Actions for ${project}`, exact: true })
    .getByRole("menuitem", { name, exact: true });
const said = (page: Page) => recent(page).getByRole("status");

async function made(
  page: Page,
  press: (target: ReturnType<Page["locator"]>) => Promise<void>,
  name: string,
) {
  await press(page.getByRole("button", { name: "New project…" }));
  await page.getByLabel("The name of the new project").fill(name);
  await press(page.getByRole("button", { name: "Create" }));
  await expect(page.getByRole("status")).toHaveText(READY);
}

async function palette(page: Page, command: string) {
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByRole("combobox", { name: "Type a command" }).fill(command);
  await page.keyboard.press("Enter");
}

test("a project is renamed and duplicated from its row of the start screen, and the old name is free again", async ({
  page,
  press,
}) => {
  await page.goto("/");
  await made(page, press, "Wages");
  const script = 'print("the wages project")\n';
  await write(page, script);
  await press(page.getByRole("button", { name: "All projects" }));
  await press(more(page, "Wages"));
  await expect(
    page.getByRole("menu", { name: "Actions for Wages" }).getByRole("menuitem"),
  ).toHaveText(["Rename…", "Duplicate…", "Export project…", "Delete…"]);
  // Renamed in its row: the name stands there, all of it selected, to be typed over.
  await press(item(page, "Wages", "Rename…"));
  const name = recent(page).getByRole("textbox", { name: "The new name of Wages" });
  await expect(name).toBeFocused();
  await expect(name).toHaveValue("Wages");
  expect(
    await name.evaluate((box: HTMLInputElement) => [box.selectionStart, box.selectionEnd]),
  ).toEqual([0, 5]);
  // The Scratch project's name is its own, and a name is needed: refused in a sentence.
  await page.keyboard.type("scratch");
  await page.keyboard.press("Enter");
  await expect(recent(page).getByRole("alert")).toHaveText(
    "That name is the Scratch project's. Choose another.",
  );
  await name.fill("Returns to schooling");
  await expect(recent(page).getByRole("alert")).toHaveCount(0);
  await name.press("Enter");
  await expect(said(page)).toHaveText("Wages renamed to Returns to schooling");
  await expect(row(page, "Returns to schooling")).toBeVisible();
  await expect(row(page, "Wages")).toHaveCount(0);
  // It opens under its new name, the same project: its script, and its manifest with only the
  // name's line changed.
  await press(row(page, "Returns to schooling"));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Returns to schooling");
  await expect.poll(() => scriptText(page)).toBe(script);
  await palette(page, "Place: Script");
  await press(
    page
      .getByRole("toolbar", { name: "Script: its panes and its controls" })
      .getByRole("button", { name: "Project", exact: true }),
  );
  await press(page.getByRole("button", { name: "Actions for zeff.toml", exact: true }));
  const [manifest] = await Promise.all([
    page.waitForEvent("download"),
    press(page.getByRole("menuitem", { name: "Save a copy…" })),
  ]);
  expect(readFileSync(await manifest.path(), "utf8")).toBe(
    "[project]\n" +
      'name = "Returns to schooling" # the project\'s name\n' +
      'zeff = "0.9.0"            # the engine this project runs on, exactly\n' +
      'edition = "preview"       # "2027" from Zeff 1.0.0\n',
  );
  // Duplicated: a second project, of a name of its own, with all the first holds.
  await press(page.getByRole("button", { name: "All projects" }));
  await press(more(page, "Returns to schooling"));
  await press(item(page, "Returns to schooling", "Duplicate…"));
  const copy = recent(page).getByRole("textbox", {
    name: "The name of the copy of Returns to schooling",
  });
  await expect(copy).toHaveValue("Returns to schooling copy");
  await copy.fill("Returns to schooling");
  await copy.press("Enter");
  await expect(recent(page).getByRole("alert")).toHaveText(
    'A project called "Returns to schooling" is already here. Choose another name.',
  );
  await copy.fill("Wages");
  await copy.press("Enter");
  // The old name was free again: the copy has it.
  await expect(said(page)).toHaveText("Returns to schooling copied as Wages");
  await expect(row(page, "Wages")).toBeVisible();
  await expect(row(page, "Returns to schooling")).toBeVisible();
  await press(row(page, "Wages"));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Wages");
  await expect.poll(() => scriptText(page)).toBe(script);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await wholeScript(page);
  expect(await printed(page)).toBe("the wages project\n");
  // Escape leaves a question unanswered.
  await press(page.getByRole("button", { name: "All projects" }));
  await press(more(page, "Wages"));
  await press(item(page, "Wages", "Rename…"));
  await recent(page).getByRole("textbox", { name: "The new name of Wages" }).press("Escape");
  await expect(recent(page).getByRole("textbox")).toHaveCount(0);
});

test("a project is deleted after one question in its row, which offers to export it first", async ({
  page,
  press,
}) => {
  await page.goto("/");
  await made(page, press, "Wages");
  await press(page.getByRole("button", { name: "All projects" }));
  await made(page, press, "Pay");
  await press(page.getByRole("button", { name: "All projects" }));
  await press(more(page, "Wages"));
  await press(item(page, "Wages", "Delete…"));
  const asked = recent(page).getByRole("group", { name: "Delete Wages?" });
  await expect(asked).toContainText(
    "Delete Wages and the 2 files in it? It cannot be brought back.",
  );
  await expect(asked.getByRole("button")).toHaveText(["Export project… first", "Delete", "Keep"]);
  // The safe answer has the focus: Enter keeps, and so does Escape.
  await expect(asked.getByRole("button", { name: "Keep" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(asked).toHaveCount(0);
  await expect(row(page, "Wages")).toBeVisible();
  await press(more(page, "Wages"));
  await press(item(page, "Wages", "Delete…"));
  await page.keyboard.press("Escape");
  await expect(asked).toHaveCount(0);
  // Exported first, from the question itself, which stays to be answered.
  await press(more(page, "Wages"));
  await press(item(page, "Wages", "Delete…"));
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    press(asked.getByRole("button", { name: "Export project… first" })),
  ]);
  expect(download.suggestedFilename()).toBe("Wages.zip");
  await expect(asked).toBeVisible();
  await press(asked.getByRole("button", { name: "Delete" }));
  await expect(said(page)).toHaveText("Wages deleted");
  await expect(row(page, "Wages")).toHaveCount(0);
  await expect(row(page, "Pay")).toBeVisible();
  // Its address no longer opens it, and a new project may take its name.
  await page.goto("/#/p/wages");
  await expect(page.getByRole("button", { name: "New project…" })).toBeVisible();
  await made(page, press, "Wages");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Wages");
  // What was exported comes back as a project.
  await press(page.getByRole("button", { name: "All projects" }));
  await page.getByLabel("A project's zip to open").setInputFiles(await download.path());
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Wages 2");
});

test("the Scratch project is not renamed or deleted: it is duplicated into a project of the reader's own, and reset", async ({
  page,
  press,
}) => {
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  const mine = 'print("my own work in the scratch project")\n';
  await write(page, mine);
  await press(page.getByRole("button", { name: "All projects" }));
  await press(more(page, "Scratch"));
  await expect(
    page.getByRole("menu", { name: "Actions for Scratch" }).getByRole("menuitem"),
  ).toHaveText(["Duplicate…", "Export project…", "Reset…"]);
  // Duplicate… is the one step by which its work becomes a named project.
  await press(item(page, "Scratch", "Duplicate…"));
  const copy = recent(page).getByRole("textbox", { name: "The name of the copy of Scratch" });
  await copy.fill("My returns");
  await copy.press("Enter");
  await expect(said(page)).toHaveText("Scratch copied as My returns");
  await press(row(page, "My returns"));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("My returns");
  await expect.poll(() => scriptText(page)).toBe(mine);
  // Reset… puts the Scratch project back as a first visit has it, after one question.
  await press(page.getByRole("button", { name: "All projects" }));
  await press(more(page, "Scratch"));
  await press(item(page, "Scratch", "Reset…"));
  const asked = recent(page).getByRole("group", { name: "Reset the Scratch project?" });
  await expect(asked).toContainText(
    "Reset the Scratch project? What it holds, 4 files, is deleted, and its examples are put back as a first visit has them. It cannot be brought back.",
  );
  await expect(asked.getByRole("button")).toHaveText(["Export project… first", "Reset", "Keep"]);
  await expect(asked.getByRole("button", { name: "Keep" })).toBeFocused();
  await press(asked.getByRole("button", { name: "Reset" }));
  await expect(said(page)).toHaveText("The Scratch project is as a first visit has it");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await expect
    .poll(() => scriptText(page))
    .toMatch(/^\/\/ Returns to schooling, in the wages panel that ships with Zeff\./);
  // The reader's copy is untouched by it.
  await press(page.getByRole("button", { name: "All projects" }));
  await press(row(page, "My returns"));
  await expect.poll(() => scriptText(page)).toBe(mine);
});

test("the project open is renamed, duplicated and deleted from ⌘K, which asks on the start screen in its row", async ({
  page,
  press,
}) => {
  await page.goto("/");
  await made(page, press, "Wages");
  // What is typed is written before the project is closed for the question.
  const typed = 'print("typed just before the command")\n';
  await write(page, typed);
  await palette(page, "Project: rename");
  const name = recent(page).getByRole("textbox", { name: "The new name of Wages" });
  await expect(name).toBeFocused();
  await name.fill("Pay");
  await name.press("Enter");
  await expect(said(page)).toHaveText("Wages renamed to Pay");
  await press(row(page, "Pay"));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Pay");
  await expect.poll(() => scriptText(page)).toBe(typed);
  await palette(page, "Project: duplicate");
  const copy = recent(page).getByRole("textbox", { name: "The name of the copy of Pay" });
  await expect(copy).toHaveValue("Pay copy");
  await copy.press("Enter");
  await expect(row(page, "Pay copy")).toBeVisible();
  await press(row(page, "Pay"));
  await expect(page.getByRole("status")).toHaveText(READY);
  await palette(page, "Project: delete");
  const asked = recent(page).getByRole("group", { name: "Delete Pay?" });
  await press(asked.getByRole("button", { name: "Delete" }));
  await expect(row(page, "Pay")).toHaveCount(0);
  await expect(row(page, "Pay copy")).toBeVisible();
  // In the Scratch project the commands are its own: no rename, and a reset for a deletion.
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByRole("combobox", { name: "Type a command" }).fill("Project: ");
  const commands = page.getByRole("option");
  await expect(commands.filter({ hasText: "Project: reset…" })).toHaveCount(1);
  await expect(commands.filter({ hasText: "Project: rename…" })).toHaveCount(0);
  await expect(commands.filter({ hasText: "Project: delete…" })).toHaveCount(0);
});
