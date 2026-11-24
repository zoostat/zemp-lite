// Where an address kept from before leads (release 0.2.4, step 2; open decision #220, item 2).
// Until 0.2.4 the app stood at the root of its address, and a project's address was the root
// with `#/p/<folder>` after it. The app now stands at `/app/`, and the root is the front page;
// a reader's bookmark, or a link in a message, must still open the project it names.

/** The app's address under the root. */
export const APP = "/app/";

/**
 * The address in the app that what follows the `#` of a root address named before 0.2.4:
 * a project (`#/p/<folder>`) or the naming of a new one (`#/new`). `null` for anything else,
 * which is the front page's own.
 */
export function forwarded(hash: string): string | null {
  return /^#\/(?:p\/[^/]+|new)$/.test(hash) ? `${APP}${hash}` : null;
}
