// The Inline layout (release 0.1, step 9): one column, each statement's output directly under
// it in the script, its time or state in the right margin. It is the layout a project of Zemp
// Lite opens in (Zemp Specification, section 5).
import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import {
  blocksAsText,
  editor,
  expect,
  printed,
  saidAsWritten,
  scriptText,
  test,
  write,
} from "./support";

// The editor draws the part of a script that is near the window, as editors do, and the rest
// as it is scrolled to. These tests read the whole script with its output, so they are given
// a window tall enough to hold it.
test.use({ viewport: { width: 1280, height: 3200 } });

const READY = "engine Zeff 0.7.0 ready";
const file = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

async function scratch(page: Page, press: (target: ReturnType<Page["locator"]>) => Promise<void>) {
  await page.goto("/");
  await press(page.getByRole("button", { name: "Scratch project" }));
  await expect(page.getByRole("status")).toHaveText(READY);
}

/** For each block drawn in the script: the line of code it stands directly under. */
const under = (page: Page) =>
  page.locator(".cm-zemp-output").evaluateAll((blocks) =>
    blocks.map((block) => {
      let before = block.previousElementSibling;
      while (before !== null && !before.classList.contains("cm-line")) {
        before = before.previousElementSibling;
      }
      return before?.textContent ?? null;
    }),
  );

test("a project opens in Inline: one column, at most 760 pixels wide, with no panel beside it", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await expect(page.getByRole("button", { name: "Inline", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("complementary")).toHaveCount(0);
  const column = (await page.locator(".cm-editor").boundingBox())!;
  expect(column.width).toBeLessThanOrEqual(760);
  expect(column.width).toBeGreaterThan(700);
  // The column is centred in the window.
  const window = page.viewportSize()!.width;
  expect(Math.abs(column.x + column.width / 2 - window / 2)).toBeLessThan(2);
  await expect.poll(() => scriptText(page)).toBe(file("examples/scratch/scripts/main.zeff"));
});

test("each statement's output is directly under it, and the script itself is not changed", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await press(page.getByRole("button", { name: "Run" }));
  await expect(page.getByRole("status")).toHaveText("done");
  expect(await under(page)).toEqual([
    "w2010.summary([wage, educ, exper, hours], by: female)",
    "let fit = wages.reg(log(wage) ~ educ + exper + female + union, cluster: worker)",
    "fit",
    "let schooling = w2010.scatter(educ, log(wage), fit: linear)",
    "schooling",
    "let shape = w2010.plot(x: log(wage)).histogram(bins: 30)",
    "shape",
  ]);
  // What is printed and said is what `zeff run` 0.7.0 prints and says, to the byte.
  expect(await printed(page)).toBe(file("examples/scratch/expected/stdout.txt"));
  expect(await saidAsWritten(page)).toBe(file("examples/scratch/expected/stderr.txt"));
  // Inline output is never written into the script: the editor holds the file as it was.
  expect(await scriptText(page)).toBe(file("examples/scratch/scripts/main.zeff"));
  await expect(page.locator("header.top")).toContainText("· saved");
});

test("the time of each statement is in a margin of 120 pixels at the right", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await press(page.getByRole("button", { name: "Run" }));
  await expect(page.getByRole("status")).toHaveText("done");
  const block = page.locator('[data-testid="block"][data-line="8"]');
  const time = block.getByTestId("time");
  await expect(time).toHaveText(/^\d+ ms$|^\d+\.\d\d s$/);
  const margin = (await block.locator("header").boundingBox())!;
  const output = (await block.getByTestId("printed").boundingBox())!;
  expect(Math.round(margin.width)).toBe(120);
  expect(margin.x).toBeGreaterThan(output.x + output.width);
});

test("the same run reads the same in Inline and in Panes, and one click switches", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await press(page.getByRole("button", { name: "Run" }));
  await expect(page.getByRole("status")).toHaveText("done");
  const inline = [await printed(page), await saidAsWritten(page)];
  await press(page.getByRole("button", { name: "Panes", exact: true }));
  await expect(page.getByRole("complementary")).toBeVisible();
  // The run is not made again: the same results, laid out in the Output panel.
  expect([await printed(page), await saidAsWritten(page)]).toEqual(inline);
  await expect(page.locator(".cm-zemp-output")).toHaveCount(0);
  await press(page.getByRole("button", { name: "Inline", exact: true }));
  await expect(page.locator(".cm-zemp-output")).toHaveCount(7);
  expect([await printed(page), await saidAsWritten(page)]).toEqual(inline);
});

test("the Inline text of the example is the text kept for it", async ({ page, press }) => {
  await scratch(page, press);
  await press(page.getByRole("button", { name: "Run" }));
  await expect(page.getByRole("status")).toHaveText("done");
  // The script with its output as Inline shows it: each block after the line it stands under.
  await expect(page.locator('[data-testid="figure"] img')).toHaveCount(2);
  const shown = await blocksAsText(page);
  const beneath = await under(page);
  const script = (await scriptText(page)).split("\n");
  const out: string[] = [];
  let block = 0;
  for (const line of script) {
    out.push(line);
    while (block < shown.length && beneath[block] === line && line !== "") {
      out.push(...(shown[block] as string).split("\n").map((one) => `    | ${one}`.trimEnd()));
      block += 1;
    }
  }
  const text = out.join("\n");
  expect(`${text}\n`).toMatchSnapshot("example-inline.txt");
});

test("an error and a refused script are shown under their lines in Inline too", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await write(page, file("tests/scripts/error.zeff"));
  await press(page.getByRole("button", { name: "Run" }));
  await expect(page.getByRole("status")).toHaveText("ended with exit code 1");
  expect(await under(page)).toEqual([
    'print("a")',
    "print(1 / 0)",
    'let w = import("data/none.csv")',
  ]);
  expect(await printed(page)).toBe(file("tests/scripts/error.stdout"));
  expect(await saidAsWritten(page)).toBe(file("tests/scripts/error.stderr"));
  await expect(page.locator('[data-testid="block"][data-line="3"]')).toContainText("failed");

  await write(page, file("tests/scripts/refused.zeff"));
  await press(page.getByRole("button", { name: "Run" }));
  await expect.poll(() => under(page)).toEqual(["let z = nosuch(3)"]);
  expect(await saidAsWritten(page)).toBe(file("tests/scripts/refused.stderr"));
});

test("the running statement is marked in the margin, with Cancel", async ({ page, press }) => {
  await scratch(page, press);
  await write(
    page,
    'print("started")\nfor i in 1..200000 {\n    let rows = dataset(wages).where(year == 2015).n_rows()\n}\n',
  );
  await press(page.getByRole("button", { name: "Run" }));
  await expect(page.getByTestId("running")).toContainText(/running · pass [\d,]+ of 200,000/);
  // The loop's block stands under the loop's closing brace.
  await expect.poll(() => under(page)).toEqual(['print("started")', "}"]);
  await press(page.getByRole("button", { name: "Cancel" }));
  await expect(page.getByRole("status")).toHaveText("ended with exit code 1");
  await expect(page.getByTestId("running")).toHaveCount(0);
  await expect(page.getByTestId("said")).toContainText("Z0705");
});

test("output of an edited script is marked in each margin until the next run", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await write(page, "print(6 * 7)\nprint(1)\n");
  await press(page.getByRole("button", { name: "Run" }));
  await expect.poll(() => printed(page)).toBe("42\n1\n");
  await editor(page).focus();
  await page.keyboard.press("ControlOrMeta+Home");
  await page.keyboard.type("// a note\n");
  const blocks = page.getByTestId("block");
  await expect(blocks.first()).toContainText("edited · not run");
  await expect(blocks.last()).toContainText("edited · not run");
  // The outputs moved with their statements when a line was typed above them.
  expect(await under(page)).toEqual(["print(6 * 7)", "print(1)"]);
  await page.keyboard.press("ControlOrMeta+Enter");
  await expect(page.getByRole("status")).toHaveText("done");
  await expect(blocks.first()).not.toContainText("edited · not run");
  expect(await under(page)).toEqual(["print(6 * 7)", "print(1)"]);
});

test("the Inline column widens with the size of the code", async ({ page, press }) => {
  await page.setViewportSize({ width: 1500, height: 3200 });
  await scratch(page, press);
  const width = async () => Math.round((await page.locator(".cm-editor").boundingBox())!.width);
  expect(await width()).toBe(760);
  for (let more = 0; more < 3; more++) {
    await press(page.getByRole("button", { name: "Larger code text" }));
  }
  // At 18 pixels the column is 18/14 of 760.
  await expect.poll(width).toBe(Math.round((760 * 18) / 14));
});

test("a run leaves the reader where they were in the script, not at the top of the page", async ({
  page,
  press,
}) => {
  // A window of an ordinary height, in which the script with its output is far longer.
  await page.setViewportSize({ width: 1280, height: 700 });
  await scratch(page, press);
  await press(page.getByRole("button", { name: "Run" }));
  await expect(page.getByRole("status")).toHaveText("done");
  const pane = page.getByRole("region", { name: "Script with its output" });
  const top = () => pane.evaluate((node) => Math.round(node.scrollTop));
  // Down to the plots, which the editor draws as they come near the window.
  await pane.evaluate((node) => (node.scrollTop = 1000));
  await expect.poll(top).toBe(1000);
  await expect(page.locator('[data-testid="figure"] img').first()).toBeVisible();
  // Where the reader is, by what they see: the line of code at the top of the window.
  const seen = () =>
    pane.evaluate((node) => {
      const at = node.getBoundingClientRect().top;
      const line = [...node.querySelectorAll(".cm-line")].find(
        (one) => one.getBoundingClientRect().bottom > at + 4,
      );
      return line?.textContent ?? "";
    });
  const before = await seen();

  // Run from the keyboard, with the keyboard in the script, and then from the button.
  for (const how of ["key", "button"]) {
    if (how === "key") {
      await editor(page).evaluate((node) => (node as HTMLElement).focus({ preventScroll: true }));
      await page.keyboard.press("ControlOrMeta+Enter");
    } else {
      await press(page.getByRole("button", { name: "Run" }));
    }
    await expect(page.getByTestId("sync")).toHaveText("in sync · 1 warning");
    await expect(page.locator('[data-testid="figure"] img').first()).toBeVisible();
    await page.waitForTimeout(600);
    expect(Math.abs((await top()) - 1000)).toBeLessThan(30);
    expect(await seen()).toBe(before);
  }
});
