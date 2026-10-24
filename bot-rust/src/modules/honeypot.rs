use std::sync::Arc;

use twilight_http::{request::AuditLogReason, Client as HttpClient};
use twilight_model::{channel::Message, id::Id};
use twilight_util::builder::embed::EmbedBuilder;

use crate::modules::{enabled, setting};

pub const ID: &str = "honeypot";

/// Salon piège : tout message d'un non-staff y est sanctionné. Renvoie true si le message a été traité.
pub async fn on_message(msg: &Message, http: &Arc<HttpClient>, staff_role: u64, fallback_log: u64) -> bool {
    if !enabled(ID) {
        return false;
    }
    let (Some(guild), Some(trap)) = (msg.guild_id, setting(ID, "channelId").and_then(|c| c.trim().parse::<u64>().ok())) else {
        return false;
    };
    if msg.channel_id.get() != trap || msg.member.as_ref().is_some_and(|m| m.roles.iter().any(|r| r.get() == staff_role)) {
        return false;
    }

    let _ = http.delete_message(msg.channel_id, msg.id).await;
    let kick = setting(ID, "action").as_deref() == Some("kick");
    let reason = "Honeypot : message dans le salon piège";
    let done = if kick {
        http.remove_guild_member(guild, msg.author.id).reason(reason).await.is_ok()
    } else {
        // Efface aussi l'heure de messages précédente (spam de bot compromis).
        http.create_ban(guild, msg.author.id).delete_message_seconds(3600).reason(reason).await.is_ok()
    };

    let log = setting(ID, "logChannelId").and_then(|c| c.trim().parse::<u64>().ok()).unwrap_or(fallback_log);
    if log != 0 {
        let embed = EmbedBuilder::new()
            .description(format!(
                "## {} | Honeypot\n\n<@{}> a écrit dans <#{trap}>.\n**Action** : {}",
                crate::utils::emoji::SETTINGS,
                msg.author.id,
                match (done, kick) {
                    (true, true) => "expulsé",
                    (true, false) => "banni",
                    _ => "échec (mon rôle est-il au-dessus du sien ?)",
                }
            ))
            .color(0xef4444)
            .build();
        let _ = http.create_message(Id::new(log)).embeds(&[embed]).await;
    }
    true
}
