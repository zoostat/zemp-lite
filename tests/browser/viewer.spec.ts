// The plot viewer (release 0.1, step 12): the gallery strip, compare, pop out, the journal
// sizes, and a figure saved by the engine's `export`.
import { readFileSync } from "node:fs";
import type { Locator, Page } from "@playwright/test";
import { expect, test, useExample } from "./support";

const READY = "engine Zeff 0.8.0 ready";
const kept = (name: string) => readFileSync(new URL(`../scripts/figures/${name}`, import.meta.url));

/** Run the example in Panes and open the plot viewer. */
async function viewer(page: Page, press: (target: Locator) => Promise<void>): Promise<Locator> {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto("/");
  await press(page.getByRole("button", { name: "Scratch project" }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await useExample(page);
  await press(page.getByRole("button", { name: "Panes", exact: true }));
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await press(page.getByRole("tab", { name: "Plots" }));
  const plots = page.getByTestId("plots");
  await expect(plots.locator(".stage img")).toBeVisible();
  return plots;
}

/** The image of a figure: the size it is shown at, and the size the SVG gives itself, in pixels. */
async function sizes(image: Locator) {
  await expect(image).toBeVisible();
  return image.evaluate((node) => {
    const img = node as HTMLImageElement;
    const svg = decodeURIComponent(img.src.slice(img.src.indexOf(",") + 1));
    const own = /<svg[^>]*\swidth="([\d.]+)pt"\sheight="([\d.]+)pt"/.exec(svg);
    return {
      shown: [img.width, img.height] as [number, number],
      own: [(Number(own?.[1]) * 96) / 72, (Number(own?.[2]) * 96) / 72] as [number, number],
      svg,
    };
  });
}

test("the viewer shows a plot drawn to fit, and the strip holds every plot of the run as a thumbnail", async ({
  page,
  press,
}) => {
  const plots = await viewer(page, press);
  await expect(plots.getByRole("heading", { level: 2 })).toHaveText(
    /line 17\s+w2010 · log\(wage\) against educ/,
  );
  const stage = (await plots.locator(".stage").boundingBox())!;
  const main = await sizes(plots.locator(".stage img"));
  // Drawn to fit the pane: nearly all its width and height, at the figure's own size.
  expect(main.shown[0]).toBeGreaterThan(stage.width - 60);
  expect(main.shown[1]).toBeGreaterThan(stage.height - 80);
  expect(Math.abs(main.own[0] - main.shown[0])).toBeLessThan(1);

  const strip = plots.getByRole("list", { name: "Plots of the last run" });
  const thumbs = strip.getByRole("listitem");
  await expect(thumbs).toHaveCount(2);
  await expect(thumbs.nth(0)).toContainText("w2010 · log(wage) against educ");
  await expect(thumbs.nth(1)).toContainText("w2010 · log(wage)");
  await expect(thumbs.nth(0).locator("img")).toBeVisible();
  await expect(thumbs.nth(1).locator("img")).toBeVisible();
  // A click on a thumbnail shows its plot.
  await press(strip.getByRole("button", { name: "Show the plot w2010 · log(wage)", exact: true }));
  await expect(plots.getByRole("heading", { level: 2 })).toHaveText(
    /line 21\s+w2010 · log\(wage\)$/,
  );
  await expect(thumbs.nth(1)).toHaveClass(/on/);
  const second = await sizes(plots.locator(".stage img"));
  expect(second.svg).not.toBe(main.svg);
});

test("the thumbnails are reordered with the keyboard, and by dragging one to another's place", async ({
  page,
  press,
  mouseWorks,
  browserName,
}) => {
  const plots = await viewer(page, press);
  const strip = plots.getByRole("list", { name: "Plots of the last run" });
  const names = () => strip.locator(".name").allTextContents();
  expect(await names()).toEqual(["w2010 · log(wage) against educ", "w2010 · log(wage)"]);
  await strip.getByRole("button", { name: "Show the plot w2010 · log(wage) against educ" }).focus();
  await page.keyboard.press("Alt+ArrowRight");
  await expect.poll(names).toEqual(["w2010 · log(wage)", "w2010 · log(wage) against educ"]);
  await page.keyboard.press("Alt+ArrowLeft");
  await expect.poll(names).toEqual(["w2010 · log(wage) against educ", "w2010 · log(wage)"]);
  // Dragging with the mouse, where the test browser carries a drag out as a person's does.
  if (mouseWorks && browserName === "chromium") {
    await strip.getByRole("listitem").nth(0).dragTo(strip.getByRole("listitem").nth(1));
    await expect.poll(names).toEqual(["w2010 · log(wage)", "w2010 · log(wage) against educ"]);
  }
});

test("two plots are pinned side by side, each drawn to fit its half", async ({ page, press }) => {
  const plots = await viewer(page, press);
  const single = await sizes(plots.locator(".stage img"));
  const pins = plots.getByRole("checkbox", { name: "Compare" });
  await press(pins.nth(0));
  // One plot pinned is no comparison yet.
  await expect(plots.getByTestId("comparing")).toHaveCount(0);
  await press(pins.nth(1));
  await expect(plots.getByTestId("comparing")).toHaveText("comparing 2");
  const images = plots.locator(".stage img");
  await expect(images).toHaveCount(2);
  const left = (await images.nth(0).boundingBox())!;
  const right = (await images.nth(1).boundingBox())!;
  expect(Math.abs(left.y - right.y)).toBeLessThan(2);
  expect(right.x).toBeGreaterThan(left.x + left.width);
  // Each is drawn afresh for its half, not the one figure made smaller.
  const half = await sizes(images.nth(0));
  expect(half.shown[0]).toBeLessThan(single.shown[0] * 0.6);
  expect(Math.abs(half.own[0] - half.shown[0])).toBeLessThan(1);
  await expect(plots.getByRole("heading", { level: 2 })).toHaveText([/line 17/, /line 21/]);
  await press(plots.getByRole("button", { name: "Unpin all" }));
  await expect(images).toHaveCount(1);
  await expect(pins.nth(0)).not.toBeChecked();
});

test("a plot is previewed at the sizes of a journal column, a page's width and a slide", async ({
  page,
  press,
}) => {
  const plots = await viewer(page, press);
  // The list of plots hidden, so that a slide has room at its true size.
  await press(plots.getByRole("button", { name: "‹ Hide" }));
  const image = plots.locator(".stage img");
  const group = plots.getByRole("group", { name: "Size" });
  for (const [name, mm, px, pt] of [
    ["One column", "89 × 66 mm", [336, 249], "252.283"],
    ["Two columns", "183 × 110 mm", [692, 416], "518.74"],
    ["Slide", "254 × 143 mm", [960, 540], "720"],
  ] as const) {
    await press(group.getByRole("button", { name }));
    await expect(plots.getByText(mm)).toBeVisible();
    await expect(image).toHaveAttribute("data-size", `${px[0]}x${px[1]}`);
    const drawn = await sizes(image);
    // The figure is the engine's at that page: its width in points is the page's.
    expect(drawn.svg).toContain(`width="${pt}`);
    expect(Math.abs(drawn.own[0] - drawn.shown[0])).toBeLessThan(1);
  }
  await press(group.getByRole("button", { name: "Fit" }));
  await expect.poll(async () => (await sizes(image)).shown[0]).toBeGreaterThan(960);
});

for (const format of ["svg", "pdf", "png"] as const) {
  test(`a plot saved as ${format.toUpperCase()} at one-column size is the file \`zeff run\` 0.8.0 writes, byte for byte`, async ({
    page,
    press,
  }) => {
    const plots = await viewer(page, press);
    await press(
      plots.getByRole("group", { name: "Size" }).getByRole("button", { name: "One column" }),
    );
    await plots.getByLabel("Save as").selectOption(format);
    // The statement that does the same is offered beside it.
    await expect(plots.getByTestId("export-statement")).toHaveText(
      `schooling.export("output/schooling.${format}", size: one_column)`,
    );
    const download = page.waitForEvent("download");
    await press(plots.getByRole("button", { name: "Save…" }));
    const saved = await download;
    expect(saved.suggestedFilename()).toBe(`schooling.${format}`);
    const bytes = readFileSync(await saved.path());
    expect(bytes.equals(kept(`schooling-one-column.${format}`))).toBe(true);
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
}

test("saved to fit, a figure has the size it is shown at, and the statement says so", async ({
  page,
  press,
}) => {
  const plots = await viewer(page, press);
  const shown = await sizes(plots.locator(".stage img"));
  const statement = (await plots.getByTestId("export-statement").textContent()) ?? "";
  const size = /size: \[([\d.]+), ([\d.]+)\]\)$/.exec(statement);
  expect(size).not.toBeNull();
  // Millimetres of the place on the screen: a pixel is 25.4/96 mm.
  expect(Math.abs((Number(size![1]) * 96) / 25.4 - shown.shown[0])).toBeLessThan(40);
  await press(plots.getByRole("button", { name: "Copy as Zeff" }));
  await expect(plots.getByRole("button", { name: /Copied|Copy as Zeff/ })).toBeVisible();
});

test("a plot pops out into a window of its own, which redraws it to fit when resized", async ({
  page,
  press,
}) => {
  const plots = await viewer(page, press);
  const opening = page.waitForEvent("popup");
  await press(plots.getByRole("button", { name: "Pop out" }));
  const popup = await opening;
  await expect(popup).toHaveTitle("Plot: w2010 · log(wage) against educ");
  await expect(popup.getByRole("heading", { level: 1 })).toHaveText(
    /line 17\s+w2010 · log\(wage\) against educ/,
  );
  const image = popup.locator("img");
  await popup.setViewportSize({ width: 900, height: 640 });
  await expect
    .poll(async () => (await sizes(image)).shown, { timeout: 10_000 })
    .toEqual([876, 576]);
  const first = await sizes(image);
  expect(Math.abs(first.own[0] - first.shown[0])).toBeLessThan(1);
  await popup.setViewportSize({ width: 600, height: 500 });
  await expect
    .poll(async () => (await sizes(image)).shown, { timeout: 10_000 })
    .toEqual([576, 436]);
  const second = await sizes(image);
  expect(Math.abs(second.own[0] - second.shown[0])).toBeLessThan(1);
  expect(second.svg).not.toBe(first.svg);
  // The popped window has this window's look: its fonts and its colours.
  expect(await popup.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain(
    "Atkinson Hyperlegible Next",
  );
  // It closes with the project.
  const closed = popup.waitForEvent("close");
  await press(page.getByRole("button", { name: "Projects" }));
  await closed;
});

test("from the margin editor the viewer is opened with ⌘K, in the script's place, and Script goes back", async ({
  page,
  press,
}) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto("/");
  await press(page.getByRole("button", { name: "Scratch project" }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await useExample(page);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByRole("combobox", { name: "Type a command" }).fill("plot viewer");
  await page.keyboard.press("Enter");
  const plots = page.getByTestId("plots");
  await expect(plots.locator(".stage img")).toBeVisible();
  await expect(
    plots.getByRole("list", { name: "Plots of the last run" }).getByRole("listitem"),
  ).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Margin", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await press(plots.getByRole("button", { name: "‹ Script" }));
  await expect(page.getByRole("textbox", { name: "The script", exact: true })).toBeVisible();
  await expect(plots).toHaveCount(0);
});

test("the viewer says so where the last run drew no plot", async ({ page, press }) => {
  await page.goto("/");
  await press(page.getByRole("button", { name: "Scratch project" }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByRole("combobox", { name: "Type a command" }).fill("plot viewer");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("plots")).toContainText("Run the script to see its plots here.");
});

test("the places: Script and Plots in the top bar, and the list of plots at the left, which hides", async ({
  page,
  press,
}) => {
  await page.goto("/");
  await press(page.getByRole("button", { name: "Scratch project" }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await useExample(page);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  const places = page.getByRole("navigation", { name: "Places" });
  await expect(places.getByRole("button", { name: "Script" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await press(places.getByRole("button", { name: "Plots" }));
  await expect(places.getByRole("button", { name: "Plots" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  const list = page.getByRole("complementary", { name: "The list of plots" });
  await expect(list).toBeVisible();
  // Each plot by its name, its line and its kind, as the engine's table of what it drew names it.
  await expect(list).toContainText("w2010 · log(wage) against educ");
  await expect(list).toContainText("line 17 · fit band, points, fit line");
  await expect(list).toContainText("line 21 · histogram");
  await press(list.getByRole("button", { name: "‹ Hide" }));
  await expect(list).toHaveCount(0);
  await press(page.getByRole("button", { name: "Show the list of plots ›" }));
  await expect(page.getByRole("complementary", { name: "The list of plots" })).toBeVisible();
  // Back to the script, where it was.
  await press(places.getByRole("button", { name: "Script" }));
  await expect(page.getByTestId("note").first()).toBeVisible();
});
