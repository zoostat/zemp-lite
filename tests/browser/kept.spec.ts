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
  const listed = page.getByRole("button", { name: /Returns to schooling/ });
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

test("the layout of a window is kept with its project and comes back after a reload", async ({
  page,
  press,
}) => {
  await page.goto("/");
  await press(page.getByRole("button", { name: "Scratch project" }));
  await expect(page.getByRole("status")).toHaveText(READY);
  // A project opens in the margin editor; the layout chosen is kept with the rest.
  await press(page.getByRole("button", { name: "Panes", exact: true }));
  const left = page.getByRole("complementary");
  const edge = page.getByRole("separator", { name: "The width of the left panel" });
  await edge.focus();
  await page.keyboard.press("ArrowRight");
  await press(left.getByRole("button", { name: /zeff\.toml/ }));
  await press(left.getByRole("button", { name: "data", exact: true }));
  await press(left.getByRole("tab", { name: "Objects" }));
  const top = page.getByRole("separator", { name: "The height of the Output panel" });
  await top.focus();
  await page.keyboard.press("ArrowUp");
  await press(page.getByRole("button", { name: "Hide the output" }));
  // The view state is written a moment after the last change.
  await page.waitForTimeout(1500);

  await page.reload();
  await expect(page.getByRole("status")).toHaveText(READY);
  await expect(
    page.getByRole("separator", { name: "The width of the left panel" }),
  ).toHaveAttribute("aria-valuenow", "284");
  await expect(left.getByRole("tab", { name: "Objects" })).toHaveAttribute("aria-selected", "true");
  const tabs = page.getByRole("tablist", { name: "Open files" });
  await expect(tabs.getByRole("tab")).toHaveText(["main.zeff", "zeff.toml"]);
  await expect(tabs.getByRole("tab", { name: "zeff.toml" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("button", { name: "Show the output" })).toBeVisible();
  await press(page.getByRole("button", { name: "Show the output" }));
  await expect(
    page.getByRole("separator", { name: "The height of the Output panel" }),
  ).toHaveAttribute("aria-valuenow", "46");
  await press(left.getByRole("tab", { name: "Project" }));
  await expect(left.getByRole("button", { name: "data", exact: true })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  // The view state is the interface's own: it is in the project, and the engine is not given it.
  await press(tabs.getByRole("tab", { name: "main.zeff" }));
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
});

test("the layout chosen is kept with the project, and a new project opens in the margin editor", async ({
  page,
  press,
}) => {
  await page.goto("/");
  await press(page.getByRole("button", { name: "Scratch project" }));
  await expect(page.getByRole("status")).toHaveText(READY);
  const margin = page.getByRole("button", { name: "Margin", exact: true });
  const panes = page.getByRole("button", { name: "Panes", exact: true });
  await expect(margin).toHaveAttribute("aria-pressed", "true");
  await press(panes);
  await page.waitForTimeout(1500);
  await page.reload();
  await expect(panes).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("complementary")).toBeVisible();
  // The choice is this project's: another project opens in the margin editor.
  await press(page.getByRole("button", { name: "Projects" }));
  await press(page.getByRole("button", { name: "New project…" }));
  await page.getByLabel("The name of the new project").fill("Another");
  await press(page.getByRole("button", { name: "Create" }));
  await expect(margin).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("complementary")).toHaveCount(0);
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
  await press(page.getByRole("button", { name: "Panes", exact: true }));
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await press(page.getByRole("tab", { name: "Plots" }));
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
  // The Plots tab is the one shown; the run is made again for its plots.
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
