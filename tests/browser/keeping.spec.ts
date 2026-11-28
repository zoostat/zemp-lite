// The browser asked to keep the storage, and the reminder to export (the Zemp Specification,
// section 10; open decision #117; release 0.2.2, step 6). What the browser answers is stood
// in for, since a test cannot make a browser agree; WebKit's test profile gives a page no
// private storage at all, which is the third case.
import type { Page } from "@playwright/test";
import { expect, projectButton, test } from "./support";

const READY = "engine Zeff 0.9.0 ready";
const DAY = 24 * 60 * 60 * 1000;

/** Stand in for the browser's answer: whether it agrees to keep the storage when asked. */
async function browserThat(page: Page, agrees: boolean) {
  await page.addInitScript((yes) => {
    const storage = Object.getPrototypeOf(navigator.storage) as {
      persisted: () => Promise<boolean>;
      persist: () => Promise<boolean>;
    };
    storage.persisted = () => Promise.resolve(localStorage.getItem("test-kept") === "1");
    storage.persist = () => {
      localStorage.setItem(
        "test-asked",
        String(Number(localStorage.getItem("test-asked") ?? "0") + 1),
      );
      if (yes) localStorage.setItem("test-kept", "1");
      return Promise.resolve(yes);
    };
  }, agrees);
}

const asked = (page: Page) =>
  page.evaluate(() => Number(localStorage.getItem("test-asked") ?? "0"));
const reminder = (page: Page) => page.getByTestId("reminder");
const exportButton = (page: Page) =>
  page.getByRole("contentinfo").getByRole("button", { name: "Export project…" });

test("where the browser may clear the projects the status bar says so, with Export project… beside it and when it was last exported", async ({
  page,
  press,
  browserName,
}) => {
  await browserThat(page, false);
  await page.goto("/");
  const kept = browserName !== "webkit";
  if (kept) {
    await expect(page.getByText("Kept in this browser.")).toBeVisible();
    await expect(page.getByTestId("kept")).toContainText(
      "the browser may clear it when the computer runs short of room",
    );
    // Nothing is asked of the browser until a project is made.
    expect(await asked(page)).toBe(0);
  } else {
    await expect(page.getByText("Not kept.")).toBeVisible();
  }
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  // A browser that gives the page a storage is asked, once, to keep it for good.
  expect(await asked(page)).toBe(kept ? 1 : 0);
  const line = kept
    ? "the browser may clear this project"
    : "this browser keeps no project after the tab is closed";
  await expect(reminder(page)).toHaveText(`${line} · not exported yet`);
  // Nothing is exported without the reader: the button beside the line does it.
  const [download] = await Promise.all([page.waitForEvent("download"), press(exportButton(page))]);
  expect(download.suggestedFilename()).toBe("Scratch.zip");
  await expect(reminder(page)).toHaveText(`${line} · exported today`);
  // Made again, a project does not have the browser asked again.
  await press(page.getByRole("button", { name: "All projects" }));
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  expect(await asked(page)).toBe(kept ? 1 : 0);
  await expect(reminder(page)).toHaveText(`${line} · exported today`);
});

test("where the browser has agreed to keep the storage the status bar is silent, until a project has not been exported for 30 days", async ({
  page,
  press,
  browserName,
}) => {
  test.skip(
    browserName === "webkit",
    "WebKit's test profile gives a page no private storage to keep",
  );
  await browserThat(page, true);
  await page.goto("/");
  await expect(page.getByTestId("kept")).toContainText("the browser may clear it");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  expect(await asked(page)).toBe(1);
  // Made today, kept for good: nothing to say.
  await expect(reminder(page)).toHaveCount(0);
  await expect(exportButton(page)).toHaveCount(0);
  await press(page.getByRole("button", { name: "All projects" }));
  await expect(page.getByTestId("kept")).toContainText(
    "the browser has agreed not to clear it on its own",
  );
  // Thirty-one days on, never exported: the line says so.
  await page.clock.setFixedTime(new Date(Date.now() + 31 * DAY));
  await page.reload();
  await press(projectButton(page, "Scratch"));
  await expect(page.getByRole("status")).toHaveText(READY);
  await expect(reminder(page)).toHaveText("not exported yet, 31 days after it was made");
  const [download] = await Promise.all([page.waitForEvent("download"), press(exportButton(page))]);
  expect(download.suggestedFilename()).toBe("Scratch.zip");
  // Exported, it has nothing more to say.
  await expect(reminder(page)).toHaveCount(0);
  // And 30 days after that export, it speaks again.
  await page.clock.setFixedTime(new Date(Date.now() + 62 * DAY));
  await page.reload();
  await expect(page.getByRole("status")).toHaveText(READY);
  await expect(reminder(page)).toHaveText("not exported for 31 days");
  expect(await asked(page)).toBe(1);
});

test("at the narrowest window the note leaves the console room to type in, and gives way from its first words", async ({
  page,
  press,
  browserName,
}) => {
  // Found by eye at the pre-release look of 0.2.2: at 1,200 pixels the reminder left the
  // console's field 146 pixels in Chromium, and 39 where the browser keeps nothing. From
  // release 0.3.1 the narrowest window is a tablet's held sideways (open decision #243), and
  // the line holds the run and its warnings too (#245): what the browser does with the project
  // gives way first, and when it was last exported is never cut.
  await browserThat(page, false);
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  const line =
    browserName === "webkit"
      ? "this browser keeps no project after the tab is closed · not exported yet"
      : "the browser may clear this project · not exported yet";
  await expect(reminder(page)).toHaveText(line);
  const field = page.getByRole("textbox", { name: /^Console/ });
  const widths = async () => ({
    field: (await field.boundingBox())!.width,
    // Whether the note's first words are cut, and whether its last are.
    cut: await reminder(page)
      .locator(".first")
      .evaluate((node) => node.scrollWidth > node.clientWidth),
    last: await reminder(page)
      .locator(".last")
      .evaluate((node) => node.scrollWidth > node.clientWidth),
    // Nothing of the line runs past the window's edge, and its last part is inside it.
    over: await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
    end: await page
      .locator("footer.bottom .engine")
      .evaluate((node) => window.innerWidth - node.getBoundingClientRect().right),
  });
  const ready = await widths();
  expect(ready.field).toBeGreaterThanOrEqual(200);
  expect(ready.over).toBe(0);
  // The shorter of the two notes stands whole at this width; the longer may be cut short,
  // and either way the whole of it is the note's title.
  if (browserName !== "webkit") expect(ready.cut).toBe(false);
  expect(ready.last).toBe(false);
  await expect(reminder(page)).toHaveAttribute("title", line);
  await expect(exportButton(page)).toBeVisible();
  // After a run the line holds the run and its warnings too, here and at a tablet's width:
  // the console keeps its room, the note's last words are whole, and the engine ends the line.
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  for (const width of [1200, 1024]) {
    await page.setViewportSize({ width, height: 768 });
    const done = await widths();
    expect(done.field, `${width}`).toBeGreaterThanOrEqual(200);
    expect(done.over, `${width}`).toBe(0);
    expect(done.last, `${width}`).toBe(false);
    expect(done.end, `${width}`).toBeGreaterThanOrEqual(8);
    await expect(reminder(page)).toHaveAttribute("title", line);
    await expect(reminder(page)).toContainText("not exported yet");
    await expect(exportButton(page)).toBeVisible();
  }
  // In a wide window the whole of the line stands. (Until release 0.3.1 the keys stood beside
  // it there; the top bar names them now.)
  await page.setViewportSize({ width: 1600, height: 800 });
  expect((await widths()).cut).toBe(false);
});
