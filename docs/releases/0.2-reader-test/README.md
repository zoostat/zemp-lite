# The reader test of Zeff's syntax, on the Zemp Lite alpha

The testing handbook, section 2.4, item 4: give students and referees short scripts and ask
what each model does; fix what they misread. One test serves Zemp Lite and Zeff 0.9.0
(question 3 of release 0.2, answered "as recommended"). It was made ready at 0.2 and, by the
owner's decision of 21 November 2026, is run on the hosted 0.2.1, in the layout of three panes;
its ten scripts are as they were.

## What it is for

Whether a reader who knows statistics, and R or Stata, reads a Zeff script as it is meant,
without being told. A misreading is a finding about the language (a name, a default, a form
of writing), never about the reader.

## How to run it

1. Choose five to eight readers: students, referees, colleagues. Note for each which of R,
   Stata, SPSS or Python they use, and how long they have done empirical work.
2. Give each reader `sheet.md` (printed or as a file) and the address of the alpha. Not the
   key.
3. Each reader reads each script on the sheet, writes the answers, and only then may paste the
   script into the alpha's Scratch project, in place of the script there, and press **Run**:
   each result opens under its statement, with a note beside it. What they wrote before
   running is the finding.
4. Ask them to write down anything they had to guess, even when they guessed right.
5. Collect the sheets. Compare each answer with `key.md`; for each script, count the readers who
   read it as meant, and copy every misreading and every guess, word for word.

About forty minutes for a reader. Nothing is collected by the alpha; the sheets are all there is.

## What happens after

Each misreading or guess shared by two readers or more is a finding. Bring the findings back to
the session ("the reader test's results are in"): each is either fixed (in Zemp, or put to the
Zeff session for 0.9.0) or recorded with the reason it stays, before "Release 0.2.1".

## The scripts

`scripts/r01.zeff` to `scripts/r10.zeff`, the same as on the sheet. Each runs on the released
Zeff 0.8.0 (a test of this repository holds them to running without an error), on the data that
ships with it: `wages` (a panel of workers, 2010 to 2021), `staff` (a training course offered by
lot) and `sleep` (two drugs and extra hours of sleep).
