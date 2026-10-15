#[path = "../src/utils/mod.rs"]
pub mod utils;

#[path = "../src/modules/automod/mod.rs"]
pub mod automod;

use automod::{classify_toxicity, unmask_leetspeak, ToxicityCategory};
use std::time::Instant;

#[test]
fn test_dispatch_gamer_false_positive_resistance() {
    // Exact prompts requested in dispatch:
    // 1. "ce squelette m'a saoulé"
    let v1 = classify_toxicity("ce squelette m'a saoulé", &[]);
    assert_eq!(
        v1.category,
        ToxicityCategory::Clean,
        "Legitimate chat 'ce squelette m'a saoulé' must be Clean: got {:?}",
        v1
    );
    assert!(!v1.is_toxic, "Must not be toxic");

    // 2. "lol t'es un fou mdr"
    let v2 = classify_toxicity("lol t'es un fou mdr", &[]);
    assert!(
        !v2.is_toxic,
        "Banter 'lol t'es un fou mdr' must not be flagged toxic: got {:?}",
        v2
    );

    // 3. "gg t'es un monstre"
    let v3 = classify_toxicity("gg t'es un monstre", &[]);
    assert!(
        !v3.is_toxic,
        "Praise 'gg t'es un monstre' must not be flagged toxic: got {:?}",
        v3
    );
}

#[test]
fn test_vuln_gamer_praise_with_frustration_swears_falsely_flagged() {
    let v1 = classify_toxicity("putain t'es trop fort mdr", &[]);
    assert_eq!(
        v1.category,
        ToxicityCategory::FriendlyBanter,
        "Remediated: 'putain t'es trop fort mdr' is classified as FriendlyBanter"
    );
    assert!(!v1.is_toxic, "Remediated: gamer praise is not toxic");

    let v2 = classify_toxicity("merde t'es rapide gg", &[]);
    assert_eq!(
        v2.category,
        ToxicityCategory::FriendlyBanter,
        "Remediated: 'merde t'es rapide gg' is classified as FriendlyBanter"
    );
    assert!(!v2.is_toxic, "Remediated: gamer praise is not toxic");

    let v3 = classify_toxicity("fais chier ce squelette tu trouves pas ?", &[]);
    assert_eq!(
        v3.category,
        ToxicityCategory::GamingFrustration,
        "Remediated: mob frustration with 'tu' is classified as GamingFrustration"
    );
    assert!(!v3.is_toxic, "Remediated: mob frustration is not toxic");
}

#[test]
fn test_vuln_repetition_collapsing_consonant_doubling_bypasses() {
    // 1. "puttttte" -> collapses to "pute"
    let unmasked_pute = unmask_leetspeak("t'es une puttttte");
    assert_eq!(unmasked_pute, "t'es une pute");
    let v_pute = classify_toxicity("t'es une puttttte", &[]);
    assert!(v_pute.is_toxic, "Remediated: 'puttttte' is toxic");
    assert_eq!(v_pute.category, ToxicityCategory::Harassment);

    // 2. "baaatttard" -> collapses to "batard"
    let unmasked_batard = unmask_leetspeak("sale baaatttard");
    assert_eq!(unmasked_batard, "sale batard");
    let v_batard = classify_toxicity("sale baaatttard", &[]);
    assert!(v_batard.is_toxic, "Remediated: 'baaatttard' is toxic");
    assert_eq!(v_batard.category, ToxicityCategory::Harassment);

    // 3. "salllllope" -> collapses to "salope"
    let unmasked_salope = unmask_leetspeak("grosse salllllope");
    assert_eq!(unmasked_salope, "grosse salope");
    let v_salope = classify_toxicity("grosse salllllope", &[]);
    assert!(v_salope.is_toxic, "Remediated: 'salllllope' is toxic");
    assert_eq!(v_salope.category, ToxicityCategory::Harassment);

    // 4. "fffffddddpppp" -> collapses to "fdp"
    let unmasked_fdp = unmask_leetspeak("t'es un fffffddddpppp");
    assert_eq!(unmasked_fdp, "t'es un fdp");
    let v_fdp = classify_toxicity("t'es un fffffddddpppp", &[]);
    assert!(v_fdp.is_toxic, "Remediated: 'fffffddddpppp' is toxic");
    assert_eq!(v_fdp.category, ToxicityCategory::Harassment);

    // 5. "tttggg" -> collapses to "tg"
    let unmasked_tg = unmask_leetspeak("tttggg");
    assert_eq!(unmasked_tg, "tg");
    let v_tg = classify_toxicity("tttggg", &[]);
    assert!(v_tg.is_toxic, "Remediated: 'tttggg' is toxic");
    assert_eq!(v_tg.category, ToxicityCategory::Harassment);

    // 6. "connarrrrd" -> collapses to "connard"
    let unmasked_connard = unmask_leetspeak("t'es un connarrrrd");
    assert_eq!(unmasked_connard, "t'es un connard");
    let v_connard = classify_toxicity("t'es un connarrrrd", &[]);
    assert!(v_connard.is_toxic, "Remediated: 'connarrrrd' is toxic");
    assert_eq!(v_connard.category, ToxicityCategory::Harassment);
}

#[test]
fn test_vuln_interstitial_punctuation_bypasses() {
    let unmasked_comma = unmask_leetspeak("t'es un c,o,n,n,a,r,d");
    assert_eq!(unmasked_comma, "t'es un connard");
    let v_comma = classify_toxicity("t'es un c,o,n,n,a,r,d", &[]);
    assert!(v_comma.is_toxic, "Remediated: comma punctuation unmasked as connard");
    assert_eq!(v_comma.category, ToxicityCategory::Harassment);

    let unmasked_colon = unmask_leetspeak("t'es un c:o:n:n:a:r:d");
    assert_eq!(unmasked_colon, "t'es un connard");
    let v_colon = classify_toxicity("t'es un c:o:n:n:a:r:d", &[]);
    assert!(v_colon.is_toxic, "Remediated: colon punctuation unmasked as connard");
    assert_eq!(v_colon.category, ToxicityCategory::Harassment);

    let unmasked_brackets = unmask_leetspeak("t'es un c(o)n(n)a(r)d");
    assert_eq!(unmasked_brackets, "t'es un connard");
    let v_brackets = classify_toxicity("t'es un c(o)n(n)a(r)d", &[]);
    assert!(v_brackets.is_toxic, "Remediated: bracket punctuation unmasked as connard");
    assert_eq!(v_brackets.category, ToxicityCategory::Harassment);

    let unmasked_spaced_dot = unmask_leetspeak("t'es un f . d . p");
    assert_eq!(unmasked_spaced_dot, "t'es un fdp");
    let v_spaced_dot = classify_toxicity("t'es un f . d . p", &[]);
    assert!(v_spaced_dot.is_toxic, "Remediated: spaced dots unmasked as fdp");
    assert_eq!(v_spaced_dot.category, ToxicityCategory::Harassment);

    let unmasked_spaced_dash = unmask_leetspeak("t'es un f - d - p");
    assert_eq!(unmasked_spaced_dash, "t'es un fdp");
    let v_spaced_dash = classify_toxicity("t'es un f - d - p", &[]);
    assert!(v_spaced_dash.is_toxic, "Remediated: spaced dashes unmasked as fdp");
    assert_eq!(v_spaced_dash.category, ToxicityCategory::Harassment);
}

#[test]
fn test_vuln_unicode_homoglyphs_and_bidi_bypasses() {
    let math_bold = "t'es un 𝐜𝐨𝐧𝐧𝐚𝐫𝐝";
    let unmasked_bold = unmask_leetspeak(math_bold);
    assert_eq!(unmasked_bold, "t'es un connard");
    let v_bold = classify_toxicity(math_bold, &[]);
    assert!(v_bold.is_toxic, "Remediated: Mathematical bold detected");
    assert_eq!(v_bold.category, ToxicityCategory::Harassment);

    let math_mono = "t'es un 𝚌𝚘𝚗𝚗𝐚𝐫𝚍";
    let unmasked_mono = unmask_leetspeak(math_mono);
    assert_eq!(unmasked_mono, "t'es un connard");
    let v_mono = classify_toxicity(math_mono, &[]);
    assert!(v_mono.is_toxic, "Remediated: Mathematical monospace detected");
    assert_eq!(v_mono.category, ToxicityCategory::Harassment);

    let circled = "t'es un ⓒⓞⓝⓝⓐⓡⓓ";
    let unmasked_circled = unmask_leetspeak(circled);
    assert_eq!(unmasked_circled, "t'es un connard");
    let v_circled = classify_toxicity(circled, &[]);
    assert!(v_circled.is_toxic, "Remediated: Circled letters detected");
    assert_eq!(v_circled.category, ToxicityCategory::Harassment);

    let cyrillic_en = "t'es un coннard";
    let unmasked_en = unmask_leetspeak(cyrillic_en);
    assert_eq!(unmasked_en, "t'es un connard");
    let v_en = classify_toxicity(cyrillic_en, &[]);
    assert!(v_en.is_toxic, "Remediated: Cyrillic 'н' mapped to 'n'");
    assert_eq!(v_en.category, ToxicityCategory::Harassment);

    let bidi = "t'es un c\u{202E}onnard";
    let unmasked_bidi = unmask_leetspeak(bidi);
    assert_eq!(unmasked_bidi, "t'es un connard");
    let v_bidi = classify_toxicity(bidi, &[]);
    assert!(v_bidi.is_toxic, "Remediated: BiDi RLO stripped and detected");
    assert_eq!(v_bidi.category, ToxicityCategory::Harassment);
}

#[test]
fn test_vuln_discord_role_mention_corruption() {
    let role = "<@&123456789012345678>";
    let unmasked_role = unmask_leetspeak(role);
    assert_eq!(
        unmasked_role, role,
        "Remediated: Role mention <@&ID> is preserved without corruption"
    );
}

#[test]
fn test_stress_and_performance_large_payload() {
    // 50,000 characters payload of repeating varied sentences
    let sentence = "ceci est un message ordinaire pour tester les performances de classification ";
    let large_text = sentence.repeat(700); // ~53,000 chars
    let start = Instant::now();
    let unmasked = unmask_leetspeak(&large_text);
    let duration_unmask = start.elapsed();
    assert!(
        duration_unmask.as_millis() < 500,
        "Unmasking 50KB took too long: {:?}",
        duration_unmask
    );

    let start_class = Instant::now();
    let verdict = classify_toxicity(&unmasked, &[]);
    let duration_class = start_class.elapsed();
    assert_eq!(verdict.category, ToxicityCategory::Clean);
    assert!(
        duration_class.as_millis() < 500,
        "Classifying 50KB took too long: {:?}",
        duration_class
    );
}

#[test]
fn test_stress_large_nested_separators() {
    // 1,000 alternating non-leet punctuation marks (. - _ *)
    let nested = "f".to_string() + &".-_*".repeat(250) + "d" + &".-_*".repeat(250) + "p";
    let start = Instant::now();
    let unmasked = unmask_leetspeak(&nested);
    let elapsed = start.elapsed();
    assert_eq!(unmasked, "fdp");
    assert!(
        elapsed.as_millis() < 200,
        "Nested punctuation stripping took too long: {:?}",
        elapsed
    );
}


