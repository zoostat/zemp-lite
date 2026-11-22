// A zip, written and read (release 0.2.2, step 2), held under Node to a reference: Python's
// `zipfile`, which reads what is written here and writes what is read here. And each archive
// that must be refused, made for the purpose.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { crc32, readZip, writeZip, ZipError, type ZipHeld } from "./zip";

const text = (said: string) => new TextEncoder().encode(said);
const sha = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const LIMITS = { whole: 50_000_000, entries: 1_000 };
const AT = new Date(2026, 10, 22, 14, 30, 8);

/** Bytes that do not deflate: a stream of a small generator, the same at every run. */
function noise(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  let state = 20261122;
  for (let at = 0; at < length; at += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    bytes[at] = state >>> 24;
  }
  return bytes;
}

const PROJECT: ZipHeld = {
  files: [
    { path: "zeff.toml", bytes: text('[project]\nname = "Wages"\n') },
    {
      path: "scripts/main.zeff",
      bytes: text("let w = dataset(wages)\nw.summary([wage])\n".repeat(40)),
    },
    { path: "scripts/études.zeff", bytes: text("// naïve\n") },
    { path: "data/empty.csv", bytes: new Uint8Array(0) },
    { path: "data/deep/down/noise.bin", bytes: noise(4_000) },
  ],
  folders: ["output", "functions"],
};

const folder = mkdtempSync(join(tmpdir(), "zemp-zip-"));
afterAll(() => rmSync(folder, { recursive: true, force: true }));

/** Run a script of the reference; what it prints. */
function reference(script: string, ...given: string[]): string {
  const ran = spawnSync("python3", ["-I", "-c", script, ...given], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (ran.status !== 0) throw new Error(`the reference failed: ${ran.stderr}`);
  return ran.stdout;
}

/** An archive the reference writes, by a script that is given the path to write. */
function written(name: string, script: string): Uint8Array {
  const path = join(folder, name);
  reference(`import sys, zipfile\npath = sys.argv[1]\n${script}`, path);
  return new Uint8Array(readFileSync(path));
}

const refused = async (archive: Uint8Array, limits = LIMITS): Promise<string> => {
  try {
    await readZip(archive, limits);
  } catch (error) {
    expect(error).toBeInstanceOf(ZipError);
    return (error as Error).message;
  }
  throw new Error("the archive was opened");
};

describe("a zip written here", () => {
  it("is read back the same: the files, byte for byte, and the folders that hold none", async () => {
    const held = await readZip(await writeZip(PROJECT, AT), LIMITS);
    const byPath = (a: { path: string }, b: { path: string }) => (a.path < b.path ? -1 : 1);
    expect(held.files.map((file) => [file.path, sha(file.bytes)])).toEqual(
      [...PROJECT.files].sort(byPath).map((file) => [file.path, sha(file.bytes)]),
    );
    expect(held.folders).toEqual(["functions", "output"]);
  });

  it("is the same bytes for the same files at the same moment", async () => {
    expect(sha(await writeZip(PROJECT, AT))).toBe(sha(await writeZip(PROJECT, AT)));
  });

  it("deflates what shrinks and stores what does not", async () => {
    const archive = await writeZip(PROJECT, AT);
    const script =
      "import json, sys, zipfile\nz = zipfile.ZipFile(sys.argv[1])\n" +
      "print(json.dumps({i.filename: i.compress_type for i in z.infolist()}))";
    const path = join(folder, "ours.zip");
    writeFileSync(path, archive);
    const methods = JSON.parse(reference(script, path)) as Record<string, number>;
    expect(methods["scripts/main.zeff"]).toBe(8);
    expect(methods["data/deep/down/noise.bin"]).toBe(0);
    expect(methods["data/empty.csv"]).toBe(0);
  });

  it("is read by the reference: every name, every byte, the folders and the moment", async () => {
    const path = join(folder, "ours.zip");
    writeFileSync(path, await writeZip(PROJECT, AT));
    const script =
      "import hashlib, json, sys, zipfile\nz = zipfile.ZipFile(sys.argv[1])\n" +
      "assert z.testzip() is None\n" +
      "print(json.dumps([[i.filename, hashlib.sha256(z.read(i)).hexdigest(), list(i.date_time), i.is_dir()] for i in z.infolist()]))";
    const read = JSON.parse(reference(script, path)) as [string, string, number[], boolean][];
    const expected = [
      ...PROJECT.folders.map((name) => [`${name}/`, sha(new Uint8Array(0)), true] as const),
      ...PROJECT.files.map((file) => [file.path, sha(file.bytes), false] as const),
    ].sort((a, b) => (a[0] < b[0] ? -1 : 1));
    expect(read.map(([name, digest, , dir]) => [name, digest, dir])).toEqual(expected);
    for (const [, , moment] of read) expect(moment).toEqual([2026, 11, 22, 14, 30, 8]);
  });

  it("refuses to write a path that is not one inside the folder, or one twice", async () => {
    for (const path of ["../out.txt", "/root.txt", "a\\b.txt", "a//b.txt", "C:/x.txt", ""]) {
      await expect(
        writeZip({ files: [{ path, bytes: text("x") }], folders: [] }, AT),
      ).rejects.toThrow(ZipError);
    }
    const twice = {
      files: [
        { path: "a.txt", bytes: text("1") },
        { path: "a.txt", bytes: text("2") },
      ],
      folders: [],
    };
    await expect(writeZip(twice, AT)).rejects.toThrow(ZipError);
  });

  it("computes the CRC-32 of a zip", () => {
    expect(crc32(text("123456789"))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array(0))).toBe(0);
  });
});

describe("a zip the reference writes", () => {
  const FILES =
    "files = {'zeff.toml': b'[project]\\n', 'scripts/main.zeff': b'print(1)\\n' * 500, " +
    "'data/\\u00e9t\\u00e9.csv': b'a,b\\n1,2\\n', 'data/zero.bin': b''}\n";
  const expected = [
    ["data/zero.bin", sha(new Uint8Array(0))],
    ["data/été.csv", sha(text("a,b\n1,2\n"))],
    ["scripts/main.zeff", sha(text("print(1)\n".repeat(500)))],
    ["zeff.toml", sha(text("[project]\n"))],
  ];
  const read = async (archive: Uint8Array) => {
    const held = await readZip(archive, LIMITS);
    return {
      files: held.files
        .map((file) => [file.path, sha(file.bytes)])
        .sort((a, b) => (a[0]! < b[0]! ? -1 : 1)),
      folders: [...held.folders].sort(),
    };
  };

  it("is read where its files are stored", async () => {
    const archive = written(
      "stored.zip",
      `${FILES}z = zipfile.ZipFile(path, 'w', zipfile.ZIP_STORED)\nfor n, b in files.items(): z.writestr(n, b)\nz.close()`,
    );
    expect((await read(archive)).files).toEqual(expected);
  });

  it("is read where its files are deflated, with entries for its folders and a comment at its end", async () => {
    const archive = written(
      "deflated.zip",
      `${FILES}z = zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED)\n` +
        "z.writestr('scripts/', b'')\nz.writestr('output/', b'')\nz.writestr('output/figures/', b'')\n" +
        "for n, b in files.items(): z.writestr(n, b)\nz.comment = b'made by the reference'\nz.close()",
    );
    const held = await read(archive);
    expect(held.files).toEqual(expected);
    // A folder is given where it holds nothing: `scripts` holds a file, `output` a folder.
    expect(held.folders).toEqual(["output/figures"]);
  });

  it("is read where each file's size follows its bytes, as a zip written to a pipe has it", async () => {
    const archive = written(
      "streamed.zip",
      `${FILES}import io\nclass Pipe(io.RawIOBase):\n    def __init__(self, f): self.f = f\n    def writable(self): return True\n    def write(self, b): return self.f.write(b)\n` +
        "z = zipfile.ZipFile(Pipe(open(path, 'wb')), 'w', zipfile.ZIP_DEFLATED)\nfor n, b in files.items(): z.writestr(n, b)\nz.close()",
    );
    expect((await read(archive)).files).toEqual(expected);
  });
});

describe("a zip that is refused, whole, with the reason", () => {
  it("is no zip, or is cut short", async () => {
    expect(await refused(noise(500))).toBe("That file is not a zip, or it is cut short.");
    expect(await refused(new Uint8Array(0))).toBe("That file is not a zip, or it is cut short.");
    const archive = await writeZip(PROJECT, AT);
    expect(await refused(archive.subarray(0, archive.length - 9))).toBe(
      "That file is not a zip, or it is cut short.",
    );
    expect(await refused(archive.subarray(40))).toBe("That file is not a zip, or it is cut short.");
  });

  it("would write outside the project", async () => {
    for (const name of [
      "../evil.txt",
      "scripts/../../evil.txt",
      "/etc/evil",
      "C:/evil.txt",
      "a\\\\evil.txt",
      "./x",
    ]) {
      const archive = written(
        "leaves.zip",
        `z = zipfile.ZipFile(path, 'w')\ni = zipfile.ZipInfo('ok.txt')\ni.filename = '${name}'\nz.writestr(i, b'x')\nz.close()`,
      );
      expect(await refused(archive), name).toMatch(/would be written outside the project/);
    }
  });

  it("holds one path twice, or two that differ only in capitals, or a file where a folder is", async () => {
    const twice = written(
      "twice.zip",
      "import warnings\nwarnings.simplefilter('ignore')\nz = zipfile.ZipFile(path, 'w')\nz.writestr('a.txt', b'1')\nz.writestr('a.txt', b'2')\nz.close()",
    );
    expect(await refused(twice)).toBe("That zip holds `a.txt` twice.");
    const capitals = written(
      "capitals.zip",
      "z = zipfile.ZipFile(path, 'w')\nz.writestr('data/Wages.csv', b'1')\nz.writestr('data/wages.csv', b'2')\nz.close()",
    );
    expect(await refused(capitals)).toBe(
      "That zip holds `data/Wages.csv` and `data/wages.csv`, which differ only in capitals; most computers cannot keep both.",
    );
    const folders = written(
      "folders.zip",
      "z = zipfile.ZipFile(path, 'w')\nz.writestr('Data/a.csv', b'1')\nz.writestr('data/b.csv', b'2')\nz.close()",
    );
    expect(await refused(folders)).toMatch(/`Data` and `data`, which differ only in capitals/);
    const both = written(
      "both.zip",
      "z = zipfile.ZipFile(path, 'w')\nz.writestr('data', b'1')\nz.writestr('data/b.csv', b'2')\nz.close()",
    );
    expect(await refused(both)).toBe("That zip holds `data` both as a file and as a folder.");
  });

  it("is protected by a password, is of the 64-bit kind, or is packed in a way not read", async () => {
    const archive = await writeZip(
      { files: [{ path: "a.txt", bytes: text("secret") }], folders: [] },
      AT,
    );
    const locked = archive.slice();
    // The flag of the directory's entry: its first bit says the file is encrypted.
    const directory = new DataView(locked.buffer).getUint32(locked.length - 6, true);
    locked[directory + 8] = (locked[directory + 8] as number) | 1;
    expect(await refused(locked)).toBe(
      "That zip is protected by a password. Zemp Lite does not open it.",
    );
    // The 64-bit kind: its directory's end counts 65,535 entries and points elsewhere.
    const wide = archive.slice();
    new DataView(wide.buffer).setUint16(wide.length - 22 + 8, 0xffff, true);
    new DataView(wide.buffer).setUint16(wide.length - 22 + 10, 0xffff, true);
    expect(await refused(wide)).toMatch(/of the kind made for more than 4 GB or 65,535 files/);
    const many = written(
      "many.zip",
      "z = zipfile.ZipFile(path, 'w')\nfor n in range(66000): z.writestr('f%d' % n, b'')\nz.close()",
    );
    expect(await refused(many)).toMatch(/of the kind made for more than 4 GB or 65,535 files/);
    // A small file whose own header alone is written the 64-bit way is an ordinary zip, and read.
    const cautious = written(
      "cautious.zip",
      "z = zipfile.ZipFile(path, 'w')\nwith z.open('a.txt', 'w', force_zip64=True) as f: f.write(b'x')\nz.close()",
    );
    expect((await readZip(cautious, LIMITS)).files).toEqual([{ path: "a.txt", bytes: text("x") }]);
    const other = written(
      "bzip2.zip",
      "z = zipfile.ZipFile(path, 'w', zipfile.ZIP_BZIP2)\nz.writestr('a.txt', b'x' * 100)\nz.close()",
    );
    expect(await refused(other)).toMatch(/`a.txt` packed in a way Zemp Lite does not read/);
  });

  it("is damaged: a file does not unpack to what the zip says", async () => {
    for (const bytes of [text("stored as it is"), text("deflated ".repeat(200))]) {
      const archive = await writeZip({ files: [{ path: "a.txt", bytes }], folders: [] }, AT);
      const spoilt = archive.slice();
      // A byte of the file's own, after its header of 30 bytes and its name of 5.
      spoilt[30 + 5 + 3] = (spoilt[30 + 5 + 3] as number) ^ 0x55;
      expect(await refused(spoilt)).toBe(
        "That zip is damaged: `a.txt` does not unpack to what the zip says it holds.",
      );
    }
  });

  it("unpacks to more than the limit, counted as it unpacks and not as it claims", async () => {
    // A hundred megabytes of zeros deflate to a hundred kilobytes.
    const bomb = written(
      "bomb.zip",
      "z = zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED)\nz.writestr('zeros.bin', bytes(100_000_000))\nz.close()",
    );
    expect(bomb.length).toBeLessThan(200_000);
    expect(await refused(bomb)).toBe(
      "That zip unpacks to more than 50 MB, the most a project here may hold. It is not opened.",
    );
    // And where the zip says the file is one kilobyte: the claim is not believed.
    const lying = bomb.slice();
    const view = new DataView(lying.buffer);
    const directory = view.getUint32(lying.length - 6, true);
    view.setUint32(directory + 24, 1_000, true);
    expect(await refused(lying)).toBe(
      "That zip unpacks to more than 50 MB, the most a project here may hold. It is not opened.",
    );
    // Many small files count together.
    const many = await writeZip(
      {
        files: Array.from({ length: 30 }, (_, n) => ({ path: `f${n}.bin`, bytes: noise(1_000) })),
        folders: [],
      },
      AT,
    );
    expect(await refused(many, { whole: 20_000, entries: 1_000 })).toMatch(
      /unpacks to more than 20 kB/,
    );
    expect(await refused(many, { whole: 50_000_000, entries: 10 })).toBe(
      "That zip holds 30 files and folders, more than the 10 a project here may hold.",
    );
  });
});
