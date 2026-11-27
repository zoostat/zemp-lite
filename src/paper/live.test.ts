import { describe, expect, it } from "vitest";
import { Live, ROUNDS, type Typesetter } from "./live";
import type { Setting } from "./messages";

const encode = (text: string) => new TextEncoder().encode(text);

/**
 * A stand-in for Typst, which reads a paper as lines: `#pagebreak()` begins a page, `#include
 * "x"` and `#image("x")` read a file beside the main one (a path from `/` is from the
 * project's top) and stop the setting at the first that is not held, as Typst does, and
 * `#nosuch()` is refused. It notes everything it is asked.
 */
class Stand implements Typesetter {
  readonly asked: string[] = [];
  readonly files = new Map<string, string>();
  main = "";
  #pages: string[] = [];
  /** A setting waits for this where it is set, so that a test can hold one back. */
  hold: Promise<void> = Promise.resolve();

  open(main: string): Promise<void> {
    this.asked.push(`open ${main}`);
    this.main = main;
    this.files.clear();
    return Promise.resolve();
  }
  today(): Promise<void> {
    this.asked.push("today");
    return Promise.resolve();
  }
  putText(path: string, text: string): Promise<void> {
    this.asked.push(`text ${path}`);
    this.files.set(path, text);
    return Promise.resolve();
  }
  putBytes(path: string, bytes: Uint8Array): Promise<void> {
    this.asked.push(`bytes ${path}`);
    this.files.set(path, new TextDecoder().decode(bytes));
    return Promise.resolve();
  }
  #path(named: string): string {
    if (named.startsWith("/")) return named.slice(1);
    const parts = this.main.split("/").slice(0, -1);
    for (const part of named.split("/")) {
      if (part === "..") parts.pop();
      else parts.push(part);
    }
    return parts.join("/");
  }
  async set(): Promise<Setting> {
    this.asked.push("set");
    await this.hold;
    const text = this.files.get(this.main) ?? "";
    const missing: string[] = [];
    const read = (source: string): string | null =>
      source
        .split("\n")
        .map((line): string | null => {
          const named = /^#(?:include |image\()"([^"]+)"/.exec(line)?.[1];
          if (named === undefined) return line;
          const path = this.#path(named);
          const held = this.files.get(path);
          if (held === undefined) {
            missing.push(path);
            return null;
          }
          return line.startsWith("#include") ? read(held) : `[${held}]`;
        })
        .reduce<string | null>(
          (all, line) => (all === null || line === null ? null : `${all}${line}\n`),
          "",
        );
    const whole = read(text);
    const refused = whole === null || whole.includes("#nosuch()");
    if (!refused) this.#pages = whole.split("#pagebreak()\n");
    return {
      ok: !refused,
      pages: this.#pages.map((): [number, number] => [595, 842]),
      marks: this.#pages.map((page) => `mark:${page}`),
      said: refused
        ? [
            {
              severity: "error",
              message: missing[0] === undefined ? "unknown variable: nosuch" : "file not found",
              hints: [],
              file: this.main,
              line: 1,
              column: 1,
              end_line: 1,
              end_column: 2,
              from: 0,
              to: 1,
            },
          ]
        : [],
      // Typst stops at the first file it lacks.
      missing: missing.slice(0, 1),
    };
  }
  page(index: number): Promise<string> {
    this.asked.push(`page ${index}`);
    const page = this.#pages[index];
    return Promise.resolve(page === undefined ? "" : `<svg>${page}</svg>`);
  }
}

const MAIN = "paper/paper.typ";

/** A project of these files, which notes each path it is asked for. */
function project(files: Record<string, string>) {
  const asked: string[] = [];
  return {
    asked,
    files,
    read: (path: string) => {
      asked.push(path);
      const text = files[path];
      return Promise.resolve(text === undefined ? null : encode(text));
    },
  };
}

/** A clock that goes on by ten milliseconds each time it is read. */
function clock(): () => number {
  let at = 0;
  return () => (at += 10);
}

describe("a paper set as it is typed", () => {
  it("is opened in the module once, with the day, and set from its text", async () => {
    const module = new Stand();
    const live = new Live(module, project({}).read, MAIN, clock());
    const first = await live.set("One page.\n");
    expect(first).toEqual({
      text: "One page.\n",
      ok: true,
      pages: [{ width: 595, height: 842, mark: "mark:One page.\n\n" }],
      said: [],
      absent: [],
      ms: 10,
    });
    await live.set("One page.\n#pagebreak()\nAnother.\n");
    expect(module.asked).toEqual([
      "open paper/paper.typ",
      "today",
      "text paper/paper.typ",
      "set",
      "text paper/paper.typ",
      "set",
    ]);
  });

  it("gives the files the paper reads from the project as Typst asks for them, a source as text and a figure as bytes", async () => {
    const module = new Stand();
    const files = project({
      "paper/tables/fit.typ": 'educ 0.08\n#image("/output/inner.svg")',
      "output/figure.svg": "<svg/>",
      "output/inner.svg": "<svg inner/>",
    });
    const live = new Live(module, files.read, MAIN, clock());
    const set = await live.set('#include "tables/fit.typ"\n#image("../output/figure.svg")\n');
    expect(set.ok).toBe(true);
    expect(set.absent).toEqual([]);
    // Each was asked of the project once, in the order Typst met them.
    expect(files.asked).toEqual(["paper/tables/fit.typ", "output/inner.svg", "output/figure.svg"]);
    expect(module.asked.filter((one) => !one.startsWith("open") && one !== "today")).toEqual([
      "text paper/paper.typ",
      "set",
      "text paper/tables/fit.typ",
      "set",
      "bytes output/inner.svg",
      "set",
      "bytes output/figure.svg",
      "set",
    ]);
    expect(live.given).toEqual(["output/figure.svg", "output/inner.svg", "paper/tables/fit.typ"]);
    // The time is Typst's alone: four settings of ten milliseconds.
    expect(set.ms).toBe(40);
    // Set again, the paper holds its files: the project is not asked a second time.
    await live.set('#include "tables/fit.typ"\n#image("../output/figure.svg")\nMore.\n');
    expect(files.asked).toHaveLength(3);
  });

  it("names a file the project does not hold, leaves Typst's words of it, and finds it once it is there", async () => {
    const module = new Stand();
    const files = project({});
    const live = new Live(module, files.read, MAIN, clock());
    const text = 'Before.\n#image("../output/wages.svg")\n';
    const lacking = await live.set(text);
    expect(lacking.ok).toBe(false);
    expect(lacking.absent).toEqual(["output/wages.svg"]);
    expect(lacking.said.map((one) => one.message)).toEqual(["file not found"]);
    expect(lacking.pages).toEqual([]);
    // It was looked for once in that setting, and the paper set once.
    expect(files.asked).toEqual(["output/wages.svg"]);
    expect(module.asked.filter((one) => one === "set")).toHaveLength(1);
    // A run has written it since: the next setting finds it.
    files.files["output/wages.svg"] = "<svg/>";
    const found = await live.set(text);
    expect(found.ok).toBe(true);
    expect(found.absent).toEqual([]);
    expect(files.asked).toEqual(["output/wages.svg", "output/wages.svg"]);
  });

  it("keeps the pages of the text that last set where Typst refuses the text as it stands", async () => {
    const module = new Stand();
    const live = new Live(module, project({}).read, MAIN, clock());
    const set = await live.set("A page.\n");
    const refused = await live.set("A page.\n#nosuch()\n");
    expect(refused.ok).toBe(false);
    expect(refused.text).toBe("A page.\n#nosuch()\n");
    expect(refused.pages).toEqual(set.pages);
    expect(refused.said[0]?.message).toBe("unknown variable: nosuch");
    expect(await live.drawn(refused.pages, 0)).toBe("<svg>A page.\n\n</svg>");
  });

  it("asks the module for a page once for a mark, and again only for a page that changed", async () => {
    const module = new Stand();
    const live = new Live(module, project({}).read, MAIN, clock());
    const pages = (await live.set("One.\n#pagebreak()\nTwo.\n#pagebreak()\nThree.\n")).pages;
    expect(await live.drawn(pages, 1)).toBe("<svg>Two.\n</svg>");
    expect(await live.drawn(pages, 1)).toBe("<svg>Two.\n</svg>");
    expect(await live.drawn(pages, 5)).toBe(null);
    expect(module.asked.filter((one) => one.startsWith("page"))).toEqual(["page 1"]);
    // The second page changes: the first, asked for now, and the third are not that page.
    const changed = (await live.set("One.\n#pagebreak()\nTwo, changed.\n#pagebreak()\nThree.\n"))
      .pages;
    expect(changed[0]?.mark).toBe(pages[0]?.mark);
    expect(changed[1]?.mark).not.toBe(pages[1]?.mark);
    expect(await live.drawn(changed, 1)).toBe("<svg>Two, changed.\n</svg>");
    expect(await live.drawn(changed, 0)).toBe("<svg>One.\n</svg>");
    expect(await live.drawn(changed, 0)).toBe("<svg>One.\n</svg>");
    expect(module.asked.filter((one) => one.startsWith("page"))).toEqual([
      "page 1",
      "page 1",
      "page 0",
    ]);
    // A page moved to another place by one put before it is the page held, not asked for again.
    const moved = (
      await live.set(
        "New.\n#pagebreak()\nOne.\n#pagebreak()\nTwo, changed.\n#pagebreak()\nThree.\n",
      )
    ).pages;
    expect(await live.drawn(moved, 2)).toBe("<svg>Two, changed.\n</svg>");
    expect(module.asked.filter((one) => one.startsWith("page"))).toHaveLength(3);
  });

  it("never gives the page of a later setting as the page of an earlier one", async () => {
    const module = new Stand();
    const live = new Live(module, project({}).read, MAIN, clock());
    const first = (await live.set("One.\n")).pages;
    // A second setting is asked for, and then a page of the first, which waits its turn.
    const second = live.set("Another.\n");
    const page = live.drawn(first, 0);
    expect(await page).toBe(null);
    expect(await live.drawn((await second).pages, 0)).toBe("<svg>Another.\n\n</svg>");
  });

  it("makes its settings one at a time, in the order asked, whatever became of the one before", async () => {
    const module = new Stand();
    const live = new Live(module, project({}).read, MAIN, clock());
    let release: () => void = () => {};
    module.hold = new Promise<void>((resolve) => (release = resolve));
    const one = live.set("One.\n");
    const two = live.set("Two.\n");
    await Promise.resolve();
    expect(module.asked.filter((asked) => asked === "set")).toHaveLength(0);
    release();
    expect((await one).text).toBe("One.\n");
    expect((await two).text).toBe("Two.\n");
    expect(module.asked.filter((asked) => asked === "set")).toHaveLength(2);
    // A setting that fails does not stop the next.
    module.set = () => Promise.reject(new Error("the worker failed"));
    await expect(live.set("Three.\n")).rejects.toThrow("the worker failed");
    delete (module as { set?: unknown }).set;
    expect((await live.set("Four.\n")).ok).toBe(true);
  });

  it("stops asking where a paper's files never end", async () => {
    const module = new Stand();
    // Every file names another that the project holds.
    const files = {
      asked: 0,
      read: (path: string) => {
        files.asked += 1;
        const count = Number(/(\d+)/.exec(path)?.[1] ?? 0);
        return Promise.resolve(encode(`#include "/chain/${count + 1}.typ"`));
      },
    };
    const live = new Live(module, files.read, MAIN, clock());
    const set = await live.set('#include "/chain/1.typ"\n');
    expect(set.ok).toBe(false);
    expect(files.asked).toBe(ROUNDS);
    expect(set.absent).toHaveLength(1);
  });
});
