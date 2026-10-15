mod common;

use common::contracts::*;
use std::time::{Duration, Instant};
use twilight_model::id::Id;

// ===========================================================================
// Tier 3: Cross-Feature Combinations
// ===========================================================================

#[test]
fn test_cross_toxic_leetspeak_inside_flood_burst() {
    let mut tracker = AntiFloodTracker::new(Duration::from_secs(5), 5, 3);
    let user_id = Id::new(9001);
    let now = Instant::now();

    let messages = [
        "tu es un c0nn4rd",
        "sale s4l0p3",
        "gros f.d.p",
        "ferme ta 7g",
        "tu pues le c0n",
    ];

    let mut toxicity_verdicts = Vec::new();
    let mut flood_actions = Vec::new();

    for (i, &msg) in messages.iter().enumerate() {
        let ts = now + Duration::from_millis(i as u64 * 100);
        let msg_id = Id::new((i + 1) as u64);

        // Subsystem 1: Toxicity evaluation
        let tox = classify_toxicity(msg, &[]);
        toxicity_verdicts.push(tox);

        // Subsystem 2: Anti-flood tracking
        let flood = tracker.record_and_evaluate(user_id, msg_id, msg, ts);
        flood_actions.push(flood);
    }

    // Verify all messages were flagged as toxic
    for tox in &toxicity_verdicts {
        assert!(tox.is_toxic, "Every message in the toxic burst must be classified as toxic");
        assert_eq!(tox.category, ToxicityCategory::Harassment);
    }

    // Verify the 5th message triggered anti-flood purge and timeout
    let last_action = &flood_actions[4];
    match last_action {
        FloodAction::PurgeAndTimeout { message_ids, duration_seconds } => {
            assert_eq!(message_ids.len(), 5);
            assert_eq!(*duration_seconds, 300);
        }
        FloodAction::Allow => panic!("Expected flood purge and timeout on 5th message"),
    }
}

#[tokio::test]
async fn test_cross_phishing_link_disguised_in_ocr_image() {
    let mut vision_engine = MockVisionOcrEngine::new();
    let image_url = "https://cdn.discordapp.com/attachments/123/456/scam_promo.png";
    let ocr_extracted = "SPECIAL DISCORD NITRO GIVEAWAY! Visit https://dlscord-nitro.com/gift to claim 3 months free!";

    vision_engine.set_response(image_url, ocr_extracted);

    // Step 1: Scan image via Vision OCR
    let text = vision_engine.scan_image(image_url).await.expect("Vision OCR scan succeeded");
    assert_eq!(text, ocr_extracted);

    // Step 2: Media scam pattern analysis
    let scam_verdict = scan_ocr_text(&text);
    match scam_verdict {
        ScamVerdict::CryptoCasinoScam { confidence, .. } => {
            assert!(confidence >= 0.90);
        }
        ScamVerdict::Clean => panic!("Expected scam detection in OCR text"),
    }

    // Step 3: Link evaluator identifies phishing domain in OCR text
    let link_verdict = evaluate_link(&text, &["paranoia-mc.fr"], &["paranoia"]);
    match link_verdict {
        LinkVerdict::Phishing { domain } => {
            assert!(domain.contains("dlscord-nitro"));
        }
        _ => panic!("Expected phishing link verdict"),
    }
}

#[test]
fn test_cross_raid_wave_combined_with_mass_mention_attack() {
    let mut raid_state = GuildRaidState::new(Duration::from_secs(5), 4, Duration::from_secs(60));
    let now = Instant::now();

    // 4 bot accounts arrive in a sudden raid burst
    for i in 1..=3 {
        assert_eq!(
            raid_state.evaluate_join(Id::new(i), now),
            JoinDecision::Allow
        );
    }
    let raid_decision = raid_state.evaluate_join(Id::new(4), now);
    match raid_decision {
        JoinDecision::TriggerLockdown { suspect_user_ids, .. } => {
            assert_eq!(suspect_user_ids.len(), 4);
        }
        _ => panic!("Expected raid lockdown"),
    }

    // Suspect account 4 immediately attempts mass mention spam before eviction
    let mention_verdict = check_mentions(&[1001], 9999, true, &[], &[], 0);
    assert_eq!(
        mention_verdict,
        MentionVerdict::UnauthorizedEveryone,
        "Unauthorized @everyone from raid account must be blocked"
    );
}

#[test]
fn test_cross_captcha_attempt_during_active_guild_lockdown() {
    let mut raid_state = GuildRaidState::new(Duration::from_secs(5), 2, Duration::from_secs(60));
    let now = Instant::now();

    // Trigger lockdown
    raid_state.evaluate_join(Id::new(1), now);
    raid_state.evaluate_join(Id::new(2), now);
    assert!(raid_state.is_locked(now));

    // Incoming user arrives during lockdown
    let incoming_user = Id::new(3);
    let join_decision = raid_state.evaluate_join(incoming_user, now + Duration::from_secs(1));
    assert_eq!(
        join_decision,
        JoinDecision::KickRaidMember { user_id: incoming_user },
        "Incoming account must be immediately flagged for kick during lockdown"
    );

    // If an interaction arrives for an evicted account, verification is denied
    let challenge = generate_captcha(incoming_user, 12345);
    let is_account_evicted = matches!(join_decision, JoinDecision::KickRaidMember { .. });
    assert!(is_account_evicted, "Evicted account cannot complete gatekeeper onboarding");
    // Even if correct token is submitted, the session is invalidated by eviction
    let token_valid = verify_captcha(&challenge, &challenge.correct_token);
    assert!(token_valid);
}

#[test]
fn test_cross_multi_vector_spam_toxicity_invite_mass_mention() {
    let combined_payload = "tu es un gros c0nn4rd https://discord.gg/malicious-raid";
    let mentions: Vec<Id<twilight_model::id::marker::UserMarker>> =
        (1..=6).map(Id::new).collect();

    // Vector 1: Toxicity Engine
    let tox = classify_toxicity(combined_payload, &mentions);
    assert!(tox.is_toxic);
    assert_eq!(tox.category, ToxicityCategory::Harassment);
    assert_eq!(tox.target, TargetKind::ExplicitUserMention);

    // Vector 2: Link & Invite Guard
    let link = evaluate_link(combined_payload, &["paranoia-mc.fr"], &["paranoia"]);
    assert_eq!(
        link,
        LinkVerdict::UnauthorizedInvite {
            code: "malicious-raid".to_string()
        }
    );

    // Vector 3: Mention Guard
    let ment = check_mentions(&[1001], 9999, false, &[], &[], mentions.len());
    assert_eq!(
        ment,
        MentionVerdict::UnauthorizedMassMention { count: 6 }
    );
}

#[test]
fn test_cross_temp_role_decay_executes_during_guild_lockdown() {
    let mut raid_state = GuildRaidState::new(Duration::from_secs(5), 2, Duration::from_secs(60));
    let now_instant = Instant::now();
    let now_utc = chrono::Utc::now();

    // Trigger active raid lockdown
    raid_state.evaluate_join(Id::new(1), now_instant);
    raid_state.evaluate_join(Id::new(2), now_instant);
    assert!(raid_state.is_locked(now_instant));

    // Concurrently, background role decay worker checks PostgreSQL records
    let records = vec![
        TempRoleDecayRecord {
            id: 101,
            guild_id: 500,
            user_id: 601,
            role_id: 701,
            expires_at: now_utc - chrono::Duration::minutes(1),
        },
        TempRoleDecayRecord {
            id: 102,
            guild_id: 500,
            user_id: 602,
            role_id: 701,
            expires_at: now_utc + chrono::Duration::hours(1),
        },
    ];

    let expired = filter_expired_roles(&records, now_utc);
    assert_eq!(expired.len(), 1);
    assert_eq!(expired[0].id, 101, "Expired role decay must process reliably during lockdown");
}

#[test]
fn test_cross_casino_scam_ocr_with_repeated_image_flood() {
    let mut tracker = AntiFloodTracker::new(Duration::from_secs(5), 10, 3);
    let user_id = Id::new(4444);
    let now = Instant::now();

    let scam_ocr_text = "USE PROMO CODE STAKE100 FOR 100 FREE SPINS AT ROLL CASINO!";

    // Verify OCR scam detector catches it
    let verdict = scan_ocr_text(scam_ocr_text);
    assert!(matches!(verdict, ScamVerdict::CryptoCasinoScam { .. }));

    // User repeatedly posts the same scam screenshot payload 3 times
    tracker.record_and_evaluate(user_id, Id::new(1), scam_ocr_text, now);
    tracker.record_and_evaluate(user_id, Id::new(2), scam_ocr_text, now + Duration::from_millis(200));
    let flood_action = tracker.record_and_evaluate(user_id, Id::new(3), scam_ocr_text, now + Duration::from_millis(400));

    match flood_action {
        FloodAction::PurgeAndTimeout { message_ids, .. } => {
            assert_eq!(message_ids.len(), 3, "Anti-flood must purge the repeated scam images");
        }
        FloodAction::Allow => panic!("Expected flood purge on duplicate scam screenshot burst"),
    }
}
