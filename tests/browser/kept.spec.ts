// Projects that are kept: made, closed, and found again. In WebKit these tests have a browser
// profile on disk, whose private file system is one place shared by every test (see
// `support.ts`), so they run one after another and nowhere else is that storage used.
import { expect, test } from "./support";

test.use({ keptProfile: true });
test.describe.configure({ mode: "serial" });

const READY = "engine Zeff 0.7.0 ready";

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
  const script = page.getByLabel("The script");
  await expect(script).toHaveValue("// Returns to schooling\n");
  await script.fill('// Returns to schooling\nprint("kept")\n');
  await expect(page.getByText("saving")).toHaveCount(0);

  // The reload comes back to the same project, its script as it was left.
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Returns to schooling");
  await expect(page.getByLabel("The script")).toHaveValue(
    '// Returns to schooling\nprint("kept")\n',
  );
  await expect(page.getByRole("status")).toHaveText(READY);
  await press(page.getByRole("button", { name: "Run" }));
  await expect(page.getByTestId("output")).toHaveText("kept\n");

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
  await expect(page.getByLabel("The script")).toHaveValue(
    '// Returns to schooling\nprint("kept")\n',
  );
});

test("the Scratch project keeps what the user wrote in it", async ({ page, press }) => {
  await page.goto("/");
  await press(page.getByRole("button", { name: "Scratch project" }));
  const script = page.getByLabel("The script");
  await expect(script).toHaveValue(/^\/\/ A first look at the wages/);
  await script.fill("print(1)\n");
  await expect(page.getByText("saving")).toHaveCount(0);
  await press(page.getByRole("button", { name: "Projects" }));
  await press(page.getByRole("button", { name: "Scratch project" }));
  await expect(page.getByLabel("The script")).toHaveValue("print(1)\n");
});
