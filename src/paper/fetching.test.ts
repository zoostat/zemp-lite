import { describe, expect, it } from "vitest";
import { FetchError, fetchAll, share, type Carried, type Get, type Progress } from "./fetching";

const bytes = (text: string) => new TextEncoder().encode(text);
const sha = async (text: string) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes(text)))]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

/** A host that sends each file in pieces of three bytes. */
const host =
  (files: Record<string, string>, asked: string[] = []): Get =>
  (url) => {
    asked.push(url);
    const text = files[url];
    if (text === undefined) return Promise.resolve({ ok: false, status: 503, body: null });
    const whole = bytes(text);
    let at = 0;
    return Promise.resolve({
      ok: true,
      status: 200,
      body: new ReadableStream<Uint8Array>({
        pull(controller) {
          if (at >= whole.length) controller.close();
          else controller.enqueue(whole.slice(at, (at += 3)));
        },
      }),
    });
  };

const carried = async (files: Record<string, string>): Promise<Carried[]> =>
  Promise.all(
    Object.entries(files).map(async ([url, text]) => ({
      name: url.slice(1),
      url,
      bytes: bytes(text).length,
      sha256: await sha(text),
    })),
  );

describe("the Paper module fetched the first time a paper is opened", () => {
  const files = { "/module.wasm": "the module, whole", "/font.otf": "a font" };

  it("fetches each file in order, checks it, and gives its bytes", async () => {
    const asked: string[] = [];
    const got = await fetchAll(await carried(files), host(files, asked));
    expect(asked).toEqual(["/module.wasm", "/font.otf"]);
    expect(got.map((one) => new TextDecoder().decode(one))).toEqual([
      "the module, whole",
      "a font",
    ]);
  });

  it("tells how far it has gone: the bytes of all the files, never past their end, and the files that have come whole", async () => {
    const told: Progress[] = [];
    await fetchAll(await carried(files), host(files), (progress) => told.push({ ...progress }));
    const of = 17 + 6;
    expect(told[0]).toEqual({ received: 0, of, files: 0, among: 2 });
    expect(told.at(-1)).toEqual({ received: of, of, files: 2, among: 2 });
    // It only ever goes on.
    const received = told.map((one) => one.received);
    expect(received).toEqual([...received].sort((a, b) => a - b));
    expect(Math.max(...received)).toBe(of);
    // The first file whole is told before the second begins.
    expect(told).toContainEqual({ received: 17, of, files: 1, among: 2 });
    // The share is 100 only when every byte has come.
    expect(told.map(share).at(-1)).toBe(100);
    expect(told.filter((one) => one.received < of).every((one) => share(one) < 100)).toBe(true);
    expect(share({ received: 22, of, files: 1, among: 2 })).toBe(95);
  });

  it("refuses a file that is not the one the build was made with, and one the host does not send", async () => {
    const wanted = await carried(files);
    const other = { ...files, "/font.otf": "a page" };
    await expect(fetchAll(wanted, host(other))).rejects.toThrow(
      "font.otf is not the file this release was built with: its digest differs",
    );
    await expect(fetchAll(wanted, host({ "/module.wasm": files["/module.wasm"] }))).rejects.toThrow(
      new FetchError("font.otf could not be fetched: the host answered 503"),
    );
  });

  it("takes a file the build said nothing of as it comes, and counts nothing for it", async () => {
    const told: Progress[] = [];
    const got = await fetchAll(
      [{ name: "module.wasm", url: "/module.wasm", bytes: null, sha256: null }],
      host(files),
      (progress) => told.push({ ...progress }),
    );
    expect(got).toHaveLength(1);
    expect(told.at(-1)).toEqual({ received: 0, of: 0, files: 1, among: 1 });
    expect(share(told[0] as Progress)).toBe(0);
    expect(share(told.at(-1) as Progress)).toBe(100);
  });
});
