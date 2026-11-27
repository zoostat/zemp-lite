// The Paper module in the build (release 0.3, step 11b; open decision #172, option A): Typst
// as a WebAssembly module with a worker of its own and the fonts a paper is set in. The app's
// start fetches no byte of it; it is fetched when a paper is opened (the Paper place, step
// 12). Here the built worker itself is started in each browser and sets a page, so that the
// module is known to run in both before any screen is built on it.
import { readdirSync, readFileSync, statSync } from "node:fs";
import type { Request } from "@playwright/test";
import { expect, test, useExample } from "./support";

const READY = "engine Zeff 0.9.0 ready";
const assets = new URL("../../dist/assets/", import.meta.url);
/** The built files, read when a test runs: the build is made before the first of them. */
const built = () => readdirSync(assets);
const one = (named: RegExp) => {
  const found = built().filter((name) => named.test(name));
  expect(found, String(named)).toHaveLength(1);
  return found[0] as string;
};
/** Whether an address is of the Paper module: its WebAssembly, a font, or its worker's script. */
const ofPaper = (path: string, worker: string) =>
  /zemp_paper_bg|\.otf$|\.ttf$/.test(path) || path.endsWith(`/${worker}`);
/** The script of the paper's worker: the one of the build that names the module's WebAssembly. */
const paperWorker = () => {
  const found = built().filter(
    (name) =>
      /^worker-.*\.js$/.test(name) &&
      readFileSync(new URL(name, assets), "utf8").includes("zemp_paper_bg"),
  );
  expect(found).toHaveLength(1);
  return found[0] as string;
};

test("the build carries the module and its fonts, each with its packed file beside it", () => {
  const module = one(/^zemp_paper_bg-.*\.wasm$/);
  expect(built()).toContain(`${module}.br`);
  // Under the host's limit for one file (25 MiB), with room.
  expect(statSync(new URL(module, assets)).size).toBeLessThan(25 * 1024 * 1024);
  const fonts = built().filter((name) => /\.(otf|ttf)$/.test(name));
  // Each by its own name, the build's mark taken off it, in the order of those names.
  expect(fonts.map((name) => name.replace(/-[\w-]{8}\.(otf|ttf)$/, ".$1")).sort()).toEqual([
    "DejaVuSansMono-Bold.ttf",
    "DejaVuSansMono-BoldOblique.ttf",
    "DejaVuSansMono-Oblique.ttf",
    "DejaVuSansMono.ttf",
    "LibertinusMath-Regular.otf",
    "LibertinusSerif-Bold.otf",
    "LibertinusSerif-BoldItalic.otf",
    "LibertinusSerif-Italic.otf",
    "LibertinusSerif-Regular.otf",
  ]);
  for (const font of fonts) expect(built()).toContain(`${font}.br`);
  // The engine is the build's other WebAssembly file, and there is no third.
  expect(built().filter((name) => name.endsWith(".wasm"))).toHaveLength(2);
});

test.describe("a first visit", () => {
  test.use({ firstVisit: true });

  test("the app's start fetches no byte of the Paper module: not at the loading screen, in a project, at a run, or in Help", async ({
    page,
    press,
  }) => {
    const worker = paperWorker();
    const asked: string[] = [];
    page.on("request", (request: Request) => asked.push(new URL(request.url()).pathname));
    await page.goto("/");
    const open = page.getByRole("button", { name: "Start", exact: true });
    await expect(open).toBeEnabled({ timeout: 30_000 });
    await open.click();
    await press(page.getByRole("button", { name: /^Scratch project/ }));
    await expect(page.getByRole("status")).toHaveText(READY);
    await useExample(page);
    await press(page.getByRole("button", { name: "Run", exact: true }));
    await expect(page.getByRole("status")).toHaveText("done");
    for (const place of ["Plots", "Data", "Help"]) {
      await press(
        page.getByRole("navigation", { name: "Places" }).getByRole("button", { name: place }),
      );
    }
    await expect(page.getByTestId("help-counts")).toBeVisible();
    // The engine was fetched, and it is the only WebAssembly asked for.
    const wasm = [...new Set(asked.filter((path) => path.endsWith(".wasm")))];
    expect(wasm).toHaveLength(1);
    expect(wasm[0]).toMatch(/zemp_worker_bg/);
    expect(asked.filter((path) => ofPaper(path, worker))).toEqual([]);
  });
});

test("the module's worker starts in the browser, is given the fonts, and sets a paper to a page and a PDF", async ({
  page,
}) => {
  test.slow();
  const worker = paperWorker();
  const fonts = built().filter((name) => /\.(otf|ttf)$/.test(name));
  await page.goto("/");
  await expect(page.getByRole("button", { name: /^Scratch project/ })).toBeVisible();
  const got = await page.evaluate(
    async ({ worker, fonts }) => {
      const started = new Worker(`/assets/${worker}`, { type: "module" });
      const heard: Record<string, unknown>[] = [];
      let wake: (() => void) | null = null;
      started.onmessage = (event) => {
        heard.push(event.data as Record<string, unknown>);
        wake?.();
      };
      const failed = new Promise<never>((_, reject) => {
        started.onerror = (event) => reject(new Error(event.message || "the worker failed"));
      });
      const next = async (type: string): Promise<Record<string, unknown>> => {
        for (;;) {
          const at = heard.findIndex((message) => message["type"] === type);
          if (at >= 0) return heard.splice(at, 1)[0] as Record<string, unknown>;
          await Promise.race([new Promise<void>((resolve) => (wake = resolve)), failed]);
        }
      };
      const ready = await next("ready");
      // Each file's answer names the families read from it.
      const read = new Set<string>();
      for (const font of fonts) {
        const bytes = new Uint8Array(await (await fetch(`/assets/${font}`)).arrayBuffer());
        started.postMessage({ type: "font", bytes }, [bytes.buffer]);
        for (const family of (await next("fonted"))["families"] as string[]) read.add(family);
      }
      const families = [...read].sort();
      started.postMessage({ type: "open", main: "paper/paper.typ" });
      await next("opened");
      started.postMessage({
        type: "text",
        path: "paper/paper.typ",
        text: '#show math.equation: set text(font: "Libertinus Math")\n#set page(paper: "a4")\n#set text(lang: "en")\n= Returns to schooling\n\nA paragraph, with *weight* and _stress_, a formula: $x^2 + y^2$, and code: `lm(y ~ x)`.\n',
      });
      await next("put");
      const before = performance.now();
      started.postMessage({ type: "set" });
      const set = await next("set");
      const ms = performance.now() - before;
      started.postMessage({ type: "page", index: 0 });
      const svg = (await next("page"))["svg"] as string;
      started.postMessage({ type: "pdf", created: 1_795_000_000 });
      const pdf = (await next("pdf"))["bytes"] as Uint8Array<ArrayBuffer>;
      const digest = [...new Uint8Array(await crypto.subtle.digest("SHA-256", pdf))]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
      started.postMessage({ type: "click", page: 0, x: 80, y: 80 });
      const place = await next("place");
      started.terminate();
      return {
        typst: ready["typst"],
        families,
        ok: set["ok"],
        pages: set["pages"],
        said: (set["said"] as { message: string }[]).map((one) => one.message),
        svg: svg.slice(0, 4),
        pdf: String.fromCharCode(...pdf.subarray(0, 5)),
        digest,
        place: place["file"],
        ms,
      };
    },
    { worker, fonts },
  );
  expect(got.typst).toBe("0.15.1");
  expect(got.families).toEqual(["DejaVu Sans Mono", "Libertinus Math", "Libertinus Serif"]);
  expect(got.ok).toBe(true);
  expect(got.pages).toHaveLength(1);
  expect(got.svg).toBe("<svg");
  expect(got.pdf).toBe("%PDF-");
  expect(got.place).toBe("paper/paper.typ");
  // Nothing is said: text, mathematics and code each find their face among the fonts given.
  expect(got.said).toEqual([]);
  // The same bytes in every browser: held to the PDF Node's build of the module writes, which
  // the module's own tests hold in turn.
  test.info().annotations.push({ type: "pdf", description: got.digest });
  test.info().annotations.push({
    type: "first setting",
    description: `${Math.round(got.ms)} ms`,
  });
});
