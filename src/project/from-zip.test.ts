// A zip opened as a new project (release 0.2.2, step 5): what the zip's files become, how the
// project is named, and that there is the whole project or none of it.
import { describe, expect, it } from "vitest";
import { MemoryFolder } from "./folder";
import { limitsFor, projectOf } from "./from-zip";
import { ProjectError, Projects, freeName, manifest, renamed } from "./projects";
import type { ZipHeld } from "./zip";

const text = (said: string) => new TextEncoder().encode(said);
const read = (bytes: Uint8Array | null) =>
  bytes === null ? null : new TextDecoder().decode(bytes);
const TOML = manifest("Wages");

function kept() {
  const all = new Map<string, string>();
  return {
    getItem: (key: string) => all.get(key) ?? null,
    setItem: (key: string, value: string) => void all.set(key, value),
  };
}

const held = (files: Record<string, string>, folders: string[] = []): ZipHeld => ({
  files: Object.entries(files).map(([path, said]) => ({ path, bytes: text(said) })),
  folders,
});

describe("the project a zip holds", () => {
  it("is what lies in the one folder at the zip's top, as Export project… writes it", () => {
    const from = projectOf(
      held(
        {
          "Wages/zeff.toml": TOML,
          "Wages/scripts/main.zeff": "print(1)\n",
          "Wages/data/a.csv": "x\n",
        },
        ["Wages/output"],
      ),
    );
    expect(from.name).toBe("Wages");
    expect(from.toml).toBe(TOML);
    expect(from.files.map((file) => file.path)).toEqual([
      "zeff.toml",
      "scripts/main.zeff",
      "data/a.csv",
    ]);
    expect(from.folders).toEqual(["output"]);
  });

  it("is the zip's top itself where `zeff.toml` lies there", () => {
    const from = projectOf(
      held({ "zeff.toml": TOML, "scripts/main.zeff": "print(1)\n" }, ["data"]),
    );
    expect(from.files.map((file) => file.path)).toEqual(["zeff.toml", "scripts/main.zeff"]);
    expect(from.folders).toEqual(["data"]);
  });

  it("leaves out what a computer's file manager adds, and the app's and the engine's own folders", () => {
    const from = projectOf(
      held({
        "Wages/zeff.toml": TOML,
        "Wages/scripts/main.zeff": "print(1)\n",
        "Wages/.DS_Store": "junk",
        "Wages/data/.DS_Store": "junk",
        "__MACOSX/Wages/._zeff.toml": "junk",
        "Wages/.zemp/views.json": "{}",
        "Wages/.zeff/session.zeff": "print(2)\n",
        "Wages/.gitignore": "data/\n",
      }),
    );
    expect(from.files.map((file) => file.path)).toEqual([
      "zeff.toml",
      "scripts/main.zeff",
      ".gitignore",
    ]);
  });

  it("is refused where the zip has no `zeff.toml` at its top, in a sentence that says what a project's zip holds", () => {
    const sentence =
      "That zip holds no project: a project's zip has `zeff.toml` at its top, or in the one folder at its top, as Export project… writes it.";
    const without: Record<string, string>[] = [
      { "notes.txt": "x" },
      { "a/zeff.toml": TOML, "b/other.txt": "x" },
      { "Wages/inner/zeff.toml": TOML },
    ];
    for (const files of without) {
      expect(() => projectOf(held(files))).toThrow(new ProjectError(sentence));
    }
    expect(() => projectOf({ files: [], folders: [] })).toThrow(ProjectError);
    const binary = {
      files: [{ path: "zeff.toml", bytes: new Uint8Array([0xff, 0xfe, 0x00]) }],
      folders: [],
    };
    expect(() => projectOf(binary)).toThrow(
      "That zip's `zeff.toml` is not text. It is not opened.",
    );
  });
});

describe("a manifest with its project named anew", () => {
  it("rewrites the line of the name and keeps its comment at its column, every other character as it was", () => {
    // `zeff new` sets a comment in column 26: the name's line keeps it there.
    const line = (name: string, gap: number) =>
      `name = "${name}"${" ".repeat(gap)}# the project's name`;
    expect(TOML).toContain(line("Wages", 12));
    expect(renamed(TOML, "Pay")).toBe(TOML.replace(line("Wages", 12), line("Pay", 14)));
    expect(renamed(TOML, "Wages 2")).toBe(TOML.replace(line("Wages", 12), line("Wages 2", 10)));
    // A name that reaches past the comment's column leaves one space before it.
    const long = "Returns to schooling, 2010 to 2021";
    expect(renamed(TOML, long)).toBe(TOML.replace(line("Wages", 12), line(long, 1)));
    expect(renamed(TOML, 'say "hi"')).toContain('name = "say \\"hi\\""');
    expect(renamed(renamed(TOML, "Pay"), "Wages")).toBe(TOML);
  });

  it("keeps a manifest's own way of writing, and gives a name to one that has none", () => {
    expect(renamed('[project]\nname="a"\nzeff = "0.8.0"\n', "b")).toBe(
      '[project]\nname="b"\nzeff = "0.8.0"\n',
    );
    expect(renamed('[project]\nzeff = "0.8.0"\n', "b")).toBe(
      '[project]\nname = "b"\nzeff = "0.8.0"\n',
    );
    expect(renamed('zeff = "0.8.0"\n', "b")).toBe('[project]\nname = "b"\nzeff = "0.8.0"\n');
  });

  it("finds a name no project has, whatever the capitals", () => {
    expect(freeName("Wages", [])).toBe("Wages");
    expect(freeName("Wages", ["wages"])).toBe("Wages 2");
    expect(freeName("Wages", ["Wages", "WAGES 2", "Other"])).toBe("Wages 3");
  });
});

describe("a project made of a zip", () => {
  const from = () =>
    projectOf(
      held({ "Wages/zeff.toml": TOML, "Wages/scripts/main.zeff": "print(1)\n" }, ["Wages/data"]),
    );

  it("is written as the zip has it, under its own name, and listed", async () => {
    const root = new MemoryFolder();
    const projects = new Projects(root, kept());
    const made = await projects.adopt(from(), "fallback");
    expect(made).toEqual({ folder: "wages", name: "Wages", opened: null, exported: null });
    expect(read(await root.read("projects/wages/zeff.toml"))).toBe(TOML);
    expect(read(await root.read("projects/wages/scripts/main.zeff"))).toBe("print(1)\n");
    expect(await root.kind("projects/wages/data")).toBe("folder");
    expect((await projects.list()).map((one) => one.name)).toEqual(["Wages"]);
  });

  it("takes a number after its name where that name is here already, in its manifest too", async () => {
    const root = new MemoryFolder();
    const projects = new Projects(root, kept());
    await projects.create("Wages");
    const second = await projects.adopt(from(), "fallback");
    expect(second).toMatchObject({ folder: "wages-2", name: "Wages 2" });
    expect(read(await root.read("projects/wages-2/zeff.toml"))).toBe(renamed(TOML, "Wages 2"));
    expect(await projects.adopt(from(), "fallback")).toMatchObject({
      folder: "wages-3",
      name: "Wages 3",
    });
    // The Scratch project's name is its own, whether or not it has been made.
    const scratch = projectOf(held({ "zeff.toml": manifest("Scratch"), "scripts/main.zeff": "" }));
    expect(await projects.adopt(scratch, "fallback")).toMatchObject({
      folder: "scratch-2",
      name: "Scratch 2",
    });
  });

  it("takes the name of its file where its manifest gives none", async () => {
    const projects = new Projects(new MemoryFolder(), kept());
    const nameless = projectOf(held({ "zeff.toml": 'zeff = "0.8.0"\n', "scripts/main.zeff": "" }));
    const made = await projects.adopt(nameless, "Sent by a colleague");
    expect(made.name).toBe("Sent by a colleague");
    expect((await projects.list())[0]?.name).toBe("Sent by a colleague");
  });

  it("is the whole project or none of it: a file that cannot be written leaves nothing behind", async () => {
    class Failing extends MemoryFolder {
      override write(path: string, bytes: Uint8Array): Promise<void> {
        return path.endsWith("main.zeff")
          ? Promise.reject(new Error("the storage is full"))
          : super.write(path, bytes);
      }
    }
    const root = new Failing();
    const projects = new Projects(root, kept());
    await expect(projects.adopt(from(), "fallback")).rejects.toThrow("the storage is full");
    expect(await root.kind("projects/wages")).toBeNull();
    expect(await projects.list()).toEqual([]);
  });
});

describe("the most a zip may unpack to", () => {
  it("is the engine's memory budget for a window of the browser", () => {
    expect(limitsFor(undefined).whole).toBe(3_500_000_000);
    expect(limitsFor(8).whole).toBe(3_500_000_000);
    expect(limitsFor(4).whole).toBe(2 * 2 ** 30);
    expect(limitsFor(0.5).whole).toBe(2 ** 28);
    expect(limitsFor(4).entries).toBe(65_534);
  });
});
