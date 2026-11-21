// A help page of the engine, read for the Help place (open decision #203): its sections, for
// the outline at the page's left, and the functions it names under SEE ALSO, for the related
// functions at its right. The page is the engine's own text, as `zeff help` or `zeff explain`
// prints it, and is shown whole and unchanged; this reader only finds where its parts begin.

export interface PageSection {
  /** The heading as the page writes it: `USAGE`, `WARNINGS AND NOTES`. */
  heading: string;
  /** The heading in the outline's case: `Usage`, `Warnings and notes`. */
  title: string;
  /** The line of the page the heading stands on, counted from 0. */
  line: number;
  /**
   * Whether it is the first line of a function, where a page holds more than one of a name
   * (`summary` of a frame and `summary` of a result): the outline then names each function,
   * by its package, over its own sections.
   */
  entry: boolean;
}

/** A heading of a page: a line of capitals begun at the first column. */
const HEADING = /^[A-Z][A-Z ]*[A-Z]$/;
/** The first line of a function: its name, a dash and what it does, begun at the first column. */
const ENTRY = /^\S+ — /;

/** The sections of a page, in order. The title of a page of one function is not one. */
export function sectionsOfPage(page: string): PageSection[] {
  const lines = page.split("\n");
  const several = lines.filter((line) => ENTRY.test(line)).length > 1;
  return lines.flatMap((written, line): PageSection[] => {
    if (HEADING.test(written)) {
      const title = written.charAt(0) + written.slice(1).toLowerCase();
      return [{ heading: written, title, line, entry: false }];
    }
    if (several && ENTRY.test(written)) {
      const head = headOf(written);
      const title = head === null ? written : `${head.name} · ${head.pack}`;
      return [{ heading: written, title, line, entry: true }];
    }
    return [];
  });
}

/**
 * The functions a page names under SEE ALSO, in its order and once each; none where it has no
 * such part. A page of several functions gives those of each.
 */
export function relatedOf(page: string): string[] {
  const lines = page.split("\n");
  const names: string[] = [];
  lines.forEach((heading, at) => {
    if (heading !== "SEE ALSO") return;
    for (const line of lines.slice(at + 1)) {
      if (line.trim() === "" || HEADING.test(line)) break;
      names.push(...line.split(","));
    }
  });
  return names
    .map((name) => name.trim())
    .filter((name, at, all) => name !== "" && all.indexOf(name) === at);
}

/**
 * What a page's first line says of its function: the name, what it does, and its package
 * (`reg — Linear regression by least squares    regress · tier 2 · since 0.4.0`).
 */
export function headOf(page: string): { name: string; does: string; pack: string } | null {
  const first = page.split("\n")[0] ?? "";
  const [said, facts] = first.split(/\s{2,}/);
  const at = (said ?? "").indexOf(" — ");
  if (said === undefined || at < 0) return null;
  return {
    name: said.slice(0, at),
    does: said.slice(at + 3),
    pack: (facts ?? "").split(" · ")[0] ?? "",
  };
}
