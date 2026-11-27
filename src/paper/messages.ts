// The messages of the paper's worker, as the interface sees them (`paper/js/host.mjs` is the
// worker's side, where each is described).

/** One thing Typst said of a setting: an error or a warning, with its place where it has one. */
export interface Said {
  severity: "error" | "warning";
  message: string;
  hints: string[];
  /** The file it points into, by its path in the project; `null` where it points into none. */
  file: string | null;
  /** The line and the column it begins on and ends on, counted from 1. */
  line: number | null;
  column: number | null;
  end_line: number | null;
  end_column: number | null;
  /** The same places as counts of bytes into the file. */
  from: number | null;
  to: number | null;
}

/** A setting of the paper. */
export interface Setting {
  /** Whether Typst set it. */
  ok: boolean;
  /**
   * The width and height in points of each page of the last document that set: this
   * setting's where `ok`, and otherwise those of the setting before, which stay to be shown.
   */
  pages: [number, number][];
  /**
   * A mark for each of those pages: two pages of one mark are drawn the same, so a page whose
   * mark has not changed need not be asked for again.
   */
  marks: string[];
  /** What Typst said of this setting: its errors where it refused the source, and its warnings. */
  said: Said[];
  /**
   * The files Typst asked for in this setting that the paper does not hold, each by its path
   * in the project: the page looks for them in the project and gives those it finds.
   */
  missing: string[];
  /**
   * The files besides the paper's own main file that Typst asked for in this setting and was
   * given, likewise: the files the paper reads, as it now stands.
   */
  read: string[];
}

/** The place in the sources that a point of a page came from. */
export interface Place {
  file: string;
  /** The count of bytes into the file, and the line and column counted from 1. */
  offset: number;
  line: number | null;
  column: number | null;
}

/** A heading of the paper as it last set. */
export interface Heading {
  /** 1 for a heading, 2 for one under it, and so on. */
  level: number;
  text: string;
  /** The file it is written in, by its path in the project, and its line there from 1; `null` where it comes from no file. */
  file: string | null;
  line: number | null;
  /** Where it stands on the pages: the page from 0, and points from the page's top left. */
  page: number;
  x: number;
  y: number;
}

/** A message the interface sends. Each carries an `id`, which its answer carries back. */
export type Request =
  | { type: "font"; bytes: Uint8Array }
  | { type: "open"; main: string }
  | { type: "text"; path: string; text: string }
  | { type: "bytes"; path: string; bytes: Uint8Array }
  | { type: "remove"; path: string }
  | { type: "today"; year: number; month: number; day: number }
  | { type: "set" }
  | { type: "page"; index: number }
  | { type: "pdf"; created: number | null }
  | { type: "outline" }
  | { type: "click"; page: number; x: number; y: number };

/** An answer of the worker. */
export type Reply =
  | { type: "fonted"; faces: number; families: string[] }
  | { type: "opened"; main: string }
  | { type: "put"; path: string }
  | { type: "removed"; path: string; was: boolean }
  | { type: "dated" }
  | ({ type: "set" } & Setting)
  | { type: "page"; index: number; svg: string }
  | { type: "pdf"; bytes: Uint8Array }
  | { type: "outline"; headings: Heading[] }
  | {
      type: "place";
      file: string | null;
      offset?: number;
      line?: number | null;
      column?: number | null;
    }
  | { type: "error"; message: string };

/** Everything the worker sends: that it is ready, once, and its answers. */
export type FromWorker = { type: "ready"; typst: string } | (Reply & { id?: number });
