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

/** The editor of the script shown. */
export const editor = (page: Page) =>
  page.getByRole("textbox", { name: "The script", exact: true });

/** The text the editor holds. (The editor draws the lines near the window; these scripts are short.) */
export async function scriptText(page: Page): Promise<string> {
  return (await editor(page).locator(".cm-line").allTextContents()).join("\n");
}

/** Replace all the editor holds by `text`, as typing it would. */
export async function write(page: Page, text: string): Promise<void> {
  await editor(page).focus();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.insertText(text);
}

/** What the Output panel shows as printed, the statements' output one after another. */
export async function printed(page: Page): Promise<string> {
  return (await page.getByTestId("printed").allTextContents()).join("");
}

/**
 * What the Output panel shows as said, each card written back as the engine writes a message:
 * its kind, its code and its sentence, then the line it speaks of or, for an error, the
 * excerpt of the script, then its advice.
 */
export async function saidAsWritten(page: Page): Promise<string> {
  return page.getByTestId("block").evaluateAll((blocks) =>
    blocks
      .flatMap((block) =>
        [...block.querySelectorAll('[data-testid="said"]')].map((card) => {
          const kind = card.querySelector(".kind")?.textContent ?? "";
          const code = card.querySelector(".code")?.textContent;
          const sentence = card.querySelector(".sentence")?.textContent ?? "";
          const detail = card.querySelector(".detail")?.textContent ?? "";
          const help = [...card.querySelectorAll(".help")].map(
            (one) => `  = help: ${one.textContent}\n`,
          );
          const line = detail === "" ? ` (line ${block.getAttribute("data-line")})` : "";
          return (
            `${kind}${code ? `[${code}]` : ""}: ${sentence}${line}\n` +
            (detail === "" ? "" : `${detail}\n`) +
            help.join("")
          );
        }),
      )
      .join(""),
  );
}

/**
 * What the blocks of a run show, as text, in the order they stand in: what each printed, the
 * figure it carries, by its name, and what the engine said of it. The times are left out,
 * which differ from run to run.
 */
export async function blocksAsText(page: Page): Promise<string[]> {
  return page.getByTestId("block").evaluateAll((blocks) =>
    blocks.map((block) => {
      const lines: string[] = [];
      const printed = block.querySelector('[data-testid="printed"]')?.textContent ?? "";
      if (printed !== "") lines.push(printed.replace(/\n+$/, ""));
      const figure = block.querySelector('[data-testid="figure"] img')?.getAttribute("alt");
      if (figure) lines.push(`[${figure}]`);
      for (const card of block.querySelectorAll('[data-testid="said"]')) {
        const part = (name: string) => card.querySelector(name)?.textContent?.trim() ?? "";
        lines.push([part(".kind"), part(".code"), part(".sentence")].filter(Boolean).join(" "));
        const detail = card.querySelector(".detail")?.textContent ?? "";
        if (detail !== "") lines.push(detail);
        for (const help of card.querySelectorAll(".help")) lines.push(`help: ${help.textContent}`);
      }
      return lines.join("\n");
    }),
  );
}
