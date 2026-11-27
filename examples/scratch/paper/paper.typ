// A paper, set by Typst as you type.
// Its table and its figure are written by scripts/paper.zeff:
// press Run, and both are made again and set here.

// Mathematics is set in Libertinus Math, the face Zemp Lite carries for it.
#show math.equation: set text(font: "Libertinus Math")
#set page(paper: "a4", margin: 2.5cm)
#set par(justify: true)

= Returns to schooling

This page is a sample. It estimates what a year of schooling adds to the wage, in the panel of wages that ships with Zeff, with the usual equation:

$ ln(w_i) = alpha + beta "educ"_i + gamma_1 "exper"_i + gamma_2 "exper"_i^2 + epsilon_i $

Column (1) is the equation above; column (2) adds whether the worker is a woman and whether a union covers the job, with standard errors clustered by worker.

#figure(
  kind: table,
  include "../output/returns.typ",
  caption: [The log wage on schooling and experience, 2012 and later, ages 25 and over.],
)

#figure(
  image("../output/schooling.svg", width: 62%),
  caption: [The log wage and the years of schooling in 2019, with the line of best fit.],
)
