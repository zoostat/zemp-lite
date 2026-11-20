// Projects that are kept: made, closed, and found again. In WebKit these tests have a browser
// profile on disk, whose private file system is one place shared by every test (see
// `support.ts`), so they run one after another and nowhere else is that storage used.
import { expect, printed, scriptText, test, write } from "./support";

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
  await expect.poll(() => scriptText(page)).toMatch(/^\/\/ A first look at the wages/);
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
  await page.waitForTimeout(500);

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
  await page.waitForTimeout(500);
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
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await press(page.locator('[data-testid="note"][data-line="8"]'));
  await expect(page.locator(".cm-zemp-output")).toHaveCount(1);
  await page.waitForTimeout(500);
  await page.reload();
  await expect(page.getByRole("status")).toHaveText(READY);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  // The summary's output is unfolded again, and only it.
  await expect(page.locator(".cm-zemp-output")).toHaveCount(1);
  await expect(page.locator('[data-testid="note"][data-line="8"]')).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await press(page.getByRole("button", { name: "Notes", exact: true }));
  await page.waitForTimeout(500);
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

test("the order of the strip, the plots pinned and the page chosen are kept with the project", async ({
  page,
  press,
}) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto("/");
  await press(page.getByRole("button", { name: "Scratch project" }));
  await expect(page.getByRole("status")).toHaveText(READY);
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
  await page.waitForTimeout(500);

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
