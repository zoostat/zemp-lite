import { defineConfig, devices } from "@playwright/test";

// The check made after each deployment (release 0.2, step 17), against the address the alpha
// is served from (`ZEMP_ADDRESS`, as https://lite.zeff-lang.dev): the page is isolated, the
// engine starts, and its first start is measured, in the two engines the editions meet.
const address = process.env["ZEMP_ADDRESS"];
if (address === undefined || address === "") {
  throw new Error("ZEMP_ADDRESS names no address: set it to the address of the deployment");
}

export default defineConfig({
  testDir: "tests/host",
  forbidOnly: true,
  reporter: "list",
  retries: 1,
  use: { baseURL: address },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
