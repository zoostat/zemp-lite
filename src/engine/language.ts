// The engine's language server in the browser (Engine and Project Specification, section 12;
// release 0.2, step 10): `zeff lsp`'s own server, hosted in a worker of its own beside the
// window's engine, so that typing never waits on a run. The server reads the project as that
// worker holds it, kept in step with the browser's files as the engine's is; each script is
// opened as a document and each edit sent whole. What it says of a document, its diagnostics,
// is told as it comes; what is asked of it (hover, completion, signature help, formatting) is
// answered by it. Every word is the server's.
import type { Project } from "../project/projects";
import { Session } from "../project/session";
import type { Engine } from "./engine";
import type { CodeFamily, HelpIndex } from "./messages";

/** A place in a document, as the protocol has it: lines and UTF-16 columns from 0. */
export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

/** A diagnostic of the checker, as the server publishes it. */
export interface Diagnostic {
  range: Range;
  /** 1 an error, 2 a warning, 3 information, 4 a hint. */
  severity?: number;
  code?: string;
  message: string;
}

/** Where the project lies in the language worker, as the worker keeps it. */
const ROOT = "file:///project/";

/** The address of a file of the project, as the server names a document. */
export const uriOf = (path: string) => `${ROOT}${path}`;

export class Language {
  readonly #engine: Engine;
  readonly #session: Session;
  #next = 1;
  readonly #waiting = new Map<number, (result: unknown) => void>();
  readonly #versions = new Map<string, number>();
  #started: Promise<void> | null = null;
  /** The server published the diagnostics of a document. */
  ondiagnostics: (path: string, diagnostics: Diagnostic[]) => void = () => {};

  constructor(project: Project, engine: Engine) {
    this.#engine = engine;
    this.#session = new Session(project, engine);
  }

  /** The project's files changed: the language worker is given them before the next message. */
  changed(path: string): void {
    this.#session.changed(path);
  }

  /**
   * A file or a folder is gone from the project: the language worker forgets it, and a script
   * that was open in the conversation under that path, or in that folder, is closed there.
   */
  gone(path: string): void {
    this.#session.gone(path);
    for (const open of [...this.#versions.keys()]) {
      if (open === path || open.startsWith(`${path}/`)) {
        this.#versions.delete(open);
        void this.notify("textDocument/didClose", { textDocument: { uri: uriOf(open) } }).catch(
          () => undefined,
        );
      }
    }
  }

  /** Start the worker, give it the project, and open the conversation. */
  start(): Promise<void> {
    if (this.#started !== null) return this.#started;
    const starting = (async () => {
      await this.#engine.start();
      await this.#session.sync();
      await this.#request("initialize", {
        processId: null,
        rootUri: ROOT,
        capabilities: {
          textDocument: {
            hover: { contentFormat: ["plaintext"] },
            completion: { completionItem: { snippetSupport: false } },
          },
        },
      });
      await this.notify("initialized", {});
    })();
    // A start that failed (a file of the project gone while it was read) is tried again by
    // the next call: kept as failed, it would leave the window without hover, completion,
    // help and explained pages for as long as it is open.
    starting.catch(() => {
      if (this.#started === starting) this.#started = null;
    });
    this.#started = starting;
    return starting;
  }

  /**
   * The tellings of a script's text begun so far, one after another. Each waits for those
   * begun before it, and so does every question: a telling first brings the worker in step
   * with the project's files, which takes as long as the files take to read, and a question
   * sent meanwhile would be answered of the text the server held before (found at 0.2.3: the
   * edits of **Format the script** were of an older text, and were made in the newer one).
   */
  #told: Promise<void> = Promise.resolve();

  /**
   * The text of a script, as it stands: opened the first time, then sent whole. The texts
   * reach the server in the order they were given here.
   */
  update(path: string, text: string): Promise<void> {
    const sent = this.#told.then(() => this.#update(path, text));
    // A telling that failed does not hold up the next, nor a question.
    this.#told = sent.catch(() => undefined);
    return sent;
  }

  async #update(path: string, text: string): Promise<void> {
    await this.start();
    await this.#session.sync();
    const version = (this.#versions.get(path) ?? 0) + 1;
    this.#versions.set(path, version);
    if (version === 1) {
      await this.notify("textDocument/didOpen", {
        textDocument: { uri: uriOf(path), languageId: "zeff", version, text },
      });
    } else {
      await this.notify("textDocument/didChange", {
        textDocument: { uri: uriOf(path), version },
        contentChanges: [{ text }],
      });
    }
  }

  /**
   * Ask the server, and wait for its answer to this request. The server is asked once it has
   * every text it was to be told before the question.
   */
  async request(method: string, params: unknown): Promise<unknown> {
    await this.#told;
    return this.#request(method, params);
  }

  /** A request sent at once: the opening of the conversation, which every telling waits for. */
  async #request(method: string, params: unknown): Promise<unknown> {
    const id = this.#next++;
    const answered = new Promise<unknown>((resolve) => this.#waiting.set(id, resolve));
    await this.#send({ jsonrpc: "2.0", id, method, params });
    return answered;
  }

  /** Tell the server something it does not answer. */
  async notify(method: string, params: unknown): Promise<void> {
    await this.#send({ jsonrpc: "2.0", method, params });
  }

  /** The help page of a function, from the language worker, which a run never holds up. */
  async help(name: string): Promise<{ page: string | null; message: string }> {
    await this.start();
    await this.#session.sync();
    return this.#engine.help(name);
  }

  /** The index of the help, from the language worker. */
  async helpIndex(): Promise<HelpIndex> {
    await this.start();
    return this.#engine.helpIndex();
  }

  /** The codes by family, from the language worker. */
  async codes(): Promise<CodeFamily[]> {
    await this.start();
    return this.#engine.codes();
  }

  /** A code's explained page, from the language worker. */
  async explain(code: string): Promise<string> {
    await this.start();
    return (await this.#engine.explain(code)).text;
  }

  /** End the language worker. */
  close(): void {
    this.#engine.close();
    for (const resolve of this.#waiting.values()) resolve(null);
    this.#waiting.clear();
  }

  async #send(message: unknown): Promise<void> {
    const replies = await this.#engine.language(JSON.stringify(message));
    for (const body of replies) {
      const reply = JSON.parse(body) as {
        id?: number;
        result?: unknown;
        error?: { message: string };
        method?: string;
        params?: { uri: string; diagnostics: Diagnostic[] };
      };
      if (reply.method === "textDocument/publishDiagnostics" && reply.params !== undefined) {
        const uri = reply.params.uri;
        if (uri.startsWith(ROOT))
          this.ondiagnostics(uri.slice(ROOT.length), reply.params.diagnostics);
      } else if (reply.id !== undefined) {
        const resolve = this.#waiting.get(reply.id);
        this.#waiting.delete(reply.id);
        resolve?.(reply.error === undefined ? (reply.result ?? null) : null);
      }
    }
  }
}
