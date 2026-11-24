// A plot from the engine, at the size of its pane (release 0.1, step 11).
import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { expect, printed, saidAsWritten, scriptText, test, write, useExample } from "./support";

const READY = "engine Zeff 0.8.0 ready";
const file = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test.use({ viewport: { width: 1280, height: 3200 } });

async function scratch(page: Page, press: (target: ReturnType<Page["locator"]>) => Promise<void>) {
  await page.goto("/app/");
  await press(page.getByRole("button", { name: "Scratch project" }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await useExample(page);
}

/** The figure shown for the plot of a line: the image, the SVG it holds, and its sizes. */
async function figure(page: Page, line: number, within = page.locator("body")) {
  const image = within.locator(`[data-testid="figure"][data-line="${line}"] img`);
  await expect(image).toBeVisible();
  return image.evaluate((node) => {
    const img = node as HTMLImageElement;
    const svg = decodeURIComponent(img.src.slice(img.src.indexOf(",") + 1));
    const size = /<svg[^>]*\swidth="([\d.]+)pt"\sheight="([\d.]+)pt"/.exec(svg);
    return {
      svg,
      // The size the image is shown at, and the size the figure gives itself, in pixels.
      shown: [img.width, img.height],
      own: size === null ? null : [(Number(size[1]) * 96) / 72, (Number(size[2]) * 96) / 72],
      place: [img.parentElement?.clientWidth ?? 0, img.parentElement?.clientHeight ?? 0],
    };
  });
}

/**
 * The figure of line 17 in `within` once it holds still: the drawing shown is the one made for
 * its place, `also` holds of it, and the same is read twice in a row, 300 ms apart, which is
 * longer than the interface waits before it asks for a drawing.
 */
async function steady(
  page: Page,
  within: ReturnType<Page["locator"]>,
  also: (now: Awaited<ReturnType<typeof figure>>) => boolean,
) {
  let last = "";
  let held: Awaited<ReturnType<typeof figure>> | null = null;
  await expect
    .poll(
      async () => {
        const now = await figure(page, 17, within);
        const fits = JSON.stringify(now.shown) === JSON.stringify(now.place) && also(now);
        const seen = `${JSON.stringify(now.shown)} ${now.svg.length}`;
        const still = fits && seen === last;
        last = fits ? seen : "";
        if (still) held = now;
        return still;
      },
      { intervals: [300], timeout: 20_000 },
    )
    .toBe(true);
  return held!;
}

test("each plot of the example is drawn under the statement that made it, by the engine, at the size of its place", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  // A script opens folded: its figures are drawn under their statements once unfolded.
  await press(page.getByRole("button", { name: "Unfold all", exact: true }));
  for (const line of [17, 21]) {
    const drawn = await figure(page, line);
    // An SVG of the engine's, with its text drawn as outlines.
    expect(
      drawn.svg.startsWith(
        '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg"',
      ),
    ).toBe(true);
    expect(drawn.svg).toContain('<g id="background">');
    // Drawn for its place: the figure's own size is the size it is shown at, to a pixel, so
    // nothing is stretched, and it fills the place it stands in.
    expect(Math.abs(drawn.own![0]! - drawn.shown[0]!)).toBeLessThan(1);
    expect(Math.abs(drawn.own![1]! - drawn.shown[1]!)).toBeLessThan(1);
    expect(drawn.shown).toEqual(drawn.place);
  }
  await expect(page.getByTestId("drawing")).toHaveCount(0);
  await expect(page.locator('[data-testid="figure"][data-line="17"] img')).toHaveAttribute(
    "alt",
    "Plot: w2010 · log(wage) against educ",
  );
  // The two are different figures.
  expect((await figure(page, 17)).svg).not.toBe((await figure(page, 21)).svg);
});

test("the lines added to draw the figures never show: the script and its output are as they were", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  // A script opens folded: its figures are drawn under their statements once unfolded.
  await press(page.getByRole("button", { name: "Unfold all", exact: true }));
  await figure(page, 17);
  await figure(page, 21);
  expect(await scriptText(page)).toBe(file("tests/scripts/example/scripts/main.zeff"));
  expect(await printed(page)).toBe(file("tests/scripts/example/expected/stdout.txt"));
  expect(await saidAsWritten(page)).toBe(file("tests/scripts/example/expected/stderr.txt"));
  await expect(page.locator("header.top")).toContainText("· saved");
  await expect(page.getByTestId("sync")).toHaveText("in sync · 1 warning");
  // The statements of the run are still the script's nine.
  await expect(page.getByTestId("run-facts")).toContainText("9 statements");
});

test("a plot is under its statement in the script and in the Plots place, laid out for each", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  const places = page.getByRole("navigation", { name: "Places" });
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  // A run leaves the Script place the one shown, with each plot under its statement.
  await expect(places.getByRole("button", { name: "Script" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  const inScript = await figure(page, 17, page.locator(".cm-zemp-output"));
  expect(Math.abs(inScript.own![0]! - inScript.shown[0]!)).toBeLessThan(1);

  // The Plots place, in a window of an ordinary height.
  await page.setViewportSize({ width: 1280, height: 900 });
  await press(places.getByRole("button", { name: "Plots" }));
  await expect(places.getByRole("button", { name: "Plots" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  const plots = page.getByTestId("plots");
  await expect(plots.locator(".stage").getByRole("heading", { level: 2 })).toHaveText(
    /line 17\s+w2010 · log\(wage\) against educ/,
  );
  // Both panes of the Plots place closed, so that the plot has the place's whole width.
  await press(plots.getByRole("button", { name: "Plots of the run", exact: true }));
  await press(plots.getByRole("button", { name: "The plot", exact: true }));
  await expect(plots.getByRole("list", { name: "Plots of the last run" })).toBeHidden();
  // The plot is laid out again for the wider place, by a run at the new width: it is read
  // once the place has widened and the drawing shown is the one made for it, the same at two
  // readings in a row (on a slow machine the place can still be widening, or the drawing on
  // its way, at the first readings).
  const inPlots = await steady(
    page,
    plots.locator(".stage"),
    (now) => now.shown[0]! > inScript.shown[0]!,
  );
  expect(inPlots.shown).toEqual(inPlots.place);
  expect(Math.abs(inPlots.own![0]! - inPlots.shown[0]!)).toBeLessThan(1);
  // Larger than under its statement, and a different drawing: laid out for this place.
  expect(inPlots.shown[0]!).toBeGreaterThan(inScript.shown[0]!);
  expect(inPlots.svg).not.toBe(inScript.svg);
  await expect(page.getByTestId("draw-time")).toHaveText(/^drawn by a run of the script in \d/);
  test.info().annotations.push({
    type: "redraw",
    description: (await page.getByTestId("draw-time").textContent()) ?? "",
  });
});

test("when its place is made narrower a plot is laid out afresh, never stretched, its text the same size", async ({
  page,
  press,
}) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await scratch(page, press);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await press(
    page.getByRole("navigation", { name: "Places" }).getByRole("button", { name: "Plots" }),
  );
  const plots = page.getByTestId("plots");
  const stage = plots.locator(".stage");
  // The first drawing for the place as it opens, held still before it is read.
  const wide = await steady(page, stage, () => true);

  // The window is made narrower in steps, as an edge dragged makes it, and the plots' place
  // with it.
  for (let step = 1; step <= 4; step++) {
    await page.setViewportSize({ width: 1400 - step * 50, height: 900 });
  }
  // Wait for the place to settle and its last redraw to arrive: each step narrows the place
  // and asks for a figure, so one of the earlier figures can be on the page for a moment
  // after the place has reached its final width.
  const narrow = await steady(page, stage, (now) => now.shown[0]! < wide.shown[0]! - 100);
  // A new figure of new proportions for the new place, at its own size.
  expect(narrow.shown).toEqual(narrow.place);
  expect(Math.abs(narrow.own![0]! - narrow.shown[0]!)).toBeLessThan(1);
  expect(narrow.svg).not.toBe(wide.svg);
  // Text is not scaled with the figure: each text is set at a size in points, which the
  // figure records beside its outlines, and the sizes are the same in both drawings.
  const sizes = (svg: string) =>
    [...new Set([...svg.matchAll(/font-size="([\d.]+)"/g)].map((found) => found[1]))].sort();
  expect(sizes(wide.svg).length).toBeGreaterThan(0);
  expect(sizes(narrow.svg)).toEqual(sizes(wide.svg));
  const title = (svg: string) =>
    /<text[^>]*font-size="([\d.]+)"[^>]*>Years of schooling<\/text>/.exec(svg)?.[1];
  expect(title(wide.svg)).toBeDefined();
  expect(title(narrow.svg)).toBe(title(wide.svg));
});

test("a plot that is not given a name is drawn too, and a figure stays light in the dark theme", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await write(
    page,
    "dataset(wages)\n    .where(year == 2010)\n    .plot(x: log(wage))\n    .histogram(bins: 20) // the shape\n",
  );
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  // A script opens folded: its figures are drawn under their statements once unfolded.
  await press(page.getByRole("button", { name: "Unfold all", exact: true }));
  const drawn = await figure(page, 1);
  expect(drawn.svg).toContain("<svg");
  await press(page.getByRole("switch", { name: "Dark" }));
  const frame = page.locator('[data-testid="figure"] .frame');
  expect(await frame.evaluate((node) => getComputedStyle(node).backgroundColor)).toBe(
    "rgb(255, 255, 255)",
  );
  expect(await scriptText(page)).toBe(
    "dataset(wages)\n    .where(year == 2010)\n    .plot(x: log(wage))\n    .histogram(bins: 20) // the shape\n",
  );
});

test("a new run draws its own figures, and a script with no plot has none", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  // A script opens folded: its figures are drawn under their statements once unfolded.
  await press(page.getByRole("button", { name: "Unfold all", exact: true }));
  const first = await figure(page, 17);
  await write(page, "let w = dataset(wages).where(year == 2012)\nw.scatter(educ, log(wage))\n");
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await press(page.getByRole("button", { name: "Unfold all", exact: true }));
  await expect(page.getByTestId("figure")).toHaveCount(1);
  const second = await figure(page, 2);
  expect(second.svg).not.toBe(first.svg);
  await write(page, "print(1)\n");
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await press(page.getByRole("button", { name: "Unfold all", exact: true }));
  await expect.poll(() => printed(page)).toBe("1\n");
  await expect(page.getByTestId("figure")).toHaveCount(0);
});
