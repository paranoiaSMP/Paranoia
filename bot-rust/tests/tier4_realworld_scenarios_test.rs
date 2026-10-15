mod common;

use common::contracts::*;
use std::time::{Duration, Instant};
use twilight_model::id::Id;

// ===========================================================================
// Tier 4: Real-World Application Scenarios
// ===========================================================================

/// Scenario 1: Automated Raid Wave Simulation
/// 50 bot accounts join in rapid succession (within 2.5s).
/// Verifies that:
/// - First 9 joins are tracked under the threshold.
/// - 10th join trips the velocity threshold, triggering guild lockdown.
/// - Suspect accounts from the burst wave (1..=10) are collected for bulk kick.
/// - All subsequent accounts (11..=50) are immediately kicked upon entry.
#[test]
fn test_scenario_simulated_raid_wave_50_bots() {
    let window = Duration::from_secs(5);
    let burst_threshold = 10;
    let lockdown_duration = Duration::from_secs(300);
    let mut raid_state = GuildRaidState::new(window, burst_threshold, lockdown_duration);

    let start_time = Instant::now();
    let mut suspect_accounts_evicted = Vec::new();
    let mut post_lockdown_accounts_kicked = Vec::new();

    for i in 1..=50 {
        let arrival_time = start_time + Duration::from_millis((i * 50) as u64); // 50ms spacing
        let user_id = Id::new(i as u64);

        let decision = raid_state.evaluate_join(user_id, arrival_time);
        match decision {
            JoinDecision::Allow => {
                assert!(i < 10, "Only the first 9 joins before threshold may be allowed");
            }
            JoinDecision::TriggerLockdown { suspect_user_ids, reason } => {
                assert_eq!(i, 10, "10th join must trigger lockdown");
                assert_eq!(suspect_user_ids.len(), 10, "All 10 burst accounts must be captured");
                assert!(reason.contains("Join-velocity raid detected"));
                suspect_accounts_evicted.extend(suspect_user_ids);
            }
            JoinDecision::KickRaidMember { user_id: kicked } => {
                assert!(i > 10, "Only arrivals after lockdown trigger receive immediate kick");
                post_lockdown_accounts_kicked.push(kicked);
            }
        }
    }

    assert_eq!(suspect_accounts_evicted.len(), 10);
    assert_eq!(post_lockdown_accounts_kicked.len(), 40);
    assert!(raid_state.is_locked(start_time + Duration::from_secs(3)), "Guild must remain locked down");
}

/// Scenario 2: Simulated Scam Bot Influx
/// Coordinated campaign attempting multiple distinct scam attack vectors.
/// Verifies each scam vector is intercepted with high confidence:
/// - Vector A: Image attachment with crypto giveaway text
/// - Vector B: Phishing link typosquatting Discord Nitro
/// - Vector C: Casino promo code image screenshot
/// - Vector D: Foreign unauthorized server invite
#[tokio::test]
async fn test_scenario_simulated_scam_bot_wave() {
    let mut vision = MockVisionOcrEngine::new();

    let crypto_img = "https://cdn.paranoia-smp.gg/scam/crypto_wave.png";
    let crypto_ocr = "EXCLUSIVE GIVEAWAY: Claim 0.5 BTC instantly! Unauthorized withdrawal protection event.";
    vision.set_response(crypto_img, crypto_ocr);

    let casino_img = "https://cdn.paranoia-smp.gg/scam/casino_promo.png";
    let casino_ocr = "USE BONUS PROMO CODE STAKE100 FOR 100 FREE SPINS AND CASINO DEPOSIT MATCH!";
    vision.set_response(casino_img, casino_ocr);

    // Vector A: Crypto Scam OCR
    let text_a = vision.scan_image(crypto_img).await.unwrap();
    let verdict_a = scan_ocr_text(&text_a);
    match verdict_a {
        ScamVerdict::CryptoCasinoScam { confidence, reason } => {
            assert!(confidence >= 0.90);
            assert!(reason.contains("cryptocurrency"));
        }
        ScamVerdict::Clean => panic!("Vector A crypto scam must be detected"),
    }

    // Vector B: Discord Nitro Phishing Link
    let msg_b = "Hey @everyone claim your free nitro: https://dlscord-nitro.com/gift-event";
    let verdict_b = evaluate_link(msg_b, &["paranoia-mc.fr"], &["paranoia"]);
    match verdict_b {
        LinkVerdict::Phishing { domain } => {
            assert!(domain.contains("dlscord-nitro"));
        }
        _ => panic!("Vector B phishing URL must be intercepted"),
    }

    // Vector C: Casino Promo Code OCR
    let text_c = vision.scan_image(casino_img).await.unwrap();
    let verdict_c = scan_ocr_text(&text_c);
    match verdict_c {
        ScamVerdict::CryptoCasinoScam { confidence, reason } => {
            assert!(confidence >= 0.90);
            assert!(reason.contains("casino"));
        }
        ScamVerdict::Clean => panic!("Vector C casino promo scam must be detected"),
    }

    // Vector D: Unauthorized Discord Invite
    let msg_d = "Join our secondary raid community! https://discord.gg/unauthorized-raid-gang";
    let verdict_d = evaluate_link(msg_d, &["paranoia-mc.fr"], &["paranoia"]);
    assert_eq!(
        verdict_d,
        LinkVerdict::UnauthorizedInvite {
            code: "unauthorized-raid-gang".to_string()
        }
    );
}

/// Scenario 3: False Positive Immunity for Legitimate Gaming Chat
/// Real Minecraft SMP player conversations containing gaming frustration, friendly PvP banter,
/// official links, and normal peer mentions.
/// Verifies ZERO false positive sanctions across all normal community interactions.
#[test]
fn test_scenario_legitimate_gaming_chat_false_positive_immunity() {
    let allowed_domains = ["paranoia-mc.fr", "youtube.com", "twitch.tv", "minecraft.net"];
    let allowed_invites = ["paranoia"];

    // Case 1: Gamer venting after dying to a mob in lava
    let death_rant = "fait chier ce squelette de merde, il m'a poussé dans la lave et j'ai perdu ma pioche !";
    let tox_1 = classify_toxicity(death_rant, &[]);
    assert!(!tox_1.is_toxic, "Mob death frustration must not be sanctioned");
    assert_eq!(tox_1.category, ToxicityCategory::GamingFrustration);
    assert_eq!(tox_1.target, TargetKind::GameObject);

    // Case 2: Playful PvP banter with teammate
    let pvp_banter = "t'es trop nul bro mdr gg 😂";
    let tox_2 = classify_toxicity(pvp_banter, &[]);
    assert!(!tox_2.is_toxic, "Friendly banter with laughter tokens must not be sanctioned");
    assert_eq!(tox_2.category, ToxicityCategory::FriendlyBanter);

    // Case 3: Legitimate links to server wiki and YouTube video
    let guide_link = "Le tuto pour la ferme à or est sur https://paranoia-mc.fr/wiki et https://youtube.com/watch?v=goldfarm";
    let link_verdict = evaluate_link(guide_link, &allowed_domains, &allowed_invites);
    assert_eq!(link_verdict, LinkVerdict::Allowed, "Whitelisted guide links must be allowed");

    // Case 4: Asking a question with 2 staff mentions
    let staff_role_id = 9999;
    let peer_pings = check_mentions(&[1001], staff_role_id, false, &[], &[8888], 2);
    assert_eq!(peer_pings, MentionVerdict::Allow, "Reasonable peer mentions must be allowed");

    // Case 5: Normal chat coordination
    let coords = "Qui est chaud pour explorer le Nether ? Je suis aux coordonnées X: 450 Z: -120";
    let tox_5 = classify_toxicity(coords, &[]);
    assert_eq!(tox_5.category, ToxicityCategory::Clean);
    assert_eq!(tox_5.score, 0.0);
}

/// Scenario 4: Legitimate Member Onboarding Under Traffic
/// A new member joins the server while active chat and background workers run:
/// - Receives gatekeeper button captcha challenge.
/// - Correctly solves the challenge by clicking the matching token.
/// - Receives verified access and temporary decay role (`@Nouveau`).
/// - Later, when the temporary role expires, decay worker identifies it for removal.
#[test]
fn test_scenario_legitimate_onboarding_under_high_traffic() {
    let new_user = Id::new(77001);

    // Step 1: Generate interactive captcha
    let challenge = generate_captcha(new_user, 98765);
    assert!(challenge.prompt.contains("Cliquez sur"));
    assert!(challenge.options.iter().any(|(_, t)| t == &challenge.correct_token));

    // Step 2: User clicks the correct option button
    let verified = verify_captcha(&challenge, &challenge.correct_token);
    assert!(verified, "Valid button captcha response must grant verification");

    // Step 3: Temporary decay role (@Nouveau) recorded in database
    let now = chrono::Utc::now();
    let temp_role = TempRoleDecayRecord {
        id: 501,
        guild_id: 1516106532759273612,
        user_id: 77001,
        role_id: 1516106532784177317,
        expires_at: now + chrono::Duration::days(7), // 7-day probation role
    };

    // Step 4: Background decay worker evaluates records at day 0 (not expired)
    let expired_immediate = filter_expired_roles(&[temp_role.clone()], now);
    assert!(expired_immediate.is_empty(), "Role must remain active during probation");

    // Step 5: Background decay worker evaluates records at day 8 (expired)
    let future_8d = now + chrono::Duration::days(8);
    let expired_after_probation = filter_expired_roles(&[temp_role], future_8d);
    assert_eq!(expired_after_probation.len(), 1);
    assert_eq!(expired_after_probation[0].user_id, 77001);
}

/// Scenario 5: Moderator Investigation via /test_message Diagnostics
/// A moderator uses `/test_message` to evaluate reported messages in the channel:
/// - Verifies ephemeral response flag is true (diagnostics visible only to moderator).
/// - Verifies sanctions_applied is false (no mute/ban/delete triggered).
/// - Verifies unmasked text and confidence scores assist moderation decisions.
#[test]
fn test_scenario_moderator_investigation_with_test_message() {
    // Moderator inspects an obfuscated bypass insult
    let diag_harassment = test_message_diagnostics("v.a t.e f.a.i.r.e e.n.c.u.l.e", &[]);
    assert!(diag_harassment.ephemeral);
    assert!(!diag_harassment.sanctions_applied);
    assert!(diag_harassment.verdict.is_toxic);
    assert!(diag_harassment.verdict.normalized_text.contains("encule"));
    assert_eq!(diag_harassment.verdict.category, ToxicityCategory::Harassment);

    // Moderator inspects a reported gaming rant
    let diag_frustration = test_message_diagnostics("merde j'ai glitché dans le mur du boss", &[]);
    assert!(diag_frustration.ephemeral);
    assert!(!diag_frustration.sanctions_applied);
    assert!(!diag_frustration.verdict.is_toxic);
    assert_eq!(diag_frustration.verdict.category, ToxicityCategory::GamingFrustration);

    // Moderator inspects normal message
    let diag_clean = test_message_diagnostics("Bienvenue sur le serveur Paranoia SMP !", &[]);
    assert_eq!(diag_clean.verdict.category, ToxicityCategory::Clean);
    assert!(!diag_clean.verdict.is_toxic);
}
