// A zip opened as a new project (open decisions #208 and #117; release 0.2.2, step 5): what
// **Export project…** wrote comes back, a project folder zipped by another tool is opened,
// and a zip that cannot be opened safely is refused in a sentence, with nothing made.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import { expect, printed, scriptText, test, wholeScript, write } from "./support";

const READY = "engine Zeff 0.8.0 ready";
const folder = mkdtempSync(join(tmpdir(), "zemp-open-zip-"));
test.afterAll(() => rmSync(folder, { recursive: true, force: true }));

/** A zip the reference tool (Python's `zipfile`) writes, by a script given the path to write. */
function written(name: string, script: string): string {
  const path = join(folder, name);
  const ran = spawnSync(
    "python3",
    ["-I", "-c", `import sys, zipfile\npath = sys.argv[1]\n${script}`, path],
    {
      encoding: "utf8",
    },
  );
  if (ran.status !== 0) throw new Error(`the reference failed: ${ran.stderr}`);
  return path;
}

const chooser = (page: Page) => page.getByLabel("A project's zip to open");
const recent = (page: Page) => page.getByRole("region", { name: "Recent projects" });
const tree = (page: Page) =>
  page
    .getByRole("complementary", { name: "Script: the left pane" })
    .getByRole("region", { name: "Project" });

async function showProject(
  page: Page,
  press: (target: ReturnType<Page["locator"]>) => Promise<void>,
) {
  await press(
    page
      .getByRole("toolbar", { name: "Script: its panes and its controls" })
      .getByRole("button", { name: "Project", exact: true }),
  );
  await expect(tree(page)).toBeVisible();
}

test("a project exported and opened again from its zip is the same project, under a name of its own", async ({
  page,
  press,
}) => {
  await page.goto("/app/");
  await press(page.getByRole("button", { name: "Scratch project" }));
  await expect(page.getByRole("status")).toHaveText(READY);
  const script =
    'let pay = frame(educ = [10.0, 12, 14], wage = [11.0, 14, 19])\npay.save("pay.csv")\nprint(pay.mean(wage))\n';
  await write(page, script);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await wholeScript(page);
  const before = await printed(page);
  expect(before).toBe("14.6667\n");
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByRole("combobox", { name: "Type a command" }).fill("Project: export");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.keyboard.press("Enter"),
  ]);
  const zip = await download.path();
  // Back on the start screen, the zip is opened: a new project, named for the one it holds
  // with a number after it, since that name is here already.
  await press(page.getByRole("button", { name: "Projects ▾" }));
  await expect(page.getByRole("button", { name: "Open a project's zip…" })).toBeVisible();
  await chooser(page).setInputFiles(zip);
  await expect(page).toHaveURL(/#\/p\/scratch-2$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Scratch 2");
  await expect(page.getByRole("status")).toHaveText(READY);
  // Its script is the script exported, and it runs to the same output.
  await expect.poll(() => scriptText(page)).toBe(script);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await wholeScript(page);
  expect(await printed(page)).toBe(before);
  // Its files are those exported: the other scripts, what the run had written, the empty folder.
  await showProject(page, press);
  for (const name of ["instruments.zeff", "plots.zeff", "main.zeff", "pay.csv", "zeff.toml"]) {
    await expect(tree(page).getByRole("listitem").filter({ hasText: name }).last()).toBeVisible();
  }
  await expect(tree(page).getByRole("button", { name: "data", exact: true })).toBeVisible();
  // Its manifest names it anew, the comment still in its column, and nothing else is changed.
  await press(tree(page).getByRole("button", { name: "Actions for zeff.toml", exact: true }));
  const [manifest] = await Promise.all([
    page.waitForEvent("download"),
    press(page.getByRole("menuitem", { name: "Save a copy…" })),
  ]);
  expect(readFileSync(await manifest.path(), "utf8")).toBe(
    "[project]\n" +
      'name = "Scratch 2"        # the project\'s name\n' +
      'zeff = "0.8.0"            # the engine this project runs on, exactly\n' +
      'edition = "preview"       # "2027" from Zeff 1.0.0\n',
  );
  // Both projects are listed, and the first is as it was.
  await press(page.getByRole("button", { name: "Projects ▾" }));
  await expect(
    recent(page).getByRole("button", { name: /^Scratch 2 in this browser/ }),
  ).toBeVisible();
  await expect(
    recent(page).getByRole("button", { name: /^Scratch in this browser/ }),
  ).toBeVisible();
});

test("a project's folder zipped by another tool is opened: its one folder taken off, a file manager's own files left out", async ({
  page,
  press,
}) => {
  // A project as `zeff new` makes it, in a folder, zipped as a computer's file manager would:
  // with entries for the folders, and the manager's own files beside the project's.
  const zip = written(
    "made.zip",
    "z = zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED)\n" +
      "z.writestr('returns/', b'')\nz.writestr('returns/data/', b'')\nz.writestr('returns/scripts/', b'')\n" +
      'z.writestr(\'returns/zeff.toml\', b\'[project]\\nname = "Returns"\\nzeff = "0.8.0"\\nedition = "preview"\\n\')\n' +
      "z.writestr('returns/scripts/main.zeff', b'print(\"made on the computer\")\\n')\n" +
      "z.writestr('returns/.gitignore', b'data/\\n')\n" +
      "z.writestr('returns/.DS_Store', b'junk')\nz.writestr('__MACOSX/returns/._zeff.toml', b'junk')\n" +
      "z.writestr('returns/.zemp/views.json', b'not even json')\nz.close()",
  );
  await page.goto("/app/");
  await chooser(page).setInputFiles(zip);
  await expect(page).toHaveURL(/#\/p\/returns$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Returns");
  await expect(page.getByRole("status")).toHaveText(READY);
  await expect.poll(() => scriptText(page)).toBe('print("made on the computer")\n');
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await wholeScript(page);
  expect(await printed(page)).toBe("made on the computer\n");
  await showProject(page, press);
  const rows = tree(page).locator(".line .name");
  await expect(rows).toHaveText(["data", "scripts", "main.zeff", ".gitignore", "zeff.toml"]);
});

test("a zip that cannot be opened is refused in a sentence, and no project is made", async ({
  page,
}) => {
  const refused: [string, string, RegExp | string][] = [
    [
      "no zip at all",
      "open(path, 'wb').write(b'this is not a zip')",
      "That file is not a zip, or it is cut short.",
    ],
    [
      "no project in it",
      "z = zipfile.ZipFile(path, 'w')\nz.writestr('notes.txt', b'x')\nz.close()",
      "That zip holds no project: a project's zip has `zeff.toml` at its top, or in the one folder at its top, as Export project… writes it.",
    ],
    [
      "a path that leaves the project",
      "z = zipfile.ZipFile(path, 'w')\nz.writestr('zeff.toml', b'[project]\\nname = \"x\"\\n')\n" +
        "i = zipfile.ZipInfo('ok')\ni.filename = '../evil.txt'\nz.writestr(i, b'x')\nz.close()",
      "That zip holds `../evil.txt`, which would be written outside the project. It is not opened.",
    ],
    [
      "two names that differ only in capitals",
      "z = zipfile.ZipFile(path, 'w')\nz.writestr('zeff.toml', b'[project]\\nname = \"x\"\\n')\n" +
        "z.writestr('data/A.csv', b'1')\nz.writestr('data/a.csv', b'2')\nz.close()",
      /`data\/A\.csv` and `data\/a\.csv`, which differ only in capitals/,
    ],
  ];
  await page.goto("/app/");
  await expect(page.getByText("No project yet.")).toBeVisible();
  for (const [name, script, sentence] of refused) {
    await chooser(page).setInputFiles(written(`${name}.zip`, script));
    const said = page.getByRole("alert");
    if (typeof sentence === "string") await expect(said, name).toHaveText(sentence);
    else await expect(said, name).toHaveText(sentence);
    // Still the start screen, and no project in its list.
    await expect(page.getByRole("button", { name: "New project…" })).toBeVisible();
    await expect(page.getByText("No project yet.")).toBeVisible();
  }
  // A zip that opens takes the sentence away with it.
  const good = written(
    "good.zip",
    "z = zipfile.ZipFile(path, 'w')\nz.writestr('zeff.toml', b'[project]\\nname = \"Good\"\\nzeff = \"0.8.0\"\\n')\n" +
      "z.writestr('scripts/main.zeff', b'print(1)\\n')\nz.close()",
  );
  await chooser(page).setInputFiles(good);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Good");
});
