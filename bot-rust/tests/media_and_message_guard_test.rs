#[path = "../src/utils/mod.rs"]
pub mod utils;

#[path = "../src/modules/automod/mod.rs"]
pub mod automod;

use std::time::{Duration, Instant};
use twilight_model::id::Id;

use automod::{
    check_mentions, evaluate_link, extract_urls, scan_ocr_text, AntiFloodTracker, FloodAction,
    LinkVerdict, MentionVerdict, MockVisionOcrEngine, ScamVerdict, VisionOcrEngine,
    DEFAULT_ALLOWED_DOMAINS,
};

// ===========================================================================
// 1. OCR & Media Scam Detection Tests
// ===========================================================================

#[tokio::test]
async fn test_mock_vision_ocr_engine_registration_and_lookup() {
    let mut vision = MockVisionOcrEngine::new();
    let img_a = "https://cdn.discordapp.com/attachments/100/101/screen_a.png";
    let img_b = "https://cdn.discordapp.com/attachments/100/102/screen_b.png";

    vision.set_response(img_a, "GIVEAWAY 500 BTC CLAIM NOW");
    vision.set_response(img_b, "Paranoia SMP Season 3 Coordinates: X 100 Y 64 Z -200");

    let text_a = vision.scan_image(img_a).await.expect("Scan A succeeds");
    let text_b = vision.scan_image(img_b).await.expect("Scan B succeeds");
    let text_unknown = vision
        .scan_image("https://cdn.discordapp.com/unknown.png")
        .await
        .expect("Unknown scan succeeds");

    assert_eq!(text_a, "GIVEAWAY 500 BTC CLAIM NOW");
    assert_eq!(text_b, "Paranoia SMP Season 3 Coordinates: X 100 Y 64 Z -200");
    assert_eq!(text_unknown, "");
}

#[test]
fn test_ocr_scam_detection_crypto_variants() {
    let crypto_scams = [
        "OFFICIAL GIVEAWAY! Elon Musk 100 BTC Giveaway, claim 0.5 BTC now!",
        "Security Alert: Unauthorized withdrawal of 2.45 BTC detected. Confirm cancellation immediately.",
        "Binance Crypto Airdrop! Claim your free 1000 USDT bonus voucher today!",
        "Send 0.1 BTC to this wallet and get 1.0 BTC back instantly! Official event.",
        "Ethereum Foundation Airdrop: Claim 1.5 ETH free token distribution.",
    ];

    for scam_text in crypto_scams {
        let verdict = scan_ocr_text(scam_text);
        match verdict {
            ScamVerdict::CryptoCasinoScam { confidence, reason } => {
                assert!(
                    confidence >= 0.90,
                    "Expected high confidence for crypto scam: '{}'",
                    scam_text
                );
                assert!(
                    reason.contains("cryptocurrency") || reason.contains("giveaway"),
                    "Expected cryptocurrency reason for: '{}', got '{}'",
                    scam_text,
                    reason
                );
            }
            ScamVerdict::Clean => {
                panic!("Expected crypto scam detection for: '{}'", scam_text);
            }
        }
    }
}

#[test]
fn test_ocr_scam_detection_casino_and_gambling() {
    let casino_scams = [
        "Use promo code STAKE100 for 100 free spins and deposit match on roll casino!",
        "Exclusive VIP Promo Code: ROOBET50! Claim $50 free deposit bonus and spins!",
        "USE BONUS CODE ROLLBIT TO UNLOCK 200 FREE SPINS AND CASINO DEPOSIT MATCH!",
    ];

    for scam_text in casino_scams {
        let verdict = scan_ocr_text(scam_text);
        match verdict {
            ScamVerdict::CryptoCasinoScam { confidence, reason } => {
                assert!(
                    confidence >= 0.90,
                    "Expected high confidence for casino scam: '{}'",
                    scam_text
                );
                assert!(
                    reason.contains("casino"),
                    "Expected casino reason for: '{}', got '{}'",
                    scam_text,
                    reason
                );
            }
            ScamVerdict::Clean => {
                panic!("Expected casino scam detection for: '{}'", scam_text);
            }
        }
    }
}

#[test]
fn test_ocr_scam_detection_fake_discord_nitro() {
    let nitro_scams = [
        "Discord Nitro Gift! Claim 3 months free discord nitro now!",
        "SPECIAL DISCORD NITRO GIVEAWAY! Free nitro generator claim event!",
        "Claim your 1 month free Discord Nitro gift subscription before time runs out!",
    ];

    for scam_text in nitro_scams {
        let verdict = scan_ocr_text(scam_text);
        match verdict {
            ScamVerdict::CryptoCasinoScam { confidence, reason } => {
                assert!(
                    confidence >= 0.90,
                    "Expected high confidence for nitro scam: '{}'",
                    scam_text
                );
                assert!(
                    reason.contains("Nitro"),
                    "Expected Nitro reason for: '{}', got '{}'",
                    scam_text,
                    reason
                );
            }
            ScamVerdict::Clean => {
                panic!("Expected fake nitro scam detection for: '{}'", scam_text);
            }
        }
    }
}

#[test]
fn test_ocr_clean_gaming_media_allowed() {
    let legitimate_texts = [
        "Paranoia SMP Season 3 - Player Stats: 120 Kills, 4 Deaths, 15 Quests Completed",
        "Base build progress: automated pumpkin farm and nether portal room finished.",
        "F3 Coordinates: XYZ: 1420.500 / 64.000 / -850.320 Block: 1420 64 -851 Chunk: 12 4 10",
        "",
        "   \n\t   ",
    ];

    for text in legitimate_texts {
        let verdict = scan_ocr_text(text);
        assert_eq!(
            verdict,
            ScamVerdict::Clean,
            "Expected Clean verdict for legitimate text: '{}'",
            text
        );
    }
}

#[test]
fn test_ocr_scam_detection_huge_payload_without_crash() {
    let mut huge_payload = "Minecraft SMP Server logs and player chat line ".repeat(150);
    huge_payload.push_str(" OFFICIAL GIVEAWAY claim 0.5 BTC instantly! ");
    huge_payload.push_str(&"Additional chat logs ".repeat(50));
    assert!(huge_payload.len() > 5000);

    let verdict = scan_ocr_text(&huge_payload);
    match verdict {
        ScamVerdict::CryptoCasinoScam { confidence, .. } => {
            assert!(confidence >= 0.90);
        }
        ScamVerdict::Clean => panic!("Expected scam detection in huge payload"),
    }
}

// ===========================================================================
// 2. Phishing & Unauthorized Invite Interceptor Tests
// ===========================================================================

#[test]
fn test_link_filter_legitimate_domains_allowed() {
    let allowed_cases = [
        "Rejoignez le serveur vocal ou visitez https://paranoia-mc.fr/forum pour candidater.",
        "Tutoriel vidéo disponible ici: https://youtube.com/watch?v=123456",
        "Code source du bot: https://github.com/paranoia-smp/bot-rust",
        "Stream en direct ce soir: https://twitch.tv/paranoia_live",
        "Pas de lien ici, juste un message ordinaire dans le chat général.",
    ];

    for msg in allowed_cases {
        let verdict = evaluate_link(msg, DEFAULT_ALLOWED_DOMAINS, &["paranoia"]);
        assert_eq!(
            verdict,
            LinkVerdict::Allowed,
            "Expected Allowed for legitimate message: '{}'",
            msg
        );
    }
}

#[test]
fn test_link_filter_whitelisted_and_unauthorized_invites() {
    // Whitelisted official invite
    let official = "Serveur Discord officiel de Paranoia: https://discord.gg/paranoia";
    assert_eq!(
        evaluate_link(official, DEFAULT_ALLOWED_DOMAINS, &["paranoia"]),
        LinkVerdict::Allowed
    );

    // Case-insensitive whitelisted invite
    let official_caps = "Rejoignez: https://discord.gg/PARANOIA";
    assert_eq!(
        evaluate_link(official_caps, DEFAULT_ALLOWED_DOMAINS, &["paranoia"]),
        LinkVerdict::Allowed
    );

    // Foreign unauthorized invite
    let unauthorized = "Rejoignez plutôt notre serveur faction: https://discord.gg/rival-faction-99";
    assert_eq!(
        evaluate_link(unauthorized, DEFAULT_ALLOWED_DOMAINS, &["paranoia"]),
        LinkVerdict::UnauthorizedInvite {
            code: "rival-faction-99".to_string()
        }
    );

    // Full discord.com/invite domain
    let unauthorized_full = "Venez ici: https://discord.com/invite/malicious-raid";
    assert_eq!(
        evaluate_link(unauthorized_full, DEFAULT_ALLOWED_DOMAINS, &["paranoia"]),
        LinkVerdict::UnauthorizedInvite {
            code: "malicious-raid".to_string()
        }
    );
}

#[test]
fn test_link_filter_phishing_typosquats_detected() {
    let phishing_cases = [
        ("https://dlscord-nitro.com/gift-promo", "dlscord-nitro"),
        ("https://steamcomminuty.com/tradeoffer/new", "steamcomminuty"),
        ("https://paranoia-free-coins.xyz/login", "paranoia-free-coins"),
        ("https://free-nitro.net/claim", "free-nitro"),
        ("https://nitro-drop.com/reward", "nitro-drop"),
        ("https://gift-discord.com/nitro", "gift-discord"),
        ("https://steancommunity.com/id/trade", "steancommunity"),
    ];

    for (url, expected_domain_match) in phishing_cases {
        let content = format!("Clique ici pour ton cadeau: {}", url);
        let verdict = evaluate_link(&content, DEFAULT_ALLOWED_DOMAINS, &["paranoia"]);
        match verdict {
            LinkVerdict::Phishing { domain } => {
                assert!(
                    domain.contains(expected_domain_match),
                    "Expected domain to contain '{}', got '{}'",
                    expected_domain_match,
                    domain
                );
            }
            other => {
                panic!("Expected Phishing for url '{}', got {:?}", url, other);
            }
        }
    }
}

#[test]
fn test_extract_urls_utility() {
    let text = "Visitez https://paranoia-mc.fr et https://discord.gg/paranoia pour les infos.";
    let urls = extract_urls(text);
    assert_eq!(urls.len(), 2);
    assert!(urls[0].contains("paranoia-mc.fr"));
    assert!(urls[1].contains("discord.gg/paranoia"));
}

// ===========================================================================
// 3. Anti-Unauthorized Mentions Guard Tests
// ===========================================================================

#[test]
fn test_mentions_guard_everyone_and_here() {
    let staff_role = 9999;
    let regular_roles = [1001, 1002];

    // Unauthorized non-staff user attempts @everyone
    let verdict = check_mentions(&regular_roles, staff_role, true, &[], &[], 0);
    assert_eq!(verdict, MentionVerdict::UnauthorizedEveryone);

    // Staff member mentioning @everyone allowed
    let staff_verdict = check_mentions(&[staff_role], staff_role, true, &[], &[], 0);
    assert_eq!(staff_verdict, MentionVerdict::Allow);
}

#[test]
fn test_mentions_guard_protected_staff_roles() {
    let staff_role = 9999;
    let videaste_role = 8888;
    let regular_roles = [1001];
    let protected_roles = [staff_role, videaste_role];

    // Regular user mentions staff role
    let verdict_staff = check_mentions(&regular_roles, staff_role, false, &[staff_role], &protected_roles, 1);
    assert_eq!(
        verdict_staff,
        MentionVerdict::UnauthorizedProtectedRole {
            role_id: staff_role
        }
    );

    // Regular user mentions videaste role
    let verdict_vid = check_mentions(&regular_roles, staff_role, false, &[videaste_role], &protected_roles, 1);
    assert_eq!(
        verdict_vid,
        MentionVerdict::UnauthorizedProtectedRole {
            role_id: videaste_role
        }
    );

    // Regular user mentions unprotected player role
    let player_role = 2001;
    let verdict_allowed = check_mentions(&regular_roles, staff_role, false, &[player_role], &protected_roles, 1);
    assert_eq!(verdict_allowed, MentionVerdict::Allow);
}

#[test]
fn test_mentions_guard_mass_mention_threshold() {
    let staff_role = 9999;
    let regular_roles = [1001];

    // Exactly 4 mentions is within threshold
    assert_eq!(
        check_mentions(&regular_roles, staff_role, false, &[], &[], 4),
        MentionVerdict::Allow
    );

    // 5 mentions exceeds threshold of 4
    assert_eq!(
        check_mentions(&regular_roles, staff_role, false, &[], &[], 5),
        MentionVerdict::UnauthorizedMassMention { count: 5 }
    );

    // Staff member sending 10 mentions is allowed
    assert_eq!(
        check_mentions(&[staff_role], staff_role, false, &[], &[], 10),
        MentionVerdict::Allow
    );
}

// ===========================================================================
// 4. Sliding-Window Burst Anti-Flood Tests
// ===========================================================================

#[test]
fn test_flood_normal_chat_pacing_allowed() {
    let mut tracker = AntiFloodTracker::new(Duration::from_secs(5), 5, 3);
    let user_id = Id::new(101);
    let now = Instant::now();

    for i in 1..=3 {
        let ts = now + Duration::from_secs(i);
        let action = tracker.record_and_evaluate(user_id, Id::new(i as u64), &format!("chat {}", i), ts);
        assert_eq!(action, FloodAction::Allow);
    }
}

#[test]
fn test_flood_burst_velocity_purges_and_timeouts() {
    let mut tracker = AntiFloodTracker::new(Duration::from_secs(5), 5, 3);
    let user_id = Id::new(102);
    let now = Instant::now();

    for i in 1..=4 {
        let action = tracker.record_and_evaluate(user_id, Id::new(i), &format!("msg {}", i), now);
        assert_eq!(action, FloodAction::Allow);
    }

    // 5th message breaches burst threshold of 5
    let action_5 = tracker.record_and_evaluate(user_id, Id::new(5), "msg 5", now);
    match action_5 {
        FloodAction::PurgeAndTimeout {
            message_ids,
            duration_seconds,
        } => {
            assert_eq!(message_ids.len(), 5);
            assert_eq!(duration_seconds, 300);
            assert_eq!(message_ids, vec![Id::new(1), Id::new(2), Id::new(3), Id::new(4), Id::new(5)]);
        }
        FloodAction::Allow => panic!("Expected flood purge and timeout on 5th message"),
    }

    // 6th message after purge starts fresh window
    let action_6 = tracker.record_and_evaluate(user_id, Id::new(6), "msg 6", now);
    assert_eq!(action_6, FloodAction::Allow);
}

#[test]
fn test_flood_duplicate_message_repetition_purges() {
    let mut tracker = AntiFloodTracker::new(Duration::from_secs(10), 10, 3);
    let user_id = Id::new(103);
    let now = Instant::now();

    assert_eq!(
        tracker.record_and_evaluate(user_id, Id::new(1), "spam repeat", now),
        FloodAction::Allow
    );
    assert_eq!(
        tracker.record_and_evaluate(user_id, Id::new(2), "SPAM REPEAT   ", now + Duration::from_millis(500)),
        FloodAction::Allow
    );

    // 3rd repetition (case and whitespace normalized) triggers purge
    let action_3 = tracker.record_and_evaluate(user_id, Id::new(3), "  spam repeat", now + Duration::from_secs(1));
    match action_3 {
        FloodAction::PurgeAndTimeout { message_ids, duration_seconds } => {
            assert_eq!(message_ids.len(), 3);
            assert_eq!(duration_seconds, 300);
        }
        FloodAction::Allow => panic!("Expected duplicate repetition flood trigger"),
    }
}

#[test]
fn test_flood_sliding_window_expiration() {
    let mut tracker = AntiFloodTracker::new(Duration::from_secs(3), 4, 3);
    let user_id = Id::new(104);
    let now = Instant::now();

    // 3 messages at t=0
    tracker.record_and_evaluate(user_id, Id::new(1), "a", now);
    tracker.record_and_evaluate(user_id, Id::new(2), "b", now);
    tracker.record_and_evaluate(user_id, Id::new(3), "c", now);

    // Jump 4 seconds forward (window is 3s)
    let future = now + Duration::from_secs(4);
    let action = tracker.record_and_evaluate(user_id, Id::new(4), "d", future);
    assert_eq!(
        action,
        FloodAction::Allow,
        "Messages older than 3s sliding window must be expired"
    );
}

#[test]
fn test_flood_user_isolation() {
    let mut tracker = AntiFloodTracker::new(Duration::from_secs(5), 4, 3);
    let user_a = Id::new(201);
    let user_b = Id::new(202);
    let now = Instant::now();

    for i in 1..=3 {
        tracker.record_and_evaluate(user_a, Id::new(i), "flood a", now);
    }

    // User B sends their first message — must not be affected by User A
    let action_b = tracker.record_and_evaluate(user_b, Id::new(99), "hello from b", now);
    assert_eq!(action_b, FloodAction::Allow);
}

// ===========================================================================
// 5. Cross-Feature Integration Tests
// ===========================================================================

#[tokio::test]
async fn test_cross_image_ocr_with_embedded_phishing_link() {
    let mut vision = MockVisionOcrEngine::new();
    let url = "https://cdn.discordapp.com/attachments/555/666/screenshot.png";
    let extracted = "CONGRATULATIONS! Claim your 1000 USDT bonus at https://dlscord-nitro.com/gift now!";
    vision.set_response(url, extracted);

    let text = vision.scan_image(url).await.unwrap();

    // OCR scam classification
    let scam = scan_ocr_text(&text);
    match scam {
        ScamVerdict::CryptoCasinoScam { confidence, .. } => {
            assert!(confidence >= 0.90);
        }
        ScamVerdict::Clean => panic!("Expected crypto scam verdict"),
    }

    // Link evaluator recognizes the disguised phishing URL inside OCR text
    let link = evaluate_link(&text, DEFAULT_ALLOWED_DOMAINS, &["paranoia"]);
    match link {
        LinkVerdict::Phishing { domain } => {
            assert!(domain.contains("dlscord-nitro"));
        }
        _ => panic!("Expected phishing verdict from OCR text"),
    }
}

// ===========================================================================
// 6. Milestone 2 Iteration 2 Remediation Regression Tests
// ===========================================================================

#[test]
fn test_multi_invite_smuggling_intercepted() {
    let smuggled = "Join official server https://discord.gg/paranoia or visit raid https://discord.gg/evil-raid!";
    let verdict = evaluate_link(smuggled, DEFAULT_ALLOWED_DOMAINS, &["paranoia"]);
    assert_eq!(
        verdict,
        LinkVerdict::UnauthorizedInvite {
            code: "evil-raid".to_string()
        },
        "Must intercept unauthorized invite even when preceded by allowed invite"
    );
}

#[test]
fn test_minecraft_vocabulary_scam_immunity() {
    let minecraft_messages = [
        "Claim free Netherite at spawn",
        "Send coordinates together",
        "Check server console",
        "Our faction Netherite armor set is ready",
        "Selling 10 Netherite ingots for 20 diamonds",
    ];

    for msg in minecraft_messages {
        let verdict = scan_ocr_text(msg);
        assert_eq!(
            verdict,
            ScamVerdict::Clean,
            "Standard Minecraft message '{}' must never trigger crypto scam verdict",
            msg
        );
    }
}

#[test]
fn test_trailing_dot_and_double_slash_invites_intercepted() {
    let trailing_dot = "https://discord.gg./evil-raid";
    assert_eq!(
        evaluate_link(trailing_dot, DEFAULT_ALLOWED_DOMAINS, &["paranoia"]),
        LinkVerdict::UnauthorizedInvite {
            code: "evil-raid".to_string()
        }
    );

    let double_slash = "https://discord.gg//evil-raid";
    assert_eq!(
        evaluate_link(double_slash, DEFAULT_ALLOWED_DOMAINS, &["paranoia"]),
        LinkVerdict::UnauthorizedInvite {
            code: "evil-raid".to_string()
        }
    );
}

#[test]
fn test_whitelisted_discord_shortcuts_allowed() {
    let me = "https://discord.me/paranoia";
    assert_eq!(
        evaluate_link(me, DEFAULT_ALLOWED_DOMAINS, &["paranoia"]),
        LinkVerdict::Allowed
    );

    let io = "https://discord.io/paranoia";
    assert_eq!(
        evaluate_link(io, DEFAULT_ALLOWED_DOMAINS, &["paranoia"]),
        LinkVerdict::Allowed
    );
}

#[test]
fn test_unicode_lookalike_evasions_intercepted() {
    let cyrillic_nitro = "https://d\u{0456}scord-nitro.com/gift";
    match evaluate_link(cyrillic_nitro, DEFAULT_ALLOWED_DOMAINS, &["paranoia"]) {
        LinkVerdict::Phishing { domain } => {
            assert!(domain.contains("discord-nitro"));
        }
        other => panic!("Expected phishing, got {:?}", other),
    }

    let cyrillic_invite = "https://d\u{0456}scord.gg/evil-raid";
    assert_eq!(
        evaluate_link(cyrillic_invite, DEFAULT_ALLOWED_DOMAINS, &["paranoia"]),
        LinkVerdict::UnauthorizedInvite {
            code: "evil-raid".to_string()
        }
    );
}

#[test]
fn test_real_world_withdrawal_prompts_detected() {
    let withdrawal_scams = [
        "Unauthorised withdrawal of 2.50 BTC detected. Cancel transaction here.",
        "Withdrawal confirmation required: 2.5 BTC pending transfer. Click link to confirm or cancel.",
        "Unauthorized withdraw of 1.50 ETH initiated from your account.",
        "Withdrawal request of 5000 USDT completed. If you did not initiate this, report now.",
    ];

    for scam in withdrawal_scams {
        match scan_ocr_text(scam) {
            ScamVerdict::CryptoCasinoScam { confidence, reason } => {
                assert!(confidence >= 0.90);
                assert!(!reason.is_empty());
            }
            ScamVerdict::Clean => panic!("Expected crypto withdrawal scam detection for: '{}'", scam),
        }
    }
}

#[test]
fn test_delimited_promo_codes_detected() {
    let promo_scams = [
        "Use promo-code: LUCKY777 on our casino!",
        "Use bonus_code ROLLBIT for 100 free spins and casino deposit match!",
        "Voucher-code STAKE100 gives 50 free spins in casino!",
    ];

    for scam in promo_scams {
        match scan_ocr_text(scam) {
            ScamVerdict::CryptoCasinoScam { confidence, reason } => {
                assert!(confidence >= 0.90);
                assert!(reason.contains("casino"));
            }
            ScamVerdict::Clean => panic!("Expected casino promo code detection for: '{}'", scam),
        }
    }
}
