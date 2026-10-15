use std::collections::{HashMap, VecDeque};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant};

use twilight_http::{request::AuditLogReason, Client as HttpClient};
use twilight_model::application::command::{Command, CommandType};
use twilight_model::application::interaction::{
    application_command::CommandOptionValue, Interaction, InteractionData,
};
use twilight_model::channel::message::MessageFlags;
use twilight_model::channel::permission_overwrite::PermissionOverwriteType as ModelOverwriteType;
use twilight_model::channel::{Channel, ChannelType};
use twilight_model::gateway::payload::incoming::MemberAdd;
use twilight_model::guild::{Permissions, VerificationLevel};
use twilight_model::http::interaction::{
    InteractionResponse, InteractionResponseData, InteractionResponseType,
};
use twilight_model::http::permission_overwrite::{
    PermissionOverwrite as HttpPermissionOverwrite,
    PermissionOverwriteType as HttpOverwriteType,
};
use twilight_model::id::{
    marker::{ChannelMarker, GenericMarker, GuildMarker, RoleMarker, UserMarker},
    Id,
};
use twilight_util::builder::command::{CommandBuilder, SubCommandBuilder};
use twilight_util::builder::embed::EmbedBuilder;

use crate::modules::{enabled, setting, setting_number};

pub const ID: &str = "security";
const COLOR_ALERT: u32 = 0xef4444;
const COLOR_OK: u32 = 0x22c55e;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct JoinRecord {
    pub user_id: Id<UserMarker>,
    pub joined_at: Instant,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum JoinDecision {
    Allow,
    TriggerLockdown {
        suspect_user_ids: Vec<Id<UserMarker>>,
        reason: String,
    },
    KickRaidMember {
        user_id: Id<UserMarker>,
    },
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ChannelOverwriteBackup {
    pub channel_id: Id<ChannelMarker>,
    pub had_overwrite: bool,
    pub original_allow: Permissions,
    pub original_deny: Permissions,
}

#[derive(Clone, Debug)]
pub struct ActiveLockdown {
    pub until: Instant,
    pub previous_verification_level: Option<VerificationLevel>,
    pub channel_backups: Vec<ChannelOverwriteBackup>,
}

#[derive(Clone, Debug)]
#[allow(dead_code)]
pub struct GuildRaidState {
    pub window: Duration,
    pub burst_threshold: usize,
    pub lockdown_duration: Duration,
    pub recent_joins: VecDeque<JoinRecord>,
    pub locked_until: Option<Instant>,
    pub active_lockdown: Option<ActiveLockdown>,
}

impl Default for GuildRaidState {
    fn default() -> Self {
        Self::new(Duration::from_secs(5), 10, Duration::from_secs(600))
    }
}

#[allow(dead_code)]
impl GuildRaidState {
    pub fn new(window: Duration, burst_threshold: usize, lockdown_duration: Duration) -> Self {
        Self {
            window,
            burst_threshold: burst_threshold.max(2),
            lockdown_duration,
            recent_joins: VecDeque::new(),
            locked_until: None,
            active_lockdown: None,
        }
    }

    pub fn is_locked(&self, now: Instant) -> bool {
        if let Some(until) = self.locked_until {
            now < until
        } else if let Some(lockdown) = &self.active_lockdown {
            now < lockdown.until
        } else {
            false
        }
    }

    pub fn is_lockdown_expired(&self, now: Instant) -> bool {
        if let Some(until) = self.locked_until {
            now >= until
        } else if let Some(lockdown) = &self.active_lockdown {
            now >= lockdown.until
        } else {
            false
        }
    }

    pub fn unlock(&mut self) -> Option<ActiveLockdown> {
        self.locked_until = None;
        self.recent_joins.clear();
        self.active_lockdown.take()
    }

    pub fn evaluate_join(&mut self, user_id: Id<UserMarker>, now: Instant) -> JoinDecision {
        self.evaluate_join_with_params(
            user_id,
            now,
            self.window,
            self.burst_threshold,
            self.lockdown_duration,
        )
    }

    pub fn evaluate_join_with_params(
        &mut self,
        user_id: Id<UserMarker>,
        now: Instant,
        window: Duration,
        limit: usize,
        lockdown_duration: Duration,
    ) -> JoinDecision {
        let limit = limit.max(2);

        if self.is_locked(now) {
            return JoinDecision::KickRaidMember { user_id };
        }

        if self.is_lockdown_expired(now) {
            self.locked_until = None;
            self.active_lockdown = None;
        }

        self.recent_joins.retain(|record| {
            let is_past_expired = now.saturating_duration_since(record.joined_at) > window;
            let is_anomalous_future = record.joined_at.saturating_duration_since(now) > window;
            !is_past_expired && !is_anomalous_future
        });

        self.recent_joins.push_back(JoinRecord {
            user_id,
            joined_at: now,
        });

        if self.recent_joins.len() >= limit {
            let suspect_user_ids: Vec<Id<UserMarker>> =
                self.recent_joins.drain(..).map(|j| j.user_id).collect();
            let until = now + lockdown_duration;
            self.locked_until = Some(until);

            JoinDecision::TriggerLockdown {
                suspect_user_ids,
                reason: format!(
                    "Join-velocity raid detected (>= {} joins in {:?})",
                    limit, window
                ),
            }
        } else {
            JoinDecision::Allow
        }
    }
}

pub fn lockdown_deny_permissions() -> Permissions {
    Permissions::SEND_MESSAGES
        | Permissions::SEND_MESSAGES_IN_THREADS
        | Permissions::CREATE_PUBLIC_THREADS
        | Permissions::CREATE_PRIVATE_THREADS
        | Permissions::ADD_REACTIONS
        | Permissions::SPEAK
}

pub fn calculate_lockdown_permissions(
    original_allow: Permissions,
    original_deny: Permissions,
) -> (Permissions, Permissions) {
    let deny_bits = lockdown_deny_permissions();
    let new_allow = original_allow - deny_bits;
    let new_deny = original_deny | deny_bits;
    (new_allow, new_deny)
}

pub fn calculate_restore_permissions(
    backup: &ChannelOverwriteBackup,
) -> Option<(Permissions, Permissions)> {
    if backup.had_overwrite {
        Some((backup.original_allow, backup.original_deny))
    } else {
        None
    }
}

pub fn is_lockdown_target_channel_type(kind: ChannelType) -> bool {
    matches!(
        kind,
        ChannelType::GuildText
            | ChannelType::GuildVoice
            | ChannelType::GuildAnnouncement
            | ChannelType::GuildStageVoice
            | ChannelType::GuildForum
            | ChannelType::GuildMedia
    )
}

#[derive(Default)]
pub struct SecurityState {
    pub guilds: HashMap<Id<GuildMarker>, GuildRaidState>,
}

pub fn state() -> &'static Mutex<SecurityState> {
    static STATE: OnceLock<Mutex<SecurityState>> = OnceLock::new();
    STATE.get_or_init(|| Mutex::new(SecurityState::default()))
}

pub fn register() -> Command {
    CommandBuilder::new(
        "verrouillage",
        "Verrouiller ou déverrouiller l'accès au serveur (anti-raid)",
        CommandType::ChatInput,
    )
    .default_member_permissions(Permissions::MANAGE_GUILD)
    .option(SubCommandBuilder::new("on", "Verrouiller maintenant"))
    .option(SubCommandBuilder::new("off", "Lever le verrouillage"))
    .option(SubCommandBuilder::new("statut", "Voir l'état de l'anti-raid"))
    .build()
}

async fn alert(http: &HttpClient, fallback_channel: u64, title: &str, text: String, color: u32) {
    let channel = setting(ID, "logChannelId")
        .and_then(|c| c.trim().parse::<u64>().ok())
        .unwrap_or(fallback_channel);
    if channel == 0 {
        return;
    }
    let embed = EmbedBuilder::new()
        .description(format!("{}\n\n{}", format!("## {} | {}", crate::utils::emoji::SETTINGS, title), text))
        .color(color)
        .build();
    let _ = http.create_message(Id::new(channel)).embeds(&[embed]).await;
}

pub async fn start_lockdown(
    http: &Arc<HttpClient>,
    guild_id: Id<GuildMarker>,
    minutes: i64,
) -> bool {
    let lockdown_duration = Duration::from_secs(minutes.clamp(1, 1440) as u64 * 60);
    let now = Instant::now();

    {
        let mut st = state().lock().unwrap();
        let guild_state = st.guilds.entry(guild_id).or_default();
        if guild_state.is_locked(now) {
            return false;
        }
    }

    let previous_verification_level = match http.guild(guild_id).await {
        Ok(res) => res.model().await.ok().map(|g| g.verification_level),
        Err(_) => None,
    };

    let channels: Vec<Channel> = match http.guild_channels(guild_id).await {
        Ok(res) => res.model().await.unwrap_or_default(),
        Err(e) => {
            tracing::error!("Anti-raid: failed to fetch guild channels for {}: {:?}", guild_id, e);
            Vec::new()
        }
    };

    let mut channel_backups = Vec::new();
    let everyone_generic_id = Id::<GenericMarker>::new(guild_id.get());

    for channel in channels {
        if !is_lockdown_target_channel_type(channel.kind) {
            continue;
        }

        let existing_overwrite = channel
            .permission_overwrites
            .as_deref()
            .unwrap_or_default()
            .iter()
            .find(|o| o.id == everyone_generic_id && o.kind == ModelOverwriteType::Role);

        let (had_overwrite, original_allow, original_deny) = match existing_overwrite {
            Some(o) => (true, o.allow, o.deny),
            None => (false, Permissions::empty(), Permissions::empty()),
        };

        let backup = ChannelOverwriteBackup {
            channel_id: channel.id,
            had_overwrite,
            original_allow,
            original_deny,
        };

        let (new_allow, new_deny) = calculate_lockdown_permissions(original_allow, original_deny);
        let overwrite = HttpPermissionOverwrite {
            allow: Some(new_allow),
            deny: Some(new_deny),
            id: everyone_generic_id,
            kind: HttpOverwriteType::Role,
        };

        let res = http
            .update_channel_permission(channel.id, &overwrite)
            .reason("Anti-raid: Guild lockdown in progress")
            .await;
        if let Err(e) = res {
            tracing::warn!("Anti-raid: failed to restrict channel {}: {:?}", channel.id, e);
        }

        channel_backups.push(backup);
    }

    let _ = http
        .update_guild(guild_id)
        .verification_level(Some(VerificationLevel::VeryHigh))
        .reason("Anti-raid: verrouillage")
        .await;

    let until = now + lockdown_duration;
    {
        let mut st = state().lock().unwrap();
        let guild_state = st.guilds.entry(guild_id).or_default();
        guild_state.locked_until = Some(until);
        guild_state.active_lockdown = Some(ActiveLockdown {
            until,
            previous_verification_level,
            channel_backups,
        });
    }

    let http_client = Arc::clone(http);
    let log_chan = setting(ID, "logChannelId")
        .and_then(|c| c.trim().parse::<u64>().ok())
        .unwrap_or(0);
    tokio::spawn(async move {
        tokio::time::sleep(lockdown_duration).await;
        let now = Instant::now();
        let expired = {
            let st = state().lock().unwrap();
            st.guilds.get(&guild_id).is_some_and(|g| g.is_lockdown_expired(now))
        };
        if expired && end_lockdown(&http_client, guild_id).await {
            alert(
                &http_client,
                log_chan,
                "Verrouillage levé",
                "Fin du délai : l'accès au serveur est rouvert et les permissions des salons ont été restaurées.".into(),
                COLOR_OK,
            )
            .await;
        }
    });

    true
}

pub async fn end_lockdown(http: &HttpClient, guild_id: Id<GuildMarker>) -> bool {
    let active_lockdown = {
        let mut st = state().lock().unwrap();
        let Some(guild_state) = st.guilds.get_mut(&guild_id) else {
            return false;
        };
        match guild_state.unlock() {
            Some(l) => l,
            None => return false,
        }
    };

    let everyone_role_id = Id::<RoleMarker>::new(guild_id.get());
    let everyone_generic_id = Id::<GenericMarker>::new(guild_id.get());

    for backup in active_lockdown.channel_backups {
        if let Some((original_allow, original_deny)) = calculate_restore_permissions(&backup) {
            let overwrite = HttpPermissionOverwrite {
                allow: Some(original_allow),
                deny: Some(original_deny),
                id: everyone_generic_id,
                kind: HttpOverwriteType::Role,
            };
            let _ = http
                .update_channel_permission(backup.channel_id, &overwrite)
                .reason("Anti-raid: fin du verrouillage")
                .await;
        } else {
            let _ = http
                .delete_channel_permission(backup.channel_id)
                .role(everyone_role_id)
                .reason("Anti-raid: fin du verrouillage")
                .await;
        }
    }

    if let Some(level) = active_lockdown.previous_verification_level {
        let _ = http
            .update_guild(guild_id)
            .verification_level(Some(level))
            .reason("Anti-raid: fin du verrouillage")
            .await;
    }

    true
}

pub async fn kick_suspect_wave_accounts(
    http: &HttpClient,
    guild_id: Id<GuildMarker>,
    suspect_user_ids: &[Id<UserMarker>],
) -> usize {
    let mut kicked_count = 0;
    for &suspect_id in suspect_user_ids {
        let res = http
            .remove_guild_member(guild_id, suspect_id)
            .reason("Anti-raid: suspect raid wave account")
            .await;
        if res.is_ok() {
            kicked_count += 1;
        }
    }
    kicked_count
}

pub async fn on_member_add(event: &MemberAdd, http: &Arc<HttpClient>, log_channel: u64) -> bool {
    if !enabled(ID) || event.user.bot {
        return false;
    }
    let guild_id = event.guild_id;
    let user = &event.user;
    let now = Instant::now();

    let expired = {
        let st = state().lock().unwrap();
        st.guilds.get(&guild_id).is_some_and(|g| g.is_lockdown_expired(now))
    };
    if expired && end_lockdown(http, guild_id).await {
        alert(
            http,
            log_channel,
            "Verrouillage levé",
            "Fin du délai : l'accès au serveur est rouvert.".into(),
            COLOR_OK,
        )
        .await;
    }

    let window = Duration::from_secs(
        setting_number(ID, "raidWindowSeconds", 5).clamp(1, 3600) as u64,
    );
    let limit = setting_number(ID, "raidJoins", 10).max(2) as usize;
    let lockdown_minutes = setting_number(ID, "lockdownMinutes", 10).clamp(1, 1440);
    let lockdown_duration = Duration::from_secs(lockdown_minutes as u64 * 60);

    let decision = {
        let mut st = state().lock().unwrap();
        let guild_state = st.guilds.entry(guild_id).or_default();
        guild_state.evaluate_join_with_params(user.id, now, window, limit, lockdown_duration)
    };

    match decision {
        JoinDecision::TriggerLockdown {
            suspect_user_ids,
            reason,
        } => {
            if start_lockdown(http, guild_id, lockdown_minutes).await {
                let kicked = kick_suspect_wave_accounts(http, guild_id, &suspect_user_ids).await;
                alert(
                    http,
                    log_channel,
                    "Raid détecté : serveur verrouillé",
                    format!(
                        "**{reason}**\n\
                         Vérification maximale activée et salons verrouillés pour {lockdown_minutes} min.\n\
                         **Comptes de raid expulsés** : {}/{}.\n\
                         Lever plus tôt : `/verrouillage off`",
                        kicked,
                        suspect_user_ids.len()
                    ),
                    COLOR_ALERT,
                )
                .await;
            }
            return true;
        }
        JoinDecision::KickRaidMember { user_id } => {
            dm(
                http,
                user_id,
                "Le serveur Paranoia Studio est temporairement verrouillé. Réessaie de le rejoindre dans quelques minutes.",
            )
            .await;
            let _ = http
                .remove_guild_member(guild_id, user_id)
                .reason("Anti-raid: serveur verrouillé")
                .await;
            return true;
        }
        JoinDecision::Allow => {}
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
                format!(
                    "<@{}> ({}) a un compte de {age_days} jour(s) (minimum : {min_days}).{}",
                    user.id,
                    user.name,
                    if kick { " Expulsé." } else { "" }
                ),
                COLOR_ALERT,
            )
            .await;
            if kick {
                dm(
                    http,
                    user.id,
                    &format!(
                        "Ton compte Discord est trop récent pour rejoindre Paranoia Studio. Reviens dans {} jour(s).",
                        min_days - age_days
                    ),
                )
                .await;
                let _ = http
                    .remove_guild_member(guild_id, user.id)
                    .reason("Anti-raid : compte trop récent")
                    .await;
                return true;
            }
        }
    }

    false
}

async fn dm(http: &HttpClient, user_id: Id<UserMarker>, text: &str) {
    if let Ok(res) = http.create_private_channel(user_id).await
        && let Ok(channel) = res.model().await
    {
        let _ = http.create_message(channel.id).content(text).await;
    }
}

pub async fn run(
    interaction: Interaction,
    http: Arc<HttpClient>,
    log_channel: u64,
) -> anyhow::Result<()> {
    let Some(guild_id) = interaction.guild_id else {
        return Ok(());
    };
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
                alert(
                    &http,
                    log_channel,
                    "Serveur verrouillé",
                    format!("Verrouillage manuel pour {minutes} min. Salons restreints."),
                    COLOR_ALERT,
                )
                .await;
                format!(
                    "Serveur verrouillé pour {minutes} min. Les salons sont restreints et les nouveaux arrivants sont expulsés."
                )
            } else {
                "Le serveur est déjà verrouillé.".to_string()
            }
        }
        "off" => {
            if end_lockdown(&http, guild_id).await {
                alert(
                    &http,
                    log_channel,
                    "Verrouillage levé",
                    "Levé manuellement par un modérateur. Salons restaurés.".into(),
                    COLOR_OK,
                )
                .await;
                "Verrouillage levé, les permissions des salons ont été restaurées et l'accès est rouvert.".to_string()
            } else {
                "Le serveur n'est pas verrouillé.".to_string()
            }
        }
        _ => {
            let now = Instant::now();
            let (is_locked, remaining_min, backup_count) = {
                let st = state().lock().unwrap();
                match st.guilds.get(&guild_id) {
                    Some(g) if g.is_locked(now) => {
                        let rem = g
                            .locked_until
                            .map(|u| u.saturating_duration_since(now).as_secs() / 60 + 1)
                            .unwrap_or(0);
                        let backups = g
                            .active_lockdown
                            .as_ref()
                            .map(|l| l.channel_backups.len())
                            .unwrap_or(0);
                        (true, rem, backups)
                    }
                    _ => (false, 0, 0),
                }
            };
            let state_str = if is_locked {
                format!(
                    "🔒 Verrouillé, encore ~{} min ({} salons restreints)",
                    remaining_min, backup_count
                )
            } else {
                "🔓 Ouvert".to_string()
            };
            format!(
                "**Accès** : {state_str}\n**Âge minimum du compte** : {} jour(s)\n**Seuil de raid** : {} arrivées en {} s\n**Durée de verrouillage** : {} min",
                setting_number(ID, "minAccountAgeDays", 7),
                setting_number(ID, "raidJoins", 10),
                setting_number(ID, "raidWindowSeconds", 5),
                setting_number(ID, "lockdownMinutes", 10),
            )
        }
    };

    let response = InteractionResponse {
        kind: InteractionResponseType::ChannelMessageWithSource,
        data: Some(InteractionResponseData {
            content: Some(text),
            flags: Some(MessageFlags::EPHEMERAL),
            ..Default::default()
        }),
    };
    http.interaction(interaction.application_id)
        .create_response(interaction.id, &interaction.token, &response)
        .await?;
    Ok(())
}
