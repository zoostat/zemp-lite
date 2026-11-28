# Running a script

Run the whole script, one statement, or a part of it, and see how the run went.

## The whole script

Press **Run**, or <kbd>⌘⇧↵</kbd>. The statements run in order, and each one's result opens under it. While a run goes the button reads Stop: press it to end the run, and what has finished is kept.

**Check** looks the script over as Zeff does before it runs it, and runs nothing: a misspelt name or a wrong argument is said with its line.

## A part of it

- <kbd>⌘↵</kbd> runs the statement the cursor is in, with the statements it needs, and leaves the rest as it was.
- Rest the pointer on a statement's line number: it reads **Run to here**, and pressing it runs the statements before that line.
- The commands have the rest. Press <kbd>⌘K</kbd> and type `run`.

![The list of commands with run typed, over the script: among them Run the script, Run the statement at the cursor, Run section, Run to here and Run from here, each with a few words on what it runs.](the-ways-to-run)

On Windows and Linux, <kbd>Ctrl</kbd> takes the place of <kbd>⌘</kbd>.

## How the run went

The row over the script says which run this is, when it was made, how many statements it ran and how long they took. The line at the foot of the window says how the results stand to the script: in sync, or stale after an edit.

If a statement fails, its error is shown under it, with the line and what to do, and the statements after it are marked `not run`. A warning does not stop a run: it is shown over the result it is about, with **Explain** to open the page of its code.
