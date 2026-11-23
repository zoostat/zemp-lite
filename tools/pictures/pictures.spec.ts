// The scenes of the pictures of Using Zemp Lite (release 0.2.3, step 8b; `npm run pictures`).
// Each brings the app to what its picture shows, as a reader would, in Chromium, in the light
// theme and in a window of one size; the screen is then taken and written, compressed, into
// `src/using/pictures/<name>.webp`, under the name the page gives the picture. A page of
// `src/using/pages/` names its picture as `![words](name)`; a unit test holds the pages and
// the pictures to each other.
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Locator, Page } from "@playwright/test";
import { expect, test } from "../../tests/browser/support";

/** The size every picture is taken at: the narrowest window the app is laid out for. */
const SIZE = { width: 1200, height: 750 };
/** How closely a picture is kept, of 1: enough that the letters of the screen stay sharp. */
const KEPT = 0.86;

const folder = fileURLToPath(new URL("../../src/using/pictures/", import.meta.url));
const READY = "engine Zeff 0.8.0 ready";
type Press = (target: Locator) => Promise<void>;

/** The Scratch project as a reader first opens it, with its own example. */
async function scratch(page: Page, press: Press): Promise<void> {
  await page.goto("/");
  await press(page.getByRole("button", { name: "Scratch project" }));
  await expect(page.getByRole("status")).toHaveText(READY);
}

/** The scenes: the name of each picture, and how the app is brought to it. */
const SCENES: Record<string, (page: Page, press: Press) => Promise<void>> = {
  // Getting started: the example run, a note beside each statement.
  "the-script-after-a-run": async (page, press) => {
    await scratch(page, press);
    await press(page.getByRole("button", { name: "Run", exact: true }));
    await expect(page.getByRole("status")).toHaveText("done");
  },
  // Finding help: a name of R typed in the search field of Help.
  "search-in-help": async (page, press) => {
    await scratch(page, press);
    await press(
      page.getByRole("navigation", { name: "Places" }).getByRole("button", { name: "Help" }),
    );
    await expect(page.getByTestId("help-counts")).toBeVisible();
    await page.getByRole("combobox", { name: /^Search Help/ }).pressSequentially("lm");
    await expect(page.getByRole("listbox", { name: "What was found" })).toBeVisible();
  },
};

/** A picture as the browser itself compresses it: no tool beside the test browser is needed. */
async function compressed(page: Page, png: Buffer): Promise<Buffer> {
  const blank = await page.context().newPage();
  const data = await blank.evaluate(
    async ([base64, kept]) => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext("2d")?.drawImage(image, 0, 0);
      return canvas.toDataURL("image/webp", kept).split(",")[1] ?? "";
    },
    [png.toString("base64"), KEPT] as const,
  );
  await blank.close();
  return Buffer.from(data, "base64");
}

for (const [name, scene] of Object.entries(SCENES)) {
  test(`the picture ${name}`, async ({ page, press }) => {
    await page.setViewportSize(SIZE);
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await scene(page, press);
    // The pointer out of the way, and the page given a moment to finish drawing.
    await page.mouse.move(0, 0);
    await page.waitForTimeout(400);
    const picture = await compressed(page, await page.screenshot({ type: "png" }));
    expect(picture.length).toBeGreaterThan(4_000);
    mkdirSync(folder, { recursive: true });
    writeFileSync(`${folder}${name}.webp`, picture);
  });
}
