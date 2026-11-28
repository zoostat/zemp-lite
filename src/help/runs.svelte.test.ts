import { describe, expect, it } from "vitest";
import type { ExampleOutcome, StatementInfo } from "../engine/messages";
import { readPage } from "./read";
import {
  IN_CONSOLE,
  NOTHING_TO_TRY,
  NO_SCRIPT,
  PageRuns,
  exampleBlocks,
  examplesKey,
  type ExampleRuns,
  type Item,
  type Ran,
} from "./runs.svelte";

const PAGE = [
  "mean — The mean of a variable                                  stats · tier 1",
  "",
  "A COMMON MISTAKE",
  "    Giving an expression where the variable goes.",
  "",
  "    > dataset(wages).mean(log(wage))",
  "    error[Z0401]: `var` of `mean` takes a variable of the frame, not an expression",
  "",
  "EXAMPLES",
  "    // The mean of the wages.",
  "    > let wages = dataset(wages)",
  "    > wages.mean(wage)",
  "    27.3695",
  "",
  "    > wages.mean(union)",
  "    0.318053",
  "",
].join("\n");

const statement = (line: number, stdout: string, more: Partial<StatementInfo> = {}) =>
  ({ line, end: line, ran: true, stdout, stderr: "", error: null, ...more }) as StatementInfo;

/** A stand-in for the app: it keeps the scripts asked for, and answers each as a test says. */
class Stand implements ExampleRuns {
  seconds = 10;
  asked: string[] = [];
  dropped: string[] = [];
  copied: string[] = [];
  open = true;
  answer: (text: string) => ExampleOutcome | null = (text) => ({
    exitCode: 0,
    stdout: "",
    stderr: "",
    statements: text
      .trimEnd()
      .split("\n")
      .map((line, index) => statement(index + 1, line.startsWith("let ") ? "" : `<${line}>\n`)),
    plots: [],
    stopped: null,
  });

  run(_owner: string, text: string, _width: number, began?: () => void): Promise<Ran | null> {
    this.asked.push(text);
    began?.();
    const outcome = this.answer(text);
    return Promise.resolve(outcome === null ? null : { outcome, figures: {}, ms: 7 });
  }

  drop(owner: string): void {
    this.dropped.push(owner);
  }

  copy(text: string): Promise<boolean> {
    if (this.open) this.copied.push(text);
    return Promise.resolve(this.open);
  }

  tried: { before: string[]; last: string }[] = [];
  try(before: string[], last: string): void {
    this.tried.push({ before, last });
  }
}

const shown = (page: PageRuns) =>
  page.all.map((item) => [
    item.held.phase,
    item.held.parts.flatMap((part) => (part.kind === "text" ? part.lines : [])).join("|"),
  ]);

describe("the examples of a page, as the page holds them", () => {
  it("open with the page's kept text, and are run as the page opens: its EXAMPLES as one script, a call that stands apart after them", async () => {
    const stand = new Stand();
    const page = new PageRuns(readPage(PAGE), stand);
    expect(page.chain.map((item) => item.held.own)).toEqual([
      "let wages = dataset(wages)\nwages.mean(wage)",
      "wages.mean(union)",
    ]);
    expect(page.apart.map((item) => item.held.own)).toEqual(["dataset(wages).mean(log(wage))"]);
    expect(shown(page)).toEqual([
      ["kept", "27.3695"],
      ["kept", "0.318053"],
      ["kept", "error[Z0401]: `var` of `mean` takes a variable of the frame, not an expression"],
    ]);
    await page.open();
    expect(stand.asked).toEqual([
      "let wages = dataset(wages)\nwages.mean(wage)\nwages.mean(union)\n",
      "let wages = dataset(wages)\nwages.mean(wage)\nwages.mean(union)\ndataset(wages).mean(log(wage))\n",
    ]);
    expect(shown(page)).toEqual([
      ["ran", "<wages.mean(wage)>"],
      ["ran", "<wages.mean(union)>"],
      ["ran", "<dataset(wages).mean(log(wage))>"],
    ]);
  });

  it("run an example with those above it, as they stand, and leave those under it as they were", async () => {
    const stand = new Stand();
    const page = new PageRuns(readPage(PAGE), stand);
    const [first, second] = page.chain;
    first!.held = { ...first!.held, text: "let wages = dataset(wages)\nwages.mean(hours)" };
    await page.run(first!);
    expect(stand.asked).toEqual(["let wages = dataset(wages)\nwages.mean(hours)\n"]);
    expect(shown(page).slice(0, 2)).toEqual([
      ["ran", "<wages.mean(hours)>"],
      ["kept", "0.318053"],
    ]);
    // The second runs with the first as it now stands; Reset puts the page's own back and runs.
    await page.run(second!);
    expect(stand.asked.at(-1)).toBe(
      "let wages = dataset(wages)\nwages.mean(hours)\nwages.mean(union)\n",
    );
    await page.reset(first!);
    expect(first!.held.text).toBe(first!.held.own);
    expect(stand.asked.at(-1)).toBe("let wages = dataset(wages)\nwages.mean(wage)\n");
  });

  it("are found by the place of their block in the page, and are the same page's where it is read again to the same lines", () => {
    const doc = readPage(PAGE);
    const again = readPage(PAGE);
    const page = new PageRuns(doc, new Stand());
    expect(exampleBlocks(doc)).toHaveLength(2);
    // The blocks of the page read again are other objects, in the same places.
    expect(exampleBlocks(again)[0]).not.toBe(exampleBlocks(doc)[0]);
    expect(page.of(0).map((item) => item.held.own)).toEqual(["dataset(wages).mean(log(wage))"]);
    expect(page.of(1)).toHaveLength(2);
    expect(page.of(2)).toEqual([]);
    expect(examplesKey(again)).toBe(examplesKey(doc));
    expect(examplesKey(readPage(PAGE.replace("wages.mean(union)", "wages.mean(educ)")))).not.toBe(
      examplesKey(doc),
    );
  });

  it("are illustrations on a code's page: not run as it opens, and run when asked", async () => {
    const stand = new Stand();
    const page = new PageRuns(readPage(PAGE), stand, true);
    await page.open();
    expect(stand.asked).toEqual([]);
    await page.run(page.chain[0]!);
    expect(stand.asked).toHaveLength(1);
  });

  it("keep what they showed where they are dropped or the engine cannot be asked, and ask for nothing once the page is left", async () => {
    const stand = new Stand();
    const page = new PageRuns(readPage(PAGE), stand);
    stand.answer = () => null;
    await page.run(page.chain[0]!);
    expect(shown(page)[0]).toEqual(["kept", "27.3695"]);
    stand.run = () => Promise.reject(new Error("the engine's worker was ended"));
    await page.run(page.chain[0]!);
    expect(page.chain[0]!.held.phase).toBe("refused");
    expect(page.chain[0]!.held.problem).toBe("the engine's worker was ended");
    page.leave();
    expect(stand.dropped).toEqual([page.owner]);
    const asked = stand.asked.length;
    await page.open();
    expect(stand.asked).toHaveLength(asked);
  });

  it("copy an example's statements to the script as they stand, and say so where no script is open", async () => {
    const stand = new Stand();
    const page = new PageRuns(readPage(PAGE), stand);
    const first = page.chain[0]!;
    first.held = { ...first.held, text: "let wages = dataset(wages)\nwages.mean(hours)\n\n" };
    await page.copy(first);
    expect(stand.copied).toEqual(["let wages = dataset(wages)\nwages.mean(hours)"]);
    expect(first.note).toBe("");
    stand.open = false;
    await page.copy(first);
    expect(first.note).toBe(NO_SCRIPT);
    // The next thing done with it takes the words away.
    await page.run(first);
    expect(first.note).toBe("");
  });

  it("try an example in the console: its last statement, with the bindings above it and what stands before it", async () => {
    const stand = new Stand();
    const page = new PageRuns(readPage(PAGE), stand);
    const [first, second] = page.chain as [Item, Item];
    // The first example of the page: its binding goes before, its last statement to the field.
    page.try(first);
    expect(stand.tried).toEqual([
      { before: ["let wages = dataset(wages)"], last: "wages.mean(wage)" },
    ]);
    expect(first.note).toBe(IN_CONSOLE);
    // The second uses what the first bound; as the reader has changed them, both.
    first.held = { ...first.held, text: "let wages = dataset(sleep)\nwages.mean(wage)" };
    second.held = { ...second.held, text: "wages.mean(hours)\n" };
    page.try(second);
    expect(stand.tried[1]).toEqual({
      before: ["let wages = dataset(sleep)"],
      last: "wages.mean(hours)",
    });
    // One that stands apart from the page's EXAMPLES comes after all of them, as it is run.
    page.try(page.apart[0]!);
    expect(stand.tried[2]).toEqual({
      before: ["let wages = dataset(sleep)"],
      last: "dataset(wages).mean(log(wage))",
    });
    // Nothing is run in the page for it, and an example emptied says so.
    expect(stand.asked).toEqual([]);
    second.held = { ...second.held, text: "// nothing\n" };
    page.try(second);
    expect(second.note).toBe(NOTHING_TO_TRY);
    expect(stand.tried).toHaveLength(3);
    // The next thing done with it takes the words away.
    await page.run(second);
    expect(second.note).toBe("");
  });
});
