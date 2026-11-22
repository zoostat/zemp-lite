import { describe, expect, it } from "vitest";
import type { Outcome } from "../engine/messages";
import type { Kept } from "../theme/theme";
import { MemoryFolder } from "./folder";
import { Projects } from "./projects";
import { Session, type Runs } from "./session";

const nothing: Kept = { getItem: () => null, setItem: () => undefined };
const done: Outcome = {
  exitCode: 0,
  stdout: "",
  stderr: "",
  statements: [],
  frames: [],
  written: [],
  stopped: false,
};

/** A stand-in for the engine that writes down what it was asked. */
function engine(): Runs & { asked: string[]; project: string | null } {
  const asked: string[] = [];
  return {
    asked,
    project: null,
    open(name) {
      this.project = name;
      asked.push(`open ${name}`);
      return Promise.resolve();
    },
    put(path, bytes) {
      asked.push(`put ${path} (${bytes.byteLength})`);
      return Promise.resolve();
    },
    run(script, text, _listener, _width, only) {
      asked.push(
        `run ${script}: ${text.trim()}${only === undefined ? "" : ` (only ${only.join(", ")})`}`,
      );
      return Promise.resolve(done);
    },
    check(script) {
      asked.push(`check ${script}`);
      return Promise.resolve({
        exitCode: 0,
        said: `checked ${script}: no problems\n`,
        found: "",
        summary: `checked ${script}: no problems`,
        findings: [],
        ranges: [],
      });
    },
    dependencies(script) {
      asked.push(`dependencies ${script}`);
      return Promise.resolve([]);
    },
  };
}

async function session() {
  const projects = new Projects(new MemoryFolder(), nothing);
  await projects.create("demo");
  const project = (await projects.open("demo"))!;
  const runs = engine();
  return { project, runs, session: new Session(project, runs) };
}

describe("a session", () => {
  it("gives the engine every file of the project before the first run", async () => {
    const { runs, session: made } = await session();
    await made.run("scripts/main.zeff", "print(1)\n");
    expect(runs.asked).toEqual([
      "open demo",
      "put scripts/main.zeff (8)",
      "put zeff.toml (177)",
      "run scripts/main.zeff: print(1)",
    ]);
  });

  it("gives only the files changed since, before the runs after it", async () => {
    const { project, runs, session: made } = await session();
    await made.run("scripts/main.zeff", "1\n");
    runs.asked.length = 0;
    await made.run("scripts/main.zeff", "2\n");
    expect(runs.asked).toEqual(["run scripts/main.zeff: 2"]);
    runs.asked.length = 0;
    await project.addData("pay.csv", new TextEncoder().encode("id\n1\n"));
    made.changed("data/pay.csv");
    await made.run("scripts/main.zeff", "3\n");
    expect(runs.asked).toEqual(["put data/pay.csv (5)", "run scripts/main.zeff: 3"]);
  });

  it("fills the engine afresh after a file is removed, and after the worker was ended", async () => {
    const { project, runs, session: made } = await session();
    await made.run("scripts/main.zeff", "1\n");
    await project.writeText("scripts/extra.zeff", "2\n");
    await project.remove("scripts/extra.zeff");
    made.removed();
    runs.asked.length = 0;
    await made.run("scripts/main.zeff", "1\n");
    expect(runs.asked[0]).toBe("open demo");
    // The worker ended (a run stopped, or the engine failed): it holds no project.
    runs.project = null;
    runs.asked.length = 0;
    await made.run("scripts/main.zeff", "1\n");
    expect(runs.asked.slice(0, 2)).toEqual(["open demo", "put scripts/main.zeff (8)"]);
  });

  it("brings the engine in step with the project before a check, a graph or a run of chosen statements", async () => {
    const { runs, session: made } = await session();
    await made.check("scripts/main.zeff", "1\n");
    expect(runs.asked.filter((one) => one.startsWith("open"))).toHaveLength(1);
    expect(runs.asked.at(-1)).toBe("check scripts/main.zeff");
    await made.dependencies("scripts/main.zeff", "1\n");
    await made.run("scripts/main.zeff", "1\n2\n", undefined, 0, [2]);
    // The project was given to the engine once, before the first of the three.
    expect(runs.asked.filter((one) => one.startsWith("open"))).toHaveLength(1);
    expect(runs.asked.slice(-2)).toEqual([
      "dependencies scripts/main.zeff",
      "run scripts/main.zeff: 1\n2 (only 2)",
    ]);
  });
});
