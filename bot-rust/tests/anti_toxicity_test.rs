#[path = "../src/utils/mod.rs"]
pub mod utils;

#[path = "../src/modules/automod/mod.rs"]
pub mod automod;

use automod::{
    classify_toxicity, classify_toxicity_with_context, unmask_leetspeak, TargetKind,
    ToxicityCategory,
};
use twilight_model::{
    application::command::CommandOptionType,
    guild::Permissions,
    id::Id,
};

#[test]
fn test_unmask_leetspeak_substitutions() {
    assert_eq!(unmask_leetspeak("c0nn4rd"), "connard");
    assert_eq!(unmask_leetspeak("s4l0p3"), "salope");
    assert_eq!(unmask_leetspeak("7g"), "tg");
    assert_eq!(unmask_leetspeak("b!tch"), "bitch");
    assert_eq!(unmask_leetspeak("$4l0p3"), "salope");
    assert_eq!(unmask_leetspeak("1d10t"), "idiot");
    assert_eq!(unmask_leetspeak("8atard"), "batard");
    assert_eq!(unmask_leetspeak("/\\sshole"), "asshole");
    assert_eq!(unmask_leetspeak("|3atard"), "batard");
}

#[test]
fn test_unmask_homoglyphs_cyrillic_greek_fullwidth() {
    // Cyrillic lookalikes
    assert_eq!(unmask_leetspeak("\u{0441}onnard"), "connard");
    assert_eq!(unmask_leetspeak("s\u{0430}l\u{043e}p\u{0435}"), "salope");
    assert_eq!(unmask_leetspeak("\u{0442}\u{0433}"), "tg");

    // Greek lookalikes
    assert_eq!(unmask_leetspeak("\u{03B1}sshole"), "asshole");

    // Fullwidth ASCII characters
    assert_eq!(
        unmask_leetspeak("\u{FF43}\u{FF4F}\u{FF4E}\u{FF4E}\u{FF41}\u{FF52}\u{FF44}"),
        "connard"
    );

    // Diacritics stripping
    assert_eq!(unmask_leetspeak("cônnàrd"), "connard");
    assert_eq!(unmask_leetspeak("bâtard"), "batard");
    assert_eq!(unmask_leetspeak("crève"), "creve");

    // Zero-width spaces removal
    assert_eq!(
        unmask_leetspeak("c\u{200B}o\u{200C}n\u{200D}n\u{FEFF}a\u{00AD}r\u{2060}d"),
        "connard"
    );
}

#[test]
fn test_unmask_punctuation_and_interstitial_separators() {
    assert_eq!(unmask_leetspeak("f.d.p"), "fdp");
    assert_eq!(unmask_leetspeak("c-o-n-n-a-r-d"), "connard");
    assert_eq!(unmask_leetspeak("f*d*p"), "fdp");
    assert_eq!(unmask_leetspeak("f_d_p"), "fdp");
    assert_eq!(unmask_leetspeak("t-g"), "tg");
    assert_eq!(unmask_leetspeak("t.g"), "tg");
    assert_eq!(unmask_leetspeak("n.t.m"), "ntm");
    assert_eq!(unmask_leetspeak("f d p"), "fdp");
    assert_eq!(unmask_leetspeak("s a l o p e"), "salope");
    assert_eq!(unmask_leetspeak("t g"), "tg");
}

#[test]
fn test_unmask_repetition_collapsing() {
    assert_eq!(unmask_leetspeak("coooonnnnard"), "conard");
    assert_eq!(unmask_leetspeak("fuuuuck"), "fuck");
    assert_eq!(unmask_leetspeak("puuuute"), "pute");
    assert_eq!(unmask_leetspeak("saaaalope"), "salope");
}

#[test]
fn test_classify_clean_message() {
    let verdict = classify_toxicity("Bonjour à tous, bienvenue sur Paranoia SMP !", &[]);
    assert_eq!(verdict.category, ToxicityCategory::Clean);
    assert!(!verdict.is_toxic);
    assert_eq!(verdict.score, 0.0);
    assert_eq!(verdict.target, TargetKind::None);
    assert!(verdict.detected_words.is_empty());

    let verdict_server = classify_toxicity("Bonjour à tous, bienvenue sur le serveur Paranoia SMP !", &[]);
    assert_eq!(verdict_server.category, ToxicityCategory::Clean);
    assert_eq!(verdict_server.target, TargetKind::GameObject);
}

#[test]
fn test_classify_gaming_frustration_distinction() {
    let verdict = classify_toxicity("Fait chier ce creeper qui a explosé ma base", &[]);
    assert_eq!(verdict.category, ToxicityCategory::GamingFrustration);
    assert!(!verdict.is_toxic);
    assert_eq!(verdict.target, TargetKind::GameObject);
    assert!(verdict.detected_words.iter().any(|w| w.contains("chier")));

    let verdict2 = classify_toxicity("Putain de lag sur ce serveur de merde", &[]);
    assert_eq!(verdict2.category, ToxicityCategory::GamingFrustration);
    assert!(!verdict2.is_toxic);
    assert_eq!(verdict2.target, TargetKind::GameObject);

    let verdict3 = classify_toxicity("Oh non je suis mort dans la lave fait chier", &[]);
    assert_eq!(verdict3.category, ToxicityCategory::GamingFrustration);
    assert!(!verdict3.is_toxic);
    assert_eq!(verdict3.target, TargetKind::GameObject);
}

#[test]
fn test_classify_friendly_banter_distinction() {
    let verdict = classify_toxicity("Mdr t'es trop con bien joué gg", &[]);
    assert_eq!(verdict.category, ToxicityCategory::FriendlyBanter);
    assert!(!verdict.is_toxic);
    assert_eq!(verdict.target, TargetKind::SecondPersonPronoun);

    let verdict2 = classify_toxicity("Lol t'es trop un noob gg wp", &[]);
    assert_eq!(verdict2.category, ToxicityCategory::FriendlyBanter);
    assert!(!verdict2.is_toxic);

    let verdict3 = classify_toxicity("Haha t'es nul mdr 😂", &[]);
    assert_eq!(verdict3.category, ToxicityCategory::FriendlyBanter);
    assert!(!verdict3.is_toxic);
}

#[test]
fn test_classify_targeted_harassment() {
    let verdict = classify_toxicity("T'es un sale fdp dégage d'ici", &[]);
    assert_eq!(verdict.category, ToxicityCategory::Harassment);
    assert!(verdict.is_toxic);
    assert_eq!(verdict.target, TargetKind::SecondPersonPronoun);
    assert!(verdict.score >= 0.85);
    assert!(verdict.detected_words.iter().any(|w| w == "fdp"));
}

#[test]
fn test_classify_explicit_user_mention_harassment() {
    let user_id = Id::new(123456789012345678);
    let verdict = classify_toxicity("<@123456789012345678> gros connard", &[user_id]);
    assert_eq!(verdict.category, ToxicityCategory::Harassment);
    assert!(verdict.is_toxic);
    assert_eq!(verdict.target, TargetKind::ExplicitUserMention);
    assert!(verdict.score >= 0.90);
    assert!(verdict.detected_words.iter().any(|w| w.contains("connard")));
}

#[test]
fn test_classify_reply_target_harassment() {
    let verdict = classify_toxicity_with_context("sale salope", &[], true);
    assert_eq!(verdict.category, ToxicityCategory::Harassment);
    assert!(verdict.is_toxic);
    assert_eq!(verdict.target, TargetKind::ReplyTarget);
    assert!(verdict.score >= 0.90);
}

#[test]
fn test_classify_severe_toxicity_zero_tolerance() {
    let verdict = classify_toxicity("Va crever sale negre", &[]);
    assert_eq!(verdict.category, ToxicityCategory::SevereToxicity);
    assert!(verdict.is_toxic);
    assert_eq!(verdict.score, 1.0);
    assert!(verdict.detected_words.iter().any(|w| w.contains("negre") || w.contains("creve")));

    let verdict_kys = classify_toxicity("kys gros noob mdr", &[]);
    assert_eq!(verdict_kys.category, ToxicityCategory::SevereToxicity);
    assert!(verdict_kys.is_toxic);
    assert_eq!(verdict_kys.score, 1.0);
}

#[test]
fn test_classify_leetspeak_bypass_resilience() {
    let verdict1 = classify_toxicity("t.u e.s u.n s.4.l.e f.d.p", &[]);
    assert_eq!(verdict1.category, ToxicityCategory::Harassment);
    assert!(verdict1.is_toxic);
    assert_eq!(verdict1.target, TargetKind::SecondPersonPronoun);

    let verdict2 = classify_toxicity("t'es un gros \u{0441}onnard", &[]);
    assert_eq!(verdict2.category, ToxicityCategory::Harassment);
    assert!(verdict2.is_toxic);
    assert!(verdict2.detected_words.iter().any(|w| w.contains("connard")));

    let verdict3 = classify_toxicity("c-o-n-n-a-r-d", &[]);
    assert_eq!(verdict3.category, ToxicityCategory::Harassment);
    assert!(verdict3.is_toxic);

    let verdict4 = classify_toxicity("coooonnnnard", &[]);
    assert_eq!(verdict4.category, ToxicityCategory::Harassment);
    assert!(verdict4.is_toxic);
}

#[test]
fn test_command_registration_structure() {
    let cmd = automod::command::register();
    assert_eq!(cmd.name, "test_message");
    assert_eq!(cmd.default_member_permissions, Some(Permissions::MODERATE_MEMBERS));

    let options = &cmd.options;
    assert_eq!(options.len(), 1);

    let opt = &options[0];
    assert_eq!(opt.name, "message");
    assert_eq!(opt.kind, CommandOptionType::String);
    assert_eq!(opt.required, Some(true));
}
