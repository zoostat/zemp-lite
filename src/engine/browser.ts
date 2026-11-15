// The engine's worker in the browser: a module worker running `worker/js/worker.js`, which
// loads the WebAssembly build of the released Zeff engine (`npm run build:worker`).
import { Engine, type WorkerLike } from "./engine";

/** An engine for this window, its worker not yet started. */
export function browserEngine(): Engine {
  return new Engine(
    () =>
      new Worker(new URL("../../worker/js/worker.js", import.meta.url), {
        type: "module",
        name: "zeff-engine",
      }) as unknown as WorkerLike,
  );
}
