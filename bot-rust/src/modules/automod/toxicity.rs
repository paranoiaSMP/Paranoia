use std::sync::LazyLock;
use regex::Regex;
use twilight_model::id::{marker::UserMarker, Id};

use super::leetspeak::unmask_leetspeak;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TargetKind {
    None,
    GameObject,
    SecondPersonPronoun,
    ExplicitUserMention,
    ReplyTarget,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ToxicityCategory {
    Clean,
    GamingFrustration,
    FriendlyBanter,
    Harassment,
    SevereToxicity,
}

#[derive(Debug, Clone)]
pub struct ToxicityVerdict {
    pub category: ToxicityCategory,
    pub is_toxic: bool,
    pub score: f32,
    pub target: TargetKind,
    pub normalized_text: String,
    pub detected_words: Vec<String>,
}

static DISCORD_MENTION_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"<@[!&]?[0-9]+>").expect("Valid regex for user mention")
});

static SECOND_PERSON_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b(tu|toi|te|t['’]es|tes|t\s+es|ton|ta|vous|votre|vos|es-tu|estu|va\s+te|jte|je\s+te|t['’]as|tas|you|ur|you['’]re|youre|your|u|yourself|yourselves)\b")
        .expect("Valid regex for second person")
});

static GAME_OBJECT_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b(creeper|zombie|skeleton|squelette|enderman|warden|dragon|wither|boss|mob|mobs|araignee|araignée|spider|ghast|blaze|slime|phantom|piglin|shulker|golem|lave|lava|feu|fire|chute|diamant|diamond|stuff|base|coffre|pioche|mort|die|fall\s+damage|lag|ping|crash|serveur|chunk|rollback|jeu|game|monde|nether|bedrock)\b")
        .expect("Valid regex for game object")
});

static SEVERE_TOXICITY_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b(kys|kill\s+yourself|(?:va\s+)?(?:creve|crever|crevez)|suicide(?:toi|\s*-\s*toi|\s+toi)?|va\s+mourir|negres?|nègres?|niggers?|niggas?|bougnoules?|youpins?|chinetoques?|bamboulas?|sale\s+juif|sale\s+noir|sale\s+arabe|sale\s+blanc|pds?|pedes?|pédés?|tapettes?|faggots?)\b")
        .expect("Valid regex for severe toxicity")
});

static SEVERE_INSULTS_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b(fdp|ntm|tg|stfu|fils\s+de\s+pute|nique\s+ta\s+mere|nique\s+ta\s+mère|nique|niquent|ta\s+gueule|shut\s+the\s+fuck\s+up|mange\s+tes\s+morts|va\s+te\s+faire\s+foutre|co(?:n|nn)ards?|co(?:n|nn)asses?|sa(?:l|ll)opes?|salops?|pu(?:t|tt)es?|putain\s+de\s+ta\s+race|encules?|enculés?|enculer|enculez|ba(?:t|tt)ards?|bâtards?|motherfuckers?|assholes?|cunts?|dickheads?|bitch(?:es)?|sale\s+chien|gros\s+porc)\b")
        .expect("Valid regex for severe insults")
});

static MILD_INSULTS_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b(cons?|connes?|nuls?|nulles?|noobs?|nobs?|idiots?|idiotes?|debiles?|débiles?|bouffons?|boloss|losers?|imbeciles?|imbéciles?|dumbs?|fools?)\b")
        .expect("Valid regex for mild insults")
});

static FRUSTRATION_SWEARS_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b(merdes?|chier|chie|chiez|fais\s+chier|fait\s+chier|chiant|chiante|chiants|chiantes|putain|bordel|relou|casse\s+les\s+couilles|shits?|damn|dammit|fucks?|fucking|crap)\b")
        .expect("Valid regex for frustration swears")
});

static BANTER_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b(mdr+|ptdr+|xptdr+|lol+|xd+|xdd+|xddd+|haha+|hahaha+|hihi+|gg|wp|bien\s+joue|bien\s+joué|jpp|lmao+|rofl|ez)\b")
        .expect("Valid regex for banter")
});

const BANTER_EMOJIS: &[char] = &['😂', '🤣', '😭', '💀', '🙃', '😜', '😁', '😆'];

pub fn classify_toxicity_with_context(
    content: &str,
    mentions: &[Id<UserMarker>],
    is_reply: bool,
) -> ToxicityVerdict {
    let normalized = unmask_leetspeak(content);

    let has_harassment_word = SEVERE_TOXICITY_RE.is_match(&normalized)
        || SEVERE_INSULTS_RE.is_match(&normalized)
        || MILD_INSULTS_RE.is_match(&normalized);

    let target = if !mentions.is_empty() || DISCORD_MENTION_RE.is_match(content) || DISCORD_MENTION_RE.is_match(&normalized) {
        TargetKind::ExplicitUserMention
    } else if is_reply {
        TargetKind::ReplyTarget
    } else if GAME_OBJECT_RE.is_match(&normalized) && !has_harassment_word {
        TargetKind::GameObject
    } else if SECOND_PERSON_RE.is_match(&normalized) {
        TargetKind::SecondPersonPronoun
    } else if GAME_OBJECT_RE.is_match(&normalized) {
        TargetKind::GameObject
    } else {
        TargetKind::None
    };

    let has_banter_marker = BANTER_RE.is_match(&normalized)
        || content.chars().any(|c| BANTER_EMOJIS.contains(&c));

    let mut detected_words = Vec::new();

    for mat in SEVERE_TOXICITY_RE.find_iter(&normalized) {
        detected_words.push(mat.as_str().to_string());
    }

    if !detected_words.is_empty() {
        detected_words.sort();
        detected_words.dedup();
        return ToxicityVerdict {
            category: ToxicityCategory::SevereToxicity,
            is_toxic: true,
            score: 1.0,
            target,
            normalized_text: normalized,
            detected_words,
        };
    }

    for mat in SEVERE_INSULTS_RE.find_iter(&normalized) {
        detected_words.push(mat.as_str().to_string());
    }

    if !detected_words.is_empty() {
        let score = match target {
            TargetKind::ExplicitUserMention | TargetKind::ReplyTarget => 0.95,
            TargetKind::SecondPersonPronoun => 0.90,
            _ => 0.85,
        };

        detected_words.sort();
        detected_words.dedup();
        return ToxicityVerdict {
            category: ToxicityCategory::Harassment,
            is_toxic: true,
            score,
            target,
            normalized_text: normalized,
            detected_words,
        };
    }

    for mat in MILD_INSULTS_RE.find_iter(&normalized) {
        detected_words.push(mat.as_str().to_string());
    }

    if !detected_words.is_empty() {
        detected_words.sort();
        detected_words.dedup();

        if has_banter_marker {
            return ToxicityVerdict {
                category: ToxicityCategory::FriendlyBanter,
                is_toxic: false,
                score: 0.20,
                target,
                normalized_text: normalized,
                detected_words,
            };
        }

        return match target {
            TargetKind::ExplicitUserMention | TargetKind::ReplyTarget | TargetKind::SecondPersonPronoun => {
                ToxicityVerdict {
                    category: ToxicityCategory::Harassment,
                    is_toxic: true,
                    score: 0.70,
                    target,
                    normalized_text: normalized,
                    detected_words,
                }
            }
            TargetKind::GameObject => {
                ToxicityVerdict {
                    category: ToxicityCategory::GamingFrustration,
                    is_toxic: false,
                    score: 0.25,
                    target,
                    normalized_text: normalized,
                    detected_words,
                }
            }
            TargetKind::None => {
                ToxicityVerdict {
                    category: ToxicityCategory::GamingFrustration,
                    is_toxic: false,
                    score: 0.25,
                    target,
                    normalized_text: normalized,
                    detected_words,
                }
            }
        };
    }

    for mat in FRUSTRATION_SWEARS_RE.find_iter(&normalized) {
        detected_words.push(mat.as_str().to_string());
    }

    if !detected_words.is_empty() {
        detected_words.sort();
        detected_words.dedup();

        if has_banter_marker {
            return ToxicityVerdict {
                category: ToxicityCategory::FriendlyBanter,
                is_toxic: false,
                score: 0.20,
                target,
                normalized_text: normalized,
                detected_words,
            };
        }

        return match target {
            TargetKind::ExplicitUserMention | TargetKind::ReplyTarget => {
                ToxicityVerdict {
                    category: ToxicityCategory::Harassment,
                    is_toxic: true,
                    score: 0.75,
                    target,
                    normalized_text: normalized,
                    detected_words,
                }
            }
            TargetKind::SecondPersonPronoun => {
                ToxicityVerdict {
                    category: ToxicityCategory::Harassment,
                    is_toxic: true,
                    score: 0.70,
                    target,
                    normalized_text: normalized,
                    detected_words,
                }
            }
            _ => {
                ToxicityVerdict {
                    category: ToxicityCategory::GamingFrustration,
                    is_toxic: false,
                    score: 0.35,
                    target,
                    normalized_text: normalized,
                    detected_words,
                }
            }
        };
    }

    ToxicityVerdict {
        category: ToxicityCategory::Clean,
        is_toxic: false,
        score: 0.0,
        target,
        normalized_text: normalized,
        detected_words: Vec::new(),
    }
}

pub fn classify_toxicity(content: &str, mentions: &[Id<UserMarker>]) -> ToxicityVerdict {
    classify_toxicity_with_context(content, mentions, false)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clean_message() {
        let verdict = classify_toxicity("Salut tout le monde, prêt pour la session de minage ?", &[]);
        assert_eq!(verdict.category, ToxicityCategory::Clean);
        assert!(!verdict.is_toxic);
        assert_eq!(verdict.score, 0.0);
    }

    #[test]
    fn test_gaming_frustration() {
        let verdict = classify_toxicity("Fait chier ce creeper qui a explosé ma base", &[]);
        assert_eq!(verdict.category, ToxicityCategory::GamingFrustration);
        assert!(!verdict.is_toxic);
        assert_eq!(verdict.target, TargetKind::GameObject);
    }

    #[test]
    fn test_friendly_banter() {
        let verdict = classify_toxicity("Mdr t'es trop con bien joué gg", &[]);
        assert_eq!(verdict.category, ToxicityCategory::FriendlyBanter);
        assert!(!verdict.is_toxic);
        assert_eq!(verdict.target, TargetKind::SecondPersonPronoun);
    }

    #[test]
    fn test_harassment_with_pronoun() {
        let verdict = classify_toxicity("T'es un sale fdp dégage d'ici", &[]);
        assert_eq!(verdict.category, ToxicityCategory::Harassment);
        assert!(verdict.is_toxic);
        assert_eq!(verdict.target, TargetKind::SecondPersonPronoun);
    }

    #[test]
    fn test_harassment_with_explicit_mention() {
        let verdict = classify_toxicity("<@123456789> gros connard", &[]);
        assert_eq!(verdict.category, ToxicityCategory::Harassment);
        assert!(verdict.is_toxic);
        assert_eq!(verdict.target, TargetKind::ExplicitUserMention);
    }

    #[test]
    fn test_severe_toxicity_slurs_and_threats() {
        let verdict = classify_toxicity("Va crever sale negre", &[]);
        assert_eq!(verdict.category, ToxicityCategory::SevereToxicity);
        assert!(verdict.is_toxic);
        assert_eq!(verdict.score, 1.0);
    }

    #[test]
    fn test_unmasked_bypass_detection() {
        let verdict = classify_toxicity("t.u e.s u.n s.4.l.e f.d.p", &[]);
        assert_eq!(verdict.category, ToxicityCategory::Harassment);
        assert!(verdict.is_toxic);
        assert_eq!(verdict.target, TargetKind::SecondPersonPronoun);
    }
}
