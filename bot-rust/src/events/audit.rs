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

/// « 5 ans », « 3 mois » ou « 12 jours » à partir de la date de création du compte (snowflake Discord).
fn account_age(created_secs: i64, now_secs: i64) -> String {
    let days = ((now_secs - created_secs) / 86_400).max(0);
    match days {
        d if d >= 365 => format!("{} an{}", d / 365, if d / 365 > 1 { "s" } else { "" }),
        d if d >= 30 => format!("{} mois", d / 30),
        d => format!("{d} jour{}", if d > 1 { "s" } else { "" }),
    }
}

pub async fn handle_member_add(event: Box<MemberAdd>, http: &Arc<HttpClient>, db: &PgPool, log_channel: u64) {
    let user = &event.user;
    let avatar = match user.avatar {
        Some(hash) => format!("https://cdn.discordapp.com/avatars/{}/{}.png?size=256", user.id, hash),
        None => "https://cdn.discordapp.com/embed/avatars/0.png".to_string(),
    };
    let (server, count) = match http.guild(event.guild_id).with_counts(true).await {
        Ok(res) => match res.model().await {
            Ok(g) => (g.name, g.approximate_member_count),
            Err(_) => ("Paranoia Studio".to_string(), None),
        },
        Err(_) => ("Paranoia Studio".to_string(), None),
    };
    let invite = crate::modules::invites::on_join(http, event.guild_id).await;

    if is_audit_enabled(db).await {
        let created = (user.id.get() >> 22) as i64 / 1000 + 1_420_070_400;
        let invite_line = match &invite {
            Some(i) => format!(
                "`{}`{} · {} utilisation{}",
                i.code,
                i.inviter.map(|u| format!(" de <@{u}>")).unwrap_or_default(),
                i.uses,
                if i.uses > 1 { "s" } else { "" }
            ),
            None => "Inconnue (lien à usage unique, vanity ou permission manquante)".to_string(),
        };
        let body = [
            format!("{} | **Membre :** <@{}> (`{}`)", crate::utils::emoji::AUTHOR, user.id, user.name),
            format!("{} | **Compte créé :** <t:{created}:D> ({})", crate::utils::emoji::TIME, account_age(created, chrono::Utc::now().timestamp())),
            format!("{} | **Invitation :** {invite_line}", crate::utils::emoji::MESSAGE),
            format!("{} | **Membres :** {}", crate::utils::emoji::STATS, count.map(|c| c.to_string()).unwrap_or_else(|| "?".into())),
        ];
        let mut embed = EmbedBuilder::new()
            .description(format!("## {} | Membre arrivé\n\n{}", crate::utils::emoji::OK, body.join("\n\n")))
            .color(COLOR_SUCCESS);
        if let Ok(img) = twilight_util::builder::embed::ImageSource::url(&avatar) {
            embed = embed.thumbnail(img);
        }
        let _ = http.create_message(crate::modules::message_log::log_channel(log_channel)).embeds(&[embed.build()]).await;
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

    let username = user.global_name.clone().unwrap_or_else(|| user.name.clone());
    let vars = [
        ("user", format!("<@{}>", user.id)),
        ("username", username.clone()),
        ("avatar", avatar.clone()),
        ("server", server),
        ("memberCount", count.map(|c| c.to_string()).unwrap_or_default()),
    ];

    let (content, mut embed) = crate::modules::embed::render(&message, &vars);
    if content.is_none() && embed.is_none() {
        return;
    }

    // Carte générée, jointe au message : en cas d'échec on envoie le message sans image.
    let image = if embed.is_some() && crate::modules::setting("welcome", "imageEnabled").as_deref() != Some("no") {
        let get = |k: &str| crate::modules::embed::fill(&crate::modules::setting("welcome", k).unwrap_or_default(), &vars);
        let style = crate::modules::welcome_image::Style {
            title: get("imageTitle"),
            name: username,
            subtitle: get("imageSubtitle"),
            color_a: get("imageColorA"),
            color_b: get("imageColorB"),
        };
        let bg = crate::modules::setting("welcome", "imageBackground");
        let png = crate::modules::welcome_image::generate(&avatar, bg.as_deref(), style).await;
        if png.is_none() {
            tracing::warn!("Bienvenue : génération de l'image impossible");
        }
        png
    } else {
        None
    };
    if let (Some(e), Some(_)) = (embed.as_mut(), &image) {
        e.image = Some(twilight_model::channel::message::embed::EmbedImage {
            height: None,
            proxy_url: None,
            url: "attachment://bienvenue.png".into(),
            width: None,
        });
    }

    let embeds: Vec<_> = embed.into_iter().collect();
    let files: Vec<_> = image.into_iter().map(|b| twilight_model::http::attachment::Attachment::from_bytes("bienvenue.png".into(), b, 1)).collect();
    let mut req = http.create_message(Id::new(channel_id)).embeds(&embeds);
    if let Some(text) = content.as_deref() {
        req = req.content(text);
    }
    if !files.is_empty() {
        req = req.attachments(&files);
    }
    if let Err(e) = req.await {
        tracing::warn!("Bienvenue : envoi impossible : {e}");
    }
}

pub async fn handle_member_remove(event: MemberRemove, http: &Arc<HttpClient>, db: &PgPool, log_channel: u64) {
    if !is_audit_enabled(db).await { return; }
    let embed = EmbedBuilder::new()
        .description(format!("{}\n\n{}", format!("## {} | Départ d'un Membre", crate::utils::emoji::AUTHOR), format!("<@{}> a quitté le serveur.", event.user.id)))
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
        .description(format!("{}\n\n{}", format!("## {} | Audit Vocal", crate::utils::emoji::UTILS), format!("<@{}> {}", vsu.0.user_id, action)))
        .color(COLOR_INFO)
        .build();
    let _ = http.create_message(crate::modules::message_log::log_channel(log_channel)).embeds(&[embed]).await;
}

#[cfg(test)]
mod tests {
    use super::account_age;

    #[test]
    fn account_age_picks_the_right_unit() {
        let day = 86_400;
        assert_eq!(account_age(0, 400 * day), "1 an");
        assert_eq!(account_age(0, 5 * 365 * day), "5 ans");
        assert_eq!(account_age(0, 65 * day), "2 mois");
        assert_eq!(account_age(0, day), "1 jour");
    }
}
