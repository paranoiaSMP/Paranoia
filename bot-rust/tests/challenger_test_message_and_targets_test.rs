#[path = "../src/utils/mod.rs"]
pub mod utils;

#[path = "../src/modules/automod/mod.rs"]
pub mod automod;

use automod::{
    classify_toxicity, classify_toxicity_with_context, unmask_leetspeak, TargetKind,
    ToxicityCategory,
};
use twilight_model::{
    application::command::{CommandOptionType, CommandType},
    channel::message::MessageFlags,
    guild::Permissions,
    id::Id,
};
use utils::{COLOR_ERROR, COLOR_GOLD, COLOR_SUCCESS};

// ============================================================================
// PART 1: /test_message Builder Options, Permissions, Ephemeral Flags & Formatting
// ============================================================================

#[test]
fn test_test_message_command_builder_properties() {
    let cmd = automod::command::register();

    // 1. Verify command identity
    assert_eq!(cmd.name, "test_message", "Command name must be test_message");
    assert_eq!(
        cmd.description,
        "Diagnostiquer un message avec le moteur anti-toxicité (sans sanction)",
        "Command description must match French localized spec"
    );
    assert_eq!(
        cmd.kind,
        CommandType::ChatInput,
        "Command type must be ChatInput (slash command)"
    );

    // 2. Verify permissions: MODERATE_MEMBERS only (bit 1 << 40)
    assert_eq!(
        cmd.default_member_permissions,
        Some(Permissions::MODERATE_MEMBERS),
        "Command default member permissions must require MODERATE_MEMBERS"
    );
    assert_eq!(
        Permissions::MODERATE_MEMBERS.bits(),
        1099511627776,
        "MODERATE_MEMBERS bitwise check"
    );

    // 3. Verify options
    let options = &cmd.options;
    assert_eq!(options.len(), 1, "Must have exactly 1 option");

    let opt = &options[0];
    assert_eq!(opt.name, "message", "Option name must be 'message'");
    assert_eq!(
        opt.description, "Contenu du message à tester",
        "Option description must be 'Contenu du message à tester'"
    );
    assert_eq!(
        opt.kind,
        CommandOptionType::String,
        "Option type must be String"
    );
    assert_eq!(opt.required, Some(true), "Option 'message' must be required");
}

#[test]
fn test_test_message_ephemeral_flags_and_embed_diagnostics_formatting() {
    // Verify EPHEMERAL flag bitwise definition
    assert_eq!(
        MessageFlags::EPHEMERAL.bits(),
        64,
        "MessageFlags::EPHEMERAL must correspond to bit 1 << 6"
    );

    // Test formatting helper logic identical to command.rs:47-86
    let test_cases = vec![
        (
            "Bonjour Paranoia SMP",
            ToxicityCategory::Clean,
            TargetKind::None,
            COLOR_SUCCESS,
            "✅ Propre (Clean)",
            "0.00 / 1.00 (Toxique: Non)",
            "Aucune",
            "Aucun",
        ),
        (
            "Mdr t'es trop con bien joué gg",
            ToxicityCategory::FriendlyBanter,
            TargetKind::SecondPersonPronoun,
            COLOR_SUCCESS,
            "🤝 Taquinerie amicale (FriendlyBanter)",
            "0.20 / 1.00 (Toxique: Non)",
            "Deuxième personne (tu / toi / t'es / vous)",
            "con",
        ),
        (
            "Fait chier ce creeper",
            ToxicityCategory::GamingFrustration,
            TargetKind::GameObject,
            COLOR_GOLD,
            "🎮 Frustration de jeu (GamingFrustration)",
            "0.35 / 1.00 (Toxique: Non)",
            "Objet de jeu / Mobs / Environnement",
            "chier",
        ),
        (
            "T'es un sale connard",
            ToxicityCategory::Harassment,
            TargetKind::SecondPersonPronoun,
            COLOR_ERROR,
            "🚨 Harcèlement / Attaque ciblée (Harassment)",
            "0.90 / 1.00 (Toxique: Oui)",
            "Deuxième personne (tu / toi / t'es / vous)",
            "connard",
        ),
        (
            "kys sale fdp",
            ToxicityCategory::SevereToxicity,
            TargetKind::None,
            COLOR_ERROR,
            "⛔ Toxicité sévère / Propos haineux (SevereToxicity)",
            "1.00 / 1.00 (Toxique: Oui)",
            "Aucune",
            "kys",
        ),
    ];

    for (input, exp_cat, exp_target, exp_color, exp_verdict_label, exp_score_str, exp_target_label, exp_word) in test_cases {
        let verdict = classify_toxicity(input, &[]);

        assert_eq!(verdict.category, exp_cat, "Input '{}' category mismatch", input);
        assert_eq!(verdict.target, exp_target, "Input '{}' target mismatch", input);

        // Verify color mapping
        let (color, verdict_label) = match verdict.category {
            ToxicityCategory::Clean => (COLOR_SUCCESS, "✅ Propre (Clean)"),
            ToxicityCategory::FriendlyBanter => (COLOR_SUCCESS, "🤝 Taquinerie amicale (FriendlyBanter)"),
            ToxicityCategory::GamingFrustration => (COLOR_GOLD, "🎮 Frustration de jeu (GamingFrustration)"),
            ToxicityCategory::Harassment => (COLOR_ERROR, "🚨 Harcèlement / Attaque ciblée (Harassment)"),
            ToxicityCategory::SevereToxicity => (COLOR_ERROR, "⛔ Toxicité sévère / Propos haineux (SevereToxicity)"),
        };
        assert_eq!(color, exp_color, "Color mismatch for '{}'", input);
        assert_eq!(verdict_label, exp_verdict_label, "Verdict label mismatch for '{}'", input);

        // Verify target label
        let target_label = match verdict.target {
            TargetKind::None => "Aucune".to_string(),
            TargetKind::GameObject => "Objet de jeu / Mobs / Environnement".to_string(),
            TargetKind::SecondPersonPronoun => "Deuxième personne (tu / toi / t'es / vous)".to_string(),
            TargetKind::ExplicitUserMention => "Mention explicite d'utilisateur".to_string(),
            TargetKind::ReplyTarget => "Cible de réponse au message".to_string(),
        };
        assert_eq!(target_label, exp_target_label, "Target label mismatch for '{}'", input);

        // Verify score formatting
        let score_str = format!("{:.2} / 1.00 (Toxique: {})", verdict.score, if verdict.is_toxic { "Oui" } else { "Non" });
        assert_eq!(score_str, exp_score_str, "Score string mismatch for '{}'", input);

        // Verify detected words
        if exp_word != "Aucun" {
            assert!(
                verdict.detected_words.iter().any(|w| w.contains(exp_word)),
                "Detected words for '{}' should contain '{}', got {:?}",
                input,
                exp_word,
                verdict.detected_words
            );
        }
    }
}

#[test]
fn test_test_message_empty_and_whitespace_diagnostics() {
    // Empty message
    let v_empty = classify_toxicity("", &[]);
    assert_eq!(v_empty.category, ToxicityCategory::Clean);
    assert_eq!(v_empty.target, TargetKind::None);
    assert_eq!(v_empty.score, 0.0);
    assert!(!v_empty.is_toxic);
    assert!(v_empty.normalized_text.is_empty());
    let unmasked_display = if v_empty.normalized_text.is_empty() {
        "*(vide)*".to_string()
    } else {
        format!("```\n{}\n```", v_empty.normalized_text)
    };
    assert_eq!(unmasked_display, "*(vide)*");

    // Whitespace message
    let v_spaces = classify_toxicity("    \t\n   ", &[]);
    assert_eq!(v_spaces.category, ToxicityCategory::Clean);
    assert_eq!(v_spaces.target, TargetKind::None);
    assert!(v_spaces.normalized_text.is_empty());

    // Zero-width characters only
    let v_zw = classify_toxicity("\u{200B}\u{200C}\u{FEFF}\u{2060}", &[]);
    assert_eq!(v_zw.category, ToxicityCategory::Clean);
    assert!(v_zw.normalized_text.is_empty());
}

#[test]
fn test_test_message_embed_field_character_overflow_finding() {
    let non_repeating_long = "un deux trois quatre cinq six sept huit neuf dix ".repeat(30);
    assert!(non_repeating_long.len() > 1400);

    let verdict = classify_toxicity(&non_repeating_long, &[]);
    let unmasked_display = automod::command::format_unmasked_display(&verdict.normalized_text);

    assert!(
        unmasked_display.len() <= 1024,
        "Remediated: unmasked_display length {} is within Discord embed field 1024 character limit",
        unmasked_display.len()
    );
    assert!(unmasked_display.ends_with("...```"));
}

// ============================================================================
// PART 2: Contextual Target Extraction: Second-Person vs Third-Person vs Mobs vs Mentions
// ============================================================================

#[test]
fn test_second_person_pronouns_matrix() {
    // Comprehensive test of French 2nd person pronouns
    let french_pronoun_tests = vec![
        ("tu es nul", TargetKind::SecondPersonPronoun),
        ("toi t'es nul", TargetKind::SecondPersonPronoun),
        ("te voilà idiot", TargetKind::SecondPersonPronoun),
        ("t'es trop nul", TargetKind::SecondPersonPronoun),
        ("tes vraiment débile", TargetKind::SecondPersonPronoun),
        ("t es idiot", TargetKind::SecondPersonPronoun),
        ("ferme ton clapet idiot", TargetKind::SecondPersonPronoun),
        ("ferme ta gueule", TargetKind::SecondPersonPronoun),
        ("vous êtes nuls", TargetKind::SecondPersonPronoun),
        ("votre équipe est nulle", TargetKind::SecondPersonPronoun),
        ("vos tactiques sont débiles", TargetKind::SecondPersonPronoun),
        ("va te faire foutre", TargetKind::SecondPersonPronoun),
        ("jte traite de connard", TargetKind::SecondPersonPronoun),
        ("je te déteste sale batard", TargetKind::SecondPersonPronoun),
        ("t'as un souci idiot", TargetKind::SecondPersonPronoun),
        ("tas un problème débile", TargetKind::SecondPersonPronoun),
    ];

    for (phrase, expected_target) in french_pronoun_tests {
        let v = classify_toxicity(phrase, &[]);
        assert_eq!(
            v.target, expected_target,
            "French phrase '{}' expected target {:?}, got {:?}",
            phrase, expected_target, v.target
        );
        assert!(v.is_toxic, "Phrase '{}' should be flagged toxic", phrase);
    }

    // Comprehensive test of English 2nd person pronouns
    let english_pronoun_tests = vec![
        ("you are an idiot", TargetKind::SecondPersonPronoun),
        ("ur a noob", TargetKind::SecondPersonPronoun),
        ("youre dumb", TargetKind::SecondPersonPronoun),
        ("your play is dumb", TargetKind::SecondPersonPronoun),
        ("u idiot", TargetKind::SecondPersonPronoun),
        ("kill yourself", TargetKind::SecondPersonPronoun),
        ("be ashamed of yourselves idiots", TargetKind::SecondPersonPronoun),
    ];

    for (phrase, expected_target) in english_pronoun_tests {
        let v = classify_toxicity(phrase, &[]);
        assert_eq!(
            v.target, expected_target,
            "English phrase '{}' expected target {:?}, got {:?}",
            phrase, expected_target, v.target
        );
        assert!(v.is_toxic, "Phrase '{}' should be flagged toxic", phrase);
    }
}

#[test]
fn test_jte_nique_vocabulary_gap_finding() {
    let v_jte = classify_toxicity("jte nique", &[]);
    let v_jete = classify_toxicity("je te nique", &[]);

    assert_eq!(
        v_jte.category,
        ToxicityCategory::Harassment,
        "Remediated: 'jte nique' is classified as Harassment"
    );
    assert_eq!(v_jte.target, TargetKind::SecondPersonPronoun);
    assert!(v_jte.is_toxic);

    assert_eq!(
        v_jete.category,
        ToxicityCategory::Harassment,
        "Remediated: 'je te nique' is classified as Harassment"
    );
    assert_eq!(v_jete.target, TargetKind::SecondPersonPronoun);
    assert!(v_jete.is_toxic);
}

#[test]
fn test_second_person_hyphenated_pronoun_evasion_finding() {
    let input = "es-tu idiot ?";
    let unmasked = unmask_leetspeak(input);
    assert_eq!(unmasked, "estu idiot ?");

    let verdict = classify_toxicity(input, &[]);
    assert_eq!(
        verdict.target,
        TargetKind::SecondPersonPronoun,
        "Remediated: 'es-tu' unmasked as 'estu' detected as SecondPersonPronoun"
    );
    assert_eq!(verdict.category, ToxicityCategory::Harassment);
    assert!(verdict.is_toxic);
}

#[test]
fn test_second_person_word_boundary_isolation_no_false_positives() {
    // Words containing pronoun substrings must NOT trigger TargetKind::SecondPersonPronoun
    let isolation_cases = vec![
        // Words containing "tu"
        ("ce tutoriel est con", TargetKind::None, ToxicityCategory::GamingFrustration, false),
        ("ce statut est nul", TargetKind::None, ToxicityCategory::GamingFrustration, false),
        ("cette texture est nulle", TargetKind::None, ToxicityCategory::GamingFrustration, false),
        ("cette lecture est nulle", TargetKind::None, ToxicityCategory::GamingFrustration, false),
        ("le futur est nul", TargetKind::None, ToxicityCategory::GamingFrustration, false),
        // Words containing "u"
        ("ce menu est nul", TargetKind::None, ToxicityCategory::GamingFrustration, false),
        ("ubuntu crash souvent", TargetKind::GameObject, ToxicityCategory::Clean, false),
        // Words containing "tes"
        ("les tests sont nuls", TargetKind::None, ToxicityCategory::GamingFrustration, false),
        // Words containing "ton"
        ("ce bouton est con", TargetKind::None, ToxicityCategory::GamingFrustration, false),
        // Words containing "ta"
        ("cet avatar est nul", TargetKind::None, ToxicityCategory::GamingFrustration, false),
        // Words containing "te"
        ("ce texte est nul", TargetKind::None, ToxicityCategory::GamingFrustration, false),
    ];

    for (phrase, expected_target, expected_cat, expected_toxic) in isolation_cases {
        let v = classify_toxicity(phrase, &[]);
        assert_eq!(
            v.target, expected_target,
            "Phrase '{}' falsely triggered target {:?} instead of {:?}",
            phrase, v.target, expected_target
        );
        assert_eq!(
            v.is_toxic, expected_toxic,
            "Phrase '{}' toxicity mismatch: expected {}, got {}",
            phrase, expected_toxic, v.is_toxic
        );
        assert_eq!(
            v.category, expected_cat,
            "Phrase '{}' category mismatch: expected {:?}, got {:?}",
            phrase, expected_cat, v.category
        );
    }
}

#[test]
fn test_third_person_pronouns_vs_second_person_divergence() {
    // Direct comparison: Second-person vs Third-person on identical insults

    // 1. Mild insults: "con" / "idiot"
    // Second person -> TargetKind::SecondPersonPronoun -> Harassment (toxic = true, score = 0.70)
    let v_2nd_con = classify_toxicity("tu es con", &[]);
    assert_eq!(v_2nd_con.target, TargetKind::SecondPersonPronoun);
    assert_eq!(v_2nd_con.category, ToxicityCategory::Harassment);
    assert!(v_2nd_con.is_toxic);
    assert_eq!(v_2nd_con.score, 0.70);

    // Third person French: "il" -> TargetKind::None -> GamingFrustration (toxic = false, score = 0.25)
    let v_3rd_il = classify_toxicity("il est con", &[]);
    assert_eq!(v_3rd_il.target, TargetKind::None);
    assert_eq!(v_3rd_il.category, ToxicityCategory::GamingFrustration);
    assert!(!v_3rd_il.is_toxic);
    assert_eq!(v_3rd_il.score, 0.25);

    // Third person French: "elle" -> TargetKind::None -> GamingFrustration
    let v_3rd_elle = classify_toxicity("elle est conne", &[]);
    assert_eq!(v_3rd_elle.target, TargetKind::None);
    assert_eq!(v_3rd_elle.category, ToxicityCategory::GamingFrustration);
    assert!(!v_3rd_elle.is_toxic);

    // Third person French: "ils" -> TargetKind::None -> GamingFrustration
    let v_3rd_ils = classify_toxicity("ils sont nuls", &[]);
    assert_eq!(v_3rd_ils.target, TargetKind::None);
    assert_eq!(v_3rd_ils.category, ToxicityCategory::GamingFrustration);
    assert!(!v_3rd_ils.is_toxic);

    // Third person English: "he is an idiot" vs "u are an idiot"
    let v_3rd_he = classify_toxicity("he is an idiot", &[]);
    let v_2nd_u = classify_toxicity("u are an idiot", &[]);
    assert_eq!(v_3rd_he.target, TargetKind::None);
    assert_eq!(v_3rd_he.category, ToxicityCategory::GamingFrustration);
    assert!(!v_3rd_he.is_toxic);

    assert_eq!(v_2nd_u.target, TargetKind::SecondPersonPronoun);
    assert_eq!(v_2nd_u.category, ToxicityCategory::Harassment);
    assert!(v_2nd_u.is_toxic);

    // 2. Severe insults: "connard" / "batard"
    // Second person: score = 0.90
    let v_2nd_severe = classify_toxicity("tu es un connard", &[]);
    assert_eq!(v_2nd_severe.target, TargetKind::SecondPersonPronoun);
    assert_eq!(v_2nd_severe.category, ToxicityCategory::Harassment);
    assert_eq!(v_2nd_severe.score, 0.90);

    // Third person: score = 0.85 (still toxic Harassment due to severity, but lower target weight)
    let v_3rd_severe = classify_toxicity("ce mec est un connard", &[]);
    assert_eq!(v_3rd_severe.target, TargetKind::None);
    assert_eq!(v_3rd_severe.category, ToxicityCategory::Harassment);
    assert_eq!(v_3rd_severe.score, 0.85);

    let v_3rd_batard = classify_toxicity("lui c'est un batard", &[]);
    assert_eq!(v_3rd_batard.target, TargetKind::None);
    assert_eq!(v_3rd_batard.category, ToxicityCategory::Harassment);
    assert_eq!(v_3rd_batard.score, 0.85);
}

#[test]
fn test_singular_bitch_regex_evasion_finding() {
    let v_plural = classify_toxicity("she is with bitches", &[]);
    let v_singular = classify_toxicity("she is a bitch", &[]);

    assert_eq!(
        v_plural.category,
        ToxicityCategory::Harassment,
        "Plural 'bitches' is correctly detected"
    );
    assert!(
        v_singular.is_toxic,
        "Remediated: singular 'bitch' is correctly detected"
    );
    assert_eq!(v_singular.category, ToxicityCategory::Harassment);
}

#[test]
fn test_mob_names_and_game_objects_matrix() {
    let mobs_and_objects = vec![
        ("fait chier ce creeper", TargetKind::GameObject),
        ("ce zombie est débile", TargetKind::GameObject),
        ("putain de skeleton", TargetKind::GameObject),
        ("fait chier ce squelette", TargetKind::GameObject),
        ("enderman de merde", TargetKind::GameObject),
        ("warden de merde", TargetKind::GameObject),
        ("putain de dragon", TargetKind::GameObject),
        ("wither de merde", TargetKind::GameObject),
        ("ce boss est con", TargetKind::GameObject),
        ("ce mob est relou", TargetKind::GameObject),
        ("araignée de merde", TargetKind::GameObject),
        ("spider de merde", TargetKind::GameObject),
        ("fucking ghast", TargetKind::GameObject),
        ("putain de blaze", TargetKind::GameObject),
        ("ce slime fait chier", TargetKind::GameObject),
        ("phantom de merde", TargetKind::GameObject),
        ("piglin de merde", TargetKind::GameObject),
        ("shulker de merde", TargetKind::GameObject),
        ("ce golem est idiot", TargetKind::GameObject),
        ("mort dans la lave fait chier", TargetKind::GameObject),
        ("putain de feu", TargetKind::GameObject),
        ("damn fire", TargetKind::GameObject),
        ("mort de chute fait chier", TargetKind::GameObject),
        ("fall damage de merde", TargetKind::GameObject),
        ("j'ai perdu mon diamant fait chier", TargetKind::GameObject),
        ("diamond perdu merde", TargetKind::GameObject),
        ("ma base a explosé fait chier", TargetKind::GameObject),
        ("mon coffre fait chier", TargetKind::GameObject),
        ("ma pioche est cassée bordel", TargetKind::GameObject),
        ("serveur de merde", TargetKind::GameObject),
        ("lag de merde", TargetKind::GameObject),
        ("ping de merde", TargetKind::GameObject),
        ("crash de merde", TargetKind::GameObject),
        ("rollback de merde", TargetKind::GameObject),
        ("ce jeu fait chier", TargetKind::GameObject),
        ("game de merde", TargetKind::GameObject),
        ("nether de merde", TargetKind::GameObject),
        ("bedrock de merde", TargetKind::GameObject),
    ];

    for (phrase, expected_target) in mobs_and_objects {
        let v = classify_toxicity(phrase, &[]);
        assert_eq!(
            v.target, expected_target,
            "Phrase '{}' expected TargetKind::GameObject, got {:?}",
            phrase, v.target
        );
        assert!(
            !v.is_toxic,
            "Game object frustration '{}' must NOT be toxic: got {:?}",
            phrase, v
        );
        assert_eq!(
            v.category,
            ToxicityCategory::GamingFrustration,
            "Phrase '{}' must be GamingFrustration, got {:?}",
            phrase,
            v.category
        );
    }
}

#[test]
fn test_chiant_missing_from_swears_finding() {
    let v = classify_toxicity("ce mob est chiant", &[]);
    assert_eq!(
        v.category,
        ToxicityCategory::GamingFrustration,
        "Remediated: 'chiant' is detected as frustration"
    );
    assert_eq!(v.target, TargetKind::GameObject);
    assert!(!v.is_toxic);
}

#[test]
fn test_clean_messages_discard_detected_target_finding() {
    let user_id = Id::new(123456789);
    let v_mention_clean = classify_toxicity_with_context("bonjour à tous", &[user_id], false);
    assert_eq!(
        v_mention_clean.target,
        TargetKind::ExplicitUserMention,
        "Remediated: Clean messages preserve target"
    );

    let v_discord_mention_clean = classify_toxicity("<@123456789> salut comment ça va ?", &[]);
    assert_eq!(
        v_discord_mention_clean.target,
        TargetKind::ExplicitUserMention,
        "Remediated: Clean message with mention preserves ExplicitUserMention"
    );
}

#[test]
fn test_target_extraction_priority_and_hierarchy() {
    // Hierarchy test on messages with actual insults/swears:
    // 1. ExplicitUserMention
    // 2. ReplyTarget
    // 3. SecondPersonPronoun
    // 4. GameObject
    // 5. None

    // A. ExplicitUserMention overrides Mob Name
    let v_mention_mob = classify_toxicity("<@123456789> fait chier ce creeper", &[]);
    assert_eq!(
        v_mention_mob.target,
        TargetKind::ExplicitUserMention,
        "User mention must take precedence over mob name"
    );
    assert!(v_mention_mob.is_toxic);
    assert_eq!(v_mention_mob.category, ToxicityCategory::Harassment);

    // B. ExplicitUserMention via slice overrides ReplyTarget and SecondPersonPronoun
    let user_id = Id::new(999999);
    let v_slice_mention = classify_toxicity_with_context("tu es nul", &[user_id], true);
    assert_eq!(
        v_slice_mention.target,
        TargetKind::ExplicitUserMention,
        "Slice mention must take top priority"
    );

    // C. ReplyTarget overrides SecondPersonPronoun and GameObject
    let v_reply = classify_toxicity_with_context("tu es nul", &[], true);
    assert_eq!(
        v_reply.target,
        TargetKind::ReplyTarget,
        "Reply target must take precedence over pronoun"
    );

    // D. SecondPersonPronoun overrides GameObject
    let v_pronoun_mob = classify_toxicity("tu es débile comme un zombie", &[]);
    assert_eq!(
        v_pronoun_mob.target,
        TargetKind::SecondPersonPronoun,
        "Second person pronoun must take precedence over game object"
    );
    assert!(v_pronoun_mob.is_toxic);
    assert_eq!(v_pronoun_mob.category, ToxicityCategory::Harassment);
}

#[test]
fn test_adversarial_pronoun_and_mob_leetspeak_unmasking_combinations() {
    // Disguised 2nd person pronoun with leetspeak: "7'3s un c0nn4rd"
    let unmasked = unmask_leetspeak("7'3s un c0nn4rd");
    assert_eq!(unmasked, "t'es un connard");
    let v1 = classify_toxicity("7'3s un c0nn4rd", &[]);
    assert_eq!(v1.target, TargetKind::SecondPersonPronoun);
    assert_eq!(v1.category, ToxicityCategory::Harassment);
    assert!(v1.is_toxic);

    // Disguised mob name with leetspeak: "cr33p3r d3 m3rd3"
    let unmasked_mob = unmask_leetspeak("cr33p3r d3 m3rd3");
    assert_eq!(unmasked_mob, "creeper de merde");
    let v2 = classify_toxicity("cr33p3r d3 m3rd3", &[]);
    assert_eq!(v2.target, TargetKind::GameObject);
    assert_eq!(v2.category, ToxicityCategory::GamingFrustration);
    assert!(!v2.is_toxic);

    // Disguised mention preservation: "<@123456789> c0nn4rd"
    let unmasked_mention = unmask_leetspeak("<@123456789> c0nn4rd");
    assert_eq!(unmasked_mention, "<@123456789> connard");
    let v3 = classify_toxicity("<@123456789> c0nn4rd", &[]);
    assert_eq!(v3.target, TargetKind::ExplicitUserMention);
    assert_eq!(v3.category, ToxicityCategory::Harassment);
    assert!(v3.is_toxic);

    // Cyrillic mob name: "\u{0441}reeper" (Cyrillic 'с')
    let unmasked_cyr_mob = unmask_leetspeak("\u{0441}reeper de merde");
    assert_eq!(unmasked_cyr_mob, "creeper de merde");
    let v4 = classify_toxicity("\u{0441}reeper de merde", &[]);
    assert_eq!(v4.target, TargetKind::GameObject);
    assert_eq!(v4.category, ToxicityCategory::GamingFrustration);
    assert!(!v4.is_toxic);
}

// ============================================================================
// PART 3: EMPIRICAL CHALLENGER ITERATION 2 STRESS TESTS
// ============================================================================

#[test]
fn test_challenger_it2_embed_field_truncation_exact_boundaries() {
    use automod::command::format_unmasked_display;

    // 1. Empty string
    let display_empty = format_unmasked_display("");
    assert_eq!(display_empty, "*(vide)*");
    assert!(display_empty.chars().count() <= 1024);

    // 2. Exact length 999
    let text_999 = "a".repeat(999);
    let display_999 = format_unmasked_display(&text_999);
    assert_eq!(display_999, format!("```\n{}\n```", text_999));
    assert_eq!(display_999.chars().count(), 1007);
    assert!(display_999.chars().count() <= 1024);

    // 3. Exact length 1000 (boundary condition)
    let text_1000 = "a".repeat(1000);
    let display_1000 = format_unmasked_display(&text_1000);
    assert_eq!(display_1000, format!("```\n{}\n```", text_1000));
    assert_eq!(display_1000.chars().count(), 1008);
    assert!(display_1000.chars().count() <= 1024);

    // 4. Exact length 1001 (first truncated boundary)
    let text_1001 = "a".repeat(1001);
    let display_1001 = format_unmasked_display(&text_1001);
    assert_eq!(display_1001.chars().count(), 1007);
    assert!(display_1001.ends_with("...```"));
    assert!(display_1001.chars().count() <= 1024);

    // 5. Length 1024
    let text_1024 = "b".repeat(1024);
    let display_1024 = format_unmasked_display(&text_1024);
    assert_eq!(display_1024.chars().count(), 1007);
    assert!(display_1024.ends_with("...```"));
    assert!(display_1024.chars().count() <= 1024);

    // 6. Large string (10,000 characters)
    let text_10k = "c".repeat(10000);
    let display_10k = format_unmasked_display(&text_10k);
    assert_eq!(display_10k.chars().count(), 1007);
    assert!(display_10k.ends_with("...```"));
    assert!(display_10k.chars().count() <= 1024);

    // 7. Multibyte UTF-8 characters (Accents: 'é' is 2 bytes; Emojis: '🦀' is 4 bytes)
    let text_accents = "é".repeat(1500);
    let display_accents = format_unmasked_display(&text_accents);
    assert_eq!(display_accents.chars().count(), 1007);
    assert!(display_accents.chars().count() <= 1024);

    let text_emojis = "🦀".repeat(1200);
    let display_emojis = format_unmasked_display(&text_emojis);
    assert_eq!(display_emojis.chars().count(), 1007);
    assert!(display_emojis.chars().count() <= 1024);
}

#[test]
fn test_challenger_it2_singular_bitch_variations_and_leetspeak() {
    // 1. Singular bitch alone
    let v_alone = classify_toxicity("bitch", &[]);
    assert!(v_alone.is_toxic, "Singular 'bitch' must be toxic");
    assert_eq!(v_alone.category, ToxicityCategory::Harassment);

    // 2. Targeted singular bitch (2nd person)
    let v_u = classify_toxicity("u bitch", &[]);
    assert!(v_u.is_toxic);
    assert_eq!(v_u.target, TargetKind::SecondPersonPronoun);
    assert_eq!(v_u.category, ToxicityCategory::Harassment);
    assert_eq!(v_u.score, 0.90);

    let v_you = classify_toxicity("you are a bitch", &[]);
    assert!(v_you.is_toxic);
    assert_eq!(v_you.target, TargetKind::SecondPersonPronoun);
    assert_eq!(v_you.category, ToxicityCategory::Harassment);

    // 3. Uppercase BITCH
    let v_upper = classify_toxicity("BITCH", &[]);
    assert!(v_upper.is_toxic);
    assert_eq!(v_upper.category, ToxicityCategory::Harassment);

    // 4. Leetspeak: b!tch, b1tch
    let v_leet_excl = classify_toxicity("b!tch", &[]);
    assert!(v_leet_excl.is_toxic);
    assert_eq!(v_leet_excl.category, ToxicityCategory::Harassment);

    let v_leet_one = classify_toxicity("b1tch", &[]);
    assert!(v_leet_one.is_toxic);
    assert_eq!(v_leet_one.category, ToxicityCategory::Harassment);

    // 5. Interstitial spaces & punctuation: b.i.t.c.h, b i t c h
    let v_dots = classify_toxicity("b.i.t.c.h", &[]);
    assert!(v_dots.is_toxic);
    assert_eq!(v_dots.category, ToxicityCategory::Harassment);

    let v_spaces = classify_toxicity("b i t c h", &[]);
    assert!(v_spaces.is_toxic);
    assert_eq!(v_spaces.category, ToxicityCategory::Harassment);

    // 6. Character repetitions: biiiiitch
    let v_rep = classify_toxicity("biiiiitch", &[]);
    assert!(v_rep.is_toxic);
    assert_eq!(v_rep.category, ToxicityCategory::Harassment);
}

#[test]
fn test_challenger_it2_question_inversion_es_tu_and_variants() {
    // 1. Hyphenated question inversion with mild insult: "es-tu idiot ?"
    let v_hyphen = classify_toxicity("es-tu idiot ?", &[]);
    assert_eq!(v_hyphen.target, TargetKind::SecondPersonPronoun);
    assert_eq!(v_hyphen.category, ToxicityCategory::Harassment);
    assert!(v_hyphen.is_toxic);

    // 2. Hyphenated with "con": "es-tu con ?"
    let v_con = classify_toxicity("es-tu con ?", &[]);
    assert_eq!(v_con.target, TargetKind::SecondPersonPronoun);
    assert_eq!(v_con.category, ToxicityCategory::Harassment);
    assert!(v_con.is_toxic);

    // 3. Space separated "es tu con ?"
    let v_space = classify_toxicity("es tu con ?", &[]);
    assert_eq!(v_space.target, TargetKind::SecondPersonPronoun);
    assert_eq!(v_space.category, ToxicityCategory::Harassment);
    assert!(v_space.is_toxic);

    // 4. Combined "estu con ?"
    let v_estu = classify_toxicity("estu con ?", &[]);
    assert_eq!(v_estu.target, TargetKind::SecondPersonPronoun);
    assert_eq!(v_estu.category, ToxicityCategory::Harassment);
    assert!(v_estu.is_toxic);

    // 5. Clean question inversion: "es-tu là ?"
    let v_clean = classify_toxicity("es-tu là ?", &[]);
    assert_eq!(v_clean.category, ToxicityCategory::Clean);
    assert_eq!(v_clean.target, TargetKind::SecondPersonPronoun);
    assert!(!v_clean.is_toxic);
    assert_eq!(v_clean.score, 0.0);
}

#[test]
fn test_challenger_it2_vocabulary_chiant_and_nique_matrix() {
    // A. "chiant" (Frustration swear)
    // 1. With mob (GameObject target) -> GamingFrustration, not toxic
    let v_mob = classify_toxicity("ce mob est chiant", &[]);
    assert_eq!(v_mob.category, ToxicityCategory::GamingFrustration);
    assert_eq!(v_mob.target, TargetKind::GameObject);
    assert!(!v_mob.is_toxic);

    // 2. Feminine form "chiante" with GameObject
    let v_fem = classify_toxicity("cette lave est chiante", &[]);
    assert_eq!(v_fem.category, ToxicityCategory::GamingFrustration);
    assert_eq!(v_fem.target, TargetKind::GameObject);
    assert!(!v_fem.is_toxic);

    // 3. Plural form "chiants" with mobs
    let v_plur = classify_toxicity("ces mobs sont chiants", &[]);
    assert_eq!(v_plur.category, ToxicityCategory::GamingFrustration);
    assert_eq!(v_plur.target, TargetKind::GameObject);
    assert!(!v_plur.is_toxic);

    let v_creeper = classify_toxicity("ce creeper est chiant", &[]);
    assert_eq!(v_creeper.category, ToxicityCategory::GamingFrustration);
    assert_eq!(v_creeper.target, TargetKind::GameObject);
    assert!(!v_creeper.is_toxic);

    // 4. With banter marker -> FriendlyBanter, not toxic
    let v_banter = classify_toxicity("ce jeu est trop chiant haha", &[]);
    assert_eq!(v_banter.category, ToxicityCategory::FriendlyBanter);
    assert!(!v_banter.is_toxic);

    // 5. Targeted at user: "t'es chiant" -> Harassment, toxic
    let v_target = classify_toxicity("t'es chiant", &[]);
    assert_eq!(v_target.category, ToxicityCategory::Harassment);
    assert_eq!(v_target.target, TargetKind::SecondPersonPronoun);
    assert!(v_target.is_toxic);

    // B. "nique" (Severe insult)
    // 1. "jte nique" -> Harassment, toxic
    let v_jte = classify_toxicity("jte nique", &[]);
    assert_eq!(v_jte.category, ToxicityCategory::Harassment);
    assert_eq!(v_jte.target, TargetKind::SecondPersonPronoun);
    assert!(v_jte.is_toxic);
    assert_eq!(v_jte.score, 0.90);

    // 2. "je te nique" -> Harassment, toxic
    let v_jete = classify_toxicity("je te nique", &[]);
    assert_eq!(v_jete.category, ToxicityCategory::Harassment);
    assert_eq!(v_jete.target, TargetKind::SecondPersonPronoun);
    assert!(v_jete.is_toxic);

    // 3. Plural form "niquent"
    let v_niquent = classify_toxicity("ils vous niquent", &[]);
    assert_eq!(v_niquent.category, ToxicityCategory::Harassment);
    assert_eq!(v_niquent.target, TargetKind::SecondPersonPronoun);
    assert!(v_niquent.is_toxic);

    // 4. "nique" alone
    let v_alone = classify_toxicity("nique", &[]);
    assert_eq!(v_alone.category, ToxicityCategory::Harassment);
    assert!(v_alone.is_toxic);
    assert_eq!(v_alone.score, 0.85);
}

#[test]
fn test_challenger_it2_clean_messages_target_persistence_comprehensive() {
    // 1. Clean message with User Mention via syntax <@ID>
    let v_mention_syntax = classify_toxicity("<@987654321> salut, tu viens miner ?", &[]);
    assert_eq!(v_mention_syntax.category, ToxicityCategory::Clean);
    assert_eq!(v_mention_syntax.target, TargetKind::ExplicitUserMention);
    assert!(!v_mention_syntax.is_toxic);
    assert_eq!(v_mention_syntax.score, 0.0);

    // 2. Clean message with User Mention via mentions slice
    let user_id = Id::new(123456789);
    let v_mention_slice = classify_toxicity_with_context("bonjour l'équipe", &[user_id], false);
    assert_eq!(v_mention_slice.category, ToxicityCategory::Clean);
    assert_eq!(v_mention_slice.target, TargetKind::ExplicitUserMention);
    assert!(!v_mention_slice.is_toxic);

    // 3. Clean message with Role Mention syntax <@&ID>
    let v_role_syntax = classify_toxicity("<@&1122334455> annonce réunion ce soir", &[]);
    assert_eq!(v_role_syntax.category, ToxicityCategory::Clean);
    assert_eq!(v_role_syntax.target, TargetKind::ExplicitUserMention);
    assert!(!v_role_syntax.is_toxic);

    // 4. Clean message with Reply Target
    let v_reply = classify_toxicity_with_context("oui je confirme c'est bon", &[], true);
    assert_eq!(v_reply.category, ToxicityCategory::Clean);
    assert_eq!(v_reply.target, TargetKind::ReplyTarget);
    assert!(!v_reply.is_toxic);

    // 5. Clean message with Game Object
    let v_game = classify_toxicity("le creeper est vert et marche silencieusement", &[]);
    assert_eq!(v_game.category, ToxicityCategory::Clean);
    assert_eq!(v_game.target, TargetKind::GameObject);
    assert!(!v_game.is_toxic);

    // 6. Clean message with Second Person Pronoun
    let v_pronoun = classify_toxicity("tu as bien dormi cette nuit ?", &[]);
    assert_eq!(v_pronoun.category, ToxicityCategory::Clean);
    assert_eq!(v_pronoun.target, TargetKind::SecondPersonPronoun);
    assert!(!v_pronoun.is_toxic);

    // 7. Clean message with No Target
    let v_none = classify_toxicity("le soleil brille aujourd'hui", &[]);
    assert_eq!(v_none.category, ToxicityCategory::Clean);
    assert_eq!(v_none.target, TargetKind::None);
    assert!(!v_none.is_toxic);
}

