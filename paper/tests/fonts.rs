//! The font files of `fonts/` are the files their source names, byte for byte
//! (`fonts/SOURCE.md`), and each is a font Typst reads, of the family it is carried for.

use std::fs;
use std::process::Command;

/// Each file with its SHA-256 and the family Typst reads from it.
const FONTS: [(&str, &str, &str); 4] = [
    (
        "LibertinusSerif-Regular.otf",
        "fcf06307a77367394fcb0ccb241e59eea70dba3d732be309647611224679c733",
        "Libertinus Serif",
    ),
    (
        "LibertinusSerif-Italic.otf",
        "9a393d63d6e05f620d3dc0190dfd35a8ede58c0808cf0fc9de7fcb9c723e4c24",
        "Libertinus Serif",
    ),
    (
        "LibertinusSerif-Bold.otf",
        "0264914210ed51b3231ebc92ce529e9f2e166ba9eebf0cd4a579558690a27b64",
        "Libertinus Serif",
    ),
    (
        "LibertinusSerif-BoldItalic.otf",
        "47a665259f09f554f5d133d7718cdad43ff462c6a6b2328f38023465e62d57ce",
        "Libertinus Serif",
    ),
];

fn folder() -> String {
    format!("{}/fonts", env!("CARGO_MANIFEST_DIR"))
}

#[test]
fn every_font_file_is_the_file_its_source_names() {
    for (name, sha, _) in FONTS {
        let path = format!("{}/{name}", folder());
        // The digest by the machine's own tool, so that no crate is added to read one.
        let said = Command::new("shasum")
            .args(["-a", "256", &path])
            .output()
            .expect("shasum runs");
        let said = String::from_utf8(said.stdout).unwrap();
        assert_eq!(said.split_whitespace().next(), Some(sha), "{name}");
    }
}

#[test]
fn the_folder_holds_these_fonts_and_no_other_and_each_has_its_licence() {
    let mut found: Vec<String> = fs::read_dir(folder())
        .unwrap()
        .map(|entry| entry.unwrap().file_name().into_string().unwrap())
        .filter(|name| name.ends_with(".otf") || name.ends_with(".ttf"))
        .collect();
    found.sort();
    let mut listed: Vec<&str> = FONTS.iter().map(|(name, ..)| *name).collect();
    listed.sort();
    assert_eq!(found, listed);
    let source = fs::read_to_string(format!("{}/SOURCE.md", folder())).unwrap();
    for (name, sha, _) in FONTS {
        assert!(source.contains(name), "{name} is not in SOURCE.md");
        assert!(
            source.contains(sha),
            "the digest of {name} is not in SOURCE.md"
        );
    }
    let licence = fs::read_to_string(format!("{}/LibertinusSerif-OFL.txt", folder())).unwrap();
    assert!(licence.contains("SIL OPEN FONT LICENSE Version 1.1"));
    assert!(licence.contains("The Libertinus Project Authors"));
}

#[test]
fn each_is_a_font_typst_reads_of_the_family_it_is_carried_for() {
    for (name, _, family) in FONTS {
        let mut paper = zemp_paper::Paper::new("paper/paper.typ");
        let bytes = fs::read(format!("{}/{name}", folder())).unwrap();
        assert_eq!(paper.add_font(bytes), 1, "{name}");
        assert_eq!(paper.families(), [family], "{name}");
    }
}
