// The whole of what release 0.2.4 drew and 0.2.5 keeps (step 15 of 0.2.4; the landing page went
// at 0.2.5, open decision #225): every screen of the front door, and Help as it now stands,
// taken through the keyboard, 12.5 pixels, 4.5 to 1 and both themes, at a desk's width and a
// tablet's held sideways (until release 0.3.1, a phone's: open decision #243 withdrew the phone's
// layout, and each state then held at 375 pixels is held at 1,024). Each screen has tests of its own for what it does (`start.spec`, `welcome.spec`,
// `help-home.spec`, `help-onpage.spec`); this one holds them all to the same floor, state by
// state, so that a state none of those looks at is not left out.
import type { Page } from "@playwright/test";
import { expect, faintText, smallestText, test } from "./support";

const READY = "engine Zeff 0.9.0 ready";

/** The floor every screen keeps to: sizes, contrast, and nothing wider than the window. */
async function floor(page: Page, what: string): Promise<void> {
  expect(await smallestText(page), `${what}: the smallest text`).toBeGreaterThanOrEqual(12.5);
  expect(await faintText(page.locator("body")), `${what}: faint text`).toEqual([]);
  const over = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(over, `${what}: wider than the window`).toBeLessThanOrEqual(0);
}

/**
 * The stops of the Tab key on the screen, each by its name: what it is labelled, or what it
 * says. The key is pressed until it comes round to a control it has already stopped at, so
 * that every stop is seen wherever the cursor began. A control with no name is one a reader
 * who cannot see it cannot use.
 */
async function stops(page: Page, tab: string, most = 80): Promise<string[]> {
  const names: string[] = [];
  await page.evaluate(() => {
    (window as unknown as { stopped: Set<Element> }).stopped = new Set();
  });
  for (let at = 0; at < most; at++) {
    await page.keyboard.press(tab);
    const name = await page.evaluate(() => {
      const seen = (window as unknown as { stopped: Set<Element> }).stopped;
      const on = document.activeElement as HTMLElement | null;
      if (on === null || on === document.body) return null;
      if (seen.has(on)) return "";
      seen.add(on);
      const labelled = on.getAttribute("aria-label") ?? on.getAttribute("title");
      // What a control says, without what is drawn for the eye alone.
      const said = on.cloneNode(true) as HTMLElement;
      for (const hidden of said.querySelectorAll('[aria-hidden="true"]')) hidden.remove();
      return (labelled ?? said.textContent ?? "").replace(/\s+/g, " ").trim() || "(no name)";
    });
    if (name === null) continue;
    if (name === "") break;
    names.push(name);
  }
  return names;
}

for (const theme of ["light", "dark"] as const) {
  test.describe(`in the ${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
    });

    test("the page of what is counted, at a desk's width and a tablet's", async ({
      page,
      browserName,
    }) => {
      const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
      for (const width of [1440, 1024]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto("/counted.html");
        await expect(page.getByRole("heading", { level: 1 })).toHaveText("What is counted");
        await floor(page, `what is counted at ${width}`);
        const reached = await stops(page, tab);
        expect(reached, reached.join(" | ")).toEqual(["Back to Zemp Lite"]);
      }
    });

    test.describe("a first visit", () => {
      test.use({ firstVisit: true });

      test("the loading screen, while the engine comes and once it runs", async ({
        page,
        browserName,
      }) => {
        const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
        for (const width of [1440, 1024]) {
          await page.setViewportSize({ width, height: 900 });
          // While it comes: the engine's file held back.
          let release: () => void = () => {};
          const held = new Promise<void>((resolve) => {
            release = resolve;
          });
          await page.route("**/*.wasm", async (route) => {
            await held;
            await route.continue();
          });
          await page.goto("/");
          await expect(page.getByTestId("step-fetch")).toHaveClass(/going/);
          await floor(page, `the loading screen, fetching, at ${width}`);
          release();
          const open = page.getByRole("button", { name: "Start", exact: true });
          await expect(open).toBeEnabled({ timeout: 30_000 });
          await page.unroute("**/*.wasm");
          await floor(page, `the loading screen, ready, at ${width}`);
          const reached = await stops(page, tab);
          expect(reached, reached.join(" | ")).not.toContain("(no name)");
          expect(reached.length, "the stops of the Tab key").toBeGreaterThan(1);
          expect(reached).toContain("Start");
          expect(reached).toContain("What is counted");
        }
      });
    });

    test("the project screen in each of its states: empty, naming, with projects, a menu open, a question asked", async ({
      page,
      press,
      browserName,
    }) => {
      test.slow();
      const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
      const made = async (name: string) => {
        await press(page.getByRole("button", { name: "New project…" }));
        await page.getByLabel("The name of the new project").fill(name);
        await press(page.getByRole("button", { name: "Create" }));
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
        await press(page.getByRole("button", { name: "Projects" }));
        await expect(page.getByRole("button", { name: "New project…" })).toBeVisible();
      };
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/");
      await expect(page.getByRole("button", { name: /^Scratch project/ })).toBeVisible();
      await expect(page.getByText("No project yet", { exact: true })).toBeVisible();
      await floor(page, "the project screen, empty");
      // The naming row, with a name that is refused.
      await made("Wages");
      await press(page.getByRole("button", { name: "New project…" }));
      await page.getByLabel("The name of the new project").fill("wages");
      await press(page.getByRole("button", { name: "Create" }));
      await expect(page.getByRole("alert")).toContainText("is already here");
      await floor(page, "the project screen, naming, a name refused");
      await press(page.getByRole("button", { name: "Cancel" }));
      // With projects enough for the list to fade.
      for (const name of ["Two", "Three", "Four", "Five", "Six"]) await made(name);
      // The list is read after the screen is drawn: until its rows are there.
      await expect(
        page
          .getByRole("region", { name: "Recent projects" })
          .getByRole("button", { name: /^Actions for / }),
      ).toHaveCount(6);
      await floor(page, "the project screen, with six projects");
      const reached = await stops(page, tab);
      expect(reached, reached.join(" | ")).not.toContain("(no name)");
      expect(reached.length, "the stops of the Tab key").toBeGreaterThan(1);
      for (const name of ["Actions for Six", "Actions for Wages", "What is counted"]) {
        expect(reached).toContain(name);
      }
      // A row's menu open, and the question it asks.
      const recent = page.getByRole("region", { name: "Recent projects" });
      await press(recent.getByRole("button", { name: "Actions for Six", exact: true }));
      await expect(page.getByRole("menu", { name: "Actions for Six" })).toBeVisible();
      await floor(page, "the project screen, a row's menu open");
      await press(page.getByRole("menuitem", { name: "Delete…" }));
      await expect(recent.getByRole("group", { name: "Delete Six?" })).toBeVisible();
      await floor(page, "the project screen, a deletion asked");
      await press(recent.getByRole("button", { name: "Keep" }));
      await press(recent.getByRole("button", { name: "Actions for Six", exact: true }));
      await press(page.getByRole("menuitem", { name: "Rename…" }));
      await expect(recent.getByLabel("The new name of Six")).toBeVisible();
      await floor(page, "the project screen, a new name asked");
      await page.keyboard.press("Escape");
      // At a tablet's width: the same states of the list.
      await page.setViewportSize({ width: 1024, height: 768 });
      await floor(page, "the project screen at a tablet's width");
      await press(recent.getByRole("button", { name: "Actions for Six", exact: true }));
      await expect(page.getByRole("menu", { name: "Actions for Six" })).toBeVisible();
      await floor(page, "the project screen at a tablet's width, a row's menu open");
    });

    test("Help as it now stands: Home in its new look and a function's page, the list of the page beside the text and under its title", async ({
      page,
      browserName,
    }) => {
      const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
      for (const width of [1440, 1200, 1000]) {
        await page.setViewportSize({ width, height: 800 });
        await page.goto("/#/help");
        await expect(page.getByTestId("help-counts")).toBeVisible();
        await expect(page.getByRole("status")).toHaveText(READY);
        await floor(page, `Home of Help at ${width}`);
        const home = await stops(page, tab);
        expect(home, home.join(" | ")).not.toContain("(no name)");
        expect(home.length, "the stops of the Tab key").toBeGreaterThan(1);
        // The list of the page's parts is reached, wherever it stands.
        expect(home).toContain("Errors and warnings");
        await page.goto("/#/help/name/reg");
        await expect(page.getByTestId("help-title")).toHaveText("reg");
        await expect(page.getByRole("navigation", { name: "On this page" })).toBeVisible();
        await floor(page, `the page of reg at ${width}`);
      }
    });
  });
}
