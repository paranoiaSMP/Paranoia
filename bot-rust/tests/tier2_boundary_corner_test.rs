mod common;

use common::contracts::*;
use std::time::{Duration, Instant};
use twilight_model::id::Id;

// ===========================================================================
// Tier 2: Boundary & Corner Cases
// ===========================================================================

// --- Empty & Minimal Inputs ---

#[test]
fn test_boundary_empty_message_returns_clean_verdict() {
    let verdict = classify_toxicity("", &[]);
    assert_eq!(verdict.category, ToxicityCategory::Clean);
    assert!(!verdict.is_toxic);
    assert_eq!(verdict.score, 0.0);
    assert!(verdict.normalized_text.is_empty());
}

#[test]
fn test_boundary_whitespace_only_message_returns_clean_verdict() {
    let whitespaces = "   \t \n \r \t   ";
    let verdict = classify_toxicity(whitespaces, &[]);
    assert_eq!(verdict.category, ToxicityCategory::Clean);
    assert!(!verdict.is_toxic);
}

#[test]
fn test_boundary_empty_ocr_text_returns_clean_verdict() {
    let empty_ocr = scan_ocr_text("");
    assert_eq!(empty_ocr, ScamVerdict::Clean);

    let ws_ocr = scan_ocr_text("   \n\t  ");
    assert_eq!(ws_ocr, ScamVerdict::Clean);
}

#[test]
fn test_boundary_empty_link_evaluator_returns_allowed() {
    let verdict = evaluate_link("", &["paranoia-mc.fr"], &["paranoia"]);
    assert_eq!(verdict, LinkVerdict::Allowed);
}

// --- Huge & Maximal Payloads ---

#[test]
fn test_boundary_huge_message_2000_chars_classified_safely() {
    // Discord message limit is 2000 characters
    let long_filler = "a ".repeat(990); // 1980 chars
    let huge_content = format!("{} tu es un gros connard", long_filler);
    assert!(huge_content.len() >= 2000);

    let verdict = classify_toxicity(&huge_content, &[]);
    assert!(verdict.is_toxic);
    assert_eq!(verdict.category, ToxicityCategory::Harassment);
}

#[test]
fn test_boundary_huge_ocr_text_5000_chars_processed_without_crash() {
    let mut huge_ocr = "random noise word text log ".repeat(200);
    huge_ocr.push_str(" giveaway claim free btc now ");
    huge_ocr.push_str(&"more random noise ".repeat(50));
    assert!(huge_ocr.len() > 5000);

    let verdict = scan_ocr_text(&huge_ocr);
    match verdict {
        ScamVerdict::CryptoCasinoScam { confidence, .. } => {
            assert!(confidence >= 0.90);
        }
        ScamVerdict::Clean => panic!("Expected crypto scam detection in huge OCR buffer"),
    }
}

#[test]
fn test_boundary_huge_mention_list_evaluated_accurately() {
    let mentions: Vec<Id<twilight_model::id::marker::UserMarker>> =
        (1..=100).map(Id::new).collect();
    let verdict = check_mentions(&[1001], 9999, false, &[], &[], mentions.len());
    assert_eq!(
        verdict,
        MentionVerdict::UnauthorizedMassMention { count: 100 }
    );
}

// --- Unicode Adversarial Stress ---

#[test]
fn test_boundary_zalgo_text_and_excessive_combining_marks() {
    // "connard" corrupted with Zalgo combining marks
    let zalgo = "c\u{0300}\u{0301}\u{0302}o\u{0303}\u{0304}n\u{0305}n\u{0306}a\u{0307}r\u{0308}d\u{0309}";
    let unmasked = unmask_leetspeak(zalgo);
    assert_eq!(unmasked, "connard");

    let verdict = classify_toxicity(zalgo, &[]);
    assert!(verdict.is_toxic);
}

#[test]
fn test_boundary_mixed_script_obfuscation_unmasked() {
    // Mixed Greek ('α' U+03B1, 'ο' U+03BF) and Cyrillic ('с' U+0441)
    let mixed = "с\u{03BF}nn\u{03B1}rd";
    let unmasked = unmask_leetspeak(mixed);
    assert_eq!(unmasked, "connard");
}

#[test]
fn test_boundary_right_to_left_and_control_chars_neutralized() {
    // Embedding zero-width joiners and non-breaking spaces
    let poisoned = "f\u{200D}d\u{200C}p\u{FEFF}";
    let unmasked = unmask_leetspeak(poisoned);
    assert_eq!(unmasked, "fdp");
}

// --- Zero Interval & Max Burst ---

#[test]
fn test_boundary_antiflood_zero_interval_identical_timestamps() {
    let mut tracker = AntiFloodTracker::new(Duration::from_secs(5), 4, 3);
    let user_id = Id::new(777);
    let exact_instant = Instant::now();

    // 4 messages arriving at the exact same sub-microsecond instant
    tracker.record_and_evaluate(user_id, Id::new(1), "msg 1", exact_instant);
    tracker.record_and_evaluate(user_id, Id::new(2), "msg 2", exact_instant);
    tracker.record_and_evaluate(user_id, Id::new(3), "msg 3", exact_instant);
    let action = tracker.record_and_evaluate(user_id, Id::new(4), "msg 4", exact_instant);

    match action {
        FloodAction::PurgeAndTimeout { message_ids, .. } => {
            assert_eq!(message_ids.len(), 4);
        }
        FloodAction::Allow => panic!("Expected instant zero-interval burst timeout"),
    }
}

#[test]
fn test_boundary_antiraid_zero_interval_simultaneous_joins() {
    let mut raid_state = GuildRaidState::new(Duration::from_secs(5), 5, Duration::from_secs(60));
    let exact_instant = Instant::now();

    for i in 1..=4 {
        raid_state.evaluate_join(Id::new(i), exact_instant);
    }

    let decision = raid_state.evaluate_join(Id::new(5), exact_instant);
    match decision {
        JoinDecision::TriggerLockdown { suspect_user_ids, .. } => {
            assert_eq!(suspect_user_ids.len(), 5);
        }
        _ => panic!("Expected simultaneous arrival lockdown"),
    }
}

#[test]
fn test_boundary_max_burst_50_messages_under_10ms_purged() {
    let mut tracker = AntiFloodTracker::new(Duration::from_secs(5), 5, 3);
    let user_id = Id::new(888);
    let start = Instant::now();

    let mut actions = Vec::new();
    for i in 1..=50 {
        let ts = start + Duration::from_micros(i * 100);
        let action = tracker.record_and_evaluate(user_id, Id::new(i), &format!("spam {}", i), ts);
        actions.push(action);
    }

    // Message 5 must have triggered purge
    let purge_events = actions.iter().filter(|a| matches!(a, FloodAction::PurgeAndTimeout { .. })).count();
    assert!(purge_events >= 1, "Must have triggered at least one purge action during 50-message burst");
}

// --- Temporal Extremes ---

#[test]
fn test_boundary_role_decay_epoch_zero_and_distant_future() {
    let now = chrono::Utc::now();
    let epoch_zero = chrono::DateTime::from_timestamp(0, 0).unwrap();
    let year_3000 = chrono::DateTime::from_timestamp(32503680000, 0).unwrap();

    let records = vec![
        TempRoleDecayRecord {
            id: 1,
            guild_id: 10,
            user_id: 20,
            role_id: 30,
            expires_at: epoch_zero,
        },
        TempRoleDecayRecord {
            id: 2,
            guild_id: 10,
            user_id: 21,
            role_id: 30,
            expires_at: year_3000,
        },
    ];

    let expired = filter_expired_roles(&records, now);
    assert_eq!(expired.len(), 1);
    assert_eq!(expired[0].id, 1);
}

#[test]
fn test_boundary_antiraid_distant_past_timestamps_evicted() {
    let mut raid_state = GuildRaidState::new(Duration::from_secs(5), 3, Duration::from_secs(60));
    let now = Instant::now();
    let past = now - Duration::from_secs(3600); // 1 hour ago

    raid_state.evaluate_join(Id::new(1), past);
    raid_state.evaluate_join(Id::new(2), past);

    // Current joins should not trip the threshold because past joins are evicted
    let decision = raid_state.evaluate_join(Id::new(3), now);
    assert_eq!(decision, JoinDecision::Allow);
}
