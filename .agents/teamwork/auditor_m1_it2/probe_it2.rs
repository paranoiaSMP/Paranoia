#[path = "/home/leo/Code/Paranoia_New/bot-rust/src/utils/mod.rs"]
pub mod utils;

#[path = "/home/leo/Code/Paranoia_New/bot-rust/src/modules/automod/mod.rs"]
pub mod automod;

use automod::{
    classify_toxicity, classify_toxicity_with_context, unmask_leetspeak, TargetKind,
    ToxicityCategory,
};
use automod::command::format_unmasked_display;
use twilight_model::id::Id;
use std::time::Instant;

fn main() {
    println!("========================================================");
    println!("FORENSIC INTEGRITY AUDITOR INDEPENDENT EMPIRICAL PROBE");
    println!("Milestone 1 — Iteration 2 (Remediation Verification)");
    println!("========================================================");

    let mut total_checks = 0;
    let mut failures = 0;

    // ---------------------------------------------------------
    // TEST SUITE 1: NOVEL UNMASKING VECTORS (Never seen in tests)
    // ---------------------------------------------------------
    println!("\n[SUITE 1] Novel Unmasking & Anti-Bypass Vectors");

    let novel_unmask_cases = vec![
        // Multi-leet + Homoglyphs + Interstitial
        ("v.4 t.3 f.4.1.r.3 f.0.u.t.r.3", "va te faire foutre"),
        // Mixed math alphanumerics + circled
        ("𝐭'𝐞𝐬 𝐮𝐧 ⓒⓞⓝⓝⓐⓡⓓ", "t'es un connard"),
        // Sans-serif bold math + monospace math
        ("𝘁'𝗲𝘀 𝘂𝗻 𝚌𝚘𝚗𝚗𝚊𝚛𝚍", "t'es un connard"),
        // Circled uppercase
        ("ⓈⒶⓁⓄⓅⒺ", "salope"),
        // BiDi embedding + pop
        ("s\u{202A}a\u{202B}l\u{202C}o\u{202D}p\u{202E}e", "salope"),
        // Invisible zero-width joiner & non-joiner & byte order mark
        ("b\u{200C}i\u{200D}t\u{FEFF}c\u{2060}h", "bitch"),
        // Repeated consonants with French doubling
        ("coooooonnnnnnnaaaarrrrdddd", "conard"),
        ("baaaattttard", "batard"),
        ("puuuuutttttttte", "pute"),
        ("fffffdddddppppp", "fdp"),
        // Single letter isolated runs with arbitrary punctuation
        ("f / d / p", "fdp"),
        ("t * g", "tg"),
        ("n _ t _ m", "ntm"),
        ("s ~ a ~ l ~ o ~ p ~ e", "salope"),
        // Discord Role mention preservation
        ("<@&987654321098765432> 7g", "<@&987654321098765432> tg"),
        // Discord Channel mention preservation
        ("<#123456789012345678> f.d.p", "<#123456789012345678> fdp"),
        // URL preservation with tricky query params
        ("https://paranoia-mc.fr/api?user=1&token=4a3b c0nn4rd", "https://paranoia-mc.fr/api?user=1&token=4a3b connard"),
    ];

    for (input, expected) in novel_unmask_cases {
        total_checks += 1;
        let actual = unmask_leetspeak(input);
        if actual == expected {
            println!("  [PASS] unmask(\"{}\") -> \"{}\"", input, actual);
        } else {
            println!("  [FAIL] unmask(\"{}\") -> expected \"{}\", got \"{}\"", input, expected, actual);
            failures += 1;
        }
    }

    // ---------------------------------------------------------
    // TEST SUITE 2: TARGET EXTRACTION HIERARCHY & VOCABULARY GAPS
    // ---------------------------------------------------------
    println!("\n[SUITE 2] Target Extraction Hierarchy & Linguistic Contexts");

    let classification_cases = vec![
        // Clean messages must retain targets
        (
            "salut <@111222333444555666> comment se passe ton build ?",
            ToxicityCategory::Clean,
            false,
            TargetKind::ExplicitUserMention,
        ),
        (
            "le serveur paranoia est super sympa",
            ToxicityCategory::Clean,
            false,
            TargetKind::GameObject,
        ),
        // Gaming frustration vs Harassment
        (
            "putain ce squelette a encore casse mon armure",
            ToxicityCategory::GamingFrustration,
            false,
            TargetKind::GameObject,
        ),
        (
            "fais chier ce warden de merde",
            ToxicityCategory::GamingFrustration,
            false,
            TargetKind::GameObject,
        ),
        (
            "ce jeu est chiant quand le ping monte",
            ToxicityCategory::GamingFrustration,
            false,
            TargetKind::GameObject,
        ),
        // Friendly banter with swears or insults
        (
            "mdr t'es trop con haha bien joué gg",
            ToxicityCategory::FriendlyBanter,
            false,
            TargetKind::SecondPersonPronoun,
        ),
        (
            "putain t'es un génie mdr",
            ToxicityCategory::FriendlyBanter,
            false,
            TargetKind::SecondPersonPronoun,
        ),
        (
            "lol t'es chiant xd",
            ToxicityCategory::FriendlyBanter,
            false,
            TargetKind::SecondPersonPronoun,
        ),
        // Targeted harassment
        (
            "t'es vraiment un gros connard",
            ToxicityCategory::Harassment,
            true,
            TargetKind::SecondPersonPronoun,
        ),
        (
            "jte nique ta mère",
            ToxicityCategory::Harassment,
            true,
            TargetKind::SecondPersonPronoun,
        ),
        (
            "es-tu débile ou quoi ?",
            ToxicityCategory::Harassment,
            true,
            TargetKind::SecondPersonPronoun,
        ),
        (
            "she is a bitch",
            ToxicityCategory::Harassment,
            true,
            TargetKind::None,
        ),
        // Severe toxicity zero tolerance
        (
            "suicide-toi et crève",
            ToxicityCategory::SevereToxicity,
            true,
            TargetKind::None,
        ),
        (
            "va crever gros fdp",
            ToxicityCategory::SevereToxicity,
            true,
            TargetKind::None,
        ),
        (
            "va te faire foutre sale connard",
            ToxicityCategory::Harassment,
            true,
            TargetKind::SecondPersonPronoun,
        ),
        (
            "va mourir sale batard",
            ToxicityCategory::SevereToxicity,
            true,
            TargetKind::None,
        ),
        (
            "sale bougnoule dégage",
            ToxicityCategory::SevereToxicity,
            true,
            TargetKind::None,
        ),
    ];

    for (content, exp_cat, exp_toxic, exp_target) in classification_cases {
        total_checks += 1;
        let v = classify_toxicity(content, &[]);
        let pass = v.category == exp_cat && v.is_toxic == exp_toxic && v.target == exp_target;
        if pass {
            println!("  [PASS] \"{}\" -> {:?} | toxic={} | target={:?} (score: {:.2})", content, v.category, v.is_toxic, v.target, v.score);
        } else {
            println!(
                "  [FAIL] \"{}\" -> expected {:?} (toxic={}, target={:?}), got {:?} (toxic={}, target={:?})",
                content, exp_cat, exp_toxic, exp_target, v.category, v.is_toxic, v.target
            );
            failures += 1;
        }
    }

    // ---------------------------------------------------------
    // TEST SUITE 3: DISCORD EMBED TRUNCATION SAFETY (< 1024 CHARS)
    // ---------------------------------------------------------
    println!("\n[SUITE 3] Discord Embed Field Overflow Safety");

    let boundary_lengths = vec![0, 10, 500, 999, 1000, 1001, 2000, 50000];
    for len in boundary_lengths {
        total_checks += 1;
        let raw = "a".repeat(len);
        let formatted = format_unmasked_display(&raw);
        if formatted.len() <= 1024 {
            println!("  [PASS] input len {} -> formatted len {} (<= 1024 bytes)", len, formatted.len());
        } else {
            println!("  [FAIL] input len {} -> formatted len {} (> 1024 bytes! DISCORD ERROR)", len, formatted.len());
            failures += 1;
        }
    }

    // ---------------------------------------------------------
    // TEST SUITE 4: PERFORMANCE UNDER ADVERSARIAL STRESS
    // ---------------------------------------------------------
    println!("\n[SUITE 4] Performance Under Adversarial Load");

    let massive_string = "f.d.p t'es un connard creeper de merde ".repeat(2500); // ~100k chars
    let start = Instant::now();
    let unmasked = unmask_leetspeak(&massive_string);
    let dur_unmask = start.elapsed();

    let start_class = Instant::now();
    let v_large = classify_toxicity(&unmasked, &[]);
    let dur_class = start_class.elapsed();

    total_checks += 1;
    if dur_unmask.as_millis() < 800 {
        println!("  [PASS] 100KB unmasking in {:?} (< 800ms)", dur_unmask);
    } else {
        println!("  [FAIL] 100KB unmasking took too long: {:?}", dur_unmask);
        failures += 1;
    }

    total_checks += 1;
    if dur_class.as_millis() < 800 {
        println!("  [PASS] 100KB classification in {:?} (< 800ms) - is_toxic={}", dur_class, v_large.is_toxic);
    } else {
        println!("  [FAIL] 100KB classification took too long: {:?}", dur_class);
        failures += 1;
    }

    // ---------------------------------------------------------
    // FINAL AUDIT SUMMARY
    // ---------------------------------------------------------
    println!("\n========================================================");
    println!("TOTAL CHECKS: {}", total_checks);
    println!("PASSED: {}", total_checks - failures);
    println!("FAILED: {}", failures);
    println!("VERDICT: {}", if failures == 0 { "CLEAN" } else { "INTEGRITY VIOLATION" });
    println!("========================================================");

    if failures > 0 {
        std::process::exit(1);
    }
}
