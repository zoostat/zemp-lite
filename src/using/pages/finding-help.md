# Finding help

Search by a name you know, browse the functions by package, or press F1 on a name in the script.

Every page of Help but these few on the app is the engine's own, in the words `zeff help` prints.

## Search

Type in the field at the top of Help; <kbd>/</kbd> puts the cursor there. From the second letter a list opens with what was found. You can type:

- a function's name, or its beginning: `summ` finds `summary`;
- a word of what a function does: `regression`;
- a name from R or Stata: `lm` and `reghdfe` both find `reg`;
- the code of an error or a warning: `W0201`.

<kbd>↓</kbd> and <kbd>↑</kbd> move through the list, <kbd>↵</kbd> opens the match marked, and <kbd>Esc</kbd> closes the list.

![The Help place with lm typed in its search field: under the field a list of two functions, reg and anova, each saying it matched R's lm().](search-in-help)

## Browse

**Home** is the index of functions: every function of the engine, by package. Rest the pointer on a name to see what it does. The **Topics** pane at the left lists the packages and the errors and warnings; beside a page it lists the pages around it. **On this page**, at the right, lists the sections of the page you are reading.

## From the script

Put the cursor on a function's name in the script and press <kbd>F1</kbd>: Help opens at its page. When a run gives a warning or an error, press **Explain** beside it for the page of its code.

## Moving about

**Back** and **Forward** go through the pages you have opened, as in a web browser; <kbd>⌘[</kbd> and <kbd>⌘]</kbd> do the same. The trail beside them says where a page stands, and each of its steps is a link.

A page to try: [t_test](help:t_test), or the warning [W0201](code:W0201). [Getting started](getting-started) is the first of these pages.
