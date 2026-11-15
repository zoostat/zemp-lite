// What the browser tests share.
//
// One fault of a test browser is worked round here. On macOS, the headless WebKit that
// Playwright ships can deliver the mouse to the wrong place on the page (seen on an empty
// page, with this project's code nowhere in it: a click at 120, 110 arrives far outside the
// window). A test would then fail for a reason that is not the interface's. So each worker
// first tries the mouse on an empty page. Where it lands, tests use it; where it does not,
// `press` sends the click to the element itself, and a test that needs a real drag is
// skipped. On GitHub the mouse must work: there the fallback is refused, so that the tests
// of record are always made with the real mouse.
import { test as base, expect, type Locator, type Page } from "@playwright/test";

/** Empty this origin's private file system and its kept settings, from a page with nothing on it. */
async function empty(page: Page): Promise<void> {
  await page.route("**/empty-the-storage", (route) =>
    route.fulfill({ contentType: "text/html", body: "<!doctype html><title>empty</title>" }),
  );
  await page.goto("/empty-the-storage");
  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory();
    const names: string[] = [];
    for await (const name of root.keys()) names.push(name);
    for (const name of names) await root.removeEntry(name, { recursive: true });
    localStorage.clear();
  });
  await page.unroute("**/empty-the-storage");
}

interface Shared {
  /** Whether a click of the mouse lands where it is aimed, in this browser on this machine. */
  mouseWorks: boolean;
}

interface Each {
  /** Whether the test needs a browser profile that keeps a page's private file system. */
  keptProfile: boolean;
  /** Press a button or a control: with the mouse where it works, by its click event where not. */
  press: (target: Locator) => Promise<void>;
}

export const test = base.extend<Each, Shared>({
  keptProfile: [false, { option: true }],
  // WebKit gives a page no private file system in the short-lived profile a test normally
  // gets, which behaves as a private window does: there the interface keeps projects for the
  // life of the tab, and most tests run so. A test of projects that are kept asks for
  // `keptProfile`, and in WebKit gets a profile on disk, as a person's browser has. WebKit's
  // test browser keeps the private file system of every such profile in one place on the
  // machine, shared by all of them and by later runs, so those tests are in one file, run one
  // after another, and the storage is emptied before and after each (`kept.spec.ts`).
  context: async (
    { browser, browserName, playwright, contextOptions, baseURL, keptProfile },
    use,
    testInfo,
  ) => {
    if (browserName !== "webkit" || !keptProfile) {
      const context = await browser.newContext({ ...contextOptions, baseURL });
      await use(context);
      await context.close();
      return;
    }
    const context = await playwright.webkit.launchPersistentContext(
      testInfo.outputPath("webkit-profile"),
      { ...contextOptions, baseURL },
    );
    const page = context.pages()[0] ?? (await context.newPage());
    await empty(page);
    await use(context);
    await empty(page);
    await context.close();
  },
  page: async ({ context }, use) => {
    await use(context.pages()[0] ?? (await context.newPage()));
  },
  mouseWorks: [
    async ({ browser }, use) => {
      const page = await browser.newPage();
      await page.setContent("<button style='margin: 100px'>x</button>");
      await page.evaluate(() => {
        const state = window as unknown as { hit: string };
        state.hit = "";
        document.addEventListener(
          "mousedown",
          (event) => (state.hit = (event.target as Element).tagName),
          true,
        );
      });
      const box = await page.locator("button").boundingBox();
      if (box === null) throw new Error("the probe's button has no place on the page");
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      const works =
        (await page.evaluate(() => (window as unknown as { hit: string }).hit)) === "BUTTON";
      await page.close();
      if (!works && process.env["CI"]) {
        throw new Error("the mouse does not land where it is aimed, and on CI it must");
      }
      await use(works);
    },
    { scope: "worker" },
  ],
  press: async ({ mouseWorks }, use) => {
    await use(async (target) => {
      if (mouseWorks) {
        await target.click();
      } else {
        await expect(target).toBeEnabled();
        await target.dispatchEvent("click");
      }
    });
  },
});

export { expect };
