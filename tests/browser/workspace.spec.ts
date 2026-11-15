// The shell of the workspace, in Panes (open decision #146): the top bar, the one left panel
// with its two tabs, the editor tabs, and the Output panel under the script.
import type { Page } from "@playwright/test";
import { editor, expect, scriptText, test } from "./support";

const READY = "engine Zeff 0.7.0 ready";

async function scratch(page: Page, press: (target: ReturnType<Page["locator"]>) => Promise<void>) {
  await page.goto("/");
  await press(page.getByRole("button", { name: "Scratch project" }));
  await expect(page.getByRole("status")).toHaveText(READY);
}

test("the top bar carries its controls in order, Run the one filled, and what is not built yet is not active", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  const bar = page.locator("header");
  await expect(bar).toContainText("Projects ▾");
  await expect(bar.getByRole("heading", { level: 1 })).toHaveText("Scratch");
  await expect(bar).toContainText("/ main.zeff · saved");
  const names = await bar
    .getByRole("button")
    .evaluateAll((buttons) =>
      buttons.map((button) =>
        (button.getAttribute("aria-label") ?? button.textContent ?? "").trim(),
      ),
    );
  expect(names).toEqual([
    "Projects ▾",
    "Smaller code text",
    "Larger code text",
    "Inline",
    "Panes",
    "Check",
    "Run",
  ]);
  await expect(bar.getByRole("switch", { name: "Dark" })).toBeVisible();
  await expect(bar.getByRole("button", { name: "Check" })).toBeDisabled();
  await expect(bar.getByRole("button", { name: "Panes" })).toHaveAttribute("aria-pressed", "true");
  // Run is filled with the logo's violet; the others are outlined words.
  const run = bar.getByRole("button", { name: "Run" });
  expect(await run.evaluate((button) => getComputedStyle(button).backgroundColor)).toBe(
    "rgb(91, 58, 158)",
  );
});

test("the left panel has two tabs, Project with the files and Objects with what a run left", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  const left = page.getByRole("complementary");
  await expect(left.getByRole("tab", { name: "Project" })).toHaveAttribute("aria-selected", "true");
  await expect(left.getByRole("listitem").filter({ hasText: "main.zeff" }).last()).toContainText(
    "B",
  );
  await expect(left.getByRole("listitem").filter({ hasText: "zeff.toml" })).toBeVisible();
  // A folder folds away and comes back.
  const scripts = left.getByRole("button", { name: "scripts", exact: true });
  await press(scripts);
  await expect(scripts).toHaveAttribute("aria-expanded", "false");
  await expect(left.getByRole("button", { name: /main\.zeff/ })).toHaveCount(0);
  await press(scripts);
  await expect(left.getByRole("button", { name: /main\.zeff/ })).toBeVisible();

  await press(left.getByRole("tab", { name: "Objects" }));
  await expect(left.getByText("Run the script to see what it leaves in memory.")).toBeVisible();
  await expect(left.getByText("Zeff 0.7.0 in this browser")).toBeVisible();
  await press(page.getByRole("button", { name: "Run" }));
  await expect(page.getByRole("status")).toHaveText("done");
  await expect(left.getByText("18,412 rows × ")).toBeVisible();
  await expect(left.getByText("wages", { exact: true })).toBeVisible();
  await expect(left.getByText("w2010", { exact: true })).toBeVisible();
  await expect(left.getByRole("tab", { name: "Objects" })).toContainText("2");
  // There is no right panel: the main pane reaches the window's right edge.
  const main = await page.getByRole("region", { name: "Editor" }).boundingBox();
  expect(main!.x + main!.width).toBe(page.viewportSize()!.width);
});

test("the left panel is resized with the keyboard, inside its limits, and folds away", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  const left = page.getByRole("complementary");
  const edge = page.getByRole("separator", { name: "The width of the left panel" });
  await expect(edge).toHaveAttribute("aria-valuenow", "268");
  await edge.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(edge).toHaveAttribute("aria-valuenow", "300");
  expect(Math.round((await left.boundingBox())!.width)).toBe(300);
  for (let press = 0; press < 12; press++) await page.keyboard.press("ArrowLeft");
  await expect(edge).toHaveAttribute("aria-valuenow", "180");
  await press(page.getByRole("button", { name: "Hide the left panel" }));
  await expect(left).toHaveCount(0);
  await press(page.getByRole("button", { name: "Show the left panel" }));
  await expect(left).toBeVisible();
});

test("the left panel and the Output panel are resized by dragging their edges", async ({
  page,
  press,
  mouseWorks,
}) => {
  test.skip(!mouseWorks, "this test browser does not deliver the mouse where it is aimed");
  await scratch(page, press);
  const edge = page.getByRole("separator", { name: "The width of the left panel" });
  const box = (await edge.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 200);
  await page.mouse.down();
  await page.mouse.move(400, box.y + 200, { steps: 4 });
  await page.mouse.up();
  await expect(edge).toHaveAttribute("aria-valuenow", "400");

  const top = page.getByRole("separator", { name: "The height of the Output panel" });
  const before = Number(await top.getAttribute("aria-valuenow"));
  const at = (await top.boundingBox())!;
  await page.mouse.move(at.x + 300, at.y + at.height / 2);
  await page.mouse.down();
  await page.mouse.move(at.x + 300, at.y - 120, { steps: 4 });
  await page.mouse.up();
  expect(Number(await top.getAttribute("aria-valuenow"))).toBeGreaterThan(before + 10);
});

test("the Output panel sits under the script, folds away, is resized and is cleared", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  const script = page.locator(".cm-editor");
  const output = page.getByTestId("output");
  await press(page.getByRole("button", { name: "Run" }));
  await expect(page.getByRole("status")).toHaveText("done");
  await expect(output).toContainText("summary · by female");
  // Under the script, in the same pane.
  const above = (await script.boundingBox())!;
  const below = (await output.boundingBox())!;
  expect(below.y).toBeGreaterThan(above.y + above.height - 1);

  const edge = page.getByRole("separator", { name: "The height of the Output panel" });
  await expect(edge).toHaveAttribute("aria-valuenow", "42");
  await edge.focus();
  await page.keyboard.press("ArrowUp");
  await expect(edge).toHaveAttribute("aria-valuenow", "46");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(edge).toHaveAttribute("aria-valuenow", "38");

  await press(page.getByRole("button", { name: "Hide the output" }));
  await expect(output).toHaveCount(0);
  await expect(edge).toHaveCount(0);
  await press(page.getByRole("button", { name: "Show the output" }));
  await expect(output).toContainText("summary · by female");
  await press(page.getByRole("button", { name: "Clear" }));
  await expect(output).toHaveText("Press Run to see each result under the line that made it.");
});

test("a file opens in a tab of its own, and a tab closes to its neighbour", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  const tabs = page.getByRole("tablist", { name: "Open files" });
  await expect(tabs.getByRole("tab")).toHaveText(["main.zeff"]);
  await press(page.getByRole("complementary").getByRole("button", { name: /zeff\.toml/ }));
  await expect(tabs.getByRole("tab")).toHaveText(["main.zeff", "zeff.toml"]);
  await expect(tabs.getByRole("tab", { name: "zeff.toml" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect.poll(() => scriptText(page)).toMatch(/^\[project\]\nname = "Scratch"/);
  await expect(page.locator("header")).toContainText("/ zeff.toml · saved");
  await press(tabs.getByRole("tab", { name: "main.zeff" }));
  await expect.poll(() => scriptText(page)).toMatch(/^\/\/ A first look at the wages/);
  await expect(page.getByText("scripts › main.zeff")).toBeVisible();
  await press(page.getByRole("button", { name: "Close main.zeff" }));
  await expect(tabs.getByRole("tab")).toHaveText(["zeff.toml"]);
  await press(page.getByRole("button", { name: "Close zeff.toml" }));
  await expect(page.getByText("No file is open. Choose one in the Project tab.")).toBeVisible();
});

test("the Dark switch of the top bar switches the theme", async ({ page, press }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await scratch(page, press);
  const dark = page.getByRole("switch", { name: "Dark" });
  await expect(dark).toHaveAttribute("aria-checked", "false");
  await press(dark);
  await expect(dark).toHaveAttribute("aria-checked", "true");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
    "rgb(22, 23, 27)",
  );
});

test("the code size control changes the code and its output together, and is remembered", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  const size = (target: ReturnType<Page["locator"]>) =>
    target.evaluate((node) => getComputedStyle(node).fontSize);
  const script = editor(page);
  await press(page.getByRole("button", { name: "Run" }));
  await expect(page.getByRole("status")).toHaveText("done");
  const output = page.getByTestId("printed").first();
  expect(await size(script)).toBe("14px");
  expect(await size(output)).toBe("13px");
  await press(page.getByRole("button", { name: "Larger code text" }));
  await press(page.getByRole("button", { name: "Larger code text" }));
  await press(page.getByRole("button", { name: "Larger code text" }));
  await expect(page.getByRole("group", { name: "Code text size" })).toContainText("18");
  expect(await size(script)).toBe("18px");
  expect(await size(output)).toBe("17px");
  // The size is the user's, not the project's: it is there again on a later visit.
  await scratch(page, press);
  await expect(page.getByRole("group", { name: "Code text size" })).toContainText("18");
  expect(await size(editor(page))).toBe("18px");
  for (let press_ = 0; press_ < 8; press_++) {
    const smaller = page.getByRole("button", { name: "Smaller code text" });
    if (await smaller.isDisabled()) break;
    await press(smaller);
  }
  await expect(page.getByRole("group", { name: "Code text size" })).toContainText("12");
  await expect(page.getByRole("button", { name: "Smaller code text" })).toBeDisabled();
});

test("a window narrower than 1,200 pixels says that no smaller layout exists yet", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await expect(page.getByRole("note")).toHaveCount(0);
  await page.setViewportSize({ width: 1000, height: 700 });
  await expect(page.getByRole("note")).toContainText(
    "at least 1,200 pixels wide; this one is 1000. No smaller layout exists yet.",
  );
});

test("app screens are set at 13.5 pixels and never below 12.5", async ({ page, press }) => {
  await scratch(page, press);
  expect(await page.evaluate(() => getComputedStyle(document.body).fontSize)).toBe("13.5px");
  const smallest = await page.evaluate(() => {
    let least = Infinity;
    for (const node of document.querySelectorAll("body *")) {
      if (node.textContent?.trim() && node.children.length === 0) {
        least = Math.min(least, parseFloat(getComputedStyle(node).fontSize));
      }
    }
    return least;
  });
  expect(smallest).toBeGreaterThanOrEqual(12.5);
});

test("a project is closed and another opened, each with an engine of its own", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  for (let round = 0; round < 3; round++) {
    // Closing a project ends its worker; the next project starts a new one.
    await press(page.getByRole("button", { name: "Projects" }));
    await expect(page.getByText("No project open")).toBeVisible();
    await press(page.getByRole("button", { name: "Scratch project" }));
    await expect(page.getByRole("status")).toHaveText(READY);
  }
  await press(page.getByRole("button", { name: "Run" }));
  await expect(page.getByRole("status")).toHaveText("done");
});
