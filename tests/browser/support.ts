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
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import {
  test as base,
  expect,
  type BrowserContext,
  type Locator,
  type Page,
} from "@playwright/test";

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

/**
 * What a returning visitor's browser holds: the note that the Start screen of a first visit
 * was opened for this build's engine (`App.svelte`), by the version and the digest of the
 * engine's file the build was made from.
 */
const engineFile = new URL("../../worker/pkg/web/zemp_worker_bg.wasm", import.meta.url);
const VERSION = (
  JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
    version: string;
  }
).version;
const STARTED = `${VERSION} ${
  existsSync(engineFile) ? createHash("sha256").update(readFileSync(engineFile)).digest("hex") : ""
}`;

interface Shared {
  /** Whether a click of the mouse lands where it is aimed, in this browser on this machine. */
  mouseWorks: boolean;
}

interface Each {
  /** Whether the test needs a browser profile that keeps a page's private file system. */
  keptProfile: boolean;
  /**
   * Whether the browser is a first visitor's, which opens on the Start screen; every other
   * test's browser has opened it before, and opens on the welcome screen.
   */
  firstVisit: boolean;
  /**
   * Whether the Scratch project is given its sample paper when Paper is opened in it, as a
   * visitor's is (release 0.3, step 15c); every other test's browser was given it before, and
   * the reader has taken it out, so that Paper opens with no paper.
   */
  samplePaper: boolean;
  /** Press a button or a control: with the mouse where it works, by its click event where not. */
  press: (target: Locator) => Promise<void>;
}

export const test = base.extend<Each, Shared>({
  keptProfile: [false, { option: true }],
  firstVisit: [false, { option: true }],
  samplePaper: [false, { option: true }],
  // WebKit gives a page no private file system in the short-lived profile a test normally
  // gets, which behaves as a private window does: there the interface keeps projects for the
  // life of the tab, and most tests run so. A test of projects that are kept asks for
  // `keptProfile`, and in WebKit gets a profile on disk, as a person's browser has. WebKit's
  // test browser keeps the private file system of every such profile in one place on the
  // machine, shared by all of them and by later runs, so those tests are in one file, run one
  // after another, and the storage is emptied before and after each (`kept.spec.ts`).
  context: async (
    {
      browser,
      browserName,
      playwright,
      contextOptions,
      baseURL,
      keptProfile,
      firstVisit,
      samplePaper,
    },
    use,
    testInfo,
  ) => {
    // A returning visitor: the note is put back before every page of the context, the
    // storage being emptied between tests of kept profiles.
    const returning = async (context: BrowserContext) => {
      if (!firstVisit) {
        await context.addInitScript((started: string) => {
          try {
            if (location.pathname !== "/empty-the-storage") {
              localStorage.setItem("zemp-started", started);
            }
          } catch {
            // A page that is given no storage opens on the Start screen.
          }
        }, STARTED);
      }
      // A visitor who was given the sample paper before, unless the test is of its giving.
      if (!samplePaper) {
        await context.addInitScript(() => {
          try {
            if (location.pathname !== "/empty-the-storage") {
              localStorage.setItem("zemp-scratch-paper", "given");
            }
          } catch {
            // A page that is given no storage is given no sample either.
          }
        });
      }
    };
    if (browserName !== "webkit" || !keptProfile) {
      const context = await browser.newContext({ ...contextOptions, baseURL });
      await returning(context);
      await use(context);
      await context.close();
      return;
    }
    const context = await playwright.webkit.launchPersistentContext(
      testInfo.outputPath("webkit-profile"),
      { ...contextOptions, baseURL },
    );
    await returning(context);
    const page = context.pages()[0] ?? (await context.newPage());
    await empty(page);
    await use(context);
    await empty(page);
    await context.close();
  },
  page: async ({ context }, use) => {
    const page = context.pages()[0] ?? (await context.newPage());
    // The WebKit of GitHub's Linux machines at times never ends the load of a page it has
    // only just been given (seen at 0.1, at 0.2 and twice in one run at 0.2.1; never on a
    // Mac, never in Chromium): the test then waits out its thirty seconds on a page that is
    // not coming. So a load that has not ended in twelve seconds is asked for once more. Only
    // the load is tried again, never the test: whatever the page does after it has loaded is
    // held as before.
    const load = page.goto.bind(page);
    page.goto = async (url, options) => {
      try {
        return await load(url, { timeout: 12_000, ...options });
      } catch (error) {
        if (!/Timeout .* exceeded/.test(String(error))) throw error;
        return load(url, options);
      }
    };
    await use(page);
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

/**
 * Count the runs asked of the engine from here on, by the messages to its worker: every run,
 * whether a reader began it or the interface made it for itself. To be called before the page
 * is loaded; gives what reads the count.
 */
export async function countRuns(page: Page): Promise<() => Promise<number>> {
  const asked = await countAsked(page);
  return () => asked("run");
}

/**
 * Count the messages sent to the engine's worker from here on, by their type (`run`, a run of
 * the reader's; `example`, an example of Help). To be called before the page is loaded; gives
 * what reads the count of a type.
 */
export async function countAsked(page: Page): Promise<(type: string) => Promise<number>> {
  await page.addInitScript(() => {
    const counted = window as unknown as { zempAsked: Record<string, number> };
    counted.zempAsked = {};
    const post = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (this: Worker, ...given: unknown[]) {
      const type = (given[0] as { type?: string } | null)?.type;
      if (type !== undefined) counted.zempAsked[type] = (counted.zempAsked[type] ?? 0) + 1;
      return (post as (...all: unknown[]) => void).apply(this, given);
    } as typeof Worker.prototype.postMessage;
  });
  return (type) =>
    page.evaluate(
      (of) => (window as unknown as { zempAsked: Record<string, number> }).zempAsked[of] ?? 0,
      type,
    );
}

/** The editor of the script shown. */
export const editor = (page: Page) =>
  page.getByRole("textbox", { name: "The script", exact: true });

/**
 * Put the cursor at the start of a line of the script (counted from 1), however the lines
 * before it wrap: an arrow key moves by the rows drawn, not by the lines of the script. The
 * editor takes the selection from the page a moment after it is set there, and once, in WebKit
 * on a slow machine, did not take it: it is set again until the editor holds it.
 */
export async function cursorTo(page: Page, line: number): Promise<void> {
  await expect(async () => {
    await editor(page).focus();
    await editor(page).evaluate((content, at) => {
      const row = content.querySelectorAll(":scope > .cm-line")[at - 1];
      if (row === undefined) throw new Error(`the script shows no line ${at}`);
      getSelection()!.collapse(row, 0);
    }, line);
    await expect(page.locator(".cm-lineNumbers .cm-activeLineGutter")).toHaveText(String(line), {
      timeout: 1_000,
    });
  }).toPass({ timeout: 15_000 });
}

/**
 * Give the window the width at which the script's place is `columns` characters wide, which
 * is the width the engine prints at there. A character of the print's font is not as wide in
 * every browser and on every machine (a pixel's fraction decides it), so the width is found
 * by measuring: the place's width and a character's, as the page itself measures them.
 */
export async function placeOf(page: Page, columns: number): Promise<void> {
  const sheet = page.locator(".sheet");
  for (let tries = 0; tries < 10; tries += 1) {
    const now = Number(await sheet.getAttribute("data-width"));
    if (now === columns) return;
    const delta = await sheet.evaluate((at, wanted) => {
      const content = at.querySelector<HTMLElement>(".cm-content")!;
      const char = at.querySelector(".probe")!.getBoundingClientRect().width / 100;
      // The place's width in characters is the whole of (its pixels less 50) over a character.
      return Math.round(50 + (wanted + 0.5) * char - content.clientWidth);
    }, columns);
    const size = page.viewportSize()!;
    await page.setViewportSize({
      width: size.width + (delta === 0 ? 1 : delta),
      height: size.height,
    });
    // The place is measured again as the window settles.
    await page.waitForTimeout(150);
  }
  await expect(sheet).toHaveAttribute("data-width", String(columns));
}

/**
 * Give the window the height at which the whole script is on the page with its outputs. The
 * editor draws the lines near the window and reckons the height of the rest, so a test that
 * reads every output of a long script first makes the window as tall as the page, and again
 * as the outputs then drawn are measured, until nothing is left to scroll to and the editor
 * has drawn every line: where it has not, it holds a gap in the lines' place, and a window
 * just made taller holds one until the editor has measured again, however long that takes.
 */
export async function wholeScript(page: Page): Promise<void> {
  const pane = page.getByRole("region", { name: "Script with its notes and output" });
  let held = 0;
  for (let tries = 0; tries < 60 && held < 2; tries += 1) {
    const { over, gaps } = await pane.evaluate((node) => ({
      over: node.scrollHeight - node.clientHeight,
      gaps: node.querySelectorAll(".cm-content .cm-gap").length,
    }));
    if (over > 0) {
      held = 0;
      const size = page.viewportSize()!;
      await page.setViewportSize({ width: size.width, height: size.height + over + 200 });
    } else if (gaps > 0) {
      held = 0;
    } else {
      held += 1;
    }
    // The page is measured again as the window settles.
    await page.waitForTimeout(150);
  }
  expect(held, "the window holds the whole script, every line drawn").toBe(2);
}

/** The text the editor holds. (The editor draws the lines near the window; these scripts are short.) */
export async function scriptText(page: Page): Promise<string> {
  // Each line's code, without the margin's note that stands in it. The function runs in the
  // page, so it holds nothing from outside itself.
  const lines = await editor(page)
    .locator(".cm-line")
    .evaluateAll((all) =>
      all.map((line) => {
        const copy = line.cloneNode(true) as Element;
        for (const note of copy.querySelectorAll('[data-testid="note"], [data-testid="note-go"]'))
          note.remove();
        return copy.textContent ?? "";
      }),
    );
  return lines.join("\n");
}

/** Replace all the editor holds by `text`, as typing it would. */
export async function write(page: Page, text: string): Promise<void> {
  await editor(page).focus();
  await page.keyboard.press("ControlOrMeta+a");
  // Inserting no text does not always take the selection away: an empty script is deleted.
  if (text === "") await page.keyboard.press("Backspace");
  else await page.keyboard.insertText(text);
}

/**
 * The example the browser tests are written on: the Scratch project's example of release
 * 0.1, kept in `tests/scripts/example/` with what `zeff run` prints for it. The Scratch
 * project a visitor opens holds other scripts (`examples/scratch/`), with tests of their own.
 */
export const EXAMPLE = readFileSync(
  new URL("../scripts/example/scripts/main.zeff", import.meta.url),
  "utf8",
);

/** Put the tests' example in the script shown, in place of what it holds, and wait until it is kept. */
export async function useExample(page: Page): Promise<void> {
  await write(page, EXAMPLE);
  await expect.poll(() => scriptText(page)).toBe(EXAMPLE);
  // The cursor back at the start and the editor left, as a script just opened is.
  await page.keyboard.press("ControlOrMeta+Home");
  await editor(page).blur();
  await expect(page.getByText("saving")).toHaveCount(0);
}

/**
 * What the page shows as printed, the statements' output one after another: the outputs
 * unfolded under their statements, which are those the editor has drawn.
 */
export async function printed(page: Page): Promise<string> {
  return (await page.getByTestId("printed").allTextContents()).join("");
}

/**
 * What the page shows as said, each card written back as the engine writes a message:
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
          // The engine sets its advice under the rule of the excerpt, which stands further in
          // where the line's number has more digits.
          const rule = /^( +)\|$/m.exec(detail)?.[1] ?? "  ";
          const help = [...card.querySelectorAll(".help")].map(
            (one) => `${rule}= help: ${one.textContent}\n`,
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

/**
 * Scroll a pane as a reader's wheel does: the sign of the wheel, which tells the page that
 * its reader has moved, and then the move. (The mouse itself cannot be used in every
 * browser these tests run in.)
 */
export async function wheelTo(pane: Locator, top: number): Promise<void> {
  await pane.evaluate((node, to) => {
    node.dispatchEvent(new WheelEvent("wheel", { bubbles: true, deltaY: to - node.scrollTop }));
    node.scrollTop = to;
  }, top);
}

/** The smallest size, in pixels, at which any text of the page is set. */
export async function smallestText(page: Page): Promise<number> {
  return page.evaluate(() => {
    let least = Infinity;
    for (const node of document.querySelectorAll("body *")) {
      // The badge of the drawn name is a mark, not text of the interface: its size is the
      // owner's ruling for it (never under 11 pixels; open decision #220, item 5), and a test
      // of its own holds it there (`name.spec.ts`).
      if (node.closest("[data-name-badge]") !== null) continue;
      if (node.textContent?.trim() && node.children.length === 0) {
        least = Math.min(least, parseFloat(getComputedStyle(node).fontSize));
      }
    }
    return least;
  });
}

/**
 * The texts shown inside an element that stand at less than 4.5 to 1 against what is painted
 * behind them, each with its ratio (WCAG's measure, as `tokens.test` takes it of the tokens):
 * here it is taken of the page as painted, so a colour set on the wrong ground is found.
 */
export async function faintText(within: Locator): Promise<string[]> {
  return within.evaluate((root) => {
    type Colour = { r: number; g: number; b: number; a: number };
    const colourOf = (text: string): Colour => {
      const parts = (text.match(/[\d.]+/g) ?? []).map(Number);
      // A colour mixed from two is given as `color(srgb r g b / a)`, its parts from 0 to 1.
      const scale = text.startsWith("color(srgb") ? 255 : 1;
      return {
        r: (parts[0] ?? 0) * scale,
        g: (parts[1] ?? 0) * scale,
        b: (parts[2] ?? 0) * scale,
        a: parts[3] ?? 1,
      };
    };
    const over = (top: Colour, under: Colour): Colour => ({
      r: top.r * top.a + under.r * (1 - top.a),
      g: top.g * top.a + under.g * (1 - top.a),
      b: top.b * top.a + under.b * (1 - top.a),
      a: 1,
    });
    const light = ({ r, g, b }: Colour): number => {
      const part = (value: number) => {
        const unit = value / 255;
        return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * part(r) + 0.7152 * part(g) + 0.0722 * part(b);
    };
    /** What is painted behind an element: its grounds and its ancestors', the lowest first. */
    const groundOf = (element: Element): Colour => {
      const layers: Colour[] = [];
      for (let at: Element | null = element; at !== null; at = at.parentElement) {
        const ground = colourOf(getComputedStyle(at).backgroundColor);
        if (ground.a > 0) layers.push(ground);
        if (ground.a === 1) break;
      }
      return layers.reduceRight((under, top) => over(top, under), { r: 255, g: 255, b: 255, a: 1 });
    };
    const faint: string[] = [];
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) {
      const words = walk.currentNode.textContent?.trim() ?? "";
      const element = walk.currentNode.parentElement;
      if (words === "" || element === null) continue;
      const style = getComputedStyle(element);
      if (style.visibility === "hidden" || element.getClientRects().length === 0) continue;
      const ground = groundOf(element);
      let ink = colourOf(style.color);
      // What is set partly clear, in itself or in what holds it, is fainter by as much.
      for (let at: Element | null = element; at !== null; at = at.parentElement) {
        ink = { ...ink, a: ink.a * parseFloat(getComputedStyle(at).opacity) };
      }
      // What is wholly clear is not drawn at all (a control shown only when its row is pointed
      // at or it holds the focus): there is nothing there to be faint.
      if (ink.a === 0) continue;
      const [inked, bare] = [light(over(ink, ground)), light(ground)];
      const ratio = (Math.max(inked, bare) + 0.05) / (Math.min(inked, bare) + 0.05);
      if (ratio < 4.5) faint.push(`${words.slice(0, 40)}: ${ratio.toFixed(2)}`);
    }
    return faint;
  });
}

/**
 * What of the screen is not whole, each fault in a sentence, and none where it is whole
 * (release 0.3.1, step 3; open decision #243: every screen at 1,024 by 768 with nothing hidden,
 * cut or overlapping). The page is no wider than the window; every control that is drawn is
 * inside the window and inside whatever holds it, unless what holds it scrolls; and none lies
 * under another, unless under a window, a menu or a list opened over the screen.
 */
export async function notWhole(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const faults: string[] = [];
    const root = document.documentElement;
    if (root.scrollWidth > root.clientWidth) {
      faults.push(`the page is ${root.scrollWidth - root.clientWidth} px wider than the window`);
    }
    const named = (control: Element): string => {
      const said = (control.getAttribute("aria-label") ?? control.textContent ?? "")
        .replace(/\s+/g, " ")
        .trim();
      return `"${said.slice(0, 40) || control.tagName.toLowerCase()}"`;
    };
    const over =
      'dialog, [role="dialog"], [role="menu"], [role="listbox"], [role="tooltip"], .cm-tooltip';
    const controls = document.querySelectorAll(
      'button, a[href], input, select, textarea, [role="button"], [role="switch"], [role="tab"]',
    );
    for (const control of controls) {
      const box = control.getBoundingClientRect();
      const style = getComputedStyle(control);
      if (box.width === 0 || box.height === 0) continue;
      if (style.visibility === "hidden" || style.opacity === "0") continue;
      // A control whose ancestor is wholly clear (shown under the pointer alone) is not drawn.
      let drawn = true;
      // Whether what holds it scrolls, so that it may stand outside what is in view.
      let scrolls = false;
      for (let up = control.parentElement; up !== null && drawn; up = up.parentElement) {
        const held = getComputedStyle(up);
        if (held.opacity === "0" || held.visibility === "hidden") drawn = false;
        if (/auto|scroll/.test(`${held.overflowX} ${held.overflowY}`)) scrolls = true;
        if (scrolls) continue;
        const holder = up.getBoundingClientRect();
        if (/hidden|clip/.test(held.overflowX)) {
          const past = Math.max(holder.left - box.left, box.right - holder.right);
          if (past > 1) faults.push(`${named(control)} is cut by ${Math.round(past)} px at a side`);
        }
        if (/hidden|clip/.test(held.overflowY)) {
          const past = Math.max(holder.top - box.top, box.bottom - holder.bottom);
          if (past > 1) faults.push(`${named(control)} is cut by ${Math.round(past)} px in height`);
        }
      }
      if (!drawn || scrolls) continue;
      if (box.left < -1 || box.right > window.innerWidth + 1) {
        faults.push(`${named(control)} reaches past the window`);
        continue;
      }
      // What is drawn at its middle: itself, a part of it, what it is a part of, or something
      // opened over the screen. Anything else lies over it.
      const [x, y] = [box.left + box.width / 2, box.top + box.height / 2];
      if (y < 0 || y > window.innerHeight) continue;
      const top = document.elementFromPoint(x, y);
      if (top === null || control.contains(top) || top.contains(control)) continue;
      // (A window opened over the screen may stand on a veil, which is then what is drawn.)
      const opened = top.closest(over) !== null || top.querySelector(over) !== null;
      if (opened && control.closest(over) === null) continue;
      const other = top.closest("button, a[href], input, select, textarea, [role]") ?? top;
      faults.push(`${named(control)} lies under ${named(other)}`);
    }
    return [...new Set(faults)];
  });
}

/**
 * Choose a variable of the frame the Data place shows, as a reader does from release 0.3.1
 * (open decision #245): **Variables**, which takes the grid's place, then the variable's name
 * in the list. Gives the Variables view, once the engine has answered for the variable.
 */
export async function chooseVariable(
  page: Page,
  press: (target: Locator) => Promise<void>,
  name: string,
): Promise<Locator> {
  const view = page.getByRole("region", { name: "Variables" });
  const link = page
    .getByRole("toolbar", { name: "Data: its panes and its controls" })
    .getByRole("button", { name: "Variables", exact: true });
  await expect(link).toBeVisible();
  if ((await link.getAttribute("aria-pressed")) !== "true") await press(link);
  await expect(view).toBeVisible();
  // One variable may be shown in the list's place: back to the list first.
  const back = view.getByRole("button", { name: "‹ All variables" });
  const listed = view.locator("button.vpick").filter({
    has: page.locator("span.mono").getByText(name, { exact: true }),
  });
  await expect(back.or(listed).first()).toBeVisible();
  if ((await back.count()) > 0) await press(back);
  await press(listed);
  await expect(view.getByRole("heading", { name, exact: true })).toBeVisible();
  await expect(view.getByTestId("variable-asking")).toHaveCount(0);
  return view;
}
