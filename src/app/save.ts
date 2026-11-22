// A file given to the computer: the browser saves it where it saves what it downloads, under
// the name given. Nothing is sent anywhere; the bytes are the page's own.

/** Give some bytes to the browser to save as `name`. */
export function saveToComputer(
  name: string,
  bytes: Uint8Array,
  type = "application/octet-stream",
): void {
  const address = URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>], { type }));
  const link = document.createElement("a");
  link.href = address;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(address), 10_000);
}
