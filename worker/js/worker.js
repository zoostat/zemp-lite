// The engine's worker in the browser: a module worker, started by the interface. The
// WebAssembly build beside it is the output of `node worker/build.mjs` (`pkg/web/`). The
// messages are those of `host.mjs`.
import init, * as engine from "../pkg/web/zemp_worker.js";
import { serve } from "./host.mjs";

await init();
// The memory the device reports, in bytes; browsers give it in gigabytes, rounded, or not at all.
const deviceBytes = (self.navigator?.deviceMemory ?? 0) * 2 ** 30;
serve(engine, self, deviceBytes);
