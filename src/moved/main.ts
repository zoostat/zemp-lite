// What stands at `/app/` (release 0.2.5, step 2; open decision #225, item 2): nothing is drawn.
// The address is replaced by the same place at the root, so that Back does not return here to
// be sent on again.
import { forwarded } from "./forward";

window.location.replace(forwarded(window.location.hash));
