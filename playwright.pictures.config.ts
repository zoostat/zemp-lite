import { defineConfig, devices } from "@playwright/test";

// The pictures of the app's own pages, Using Zemp Lite (release 0.2.3, step 8b): made from the
// running app, not taken by hand, so that a release can make them afresh and none goes stale.
// `npm run pictures` builds the interface, serves it as the browser tests do, and runs
// `tools/pictures/`, which brings the app to each picture's scene in Chromium and writes the
// picture into `src/using/pictures/`. It is no part of the routine: a picture is made again
// when the screen it shows has changed, and committed.
const port = 4175;

export default defineConfig({
  testDir: "tools/pictures",
  // One after another: each picture is of one window, alone on the machine.
  workers: 1,
  forbidOnly: true,
  reporter: "list",
  use: { baseURL: `http://127.0.0.1:${port}` },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
  },
});
