// Which licence expressions the Paper module may link (`tools/paper-licences.mjs`).
import assert from "node:assert/strict";
import { test } from "node:test";
import { permitted } from "./paper-licences.mjs";

test("a licence is permitted where it can be met on permissive terms alone", () => {
  for (const expression of [
    "MIT",
    "Apache-2.0",
    "MIT OR Apache-2.0",
    "MIT/Apache-2.0",
    "Apache-2.0 / MIT",
    "Unicode-3.0",
    "Zlib OR Apache-2.0 OR MIT",
    "(MIT OR Apache-2.0) AND Unicode-3.0",
    "MIT AND (MIT OR Apache-2.0)",
    "Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT",
    "0BSD OR CC0-1.0",
    "Unlicense/MIT",
    "Apache-2.0 OR BSL-1.0",
    // One of the terms offered is enough.
    "MIT OR GPL-3.0-or-later",
  ]) {
    assert.equal(permitted(expression), true, expression);
  }
});

test("a licence is refused where any part of it has no permissive term", () => {
  for (const expression of [
    "GPL-3.0-or-later",
    "LGPL-2.1",
    "AGPL-3.0",
    "MPL-2.0",
    "LPPL-1.3c",
    "MIT AND GPL-2.0",
    "(MIT OR Apache-2.0) AND MPL-2.0",
    "MPL-2.0 OR LGPL-2.1",
    "",
  ]) {
    assert.equal(permitted(expression), false, expression);
  }
});
