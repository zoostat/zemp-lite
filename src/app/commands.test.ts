import { describe, expect, it } from "vitest";
import { matching, type Command } from "./commands";

const commands: Command[] = [
  "Run the script",
  "Code text: larger",
  "Code text: smaller",
  "Code text: default size",
  "Layout: Inline",
  "Layout: Panes",
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
    expect(names("pan")).toEqual(["Layout: Panes"]);
    expect(names("main")).toEqual(["Open file: scripts/main.zeff"]);
    expect(names("nothing like it")).toEqual([]);
  });
});
