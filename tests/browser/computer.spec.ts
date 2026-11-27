// Zemp Lite is made for a computer (release 0.3.1, step 3; open decision #243). Below 1,000
// pixels of width a page says so, and why, over the app, with a way on at the visitor's own
// risk that is kept for the visit; from 1,000 pixels nothing is said, and the layout is the
// computer's (`whole-1024.spec.ts` holds every screen whole at a tablet's width). Where the
// pointer is a finger, whatever is pressed is at least 32 pixels high and wide. That a plot's
// own window is never told so is held where that window is opened (`viewer.spec.ts`).
import type { Page } from "@playwright/test";
import { expect, faintText, notWhole, scriptText, smallestText, test, useExample } from "./support";

const READY = "engine Zeff 0.9.0 ready";

const notice = (page: Page) => page.getByTestId("computer-notice");
const onwards = (page: Page) => page.getByRole("button", { name: "Go on anyway" });

for (const [width, height, what] of [
  [375, 812, "a phone"],
  [768, 1024, "a tablet held upright"],
] as const) {
  for (const theme of ["light", "dark"] as const) {
    test(`on ${what}, ${width} pixels wide, a page says that Zemp Lite is made for a computer, in the ${theme} theme`, async ({
      page,
      browserName,
    }) => {
      await page.emulateMedia({ colorScheme: theme });
      await page.setViewportSize({ width, height });
      await page.goto("/");
      await expect(notice(page)).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(
        page.getByRole("dialog", { name: "Zemp Lite is made for a computer" }),
      ).toBeVisible();
      // What it says: the window's width, what the screens are laid out for, and the way on.
      await expect(notice(page)).toContainText(`This window is ${width} pixels wide.`);
      await expect(notice(page)).toContainText(
        "laid out for a window at least 1,000 pixels wide: a laptop, a desktop, or a tablet held sideways",
      );
      await expect(notice(page)).toContainText(
        "You may go on at your own risk. Your projects and the engine work as on a computer",
      );
      // It keeps to the floor of sizes and contrast, and fits the window.
      expect(await smallestText(page)).toBeGreaterThanOrEqual(12.5);
      expect(await faintText(notice(page))).toEqual([]);
      const over = await notice(page).evaluate((node) => node.scrollWidth - node.clientWidth);
      expect(over).toBeLessThanOrEqual(0);
      // It covers the window, and the one thing the keyboard reaches is the way on.
      const box = (await notice(page).boundingBox())!;
      expect([box.x, box.y, box.width, box.height]).toEqual([0, 0, width, height]);
      await expect(onwards(page)).toBeFocused();
      const high = (await onwards(page).boundingBox())!.height;
      expect(high).toBeGreaterThanOrEqual(32);
      // Tab never reaches the app beneath: the focus stays in the page, or leaves the document.
      for (let pressed = 0; pressed < 3; pressed += 1) {
        await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
        const within = await page.evaluate(() => {
          const on = document.activeElement;
          return on === null || on === document.body || on.closest("dialog") !== null;
        });
        expect(within, `after ${pressed + 1} of Tab`).toBe(true);
      }
    });
  }
}

test("Go on anyway opens the app as on a computer, and is kept for the visit, not for the next", async ({
  page,
  press,
  context,
}) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/");
  await press(onwards(page));
  await expect(notice(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Scratch project/ })).toBeVisible();
  // The page loaded again in the same tab: not asked again.
  await page.reload();
  await expect(page.getByRole("button", { name: /^Scratch project/ })).toBeVisible();
  await expect(notice(page)).toHaveCount(0);
  // The app is there, as on a computer: a project opens and its engine starts.
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await expect(notice(page)).toHaveCount(0);
  // Another tab is another visit.
  const other = await context.newPage();
  await other.setViewportSize({ width: 768, height: 1024 });
  await other.goto("/");
  await expect(notice(other)).toBeVisible();
  // Escape goes on, as the button does.
  await other.keyboard.press("Escape");
  await expect(notice(other)).toHaveCount(0);
  await other.reload();
  await expect(other.getByRole("button", { name: /^Scratch project/ })).toBeVisible();
  await expect(notice(other)).toHaveCount(0);
});

test("from 1,000 pixels nothing is said; a window made narrower is told, over the work, and made wide again is not", async ({
  page,
  press,
}) => {
  // (A tall window, so that the editor draws the whole script: it draws what is near the window.)
  for (const width of [1024, 1000]) {
    await page.setViewportSize({ width, height: 3200 });
    await page.goto("/");
    await expect(page.getByRole("button", { name: /^Scratch project/ })).toBeVisible();
    await expect(notice(page)).toHaveCount(0);
  }
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await useExample(page);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  const before = await scriptText(page);
  // One pixel under: the page stands over the work, which is not lost.
  await page.setViewportSize({ width: 999, height: 3200 });
  await expect(notice(page)).toBeVisible();
  await expect(notice(page)).toContainText("This window is 999 pixels wide.");
  // Wide again: the page is gone with nothing pressed, and nothing was kept of it.
  await page.setViewportSize({ width: 1024, height: 3200 });
  await expect(notice(page)).toHaveCount(0);
  await expect.poll(() => scriptText(page)).toBe(before);
  await expect(page.getByTestId("run-facts")).toHaveText(/^run 1 · /);
  await expect(page.getByRole("status")).toHaveText("done");
  await page.setViewportSize({ width: 999, height: 3200 });
  await expect(notice(page)).toBeVisible();
});

test.describe("a first visit", () => {
  test.use({ firstVisit: true });

  test("on a phone the engine is started beneath the page, and Start is open once the visitor goes on", async ({
    page,
    press,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(notice(page)).toBeVisible();
    await press(onwards(page));
    const start = page.getByRole("button", { name: "Start" });
    await expect(start).toBeEnabled({ timeout: 30_000 });
    await press(start);
    await expect(page.getByRole("button", { name: /^Scratch project/ })).toBeVisible();
  });
});

test.describe("where the pointer is a finger", () => {
  test.use({ viewport: { width: 1024, height: 768 }, hasTouch: true });

  test("whatever is pressed is at least 32 pixels high and wide, on every place", async ({
    page,
    press,
  }) => {
    await page.goto("/");
    // A test browser that cannot be told its pointer is a finger holds nothing here; the rule
    // is one line of the style sheet, the same for every browser.
    const finger = await page.evaluate(() => matchMedia("(pointer: coarse)").matches);
    test.skip(!finger, "this test browser's pointer cannot be made a finger");
    /** The controls drawn that are smaller than a finger needs, each with its size. */
    const small = () =>
      page.evaluate(() => {
        const found: string[] = [];
        for (const control of document.querySelectorAll(
          'button, select, summary, [role="button"], [role="switch"], [role="tab"], [role="menuitem"], [role="option"]',
        )) {
          const box = control.getBoundingClientRect();
          const style = getComputedStyle(control);
          if (box.width === 0 || box.height === 0 || style.visibility === "hidden") continue;
          if (box.width < 31.5 || box.height < 31.5) {
            const said = (control.getAttribute("aria-label") ?? control.textContent ?? "")
              .replace(/\s+/g, " ")
              .trim();
            found.push(
              `"${said.slice(0, 30)}" ${Math.round(box.width)} × ${Math.round(box.height)}`,
            );
          }
        }
        return found;
      });
    await expect(page.getByRole("button", { name: /^Scratch project/ })).toBeVisible();
    // (Each screen is measured once it has settled: a table's columns are sized as it is drawn.)
    await expect.poll(small, { message: "the projects screen" }).toEqual([]);
    expect(await notWhole(page), "the projects screen").toEqual([]);
    await press(page.getByRole("button", { name: /^Scratch project/ }));
    await expect(page.getByRole("status")).toHaveText(READY);
    await useExample(page);
    await press(page.getByRole("button", { name: "Run", exact: true }));
    await expect(page.getByRole("status")).toHaveText("done");
    await expect.poll(small, { message: "Script" }).toEqual([]);
    expect(await notWhole(page), "Script").toEqual([]);
    for (const place of ["Data", "Plots", "Paper", "Help"]) {
      await press(
        page
          .getByRole("navigation", { name: "Places" })
          .getByRole("button", { name: place, exact: true }),
      );
      await expect(
        page.getByRole("toolbar", { name: `${place}: its panes and its controls` }),
      ).toBeVisible();
      // What the place holds is drawn before it is measured: the table of the data with its
      // headers, the plot, the place's own words.
      if (place === "Data") await expect(page.getByRole("columnheader").nth(3)).toBeVisible();
      if (place === "Plots") await expect(page.locator("img").first()).toBeVisible();
      if (place === "Help") await expect(page.getByTestId("help-counts")).toBeVisible();
      await expect.poll(small, { message: place }).toEqual([]);
      expect(await notWhole(page), place).toEqual([]);
    }
  });
});
