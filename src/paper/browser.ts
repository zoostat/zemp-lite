// The Paper module in the browser: its files as the build carries them, fetched the first
// time a paper is opened, and its worker, a module worker running `paper/js/worker.js`, which
// loads the WebAssembly build of Typst (`npm run build:paper`). Nothing of this file is
// fetched by the app's start: it is a part of the app that is asked for when Paper is.
import type { WorkerLike } from "../engine/engine";
import workerUrl from "../../paper/js/worker.js?worker&url";
import moduleUrl from "../../paper/pkg/web/zemp_paper_bg.wasm?url";
import { fetchAll, type Carried, type Progress } from "./fetching";
import { PaperModule } from "./module";

/** The fonts a paper is set in, each by its file's name with its address in the build. */
const fontUrls = import.meta.glob<string>("../../paper/fonts/*.{otf,ttf}", {
  eager: true,
  query: "?url",
  import: "default",
});

const facts = __PAPER_FACTS__;
const said = (name: string) =>
  [facts?.module, ...(facts?.fonts ?? [])].find((one) => one?.name === name) ?? null;

/** The module's WebAssembly, then each font, in the order of their names. */
export const FILES: Carried[] = [
  { name: "zemp_paper_bg.wasm", url: moduleUrl },
  ...Object.entries(fontUrls)
    .map(([path, url]) => ({ name: path.slice(path.lastIndexOf("/") + 1), url }))
    .sort((a, b) => (a.name < b.name ? -1 : 1)),
].map(({ name, url }) => ({
  name,
  url,
  bytes: said(name)?.bytes ?? null,
  sha256: said(name)?.sha256 ?? null,
}));

let started = 0;

/**
 * Fetch the module and its fonts, telling how far the fetching has gone, check each against
 * the build's digest, start the worker and give it the fonts. The browser has the module's
 * file by then, so the worker's own asking for it is answered from what the browser keeps.
 */
export async function loadPaper(tell?: (progress: Progress) => void): Promise<PaperModule> {
  const [, ...fonts] = await fetchAll(FILES, (url) => fetch(url), tell);
  const module = new PaperModule(() => {
    // Each worker is asked for under an address of its own, as the engine's is
    // (`engine/browser.ts`): a kept copy answered "not modified" may come without the page's
    // isolation headers, and WebKit then refuses the worker.
    started += 1;
    const address = `${workerUrl}?worker=${Date.now().toString(36)}-${started}`;
    return new Worker(address, { type: "module", name: "zemp-paper" }) as unknown as WorkerLike;
  });
  await module.start();
  for (const bytes of fonts) await module.font(bytes);
  return module;
}
