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
import { test as base, expect, type Locator } from "@playwright/test";

interface Shared {
  /** Whether a click of the mouse lands where it is aimed, in this browser on this machine. */
  mouseWorks: boolean;
}

interface Each {
  /** Press a button or a control: with the mouse where it works, by its click event where not. */
  press: (target: Locator) => Promise<void>;
}

export const test = base.extend<Each, Shared>({
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
