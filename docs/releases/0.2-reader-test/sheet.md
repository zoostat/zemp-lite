# Reading Zeff: ten short scripts

Thank you for reading these. Each is a few lines of Zeff, a language for statistics. For each,
read the script and answer the three questions in your own words **before** you run it. There
is no wrong answer from you: if a script can be misread, that is the language's fault, and it
is what we want to find. Write down anything you had to guess.

After answering, you may open the alpha, choose **Scratch project**, paste a script in place of
the one there and press **Run**: each result opens under its statement.

**About you.** Which of R, Stata, SPSS or Python do you use? ___________________________

How many years have you done empirical work? ________

The data: `wages` is a panel of workers observed each year from 2010 to 2021 (`worker`, `year`,
`wage` per hour, `educ` in years, `exper` in years, `age`, `hours` per week, `union` 0 or 1,
`female` 0 or 1, `industry`, `firm`). `staff` is a training course offered by lot (`offer`) and
taken by choice (`training`), with each employee's `productivity`, `age` and `site`. `sleep` is
the extra hours of sleep (`extra`) of ten patients on each of two drugs (`group`).

## 1. `r01.zeff`

```zeff
let wages = dataset(wages).where(year == 2019)
wages.reg(log(wage) ~ educ + exper + exper^2, se: robust)
```

a. What does it estimate or test, in one or two sentences?

b. Which rows of the data does it use?

c. How are its standard errors (or its test) computed?

d. Anything you had to guess?

## 2. `r02.zeff`

```zeff
let wages = dataset(wages).where(age >= 25 && age < 55)
wages.reg(log(wage) ~ educ + female + union, cluster: worker)
```

a. What does it estimate or test, in one or two sentences?

b. Which rows of the data does it use?

c. How are its standard errors (or its test) computed?

d. Anything you had to guess?

## 3. `r03.zeff`

```zeff
let wages = dataset(wages)
wages.reg(log(wage) ~ union + exper + exper^2, fe: worker + year, cluster: worker)
```

a. What does it estimate or test, in one or two sentences?

b. Which rows of the data does it use?

c. How are its standard errors (or its test) computed?

d. Anything you had to guess?

## 4. `r04.zeff`

```zeff
let wages = dataset(wages).where(year >= 2015)
wages.reg(log(wage) ~ educ * female + exper, se: robust)
```

a. What does it estimate or test, in one or two sentences?

b. Which rows of the data does it use?

c. How are its standard errors (or its test) computed?

d. Anything you had to guess?

## 5. `r05.zeff`

```zeff
let wages = dataset(wages)
    .add(lwage = log(wage), industry = category(industry, contrast: sum))
wages.reg(lwage ~ educ + industry, se: robust)
```

a. What does it estimate or test, in one or two sentences?

b. Which rows of the data does it use?

c. How are its standard errors (or its test) computed?

d. Anything you had to guess?

## 6. `r06.zeff`

```zeff
let wages = dataset(wages).where(year == 2019)
wages.reg(log(wage) ~ educ + exper, weights: hours, weight_type: analytic, se: robust)
```

a. What does it estimate or test, in one or two sentences?

b. Which rows of the data does it use?

c. How are its standard errors (or its test) computed?

d. Anything you had to guess?

## 7. `r07.zeff`

```zeff
let staff = dataset(staff)
staff.ivreg(productivity ~ age + training, instruments: training ~ offer, fe: site, se: robust)
```

a. What does it estimate or test, in one or two sentences?

b. Which rows of the data does it use?

c. How are its standard errors (or its test) computed?

d. Anything you had to guess?

## 8. `r08.zeff`

```zeff
let wages = dataset(wages)
let fits = [for y in 2010..2021 {
    wages.where(year == y).reg(log(wage) ~ educ + exper)
}]
report(fits)
```

a. What does it estimate or test, in one or two sentences?

b. Which rows of the data does it use?

c. How are its standard errors (or its test) computed?

d. Anything you had to guess?

## 9. `r09.zeff`

```zeff
let sleep = dataset(sleep)
sleep.t_test(extra, group: group)
```

a. What does it estimate or test, in one or two sentences?

b. Which rows of the data does it use?

c. How are its standard errors (or its test) computed?

d. Anything you had to guess?

## 10. `r10.zeff`

```zeff
let wages = dataset(wages)
    .where(!is_missing(wage))
    .add(band = category(case {
        age < 30 => "young",
        age < 50 => "middle",
        _ => "older",
    }, levels: ["young", "middle", "older"]))
wages.reg(log(wage) ~ educ + band, cluster: firm)
```

a. What does it estimate or test, in one or two sentences?

b. Which rows of the data does it use?

c. How are its standard errors (or its test) computed?

d. Anything you had to guess?
