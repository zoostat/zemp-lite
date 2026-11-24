// The Outline of a script (release 0.2.1, step 3; open decisions #178 and #203): its sections,
// read from the comments `// # Title` and `// ## Title`, each going to its line, the one the
// cursor is in marked, and each run with what its statements need.
import type { Page } from "@playwright/test";
import { cursorTo, editor, expect, scriptText, test, write } from "./support";

const READY = "engine Zeff 0.8.0 ready";

async function scratch(page: Page, press: (target: ReturnType<Page["locator"]>) => Promise<void>) {
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await expect.poll(() => scriptText(page)).toMatch(/^\/\/ Returns to schooling/);
}

const bar = (page: Page) =>
  page.getByRole("toolbar", { name: "Script: its panes and its controls" });
const outline = (page: Page) =>
  page
    .getByRole("complementary", { name: "Script: the left pane" })
    .getByRole("region", { name: "Outline" });
const note = (page: Page, line: number) =>
  page.locator(`[data-testid="note"][data-line="${line}"]`);

async function opened(
  page: Page,
  press: (target: ReturnType<Page["locator"]>) => Promise<void>,
): Promise<void> {
  const link = bar(page).getByRole("button", { name: "Outline", exact: true });
  await expect(link).toHaveAttribute("aria-pressed", "false");
  await press(link);
  await expect(link).toHaveAttribute("aria-pressed", "true");
}

test("the Outline, closed at first, lists the sections of each example with their lines", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await opened(page, press);
  const entries = outline(page).locator("button.go");
  await expect(entries).toHaveText([
    /^Sample\s*4$/,
    /^Describe\s*9$/,
    /^Models\s*13$/,
    /^Figure\s*21$/,
  ]);
  await expect(entries.first()).toHaveAttribute("title", "Go to line 4");
  // The showcase of plots, opened from Project, which stands over the Outline.
  await press(bar(page).getByRole("button", { name: "Project", exact: true }));
  const left = page.getByRole("complementary", { name: "Script: the left pane" });
  await expect(left.getByRole("region")).toHaveCount(2);
  await press(left.getByRole("button", { name: /^plots\.zeff/ }));
  await expect(entries).toHaveText([
    /^Data\s*5$/,
    /^Basic: one line, one plot\s*12$/,
    /^Layered: several marks in one plot\s*25$/,
    /^Complex: facets, scales, coordinates and annotations\s*54$/,
    /^Publication: a finished figure\s*135$/,
  ]);
  // The engine's own sample is written in numbered paragraphs, not sections: the pane says
  // how a section is written.
  await press(left.getByRole("button", { name: /^instruments\.zeff/ }));
  await expect(entries).toHaveCount(0);
  await expect(outline(page)).toContainText("This script has no sections.");
  await expect(outline(page)).toContainText("// # Title");
  await expect(outline(page)).toContainText("// ## Title");
});

test("a click on a section brings its heading to the top of the script and marks it", async ({
  page,
  press,
}) => {
  await page.setViewportSize({ width: 1280, height: 600 });
  await scratch(page, press);
  await opened(page, press);
  // In the showcase of plots, 151 lines long, so that a heading far down can reach the top.
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByRole("combobox", { name: "Type a command" }).fill("plots.zeff");
  await page.keyboard.press("Enter");
  await expect.poll(() => scriptText(page)).toMatch(/^\/\/ Plots in Zeff/);
  const complex = outline(page).getByRole("button", { name: /^Complex/ });
  await press(complex);
  await expect(page.locator(".cm-lineNumbers .cm-activeLineGutter")).toHaveText("54");
  await expect(complex).toHaveAttribute("aria-current", "location");
  // The heading stands at the top of the script's own view, not merely in it.
  await expect
    .poll(async () => {
      const pane = (await page
        .getByRole("region", { name: "Script with its notes and output" })
        .boundingBox())!;
      const heading = (await editor(page)
        .locator(".cm-line", { hasText: "// # Complex: facets" })
        .boundingBox())!;
      return Math.round(heading.y - pane.y);
    })
    .toBeLessThan(30);
  // Another section gone to is the one marked; a subsection would be marked before the
  // section that holds it (the unit tests hold that).
  const last = outline(page).getByRole("button", { name: /^Publication/ });
  await press(last);
  await expect(last).toHaveAttribute("aria-current", "location");
  await expect(complex).not.toHaveAttribute("aria-current", "location");
  // Above the first section no entry is marked.
  await page.keyboard.press("ControlOrMeta+Home");
  await expect(page.locator(".cm-lineNumbers .cm-activeLineGutter")).toHaveText("1");
  await expect(outline(page).locator('[aria-current="location"]')).toHaveCount(0);
});

test("Run section runs the statements of the section, with what they read, and no others", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await opened(page, press);
  // Describe: the summary (line 10) and the histogram (line 11), which read `wages` (line 5).
  await press(outline(page).getByRole("button", { name: "Run section Describe" }));
  await expect(page.getByRole("status")).toHaveText("done");
  for (const line of [5, 10, 11]) await expect(note(page, line)).not.toContainText("not run");
  for (const line of [14, 15, 17, 19, 22, 23]) {
    await expect(note(page, line)).toContainText("not run");
  }
  await expect(page.getByTestId("run-facts")).toHaveText(/^run 1 · .* · 3 statements/);
  // The outputs of the section's own statements are open under them (a run of part unfolds
  // what was asked for); `wages`, run because they read it, has none to open.
  const open = page.locator('.cm-zemp-output [data-testid="block"]');
  await expect(open).toHaveCount(2);
  await expect(open.nth(0)).toHaveAttribute("data-line", "10");
  await expect(open.nth(1)).toHaveAttribute("data-line", "11");
});

test("⌘K offers to run the section the cursor is in, naming it and its lines", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await cursorTo(page, 15);
  await page.keyboard.press("ControlOrMeta+k");
  const box = page.getByRole("combobox", { name: "Type a command" });
  await box.fill("run section");
  const listed = page.getByRole("dialog", { name: "Commands" }).getByRole("option");
  await expect(listed).toHaveText([/^Run section\s*Models, lines 13 to 20$/]);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toHaveText("done");
  // Models: the three fits and the report, with `wages`; not the summary, the plots or y2019.
  for (const line of [5, 14, 15, 17, 19])
    await expect(note(page, line)).not.toContainText("not run");
  for (const line of [10, 11, 22, 23]) await expect(note(page, line)).toContainText("not run");
  // Above the first section there is none to run.
  await cursorTo(page, 1);
  await page.keyboard.press("ControlOrMeta+k");
  await box.fill("run section");
  await expect(listed).toHaveCount(0);
});

test("the outline follows the script as it is typed, a subsection under its section", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await opened(page, press);
  await write(
    page,
    [
      "// # Data",
      "let a = 1",
      "// ## Cleaning",
      "let b = a + 1",
      "  // # Indented, so not a section",
      "// ### Three marks, so not a section",
      "let c = max(a,",
      "// # Inside a call, so not a section",
      "    b)",
      "// # Results",
      "print(c)",
      "",
    ].join("\n"),
  );
  const entries = outline(page).locator("li");
  await expect(entries).toHaveText([/^Data\s*1/, /^Cleaning\s*3/, /^Results\s*10/]);
  await expect(entries.nth(1)).toHaveClass(/\bsub\b/);
  await expect(entries.nth(0)).not.toHaveClass(/\bsub\b/);
  // A heading typed at the top is listed at once, and the lines below it move down by one.
  await editor(page).focus();
  await page.keyboard.press("ControlOrMeta+Home");
  await page.keyboard.insertText("// # Opening\n");
  await expect(entries).toHaveText([/^Opening\s*1/, /^Data\s*2/, /^Cleaning\s*4/, /^Results\s*11/]);
  // Run section on a subsection runs it alone, with what it reads: `b` and `c`, which are
  // in it, and `a`, which they read; not the print of the section after it.
  await press(outline(page).getByRole("button", { name: "Run section Cleaning" }));
  await expect(page.getByRole("status")).toHaveText("done");
  await expect(page.getByTestId("run-facts")).toHaveText(/ · 3 statements/);
  await expect(note(page, 12)).toContainText("not run");
});
