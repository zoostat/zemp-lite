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

  /** A project whose one script takes as long to read as the test holds it. */
  function slowProject() {
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => (release = resolve));
    const project = {
      info: { name: "Scratch" },
      files: () => Promise.resolve([{ path: "scripts/main.zeff", bytes: new Uint8Array() }]),
      // A file written since the worker was last given the project is read again, slowly.
      read: () => held.then(() => new Uint8Array()),
    } as unknown as Project;
    return { project, release };
  }
  const methods = (sent: string[]) =>
    sent.map((body) => {
      const message = JSON.parse(body) as {
        method: string;
        params?: { textDocument?: { text?: string }; contentChanges?: { text: string }[] };
      };
      const text = message.params?.textDocument?.text ?? message.params?.contentChanges?.[0]?.text;
      return text === undefined ? message.method : `${message.method} ${text}`;
    });

  it("asks the server only once it has every text it was to be told before the question", async () => {
    const { project, release } = slowProject();
    const { stand, sent } = engine();
    const language = new Language(project, stand);
    await language.update("scripts/main.zeff", "old");
    // The script is typed anew and saved: the worker is to be given the file before the
    // next message, and the file is slow to read. A question asked meanwhile waits.
    language.changed("scripts/main.zeff");
    const told = language.update("scripts/main.zeff", "new");
    let answered = false;
    const asked = language.request("textDocument/formatting", {}).then(() => (answered = true));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(answered).toBe(false);
    expect(methods(sent)).toEqual(["initialize", "initialized", "textDocument/didOpen old"]);
    release();
    await Promise.all([told, asked]);
    expect(methods(sent)).toEqual([
      "initialize",
      "initialized",
      "textDocument/didOpen old",
      "textDocument/didChange new",
      "textDocument/formatting",
    ]);
  });

  it("gives the server a script's texts in the order they were given, however long each waits", async () => {
    const { project, release } = slowProject();
    const { stand, sent } = engine();
    const language = new Language(project, stand);
    await language.update("scripts/main.zeff", "first");
    language.changed("scripts/main.zeff");
    // The second is held by the slow file; the third, begun after it, is not sent before it.
    const second = language.update("scripts/main.zeff", "second");
    const third = language.update("scripts/main.zeff", "third");
    await new Promise((resolve) => setTimeout(resolve, 20));
    release();
    await Promise.all([second, third]);
    expect(methods(sent).slice(2)).toEqual([
      "textDocument/didOpen first",
      "textDocument/didChange second",
      "textDocument/didChange third",
    ]);
  });

  it("is not held up by a telling that failed", async () => {
    let fail = true;
    const project = {
      info: { name: "Scratch" },
      files: () =>
        fail
          ? Promise.reject(new Error("could not be found"))
          : Promise.resolve([{ path: "scripts/main.zeff", bytes: new Uint8Array() }]),
    } as unknown as Project;
    const { stand, sent } = engine();
    const language = new Language(project, stand);
    await expect(language.update("scripts/main.zeff", "one")).rejects.toThrow("could not be found");
    fail = false;
    await language.update("scripts/main.zeff", "two");
    await language.request("textDocument/hover", {});
    expect(methods(sent)).toEqual([
      "initialize",
      "initialized",
      "textDocument/didOpen two",
      "textDocument/hover",
    ]);
  });
});
