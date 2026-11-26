// The function of the host that sends the engine packed tight (release 0.2.5, step 4; open
// decision #224), run here as the host runs it, with a host of this test's making: it answers
// the engine's address with the packed file, marked as brotli and untouched, with the headers
// of the headers file; and whatever it does not know it leaves to the host as it always was.
// From release 0.3 (step 4; risk R13) it answers for every built file, and never passes on the
// app's page, or anything else that is not the file, as a file to be kept.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import zlib from "node:zlib";
import { pack, packedBeside, packedName, unpacksTo } from "./pack-lib.mjs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const HEADERS = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
  "Cache-Control": "public, max-age=31536000, immutable",
};
globalThis.__HOST_HEADERS__ = HEADERS;
const { default: worker } = await import("./host-worker.js");

const engine = Buffer.from("the engine, as the build made it ".repeat(4000));
const packed = pack(engine);
const ENGINE = "/assets/zemp_worker_bg-abc123.wasm";

/** A host with the files given; it notes each address it is asked for. */
function host(files) {
  const asked = [];
  return {
    asked,
    ASSETS: {
      async fetch(request) {
        const url = new URL(request.url);
        asked.push(url.pathname);
        const file = files[url.pathname];
        if (file === undefined) {
          // As Cloudflare Pages answers an address that is no file: with the page.
          return new Response("<!doctype html>", {
            status: 200,
            headers: { "content-type": "text/html; charset=utf-8" },
          });
        }
        const tag = `"${createHash("sha256").update(file.bytes).digest("hex").slice(0, 16)}"`;
        const headers = { "content-type": file.type, etag: tag };
        if (request.headers.get("if-none-match") === tag) {
          return new Response(null, { status: 304, headers });
        }
        return new Response(request.method === "HEAD" ? null : file.bytes, {
          status: 200,
          headers: { ...headers, "content-length": String(file.bytes.length) },
        });
      },
    },
  };
}

const both = () =>
  host({
    [ENGINE]: { bytes: engine, type: "application/wasm" },
    [packedName(ENGINE)]: { bytes: packed, type: "application/octet-stream" },
  });

/** A request as the host hands it to a function: what the browser said is kept beside it. */
function asking(
  pathname,
  { takes = "gzip, deflate, br, zstd", method = "GET", headers = {} } = {},
) {
  const request = new Request(`https://lite.example${pathname}`, {
    method,
    // Inside the host the header itself is rewritten, whatever the browser sent.
    headers: { "accept-encoding": "br, gzip", ...headers },
  });
  Object.defineProperty(request, "cf", { value: { clientAcceptEncoding: takes } });
  return request;
}

test("the engine packed tight is the engine: it unpacks to the same bytes, and is much the smaller", () => {
  assert.equal(unpacksTo(packed, engine), true);
  assert.equal(unpacksTo(packed, Buffer.from("another file")), false);
  assert.equal(unpacksTo(Buffer.from("not brotli at all"), engine), false);
  assert.ok(packed.length < engine.length / 10);
});

test("a file is packed beside itself once, and not again while it holds the same bytes", () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "zemp-pack-"));
  try {
    const file = path.join(folder, "engine.wasm");
    const kept = path.join(folder, "kept");
    fs.writeFileSync(file, engine);
    const first = packedBeside(file, kept);
    assert.equal(first.path, `${file}.br`);
    assert.equal(first.of, engine.length);
    assert.equal(unpacksTo(fs.readFileSync(first.path), engine), true);
    const [name] = fs.readdirSync(kept);
    // What was kept is used again: it is put there changed, in a way that still unpacks to the
    // engine, and the file beside the engine is then that one.
    const loose = zlib.brotliCompressSync(engine, {
      params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 1 },
    });
    fs.writeFileSync(path.join(kept, name), loose);
    fs.rmSync(first.path);
    assert.equal(packedBeside(file, kept).bytes, loose.length);
    // What was kept for another file's bytes is never used for this one.
    fs.writeFileSync(path.join(kept, name), pack(Buffer.from("something else")));
    assert.equal(packedBeside(file, kept).bytes, packed.length);
    // And a file that holds something else is packed afresh.
    fs.writeFileSync(file, Buffer.from("another engine ".repeat(3000)));
    const second = packedBeside(file, kept);
    assert.equal(unpacksTo(fs.readFileSync(second.path), fs.readFileSync(file)), true);
    assert.equal(fs.readdirSync(kept).length, 2);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test("a browser that takes brotli is sent the packed engine, untouched, marked as brotli, with the host's headers", async () => {
  const env = both();
  const answer = await worker.fetch(asking(ENGINE), env);
  assert.equal(answer.status, 200);
  assert.equal(answer.headers.get("content-encoding"), "br");
  assert.equal(answer.headers.get("content-type"), "application/wasm");
  assert.equal(answer.headers.get("vary"), "Accept-Encoding");
  assert.equal(answer.headers.get("content-length"), String(packed.length));
  for (const [name, value] of Object.entries(HEADERS)) {
    assert.equal(answer.headers.get(name), value, name);
  }
  assert.notEqual(answer.headers.get("etag"), null);
  const sent = Buffer.from(await answer.arrayBuffer());
  assert.equal(sent.equals(packed), true);
  assert.equal(unpacksTo(sent, engine), true);
  assert.deepEqual(env.asked, [packedName(ENGINE)]);
});

test("a browser that has the packed engine and asks whether it changed is told it has not, with the headers", async () => {
  const env = both();
  const first = await worker.fetch(asking(ENGINE), env);
  const tag = first.headers.get("etag");
  const again = await worker.fetch(asking(ENGINE, { headers: { "if-none-match": tag } }), env);
  assert.equal(again.status, 304);
  assert.equal(again.headers.get("etag"), tag);
  assert.equal(again.headers.get("content-encoding"), null);
  for (const [name, value] of Object.entries(HEADERS)) {
    assert.equal(again.headers.get(name), value, name);
  }
});

test("asked for the headers alone, it answers with them and no body", async () => {
  const answer = await worker.fetch(asking(ENGINE, { method: "HEAD" }), both());
  assert.equal(answer.status, 200);
  assert.equal(answer.headers.get("content-encoding"), "br");
  assert.equal((await answer.arrayBuffer()).byteLength, 0);
});

test("a browser that does not take brotli is sent the engine as the host always sent it", async () => {
  for (const takes of ["gzip, deflate", "", "identity", "gzip, br;q=0", "brotli-like, gzip"]) {
    const env = both();
    const answer = await worker.fetch(asking(ENGINE, { takes }), env);
    assert.equal(answer.headers.get("content-encoding"), null, takes);
    assert.equal(Buffer.from(await answer.arrayBuffer()).equals(engine), true, takes);
    assert.deepEqual(env.asked, [ENGINE], takes);
  }
  // Brotli taken with a weight, or written in capitals, is brotli taken.
  for (const takes of ["gzip;q=0.8, br;q=0.9", "GZIP, BR"]) {
    const answer = await worker.fetch(asking(ENGINE, { takes }), both());
    assert.equal(answer.headers.get("content-encoding"), "br", takes);
  }
});

test("where no packed file stands beside the engine, the engine is sent as the host always sent it", async () => {
  const env = host({ [ENGINE]: { bytes: engine, type: "application/wasm" } });
  const answer = await worker.fetch(asking(ENGINE), env);
  assert.equal(answer.headers.get("content-encoding"), null);
  assert.equal(answer.headers.get("content-type"), "application/wasm");
  assert.equal(Buffer.from(await answer.arrayBuffer()).equals(engine), true);
  assert.deepEqual(env.asked, [packedName(ENGINE), ENGINE]);
  // And where the host fails in looking for it.
  const failing = {
    ASSETS: {
      async fetch(request) {
        if (new URL(request.url).pathname.endsWith(".br")) throw new Error("no such thing");
        return new Response(engine, { headers: { "content-type": "application/wasm" } });
      },
    },
  };
  const still = await worker.fetch(asking(ENGINE), failing);
  assert.equal(Buffer.from(await still.arrayBuffer()).equals(engine), true);
});

test("where the host has not been given the engine yet and answers with its page, the page is never passed on as the engine", async () => {
  // As Cloudflare Pages answers in the seconds after a deployment: the app's page, with the
  // headers of a built file, to be kept for a year.
  const early = () => ({
    asked: [],
    ASSETS: {
      async fetch() {
        return new Response("<!doctype html><title>Zemp Lite</title>", {
          status: 200,
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  });
  for (const takes of ["gzip, deflate, br", "gzip", ""]) {
    const answer = await worker.fetch(asking(ENGINE, { takes }), early());
    assert.equal(answer.status, 503, takes);
    assert.equal(answer.headers.get("cache-control"), "no-store", takes);
    assert.equal(answer.headers.get("retry-after"), "5", takes);
    assert.equal(answer.headers.get("content-encoding"), null, takes);
    assert.match(answer.headers.get("content-type"), /^text\/plain/, takes);
    // The isolation headers are on it, as on every answer.
    assert.equal(answer.headers.get("Cross-Origin-Embedder-Policy"), "require-corp", takes);
    assert.doesNotMatch(await answer.text(), /<!doctype/i, takes);
  }
  const head = await worker.fetch(asking(ENGINE, { method: "HEAD" }), early());
  assert.equal(head.status, 503);
  assert.equal((await head.arrayBuffer()).byteLength, 0);
  // The packed file there and the engine not: still "not yet" for a browser that asks whole.
  const half = host({ [packedName(ENGINE)]: { bytes: packed, type: "application/octet-stream" } });
  assert.equal((await worker.fetch(asking(ENGINE, { takes: "gzip" }), half)).status, 503);
  assert.equal((await worker.fetch(asking(ENGINE), half)).headers.get("content-encoding"), "br");
});

test("a built file that is there is passed on as the host gave it, asked for once", async () => {
  const files = {
    "/assets/app-1.js": { bytes: Buffer.from("app"), type: "text/javascript" },
    "/assets/app-1.css": { bytes: Buffer.from("body{}"), type: "text/css" },
    "/assets/face-1.woff2": { bytes: Buffer.from("a face"), type: "font/woff2" },
  };
  const env = host(files);
  for (const [name, file] of Object.entries(files)) {
    const answer = await worker.fetch(asking(name), env);
    assert.equal(answer.status, 200, name);
    assert.equal(answer.headers.get("content-type"), file.type, name);
    assert.equal(answer.headers.get("content-encoding"), null, name);
    assert.equal(Buffer.from(await answer.arrayBuffer()).equals(file.bytes), true, name);
    // A browser that has it and asks whether it has changed is told it has not, by the host.
    const again = await worker.fetch(
      asking(name, { headers: { "if-none-match": answer.headers.get("etag") } }),
      env,
    );
    assert.equal(again.status, 304, name);
  }
  assert.deepEqual(
    env.asked,
    Object.keys(files).flatMap((name) => [name, name]),
  );
});

test("a built file the host does not hold yet is never answered with the app's page: not yet, and not to be kept", async () => {
  // Risk R13. As Cloudflare Pages answers an address under `/assets/` that holds no file, in
  // the seconds after a deployment: the app's page, with the headers of a built file.
  const early = {
    ASSETS: {
      async fetch() {
        return new Response("<!doctype html><title>Zemp Lite</title>", {
          status: 200,
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  };
  for (const name of [
    "/assets/app-1.js",
    "/assets/app-1.css",
    "/assets/face-1.woff2",
    "/assets/worker-1.js",
    "/assets/zemp_worker_bg-abc123.wasm.br",
  ]) {
    const answer = await worker.fetch(asking(name), early);
    assert.equal(answer.status, 503, name);
    assert.equal(answer.headers.get("cache-control"), "no-store", name);
    assert.equal(answer.headers.get("retry-after"), "5", name);
    assert.match(answer.headers.get("content-type"), /^text\/plain/, name);
    assert.equal(answer.headers.get("Cross-Origin-Embedder-Policy"), "require-corp", name);
    assert.equal(await answer.text(), "This file is not at this place of the host yet.\n", name);
    const head = await worker.fetch(asking(name, { method: "HEAD" }), early);
    assert.equal(head.status, 503, name);
    assert.equal(head.headers.get("cache-control"), "no-store", name);
    assert.equal((await head.arrayBuffer()).byteLength, 0, name);
  }
});

test("what else the host answers that is not the file is passed on by its status, and not to be kept", async () => {
  for (const status of [404, 500, 502]) {
    const failing = {
      ASSETS: {
        async fetch() {
          return new Response("the host's own words", {
            status,
            headers: {
              "content-type": "text/plain",
              "cache-control": "public, max-age=31536000, immutable",
            },
          });
        },
      },
    };
    const answer = await worker.fetch(asking("/assets/app-1.js"), failing);
    assert.equal(answer.status, status);
    assert.equal(answer.headers.get("cache-control"), "no-store");
    assert.equal(answer.headers.get("Cross-Origin-Opener-Policy"), "same-origin");
    assert.equal(await answer.text(), "The host has no such file.\n");
  }
});

test("what is not a built file asked for, the function leaves to the host as it was", async () => {
  // The routes give the function `/assets/*` alone; were it given more, it would pass it on.
  const page = {
    asked: [],
    ASSETS: {
      async fetch(request) {
        page.asked.push(`${request.method} ${new URL(request.url).pathname}`);
        return new Response("<!doctype html><title>Zemp Lite</title>", {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      },
    },
  };
  for (const name of ["/", "/app/", "/counted.html"]) {
    const answer = await worker.fetch(asking(name), page);
    assert.equal(answer.status, 200, name);
    assert.match(await answer.text(), /<!doctype html>/, name);
  }
  const posted = await worker.fetch(asking(ENGINE, { method: "POST" }), both());
  assert.equal(posted.headers.get("content-encoding"), null);
  const sent = await worker.fetch(asking("/assets/app-1.js", { method: "POST" }), page);
  assert.equal(sent.status, 200);
  assert.deepEqual(page.asked, [
    "GET /",
    "GET /app/",
    "GET /counted.html",
    "POST /assets/app-1.js",
  ]);
});
