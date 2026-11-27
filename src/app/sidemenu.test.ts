import { describe, expect, it } from "vitest";
import { KEYED, holds, keyOf, placeOfKey, type Held, type Pressed } from "./sidemenu";

const pressed = (key: string, with_: Partial<Pressed> = {}): Pressed => ({
  key,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...with_,
});

describe("the keys of the places", () => {
  it("are ⌘1 to ⌘5, in the order of the menu: Script, Data, Plots, Paper, Help", () => {
    expect(KEYED).toEqual(["script", "data", "plots", "paper", "help"]);
    expect("12345".split("").map((key) => placeOfKey(pressed(key, { metaKey: true })))).toEqual([
      "script",
      "data",
      "plots",
      "paper",
      "help",
    ]);
  });

  it("are Ctrl with the same figures on Windows and Linux", () => {
    expect(placeOfKey(pressed("3", { ctrlKey: true }))).toBe("plots");
  });

  it("are no other key: a figure alone, another figure, or one with Shift or Alt held", () => {
    expect(placeOfKey(pressed("1"))).toBeNull();
    expect(placeOfKey(pressed("6", { metaKey: true }))).toBeNull();
    expect(placeOfKey(pressed("0", { metaKey: true }))).toBeNull();
    expect(placeOfKey(pressed("1", { metaKey: true, shiftKey: true }))).toBeNull();
    expect(placeOfKey(pressed("1", { ctrlKey: true, altKey: true }))).toBeNull();
    expect(placeOfKey(pressed("k", { metaKey: true }))).toBeNull();
    expect(placeOfKey(pressed("Enter", { metaKey: true }))).toBeNull();
  });

  it("are written as this computer writes them", () => {
    expect(keyOf("script", true)).toBe("⌘1");
    expect(keyOf("help", true)).toBe("⌘5");
    expect(keyOf("paper", false)).toBe("Ctrl 4");
  });
});

describe("what each place holds, said under its name", () => {
  const held: Held = {
    script: "scripts/main.zeff",
    frames: 2,
    plots: 1,
    ran: true,
    paper: "paper/paper.typ",
    papers: 1,
  };

  it("is the script shown, the frames and plots of the run, the paper open", () => {
    expect(holds(held)).toEqual({
      script: "main.zeff",
      data: "2 frames of the run",
      plots: "1 plot of the run",
      paper: "paper.typ",
      help: "functions, messages, Zemp Lite",
    });
  });

  it("says so before a run, with no paper open, and with none in the project", () => {
    const before = holds({ ...held, ran: false, frames: 0, plots: 0, paper: null, papers: 2 });
    expect(before.data).toBe("the frames of a run");
    expect(before.plots).toBe("the plots of a run");
    expect(before.paper).toBe("2 papers");
    expect(holds({ ...held, paper: null, papers: 0 }).paper).toBe("no paper yet");
    expect(holds({ ...held, paper: null, papers: 1 }).paper).toBe("1 paper");
    expect(holds({ ...held, script: null }).script).toBe("the project's scripts");
    expect(holds({ ...held, frames: 1, plots: 0 }).data).toBe("1 frame of the run");
    expect(holds({ ...held, frames: 1, plots: 0 }).plots).toBe("0 plots of the run");
  });
});
