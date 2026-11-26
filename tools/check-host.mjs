// The check made after each deployment (release 0.2, step 17): that the address serves Zemp
// Lite as the headers file says it must. The app's page at the root, the page at `app/` that
// goes on to it (release 0.2.5, step 2), every file they name, the engine's worker
// and its WebAssembly are fetched; each answer must carry the isolation headers of
// `public/_headers` (a page without them is not given the shared memory a run is cancelled
// through), a built file must be kept as never changing, and every answer that carries a tag,
// asked for again with it, must be answered "not modified" with the same headers, since a
// browser that has the file asks for it that way. And the engine is asked for as a browser that
// takes brotli asks, and as one that does not (release 0.2.5, step 4; open decision #224): the
// first must be sent the engine packed tight, untouched by the host, and the second the engine
// whole; both must be the same engine. And an address under `assets/` that holds no file must
// be answered as no file and not to be kept, never with the app's page (release 0.3, step 4;
// risk R13). What it finds is said in plain words.
//
// A deployment is not at every place of the host at the instant the host says it is done: for
// some seconds a file a script names (the worker, the WebAssembly) may be answered with the
// page, as a file that is not there, and a file asked for again may be answered whole by a
// place that has only just been given it. So where a look finds anything lacking, the check
// looks again, for a minute at most, and reports what the last look found. A fault of the
// host or of the build is there at every look and fails as before, after the minute.
//
// Usage: node tools/check-host.mjs <address>      (as https://zemp-lite.pages.dev)
import { createHash } from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const address = process.argv[2];
if (address === undefined) {
  console.error("usage: node tools/check-host.mjs <address>");
  process.exit(1);
}
const base = new URL(address.endsWith("/") ? address : `${address}/`);

/** The headers of the block for every path in the headers file: what every answer must carry. */
function wanted() {
  const text = fs.readFileSync(path.join(root, "public", "_headers"), "utf8");
  const headers = {};
  let inBlock = false;
  for (const line of text.split("\n")) {
    if (line.trim() === "" || line.trimStart().startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      inBlock = line.trim() === "/*";
      continue;
    }
    const at = line.indexOf(":");
    if (inBlock && at > 0)
      headers[line.slice(0, at).trim().toLowerCase()] = line.slice(at + 1).trim();
  }
  return headers;
}

const every = wanted();

/** How often the address is looked at again while anything is lacking, and the pause. */
const LOOKS = 13;
const PAUSE_MS = 5000;

async function fetched(url, init) {
  const answer = await fetch(url, { redirect: "follow", ...init });
  return answer;
}

/**
 * An answer as it travels: its status, its headers and its bytes as sent, not unpacked. (The
 * `fetch` of Node unpacks what it is sent, so it cannot say how many bytes travelled.)
 */
function travelled(url, headers) {
  return new Promise((resolve, reject) => {
    const asking = (url.protocol === "http:" ? http : https).get(url, { headers }, (answer) => {
      const chunks = [];
      answer.on("data", (chunk) => chunks.push(chunk));
      answer.on("end", () =>
        resolve({
          status: answer.statusCode,
          headers: answer.headers,
          bytes: Buffer.concat(chunks),
        }),
      );
      answer.on("error", reject);
    });
    asking.on("error", reject);
  });
}

/** One look at the address: what is lacking, and whether the build was there whole. */
async function look() {
  const problems = [];
  let checked = 0;

  function holds(what, answer) {
    checked += 1;
    for (const [name, value] of Object.entries(every)) {
      const given = answer.headers.get(name);
      if (given !== value) {
        problems.push(
          `${what}: \`${name}\` is ${given === null ? "missing" : `\`${given}\``}, not \`${value}\``,
        );
      }
    }
  }

  /** The answers a browser can ask for again with what the host said of them. */
  const tags = [];
  function tagged(what, url, answer) {
    const tag = answer.headers.get("etag");
    const modified = answer.headers.get("last-modified");
    if (tag !== null) tags.push({ what, url, ask: { "if-none-match": tag } });
    else if (modified !== null) tags.push({ what, url, ask: { "if-modified-since": modified } });
  }

  // Two pages of one build (release 0.2.5, step 2): the app at the root of the address, which
  // is the one that names the worker and the engine; and at `app/`, where the app stood in
  // 0.2.4 alone, a page that draws nothing and goes on to the root.
  const page = await fetched(base);
  if (page.status !== 200) {
    await page.arrayBuffer();
    return { problems: [`the app's page answered ${page.status}, not 200`], whole: true, said: "" };
  }
  holds("the app's page", page);
  tagged("the app's page", base, page);
  const appHtml = await page.text();
  if (!/<div id="app">/.test(appHtml)) {
    problems.push("the root of the address did not answer with the app's page");
  }
  const old = new URL("app/", base);
  const moved = await fetched(old);
  if (moved.status !== 200) {
    await moved.arrayBuffer();
    return {
      problems: [`the page at \`app/\` answered ${moved.status}, not 200`],
      whole: true,
      said: "",
    };
  }
  holds("the page at `app/`", moved);
  tagged("the page at `app/`", old, moved);
  const movedHtml = await moved.text();
  if (/<div id="app">/.test(movedHtml) || !/<script[^>]+src="\/?assets\//.test(movedHtml)) {
    problems.push("the address `app/` did not answer with the page that goes on to the root");
  }
  const html = `${appHtml}\n${movedHtml}`;

  // Every file the page names, and the files they name in turn: the worker and its WebAssembly.
  const named = new Set([...html.matchAll(/(?:src|href)="\/?(assets\/[^"]+)"/g)].map((m) => m[1]));
  const fromPage = new Set(named);
  const seen = new Set();
  while (named.size > 0) {
    const [file] = named;
    named.delete(file);
    if (seen.has(file)) continue;
    seen.add(file);
    const answer = await fetched(new URL(file, base));
    // A name in a script that is no file of the site: the host's function answers it "not
    // yet" (release 0.3, step 4), as the host by itself answered it with the page.
    if (
      !fromPage.has(file) &&
      (answer.status === 503 ||
        answer.status === 404 ||
        (answer.headers.get("content-type") ?? "").startsWith("text/html"))
    ) {
      seen.delete(file);
      await answer.arrayBuffer();
      continue;
    }
    if (answer.status !== 200) {
      problems.push(`${file}: answered ${answer.status}, not 200`);
      continue;
    }
    holds(file, answer);
    tagged(file, new URL(file, base), answer);
    const kept = answer.headers.get("cache-control") ?? "";
    if (!kept.includes("immutable")) {
      problems.push(`${file}: is not kept as never changing (\`cache-control\` is \`${kept}\`)`);
    }
    if (file.endsWith(".js")) {
      const text = await answer.text();
      for (const m of text.matchAll(
        /["'`/](?:\.\/)?((?:assets\/)?[A-Za-z0-9_.-]+\.(?:js|wasm))["'`]/g,
      )) {
        const found = m[1].startsWith("assets/") ? m[1] : `assets/${m[1]}`;
        if (!seen.has(found)) named.add(found);
      }
    } else {
      await answer.arrayBuffer();
    }
  }
  // A wrong file is never kept for a year (release 0.3, step 4; risk R13). The host by itself
  // answers an address under `assets/` that holds no file with the app's page and the headers
  // of a built file, which tell a browser to keep it for a year. So an address there that
  // holds no file must be answered as no file, not with a page, and not to be kept.
  let absent = 0;
  for (const name of ["zemp-no-such-file.js", "zemp-no-such-file.css", "zemp-no-such-file.woff2"]) {
    const what = `assets/${name}, which is no file`;
    const answer = await fetched(new URL(`assets/${name}`, base));
    await answer.arrayBuffer();
    const kept = answer.headers.get("cache-control") ?? "";
    if (answer.status < 400) {
      problems.push(`${what}: answered ${answer.status}, as if it were one`);
    }
    if ((answer.headers.get("content-type") ?? "").startsWith("text/html")) {
      problems.push(`${what}: answered with a page`);
    }
    if (!/\bno-store\b/.test(kept)) {
      problems.push(
        `${what}: a browser may keep the answer (\`cache-control\` is ${kept === "" ? "missing" : `\`${kept}\``}, not \`no-store\`)`,
      );
    }
    holds(what, answer);
    absent += 1;
  }
  const wasm = [...seen].filter((file) => file.endsWith(".wasm"));
  if (wasm.length === 0) problems.push("no WebAssembly file of the engine was found from the page");
  const worker = [...seen].filter((file) => /worker/.test(file) && file.endsWith(".js"));
  if (worker.length === 0) problems.push("no worker script was found from the page");

  // The engine as it travels (open decision #224). To a browser that takes brotli: the engine
  // packed tight by the build, marked as brotli, with the headers, and unpacking to the engine.
  // To one that does not: the engine whole. Where this machine has the build that was sent
  // (after a deployment it does), the packed bytes must be that build's packed file, to a byte.
  let packedSaid = "";
  for (const file of wasm) {
    const url = new URL(file, base);
    const whole = await travelled(url, { "accept-encoding": "identity" });
    const tight = await travelled(url, { "accept-encoding": "gzip, deflate, br" });
    checked += 2;
    if (whole.status !== 200 || tight.status !== 200) {
      problems.push(`${file}: answered ${whole.status} whole and ${tight.status} packed, not 200`);
      continue;
    }
    for (const [how, answer] of [
      ["asked for whole", whole],
      ["asked for packed", tight],
    ]) {
      for (const [name, value] of Object.entries(every)) {
        if (answer.headers[name] !== value) {
          problems.push(
            `${file}, ${how}: \`${name}\` is ${answer.headers[name] === undefined ? "missing" : `\`${answer.headers[name]}\``}, not \`${value}\``,
          );
        }
      }
      if (!(answer.headers["cache-control"] ?? "").includes("immutable")) {
        problems.push(`${file}, ${how}: is not kept as never changing`);
      }
      if (!(answer.headers["content-type"] ?? "").startsWith("application/wasm")) {
        problems.push(
          `${file}, ${how}: is sent as \`${answer.headers["content-type"]}\`, not as WebAssembly, so a browser cannot compile it as it arrives`,
        );
      }
    }
    if (whole.headers["content-encoding"] !== undefined) {
      problems.push(
        `${file}: asked for whole, it was sent packed (\`${whole.headers["content-encoding"]}\`)`,
      );
      continue;
    }
    if (tight.headers["content-encoding"] !== "br") {
      problems.push(
        `${file}: asked for with brotli, it was sent as \`${tight.headers["content-encoding"] ?? "nothing"}\`, not as brotli`,
      );
      continue;
    }
    let unpacked;
    try {
      unpacked = zlib.brotliDecompressSync(tight.bytes);
    } catch {
      problems.push(`${file}: what was sent as brotli does not unpack`);
      continue;
    }
    const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
    if (digest(unpacked) !== digest(whole.bytes)) {
      problems.push(`${file}: sent packed and sent whole, it is not the same engine`);
    }
    const built = path.join(root, "dist", `${file}.br`);
    if (fs.existsSync(built)) {
      const ours = fs.readFileSync(built);
      if (!ours.equals(tight.bytes)) {
        problems.push(
          `${file}: ${tight.bytes.length} bytes travelled packed, which are not the ${ours.length} bytes the build packed: the host did not send the build's packed engine as it is`,
        );
      }
    } else if (tight.bytes.length > whole.bytes.length / 4.5) {
      // Without the build at hand: brotli's highest setting brings the engine under a fifth
      // of itself, and the host's own packing as it sends does not reach a quarter.
      problems.push(
        `${file}: ${tight.bytes.length} bytes travelled packed of ${whole.bytes.length}, more than the build's tight packing gives: the host packed the engine itself`,
      );
    }
    packedSaid = `; the engine travels as ${tight.bytes.length} bytes packed of ${whole.bytes.length}`;
  }

  // Every answer that carries a tag (`etag` or `last-modified`), asked for again as a browser
  // that has it asks: it must be answered "not modified", and that answer too must carry the
  // isolation headers, which is what a host can get wrong. An answer with no tag is fetched
  // whole each time, with its headers, as Cloudflare Pages does for the page itself.
  let revalidated = 0;
  for (const { what, url, ask } of tags) {
    const again = await fetched(url, { headers: ask });
    await again.arrayBuffer();
    if (again.status !== 304) {
      problems.push(`${what} asked for again answered ${again.status}, not 304 ("not modified")`);
    } else {
      holds(`${what}, answered "not modified"`, again);
      revalidated += 1;
    }
  }
  const pageTagged = tags.some(({ what }) => what === "the app's page");
  return {
    problems,
    whole: wasm.length > 0 && worker.length > 0,
    said: `${checked} answers, the app's page and the page at app/ that goes on to it, ${seen.size} files (the worker and the engine's WebAssembly among them) and ${revalidated} answered "not modified" when asked again${pageTagged ? "" : " (the page carries no tag, so it is fetched whole each time)"}, each with the isolation headers; ${absent} addresses under assets/ that hold no file answered as no file, not to be kept${packedSaid}`,
  };
}

let found = await look();
let looks = 1;
while ((!found.whole || found.problems.length > 0) && looks < LOOKS) {
  await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
  found = await look();
  looks += 1;
}
const waited =
  looks > 1 ? ` Nothing was lacking at look ${looks}, ${PAUSE_MS / 1000} seconds apart.` : "";

if (found.problems.length > 0) {
  console.error(
    `The host at ${base} does not serve Zemp Lite as it must (${found.problems.length})${looks > 1 ? `, looked at ${looks} times over ${((looks - 1) * PAUSE_MS) / 1000} seconds` : ""}:`,
  );
  for (const problem of found.problems) console.error(`- ${problem}`);
  process.exit(1);
}
console.log(`The host at ${base} serves Zemp Lite as it must: ${found.said}.${waited}`);
