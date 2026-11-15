// How the interface writes sizes and counts.

/** A size in bytes as it is read: "28 B", "5.6 kB", "56 kB", "1.2 MB", in units of 1,000. */
export function size(bytes: number): string {
  if (bytes < 1000) {
    return `${bytes} B`;
  }
  const units = ["kB", "MB", "GB"];
  let value = bytes;
  let unit = -1;
  do {
    value /= 1000;
    unit += 1;
  } while (value >= 999.5 && unit < units.length - 1);
  return `${value < 9.95 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

/** A whole number with its thousands marked: "18,412". */
export function count(value: number): string {
  return value.toLocaleString("en-GB");
}
