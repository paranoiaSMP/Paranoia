use std::collections::{HashMap, VecDeque};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant};
use twilight_http::Client as HttpClient;
use twilight_model::channel::message::Message;
use twilight_model::gateway::payload::incoming::{MessageDelete, MessageDeleteBulk, MessageUpdate};
use twilight_model::guild::audit_log::AuditLogEventType;
use twilight_model::id::{
    marker::{ChannelMarker, GuildMarker, MessageMarker, RoleMarker, UserMarker},
    Id,
};
use twilight_model::util::Timestamp;
use twilight_util::builder::embed::{EmbedBuilder, EmbedFieldBuilder, EmbedFooterBuilder};

use crate::modules::{enabled, setting};
use crate::utils::{COLOR_ERROR, COLOR_INFO};

const MAX_MESSAGES: usize = 20_000;
const MAX_AGE: Duration = Duration::from_secs(3 * 24 * 3600);
const FIELD_MAX: usize = 1024;
const UNKNOWN: &str = "*Inconnu : le message a été envoyé avant le dernier démarrage du bot.*";

#[derive(Clone)]
struct Cached {
    author: Id<UserMarker>,
    author_name: String,
    content: String,
    attachments: Vec<String>,
    roles: Vec<Id<RoleMarker>>,
    at: Instant,
}

#[derive(Default)]
struct Store {
    messages: HashMap<Id<MessageMarker>, Cached>,
    order: VecDeque<Id<MessageMarker>>,
    audit_counts: HashMap<u64, u32>,
}

fn store() -> &'static Mutex<Store> {
    static S: OnceLock<Mutex<Store>> = OnceLock::new();
    S.get_or_init(|| Mutex::new(Store::default()))
}

pub fn log_channel(default: u64) -> Id<ChannelMarker> {
    Id::new(setting("audit", "logChannelId").and_then(|c| c.trim().parse::<u64>().ok()).filter(|c| *c != 0).unwrap_or(default))
}

fn bypass_roles() -> Vec<Id<RoleMarker>> {
    setting("audit", "bypassRoleIds")
        .unwrap_or_default()
        .split(|c: char| c == ',' || c.is_whitespace())
        .filter_map(|r| r.parse::<u64>().ok())
        .filter(|r| *r != 0)
        .map(Id::new)
        .collect()
}

fn bypassed(roles: &[Id<RoleMarker>]) -> bool {
    let bypass = bypass_roles();
    roles.iter().any(|r| bypass.contains(r))
}

fn clip(text: &str, max: usize) -> String {
    if text.chars().count() <= max {
        return text.to_string();
    }
    let mut out: String = text.chars().take(max.saturating_sub(1)).collect();
    out.push('…');
    out
}

fn shown(content: &str) -> String {
    if content.trim().is_empty() {
        "*Aucun texte.*".to_string()
    } else {
        clip(content, FIELD_MAX)
    }
}

fn display_name(user: &twilight_model::user::User) -> String {
    user.global_name.clone().unwrap_or_else(|| user.name.clone())
}

fn now() -> Option<Timestamp> {
    Timestamp::from_secs(chrono::Utc::now().timestamp()).ok()
}

fn jump(guild: Option<Id<GuildMarker>>, channel: Id<ChannelMarker>, message: Id<MessageMarker>) -> String {
    match guild {
        Some(g) => format!(" · [Aller au message](https://discord.com/channels/{g}/{channel}/{message})"),
        None => String::new(),
    }
}

pub fn on_create(msg: &Message) {
    if msg.author.bot || msg.guild_id.is_none() {
        return;
    }
    let cached = Cached {
        author: msg.author.id,
        author_name: display_name(&msg.author),
        content: clip(&msg.content, FIELD_MAX),
        attachments: msg.attachments.iter().map(|a| a.filename.clone()).collect(),
        roles: msg.member.as_ref().map(|m| m.roles.clone()).unwrap_or_default(),
        at: Instant::now(),
    };
    let mut st = store().lock().unwrap();
    st.messages.insert(msg.id, cached);
    st.order.push_back(msg.id);
    while st.order.len() > MAX_MESSAGES || st.order.front().and_then(|id| st.messages.get(id)).is_some_and(|m| m.at.elapsed() > MAX_AGE) {
        if let Some(old) = st.order.pop_front() {
            st.messages.remove(&old);
        }
    }
}

pub async fn on_update(ev: &MessageUpdate, http: &Arc<HttpClient>, default_channel: u64) {
    if !enabled("audit") {
        return;
    }
    let log = log_channel(default_channel);
    if ev.channel_id == log || ev.author.bot || ev.edited_timestamp.is_none() || ev.guild_id.is_none() {
        return;
    }
    let roles = ev.member.as_ref().map(|m| m.roles.clone()).unwrap_or_default();
    let before = {
        let mut st = store().lock().unwrap();
        let before = st.messages.get(&ev.id).cloned();
        if let Some(entry) = st.messages.get_mut(&ev.id) {
            entry.content = clip(&ev.content, FIELD_MAX);
        }
        before
    };
    if bypassed(&roles) || before.as_ref().is_some_and(|b| bypassed(&b.roles)) {
        return;
    }
    if before.as_ref().is_some_and(|b| b.content == clip(&ev.content, FIELD_MAX)) {
        return;
    }

    let mut embed = EmbedBuilder::new()
        .title("Message modifié")
        .description(format!(
            "<@{}> a modifié son message dans <#{}>{}",
            ev.author.id,
            ev.channel_id,
            jump(ev.guild_id, ev.channel_id, ev.id)
        ))
        .color(COLOR_INFO)
        .field(EmbedFieldBuilder::new("Avant", before.as_ref().map(|b| shown(&b.content)).unwrap_or_else(|| UNKNOWN.to_string())))
        .field(EmbedFieldBuilder::new("Après", shown(&ev.content)))
        .footer(EmbedFooterBuilder::new(format!("{} · auteur {} · message {}", display_name(&ev.author), ev.author.id, ev.id)));
    if let Some(t) = now() {
        embed = embed.timestamp(t);
    }
    let _ = http.create_message(log).embeds(&[embed.build()]).await;
}

async fn deleted_by(http: &HttpClient, guild: Id<GuildMarker>, author: Id<UserMarker>, channel: Id<ChannelMarker>) -> Option<Id<UserMarker>> {
    let log = http.audit_log(guild).action_type(AuditLogEventType::MessageDelete).limit(10).await.ok()?.model().await.ok()?;
    let mut st = store().lock().unwrap();
    let mut found = None;
    for entry in &log.entries {
        let count = entry.options.as_ref().and_then(|o| o.count.as_deref()).and_then(|c| c.parse::<u32>().ok()).unwrap_or(1);
        let seen = st.audit_counts.insert(entry.id.get(), count);
        let matches = entry.target_id.map(|t| t.get()) == Some(author.get())
            && entry.options.as_ref().and_then(|o| o.channel_id) == Some(channel);
        if !matches || found.is_some() {
            continue;
        }
        let created_ms = (entry.id.get() >> 22) + 1_420_070_400_000;
        let fresh = (chrono::Utc::now().timestamp_millis() as u64).saturating_sub(created_ms) < 30_000;
        let grew = seen.is_some_and(|before| count > before);
        if (seen.is_none() && fresh) || grew {
            found = entry.user_id;
        }
    }
    if st.audit_counts.len() > 500 {
        st.audit_counts.clear();
    }
    found
}

pub async fn on_delete(ev: &MessageDelete, http: &Arc<HttpClient>, default_channel: u64) {
    let cached = store().lock().unwrap().messages.remove(&ev.id);
    if !enabled("audit") {
        return;
    }
    let log = log_channel(default_channel);
    if ev.channel_id == log || cached.as_ref().is_some_and(|c| bypassed(&c.roles)) {
        return;
    }

    let mut lines = vec![format!("**Salon :** <#{}>", ev.channel_id)];
    match &cached {
        Some(c) => {
            lines.insert(0, format!("**Auteur :** <@{}>", c.author));
            let by = match ev.guild_id {
                Some(g) => deleted_by(http, g, c.author, ev.channel_id).await,
                None => None,
            };
            lines.push(match by {
                Some(m) => format!("**Supprimé par :** <@{m}>"),
                None => "**Supprimé par :** l'auteur (aucun modérateur dans le journal d'audit)".to_string(),
            });
        }
        None => lines.insert(0, "**Auteur :** inconnu".to_string()),
    }

    let mut embed = EmbedBuilder::new()
        .title("Message supprimé")
        .description(lines.join("\n"))
        .color(COLOR_ERROR)
        .field(EmbedFieldBuilder::new("Contenu", cached.as_ref().map(|c| shown(&c.content)).unwrap_or_else(|| UNKNOWN.to_string())));
    if let Some(c) = cached.as_ref().filter(|c| !c.attachments.is_empty()) {
        embed = embed.field(EmbedFieldBuilder::new("Pièces jointes", clip(&c.attachments.join("\n"), FIELD_MAX)));
    }
    let footer = match &cached {
        Some(c) => format!("{} · auteur {} · message {}", c.author_name, c.author, ev.id),
        None => format!("message {}", ev.id),
    };
    embed = embed.footer(EmbedFooterBuilder::new(footer));
    if let Some(t) = now() {
        embed = embed.timestamp(t);
    }
    let _ = http.create_message(log).embeds(&[embed.build()]).await;
}

pub async fn on_delete_bulk(ev: &MessageDeleteBulk, http: &Arc<HttpClient>, default_channel: u64) {
    let cached: Vec<Cached> = {
        let mut st = store().lock().unwrap();
        ev.ids.iter().filter_map(|id| st.messages.remove(id)).collect()
    };
    if !enabled("audit") {
        return;
    }
    let log = log_channel(default_channel);
    if ev.channel_id == log {
        return;
    }
    let visible: Vec<&Cached> = cached.iter().filter(|c| !bypassed(&c.roles)).collect();
    let mut text = format!("**{} messages** supprimés d'un coup dans <#{}>.", ev.ids.len(), ev.channel_id);
    if !visible.is_empty() {
        text.push_str("\n\n");
        for c in visible.iter().take(15) {
            text.push_str(&format!("**{}** : {}\n", c.author_name, clip(c.content.trim(), 200)));
        }
        if visible.len() > 15 {
            text.push_str(&format!("… et {} autres.", visible.len() - 15));
        }
    }
    let unknown = ev.ids.len() - cached.len();
    if unknown > 0 {
        text.push_str(&format!("\n{unknown} message(s) au contenu inconnu (envoyés avant le dernier démarrage du bot)."));
    }
    let mut embed = EmbedBuilder::new().title("Suppression en masse").description(clip(&text, 4000)).color(COLOR_ERROR);
    if let Some(t) = now() {
        embed = embed.timestamp(t);
    }
    let _ = http.create_message(log).embeds(&[embed.build()]).await;
}
