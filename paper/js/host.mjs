// The messages of the paper's worker (Zemp Lite 0.3, step 11b; open decision #172, option A).
// The interface and the worker speak in messages; this file is the worker's side, the same in
// a Web Worker of the browser and in a worker thread of Node, where it is tested. The worker
// holds one paper at a time, in memory: the files the interface gives it, set to pages by
// Typst. A message that carries an `id` is answered with the same `id`.
//
// Messages in:
//   { type: "font", bytes }             a font file, as a Uint8Array: one of the module's own
//                                       or one of the project's. Fonts stay for every paper
//                                       opened afterwards
//   { type: "open", main }              a paper whose main file is at `main`, a path of the
//                                       project; the paper that was open is gone
//   { type: "text", path, text }        a file of text of the paper (a source, a table)
//   { type: "bytes", path, bytes }      a file of bytes (a figure), as a Uint8Array
//   { type: "remove", path }            forget a file: it is gone from the project
//   { type: "today", year, month, day } the day `datetime.today()` gives
//   { type: "set" }                     set the paper to pages
//   { type: "page", index }             a page of the last document that set, from 0
//   { type: "pdf", created }            the PDF; `created` is seconds since 1970 in UTC, or
//                                       null for a file that names no time
//   { type: "click", page, x, y }       where a point of a page came from in the sources;
//                                       `x` and `y` in points from the page's top left
// Messages out:
//   { type: "ready", typst }            once, when the module is loaded: Typst's version
//   { type: "fonted", faces, families } the font was read: how many faces it held (none where
//                                       it is no font), and every family now there
//   { type: "opened", main }
//   { type: "put", path }               the file was put into the paper
//   { type: "removed", path, was }      the file was forgotten; `was`, whether there was one
//   { type: "dated" }
//   { type: "set", ok, pages, said }    the setting: whether Typst set it; the sizes in points
//                                       of the pages of the last document that set; and what
//                                       Typst said, each thing { severity, message, hints,
//                                       file, line, column, end_line, end_column, from, to }
//   { type: "page", index, svg }        the page as Typst's own SVG; empty where there is none
//   { type: "pdf", bytes }              the PDF, in a Uint8Array whose buffer is passed to
//                                       the interface and not copied
//   { type: "place", file, offset, line, column }   the answer to `click`; `file` is null
//                                       where the point leads to no place of the paper
//   { type: "error", message }          a message the worker could not act on

/**
 * Serve the messages of a paper's worker over a port (`postMessage`, and `onmessage` to be
 * set). `module` is the WebAssembly build's bindings.
 */
export function serve(module, port) {
  /** The font files given, kept for the papers opened afterwards. */
  const fonts = [];
  let paper = null;

  const opened = (main) => {
    if (paper !== null) paper.free();
    paper = new module.Paper(main);
    // A copy of each: the module takes the bytes it is given.
    for (const font of fonts) paper.add_font(font.slice());
  };

  port.onmessage = (message) => {
    const said = message.data ?? message;
    const answer = (reply, transfer) =>
      port.postMessage(said.id === undefined ? reply : { ...reply, id: said.id }, transfer);
    const refuse = (text) => answer({ type: "error", message: text });
    if (said.type === "font") {
      if (!(said.bytes instanceof Uint8Array)) {
        refuse("a font was sent without its bytes");
        return;
      }
      // Read by a paper of its own where none is open, to say what the file holds.
      const reader = paper ?? new module.Paper("paper.typ");
      const faces = reader.add_font(said.bytes.slice());
      if (faces > 0) fonts.push(said.bytes);
      const families = JSON.parse(reader.families());
      if (paper === null) reader.free();
      answer({ type: "fonted", faces, families });
      return;
    }
    if (said.type === "open") {
      opened(String(said.main));
      answer({ type: "opened", main: said.main });
      return;
    }
    if (!["text", "bytes", "remove", "today", "set", "page", "pdf", "click"].includes(said.type)) {
      refuse(`no such message: ${String(said.type)}`);
      return;
    }
    if (paper === null) {
      const what = {
        text: "a file was sent",
        bytes: "a file was sent",
        remove: "a file was to be forgotten",
        today: "the day was given",
        set: "a setting was asked for",
        page: "a page was asked for",
        pdf: "the PDF was asked for",
        click: "a place was asked for",
      }[said.type];
      refuse(`${what} before a paper was opened`);
      return;
    }
    switch (said.type) {
      case "text":
        if (paper.put_text(String(said.path), String(said.text))) {
          answer({ type: "put", path: said.path });
        } else {
          refuse(`the path \`${String(said.path)}\` is not inside the project`);
        }
        break;
      case "bytes":
        if (!(said.bytes instanceof Uint8Array)) {
          refuse("a file was sent without its bytes");
        } else if (paper.put_bytes(String(said.path), said.bytes)) {
          answer({ type: "put", path: said.path });
        } else {
          refuse(`the path \`${String(said.path)}\` is not inside the project`);
        }
        break;
      case "remove":
        answer({ type: "removed", path: said.path, was: paper.remove(String(said.path)) });
        break;
      case "today":
        paper.set_today(Number(said.year), Number(said.month), Number(said.day));
        answer({ type: "dated" });
        break;
      case "set":
        answer(JSON.parse(paper.set()));
        break;
      case "page": {
        const index = Number.isInteger(said.index) && said.index >= 0 ? said.index : 0;
        answer({ type: "page", index, svg: paper.page_svg(index) });
        break;
      }
      case "pdf":
        try {
          const bytes = paper.pdf(typeof said.created === "number" ? said.created : Number.NaN);
          answer({ type: "pdf", bytes }, [bytes.buffer]);
        } catch (error) {
          refuse(String(error));
        }
        break;
      case "click":
        answer(JSON.parse(paper.click(Number(said.page), Number(said.x), Number(said.y))));
        break;
    }
  };
  port.postMessage({ type: "ready", typst: module.typstVersion() });
}
