// The margin editor (release 0.2, step 5a; open decision #174), which replaces the Inline
// layout of 0.1: a note beside each statement, its output unfolded under it at the reader's
// asking, and a script opening with every output folded. With every output unfolded it reads
// as Inline did, so the checks of 0.1's Inline tests are kept, after **Unfold all**.
import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import {
  cursorTo,
  blocksAsText,
  editor,
  expect,
  printed,
  saidAsWritten,
  scriptText,
  test,
  wheelTo,
  write,
  useExample,
  EXAMPLE,
  countRuns,
} from "./support";

// The editor draws the part of a script that is near the window, as editors do, and the rest
// as it is scrolled to. These tests read the whole script with its output, so they are given
// a window tall enough to hold it.
test.use({ viewport: { width: 1280, height: 3200 } });

const READY = "engine Zeff 0.9.0 ready";
const file = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

type Press = (target: ReturnType<Page["locator"]>) => Promise<void>;

/**
 * Open the Scratch project and put the tests' example in it; with `reopened`, then close the
 * project and open it again, so that its script is shown by an editor that was never typed
 * into, as a project opened afresh is.
 */
async function scratch(page: Page, press: Press, reopened = false) {
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await useExample(page);
  if (reopened) {
    await press(page.getByRole("button", { name: "All projects" }));
    await press(page.getByRole("button", { name: /^Scratch project/ }));
    await expect(page.getByRole("status")).toHaveText(READY);
    await expect.poll(() => scriptText(page)).toBe(EXAMPLE);
  }
}

/** Run the script, and unfold every output once it has run: the page Inline showed. */
async function runUnfolded(page: Page, press: Press) {
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  // Run unfolds every output under its statement (open decision #203); nothing more is pressed.
  // Every output is unfolded before the page is read: no note on the page is folded, and
  // the outputs near the window are drawn (the editor draws only what is near the window).
  await expect(page.locator('[data-testid="note"][aria-expanded="false"]')).toHaveCount(0);
  await expect(page.locator(".cm-zemp-output").first()).toBeVisible();
  // And their number holds steady: the last of them drawn.
  let drawn = -1;
  await expect
    .poll(async () => {
      const now = await page.locator(".cm-zemp-output").count();
      const steady = now === drawn;
      drawn = now;
      return steady;
    })
    .toBe(true);
}

/** The notes of the margin: for each, the line of code it stands on and its words. */
const notes = (page: Page) =>
  page.getByTestId("note").evaluateAll((all) =>
    all.map((note) => {
      const copy = note.closest(".cm-line")!.cloneNode(true) as Element;
      for (const one of copy.querySelectorAll('[data-testid="note"]')) one.remove();
      return [copy.textContent ?? "", note.textContent ?? ""];
    }),
  );

/** For each block drawn in the script: the line of code it stands directly under. */
const under = (page: Page) =>
  page.locator(".cm-zemp-output").evaluateAll((blocks) =>
    blocks.map((block) => {
      let before = block.previousElementSibling;
      while (before !== null && !before.classList.contains("cm-line")) {
        before = before.previousElementSibling;
      }
      if (before === null) return null;
      const copy = before.cloneNode(true) as Element;
      for (const note of copy.querySelectorAll('[data-testid="note"]')) note.remove();
      return copy.textContent;
    }),
  );

test("a project opens in the margin editor: 920 pixels of code and 300 of notes, with no panel beside it", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await expect(page.getByRole("complementary")).toHaveCount(0);
  const column = (await page.locator(".cm-editor").boundingBox())!;
  expect(column.width).toBeLessThanOrEqual(1220);
  expect(column.width).toBeGreaterThan(1160);
  // The column is centred in the place, which is the window but for the side menu's 52 pixels.
  const window = page.viewportSize()!.width;
  expect(Math.abs(column.x + column.width / 2 - (window + 52) / 2)).toBeLessThan(2);
  await expect.poll(() => scriptText(page)).toBe(file("tests/scripts/example/scripts/main.zeff"));
});

test("each statement's output is directly under it, and the script itself is not changed", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await runUnfolded(page, press);
  expect(await under(page)).toEqual([
    "w2010.summary([wage, educ, exper, hours], by: female)",
    "let fit = wages.reg(log(wage) ~ educ + exper + female + union, cluster: worker)",
    "fit",
    "let schooling = w2010.scatter(educ, log(wage), fit: linear)",
    "schooling",
    "let shape = w2010.plot(x: log(wage)).histogram(bins: 30)",
    "shape",
  ]);
  // What is printed and said is what `zeff run` 0.9.0 prints and says, to the byte.
  expect(await printed(page)).toBe(file("tests/scripts/example/expected/stdout.txt"));
  expect(await saidAsWritten(page)).toBe(file("tests/scripts/example/expected/stderr.txt"));
  // Inline output is never written into the script: the editor holds the file as it was.
  expect(await scriptText(page)).toBe(file("tests/scripts/example/scripts/main.zeff"));
  await expect(page.locator("header.top")).toContainText("· saved");
});

test("an unfolded output's header gives its lines, its time and its actions", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await runUnfolded(page, press);
  const block = page.locator('[data-testid="block"][data-line="8"]');
  const header = block.locator("header");
  await expect(header).toContainText("line 8");
  await expect(block.getByTestId("time")).toHaveText(/^\d+ ms$|^\d+\.\d\d s$/);
  await expect(header.getByRole("button", { name: "Copy as text" })).toBeVisible();
  await expect(header.getByRole("button", { name: "Fold" })).toBeVisible();
  // The output stands across the code's column and the notes'.
  const output = (await block.boundingBox())!;
  const note = (await page.locator('[data-testid="note"][data-line="8"]').boundingBox())!;
  expect(output.x + output.width).toBeGreaterThan(note.x + note.width - 2);
  // Fold folds it, and its note says so.
  await press(header.getByRole("button", { name: "Fold" }));
  await expect(block).toHaveCount(0);
  await expect(page.locator('[data-testid="note"][data-line="8"]')).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  // A plot's output opens the plot viewer.
  await press(
    page
      .locator('[data-testid="block"][data-line="17"]')
      .getByRole("button", { name: "Open in Plots ↗" }),
  );
  await expect(
    page.getByRole("navigation", { name: "Places" }).getByRole("button", { name: "Plots" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByTestId("plots").locator(".stage img")).toBeVisible();
});

test("the example with every output unfolded is the text kept for it", async ({ page, press }) => {
  await scratch(page, press);
  await runUnfolded(page, press);
  // The script with every output unfolded: each block after the line it stands under.
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
  expect(`${text}\n`).toMatchSnapshot("example-unfolded.txt");
});

test("an error and a refused script are shown under their lines, and Fold all leaves an error open", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  // A script the check refuses, in a project with no results yet: only what the check found.
  await write(page, file("tests/scripts/refused.zeff"));
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect.poll(() => under(page)).toEqual(["let z = nosuch(3)"]);
  expect(await saidAsWritten(page)).toBe(file("tests/scripts/refused.stderr"));

  await write(page, file("tests/scripts/error.zeff"));
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.locator('[data-testid="block"][data-line="3"]')).toContainText("failed");
  // The run unfolded every output, the one that failed among them.
  await expect
    .poll(() => under(page))
    .toEqual(['print("a")', "print(1 / 0)", 'let w = import("data/none.csv")']);
  expect(await printed(page)).toBe(file("tests/scripts/error.stdout"));
  expect(await saidAsWritten(page)).toBe(file("tests/scripts/error.stderr"));
  // What failed is never folded: Fold all leaves it open, and Unfold all brings the rest back.
  await press(page.getByRole("button", { name: "Fold all", exact: true }));
  expect(await under(page)).toEqual(['let w = import("data/none.csv")']);
  await press(page.getByRole("button", { name: "Unfold all", exact: true }));
  expect(await under(page)).toEqual([
    'print("a")',
    "print(1 / 0)",
    'let w = import("data/none.csv")',
  ]);
});

test("when the check refuses a script, the results of the run before stay on the page", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await runUnfolded(page, press);
  await expect(page.getByTestId("sync")).toHaveText("in sync");
  await expect(page.getByTestId("warnings")).toHaveText("1 warning");
  await expect(page.locator('[data-testid="figure"] img')).toHaveCount(2);
  const before = await printed(page);
  const blocks = await page.getByTestId("block").count();
  expect(blocks).toBeGreaterThan(4);

  // A slip in a new last line: a function Zeff does not have. The check refuses the whole
  // script, so nothing runs.
  await editor(page).focus();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.insertText("let z = nosuch(3)\n");
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByTestId("sync")).toHaveText("not run · 1 error found by the check");
  // The error stands under the line it names, as the engine writes it.
  const error = page.getByTestId("block").filter({ hasText: "no function is called `nosuch`" });
  await expect(error).toHaveCount(1);
  expect((await under(page)).at(-1)).toBe("let z = nosuch(3)");
  await expect(error).not.toContainText("edited · not run");
  // The results of the run before are all still there, figures too; a line added at the end
  // reads nothing they made, so none of them is marked.
  expect(await printed(page)).toBe(before);
  await expect(page.locator('[data-testid="figure"] img')).toHaveCount(2);
  await expect(page.getByTestId("block")).toHaveCount(blocks + 1);
  await expect(page.getByTestId("block").filter({ hasText: "edited · not run" })).toHaveCount(0);
  await expect(page.getByTestId("block").filter({ hasText: "stale" })).toHaveCount(0);

  // The script edited again: what the check said is not of the script as it stands either.
  await page.keyboard.insertText("// a note\n");
  await expect(page.getByTestId("sync")).toHaveText("edited · not run");
  await expect(page.getByTestId("warnings")).toHaveText("1 warning");
  await expect(error).toContainText("edited · not run");

  // The slip mended: the script runs, and the page is the run's own again.
  await write(page, file("tests/scripts/example/scripts/main.zeff"));
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByTestId("sync")).toHaveText("in sync");
  await expect(page.getByTestId("warnings")).toHaveText("1 warning");
  await expect(error).toHaveCount(0);
  // The whole script was written anew, so the editor draws its last outputs a moment after
  // the run is said to be in step: the page is read until it holds them.
  await expect.poll(() => printed(page)).toBe(before);
  await expect(page.getByTestId("block")).toHaveCount(blocks);
});

test("the running statement's note says so, Run reads Stop, and Stop ends the run", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await write(
    page,
    'print("started")\nfor i in 1..200000 {\n    let rows = dataset(wages).where(year == 2015).n_rows()\n}\n',
  );
  await press(page.getByRole("button", { name: "Run", exact: true }));
  const loop = page.locator('[data-testid="note"][data-line="2"]');
  await expect(loop).toContainText("running…");
  await expect(loop).toContainText(/[\d,]+ passes/);
  await expect(page.getByTestId("run-facts")).toContainText(/run 1 · \d+:\d\d · statement 2 of 2/);
  // The statement that has finished keeps its note, saying what it printed, and its output is
  // open under it already, while the loop still runs: Run unfolds each output as it comes.
  await expect(page.locator('[data-testid="note"][data-line="1"]')).toContainText("started");
  await expect(page.locator('[data-testid="block"][data-line="1"]')).toContainText("started");
  await expect(page.locator('[data-testid="block"][data-line="2"]')).toContainText("running");
  const top = page.locator("header.top");
  await expect(top.getByRole("button", { name: "Run", exact: true })).toHaveCount(0);
  await press(top.getByRole("button", { name: "Stop", exact: true }));
  await expect(page.getByRole("status")).toHaveText("ended with exit code 1");
  await expect(top.getByRole("button", { name: "Run", exact: true })).toBeEnabled();
  await expect(page.getByTestId("run-facts")).toContainText("cancelled after");
  // The engine's message of the cancel is under the loop, which failed with it.
  await expect(page.getByTestId("said")).toContainText("Z0705");
});

test("the results bar gives the run's number, time of day, statements and time", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await expect(page.getByTestId("run-facts")).toHaveText("not run yet");
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await expect(page.getByTestId("run-facts")).toHaveText(
    /^run 1 · \d+:\d\d · 9 statements in (\d+ ms|\d+\.\d\d s)$/,
  );
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByTestId("run-facts")).toHaveText(/^run 2 · /);
});

test("the foot is one line of 26 pixels: the console, the state after its dot, the run, its warnings, the note with Export project…, and the engine", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByTestId("sync")).toHaveText("in sync");
  await expect(page.getByTestId("warnings")).toHaveText("1 warning");
  const foot = page.locator("footer.bottom .line");
  // The parts of the line that are shown, each with where it stands.
  const shown = () =>
    foot.evaluate((line) =>
      [...line.children]
        .map((child) => ({ child, box: child.getBoundingClientRect() }))
        .filter(({ box }) => box.width > 0)
        .map(({ child, box }) => ({
          name: child.className.split(" ")[0] ?? child.tagName,
          middle: box.top + box.height / 2,
          left: box.left,
        })),
    );
  // One line: every part on the same row, from left to right in the order of open decision
  // #245, at a wide window, a laptop's and a tablet's held sideways. (Until release 0.3.1 the
  // line began with the state and named the keys, which the top bar now does.)
  for (const size of [
    { width: 1600, height: 800 },
    { width: 1280, height: 720 },
    { width: 1024, height: 768 },
  ]) {
    await page.setViewportSize(size);
    const parts = await shown();
    const middles = parts.map((part) => part.middle);
    expect(Math.max(...middles) - Math.min(...middles)).toBeLessThan(3);
    const order = parts.map((part) => part.name);
    const reminded = (await page.getByTestId("reminder").count()) > 0;
    expect(order).toEqual([
      "prompt",
      "mono",
      "state",
      "run",
      "warnings",
      ...(reminded ? ["reminder", "export"] : []),
      "status",
      "engine",
    ]);
    const lefts = parts.map((part) => part.left);
    expect([...lefts].sort((a, b) => a - b)).toEqual(lefts);
    // The line is 26 pixels high, spans the window, and nothing of it runs past the window.
    const line = (await foot.boundingBox())!;
    expect([line.x, line.width, line.height]).toEqual([0, size.width, 26]);
    expect(line.y + line.height).toBe(size.height);
    const last = parts.at(-1)!;
    expect(last.left).toBeLessThan(size.width);
    // The console keeps room to type a statement in.
    expect(
      (await page.getByRole("textbox", { name: /^Console/ }).boundingBox())!.width,
    ).toBeGreaterThanOrEqual(200);
  }
  // The run, in the bar's words without the time of day; pressed, it opens the run's facts.
  const run = page.getByTestId("foot-run");
  await expect(run).toHaveText(/^run 1 · 9 statements in (\d+ ms|\d+\.\d\d s)$/);
  await press(run);
  await expect(page.getByRole("dialog", { name: "The run's facts" })).toBeVisible();
  await page.keyboard.press("Escape");
  // The warnings, pressed, open what the run said.
  await press(page.getByTestId("warnings"));
  await expect(page.getByRole("dialog", { name: "What the run said" })).toBeVisible();
  await page.keyboard.press("Escape");
  // The state's dot is coloured, and its words are there beside it.
  await expect(foot.locator(".state.ok")).toBeVisible();
  await write(page, "print(1)\n");
  await expect(foot.locator(".state.warning")).toContainText("edited · not run");
});

test("an edit marks its statement edited and what stands below it stale; a comment marks nothing", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await write(page, "let a = 6\nprint(a * 7)\nprint(1)\n");
  await runUnfolded(page, press);
  await expect.poll(() => printed(page)).toBe("42\n1\n");
  const block = (line: number) => page.locator(`[data-testid="block"][data-line="${line}"]`);
  const note = (line: number) => page.locator(`[data-testid="note"][data-line="${line}"]`);
  await editor(page).focus();
  // A comment typed above: the outputs move with their statements, and nothing is marked.
  await page.keyboard.press("ControlOrMeta+Home");
  await page.keyboard.type("// a note\n");
  await expect(note(2)).not.toContainText("edited");
  await expect(note(2)).not.toContainText("stale");
  expect(await under(page)).toEqual(["print(a * 7)", "print(1)"]);
  // The second statement edited: it is edited, the one below it stale, the one above fresh.
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("End");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.type(" + 1");
  await expect
    .poll(() => scriptText(page))
    .toBe("// a note\nlet a = 6\nprint(a * 7 + 1)\nprint(1)\n");
  await expect(note(2)).toContainText("edited · not run");
  await expect(note(3)).toContainText("stale");
  await expect(note(1)).not.toContainText("stale");
  await expect(block(2)).toContainText("edited · not run");
  await expect(block(3)).toContainText("stale");
  // The whole script run again: every result is the script's.
  await page.keyboard.press("Shift+ControlOrMeta+Enter");
  await expect(page.getByRole("status")).toHaveText("done");
  await expect.poll(() => printed(page)).toBe("43\n1\n");
  await expect(page.getByTestId("note").filter({ hasText: "stale" })).toHaveCount(0);
});

test("⌘↵ runs the statement at the cursor with what it needs, and leaves the rest as it was", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await write(page, "let a = 6\nlet b = 2\nprint(a * 7)\nprint(b)\n");
  await runUnfolded(page, press);
  await expect.poll(() => printed(page)).toBe("42\n2\n");
  const note = (line: number) => page.locator(`[data-testid="note"][data-line="${line}"]`);
  await editor(page).focus();
  await page.keyboard.press("ControlOrMeta+Home");
  // Line 1 edited: what reads it (line 3) and what stands below are no longer the script's.
  await page.keyboard.press("End");
  await page.keyboard.press("Backspace");
  await page.keyboard.type("10");
  await expect(note(1)).toContainText("edited · not run");
  await expect(note(3)).toContainText("stale");
  // ⌘↵ on line 3: it runs with line 1, which it reads; line 2 and line 4 are not run.
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ControlOrMeta+Enter");
  await expect(page.getByRole("status")).toHaveText("done");
  await expect(page.getByTestId("run-facts")).toHaveText(/^run 2 · /);
  await expect(note(1)).not.toContainText("edited");
  await expect(note(3)).not.toContainText("stale");
  await expect(page.locator('[data-testid="block"][data-line="3"]')).toContainText("70");
  // Line 4 was not run: its result is the run before's, and it stands below a change, so it
  // stays marked.
  await expect(note(4)).toContainText("stale");
  expect(await scriptText(page)).toBe("let a = 10\nlet b = 2\nprint(a * 7)\nprint(b)\n");
});

test("⌘↵ in a script the check refuses runs nothing, and shows what the check found", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await write(page, "print(1)\nlet z = nosuch(3)\n");
  await editor(page).focus();
  await page.keyboard.press("ControlOrMeta+Home");
  await page.keyboard.press("ControlOrMeta+Enter");
  await expect(page.getByTestId("block").first()).toContainText("no function is called `nosuch`");
  expect(await printed(page)).toBe("");
});

test("the code's column widens with the size of the code, and the notes keep their 300 pixels", async ({
  page,
  press,
}) => {
  await page.setViewportSize({ width: 1600, height: 3200 });
  await scratch(page, press);
  const width = async () => Math.round((await page.locator(".cm-editor").boundingBox())!.width);
  expect(await width()).toBe(920 + 300);
  for (let more = 0; more < 3; more++) {
    await press(page.getByRole("button", { name: "Larger code text" }));
  }
  // At 18 pixels the code's column is 18/14 of 920.
  await expect.poll(width).toBe(Math.round((920 * 18) / 14) + 300);
});

test("a run leaves the reader where they were in the script, not at the top of the page", async ({
  page,
  press,
}) => {
  // A window of an ordinary height, in which the script with its output is far longer.
  await page.setViewportSize({ width: 1280, height: 700 });
  // An editor never typed into, as a project opened afresh has: the reader's place is all
  // this tests.
  await scratch(page, press, true);
  await runUnfolded(page, press);
  const pane = page.getByRole("region", { name: "Script with its notes and output" });
  const top = () => pane.evaluate((node) => Math.round(node.scrollTop));
  // Down to the plots, which the editor draws as they come near the window.
  await wheelTo(pane, 1000);
  await expect.poll(top).toBe(1000);
  await expect(page.locator('[data-testid="figure"] img').first()).toBeVisible();
  // Where the reader is, by what they see: each line of the script that is in the window,
  // and how far down the window it stands.
  const seen = () =>
    pane.evaluate((node) => {
      const window = node.getBoundingClientRect();
      return [...node.querySelectorAll(".cm-lineNumbers .cm-gutterElement")]
        .map((number): [string, number] => [
          number.textContent ?? "",
          Math.round(number.getBoundingClientRect().top - window.top),
        ])
        .filter(([line, down]) => line !== "" && down >= 0 && down < window.height);
    });
  const before = await seen();
  expect(before.length).toBeGreaterThan(2);

  // Run from the keyboard, with the keyboard in the script, and then from the button.
  for (const how of ["key", "button"]) {
    if (how === "key") {
      await editor(page).evaluate((node) => (node as HTMLElement).focus({ preventScroll: true }));
      await page.keyboard.press("Shift+ControlOrMeta+Enter");
    } else {
      await press(page.getByRole("button", { name: "Run", exact: true }));
    }
    await expect(page.getByTestId("sync")).toHaveText("in sync");
    await expect(page.getByTestId("warnings")).toHaveText("1 warning");
    await expect(page.locator('[data-testid="figure"] img').first()).toBeVisible();
    await page.waitForTimeout(600);
    const after = await seen();
    expect(after.map(([line]) => line)).toEqual(before.map(([line]) => line));
    for (const [index, [line, down]] of after.entries()) {
      expect(Math.abs(down - (before[index]?.[1] ?? NaN)), `line ${line}`).toBeLessThan(3);
    }
    // And the page is as long above them as it was: nothing will shift as they scroll up.
    expect(Math.abs((await top()) - 1000)).toBeLessThan(3);
  }
});

test("a reader who scrolls as a run ends is left where they went", async ({ page, press }) => {
  await page.setViewportSize({ width: 1280, height: 700 });
  await scratch(page, press);
  const pane = page.getByRole("region", { name: "Script with its notes and output" });
  const top = () => pane.evaluate((node) => Math.round(node.scrollTop));
  // The script with its outputs unfolded, so that the page is long; then from the top of
  // the script, and off down the page the moment the results are in.
  await runUnfolded(page, press);
  await pane.evaluate((node) => node.scrollTo(0, 0));
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await wheelTo(pane, 1000);
  await page.waitForTimeout(600);
  expect(await top()).toBe(1000);
  // From down the page, and off again while the run goes: not brought back when it ends.
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await wheelTo(pane, 400);
  await expect(page.getByTestId("sync")).toHaveText("in sync");
  await expect(page.getByTestId("warnings")).toHaveText("1 warning");
  await page.waitForTimeout(600);
  expect(await top()).toBe(400);
});

test("a script opens with no output; Run puts a note beside each statement and unfolds every output", async ({
  page,
  press,
}) => {
  // A tall window, so that the editor draws the whole page.
  await page.setViewportSize({ width: 1280, height: 3600 });
  await scratch(page, press);
  await expect(page.locator(".cm-zemp-output")).toHaveCount(0);
  await expect(page.getByTestId("note")).toHaveCount(0);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  // Every output is open under its statement, in the script's order, with nothing pressed.
  await expect
    .poll(() => under(page))
    .toEqual([
      "w2010.summary([wage, educ, exper, hours], by: female)",
      "let fit = wages.reg(log(wage) ~ educ + exper + female + union, cluster: worker)",
      "fit",
      "let schooling = w2010.scatter(educ, log(wage), fit: linear)",
      "schooling",
      "let shape = w2010.plot(x: log(wage)).histogram(bins: 30)",
      "shape",
    ]);
  await expect(page.locator('[data-testid="note"][aria-expanded="false"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="note"][aria-expanded="true"]')).toHaveCount(7);
  const shown = await notes(page);
  expect(shown.map(([line]) => line)).toEqual([
    "let wages = dataset(wages)",
    "let w2010 = wages.where(year == 2010)",
    "w2010.summary([wage, educ, exper, hours], by: female)",
    "let fit = wages.reg(log(wage) ~ educ + exper + female + union, cluster: worker)",
    "fit",
    "let schooling = w2010.scatter(educ, log(wage), fit: linear)",
    "schooling",
    "let shape = w2010.plot(x: log(wage)).histogram(bins: 30)",
    "shape",
  ]);
  expect(shown[0]![1]).toBe("wagesFrame · 18,412 × 11");
  expect(shown[2]![1]).toContain("summaryTable · by femaleW0201");
  // Running never moved the code: the script is the file as it was.
  expect(await scriptText(page)).toBe(file("tests/scripts/example/scripts/main.zeff"));
  // The notes stand at the right of the code, in a column 300 pixels wide.
  const note = (await page.getByTestId("note").first().boundingBox())!;
  const code = (await page.locator(".cm-line").first().boundingBox())!;
  expect(Math.round(note.width)).toBe(300);
  expect(note.x).toBeGreaterThanOrEqual(code.x + code.width - 1);
});

test("a note unfolds its statement's output under the statement, and folds it again", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  // From every output folded.
  await press(page.getByRole("button", { name: "Fold all", exact: true }));
  const summary = page.locator('[data-testid="note"][data-line="8"]');
  await expect(summary).toHaveAttribute("aria-expanded", "false");
  await press(summary);
  await expect(summary).toHaveAttribute("aria-expanded", "true");
  expect(await under(page)).toEqual(["w2010.summary([wage, educ, exper, hours], by: female)"]);
  await expect(page.getByTestId("printed")).toContainText("summary · by female");
  // A second, and the output under the fit's statement: several may be open.
  await press(page.locator('[data-testid="note"][data-line="13"]'));
  expect(await under(page)).toEqual([
    "w2010.summary([wage, educ, exper, hours], by: female)",
    "fit",
  ]);
  await press(summary);
  expect(await under(page)).toEqual(["fit"]);
  // A statement that printed and said nothing has a note with nothing to unfold.
  await expect(page.locator('[data-testid="note"][data-line="4"]')).not.toHaveAttribute(
    "aria-expanded",
  );
});

test("a run of part of the script unfolds the outputs of the statements asked for, and no others", async ({
  page,
  press,
}) => {
  await page.setViewportSize({ width: 1280, height: 3600 });
  await scratch(page, press);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await press(page.getByRole("button", { name: "Fold all", exact: true }));
  await expect(page.locator(".cm-zemp-output")).toHaveCount(0);
  // ⌘↵ on line 13, `fit`: it runs with line 12, which it reads, and opens its own output alone.
  await cursorTo(page, 13);
  await page.keyboard.press("ControlOrMeta+Enter");
  await expect(page.getByRole("status")).toHaveText("done");
  await expect.poll(() => under(page)).toEqual(["fit"]);
  // Run to here, from line 13: the statements before it are asked for, and theirs open;
  // `fit` stays open, as it was.
  await page.keyboard.press("ControlOrMeta+k");
  await page.keyboard.type("run to here");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toHaveText("done");
  await expect
    .poll(() => under(page))
    .toEqual([
      "w2010.summary([wage, educ, exper, hours], by: female)",
      "let fit = wages.reg(log(wage) ~ educ + exper + female + union, cluster: worker)",
      "fit",
    ]);
  // Run, the whole script: every output, whatever was folded.
  await press(page.getByRole("button", { name: "Fold all", exact: true }));
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await expect.poll(async () => (await under(page)).length).toBe(7);
});

test("Unfold all is every output under its statement; Fold all folds all but an error", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await runUnfolded(page, press);
  await expect(page.locator(".cm-zemp-output")).toHaveCount(7);
  await press(page.getByRole("button", { name: "Fold all", exact: true }));
  await expect(page.locator(".cm-zemp-output")).toHaveCount(0);
  // An error found by the check is never folded.
  await write(page, file("tests/scripts/refused.zeff"));
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect.poll(() => under(page)).toEqual(["let z = nosuch(3)"]);
  await press(page.getByRole("button", { name: "Fold all", exact: true }));
  expect(await under(page)).toEqual(["let z = nosuch(3)"]);
});

test("Notes hides and shows the notes, and changes nothing else", async ({ page, press }) => {
  await scratch(page, press);
  await runUnfolded(page, press);
  const before = [await printed(page), await saidAsWritten(page)];
  const notesButton = page.getByRole("button", { name: "Notes", exact: true });
  await expect(notesButton).toHaveAttribute("aria-pressed", "true");
  await press(notesButton);
  await expect(page.getByTestId("note")).toHaveCount(0);
  await expect(notesButton).toHaveAttribute("aria-pressed", "false");
  expect([await printed(page), await saidAsWritten(page)]).toEqual(before);
  await expect(page.locator(".cm-zemp-output")).toHaveCount(7);
  await press(notesButton);
  await expect(page.getByTestId("note")).toHaveCount(9);
});

test("the engine prints at the width of the place, and again at a new width when it changes", async ({
  page,
  press,
}) => {
  await page.setViewportSize({ width: 1024, height: 3200 });
  await scratch(page, press);
  await runUnfolded(page, press);
  const width = async () => Number(await page.locator(".sheet").getAttribute("data-width"));
  const wide = await width();
  expect(wide).toBeGreaterThanOrEqual(40);
  expect(wide).toBeLessThan(118);
  const longest = async () =>
    Math.max(...(await printed(page)).split("\n").map((line) => [...line].length));
  // Every line the engine printed fits the place: it laid its tables out at that width.
  await expect.poll(longest).toBeLessThanOrEqual(wide);
  const before = await printed(page);
  const longestBefore = await longest();
  // A narrower place, the Project pane opened beside the script at a tablet's width (open
  // decision #243), too narrow for the widest table as it stands: the prints are laid out
  // afresh, the run keeping its number. (The width passes through others as the pane
  // opens, so the test waits for one that the old print does not fit.)
  await press(page.getByRole("button", { name: "Project", exact: true }));
  await expect.poll(width).toBeLessThan(longestBefore);
  const narrow = await width();
  await expect.poll(longest).toBeLessThanOrEqual(narrow);
  expect(await printed(page)).not.toBe(before);
  await expect(page.getByTestId("run-facts")).toHaveText(/^run 1 · /);
});

test("a print is made again at another width by the engine, and the script is not run again", async ({
  page,
  press,
  browserName,
  context,
}) => {
  // Release 0.3, step 6b (open decision #175, C6): the engine keeps what each statement
  // printed and makes it again at any width. Every run asked of the engine is counted here,
  // by its message to the engine's worker.
  const runs = await countRuns(page);
  if (browserName === "chromium") {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  }
  await page.setViewportSize({ width: 1024, height: 3200 });
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  const script =
    "let wages = dataset(wages)\nwages.summary([wage, educ, exper, hours, age])\nwages\n";
  await write(page, script);
  await expect(page.locator("header.top")).toContainText("· saved");
  await runUnfolded(page, press);
  expect(await runs()).toBe(1);
  const width = async () => Number(await page.locator(".sheet").getAttribute("data-width"));
  const longest = async () =>
    Math.max(...(await printed(page)).split("\n").map((line) => [...line].length));
  const wide = await width();
  await expect.poll(longest).toBeLessThanOrEqual(wide);
  const atWide = await printed(page);
  const longestWide = await longest();
  // Narrower than the widest table as it stands, the Project pane opened beside the script:
  // the tables wrap, and nothing is run.
  await press(page.getByRole("button", { name: "Project", exact: true }));
  await expect.poll(width).toBeLessThan(longestWide);
  const narrow = await width();
  await expect.poll(longest).toBeLessThanOrEqual(narrow);
  const atNarrow = await printed(page);
  expect(atNarrow).not.toBe(atWide);
  await expect(page.getByTestId("run-facts")).toHaveText(/^run 1 · /);
  expect(await runs()).toBe(1);
  // Copy as text, while the place is narrow, is the print at the engine's own width, 118,
  // made again and not run for.
  await press(
    page
      .locator('[data-testid="block"][data-line="3"]')
      .getByRole("button", { name: "Copy as text" }),
  );
  await expect(page.getByTestId("copied")).toHaveText(/^copied line 3 as text: \d+ lines$/);
  expect(await runs()).toBe(1);
  if (browserName === "chromium") {
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    // Wider than the place as it now stands, and the print the wide place showed.
    expect(Math.max(...copied.split("\n").map((line) => [...line].length))).toBeGreaterThan(narrow);
    expect(atWide).toContain(copied);
    expect(copied.startsWith("wages · 18,412 rows × 11 variables")).toBe(true);
  }
  // Wide again, the pane closed: the prints are what they were at that width, to the character.
  await press(page.getByRole("button", { name: "Project", exact: true }));
  await expect.poll(width).toBe(wide);
  await expect.poll(() => printed(page)).toBe(atWide);
  expect(await runs()).toBe(1);
  // A statement run alone leaves the page with results of two runs of the engine's, which
  // the engine cannot print again as one: there the text is run again, as before, and the
  // prints still fit the new width.
  await cursorTo(page, 2);
  await page.keyboard.press("ControlOrMeta+Enter");
  await expect(page.getByTestId("run-facts")).toHaveText(/^run 2 · /);
  const after = await runs();
  await press(page.getByRole("button", { name: "Project", exact: true }));
  await expect.poll(width).toBe(narrow);
  await expect.poll(longest).toBeLessThanOrEqual(narrow);
  await expect.poll(runs).toBeGreaterThan(after);
});

test("Copy as text gives what `zeff run` prints, at the engine's own width", async ({
  page,
  press,
  browserName,
  context,
}) => {
  await page.setViewportSize({ width: 1024, height: 3200 });
  if (browserName === "chromium") {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  }
  await scratch(page, press);
  await runUnfolded(page, press);
  const fit = page.locator('[data-testid="block"][data-line="13"]');
  await press(fit.getByRole("button", { name: "Copy as text" }));
  await expect(page.getByTestId("copied")).toHaveText(/^copied line 13 as text: \d+ lines$/);
  if (browserName === "chromium") {
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied.startsWith("reg · log(wage) ~ educ + exper + female + union")).toBe(true);
    // The place is narrower than 118 characters, yet the copy is the print at 118.
    expect(file("tests/scripts/example/expected/stdout.txt")).toContain(copied);
  }
});

test("Explain opens the engine's page for a code in place, and closes it", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await runUnfolded(page, press);
  const summary = page.locator('[data-testid="block"][data-line="8"]');
  const explain = summary.getByRole("button", { name: "Explain" });
  await press(explain);
  await expect(summary.getByTestId("explained")).toHaveText(
    file("tests/scripts/explain-W0201.txt").trimEnd(),
  );
  await expect(explain).toHaveAttribute("aria-expanded", "true");
  await press(explain);
  await expect(summary.getByTestId("explained")).toHaveCount(0);
});

test("⌥↵ unfolds and folds the output of the statement at the cursor", async ({ page, press }) => {
  await scratch(page, press);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await press(page.getByRole("button", { name: "Fold all", exact: true }));
  // To line 8, the summary.
  await cursorTo(page, 8);
  await page.keyboard.press("Alt+Enter");
  await expect(page.locator('[data-testid="note"][data-line="8"]')).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await page.keyboard.press("Alt+Enter");
  await expect(page.locator('[data-testid="note"][data-line="8"]')).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  // The script is as it was: the key wrote nothing into it.
  expect(await scriptText(page)).toBe(file("tests/scripts/example/scripts/main.zeff"));
});

test("Run to here, on a statement's line number, runs the statements before it", async ({
  page,
  press,
  browserName,
}) => {
  await scratch(page, press);
  const runTo = page.locator('[data-testid="run-to-here"][data-line="8"]');
  await expect(runTo).toHaveCount(1);
  // The words are offered on the first line of every statement but the first, and only there.
  await expect(page.getByTestId("run-to-here")).toHaveCount(8);
  await expect(page.locator('[data-testid="run-to-here"][data-line="7"]')).toHaveCount(0);
  if (browserName === "chromium") {
    await expect(runTo.locator("span")).toBeHidden();
    await runTo.hover();
    await expect(runTo.locator("span")).toBeVisible();
    await expect(runTo).toHaveText("Run to here");
  }
  await press(runTo);
  await expect(page.getByRole("status")).toHaveText("done");
  const note = (line: number) => page.locator(`[data-testid="note"][data-line="${line}"]`);
  await expect(note(4)).toContainText("Frame · 18,412 × 11");
  await expect(note(5)).toContainText("Frame");
  await expect(note(8)).toContainText("not run");
  await expect(note(21)).toContainText("not run");
  await expect(page.getByTestId("run-facts")).toHaveText(/^run 1 · \d+:\d\d · 2 statements in /);
});

test("Run from here, from ⌘K, runs the statement at the cursor, what follows and what they need", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await cursorTo(page, 16);
  await page.keyboard.press("ControlOrMeta+k");
  await page.keyboard.type("run from here");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toHaveText("done");
  const note = (line: number) => page.locator(`[data-testid="note"][data-line="${line}"]`);
  // Lines 16 to 21 ran, with lines 4 and 5, which they need; the summary and the fit did not.
  for (const line of [4, 5, 16, 17, 20, 21]) await expect(note(line)).not.toContainText("not run");
  for (const line of [8, 12, 13]) await expect(note(line)).toContainText("not run");
});

test("where what a statement needs fails, the statement asked for says so", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await write(page, 'print(1)\nlet w = import("data/none.csv")\nprint(2)\n');
  await page.keyboard.press("ControlOrMeta+Home");
  await page.keyboard.press("ControlOrMeta+k");
  await page.keyboard.type("run from here");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toHaveText("ended with exit code 1");
  await expect(page.locator('[data-testid="note"][data-line="3"]')).toContainText(
    "not run · line 2 failed",
  );
});

test("the run's facts give the engine, the seed, and where the time and the memory went", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await press(page.getByTestId("run-facts"));
  const record = page.getByTestId("run-record");
  await expect(record).toBeVisible();
  await expect(record).toContainText(/engine Zeff 0\.9\.0 · run 1 · \d+:\d\d/);
  await expect(record.getByTestId("seeds")).toHaveText("No statement sets the seed.");
  // Every statement of the run by its time, and the two frames by the bytes the engine counts.
  await expect(record.getByTestId("times").locator("li")).toHaveCount(9);
  await expect(record.getByTestId("memory").locator("li")).toHaveCount(2);
  await expect(record.getByTestId("memory")).toContainText("wages");
  await expect(record).toContainText("come with Zeff 0.11.0");
  await page.keyboard.press("Escape");
  await expect(record).toHaveCount(0);
});

test("what the run said lists every message with its code, sentence and line, as the margin has them", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await press(page.locator("footer.bottom button.state"));
  const list = page.getByTestId("run-said");
  await expect(list).toBeVisible();
  const warning = list.locator("li.warning");
  await expect(warning).toHaveCount(1);
  await expect(warning).toContainText("W0201");
  await expect(warning).toContainText("6 rows with NA in wage");
  await expect(warning).toContainText("line 8");
  // The same code is the tag of the note of line 8.
  await expect(page.locator('[data-testid="note"][data-line="8"]')).toContainText("W0201");
  await expect(list.locator("li.note")).toHaveCount(3);
  // A line of the list takes the cursor to its line.
  await press(warning.getByRole("button", { name: "line 8" }));
  await expect(list).toHaveCount(0);
  await expect(page.locator(".cm-lineNumbers .cm-activeLineGutter")).toHaveText("8");
});

test("an error raised inside a function has its trail, each link a way to its line", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await write(page, file("tests/scripts/trail.zeff"));
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("ended with exit code 1");
  const trail = page.getByTestId("trail");
  await expect(trail.locator("li")).toHaveCount(3);
  await expect(trail.locator("li").nth(0)).toContainText(
    "scripts/main.zeff:14 in_year(data: a frame of 18,412 rows × 11 variables, y: 1900)",
  );
  await expect(trail.locator("li").nth(2)).toContainText(
    "scripts/main.zeff:3 no row remains to fit the model",
  );
  // The lines the trail names have notes of what the call there was given, or of the error.
  await expect(page.locator('[data-testid="note"][data-line="9"]')).toContainText(
    "returns(data: a frame of 0 rows × 11 variables)",
  );
  await expect(page.locator('[data-testid="note"][data-line="3"]')).toContainText("Z0801");
  // Following a link puts the cursor on its line.
  await press(trail.getByRole("button", { name: "scripts/main.zeff:3" }));
  await expect(page.locator(".cm-lineNumbers .cm-activeLineGutter")).toHaveText("3");
  // Nothing was run again: the run is still the first.
  await expect(page.getByTestId("run-facts")).toHaveText(/^run 1 · /);
});

test("an error raised in a pass of a loop names the pass in its trail, which the engine's message does not", async ({
  page,
  press,
}) => {
  // Release 0.3, step 6d (open decision #175, C22): the trail is read from the engine's own
  // record of the error, which carries the pass of a loop as fields.
  await scratch(page, press);
  await write(
    page,
    [
      "/// One over a number.",
      "fn inv(x: Float) -> Float {",
      '    if x == 0 { error("zero") }',
      "    1 / x",
      "}",
      "for k in [2.0, 1.0, 0.0] {",
      "    print(inv(k))",
      "}",
      "",
    ].join("\n"),
  );
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("ended with exit code 1");
  const trail = page.getByTestId("trail");
  await expect(trail.locator("li")).toHaveText([
    "scripts/main.zeff:6 pass 3 of 3: k = 0",
    "scripts/main.zeff:7 inv(x: 0)",
    "scripts/main.zeff:3 zero",
  ]);
  // What the engine printed of the error says the call and not the pass.
  const said = page.locator('[data-testid="block"][data-line="6"]').getByTestId("said");
  await expect(said.locator(".detail")).not.toContainText("pass");
  // The line of the call has its note; the loop's own line keeps the loop's.
  await expect(page.locator('[data-testid="note"][data-line="7"]')).toContainText("inv(x: 0)");
  await expect(page.locator('[data-testid="note"][data-line="3"]')).toContainText("Z0001");
  // A link of the trail puts the cursor on its line.
  await press(trail.getByRole("button", { name: "scripts/main.zeff:6" }));
  await expect(page.locator(".cm-lineNumbers .cm-activeLineGutter")).toHaveText("6");
  await expect(page.getByTestId("run-facts")).toHaveText(/^run 1 · /);
});

test("a loop's output carries its passes, a long list folded to its ends until Show all", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await write(page, "for i in 1..20000 {\n    let x = i * 2\n}\nprint(1)\n");
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  const loop = page.locator('[data-testid="note"][data-line="1"]');
  await expect(loop).toContainText("20,000 passes");
  // The loop's output is open under it, as every output is after Run.
  const passes = page.getByTestId("passes");
  await expect(passes).toContainText("20,000 passes");
  // More than 20 reported: the first three and the last three, with Show all.
  await expect(passes.getByTestId("pass")).toHaveCount(6);
  await expect(passes.getByTestId("pass").first()).toContainText("1 of 20,000");
  await expect(passes.getByTestId("pass").last()).toContainText("20,000 of 20,000");
  const all = passes.getByRole("button", { name: /^Show all \d+$/ });
  const count = Number((await all.textContent())?.replace(/\D/g, ""));
  await press(all);
  await expect(passes.getByTestId("pass")).toHaveCount(count);
});

test("a loop that fails ends its passes on the pass the engine names", async ({ page, press }) => {
  await scratch(page, press);
  await write(
    page,
    "for y in [2010, 1900] {\n    print(dataset(wages).where(year == y).reg(log(wage) ~ educ).coef(educ))\n}\n",
  );
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("ended with exit code 1");
  // What failed is unfolded without asking, its passes under what it printed.
  const failed = page.locator('[data-testid="block"][data-line="1"]');
  await expect(failed.getByTestId("printed")).toContainText("0.0495856");
  const rows = failed.getByTestId("passes").getByTestId("pass");
  await expect(rows).toHaveCount(2);
  await expect(rows.last()).toContainText("2 of 2");
  await expect(rows.last()).toContainText("failed");
});
