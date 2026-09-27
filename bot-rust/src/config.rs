#![allow(dead_code)]

use anyhow::{Context, Result};
use std::env;

#[derive(Clone, Debug)]
pub struct Config {
    pub discord_token: String,
    pub database_url: String,
    pub role_staff_id: u64,
    pub role_videaste_id: u64,
    pub ticket_category_id: u64,
    pub ticket_log_channel_id: u64,
    pub appeal_forum_channel_id: Option<u64>,
    pub tiktok_channel_id: Option<u64>,
    pub nextauth_url: String,
    pub web_api_url: String,
    pub web_api_fallback_url: String,
}

impl Config {
    pub const COLOR_SUCCESS: u32 = 0x22c55e;
    pub const COLOR_ERROR: u32 = 0xef4444;
    pub const COLOR_INFO: u32 = 0x3b82f6;
    pub const COLOR_PURPLE: u32 = 0xa855f7;
    pub const COLOR_GOLD: u32 = 0xfacc15;
    pub const FOOTER_TEXT: &'static str = "Paranoia Studio";

    pub const DEFAULT_ROLE_STAFF_ID: u64 = 1516106532792828036;
    pub const DEFAULT_ROLE_VIDEASTE_ID: u64 = 1516106532784177317;
    pub const DEFAULT_TICKET_CATEGORY_ID: u64 = 1516106533962907679;
    pub const DEFAULT_TICKET_LOG_CHANNEL_ID: u64 = 1516106534122426433;
    pub const DEFAULT_NEXTAUTH_URL: &'static str = "http://localhost:3000";
    pub const DEFAULT_WEB_API_URL: &'static str = "http://web:3000/api/tickets/sync-discord";
    pub const DEFAULT_WEB_API_FALLBACK_URL: &'static str = "http://localhost:3000/api/tickets/sync-discord";

    pub fn load() -> Result<Self> {
        dotenvy::dotenv().ok();
        dotenvy::from_path("../.env").ok();

        let discord_token = get_clean_var("DISCORD_TOKEN")
            .context("DISCORD_TOKEN is missing")?;

        let raw_db_url = get_clean_var("DATABASE_URL")
            .context("DATABASE_URL is missing")?;
        let database_url = clean_db_url(&raw_db_url);

        let role_staff_id = get_u64_var("ROLE_STAFF_ID", Self::DEFAULT_ROLE_STAFF_ID)?;
        let role_videaste_id = get_u64_var("ROLE_VIDEASTE_ID", Self::DEFAULT_ROLE_VIDEASTE_ID)?;
        let ticket_category_id = get_u64_var("TICKET_CATEGORY_ID", Self::DEFAULT_TICKET_CATEGORY_ID)?;
        let ticket_log_channel_id = get_u64_var("TICKET_LOG_CHANNEL_ID", Self::DEFAULT_TICKET_LOG_CHANNEL_ID)?;

        let appeal_forum_channel_id = get_optional_u64_var("APPEAL_FORUM_CHANNEL_ID");
        let tiktok_channel_id = get_optional_u64_var("TIKTOK_CHANNEL_ID");

        let nextauth_url = get_clean_var("NEXTAUTH_URL")
            .unwrap_or_else(|| Self::DEFAULT_NEXTAUTH_URL.to_string());
        let web_api_url = get_clean_var("WEB_API_URL")
            .unwrap_or_else(|| Self::DEFAULT_WEB_API_URL.to_string());
        let web_api_fallback_url = get_clean_var("WEB_API_FALLBACK_URL")
            .unwrap_or_else(|| Self::DEFAULT_WEB_API_FALLBACK_URL.to_string());

        Ok(Self {
            discord_token,
            database_url,
            role_staff_id,
            role_videaste_id,
            ticket_category_id,
            ticket_log_channel_id,
            appeal_forum_channel_id,
            tiktok_channel_id,
            nextauth_url,
            web_api_url,
            web_api_fallback_url,
        })
    }
}

pub fn clean_var(v: &str) -> Option<String> {
    let cleaned = v.trim().trim_matches('"').trim_matches('\'').trim().to_string();
    if cleaned.is_empty() {
        None
    } else {
        Some(cleaned)
    }
}

pub fn get_clean_var(key: &str) -> Option<String> {
    env::var(key).ok().and_then(|v| clean_var(&v))
}

pub fn get_u64_var(key: &str, default: u64) -> Result<u64> {
    match get_clean_var(key) {
        Some(val) => val.parse::<u64>().with_context(|| format!("Invalid u64 value for {}", key)),
        None => Ok(default),
    }
}

pub fn get_optional_u64_var(key: &str) -> Option<u64> {
    get_clean_var(key).and_then(|val| match val.parse::<u64>() {
        Ok(0) => None,
        Ok(id) => Some(id),
        Err(_) => None,
    })
}

pub fn clean_db_url(url: &str) -> String {
    let trimmed = url.trim().trim_matches('"').trim_matches('\'').trim();
    trimmed
        .replace("?schema=public&", "?")
        .replace("?schema=public", "")
        .replace("&schema=public", "")
}
