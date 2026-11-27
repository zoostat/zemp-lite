// Which files of a project are shown to be read (release 0.3, step 19; open decision #228,
// option A). The app edits scripts, the manifest and plain notes, and writes papers; every
// other file that is text opens in a tab to be read, not edited: a table a script exported
// for LaTeX, a data file of comma-separated values, a figure's own SVG. A file that is not
// text is not shown, since there is nothing in it to read.

/** The largest file shown to be read, in bytes: a megabyte. A larger one is saved to the computer and read there. */
export const READ_LIMIT = 1_000_000;

/**
 * Whether a file's bytes are text to be read: valid UTF-8 from first to last, with no byte
 * that only a file that is not text holds (a null, or a control character other than a tab, a
 * line break, a form feed or an escape), and no larger than the limit. An empty file is text.
 */
export function isText(bytes: Uint8Array): boolean {
  if (bytes.length > READ_LIMIT) return false;
  for (const byte of bytes) {
    if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 12 && byte !== 13 && byte !== 27) {
      return false;
    }
  }
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return true;
  } catch {
    return false;
  }
}

/**
 * What the tab of a file being read says under its bar: that it is read only; for a file a
 * script is known to have written, which script, and that **Run** writes it again; and for
 * any other file under `output`, that the next run that writes it replaces it.
 */
export function readOnlyWords(path: string, writer: string | null = null): string {
  const base = "Read only: this file is shown to be read, and is not changed here.";
  if (writer !== null)
    return `${base} ${writer} wrote it: Run runs that script, and writes it again.`;
  return path.startsWith("output/")
    ? `${base} It is in output, where the scripts write: the next run that writes it replaces it.`
    : base;
}
