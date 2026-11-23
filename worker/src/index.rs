//! The index of the help (Zemp Specification, section 15, the row of 0.2.3; open decision
//! #211): what the Help place lists before a page is asked for, and what its search looks
//! through. Every word of it is the engine's: the packages shipped, in the tiers' order; each
//! package's functions in the order `zeff help <package>` prints them, each with its one-line
//! summary; the shipped datasets; and, for each function, the R and Stata names a reader
//! coming from either would type, read from the page's _Coming from R or Stata_ where it has
//! one and from the catalogue's `equivalent` cell, each name saying which gave it.
//!
//! The two sources are prose and code mixed, so the names are read by rules, the same for
//! every function and set out at [`equivalent_names`] and [`cell_names`]. They are generous
//! on purpose: a name too many is a match low in a list, a name missed is a reader who does
//! not find the function.

use zeff_diagnostics::json_string;
use zeff_registry::{Block, Registered, Registry};

/// The language a name is of.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Language {
    R,
    Stata,
}

impl Language {
    fn word(self) -> &'static str {
        match self {
            Language::R => "R",
            Language::Stata => "Stata",
        }
    }
}

/// A name of R or of Stata: what a reader types (`feols`), and how the source wrote it
/// (`fixest::feols()`).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Name {
    pub of: Language,
    pub name: String,
    pub shown: String,
}

fn named(of: Language, name: &str, shown: String) -> Name {
    Name {
        of,
        name: name.to_string(),
        shown,
    }
}

/// A name is kept once for each language, as first written.
fn keep(names: &mut Vec<Name>, one: Name) {
    if !names
        .iter()
        .any(|held| held.of == one.of && held.name == one.name)
    {
        names.push(one);
    }
}

fn starts_name(c: char) -> bool {
    c.is_alphabetic() || c == '_'
}

fn in_name(c: char) -> bool {
    c.is_alphanumeric() || c == '_'
}

/// The name that begins at `at`, as its end: letters, digits and underscores, and in R a dot
/// with more of the name after it (`t.test`, never the dot of `as.*`).
fn name_end(text: &[char], at: usize, of: Language) -> usize {
    let mut end = at;
    while end < text.len() {
        let c = text[end];
        let dotted =
            of == Language::R && c == '.' && text.get(end + 1).is_some_and(|next| in_name(*next));
        if in_name(c) || dotted {
            end += 1;
        } else {
            break;
        }
    }
    end
}

fn text_of(text: &[char]) -> String {
    text.iter().collect()
}

/// A text without what it quotes: `"…"` in both languages and a macro of Stata, `` `…' ``,
/// each replaced by a space, so that nothing inside a text is read as a name.
fn unquoted(text: &str, of: Language) -> Vec<char> {
    let chars: Vec<char> = text.chars().collect();
    let mut out = Vec::with_capacity(chars.len());
    let mut at = 0;
    while at < chars.len() {
        let c = chars[at];
        if c == '"' {
            at += 1;
            while at < chars.len() && chars[at] != '"' {
                if chars[at] == '\\' {
                    at += 1;
                }
                at += 1;
            }
            at += 1;
            out.push(' ');
        } else if c == '`' && of == Language::Stata {
            at += 1;
            while at < chars.len() && chars[at] != '\'' {
                at += 1;
            }
            at += 1;
            out.push(' ');
        } else {
            out.push(c);
            at += 1;
        }
    }
    out
}

/// Whether a text says there is no equivalent ("no single function", "None built in").
fn says_none(text: &[char]) -> bool {
    let lower = text_of(text).trim().to_lowercase();
    lower == "no" || lower == "none" || lower.starts_with("no ") || lower.starts_with("none ")
}

/// A text cut at its commas outside every bracket.
fn items(text: &[char]) -> Vec<&[char]> {
    let mut found = Vec::new();
    let mut depth = 0usize;
    let mut from = 0;
    for (at, c) in text.iter().enumerate() {
        match c {
            '(' | '[' | '{' => depth += 1,
            ')' | ']' | '}' => depth = depth.saturating_sub(1),
            ',' if depth == 0 => {
                found.push(&text[from..at]);
                from = at + 1;
            }
            _ => {}
        }
    }
    found.push(&text[from..]);
    found
}

/// The one name a text is, where it is nothing else (`pi`, `ivreg2`).
fn sole_name(text: &[char], of: Language) -> Option<String> {
    let trimmed = text_of(text);
    let trimmed: Vec<char> = trimmed.trim().chars().collect();
    let first = *trimmed.first()?;
    (starts_name(first) && name_end(&trimmed, 0, of) == trimmed.len()).then(|| text_of(&trimmed))
}

/// The words of R that are followed by a bracket and are no function.
const R_WORDS: [&str; 4] = ["function", "if", "for", "while"];

/// The names of R in a text without quotes: every function called (`lm(`), with its package
/// where one is written (`fixest::feols(`, and `car::deltaMethod` without brackets); and
/// every operator written between percent signs (`%in%`). A name of one letter is left out:
/// it is an argument of the example (`f(x)`) far more often than a function.
fn r_names(text: &[char], names: &mut Vec<Name>) {
    let of = Language::R;
    let mut at = 0;
    while at < text.len() {
        let c = text[at];
        if starts_name(c) {
            let end = name_end(text, at, of);
            let word = text_of(&text[at..end]);
            let packaged = text.get(end) == Some(&':')
                && text.get(end + 1) == Some(&':')
                && text.get(end + 2).is_some_and(|next| starts_name(*next));
            if packaged {
                let last = name_end(text, end + 2, of);
                let name = text_of(&text[end + 2..last]);
                let brackets = if text.get(last) == Some(&'(') {
                    "()"
                } else {
                    ""
                };
                keep(names, named(of, &name, format!("{word}::{name}{brackets}")));
                at = last;
            } else {
                let called = text.get(end) == Some(&'(');
                if called && word.chars().count() > 1 && !R_WORDS.contains(&word.as_str()) {
                    keep(names, named(of, &word, format!("{word}()")));
                }
                at = end;
            }
        } else if c.is_ascii_digit() {
            // A number, or a word that begins with a digit: no name is read out of it.
            while at < text.len() && (in_name(text[at]) || text[at] == '.') {
                at += 1;
            }
        } else if c == '%' {
            let close = (at + 1..text.len().min(at + 7))
                .take_while(|next| !text[*next].is_whitespace())
                .find(|next| text[*next] == '%');
            match close {
                Some(close) => {
                    let operator = text_of(&text[at..=close]);
                    keep(names, named(of, &operator, operator.clone()));
                    at = close + 1;
                }
                None => at += 1,
            }
        } else {
            at += 1;
        }
    }
}

/// The words that join two commands of Stata in a sentence: the word after one begins a
/// command.
const STATA_JOINS: [&str; 4] = ["or", "then", "and", "after"];

/// The names of Stata in a text without quotes: every function called (`inlist(`), and the
/// first word of every command. A command begins the text, follows a semicolon, or follows
/// one of the joining words ("…, then encode x"); in a list (`listed`, the catalogue's way:
/// "regress, reghdfe") it follows every comma outside brackets too, and in a statement (a
/// page's way: "tabulate x, missing", "bysort g: gen s = sum(x)") a colon and never a plain
/// comma, after which Stata writes options. A name of one letter is left out, and a sentence
/// that begins with "the" is words, not a command.
fn stata_names(text: &[char], listed: bool, names: &mut Vec<Name>) {
    let of = Language::Stata;
    let mut fresh = true;
    let mut depth = 0usize;
    let mut at = 0;
    while at < text.len() {
        let c = text[at];
        if c.is_whitespace() {
            at += 1;
        } else if starts_name(c) {
            let end = name_end(text, at, of);
            let word = text_of(&text[at..end]);
            let long = word.chars().count() > 1;
            let next = text.get(end).copied();
            if next == Some('(') {
                if long {
                    keep(names, named(of, &word, format!("{word}()")));
                }
                fresh = false;
            } else if STATA_JOINS.contains(&word.as_str()) {
                fresh = true;
            } else {
                let alone = next.is_none_or(|n| n.is_whitespace() || n == ',' || n == ';');
                if fresh && alone && long && word != "the" {
                    keep(names, named(of, &word, word.clone()));
                }
                fresh = false;
            }
            at = end;
        } else if c.is_ascii_digit() {
            while at < text.len() && in_name(text[at]) {
                at += 1;
            }
            fresh = false;
        } else {
            match c {
                '(' | '[' | '{' => {
                    depth += 1;
                    fresh = false;
                }
                ')' | ']' | '}' => {
                    depth = depth.saturating_sub(1);
                    fresh = false;
                }
                ',' => fresh = listed && depth == 0,
                ';' => fresh = depth == 0,
                ':' => fresh = !listed && depth == 0,
                _ => fresh = false,
            }
            at += 1;
        }
    }
}

/// The names in one cell of a page's table under _Coming from R or Stata_, which holds a call
/// as one would write it (`max(x, na.rm = TRUE)`; `summarize x, then r(max)`): for R, the
/// functions called, with their packages, the operators between percent signs, and the cell
/// itself where it is one name (`pi`); for Stata, the functions called and the first word of
/// each command. A cell that says there is none ("no single function") gives nothing.
pub fn cell_names(of: Language, cell: &str) -> Vec<Name> {
    let text = unquoted(cell, of);
    let mut names = Vec::new();
    if says_none(&text) {
        return names;
    }
    match of {
        Language::R => match sole_name(&text, of) {
            Some(name) => keep(&mut names, named(of, &name, name.clone())),
            None => r_names(&text, &mut names),
        },
        Language::Stata => stata_names(&text, false, &mut names),
    }
    names
}

/// The four functions R has for a distribution, from the one the catalogue names with the
/// word "family" (`dlnorm family`): its density, distribution, quantiles and draws.
fn r_family(first: &str) -> Option<Vec<String>> {
    let rest = first.strip_prefix('d')?;
    (!rest.is_empty()).then(|| {
        ["d", "p", "q", "r"]
            .iter()
            .map(|l| format!("{l}{rest}"))
            .collect()
    })
}

/// The names of R in a piece of the catalogue's cell, which lists them between commas: an
/// item that is one name (`pnorm`, a package such as `haven`) is that name; an item that is a
/// name and the word "family" is the four functions of the distribution; any other item is
/// read as a cell of a page is.
fn r_listed(text: &[char], names: &mut Vec<Name>) {
    let of = Language::R;
    for item in items(text) {
        if let Some(name) = sole_name(item, of) {
            if name.chars().count() > 1 {
                keep(names, named(of, &name, name.clone()));
            }
            continue;
        }
        let words = text_of(item);
        let family = words
            .trim()
            .strip_suffix(" family")
            .and_then(|first| sole_name(&first.chars().collect::<Vec<_>>(), of))
            .and_then(|first| r_family(&first));
        match family {
            Some(four) => {
                for name in four {
                    keep(names, named(of, &name, name.clone()));
                }
            }
            None => r_names(item, names),
        }
    }
}

/// The names in the catalogue's `equivalent` cell of a function called `own`. The cell is a
/// short line of prose: pieces between semicolons, each of R unless the word `Stata` stands
/// in it, after which it is of Stata until the word `R` (so "R lm(), fixest::feols(); Stata
/// regress, reghdfe" is two names of each). A piece that names no language is of R, as a
/// package's function is (`dplyr::lag()`), unless it is one bare word after a piece of Stata
/// ("Stata estat firststage; ivreg2"). "Same name in R and Stata" is the function's own name
/// in both, and a cell that says there is none, or an empty one, gives nothing.
pub fn equivalent_names(own: &str, cell: &str) -> Vec<Name> {
    let mut names = Vec::new();
    let cell = cell.trim();
    if cell == "Same name in R and Stata" {
        for of in [Language::R, Language::Stata] {
            keep(&mut names, named(of, own, format!("{own}()")));
        }
        return names;
    }
    let mut last = Language::R;
    for piece in cell.split(';') {
        // The piece as stretches of one language each, cut at the words `R` and `Stata`.
        let mut stretches: Vec<(Language, String)> = Vec::new();
        let mut of = None;
        let mut held = String::new();
        for word in piece.split(' ') {
            let marks = match word {
                "R" => Some(Language::R),
                "Stata" => Some(Language::Stata),
                _ => None,
            };
            match marks {
                Some(marked) => {
                    stretches.push((of.unwrap_or(Language::R), std::mem::take(&mut held)));
                    of = Some(marked);
                }
                None => {
                    held.push_str(word);
                    held.push(' ');
                }
            }
        }
        let unmarked = of.is_none();
        let bare = unmarked
            && last == Language::Stata
            && sole_name(&held.chars().collect::<Vec<_>>(), Language::Stata).is_some();
        let closing = if bare {
            Language::Stata
        } else {
            of.unwrap_or(Language::R)
        };
        stretches.push((closing, held));
        for (of, words) in stretches {
            let text = unquoted(&words, of);
            if says_none(&text) {
                continue;
            }
            match of {
                Language::R => r_listed(&text, &mut names),
                Language::Stata => stata_names(&text, true, &mut names),
            }
        }
        last = closing;
    }
    names
}

/// Where a name was read: the page's table, or the catalogue.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum From {
    Page,
    Catalogue,
}

/// The R and Stata names of the functions of one name in one package (two, where a package
/// has a function of a frame and a function of a plot of that name): the pages' first, row
/// by row, then the catalogue's that the pages did not give.
fn names_of(homes: &[&Registered]) -> Vec<(Name, From)> {
    let mut page = Vec::new();
    for home in homes {
        for block in &home.doc.coming_from {
            if let Block::Table(rows) = block {
                for [_, r, stata] in rows {
                    for name in cell_names(Language::R, r) {
                        keep(&mut page, name);
                    }
                    for name in cell_names(Language::Stata, stata) {
                        keep(&mut page, name);
                    }
                }
            }
        }
    }
    let mut all = page.clone();
    for home in homes {
        for name in equivalent_names(home.spec.name, &home.row.equivalent) {
            keep(&mut all, name);
        }
    }
    let paged = page.len();
    all.into_iter()
        .enumerate()
        .map(|(at, name)| {
            (
                name,
                if at < paged {
                    From::Page
                } else {
                    From::Catalogue
                },
            )
        })
        .collect()
}

/// The index as a line of JSON of type `helpIndex`: the engine's version; `packages`, each
/// with its `name`, its `tier` and its `functions` (`name`, `summary`, and `names`: each
/// `{of, name, shown, from}`, where `of` is `R` or `Stata` and `from` is `page` or
/// `catalogue`); and `datasets`, each with its `name`, `title` and `summary`. A name with two
/// functions in one package is listed once, where `zeff help <package>` first prints it.
pub fn help_index(registry: &Registry, version: &str) -> String {
    let packages: Vec<String> = registry
        .packages_shipped()
        .into_iter()
        .map(|package| {
            let of_package: Vec<&Registered> = registry
                .functions()
                .iter()
                .filter(|f| f.spec.package == package)
                .collect();
            let tier = of_package.first().map_or(0, |f| f.row.tier);
            let mut listed: Vec<&str> = Vec::new();
            let mut functions: Vec<String> = Vec::new();
            for f in &of_package {
                if listed.contains(&f.spec.name) {
                    continue;
                }
                listed.push(f.spec.name);
                let homes: Vec<&Registered> = of_package
                    .iter()
                    .copied()
                    .filter(|other| other.spec.name == f.spec.name)
                    .collect();
                let names: Vec<String> = names_of(&homes)
                    .into_iter()
                    .map(|(name, from)| {
                        format!(
                            "{{\"of\": {}, \"name\": {}, \"shown\": {}, \"from\": {}}}",
                            json_string(name.of.word()),
                            json_string(&name.name),
                            json_string(&name.shown),
                            json_string(match from {
                                From::Page => "page",
                                From::Catalogue => "catalogue",
                            })
                        )
                    })
                    .collect();
                functions.push(format!(
                    "{{\"name\": {}, \"summary\": {}, \"names\": [{}]}}",
                    json_string(f.spec.name),
                    json_string(&f.doc.summary),
                    names.join(", ")
                ));
            }
            format!(
                "{{\"name\": {}, \"tier\": {tier}, \"functions\": [{}]}}",
                json_string(package),
                functions.join(", ")
            )
        })
        .collect();
    let datasets: Vec<String> = registry
        .datasets()
        .iter()
        .map(|dataset| {
            format!(
                "{{\"name\": {}, \"title\": {}, \"summary\": {}}}",
                json_string(dataset.spec.name),
                json_string(&dataset.doc.title),
                json_string(&dataset.doc.summary)
            )
        })
        .collect();
    format!(
        "{{\"type\": \"helpIndex\", \"engine\": {}, \"packages\": [{}], \"datasets\": [{}]}}",
        json_string(version),
        packages.join(", "),
        datasets.join(", ")
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The names of one language, as written, in order.
    fn shown(names: &[Name], of: Language) -> Vec<&str> {
        names
            .iter()
            .filter(|name| name.of == of)
            .map(|name| name.shown.as_str())
            .collect()
    }

    fn typed(names: &[Name], of: Language) -> Vec<&str> {
        names
            .iter()
            .filter(|name| name.of == of)
            .map(|name| name.name.as_str())
            .collect()
    }

    #[test]
    fn the_catalogue_gives_several_names_of_r_and_of_stata() {
        let names = equivalent_names("reg", "R lm(), fixest::feols(); Stata regress, reghdfe");
        assert_eq!(shown(&names, Language::R), ["lm()", "fixest::feols()"]);
        assert_eq!(typed(&names, Language::R), ["lm", "feols"]);
        assert_eq!(shown(&names, Language::Stata), ["regress", "reghdfe"]);
        let names = equivalent_names("t_test", "R t.test(); Stata ttest");
        assert_eq!(typed(&names, Language::R), ["t.test"]);
        assert_eq!(typed(&names, Language::Stata), ["ttest"]);
    }

    #[test]
    fn a_package_s_function_is_of_r_with_or_without_the_word_and_its_brackets() {
        let names = equivalent_names("merge", "dplyr::left_join(); Stata merge");
        assert_eq!(shown(&names, Language::R), ["dplyr::left_join()"]);
        assert_eq!(typed(&names, Language::R), ["left_join"]);
        assert_eq!(typed(&names, Language::Stata), ["merge"]);
        let names = equivalent_names(
            "derive",
            "Stata nlcom; car::deltaMethod; marginaleffects::hypotheses",
        );
        assert_eq!(
            shown(&names, Language::R),
            ["car::deltaMethod", "marginaleffects::hypotheses"]
        );
        assert_eq!(typed(&names, Language::Stata), ["nlcom"]);
        // A piece with no language named is of R; the word R may come after it.
        let names = equivalent_names(
            "variance_test",
            "car::leveneTest(), R bartlett.test(), var.test(); Stata robvar, sdtest",
        );
        assert_eq!(
            typed(&names, Language::R),
            ["leveneTest", "bartlett.test", "var.test"]
        );
        assert_eq!(typed(&names, Language::Stata), ["robvar", "sdtest"]);
        assert_eq!(
            typed(
                &equivalent_names("points", "geom_point(), geom_jitter()"),
                Language::R
            ),
            ["geom_point", "geom_jitter"]
        );
    }

    #[test]
    fn the_same_name_in_both_is_the_function_s_own_and_none_or_nothing_gives_no_name() {
        let names = equivalent_names("sqrt", "Same name in R and Stata");
        assert_eq!(shown(&names, Language::R), ["sqrt()"]);
        assert_eq!(shown(&names, Language::Stata), ["sqrt()"]);
        assert_eq!(equivalent_names("h0", "None built in"), []);
        assert_eq!(equivalent_names("h0", ""), []);
        assert_eq!(equivalent_names("h0", "   "), []);
    }

    #[test]
    fn functions_inside_a_call_operators_and_bare_names_of_r_are_read() {
        assert_eq!(
            typed(
                &equivalent_names("n_missing", "R sum(is.na()); Stata misstable"),
                Language::R
            ),
            ["sum", "is.na"]
        );
        assert_eq!(
            typed(&equivalent_names("div", "R %/%"), Language::R),
            ["%/%"]
        );
        let names = equivalent_names("mod", "R %%; Stata mod()");
        assert_eq!(typed(&names, Language::R), ["%%"]);
        assert_eq!(shown(&names, Language::Stata), ["mod()"]);
        assert_eq!(
            typed(
                &equivalent_names("is_in", "R %in%; Stata inlist()"),
                Language::R
            ),
            ["%in%"]
        );
        assert_eq!(typed(&equivalent_names("PI", "R pi"), Language::R), ["pi"]);
        assert_eq!(
            typed(
                &equivalent_names("normal", "R dnorm, pnorm, qnorm, rnorm"),
                Language::R
            ),
            ["dnorm", "pnorm", "qnorm", "rnorm"]
        );
        assert_eq!(
            typed(
                &equivalent_names("lognormal", "R dlnorm family"),
                Language::R
            ),
            ["dlnorm", "plnorm", "qlnorm", "rlnorm"]
        );
        assert_eq!(
            typed(
                &equivalent_names(
                    "import",
                    "R readr, readxl, haven, arrow, jsonlite, rio::import(); Stata import delimited, import excel, use"
                ),
                Language::R
            ),
            ["readr", "readxl", "haven", "arrow", "jsonlite", "import"]
        );
    }

    #[test]
    fn words_that_are_no_name_are_not_read_from_the_catalogue() {
        // Prose, a pattern, an index, an argument: none is a function's name.
        assert_eq!(equivalent_names("to", "R as.* (about 150 functions)"), []);
        assert_eq!(equivalent_names("pdf", "R d* functions"), []);
        assert_eq!(equivalent_names("first", "R x[[1]]"), []);
        assert_eq!(
            equivalent_names("interact", "R (a + b + c)^2; Stata ##"),
            []
        );
        assert_eq!(
            typed(&equivalent_names("last", "R tail(x, 1)"), Language::R),
            ["tail"]
        );
        assert_eq!(
            typed(
                &equivalent_names("join", "R paste(collapse =)"),
                Language::R
            ),
            ["paste"]
        );
        let names = equivalent_names("design", "R model.matrix(); Stata the variables of the fit");
        assert_eq!(typed(&names, Language::R), ["model.matrix"]);
        assert_eq!(typed(&names, Language::Stata), [] as [&str; 0]);
        let names = equivalent_names(
            "name_of",
            "R deparse(substitute(x)); Stata a macro holding the name",
        );
        assert_eq!(typed(&names, Language::Stata), [] as [&str; 0]);
        let names = equivalent_names("n_obs", "R nobs(); Stata e(N)");
        assert_eq!(typed(&names, Language::Stata), [] as [&str; 0]);
        let names = equivalent_names("base", "R relevel(); Stata ib#.");
        assert_eq!(typed(&names, Language::Stata), [] as [&str; 0]);
    }

    #[test]
    fn the_commands_and_functions_of_stata_in_the_catalogue_s_lists() {
        let stata = |cell: &str| {
            equivalent_names("x", cell)
                .into_iter()
                .filter(|name| name.of == Language::Stata)
                .map(|name| name.shown)
                .collect::<Vec<_>>()
        };
        assert_eq!(
            stata("R cor(); Stata pwcorr (pairwise), correlate (listwise)"),
            ["pwcorr", "correlate"]
        );
        assert_eq!(stata("R hist(); Stata graph bar"), ["graph"]);
        assert_eq!(
            stata("Stata import delimited, import excel, use"),
            ["import", "use"]
        );
        assert_eq!(stata("R scale(); Stata egen std()"), ["egen", "std()"]);
        assert_eq!(
            stata("R factorial(); Stata exp(lnfactorial())"),
            ["exp()", "lnfactorial()"]
        );
        assert_eq!(stata("dplyr::n(); Stata _N"), ["_N"]);
        assert_eq!(
            stata("lubridate::wday(week_start = 1); Stata dow() starts at 0 on Sunday"),
            ["dow()"]
        );
        assert_eq!(
            stata("R cut(), and cut() at quantile(); Stata xtile; Stata egen cut() is left-closed"),
            ["xtile", "egen", "cut()"]
        );
        // One bare word after a piece of Stata is of Stata; a package of R before one is of R.
        assert_eq!(
            stata("Stata estat firststage, estat overid, estat endogenous; ivreg2; weakivtest"),
            ["estat", "ivreg2", "weakivtest"]
        );
        let names = equivalent_names("ar_test", "ivmodel; Stata weakiv");
        assert_eq!(typed(&names, Language::R), ["ivmodel"]);
        assert_eq!(typed(&names, Language::Stata), ["weakiv"]);
        // The word Stata in the middle of a piece.
        let names = equivalent_names(
            "skewness",
            "SPSS and Excel (default); moments::skewness() and Stata summarize, detail = adjusted: false",
        );
        assert_eq!(typed(&names, Language::R), ["skewness"]);
        assert_eq!(typed(&names, Language::Stata), ["summarize", "detail"]);
    }

    #[test]
    fn a_cell_of_a_page_s_table_gives_the_functions_it_calls() {
        let r = |cell: &str| {
            cell_names(Language::R, cell)
                .into_iter()
                .map(|name| name.shown)
                .collect::<Vec<_>>()
        };
        assert_eq!(r("max(x, na.rm = TRUE)"), ["max()"]);
        assert_eq!(r("pi"), ["pi"]);
        assert_eq!(r("acos(x) * 180 / pi"), ["acos()"]);
        assert_eq!(
            r("lubridate::interval(a, b) %/% months(1)"),
            ["lubridate::interval()", "%/%", "months()"]
        );
        assert_eq!(r("x %in% c(1, 3, 5)"), ["%in%"]);
        // What is quoted is no name, a percent sign in a format least of all.
        assert_eq!(r("as.Date(s, format = \"%d/%m/%Y\")"), ["as.Date()"]);
        assert_eq!(
            r("cat(\"a\", \"b\", sep = \"\\t\"); cat(\"\\n\")"),
            ["cat()"]
        );
        assert_eq!(r("tryCatch(expr, error = function(e) e)"), ["tryCatch()"]);
        assert_eq!(
            r("fixest::feols, with f and x ~ z as further parts of its formula"),
            ["fixest::feols"]
        );
        assert_eq!(
            r("m <- AER::ivreg(y ~ w + x, ~ w + z, data = d)"),
            ["AER::ivreg()"]
        );
        assert_eq!(r("data.frame(a = xs, b = ys), printed"), ["data.frame()"]);
        assert_eq!(r("seq(1, 5) or 1:5"), ["seq()"]);
        assert_eq!(r("xs[[1]]"), [] as [&str; 0]);
        assert_eq!(r("d + n"), [] as [&str; 0]);
        assert_eq!(r("no single function"), [] as [&str; 0]);
        assert_eq!(r("none built in"), [] as [&str; 0]);
    }

    #[test]
    fn a_stata_cell_of_a_page_gives_its_commands_and_functions_and_not_its_options() {
        let stata = |cell: &str| {
            cell_names(Language::Stata, cell)
                .into_iter()
                .map(|name| name.shown)
                .collect::<Vec<_>>()
        };
        assert_eq!(stata("summarize x, then r(max)"), ["summarize"]);
        assert_eq!(stata("tabulate industry, missing"), ["tabulate"]);
        assert_eq!(
            stata("real(x), or destring x, replace"),
            ["real()", "destring"]
        );
        // `label` is the command and then an option: the name is kept once, as first written.
        assert_eq!(
            stata("label define, then encode x, label()"),
            ["label", "encode"]
        );
        assert_eq!(
            stata("bysort industry: egen m = mean(wage), then generate dev = wage - m"),
            ["bysort", "egen", "mean()", "generate"]
        );
        assert_eq!(
            stata("weakiv after ivregress or ivreg2"),
            ["weakiv", "ivregress", "ivreg2"]
        );
        assert_eq!(
            stata("ivregress 2sls y w (x = z), vce(robust) small"),
            ["ivregress", "vce()"]
        );
        assert_eq!(
            stata("display as error \"text\", then exit 198"),
            ["display", "exit"]
        );
        assert_eq!(stata("_pi or c(pi)"), ["_pi"]);
        assert_eq!(stata("x * 1000 + tc(01jan1970 00:00:00)"), ["tc()"]);
        assert_eq!(stata("d - mod(dow(d) + 6, 7)"), ["mod()", "dow()"]);
        assert_eq!(stata("local n : word count `xs'"), ["local", "word"]);
        assert_eq!(stata("while (!done) { ... }"), ["while"]);
        assert_eq!(stata("oneway y g, Bartlett's line"), ["oneway"]);
        assert_eq!(
            stata("ib#.x, with # the code of the level"),
            [] as [&str; 0]
        );
        assert_eq!(stata("\"`v'\""), [] as [&str; 0]);
        assert_eq!(stata("\"a\" + \"b\""), [] as [&str; 0]);
        assert_eq!(stata("no records or mappings"), [] as [&str; 0]);
        assert_eq!(stata("none built in"), [] as [&str; 0]);
    }

    #[test]
    fn a_name_is_kept_once_for_each_language() {
        let names = equivalent_names("x", "R data(); Stata sysuse, webuse, sysuse");
        assert_eq!(typed(&names, Language::Stata), ["sysuse", "webuse"]);
        let names = cell_names(Language::Stata, "ln(x) / ln(2)");
        assert_eq!(names.len(), 1);
    }
}
