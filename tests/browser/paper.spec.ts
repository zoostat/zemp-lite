// The Paper place (release 0.3, step 12; the Zemp Specification, sections 5 and 8; open
// decisions #172 and #203): **Paper** in the top bar after Plots; the frame of three panes,
// **Project** and **Outline** at the left and the page at the right of the source; a place
// with no paper that says what Paper is and offers one; **New paper…**, made in the folder
// `paper`; a paper saved as it is typed and found again; and Typst fetched the first time a
// paper is opened, with its size said and how far the fetching has gone.
import type { Locator, Page } from "@playwright/test";
import { expect, faintText, scriptText, smallestText, test } from "./support";

const READY = "engine Zeff 0.9.0 ready";
const MATHEMATICS = '#show math.equation: set text(font: "Libertinus Math")';
/** What the page's pane says at its foot once Typst is here and has set the paper. */
const SET = /^Typst 0\.15\.1 · set in \d+ ms$/;

type Press = (target: Locator) => Promise<void>;

async function scratch(page: Page, press: Press): Promise<void> {
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
}

const places = (page: Page) => page.getByRole("navigation", { name: "Places" });
const bar = (page: Page) =>
  page.getByRole("toolbar", { name: "Paper: its panes and its controls" });
const leftPane = (page: Page) => page.getByRole("complementary", { name: "Paper: the left pane" });
const none = (page: Page) => page.getByRole("region", { name: "No paper is open" });
const source = (page: Page) => page.getByRole("textbox", { name: "The paper's source" });
const thePage = (page: Page) => page.getByRole("region", { name: "The page" });
const typst = (page: Page) => page.getByTestId("paper-typst");
const naming = (page: Page) => page.getByRole("form", { name: "A new paper" });
const field = (page: Page) => page.getByRole("textbox", { name: "The new paper's name" });
const newPaper = (page: Page) => bar(page).getByRole("button", { name: "New paper…" });

/** The text the paper's editor holds. (These papers are short: every line is drawn.) */
const sourceText = async (page: Page): Promise<string> =>
  (
    await source(page)
      .locator(".cm-line")
      .evaluateAll((lines) => lines.map((line) => line.textContent ?? ""))
  ).join("\n");

/** Go to Paper and make a paper of this name, by the keyboard in the field. */
async function make(page: Page, press: Press, name: string | null = null): Promise<void> {
  await press(places(page).getByRole("button", { name: "Paper" }));
  await press(newPaper(page));
  await expect(field(page)).toBeFocused();
  if (name !== null) await field(page).fill(name);
  await field(page).press("Enter");
  await expect(naming(page)).toHaveCount(0);
  await expect(source(page)).toBeVisible();
}

/** The addresses the page asks for that are of the Paper module: its WebAssembly and its fonts. */
function askedOfTypst(page: Page): string[] {
  const asked: string[] = [];
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (/zemp_paper_bg.*\.wasm$|\.(otf|ttf)$/.test(path)) asked.push(path);
  });
  return asked;
}

test("Paper stands after Plots in the side menu; with no paper the place says what Paper is, and fetches nothing", async ({
  page,
  press,
}) => {
  const asked = askedOfTypst(page);
  await scratch(page, press);
  // The side menu's entries are icons, each with its name for a screen reader (open decision
  // #245; #33 amended for this menu alone).
  expect(
    await places(page)
      .getByRole("button")
      .evaluateAll((all) => all.map((one) => one.getAttribute("aria-label"))),
  ).toEqual(["Script", "Data", "Plots", "Paper", "Help", "All projects"]);
  const word = places(page).getByRole("button", { name: "Paper" });
  await expect(word).not.toHaveAttribute("aria-current", "page");
  await press(word);
  await expect(word).toHaveAttribute("aria-current", "page");
  // What Paper is, that the project has none, and the offer of one.
  await expect(none(page).getByRole("heading", { name: "Paper", level: 2 })).toBeVisible();
  await expect(none(page)).toContainText("A paper is written here as a Typst file (.typ)");
  await expect(none(page)).toContainText("This project has no paper yet.");
  await expect(none(page).getByRole("button", { name: "New paper…" })).toBeVisible();
  await expect(source(page)).toHaveCount(0);
  // The frame of the place: Project and Outline at the left, closed; the page at the right, open.
  const project = bar(page).getByRole("button", { name: "Project", exact: true });
  const outline = bar(page).getByRole("button", { name: "Outline", exact: true });
  const pageLink = bar(page).getByRole("button", { name: "Page", exact: true });
  await expect(project).toHaveAttribute("aria-pressed", "false");
  await expect(outline).toHaveAttribute("aria-pressed", "false");
  await expect(pageLink).toHaveAttribute("aria-pressed", "true");
  await expect(pageLink).toHaveAttribute("title", "Show or hide the page as Typst sets it");
  const at = async (target: Locator) => (await target.boundingBox())!.x;
  expect(await at(project)).toBeLessThan(await at(outline));
  expect(await at(outline)).toBeLessThan(await at(newPaper(page)));
  expect(await at(newPaper(page))).toBeLessThan(await at(pageLink));
  // The top bar names no file, and Typst is not fetched until a paper is open.
  await expect(page.locator("header .file")).toHaveCount(0);
  expect(asked).toEqual([]);
  // Back to the script, as it was.
  await press(places(page).getByRole("button", { name: "Script" }));
  await expect.poll(() => scriptText(page)).toMatch(/wages/);
});

test("New paper… asks a name, makes the paper in the folder paper with its first lines, and refuses a name taken", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await press(places(page).getByRole("button", { name: "Paper" }));
  await press(none(page).getByRole("button", { name: "New paper…" }));
  // The name is asked in a line of the place: the first is offered, and where it will be is said.
  await expect(field(page)).toBeFocused();
  await expect(field(page)).toHaveValue("paper");
  await expect(naming(page).getByRole("note")).toHaveText("It will be paper/paper.typ.");
  await field(page).fill("returns to schooling");
  await expect(naming(page).getByRole("note")).toHaveText(
    "It will be paper/returns to schooling.typ.",
  );
  await press(naming(page).getByRole("button", { name: "Make" }));
  await expect(naming(page)).toHaveCount(0);
  // The paper is open: its path in the bar, its name in the top bar, its first lines in the editor.
  await expect(page.getByTestId("paper-path")).toHaveText("paper/returns to schooling.typ");
  await expect(page.locator("header .file")).toHaveText("/ returns to schooling.typ · saved");
  await expect
    .poll(() => sourceText(page))
    .toBe(
      [
        "// Mathematics is set in Libertinus Math, the face Zemp Lite carries for it.",
        MATHEMATICS,
        "",
        "= Returns to schooling",
        "",
        "",
      ].join("\n"),
    );
  // A second: the first name of the folder is still free, and a name taken is refused in words,
  // capitals apart; Escape leaves the paper open as it was.
  await press(newPaper(page));
  await expect(field(page)).toHaveValue("paper");
  await field(page).fill("Returns To Schooling");
  await field(page).press("Enter");
  await expect(naming(page).getByRole("note")).toContainText(
    "`paper/returns to schooling.typ` is already in this project, and differs from that name only in capitals",
  );
  await field(page).fill("a/b");
  await field(page).press("Enter");
  await expect(naming(page).getByRole("note")).toContainText("A name is one part of a path");
  await field(page).press("Escape");
  await expect(naming(page)).toHaveCount(0);
  await expect(page.getByTestId("paper-path")).toHaveText("paper/returns to schooling.typ");
  // And one made by its offered name, by the keyboard alone.
  await make(page, press);
  await expect(page.getByTestId("paper-path")).toHaveText("paper/paper.typ");
  await expect.poll(() => sourceText(page)).toContain("= Paper");
});

test("Typst is fetched the first time a paper is opened, its size said and how far it has come, and once in a visit", async ({
  page,
  press,
}) => {
  test.slow();
  const asked = askedOfTypst(page);
  // The module's file is held back, so that the fetching can be seen.
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route(/zemp_paper_bg.*\.wasm$/, async (route) => {
    await held;
    await route.continue();
  });
  await scratch(page, press);
  await make(page, press);
  await expect(typst(page)).toHaveText(
    /^Fetching Typst, 7\.5 MB: 0%\. This browser keeps it afterwards\.$/,
  );
  const progress = thePage(page).getByRole("progressbar", {
    name: "How much of Typst has been fetched",
  });
  await expect(progress).toHaveAttribute("value", "0");
  // The paper can be written while Typst comes.
  await source(page).focus();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.insertText("Written while Typst was being fetched.");
  await expect.poll(() => sourceText(page)).toContain("Written while Typst was being fetched.");
  release();
  await expect(typst(page)).toHaveText(SET, { timeout: 60_000 });
  await expect(progress).toHaveCount(0);
  // The module and each of the nine fonts were asked for, the fonts once each; a browser is
  // told to keep each as never changing.
  const fonts = asked.filter((path) => /\.(otf|ttf)$/.test(path));
  expect(fonts).toHaveLength(9);
  expect(new Set(fonts).size).toBe(9);
  expect(asked.filter((path) => path.endsWith(".wasm")).length).toBeGreaterThan(0);
  const kept = await page.request.get(fonts[0] as string);
  expect(kept.headers()["cache-control"]).toBe("private, max-age=31536000, immutable");
  // A second paper, and the first opened again: nothing more is fetched.
  const before = asked.length;
  await make(page, press, "second");
  await expect(typst(page)).toHaveText(SET);
  await press(bar(page).getByRole("button", { name: "Close", exact: true }));
  await press(none(page).getByRole("button", { name: "paper/paper.typ" }));
  await expect(typst(page)).toHaveText(SET);
  expect(asked.length).toBe(before);
});

test("where Typst cannot be fetched the page's pane says so, and Try again fetches it", async ({
  page,
  press,
}) => {
  test.slow();
  let failing = true;
  await page.route(/zemp_paper_bg.*\.wasm$/, async (route) => {
    if (failing) await route.fulfill({ status: 503, body: "not yet" });
    else await route.continue();
  });
  await scratch(page, press);
  await make(page, press);
  await expect(typst(page)).toHaveText(
    /^Typst could not be fetched: zemp_paper_bg\.wasm could not be fetched: the host answered 503$/,
  );
  // The paper is written and saved all the same.
  await expect(page.locator("header .file")).toHaveText("/ paper.typ · saved");
  failing = false;
  await press(thePage(page).getByRole("button", { name: "Try again" }));
  await expect(typst(page)).toHaveText(SET, { timeout: 60_000 });
});

test("the Project pane lists a paper and marks the one open; a paper pressed there opens in Paper, a script in Script", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await make(page, press);
  await press(bar(page).getByRole("button", { name: "Project", exact: true }));
  const pane = leftPane(page).getByRole("region", { name: "Project" });
  const paper = pane.getByRole("button", { name: /^paper\.typ/ });
  await expect(paper).toHaveClass(/\bon\b/);
  // A script pressed here is shown in the Script place.
  await press(pane.getByRole("button", { name: /^instruments\.zeff/ }));
  await expect(places(page).getByRole("button", { name: "Script" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect.poll(() => scriptText(page)).toMatch(/staff/);
  // And the paper pressed in the Script place's Project pane is shown in Paper.
  const scripts = page.getByRole("toolbar", { name: "Script: its panes and its controls" });
  await press(scripts.getByRole("button", { name: "Project", exact: true }));
  const there = page
    .getByRole("complementary", { name: "Script: the left pane" })
    .getByRole("region", { name: "Project" });
  await expect(there.getByRole("button", { name: /^paper\.typ/ })).not.toHaveClass(/\bon\b/);
  await press(there.getByRole("button", { name: /^paper\.typ/ }));
  await expect(places(page).getByRole("button", { name: "Paper" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect.poll(() => sourceText(page)).toContain("= Paper");
  // The Outline pane is there, and lists the paper's one heading once its page is set (what
  // it does is held in `paper-places.spec.ts`).
  await press(bar(page).getByRole("button", { name: "Outline", exact: true }));
  await expect(
    leftPane(page).getByRole("region", { name: "Outline" }).getByTestId("paper-outline"),
  ).toHaveText("Paper 4", { timeout: 60_000 });
});

test("the source is coloured as Typst, in the app's colours", async ({ page, press }) => {
  await scratch(page, press);
  await make(page, press);
  await source(page).focus();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.insertText(
    '= Returns\n#set page(paper: "a4")\nWith *weight*, _stress_ and $x^2$. // said\n',
  );
  /** The colour, the weight and the slant a piece of the source is drawn in. */
  const drawn = (text: string) =>
    source(page)
      .locator(".cm-line span", { hasText: text })
      .last()
      .evaluate((span) => {
        const style = getComputedStyle(span);
        return `${style.color} ${style.fontWeight} ${style.fontStyle}`;
      });
  const token = (name: string) =>
    page.evaluate((token) => {
      const probe = document.createElement("span");
      probe.style.color = `var(--code-${token})`;
      document.body.append(probe);
      const colour = getComputedStyle(probe).color;
      probe.remove();
      return colour;
    }, name);
  expect(await drawn("= Returns")).toMatch(/ 700 normal$/);
  expect(await drawn("set")).toBe(`${await token("keyword")} 400 normal`);
  expect(await drawn("page")).toBe(`${await token("function")} 400 normal`);
  expect(await drawn("paper")).toBe(`${await token("option")} 400 normal`);
  expect(await drawn('"a4"')).toBe(`${await token("text")} 400 normal`);
  expect(await drawn("weight")).toMatch(/ 700 normal$/);
  expect(await drawn("stress")).toMatch(/ 400 italic$/);
  expect(await drawn("x^2")).toBe(`${await token("number")} 400 normal`);
  expect(await drawn("// said")).toBe(`${await token("comment")} 400 italic`);
});

test("by the keyboard: ⌘K goes to Paper, asks a new paper's name and closes it; the page's edge moves with the arrows", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  const command = async (typed: string, named: string) => {
    await page.keyboard.press("ControlOrMeta+k");
    const box = page.getByRole("combobox", { name: "Type a command" });
    await box.fill(typed);
    await expect(
      page.getByRole("dialog", { name: "Commands" }).getByRole("option").first(),
    ).toContainText(named);
    await box.press("Enter");
  };
  await command("place paper", "Place: Paper");
  await expect(none(page)).toBeVisible();
  // A new paper, from wherever the reader is: the place is shown and asks its name.
  await press(places(page).getByRole("button", { name: "Data" }));
  await command("new paper", "Paper: new paper…");
  await expect(field(page)).toBeFocused();
  // The name offered is selected, so that a name typed takes its place; an arrow keeps it.
  await page.keyboard.press("ArrowRight");
  await page.keyboard.type("-of-mine");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("paper-path")).toHaveText("paper/paper-of-mine.typ");
  // The edge between the source and the page: its place said, moved by the arrows, within limits.
  const edge = page.getByRole("separator", { name: "The width of the page" });
  await expect(edge).toHaveAttribute("aria-valuenow", "50");
  const wide = async () => Math.round((await thePage(page).boundingBox())!.width);
  const before = await wide();
  await edge.focus();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(edge).toHaveAttribute("aria-valuenow", "54");
  expect(await wide()).toBeGreaterThan(before);
  for (let step = 0; step < 20; step += 1) await page.keyboard.press("ArrowRight");
  await expect(edge).toHaveAttribute("aria-valuenow", "25");
  // The page's pane is closed and opened from ⌘K, the source taking its width.
  await command("paper hide page", "Paper: hide Page");
  await expect(thePage(page)).toHaveCount(0);
  await expect(edge).toHaveCount(0);
  await command("paper show page", "Paper: show Page");
  await expect(thePage(page)).toBeVisible();
  // The paper is opened by its name from ⌘K, and closed from it.
  await command("close paper-of-mine", "Paper: close paper-of-mine.typ");
  await expect(none(page).getByRole("button", { name: "paper/paper-of-mine.typ" })).toBeVisible();
  await command("open file paper-of-mine", "Open file: paper/paper-of-mine.typ");
  await expect(page.getByTestId("paper-path")).toHaveText("paper/paper-of-mine.typ");
});

for (const theme of ["light", "dark"] as const) {
  test(`the place keeps to the sizes and the contrast, with no paper and with one, in the ${theme} theme`, async ({
    page,
    press,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await scratch(page, press);
    if (theme === "dark") await press(page.getByRole("switch", { name: "Dark" }));
    await press(places(page).getByRole("button", { name: "Paper" }));
    const frame = page.locator('[data-place="Paper"]');
    await expect(none(page)).toBeVisible();
    expect(await smallestText(page)).toBeGreaterThanOrEqual(12.5);
    expect(await faintText(frame)).toEqual([]);
    // The line that asks a name, with a refusal in it.
    await press(newPaper(page));
    await field(page).fill("a/b");
    await field(page).press("Enter");
    await expect(naming(page).getByRole("note")).toContainText("one part of a path");
    expect(await smallestText(page)).toBeGreaterThanOrEqual(12.5);
    expect(await faintText(frame)).toEqual([]);
    await field(page).fill("paper");
    await field(page).press("Enter");
    await expect(typst(page)).toHaveText(SET, { timeout: 60_000 });
    for (const pane of ["Project", "Outline"]) {
      await press(bar(page).getByRole("button", { name: pane, exact: true }));
    }
    await expect(leftPane(page).getByRole("region", { name: "Outline" })).toBeVisible();
    expect(await smallestText(page)).toBeGreaterThanOrEqual(12.5);
    expect(await faintText(frame)).toEqual([]);
    // Nothing of the place reaches past the window.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      1280,
    );
  });
}

// Until release 0.3.1 a test here held the page under the source at a phone's width. Zemp
// Lite is not laid out for a phone (open decision #243), and the narrowest window it is laid
// out for is a tablet's held sideways: there the page stands beside the source, as on a desk.
test("at a tablet's width the page stands beside the source, and nothing reaches past the window", async ({
  page,
  press,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await scratch(page, press);
  await make(page, press);
  await expect(typst(page)).toHaveText(SET, { timeout: 60_000 });
  const editor = (await page.getByRole("region", { name: "The paper's source" }).boundingBox())!;
  const pane = (await thePage(page).boundingBox())!;
  expect(pane.x).toBeGreaterThanOrEqual(editor.x + editor.width - 1);
  expect(Math.abs(pane.y - editor.y)).toBeLessThan(2);
  expect(editor.width).toBeGreaterThan(300);
  expect(pane.width).toBeGreaterThan(300);
  expect(pane.x + pane.width).toBeLessThanOrEqual(1024);
  await expect(page.getByRole("separator", { name: "The width of the page" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(0);
});

// That a paper is found again after the page is loaded anew, with the place's panes, is held
// in `kept.spec.ts`, with the other tests that keep a browser's profile.
