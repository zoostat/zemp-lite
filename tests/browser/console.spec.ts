// The console line's commands (release 0.2, step 15; the Zemp Specification, section 5):
// `:help`, `:vars` and `:save` as the released `zeff repl` has them, in its words, the
// console's statements standing for its session; `:clear`, the console's own; and ⌘↵ copying
// a line into the script at the cursor. What `zeff repl` printed and said for the same lines
// is kept in tests/scripts/repl/.
import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { editor, expect, scriptText, test, write, useExample } from "./support";

const file = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

const READY = "engine Zeff 0.8.0 ready";

async function scratch(page: Page, press: (target: ReturnType<Page["locator"]>) => Promise<void>) {
  await page.goto("/");
  await press(page.getByRole("button", { name: "Scratch project" }));
  await expect(page.getByRole("status")).toHaveText(READY);
  await useExample(page);
}

/** The lines `zeff repl` read, the statements and the commands, from a file kept beside its outputs. */
const typed = (name: string) => file(`tests/scripts/repl/${name}`).trimEnd().split("\n");

test(":vars and :save answer as zeff repl does, and :save writes the console's statements", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await write(page, "");
  await expect.poll(() => scriptText(page)).toBe("");
  const line = page.getByRole("textbox", { name: /^Console/ });
  const entries = page.getByRole("log", { name: "Console output" }).getByTestId("entry");
  const lines = typed("console.txt").filter((one) => one !== ":quit" && one !== ":clear");
  for (const one of lines) {
    await line.fill(one);
    await line.press("Enter");
    await expect(entries.last()).not.toHaveClass(/running/);
  }
  // A statement's value is marked as not in the script; a command is not.
  await expect(entries.nth(0)).toContainText("not in the script");
  await expect(entries.nth(4)).not.toContainText("not in the script");
  // :vars, after the four statements: what `zeff repl` printed.
  await expect(entries.nth(4).getByTestId("console-printed")).toHaveText(
    file("tests/scripts/repl/vars.stdout").trimEnd(),
  );
  // :save four times: what `zeff repl` said, line for line, after its opening line.
  const said = file("tests/scripts/repl/console.stderr").trimEnd().split("\n").slice(1, 5);
  for (let at = 0; at < 4; at++) {
    await expect(entries.nth(5 + at).locator(".told")).toHaveText(said[at]!);
  }
  // A folder that is not there, and a path that leaves the project.
  for (const one of typed("paths.txt").slice(1, 3)) {
    await line.fill(one);
    await line.press("Enter");
  }
  const paths = file("tests/scripts/repl/paths.stderr").trimEnd().split("\n").slice(1);
  await expect(entries.nth(9).locator(".told")).toHaveText(paths[0]!);
  await expect(entries.nth(10).locator(".told")).toHaveText(paths.slice(1).join("\n"));
  // The file written is the console's statements, as `zeff repl` wrote its session.
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByRole("combobox", { name: "Type a command" }).fill("explore");
  await page.keyboard.press("Enter");
  await expect.poll(() => scriptText(page)).toBe(file("tests/scripts/repl/explore.zeff"));
});

test(":help lists the commands, and a command the console does not have is named", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  const line = page.getByRole("textbox", { name: /^Console/ });
  const entries = page.getByRole("log", { name: "Console output" }).getByTestId("entry");
  await line.fill(":help");
  await line.press("Enter");
  for (const command of [":vars", ":save <path>", ":clear", ":help <name>"]) {
    await expect(entries.last().getByTestId("console-printed")).toContainText(command);
  }
  await line.fill(":undo");
  await line.press("Enter");
  await expect(entries.last().locator(".told")).toHaveText(
    "unknown console command `:undo`; :help lists the commands",
  );
  // :clear empties the console and forgets its statements.
  await line.fill("let kept = 1");
  await line.press("Enter");
  await expect(entries.last()).not.toHaveClass(/running/);
  await line.fill(":clear");
  await line.press("Enter");
  await expect(page.getByRole("log", { name: "Console output" })).toHaveCount(0);
  await line.fill("print(kept)");
  await line.press("Enter");
  await expect(entries.last()).toHaveClass(/failed/);
});

test("⌘↵ copies the console line into the script at the cursor, an edit undo takes back", async ({
  page,
  press,
}) => {
  await scratch(page, press);
  await write(page, "let a = 6\n\nprint(a)\n");
  // The cursor on the blank second line.
  await editor(page).locator(".cm-line").nth(1).click();
  const line = page.getByRole("textbox", { name: /^Console/ });
  await line.fill("let b = a + 1");
  await line.press("ControlOrMeta+Enter");
  await expect.poll(() => scriptText(page)).toBe("let a = 6\nlet b = a + 1\nprint(a)\n");
  await expect(line).toHaveValue("");
  // On a line that holds a statement, it goes on a line of its own after it.
  await line.fill("print(b)");
  await line.press("ControlOrMeta+Enter");
  await expect.poll(() => scriptText(page)).toBe("let a = 6\nlet b = a + 1\nprint(b)\nprint(a)\n");
  // Undo in the script takes each back.
  await editor(page).press("ControlOrMeta+z");
  await expect.poll(() => scriptText(page)).toBe("let a = 6\nlet b = a + 1\nprint(a)\n");
  // ↑ recalls the line copied; a command is never copied.
  await line.focus();
  await page.keyboard.press("ArrowUp");
  await expect(line).toHaveValue("print(b)");
  await line.fill(":vars");
  await line.press("ControlOrMeta+Enter");
  await expect(line).toHaveValue(":vars");
  await expect.poll(() => scriptText(page)).toBe("let a = 6\nlet b = a + 1\nprint(a)\n");
});
