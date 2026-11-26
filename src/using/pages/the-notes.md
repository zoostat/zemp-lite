# The notes beside each statement

Beside each statement a note says what it made; press one to see what the statement printed.

## What a note says

A note names what its statement made, in the engine's words: the name it bound, the type, and its size: for a frame its rows and variables, as `wages Frame · 15,571 × 13`, and for a fit or a test the observations it used, as `m3 RegFit · N 15,366`. A statement that only prints has the head of what it printed. A warning's code stands at the end of the note.

![The Script place after a run with every output folded: beside each statement a note with a name, a type and a size, and nothing between the lines of the script.](the-notes)

## Folding and unfolding

A note with something to show is a button. Press it to unfold what the statement printed, under the statement; press it again to fold it. <kbd>⌥↵</kbd> does the same for the statement the cursor is in.

**Fold all** and **Unfold all**, over the script, act on every statement at once. An error stays unfolded. **Notes**, at the right of that bar, hides the notes and shows them again.

An unfolded output has a line of its own at its head: the line of its statement, how long it took, **Copy as text**, which copies what was printed, and **Fold**.

## When the script changes

A note also says how its result stands to the script as it is now:

- `edited · not run`: you changed this statement since it ran.
- `stale`: a statement above it changed, so this result may no longer hold.
- `not run`: the run ended before it, or it was never run.
- `running…` and `waiting`, while a run goes; `failed`, where one stopped.

Run again and every note is fresh. The script itself is never changed by a run.
