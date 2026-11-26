# Projects, scripts and files

A project is a folder of scripts and data kept in this browser: make one, fill it, and take it out as a zip.

## Projects

The screen of projects lists the projects this browser keeps. **New project…** makes one, with a first script. **Scratch project** is always there, with its examples, for trying things. From inside a project, **Projects**, at the top left, goes back to the list.

Each project in the list has a menu at the right of its row: **Rename…**, **Duplicate…**, **Export project…** and **Delete…**. The Scratch project cannot be renamed or deleted; it can be duplicated into a project of your own, and reset to its examples.

## The files of a project

**Project**, at the left of the bar under the top bar, opens the pane of the project's files. Press a file to open it.

![The Script place with the Project pane open at the left: the folders of the Scratch project, scripts and data, with a menu button at the right of each row.](the-project-pane)

The **+** at the head of the list, beside the project's name, adds to the project:

- **New script** and **New folder**: type the name in the row where it will stand.
- **Add files…**: data files from this computer, which a script can then read.

Each file and folder has a menu at the right of its row: **Rename…**, **Move to…**, **Duplicate**, **Delete…** and **Save a copy…**, which saves the file to this computer. The files Zeff opens by name, the main script and `zeff.toml` among them, keep their names and places: their menus have no rename, move or delete.

## When a script names a file

If you rename, move or delete a file that a script names, the app says which script names it, and on which line. It never rewrites a script for you.

## Taking a project out

**Export project…** writes the whole project as one zip: its scripts, its data and what its runs wrote. **Open project…**, on the screen of projects, opens such a zip again, here or in another browser.

## A project that names another Zeff

A project names the Zeff engine it runs on, in its `zeff.toml`, and runs on that engine and no other, so that its results cannot change under it. This app carries one engine. Where a project names another, as one made here before the app's engine changed, a line under the top bar says so and offers to move the project to this app's engine: that rewrites the one line of `zeff.toml` and nothing else. Until it is moved, the engine refuses to run it, and says why. After the move, run its scripts again; where a result differs from before, the notes of that Zeff release say what changed. The Scratch project is moved for you.
