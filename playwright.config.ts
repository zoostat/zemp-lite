import { defineConfig, devices } from "@playwright/test";

// The browser tests run against the built interface, in the two engines the editions meet:
// Chromium (the browsers, and WebView2 on Windows) and WebKit (Safari, and the web views of
// macOS and Linux; Zemp Specification, section 3).
// The tests serve the build on a port of their own, so that a preview the owner keeps open on
// Vite's usual port (4173, `npm run preview`) never stops the routine.
const port = 4174;

export default defineConfig({
  testDir: "tests/browser",
  fullyParallel: true,
  forbidOnly: true,
  reporter: "list",
  // A kept text is the same in every browser and on every machine.
  snapshotPathTemplate: "{testDir}/snapshots/{arg}{ext}",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
  },
});
