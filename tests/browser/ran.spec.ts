// How a project's last run went is remembered by the browser (release 0.3.1, step 12a; open
// decision #245): each run of a whole script notes its errors and its warnings for the
// project, for its row of the projects screen. A check, a statement of the console and a run
// of an example in Help note nothing.
import type { Page } from "@playwright/test";
import { expect, test, useExample, write } from "./support";

const READY = "engine Zeff 0.9.0 ready";

/** What the browser keeps of each project's last run. */
const ran = (page: Page) =>
  page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("zemp-ran") ?? "{}") as Record<
        string,
        { at: number; errors: number; warnings: number }
      >,
  );
const run = (page: Page) => page.getByRole("button", { name: "Run", exact: true });
const sync = (page: Page) => page.getByTestId("sync");

test("a run of the script is remembered for its project: clean, with its warnings, and with the error that stopped it", async ({
  page,
  press,
}) => {
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  // Nothing has run in this browser yet.
  expect(await ran(page)).toEqual({});
  const before = Date.now();
  await write(page, "let a = 6\nprint(a)\n");
  await press(run(page));
  await expect(sync(page)).toHaveText("in sync");
  let kept = await ran(page);
  expect(Object.keys(kept)).toEqual(["scratch"]);
  expect(kept["scratch"]).toMatchObject({ errors: 0, warnings: 0 });
  expect(kept["scratch"]!.at).toBeGreaterThanOrEqual(before);
  expect(kept["scratch"]!.at).toBeLessThanOrEqual(Date.now());

  // A run that warns: the warnings the foot counts are those remembered.
  await useExample(page);
  await press(run(page));
  await expect(sync(page)).toHaveText("in sync");
  const said = await page.getByTestId("warnings").innerText();
  const warnings = Number(/^(\d+) warning/.exec(said)?.[1]);
  expect(warnings).toBeGreaterThan(0);
  kept = await ran(page);
  expect(kept["scratch"]).toMatchObject({ errors: 0, warnings });

  // A statement of the console, and a check, note nothing: the record is as it was.
  const at = kept["scratch"]!.at;
  await page.getByRole("textbox", { name: /^Console/ }).fill("1 + 1");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("log", { name: "Console output" }).getByTestId("console-printed"),
  ).toHaveText("2");
  await press(page.getByRole("button", { name: "Check", exact: true }));
  await expect(sync(page)).toContainText("no problems");
  expect((await ran(page))["scratch"]!.at).toBe(at);

  // A run that an error stops, and one the engine's check refuses before anything runs.
  await write(page, 'print(1)\nlet w = import("data/none.csv")\n');
  await press(run(page));
  await expect(page.getByRole("status")).toHaveText("ended with exit code 1");
  expect((await ran(page))["scratch"]).toMatchObject({ errors: 1, warnings: 0 });
  const stopped = (await ran(page))["scratch"]!.at;
  await write(page, "print(nosuch)\n");
  await press(run(page));
  await expect(sync(page)).toHaveText("not run · 1 error found by the check");
  kept = await ran(page);
  expect(kept["scratch"]).toMatchObject({ errors: 1, warnings: 0 });
  expect(kept["scratch"]!.at).toBeGreaterThan(stopped);
});

test("each project has its own record, and a project deleted is forgotten", async ({
  page,
  press,
}) => {
  await page.goto("/");
  await press(page.getByRole("button", { name: "New project…" }));
  await page.getByLabel("The name of the new project").fill("Wages");
  await press(page.getByRole("button", { name: "Create" }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await write(page, "print(1)\n");
  await press(run(page));
  await expect(sync(page)).toHaveText("in sync");
  expect(Object.keys(await ran(page))).toEqual(["wages"]);
  // The Scratch project, opened and not run, has none.
  const all = page
    .getByRole("navigation", { name: "Places" })
    .getByRole("button", { name: "All projects" });
  await press(all);
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  expect(Object.keys(await ran(page))).toEqual(["wages"]);
  // Deleted from ⌘K: its record goes with it.
  await press(all);
  await press(page.getByRole("button", { name: /^Wages/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByRole("combobox", { name: "Type a command" }).fill("Project: delete");
  await page.keyboard.press("Enter");
  const asked = page.getByRole("group", { name: "Delete Wages?" });
  await press(asked.getByRole("button", { name: "Delete", exact: true }));
  await expect(asked).toHaveCount(0);
  await expect.poll(() => ran(page)).toEqual({});
});
