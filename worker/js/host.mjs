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
//   { type: "run", script, text }       run the text of a script of the project
//   { type: "frame", name }             a frame of the last run, by the name of its binding
//   { type: "read", path }              a file of the project: one put in, or one a run wrote
// Messages out:
//   { type: "ready", version }          once, when the engine is loaded: the engine's version
//   { type: "opened", name }
//   { type: "filed", path }             the file was put into the project
//   { type: "started" | "finished" | "pass" | "output", ... }   while a run goes
//   { type: "done", exit_code, stdout, stderr, frames }         its outcome, with the frames
//                                       its bindings hold: [{ name, rows, variables }]
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
    if (!["file", "run", "frame", "read"].includes(said.type)) {
      refuse(`no such message: ${String(said.type)}`);
      return;
    }
    if (project === null) {
      const what = {
        file: "a file was sent",
        run: "a run was asked for",
        frame: "a frame was asked for",
        read: "a file was asked for",
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
      case "run":
        answer(JSON.parse(project.run(said.script, said.text, deviceBytes ?? 0)));
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
