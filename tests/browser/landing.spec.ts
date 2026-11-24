// The landing page (release 0.2.4, step 8; open decision #220, item 1; the design guide,
// section 9, "Landing page"): at the root of the address; every number, version and output on
// it the carried engine's, taken at the build; every link to an address that exists, the links
// into Help opening their pages; and nothing of the engine fetched.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Page, Request } from "@playwright/test";
import { expect, faintText, smallestText, test } from "./support";

const front = (page: Page) => page.getByTestId("front");
const VERSION = (
  JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
    version: string;
  }
).version;
const SOURCE = "https://github.com/zoostat/zemp-lite";

interface Facts {
  engine: string;
  functions: number;
  packages: number;
  codes: number;
  script: string;
  printed: string;
  travels: number;
}

/** The facts the build took from the engine (`tools/facts.mjs`), asked for as the build asks. */
function facts(): Facts {
  const tool = fileURLToPath(new URL("../../tools/facts.mjs", import.meta.url));
  const ran = spawnSync(process.execPath, [tool], { encoding: "utf8" });
  if (ran.status !== 0) throw new Error(ran.stderr);
  return JSON.parse(ran.stdout) as Facts;
}

test("the page is laid out as drawn: the bar, the name with its line and the way in, five bands and the foot", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Zemp Lite");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(front(page)).toContainText(
    "Zeff in your browser. Write a script, run it and read the results, with nothing to install and nothing uploaded.",
  );
  await expect(
    page.getByRole("navigation", { name: "This page and the app" }).getByRole("link"),
  ).toHaveText(["Open the app", "See it work", "Help", "Source"]);
  await expect(page.getByRole("heading", { level: 2 })).toHaveText([
    "Why Zemp Lite?",
    "See it work",
    "Made for",
    /^In version \d/,
    "Learn and take part",
  ]);
  await expect(page.getByRole("heading", { level: 3 })).toHaveText([
    "Nothing to install",
    "Your data stays with you",
    "The same answers as Zeff",
    "Teaching",
    "Learning Zeff",
    "Looking at data",
    "Taking work away",
    "Read the help",
    "Report a problem",
    "Read the source",
  ]);
  await expect(page.getByRole("contentinfo").getByRole("heading")).toHaveText([
    "Get help",
    "Terms",
    "Zeff",
  ]);
  await expect(page.getByRole("contentinfo")).toContainText(
    "A statistics language for empirical and causal research.",
  );
  // The bar stays at the top as the page is read.
  await page.evaluate(() => window.scrollTo(0, 1500));
  await expect(page.getByRole("link", { name: "Open the app" })).toBeInViewport();
});

test("every number, the version and the output are the carried engine's", async ({ page }) => {
  const built = facts();
  await page.goto("/");
  const megabytes = `${(built.travels / 1_000_000).toFixed(1)} MB`;
  await expect(page.getByTestId("front-functions")).toHaveText(String(built.functions));
  await expect(page.getByTestId("front-packages")).toHaveText(String(built.packages));
  await expect(page.getByTestId("front-codes")).toHaveText(String(built.codes));
  await expect(page.getByTestId("front-travels")).toHaveText(megabytes);
  await expect(front(page).locator(".num b")).toHaveText([
    String(built.functions),
    String(built.codes),
    megabytes,
    "0",
  ]);
  // The version is this build's, and the engine's is the engine's own word.
  const shown = VERSION.replace(/^(\d+\.\d+)\.0(.*)$/, "$1$2");
  await expect(page.getByTestId("front-version")).toHaveText(
    `Version ${shown}on the Zeff ${built.engine} engine`,
  );
  await expect(page.getByRole("heading", { level: 2, name: /^In version/ })).toHaveText(
    `In version ${shown}`,
  );
  await expect(page.getByRole("contentinfo")).toContainText(
    `Zemp Lite ${shown} · Zeff ${built.engine}`,
  );
  await expect(page.getByRole("contentinfo")).toContainText(
    `The ${built.functions} functions, in Help`,
  );
  // The script and what the engine prints for it, to the letter.
  expect(await page.getByTestId("front-script").evaluate((node) => node.textContent)).toBe(
    built.script,
  );
  expect(await page.getByTestId("front-printed").evaluate((node) => node.textContent)).toBe(
    built.printed,
  );
  await expect(front(page)).toContainText(`as Zeff ${built.engine} gives it`);
  // The pages on the app are counted, not written: thirteen of them.
  await expect(front(page)).toContainText("thirteen pages on the app itself");
});

test("the page fetches nothing of the engine, and opens the app by its button and by the keyboard", async ({
  page,
  browserName,
}) => {
  const asked: string[] = [];
  page.on("request", (request: Request) => {
    const path = new URL(request.url()).pathname;
    if (/\.wasm$/.test(path) || /worker/.test(path)) asked.push(path);
  });
  await page.goto("/");
  await expect(front(page)).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(asked).toEqual([]);
  // The keyboard reaches the bar's links, then the way in, in the page's order.
  const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
  const order: string[] = [];
  await page.locator("body").focus();
  for (let at = 0; at < 7; at++) {
    await page.keyboard.press(tab);
    order.push(
      await page.evaluate(() =>
        (document.activeElement?.textContent ?? "").replace(/\s+/g, " ").trim(),
      ),
    );
  }
  // The name, the four links of the bar, the theme button, and then the way in.
  expect(order[0]).toBe("Zemp Lite");
  expect(order.slice(1, 5)).toEqual(["Open the app", "See it work", "Help", "Source"]);
  expect(order[6]).toBe("Open Zemp Lite");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/app\/$/);
});

test("every link goes to an address that exists, and each link into Help opens its page", async ({
  page,
}) => {
  test.slow();
  await page.goto("/");
  await expect(front(page)).toBeVisible();
  const links = await page.locator("a[href]").evaluateAll((all) =>
    all.map((one) => ({
      words: (one.textContent ?? "").replace(/\s+/g, " ").trim(),
      to: one.getAttribute("href") as string,
    })),
  );
  expect(links.length).toBeGreaterThan(20);
  const outside = links.filter((link) => /^https?:/.test(link.to));
  const within = links.filter((link) => !/^https?:/.test(link.to));
  // Out of the site: the repository alone, by addresses of its own (they are asked for at the
  // address after each deployment, where there is a network to ask over).
  for (const link of outside) expect(link.to.startsWith(SOURCE), link.to).toBe(true);
  expect(outside.map((link) => link.to)).toContain(`${SOURCE}/blob/main/LICENSE`);
  expect(outside.map((link) => link.to)).toContain(`${SOURCE}/blob/main/NOTICE`);
  const notes = /^\d+\.\d+\.\d+$/.test(VERSION)
    ? `${SOURCE}/blob/main/docs/releases/${VERSION}-notes.md`
    : `${SOURCE}/releases`;
  expect(outside.filter((link) => link.to === notes).map((link) => link.words)).toHaveLength(2);
  if (/^\d+\.\d+\.\d+$/.test(VERSION)) {
    // A release's notes are in the repository this build was made from.
    expect(() =>
      readFileSync(new URL(`../../docs/releases/${VERSION}-notes.md`, import.meta.url)),
    ).not.toThrow();
  }
  // Within the site: a part of this page, the app, or a page the build has.
  for (const link of within) {
    if (link.to.startsWith("#")) {
      await expect(page.locator(link.to), link.to).toHaveCount(1);
    } else {
      const answer = await page.request.get(link.to.split("#")[0] as string);
      expect(answer.status(), link.to).toBe(200);
    }
  }
  // Into Help: each opens the Scratch project on the page it names.
  const pages: [string, string][] = [
    ["Getting started", "Getting started"],
    ["Finding help", "Finding help"],
    ["The Data place", "The Data place"],
    ["Exporting a project", "Exporting and opening a project"],
    ["Report a problem", "Reporting a problem"],
    ["Privacy: where your work is kept", "Where the work is kept"],
    [`The ${facts().functions} functions, in Help`, "Packages"],
    ["Errors and warnings, in Help", "Errors and warnings"],
  ];
  for (const [words, title] of pages) {
    await page.goto("/");
    await page.getByRole("link", { name: words, exact: true }).first().click();
    await expect(page, words).toHaveURL(/\/app\/#\/p\/scratch$/);
    await expect(page.getByTestId("help-title"), words).toHaveText(title);
    // Back leaves the app for the landing page the link was on.
    await page.goBack();
    await expect(front(page), words).toBeVisible();
  }
  for (const words of ["Open Help", "Help in the app"]) {
    await page.goto("/");
    await page.getByRole("link", { name: words, exact: true }).click();
    await expect(page.getByTestId("help-counts"), words).toBeVisible();
  }
  // What is counted, and back.
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "What is counted" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What is counted");
});

for (const theme of ["light", "dark"] as const) {
  test(`the page holds 12.5 pixels and 4.5 to 1, at a desk's width and a phone's (${theme})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: theme });
    for (const width of [1440, 900, 375]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await expect(front(page)).toBeVisible();
      expect(await smallestText(page), `the smallest text at ${width}`).toBeGreaterThanOrEqual(
        12.5,
      );
      expect(await faintText(page.locator("body")), `faint text at ${width}`).toEqual([]);
      const over = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(over, `wider than the window at ${width}`).toBeLessThanOrEqual(0);
    }
    // On a phone the bands are one column, and the table is read by moving it sideways inside
    // its own frame, not the page.
    const lefts = await front(page)
      .locator(".cols4 > div")
      .evaluateAll((all) => all.map((one) => Math.round(one.getBoundingClientRect().left)));
    expect(new Set(lefts).size).toBe(1);
    await expect(front(page).getByRole("link", { name: "Open Zemp Lite" })).toBeVisible();
  });
}
