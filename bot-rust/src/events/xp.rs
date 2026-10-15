use rand::Rng;
use sqlx::{PgPool, Row};
use std::collections::HashMap;
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant};
use twilight_http::Client as HttpClient;
use twilight_model::channel::Message;
use twilight_model::id::Id;

use crate::commands::levels::level_of;
use crate::modules::{embed, setting, setting_number, setting_value};

const ID: &str = "xp";

fn last_gain() -> &'static Mutex<HashMap<u64, Instant>> {
    static M: OnceLock<Mutex<HashMap<u64, Instant>>> = OnceLock::new();
    M.get_or_init(|| Mutex::new(HashMap::new()))
}

pub async fn give_xp(msg: &Message, http: &Arc<HttpClient>, db: &PgPool) {
    let cooldown = Duration::from_secs(setting_number(ID, "cooldownSeconds", 60).clamp(0, 3600) as u64);
    {
        let mut map = last_gain().lock().unwrap();
        let now = Instant::now();
        if map.get(&msg.author.id.get()).is_some_and(|t| now.duration_since(*t) < cooldown) {
            return;
        }
        map.insert(msg.author.id.get(), now);
        if map.len() > 50_000 {
            map.retain(|_, t| now.duration_since(*t) < cooldown);
        }
    }

    let gain: i32 = rand::thread_rng().gen_range(5..=15);
    add_xp(http, db, &msg.author, gain, msg.guild_id, Some(msg.channel_id)).await;
}

pub async fn add_xp(
    http: &Arc<HttpClient>,
    db: &PgPool,
    user: &twilight_model::user::User,
    gain: i32,
    guild_id: Option<Id<twilight_model::id::marker::GuildMarker>>,
    fallback_channel: Option<Id<twilight_model::id::marker::ChannelMarker>>,
) {
    let row = sqlx::query(r#"UPDATE "User" SET xp = xp + $1 WHERE "discordId" = $2 RETURNING xp, level"#)
        .bind(gain)
        .bind(user.id.to_string())
        .fetch_optional(db)
        .await;
    let Ok(Some(row)) = row else { return };

    let xp: i32 = row.try_get("xp").unwrap_or(0);
    let stored: i32 = row.try_get("level").unwrap_or(1);
    let (level, _, _) = level_of(xp as i64);
    if level <= stored as i64 {
        return;
    }
    let _ = sqlx::query(r#"UPDATE "User" SET level = $1 WHERE "discordId" = $2"#)
        .bind(level as i32)
        .bind(user.id.to_string())
        .execute(db)
        .await;

    let avatar = match user.avatar {
        Some(hash) => format!("https://cdn.discordapp.com/avatars/{}/{}.png?size=256", user.id, hash),
        None => "https://cdn.discordapp.com/embed/avatars/0.png".to_string(),
    };
    let username = user.global_name.clone().unwrap_or_else(|| user.name.clone());
    let vars = [
        ("user", format!("<@{}>", user.id)),
        ("username", username.clone()),
        ("avatar", avatar.clone()),
        ("level", level.to_string()),
    ];
    let channel = setting(ID, "levelUpChannelId").and_then(|c| c.trim().parse::<u64>().ok()).map(Id::new).or(fallback_channel);
    if let (Some(channel), Some(template)) = (channel, setting_value(ID, "levelUpMessage")) {
        let (content, mut embed) = embed::render(&template, &vars);
        let card = match embed.is_some() && setting(ID, "cardEnabled").as_deref() != Some("no") {
            true => {
                let (_, into, need) = level_of(xp as i64);
                crate::modules::welcome_image::generate_rank(&avatar, setting(ID, "cardBackground").as_deref(), crate::modules::welcome_image::RankStyle {
                    name: username,
                    level: level as i64,
                    rank: None,
                    into,
                    need,
                    color_a: setting(ID, "cardColorA").unwrap_or_default(),
                    color_b: setting(ID, "cardColorB").unwrap_or_default(),
                })
                .await
            }
            false => None,
        };
        if let (Some(e), Some(_)) = (embed.as_mut(), &card) {
            e.image = Some(twilight_model::channel::message::embed::EmbedImage { height: None, proxy_url: None, url: "attachment://niveau.png".into(), width: None });
        }
        let embeds: Vec<_> = embed.into_iter().collect();
        let files: Vec<_> = card.into_iter().map(|b| twilight_model::http::attachment::Attachment::from_bytes("niveau.png".into(), b, 1)).collect();
        if content.is_some() || !embeds.is_empty() {
            let mut req = http.create_message(channel).embeds(&embeds);
            if let Some(text) = content.as_deref() {
                req = req.content(text);
            }
            if !files.is_empty() {
                req = req.attachments(&files);
            }
            if let Err(e) = req.await {
                tracing::warn!("Montée de niveau : envoi impossible : {e}");
            }
        }
    }

    if let Some(guild_id) = guild_id {
        for line in setting(ID, "roleRewards").unwrap_or_default().lines() {
            let Some((lvl, role)) = line.split_once('=') else { continue };
            let (Ok(lvl), Ok(role)) = (lvl.trim().parse::<i64>(), role.trim().parse::<u64>()) else { continue };
            if lvl <= level && lvl > stored as i64 {
                let _ = http.add_guild_member_role(guild_id, user.id, Id::new(role)).await;
            }
        }
    }
}
