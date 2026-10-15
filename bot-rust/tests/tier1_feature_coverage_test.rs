mod common;

use common::contracts::*;
use std::time::{Duration, Instant};
use twilight_model::id::Id;

// ===========================================================================
// F1: Leetspeak Unmasking & Homoglyph Normalization Tests
// ===========================================================================

#[test]
fn test_leetspeak_digit_substitutions_normalized() {
    let input = "c0nn4rd s4l0p3";
    let unmasked = unmask_leetspeak(input);
    assert_eq!(unmasked, "connard salope");

    let numbers = "7g fdp 1d107";
    assert_eq!(unmask_leetspeak(numbers), "tg fdp idiot");
}

#[test]
fn test_leetspeak_cyrillic_homoglyphs_normalized() {
    // Uses Cyrillic 'с' (U+0441), 'а' (U+0430), 'е' (U+0435) to evade ASCII filters
    let cyrillic_input = "соnnаrd sаlopе";
    let unmasked = unmask_leetspeak(cyrillic_input);
    assert_eq!(unmasked, "connard salope");
}

#[test]
fn test_leetspeak_punctuation_and_delimiters_stripped() {
    let dotted = "f.d.p et c-o-n-n-a-r-d et s*a*l*o*p*e";
    let unmasked = unmask_leetspeak(dotted);
    assert!(unmasked.contains("fdp"), "Expected 'fdp' in '{}'", unmasked);
    assert!(unmasked.contains("connard"), "Expected 'connard' in '{}'", unmasked);
    assert!(unmasked.contains("salope"), "Expected 'salope' in '{}'", unmasked);
}

#[test]
fn test_leetspeak_consecutive_repeated_characters_collapsed() {
    let stretched = "cooooonnnnaaaard";
    let unmasked = unmask_leetspeak(stretched);
    assert_eq!(unmasked, "connard");

    let stretched_tg = "tgggggggg";
    assert_eq!(unmask_leetspeak(stretched_tg), "tg");
}

#[test]
fn test_leetspeak_zero_width_and_invisible_chars_stripped() {
    // Interleaving U+200B (Zero Width Space)
    let invisible = "c\u{200B}o\u{200B}n\u{200B}n\u{200B}a\u{200B}r\u{200B}d";
    let unmasked = unmask_leetspeak(invisible);
    assert_eq!(unmasked, "connard");
}

#[test]
fn test_leetspeak_clean_gaming_chat_preserved() {
    let clean = "gg pour le dragon, beau stuff en netherite!";
    let unmasked = unmask_leetspeak(clean);
    assert_eq!(unmasked, "gg pour le dragon, beau stuff en netherite!");
}

// ===========================================================================
// F2: Contextual Toxicity Classification Tests
// ===========================================================================

#[test]
fn test_classify_targeted_harassment_with_pronoun_flagged() {
    let verdict = classify_toxicity("tu es un gros connard", &[]);
    assert!(verdict.is_toxic, "Targeted insult must be toxic");
    assert_eq!(verdict.category, ToxicityCategory::Harassment);
    assert_eq!(verdict.target, TargetKind::SecondPersonPronoun);
    assert!(verdict.score >= 0.85);
}

#[test]
fn test_classify_targeted_harassment_with_explicit_mention_flagged() {
    let user_id = Id::new(123456789012345678);
    let verdict = classify_toxicity("sale fdp dégage", &[user_id]);
    assert!(verdict.is_toxic);
    assert_eq!(verdict.category, ToxicityCategory::Harassment);
    assert_eq!(verdict.target, TargetKind::ExplicitUserMention);
}

#[test]
fn test_classify_gaming_frustration_on_mobs_allowed() {
    let verdict = classify_toxicity("fait chier ce squelette de merde j'ai perdu mon stuff", &[]);
    assert!(!verdict.is_toxic, "Gaming frustration against mobs must not be sanctioned");
    assert_eq!(verdict.category, ToxicityCategory::GamingFrustration);
    assert_eq!(verdict.target, TargetKind::GameObject);
    assert!(verdict.score <= 0.40);
}

#[test]
fn test_classify_friendly_banter_with_laughter_allowed() {
    let verdict = classify_toxicity("t'es trop nul mdr gg bro 😂", &[]);
    assert!(!verdict.is_toxic, "Friendly banter with laughter tokens must not be sanctioned");
    assert_eq!(verdict.category, ToxicityCategory::FriendlyBanter);
}

#[test]
fn test_classify_severe_toxicity_slurs_zero_tolerance() {
    let verdict = classify_toxicity("sale negre de merde", &[]);
    assert!(verdict.is_toxic, "Severe slurs must always be flagged");
    assert_eq!(verdict.category, ToxicityCategory::SevereToxicity);
    assert!(verdict.score >= 0.95);
}

#[test]
fn test_classify_clean_chat_zero_score() {
    let verdict = classify_toxicity("on se retrouve aux coordonnées 1500 64 -300 pour miner", &[]);
    assert!(!verdict.is_toxic);
    assert_eq!(verdict.category, ToxicityCategory::Clean);
    assert_eq!(verdict.score, 0.0);
    assert!(verdict.detected_words.is_empty());
}

// ===========================================================================
// F3: /test_message Ephemeral Diagnostics Tests
// ===========================================================================

#[test]
fn test_test_message_returns_ephemeral_verdict_without_sanctions() {
    let diag = test_message_diagnostics("tu es un gros connard", &[]);
    assert!(diag.ephemeral, "Diagnostics command response must be ephemeral");
    assert!(!diag.sanctions_applied, "Test diagnostics must never apply sanctions");
    assert!(diag.verdict.is_toxic);
    assert_eq!(diag.verdict.category, ToxicityCategory::Harassment);
}

#[test]
fn test_test_message_reports_unmasked_text_in_diagnostics() {
    let diag = test_message_diagnostics("t.u e.s u.n c0nn4rd", &[]);
    assert_eq!(diag.verdict.normalized_text, "tu es un connard");
    assert!(diag.verdict.detected_words.contains(&"connard".to_string()));
}

#[test]
fn test_test_message_detects_target_correctly() {
    let target_id = Id::new(998877665544332211);
    let diag = test_message_diagnostics("tg dégage", &[target_id]);
    assert_eq!(diag.verdict.target, TargetKind::ExplicitUserMention);
}

#[test]
fn test_test_message_provides_confidence_score() {
    let diag = test_message_diagnostics("tu pues le seum idiot", &[]);
    assert!(diag.verdict.score > 0.50);
}

#[test]
fn test_test_message_diagnoses_clean_gaming_message_accurately() {
    let diag = test_message_diagnostics("qui a du fer à échanger ?", &[]);
    assert_eq!(diag.verdict.category, ToxicityCategory::Clean);
    assert_eq!(diag.verdict.score, 0.0);
    assert!(!diag.verdict.is_toxic);
}

// ===========================================================================
// F4: Media & OCR Scam Detection Tests
// ===========================================================================

#[test]
fn test_ocr_scam_crypto_giveaway_detected() {
    let ocr_text = "OFFICIAL GIVEAWAY! Elon Musk 100 BTC Giveaway, claim 0.5 BTC now!";
    let verdict = scan_ocr_text(ocr_text);
    match verdict {
        ScamVerdict::CryptoCasinoScam { confidence, .. } => {
            assert!(confidence >= 0.90);
        }
        ScamVerdict::Clean => panic!("Expected crypto scam detection"),
    }
}

#[test]
fn test_ocr_scam_casino_promo_code_detected() {
    let ocr_text = "Use promo code STAKE100 for 100 free spins and deposit match on roll casino!";
    let verdict = scan_ocr_text(ocr_text);
    match verdict {
        ScamVerdict::CryptoCasinoScam { confidence, .. } => {
            assert!(confidence >= 0.90);
        }
        ScamVerdict::Clean => panic!("Expected casino promo scam detection"),
    }
}

#[test]
fn test_ocr_scam_unauthorized_withdrawal_alert_detected() {
    let ocr_text = "Security Alert: Unauthorized withdrawal of 2.45 BTC detected. Confirm cancellation immediately.";
    let verdict = scan_ocr_text(ocr_text);
    match verdict {
        ScamVerdict::CryptoCasinoScam { reason, .. } => {
            assert!(reason.contains("cryptocurrency"));
        }
        ScamVerdict::Clean => panic!("Expected unauthorized withdrawal scam detection"),
    }
}

#[test]
fn test_ocr_scam_fake_discord_nitro_gift_detected() {
    let ocr_text = "Discord Nitro Gift! Claim 3 months free discord nitro now!";
    let verdict = scan_ocr_text(ocr_text);
    match verdict {
        ScamVerdict::CryptoCasinoScam { confidence, .. } => {
            assert!(confidence >= 0.90);
        }
        ScamVerdict::Clean => panic!("Expected fake nitro scam detection"),
    }
}

#[test]
fn test_ocr_clean_gaming_screenshot_allowed() {
    let ocr_text = "Paranoia SMP Season 3 - Player Stats: 120 Kills, 4 Deaths, 15 Quests Completed";
    let verdict = scan_ocr_text(ocr_text);
    assert_eq!(verdict, ScamVerdict::Clean);
}

// ===========================================================================
// F5: Link & Phishing Interception Tests
// ===========================================================================

#[test]
fn test_link_filter_typosquat_phishing_intercepted() {
    let content = "Click here for free nitro: https://dlscord-nitro.com/gift";
    let verdict = evaluate_link(content, &["paranoia-mc.fr"], &["paranoia"]);
    match verdict {
        LinkVerdict::Phishing { domain } => {
            assert!(domain.contains("dlscord-nitro"));
        }
        _ => panic!("Expected phishing verdict"),
    }
}

#[test]
fn test_link_filter_unauthorized_discord_invite_intercepted() {
    let content = "Join our server! https://discord.gg/foreign-raid-code";
    let verdict = evaluate_link(content, &["paranoia-mc.fr"], &["paranoia"]);
    assert_eq!(
        verdict,
        LinkVerdict::UnauthorizedInvite {
            code: "foreign-raid-code".to_string()
        }
    );
}

#[test]
fn test_link_filter_whitelisted_server_invite_allowed() {
    let content = "Rejoignez le serveur officiel: https://discord.gg/paranoia";
    let verdict = evaluate_link(content, &["paranoia-mc.fr"], &["paranoia"]);
    assert_eq!(verdict, LinkVerdict::Allowed);
}

#[test]
fn test_link_filter_whitelisted_domains_allowed() {
    let content = "Regardez le tutoriel: https://youtube.com/watch?v=paranoia et https://paranoia-mc.fr/regles";
    let verdict = evaluate_link(content, &["youtube.com", "paranoia-mc.fr"], &["paranoia"]);
    assert_eq!(verdict, LinkVerdict::Allowed);
}

#[test]
fn test_link_filter_clean_text_without_links_allowed() {
    let content = "On se retrouve au spawn pour l'event de ce soir !";
    let verdict = evaluate_link(content, &["paranoia-mc.fr"], &["paranoia"]);
    assert_eq!(verdict, LinkVerdict::Allowed);
}

// ===========================================================================
// F6: Anti-Unauthorized Mentions Tests
// ===========================================================================

#[test]
fn test_mention_filter_unauthorized_everyone_blocked() {
    let verdict = check_mentions(&[1001], 9999, true, &[], &[], 0);
    assert_eq!(verdict, MentionVerdict::UnauthorizedEveryone);
}

#[test]
fn test_mention_filter_unauthorized_protected_staff_role_blocked() {
    let protected_role = 5555;
    let verdict = check_mentions(&[1001], 9999, false, &[protected_role], &[protected_role], 1);
    assert_eq!(
        verdict,
        MentionVerdict::UnauthorizedProtectedRole { role_id: protected_role }
    );
}

#[test]
fn test_mention_filter_mass_mention_exceeding_threshold_blocked() {
    let verdict = check_mentions(&[1001], 9999, false, &[], &[], 7);
    assert_eq!(
        verdict,
        MentionVerdict::UnauthorizedMassMention { count: 7 }
    );
}

#[test]
fn test_mention_filter_staff_bypass_allowed() {
    let staff_role = 9999;
    // Staff member mentioning everyone and protected roles
    let verdict = check_mentions(&[staff_role], staff_role, true, &[5555], &[5555], 10);
    assert_eq!(verdict, MentionVerdict::Allow);
}

#[test]
fn test_mention_filter_legitimate_peer_mentions_allowed() {
    let verdict = check_mentions(&[1001], 9999, false, &[], &[5555], 2);
    assert_eq!(verdict, MentionVerdict::Allow);
}

// ===========================================================================
// F7: Sliding-Window Anti-Flood Tests
// ===========================================================================

#[test]
fn test_antiflood_normal_rate_allowed() {
    let mut tracker = AntiFloodTracker::new(Duration::from_secs(5), 5, 3);
    let user_id = Id::new(1001);
    let now = Instant::now();

    assert_eq!(
        tracker.record_and_evaluate(user_id, Id::new(1), "msg 1", now),
        FloodAction::Allow
    );
    assert_eq!(
        tracker.record_and_evaluate(user_id, Id::new(2), "msg 2", now + Duration::from_millis(500)),
        FloodAction::Allow
    );
    assert_eq!(
        tracker.record_and_evaluate(user_id, Id::new(3), "msg 3", now + Duration::from_millis(1000)),
        FloodAction::Allow
    );
}

#[test]
fn test_antiflood_burst_exceeding_threshold_triggers_purge_and_timeout() {
    let mut tracker = AntiFloodTracker::new(Duration::from_secs(5), 5, 3);
    let user_id = Id::new(1001);
    let now = Instant::now();

    for i in 1..=4 {
        assert_eq!(
            tracker.record_and_evaluate(user_id, Id::new(i), &format!("burst {}", i), now),
            FloodAction::Allow
        );
    }

    // 5th message breaches the burst threshold of 5
    let action = tracker.record_and_evaluate(user_id, Id::new(5), "burst 5", now);
    match action {
        FloodAction::PurgeAndTimeout { message_ids, duration_seconds } => {
            assert_eq!(message_ids.len(), 5);
            assert_eq!(duration_seconds, 300);
        }
        FloodAction::Allow => panic!("Expected flood timeout action"),
    }
}

#[test]
fn test_antiflood_duplicate_content_triggers_purge() {
    let mut tracker = AntiFloodTracker::new(Duration::from_secs(5), 10, 3);
    let user_id = Id::new(1002);
    let now = Instant::now();

    assert_eq!(
        tracker.record_and_evaluate(user_id, Id::new(1), "spam", now),
        FloodAction::Allow
    );
    assert_eq!(
        tracker.record_and_evaluate(user_id, Id::new(2), "spam", now + Duration::from_millis(200)),
        FloodAction::Allow
    );

    // 3rd identical repetition triggers purge
    let action = tracker.record_and_evaluate(user_id, Id::new(3), "spam", now + Duration::from_millis(400));
    match action {
        FloodAction::PurgeAndTimeout { message_ids, .. } => {
            assert_eq!(message_ids.len(), 3);
        }
        FloodAction::Allow => panic!("Expected repetition flood action"),
    }
}

#[test]
fn test_antiflood_sliding_window_expiration_resets_history() {
    let mut tracker = AntiFloodTracker::new(Duration::from_secs(2), 3, 3);
    let user_id = Id::new(1003);
    let now = Instant::now();

    tracker.record_and_evaluate(user_id, Id::new(1), "msg 1", now);
    tracker.record_and_evaluate(user_id, Id::new(2), "msg 2", now + Duration::from_millis(100));

    // Jump forward past window duration of 2s
    let future = now + Duration::from_secs(3);
    let action = tracker.record_and_evaluate(user_id, Id::new(3), "msg 3", future);
    assert_eq!(action, FloodAction::Allow, "Expired messages must not count toward burst");
}

#[test]
fn test_antiflood_isolated_between_distinct_users() {
    let mut tracker = AntiFloodTracker::new(Duration::from_secs(5), 4, 3);
    let user_a = Id::new(2001);
    let user_b = Id::new(2002);
    let now = Instant::now();

    for i in 1..=3 {
        tracker.record_and_evaluate(user_a, Id::new(i), "spam a", now);
    }

    // User B sends first message — must not be affected by User A's history
    let action_b = tracker.record_and_evaluate(user_b, Id::new(10), "hello from b", now);
    assert_eq!(action_b, FloodAction::Allow);
}

// ===========================================================================
// F8: Join-Velocity Anti-Raid Tests
// ===========================================================================

#[test]
fn test_antiraid_normal_join_rate_allowed() {
    let mut raid_state = GuildRaidState::new(Duration::from_secs(5), 5, Duration::from_secs(60));
    let now = Instant::now();

    assert_eq!(
        raid_state.evaluate_join(Id::new(1), now),
        JoinDecision::Allow
    );
    assert_eq!(
        raid_state.evaluate_join(Id::new(2), now + Duration::from_secs(2)),
        JoinDecision::Allow
    );
}

#[test]
fn test_antiraid_burst_joins_trigger_lockdown() {
    let mut raid_state = GuildRaidState::new(Duration::from_secs(5), 5, Duration::from_secs(60));
    let now = Instant::now();

    for i in 1..=4 {
        assert_eq!(
            raid_state.evaluate_join(Id::new(i), now),
            JoinDecision::Allow
        );
    }

    // 5th join in burst triggers lockdown
    let decision = raid_state.evaluate_join(Id::new(5), now);
    match decision {
        JoinDecision::TriggerLockdown { suspect_user_ids, reason } => {
            assert_eq!(suspect_user_ids.len(), 5);
            assert!(reason.contains("Join-velocity raid detected"));
        }
        _ => panic!("Expected lockdown trigger"),
    }
}

#[test]
fn test_antiraid_lockdown_gathers_suspect_accounts_for_kick() {
    let mut raid_state = GuildRaidState::new(Duration::from_secs(5), 3, Duration::from_secs(60));
    let now = Instant::now();

    raid_state.evaluate_join(Id::new(101), now);
    raid_state.evaluate_join(Id::new(102), now);
    let decision = raid_state.evaluate_join(Id::new(103), now);

    match decision {
        JoinDecision::TriggerLockdown { suspect_user_ids, .. } => {
            assert_eq!(suspect_user_ids, vec![Id::new(101), Id::new(102), Id::new(103)]);
        }
        _ => panic!("Expected suspect user IDs to be returned for kick"),
    }
}

#[test]
fn test_antiraid_subsequent_joins_during_lockdown_kicked_immediately() {
    let mut raid_state = GuildRaidState::new(Duration::from_secs(5), 2, Duration::from_secs(60));
    let now = Instant::now();

    raid_state.evaluate_join(Id::new(1), now);
    raid_state.evaluate_join(Id::new(2), now); // Triggers lockdown

    // Account 3 joins while lockdown is active
    let decision = raid_state.evaluate_join(Id::new(3), now + Duration::from_secs(1));
    assert_eq!(
        decision,
        JoinDecision::KickRaidMember { user_id: Id::new(3) }
    );
}

#[test]
fn test_antiraid_lockdown_expiration_restores_normal_entry() {
    let mut raid_state = GuildRaidState::new(Duration::from_secs(5), 2, Duration::from_secs(10));
    let now = Instant::now();

    raid_state.evaluate_join(Id::new(1), now);
    raid_state.evaluate_join(Id::new(2), now); // Triggers lockdown for 10s

    // Jump 15s into future after lockdown expiration
    let future = now + Duration::from_secs(15);
    let decision = raid_state.evaluate_join(Id::new(3), future);
    assert_eq!(decision, JoinDecision::Allow, "After lockdown expires, joins must be allowed");
}

// ===========================================================================
// F9: Gatekeeper Captcha Verification Tests
// ===========================================================================

#[test]
fn test_gatekeeper_correct_token_verified() {
    let user_id = Id::new(99001);
    let challenge = generate_captcha(user_id, 42);
    let result = verify_captcha(&challenge, &challenge.correct_token);
    assert!(result, "Valid token must pass verification");
}

#[test]
fn test_gatekeeper_incorrect_token_rejected() {
    let user_id = Id::new(99002);
    let challenge = generate_captcha(user_id, 42);
    let result = verify_captcha(&challenge, "wrong_token_123");
    assert!(!result, "Invalid token must fail verification");
}

#[test]
fn test_gatekeeper_randomized_options_generated() {
    let challenge = generate_captcha(Id::new(99003), 10);
    assert!(challenge.options.len() >= 3);
    assert!(
        challenge.options.iter().any(|(_, token)| token == &challenge.correct_token),
        "Options must include correct challenge token"
    );
}

#[test]
fn test_gatekeeper_deterministic_with_same_seed() {
    let c1 = generate_captcha(Id::new(99004), 1337);
    let c2 = generate_captcha(Id::new(99004), 1337);
    assert_eq!(c1, c2, "Identical seed must produce identical challenge");
}

#[test]
fn test_gatekeeper_different_seeds_yield_different_challenges() {
    let c1 = generate_captcha(Id::new(99005), 1);
    let c2 = generate_captcha(Id::new(99005), 2);
    // Either prompts or options should differ
    assert_ne!(c1.prompt, c2.prompt);
}

// ===========================================================================
// F10: Temporary Role Decay Tests
// ===========================================================================

#[test]
fn test_role_decay_filters_expired_records() {
    let now = chrono::Utc::now();
    let records = vec![
        TempRoleDecayRecord {
            id: 1,
            guild_id: 100,
            user_id: 200,
            role_id: 300,
            expires_at: now - chrono::Duration::minutes(5),
        },
        TempRoleDecayRecord {
            id: 2,
            guild_id: 100,
            user_id: 201,
            role_id: 300,
            expires_at: now + chrono::Duration::minutes(15),
        },
    ];

    let expired = filter_expired_roles(&records, now);
    assert_eq!(expired.len(), 1);
    assert_eq!(expired[0].id, 1);
}

#[test]
fn test_role_decay_preserves_active_future_records() {
    let now = chrono::Utc::now();
    let records = vec![
        TempRoleDecayRecord {
            id: 10,
            guild_id: 100,
            user_id: 200,
            role_id: 300,
            expires_at: now + chrono::Duration::hours(2),
        },
    ];

    let expired = filter_expired_roles(&records, now);
    assert!(expired.is_empty(), "Future records must not be expired");
}

#[test]
fn test_role_decay_handles_multiple_concurrent_expirations() {
    let now = chrono::Utc::now();
    let records = vec![
        TempRoleDecayRecord {
            id: 1,
            guild_id: 100,
            user_id: 201,
            role_id: 300,
            expires_at: now - chrono::Duration::seconds(10),
        },
        TempRoleDecayRecord {
            id: 2,
            guild_id: 100,
            user_id: 202,
            role_id: 300,
            expires_at: now - chrono::Duration::seconds(30),
        },
        TempRoleDecayRecord {
            id: 3,
            guild_id: 100,
            user_id: 203,
            role_id: 300,
            expires_at: now - chrono::Duration::seconds(60),
        },
    ];

    let expired = filter_expired_roles(&records, now);
    assert_eq!(expired.len(), 3);
}

#[test]
fn test_role_decay_exact_timestamp_boundary_handling() {
    let now = chrono::Utc::now();
    let records = vec![
        TempRoleDecayRecord {
            id: 5,
            guild_id: 100,
            user_id: 205,
            role_id: 300,
            expires_at: now, // Exact instant
        },
    ];

    let expired = filter_expired_roles(&records, now);
    assert_eq!(expired.len(), 1, "Record with expires_at == now must be marked expired");
}

#[test]
fn test_role_decay_empty_records_returns_empty() {
    let now = chrono::Utc::now();
    let expired = filter_expired_roles(&[], now);
    assert!(expired.is_empty());
}
