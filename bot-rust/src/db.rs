#![allow(dead_code)]

use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use serde::Deserialize;
use sqlx::{postgres::PgPoolOptions, PgPool};
use std::{collections::HashMap, path::Path, time::Duration};

pub fn clean_db_url(url: &str) -> String {
    let trimmed = url.trim().trim_matches('"').trim_matches('\'').trim();
    trimmed
        .replace("?schema=public&", "?")
        .replace("?schema=public", "")
        .replace("&schema=public", "")
}

pub async fn init_pool(database_url: &str) -> Result<PgPool> {
    let clean_url = clean_db_url(database_url);

    PgPoolOptions::new()
        .max_connections(10)
        .acquire_timeout(Duration::from_secs(10))
        .connect(&clean_url)
        .await
        .with_context(|| format!("Failed to connect to PostgreSQL at {}", clean_url))
}

pub fn init_pool_lazy(database_url: &str) -> Result<PgPool> {
    let clean_url = clean_db_url(database_url);

    PgPoolOptions::new()
        .max_connections(10)
        .acquire_timeout(Duration::from_secs(5))
        .connect_lazy(&clean_url)
        .with_context(|| format!("Failed to create PostgreSQL pool for {}", clean_url))
}

pub async fn connect(database_url: &str) -> Result<PgPool> {
    init_pool(database_url).await
}

pub async fn health_check(pool: &PgPool) -> Result<()> {
    sqlx::query("SELECT 1")
        .execute(pool)
        .await
        .context("Database health check failed")?;
    Ok(())
}

pub async fn run_migrations(pool: &PgPool) -> Result<()> {
    sqlx::migrate!("./migrations")
        .run(pool)
        .await
        .context("Failed to run SQL migrations")?;
    Ok(())
}

fn deserialize_snowflake<'de, D>(deserializer: D) -> Result<i64, D::Error>
where
    D: serde::Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum SnowflakeHelper {
        Int(i64),
        Str(String),
    }
    match Option::<SnowflakeHelper>::deserialize(deserializer)? {
        Some(SnowflakeHelper::Int(i)) => Ok(i),
        Some(SnowflakeHelper::Str(s)) => {
            let cleaned = s.trim().trim_matches('"').trim_matches('\'').trim();
            cleaned.parse::<i64>().map_err(serde::de::Error::custom)
        }
        None => Ok(0),
    }
}

fn deserialize_opt_snowflake<'de, D>(deserializer: D) -> Result<Option<i64>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum SnowflakeHelper {
        Int(i64),
        Str(String),
    }
    match Option::<SnowflakeHelper>::deserialize(deserializer)? {
        Some(SnowflakeHelper::Int(i)) => Ok(Some(i)),
        Some(SnowflakeHelper::Str(s)) => {
            let cleaned = s.trim().trim_matches('"').trim_matches('\'').trim();
            cleaned.parse::<i64>().map(Some).map_err(serde::de::Error::custom)
        }
        None => Ok(None),
    }
}

#[derive(Debug, Deserialize)]
pub struct RawSanction {
    #[serde(default)]
    pub id: Option<String>,
    #[serde(default)]
    pub sanction_id: Option<String>,
    #[serde(default, deserialize_with = "deserialize_snowflake")]
    pub guild_id: i64,
    #[serde(default, deserialize_with = "deserialize_snowflake")]
    pub user_id: i64,
    #[serde(default, deserialize_with = "deserialize_snowflake")]
    pub mod_id: i64,
    #[serde(default)]
    pub sanction_type: String,
    #[serde(default, alias = "time")]
    pub duration: Option<String>,
    #[serde(default)]
    pub reason: Option<String>,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub appealed: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
pub enum SanctionsFile {
    Map(HashMap<String, RawSanction>),
    List(Vec<RawSanction>),
}

#[derive(Debug, Deserialize)]
pub struct RawAppeal {
    #[serde(default)]
    pub id: Option<String>,
    #[serde(default)]
    pub sanction_id: Option<String>,
    #[serde(default)]
    pub pseudo_mc: Option<String>,
    #[serde(default)]
    pub arguments: Option<String>,
    #[serde(default)]
    pub reason: Option<String>,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub created_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
pub enum AppealsFile {
    Map(HashMap<String, RawAppeal>),
    List(Vec<RawAppeal>),
}

#[derive(Debug, Deserialize)]
pub struct RawTikTokTarget {
    #[serde(default)]
    pub username: Option<String>,
    #[serde(default, deserialize_with = "deserialize_snowflake")]
    pub channel_id: i64,
    #[serde(default, deserialize_with = "deserialize_opt_snowflake")]
    pub role_id: Option<i64>,
    #[serde(default)]
    pub last_video_id: Option<String>,
    #[serde(default)]
    pub is_live: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
pub enum TikTokFile {
    List(Vec<RawTikTokTarget>),
    Map(HashMap<String, RawTikTokTarget>),
}

fn resolve_data_file(filename: &str) -> Option<std::path::PathBuf> {
    let candidates = [
        format!("data/{}", filename),
        format!("../Bot/data/{}", filename),
        format!("../../Bot/data/{}", filename),
        format!("../data/{}", filename),
    ];
    for c in &candidates {
        let p = Path::new(c);
        if p.exists() && p.is_file() {
            return Some(p.to_path_buf());
        }
    }
    None
}

pub const INSERT_SANCTION_SQL: &str = r#"
INSERT INTO sanctions (id, guild_id, user_id, mod_id, sanction_type, duration, reason, created_at, appealed)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
ON CONFLICT (id) DO NOTHING
"#;

pub const INSERT_APPEAL_SQL: &str = r#"
INSERT INTO appeals (id, sanction_id, pseudo_mc, arguments, status, created_at)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (id) DO NOTHING
"#;

pub const INSERT_TIKTOK_TARGET_SQL: &str = r#"
INSERT INTO tiktok_targets (username, channel_id, role_id, last_video_id, is_live)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (username) DO NOTHING
"#;

pub fn parse_datetime(s: &str) -> DateTime<Utc> {
    if let Ok(dt) = DateTime::parse_from_rfc3339(s) {
        return dt.with_timezone(&Utc);
    }
    if let Ok(ndt) = chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S%.f") {
        return DateTime::<Utc>::from_naive_utc_and_offset(ndt, Utc);
    }
    if let Ok(ndt) = chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S") {
        return DateTime::<Utc>::from_naive_utc_and_offset(ndt, Utc);
    }
    Utc::now()
}

pub async fn migrate_json_data(pool: &PgPool) -> Result<()> {
    migrate_sanctions_json(pool).await?;
    migrate_appeals_json(pool).await?;
    migrate_tiktok_json(pool).await?;
    Ok(())
}

pub async fn run_json_migration(pool: &PgPool) -> Result<()> {
    migrate_json_data(pool).await
}

async fn migrate_sanctions_json(pool: &PgPool) -> Result<()> {
    let Some(path) = resolve_data_file("sanctions.json") else {
        return Ok(());
    };
    let content = std::fs::read_to_string(&path)?;
    if content.trim().is_empty() || content.trim() == "{}" || content.trim() == "[]" {
        return Ok(());
    }

    let parsed: SanctionsFile = serde_json::from_str(&content)?;
    let entries: Vec<(Option<String>, RawSanction)> = match parsed {
        SanctionsFile::Map(map) => map.into_iter().map(|(k, v)| (Some(k), v)).collect(),
        SanctionsFile::List(list) => list.into_iter().map(|v| (None, v)).collect(),
    };

    let mut tx = pool.begin().await?;
    for (key, item) in entries {
        let sanction_id = item
            .sanction_id
            .or(item.id)
            .or_else(|| {
                key.and_then(|k| {
                    if k.len() == 6 {
                        Some(k.to_uppercase())
                    } else {
                        None
                    }
                })
            })
            .unwrap_or_else(|| uuid::Uuid::new_v4().simple().to_string()[..6].to_uppercase());

        let created_at = item
            .created_at
            .as_deref()
            .map(parse_datetime)
            .unwrap_or_else(Utc::now);

        let appealed = item.appealed.unwrap_or(false);

        sqlx::query(INSERT_SANCTION_SQL)
            .bind(sanction_id)
            .bind(item.guild_id)
            .bind(item.user_id)
            .bind(item.mod_id)
            .bind(item.sanction_type)
            .bind(item.duration)
            .bind(item.reason)
            .bind(created_at)
            .bind(appealed)
            .execute(&mut *tx)
            .await?;
    }
    tx.commit().await?;

    Ok(())
}

async fn migrate_appeals_json(pool: &PgPool) -> Result<()> {
    let Some(path) = resolve_data_file("appeals.json") else {
        return Ok(());
    };
    let content = std::fs::read_to_string(&path)?;
    if content.trim().is_empty() || content.trim() == "{}" || content.trim() == "[]" {
        return Ok(());
    }

    let parsed: AppealsFile = serde_json::from_str(&content)?;
    let entries: Vec<(Option<String>, RawAppeal)> = match parsed {
        AppealsFile::Map(map) => map.into_iter().map(|(k, v)| (Some(k), v)).collect(),
        AppealsFile::List(list) => list.into_iter().map(|v| (None, v)).collect(),
    };

    let mut tx = pool.begin().await?;
    for (key, item) in entries {
        let appeal_id = item
            .id
            .or(key)
            .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

        let valid_sanction_id = if let Some(ref sid) = item.sanction_id {
            let exists: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM sanctions WHERE id = $1)")
                .bind(sid)
                .fetch_one(&mut *tx)
                .await
                .unwrap_or(false);
            if exists {
                Some(sid.clone())
            } else {
                None
            }
        } else {
            None
        };

        let arguments = item
            .arguments
            .or(item.reason)
            .unwrap_or_else(|| "Aucun argument renseigné".to_string());

        let status = item.status.unwrap_or_else(|| "pending".to_string());
        let created_at = item
            .created_at
            .as_deref()
            .map(parse_datetime)
            .unwrap_or_else(Utc::now);

        sqlx::query(INSERT_APPEAL_SQL)
            .bind(appeal_id)
            .bind(valid_sanction_id)
            .bind(item.pseudo_mc)
            .bind(arguments)
            .bind(status)
            .bind(created_at)
            .execute(&mut *tx)
            .await?;
    }
    tx.commit().await?;

    Ok(())
}

async fn migrate_tiktok_json(pool: &PgPool) -> Result<()> {
    let Some(path) = resolve_data_file("tiktok_targets.json") else {
        return Ok(());
    };
    let content = std::fs::read_to_string(&path)?;
    if content.trim().is_empty() || content.trim() == "{}" || content.trim() == "[]" {
        return Ok(());
    }

    let parsed: TikTokFile = serde_json::from_str(&content)?;
    let entries: Vec<(Option<String>, RawTikTokTarget)> = match parsed {
        TikTokFile::List(list) => list.into_iter().map(|v| (None, v)).collect(),
        TikTokFile::Map(map) => map.into_iter().map(|(k, v)| (Some(k), v)).collect(),
    };

    let mut tx = pool.begin().await?;
    for (key, item) in entries {
        if item.channel_id <= 0 {
            continue;
        }

        let username = item
            .username
            .or(key)
            .map(|u| u.trim().trim_start_matches('@').to_lowercase());

        let Some(clean_username) = username else {
            continue;
        };
        if clean_username.is_empty() {
            continue;
        }

        let is_live = item.is_live.unwrap_or(false);

        sqlx::query(INSERT_TIKTOK_TARGET_SQL)
            .bind(clean_username)
            .bind(item.channel_id)
            .bind(item.role_id)
            .bind(item.last_video_id)
            .bind(is_live)
            .execute(&mut *tx)
            .await?;
    }
    tx.commit().await?;

    Ok(())
}
