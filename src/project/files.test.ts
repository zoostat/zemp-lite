// The operations on a project's files and folders (release 0.2.2, step 7), on a folder kept in
// memory and on one that fails at a write the test chooses.
import { describe, expect, it } from "vitest";
import { ProjectError } from "./error";
import {
  add,
  count,
  duplicate,
  fixed,
  move,
  nameProblem,
  newFolder,
  newPaper,
  newScript,
  remove,
} from "./files";
import { MemoryFolder } from "./folder";

const text = (said: string) => new TextEncoder().encode(said);
const read = async (files: MemoryFolder, path: string) => {
  const bytes = await files.read(path);
  return bytes === null ? null : new TextDecoder().decode(bytes);
};

/** A project's folder as `zeff new` leaves it, with a little more in it. */
async function project(folder: MemoryFolder = new MemoryFolder()): Promise<MemoryFolder> {
  await folder.write("zeff.toml", text('[project]\nname = "Wages"\n'));
  await folder.write("scripts/main.zeff", text("print(1)\n"));
  await folder.write("scripts/clean.zeff", text("print(2)\n"));
  await folder.write("data/pay.csv", text("id,wage\n1,23.5\n"));
  await folder.write("output/figures/one.svg", text("<svg/>"));
  await folder.write("output/table.csv", text("a\n1\n"));
  await folder.make("output/empty");
  await folder.write(".zemp/views.json", text("{}"));
  return folder;
}

/** Every file under a folder, by its path. */
async function all(files: MemoryFolder, path = ""): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await files.list(path)) {
    const at = path === "" ? entry.name : `${path}/${entry.name}`;
    if (entry.kind === "file") found.push(at);
    else found.push(...(await all(files, at)));
  }
  return found.sort();
}

/** A folder whose writing of a path the test names fails, as a storage that is full does. */
class Failing extends MemoryFolder {
  failAt: string | null = null;
  override write(path: string, bytes: Uint8Array): Promise<void> {
    return path === this.failAt
      ? Promise.reject(new Error("the storage is full"))
      : super.write(path, bytes);
  }
}

describe("a name of a file or a folder", () => {
  it("is one part of a path, with nothing a path cannot hold", () => {
    expect(nameProblem("wages 2021.csv")).toBeNull();
    expect(nameProblem("été.zeff")).toBeNull();
    expect(nameProblem("")).toBe("It needs a name.");
    expect(nameProblem("   ")).toBe("It needs a name.");
    expect(nameProblem(" a")).toBe("A name does not begin or end with a space.");
    expect(nameProblem("..")).toBe("`.` and `..` are not names: choose another.");
    expect(nameProblem("a/b")).toMatch(/one part of a path/);
    expect(nameProblem("a\\b")).toMatch(/one part of a path/);
    expect(nameProblem("a\nb")).toBe("A name holds no line break or other control character.");
    expect(nameProblem("x".repeat(121))).toBe("A name is at most 120 characters.");
    expect(nameProblem("x".repeat(120))).toBeNull();
  });

  it("is fixed where the engine and Zemp open the thing by its name, or it is their own", () => {
    for (const path of [
      "zeff.toml",
      "scripts",
      "functions",
      "data",
      "scripts/main.zeff",
      ".zemp",
      ".zemp/views.json",
      ".zeff/cache/x",
    ]) {
      expect(fixed(path), path).toBe(true);
    }
    for (const path of [
      "scripts/clean.zeff",
      "data/pay.csv",
      "output",
      "output/table.csv",
      "notes.txt",
      "scripts/zeff.toml",
    ]) {
      expect(fixed(path), path).toBe(false);
    }
  });
});

describe("a script, a folder and a file made in a project", () => {
  it("makes a script, empty, in scripts/ or the folder named, with `.zeff` where the name lacks it", async () => {
    const files = await project();
    expect(await newScript(files, "robustness")).toBe("scripts/robustness.zeff");
    expect(await read(files, "scripts/robustness.zeff")).toBe("");
    expect(await newScript(files, "second.zeff")).toBe("scripts/second.zeff");
    expect(await newScript(files, "Third.ZEFF")).toBe("scripts/Third.ZEFF");
    await newFolder(files, "drafts", "scripts");
    expect(await newScript(files, "idea", "scripts/drafts")).toBe("scripts/drafts/idea.zeff");
  });

  it("makes a paper in the folder for papers, which it makes where it is not there, with `.typ` and its first lines", async () => {
    const files = await project();
    expect(await files.kind("paper")).toBe(null);
    expect(await newPaper(files, "returns", "paper", text("= Returns\n"))).toBe(
      "paper/returns.typ",
    );
    expect(await read(files, "paper/returns.typ")).toBe("= Returns\n");
    // A second, in the folder that is now there; a name with its ending keeps it as typed.
    expect(await newPaper(files, " Second.TYP ", "paper", text(""))).toBe("paper/Second.TYP");
    // A name taken, or one that differs only in capitals, is refused, and nothing is written over.
    await expect(newPaper(files, "returns", "paper", text("other"))).rejects.toThrow(
      new ProjectError("`paper/returns.typ` is already in this project. Choose another name."),
    );
    await expect(newPaper(files, "RETURNS", "paper", text("other"))).rejects.toThrow(
      /differs from that name only in capitals/,
    );
    expect(await read(files, "paper/returns.typ")).toBe("= Returns\n");
  });

  it("makes no folder for a paper whose name cannot be given, and none over a file of that name", async () => {
    const files = await project();
    await expect(newPaper(files, "", "paper", text(""))).rejects.toThrow(
      new ProjectError("It needs a name."),
    );
    await expect(newPaper(files, "a/b", "paper", text(""))).rejects.toThrow(/one part of a path/);
    expect(await files.kind("paper")).toBe(null);
    await files.write("paper", text("a file, not a folder"));
    await expect(newPaper(files, "returns", "paper", text(""))).rejects.toThrow(
      /`paper` is a file of this project/,
    );
    expect(await read(files, "paper")).toBe("a file, not a folder");
  });

  it("makes a folder, in the project or in a folder of it", async () => {
    const files = await project();
    expect(await newFolder(files, "notes")).toBe("notes");
    expect(await files.kind("notes")).toBe("folder");
    expect(await newFolder(files, "2021", "data")).toBe("data/2021");
    expect(await files.kind("data/2021")).toBe("folder");
  });

  it("adds a file into any folder under its own name, and writes nothing into a script", async () => {
    const files = await project();
    expect(await add(files, "output", "notes.txt", text("mine"))).toBe("output/notes.txt");
    expect(await add(files, "", "README.md", text("# read me"))).toBe("README.md");
    // What a path cannot hold becomes a hyphen.
    expect(await add(files, "data", "2021/pay.csv", text("x"))).toBe("data/2021-pay.csv");
    expect(await read(files, "scripts/main.zeff")).toBe("print(1)\n");
  });

  it("refuses a name that is none, one taken, one that differs only in capitals, and a place that is not there or not the reader's", async () => {
    const files = await project();
    await expect(newScript(files, "")).rejects.toThrow(new ProjectError("It needs a name."));
    await expect(newScript(files, "a/b")).rejects.toThrow(/one part of a path/);
    await expect(newScript(files, "main")).rejects.toThrow(
      "`scripts/main.zeff` is already in this project. Choose another name.",
    );
    await expect(newScript(files, "Clean")).rejects.toThrow(
      "`scripts/clean.zeff` is already in this project, and differs from that name only in capitals; most computers cannot keep both. Choose another name.",
    );
    await expect(newFolder(files, "Data")).rejects.toThrow(
      /differs from that name only in capitals/,
    );
    await expect(newFolder(files, "x", "nowhere")).rejects.toThrow(
      "There is no folder `nowhere` in this project.",
    );
    await expect(newFolder(files, "x", "scripts/main.zeff")).rejects.toThrow(/There is no folder/);
    await expect(add(files, ".zemp", "x.json", text("{}"))).rejects.toThrow(
      "`.zemp` is kept by Zemp and the engine. Choose another place.",
    );
    await expect(newFolder(files, ".zeff")).rejects.toThrow(/kept by Zemp and the engine/);
    await expect(add(files, "data", "pay.csv", text("x"))).rejects.toThrow(
      /already in this project/,
    );
    // Nothing was made by any of them.
    expect(await all(files)).toEqual([
      ".zemp/views.json",
      "data/pay.csv",
      "output/figures/one.svg",
      "output/table.csv",
      "scripts/clean.zeff",
      "scripts/main.zeff",
      "zeff.toml",
    ]);
  });
});

describe("a file or a folder renamed and moved", () => {
  it("renames a file where it stands, and moves it to another folder", async () => {
    const files = await project();
    await move(files, "scripts/clean.zeff", "scripts/tidy.zeff");
    expect(await read(files, "scripts/clean.zeff")).toBeNull();
    expect(await read(files, "scripts/tidy.zeff")).toBe("print(2)\n");
    await move(files, "data/pay.csv", "output/pay.csv");
    expect(await read(files, "data/pay.csv")).toBeNull();
    expect(await read(files, "output/pay.csv")).toBe("id,wage\n1,23.5\n");
    // To where it is already: nothing.
    await move(files, "output/pay.csv", "output/pay.csv");
    expect(await read(files, "output/pay.csv")).toBe("id,wage\n1,23.5\n");
    // A change of capitals alone is a rename.
    await move(files, "output/pay.csv", "output/Pay.csv");
    expect(await all(files, "output")).toEqual([
      "output/Pay.csv",
      "output/figures/one.svg",
      "output/table.csv",
    ]);
  });

  it("moves a folder with all it holds, the folders in it that hold nothing among them", async () => {
    const files = await project();
    await move(files, "output", "results");
    expect(await files.kind("output")).toBeNull();
    expect(await all(files, "results")).toEqual(["results/figures/one.svg", "results/table.csv"]);
    expect(await files.kind("results/empty")).toBe("folder");
    await move(files, "results/figures", "data/figures");
    expect(await read(files, "data/figures/one.svg")).toBe("<svg/>");
    expect(await files.kind("results/figures")).toBeNull();
  });

  it("refuses what is fixed, a place taken, a folder into itself, and a thing that is not there", async () => {
    const files = await project();
    await expect(move(files, "zeff.toml", "project.toml")).rejects.toThrow(
      "`zeff.toml` is not renamed or moved: without it this is no project.",
    );
    await expect(move(files, "scripts/main.zeff", "scripts/start.zeff")).rejects.toThrow(
      "`scripts/main.zeff` is not renamed or moved: the engine and Zemp open it by this name.",
    );
    await expect(move(files, "scripts", "code")).rejects.toThrow(/is not renamed or moved/);
    await expect(move(files, ".zemp/views.json", "views.json")).rejects.toThrow(
      /is not renamed or moved/,
    );
    await expect(move(files, "scripts/clean.zeff", "scripts/main.zeff")).rejects.toThrow(
      "`scripts/main.zeff` is already in this project. Choose another name.",
    );
    await expect(move(files, "data/pay.csv", "data/PAY.CSV/x")).rejects.toThrow(
      /There is no folder/,
    );
    await expect(move(files, "output", "output/inner")).rejects.toThrow(
      "A folder is not moved into itself: `output/inner` lies in `output`.",
    );
    await expect(move(files, "data/pay.csv", ".zeff/pay.csv")).rejects.toThrow(
      /kept by Zemp and the engine/,
    );
    await expect(move(files, "none.txt", "some.txt")).rejects.toThrow(
      "There is no `none.txt` in this project.",
    );
    await expect(move(files, "data/pay.csv", "data/a b/")).rejects.toThrow(ProjectError);
    expect(await read(files, "scripts/clean.zeff")).toBe("print(2)\n");
    expect(await read(files, "data/pay.csv")).toBe("id,wage\n1,23.5\n");
  });

  it("leaves the original whole, and no half of a copy, where a writing fails", async () => {
    // A file.
    const one = (await project(new Failing())) as Failing;
    one.failAt = "output/pay.csv";
    await expect(move(one, "data/pay.csv", "output/pay.csv")).rejects.toThrow(
      "`data/pay.csv` could not be moved, and is where it was: the storage is full.",
    );
    expect(await read(one, "data/pay.csv")).toBe("id,wage\n1,23.5\n");
    expect(await one.kind("output/pay.csv")).toBeNull();
    // A folder, failing at its second file: the first, already copied, is taken away again.
    const two = (await project(new Failing())) as Failing;
    two.failAt = "results/table.csv";
    await expect(move(two, "output", "results")).rejects.toThrow(
      /could not be moved, and is where it was/,
    );
    expect(await two.kind("results")).toBeNull();
    expect(await all(two, "output")).toEqual(["output/figures/one.svg", "output/table.csv"]);
    expect(await two.kind("output/empty")).toBe("folder");
  });
});

describe("a file or a folder duplicated and deleted", () => {
  it("copies a file beside it under a name with copy in it, and a free one each time", async () => {
    const files = await project();
    expect(await duplicate(files, "scripts/clean.zeff")).toBe("scripts/clean copy.zeff");
    expect(await duplicate(files, "scripts/clean.zeff")).toBe("scripts/clean copy 2.zeff");
    expect(await read(files, "scripts/clean copy 2.zeff")).toBe("print(2)\n");
    expect(await read(files, "scripts/clean.zeff")).toBe("print(2)\n");
    // What is fixed can be copied: the copy is not.
    expect(await duplicate(files, "scripts/main.zeff")).toBe("scripts/main copy.zeff");
    expect(await duplicate(files, "zeff.toml")).toBe("zeff copy.toml");
    await add(files, "", "README", text("x"));
    expect(await duplicate(files, "README")).toBe("README copy");
    await add(files, "", ".gitignore", text("x"));
    expect(await duplicate(files, ".gitignore")).toBe(".gitignore copy");
  });

  it("copies a folder with all it holds", async () => {
    const files = await project();
    expect(await duplicate(files, "output")).toBe("output copy");
    expect(await all(files, "output copy")).toEqual([
      "output copy/figures/one.svg",
      "output copy/table.csv",
    ]);
    expect(await files.kind("output copy/empty")).toBe("folder");
    expect(await all(files, "output")).toEqual(["output/figures/one.svg", "output/table.csv"]);
    await expect(duplicate(files, ".zemp")).rejects.toThrow(
      /kept by Zemp and the engine, and is not copied/,
    );
    await expect(duplicate(files, "none")).rejects.toThrow("There is no `none` in this project.");
  });

  it("counts the files a path is, and deletes a file or a folder with all it holds", async () => {
    const files = await project();
    expect(await count(files, "output")).toBe(2);
    expect(await count(files, "output/table.csv")).toBe(1);
    expect(await count(files, "output/empty")).toBe(0);
    expect(await count(files, "nowhere")).toBe(0);
    expect(await remove(files, "scripts/clean.zeff")).toBe(1);
    expect(await read(files, "scripts/clean.zeff")).toBeNull();
    expect(await remove(files, "output")).toBe(2);
    expect(await files.kind("output")).toBeNull();
  });

  it("deletes nothing that is fixed, and nothing that is not there", async () => {
    const files = await project();
    await expect(remove(files, "zeff.toml")).rejects.toThrow(
      "`zeff.toml` is not deleted: without it this is no project.",
    );
    for (const path of ["scripts/main.zeff", "scripts", "data", ".zemp", ".zemp/views.json"]) {
      await expect(remove(files, path), path).rejects.toThrow(
        /is not deleted: the engine and Zemp open it by this name/,
      );
    }
    await expect(remove(files, "none")).rejects.toThrow("There is no `none` in this project.");
    await expect(remove(files, "")).rejects.toThrow(ProjectError);
    expect(await all(files)).toHaveLength(7);
  });
});
