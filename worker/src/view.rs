//! What the data viewer asks of a frame beyond its rows (open decision #75, option A; #114):
//! the rows in the order of one variable, put in order by the kernel function `data.sort`
//! itself calls; the rows a search finds among the cells as the engine prints them; the small
//! distribution in each column's header, in the bins of the engine's own histogram; and the
//! codes of a variable that labels could be given to.

use zeff_columns::{Column, ColumnType, GroupError, Table, sort_rows};
use zeff_core::display::labelled_cell;
use zeff_core::value::BinRule;
use zeff_diagnostics::json_string;
use zeff_plot::bins::Bins;

/// The most levels a header draws a bar for; a variable of more shows none.
const MOST_LEVELS: usize = 24;

/// The most distinct values of a text variable drawn as levels, and of a whole-number variable
/// offered for labels.
const MOST_DISTINCT: usize = 12;

/// The rows of `table`, by their places in it, in the order of `sort`: the variable named and
/// whether it is descending, as `data.sort(var, desc:)` orders them (stable; `NA` last); every
/// row in its place where there is no sort. An error in the engine's words where the variable
/// is not in the frame or cannot order rows.
pub fn order(table: &Table, sort: Option<(&str, bool)>) -> Result<Vec<usize>, String> {
    let Some((name, descending)) = sort else {
        return Ok((0..table.rows()).collect());
    };
    let column = table
        .column(name)
        .ok_or_else(|| format!("no variable `{name}` in this frame"))?;
    sort_rows(&[column], descending).map_err(|error| match error {
        GroupError::OpaqueKey(ty) => format!("a {} variable cannot order rows", ty.name()),
        other => format!("{other:?}"),
    })
}

/// The rows of `rows` with a cell that holds `search`, as the engine prints the cell (a
/// labelled value by its label), whatever the case; every row where the search is empty.
pub fn found(table: &Table, rows: Vec<usize>, search: &str) -> Vec<usize> {
    if search.is_empty() {
        return rows;
    }
    let wanted = search.to_lowercase();
    let columns: Vec<&Column> = table.columns().map(|(_, column)| column).collect();
    rows.into_iter()
        .filter(|&row| {
            columns
                .iter()
                .any(|column| labelled_cell(column, row).to_lowercase().contains(&wanted))
        })
        .collect()
}

/// A number for JSON: a finite one as Rust writes it, which JSON reads; `null` otherwise.
fn number(value: f64) -> String {
    if value.is_finite() {
        format!("{value}")
    } else {
        "null".to_string()
    }
}

/// The small distribution in a column's header, as JSON: for a number, a date or a time, the
/// count in each bin of the histogram the engine draws where a script asks for none
/// (`histogram()`, the rule of Freedman and Diaconis), with where the bins begin and how wide
/// each is; for a category, a truth value, a text of few values or a whole number of few
/// values, the count of each value, by the cell the engine prints for it, as the layer `bar()`
/// counts them. `null` where there is nothing to draw.
pub fn bars(column: &Column) -> String {
    if let Some(few) = few_ints(column) {
        let counts: Vec<usize> = few.iter().map(|(_, _, count)| *count).collect();
        let names: Vec<String> = few
            .iter()
            .map(|(_, row, _)| json_string(&labelled_cell(column, *row)))
            .collect();
        return format!(
            "{{\"counts\": [{}], \"levels\": [{}]}}",
            joined(&counts),
            names.join(", ")
        );
    }
    let values: Option<Vec<f64>> = match column.ty() {
        ColumnType::Int | ColumnType::Float => {
            column.numeric_values().map(|numeric| numeric.values)
        }
        ColumnType::Date => column
            .as_dates()
            .map(|dates| dates.flatten().map(f64::from).collect()),
        ColumnType::DateTime => column
            .as_datetimes()
            .map(|times| times.flatten().map(|micros| micros as f64).collect()),
        _ => None,
    };
    if let Some(values) = values {
        let values: Vec<f64> = values.into_iter().filter(|v| v.is_finite()).collect();
        let Some(bins) = Bins::of(&values, BinRule::Fd, None, None) else {
            return "null".to_string();
        };
        let mut counts = vec![0usize; bins.count];
        for &value in &values {
            if let Some(bin) = bins.holding(value) {
                counts[bin] += 1;
            }
        }
        return format!(
            "{{\"counts\": [{}], \"start\": {}, \"width\": {}}}",
            joined(&counts),
            number(bins.start),
            number(bins.width)
        );
    }
    let levels: Vec<(String, usize)> = match column.ty() {
        ColumnType::Bool => {
            let mut counts = [0usize; 2];
            for value in column.as_bools().into_iter().flatten().flatten() {
                counts[usize::from(value)] += 1;
            }
            vec![("false".into(), counts[0]), ("true".into(), counts[1])]
        }
        ColumnType::Category => {
            let names = column.levels().unwrap_or_default();
            if names.len() > MOST_LEVELS {
                return "null".to_string();
            }
            let mut counts = vec![0usize; names.len()];
            for code in column.as_codes().into_iter().flatten().flatten() {
                if let Some(count) = usize::try_from(code).ok().and_then(|c| counts.get_mut(c)) {
                    *count += 1;
                }
            }
            names
                .iter()
                .map(|name| name.to_string())
                .zip(counts)
                .collect()
        }
        ColumnType::Str => {
            let mut seen: Vec<(String, usize)> = Vec::new();
            for value in column.as_strs().into_iter().flatten().flatten() {
                if let Some((_, count)) = seen.iter_mut().find(|(name, _)| name == value) {
                    *count += 1;
                } else if seen.len() == MOST_DISTINCT {
                    return "null".to_string();
                } else {
                    seen.push((value.to_string(), 1));
                }
            }
            // Text sorts by code point, as `data.sort` sorts it.
            seen.sort_by(|a, b| a.0.cmp(&b.0));
            seen
        }
        _ => return "null".to_string(),
    };
    if levels.is_empty() {
        return "null".to_string();
    }
    let counts: Vec<usize> = levels.iter().map(|(_, count)| *count).collect();
    let names: Vec<String> = levels.iter().map(|(name, _)| json_string(name)).collect();
    format!(
        "{{\"counts\": [{}], \"levels\": [{}]}}",
        joined(&counts),
        names.join(", ")
    )
}

/// The distinct values of a whole-number variable of a few values, smallest first, each with
/// the cell the engine prints for it (its label where it has one): what `data.label(var,
/// labels)` could be given. `null` for a variable of another type or of more values.
pub fn codes(column: &Column) -> String {
    let Some(seen) = few_ints(column) else {
        return "null".to_string();
    };
    let listed: Vec<String> = seen
        .iter()
        .map(|(code, row, _)| {
            format!(
                "{{\"code\": {code}, \"shown\": {}}}",
                json_string(&labelled_cell(column, *row))
            )
        })
        .collect();
    format!("[{}]", listed.join(", "))
}

/// The distinct values of a whole-number variable of a few values, smallest first, each with
/// the first row that holds it and how many rows do; `None` for another type or more values.
fn few_ints(column: &Column) -> Option<Vec<(i64, usize, usize)>> {
    let values = column.as_ints()?;
    let mut seen: Vec<(i64, usize, usize)> = Vec::new();
    for (row, value) in values.enumerate() {
        let Some(value) = value else { continue };
        if let Some((_, _, count)) = seen.iter_mut().find(|(code, _, _)| *code == value) {
            *count += 1;
        } else if seen.len() == MOST_DISTINCT {
            return None;
        } else {
            seen.push((value, row, 1));
        }
    }
    seen.sort_by_key(|(code, _, _)| *code);
    (!seen.is_empty()).then_some(seen)
}

/// Numbers separated by commas, for a JSON array.
fn joined(counts: &[usize]) -> String {
    counts
        .iter()
        .map(usize::to_string)
        .collect::<Vec<_>>()
        .join(", ")
}
