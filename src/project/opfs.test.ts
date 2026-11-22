// The browser's private file system as a folder (`OpfsFolder`), on a stand-in for the
// browser's own handles: a file that is being rewritten is, for a moment, one the browser
// will not read, and that must not be taken for a file that is gone.
import { describe, expect, it } from "vitest";
import { OpfsFolder } from "./folder";

/** A folder of the stand-in: its files, which of them fail a read and how often, and what it lists. */
function standIn(files: Record<string, { text: string; fails: number }>, listed: string[]) {
  const asked: Record<string, number> = {};
  const folder = {
    getDirectoryHandle: () => Promise.reject(new DOMException("no folder", "NotFoundError")),
    getFileHandle: (name: string) => {
      asked[name] = (asked[name] ?? 0) + 1;
      const file = files[name];
      if (file === undefined || file.fails >= (asked[name] as number)) {
        return Promise.reject(
          new DOMException(
            "A requested file or directory could not be found at the time an operation was processed.",
            "NotFoundError",
          ),
        );
      }
      return Promise.resolve({
        getFile: () =>
          Promise.resolve({
            arrayBuffer: () => Promise.resolve(new TextEncoder().encode(file.text).buffer),
          }),
      });
    },
    keys: async function* () {
      for (const name of listed) yield await Promise.resolve(name);
    },
  };
  const pauses: number[] = [];
  const opfs = new OpfsFolder(
    Promise.resolve(folder as unknown as FileSystemDirectoryHandle),
    (ms) => {
      pauses.push(ms);
      return Promise.resolve();
    },
  );
  return { opfs, asked, pauses };
}

const text = (bytes: Uint8Array | null) =>
  bytes === null ? null : new TextDecoder().decode(bytes);

describe("a file read from the browser's storage", () => {
  it("is read at once where nothing is in the way", async () => {
    const { opfs, asked, pauses } = standIn({ "views.json": { text: "{}", fails: 0 } }, [
      "views.json",
    ]);
    expect(text(await opfs.read("views.json"))).toBe("{}");
    expect(asked["views.json"]).toBe(1);
    expect(pauses).toEqual([]);
  });

  it("is asked for again where the folder lists it and the browser, for a moment, will not read it", async () => {
    const { opfs, asked, pauses } = standIn({ "main.zeff": { text: "print(1)\n", fails: 3 } }, [
      "main.zeff",
    ]);
    expect(text(await opfs.read("main.zeff"))).toBe("print(1)\n");
    expect(asked["main.zeff"]).toBe(4);
    // A little later each time.
    expect(pauses).toEqual([25, 50, 75]);
  });

  it("is asked for again where only its swap file is listed, as while Chromium writes it", async () => {
    const { opfs, asked } = standIn({ "views.json": { text: "{}", fails: 2 } }, [
      "views.json.crswap",
    ]);
    expect(text(await opfs.read("views.json"))).toBe("{}");
    expect(asked["views.json"]).toBe(3);
  });

  it("is said to be gone at once where the folder does not list it", async () => {
    const { opfs, asked, pauses } = standIn({}, ["main.zeff"]);
    expect(await opfs.read("views.json")).toBeNull();
    expect(asked["views.json"]).toBe(1);
    expect(pauses).toEqual([]);
  });

  it("is given up after about two seconds where it is listed and never read", async () => {
    const { opfs, asked, pauses } = standIn({ "main.zeff": { text: "x", fails: 1_000 } }, [
      "main.zeff",
    ]);
    expect(await opfs.read("main.zeff")).toBeNull();
    expect(asked["main.zeff"]).toBe(12);
    expect(pauses.reduce((sum, ms) => sum + ms, 0)).toBe(1_650);
  });
});
