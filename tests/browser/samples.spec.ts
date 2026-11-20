// The pre-release routine (testing handbook, section 2.4, item 3): sample projects of the
// released Zeff engine run through the interface itself, and what the Output panel shows held
// to what the Zeff repository expects `zeff run` to print for them. The samples are those of
// the engine's own source at the pinned commit, which cargo fetched to build the worker;
// `tools/check-samples.mjs` runs all nine through the worker alone.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, printed, saidAsWritten, test, write } from "./support";

const READY = "engine Zeff 0.8.0 ready";

/** The folder of the engine's sample projects. */
function samples(): string {
  const worker = fileURLToPath(new URL("../../worker", import.meta.url));
  const metadata = spawnSync("cargo", ["metadata", "--format-version", "1", "--locked"], {
    cwd: worker,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const packages = (
    JSON.parse(metadata.stdout) as { packages: { name: string; manifest_path: string }[] }
  ).packages;
  const crate = packages.find((one) => one.name === "zeff-web");
  if (crate === undefined) throw new Error("the engine's source was not found");
  return path.resolve(crate.manifest_path, "..", "..", "..", "samples");
}

// Three projects that need no file of their own: they run on the data shipped with the engine.
for (const name of ["regression", "simulation", "plots"]) {
  test(`the sample project "${name}" of Zeff 0.8.0 reads in the prototype as \`zeff run\` prints it`, async ({
    page,
    press,
  }) => {
    test.setTimeout(120_000);
    const folder = path.join(samples(), name);
    const read = (file: string) => readFileSync(path.join(folder, file), "utf8");
    await page.goto("/");
    await press(page.getByRole("button", { name: "Scratch project" }));
    await expect(page.getByRole("status")).toHaveText(READY);
    await press(page.getByRole("button", { name: "Panes", exact: true }));
    await write(page, read("scripts/main.zeff"));
    await expect(page.locator("header.top")).toContainText("· saved");
    await press(page.getByRole("button", { name: "Run", exact: true }));
    await expect(page.getByRole("status")).toHaveText("done", { timeout: 60_000 });
    expect(await printed(page)).toBe(read("expected/stdout.txt"));
    expect(await saidAsWritten(page)).toBe(read("expected/stderr.txt"));
    // A plot of the sample is drawn under its statement, by the engine.
    if (name === "plots") {
      await expect(page.locator('[data-testid="figure"] img').first()).toBeVisible({
        timeout: 30_000,
      });
    }
  });
}

test("the specification's sample script, written for Zeff 1.0, is refused as `zeff run` 0.8.0 refuses it", async ({
  page,
  press,
}) => {
  const file = (name: string) => readFileSync(new URL(`../../${name}`, import.meta.url), "utf8");
  await page.goto("/");
  await press(page.getByRole("button", { name: "Scratch project" }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await press(page.getByRole("button", { name: "Panes", exact: true }));
  await write(page, file("docs/spec/zeff_samples.zeff"));
  await expect(page.locator("header.top")).toContainText("· saved");
  await press(page.getByRole("button", { name: "Run", exact: true }));
  await expect(page.getByRole("status")).toHaveText("ended with exit code 1");
  // Nothing runs, and the engine's finding stands under the line it names, in its words.
  expect(await printed(page)).toBe("");
  expect(await saidAsWritten(page)).toBe(file("tests/scripts/specification-sample.stderr"));
});
