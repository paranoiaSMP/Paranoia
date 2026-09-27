mod common;
use std::env;

#[path = "../src/config.rs"]
mod config;

#[path = "../src/db.rs"]
mod db;

use config::Config;
use db::{AppealsFile, SanctionsFile, TikTokFile};

#[test]
fn test_stress_env_extra_whitespace_and_quotes() {
    let _guard = common::ENV_MUTEX.lock().unwrap_or_else(|e| e.into_inner());

    unsafe {
        env::set_var("DISCORD_TOKEN", "   \"  my_secret_token_123  \"   ");
        env::set_var("DATABASE_URL", "  'postgres://usr:pwd@localhost:5432/testdb'  ");
        env::set_var("ROLE_STAFF_ID", "  \"1516106532792828036\"  ");
        env::set_var("ROLE_VIDEASTE_ID", "  '1516106532784177317'  ");
        env::set_var("TICKET_CATEGORY_ID", " \t 1516106533962907679 \t ");
        env::set_var("TICKET_LOG_CHANNEL_ID", " 1516106534122426433 ");
        env::set_var("APPEAL_FORUM_CHANNEL_ID", "  \"112233445566778899\"  ");
        env::set_var("TIKTOK_CHANNEL_ID", "  '998877665544332211'  ");
        env::set_var("NEXTAUTH_URL", "  \"https://auth.paranoia.gg\"  ");
        env::set_var("WEB_API_URL", "  'https://web.paranoia.gg/api/sync'  ");
        env::set_var("WEB_API_FALLBACK_URL", "  https://fallback.paranoia.gg  ");
    }

    let loaded = Config::load();
    assert!(loaded.is_ok(), "Config::load failed with sanitized inputs: {:?}", loaded.err());

    let cfg = loaded.unwrap();
    assert_eq!(cfg.discord_token, "my_secret_token_123");
    assert_eq!(cfg.database_url, "postgres://usr:pwd@localhost:5432/testdb");
    assert_eq!(cfg.role_staff_id, 1516106532792828036);
    assert_eq!(cfg.role_videaste_id, 1516106532784177317);
    assert_eq!(cfg.ticket_category_id, 1516106533962907679);
    assert_eq!(cfg.ticket_log_channel_id, 1516106534122426433);
    assert_eq!(cfg.appeal_forum_channel_id, Some(112233445566778899));
    assert_eq!(cfg.tiktok_channel_id, Some(998877665544332211));
    assert_eq!(cfg.nextauth_url, "https://auth.paranoia.gg");
    assert_eq!(cfg.web_api_url, "https://web.paranoia.gg/api/sync");
    assert_eq!(cfg.web_api_fallback_url, "https://fallback.paranoia.gg");
}

#[test]
fn test_stress_env_invalid_numbers_fail_gracefully() {
    let _guard = common::ENV_MUTEX.lock().unwrap_or_else(|e| e.into_inner());

    unsafe {
        env::set_var("DISCORD_TOKEN", "valid_token");
        env::set_var("DATABASE_URL", "postgres://localhost/db");
    }

    let invalid_values = [
        "abc",
        "-12345",
        "123.456",
        "999999999999999999999999999999999999999999999999999",
        "0x123",
        "1e10",
    ];

    for val in invalid_values {
        unsafe {
            env::set_var("ROLE_STAFF_ID", val);
        }
        let res = Config::load();
        assert!(
            res.is_err(),
            "Expected Config::load to fail for invalid ROLE_STAFF_ID='{}', but succeeded",
            val
        );
        let err = format!("{:#}", res.err().unwrap());
        assert!(
            err.contains("ROLE_STAFF_ID"),
            "Error message should mention ROLE_STAFF_ID: {}",
            err
        );
    }
}

#[test]
fn test_stress_env_missing_required_variables() {
    let _guard = common::ENV_MUTEX.lock().unwrap_or_else(|e| e.into_inner());

    let empty_variants = ["", "   ", "\t\n", "\"\"", "''", " \"\" ", " '' "];

    for variant in empty_variants {
        unsafe {
            env::set_var("DISCORD_TOKEN", variant);
            env::set_var("DATABASE_URL", "postgres://localhost/db");
        }
        let res = Config::load();
        assert!(
            res.is_err(),
            "Expected failure when DISCORD_TOKEN is '{}'",
            variant
        );

        unsafe {
            env::set_var("DISCORD_TOKEN", "valid_token");
            env::set_var("DATABASE_URL", variant);
        }
        let res2 = Config::load();
        assert!(
            res2.is_err(),
            "Expected failure when DATABASE_URL is '{}'",
            variant
        );
    }
}

#[test]
fn test_stress_env_optional_channel_zero_and_invalid() {
    let _guard = common::ENV_MUTEX.lock().unwrap_or_else(|e| e.into_inner());

    unsafe {
        env::set_var("DISCORD_TOKEN", "valid_token");
        env::set_var("DATABASE_URL", "postgres://localhost/db");
        env::remove_var("ROLE_STAFF_ID");
        env::remove_var("ROLE_VIDEASTE_ID");
        env::remove_var("TICKET_CATEGORY_ID");
        env::remove_var("TICKET_LOG_CHANNEL_ID");
    }

    let falsy_values = ["0", "\"0\"", "'0'", "   0   ", "", "invalid", "-10"];
    for val in falsy_values {
        unsafe {
            env::set_var("APPEAL_FORUM_CHANNEL_ID", val);
            env::set_var("TIKTOK_CHANNEL_ID", val);
        }
        let cfg = Config::load().expect("Config::load should succeed with fallback");
        assert_eq!(
            cfg.appeal_forum_channel_id, None,
            "Expected None for APPEAL_FORUM_CHANNEL_ID='{}'",
            val
        );
        assert_eq!(
            cfg.tiktok_channel_id, None,
            "Expected None for TIKTOK_CHANNEL_ID='{}'",
            val
        );
    }
}

#[test]
fn test_stress_database_url_schema_cleaning() {
    let _guard = common::ENV_MUTEX.lock().unwrap_or_else(|e| e.into_inner());

    unsafe {
        env::set_var("DISCORD_TOKEN", "valid_token");
    }

    let cases = [
        (
            "postgres://user:pass@host:5432/db?schema=public",
            "postgres://user:pass@host:5432/db",
        ),
        (
            "postgres://user:pass@host:5432/db?schema=public&sslmode=prefer",
            "postgres://user:pass@host:5432/db?sslmode=prefer",
        ),
        (
            "postgres://user:pass@host:5432/db?sslmode=prefer&schema=public",
            "postgres://user:pass@host:5432/db?sslmode=prefer",
        ),
        (
            "postgres://user:pass@host:5432/db?schema=public&sslmode=prefer&connect_timeout=10",
            "postgres://user:pass@host:5432/db?sslmode=prefer&connect_timeout=10",
        ),
        (
            "postgres://user:pass@host:5432/db?sslmode=prefer&schema=public&connect_timeout=10",
            "postgres://user:pass@host:5432/db?sslmode=prefer&connect_timeout=10",
        ),
        (
            "postgres://user:pass@host:5432/db?sslmode=prefer&connect_timeout=10&schema=public",
            "postgres://user:pass@host:5432/db?sslmode=prefer&connect_timeout=10",
        ),
        (
            "\"postgres://user:pass@host:5432/db?schema=public&sslmode=prefer\"",
            "postgres://user:pass@host:5432/db?sslmode=prefer",
        ),
        (
            "'postgres://user:pass@host:5432/db?schema=public&sslmode=prefer&connect_timeout=10'",
            "postgres://user:pass@host:5432/db?sslmode=prefer&connect_timeout=10",
        ),
        (
            "postgres://localhost:5432/db",
            "postgres://localhost:5432/db",
        ),
    ];

    for (input, expected) in cases {
        assert_eq!(
            config::clean_db_url(input),
            expected,
            "config::clean_db_url failed for '{}'",
            input
        );
        assert_eq!(
            db::clean_db_url(input),
            expected,
            "db::clean_db_url failed for '{}'",
            input
        );

        unsafe {
            env::set_var("DATABASE_URL", input);
        }
        let cfg = Config::load().unwrap();
        assert_eq!(
            cfg.database_url, expected,
            "Config::load failed for input '{}'",
            input
        );
    }
}

#[test]
fn test_stress_sanctions_malformed_json() {
    let malformed_inputs = [
        "{ not valid json }",
        "{\"123\": { \"user_id\": } }",
        "[{\"guild_id\": 123, }]",
        "\"a simple string\"",
        "12345",
        "null",
        "true",
        "{\"key\": [1, 2, 3]}",
    ];

    for input in malformed_inputs {
        let res: Result<SanctionsFile, _> = serde_json::from_str(input);
        assert!(res.is_err(), "Expected deserialization error for: {}", input);
    }
}

#[test]
fn test_stress_sanctions_empty_formats() {
    let empty_inputs = [
        "{}",
        "[]",
        "{\n  \n}",
        "[\n  \n]",
        "  {  }  ",
    ];

    for input in empty_inputs {
        let res: Result<SanctionsFile, _> = serde_json::from_str(input);
        assert!(res.is_ok(), "Expected valid empty parse for: {}", input);
        match res.unwrap() {
            SanctionsFile::Map(m) => assert!(m.is_empty()),
            SanctionsFile::List(l) => assert!(l.is_empty()),
        }
    }
}

#[test]
fn test_stress_sanctions_snowflake_permutations() {
    let json_map = r#"{
        "1001": {
            "guild_id": 987654321098765432,
            "user_id": "123456789012345678",
            "mod_id": "\"112233445566778899\"",
            "sanction_type": "ban",
            "time": "7d",
            "reason": "Speedhack"
        },
        "1002": {
            "guild_id": "  987654321098765432  ",
            "user_id": "'234567890123456789'",
            "mod_id": 112233445566778899,
            "sanction_type": "mute",
            "duration": "1h"
        },
        "1003": {
            "guild_id": null,
            "user_id": null,
            "mod_id": null,
            "sanction_type": "kick"
        },
        "1004": {
            "sanction_type": "warn"
        }
    }"#;

    let parsed: SanctionsFile = serde_json::from_str(json_map).expect("Should parse snowflake permutations");
    match parsed {
        SanctionsFile::Map(map) => {
            assert_eq!(map.len(), 4);

            let s1 = map.get("1001").unwrap();
            assert_eq!(s1.guild_id, 987654321098765432);
            assert_eq!(s1.user_id, 123456789012345678);
            assert_eq!(s1.mod_id, 112233445566778899);
            assert_eq!(s1.duration.as_deref(), Some("7d"));

            let s2 = map.get("1002").unwrap();
            assert_eq!(s2.guild_id, 987654321098765432);
            assert_eq!(s2.user_id, 234567890123456789);
            assert_eq!(s2.mod_id, 112233445566778899);
            assert_eq!(s2.duration.as_deref(), Some("1h"));

            let s3 = map.get("1003").unwrap();
            assert_eq!(s3.guild_id, 0);
            assert_eq!(s3.user_id, 0);
            assert_eq!(s3.mod_id, 0);

            let s4 = map.get("1004").unwrap();
            assert_eq!(s4.guild_id, 0);
            assert_eq!(s4.user_id, 0);
            assert_eq!(s4.mod_id, 0);
        }
        SanctionsFile::List(_) => panic!("Expected Map variant"),
    }
}

#[test]
fn test_stress_appeals_deserialization_permutations() {
    let json_map = r#"{
        "app_1": {
            "sanction_id": "A1B2C3",
            "pseudo_mc": "Player1",
            "arguments": "Valid argument text",
            "status": "pending"
        },
        "app_2": {
            "sanction_id": "D4E5F6",
            "reason": "Fallback reason used when arguments missing"
        },
        "app_3": {},
        "app_4": {
            "arguments": null,
            "reason": null,
            "status": "accepted"
        }
    }"#;

    let parsed: AppealsFile = serde_json::from_str(json_map).expect("Should parse appeals variations");
    match parsed {
        AppealsFile::Map(map) => {
            assert_eq!(map.len(), 4);

            let a1 = map.get("app_1").unwrap();
            assert_eq!(a1.arguments.as_deref(), Some("Valid argument text"));
            assert_eq!(a1.status.as_deref(), Some("pending"));

            let a2 = map.get("app_2").unwrap();
            assert_eq!(a2.arguments, None);
            assert_eq!(a2.reason.as_deref(), Some("Fallback reason used when arguments missing"));

            let a3 = map.get("app_3").unwrap();
            assert_eq!(a3.arguments, None);
            assert_eq!(a3.reason, None);
            assert_eq!(a3.status, None);

            let a4 = map.get("app_4").unwrap();
            assert_eq!(a4.arguments, None);
            assert_eq!(a4.status.as_deref(), Some("accepted"));
        }
        AppealsFile::List(_) => panic!("Expected Map variant"),
    }
}

#[test]
fn test_stress_tiktok_deserialization_permutations() {
    let json_list = r#"[
        {
            "username": "@AlphaUser",
            "channel_id": 1516106534122426433,
            "role_id": 1516106532784177317,
            "last_video_id": "11223344",
            "is_live": true
        },
        {
            "username": "BetaUser",
            "channel_id": "1516106534122426433",
            "role_id": null,
            "last_video_id": null
        },
        {
            "username": "GammaUser",
            "channel_id": "  \"1516106534122426433\"  ",
            "role_id": "'1516106532784177317'",
            "is_live": null
        }
    ]"#;

    let parsed: TikTokFile = serde_json::from_str(json_list).expect("Should parse TikTok permutations");
    match parsed {
        TikTokFile::List(list) => {
            assert_eq!(list.len(), 3);

            let t0 = &list[0];
            assert_eq!(t0.username.as_deref(), Some("@AlphaUser"));
            assert_eq!(t0.channel_id, 1516106534122426433);
            assert_eq!(t0.role_id, Some(1516106532784177317));
            assert_eq!(t0.is_live, Some(true));

            let t1 = &list[1];
            assert_eq!(t1.username.as_deref(), Some("BetaUser"));
            assert_eq!(t1.channel_id, 1516106534122426433);
            assert_eq!(t1.role_id, None);
            assert_eq!(t1.is_live, None);

            let t2 = &list[2];
            assert_eq!(t2.username.as_deref(), Some("GammaUser"));
            assert_eq!(t2.channel_id, 1516106534122426433);
            assert_eq!(t2.role_id, Some(1516106532784177317));
        }
        TikTokFile::Map(_) => panic!("Expected List variant"),
    }
}
