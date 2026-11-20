# The key to the reader test (for the owner only; not for the readers)

For each script: what it does, what a reader must see to have read it as meant, and the
misreadings it is there to catch. The engine's own first lines of output, from the released
Zeff 0.8.0, confirm each reading.

1. **`r01`.** Least squares of log hourly wage on schooling and a quadratic in experience,
   2019 alone, robust standard errors (HC1). *Look for:* `exper^2` read as experience squared,
   a term of the model (not a transformation of the variable named elsewhere); `log` natural.
2. **`r02`.** Least squares of log wage on schooling, sex and union membership, among those aged
   25 to 54 (`age < 55`), errors clustered by worker. *Look for:* the age band read with its
   ends right (25 kept, 55 not); `cluster:` read as clustered errors, not as fixed effects.
3. **`r03`.** Log wage on union membership and a quadratic in experience with worker and year
   fixed effects (two-way), errors clustered by worker. *Look for:* `fe: worker + year` read as
   two sets of absorbed effects, not as an interaction; the engine warns (W1004) that experience
   keeps under 1% of its variation, since it rises one a year within a worker.
4. **`r04`.** From 2015 on: log wage on schooling, sex, their interaction and experience, robust
   errors. *Look for:* `educ * female` read as both main effects and their product
   (`educ:female`), as in R, not the product alone.
5. **`r05`.** Log wage on schooling and industry, the industry indicators coded as sum
   (deviation) contrasts, robust errors. *Look for:* `contrast: sum` read as effects measured
   from the mean of the industries, not from a left-out base; `.add` read as adding (or
   replacing) variables in the frame.
6. **`r06`.** 2019: log wage on schooling and experience, weighted by weekly hours as analytic
   weights, robust errors. *Look for:* `weights: hours` with `weight_type: analytic` read as
   precision weights, not as frequency weights or sampling weights.
7. **`r07`.** The effect of the training course on productivity by two-stage least squares, the
   offer by lot instrumenting the course taken, age as a control, site effects absorbed, robust
   errors. *Look for:* `instruments: training ~ offer` read as "training is instrumented by
   offer", the right way round.
8. **`r08`.** One least-squares fit for each year 2010 to 2021, **twelve** fits, set side by side
   in one table by `report`; classical errors. *Look for:* `2010..2021` read as including 2021;
   the brackets read as a list of fits, one per year.
9. **`r09`.** Welch's two-sample t test of extra sleep between the two drugs, unequal variances
   by default. *Look for:* read as two independent samples; the default (Welch, not pooled)
   known or guessed. (The data are in truth paired, by `id`: a reader who says so has read the
   data well, and the script does not do it.)
10. **`r10`.** Rows with a wage; three age bands made into an ordered set of levels (young below
    30, middle 30 to 49, older 50 and over); log wage on schooling and the band, the young the
    base, errors clustered by firm. *Look for:* `case` read top to bottom, first match wins;
    `levels:` read as the order of the levels and the first as the base; `_` read as "any other".
