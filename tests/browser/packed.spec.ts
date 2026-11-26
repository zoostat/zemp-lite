// The engine sent packed tight (release 0.2.5, step 4; open decision #224). The build packs
// the engine's WebAssembly once at brotli's highest setting and puts it beside the engine; the
// host's function sends that file, as it is, to a browser that takes brotli. The server of
// these tests answers as the host's function does (`vite.config.ts`), so what is held here is
// what a browser makes of an engine sent so; that the host itself sends it so is held by the
// checks after a deployment.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { brotliDecompressSync } from "node:zlib";
import { expect, test } from "./support";

const dist = path.resolve("dist");
const [engineName] = readdirSync(path.join(dist, "assets")).filter((name) =>
  name.endsWith(".wasm"),
);
const ENGINE = `/assets/${engineName}`;
const engine = readFileSync(path.join(dist, "assets", engineName as string));
const packed = readFileSync(path.join(dist, "assets", `${engineName}.br`));
const sha = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

test("the build carries the engine packed beside the engine, and it is the engine, about a fifth of its size", () => {
  expect(brotliDecompressSync(packed).equals(engine)).toBe(true);
  expect(packed.length).toBeLessThan(engine.length / 4);
  expect(packed.length).toBeLessThan(3_100_000);
  // The host's function answers for the built files, and for nothing else (release 0.3, step
  // 4: every built file, where 0.2.5 gave it the engine's address alone).
  const routes = JSON.parse(readFileSync(path.join(dist, "_routes.json"), "utf8")) as {
    include: string[];
    exclude: string[];
  };
  expect(routes.include).toEqual(["/assets/*"]);
  expect(ENGINE.startsWith("/assets/")).toBe(true);
  expect(routes.exclude).toEqual([]);
});

test("the function the build writes for the host carries the headers of the headers file, and sends the packed engine", async () => {
  const text = readFileSync(path.join(dist, "_worker.js"), "utf8");
  expect(text).not.toContain("__HOST_HEADERS__");
  const { default: worker } = (await import(pathToFileURL(path.join(dist, "_worker.js")).href)) as {
    default: { fetch(request: Request, env: unknown): Promise<Response> };
  };
  const files: Record<string, Buffer> = { [ENGINE]: engine, [`${ENGINE}.br`]: packed };
  const env = {
    ASSETS: {
      fetch: (request: Request) => {
        const file = files[new URL(request.url).pathname];
        return Promise.resolve(
          file === undefined
            ? new Response("<!doctype html>", { headers: { "content-type": "text/html" } })
            : new Response(new Uint8Array(file), {
                headers: { "content-type": "application/octet-stream" },
              }),
        );
      },
    },
  };
  const asked = new Request(`https://lite.example${ENGINE}`, {
    headers: { "accept-encoding": "gzip, deflate, br" },
  });
  const answer = await worker.fetch(asked, env);
  expect(answer.headers.get("content-encoding")).toBe("br");
  expect(answer.headers.get("content-type")).toBe("application/wasm");
  // Every header of the headers file, for every answer and for a built file.
  const headers = readFileSync(path.resolve("public/_headers"), "utf8");
  const named = [...headers.matchAll(/^\s+([A-Za-z-]+):\s*(.+)$/gm)];
  expect(named.length).toBeGreaterThan(5);
  for (const [, name, value] of named) {
    expect(answer.headers.get(name as string), name).toBe((value as string).trim());
  }
  expect(Buffer.from(await answer.arrayBuffer()).equals(packed)).toBe(true);
});

test("asked for with brotli the engine comes packed, and without it whole; either way it is the engine, with the host's headers", async ({
  request,
}) => {
  const tight = await request.get(ENGINE, { headers: { "accept-encoding": "gzip, br" } });
  expect(tight.status()).toBe(200);
  expect(tight.headers()["content-encoding"]).toBe("br");
  expect(tight.headers()["content-length"]).toBe(String(packed.length));
  expect(tight.headers()["content-type"]).toBe("application/wasm");
  expect(tight.headers()["cross-origin-embedder-policy"]).toBe("require-corp");
  expect(tight.headers()["cache-control"]).toContain("immutable");
  expect(sha(await tight.body())).toBe(sha(engine));

  const whole = await request.get(ENGINE, { headers: { "accept-encoding": "identity" } });
  expect(whole.status()).toBe(200);
  expect(whole.headers()["content-encoding"]).toBeUndefined();
  expect(whole.headers()["content-type"]).toBe("application/wasm");
  expect(whole.headers()["cross-origin-embedder-policy"]).toBe("require-corp");
  expect(sha(await whole.body())).toBe(sha(engine));
});

test.describe("a first visit", () => {
  test.use({ firstVisit: true });

  test("a browser fetches the engine packed, checks that it is the engine, compiles it as it arrives and runs it", async ({
    page,
  }) => {
    const said: string[] = [];
    page.on("console", (message) => said.push(message.text()));
    const asked = page.waitForRequest((one) => one.url().endsWith(".wasm"));
    await page.goto("/");
    const took = (await (await asked).allHeaders())["accept-encoding"] ?? "";
    const open = page.getByRole("button", { name: "Start", exact: true });
    await expect(open).toBeEnabled({ timeout: 30_000 });
    // The digest of what arrived, unpacked, is the engine's: the second step is done.
    await expect(page.getByTestId("step-check")).toHaveClass(/done/);
    const record = await page.evaluate(() => {
      const entry = (performance.getEntriesByType("resource") as PerformanceResourceTiming[])
        .filter((one) => one.name.endsWith(".wasm"))
        .at(0);
      return entry === undefined
        ? null
        : { travelled: entry.encodedBodySize, unpacked: entry.decodedBodySize };
    });
    expect(record).not.toBeNull();
    const how = page.getByTestId("step-fetch-how");
    if (/\bbr\b/.test(took)) {
      // The bytes that travelled are the packed file's, and the step says so.
      expect(record?.travelled).toBe(packed.length);
      expect(record?.unpacked).toBe(engine.length);
      await expect(how).toHaveText(`${(packed.length / 1_000_000).toFixed(1)} MB, once`);
    } else {
      // A browser that does not ask for brotli over this plain connection is sent the engine
      // whole, as the host would send it.
      expect(record?.travelled).toBe(engine.length);
    }
    await open.click();
    await page.getByRole("button", { name: /^Scratch project/ }).click();
    await expect(page.getByRole("status")).toHaveText("engine Zeff 0.9.0 ready", {
      timeout: 30_000,
    });
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText("done", { timeout: 30_000 });
    // The engine was compiled as it arrived: the binding says so on the console when it could
    // not be and had to wait for the whole file.
    expect(said.filter((text) => /instantiateStreaming/.test(text))).toEqual([]);
  });
});
