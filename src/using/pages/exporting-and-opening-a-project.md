# Exporting and opening a project

A project leaves the browser as one zip, and comes back from one: to keep it safe, to move it, or to run it with Zeff on a computer.

## Exporting

**Export project…** saves the project as a zip on this computer. On the screen of projects, **Export…** at the end of a project's row saves it without opening it, and the menu beside it has the same. With the project open, it is in **Projects**, at the top left; in the list of commands, as `Project: export…`; and at the foot of the window, beside the reminder to export, when there is one.

**Export all projects…**, at the foot of the column on the left of the screen of projects, saves every project of this browser, each as a zip of its own. A browser may ask, once, whether this site may save several files.

![The screen of projects with the menu of a project's row open: Rename…, Duplicate…, Export project… and Delete….](the-menu-of-a-project)

The zip holds the project as a folder: its scripts, its data, and what its runs wrote. It leaves out what is the app's own, such as which panes were open. Unpacked, it is a Zeff project like any other: `zeff run` runs it, and prints what the app showed.

## Opening a zip

**Open project…**, on the screen of projects, opens a zip that **Export project…** wrote, or a project's folder zipped by any other tool. The project that opens is a new one, under a name of its own: nothing already in the browser is replaced.

A zip that is not a project is refused in a sentence, and nothing is made.

## From one browser to another

Each browser keeps its own projects. To move a project to another browser, or another computer, export it there and open the zip here.
