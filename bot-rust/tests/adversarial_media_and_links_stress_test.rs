#[path = "../src/utils/mod.rs"]
pub mod utils;

#[path = "../src/modules/automod/mod.rs"]
pub mod automod;

use automod::{
    evaluate_link, scan_ocr_text, LinkVerdict, ScamVerdict, DEFAULT_ALLOWED_DOMAINS,
};

// ===========================================================================
// Category 1: OCR Media Scam Pattern Evasions
// ===========================================================================

#[test]
fn test_ocr_mixed_case_resilience() {
    // Attack scenario: Scammers vary letter case to bypass case-sensitive filters
    let mixed_case_payloads = [
        ("UnAuThOrIzEd WiThDrAwAl of 5.00 BTC detected. Cancel immediately.", true),
        ("cLaIm YoUr FrEe 1000 UsDt ToDaY aT oUr OfFiCiAl AiRdRoP", true),
        ("DiScOrD nItRo GiFt! ClAiM 3 MoNtHs FrEe DiScOrD nItRo NoW!", true),
        ("PrOmO cOdE: StAkE100 fOr 100 FrEe SpInS aNd CaSiNo DePoSiT mAtCh", true),
        ("OFFICIAL ETHEREUM AIRDROP: CLAIM 2.5 ETH FREE TOKEN", true),
    ];

    for (payload, should_detect) in mixed_case_payloads {
        let verdict = scan_ocr_text(payload);
        if should_detect {
            match verdict {
                ScamVerdict::CryptoCasinoScam { confidence, reason } => {
                    assert!(
                        confidence >= 0.90,
                        "Expected high confidence for mixed case payload '{}', got {}",
                        payload,
                        confidence
                    );
                    assert!(!reason.is_empty());
                }
                ScamVerdict::Clean => {
                    panic!("Mixed case evasion succeeded for: '{}'", payload);
                }
            }
        }
    }
}

#[test]
fn test_ocr_subtle_text_variations_and_separators() {
    // Test subtle variations: promocode vs promo code, freespins vs free spins
    let no_space_promo = "Use promocode STAKE100 for 100 freespins on casino!";
    let verdict = scan_ocr_text(no_space_promo);
    match verdict {
        ScamVerdict::CryptoCasinoScam { .. } => {}
        ScamVerdict::Clean => panic!("Expected detection for concatenated 'promocode' / 'freespins'"),
    }

    let no_space_bonus = "Enter bonuscode ROLLBIT to claim 50 freespins";
    let verdict2 = scan_ocr_text(no_space_bonus);
    match verdict2 {
        ScamVerdict::CryptoCasinoScam { .. } => {}
        ScamVerdict::Clean => panic!("Expected detection for 'bonuscode'"),
    }

    let multiline_withdrawal = "Security Alert:\nUnauthorized  withdrawal\nof 2.45 BTC detected.";
    let verdict3 = scan_ocr_text(multiline_withdrawal);
    match verdict3 {
        ScamVerdict::CryptoCasinoScam { .. } => {}
        ScamVerdict::Clean => panic!("Expected detection for multiline/multi-space unauthorized withdrawal"),
    }
}

#[test]
fn test_ocr_hyphenated_and_delimited_promo_codes_vulnerability() {
    let hyphen_promo = "Use promo-code: LUCKY777 on our casino!";
    let verdict = scan_ocr_text(hyphen_promo);
    match verdict {
        ScamVerdict::CryptoCasinoScam { confidence, reason } => {
            assert!(confidence >= 0.90);
            assert!(reason.contains("casino"));
        }
        ScamVerdict::Clean => panic!("Hyphenated 'promo-code' should be detected as casino scam"),
    }
}

#[test]
fn test_ocr_withdrawal_prompt_variations_vulnerabilities() {
    // 1. British English spelling
    let british_spelling = "Unauthorised withdrawal of 2.50 BTC detected. Cancel transaction here.";
    let verdict_british = scan_ocr_text(british_spelling);
    match verdict_british {
        ScamVerdict::CryptoCasinoScam { confidence, reason } => {
            assert!(confidence >= 0.90);
            assert!(reason.contains("cryptocurrency"));
        }
        ScamVerdict::Clean => panic!("British spelling 'Unauthorised withdrawal' must be detected"),
    }

    // 2. Pending withdrawal confirmation prompt
    let pending_prompt = "Withdrawal confirmation required: 2.5 BTC pending transfer. Click link to confirm or cancel.";
    let verdict_pending = scan_ocr_text(pending_prompt);
    match verdict_pending {
        ScamVerdict::CryptoCasinoScam { confidence, reason } => {
            assert!(confidence >= 0.90);
            assert!(reason.contains("cryptocurrency"));
        }
        ScamVerdict::Clean => panic!("Pending withdrawal confirmation prompt must be detected"),
    }

    // 3. Unauthorized withdraw (verb form)
    let withdraw_verb = "Unauthorized withdraw of 1.50 ETH initiated from your account.";
    let verdict_verb = scan_ocr_text(withdraw_verb);
    match verdict_verb {
        ScamVerdict::CryptoCasinoScam { confidence, reason } => {
            assert!(confidence >= 0.90);
            assert!(reason.contains("cryptocurrency"));
        }
        ScamVerdict::Clean => panic!("'Unauthorized withdraw' verb form must be detected"),
    }

    // 4. Withdrawal request alert
    let debit_alert = "Withdrawal request of 5000 USDT completed. If you did not initiate this, report now.";
    let verdict_debit = scan_ocr_text(debit_alert);
    match verdict_debit {
        ScamVerdict::CryptoCasinoScam { confidence, reason } => {
            assert!(confidence >= 0.90);
            assert!(reason.contains("cryptocurrency"));
        }
        ScamVerdict::Clean => panic!("'Withdrawal request of 5000 USDT' must be detected"),
    }
}

#[test]
fn test_ocr_fragmented_keywords() {
    // Attack scenario: scam words fragmented across long surrounding text
    let fragmented_giveaway = "Community announcement! To celebrate our milestone, we are holding a massive giveaway for everyone. Top prize includes a brand new graphics card and 2.5 BTC in rewards!";
    let verdict = scan_ocr_text(fragmented_giveaway);
    match verdict {
        ScamVerdict::CryptoCasinoScam { confidence, .. } => {
            assert!(confidence >= 0.90);
        }
        ScamVerdict::Clean => panic!("Expected detection for fragmented crypto giveaway"),
    }

    let fragmented_nitro = "Hey guys, check out this server event. Free gifts are being distributed to all active members today: Discord Nitro gift for 3 months!";
    let verdict2 = scan_ocr_text(fragmented_nitro);
    match verdict2 {
        ScamVerdict::CryptoCasinoScam { confidence, .. } => {
            assert!(confidence >= 0.90);
        }
        ScamVerdict::Clean => panic!("Expected detection for fragmented nitro gift"),
    }
}

#[test]
fn test_ocr_clean_gaming_false_positive_immunity() {
    // Legitimate Minecraft / Discord gaming messages must never be flagged as scams
    let clean_payloads = [
        "Player LeoSMP withdrew 500 gold coins from the faction bank",
        "Selling 64 Netherite Ingots for 128 Diamonds at /warp shop",
        "Paranoia SMP Season 3 - Player Kills Leaderboard: Top 1 is Alex with 45 kills",
        "Congrats on reaching 100 subscribers on YouTube! Great video!",
        "Don't forget to claim your daily Minecraft quest rewards at spawn",
        "Coordinate marker: X: -420, Y: 72, Z: 1337 (Mushroom Island)",
    ];

    for clean_text in clean_payloads {
        let verdict = scan_ocr_text(clean_text);
        assert_eq!(
            verdict,
            ScamVerdict::Clean,
            "False positive triggered on clean text: '{}'",
            clean_text
        );
    }
}

// ===========================================================================
// Category 2: Phishing and Invite Interceptor Evasions
// ===========================================================================

#[test]
fn test_link_filter_url_casing() {
    // Attack scenario: using UPPERCASE or MixedCase in domain and protocol
    let upper_invite = "JOIN NOW: HTTPS://DISCORD.GG/EVIL-RAID";
    let verdict = evaluate_link(upper_invite, DEFAULT_ALLOWED_DOMAINS, &["paranoia"]);
    assert_eq!(
        verdict,
        LinkVerdict::UnauthorizedInvite {
            code: "evil-raid".to_string()
        }
    );

    let upper_whitelisted = "OFFICIAL: HTTPS://DISCORD.GG/PARANOIA";
    let verdict2 = evaluate_link(upper_whitelisted, DEFAULT_ALLOWED_DOMAINS, &["paranoia"]);
    assert_eq!(verdict2, LinkVerdict::Allowed);

    let mixed_phishing = "Free prize: hTtPs://DlScOrD-nItRo.CoM/claim";
    let verdict3 = evaluate_link(mixed_phishing, DEFAULT_ALLOWED_DOMAINS, &["paranoia"]);
    match verdict3 {
        LinkVerdict::Phishing { domain } => {
            assert!(domain.contains("dlscord-nitro"));
        }
        other => panic!("Expected phishing for mixed case, got {:?}", other),
    }
}

#[test]
fn test_link_filter_trailing_dots_evasion_vulnerabilities() {
    let trailing_dot_invite = "Join raid: https://discord.gg./evil-raid";
    let verdict = evaluate_link(trailing_dot_invite, DEFAULT_ALLOWED_DOMAINS, &["paranoia"]);
    assert_eq!(
        verdict,
        LinkVerdict::UnauthorizedInvite {
            code: "evil-raid".to_string()
        },
        "Trailing dot 'discord.gg.' must be intercepted as UnauthorizedInvite"
    );

    let trailing_dot_invite_com = "Join raid: https://discord.com./invite/evil-raid";
    let verdict_com = evaluate_link(trailing_dot_invite_com, DEFAULT_ALLOWED_DOMAINS, &["paranoia"]);
    assert_eq!(
        verdict_com,
        LinkVerdict::UnauthorizedInvite {
            code: "evil-raid".to_string()
        },
        "Trailing dot 'discord.com.' must be intercepted as UnauthorizedInvite"
    );
}

#[test]
fn test_link_filter_discord_shortcuts_false_positive_vulnerability() {
    let unauthorized_me = "Join: https://discord.me/unauthorized-server";
    let verdict_me = evaluate_link(unauthorized_me, DEFAULT_ALLOWED_DOMAINS, &["paranoia"]);
    assert_eq!(
        verdict_me,
        LinkVerdict::UnauthorizedInvite {
            code: "unauthorized-server".to_string()
        }
    );

    // Whitelisted shortcut must be Allowed, not Phishing
    let whitelisted_me = "Official shortcut: https://discord.me/paranoia";
    let verdict_me_white = evaluate_link(whitelisted_me, DEFAULT_ALLOWED_DOMAINS, &["paranoia"]);
    assert_eq!(
        verdict_me_white,
        LinkVerdict::Allowed,
        "Whitelisted discord.me/paranoia must be Allowed"
    );

    let whitelisted_io = "Official shortcut: https://discord.io/paranoia";
    let verdict_io_white = evaluate_link(whitelisted_io, DEFAULT_ALLOWED_DOMAINS, &["paranoia"]);
    assert_eq!(
        verdict_io_white,
        LinkVerdict::Allowed,
        "Whitelisted discord.io/paranoia must be Allowed"
    );
}

#[test]
fn test_link_filter_double_slash_evasion_vulnerability() {
    let double_slash_invite = "Join here: https://discord.gg//evil-raid";
    let verdict_double_slash = evaluate_link(double_slash_invite, DEFAULT_ALLOWED_DOMAINS, &["paranoia"]);
    assert_eq!(
        verdict_double_slash,
        LinkVerdict::UnauthorizedInvite {
            code: "evil-raid".to_string()
        },
        "Double slash invite 'discord.gg//code' must be intercepted as UnauthorizedInvite"
    );
}

#[test]
fn test_link_filter_unicode_domain_lookalikes_vulnerabilities() {
    // Cyrillic small letter 'і' U+0456 in discord-nitro
    let cyrillic_i_phish = "Free Nitro: https://d\u{0456}scord-nitro.com/gift";
    let verdict_cyrillic = evaluate_link(cyrillic_i_phish, DEFAULT_ALLOWED_DOMAINS, &["paranoia"]);
    assert_eq!(
        verdict_cyrillic,
        LinkVerdict::Phishing {
            domain: "discord-nitro.com".to_string()
        },
        "Cyrillic 'і' in phishing domain must be intercepted as Phishing"
    );

    // Cyrillic small letter 'і' in discord.gg invite
    let cyrillic_i_invite = "Join: https://d\u{0456}scord.gg/evil-raid";
    let verdict_cyrillic_inv = evaluate_link(cyrillic_i_invite, DEFAULT_ALLOWED_DOMAINS, &["paranoia"]);
    assert_eq!(
        verdict_cyrillic_inv,
        LinkVerdict::UnauthorizedInvite {
            code: "evil-raid".to_string()
        },
        "Cyrillic 'і' in discord.gg must be intercepted as UnauthorizedInvite"
    );

    // Cyrillic character in invite code: e.g. 'а' U+0430
    let cyrillic_code_invite = "Join: https://discord.gg/\u{0430}ttack";
    let verdict_cyrillic_code = evaluate_link(cyrillic_code_invite, DEFAULT_ALLOWED_DOMAINS, &["paranoia"]);
    assert_eq!(
        verdict_cyrillic_code,
        LinkVerdict::UnauthorizedInvite {
            code: "attack".to_string()
        },
        "Non-ASCII characters in invite code must be normalized and intercepted as UnauthorizedInvite"
    );
}

#[test]
fn test_comprehensive_it2_adversarial_boundary_verification() {
    // 1. Trailing dot invite variants (both unauthorized and authorized)
    let trailing_variants = [
        ("https://discord.gg./evil-raid", LinkVerdict::UnauthorizedInvite { code: "evil-raid".into() }),
        ("https://discord.com./invite/evil-raid", LinkVerdict::UnauthorizedInvite { code: "evil-raid".into() }),
        ("https://discordapp.com./invite/evil-raid", LinkVerdict::UnauthorizedInvite { code: "evil-raid".into() }),
        ("https://discord.me./evil-raid", LinkVerdict::UnauthorizedInvite { code: "evil-raid".into() }),
        ("https://discord.io./evil-raid", LinkVerdict::UnauthorizedInvite { code: "evil-raid".into() }),
        ("https://discord.li./evil-raid", LinkVerdict::UnauthorizedInvite { code: "evil-raid".into() }),
        ("https://discord.gg./paranoia", LinkVerdict::Allowed),
        ("https://discord.com./invite/paranoia", LinkVerdict::Allowed),
        ("https://discord.me./paranoia", LinkVerdict::Allowed),
    ];
    for (url, expected) in trailing_variants {
        let verdict = evaluate_link(url, DEFAULT_ALLOWED_DOMAINS, &["paranoia"]);
        assert_eq!(verdict, expected, "Failed for trailing dot variant: {}", url);
    }

    // 2. Whitelisted shortcuts and unauthorized shortcuts
    let shortcut_cases = [
        ("https://discord.me/paranoia", LinkVerdict::Allowed),
        ("https://discord.io/paranoia", LinkVerdict::Allowed),
        ("https://discord.li/paranoia", LinkVerdict::Allowed),
        ("http://discord.me/paranoia", LinkVerdict::Allowed),
        ("https://discord.me/evil-server", LinkVerdict::UnauthorizedInvite { code: "evil-server".into() }),
        ("https://discord.io/evil-server", LinkVerdict::UnauthorizedInvite { code: "evil-server".into() }),
        ("https://discord.li/evil-server", LinkVerdict::UnauthorizedInvite { code: "evil-server".into() }),
    ];
    for (url, expected) in shortcut_cases {
        let verdict = evaluate_link(url, DEFAULT_ALLOWED_DOMAINS, &["paranoia"]);
        assert_eq!(verdict, expected, "Failed for shortcut case: {}", url);
    }

    // 3. Double and multiple slashes
    let multi_slash_cases = [
        ("https://discord.gg//evil-raid", LinkVerdict::UnauthorizedInvite { code: "evil-raid".into() }),
        ("https://discord.gg///evil-raid", LinkVerdict::UnauthorizedInvite { code: "evil-raid".into() }),
        ("https://discord.com/invite//evil-raid", LinkVerdict::UnauthorizedInvite { code: "evil-raid".into() }),
        ("https://discord.me///evil-raid", LinkVerdict::UnauthorizedInvite { code: "evil-raid".into() }),
        ("https://discord.gg//paranoia", LinkVerdict::Allowed),
    ];
    for (url, expected) in multi_slash_cases {
        let verdict = evaluate_link(url, DEFAULT_ALLOWED_DOMAINS, &["paranoia"]);
        assert_eq!(verdict, expected, "Failed for multi-slash case: {}", url);
    }

    // 4. Unicode homoglyphs
    let homoglyph_cases = [
        ("Free Nitro: HTTPS://D\u{0456}SCORD-NITRO.COM/GIFT", LinkVerdict::Phishing { domain: "discord-nitro.com".into() }),
        ("Join: https://d\u{0456}scord.me/paranoia", LinkVerdict::Allowed),
        ("Join: https://d\u{0456}scord.me/evil-raid", LinkVerdict::UnauthorizedInvite { code: "evil-raid".into() }),
    ];
    for (url, expected) in homoglyph_cases {
        let verdict = evaluate_link(url, DEFAULT_ALLOWED_DOMAINS, &["paranoia"]);
        assert_eq!(verdict, expected, "Failed for homoglyph case: {}", url);
    }

    // 5. Crypto withdrawal prompts
    let withdrawal_cases = [
        "Unauthorised withdrawal of 2.50 BTC detected. Cancel transaction here.",
        "Withdrawal confirmation required: 2.5 BTC pending transfer. Click link to confirm or cancel.",
        "Unauthorized withdraw of 1.50 ETH initiated from your account.",
        "Withdrawal request of 5000 USDT completed. If you did not initiate this, report now.",
        "Pending withdrawal alert: 10 SOL transfer in progress.",
        "Confirm withdrawal of 2.0 BTC to external wallet immediately.",
    ];
    for prompt in withdrawal_cases {
        let verdict = scan_ocr_text(prompt);
        match verdict {
            ScamVerdict::CryptoCasinoScam { confidence, reason } => {
                assert!(confidence >= 0.90);
                assert!(reason.contains("cryptocurrency"));
            }
            ScamVerdict::Clean => panic!("Failed to detect withdrawal prompt: '{}'", prompt),
        }
    }

    // 6. Hyphenated and delimited promo codes
    let promo_cases = [
        "Use promo-code: LUCKY777 on our casino!",
        "Use promo_code: LUCKY777 on our casino!",
        "Enter bonus-code ROLLBIT for 50 free spins!",
        "Claim voucher-code STAKE100 for deposit match on casino!",
    ];
    for promo in promo_cases {
        let verdict = scan_ocr_text(promo);
        match verdict {
            ScamVerdict::CryptoCasinoScam { confidence, reason } => {
                assert!(confidence >= 0.90);
                assert!(reason.contains("casino"));
            }
            ScamVerdict::Clean => panic!("Failed to detect promo code: '{}'", promo),
        }
    }

    // 7. Minecraft vocabulary false-positive immunity
    let mc_clean = [
        "Let's go together to the Nether to mine some Netherite ingots!",
        "Check the console logs to see why the server crashed",
        "I found a great solution for the redstone sorting system",
        "Playing solo on the survival server today",
        "Selling 64 netherite scrap at /warp shop",
        "The wither fight was intense, we barely survived together",
        "Does anyone have spare obsidian for the nether portal?",
        "Player LeoSMP withdrew 500 gold coins from the faction bank",
        "Claim your daily Minecraft quest rewards at spawn",
    ];
    for text in mc_clean {
        let verdict = scan_ocr_text(text);
        assert_eq!(verdict, ScamVerdict::Clean, "False positive on clean text: '{}'", text);
    }
}

