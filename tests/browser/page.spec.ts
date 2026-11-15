import { expect, test } from "@playwright/test";

test("the page opens and names the release and its engine", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Zemp Lite 0.1");
  await expect(page.getByRole("main")).toContainText("Zeff 0.7.0");
  expect(errors).toEqual([]);
});
