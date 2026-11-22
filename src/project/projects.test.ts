import { describe, expect, it } from "vitest";
import type { Kept } from "../theme/theme";
import { BadPath, Inside, MemoryFolder, parts } from "./folder";
import { ProjectError, Projects, SCRATCH, folderOf, manifest, nameIn, when } from "./projects";

const bytes = (text: string) => new TextEncoder().encode(text);

function kept(): Kept & { held: Record<string, string> } {
  const held: Record<string, string> = {};
  return {
    held,
    getItem: (key) => held[key] ?? null,
    setItem: (key, value) => {
      held[key] = value;
    },
  };
}

/** The projects of an empty browser, with a clock a test sets. */
function empty(): { projects: Projects; root: MemoryFolder; clock: { now: number } } {
  const root = new MemoryFolder();
  const clock = { now: 1_000 };
  return { projects: new Projects(root, kept(), () => clock.now), root, clock };
}

describe("a folder", () => {
  it("takes a path apart, and refuses one that would leave it", () => {
    expect(parts("")).toEqual([]);
    expect(parts("scripts/main.zeff")).toEqual(["scripts", "main.zeff"]);
    for (const path of ["..", "a/../b", "/a", "a/", "a//b", ".", "a\\b"]) {
      expect(() => parts(path), path).toThrow(BadPath);
    }
  });

  it("keeps files in folders made as they are needed", async () => {
    const folder = new MemoryFolder();
    await folder.write("data/raw/pay.csv", bytes("id\n1\n"));
    await folder.write("zeff.toml", bytes("x"));
    await folder.make("output");
    expect(await folder.list("")).toEqual([
      { name: "data", kind: "folder", size: 0 },
      { name: "output", kind: "folder", size: 0 },
      { name: "zeff.toml", kind: "file", size: 1 },
    ]);
    expect(await folder.list("data/raw")).toEqual([{ name: "pay.csv", kind: "file", size: 5 }]);
    expect(await folder.list("nowhere")).toEqual([]);
    expect(await folder.read("data/raw/pay.csv")).toEqual(bytes("id\n1\n"));
    expect(await folder.read("data/raw")).toBeNull();
    expect(await folder.read("data/none.csv")).toBeNull();
    await expect(folder.write("data", bytes("x"))).rejects.toThrow(BadPath);
    await folder.remove("data");
    expect(await folder.list("")).toHaveLength(2);
    await folder.remove("data");
  });

  it("gives a copy of a file's bytes, so that a reader cannot change the file", async () => {
    const folder = new MemoryFolder();
    await folder.write("a.txt", bytes("abc"));
    const read = await folder.read("a.txt");
    read!.fill(0);
    expect(await folder.read("a.txt")).toEqual(bytes("abc"));
  });

  it("holds a folder inside another to its own paths", async () => {
    const outer = new MemoryFolder();
    const inner = new Inside(outer, "projects/demo");
    await inner.write("scripts/main.zeff", bytes("1\n"));
    expect(await outer.read("projects/demo/scripts/main.zeff")).toEqual(bytes("1\n"));
    expect(await inner.list("")).toEqual([{ name: "scripts", kind: "folder", size: 0 }]);
    expect(() => inner.read("../other/zeff.toml")).toThrow(BadPath);
  });
});

describe("the projects of a browser", () => {
  it("names a project's folder by its letters and digits", () => {
    expect(folderOf("Returns to schooling")).toBe("returns-to-schooling");
    expect(folderOf("  Wage panel, 2026!  ")).toBe("wage-panel-2026");
    expect(folderOf("teaching · week 6")).toBe("teaching-week-6");
    expect(folderOf("Löhne")).toMatch(/^lo.?hne$/);
    expect(folderOf("***")).toBe("project");
  });

  it("writes the manifest `zeff new` of the same engine writes, to the character, and reads the name back", () => {
    // What the released command line of Zeff 0.8.0 writes for `zeff new demo`.
    expect(manifest("demo")).toBe(
      "[project]\n" +
        'name = "demo"             # the project\'s name\n' +
        'zeff = "0.8.0"            # the engine this project runs on, exactly\n' +
        'edition = "preview"       # "2027" from Zeff 1.0.0\n',
    );
    expect(nameIn(manifest("demo"))).toBe("demo");
    // A name too long for the 26 columns pushes its comment along; the name is still read back.
    const long = "Returns to schooling, a second look";
    expect(manifest(long)).toContain(`name = "${long}"# the project's name\n`);
    expect(nameIn(manifest(long))).toBe(long);
    expect(nameIn(manifest('A "quoted" name'))).toBe('A "quoted" name');
    expect(nameIn('[project]\n  name = "x"  # the name\n')).toBe("x");
    expect(nameIn('[project]\nzeff = "0.8.0"\n')).toBeNull();
  });

  it("creates a project with its manifest, a script and a data folder, and lists it", async () => {
    const { projects, root } = empty();
    expect(await projects.list()).toEqual([]);
    const made = await projects.create("  Returns to schooling ");
    expect(made).toEqual({
      folder: "returns-to-schooling",
      name: "Returns to schooling",
      opened: null,
      exported: null,
    });
    expect(await projects.list()).toEqual([made]);
    const project = await projects.open(made.folder);
    expect(await project!.readText("zeff.toml")).toBe(manifest("Returns to schooling"));
    expect(await project!.readText("scripts/main.zeff")).toBe("// Returns to schooling\n");
    expect((await root.list("projects/returns-to-schooling")).map((entry) => entry.name)).toEqual([
      "data",
      "scripts",
      "zeff.toml",
    ]);
  });

  it("refuses a name already taken, no name, and a name too long", async () => {
    const { projects } = empty();
    await projects.create("Wages");
    await expect(projects.create("wages")).rejects.toThrow(
      'A project called "wages" is already here. Choose another name.',
    );
    await expect(projects.create("   ")).rejects.toThrow(ProjectError);
    await expect(projects.create("x".repeat(81))).rejects.toThrow("at most 80 characters");
    await projects.scratch();
    await expect(projects.create("Scratch")).rejects.toThrow("the Scratch project's");
    expect(await projects.list()).toHaveLength(2);
  });

  it("has a Scratch project, made once with the example and kept as the user leaves it", async () => {
    const { projects } = empty();
    const scratch = await projects.scratch();
    expect(scratch).toEqual({ folder: SCRATCH, name: "Scratch", opened: null, exported: null });
    const project = await projects.open(SCRATCH);
    const script = await project!.readText("scripts/main.zeff");
    expect(script).toContain("let wages = dataset(wages)");
    await project!.writeText("scripts/main.zeff", "print(1)\n");
    await projects.scratch();
    expect(await project!.readText("scripts/main.zeff")).toBe("print(1)\n");
  });

  it("gives a Scratch project made before an example came that example, once", async () => {
    const root = new MemoryFolder();
    const store = kept();
    // A Scratch project of an earlier release: the returns to schooling and the instruments.
    await root.write("projects/scratch/zeff.toml", bytes(manifest("Scratch")));
    await root.write("projects/scratch/scripts/main.zeff", bytes("print(1)\n"));
    await root.write("projects/scratch/scripts/instruments.zeff", bytes("// mine\n"));
    const projects = new Projects(root, store);
    await projects.scratch();
    const project = await projects.open(SCRATCH);
    // The showcase of plots is added; what the user had is as it was.
    expect(await project!.readText("scripts/plots.zeff")).toMatch(/^\/\/ Plots in Zeff/);
    expect(await project!.readText("scripts/main.zeff")).toBe("print(1)\n");
    expect(await project!.readText("scripts/instruments.zeff")).toBe("// mine\n");
    // Deleted, an example given once is not given again.
    await root.remove("projects/scratch/scripts/plots.zeff");
    await projects.scratch();
    expect(await project!.readText("scripts/plots.zeff")).toBeNull();
    // A new browser's Scratch project has all three.
    const fresh = empty();
    await fresh.projects.scratch();
    const scratch = await fresh.projects.open(SCRATCH);
    for (const name of ["main", "instruments", "plots"]) {
      expect(await scratch!.readText(`scripts/${name}.zeff`), name).not.toBeNull();
    }
  });

  it("lists the project opened last first, and those never opened by name", async () => {
    const { projects, clock } = empty();
    await projects.create("beta");
    await projects.create("alpha");
    await projects.create("gamma");
    clock.now = 5_000;
    await projects.open("gamma");
    clock.now = 9_000;
    await projects.open("beta");
    expect((await projects.list()).map((info) => [info.folder, info.opened])).toEqual([
      ["beta", 9_000],
      ["gamma", 5_000],
      ["alpha", null],
    ]);
    expect(await projects.open("nowhere")).toBeNull();
  });

  it("removes a project and forgets when it was opened", async () => {
    const { projects } = empty();
    await projects.create("gone");
    await projects.open("gone");
    await projects.remove("gone");
    expect(await projects.list()).toEqual([]);
    await projects.create("gone");
    expect((await projects.list())[0]!.opened).toBeNull();
  });
});

describe("an open project", () => {
  async function demo() {
    const { projects } = empty();
    await projects.create("demo");
    return (await projects.open("demo"))!;
  }

  it("shows its files as a tree, folders first, without the interface's own folder", async () => {
    const project = await demo();
    await project.writeText(".zemp/views.json", "{}");
    await project.writeText("scripts/extra.zeff", "2\n");
    expect(await project.tree()).toEqual([
      { name: "data", kind: "folder", size: 0, path: "data", children: [] },
      {
        name: "scripts",
        kind: "folder",
        size: 0,
        path: "scripts",
        children: [
          { name: "extra.zeff", kind: "file", size: 2, path: "scripts/extra.zeff", children: [] },
          { name: "main.zeff", kind: "file", size: 8, path: "scripts/main.zeff", children: [] },
        ],
      },
      { name: "zeff.toml", kind: "file", size: 177, path: "zeff.toml", children: [] },
    ]);
    expect((await project.files()).map((file) => file.path)).toEqual([
      "scripts/extra.zeff",
      "scripts/main.zeff",
      "zeff.toml",
    ]);
  });

  it("renames a file, and refuses a path already taken", async () => {
    const project = await demo();
    await project.writeText("scripts/extra.zeff", "2\n");
    await project.rename("scripts/extra.zeff", "scripts/second.zeff");
    expect(await project.readText("scripts/extra.zeff")).toBeNull();
    expect(await project.readText("scripts/second.zeff")).toBe("2\n");
    await expect(project.rename("scripts/second.zeff", "scripts/main.zeff")).rejects.toThrow(
      "`scripts/main.zeff` is already in this project",
    );
    await expect(project.rename("scripts/second.zeff", "data")).rejects.toThrow(ProjectError);
    await expect(project.rename("scripts/none.zeff", "scripts/x.zeff")).rejects.toThrow(
      "There is no file",
    );
    await project.rename("scripts/second.zeff", "scripts/second.zeff");
    expect(await project.readText("scripts/second.zeff")).toBe("2\n");
  });

  it("adds a data file under data/ and writes nothing into a script", async () => {
    const project = await demo();
    const script = await project.readText("scripts/main.zeff");
    expect(await project.addData("pay.csv", bytes("id\n1\n"))).toBe("data/pay.csv");
    expect(await project.readText("data/pay.csv")).toBe("id\n1\n");
    expect(await project.readText("scripts/main.zeff")).toBe(script);
    await expect(project.addData("pay.csv", bytes("x"))).rejects.toThrow("already in this project");
    expect(await project.addData("a/b.csv", bytes("x"))).toBe("data/a-b.csv");
    await expect(project.addData("..", bytes("x"))).rejects.toThrow(ProjectError);
  });
});

describe("when a project was opened", () => {
  const now = new Date(2026, 10, 15, 15, 30).getTime();
  it("is said as the welcome screen says it", () => {
    expect(when(null, now)).toBe("not opened yet");
    expect(when(new Date(2026, 10, 15, 10, 42).getTime(), now)).toBe("today, 10:42");
    expect(when(new Date(2026, 10, 15, 9, 5).getTime(), now)).toBe("today, 9:05");
    expect(when(new Date(2026, 10, 14, 23, 59).getTime(), now)).toBe("yesterday");
    expect(when(new Date(2026, 10, 3, 12, 0).getTime(), now)).toBe("3 November");
    expect(when(new Date(2025, 11, 24, 12, 0).getTime(), now)).toBe("24 December 2025");
  });
});
