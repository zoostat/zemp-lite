// A project as a zip for the computer (release 0.2.2, step 3): what it holds, what it leaves
// out, and how it is named.
import { describe, expect, it } from "vitest";
import { exportFolder, exportProject, fileNameOf } from "./export";
import { MemoryFolder } from "./folder";
import { Projects } from "./projects";
import { readZip } from "./zip";

const LIMITS = { whole: 10_000_000, entries: 1_000 };
const AT = Date.UTC(2026, 10, 22, 12);
const text = (said: string) => new TextEncoder().encode(said);
const read = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

/** A browser's record of small things, in memory. */
function kept(): {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
} {
  const all = new Map<string, string>();
  return {
    getItem: (key) => all.get(key) ?? null,
    setItem: (key, value) => void all.set(key, value),
  };
}

async function made(name: string) {
  let now = 1_000;
  const projects = new Projects(new MemoryFolder(), kept(), () => now);
  const info = await projects.create(name);
  const project = (await projects.open(info.folder))!;
  return { projects, project, tick: (to: number) => (now = to) };
}

describe("a project exported", () => {
  it("is one folder of the project's name, holding the project as the command line would find it", async () => {
    const { project } = await made("Returns to schooling");
    await project.write("data/pay.csv", text("id,wage\n1,23.5\n"));
    await project.write("output/figures/one.svg", text("<svg/>"));
    await project.write("notes.txt", text("mine"));
    const exported = await exportProject(project, AT);
    expect(exported.name).toBe("Returns to schooling.zip");
    const held = await readZip(exported.bytes, LIMITS);
    expect(held.files.map((file) => file.path)).toEqual([
      "Returns to schooling/data/pay.csv",
      "Returns to schooling/notes.txt",
      "Returns to schooling/output/figures/one.svg",
      "Returns to schooling/scripts/main.zeff",
      "Returns to schooling/zeff.toml",
    ]);
    expect(held.folders).toEqual([]);
    const file = (path: string) => held.files.find((one) => one.path.endsWith(path))!.bytes;
    expect(read(file("data/pay.csv"))).toBe("id,wage\n1,23.5\n");
    expect(read(file("zeff.toml"))).toBe(await project.readText("zeff.toml"));
    expect(read(file("scripts/main.zeff"))).toBe("// Returns to schooling\n");
  });

  it("keeps a folder that holds nothing, so that an empty data/ comes back", async () => {
    const { project } = await made("Empty");
    const held = await readZip((await exportProject(project, AT)).bytes, LIMITS);
    expect(held.folders).toEqual(["Empty/data"]);
  });

  it("leaves out the interface's own folder and the engine's own", async () => {
    const { project } = await made("Wages");
    await project.write(".zemp/views.json", text("{}"));
    await project.write(".zeff/session.zeff", text("print(1)\n"));
    await project.write(".zeff/cache/a.bin", text("x"));
    await project.write(".gitignore", text("data/\n"));
    const held = await readZip((await exportProject(project, AT)).bytes, LIMITS);
    const paths = held.files.map((file) => file.path);
    expect(paths.filter((path) => path.includes(".zemp") || path.includes(".zeff/"))).toEqual([]);
    // A file of the visitor's own whose name begins with a dot is the project's.
    expect(paths).toContain("Wages/.gitignore");
  });

  it("is the same bytes for the same project at the same moment", async () => {
    const { project } = await made("Wages");
    const one = await exportProject(project, AT);
    const two = await exportProject(project, AT);
    expect([...one.bytes]).toEqual([...two.bytes]);
  });

  it("names its file and its folder so that any computer can keep them", () => {
    expect(fileNameOf("Returns to schooling")).toBe("Returns to schooling");
    expect(fileNameOf("wages: 2010/2021?")).toBe("wages- 2010-2021");
    expect(fileNameOf('a<b>c"d|e*f\\g')).toBe("a-b-c-d-e-f-g");
    expect(fileNameOf("  .hidden. ")).toBe("hidden");
    expect(fileNameOf("été à Paris")).toBe("été à Paris");
    expect(fileNameOf("...")).toBe("project");
    expect(fileNameOf("tab\there")).toBe("tab-here");
  });

  it("is remembered: when a project was exported is kept by its folder, and listed", async () => {
    const { projects, project, tick } = await made("Wages");
    expect(project.info.exported).toBeNull();
    expect((await projects.list())[0]?.exported).toBeNull();
    tick(5_000);
    project.noteExported();
    expect(project.info.exported).toBe(5_000);
    expect((await projects.list())[0]?.exported).toBe(5_000);
    expect((await projects.open(project.info.folder))?.info.exported).toBe(5_000);
  });

  it("is read without being opened: a project looked into keeps its place in the list", async () => {
    const { projects, tick } = await made("First");
    await projects.create("Second");
    tick(9_000);
    const before = (await projects.list()).map((one) => [one.name, one.opened]);
    const looked = await projects.peek("second");
    expect(looked?.info.name).toBe("Second");
    expect((await projects.list()).map((one) => [one.name, one.opened])).toEqual(before);
    expect(await projects.peek("none")).toBeNull();
  });
});

describe("a folder of a project saved as a zip", () => {
  it("is named by the folder and holds what the folder holds, under its name", async () => {
    const { project } = await made("Wages");
    await project.write("output/figures/one.svg", text("<svg/>"));
    await project.write("output/table.csv", text("a\n1\n"));
    const exported = await exportFolder(project, "output", AT);
    expect(exported.name).toBe("output.zip");
    const held = await readZip(exported.bytes, LIMITS);
    expect(held.files.map((file) => file.path)).toEqual([
      "output/figures/one.svg",
      "output/table.csv",
    ]);
    const inner = await exportFolder(project, "output/figures", AT);
    expect(inner.name).toBe("figures.zip");
    expect((await readZip(inner.bytes, LIMITS)).files.map((file) => file.path)).toEqual([
      "figures/one.svg",
    ]);
    // A folder with nothing in it is still a zip of that folder.
    expect(
      (await readZip((await exportFolder(project, "data", AT)).bytes, LIMITS)).folders,
    ).toEqual(["data"]);
  });
});
