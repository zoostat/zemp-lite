# Papers and PDFs

Write a paper beside its page as Typst sets it, with the tables and figures your scripts export, and save a paper, or a script with its output, as a PDF.

## A paper

A paper is a Typst file of the project. Press **Paper** to write one: its source stands in the middle, and at the right the page as Typst sets it. The Scratch project holds a sample paper, which is open the first time you press **Paper** there.

![The Paper place with the sample paper open: its source in the middle, and at the right its page, with a heading, an equation, a table of two regressions and a figure.](the-paper-place)

**New paper…** asks for a name and makes the paper in the folder `paper` of the project; **Make** makes it, and **Cancel** leaves without one. A paper is saved as you type, as a script is. **Close** closes the paper and leaves its file; with no paper open, the place lists the papers of the project.

Typst is fetched the first time a paper is opened. The page's pane says how large it is and how far it has come, and this browser keeps it afterwards.

## The page

The page is set again a moment after you stop typing. **Fit width** draws it to the width of its pane; **Smaller page** and **Larger page**, the two signs beside it, draw it a size smaller or larger. A page is black on white, whichever theme the window is in.

Where Typst cannot set the text, its words stand under the line they are about, and above the page. The page of the text as it last set stays, marked as not the present text, until the text sets again.

Press a word, a table or a figure of the page to put the cursor at its place in the source. **Outline** lists the headings of the paper and goes to each, in the source and on the page. **Project** shows the files of the project, and **Page** closes and opens the page.

## Tables and figures from your scripts

A paper sets what a script writes with [export](help:export): a table as a Typst file, and a figure as SVG. The sample paper shows how a paper places each.

**Run**, pressed in Paper, runs the scripts whose files the paper uses, and the page is set again with what they wrote. A file the paper lacks is named, with the script that writes it. When a script has changed since it wrote a table or a figure, the page says that the file is stale, until **Run** writes it again.

## A paper as a PDF

**Export PDF…** saves the paper as a PDF, as Typst sets it, under the paper's name. The file holds no date: the same paper gives the same file.

## A script with its output as a PDF

**Export script with output…**, in the row of **Script**, saves the script as a PDF, with what each statement printed, said and drew under it. A script that has not been run has no output: you are offered **Run, then export**, or **Export the script alone**.
