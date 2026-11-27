// a Zeff export: place it in a document with `#include`
#layout(size => {
  let body = table(
    columns: 3,
    align: (left, right, right,),
    stroke: none,
    table.hline(stroke: 0.8pt),
    table.header("", "(1)  ", "(2)  "),
    table.hline(stroke: 0.5pt),
    "(intercept)", "1.784***", "1.837***",
    "", "(0.030)  ", "(0.050)  ",
    "educ", "0.074***", "0.074***",
    "", "(0.002)  ", "(0.003)  ",
    "exper", "0.039***", "0.038***",
    "", "(0.002)  ", "(0.004)  ",
    "exper2", "-0.001***", "-0.001***",
    "", "(0.000)  ", "(0.000)  ",
    "female", "", "-0.133***",
    "", "", "(0.013)  ",
    "union", "", "0.090***",
    "", "", "(0.013)  ",
    table.hline(stroke: 0.5pt),
    "SEs", "robust", "cluster worker",
    "N", "15,366", "15,366",
    "R²", "0.153", "0.181",
    table.hline(stroke: 0.8pt),
  )
  let notes = (
    text(size: 0.85em, "* p < 0.05, ** p < 0.01, *** p < 0.001"),
    text(size: 0.85em, "(2) note: 217 of the 3,653 clusters hold one observation"),
  )
  let widest = calc.max(measure(body).width, ..notes.map(note => measure(note).width + 10pt))
  block(width: calc.min(size.width, widest), {
    set align(left)
    set block(spacing: 0.65em)
    body
    for note in notes {
      block(inset: (x: 5pt), note)
    }
  })
})
