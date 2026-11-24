// The function of the host that sends the engine packed tight (release 0.2.5, step 4; open
// decision #224), run here as the host runs it, with a host of this test's making: it answers
// the engine's address with the packed file, marked as brotli and untouched, with the headers
// of the headers file; and whatever it does not know it leaves to the host as it always was.
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

test("anything that is not the engine asked for, the function leaves to the host", async () => {
  const env = host({ "/assets/app-1.js": { bytes: Buffer.from("app"), type: "text/javascript" } });
  const script = await worker.fetch(asking("/assets/app-1.js"), env);
  assert.equal(await script.text(), "app");
  assert.equal(script.headers.get("content-encoding"), null);
  const posted = await worker.fetch(asking(ENGINE, { method: "POST" }), both());
  assert.equal(posted.headers.get("content-encoding"), null);
  assert.deepEqual(env.asked, ["/assets/app-1.js"]);
});
