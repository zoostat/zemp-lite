import { describe, expect, it } from "vitest";
import { GLIDE_MS, came, glided, marked, reached, type Steps } from "./start";

const steps = (
  fetching: Steps["fetching"],
  checking: Steps["checking"],
  starting: Steps["starting"],
) => ({
  fetching,
  checking,
  starting,
});

describe("the bar of the loading screen", () => {
  it("is where the three steps have got to, the fetching by the share that has come", () => {
    expect(reached(steps("waiting", "waiting", "waiting"), null)).toBe(0);
    expect(reached(steps("going", "waiting", "waiting"), 50)).toBe(35);
    expect(reached(steps("done", "going", "waiting"), 100)).toBe(70);
    expect(reached(steps("done", "done", "going"), 100)).toBe(85);
    expect(reached(steps("done", "done", "done"), 100)).toBe(100);
  });

  it("glides: a start that is done at once still fills the bar over about a second", () => {
    let shown = 0;
    let frames = 0;
    // The steps are done before the first frame: sixty frames to the second.
    while (shown < 100) {
      shown = glided(shown, 100, GLIDE_MS / 60);
      frames += 1;
      expect(shown).toBeLessThanOrEqual(100);
    }
    expect(frames).toBeGreaterThanOrEqual(59);
    expect(frames).toBeLessThanOrEqual(61);
  });

  it("follows a slow fetching as it comes, never ahead of it and never back", () => {
    expect(glided(10, 12, 16)).toBeCloseTo(11.6, 5);
    expect(glided(10, 10.5, 16)).toBe(10.5);
    expect(glided(40, 40, 500)).toBe(40);
    // A long wait between two frames does not carry the bar past where the steps are.
    expect(glided(0, 70, 5000)).toBe(70);
    // The steps begun again (Try again): the bar is where they are.
    expect(glided(85, 0, 16)).toBe(0);
  });
});

describe("the marks of the three steps", () => {
  it("are done only once the bar has passed them, so that marks and bar agree", () => {
    const all = steps("done", "done", "done");
    expect(marked(all, 0)).toEqual(steps("going", "waiting", "waiting"));
    expect(marked(all, 69)).toEqual(steps("going", "waiting", "waiting"));
    expect(marked(all, 70)).toEqual(steps("done", "going", "waiting"));
    expect(marked(all, 85)).toEqual(steps("done", "done", "going"));
    expect(marked(all, 99.9)).toEqual(steps("done", "done", "going"));
    expect(marked(all, 100)).toEqual(steps("done", "done", "done"));
  });

  it("are as the steps are while a step still runs", () => {
    expect(marked(steps("waiting", "waiting", "waiting"), 0)).toEqual(
      steps("waiting", "waiting", "waiting"),
    );
    expect(marked(steps("going", "waiting", "waiting"), 20)).toEqual(
      steps("going", "waiting", "waiting"),
    );
    expect(marked(steps("done", "going", "waiting"), 70)).toEqual(
      steps("done", "going", "waiting"),
    );
    expect(marked(steps("done", "done", "going"), 85)).toEqual(steps("done", "done", "going"));
  });

  it("say at once that a step failed", () => {
    expect(marked(steps("failed", "waiting", "waiting"), 3)).toEqual(
      steps("failed", "waiting", "waiting"),
    );
    expect(marked(steps("done", "failed", "waiting"), 70)).toEqual(
      steps("done", "failed", "waiting"),
    );
    expect(marked(steps("done", "done", "failed"), 85)).toEqual(steps("done", "done", "failed"));
  });
});

describe("how the engine came", () => {
  it("is over the network where about as many bytes travelled as its body holds", () => {
    expect(came({ transferSize: 4_081_013, encodedBodySize: 4_080_713 })).toEqual({
      how: "fetched",
      bytes: 4_080_713,
    });
    // A host that does not compress sends the file whole.
    expect(came({ transferSize: 15_148_642, encodedBodySize: 15_148_342 })).toEqual({
      how: "fetched",
      bytes: 15_148_342,
    });
  });

  it("is from the browser's keeping where nothing travelled, or only an answer that it has not changed", () => {
    expect(came({ transferSize: 0, encodedBodySize: 4_080_713 })).toEqual({ how: "kept" });
    expect(came({ transferSize: 312, encodedBodySize: 4_080_713 })).toEqual({ how: "kept" });
  });

  it("is not said where the browser's record does not say", () => {
    expect(came(undefined)).toBeNull();
    expect(came({})).toBeNull();
    expect(came({ transferSize: 0, encodedBodySize: 0 })).toBeNull();
  });
});
