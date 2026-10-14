use std::collections::VecDeque;
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant};

use twilight_http::{request::AuditLogReason, Client as HttpClient};
use twilight_model::application::command::Command;
use twilight_model::application::interaction::{application_command::CommandOptionValue, Interaction, InteractionData};
use twilight_model::channel::message::MessageFlags;
use twilight_model::guild::{Permissions, VerificationLevel};
use twilight_model::gateway::payload::incoming::MemberAdd;
use twilight_model::http::interaction::{InteractionResponse, InteractionResponseData, InteractionResponseType};
use twilight_model::id::{marker::GuildMarker, Id};
use twilight_util::builder::command::{CommandBuilder, SubCommandBuilder};
use twilight_util::builder::embed::EmbedBuilder;

use crate::modules::{enabled, setting, setting_number};

const ID: &str = "security";
const COLOR_ALERT: u32 = 0xef4444;
const COLOR_OK: u32 = 0x22c55e;

#[derive(Default)]
struct Guard {
    joins: VecDeque<Instant>,
    lockdown: Option<(Instant, Option<VerificationLevel>)>,
}

fn guard() -> &'static Mutex<Guard> {
    static G: OnceLock<Mutex<Guard>> = OnceLock::new();
    G.get_or_init(|| Mutex::new(Guard::default()))
}

pub fn register() -> Command {
    CommandBuilder::new("verrouillage", "Verrouiller ou déverrouiller l'accès au serveur (anti-raid)", twilight_model::application::command::CommandType::ChatInput)
        .default_member_permissions(Permissions::MANAGE_GUILD)
        .option(SubCommandBuilder::new("on", "Verrouiller maintenant"))
        .option(SubCommandBuilder::new("off", "Lever le verrouillage"))
        .option(SubCommandBuilder::new("statut", "Voir l'état de l'anti-raid"))
        .build()
}

async fn alert(http: &HttpClient, fallback_channel: u64, title: &str, text: String, color: u32) {
    let channel = setting(ID, "logChannelId").and_then(|c| c.trim().parse::<u64>().ok()).unwrap_or(fallback_channel);
    if channel == 0 {
        return;
    }
    let embed = EmbedBuilder::new().title(title).description(text).color(color).build();
    let _ = http.create_message(Id::new(channel)).embeds(&[embed]).await;
}

async fn start_lockdown(http: &HttpClient, guild_id: Id<GuildMarker>, minutes: i64) -> bool {
    if guard().lock().unwrap().lockdown.is_some() {
        return false;
    }
    let previous = match http.guild(guild_id).await {
        Ok(res) => res.model().await.ok().map(|g| g.verification_level),
        Err(_) => None,
    };
    let until = Instant::now() + Duration::from_secs(minutes.clamp(1, 1440) as u64 * 60);
    guard().lock().unwrap().lockdown = Some((until, previous));
    let _ = http
        .update_guild(guild_id)
        .verification_level(Some(VerificationLevel::VeryHigh))
        .reason("Anti-raid : verrouillage")
        .await;
    true
}

async fn end_lockdown(http: &HttpClient, guild_id: Id<GuildMarker>) -> bool {
    let Some((_, previous)) = guard().lock().unwrap().lockdown.take() else {
        return false;
    };
    if let Some(level) = previous {
        let _ = http.update_guild(guild_id).verification_level(Some(level)).reason("Anti-raid : fin du verrouillage").await;
    }
    true
}

pub async fn on_member_add(event: &MemberAdd, http: &Arc<HttpClient>, log_channel: u64) -> bool {
    if !enabled(ID) || event.user.bot {
        return false;
    }
    let guild_id = event.guild_id;
    let user = &event.user;

    let expired = guard().lock().unwrap().lockdown.is_some_and(|(until, _)| Instant::now() >= until);
    if expired && end_lockdown(http, guild_id).await {
        alert(http, log_channel, "Verrouillage levé", "Fin du délai : l'accès au serveur est rouvert.".into(), COLOR_OK).await;
    }

    let window = Duration::from_secs(setting_number(ID, "raidWindowSeconds", 60).clamp(5, 3600) as u64);
    let limit = setting_number(ID, "raidJoins", 8).max(2) as usize;
    let burst = {
        let mut g = guard().lock().unwrap();
        let now = Instant::now();
        g.joins.push_back(now);
        while g.joins.front().is_some_and(|t| now.duration_since(*t) > window) {
            g.joins.pop_front();
        }
        g.joins.len()
    };
    if burst >= limit {
        let minutes = setting_number(ID, "lockdownMinutes", 10);
        if start_lockdown(http, guild_id, minutes).await {
            alert(
                http,
                log_channel,
                "Raid détecté : serveur verrouillé",
                format!("{burst} arrivées en moins de {} s. Vérification maximale et expulsion des nouveaux arrivants pendant {minutes} min.\nLever plus tôt : `/verrouillage off`", window.as_secs()),
                COLOR_ALERT,
            )
            .await;
        }
    }

    let locked = guard().lock().unwrap().lockdown.is_some();
    if locked {
        dm(http, user.id, "Le serveur Paranoia Studio est temporairement verrouillé. Réessaie de le rejoindre dans quelques minutes.").await;
        let _ = http.remove_guild_member(guild_id, user.id).reason("Anti-raid : serveur verrouillé").await;
        return true;
    }

    let min_days = setting_number(ID, "minAccountAgeDays", 7);
    if min_days > 0 {
        let created_ms = (user.id.get() >> 22) as i64 + 1_420_070_400_000;
        let age_days = (chrono::Utc::now().timestamp_millis() - created_ms) / 86_400_000;
        if age_days < min_days {
            let kick = setting(ID, "youngAccountAction").as_deref() != Some("alert");
            alert(
                http,
                log_channel,
                "Compte récent",
                format!("<@{}> ({}) a un compte de {age_days} jour(s) (minimum : {min_days}).{}", user.id, user.name, if kick { " Expulsé." } else { "" }),
                COLOR_ALERT,
            )
            .await;
            if kick {
                dm(http, user.id, &format!("Ton compte Discord est trop récent pour rejoindre Paranoia Studio. Reviens dans {} jour(s).", min_days - age_days)).await;
                let _ = http.remove_guild_member(guild_id, user.id).reason("Anti-raid : compte trop récent").await;
                return true;
            }
        }
    }
    false
}

async fn dm(http: &HttpClient, user_id: Id<twilight_model::id::marker::UserMarker>, text: &str) {
    if let Ok(res) = http.create_private_channel(user_id).await {
        if let Ok(channel) = res.model().await {
            let _ = http.create_message(channel.id).content(text).await;
        }
    }
}

pub async fn run(interaction: Interaction, http: Arc<HttpClient>, log_channel: u64) -> anyhow::Result<()> {
    let Some(guild_id) = interaction.guild_id else { return Ok(()) };
    let sub = match &interaction.data {
        Some(InteractionData::ApplicationCommand(cmd)) => cmd
            .options
            .first()
            .filter(|o| matches!(o.value, CommandOptionValue::SubCommand(_)))
            .map(|o| o.name.clone())
            .unwrap_or_default(),
        _ => String::new(),
    };

    let text = match sub.as_str() {
        "on" => {
            let minutes = setting_number(ID, "lockdownMinutes", 10);
            if start_lockdown(&http, guild_id, minutes).await {
                alert(&http, log_channel, "Serveur verrouillé", format!("Verrouillage manuel pour {minutes} min."), COLOR_ALERT).await;
                format!("Serveur verrouillé pour {minutes} min. Les nouveaux arrivants sont expulsés.")
            } else {
                "Le serveur est déjà verrouillé.".to_string()
            }
        }
        "off" => {
            if end_lockdown(&http, guild_id).await {
                alert(&http, log_channel, "Verrouillage levé", "Levé manuellement.".into(), COLOR_OK).await;
                "Verrouillage levé, l'accès est rouvert.".to_string()
            } else {
                "Le serveur n'est pas verrouillé.".to_string()
            }
        }
        _ => {
            let g = guard().lock().unwrap();
            let state = match g.lockdown {
                Some((until, _)) => format!("Verrouillé, encore {} min.", until.saturating_duration_since(Instant::now()).as_secs() / 60 + 1),
                None => "Ouvert.".to_string(),
            };
            format!(
                "**Accès** : {state}\n**Âge minimum du compte** : {} jour(s)\n**Seuil de raid** : {} arrivées en {} s",
                setting_number(ID, "minAccountAgeDays", 7),
                setting_number(ID, "raidJoins", 8),
                setting_number(ID, "raidWindowSeconds", 60)
            )
        }
    };

    let response = InteractionResponse {
        kind: InteractionResponseType::ChannelMessageWithSource,
        data: Some(InteractionResponseData { content: Some(text), flags: Some(MessageFlags::EPHEMERAL), ..Default::default() }),
    };
    http.interaction(interaction.application_id).create_response(interaction.id, &interaction.token, &response).await?;
    Ok(())
}
