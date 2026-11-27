// The accent is cobalt (release 0.3.1, step 2; open decision #244): the logo, the Lite badge,
// the one filled button, a link, the place shown and what is selected are drawn in it, in both
// themes, and nothing the build writes holds a value of the violet it replaced, nor the blue
// that function names had. That code is coloured anew is held in `editor.spec.ts`; that the
// figures and the exported PDFs are untouched, by the tests that hold them to the engine's own
// bytes and to their kept digests (`figure.spec.ts`, `script-pdf.spec.ts`, `paper-sample.spec.ts`).
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { Locator, Page } from "@playwright/test";
import { OLD_COLOURS } from "../../src/theme/tokens";
import { expect, test, useExample } from "./support";

const READY = "engine Zeff 0.9.0 ready";
const LIGHT = { accent: "rgb(36, 72, 168)", soft: "rgb(233, 238, 251)", ink: "rgb(255, 255, 255)" };
const DARK = { accent: "rgb(157, 178, 255)", soft: "rgb(24, 30, 56)", ink: "rgb(13, 19, 48)" };

type Press = (target: Locator) => Promise<void>;

const drawn = (target: Locator, what: "color" | "backgroundColor" | "stroke" | "fill") =>
  target.evaluate((node, name) => getComputedStyle(node)[name], what);

/** Every file under a folder, by its path. */
function filesUnder(folder: string): string[] {
  return readdirSync(folder).flatMap((name) => {
    const at = path.join(folder, name);
    return statSync(at).isDirectory() ? filesUnder(at) : [at];
  });
}

test("no built file holds a value of the violet, nor the blue that function names had", () => {
  const dist = path.resolve("dist");
  const texts = filesUnder(dist).filter((file) => /\.(js|css|html|svg|json|txt)$/.test(file));
  expect(texts.length).toBeGreaterThan(5);
  // A colour as six digits, and as its three numbers however they are parted.
  const old = OLD_COLOURS.map((hex) => {
    const [red, green, blue] = [0, 2, 4].map((at) => parseInt(hex.slice(at, at + 2), 16));
    return {
      hex,
      written: new RegExp(`#${hex}|\\b${red}[, ]+${green}[, ]+${blue}\\b(?![.\\d])`, "i"),
    };
  });
  const found: string[] = [];
  for (const file of texts) {
    const text = readFileSync(file, "utf8");
    for (const { hex, written } of old) {
      const at = written.exec(text);
      if (at !== null) found.push(`${path.relative(dist, file)}: #${hex} as "${at[0]}"`);
    }
  }
  expect(found).toEqual([]);
});

async function scratch(page: Page, press: Press) {
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await useExample(page);
}

test("the logo, the badge, the filled button, the place shown, a link and a selection are cobalt, in both themes", async ({
  page,
  press,
}) => {
  await page.goto("/");
  // The projects screen: the name's badge, and the mark's strokes and centre.
  const badge = page.locator("[data-name-badge]").first();
  await expect(badge).toBeVisible();
  expect(await drawn(badge, "color")).toBe(LIGHT.accent);
  expect(await drawn(badge, "backgroundColor")).toBe(LIGHT.soft);
  await scratch(page, press);
  const top = page.getByRole("banner");
  const run = top.getByRole("button", { name: "Run", exact: true });
  const shown = top.getByRole("navigation", { name: "Places" }).locator("button.on");
  const strokes = top.locator("svg g[stroke]").first();
  const centre = top.locator("svg polygon[fill]").first();
  for (const [theme, colours, logo] of [
    ["light", LIGHT, "rgb(20, 42, 102)"],
    ["dark", DARK, "rgb(227, 233, 255)"],
  ] as const) {
    if (theme === "dark") await press(top.getByRole("switch", { name: "Dark" }));
    // The one filled button, and its ink.
    expect(await drawn(run, "backgroundColor"), theme).toBe(colours.accent);
    expect(await drawn(run, "color"), theme).toBe(colours.ink);
    // The place shown.
    await expect(shown).toHaveText("Script");
    expect(await drawn(shown, "color"), theme).toBe(colours.accent);
    // The mark: its strokes are the accent itself.
    expect(await drawn(strokes, "stroke"), theme).toBe(colours.accent);
    expect(await drawn(centre, "fill"), theme).toBe(logo);
  }
  await press(top.getByRole("switch", { name: "Dark" }));
  // A selection: the command the palette marks. A link: a package's, on the home page of Help.
  await page.keyboard.press("ControlOrMeta+k");
  const marked = page.getByRole("dialog").getByRole("option", { selected: true });
  await expect(marked).toBeVisible();
  expect(await drawn(marked, "backgroundColor")).toBe(LIGHT.soft);
  await page.keyboard.press("Escape");
  await press(top.getByRole("button", { name: "Help", exact: true }));
  const link = page.getByRole("button", { name: "regress", exact: true }).last();
  await expect(link).toBeVisible();
  expect(await drawn(link, "color")).toBe(LIGHT.accent);
});

test("the filled button under the pointer is the accent's hover colour", async ({
  page,
  press,
  mouseWorks,
}) => {
  test.skip(!mouseWorks, "this test browser does not deliver the mouse where it is aimed");
  await scratch(page, press);
  const run = page.getByRole("banner").getByRole("button", { name: "Run", exact: true });
  await run.hover();
  await expect.poll(() => drawn(run, "backgroundColor")).toBe("rgb(47, 87, 196)");
});
