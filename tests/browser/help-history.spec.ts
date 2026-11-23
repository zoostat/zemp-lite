// Moving about in Help (release 0.2.3, step 3a; open decision #211, part 3): the pages opened
// are a history. **Home** is where Help starts and is lit while one is there; **Back** and
// **Forward** go through the pages this reader opened, greyed where there is nowhere to go;
// ⌘[ and ⌘] and the mouse's two side buttons do the same, and are kept from the browser, whose
// own Back and Forward they are, so that reading Help never leaves the app.
import type { Page } from "@playwright/test";
import { cursorTo, expect, test, write, useExample } from "./support";

const READY = "engine Zeff 0.8.0 ready";

async function scratch(page: Page, press: (target: ReturnType<Page["locator"]>) => Promise<void>) {
  await page.goto("/");
  await press(page.getByRole("button", { name: "Scratch project" }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await useExample(page);
}

const places = (page: Page) => page.getByRole("navigation", { name: "Places" });
const bar = (page: Page) => page.getByRole("toolbar", { name: "Help: its panes and its controls" });
const moving = (page: Page) => bar(page).getByRole("group", { name: "Moving through Help" });
const back = (page: Page) => moving(page).getByRole("button", { name: "Back" });
const forward = (page: Page) => moving(page).getByRole("button", { name: "Forward" });
const home = (page: Page) => moving(page).getByRole("button", { name: "Home" });
const title = (page: Page) => page.getByTestId("help-title");
const field = (page: Page) => bar(page).getByRole("combobox", { name: /^Search Help/ });
const trail = (page: Page) => bar(page).getByRole("navigation", { name: "Where this page stands" });

/** Open a page by its name or its code, typed in the field of the bar. */
async function ask(page: Page, name: string) {
  await field(page).fill(name);
  await field(page).press("Enter");
  await expect(title(page)).toHaveText(name);
}

/** Whether Home is the page shown: its button lit, and the landing page in the middle. */
async function isHome(page: Page) {
  await expect(home(page)).toHaveAttribute("aria-current", "page");
  // Home has no trail: its button, marked, says where one is.
  await expect(trail(page)).toHaveCount(0);
  await expect(page.getByTestId("help-page").getByRole("heading", { level: 3 })).toHaveText("Help");
}

test("Help opens on Home, and Back and Forward go through the pages opened, greyed at either end", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await press(places(page).getByRole("button", { name: "Help" }));
  // Home, lit; nothing was opened, so there is nowhere to go.
  await isHome(page);
  await expect(back(page)).toBeDisabled();
  await expect(forward(page)).toBeDisabled();

  // A page from the field, one from a link of the page (under See also), and a code.
  await ask(page, "summary");
  await expect(home(page)).not.toHaveAttribute("aria-current", "page");
  await expect(back(page)).toBeEnabled();
  await expect(back(page)).toHaveAttribute("title", "Back: Home");
  await expect(forward(page)).toBeDisabled();
  await press(
    page.getByTestId("help-page").getByRole("button", { name: "reg", exact: true }).first(),
  );
  await expect(title(page)).toHaveText("reg");
  await ask(page, "W0201");

  // Back through them, to Home; each button says where it goes.
  await expect(back(page)).toHaveAttribute("title", "Back: reg");
  await press(back(page));
  await expect(title(page)).toHaveText("reg");
  await expect(page.getByTestId("help-page")).toContainText("Linear regression by least squares");
  await expect(forward(page)).toHaveAttribute("title", "Forward: W0201");
  await press(back(page));
  await expect(title(page)).toHaveText("summary");
  await press(back(page));
  await isHome(page);
  await expect(back(page)).toBeDisabled();
  await expect(back(page)).toHaveAttribute("title", "Back");

  // And forward again, to the last.
  await press(forward(page));
  await expect(title(page)).toHaveText("summary");
  await press(forward(page));
  await press(forward(page));
  await expect(title(page)).toHaveText("W0201");
  await expect(page.getByTestId("help-page")).toContainText(
    "missing values skipped by a statistic",
  );
  await expect(forward(page)).toBeDisabled();
});

test("a page opened after going back drops what lay forward, and a page opened twice is there once", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await press(places(page).getByRole("button", { name: "Help" }));
  await ask(page, "summary");
  await ask(page, "reg");
  await ask(page, "W0201");
  await press(back(page));
  await press(back(page));
  await expect(title(page)).toHaveText("summary");
  await expect(forward(page)).toBeEnabled();
  // A new page from here: `reg` and the code no longer lie forward.
  await ask(page, "t_test");
  await expect(forward(page)).toBeDisabled();
  await press(back(page));
  await expect(title(page)).toHaveText("summary");
  await press(forward(page));
  await expect(title(page)).toHaveText("t_test");
  // The page shown, asked for again and again, is one page of the history.
  await ask(page, "t_test");
  await ask(page, "t_test");
  await press(back(page));
  await expect(title(page)).toHaveText("summary");
  // Home is a page as any other: pressed, it follows the one shown, and Back returns from it.
  await press(home(page));
  await isHome(page);
  await expect(back(page)).toHaveAttribute("title", "Back: summary");
  await press(home(page));
  await press(back(page));
  await expect(title(page)).toHaveText("summary");
  await press(back(page));
  await isHome(page);
  await expect(back(page)).toBeDisabled();
});

test("a page opened by F1 from the script is the first of the history, and Help keeps its place when one leaves it", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await write(page, "let w = dataset(wages)\nw.summary([wage])\n");
  await cursorTo(page, 2);
  for (let at = 1; at < 4; at++) await page.keyboard.press("ArrowRight");
  await page.keyboard.press("F1");
  await expect(title(page)).toHaveText("summary");
  // Nothing was opened before it: there is nowhere back to go, and Home is one press away.
  await expect(back(page)).toBeDisabled();
  await expect(home(page)).not.toHaveAttribute("aria-current", "page");
  await ask(page, "reg");
  await press(back(page));
  await expect(title(page)).toHaveText("summary");
  // The Script place and back: the page, and what lies back and forward of it, are as left.
  await press(places(page).getByRole("button", { name: "Script" }));
  await expect(page.getByTestId("help")).toHaveCount(0);
  await press(places(page).getByRole("button", { name: "Help" }));
  await expect(title(page)).toHaveText("summary");
  await expect(back(page)).toBeDisabled();
  await expect(forward(page)).toHaveAttribute("title", "Forward: reg");
});

test("⌘[ and ⌘] go back and forward through Help, from the keyboard alone, and the app is never left", async ({
  page,
  press,
  browserName,
}) => {
  await scratch(page, press);
  const address = page.url();
  await press(places(page).getByRole("button", { name: "Help" }));
  await ask(page, "summary");
  await ask(page, "reg");
  // Whether the page kept each of these keys from the browser, whose Back and Forward they are.
  await page.evaluate(() => {
    const kept: boolean[] = [];
    (window as unknown as { kept: boolean[] }).kept = kept;
    window.addEventListener("keydown", (event) => {
      if (event.key === "[" || event.key === "]") kept.push(event.defaultPrevented);
    });
  });
  // With the cursor in the field, and with it on the page.
  await field(page).focus();
  await page.keyboard.press("ControlOrMeta+[");
  await expect(title(page)).toHaveText("summary");
  await page.keyboard.press("ControlOrMeta+[");
  await isHome(page);
  // More presses than there are pages: Help stays at its first, and the app where it is.
  await page.keyboard.press("ControlOrMeta+[");
  await page.keyboard.press("ControlOrMeta+[");
  await isHome(page);
  await page.keyboard.press("ControlOrMeta+]");
  await expect(title(page)).toHaveText("summary");
  await page.keyboard.press("ControlOrMeta+]");
  await expect(title(page)).toHaveText("reg");
  await page.keyboard.press("ControlOrMeta+]");
  await expect(title(page)).toHaveText("reg");
  expect(await page.evaluate(() => (window as unknown as { kept: boolean[] }).kept)).toEqual([
    true,
    true,
    true,
    true,
    true,
    true,
    true,
  ]);
  expect(page.url()).toBe(address);
  // A bracket typed without the command key is a letter of the field, not a step.
  await field(page).fill("");
  await field(page).pressSequentially("[");
  await expect(field(page)).toHaveValue("[");
  await expect(title(page)).toHaveText("reg");
  await field(page).fill("");

  // The three buttons are stops of the Tab key, in the order drawn, and answer to Enter and
  // Space. (Safari gives Tab to buttons with the Option key held, unless its setting is changed.)
  const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
  const tabBack = browserName === "webkit" ? "Alt+Shift+Tab" : "Shift+Tab";
  await home(page).focus();
  await page.keyboard.press("Enter");
  await isHome(page);
  await page.keyboard.press(tabBack);
  await expect(back(page)).toBeFocused();
  await page.keyboard.press("Space");
  await expect(title(page)).toHaveText("reg");
  // Forward was greyed, so it was passed over; now it is a stop between Back and Home.
  await page.keyboard.press(tabBack);
  await page.keyboard.press(tab);
  await expect(back(page)).toBeFocused();
  await page.keyboard.press(tab);
  await expect(forward(page)).toBeFocused();
  await page.keyboard.press("Enter");
  await isHome(page);
  await page.keyboard.press(tab);
  await expect(home(page)).toBeFocused();
});

test("the mouse's side buttons go back and forward through Help, and are kept from the browser", async ({
  page,
  press,
  browserName,
}) => {
  await scratch(page, press);
  const address = page.url();
  await press(places(page).getByRole("button", { name: "Help" }));
  await ask(page, "summary");
  await ask(page, "reg");
  // A press and a release of the fourth button (back) or the fifth (forward), over the page;
  // what comes back is whether the page kept each from the browser.
  const sideButton = (button: 3 | 4) =>
    page.getByTestId("help").evaluate((node, which) => {
      const kept = ["mousedown", "mouseup", "auxclick"].map(
        (type) =>
          !node.dispatchEvent(
            new MouseEvent(type, { button: which, bubbles: true, cancelable: true }),
          ),
      );
      return kept;
    }, button);
  expect(await sideButton(3)).toEqual([true, true, true]);
  await expect(title(page)).toHaveText("summary");
  expect(await sideButton(3)).toEqual([true, true, true]);
  await isHome(page);
  expect(await sideButton(3)).toEqual([true, true, true]);
  await isHome(page);
  expect(await sideButton(4)).toEqual([true, true, true]);
  await expect(title(page)).toHaveText("summary");
  expect(await sideButton(4)).toEqual([true, true, true]);
  await expect(title(page)).toHaveText("reg");
  // The other buttons are the browser's and the page's as before.
  const left = await page
    .getByTestId("help")
    .evaluate(
      (node) =>
        !node.dispatchEvent(
          new MouseEvent("mousedown", { button: 0, bubbles: true, cancelable: true }),
        ),
    );
  expect(left).toBe(false);

  if (browserName === "chromium") {
    // In Chromium the buttons themselves, as the mouse sends them: the page goes back through
    // Help, and the browser, which has a page to go back to, stays on the app.
    const session = await page.context().newCDPSession(page);
    const box = (await page.getByTestId("help-page").boundingBox())!;
    const point = { x: box.x + 40, y: box.y + 40 };
    for (const type of ["mousePressed", "mouseReleased"] as const) {
      await session.send("Input.dispatchMouseEvent", {
        type,
        ...point,
        button: "back",
        buttons: type === "mousePressed" ? 8 : 0,
        clickCount: 1,
      });
    }
    await expect(title(page)).toHaveText("summary");
    for (const type of ["mousePressed", "mouseReleased"] as const) {
      await session.send("Input.dispatchMouseEvent", {
        type,
        ...point,
        button: "forward",
        buttons: type === "mousePressed" ? 16 : 0,
        clickCount: 1,
      });
    }
    await expect(title(page)).toHaveText("reg");
  }
  expect(page.url()).toBe(address);
  await expect(page.getByTestId("help")).toBeVisible();

  // Outside Help the buttons are left to the browser: the Script place does not take them.
  await press(places(page).getByRole("button", { name: "Script" }));
  const outside = await page.evaluate(
    () =>
      !document.body.dispatchEvent(
        new MouseEvent("mouseup", { button: 3, bubbles: true, cancelable: true }),
      ),
  );
  expect(outside).toBe(false);
});
