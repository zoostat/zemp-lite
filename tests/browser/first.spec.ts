// The first visit (release 0.2, step 18): the Scratch project a visitor opens holds the
// returns to schooling on `wages`, the script the margin editor's design is drawn on, the
// engine's own sample of 0.8.0 on instrumental variables (the owner's answer to question 7
// of the release), and the showcase of plots (his answer of 21 November 2026); each prints what the released `zeff run` 0.8.0 prints for it, kept in
// `examples/scratch/expected/`.
import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { expect, placeOf, printed, saidAsWritten, scriptText, test, wholeScript } from "./support";

const READY = "engine Zeff 0.8.0 ready";
const scratch = (file: string) =>
  readFileSync(new URL(`../../examples/scratch/${file}`, import.meta.url), "utf8");

async function opened(page: Page, press: (target: ReturnType<Page["locator"]>) => Promise<void>) {
  await page.goto("/");
  await press(page.getByRole("button", { name: "Scratch project" }));
  await expect(page.getByRole("status")).toHaveText(READY);
}

test("the Scratch project opens on the returns to schooling, and both its scripts print what `zeff run` prints", async ({
  page,
  press,
}) => {
  await page.setViewportSize({ width: 1100, height: 3600 });
  await opened(page, press);
  await expect.poll(() => scriptText(page)).toBe(scratch("scripts/main.zeff"));
  // The page prints at the width of its place, and `zeff run` at 118 characters: the window is
  // given the width at which the place is 118 characters wide.
  await placeOf(page, 118);
  // A run unfolds every output under its statement; the window is made tall enough to hold
  // them all, so that the whole of what the run printed and said is on the page.
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await wholeScript(page);
  await expect(page.locator(".sheet")).toHaveAttribute("data-width", "118");
  await expect.poll(() => printed(page)).toBe(scratch("expected/main.stdout"));
  await expect.poll(() => saidAsWritten(page)).toBe(scratch("expected/main.stderr"));
  // The second script, opened from ⌘K and run.
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByRole("combobox", { name: "Type a command" }).fill("instruments");
  await page.keyboard.press("Enter");
  // (The editor draws the lines near its window, so a long script is known by its start.)
  await expect
    .poll(() => scriptText(page))
    .toMatch(/^\/\/ Instrumental variables, end to end, on the staff data/);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await wholeScript(page);
  await expect(page.locator(".sheet")).toHaveAttribute("data-width", "118");
  await expect.poll(() => printed(page)).toBe(scratch("expected/instruments.stdout"));
  await expect.poll(() => saidAsWritten(page)).toBe(scratch("expected/instruments.stderr"));
});

test("the showcase of plots prints what `zeff run` prints, and its 21 plots are listed in Plots", async ({
  page,
  press,
}) => {
  await opened(page, press);
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByRole("combobox", { name: "Type a command" }).fill("plots.zeff");
  await page.keyboard.press("Enter");
  await expect
    .poll(() => scriptText(page))
    .toMatch(/^\/\/ Plots in Zeff, from one line to a figure ready for a journal/);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done", { timeout: 30_000 });
  // Every output is unfolded under its statement, the 21 figures among them: the window is
  // made tall enough to hold them all.
  await wholeScript(page);
  // Printed at the width of the place, a wide table is laid out otherwise than at the
  // 80 columns of `expected/plots.stdout`, which the native test holds the whole text to; what
  // does not depend on the width is held here: the head of each plot, in order, and every
  // message as the engine words it.
  const heads = (text: string) => text.split("\n").filter((line) => line.startsWith("plot · "));
  await expect
    .poll(async () => heads(await printed(page)))
    .toEqual(heads(scratch("expected/plots.stdout")));
  await expect.poll(() => saidAsWritten(page)).toBe(scratch("expected/plots.stderr"));
  // Every plot the script prints is one of the plots of the run, each drawn by the engine.
  await press(
    page.getByRole("navigation", { name: "Places" }).getByRole("button", { name: "Plots" }),
  );
  const plots = page.getByTestId("plots");
  await expect(
    plots.getByRole("list", { name: "Plots of the last run" }).getByRole("listitem"),
  ).toHaveCount(21);
  await expect(plots.locator('[data-testid="figure"] img').first()).toBeVisible();
});

test("each statement of the returns to schooling has its note beside it once it has run", async ({
  page,
  press,
}) => {
  await opened(page, press);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  // Run unfolds every output, and the editor draws only what is near the window: folded, the
  // whole script and its nine notes are on the page.
  await press(page.getByRole("button", { name: "Fold all", exact: true }));
  const note = (line: number) => page.locator(`[data-testid="note"][data-line="${line}"]`);
  for (const [line, words] of [
    [5, /^wages\s*Frame · [\d,]+ × 13/],
    [10, /^summary\s*Table · by female\s*W0201/],
    [11, /^shape\s*Plot/],
    [14, /^m1\s*RegFit/],
    [15, /^m2\s*RegFit/],
    [17, /^m3\s*RegFit/],
    // A statement that binds no name is noted by what the engine printed: the models' columns.
    [19, /\(1\)\s+\(2\)\s+\(3\)\s*Table/],
    [22, /^y2019\s*Frame · [\d,]+ × 13/],
    [23, /^schooling\s*Plot/],
  ] as const) {
    await expect(note(line)).toHaveText(words);
  }
});

test("the two plots the returns to schooling binds with `let` are drawn under their statements and listed in Plots", async ({
  page,
  press,
}) => {
  // A window tall enough for the whole script with its outputs unfolded: the editor draws
  // only the lines near its window.
  await page.setViewportSize({ width: 1280, height: 3200 });
  await opened(page, press);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  // A plot bound with `let` prints nothing; its note opens to the figure the engine draws.
  await press(page.getByRole("button", { name: "Unfold all", exact: true }));
  for (const line of [11, 23]) {
    const image = page.locator(`[data-testid="figure"][data-line="${line}"] img`);
    await expect(image).toBeVisible({ timeout: 15_000 });
    expect(await image.getAttribute("src")).toMatch(/^data:image\/svg\+xml/);
  }
  await expect(page.locator('[data-testid="figure"][data-line="11"] img')).toHaveAttribute(
    "alt",
    "Plot: shape",
  );
  const places = page.getByRole("navigation", { name: "Places" });
  await press(places.getByRole("button", { name: "Plots" }));
  const list = page
    .getByRole("complementary", { name: "Plots: the left pane" })
    .getByRole("region", { name: "Plots of the run" });
  await expect(list).toContainText("shape");
  await expect(list).toContainText("schooling");
});

test.describe("a first visit, in a browser that has never opened Zemp Lite", () => {
  test.use({ firstVisit: true });

  test("opens on the Start screen: the engine fetched, checked and started, then Open Zemp Lite", async ({
    page,
    press,
  }) => {
    await page.goto("/");
    const start = page.getByTestId("start");
    await expect(start.getByRole("heading", { level: 1 })).toContainText("Zemp Lite 0.2");
    await expect(start.getByTestId("alpha")).toHaveText("alpha");
    await expect(start).toContainText("the first public preview of Zemp Lite");
    // The three steps, each done in turn.
    await expect(start.getByTestId("step-fetch")).toHaveClass(/done/);
    await expect(start.getByTestId("step-fetch")).toContainText(/100 % of [\d.]+ MB/);
    await expect(start.getByTestId("step-check")).toHaveClass(/done/);
    await expect(start.getByTestId("step-start")).toHaveClass(/done/);
    await expect(start.getByTestId("step-start")).toContainText("Zeff 0.8.0 ready");
    // The four promises.
    for (const promise of [
      "It runs here.",
      "Your data stays on this computer,",
      "No account.",
      "The next visit opens at once:",
    ]) {
      await expect(start.getByText(promise)).toBeVisible();
    }
    await expect(page.getByRole("link", { name: "What is counted" })).toBeVisible();
    const open = start.getByRole("button", { name: "Open Zemp Lite" });
    await expect(open).toBeEnabled();
    await press(open);
    await expect(page.getByRole("button", { name: "Scratch project" })).toBeVisible();
    await expect(page.getByTestId("alpha")).toHaveText("alpha");
    await expect(page.getByText("Report a problem", { exact: true })).toBeVisible();

    // The next visit opens straight on the welcome screen.
    await page.reload();
    await expect(page.getByRole("button", { name: "Scratch project" })).toBeVisible();
    await expect(page.getByTestId("start")).toHaveCount(0);

    // And a stranger runs the example and reads its results, untold: Run, and each result is
    // open under its statement, with its note beside it.
    await press(page.getByRole("button", { name: "Scratch project" }));
    await expect(page.getByRole("status")).toHaveText(READY);
    await press(page.getByRole("button", { name: "Run", exact: true }));
    await expect(page.getByRole("status")).toHaveText("done");
    await expect(page.locator(".cm-zemp-output").first()).toContainText("summary · by female");
    await expect(page.locator('[data-testid="note"][data-line="10"]')).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  test("a window narrower than 1,200 pixels says so on the Start and welcome screens", async ({
    page,
    press,
  }) => {
    await page.setViewportSize({ width: 1000, height: 800 });
    await page.goto("/");
    const line = page.getByRole("note");
    await expect(line).toContainText("at least 1,200 pixels wide; this one is 1000.");
    await press(page.getByRole("button", { name: "Open Zemp Lite" }));
    await expect(page.getByRole("button", { name: "Scratch project" })).toBeVisible();
    await expect(line).toContainText("No smaller layout exists yet.");
  });
});
