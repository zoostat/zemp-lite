// What is asked of the worker once and kept (release 0.2.3, step 2): the index of the help,
// which does not change while the window is open. Every caller is given the one answer; an
// asking that failed (the worker not yet there) is forgotten, so that the next call asks again.

/** `ask`, made once: later calls are given the first answer, and a failure is not kept. */
export function once<T>(ask: () => Promise<T>): () => Promise<T> {
  let asked: Promise<T> | null = null;
  return () => {
    if (asked === null) {
      const asking = ask();
      asked = asking;
      asking.catch(() => {
        if (asked === asking) asked = null;
      });
    }
    return asked;
  };
}
