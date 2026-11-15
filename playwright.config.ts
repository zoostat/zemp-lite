import { defineConfig, devices } from "@playwright/test";

// The browser tests run against the built interface, in the two engines the editions meet:
// Chromium (the browsers, and WebView2 on Windows) and WebKit (Safari, and the web views of
// macOS and Linux; Zemp Specification, section 3).
const port = 4173;

export default defineConfig({
  testDir: "tests/browser",
  fullyParallel: true,
  forbidOnly: true,
  reporter: "list",
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
