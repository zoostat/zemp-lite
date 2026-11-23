# Reporting a problem

When a script fails in a way that looks like a fault of Zeff, the app builds a report for you to read and save; nothing is sent.

## Building the report

With the project open, press <kbd>⌘K</kbd> and choose `Report a problem`. The engine runs the script, then the failing statement with only the statements it needs, and writes what it found.

![The window Report a problem over the script: what the report is, a sentence saying nothing has been sent, the text of the report, and the button Save the report….](the-report)

If the script runs through, there is nothing to report, and the window says so.

## What the report holds

The report is text, shown whole before you do anything with it. It holds the error, the failing statement and the statements it depends on, the names and types of your variables, the names of the files they were read from, and the version of Zeff. It holds no rows of your data. A message is quoted as it was printed, and a message may name a value: read those lines too.

**Save the report…** saves it as a file on this computer. Read it, and attach it to an issue or a message yourself: the app sends nothing, here or anywhere.

## An error that is yours

Most errors are of the script, and their own page says how to mend them: press **Explain** beside an error or a warning, or see [Finding help](finding-help).
