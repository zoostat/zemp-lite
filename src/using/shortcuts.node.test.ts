// The page of keyboard shortcuts, held to the shortcuts the app has (release 0.2.3, step 9b).
// Each key the page lists is a key some test of the browser presses and watches the app
// answer: the page's keys and the tests named here are held to each other, so that a key
// cannot be listed that the app does not answer, nor a test's key dropped from the page
// unnoticed. And every key the script's own editor is given (`Editor.svelte`) is on the page.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readUsing } from "./read";

const at = (path: string) => fileURLToPath(new URL(`../../${path}`, import.meta.url));
const text = (path: string) => readFileSync(at(path), "utf8");

/** Each key of the page, and the test of the browser that presses it: its file and its title. */
const HELD: Record<string, [string, string]> = {
  "⌘K": ["palette", "⌘K opens the palette, typing narrows it, the arrows choose, Escape closes"],
  "⌘1": [
    "frame",
    "⌘1 to ⌘5 open the places, from the script, from a field and from another place; and so does ⌘K",
  ],
  "⌘5": [
    "frame",
    "⌘1 to ⌘5 open the places, from the script, from a field and from another place; and so does ⌘K",
  ],
  "⌘↵": [
    "margin",
    "⌘↵ runs the statement at the cursor with what it needs, and leaves the rest as it was",
  ],
  "Ctrl `": [
    "palette",
    "the console recalls what was typed, grows into a drawer, shrinks with Escape, and is emptied",
  ],
  "⌘⇧↵": ["editor", "the script runs from the keyboard, with ⌘↵ and with ⌘⇧↵"],
  "⌥↵": ["margin", "⌥↵ unfolds and folds the output of the statement at the cursor"],
  F1: ["help", "F1 on a function's name opens the Help place at its page, every word the engine's"],
  "⇧F1": [
    "hover",
    "⇧F1 shows the card of the word the cursor is on, by the keyboard alone, and Escape or a move of the cursor takes it away",
  ],
  Tab: ["language", "Tab completes a statement in the console line, as if it followed the script"],
  Esc: ["palette", "⌘K opens the palette, typing narrows it, the arrows choose, Escape closes"],
  "↵": [
    "palette",
    "a statement typed in the console sees the script's bindings and leaves the script unchanged",
  ],
  "↑": [
    "palette",
    "the console recalls what was typed, grows into a drawer, shrinks with Escape, and is emptied",
  ],
  "↓": [
    "palette",
    "the console recalls what was typed, grows into a drawer, shrinks with Escape, and is emptied",
  ],
  "/": [
    "help-search",
    "the arrows move through the list, Enter opens the marked or the name as typed, Escape closes, and / goes to the field",
  ],
  "⌘[": [
    "help-history",
    "⌘[ and ⌘] go back and forward through Help, from the keyboard alone, and the app is never left",
  ],
  "⌘]": [
    "help-history",
    "⌘[ and ⌘] go back and forward through Help, from the keyboard alone, and the app is never left",
  ],
  "⌘C": ["data", "a range of cells is copied as the engine wrote them"],
  "⌥←": [
    "viewer",
    "the thumbnails are reordered with the keyboard, and by dragging one to another's place",
  ],
  "⌥→": [
    "viewer",
    "the thumbnails are reordered with the keyboard, and by dragging one to another's place",
  ],
};

/** The keys the page lists, each once, in its order. */
function keysOfThePage(): string[] {
  const doc = readUsing(text("src/using/pages/keyboard-shortcuts.md"));
  const pieces = doc.blocks.flatMap((block) =>
    block.kind === "paragraph" ? block.pieces : block.kind === "list" ? block.items.flat() : [],
  );
  return [...new Set(pieces.filter((piece) => piece.kind === "key").map((piece) => piece.text))];
}

/** A key as the editor is given it (`Shift-Mod-Enter`), as the page writes it (`⌘⇧↵`). */
function written(key: string): string {
  const parts = key.split("-");
  const last = parts.pop() ?? "";
  const marks = [
    parts.includes("Mod") ? "⌘" : "",
    parts.includes("Alt") ? "⌥" : "",
    parts.includes("Shift") ? "⇧" : "",
  ].join("");
  return `${marks}${last === "Enter" ? "↵" : last}`;
}

describe("the page of keyboard shortcuts", () => {
  it("lists the keys the tests of the browser press, and no other", () => {
    expect(keysOfThePage().sort()).toEqual(Object.keys(HELD).sort());
  });

  it("names for each key a test there is, by its title", () => {
    for (const [key, [spec, title]] of Object.entries(HELD)) {
      const tests = text(`tests/browser/${spec}.spec.ts`);
      expect(tests.replace(/\s+/g, " ").includes(title), `${key}: ${spec} › ${title}`).toBe(true);
    }
  });

  it("has every key the script's editor is given", () => {
    const given = [...text("src/editor/Editor.svelte").matchAll(/key: "([^"]+)"/g)].map(
      (found) => found[1] ?? "",
    );
    // (Escape is every editor's key for taking a card away, and is on the page as Esc.)
    expect(given.filter((key) => key !== "Escape").sort()).toEqual([
      "Alt-Enter",
      "F1",
      "Mod-Enter",
      "Shift-F1",
      "Shift-Mod-Enter",
    ]);
    const keys = keysOfThePage();
    for (const key of given.filter((one) => one !== "Escape")) {
      expect(keys, key).toContain(written(key));
    }
    expect(written("Shift-F1")).toBe("⇧F1");
    expect(written("Shift-Mod-Enter")).toBe("⌘⇧↵");
    expect(written("Alt-Enter")).toBe("⌥↵");
  });
});
