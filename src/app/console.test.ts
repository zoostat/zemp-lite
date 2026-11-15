import { describe, expect, it } from "vitest";
import type { RunEvent } from "../engine/messages";
import { History, composed, consoleRun, outcomeOf } from "./console";

describe("a statement typed in the console", () => {
  it("is run after the script and the statements kept, the script itself unchanged", () => {
    expect(composed("let a = 6\n", [], "print(a * 7)")).toEqual({
      text: "let a = 6\nprint(a * 7)\n",
      from: 2,
    });
    // A script that does not end with a line break, and one that ends with several.
    expect(composed("let a = 6", ["let b = a + 1"], "b")).toEqual({
      text: "let a = 6\nlet b = a + 1\nb\n",
      from: 3,
    });
    expect(composed("let a = 6\n\n\n", [], "a").from).toBe(2);
    expect(composed("", [], "print(1)")).toEqual({ text: "print(1)\n", from: 1 });
    // A statement kept over two lines counts for two.
    expect(composed("x\n", ["f(\n  1)"], "y").from).toBe(4);
  });

  it("shows what it printed and said, and nothing of the script's", () => {
    const { run, hear, end } = consoleRun("scripts/main.zeff", "print(1)\nprint(2)\n");
    const events: RunEvent[] = [
      { type: "started", statement: 1, of: 2, line: 1 },
      { type: "output", stdout: "1\n", stderr: "warning[W0204]: of the script (line 1)\n" },
      { type: "finished", statement: 1, of: 2, line: 1, failed: false },
      { type: "started", statement: 2, of: 2, line: 2 },
      { type: "output", stdout: "2\n", stderr: "note: of the console (line 2)\n" },
      { type: "finished", statement: 2, of: 2, line: 2, failed: false },
    ];
    events.forEach(hear);
    end({ exitCode: 0, stdout: "", stderr: "", frames: [], stopped: false });
    const outcome = outcomeOf(run, 2);
    expect(outcome.state).toBe("done");
    expect(outcome.printed).toBe("2\n");
    expect(outcome.said.map((one) => one.sentence)).toEqual(["of the console"]);
  });

  it("shows why nothing came of it, where the script stopped before reaching it", () => {
    const { run, hear, end } = consoleRun("scripts/main.zeff", "bad()\nprint(2)\n");
    hear({
      type: "output",
      stdout: "",
      stderr: "error[Z0103]: no function is called `bad`\n --> scripts/main.zeff:1:1\n",
    });
    end({ exitCode: 1, stdout: "", stderr: "", frames: [], stopped: false });
    const outcome = outcomeOf(run, 2);
    expect(outcome.state).toBe("failed");
    expect(outcome.said.map((one) => one.code)).toEqual(["Z0103"]);
  });
});

describe("the console's history", () => {
  it("recalls what was typed, the newest first, and comes back to the line being typed", () => {
    const history = new History();
    history.add("first");
    history.add("second");
    expect(history.up("thi")).toBe("second");
    expect(history.up("second")).toBe("first");
    // There is nothing before the first.
    expect(history.up("first")).toBe("first");
    expect(history.down("first")).toBe("second");
    expect(history.down("second")).toBe("thi");
    expect(history.down("thi")).toBe("thi");
  });

  it("keeps a line entered twice running once, and no empty line", () => {
    const history = new History();
    history.add("same");
    history.add("same");
    history.add("   ");
    expect(history.up("")).toBe("same");
    expect(history.up("")).toBe("same");
  });

  it("recalls nothing where nothing was typed", () => {
    expect(new History().up("typing")).toBe("typing");
  });
});
