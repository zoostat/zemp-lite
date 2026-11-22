import { describe, expect, it } from "vitest";
import { matching, type Command } from "./commands";

const commands: Command[] = [
  "Run the script",
  "Code text: larger",
  "Code text: smaller",
  "Code text: default size",
  "Script: show Project",
  "Script: hide Notes",
  "Open file: scripts/main.zeff",
].map((name) => ({ name, run: () => undefined }));

const names = (typed: string) => matching(commands, typed).map((command) => command.name);

describe("the command palette", () => {
  it("lists every command while nothing is typed", () => {
    expect(names("")).toHaveLength(7);
    expect(names("   ")).toHaveLength(7);
  });

  it("lists the commands whose names hold every word typed, whatever the case and the order", () => {
    expect(names("code")).toEqual([
      "Code text: larger",
      "Code text: smaller",
      "Code text: default size",
    ]);
    expect(names("LARGER")).toEqual(["Code text: larger"]);
    expect(names("size default")).toEqual(["Code text: default size"]);
    expect(names("notes")).toEqual(["Script: hide Notes"]);
    expect(names("main")).toEqual(["Open file: scripts/main.zeff"]);
    expect(names("nothing like it")).toEqual([]);
  });

  it("lists first the commands that hold the words as they were typed, one after another", () => {
    const listed = ["Project: new script…", "Project: new folder…", "New project…"].map((name) => ({
      name,
      run: () => undefined,
    }));
    const found = (typed: string) => matching(listed, typed).map((command) => command.name);
    expect(found("new project")).toEqual([
      "New project…",
      "Project: new script…",
      "Project: new folder…",
    ]);
    expect(found("project new")).toEqual([
      "Project: new script…",
      "Project: new folder…",
      "New project…",
    ]);
    expect(found("NEW   script")).toEqual(["Project: new script…"]);
    // One word is no phrase: the commands keep their own order.
    expect(found("new")).toEqual(["Project: new script…", "Project: new folder…", "New project…"]);
  });
});
