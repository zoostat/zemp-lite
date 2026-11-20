// Copy as Zeff (open decision #114; Zemp Specification, section 2): the statement equivalent to
// what the data viewer shows, put on the clipboard and never written into the script. A sort
// and a filter of the frame become one expression, `wages.where(…).sort(…)`, which prints the
// frame as the view shows it; a change of a variable's type, contrast or labels becomes the
// `let` that makes it, in the forms the sample script uses. A selection of rows is never
// copied as a statement, and neither is a search, which is the viewer's alone.

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

/** The types a variable can be given (`x.to(type)`, the catalogue's function 36). */
export const TYPES = ["Int", "Float", "Str", "Bool", "Category"] as const;

/** The contrasts of a category (`category(var, contrast:)`, the catalogue's function 40). */
export const CONTRASTS = ["treatment", "sum", "helmert", "poly"] as const;

/** The statement that gives a variable another type: `category(x)` for a category, as the sample writes it. */
export function typeAsZeff(frame: string, variable: string, type: string): string {
  const v = named(variable);
  const made = type === "Category" ? `category(${v})` : `to(${v}, ${type})`;
  return `let ${named(frame)} = ${named(frame)}.add(${v} = ${made})`;
}

/** The statement that codes a category's indicators by another contrast. */
export function contrastAsZeff(frame: string, variable: string, contrast: string): string {
  const v = named(variable);
  return `let ${named(frame)} = ${named(frame)}.add(${v} = category(${v}, contrast: ${contrast}))`;
}

/** The statement that labels the codes of a whole-number variable; `null` where no label is given. */
export function labelsAsZeff(
  frame: string,
  variable: string,
  labels: { code: number; label: string }[],
): string | null {
  const given = labels.filter((one) => one.label.trim() !== "");
  if (given.length === 0) return null;
  const pairs = given.map((one) => `${one.code} => ${JSON.stringify(one.label.trim())}`).join(", ");
  return `let ${named(frame)} = ${named(frame)}.label(${named(variable)}, [${pairs}])`;
}
