#![allow(dead_code)]

use std::sync::Mutex;

pub static ENV_MUTEX: Mutex<()> = Mutex::new(());

pub const SAMPLE_SANCTIONS_JSON: &str = r#"{
  "123456789012345678": {
    "guild_id": 987654321098765432,
    "sanction_id": "A1B2C3",
    "user_id": 123456789012345678,
    "user_name": "PlayerOne",
    "mod_id": 112233445566778899,
    "mod_name": "ModeratorStaff",
    "sanction_type": "ban",
    "time": "7d",
    "reason": "Speedhack detected",
    "created_at": "2026-09-26T17:30:00.000000+00:00",
    "appealed": false
  },
  "234567890123456789": {
    "guild_id": 987654321098765432,
    "sanction_id": "D4E5F6",
    "user_id": 234567890123456789,
    "user_name": "PlayerTwo",
    "mod_id": 112233445566778899,
    "mod_name": "ModeratorStaff",
    "sanction_type": "mute",
    "time": "1h",
    "reason": "Spam general channel",
    "created_at": "2026-09-26T17:35:00.000000+00:00",
    "appealed": true
  }
}"#;

pub const SAMPLE_APPEALS_JSON: &str = r#"{
  "998877665544332211": {
    "user_id": 234567890123456789,
    "guild_id": 987654321098765432,
    "sanction_id": "D4E5F6",
    "pseudo_mc": "PlayerTwoMC",
    "arguments": "I am sorry for spamming, please unmute me.",
    "status": "pending",
    "created_at": "2026-09-26T17:40:00.000000+00:00"
  },
  "887766554433221100": {
    "user_id": 123456789012345678,
    "guild_id": 987654321098765432,
    "sanction_id": "A1B2C3",
    "reason": "Speedhack detected",
    "status": "rejected",
    "created_at": "2026-09-26T17:45:00.000000+00:00"
  }
}"#;

pub const SAMPLE_TIKTOK_TARGETS_JSON: &str = r#"[
  {
    "username": "leoo955",
    "channel_id": 1516106534122426433,
    "role_id": 1516106532784177317,
    "last_video_id": "7320011223344556677",
    "is_live": false
  },
  {
    "username": "@paranoiasmp",
    "channel_id": 1516106534122426433,
    "role_id": null,
    "last_video_id": null,
    "is_live": true
  }
]"#;

pub const EXPECTED_SANCTIONS_DDL: &str = r#"CREATE TABLE IF NOT EXISTS sanctions (
    id VARCHAR(6) PRIMARY KEY,
    guild_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    mod_id BIGINT NOT NULL,
    sanction_type VARCHAR(20) NOT NULL,
    duration TEXT,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    appealed BOOLEAN DEFAULT FALSE
);"#;

pub const EXPECTED_APPEALS_DDL: &str = r#"CREATE TABLE IF NOT EXISTS appeals (
    id TEXT PRIMARY KEY,
    sanction_id VARCHAR(6) REFERENCES sanctions(id),
    pseudo_mc TEXT,
    arguments TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);"#;

pub const EXPECTED_TIKTOK_TARGETS_DDL: &str = r#"CREATE TABLE IF NOT EXISTS tiktok_targets (
    username TEXT PRIMARY KEY,
    channel_id BIGINT NOT NULL,
    role_id BIGINT,
    last_video_id TEXT,
    is_live BOOLEAN DEFAULT FALSE
);"#;
