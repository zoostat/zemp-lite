// Run and its outputs (release 0.1, step 8): each statement's output under the line that
// made it, a warning as a card, an error under its line, the statement that is running
// marked, and the output marked when the script has been edited since.
import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import {
  blocksAsText,
  expect,
  placeOf,
  printed,
  saidAsWritten,
  test,
  write,
  useExample,
} from "./support";

// The editor draws the part of a script that is near the window. These tests read every
// output of a run, so they are given a window tall enough to hold the script with them all.
test.use({ viewport: { width: 1100, height: 3600 } });

const READY = "engine Zeff 0.9.0 ready";
const file = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

async function scratch(page: Page, press: (target: ReturnType<Page["locator"]>) => Promise<void>) {
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  // The page prints at the width of its place, and `zeff run` at 118 characters: the window is
  // given the width at which the place is 118 characters wide before anything is compared.
  await placeOf(page, 118);
  await useExample(page);
}

/** Open ⌘K, type, and run the first command listed. */
async function command(page: Page, typed: string): Promise<void> {
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByRole("combobox", { name: "Type a command" }).fill(typed);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Commands" })).toHaveCount(0);
}

/** The lines the blocks on the page stand under, in the script's order. */
const lines = (page: Page) =>
  page
    .getByTestId("block")
    .evaluateAll((blocks) => blocks.map((block) => block.getAttribute("data-line")));

test("each result of the example sits under the line that made it, with its time", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  // Seven of the nine statements have something to show: the summary, the fit and the two
  // plots print, and the three statements that made the fit and the plots each left a note.
  // The run unfolded them all, each a block of the script under its statement.
  await expect.poll(() => lines(page)).toEqual(["8", "12", "13", "16", "17", "20", "21"]);
  await expect(page.locator(".cm-zemp-output").getByTestId("block")).toHaveCount(7);
  await expect(
    page.locator('[data-testid="block"][data-line="12"]').getByTestId("said"),
  ).toHaveText(/note\s+33 of the 3,911 clusters hold one observation/);
  const block = (line: number) => page.locator(`[data-testid="block"][data-line="${line}"]`);
  await expect(block(8).getByTestId("printed")).toContainText("summary · by female");
  await expect(block(13).getByTestId("printed")).toContainText(
    "reg · log(wage) ~ educ + exper + female + union",
  );
  await expect(block(17).getByTestId("printed")).toContainText(
    "plot · w2010 · log(wage) against educ",
  );
  for (const line of [8, 13, 17, 21]) {
    await expect(block(line).getByTestId("time")).toHaveText(/^\d+ ms$|^\d+\.\d\d s$/);
  }
  // The warning is a card with its code and its one sentence, under the line it speaks of.
  const warning = block(8).getByTestId("said");
  await expect(warning).toContainText("warning");
  await expect(warning).toContainText("W0201");
  await expect(warning).toContainText(
    "6 rows with NA in wage, 1 with NA in exper and 1 with NA in hours were skipped",
  );
  await expect(page.getByTestId("run-facts")).toHaveText(
    /^run 1 · \d{1,2}:\d\d · 9 statements in \d/,
  );
  // Taken together the blocks are what `zeff run` prints, to the byte.
  expect(await printed(page)).toBe(file("tests/scripts/example/expected/stdout.txt"));
});

test("the outputs' text for the example is the text kept for it", async ({ page, press }) => {
  await scratch(page, press);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  // Both plots are drawn before the outputs are read.
  await expect(page.locator('[data-testid="figure"] img')).toHaveCount(2);
  const shown = await blocksAsText(page);
  const at = await lines(page);
  const text = shown.map((block, index) => `line ${at[index]}\n${block}`).join("\n\n");
  expect(`${text}\n`).toMatchSnapshot("example-output.txt");
});

for (const name of ["plain", "warning", "error", "refused"]) {
  test(`the script "${name}" is shown as \`zeff run\` 0.9.0 prints it`, async ({ page, press }) => {
    await scratch(page, press);
    await write(page, file(`tests/scripts/${name}.zeff`));
    await press(page.getByRole("button", { name: "Run", exact: true }));
    const failing = name === "error" || name === "refused";
    await expect(page.getByRole("status")).toHaveText(failing ? "ended with exit code 1" : "done");
    await expect(page.locator(".sheet")).toHaveAttribute("data-width", "118");
    expect(await printed(page)).toBe(file(`tests/scripts/${name}.stdout`));
    expect(await saidAsWritten(page)).toBe(file(`tests/scripts/${name}.stderr`));
  });
}

test("an error sits under its line, with its excerpt and advice, and the run is said to have ended with it", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await write(page, file("tests/scripts/error.zeff"));
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("ended with exit code 1");
  // Lines 1 and 2 ran; line 3 failed; line 4 never ran and has no block.
  await expect.poll(() => lines(page)).toEqual(["1", "2", "3"]);
  const failed = page.locator('[data-testid="block"][data-line="3"]');
  await expect(failed).toHaveClass(/failed/);
  const error = failed.getByTestId("said");
  await expect(error).toContainText("error");
  await expect(error).toContainText("Z0715");
  await expect(error).toContainText("no file `data/none.csv` in the project");
  await expect(error).toContainText('3 | let w = import("data/none.csv")');
  await expect(error).toContainText(
    "put the file in the project and write its path from the project folder",
  );
  await expect(page.getByTestId("run-facts")).toContainText("ended with an error");
  // The warning of line 2 is a card of its own kind, with the engine's advice.
  const warning = page.locator('[data-testid="block"][data-line="2"]').getByTestId("said");
  await expect(warning).toContainText("W0204");
  await expect(warning).toContainText("test the divisor first");
});

test("what the engine's check refuses is shown under the line it names, and nothing runs", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await write(page, file("tests/scripts/refused.zeff"));
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("ended with exit code 1");
  expect(await lines(page)).toEqual(["2"]);
  expect(await printed(page)).toBe("");
  await expect(page.getByTestId("said")).toContainText("no function is called `nosuch`");
});

test("a refused script leaves the results of the run before, and the run's facts, as they were", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByTestId("sync")).toHaveText("in sync · 1 warning");
  await expect(page.getByTestId("block")).toHaveCount(7);
  const before = await printed(page);
  const facts = await page.getByTestId("run-facts").textContent();
  expect(facts).toMatch(/^run 1 · /);

  await write(page, file("tests/scripts/example/scripts/main.zeff") + "let z = nosuch(3)\n");
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByTestId("sync")).toHaveText("not run · 1 error found by the check");
  // What the check found stands under the line it names, the last of the script, and is not
  // marked as a result that is no longer the script's.
  await expect(page.getByTestId("block")).toHaveCount(8);
  const found = page.getByTestId("block").last();
  await expect(found).toHaveAttribute("data-line", "22");
  await expect(found).toContainText("no function is called `nosuch`");
  await expect(found).not.toHaveClass(/edited/);
  // The results, and the line that says which run they are of, are those of the run before.
  expect(await printed(page)).toBe(before);
  await expect(page.getByTestId("run-facts")).toHaveText(facts ?? "");
});

test("the statement that is running is marked, with Cancel beside the output's lines", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await write(
    page,
    'print("started")\nfor i in 1..200000 {\n    let rows = dataset(wages).where(year == 2015).n_rows()\n}\n',
  );
  await press(page.getByRole("button", { name: "Run", exact: true }));
  const running = page.locator('[data-testid="block"][data-line="2"]').getByTestId("running");
  await expect(running).toContainText(/running · pass [\d,]+ of 200,000/);
  await expect(page.getByTestId("run-facts")).toContainText("statement 2 of 2");
  // While a run goes it is not run a second time, and its output is not cleared: the top
  // bar's Run reads Stop, and the command that clears the output leaves it.
  await expect(
    page.locator("header.top").getByRole("button", { name: "Run", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.locator("header.top").getByRole("button", { name: "Stop", exact: true }),
  ).toBeEnabled();
  await command(page, "output clear");
  await expect(running).toBeVisible();
  await expect(page.locator('[data-testid="block"][data-line="1"]')).toContainText("started");
  // (The run's facts, a button too, say "cancelled" once it has ended: the name is held exactly.)
  const cancel = page.getByRole("button", { name: "Cancel", exact: true });
  await press(cancel);
  await expect(page.getByRole("status")).toHaveText("ended with exit code 1");
  await expect(page.getByTestId("run-facts")).toContainText("cancelled");
  await expect(cancel).toHaveCount(0);
  await expect(page.getByTestId("running")).toHaveCount(0);
});

test("when the script is edited the output is marked as not the script's, until the next run", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await write(page, "print(6 * 7)\n");
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect.poll(() => printed(page)).toBe("42\n");
  const block = page.getByTestId("block");
  const mark = block.getByText("edited · not run");
  await expect(mark).toHaveCount(0);
  await write(page, "print(6 * 8)\n");
  await expect(mark).toBeVisible();
  // The old result is still shown, dashed and faded: it cannot be taken for a current one.
  await expect.poll(() => printed(page)).toBe("42\n");
  expect(await block.evaluate((node) => getComputedStyle(node).borderTopStyle)).toBe("dashed");
  // Typing the script back to what ran removes the mark; so does running it.
  await write(page, "print(6 * 7)\n");
  await expect(mark).toHaveCount(0);
  await write(page, "print(6 * 8)\n");
  await expect(mark).toBeVisible();
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect.poll(() => printed(page)).toBe("48\n");
  await expect(mark).toHaveCount(0);
});

test("Run answers ⌘↵ wherever the keyboard's focus is", async ({ page, press }) => {
  await scratch(page, press);
  await write(page, "print(1 + 1)\n");
  // The keyboard out of the script, on a control of the top bar.
  const place = page
    .getByRole("navigation", { name: "Places" })
    .getByRole("button", { name: "Script" });
  await place.focus();
  await expect(place).toBeFocused();
  await page.keyboard.press("ControlOrMeta+Enter");
  await expect.poll(() => printed(page)).toBe("2\n");
});
