mod common;

#[path = "../src/db.rs"]
mod db;

use db::{
    parse_datetime, AppealsFile, SanctionsFile, TikTokFile, INSERT_APPEAL_SQL,
    INSERT_SANCTION_SQL, INSERT_TIKTOK_TARGET_SQL,
};

#[test]
fn test_parse_sanctions_json_format() {
    let raw = common::SAMPLE_SANCTIONS_JSON;
    let parsed: SanctionsFile = serde_json::from_str(raw)
        .expect("Must parse valid sanctions dictionary");

    match parsed {
        SanctionsFile::Map(sanctions) => {
            assert_eq!(sanctions.len(), 2);

            let s1 = sanctions.get("123456789012345678").expect("Record 1 must exist");
            assert_eq!(s1.sanction_id.as_deref(), Some("A1B2C3"));
            assert_eq!(s1.sanction_type, "ban");
            assert_eq!(s1.duration.as_deref(), Some("7d"));
            assert_eq!(s1.reason.as_deref(), Some("Speedhack detected"));
            assert_eq!(s1.guild_id, 987654321098765432);
            assert_eq!(s1.user_id, 123456789012345678);
            assert_eq!(s1.mod_id, 112233445566778899);
            assert_eq!(s1.appealed, Some(false));
            assert!(s1.created_at.is_some());

            let s2 = sanctions.get("234567890123456789").expect("Record 2 must exist");
            assert_eq!(s2.sanction_id.as_deref(), Some("D4E5F6"));
            assert_eq!(s2.sanction_type, "mute");
            assert_eq!(s2.duration.as_deref(), Some("1h"));
            assert_eq!(s2.appealed, Some(true));
        }
        _ => panic!("Expected map format"),
    }
}

#[test]
fn test_parse_appeals_json_format() {
    let raw = common::SAMPLE_APPEALS_JSON;
    let parsed: AppealsFile = serde_json::from_str(raw)
        .expect("Must parse valid appeals dictionary");

    match parsed {
        AppealsFile::Map(appeals) => {
            assert_eq!(appeals.len(), 2);

            let a1 = appeals.get("998877665544332211").expect("Appeal 1 must exist");
            assert_eq!(a1.sanction_id.as_deref(), Some("D4E5F6"));
            assert_eq!(a1.pseudo_mc.as_deref(), Some("PlayerTwoMC"));
            assert_eq!(
                a1.arguments.as_deref(),
                Some("I am sorry for spamming, please unmute me.")
            );
            assert_eq!(a1.status.as_deref(), Some("pending"));

            let a2 = appeals.get("887766554433221100").expect("Appeal 2 must exist");
            assert_eq!(a2.sanction_id.as_deref(), Some("A1B2C3"));
            assert_eq!(a2.status.as_deref(), Some("rejected"));

            let final_arguments = a2.arguments.clone().or_else(|| a2.reason.clone()).unwrap_or_default();
            assert_eq!(final_arguments, "Speedhack detected");
        }
        _ => panic!("Expected map format"),
    }
}

#[test]
fn test_parse_tiktok_targets_json_format() {
    let raw = common::SAMPLE_TIKTOK_TARGETS_JSON;
    let parsed: TikTokFile = serde_json::from_str(raw)
        .expect("Must parse valid TikTok targets array");

    match parsed {
        TikTokFile::List(targets) => {
            assert_eq!(targets.len(), 2);

            let t1 = &targets[0];
            let clean_user1 = t1.username.as_deref().unwrap().trim_start_matches('@').to_lowercase();
            assert_eq!(clean_user1, "leoo955");
            assert_eq!(t1.channel_id, 1516106534122426433);
            assert_eq!(t1.role_id, Some(1516106532784177317));
            assert_eq!(t1.last_video_id.as_deref(), Some("7320011223344556677"));
            assert_eq!(t1.is_live, Some(false));

            let t2 = &targets[1];
            let clean_user2 = t2.username.as_deref().unwrap().trim_start_matches('@').to_lowercase();
            assert_eq!(clean_user2, "paranoiasmp");
            assert_eq!(t2.channel_id, 1516106534122426433);
            assert_eq!(t2.role_id, None);
            assert_eq!(t2.last_video_id, None);
            assert_eq!(t2.is_live, Some(true));
        }
        _ => panic!("Expected list format"),
    }
}

#[test]
fn test_empty_json_files_handling() {
    let empty_sanctions: Result<SanctionsFile, _> = serde_json::from_str("{}");
    assert!(empty_sanctions.is_ok());

    let empty_appeals: Result<AppealsFile, _> = serde_json::from_str("{}");
    assert!(empty_appeals.is_ok());

    let empty_tiktok: Result<TikTokFile, _> = serde_json::from_str("[]");
    assert!(empty_tiktok.is_ok());
}

#[test]
fn test_malformed_json_handling() {
    let invalid_json = "{ invalid_json: true }";
    let res: Result<SanctionsFile, _> = serde_json::from_str(invalid_json);
    assert!(res.is_err(), "Malformed JSON must return Err and not panic");
}

#[test]
fn test_sql_insert_generation_and_idempotency() {
    assert!(INSERT_SANCTION_SQL.contains("ON CONFLICT (id) DO NOTHING"));
    assert!(INSERT_SANCTION_SQL.contains("INSERT INTO sanctions"));

    assert!(INSERT_APPEAL_SQL.contains("ON CONFLICT (id) DO NOTHING"));
    assert!(INSERT_APPEAL_SQL.contains("INSERT INTO appeals"));

    assert!(INSERT_TIKTOK_TARGET_SQL.contains("ON CONFLICT (username) DO NOTHING"));
    assert!(INSERT_TIKTOK_TARGET_SQL.contains("INSERT INTO tiktok_targets"));
}

#[test]
fn test_parse_datetime_utility() {
    let dt_rfc3339 = parse_datetime("2026-09-26T12:00:00Z");
    assert_eq!(dt_rfc3339.format("%Y-%m-%d %H:%M:%S").to_string(), "2026-09-26 12:00:00");

    let dt_naive_iso = parse_datetime("2026-09-26T12:00:00.123456");
    assert_eq!(dt_naive_iso.format("%Y-%m-%d").to_string(), "2026-09-26");

    let dt_space = parse_datetime("2026-09-26 12:00:00");
    assert_eq!(dt_space.format("%Y-%m-%d %H:%M:%S").to_string(), "2026-09-26 12:00:00");
}
