// A wrong file is never kept for a year (release 0.3, step 4; risk R13). The host answers an
// address that holds no file with the app's page, and under `/assets/` it would tell a browser
// to keep that page for a year as the script, style, font or engine it asked for. From this
// release the host's function answers for every built file and never passes on what is not
// the file. The server of these tests answers as that function does (`vite.config.ts`), so
// what is held here is what a browser is given and what the page makes of it; that the host
// itself answers so is held by the checks after a deployment (`tools/check-host.mjs`).
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "./support";

const dist = path.resolve("dist");
const built = readdirSync(path.join(dist, "assets"));
/** The script the app's page names: the app itself. */
const entry = /<script type="module"[^>]* src="(\/assets\/[^"]+\.js)"/.exec(
  readFileSync(path.join(dist, "index.html"), "utf8"),
)?.[1];

test("an address under /assets/ that holds no file is answered not yet, not to be kept, and never with the page", async ({
  request,
}) => {
  for (const name of ["nothing-here.js", "nothing-here.css", "nothing-here.woff2", "worker-0.js"]) {
    expect(built).not.toContain(name);
    for (const method of ["get", "head"] as const) {
      const answer = await request[method](`/assets/${name}`);
      expect(answer.status(), `${method} ${name}`).toBe(503);
      expect(answer.headers()["cache-control"], name).toBe("no-store");
      expect(answer.headers()["retry-after"], name).toBe("5");
      expect(answer.headers()["content-type"], name).toMatch(/^text\/plain/);
      // The isolation headers are on it, as on every answer.
      expect(answer.headers()["cross-origin-embedder-policy"], name).toBe("require-corp");
      if (method === "get") {
        expect(await answer.text(), name).toBe("This file is not at this place of the host yet.\n");
      }
    }
  }
});

test("every built file that is there is still sent whole and kept as never changing", async ({
  request,
}) => {
  expect(built.length).toBeGreaterThan(10);
  // The engine packed tight is no file a page names: how it travels is held in `packed.spec.ts`.
  for (const name of built.filter((one) => !one.endsWith(".br"))) {
    const answer = await request.get(`/assets/${name}`, {
      headers: { "accept-encoding": "identity" },
    });
    expect(answer.status(), name).toBe(200);
    // What the build packs beforehand (the engine, the Paper module, a paper's fonts) is for
    // the browser alone to keep, so that the host's own cache never packs a copy itself.
    expect(answer.headers()["cache-control"], name).toBe(
      `${/\.(wasm|otf|ttf)$/.test(name) ? "private" : "public"}, max-age=31536000, immutable`,
    );
    expect(answer.headers()["content-type"] ?? "", name).not.toMatch(/^text\/html/);
    const bytes = readFileSync(path.join(dist, "assets", name));
    expect((await answer.body()).equals(bytes), name).toBe(true);
  }
});

test("a page whose script did not arrive says so in a line of its own, and loads again when asked", async ({
  page,
}) => {
  expect(entry).toBeDefined();
  // The first asking is answered as the host answers a file it does not hold yet.
  let failing = true;
  await page.route(`**${entry}`, async (route) => {
    if (failing) {
      await route.fulfill({
        status: 503,
        headers: { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" },
        body: "This file is not at this place of the host yet.\n",
      });
    } else {
      await route.fallback();
    }
  });
  await page.goto("/");
  const said = page.getByRole("alert");
  await expect(said).toHaveText(
    "Zemp Lite could not be loaded: a file of it did not arrive. That can happen for a few seconds while a new version is put in place. Load again",
  );
  // Nothing of the app is drawn: the line is all there is.
  await expect(page.locator("#app > *")).toHaveCount(1);
  // The file is there now: Load again brings the app, and the line is gone.
  failing = false;
  await said.getByRole("button", { name: "Load again", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Zemp Lite");
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("where every file arrives, the page's own line is never shown", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Zemp Lite");
  await expect(page.getByText("could not be loaded")).toHaveCount(0);
});
