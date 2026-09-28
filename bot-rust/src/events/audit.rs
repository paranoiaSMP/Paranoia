use sqlx::{PgPool, Row};
use std::sync::Arc;
use twilight_http::Client as HttpClient;
use twilight_model::gateway::payload::incoming::{MessageUpdate, MessageDelete, MemberAdd, MemberRemove};
use twilight_model::id::Id;
use twilight_util::builder::embed::{EmbedBuilder, ImageSource};
use crate::utils::{COLOR_INFO, COLOR_ERROR, COLOR_SUCCESS};

async fn is_audit_enabled(db: &PgPool) -> bool {
    sqlx::query(r#"SELECT "moduleAuditLogs" FROM "GuildConfig" WHERE "guildId" = 'default'"#)
        .fetch_optional(db)
        .await
        .map(|r| r.map(|row| row.try_get("moduleAuditLogs").unwrap_or(false)).unwrap_or(false))
        .unwrap_or(false)
}

pub async fn handle_message_update(event: Box<MessageUpdate>, http: &Arc<HttpClient>, db: &PgPool, log_channel: u64) {
    if !is_audit_enabled(db).await { return; }
    let embed = EmbedBuilder::new()
        .title("📝 Message Modifié")
        .description(format!("**Salon:** <#{}>\n**Message ID:** {}", event.channel_id, event.id))
        .color(COLOR_INFO)
        .build();
    let _ = http.create_message(Id::new(log_channel)).embeds(&[embed]).await;
}

pub async fn handle_message_delete(event: MessageDelete, http: &Arc<HttpClient>, db: &PgPool, log_channel: u64) {
    if !is_audit_enabled(db).await { return; }
    let embed = EmbedBuilder::new()
        .title("🗑️ Message Supprimé")
        .description(format!("**Salon:** <#{}>\n**Message ID:** {}", event.channel_id, event.id))
        .color(COLOR_ERROR)
        .build();
    let _ = http.create_message(Id::new(log_channel)).embeds(&[embed]).await;
}

pub async fn handle_member_add(event: Box<MemberAdd>, http: &Arc<HttpClient>, db: &PgPool, log_channel: u64) {
    // Audit Log
    if is_audit_enabled(db).await {
        let embed = EmbedBuilder::new()
            .title("👋 Nouveau Membre")
            .description(format!("<@{}> a rejoint le serveur.", event.user.id))
            .color(COLOR_SUCCESS)
            .build();
        let _ = http.create_message(Id::new(log_channel)).embeds(&[embed]).await;
    }

    // Custom Welcome Message
    if let Ok(Some(row)) = sqlx::query(r#"SELECT "moduleWelcome", "welcomeChannelId", "welcomeTitle", "welcomeDesc", "welcomeColor", "welcomeImage" FROM "GuildConfig" WHERE "guildId" = 'default'"#).fetch_optional(db).await {
        let module_welcome: bool = row.try_get("moduleWelcome").unwrap_or(false);
        if !module_welcome { return; }

        if let Ok(channel_str) = row.try_get::<String, _>("welcomeChannelId") {
            if let Ok(channel_id) = channel_str.parse::<u64>() {
                let title: String = row.try_get("welcomeTitle").unwrap_or_else(|_| "Bienvenue !".to_string());
                let mut desc: String = row.try_get("welcomeDesc").unwrap_or_else(|_| "Salut {user} !".to_string());
                let color_str: String = row.try_get("welcomeColor").unwrap_or_else(|_| "#a855f7".to_string());
                let image: Option<String> = row.try_get("welcomeImage").ok();

                desc = desc.replace("{user}", &format!("<@{}>", event.user.id));
                desc = desc.replace("{server}", "Paranoia SMP");
                let title = title.replace("{user}", &event.user.name);

                let color_val = u32::from_str_radix(color_str.trim_start_matches('#'), 16).unwrap_or(0xa855f7);

                let mut embed = EmbedBuilder::new()
                    .title(title)
                    .description(desc)
                    .color(color_val);

                if let Some(img_url) = image {
                    if !img_url.trim().is_empty() {
                        if let Ok(source) = ImageSource::url(img_url) {
                            embed = embed.image(source);
                        }
                    }
                }

                let _ = http.create_message(Id::new(channel_id)).embeds(&[embed.build()]).await;
            }
        }
    }
}

pub async fn handle_member_remove(event: MemberRemove, http: &Arc<HttpClient>, db: &PgPool, log_channel: u64) {
    if !is_audit_enabled(db).await { return; }
    let embed = EmbedBuilder::new()
        .title("🚪 Départ d'un Membre")
        .description(format!("<@{}> a quitté le serveur.", event.user.id))
        .color(COLOR_ERROR)
        .build();
    let _ = http.create_message(Id::new(log_channel)).embeds(&[embed]).await;
}

pub async fn handle_voice_state_update(vsu: Box<twilight_model::gateway::payload::incoming::VoiceStateUpdate>, http: &Arc<HttpClient>, db: &PgPool, log_channel: u64) {
    if !is_audit_enabled(db).await { return; }
    let action = match vsu.0.channel_id {
        Some(cid) => format!("s'est connecté / a bougé vers le salon <#{}>", cid),
        None => "s'est déconnecté du vocal".to_string(),
    };
    let embed = EmbedBuilder::new()
        .title("🎙️ Audit Vocal")
        .description(format!("<@{}> {}", vsu.0.user_id, action))
        .color(COLOR_INFO)
        .build();
    let _ = http.create_message(Id::new(log_channel)).embeds(&[embed]).await;
}
