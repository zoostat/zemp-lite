// The messages of the engine's worker (Engine and Project Specification, section 8.3, point
// 7). The interface and the worker speak in messages; this file is the worker's side, the
// same in a Web Worker of the browser and in a worker thread of Node, where it is tested.
// The messages are those of the worker of the Zeff repository's own browser build, with two
// additions: a file of the project is given back (`read`), and a message that carries an
// `id` is answered with the same `id`, so that the interface can tell its answers apart.
//
// Messages in:
//   { type: "open", name, cancel }      a project called `name`; `cancel` is a
//                                       SharedArrayBuffer of four bytes, the cancel flag
//   { type: "file", path, bytes }       a file of the project, as a Uint8Array
//   { type: "run", script, text, width } run the text of a script of the project, its tables
//                                       printed at `width` characters (0 or none: 118)
//                                       with `only`, a list of lines, the statements that begin
//                                       on them run alone, the others blanked
//   { type: "statements", script, text } the statements of a text, without running it
//   { type: "check", script, text }     the engine's check of a text, as `zeff check` makes it
//   { type: "dependencies", script, text }  what each statement of a text needs
//   { type: "language", body }          a message of the Language Server Protocol for the
//                                       engine's language server, over the project
//   { type: "rows", name, offset, limit, sort, desc, filtered, search }   rows of a frame of
//                                       the last run as the data viewer shows it, each cell as
//                                       the engine prints it: sorted by the variable `sort`
//                                       (descending where `desc`), kept to the rows of the
//                                       last filter where `filtered`, and to those `search` finds
//   { type: "vars", script, text }      the bindings of a text with their types, as `zeff
//                                       repl`'s `:vars` lists them
//   { type: "filter", name, condition } keep the viewer's frame to the rows of a condition,
//                                       as `name.where(condition)` keeps them
//   { type: "help", name }              the help page of a function, as `zeff help` prints it
//   { type: "explain", code }           the explained page of a code (needs no project)
//   { type: "codes" }                   every code with an explained page (needs no project)
//   { type: "frame", name }             a frame of the last run, by the name of its binding
//   { type: "read", path }              a file of the project: one put in, or one a run wrote
// Messages out:
//   { type: "ready", version }          once, when the engine is loaded: the engine's version
//   { type: "opened", name }
//   { type: "filed", path }             the file was put into the project
//   { type: "ranges", statements }      first in a run: [{ line, end, kind }]
//   { type: "started" | "finished" | "pass" | "output", ... }   while a run goes
//   { type: "done", exit_code, stdout, stderr, statements, frames }   its outcome: each
//                                       statement with what it printed, said and made, and
//                                       the frames its bindings hold: [{ name, rows, variables }]
//   { type: "statements", statements }  the answer to `statements`: [{ line, end, kind }]
//   { type: "checked", exit_code, said, found, summary, findings }   the answer to `check`
//   { type: "language", messages }      the answer to `language`: the bodies of the server's
//                                       messages, in order
//   { type: "rows", name, header, total, kept, offset, variables, rows }   the answer to
//                                       `rows`: each variable with its header's distribution
//   { type: "filter", ok, rows, said }  the answer to `filter`
//   { type: "vars", printed, said }     the answer to `vars`
//   { type: "help", page, message }     the answer to `help`: the page, or null and why
//   { type: "explained", page }         the answer to `explain`: the page, as `zeff explain
//                                       --format json` gives it, its `text` what it prints
//   { type: "codes", families }         the answer to `codes`
//   { type: "dependencies", statements } the answer to `dependencies`:
//                                       [{ line, makes, reads, seeds, needs }]
//   { type: "frame", name, bytes }      the frame as an Arrow stream, in a Uint8Array whose
//                                       buffer is passed to the interface and not copied
//   { type: "read", path, bytes }       the file, passed in the same way; `bytes` is null
//                                       where the project has no file of that path
//   { type: "error", message }          a message the worker could not act on
//
// A run is cancelled by the interface writing 1 into the flag: a worker that is computing
// reads no message, so the engine reads the flag before each step. The flag is the
// interface's: it clears it before it asks for a run, and the worker never writes it.

export function serve(engine, port, deviceBytes) {
  let project = null;
  let flag = null;
  // What the engine calls while it runs.
  globalThis.zeffHost = {
    event(json) {
      port.postMessage(JSON.parse(json));
    },
    cancelled() {
      return flag !== null && Atomics.load(flag, 0) === 1;
    },
  };
  port.onmessage = (message) => {
    const said = message.data ?? message;
    // An answer carries the `id` of what it answers, where that had one.
    const answer = (reply, transfer) =>
      port.postMessage(said.id === undefined ? reply : { ...reply, id: said.id }, transfer);
    const refuse = (text) => answer({ type: "error", message: text });
    if (said.type === "open") {
      if (project !== null) project.free();
      project = new engine.Project(said.name);
      flag = said.cancel ? new Int32Array(said.cancel) : null;
      answer({ type: "opened", name: said.name });
      return;
    }
    if (said.type === "explain") {
      answer(JSON.parse(engine.explainPage(String(said.code))));
      return;
    }
    if (said.type === "codes") {
      answer(JSON.parse(engine.codesExplained()));
      return;
    }
    if (said.type === "statements") {
      answer(JSON.parse(engine.statements(String(said.script), String(said.text))));
      return;
    }
    if (
      ![
        "file",
        "run",
        "frame",
        "read",
        "check",
        "dependencies",
        "language",
        "help",
        "rows",
        "filter",
        "vars",
      ].includes(said.type)
    ) {
      refuse(`no such message: ${String(said.type)}`);
      return;
    }
    if (project === null) {
      const what = {
        file: "a file was sent",
        run: "a run was asked for",
        frame: "a frame was asked for",
        read: "a file was asked for",
        check: "a check was asked for",
        dependencies: "the dependencies were asked for",
        language: "the language server was asked",
        help: "a help page was asked for",
        rows: "rows of a frame were asked for",
        filter: "a filter was asked for",
        vars: "the bindings were asked for",
      }[said.type];
      refuse(`${what} before a project was opened`);
      return;
    }
    switch (said.type) {
      case "file":
        if (project.add_file(said.path, said.bytes)) {
          answer({ type: "filed", path: said.path });
        } else {
          refuse(`the path \`${String(said.path)}\` is not inside the project`);
        }
        break;
      case "run": {
        {
          const ranges = JSON.parse(engine.statements(said.script, said.text));
          port.postMessage({ type: "ranges", statements: ranges.statements });
          const width = Number.isInteger(said.width) && said.width > 0 ? said.width : 0;
          const only = Array.isArray(said.only) ? new Uint32Array(said.only) : undefined;
          answer(JSON.parse(project.run(said.script, said.text, deviceBytes ?? 0, width, only)));
        }
        break;
      }
      case "rows": {
        const page = JSON.parse(
          project.rows(
            String(said.name),
            Number(said.offset) || 0,
            Number(said.limit) || 100,
            typeof said.sort === "string" ? said.sort : "",
            said.desc === true,
            said.filtered === true,
            typeof said.search === "string" ? said.search : "",
          ),
        );
        answer(page);
        break;
      }
      case "vars":
        answer(JSON.parse(project.vars(String(said.script), String(said.text))));
        break;
      case "filter":
        answer(JSON.parse(project.filter(String(said.name), String(said.condition ?? ""))));
        break;
      case "help":
        answer(JSON.parse(project.help(String(said.name))));
        break;
      case "language":
        answer({ type: "language", messages: JSON.parse(project.language(String(said.body))) });
        break;
      case "check":
        answer(JSON.parse(project.check(String(said.script), String(said.text))));
        break;
      case "dependencies":
        answer(JSON.parse(project.dependencies(String(said.script), String(said.text))));
        break;
      case "frame": {
        const bytes = project.frame(said.name);
        if (bytes === undefined) {
          refuse(`no frame called \`${String(said.name)}\` in the last run`);
          break;
        }
        // The buffer goes to the interface: named in the transfer list it is moved, and the
        // worker is left with nothing, which is how it is known not to have been copied.
        answer({ type: "frame", name: said.name, bytes }, [bytes.buffer]);
        break;
      }
      case "read": {
        const bytes = project.file(said.path);
        if (bytes === undefined) {
          answer({ type: "read", path: said.path, bytes: null });
        } else {
          answer({ type: "read", path: said.path, bytes }, [bytes.buffer]);
        }
        break;
      }
    }
  };
  port.postMessage({ type: "ready", version: engine.engineVersion() });
}
