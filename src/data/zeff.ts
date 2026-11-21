// Copy as Zeff (open decision #114; Zemp Specification, section 2): the statement equivalent to
// what the data viewer shows, put on the clipboard and never written into the script. A sort
// and a filter of the frame become one expression, `wages.where(…).sort(…)`, which prints the
// frame as the view shows it. A selection of rows is never copied as a statement, and neither
// is a search, which is the viewer's alone. (Until Zemp Lite 0.2.1 a change of a variable's
// type, contrast or labels was copied too, from the inspector; the Variables pane is for
// looking, and they left with open decision #203.)

/** A name as Zeff reads it: bare where it is an identifier, in backticks where it is not. */
export function named(name: string): string {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) ? name : `\`${name.replaceAll("`", "")}\``;
}

/** How the viewer shows a frame: kept to the rows of a condition, and sorted by a variable. */
export interface Shown {
  where: string;
  sort: { variable: string; desc: boolean } | null;
}

/** The expression that gives the frame `frame` as the view shows it; `null` where it is the frame. */
export function viewAsZeff(frame: string, shown: Shown): string | null {
  const where = shown.where.trim();
  if (where === "" && shown.sort === null) return null;
  let text = named(frame);
  if (where !== "") text += `.where(${where})`;
  if (shown.sort !== null) {
    text += `.sort(${named(shown.sort.variable)}${shown.sort.desc ? ", desc: true" : ""})`;
  }
  return text;
}
