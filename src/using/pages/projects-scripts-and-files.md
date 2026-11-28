# Projects, scripts and files

A project is a folder of scripts and data kept in this browser: make one, fill it, and take it out as a zip.

## Projects

The screen of projects lists the projects this browser keeps, as a table, the one opened last first: each with its scripts, how its last run went here (clean, with warnings, stopped by an error, or not run), its size, and when it was opened and exported. Press a row to open its project. **Find a project**, over the table, keeps the rows whose name, or a script's name, holds what you type. In the column on the left, **New project…** makes one, with a first script, and **Scratch project** is always there, with its examples, for trying things. From inside a project, **All projects**, at the foot of the icons down the left, goes back to the list. **Projects**, at the top left, opens a short list for the project as a whole: back to all projects, export it, rename it, report a problem.

Each project in the table has **Open** and **Export…** at the end of its row, and beside them a menu: **Rename…**, **Duplicate…**, **Export project…** and **Delete…**. The Scratch project cannot be renamed or deleted; it can be duplicated into a project of your own, and reset to its examples.

## The files of a project

**Project**, at the left of the row over the script, opens the pane of the project's files. Press a file to open it.

![The Script place with the Project pane open at the left: the folders of the Scratch project, scripts and data, with a menu button at the right of each row.](the-project-pane)

The **+** at the head of the list, beside the project's name, adds to the project:

- **New script** and **New folder**: type the name in the row where it will stand.
- **Add files…**: data files from this computer, which a script can then read.

A script, a paper and a plain note open to be written. Any other file that is text, such as a table a script exported or a data file of comma-separated values, opens to be read: the line at the top of the window says that it is read only, beside its name, and nothing typed changes it. A file that is not text does not open; **Save a copy…**, in its menu, saves it to this computer.

Each file and folder has a menu at the right of its row: **Rename…**, **Move to…**, **Duplicate**, **Delete…** and **Save a copy…**, which saves the file to this computer. The files Zeff opens by name, the main script and `zeff.toml` among them, keep their names and places: their menus have no rename, move or delete.

## When a script names a file

If you rename, move or delete a file that a script names, the app says which script names it, and on which line. It never rewrites a script for you.

## Taking a project out

**Export project…** writes the whole project as one zip: its scripts, its data and what its runs wrote. **Open project…**, on the screen of projects, opens such a zip again, here or in another browser.

## A project that names another Zeff

A project names the Zeff engine it runs on, in its `zeff.toml`, and runs on that engine and no other, so that its results cannot change under it. This app carries one engine. Where a project names another, as one made here before the app's engine changed, a line under the top bar says so and offers to move the project to this app's engine: that rewrites the one line of `zeff.toml` and nothing else. Until it is moved, the engine refuses to run it, and says why. After the move, run its scripts again; where a result differs from before, the notes of that Zeff release say what changed. The Scratch project is moved for you.
