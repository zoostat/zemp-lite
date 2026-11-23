# Sections and the outline

A comment that begins with a hash makes a section; the Outline pane lists them, goes to them and runs them.

## Making sections

A comment line written `// # Describe` begins a section called Describe, which runs to the next such line. Two hashes, `// ## By group`, begin a subsection inside it. Sections are comments: the engine passes over them, and a script with sections runs anywhere Zeff does.

## The Outline pane

**Outline**, in the bar under the top bar, opens the pane. It lists the sections of the script with their lines, a subsection under its section, and follows the script as you type.

![The Script place with the Outline pane open at the left, listing the four sections of the example, Sample, Describe, Models and Figure, each with the line it begins on.](the-outline)

Press a section to bring its heading to the top of the script.

## Running a section

Rest the pointer on a section in the pane, or reach it with the Tab key, and an arrow appears beside it. It runs the statements of that section with the statements they need, and no others. From the keyboard, press <kbd>⌘K</kbd> with the cursor in a section: the command Run section names it and its lines.
