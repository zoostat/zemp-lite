// The first visit (release 0.2, step 18): the Scratch project a visitor opens holds the
// returns to schooling on `wages`, the script the margin editor's design is drawn on, and
// the engine's own sample of 0.8.0 on instrumental variables (the owner's answer to question 7
// of the release); each prints what the released `zeff run` 0.8.0 prints for it, kept in
// `examples/scratch/expected/`.
import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { expect, printed, saidAsWritten, scriptText, test } from "./support";

const READY = "engine Zeff 0.8.0 ready";
const scratch = (file: string) =>
  readFileSync(new URL(`../../examples/scratch/${file}`, import.meta.url), "utf8");

async function opened(page: Page, press: (target: ReturnType<Page["locator"]>) => Promise<void>) {
  await page.goto("/");
  await press(page.getByRole("button", { name: "Scratch project" }));
  await expect(page.getByRole("status")).toHaveText(READY);
}

test("the Scratch project opens on the returns to schooling, and both its scripts print what `zeff run` prints", async ({
  page,
  press,
}) => {
  await opened(page, press);
  await expect.poll(() => scriptText(page)).toBe(scratch("scripts/main.zeff"));
  // In Panes, the Output panel holds the whole of what each run printed and said.
  await press(page.getByRole("button", { name: "Panes", exact: true }));
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await expect.poll(() => printed(page)).toBe(scratch("expected/main.stdout"));
  await expect.poll(() => saidAsWritten(page)).toBe(scratch("expected/main.stderr"));
  // The second script, opened from ⌘K and run.
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByRole("combobox", { name: "Type a command" }).fill("instruments");
  await page.keyboard.press("Enter");
  // (The editor draws the lines near its window, so a long script is known by its start.)
  await expect
    .poll(() => scriptText(page))
    .toMatch(/^\/\/ Instrumental variables, end to end, on the staff data/);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  await expect.poll(() => printed(page)).toBe(scratch("expected/instruments.stdout"));
  await expect.poll(() => saidAsWritten(page)).toBe(scratch("expected/instruments.stderr"));
});

test("each statement of the returns to schooling has its note beside it once it has run", async ({
  page,
  press,
}) => {
  await opened(page, press);
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("done");
  const note = (line: number) => page.locator(`[data-testid="note"][data-line="${line}"]`);
  for (const [line, words] of [
    [5, /^wages\s*Frame · [\d,]+ × 13/],
    [10, /^summary\s*Table · by female\s*W0201/],
    [11, /^shape\s*Plot/],
    [14, /^m1\s*RegFit/],
    [15, /^m2\s*RegFit/],
    [17, /^m3\s*RegFit/],
    // A statement that binds no name is noted by what the engine printed: the models' columns.
    [19, /\(1\)\s+\(2\)\s+\(3\)\s*Table/],
    [22, /^y2019\s*Frame · [\d,]+ × 13/],
    [23, /^schooling\s*Plot/],
  ] as const) {
    await expect(note(line)).toHaveText(words);
  }
});
