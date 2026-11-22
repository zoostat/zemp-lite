// Projects that are kept: made, closed, and found again. In WebKit these tests have a browser
// profile on disk, whose private file system is one place shared by every test (see
// `support.ts`), so they run one after another and nowhere else is that storage used.
import { cursorTo, expect, printed, scriptText, test, write, useExample } from "./support";

test.use({ keptProfile: true });
test.describe.configure({ mode: "serial" });

const READY = "engine Zeff 0.8.0 ready";

test("the welcome screen says that projects are kept on this computer", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Kept on this computer.")).toBeVisible();
  await expect(page.getByText("No project yet.")).toBeVisible();
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

  // Back on the welcome screen it is listed, opened today; and its name is taken.
  await press(page.getByRole("button", { name: "Projects" }));
  await expect(page).toHaveURL(/\/#?$/);
  const listed = page.getByRole("button", { name: /^Returns to schooling in this browser/ });
  await expect(listed).toContainText("in this browser · today,");
  await press(page.getByRole("button", { name: "New project…" }));
  await page.getByLabel("The name of the new project").fill("returns to schooling");
  await press(page.getByRole("button", { name: "Create" }));
  await expect(page.getByRole("alert")).toHaveText(
    'A project called "returns to schooling" is already here. Choose another name.',
  );
  await press(listed);
  await expect.poll(() => scriptText(page)).toBe('// Returns to schooling\nprint("kept")\n');
});

test("the Scratch project keeps what the user wrote in it", async ({ page, press }) => {
  await page.goto("/");
  await press(page.getByRole("button", { name: "Scratch project" }));
  await expect
    .poll(() => scriptText(page))
    .toMatch(/^\/\/ Returns to schooling, in the wages panel/);
  await write(page, "print(1)\n");
  await expect(page.getByText("saving")).toHaveCount(0);
  await press(page.getByRole("button", { name: "Projects" }));
  await press(page.getByRole("button", { name: "Scratch project" }));
  await expect.poll(() => scriptText(page)).toBe("print(1)\n");
});

test("the file shown and a folder folded in the Project pane are kept with the project, and come back after a reload", async ({
  page,
  press,
}) => {
  await page.goto("/");
  await press(page.getByRole("button", { name: "Scratch project" }));
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
  await press(page.getByRole("button", { name: "Scratch project" }));
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
  await press(page.getByRole("button", { name: "Scratch project" }));
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
  await press(page.getByRole("button", { name: "Scratch project" }));
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
  await press(page.getByRole("button", { name: "Scratch project" }));
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
  await press(page.getByRole("button", { name: "Scratch project" }));
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
  // The Plots place is the one shown; the run is made again for its plots.
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
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
