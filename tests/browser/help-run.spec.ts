// The examples of Help run in the page (release 0.3, step 9; open decision #211, item 11):
// **Run** under every example, its statements changed where they stand, **Reset**, what the
// engine printed and said, a code opening its page, the plots drawn by the engine; each
// example run as its page opens, in a session of its own that holds nothing of the reader's
// project and leaves the reader's results as they were.
import type { Locator, Page } from "@playwright/test";
import {
  countAsked,
  editor,
  expect,
  printed,
  scriptText,
  test,
  useExample,
  write,
} from "./support";

const READY = "engine Zeff 0.9.0 ready";
const shown = (page: Page) => page.getByTestId("help-page");
const title = (page: Page) => page.getByTestId("help-title");
const places = (page: Page) => page.getByRole("navigation", { name: "Places" });
/** The examples of the page shown, each a group of its own. */
const examples = (page: Page) => shown(page).getByTestId("example");
/** Those of the page's EXAMPLES, which run one after another as one script. */
const listed = (page: Page) =>
  shown(page).getByRole("region", { name: "Examples", exact: true }).getByTestId("example");
const run = (example: Locator) => example.getByRole("button", { name: "Run the example" });
const reset = (example: Locator) => example.getByRole("button", { name: "Reset the example" });
const field = (example: Locator) =>
  example.getByRole("textbox", { name: /^The statements of the example/ });
const status = (example: Locator) => example.getByTestId("example-status");
const output = (example: Locator) => example.getByTestId("example-output");
const RAN = /^run by the engine in [\d.]+ m?s$/;

/** Every example of the page shown has had the engine's answer. */
async function allRan(page: Page): Promise<void> {
  await expect(status(examples(page)).filter({ hasNotText: RAN })).toHaveCount(0, {
    timeout: 20_000,
  });
}

/** A slow example: a loop the engine is asked about its end between every two passes. */
const SLOW = "for i in 1..2000000 {\n    let rows = dataset(wages).where(year == 2015).n_rows()\n}";

test("a page opens and its examples are run, each showing what this engine gave, which is what the page says", async ({
  page,
}) => {
  const asked = await countAsked(page);
  await page.goto("/#/help/name/mean");
  await expect(title(page)).toHaveText("mean");
  await expect(page.getByRole("status")).toHaveText(READY);
  // What the page says each example prints, as the engine's print has it, read before any ran
  // or after: it is the same text.
  await allRan(page);
  const first = listed(page).first();
  await expect(field(first)).toHaveValue("let wages = dataset(wages)\nwages.mean(wage)");
  await expect(output(first)).toHaveText(
    "27.3695\nwarning[W0201]: 211 rows with NA in wage were skipped (line 2)",
  );
  // The wrong call of "A common mistake" is run too, after the page's examples, as the engine
  // runs it: the engine's words, without the excerpt of a script the page does not show.
  const mistake = examples(page).filter({ hasText: "dataset(wages).mean(log(wage))" });
  await expect(output(mistake)).toHaveText(
    /^error\[Z0401\]: `var` of `mean` takes a variable of the frame, not an expression\n {2}= help: compute it first/,
  );
  await expect(output(mistake)).not.toContainText("examples.zeff");
  // The page's examples went to the engine as two scripts: the examples in their order, and
  // the wrong call after them. No run of the reader's was made.
  expect(await asked("example")).toBe(2);
  expect(await asked("run")).toBe(0);
  // A code of a warning opens its page.
  await listed(page).first().getByRole("button", { name: "W0201" }).click();
  await expect(title(page)).toHaveText("W0201");
});

test("an example is changed where it stands, run again, and put back as the page has it", async ({
  page,
  press,
}) => {
  await page.goto("/#/help/name/mean");
  await expect(title(page)).toHaveText("mean");
  await allRan(page);
  const first = listed(page).first();
  const second = listed(page).nth(1);
  await expect(reset(first)).toBeDisabled();
  const secondBefore = await output(second).textContent();
  // The mean of the hours in place of the wages.
  await field(first).fill("let wages = dataset(wages)\nwages.mean(hours)");
  await expect(status(first)).toHaveText("edited · not run");
  await expect(reset(first)).toBeEnabled();
  // What stood under it stands until it is run.
  await expect(output(first)).toContainText("27.3695");
  await press(run(first));
  await expect(status(first)).toHaveText(RAN);
  await expect(output(first)).toHaveText(
    /^37\.9446\nwarning\[W0201\]: 35 rows with NA in hours were skipped \(line 2\)$/,
  );
  // The statements are shown in the editor's colours as they now stand.
  await expect(first.getByTestId("code").nth(1)).toHaveText("wages.mean(hours)");
  // The examples under it are not run by this: they stand as they were.
  expect(await output(second).textContent()).toBe(secondBefore);
  // ⌘↵ in the field runs it, as it runs a statement of the script.
  await field(first).fill("let wages = dataset(wages)\nwages.mean(educ)");
  await field(first).press("ControlOrMeta+Enter");
  await expect(output(first)).toHaveText("13.4914");
  // Reset: the page's statements again, and what they print.
  await press(reset(first));
  await expect(field(first)).toHaveValue("let wages = dataset(wages)\nwages.mean(wage)");
  await expect(output(first)).toContainText("27.3695");
  await expect(status(first)).toHaveText(RAN);
  await expect(reset(first)).toBeDisabled();
});

test("an example changed into an error shows the engine's words, its code opens the page, and the examples under it say they were not run", async ({
  page,
  press,
}) => {
  await page.goto("/#/help/name/mean");
  await allRan(page);
  const first = listed(page).first();
  const second = listed(page).nth(1);
  await field(first).fill("let wages = dataset(wages)\nwages.mean(nosuch)");
  await press(run(first));
  await expect(output(first)).toHaveText(/^error\[Z0101\]: no variable `nosuch` in `wages`/);
  await expect(status(first)).toHaveText(RAN);
  // An example under it is run with those above it, as the engine runs a page's examples:
  // the engine stops at the error above, and this one says so and keeps what it showed.
  const before = await output(second).textContent();
  await press(run(second));
  await expect(status(second)).toHaveText(
    "not run: the engine stopped at an error in another example",
  );
  expect(await output(second).textContent()).toBe(before);
  // The first put right, the second runs.
  await press(reset(first));
  await expect(output(first)).toContainText("27.3695");
  await press(run(second));
  await expect(status(second)).toHaveText(RAN);
  // The code of the error opens its page.
  await field(first).fill("let wages = dataset(wages)\nwages.mean(nosuch)");
  await press(run(first));
  await press(output(first).getByRole("button", { name: "Z0101" }));
  await expect(title(page)).toHaveText("Z0101");
});

test("a plot of an example is drawn by the engine in the page, light in both themes, and laid out again when the page is made narrower", async ({
  page,
  press,
}) => {
  const asked = await countAsked(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/#/help/name/scatter");
  await expect(title(page)).toHaveText("scatter");
  await allRan(page);
  const figures = shown(page).getByTestId("example-figure");
  await expect(figures).toHaveCount(2);
  const sizes = async (figure: Locator) =>
    figure.locator("img").evaluate((node) => {
      const img = node as HTMLImageElement;
      const svg = decodeURIComponent(img.src.slice(img.src.indexOf(",") + 1));
      const size = /<svg[^>]*\swidth="([\d.]+)pt"\sheight="([\d.]+)pt"/.exec(svg);
      return {
        svg,
        shown: img.getBoundingClientRect().width,
        own: size === null ? 0 : (Number(size[1]) * 96) / 72,
      };
    });
  const wide = await sizes(figures.first());
  expect(wide.svg).toContain("<svg");
  // At its own size: laid out for the page's width, not stretched to it.
  expect(Math.abs(wide.own - wide.shown)).toBeLessThan(1);
  expect(wide.svg).not.toBe((await sizes(figures.nth(1))).svg);
  // The engine's figure is light, for print, in the dark theme too.
  await press(page.getByRole("switch", { name: "Dark" }));
  expect(await figures.first().evaluate((node) => getComputedStyle(node).backgroundColor)).toBe(
    "rgb(255, 255, 255)",
  );
  expect((await sizes(figures.first())).svg).toBe(wide.svg);
  // A narrower page, at a tablet's width with Topics drawn wide by the keyboard (until release
  // 0.3.1, a window of 760 pixels: open decision #243): the figures are laid out again, by a
  // run of the examples as they last ran, and are at their own size again.
  const before = await asked("example");
  await page.setViewportSize({ width: 1024, height: 900 });
  const edge = page.getByRole("separator", { name: "The width of the left pane" });
  await edge.focus();
  for (let step = 0; step < 40; step += 1) await page.keyboard.press("ArrowRight");
  await expect
    .poll(
      async () => {
        const now = await sizes(figures.first());
        return now.shown < wide.shown - 40 && Math.abs(now.own - now.shown) < 1;
      },
      { timeout: 20_000 },
    )
    .toBe(true);
  const narrow = await sizes(figures.first());
  expect(Math.abs(narrow.own - narrow.shown)).toBeLessThan(1);
  expect(narrow.svg).not.toBe(wide.svg);
  expect(await asked("example")).toBe(before + 1);
});

test("the reader's script and its results are untouched by the examples, and the reader's run goes before them", async ({
  page,
  press,
}) => {
  const asked = await countAsked(page);
  await page.setViewportSize({ width: 1280, height: 3200 });
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await useExample(page);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await press(page.getByRole("button", { name: "Unfold all", exact: true }));
  const before = await printed(page);
  const facts = await page.getByTestId("run-facts").textContent();
  const figure = page.locator('[data-testid="figure"][data-line="17"] img');
  await expect(figure).toBeVisible();
  const drawn = await figure.getAttribute("src");

  // A page of Help whose examples bind `wages`, as the reader's script does, and run.
  await press(places(page).getByRole("button", { name: "Help" }));
  await page.getByRole("combobox", { name: /^Search Help/ }).fill("mean");
  await page.keyboard.press("Enter");
  await expect(title(page)).toHaveText("mean");
  await allRan(page);
  expect(await asked("example")).toBe(2);

  // A slow example, and the reader's run begun while it goes: the run is not kept waiting.
  const first = listed(page).first();
  await field(first).fill(SLOW);
  await press(run(first));
  await expect(status(first)).toHaveText("running…");
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done", { timeout: 8_000 });
  // The example is run again after it, from its start. Then the page of Help is left, and
  // the example is dropped: the engine is not kept by it.
  await expect(status(first)).toHaveText("running…");
  await press(places(page).getByRole("button", { name: "Script" }));
  // The reader's results: the run just made, of the same text, prints the same, and the
  // figure of line 17 is the same drawing.
  await press(page.getByRole("button", { name: "Unfold all", exact: true }));
  expect(await printed(page)).toBe(before);
  expect(await page.getByTestId("run-facts").textContent()).not.toBe(facts);
  await expect(page.getByTestId("run-facts")).toHaveText(/^run 2 · /);
  await expect(figure).toBeVisible();
  expect(await figure.getAttribute("src")).toBe(drawn);
  // The engine still holds the reader's run, whatever examples ran beside it: a figure in a
  // new place is laid out from it, and no run is asked for.
  await page.setViewportSize({ width: 1280, height: 900 });
  await press(places(page).getByRole("button", { name: "Plots" }));
  await expect(page.getByTestId("draw-time")).toHaveText(/^laid out by the engine in \d/);
  expect(await asked("run")).toBe(2);
  // The Data place lists the frames of the reader's run, and none of an example's.
  await press(places(page).getByRole("button", { name: "Data" }));
  await expect(page.getByTestId("data")).toContainText("w2010");
});

test("the example of an explained code is the page's illustration: not run as the page opens, and run as it stands when Run is pressed", async ({
  page,
  press,
}) => {
  const asked = await countAsked(page);
  await page.goto("/#/help/code/Z0401");
  await expect(title(page)).toHaveText("Z0401");
  await expect(page.getByRole("status")).toHaveText(READY);
  const one = examples(page).first();
  await expect(status(one)).toHaveText("the page's illustration · not run");
  await expect(output(one)).toHaveText(
    /^error\[Z0401\]: `var` of `mean` must be a Var, but this is a Str/,
  );
  expect(await asked("example")).toBe(0);
  // Made whole, it runs to the message the page explains.
  await field(one).fill('dataset(wages).mean("wage")');
  await press(run(one));
  await expect(status(one)).toHaveText(RAN);
  await expect(output(one)).toHaveText(/^error\[Z0401\]: /);
  expect(await asked("example")).toBe(1);
});

test("an example that runs beyond its time is stopped, and says so beside what it had printed", async ({
  page,
  press,
}) => {
  test.slow();
  await page.goto("/#/help/name/mean");
  await allRan(page);
  const first = listed(page).first();
  await field(first).fill(`print("started")\n${SLOW}`);
  await press(run(first));
  await expect(status(first)).toHaveText("running…");
  await expect(status(first)).toHaveText("stopped: the examples ran for more than 10 seconds", {
    timeout: 25_000,
  });
  await expect(output(first)).toHaveText(/^started\nerror\[Z0705\]: the run was cancelled/);
  // The engine goes on: the page's own runs again.
  await press(reset(first));
  await expect(status(first)).toHaveText(RAN);
  await expect(output(first)).toContainText("27.3695");
});

test("an example is reached and run through the keyboard, and its words are no smaller than 12.5 pixels", async ({
  page,
}) => {
  await page.goto("/#/help/name/mean");
  await allRan(page);
  const first = listed(page).first();
  await field(first).focus();
  await page.keyboard.press("End");
  // Tab leaves the field: it does not keep the key, and nothing is typed into it.
  await page.keyboard.press("Tab");
  await expect(field(first)).not.toBeFocused();
  await expect(field(first)).toHaveValue("let wages = dataset(wages)\nwages.mean(wage)");
  // Run and Reset are buttons, pressed by the keys that press a button.
  await field(first).fill("let wages = dataset(wages)\nwages.mean(educ)");
  await expect(status(first)).toHaveText("edited · not run");
  await run(first).press("Enter");
  await expect(output(first)).toHaveText("13.4914");
  await reset(first).press("Space");
  await expect(output(first)).toContainText("27.3695");
  await expect(status(first)).toHaveText(RAN);
  // What it printed is reached by the Tab key, by its name, and scrolls where it is wide.
  await expect(first.getByRole("group", { name: "What the example printed" })).toHaveAttribute(
    "tabindex",
    "0",
  );
  const sizes = await first.evaluate((node) =>
    [...node.querySelectorAll<HTMLElement>("button, .status, pre, textarea")].map((one) =>
      Number.parseFloat(getComputedStyle(one).fontSize),
    ),
  );
  expect(Math.min(...sizes)).toBeGreaterThanOrEqual(12.5);
});

test("Copy to script puts an example's statements, as they stand, into the open script at the cursor, and undo takes them out", async ({
  page,
  press,
}) => {
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await write(page, "let a = 6\n\nprint(a)\n");
  // The cursor on the blank second line of the script.
  await editor(page).locator(".cm-line").nth(1).click();
  await press(places(page).getByRole("button", { name: "Help" }));
  await page.getByRole("combobox", { name: /^Search Help/ }).fill("mean");
  await page.keyboard.press("Enter");
  await expect(title(page)).toHaveText("mean");
  await allRan(page);
  // The first example as the page has it: its statements, without its comment or its output.
  const first = listed(page).first();
  await press(first.getByRole("button", { name: "Copy to script" }));
  // The script is shown, with the statements where the cursor was.
  await expect(places(page).getByRole("button", { name: "Script" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect
    .poll(() => scriptText(page))
    .toBe("let a = 6\nlet wages = dataset(wages)\nwages.mean(wage)\nprint(a)\n");
  // Undo in the script takes them out, as one edit.
  await editor(page).press("ControlOrMeta+z");
  await expect.poll(() => scriptText(page)).toBe("let a = 6\n\nprint(a)\n");
  // An example changed in the page is copied as it stands; on a line that holds a statement it
  // goes on lines of its own after it.
  await editor(page).locator(".cm-line").nth(2).click();
  await press(places(page).getByRole("button", { name: "Help" }));
  await expect(title(page)).toHaveText("mean");
  const second = listed(page).nth(1);
  await field(second).fill("wages.mean(hours, by: female)");
  await press(second.getByRole("button", { name: "Copy to script" }));
  await expect
    .poll(() => scriptText(page))
    .toBe("let a = 6\n\nprint(a)\nwages.mean(hours, by: female)\n");
});

test("Copy to script from a page opened by its address puts the statements at the end of the script, where the cursor has not been", async ({
  page,
  press,
}) => {
  await page.goto("/#/help/name/mean");
  await expect(title(page)).toHaveText("mean");
  await allRan(page);
  await press(listed(page).first().getByRole("button", { name: "Copy to script" }));
  await expect(places(page).getByRole("button", { name: "Script" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  const statements = "let wages = dataset(wages)\nwages.mean(wage)";
  await expect.poll(() => scriptText(page)).toContain(statements);
  const copied = await scriptText(page);
  await editor(page).press("ControlOrMeta+z");
  await expect.poll(() => scriptText(page)).not.toContain(statements);
  const before = await scriptText(page);
  // After everything the script held: on its last line where that is empty.
  expect(copied.startsWith(before.replace(/\n$/, ""))).toBe(true);
  expect(copied.trimEnd().endsWith(statements)).toBe(true);
});
