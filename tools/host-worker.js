// The function of the host that sends the engine packed tight (release 0.2.5, step 4; open
// decision #224). Cloudflare Pages packs a file as it sends it, at a low setting, and does not
// of itself send one packed beforehand. The build puts the engine packed at brotli's highest
// setting beside the engine (`<name>.wasm.br`), and this function answers the engine's address,
// and that address alone (`_routes.json`), with the packed file, marked as brotli and not to be
// packed again. A browser that does not take brotli, and any case this function does not know,
// is answered by the host as it always was: nothing here can leave the engine unsent.
//
// The build writes this file out as `_worker.js` with the headers of `public/_headers` put in
// (`vite.config.ts`): the host does not add them to what a function answers.

/* global __HOST_HEADERS__ */
const HEADERS = __HOST_HEADERS__;

/** Whether the browser that asks takes brotli. Inside the host the header is rewritten, and
 * what the browser itself said is kept beside the request. */
function takesBrotli(request) {
  // A browser that said nothing takes nothing: its empty word is not passed over for the header.
  const own = request.cf ? request.cf.clientAcceptEncoding : undefined;
  const said = typeof own === "string" ? own : request.headers.get("accept-encoding") || "";
  return said.split(",").some((one) => {
    const [name, ...rest] = one.split(";").map((part) => part.trim().toLowerCase());
    if (name !== "br") return false;
    const weight = rest.find((part) => part.startsWith("q="));
    return weight === undefined || Number(weight.slice(2)) > 0;
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const asks = request.method === "GET" || request.method === "HEAD";
    if (!asks || !url.pathname.endsWith(".wasm") || !takesBrotli(request)) {
      return env.ASSETS.fetch(request);
    }
    const beside = new URL(url);
    beside.pathname = `${url.pathname}.br`;
    let packed;
    try {
      packed = await env.ASSETS.fetch(new Request(beside, request));
    } catch {
      return env.ASSETS.fetch(request);
    }
    // No packed file beside the engine: the host answers such an address with a page, or with
    // "not found". The engine is then sent as it always was.
    const type = packed.headers.get("content-type") || "";
    if ((packed.status !== 200 && packed.status !== 304) || type.startsWith("text/html")) {
      return env.ASSETS.fetch(request);
    }
    const headers = new Headers(HEADERS);
    headers.set("content-type", "application/wasm");
    headers.set("vary", "Accept-Encoding");
    for (const name of ["etag", "last-modified"]) {
      const value = packed.headers.get(name);
      if (value !== null) headers.set(name, value);
    }
    // A browser that has the packed file and asks whether it has changed.
    if (packed.status === 304) return new Response(null, { status: 304, headers });
    headers.set("content-encoding", "br");
    const length = packed.headers.get("content-length");
    if (length !== null && packed.headers.get("content-encoding") === null) {
      headers.set("content-length", length);
    }
    // `encodeBody: "manual"` tells the host that the body is packed already.
    return new Response(packed.body, { status: 200, headers, encodeBody: "manual" });
  },
};
