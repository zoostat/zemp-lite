import { describe, expect, it } from "vitest";
import type { Project } from "../project/projects";
import type { Engine } from "./engine";
import { Language } from "./language";

/** As much of an engine as the language worker's start and an explained page use. */
function engine() {
  const sent: string[] = [];
  const stand = {
    project: null as string | null,
    start: () => Promise.resolve(),
    open(name: string) {
      this.project = name;
      return Promise.resolve();
    },
    put: () => Promise.resolve(),
    // The server answers each request with its `id`, and a notification with nothing.
    language(body: string) {
      sent.push(body);
      const message = JSON.parse(body) as { id?: number };
      return Promise.resolve(
        message.id === undefined ? [] : [JSON.stringify({ id: message.id, result: {} })],
      );
    },
    explain: (code: string) =>
      Promise.resolve({ code, kind: "warning", title: "", text: `the page of ${code}` }),
  };
  return { stand: stand as unknown as Engine, sent };
}

describe("the language worker", () => {
  it("starts again after a start that failed, and is not left failed for the window's life", async () => {
    let reads = 0;
    const project = {
      info: { name: "Scratch" },
      // The first reading of the project fails as a browser fails it when a file listed is
      // gone before it is read; the next one succeeds.
      files() {
        reads += 1;
        return reads === 1
          ? Promise.reject(new Error("A requested file or directory could not be found"))
          : Promise.resolve([{ path: "scripts/main.zeff", bytes: new Uint8Array() }]);
      },
    } as unknown as Project;
    const { stand, sent } = engine();
    const language = new Language(project, stand);
    await expect(language.explain("W0201")).rejects.toThrow("could not be found");
    expect(sent).toEqual([]);
    // The next thing asked starts the worker afresh: the project read again, the server opened.
    await expect(language.explain("W0201")).resolves.toBe("the page of W0201");
    expect(reads).toBe(2);
    expect(sent.map((body) => (JSON.parse(body) as { method: string }).method)).toEqual([
      "initialize",
      "initialized",
    ]);
    // And it is started once: a third asking reads nothing and opens nothing again.
    await expect(language.explain("Z0101")).resolves.toBe("the page of Z0101");
    expect(reads).toBe(2);
    expect(sent).toHaveLength(2);
  });
});
