// The front page (redrawn at release 0.3.1, step 13; open decision #245, as completed): the
// headline "Reproducible empirical research, in your browser.", its line, **Start**, grey
// until the engine runs, and three facts; the card **Starting the engine**, one bar over
// three steps, with three lines of script and what the engine prints for them, taken from
// the carried engine at the build; the watermark faint behind; a foot with the versions, the
// licence, what is counted and how to report a problem. As built at 0.2.4 (step 6; open
// decision #220, item 3): a failure with its sentence and **Try again**. And item 10 (step 6b): the bar
// glides however fast the steps finish, the button opens when the bar is full, and the first
// step says how the engine came, over the network with the bytes that travelled or from the
// browser's own keeping.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { Page, Route } from "@playwright/test";
import { readFileSync } from "node:fs";
import { expect, faintText, printed, smallestText, test, write } from "./support";

test.use({ firstVisit: true });

const start = (page: Page) => page.getByTestId("start");
const open = (page: Page) => page.getByRole("button", { name: "Start", exact: true });
const whole = (page: Page) => page.getByTestId("start-whole");

/** The facts the build took from the engine (`tools/facts.mjs`), asked for as the build asks. */
function facts(): { travels: number; example: { script: string; printed: string } } {
  const tool = fileURLToPath(new URL("../../tools/facts.mjs", import.meta.url));
  const ran = spawnSync(process.execPath, [tool], { encoding: "utf8" });
  if (ran.status !== 0) throw new Error(ran.stderr);
  return JSON.parse(ran.stdout) as ReturnType<typeof facts>;
}

test("while the engine is fetched the button is grey and says when it will open; then it opens, by Return too", async ({
  page,
}) => {
  // The engine's file is held back until the test lets it go.
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/*.wasm", async (route: Route) => {
    await held;
    await route.continue();
  });
  await page.goto("/");
  await expect(start(page).getByRole("heading", { level: 1 })).toHaveText(
    "Reproducible empirical research, in your browser.",
  );
  await expect(open(page)).toBeDisabled();
  await expect(page.getByTestId("open-hint")).toHaveText("Opens as soon as the engine is ready");
  await expect(whole(page)).toHaveText(/Step 1 of 3\s*0 %/);
  await expect(page.getByTestId("step-fetch")).toHaveClass(/going/);
  await expect(page.getByTestId("step-check")).toHaveClass(/waiting/);
  await expect(page.getByTestId("step-start")).toContainText("waiting");
  const bar = page.getByRole("progressbar", { name: "Starting the engine" });
  await expect(bar).toHaveAttribute("aria-valuenow", "0");

  release();
  await expect(open(page)).toBeEnabled({ timeout: 30_000 });
  await expect(whole(page)).toHaveText(/Ready\s*100 %/);
  await expect(bar).toHaveAttribute("aria-valuenow", "100");
  await expect(page.getByTestId("open-hint")).toHaveText("The engine is ready · press Return");
  // The cursor is on the button once the engine runs: Return opens the app.
  await expect(open(page)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: /^Scratch project/ })).toBeVisible();
});

test("the button is named Start: no arrow and no name after it, grey with its line until the engine runs, then open with its line", async ({
  page,
}) => {
  // Release 0.2.5, step 4b (open decision #225, item 5): **Open Zemp Lite →** is **Start**.
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/*.wasm", async (route: Route) => {
    await held;
    await route.continue();
  });
  await page.goto("/");
  const button = start(page).getByRole("button");
  await expect(button).toHaveCount(1);
  await expect(button).toHaveText("Start");
  await expect(button).toHaveAccessibleName("Start");
  await expect(button).toBeDisabled();
  await expect(page.getByTestId("open-hint")).toHaveText("Opens as soon as the engine is ready");
  release();
  await expect(button).toBeEnabled({ timeout: 30_000 });
  // Open, it says the same: nothing is added to it, and the name is not drawn in it.
  await expect(button).toHaveText("Start");
  expect(await button.locator("*").count()).toBe(0);
  await expect(page.getByTestId("open-hint")).toHaveText("The engine is ready · press Return");
  await expect(page.getByRole("button", { name: /Open Zemp Lite/ })).toHaveCount(0);
  await expect(start(page)).not.toContainText("→");
  await button.click();
  await expect(page.getByRole("button", { name: /^Scratch project/ })).toBeVisible();
});

test("the first step says how the engine came: the bytes that travelled, or that it was already in this browser", async ({
  page,
}) => {
  // While it comes, the step gives the size the build reckons the host sends.
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/*.wasm", async (route: Route) => {
    await held;
    await route.continue();
  });
  const { travels } = facts();
  await page.goto("/");
  const how = page.getByTestId("step-fetch-how");
  await expect(how).toHaveText(`${(travels / 1_000_000).toFixed(1)} MB, once`);
  expect(travels).toBeLessThan(5_000_000);
  release();
  await expect(open(page)).toBeEnabled({ timeout: 30_000 });
  await page.unroute("**/*.wasm");
  // Once it has come, the step gives the bytes that did travel, as the browser's own record
  // of the fetch has them. (The server of these tests sends the engine packed tight to a
  // browser that asks for brotli, as the host does, and whole to one that does not; at the
  // address the check after a deployment holds the screen to the bytes sent there.)
  const travelled = await page.evaluate(() => {
    const entry = (performance.getEntriesByType("resource") as PerformanceResourceTiming[])
      .filter((one) => one.name.endsWith(".wasm"))
      .at(-1);
    return entry === undefined ? null : entry.encodedBodySize;
  });
  expect(travelled).not.toBeNull();
  await expect(how).toHaveText(`${((travelled ?? 0) / 1_000_000).toFixed(1)} MB, once`);

  // The same screen again, the engine now kept by the browser. A test browser does not keep
  // a file of this size between two visits, as a reader's browser does; so the browser's
  // record of the fetch is given as it stands for a kept file (a body, and nothing that
  // travelled), and the step must say so instead of a size.
  await page.evaluate(() => localStorage.removeItem("zemp-started"));
  await page.addInitScript(() => {
    const read = performance.getEntriesByName.bind(performance);
    performance.getEntriesByName = (name: string, type?: string) =>
      name.endsWith(".wasm")
        ? ([{ transferSize: 0, encodedBodySize: 4_080_713 }] as unknown as PerformanceEntryList)
        : read(name, type);
  });
  await page.goto("/");
  await page.goto("/");
  await expect(open(page)).toBeEnabled({ timeout: 30_000 });
  await expect(how).toHaveText("already in this browser");
  await expect(start(page)).not.toContainText("MB, once");
});

/** What the screen showed at one change: when, the bar, the button grey, the first step done. */
type Shown = [at: number, bar: number, grey: boolean, firstDone: boolean];

// The bar glides, at two paces of frame: this machine's own, and frames 160 ms apart, which is
// what a busy machine makes of them (six in the bar's second were seen on GitHub's machines).
for (const [pace, apart] of [
  ["at the machine's own frames", null],
  ["with few frames, as a busy machine draws", 160],
] as const) {
  test(`the bar glides ${pace}: a start done at once still fills it over about a second, and the button opens only when it is full`, async ({
    page,
  }) => {
    // Here the engine comes from this computer in a fraction of a second, and its three steps
    // are done long before a second has passed.
    if (apart !== null) {
      await page.addInitScript((ms: number) => {
        window.requestAnimationFrame = (frame: FrameRequestCallback) =>
          window.setTimeout(() => frame(performance.now()), ms);
        window.cancelAnimationFrame = (id: number) => window.clearTimeout(id);
      }, apart);
    }
    // The bar, the button and the first step are noted at each change of the page, as it is
    // made: so the record is of what the screen showed, whole, and when. (Noted frame by frame
    // instead, the record ran a frame behind the screen, and a test that read it as soon as
    // the button opened found the last frame missing where frames are far apart.)
    await page.addInitScript(() => {
      const shown: [number, number, boolean, boolean][] = [];
      (window as unknown as { shown: typeof shown }).shown = shown;
      const look = () => {
        const bar = document.querySelector('[role="progressbar"]');
        const button = document.querySelector<HTMLButtonElement>("button.open");
        const first = document.querySelector('[data-testid="step-fetch"]');
        if (bar === null || button === null || first === null) return;
        const now: (typeof shown)[number] = [
          performance.now(),
          Number(bar.getAttribute("aria-valuenow")),
          button.disabled,
          first.className.includes("done"),
        ];
        const last = shown.at(-1);
        if (last?.[1] !== now[1] || last[2] !== now[2] || last[3] !== now[3]) shown.push(now);
      };
      new MutationObserver(look).observe(document, {
        subtree: true,
        childList: true,
        attributes: true,
      });
    });
    await page.goto("/");
    // Until the record itself has the button open.
    await page.waitForFunction(
      () =>
        (window as unknown as { shown: [number, number, boolean, boolean][] }).shown.at(-1)?.[2] ===
        false,
      null,
      { timeout: 30_000 },
    );
    await expect(open(page)).toBeEnabled();
    const shown = await page.evaluate(() => (window as unknown as { shown: Shown[] }).shown);
    // It was seen, more than twice, however few the frames.
    expect(shown.length).toBeGreaterThan(2);
    const [began] = shown;
    const ended = shown.at(-1);
    if (began === undefined || ended === undefined) throw new Error("the bar was not seen");
    // It began short of full and ended full, with the button open.
    expect(began[1]).toBeLessThan(100);
    expect(ended.slice(1)).toEqual([100, false, true]);
    for (const [, bar, grey, firstDone] of shown.slice(0, -1)) {
      // The button is grey for as long as the bar is short of full, and the bar says 100 only
      // when it is full.
      expect(grey, `the button at ${bar} %`).toBe(true);
      expect(bar).toBeLessThan(100);
      // A step is marked done only once the bar has passed it.
      if (bar < 70) expect(firstDone, `the first step at ${bar} %`).toBe(false);
    }
    // It never goes back.
    for (let at = 1; at < shown.length; at++) {
      const [, bar] = shown[at] as Shown;
      const [, last] = shown[at - 1] as Shown;
      expect(bar).toBeGreaterThanOrEqual(last);
    }
    // And it took its time: the bar is paced by the clock, the whole of it in a second, so
    // from where it began to full is about that share of a second, however few the frames.
    const took = ended[0] - began[0];
    expect(took).toBeGreaterThanOrEqual(((100 - began[1]) / 100) * 1000 * 0.85);
    expect(took).toBeLessThan(8000);
    // The engine itself was running well before the bar was full: the bar was gliding, not waiting.
    await expect(start(page).locator("[data-engine]")).toHaveAttribute("data-engine", "done");
  });
}

test("a fetching that fails says so in the engine's step, and Try again starts it afresh", async ({
  page,
}) => {
  let failing = true;
  await page.route("**/*.wasm", async (route: Route) => {
    if (failing) await route.fulfill({ status: 503, body: "not now" });
    else await route.continue();
  });
  await page.goto("/");
  const problem = start(page).getByRole("alert");
  await expect(problem).toContainText("the engine could not be fetched: the host answered 503.");
  await expect(page.getByTestId("step-fetch")).toHaveClass(/failed/);
  await expect(page.getByTestId("step-fetch")).toContainText("failed");
  await expect(open(page)).toBeDisabled();
  // The control is reached by the keyboard.
  const again = problem.getByRole("button", { name: "Try again" });
  await again.focus();
  failing = false;
  await page.keyboard.press("Enter");
  await expect(open(page)).toBeEnabled({ timeout: 30_000 });
  await expect(problem).toHaveCount(0);
  await expect(page.getByTestId("step-fetch")).toHaveClass(/done/);
});

for (const theme of ["light", "dark"] as const) {
  test(`the screen holds 12.5 pixels and 4.5 to 1, at a desk's width and a tablet's (${theme})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: theme });
    // (Until release 0.3.1 a phone's width was held here too: open decision #243.)
    for (const width of [1440, 1024, 1000]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await expect(open(page)).toBeEnabled({ timeout: 30_000 });
      expect(await smallestText(page), `the smallest text at ${width}`).toBeGreaterThanOrEqual(
        12.5,
      );
      expect(await faintText(page.locator("body")), `faint text at ${width}`).toEqual([]);
      // Nothing is cut off at the side: the page is as wide as the window and no wider.
      const over = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(over, `wider than the window at ${width}`).toBeLessThanOrEqual(0);
      // The three facts and the example are all there, and the way on can be reached.
      await expect(
        page.getByRole("list", { name: "What Zemp Lite promises" }).getByRole("listitem"),
      ).toHaveCount(3);
      await expect(page.getByTestId("start-example-printed")).toBeVisible();
      await open(page).scrollIntoViewIfNeeded();
      await expect(open(page)).toBeVisible();
      // No line of the example is cut or broken: each of its three is on one line of the card.
      const lines = await page.getByTestId("start-example-script").evaluate((node) => {
        const high = Number.parseFloat(getComputedStyle(node).lineHeight);
        return {
          lines: Math.round(node.getBoundingClientRect().height / high),
          across: node.scrollWidth - node.clientWidth,
        };
      });
      expect(lines, `the example at ${width}`).toEqual({ lines: 3, across: 0 });
    }
  });
}

test("the page: the headline with its last words in the accent, its line, three facts, and a foot with the versions and the licence", async ({
  page,
}) => {
  // Release 0.3.1, step 13 (open decision #245, as completed on 28 November 2026).
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(open(page)).toBeEnabled({ timeout: 30_000 });
  const headline = start(page).getByRole("heading", { level: 1 });
  await expect(headline).toHaveText("Reproducible empirical research, in your browser.");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  // Newsreader, large; "in your browser." in italic and in the accent, on a line of its own.
  const drawn = await headline.evaluate((node) => {
    const last = node.querySelector("em") as HTMLElement;
    const probe = document.createElement("i");
    probe.style.color = "var(--accent)";
    document.body.append(probe);
    const accent = getComputedStyle(probe).color;
    probe.remove();
    return {
      face: getComputedStyle(node).fontFamily.split(",")[0]!.replace(/"/g, ""),
      size: Number.parseFloat(getComputedStyle(node).fontSize),
      last: last.textContent,
      italic: getComputedStyle(last).fontStyle,
      accent: getComputedStyle(last).color === accent,
      unbroken: last.getClientRects().length,
    };
  });
  expect(drawn).toEqual({
    face: "Newsreader",
    size: 76,
    last: "in\u00a0your\u00a0browser.",
    italic: "italic",
    accent: true,
    unbroken: 1,
  });
  await expect(start(page).locator(".lede")).toHaveText(
    "Regressions, tests, tables and figures from a short script, run on this computer with nothing installed. The same script gives the same numbers wherever it runs.",
  );
  // The three facts, side by side under the button.
  const facts3 = page.getByRole("list", { name: "What Zemp Lite promises" }).getByRole("listitem");
  await expect(facts3).toHaveText([
    "Runs here The engine runs in this browser; your scripts and data are never sent anywhere.",
    "Stays here Projects live in this browser until you export them.",
    "No account Nothing to sign up for; open the page and start.",
  ]);
  const tops = await facts3.evaluateAll((every) =>
    every.map((one) => Math.round(one.getBoundingClientRect().top)),
  );
  expect(new Set(tops).size).toBe(1);
  expect(tops[0]).toBeGreaterThan((await open(page).boundingBox())!.y);
  // The band of four promises, and the words of the page it was, are gone.
  await expect(page.getByRole("region", { name: "What Zemp Lite promises" })).toHaveCount(0);
  for (const old of ["Zeff in your browser.", "The next visit opens at once", "or press ↵"]) {
    await expect(page.getByText(old)).toHaveCount(0);
  }
  // The watermark stands behind, at half the strength it had.
  expect(await page.locator(".watermark").evaluate((node) => getComputedStyle(node).opacity)).toBe(
    "0.08",
  );
  // The foot: the versions, the licence, what is counted, and how to report a problem.
  const foot = page.getByRole("contentinfo");
  await expect(page.getByTestId("start-versions")).toHaveText(
    /^Zemp\s*Lite 0\.3\S* · engine Zeff 0\.9\.0$/,
  );
  await expect(foot).toContainText("Apache 2.0 licence");
  await expect(foot.getByRole("link", { name: "What is counted" })).toHaveAttribute(
    "href",
    "/counted.html",
  );
  await expect(foot).toContainText("Something wrong? In a project, ⌘K → Report a problem");
  // The page keeps to one screen at a laptop's size and at a tablet's held sideways.
  for (const [width, height] of [
    [1440, 900],
    [1280, 800],
    [1024, 768],
  ] as const) {
    await page.setViewportSize({ width, height });
    const over = await page.evaluate(() => {
      const screen = document.querySelector(".screen") as HTMLElement;
      return {
        down: screen.scrollHeight - screen.clientHeight,
        across: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    expect(over, `the page at ${width} by ${height}`).toEqual({ down: 0, across: 0 });
  }
});

test("the example is the kept script in the editor's colours, and its print is what the engine prints: at the build, and in this browser", async ({
  page,
  press,
}) => {
  await page.goto("/");
  await expect(open(page)).toBeEnabled({ timeout: 30_000 });
  const kept = readFileSync(
    fileURLToPath(new URL("../../examples/front/example.zeff", import.meta.url)),
    "utf8",
  );
  const built = facts().example;
  const example = page.getByTestId("start-example");
  await expect(example.locator("figcaption")).toHaveText("What a run looks like");
  // The script as it is kept, three lines; and what the build took from the engine for it.
  const script = page.getByTestId("start-example-script");
  expect(await script.evaluate((node) => node.textContent)).toBe(kept.trimEnd());
  expect(kept.trimEnd().split("\n")).toHaveLength(3);
  expect(built.script).toBe(kept.trimEnd());
  const shown = await page
    .getByTestId("start-example-printed")
    .evaluate((node) => node.textContent);
  expect(shown).toBe(built.printed);
  // In the editor's colours: a keyword and a function are not in the ink of plain code.
  const colours = await script.evaluate((node) => {
    const of = (word: string) => {
      const found = [...node.querySelectorAll("span")].find((one) => one.textContent === word);
      return found === undefined ? null : getComputedStyle(found).color;
    };
    return { keyword: of("let"), fn: of("reg"), plain: getComputedStyle(node).color };
  });
  expect(colours.keyword).not.toBeNull();
  expect(colours.fn).not.toBeNull();
  expect(colours.keyword).not.toBe(colours.plain);
  expect(colours.fn).not.toBe(colours.keyword);
  // Run in this browser, by the engine the page has just started, the script prints the same.
  await page.keyboard.press("Enter");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText("engine Zeff 0.9.0 ready");
  await write(page, kept);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await press(page.getByRole("button", { name: "Unfold all", exact: true }));
  await expect.poll(() => printed(page)).toBe(`${shown}\n`);
});
