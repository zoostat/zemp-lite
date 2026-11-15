// The engine's worker in the browser: a module worker running `worker/js/worker.js`, which
// loads the WebAssembly build of the released Zeff engine (`npm run build:worker`).
import workerUrl from "../../worker/js/worker.js?worker&url";
import { Engine, type WorkerLike } from "./engine";

let started = 0;

/** An engine for this window, its worker not yet started. */
export function browserEngine(): Engine {
  return new Engine(() => {
    // Each worker is asked for under an address of its own, so that the browser fetches its
    // script afresh and never revives a kept copy. A worker's script must arrive with the
    // page's isolation headers; a server's "not modified" answer may come without them, and
    // WebKit then refuses the worker: the second project opened in a window would have no
    // engine.
    started += 1;
    const address = `${workerUrl}?worker=${Date.now().toString(36)}-${started}`;
    return new Worker(address, { type: "module", name: "zeff-engine" }) as unknown as WorkerLike;
  });
}
