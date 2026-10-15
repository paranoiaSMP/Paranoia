//! Liste de mots interdits : injures raciales/homophobes/transphobes et menaces, supprimés quel que soit le contexte.
//! Les insultes courantes (con, putain, merde, idiot...) restent gérées par `toxicity`, qui tient compte du contexte.
//! shortcut: pas de détection des lettres doublées (ffddpp); ajouter une passe de dédoublonnage si ça passe en pratique.

use regex::Regex;
use std::sync::LazyLock;

use super::leetspeak::unmask_leetspeak;

const WORDS: &[&str] = &[
    // racisme
    "nègres?", "négros?", "negros?", "nigg(?:a|er)s?", "niggeurs?", "niqueurs?",
    "bougnoul(?:e|es)?", "bougnouilles?", "youpins?", "youpines?", "juifs?\\s+de\\s+merde",
    "chinetoques?", "chinetocs?", "chintoks?", "arabes?\\s+de\\s+merde", "sales?\\s+arabes?",
    "sales?\\s+noirs?", "ratonnades?", "bicots?", "bicottes?", "sidi\\s+bougnoules?",
    // homophobie / transphobie
    "pd", "pédés?", "pedes?", "tapettes?", "tarlouzes?", "tafioles?", "fiottes?",
    "gouines?", "gouinasses?", "lesbs?\\s+de\\s+merde", "trans\\s+de\\s+merde",
    "travestis?\\s+de\\s+merde", "trannys?", "shemales?", "sodomites?",
    // menaces
    "je\\s+vais\\s+te\\s+tuer", "je\\s+te\\s+tue", "mort\\s+aux", "je\\s+vais\\s+te\\s+violer", "viols?\\s+collectifs?",
];

static RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(&format!(r"(?i)\b(?:{})\b", WORDS.join("|"))).expect("badwords regex"));

/// Premier mot interdit trouvé, dans le texte brut puis dans sa version « dé-leetspeakée ».
pub fn find_badword(content: &str) -> Option<String> {
    let unmasked = unmask_leetspeak(content);
    RE.find(content).or_else(|| RE.find(&unmasked)).map(|m| m.as_str().to_lowercase())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn catches_slurs_threats_and_leetspeak() {
        assert!(find_badword("sale bougnoule").is_some());
        assert!(find_badword("T'es qu'un PD").is_some());
        assert!(find_badword("je vais te tuer").is_some());
        assert!(find_badword("n1gg3r").is_some());
        assert!(find_badword("p3d3").is_some());
    }

    #[test]
    fn ignores_normal_french() {
        for ok in ["salut tout le monde", "le pdg est là", "un raton laveur", "la tante de Paul", "contre toi", "une folle journée", "le jaune du soleil"] {
            assert!(find_badword(ok).is_none(), "{ok}");
        }
    }
}
