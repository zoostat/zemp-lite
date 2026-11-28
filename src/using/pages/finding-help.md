# Finding help

Search by a name you know, browse the functions by package, or press F1 on a name in the script.

Every page of Help but these few on the app is the engine's own, in the words `zeff help` prints.

## Search

Type in the field at the top of the **Topics** pane, at the left of Help; <kbd>/</kbd> puts the cursor there, and opens the pane if it is closed. From the second letter a list of what was found stands under the field, in the pane. You can type:

- a function's name, or its beginning: `summ` finds `summary`;
- a word of what a function does: `regression`;
- a name from R or Stata: `lm` and `reghdfe` both find `reg`;
- the code of an error or a warning: `W0201`.

<kbd>↓</kbd> and <kbd>↑</kbd> move through the list, <kbd>↵</kbd> opens the match marked, and <kbd>Esc</kbd> closes the list. With no match marked, <kbd>↵</kbd> opens the page of what you typed where that is a name of Zeff's, and otherwise the first match of the list: `lm` and <kbd>↵</kbd> opens `reg`.

![The Help place with lm typed in its search field: under the field a list of three functions, reg, anova and posthoc, each saying it matched R's lm().](search-in-help)

## Browse

**Home** is where Help starts: what Zeff and Zemp Lite are, and a card for each kind of page, the packages, the errors and warnings, and these pages on the app. A package's page lists its functions, each with its one line. The **Topics** pane at the left is the index of Help. Under the search field, the words Start here stand over Home and the two pages to read first. Then a section for each of the three, and **Functions**, which lists every function by its name with its package; press a section's name to unfold it. Beside a page the pane lists the pages around it, and **All topics** brings the index back. At the right of a page its sections are listed, under the words On this page; press one to go to it.

## From the script

Rest the pointer on a function's name in the script, and a card says what the function does, how it is called, and what it matches in R and Stata, with **Open its page** at its foot. With the cursor on the name, <kbd>⇧F1</kbd> shows the same card and <kbd>F1</kbd> opens Help at its page. When a run gives a warning or an error, press **Explain** beside it for the page of its code.

## Running an example

Every example on a function's page can be run where it stands. The engine in your browser runs a page's examples as the page opens, so what stands under each, and any plot, is what your engine gives. Change the statements, then press **Run**, or <kbd>⌘↵</kbd> in them, to see what the change does; **Reset** puts the page's own statements back. The code of a warning or an error under an example opens its page.

An example runs in a session of its own. It sees the datasets that come with Zeff and nothing of your project, and it changes nothing there: your script, its results and your files stay as they are. An example is run together with those above it on its page, because a later one often uses what an earlier one made.

**Copy to script** puts an example's statements, as they stand, into your open script at the cursor, and shows the script. Undo takes them out again.

On the page of an error or a warning the example is an illustration of the message. It is not run until you press **Run**, and it may name a frame that the page does not make.

## A name with two functions

A few names are two functions: `histogram` draws a variable of a frame in one call, and it is also a layer added to a plot. Each has a page of its own, and the title says which by what the function is called on: histogram · of a frame, histogram · of a plot. The search, the **Topics** pane and a package's page list the two apart. The name alone, typed in the field or met as a link, opens a short page with both, each with its usage and its one line, to choose from. <kbd>F1</kbd> in the script opens the one your call runs.

## Moving about

**Back** and **Forward** go through the pages you have opened, as in a web browser; <kbd>⌘[</kbd> and <kbd>⌘]</kbd> do the same. The trail beside them says where a page stands, and each of its steps is a link.

A page to try: [t_test](help:t_test), or the warning [W0201](code:W0201). [Getting started](getting-started) is the first of these pages.
