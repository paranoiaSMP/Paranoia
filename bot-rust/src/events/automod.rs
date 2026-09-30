use sqlx::{PgPool, Row};
use std::sync::Arc;
use twilight_http::Client as HttpClient;
use twilight_model::channel::Message;

const BAD_WORDS: &[&str] = &["fdp", "connard", "salope", "tg", "ta gueule", "pute", "ntm", "negre"];

pub async fn check_message(
    msg: &Message,
    http: &Arc<HttpClient>,
    db: &PgPool,
    audit_channel: Option<u64>
) -> bool {
    let row = sqlx::query(r#"SELECT "moduleAutoMod", "moduleAuditLogs" FROM "GuildConfig" WHERE "guildId" = 'default'"#)
        .fetch_optional(db).await.unwrap_or(None);

    let (auto_mod, audit_logs) = if let Some(r) = row {
        (r.try_get("moduleAutoMod").unwrap_or(false), r.try_get("moduleAuditLogs").unwrap_or(false))
    } else {
        (false, false)
    };

    if !auto_mod { return false; }

    let content = &msg.content;
    if content.is_empty() { return false; }

    let content_lower = content.to_lowercase();
    
    // 1. Bad words
    let has_bad_word = BAD_WORDS.iter().any(|&w| content_lower.contains(w));

    // 2. Anti-Caps (More than 70% uppercase and message > 10 chars)
    let uppercase_count = content.chars().filter(|c| c.is_uppercase()).count();
    let total_chars = content.chars().filter(|c| c.is_alphabetic()).count();
    let has_too_much_caps = total_chars > 10 && (uppercase_count as f32 / total_chars as f32) > 0.7;

    if has_bad_word || has_too_much_caps {
        let _ = http.delete_message(msg.channel_id, msg.id).await;
        
        let reason = if has_bad_word { "Langage inapproprié" } else { "Trop de majuscules" };
        let warning = format!("<@{}> Attention ! Ton message a été supprimé. Motif: {}", msg.author.id, reason);
        let _ = http.create_message(msg.channel_id).content(&warning).await;

        if audit_logs {
            if let Some(log_ch) = audit_channel {
                let log_msg = format!("🚨 **Auto-Mod**: Message supprimé de <@{}> dans <#{}> ({}): ||{}||", msg.author.id, msg.channel_id, reason, msg.content);
                let _ = http.create_message(twilight_model::id::Id::new(log_ch)).content(&log_msg).await;
            }
        }
        return true;
    }

    false
}
