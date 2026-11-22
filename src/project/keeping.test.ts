// Whether the browser keeps the projects, and the reminder to export (release 0.2.2, step 6).
import { describe, expect, it } from "vitest";
import { MemoryFolder } from "./folder";
import { REMIND_AFTER, keepingOf, reminderOf } from "./keeping";
import { Projects } from "./projects";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 22, 12);

describe("what the browser does with the projects", () => {
  it("keeps them for good where it has agreed already, without being asked again", async () => {
    let asked = 0;
    const storage = {
      persisted: () => Promise.resolve(true),
      persist: () => Promise.resolve(++asked > 0),
    };
    expect(await keepingOf(storage, true, true)).toBe("kept");
    expect(asked).toBe(0);
  });

  it("is asked when the first project is made, and may agree or refuse", async () => {
    const agrees = {
      persisted: () => Promise.resolve(false),
      persist: () => Promise.resolve(true),
    };
    const refuses = {
      persisted: () => Promise.resolve(false),
      persist: () => Promise.resolve(false),
    };
    expect(await keepingOf(agrees, true, true)).toBe("kept");
    expect(await keepingOf(refuses, true, true)).toBe("may-clear");
    // Not asked where no project was made: only what it has agreed to already is read.
    expect(await keepingOf(agrees, true, false)).toBe("may-clear");
  });

  it("may clear where it cannot be asked, or fails when asked", async () => {
    expect(await keepingOf(undefined, true, true)).toBe("may-clear");
    expect(await keepingOf({}, true, true)).toBe("may-clear");
    const fails = {
      persisted: () => Promise.reject(new Error("no")),
      persist: () => Promise.resolve(true),
    };
    expect(await keepingOf(fails, true, true)).toBe("may-clear");
  });

  it("keeps nothing where it gives the page no storage, whatever it says", async () => {
    const agrees = { persisted: () => Promise.resolve(true), persist: () => Promise.resolve(true) };
    expect(await keepingOf(agrees, false, true)).toBe("none");
  });
});

describe("the line of the status bar that reminds a reader to export", () => {
  it("says so wherever the browser may clear the project, with when it was last exported", () => {
    expect(reminderOf({ made: NOW, exported: null }, "may-clear", NOW)).toBe(
      "the browser may clear this project · not exported yet",
    );
    expect(reminderOf({ made: NOW - 9 * DAY, exported: NOW - 60_000 }, "may-clear", NOW)).toBe(
      "the browser may clear this project · exported today",
    );
    expect(reminderOf({ made: null, exported: NOW - DAY - 1 }, "may-clear", NOW)).toBe(
      "the browser may clear this project · exported yesterday",
    );
    expect(reminderOf({ made: null, exported: NOW - 12 * DAY }, "may-clear", NOW)).toBe(
      "the browser may clear this project · exported 12 days ago",
    );
  });

  it("says so where the browser keeps nothing after the tab is closed", () => {
    expect(reminderOf({ made: NOW, exported: null }, "none", NOW)).toBe(
      "this browser keeps no project after the tab is closed · not exported yet",
    );
    expect(reminderOf({ made: NOW, exported: NOW }, "none", NOW)).toBe(
      "this browser keeps no project after the tab is closed · exported today",
    );
  });

  it("is silent where the browser has agreed and the project was exported, or made, within 30 days", () => {
    expect(reminderOf({ made: NOW, exported: null }, "kept", NOW)).toBeNull();
    expect(reminderOf({ made: NOW - REMIND_AFTER + 1, exported: null }, "kept", NOW)).toBeNull();
    expect(
      reminderOf({ made: NOW - 400 * DAY, exported: NOW - REMIND_AFTER + 1 }, "kept", NOW),
    ).toBeNull();
    // When it was made is not known, and it was never exported: nothing can be counted.
    expect(reminderOf({ made: null, exported: null }, "kept", NOW)).toBeNull();
  });

  it("speaks on the day the 30 days are up, counting from the export or, without one, from the making", () => {
    expect(reminderOf({ made: NOW - REMIND_AFTER, exported: null }, "kept", NOW)).toBe(
      "not exported yet, 30 days after it was made",
    );
    expect(reminderOf({ made: NOW - 400 * DAY, exported: NOW - REMIND_AFTER }, "kept", NOW)).toBe(
      "not exported for 30 days",
    );
    expect(reminderOf({ made: NOW - 400 * DAY, exported: NOW - 41 * DAY }, "kept", NOW)).toBe(
      "not exported for 41 days",
    );
  });
});

describe("when a project was made", () => {
  function kept() {
    const all = new Map<string, string>();
    return {
      getItem: (key: string) => all.get(key) ?? null,
      setItem: (key: string, value: string) => void all.set(key, value),
    };
  }

  it("is kept from its making, and for a project made before this was kept, from when it is first seen", async () => {
    let now = 1_000;
    const root = new MemoryFolder();
    const store = kept();
    const projects = new Projects(root, store, () => now);
    expect((await projects.create("Wages")).made).toBe(1_000);
    now = 9_000;
    expect((await projects.open("wages"))?.info.made).toBe(1_000);
    // A project the record does not know: first seen now.
    await root.write(
      "projects/older/zeff.toml",
      new TextEncoder().encode('[project]\nname = "Older"\n'),
    );
    expect((await projects.list()).find((one) => one.folder === "older")?.made).toBe(9_000);
    now = 20_000;
    expect((await projects.peek("older"))?.info.made).toBe(9_000);
    // Removed, a project is forgotten: one made later in a folder of that name is new.
    await projects.remove("wages");
    now = 30_000;
    expect((await projects.create("Wages")).made).toBe(30_000);
  });
});
