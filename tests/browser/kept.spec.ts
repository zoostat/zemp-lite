// Projects that are kept: made, closed, and found again. In WebKit these tests have a browser
// profile on disk, whose private file system is one place shared by every test (see
// `support.ts`), so they run one after another and nowhere else is that storage used.
import { cursorTo, expect, printed, scriptText, test, write, useExample } from "./support";

test.use({ keptProfile: true });
test.describe.configure({ mode: "serial" });

const READY = "engine Zeff 0.9.0 ready";

test("the welcome screen says that projects are kept on this computer", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Kept on this computer.")).toBeVisible();
  await expect(page.getByText("No project yet", { exact: true })).toBeVisible();
});

test("a project is made, and is still there with its script after the page is reloaded", async ({
  page,
  press,
}) => {
  await page.goto("/");
  await press(page.getByRole("button", { name: "New project…" }));
  await page.getByLabel("The name of the new project").fill("Returns to schooling");
  await press(page.getByRole("button", { name: "Create" }));
  await expect(page).toHaveURL(/#\/p\/returns-to-schooling$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Returns to schooling");
  await expect.poll(() => scriptText(page)).toBe("// Returns to schooling\n");
  await write(page, '// Returns to schooling\nprint("kept")\n');
  await expect(page.getByText("saving")).toHaveCount(0);

  // The reload comes back to the same project, its script as it was left.
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Returns to schooling");
  await expect.poll(() => scriptText(page)).toBe('// Returns to schooling\nprint("kept")\n');
  await expect(page.getByRole("status")).toHaveText(READY);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await press(page.getByRole("button", { name: "Unfold all", exact: true }));
  await expect.poll(() => printed(page)).toBe("kept\n");

  // Back on the welcome screen it is listed, opened today; and its name is taken, however the
  // capitals are typed: the refusal names the project as it is written in the list.
  await press(page.getByRole("button", { name: "Projects" }));
  await expect(page).toHaveURL(/\/#?$/);
  const listed = page.getByRole("button", { name: /^Returns to schooling in this browser/ });
  await expect(listed).toContainText("in this browser · today,");
  await press(page.getByRole("button", { name: "New project…" }));
  await page.getByLabel("The name of the new project").fill("returns to schooling");
  await press(page.getByRole("button", { name: "Create" }));
  await expect(page.getByRole("alert")).toHaveText(
    'A project called "Returns to schooling" is already here. Choose another name.',
  );
  await press(listed);
  await expect.poll(() => scriptText(page)).toBe('// Returns to schooling\nprint("kept")\n');
});

test("the Scratch project keeps what the user wrote in it", async ({ page, press }) => {
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect
    .poll(() => scriptText(page))
    .toMatch(/^\/\/ Returns to schooling, in the wages panel/);
  await write(page, "print(1)\n");
  await expect(page.getByText("saving")).toHaveCount(0);
  await press(page.getByRole("button", { name: "Projects" }));
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect.poll(() => scriptText(page)).toBe("print(1)\n");
});

test("the file shown and a folder folded in the Project pane are kept with the project, and come back after a reload", async ({
  page,
  press,
}) => {
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  // Another file of the project shown in the Script place, and a folder of the tree folded.
  await press(
    page
      .getByRole("toolbar", { name: "Script: its panes and its controls" })
      .getByRole("button", { name: "Project", exact: true }),
  );
  const tree = page
    .getByRole("complementary", { name: "Script: the left pane" })
    .getByRole("region", { name: "Project" });
  await press(tree.getByRole("button", { name: /^zeff\.toml/ }));
  await expect.poll(() => scriptText(page)).toMatch(/^\[project\]\nname = "Scratch"/);
  const data = tree.getByRole("button", { name: "data", exact: true });
  await press(data);
  await expect(data).toHaveAttribute("aria-expanded", "false");
  // The view state is written a moment after the last change.
  await page.waitForTimeout(1500);

  await page.reload();
  await expect(page.getByRole("status")).toHaveText(READY);
  // The file that was shown is the one shown, and the one marked in the tree.
  await expect(page.locator("header.top")).toContainText("/ zeff.toml · saved");
  await expect.poll(() => scriptText(page)).toMatch(/^\[project\]\nname = "Scratch"/);
  await expect(tree.getByRole("button", { name: /^zeff\.toml/ })).toHaveClass(/\bon\b/);
  await expect(tree.getByRole("button", { name: /^main\.zeff/ })).not.toHaveClass(/\bon\b/);
  await expect(data).toHaveAttribute("aria-expanded", "false");
  // The view state is the interface's own: it is in the project, and the engine is not given it.
  await press(tree.getByRole("button", { name: /^main\.zeff/ }));
  await expect
    .poll(() => scriptText(page))
    .toMatch(/^\/\/ Returns to schooling, in the wages panel/);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
});

test("which panes are open is each project's own: a new project opens with Project closed and Notes open", async ({
  page,
  press,
}) => {
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  const bar = page.getByRole("toolbar", { name: "Script: its panes and its controls" });
  const project = bar.getByRole("button", { name: "Project", exact: true });
  const notes = bar.getByRole("button", { name: "Notes", exact: true });
  const left = page.getByRole("complementary", { name: "Script: the left pane" });
  await press(project);
  await press(notes);
  await expect(left).toBeVisible();
  // The view state is written a moment after the last change.
  await page.waitForTimeout(1500);
  // The choice is this project's: another project opens as a project does.
  await press(page.getByRole("button", { name: "Projects" }));
  await press(page.getByRole("button", { name: "New project…" }));
  await page.getByLabel("The name of the new project").fill("Another");
  await press(page.getByRole("button", { name: "Create" }));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Another");
  await expect(page.getByRole("status")).toHaveText(READY);
  await expect(project).toHaveAttribute("aria-pressed", "false");
  await expect(notes).toHaveAttribute("aria-pressed", "true");
  await expect(left).toHaveCount(0);
  // And the Scratch project is as it was left.
  await press(page.getByRole("button", { name: "Projects" }));
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await expect(project).toHaveAttribute("aria-pressed", "true");
  await expect(notes).toHaveAttribute("aria-pressed", "false");
  await expect(left.getByRole("region", { name: "Project" })).toBeVisible();
});

test("what is unfolded, and whether the notes are shown, are kept with the project", async ({
  page,
  press,
}) => {
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await useExample(page);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  // Every output folded, then one unfolded: the fit's, on line 12.
  await press(page.getByRole("button", { name: "Fold all", exact: true }));
  await press(page.locator('[data-testid="note"][data-line="12"]'));
  await expect(page.locator(".cm-zemp-output")).toHaveCount(1);
  await page.waitForTimeout(1500);
  await page.reload();
  await expect(page.getByRole("status")).toHaveText(READY);
  // A run of one statement leaves what it did not ask for as it was. ⌘↵ on line 13, which
  // prints the fit, runs line 12 as well, because line 13 reads it: line 13's output opens,
  // as asked for, and line 12's is open because it was kept so; no other is.
  await cursorTo(page, 13);
  await page.keyboard.press("ControlOrMeta+Enter");
  await expect(page.getByRole("status")).toHaveText("done");
  const open = page.locator('.cm-zemp-output [data-testid="block"]');
  await expect(open).toHaveCount(2);
  await expect(open.nth(0)).toHaveAttribute("data-line", "12");
  await expect(open.nth(1)).toHaveAttribute("data-line", "13");
  await press(page.getByRole("button", { name: "Notes", exact: true }));
  await page.waitForTimeout(1500);
  await page.reload();
  await expect(page.getByRole("status")).toHaveText(READY);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await expect(page.getByRole("button", { name: "Notes", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(page.getByTestId("note")).toHaveCount(0);
});

test("which panes of a place are open, and the left pane's width, are kept with the project", async ({
  page,
  press,
}) => {
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  const bar = page.getByRole("toolbar", { name: "Script: its panes and its controls" });
  const project = bar.getByRole("button", { name: "Project", exact: true });
  const notes = bar.getByRole("button", { name: "Notes", exact: true });
  // A project opens with Project closed and Notes open (open decision #203).
  await expect(project).toHaveAttribute("aria-pressed", "false");
  await expect(notes).toHaveAttribute("aria-pressed", "true");
  await press(project);
  await press(notes);
  const edge = page.getByRole("separator", { name: "The width of the left pane" });
  await edge.focus();
  await page.keyboard.press("ArrowRight");
  // The view state is written a moment after the last change.
  await page.waitForTimeout(1500);
  await page.reload();
  await expect(page.getByRole("status")).toHaveText(READY);
  await expect(project).toHaveAttribute("aria-pressed", "true");
  await expect(notes).toHaveAttribute("aria-pressed", "false");
  await expect(
    page.getByRole("complementary", { name: "Script: the left pane" }).getByRole("region", {
      name: "Project",
    }),
  ).toBeVisible();
  await expect(edge).toHaveAttribute("aria-valuenow", "284");
  // Left as a project opens, for the tests that follow in this profile.
  await press(project);
  await press(notes);
  await page.waitForTimeout(1500);
});

test("the order of the strip, the plots pinned and the page chosen are kept with the project", async ({
  page,
  press,
}) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await useExample(page);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await press(
    page.getByRole("navigation", { name: "Places" }).getByRole("button", { name: "Plots" }),
  );
  const plots = page.getByTestId("plots");
  const strip = plots.getByRole("list", { name: "Plots of the last run" });
  await strip.getByRole("button", { name: "Show the plot w2010 · log(wage) against educ" }).focus();
  await page.keyboard.press("Alt+ArrowRight");
  await press(plots.getByRole("checkbox", { name: "Compare" }).nth(0));
  await press(plots.getByRole("checkbox", { name: "Compare" }).nth(1));
  await press(
    plots.getByRole("group", { name: "Size" }).getByRole("button", { name: "One column" }),
  );
  await page.waitForTimeout(1500);

  await page.reload();
  await expect(page.getByRole("status")).toHaveText(READY);
  // A start opens on the Script place (open decision #220, item 8); the run is made again for
  // its plots, and the Plots place, gone to, is as it was left.
  await expect(
    page.getByRole("navigation", { name: "Places" }).getByRole("button", { name: "Script" }),
  ).toHaveAttribute("aria-current", "page");
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await press(
    page.getByRole("navigation", { name: "Places" }).getByRole("button", { name: "Plots" }),
  );
  await expect
    .poll(() => strip.locator(".name").allTextContents())
    .toEqual(["w2010 · log(wage)", "w2010 · log(wage) against educ"]);
  await expect(plots.getByTestId("comparing")).toHaveText("comparing 2");
  await expect(plots.getByRole("button", { name: "One column" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("the data viewer's sort and condition are kept with the project, and nothing else is", async ({
  page,
  press,
}) => {
  await page.goto("/");
  await press(page.getByRole("button", { name: "New project…" }));
  await page.getByLabel("The name of the new project").fill("Viewed");
  await press(page.getByRole("button", { name: "Create" }));
  await expect(page).toHaveURL(/#\/p\/viewed$/);
  await write(page, "let wages = dataset(wages)\n");
  await expect(page.getByText("saving")).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveText(READY);
  const toData = async () => {
    await press(page.getByRole("button", { name: "Run", exact: true }));
    await expect(page.getByRole("status")).toHaveText("done");
    await press(
      page.getByRole("navigation", { name: "Places" }).getByRole("button", { name: "Data" }),
    );
  };
  await toData();
  const sort = page.getByRole("grid").getByRole("button", { name: "Sort by age" });
  await press(sort);
  await expect(sort).toHaveText("↑");
  const where = page.getByRole("textbox", { name: "Keep rows where" });
  await where.fill("year == 2012");
  await where.press("Enter");
  await expect(page.getByTestId("kept-count")).toHaveText(/^[\d,]+ of 18,412 rows$/);
  await page.waitForTimeout(1500);

  await page.reload();
  await expect(page.getByRole("status")).toHaveText(READY);
  await toData();
  await expect(page.getByRole("grid").getByRole("button", { name: "Sort by age" })).toHaveText("↑");
  await expect(page.getByRole("textbox", { name: "Keep rows where" })).toHaveValue("year == 2012");
  await expect(page.getByTestId("kept-count")).toHaveText(/^[\d,]+ of 18,412 rows$/);
  // The script is as it was: the viewer wrote nothing into it.
  await press(
    page.getByRole("navigation", { name: "Places" }).getByRole("button", { name: "Script" }),
  );
  await expect.poll(() => scriptText(page)).toBe("let wages = dataset(wages)\n");
});

test("what a run writes is brought into the project: in the Project pane, in the browser's storage, and there after a reload", async ({
  page,
  press,
}) => {
  // A script's `export` and `save` write under the project's folder (Engine Specification,
  // section 2). The engine writes into its own copy of the project; the interface brings each
  // file a run wrote into the project itself (release 0.2.2, step 2b).
  const script = (size: string) =>
    "let pay = frame(educ = [10.0, 12, 14, 16], wage = [11.0, 14, 19, 26])\n" +
    `pay.plot(x: educ, y: wage).points().export("output/figure.svg", size: ${size})\n` +
    'pay.save("pay.csv")\n';
  /** A file of the project as the browser's own storage holds it, or `null` where it has none. */
  const stored = (path: string) =>
    page.evaluate(async (parts) => {
      try {
        let folder = await navigator.storage.getDirectory();
        for (const part of parts.slice(0, -1)) folder = await folder.getDirectoryHandle(part);
        const name = parts[parts.length - 1] as string;
        return await (await (await folder.getFileHandle(name)).getFile()).text();
      } catch {
        return null;
      }
    }, `projects/what-a-run-writes/${path}`.split("/"));
  await page.goto("/");
  await press(page.getByRole("button", { name: "New project…" }));
  await page.getByLabel("The name of the new project").fill("What a run writes");
  await press(page.getByRole("button", { name: "Create" }));
  await expect(page.getByRole("status")).toHaveText(READY);
  expect(await stored("output/figure.svg")).toBeNull();
  await write(page, script("[120, 80]"));
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  // Both files stand under `output/` in the Project pane, each with its size.
  await press(
    page
      .getByRole("toolbar", { name: "Script: its panes and its controls" })
      .getByRole("button", { name: "Project", exact: true }),
  );
  const tree = page
    .getByRole("complementary", { name: "Script: the left pane" })
    .getByRole("region", { name: "Project" });
  await expect(tree.getByRole("button", { name: "output", exact: true })).toBeVisible();
  await expect(tree.getByRole("listitem").filter({ hasText: "figure.svg" }).last()).toContainText(
    /\d (B|kB)/,
  );
  await expect(tree.getByRole("listitem").filter({ hasText: "pay.csv" }).last()).toContainText(
    /\d (B|kB)/,
  );
  // In the browser's storage each is what the engine wrote: the figure at 120 by 80 mm, which
  // is 340.157 by 226.772 points, and the frame as CSV.
  const figure = (await stored("output/figure.svg")) ?? "";
  expect(figure).toMatch(/^<\?xml[^>]*\?>\n<svg [^>]*width="340\.157pt" height="226\.772pt"/);
  expect(figure.trimEnd().endsWith("</svg>")).toBe(true);
  expect(await stored("output/pay.csv")).toBe(
    "educ,wage\n10.0,11.0\n12.0,14.0\n14.0,19.0\n16.0,26.0\n",
  );
  // A run that writes the figure afresh, at another size, replaces it.
  await write(page, script("[80, 120]"));
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await expect
    .poll(async () => (await stored("output/figure.svg")) ?? "")
    .toMatch(/<svg [^>]*width="226\.772pt" height="340\.157pt"/);
  // A statement of the console line that writes a file brings it too.
  const line = page.getByRole("textbox", { name: /Console/ });
  await line.fill('pay.save("from-the-console.csv")');
  await line.press("Enter");
  await expect.poll(() => stored("output/from-the-console.csv")).toMatch(/^educ,wage\n/);
  // After the page is loaded again the files are still the project's.
  await page.reload();
  await expect(page.getByRole("status")).toHaveText(READY);
  await expect(tree.getByRole("listitem").filter({ hasText: "figure.svg" }).last()).toBeVisible();
  await expect(
    tree.getByRole("listitem").filter({ hasText: "from-the-console.csv" }).last(),
  ).toBeVisible();
  expect(await stored("output/pay.csv")).toBe(
    "educ,wage\n10.0,11.0\n12.0,14.0\n14.0,19.0\n16.0,26.0\n",
  );
});

test("a change of the view is kept though others follow it at once, and the page is loaded again in the middle of them", async ({
  page,
  press,
}) => {
  // The view state is written a fifth of a second after the first change not yet written.
  // It was once written after the last, each change putting it off: a reader who opened a
  // pane and went straight on working found it closed when the page was loaded again.
  await page.goto("/");
  await press(page.getByRole("button", { name: "New project…" }));
  await page.getByLabel("The name of the new project").fill("Kept in the middle");
  await press(page.getByRole("button", { name: "Create" }));
  await expect(page.getByRole("status")).toHaveText(READY);
  const bar = page.getByRole("toolbar", { name: "Script: its panes and its controls" });
  const project = bar.getByRole("button", { name: "Project", exact: true });
  await expect(project).toHaveAttribute("aria-pressed", "false");
  await press(project);
  // A second of changes, each well within a fifth of a second of the one before: the pane's
  // edge moved by the keyboard, a step at a time.
  const edge = page.getByRole("separator", { name: "The width of the left pane" });
  await edge.focus();
  for (let step = 0; step < 16; step += 1) {
    await page.keyboard.press(step % 2 === 0 ? "ArrowRight" : "ArrowLeft");
    await page.waitForTimeout(60);
  }
  await page.reload();
  await expect(page.getByRole("status")).toHaveText(READY);
  await expect(project).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("complementary", { name: "Script: the left pane" }).getByRole("region", {
      name: "Project",
    }),
  ).toBeVisible();
});

test("a change of the view made as the page is left is kept: the page loaded again at once shows it", async ({
  page,
  press,
}) => {
  // The view state is written to the project a fifth of a second after a change, and a page
  // being left cannot be relied on to finish that writing. So as the page is left the view
  // state is noted in the browser's own record, written at once, and taken up at the next
  // opening (`src/app/left.ts`).
  await page.goto("/");
  await press(page.getByRole("button", { name: "New project…" }));
  await page.getByLabel("The name of the new project").fill("Left at once");
  await press(page.getByRole("button", { name: "Create" }));
  await expect(page.getByRole("status")).toHaveText(READY);
  const bar = page.getByRole("toolbar", { name: "Script: its panes and its controls" });
  const notes = bar.getByRole("button", { name: "Notes", exact: true });
  const project = bar.getByRole("button", { name: "Project", exact: true });
  await expect(notes).toHaveAttribute("aria-pressed", "true");
  // Closed, and the page loaded again in the same breath: closed.
  await press(notes);
  await page.reload();
  await expect(page.getByRole("status")).toHaveText(READY);
  await expect(notes).toHaveAttribute("aria-pressed", "false");
  // Opened again with another pane, closed and opened in quick turns, the last of them as the
  // page is left: what stands is what the reader left, not a moment on the way.
  await press(project);
  await press(notes);
  await press(notes);
  await press(notes);
  await page.reload();
  await expect(page.getByRole("status")).toHaveText(READY);
  await expect(notes).toHaveAttribute("aria-pressed", "true");
  await expect(project).toHaveAttribute("aria-pressed", "true");
  // And it is written to the project itself, not left in the browser's record alone.
  await expect
    .poll(() =>
      page.evaluate(async () => {
        try {
          let folder = await navigator.storage.getDirectory();
          for (const part of ["projects", "left-at-once", ".zemp"]) {
            folder = await folder.getDirectoryHandle(part);
          }
          const text = await (await (await folder.getFileHandle("views.json")).getFile()).text();
          const script = (JSON.parse(text) as { panes: { script: Record<string, boolean> } }).panes
            .script;
          return `${script["notes"]} ${script["project"]}`;
        } catch {
          return "not written";
        }
      }),
    )
    .toBe("true true");
});

test("a start opens on the Script place, and Help then on Home with Topics closed; within a visit Help is as it was left", async ({
  page,
  press,
}) => {
  // Release 0.2.4, step 11 (open decision #220, item 8). Until 0.2.4 a project opened on the
  // place it was left on, and what was folded in Topics was kept with the project.
  await page.goto("/");
  await press(page.getByRole("button", { name: "New project…" }));
  await page.getByLabel("The name of the new project").fill("Topics kept");
  await press(page.getByRole("button", { name: "Create" }));
  await expect(page).toHaveURL(/#\/p\/topics-kept$/);
  await expect(page.getByRole("status")).toHaveText(READY);
  const places = page.getByRole("navigation", { name: "Places" });
  const on = (name: string) => places.getByRole("button", { name, exact: true });
  const topics = page
    .getByRole("complementary", { name: "Help: the left pane" })
    .getByRole("region", { name: "Topics" });
  const fold = (name: RegExp) =>
    topics.getByRole("heading", { level: 3 }).getByRole("button", { name });
  const family = topics.getByRole("button", { name: /Z01xx / });
  const title = page.getByTestId("help-title");

  // The first click on Help: Home, and every section of Topics closed.
  await press(on("Help"));
  await expect(page.getByTestId("help-counts")).toBeVisible();
  for (const name of [/Packages/, /Errors and warnings/, /Using Zemp Lite/]) {
    await expect(fold(name)).toHaveAttribute("aria-expanded", "false");
  }
  await expect(topics.getByRole("list")).toHaveCount(0);
  // The reader unfolds two sections and a family, and reads a page.
  await press(fold(/Packages/));
  await press(fold(/Errors and warnings/));
  await press(family);
  await expect(topics.getByRole("list", { name: "The codes of Z01xx" })).toBeVisible();
  await press(topics.getByRole("list", { name: "The codes of Z01xx" }).getByRole("button").first());
  await expect(title).toHaveText("Z0101");
  // Within the visit Help returns to the page being read, and Topics is as it was left.
  await press(on("Script"));
  await press(on("Help"));
  await expect(title).toHaveText("Z0101");
  await press(topics.getByRole("button", { name: "All topics" }));
  await expect(fold(/Packages/)).toHaveAttribute("aria-expanded", "true");
  await expect(family).toHaveAttribute("aria-expanded", "true");
  await expect(fold(/Using Zemp Lite/)).toHaveAttribute("aria-expanded", "false");
  await page.waitForTimeout(1500);

  // A start, with the project left on Help: the Script place; Help, clicked, is on Home with
  // every section closed again.
  await page.reload();
  await expect(page.getByRole("status")).toHaveText(READY);
  await expect(on("Script")).toHaveAttribute("aria-current", "page");
  await expect.poll(() => scriptText(page)).toBe("// Topics kept\n");
  await press(on("Help"));
  await expect(page.getByTestId("help-counts")).toBeVisible();
  await expect(title).toHaveCount(0);
  for (const name of [/Packages/, /Errors and warnings/, /Using Zemp Lite/]) {
    await expect(fold(name)).toHaveAttribute("aria-expanded", "false");
  }
  await expect(topics.getByRole("list")).toHaveCount(0);
  // The family the reader had unfolded is folded again inside its section.
  await press(fold(/Errors and warnings/));
  await expect(family).toHaveAttribute("aria-expanded", "false");

  // Left on Data, it opens on Script too.
  await press(on("Data"));
  await expect(on("Data")).toHaveAttribute("aria-current", "page");
  await page.waitForTimeout(1500);
  await page.reload();
  await expect(page.getByRole("status")).toHaveText(READY);
  await expect(on("Script")).toHaveAttribute("aria-current", "page");

  // The project as Zemp Lite 0.2.2 left it, on Help, the left pane of Help called Outline and
  // closed: it opens on Script, and Help has its left pane closed, as the reader had it.
  await press(page.getByTitle("Back to the projects of this browser"));
  await expect(page).toHaveURL(/\/#?$/);
  await page.waitForTimeout(1000);
  await page.evaluate(async () => {
    let folder = await navigator.storage.getDirectory();
    for (const part of ["projects", "topics-kept", ".zemp"]) {
      folder = await folder.getDirectoryHandle(part);
    }
    const file = await (
      await folder.getFileHandle("views.json", { create: true })
    ).createWritable();
    await file.write(
      JSON.stringify({
        version: 3,
        panes: { help: { outline: false, related: true } },
        tabs: ["file:scripts/main.zeff", "view:help"],
        active: "view:help",
      }),
    );
    await file.close();
  });
  await press(page.getByRole("button", { name: /^Topics kept in this browser/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await expect(on("Script")).toHaveAttribute("aria-current", "page");
  await press(on("Help"));
  const link = page
    .getByRole("toolbar", { name: "Help: its panes and its controls" })
    .getByRole("button", { name: "Topics", exact: true });
  await expect(link).toHaveAttribute("aria-pressed", "false");
  await expect(topics).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "On this page" })).toBeVisible();
  // Opened by its link, its sections are closed, as on any first opening of Help.
  await press(link);
  await expect(fold(/Packages/)).toHaveAttribute("aria-expanded", "false");
});

test("a project made while the app stood at /app/ is opened by the address it had there", async ({
  page,
  press,
}) => {
  // Release 0.2.5, step 2 (open decision #225, item 2). The browser's private file system is
  // the origin's, so a project made in 0.2.4 at `/app/` is the same project at the root; and
  // `/app/`, given a project after its `#` as addresses were written in 0.2.4, goes on to it.
  await page.goto("/");
  await press(page.getByRole("button", { name: "New project…" }));
  await page.getByLabel("The name of the new project").fill("Kept from before");
  await press(page.getByRole("button", { name: "Create" }));
  await expect(page).toHaveURL(/\/#\/p\/kept-from-before$/);
  await expect.poll(() => scriptText(page)).toBe("// Kept from before\n");
  await write(page, '// Kept from before\nprint("still here")\n');
  await expect(page.getByText("saving")).toHaveCount(0);

  await page.goto("about:blank");
  await page.goto("/app/#/p/kept-from-before");
  await expect(page).toHaveURL(/\/#\/p\/kept-from-before$/);
  expect(new URL(page.url()).pathname).toBe("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kept from before");
  await expect.poll(() => scriptText(page)).toBe('// Kept from before\nprint("still here")\n');
  // Back leaves the app: the address of `/app/` was replaced, not left behind to go on again.
  await page.goBack();
  expect(page.url()).toBe("about:blank");
});

// The Paper place (release 0.3, step 12). It is held here and not in `paper.spec.ts`, because
// in WebKit every test that keeps a profile shares one storage, and they run one after another
// in this file alone.
test("a paper is saved as it is typed and found again: after Close, and after the page is loaded again, with the place's panes", async ({
  page,
  press,
}) => {
  const places = page.getByRole("navigation", { name: "Places" });
  const bar = page.getByRole("toolbar", { name: "Paper: its panes and its controls" });
  const project = page
    .getByRole("complementary", { name: "Paper: the left pane" })
    .getByRole("region", { name: "Project" });
  const none = page.getByRole("region", { name: "No paper is open" });
  const source = page.getByRole("textbox", { name: "The paper's source" });
  const thePage = page.getByRole("region", { name: "The page" });
  const sourceText = async () =>
    (
      await source.locator(".cm-line").evaluateAll((lines) => lines.map((line) => line.textContent))
    ).join("\n");
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await press(places.getByRole("button", { name: "Paper" }));
  await press(bar.getByRole("button", { name: "New paper…" }));
  await page.getByRole("textbox", { name: "The new paper's name" }).press("Enter");
  await expect(page.getByTestId("paper-path")).toHaveText("paper/paper.typ");
  await source.focus();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.insertText("The mean wage was 27.37.\n");
  await expect(page.locator("header .file")).toHaveText("/ paper.typ · saved");
  // Closed, the paper is listed among the papers of the project, and opens as it was left.
  await press(bar.getByRole("button", { name: "Close", exact: true }));
  await expect(none).toContainText("The papers of this project");
  await expect(page.locator("header .file")).toHaveCount(0);
  await press(none.getByRole("button", { name: "paper/paper.typ" }));
  await expect.poll(sourceText).toContain("The mean wage was 27.37.");
  // The panes as the reader leaves them, and the size of the page: Project open, the page
  // a size larger and then closed.
  await press(bar.getByRole("button", { name: "Project", exact: true }));
  await expect(page.getByTestId("paper-typst")).toHaveText(/set in \d+ ms$/, { timeout: 60_000 });
  await press(thePage.getByRole("button", { name: "Larger page" }));
  const size = await page.getByTestId("paper-size").textContent();
  await press(bar.getByRole("button", { name: "Page", exact: true }));
  await expect(thePage).toHaveCount(0);
  await expect(project).toBeVisible();

  // The page loaded again: a start opens on the script, and Paper is as it was left.
  await page.reload();
  await expect(page.getByRole("status")).toHaveText(READY);
  await expect(places.getByRole("button", { name: "Script" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await press(places.getByRole("button", { name: "Paper" }));
  await expect(page.getByTestId("paper-path")).toHaveText("paper/paper.typ");
  await expect.poll(sourceText).toContain("The mean wage was 27.37.");
  await expect(thePage).toHaveCount(0);
  await expect(project.getByRole("button", { name: /^paper\.typ/ })).toHaveClass(/\bon\b/);
  // The page's pane opened again: Typst is fetched for this visit, as for the first, and the
  // page is drawn at the size it was left at.
  await press(bar.getByRole("button", { name: "Page", exact: true }));
  await expect(page.getByTestId("paper-typst")).toHaveText(/set in \d+ ms$/, { timeout: 60_000 });
  await expect(page.getByTestId("paper-size")).toHaveText(size ?? "");
  await expect(thePage.getByRole("button", { name: "Fit width" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

// The stale mark (release 0.3, step 15b): which script wrote which file is kept with the
// project, so a table whose script changed is still said to be stale after the page is loaded
// again. (Held here for the reason given above the test of a paper found again.)
test("which script wrote a paper's table is kept with the project: its stale mark is there after the page is loaded again", async ({
  page,
  press,
}) => {
  test.slow();
  const places = page.getByRole("navigation", { name: "Places" });
  const bar = page.getByRole("toolbar", { name: "Paper: its panes and its controls" });
  const stale = page.getByTestId("paper-stale");
  const script = (terms: string) =>
    `let w = dataset(wages).where(year == 2019)\nlet m = w.reg(wage ~ ${terms}, se: robust)\nreport([m]).export("output/fit.typ")\n`;
  await page.goto("/");
  await press(page.getByRole("button", { name: /^Scratch project/ }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await write(page, script("educ"));
  await expect(page.getByText("saving")).toHaveCount(0);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done", { timeout: 30_000 });
  // A paper that sets the table; then the script changed, and not run.
  await press(places.getByRole("button", { name: "Paper" }));
  await press(bar.getByRole("button", { name: "New paper…" }));
  await page.getByRole("textbox", { name: "The new paper's name" }).press("Enter");
  await expect(page.getByTestId("paper-path")).toHaveText("paper/paper.typ");
  const source = page.getByRole("textbox", { name: "The paper's source" });
  await source.focus();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.insertText('#include "../output/fit.typ"\n');
  await expect(page.locator("header .file")).toHaveText("/ paper.typ · saved");
  await expect(page.getByTestId("paper-pages")).toHaveText("1 page", { timeout: 60_000 });
  await expect(stale).toHaveCount(0);
  await press(places.getByRole("button", { name: "Script" }));
  await write(page, script("educ + exper"));
  await expect(page.getByText("saving")).toHaveCount(0);

  // The page loaded again: Paper says the table is stale, though nothing has run in this visit.
  await page.reload();
  await expect(page.getByRole("status")).toHaveText(READY);
  await press(places.getByRole("button", { name: "Paper" }));
  await expect(stale).toHaveText(
    [
      "output/fit.typ is stale: scripts/main.zeff has changed since it wrote it. Press Run to write it again.",
    ],
    { timeout: 60_000 },
  );
  // Run, in Paper: the table is written again, and the mark is gone; and it stays gone.
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done", { timeout: 30_000 });
  await expect(stale).toHaveCount(0, { timeout: 30_000 });
  await page.reload();
  await expect(page.getByRole("status")).toHaveText(READY);
  await press(places.getByRole("button", { name: "Paper" }));
  await expect(page.getByTestId("paper-pages")).toHaveText("1 page", { timeout: 60_000 });
  await expect(stale).toHaveCount(0);
});
