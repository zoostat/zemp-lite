// Where Zemp Lite lives (release 0.2.4, step 2; open decision #220, item 2): the front page at
// the root of the address and the app at `/app/`, both of one origin. A project made before
// the move is there after it, and an address kept from before, the root with a project after
// its `#`, still opens that project.
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

test("the root is the front page, which opens the app and fetches nothing of the engine", async ({
  page,
}) => {
  const asked = engineAsked(page);
  await page.goto("/");
  const front = page.getByTestId("front");
  await expect(front.getByRole("heading", { level: 1 })).toHaveText("Zemp Lite");
  await expect(front).toContainText("Zeff in your browser.");
  await expect(front).toContainText("on the Zeff 0.8.0 engine");
  // The page has drawn and settled, and has asked for nothing of the engine.
  await page.waitForLoadState("networkidle");
  expect(asked).toEqual([]);
  await front.getByRole("link", { name: "Open Zemp Lite" }).click();
  await expect(page).toHaveURL(/\/app\/$/);
  await expect(page.getByRole("button", { name: "Scratch project" })).toBeVisible();
});

test("an address kept from before, of a project that is no longer here, opens the app", async ({
  page,
}) => {
  // The project itself, found again by its old address, is among the tests of kept projects
  // (`kept.spec.ts`), where a browser keeps what was made.
  await page.goto("/#/p/not-here");
  await expect(page).toHaveURL(/\/app\/#?$/);
  await expect(page.getByRole("button", { name: "Scratch project" })).toBeVisible();
});

test("the naming of a new project, asked for at the root as before, is asked in the app", async ({
  page,
}) => {
  await page.goto("/#/new");
  await expect(page).toHaveURL(/\/app\/#\/new$/);
  await expect(page.getByLabel("The name of the new project")).toBeVisible();
});

test("the engine's file stands in the one folder of built files, whichever page leads to it", async ({
  page,
  press,
}) => {
  const asked = engineAsked(page);
  await page.goto("/app/");
  await press(page.getByRole("button", { name: "Scratch project" }));
  await expect(page.getByRole("status")).toHaveText(READY);
  const engine = asked.filter((path) => path.endsWith(".wasm"));
  expect(engine.length).toBeGreaterThan(0);
  for (const path of asked) expect(path).toMatch(/^\/assets\/[^/]+$/);
});

test("what is counted is said at the root, and reached from the app and from the front page", async ({
  page,
}) => {
  await page.goto("/app/");
  await page.getByRole("link", { name: "What is counted" }).click();
  await expect(page).toHaveURL(/\/counted\.html$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What is counted");
  await page.getByRole("link", { name: "The front page" }).click();
  await expect(page.getByTestId("front")).toBeVisible();
  await page.getByRole("link", { name: "What is counted" }).click();
  await expect(page).toHaveURL(/\/counted\.html$/);
  await page.getByRole("link", { name: "Back to Zemp Lite" }).click();
  await expect(page).toHaveURL(/\/app\/$/);
});
