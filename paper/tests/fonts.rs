//! The font files of `fonts/` are the files their source names, byte for byte
//! (`fonts/SOURCE.md`), and each is a font Typst reads, of the family it is carried for.

use std::fs;
use std::process::Command;

/// Each file with its SHA-256 and the family Typst reads from it.
const FONTS: [(&str, &str, &str); 9] = [
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
    (
        "LibertinusMath-Regular.otf",
        "ded714b0d3808af527438ed7a85f16933133f66a12104c4a83db4cc248888011",
        "Libertinus Math",
    ),
    (
        "DejaVuSansMono.ttf",
        "b4a6c3e4faab8773f4ff761d56451646409f29abedd68f05d38c2df667d3c582",
        "DejaVu Sans Mono",
    ),
    (
        "DejaVuSansMono-Bold.ttf",
        "bce60f1b4421acd9ea51ba6623d7024ecbe6817a953e3654df62a5e6bdf8f769",
        "DejaVu Sans Mono",
    ),
    (
        "DejaVuSansMono-Oblique.ttf",
        "742097840c541870e8d6dc5c9b37bb1ceeea6c0dedd1d475faf903ef9df734b0",
        "DejaVu Sans Mono",
    ),
    (
        "DejaVuSansMono-BoldOblique.ttf",
        "91713a71d550bba22c2a6b2bb2a9ad8f9a159e12e4e9f0a5b2677998ba21213e",
        "DejaVu Sans Mono",
    ),
];

/// The licence files, each with its digest and words it must hold.
const LICENCES: [(&str, &str, &[&str]); 3] = [
    (
        "LibertinusSerif-OFL.txt",
        "",
        &[
            "SIL OPEN FONT LICENSE Version 1.1",
            "The Libertinus Project Authors",
        ],
    ),
    (
        // The publisher's own file, unchanged.
        "LibertinusMath-OFL.txt",
        "9aeecc8107c489ec1ec0068b0313e531a760edf3493705b32ab8ab8215a8794e",
        &[
            "SIL OPEN FONT LICENSE Version 1.1",
            "The Libertinus Project Authors",
        ],
    ),
    (
        "DejaVuSansMono-LICENSE.txt",
        "",
        &[
            "Bitstream Vera Fonts Copyright",
            "Copyright (c) 2003 by Bitstream, Inc. All Rights Reserved.",
            "Arev Fonts Copyright",
            "DejaVu changes are in public domain",
        ],
    ),
];

fn folder() -> String {
    format!("{}/fonts", env!("CARGO_MANIFEST_DIR"))
}

/// The SHA-256 of a file of the folder, by the machine's own tool, so that no crate is added
/// to read one.
fn digest(name: &str) -> String {
    let said = Command::new("shasum")
        .args(["-a", "256", &format!("{}/{name}", folder())])
        .output()
        .expect("shasum runs");
    let said = String::from_utf8(said.stdout).unwrap();
    said.split_whitespace().next().unwrap_or("").to_string()
}

#[test]
fn every_font_file_is_the_file_its_source_names() {
    for (name, sha, _) in FONTS {
        assert_eq!(digest(name), sha, "{name}");
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
    for (name, sha, words) in LICENCES {
        let licence = fs::read_to_string(format!("{}/{name}", folder())).unwrap();
        for word in words {
            assert!(licence.contains(word), "{name} does not say: {word}");
        }
        if !sha.is_empty() {
            assert_eq!(digest(name), sha, "{name}");
        }
        assert!(source.contains(name), "{name} is not in SOURCE.md");
    }
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
