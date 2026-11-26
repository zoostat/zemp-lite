// The paper's worker in the browser: a module worker, started by the interface the first time
// a paper is opened. The WebAssembly build beside it is the output of `node paper/build.mjs`
// (`pkg/web/`). The messages are those of `host.mjs`.
import init, * as module from "../pkg/web/zemp_paper.js";
import { serve } from "./host.mjs";

await init();
serve(module, self);
