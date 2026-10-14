use sqlx::PgPool;
use std::sync::Arc;
use twilight_http::Client as HttpClient;
use twilight_model::gateway::payload::incoming::{MemberAdd, MemberRemove};
use twilight_model::id::Id;
use twilight_util::builder::embed::EmbedBuilder;
use crate::utils::{COLOR_INFO, COLOR_ERROR, COLOR_SUCCESS};

async fn is_audit_enabled(_db: &PgPool) -> bool {
    crate::modules::enabled("audit")
}

pub async fn handle_member_add(event: Box<MemberAdd>, http: &Arc<HttpClient>, db: &PgPool, log_channel: u64) {
    if is_audit_enabled(db).await {
        let embed = EmbedBuilder::new()
            .title("👋 Nouveau Membre")
            .description(format!("<@{}> a rejoint le serveur.", event.user.id))
            .color(COLOR_SUCCESS)
            .build();
        let _ = http.create_message(crate::modules::message_log::log_channel(log_channel)).embeds(&[embed]).await;
    }

    if !crate::modules::enabled("welcome") {
        return;
    }
    let Some(channel_id) = crate::modules::setting("welcome", "channelId").and_then(|c| c.trim().parse::<u64>().ok()) else {
        return;
    };
    let mut message = crate::modules::setting_value("welcome", "message").unwrap_or_default();
    if let Some(title) = crate::modules::setting("welcome", "title") {
        message = serde_json::json!({
            "title": title,
            "description": crate::modules::setting("welcome", "description"),
            "color": crate::modules::setting("welcome", "color"),
            "image": crate::modules::setting("welcome", "image"),
        });
    }

    let user = &event.user;
    let avatar = match user.avatar {
        Some(hash) => format!("https://cdn.discordapp.com/avatars/{}/{}.png?size=256", user.id, hash),
        None => "https://cdn.discordapp.com/embed/avatars/0.png".to_string(),
    };
    let (server, count) = match http.guild(event.guild_id).with_counts(true).await {
        Ok(res) => match res.model().await {
            Ok(g) => (g.name, g.approximate_member_count.map(|c| c.to_string()).unwrap_or_default()),
            Err(_) => ("Paranoia Studio".to_string(), String::new()),
        },
        Err(_) => ("Paranoia Studio".to_string(), String::new()),
    };
    let vars = [
        ("user", format!("<@{}>", user.id)),
        ("username", user.global_name.clone().unwrap_or_else(|| user.name.clone())),
        ("avatar", avatar),
        ("server", server),
        ("memberCount", count),
    ];

    let (content, embed) = crate::modules::embed::render(&message, &vars);
    if content.is_none() && embed.is_none() {
        return;
    }
    let embeds: Vec<_> = embed.into_iter().collect();
    let mut req = http.create_message(Id::new(channel_id)).embeds(&embeds);
    if let Some(text) = content.as_deref() {
        req = req.content(text);
    }
    let _ = req.await;
}

pub async fn handle_member_remove(event: MemberRemove, http: &Arc<HttpClient>, db: &PgPool, log_channel: u64) {
    if !is_audit_enabled(db).await { return; }
    let embed = EmbedBuilder::new()
        .title("🚪 Départ d'un Membre")
        .description(format!("<@{}> a quitté le serveur.", event.user.id))
        .color(COLOR_ERROR)
        .build();
    let _ = http.create_message(crate::modules::message_log::log_channel(log_channel)).embeds(&[embed]).await;
}

pub async fn handle_voice_state_update(vsu: Box<twilight_model::gateway::payload::incoming::VoiceStateUpdate>, http: &Arc<HttpClient>, db: &PgPool, log_channel: u64) {
    if !is_audit_enabled(db).await { return; }
    if vsu.0.member.as_ref().is_some_and(|m| m.user.bot) { return; }
    let action = match vsu.0.channel_id {
        Some(cid) => format!("s'est connecté / a bougé vers le salon <#{}>", cid),
        None => "s'est déconnecté du vocal".to_string(),
    };
    let embed = EmbedBuilder::new()
        .title("🎙️ Audit Vocal")
        .description(format!("<@{}> {}", vsu.0.user_id, action))
        .color(COLOR_INFO)
        .build();
    let _ = http.create_message(crate::modules::message_log::log_channel(log_channel)).embeds(&[embed]).await;
}
