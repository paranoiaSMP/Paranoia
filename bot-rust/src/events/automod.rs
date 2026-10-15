use sqlx::PgPool;
use std::sync::{Arc, LazyLock};
use std::time::Instant;
use tokio::sync::Mutex;
use twilight_http::Client as HttpClient;
use twilight_model::channel::Message;
use twilight_model::id::marker::{ChannelMarker, UserMarker};
use twilight_model::id::Id;
use twilight_model::util::Timestamp;

use twilight_util::builder::embed::EmbedBuilder;

use crate::config::Config;
use crate::utils::emoji::{AUTHOR, CHANNEL, MESSAGE, SANCTION, TIME, TITLE};
use crate::utils::COLOR_ERROR;
use crate::modules::automod::{
    evaluate_link, evaluate_message_mentions, scan_ocr_text, AntiFloodTracker, FloodAction,
    HttpVisionOcrEngine, LinkVerdict, MentionVerdict, ScamVerdict, ToxicityCategory,
    VisionOcrEngine, DEFAULT_ALLOWED_DOMAINS,
};
use crate::modules::automod::toxicity::classify_toxicity_with_context;
use crate::modules::automod::{detect_dox, find_badword};

static FLOOD_TRACKER: LazyLock<Mutex<AntiFloodTracker>> =
    LazyLock::new(|| Mutex::new(AntiFloodTracker::default_production()));

static OCR_ENGINE: LazyLock<HttpVisionOcrEngine> =
    LazyLock::new(HttpVisionOcrEngine::default);

/// Analyse le message; chaque infraction ajoute 1 point d'escalade.
pub async fn check_message(
    msg: &Message,
    http: &Arc<HttpClient>,
    db: &PgPool,
    audit_channel: Option<u64>,
) -> bool {
    let hit = scan_message(msg, http, audit_channel).await;
    if hit {
        if let Some(guild) = msg.guild_id {
            escalate(db, http, guild, msg.author.id, msg.channel_id, "Infraction automod").await;
        }
    }
    hit
}

/// Ghost ping : message avec mention supprimé par son auteur peu après l'envoi.
pub async fn on_ghost_ping(
    db: &PgPool,
    http: &Arc<HttpClient>,
    guild: Id<twilight_model::id::marker::GuildMarker>,
    author: Id<UserMarker>,
    channel: Id<ChannelMarker>,
) {
    alert(http, channel, author, "", "Ghost ping", None, "Avertissement + 1 point d'escalade").await;
    escalate(db, http, guild, author, channel, "Ghost ping").await;
}

async fn escalate(
    db: &PgPool,
    http: &Arc<HttpClient>,
    guild: Id<twilight_model::id::marker::GuildMarker>,
    user: Id<UserMarker>,
    channel: Id<ChannelMarker>,
    reason: &str,
) {
    if let Some(mute) = crate::modules::automod::escalation::add_strike(db, http, guild, user, 1.0, reason).await {
        alert(http, channel, user, "", "Escalade de sanctions", None, &format!("Timeout {} min", mute.num_minutes())).await;
    }
}

async fn scan_message(
    msg: &Message,
    http: &Arc<HttpClient>,
    audit_channel: Option<u64>,
) -> bool {
    let author_roles: Vec<u64> = msg
        .member
        .as_ref()
        .map(|m| m.roles.iter().map(|r| r.get()).collect())
        .unwrap_or_default();
    let staff_role_id = Config::DEFAULT_ROLE_STAFF_ID;
    let is_staff = author_roles.contains(&staff_role_id);

    // 1. Anti-Unauthorized Mentions Guard
    if !is_staff {
        let protected_roles = [Config::DEFAULT_ROLE_STAFF_ID, Config::DEFAULT_ROLE_VIDEASTE_ID];
        let mention_verdict =
            evaluate_message_mentions(msg, &author_roles, staff_role_id, &protected_roles);

        match mention_verdict {
            MentionVerdict::UnauthorizedEveryone => {
                let _ = http.delete_message(msg.channel_id, msg.id).await;
                if let Some(guild_id) = msg.guild_id {
                    let timeout_until = chrono::Utc::now() + chrono::Duration::minutes(10);
                    if let Ok(ts) = Timestamp::from_secs(timeout_until.timestamp()) {
                        let _ = http
                            .update_guild_member(guild_id, msg.author.id)
                            .communication_disabled_until(Some(ts))
                            .await;
                    }
                }
                alert_msg(http, msg, "Mention @everyone / @here", Some(&msg.content), "Message supprimé + Timeout 10 min").await;
                log_audit_alert(
                    http,
                    audit_channel,
                    msg.author.id,
                    msg.channel_id,
                    "Mention @everyone/@here non autorisée",
                    &msg.content,
                )
                .await;
                return true;
            }
            MentionVerdict::UnauthorizedProtectedRole { role_id } => {
                let _ = http.delete_message(msg.channel_id, msg.id).await;
                alert_msg(http, msg, "Rôle protégé mentionné", Some(&msg.content), "Message supprimé").await;
                log_audit_alert(
                    http,
                    audit_channel,
                    msg.author.id,
                    msg.channel_id,
                    "Mention d'un rôle protégé",
                    &format!("Rôle: {}", role_id),
                )
                .await;
                return true;
            }
            MentionVerdict::UnauthorizedMassMention { count } => {
                let _ = http.delete_message(msg.channel_id, msg.id).await;
                if let Some(guild_id) = msg.guild_id {
                    let timeout_until = chrono::Utc::now() + chrono::Duration::minutes(5);
                    if let Ok(ts) = Timestamp::from_secs(timeout_until.timestamp()) {
                        let _ = http
                            .update_guild_member(guild_id, msg.author.id)
                            .communication_disabled_until(Some(ts))
                            .await;
                    }
                }
                alert_msg(http, msg, "Mentions de masse", Some(&msg.content), "Message supprimé + Timeout 5 min").await;
                log_audit_alert(
                    http,
                    audit_channel,
                    msg.author.id,
                    msg.channel_id,
                    "Mentions de masse abusives",
                    &format!("Nombre: {}", count),
                )
                .await;
                return true;
            }
            MentionVerdict::Allow => {}
        }
    }

    // 2. Link & Phishing Interception
    let link_verdict = evaluate_link(&msg.content, DEFAULT_ALLOWED_DOMAINS, &["paranoia"]);
    match link_verdict {
        LinkVerdict::Phishing { domain } => {
            let _ = http.delete_message(msg.channel_id, msg.id).await;
            if let Some(guild_id) = msg.guild_id {
                let timeout_until = chrono::Utc::now() + chrono::Duration::hours(24);
                if let Ok(ts) = Timestamp::from_secs(timeout_until.timestamp()) {
                    let _ = http
                        .update_guild_member(guild_id, msg.author.id)
                        .communication_disabled_until(Some(ts))
                        .await;
                }
            }
            alert_msg(http, msg, "Lien de phishing", None, "Message supprimé + Timeout 24 h").await;
            log_audit_alert(
                http,
                audit_channel,
                msg.author.id,
                msg.channel_id,
                "Lien de phishing / Typosquatting",
                &domain,
            )
            .await;
            return true;
        }
        LinkVerdict::UnauthorizedInvite { code } => {
            let _ = http.delete_message(msg.channel_id, msg.id).await;
            alert_msg(http, msg, "Invitation Discord non autorisée", None, "Message supprimé").await;
            log_audit_alert(
                http,
                audit_channel,
                msg.author.id,
                msg.channel_id,
                "Invitation Discord non autorisée",
                &format!("Code: {}", code),
            )
            .await;
            return true;
        }
        LinkVerdict::Allowed => {}
    }

    // 3. Sliding-Window Burst Anti-Flood
    if !is_staff {
        let flood_action = {
            let mut tracker = FLOOD_TRACKER.lock().await;
            tracker.record_and_evaluate(msg.author.id, msg.id, &msg.content, Instant::now())
        };

        match flood_action {
            FloodAction::PurgeAndTimeout {
                message_ids,
                duration_seconds,
            } => {
                if message_ids.len() > 1 {
                    if http
                        .delete_messages(msg.channel_id, &message_ids)
                        .await
                        .is_err()
                    {
                        for &id in &message_ids {
                            let _ = http.delete_message(msg.channel_id, id).await;
                        }
                    }
                } else {
                    let _ = http.delete_message(msg.channel_id, msg.id).await;
                }

                if let Some(guild_id) = msg.guild_id {
                    let timeout_until =
                        chrono::Utc::now() + chrono::Duration::seconds(duration_seconds as i64);
                    if let Ok(ts) = Timestamp::from_secs(timeout_until.timestamp()) {
                        let _ = http
                            .update_guild_member(guild_id, msg.author.id)
                            .communication_disabled_until(Some(ts))
                            .await;
                    }
                }

                alert_msg(http, msg, "Anti-flood", Some(&msg.content), &format!("Messages purgés + Timeout {} min", duration_seconds / 60)).await;
                log_audit_alert(
                    http,
                    audit_channel,
                    msg.author.id,
                    msg.channel_id,
                    "Anti-Flood (Rafale de messages / Répétition)",
                    &format!("{} messages purgés", message_ids.len()),
                )
                .await;
                return true;
            }
            FloodAction::Allow => {}
        }
    }

    // 4. Media & OCR Scam Screenshot Detection
    for attachment in &msg.attachments {
        let filename_lower = attachment.filename.to_lowercase();
        let is_image = attachment
            .content_type
            .as_deref()
            .map(|ct| ct.starts_with("image/"))
            .unwrap_or(false)
            || filename_lower.ends_with(".png")
            || filename_lower.ends_with(".jpg")
            || filename_lower.ends_with(".jpeg")
            || filename_lower.ends_with(".webp");

        if is_image {
            if let Ok(extracted_text) = OCR_ENGINE.scan_image(&attachment.url).await {
                let scam_verdict = scan_ocr_text(&extracted_text);
                match scam_verdict {
                    ScamVerdict::CryptoCasinoScam { reason, confidence } => {
                        let _ = http.delete_message(msg.channel_id, msg.id).await;
                        if let Some(guild_id) = msg.guild_id {
                            let timeout_until = chrono::Utc::now() + chrono::Duration::hours(1);
                            if let Ok(ts) = Timestamp::from_secs(timeout_until.timestamp()) {
                                let _ = http
                                    .update_guild_member(guild_id, msg.author.id)
                                    .communication_disabled_until(Some(ts))
                                    .await;
                            }
                        }
                        alert_msg(http, msg, &format!("Capture scam ({reason})"), None, "Message supprimé + Timeout 1 h").await;
                        log_audit_alert(
                            http,
                            audit_channel,
                            msg.author.id,
                            msg.channel_id,
                            "Capture d'écran Scam / Crypto / Casino",
                            &format!("{} (confiance: {:.0}%)", reason, confidence * 100.0),
                        )
                        .await;
                        return true;
                    }
                    ScamVerdict::Clean => {}
                }

                // Check for phishing links disguised inside OCR image text
                let ocr_link_verdict =
                    evaluate_link(&extracted_text, DEFAULT_ALLOWED_DOMAINS, &["paranoia"]);
                if let LinkVerdict::Phishing { domain } = ocr_link_verdict {
                    let _ = http.delete_message(msg.channel_id, msg.id).await;
                    if let Some(guild_id) = msg.guild_id {
                        let timeout_until = chrono::Utc::now() + chrono::Duration::hours(24);
                        if let Ok(ts) = Timestamp::from_secs(timeout_until.timestamp()) {
                            let _ = http
                                .update_guild_member(guild_id, msg.author.id)
                                .communication_disabled_until(Some(ts))
                                .await;
                        }
                    }
                    alert_msg(http, msg, "Phishing dans une image", None, "Message supprimé + Timeout 24 h").await;
                    log_audit_alert(
                        http,
                        audit_channel,
                        msg.author.id,
                        msg.channel_id,
                        "Phishing dans image",
                        &domain,
                    )
                    .await;
                    return true;
                }
            }
        }
    }

    // 4b. Anti-dox (IP publique, email, carte bancaire, adresse crypto)
    if !is_staff {
        if let Some(kind) = detect_dox(&msg.content) {
            let _ = http.delete_message(msg.channel_id, msg.id).await;
            alert_msg(http, msg, &format!("Données personnelles ({})", kind.label()), None, "Message supprimé").await;
            // Le contenu n'est pas recopié dans l'audit : ce serait republier la donnée.
            log_audit_alert(http, audit_channel, msg.author.id, msg.channel_id, "Anti-dox", kind.label()).await;
            return true;
        }
    }

    // 4c. Mots interdits (liste fixe, hors contexte)
    if !is_staff {
        if let Some(word) = find_badword(&msg.content) {
            let _ = http.delete_message(msg.channel_id, msg.id).await;
            alert_msg(http, msg, "Langage interdit", Some(&format!("||{}||", msg.content)), "Message supprimé").await;
            log_audit_alert(http, audit_channel, msg.author.id, msg.channel_id, "Mot interdit", &format!("||{word}||")).await;
            return true;
        }
    }

    // 5. Contextual Anti-Toxicity & Caps Detection
    let content = &msg.content;
    if content.is_empty() {
        return false;
    }

    let mentions: Vec<_> = msg.mentions.iter().map(|m| m.id).collect();
    let is_reply = msg.referenced_message.is_some();
    let verdict = classify_toxicity_with_context(content, &mentions, is_reply);

    let uppercase_count = content.chars().filter(|c| c.is_uppercase()).count();
    let total_chars = content.chars().filter(|c| c.is_alphabetic()).count();
    let has_too_much_caps = total_chars > 10 && (uppercase_count as f32 / total_chars as f32) > 0.7;

    if verdict.is_toxic || has_too_much_caps {
        let _ = http.delete_message(msg.channel_id, msg.id).await;

        let reason = if verdict.is_toxic {
            match verdict.category {
                ToxicityCategory::SevereToxicity => "Toxicité sévère / Propos haineux",
                _ => "Langage toxique / Harcèlement ciblé",
            }
        } else {
            "Trop de majuscules"
        };

        if verdict.category == ToxicityCategory::SevereToxicity {
            if let Some(guild_id) = msg.guild_id {
                let timeout_until = chrono::Utc::now() + chrono::Duration::hours(2);
                if let Ok(ts) = Timestamp::from_secs(timeout_until.timestamp()) {
                    let _ = http
                        .update_guild_member(guild_id, msg.author.id)
                        .communication_disabled_until(Some(ts))
                        .await;
                }
            }
        }

        alert_msg(http, msg, reason, Some(&msg.content), if verdict.category == ToxicityCategory::SevereToxicity { "Message supprimé + Timeout 2 h" } else { "Message supprimé" }).await;

        log_audit_alert(
            http,
            audit_channel,
            msg.author.id,
            msg.channel_id,
            reason,
            &format!("score: {:.2} | ||{}||", verdict.score, msg.content),
        )
        .await;
        return true;
    }

    false
}

async fn send_embed(http: &HttpClient, channel: Id<ChannelMarker>, title: &str, description: &str) {
    let embed = EmbedBuilder::new().description(format!("## {title}\n\n{description}")).color(COLOR_ERROR).build();
    let _ = http.create_message(channel).embeds(&[embed]).await;
}

fn code(text: &str) -> String {
    format!("`{}`", text.replace('`', "'"))
}

/// Alerte d'automod : titre = type d'infraction, puis auteur, salon, message, sanction et date relative.
fn alert_body(channel: Id<ChannelMarker>, author: Id<UserMarker>, name: &str, content: Option<&str>, sanction: &str) -> String {
    let who = if name.is_empty() { format!("<@{author}> ({})", code(&author.to_string())) } else { format!("<@{author}> {} ({})", code(name), code(&author.to_string())) };
    let mut lines = vec![format!("{AUTHOR} | **Auteur :** {who}"), format!("{CHANNEL} | **Salon :** <#{channel}>")];
    if let Some(c) = content.filter(|c| !c.trim().is_empty()) {
        let shown: String = c.chars().take(300).collect();
        // Un message déjà en spoiler (||…||) reste tel quel : un spoiler ne fonctionne pas dans un bloc de code.
        let shown = if shown.starts_with("||") { shown } else { code(&shown) };
        lines.push(format!("{MESSAGE} | **Message :** {shown}"));
    }
    let now = chrono::Utc::now().timestamp();
    lines.push(format!("{SANCTION} | **Sanction appliquée :** {}", code(sanction)));
    lines.push(format!("{TIME} | **Détecté :** <t:{now}:F> (<t:{now}:R>)"));
    lines.join("\n\n")
}

async fn alert(
    http: &HttpClient,
    channel: Id<ChannelMarker>,
    author: Id<UserMarker>,
    name: &str,
    title: &str,
    content: Option<&str>,
    sanction: &str,
) {
    send_embed(http, channel, &format!("{TITLE} | {title}"), &alert_body(channel, author, name, content, sanction)).await;
}

async fn alert_msg(http: &HttpClient, msg: &Message, title: &str, content: Option<&str>, sanction: &str) {
    alert(http, msg.channel_id, msg.author.id, &msg.author.name, title, content, sanction).await;
}

async fn log_audit_alert(
    http: &HttpClient,
    audit_channel: Option<u64>,
    user_id: Id<UserMarker>,
    channel_id: Id<ChannelMarker>,
    reason: &str,
    detail: &str,
) {
    if !crate::modules::enabled("audit") {
        return;
    }
    if let Some(log_ch) = audit_channel {
        let body = alert_body(channel_id, user_id, "", Some(detail), "Message supprimé");
        send_embed(http, Id::new(log_ch), &format!("{TITLE} | {reason}"), &body).await;
    }
}
