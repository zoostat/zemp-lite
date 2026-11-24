// Where Zemp Lite lives (release 0.2.5, step 2; open decision #225): the app at the root of the
// address, as before 0.2.4. In 0.2.4 alone it stood at `/app/`; an address of that release, of
// a project, of the naming of a new one or of a page of Help, goes on to the same place at the
// root, and Back does not return to `/app/`.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Page, Request } from "@playwright/test";
import { expect, test } from "./support";

const READY = "engine Zeff 0.8.0 ready";

/** The requests a page makes for the engine or its worker, by the path of each. */
function engineAsked(page: Page): string[] {
  const asked: string[] = [];
  page.on("request", (request: Request) => {
    const path = new URL(request.url()).pathname;
    if (/\.wasm$/.test(path) || /worker/.test(path)) asked.push(path);
  });
  return asked;
}

test("the root is the app: the project screen, and no page before it", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: /^Scratch project/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "New project…" })).toBeVisible();
  // Nothing of the landing page of 0.2.4 is here: no way in to press, and none of its bands.
  await expect(page.getByRole("link", { name: "Open Zemp Lite" })).toHaveCount(0);
  await expect(page.getByTestId("front")).toHaveCount(0);
  await expect(page.getByText("Why Zemp Lite?")).toHaveCount(0);
});

test.describe("a first visit", () => {
  test.use({ firstVisit: true });

  test("the root opens on the loading screen, which starts the engine at once", async ({
    page,
  }) => {
    const asked = engineAsked(page);
    await page.goto("/");
    const open = page.getByRole("button", { name: "Open Zemp Lite" });
    await expect(open).toBeEnabled({ timeout: 30_000 });
    expect(asked.filter((path) => path.endsWith(".wasm")).length).toBeGreaterThan(0);
    await open.click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("button", { name: /^Scratch project/ })).toBeVisible();
  });
});

test("an address of 0.2.4 with nothing after it goes on to the root, and Back does not return to it", async ({
  page,
}) => {
  await page.goto("about:blank");
  await page.goto("/app/");
  await expect(page).toHaveURL(/^[^#]*\/$/);
  expect(new URL(page.url()).pathname).toBe("/");
  await expect(page.getByRole("button", { name: /^Scratch project/ })).toBeVisible();
  // The address of `/app/` was replaced, not left behind to send the reader on again.
  await page.goBack();
  expect(page.url()).toBe("about:blank");
});

test("the file of the page at /app/, asked for by its name, goes on to the root too", async ({
  page,
}) => {
  await page.goto("/app/index.html#/new");
  await expect(page).toHaveURL(/\/#\/new$/);
  expect(new URL(page.url()).pathname).toBe("/");
  await expect(page.getByLabel("The name of the new project")).toBeVisible();
});

test("an address of 0.2.4 of a project that is no longer here opens the app at the root", async ({
  page,
}) => {
  // The project itself, found again by its address of 0.2.4, is among the tests of kept
  // projects (`kept.spec.ts`), where a browser keeps what was made.
  await page.goto("/app/#/p/not-here");
  await expect(page).toHaveURL(/\/#?$/);
  expect(new URL(page.url()).pathname).toBe("/");
  await expect(page.getByRole("button", { name: /^Scratch project/ })).toBeVisible();
});

test("the naming of a new project, asked for at /app/ as in 0.2.4, is asked at the root", async ({
  page,
}) => {
  await page.goto("/app/#/new");
  await expect(page).toHaveURL(/\/#\/new$/);
  expect(new URL(page.url()).pathname).toBe("/");
  await expect(page.getByLabel("The name of the new project")).toBeVisible();
});

test("an address of 0.2.4 of a page of Help opens that page at the root", async ({ page }) => {
  await page.goto("/app/#/help/name/reg");
  await expect(page).toHaveURL(/\/#\/p\/scratch$/);
  expect(new URL(page.url()).pathname).toBe("/");
  await expect(page.getByTestId("help-title")).toHaveText("reg");
});

test("an address of before 0.2.4, of the root, is the app's own: nothing sends it on", async ({
  page,
}) => {
  const visited: string[] = [];
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) visited.push(new URL(frame.url()).pathname);
  });
  await page.goto("/#/new");
  await expect(page.getByLabel("The name of the new project")).toBeVisible();
  expect(visited.every((path) => path === "/")).toBe(true);
});

test("the engine's file stands in the one folder of built files", async ({ page, press }) => {
  const asked = engineAsked(page);
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  const engine = asked.filter((path) => path.endsWith(".wasm"));
  expect(engine.length).toBeGreaterThan(0);
  for (const path of asked) expect(path).toMatch(/^\/assets\/[^/]+$/);
});

test("what is counted is said on a page of its own, reached from the app and leading back to it", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "What is counted" }).click();
  await expect(page).toHaveURL(/\/counted\.html$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What is counted");
  await expect(page.getByRole("link", { name: "The front page" })).toHaveCount(0);
  await page.getByRole("link", { name: "Back to Zemp Lite" }).click();
  expect(new URL(page.url()).pathname).toBe("/");
  await expect(page.getByRole("button", { name: /^Scratch project/ })).toBeVisible();
});

test("the build carries nothing of the landing page, and the page at /app/ is one small script", async ({
  request,
}) => {
  // Release 0.2.5, step 3 (open decision #225, item 3): the landing page's text and its table
  // are shown nowhere, so no built file holds them. The build is the folder the tests are
  // served from.
  const dist = path.resolve("dist");
  const files = (readdirSync(dist, { recursive: true }) as string[]).filter((name) =>
    /\.(html|js|css)$/.test(name),
  );
  expect(files.length).toBeGreaterThan(5);
  const pages = files.filter((name) => name.endsWith(".html")).sort();
  expect(pages).toEqual([path.join("app", "index.html"), "counted.html", "index.html"]);
  for (const name of files) {
    const text = readFileSync(path.join(dist, name), "utf8");
    for (const words of ["Why Zemp Lite?", "See it work", "Learn and take part", "front-printed"]) {
      expect(text.includes(words), `${name} holds "${words}"`).toBe(false);
    }
  }
  // The page at `/app/`: no style, no element to draw in, and one script of a few lines, which
  // names no file but the small one the build tool puts before every page's script.
  const page = await (await request.get("/app/")).text();
  expect(page).not.toMatch(/<link[^>]+stylesheet/);
  expect(page).not.toContain('id="app"');
  const scripts = [...page.matchAll(/<script[^>]+src="([^"]+)"/g)].map((found) => found[1]);
  expect(scripts).toHaveLength(1);
  const script = await (await request.get(scripts[0] as string)).text();
  expect(script.length).toBeLessThan(1000);
  expect(script).toContain("location.replace");
  const named = [...script.matchAll(/(?:import|from)\s*\(?\s*["']([^"']+)["']/g)].map(
    (found) => found[1] as string,
  );
  for (const name of named) {
    expect(name).toMatch(/^\.\/modulepreload-polyfill-[\w-]+\.js$/);
    const helper = await (await request.get(`/assets/${name.slice(2)}`)).text();
    expect(helper.length).toBeLessThan(2000);
    expect(helper).not.toMatch(/(?:import|from)\s*\(?\s*["'][^"']+["']/);
  }
});
