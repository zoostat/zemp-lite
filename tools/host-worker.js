// The function of the host that answers for every built file (`/assets/*`, by `_routes.json`).
// It does two things.
//
// It sends the engine packed tight (release 0.2.5, step 4; open decision #224), and from
// release 0.3, step 11b, the Paper module and its fonts in the same way. Cloudflare
// Pages packs a file as it sends it, at a low setting, and does not of itself send one packed
// beforehand. The build puts the engine packed at brotli's highest setting beside the engine
// (`<name>.wasm.br`), and this function answers the engine's address with the packed file,
// marked as brotli and not to be packed again. A browser that does not take brotli, and any
// case this function does not know, is answered by the host as it always was: nothing here
// can leave the engine unsent.
//
// And it never passes on the wrong file (risk R13; from release 0.3, step 4, for every built
// file, where 0.2.5 guarded the engine alone). The host answers an address that holds no file
// with the app's page, and under `/assets/` with the headers of a built file: to be kept for a
// year, and never asked for again. For some seconds after a deployment a place of the host
// may not yet hold a new file; a browser that asked then would keep a page as a script, a
// style, a font or the engine, and the app would not start in it until its data was cleared.
// So what is not the file is answered "not yet", not to be kept.
//
// What the build packs beforehand is kept by the browser alone (release 0.3, step 11c). In
// front of this function, at an address of the owner's own domain, stands the host's cache,
// which keeps an answer by the ending of its address (a font's, not the engine's) and by one
// key whatever packing was asked for: once it held a font whole, it packed that copy itself,
// at a low setting, for every browser after, and this function was not asked again. So the
// engine, the Paper module and the fonts are marked `private`: a browser keeps each for a
// year as before, and the host's cache keeps none, so every asking reaches this function.
//
// The build writes this file out as `_worker.js` with the headers of `public/_headers` put in
// (`vite.config.ts`): the host does not add them to what a function answers.

/* global __HOST_HEADERS__ */
const HEADERS = __HOST_HEADERS__;

/**
 * The built files the build packs beforehand, by their endings, with the type each is sent
 * as: the engine and the Paper module (WebAssembly), and the fonts a paper is set in (release
 * 0.3, step 11b). Any other built file is the host's to pack as it sends it.
 */
const TYPES = { wasm: "application/wasm", otf: "font/otf", ttf: "font/ttf" };

/**
 * How long a file packed beforehand is kept, and by whom: as a built file is (`HEADERS`), but
 * by the browser alone.
 */
const ALONE = (new Headers(HEADERS).get("cache-control") || "max-age=31536000, immutable")
  .replace(/\bpublic\b\s*,?\s*/i, "")
  .replace(/^/, "private, ");

/**
 * An answer of the host's for a file packed beforehand, sent whole (to a browser that does not
 * take brotli, or where no packed file stands beside it): marked for the browser alone, as the
 * packed answer is. What is not to be kept ("not yet") stays so.
 */
function alone(answer) {
  const said = answer.headers.get("cache-control") || "";
  if (answer.status >= 400 || /no-store/i.test(said)) return answer;
  const mine = new Response(answer.body, answer);
  mine.headers.set("cache-control", ALONE);
  return mine;
}

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

/** An answer that is not to be kept: "not yet", or what the host said, with its status. */
function notKept(request, status, said, more = {}) {
  const headers = new Headers(HEADERS);
  headers.set("content-type", "text/plain; charset=utf-8");
  headers.set("cache-control", "no-store");
  for (const [name, value] of Object.entries(more)) headers.set(name, value);
  return new Response(request.method === "HEAD" ? null : said, { status, headers });
}

/**
 * A built file as the host has it, whole. No built file is a page, so a page in answer to a
 * built file's address is the host's own page in place of a file it does not hold there: it
 * is never passed on, and the answer is "not yet", not to be kept, with a time to ask again
 * (the loading screen's **Try again** fetches the engine afresh; the page says of a script
 * that did not arrive that it can be loaded again). Whatever else the host answers that is not
 * the file (not found, a fault of its own) is passed on by its status, and not to be kept.
 */
async function asBuilt(request, env) {
  const answer = await env.ASSETS.fetch(request);
  const type = answer.headers.get("content-type") || "";
  if (type.startsWith("text/html")) {
    return notKept(request, 503, "This file is not at this place of the host yet.\n", {
      "retry-after": "5",
    });
  }
  if (answer.status >= 400) {
    return notKept(request, answer.status, "The host has no such file.\n");
  }
  return answer;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const asks = request.method === "GET" || request.method === "HEAD";
    // Only a built file asked for is this function's: anything else is the host's as it was.
    if (!asks || !url.pathname.startsWith("/assets/")) return env.ASSETS.fetch(request);
    const type = TYPES[url.pathname.slice(url.pathname.lastIndexOf(".") + 1)];
    if (type === undefined) return asBuilt(request, env);
    if (!takesBrotli(request)) return alone(await asBuilt(request, env));
    const beside = new URL(url);
    beside.pathname = `${url.pathname}.br`;
    let packed;
    try {
      packed = await env.ASSETS.fetch(new Request(beside, request));
    } catch {
      return alone(await asBuilt(request, env));
    }
    // No packed file beside the engine: the host answers such an address with a page, or with
    // "not found". The engine is then sent as it always was.
    const sent = packed.headers.get("content-type") || "";
    if ((packed.status !== 200 && packed.status !== 304) || sent.startsWith("text/html")) {
      return alone(await asBuilt(request, env));
    }
    const headers = new Headers(HEADERS);
    headers.set("cache-control", ALONE);
    headers.set("content-type", type);
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
