#[path = "/home/leo/Code/Paranoia_New/bot-rust/src/utils/mod.rs"]
pub mod utils;

#[path = "/home/leo/Code/Paranoia_New/bot-rust/src/modules/automod/mod.rs"]
pub mod automod;

use automod::{
    classify_toxicity, classify_toxicity_with_context, unmask_leetspeak, TargetKind,
    ToxicityCategory,
};
use twilight_model::id::Id;

fn main() {
    println!("=== EMPIRICAL FORENSIC VERIFICATION PROBE ===");

    // Test 1: Novel Leetspeak unmasking
    println!("\n--- Test Suite 1: Unmasking Generalization ---");
    let test_cases = vec![
        ("f.u.c.k", "fuck"),
        ("b.i.t.c.h", "bitch"),
        ("7.w.4.7", "twat"),
        ("c 0 n n 4 r d", "connard"),
        ("k y s", "kys"),
        ("n t m", "ntm"),
        ("f d p", "fdp"),
        ("t g", "tg"),
        ("coooool", "cool"),
        ("sh!t", "shit"),
        ("8!tch", "bitch"),
        ("d.i.c.k", "dick"),
    ];

    let mut unmask_failures = 0;
    for (input, expected) in test_cases {
        let actual = unmask_leetspeak(input);
        if actual == expected {
            println!("PASS: unmask('{}') == '{}'", input, actual);
        } else {
            println!("FAIL: unmask('{}') -> expected '{}', got '{}'", input, expected, actual);
            unmask_failures += 1;
        }
    }

    // Test 2: Discord syntax preservation
    println!("\n--- Test Suite 2: Syntax Preservation ---");
    let syntax_cases = vec![
        ("<@123456789012345678> c00l", "<@123456789012345678> cool"),
        ("<@!987654321098765432> 7g", "<@!987654321098765432> tg"),
        ("<#112233445566778899> fdp", "<#112233445566778899> fdp"),
        ("https://example.com/item?id=1037 b!tch", "https://example.com/item?id=1037 bitch"),
    ];

    let mut syntax_failures = 0;
    for (input, expected) in syntax_cases {
        let actual = unmask_leetspeak(input);
        if actual == expected {
            println!("PASS: syntax preservation ('{}') == '{}'", input, actual);
        } else {
            println!("FAIL: syntax preservation ('{}') -> expected '{}', got '{}'", input, expected, actual);
            syntax_failures += 1;
        }
    }

    // Test 3: Toxicity Classification Generalization
    println!("\n--- Test Suite 3: Toxicity Classification Generalization ---");
    let classification_cases = vec![
        (
            "pfff encore un zombie de merde",
            ToxicityCategory::GamingFrustration,
            false,
            TargetKind::GameObject,
        ),
        (
            "mon stuff en diamant a disparu fait chier",
            ToxicityCategory::GamingFrustration,
            false,
            TargetKind::GameObject,
        ),
        (
            "mdr t'es trop un bouffon xd",
            ToxicityCategory::FriendlyBanter,
            false,
            TargetKind::SecondPersonPronoun,
        ),
        (
            "t'es nul lol",
            ToxicityCategory::FriendlyBanter,
            false,
            TargetKind::SecondPersonPronoun,
        ),
        (
            "t'es trop debile 😂",
            ToxicityCategory::FriendlyBanter,
            false,
            TargetKind::SecondPersonPronoun,
        ),
        (
            "t'es vraiment une salope",
            ToxicityCategory::Harassment,
            true,
            TargetKind::SecondPersonPronoun,
        ),
        (
            "ferme ta gueule",
            ToxicityCategory::Harassment,
            true,
            TargetKind::None,
        ),
        (
            "va te pendre et kys",
            ToxicityCategory::SevereToxicity,
            true,
            TargetKind::SecondPersonPronoun,
        ),
        (
            "sale bougnoule crève",
            ToxicityCategory::SevereToxicity,
            true,
            TargetKind::None,
        ),
        (
            "suicide-toi gros lard",
            ToxicityCategory::SevereToxicity,
            true,
            TargetKind::SecondPersonPronoun,
        ),
    ];

    let mut class_failures = 0;
    for (content, expected_cat, expected_toxic, expected_target) in classification_cases {
        let verdict = classify_toxicity(content, &[]);
        let pass = verdict.category == expected_cat
            && verdict.is_toxic == expected_toxic
            && verdict.target == expected_target;

        if pass {
            println!(
                "PASS: '{}' -> cat={:?}, toxic={}, target={:?}, score={:.2}",
                content, verdict.category, verdict.is_toxic, verdict.target, verdict.score
            );
        } else {
            println!(
                "FAIL: '{}' -> expected cat={:?}, toxic={}, target={:?} | got cat={:?}, toxic={}, target={:?}",
                content,
                expected_cat,
                expected_toxic,
                expected_target,
                verdict.category,
                verdict.is_toxic,
                verdict.target
            );
            class_failures += 1;
        }
    }

    // Test 4: Extreme and Boundary Inputs
    println!("\n--- Test Suite 4: Boundary & Stress Inputs ---");
    let empty_unmasked = unmask_leetspeak("");
    let empty_verdict = classify_toxicity("", &[]);
    println!("Empty string unmasked='{}', is_toxic={}", empty_unmasked, empty_verdict.is_toxic);

    let symbols = "!@#$%^&*()_+-=[]{}|;':,./<>?";
    let sym_unmasked = unmask_leetspeak(symbols);
    let sym_verdict = classify_toxicity(symbols, &[]);
    println!("Symbols unmasked='{}', is_toxic={}", sym_unmasked, sym_verdict.is_toxic);

    let large_input = "salope ".repeat(5000);
    let large_verdict = classify_toxicity(&large_input, &[]);
    println!("Large input (35k chars): cat={:?}, is_toxic={}", large_verdict.category, large_verdict.is_toxic);

    println!("\n=== SUMMARY ===");
    println!("Unmask failures: {}", unmask_failures);
    println!("Syntax failures: {}", syntax_failures);
    println!("Classification failures: {}", class_failures);
}
