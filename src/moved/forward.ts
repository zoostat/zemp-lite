// Where an address of release 0.2.4 leads (release 0.2.5, step 2; open decision #225, item 2).
// In 0.2.4 alone the app stood at `/app/`, and the address of a project, of the naming of a new
// one and of a page of Help was `/app/` with that place after its `#`. The app stands at the
// root again, where those places are written the same way; a reader's bookmark of 0.2.4, or a
// link in a message, must still open the place it names.

/** The app's address: the root. */
export const APP = "/";

/**
 * The address at the root of what an address of `/app/` named, by what follows its `#`: the
 * same place, which the app reads as it reads any address; and the root itself where nothing
 * follows.
 */
export function forwarded(hash: string): string {
  return hash === "" || hash === "#" ? APP : `${APP}${hash}`;
}
