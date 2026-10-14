#![allow(deprecated)]

use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use std::collections::HashMap;
use std::sync::{Arc, Mutex, OnceLock};
use std::time::Duration;
use twilight_http::Client as HttpClient;
use twilight_model::application::command::{Command, CommandType};
use twilight_model::application::interaction::application_command::CommandOptionValue;
use twilight_model::application::interaction::modal::ModalInteractionData;
use twilight_model::application::interaction::{Interaction, InteractionData};
use twilight_model::channel::message::component::{
    ActionRow, Button, ButtonStyle, Component, Container, Section, Separator, SeparatorSpacingSize, TextDisplay, TextInput, TextInputStyle,
    Thumbnail, UnfurledMediaItem,
};
use twilight_model::channel::message::{AllowedMentions, MentionType, MessageFlags};
use twilight_model::channel::permission_overwrite::{PermissionOverwrite, PermissionOverwriteType};
use twilight_model::channel::ChannelType;
use twilight_model::guild::Permissions;
use twilight_model::http::interaction::{InteractionResponse, InteractionResponseData, InteractionResponseType};
use twilight_model::http::permission_overwrite::{
    PermissionOverwrite as HttpOverwrite, PermissionOverwriteType as HttpOverwriteType,
};
use twilight_model::id::{
    marker::{ChannelMarker, GuildMarker, MessageMarker, RoleMarker, UserMarker},
    Id,
};
use twilight_util::builder::command::{CommandBuilder, StringBuilder, SubCommandBuilder};

use crate::modules::{activity, setting, setting_number};

const ID: &str = "conference";
pub const PREFIX: &str = "conf:";
pub const LEGACY: &[&str] = &["hand_raise:", "hand_accept:", "hand_reject:", "hand_revoke:"];
const V2: MessageFlags = MessageFlags::IS_COMPONENTS_V2;

#[derive(Serialize, Deserialize, Clone)]
struct Question {
    id: u32,
    author: u64,
    text: String,
}

#[derive(Serialize, Deserialize, Clone)]
struct Conf {
    guild: u64,
    host: u64,
    host_avatar: String,
    title: String,
    description: Option<String>,
    category: u64,
    voice: u64,
    regie: u64,
    panel_channel: u64,
    panel_message: Option<u64>,
    regie_message: Option<u64>,
    ping_role: Option<u64>,
    started: i64,
    queue: Vec<u64>,
    speakers: Vec<(u64, Option<i64>)>,
    questions: Vec<Question>,
    next_question: u32,
    locked: bool,
    peak: usize,
    spoke: Vec<u64>,
    asked: u32,
    shown: u32,
    #[serde(default)]
    listeners: usize,
}

fn confs() -> &'static Mutex<HashMap<u64, Conf>> {
    static S: OnceLock<Mutex<HashMap<u64, Conf>>> = OnceLock::new();
    S.get_or_init(|| Mutex::new(HashMap::new()))
}

fn now() -> i64 {
    chrono::Utc::now().timestamp()
}

fn accent() -> u32 {
    setting(ID, "accentColor")
        .and_then(|c| u32::from_str_radix(c.trim().trim_start_matches('#'), 16).ok())
        .unwrap_or(0x7c3aed)
}

fn id_setting(key: &str) -> Option<u64> {
    setting(ID, key).and_then(|v| v.trim().parse::<u64>().ok()).filter(|v| *v != 0)
}

fn cohost_role() -> Option<Id<RoleMarker>> {
    id_setting("cohostRoleId").map(Id::new)
}

fn speak_seconds() -> i64 {
    setting_number(ID, "speakSeconds", 120).clamp(0, 3600)
}

async fn save(db: &PgPool, conf: &Conf) {
    let Ok(value) = serde_json::to_string(conf) else { return };
    let _ = sqlx::query(
        r#"INSERT INTO bot_runtime (key, value, updated_at) VALUES ($1, $2, NOW())
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()"#,
    )
    .bind(format!("conference:{}", conf.voice))
    .bind(value)
    .execute(db)
    .await;
}

async fn forget(db: &PgPool, voice: u64) {
    let _ = sqlx::query("DELETE FROM bot_runtime WHERE key = $1").bind(format!("conference:{voice}")).execute(db).await;
}

fn text(content: impl Into<String>) -> Component {
    Component::TextDisplay(TextDisplay { id: None, content: content.into() })
}

fn sep(divider: bool) -> Component {
    Component::Separator(Separator { id: None, divider: Some(divider), spacing: Some(SeparatorSpacingSize::Small) })
}

fn button(custom_id: String, label: &str, style: ButtonStyle, disabled: bool) -> Component {
    Component::Button(Button { id: None, custom_id: Some(custom_id), disabled, emoji: None, label: Some(label.to_string()), style, url: None, sku_id: None })
}

fn link(url: String, label: &str) -> Component {
    Component::Button(Button { id: None, custom_id: None, disabled: false, emoji: None, label: Some(label.to_string()), style: ButtonStyle::Link, url: Some(url), sku_id: None })
}

fn row(components: Vec<Component>) -> Component {
    Component::ActionRow(ActionRow { id: None, components })
}

fn section(content: impl Into<String>, accessory: Component) -> Component {
    Component::Section(Section { id: None, components: vec![text(content)], accessory: Box::new(accessory) })
}

fn thumbnail(url: &str) -> Component {
    Component::Thumbnail(Thumbnail {
        id: None,
        media: UnfurledMediaItem { url: url.to_string(), proxy_url: None, height: None, width: None, content_type: None },
        description: None,
        spoiler: None,
    })
}

fn container(components: Vec<Component>) -> Component {
    Component::Container(Container { id: None, accent_color: Some(Some(accent())), spoiler: None, components })
}

fn clip(s: &str, max: usize) -> String {
    if s.chars().count() <= max {
        s.to_string()
    } else {
        format!("{}…", s.chars().take(max - 1).collect::<String>())
    }
}

fn duration_label(secs: i64) -> String {
    let m = (secs / 60).max(1);
    if m < 60 {
        format!("{m} min")
    } else {
        format!("{} h {:02} min", m / 60, m % 60)
    }
}

fn public_panel(c: &Conf) -> Vec<Component> {
    let mut head = format!("-# Conférence en direct\n## {}", c.title);
    if let Some(d) = &c.description {
        head.push_str(&format!("\n{d}"));
    }
    let mut out = Vec::new();
    if let Some(role) = c.ping_role {
        out.push(text(format!("<@&{role}>")));
    }
    out.push(container(vec![
        section(head, thumbnail(&c.host_avatar)),
        sep(true),
        text(format!(
            "**Animée par** <@{}>\n**Commencée** <t:{}:R>\n**Pour parler** lève la main : un animateur te donnera la parole{}.",
            c.host,
            c.started,
            match speak_seconds() {
                0 => String::new(),
                s => format!(" pour {}", duration_label(s)),
            }
        )),
        row(vec![
            link(format!("https://discord.com/channels/{}/{}", c.guild, c.voice), "Rejoindre le vocal"),
            button(format!("{PREFIX}hand:{}", c.voice), "Lever la main", ButtonStyle::Primary, false),
            button(format!("{PREFIX}ask:{}", c.voice), "Poser une question", ButtonStyle::Secondary, false),
        ]),
    ]));
    out
}

fn ended_panel(c: &Conf) -> Vec<Component> {
    vec![container(vec![
        section(format!("-# Conférence terminée\n## {}", c.title), thumbnail(&c.host_avatar)),
        sep(true),
        text(format!(
            "**Animée par** <@{}>\n**Durée** {}\n**Auditeurs** {} au maximum\n**Intervenants** {}\n**Questions** {} posée(s), {} affichée(s)",
            c.host,
            duration_label(now() - c.started),
            c.peak,
            c.spoke.len(),
            c.asked,
            c.shown
        )),
    ])]
}

fn regie_panel(c: &Conf) -> Vec<Component> {
    let v = c.voice;
    let listeners = activity::humans_in(Id::new(v)).len();
    let mut parts = vec![text(format!("## Régie · {}\n-# Visible seulement par l'animateur et les co-animateurs.", c.title)), sep(true)];

    parts.push(text(format!("**À la parole** ({})", c.speakers.len())));
    if c.speakers.is_empty() {
        parts.push(text("-# Personne pour l'instant."));
    }
    for (user, deadline) in c.speakers.iter().take(2) {
        let when = match deadline {
            Some(d) => format!("fin <t:{d}:R>"),
            None => "sans limite".to_string(),
        };
        parts.push(section(format!("<@{user}> · {when}"), button(format!("{PREFIX}revoke:{v}:{user}"), "Retirer", ButtonStyle::Danger, false)));
    }
    if c.speakers.len() > 2 {
        parts.push(text(format!("-# et {} autre(s)", c.speakers.len() - 2)));
    }
    parts.push(sep(false));

    parts.push(text(format!("**File d'attente** ({})", c.queue.len())));
    if c.queue.is_empty() {
        parts.push(text("-# Aucune main levée."));
    }
    for (i, user) in c.queue.iter().take(3).enumerate() {
        parts.push(section(format!("**{}.** <@{user}>", i + 1), button(format!("{PREFIX}give:{v}:{user}"), "Donner la parole", ButtonStyle::Success, false)));
    }
    if c.queue.len() > 3 {
        parts.push(text(format!("-# et {} autre(s) en attente", c.queue.len() - 3)));
    }
    parts.push(sep(false));

    parts.push(text(format!("**Questions écrites** ({})", c.questions.len())));
    if c.questions.is_empty() {
        parts.push(text("-# Aucune question en attente."));
    }
    for q in c.questions.iter().take(2) {
        parts.push(text(format!("<@{}>\n> {}", q.author, clip(&q.text, 300))));
        parts.push(row(vec![
            button(format!("{PREFIX}show:{v}:{}", q.id), "Afficher", ButtonStyle::Primary, false),
            button(format!("{PREFIX}skip:{v}:{}", q.id), "Ignorer", ButtonStyle::Secondary, false),
        ]));
    }
    parts.push(sep(true));
    parts.push(text(format!(
        "-# {listeners} à l'écoute · {} au maximum · entrée {} · commencée <t:{}:R>",
        c.peak.max(listeners),
        if c.locked { "verrouillée" } else { "ouverte" },
        c.started
    )));
    parts.push(row(vec![
        button(format!("{PREFIX}next:{v}"), "Suivant", ButtonStyle::Success, c.queue.is_empty()),
        button(format!("{PREFIX}muteall:{v}"), "Tout le monde en écoute", ButtonStyle::Secondary, c.speakers.is_empty()),
        button(format!("{PREFIX}lock:{v}"), if c.locked { "Déverrouiller l'entrée" } else { "Verrouiller l'entrée" }, ButtonStyle::Secondary, false),
        button(format!("{PREFIX}end:{v}"), "Terminer", ButtonStyle::Danger, false),
    ]));
    vec![container(parts)]
}

fn card(content: String) -> Vec<Component> {
    vec![container(vec![text(content)])]
}

async fn post(http: &HttpClient, channel: Id<ChannelMarker>, components: &[Component], ping_roles: bool) -> Option<Id<MessageMarker>> {
    let mentions = AllowedMentions {
        parse: if ping_roles { vec![MentionType::Roles, MentionType::Users] } else { vec![MentionType::Users] },
        ..Default::default()
    };
    let res = http.create_message(channel).flags(V2).allowed_mentions(Some(&mentions)).components(components).await.ok()?;
    res.model().await.ok().map(|m| m.id)
}

async fn refresh_regie(http: &HttpClient, c: &Conf) {
    if let Some(msg) = c.regie_message {
        let _ = http.update_message(Id::new(c.regie), Id::new(msg)).flags(V2).components(Some(&regie_panel(c))).await;
    }
}

async fn reply(http: &HttpClient, i: &Interaction, content: impl Into<String>) -> anyhow::Result<()> {
    let response = InteractionResponse {
        kind: InteractionResponseType::ChannelMessageWithSource,
        data: Some(InteractionResponseData {
            components: Some(card(content.into())),
            flags: Some(MessageFlags::EPHEMERAL | V2),
            allowed_mentions: Some(AllowedMentions::default()),
            ..Default::default()
        }),
    };
    http.interaction(i.application_id).create_response(i.id, &i.token, &response).await?;
    Ok(())
}

async fn update_regie_response(http: &HttpClient, i: &Interaction, c: &Conf) -> anyhow::Result<()> {
    let response = InteractionResponse {
        kind: InteractionResponseType::UpdateMessage,
        data: Some(InteractionResponseData { components: Some(regie_panel(c)), flags: Some(V2), ..Default::default() }),
    };
    http.interaction(i.application_id).create_response(i.id, &i.token, &response).await?;
    Ok(())
}

fn can_manage(i: &Interaction, c: &Conf) -> bool {
    if i.author_id().map(|a| a.get()) == Some(c.host) {
        return true;
    }
    let Some(member) = i.member.as_ref() else { return false };
    if member.permissions.is_some_and(|p| p.contains(Permissions::ADMINISTRATOR) || p.contains(Permissions::MANAGE_GUILD)) {
        return true;
    }
    cohost_role().is_some_and(|r| member.roles.contains(&r))
}

async fn allow_speak(http: &HttpClient, voice: u64, user: u64) {
    let overwrite = HttpOverwrite { allow: Some(Permissions::SPEAK), deny: Some(Permissions::empty()), id: Id::new(user), kind: HttpOverwriteType::Member };
    let _ = http.update_channel_permission(Id::new(voice), &overwrite).await;
}

async fn deny_speak(http: &HttpClient, voice: u64, user: u64) {
    let _ = http.delete_channel_permission(Id::new(voice)).member(Id::new(user)).await;
}

async fn set_entry(http: &HttpClient, c: &Conf) {
    let mut allow = Permissions::VIEW_CHANNEL;
    let mut deny = Permissions::SPEAK;
    if c.locked {
        deny |= Permissions::CONNECT;
    } else {
        allow |= Permissions::CONNECT;
    }
    let overwrite = HttpOverwrite { allow: Some(allow), deny: Some(deny), id: Id::new(c.guild), kind: HttpOverwriteType::Role };
    let _ = http.update_channel_permission(Id::new(c.voice), &overwrite).await;
}

fn with_conf<T>(voice: u64, f: impl FnOnce(&mut Conf) -> T) -> Option<(T, Conf)> {
    let mut all = confs().lock().unwrap();
    let c = all.get_mut(&voice)?;
    let out = f(c);
    Some((out, c.clone()))
}

fn schedule_end_of_speech(http: Arc<HttpClient>, db: PgPool, voice: u64, user: u64, deadline: i64) {
    tokio::spawn(async move {
        let wait = (deadline - now()).max(0) as u64;
        tokio::time::sleep(Duration::from_secs(wait)).await;
        let Some((true, c)) = with_conf(voice, |c| {
            let before = c.speakers.len();
            c.speakers.retain(|(u, d)| !(*u == user && *d == Some(deadline)));
            c.speakers.len() != before
        }) else {
            return;
        };
        deny_speak(&http, voice, user).await;
        let _ = post(&http, Id::new(voice), &card(format!("-# Temps de parole écoulé pour <@{user}>.")), false).await;
        refresh_regie(&http, &c).await;
        save(&db, &c).await;
    });
}

pub fn register() -> Command {
    CommandBuilder::new("conference", "Organiser une conférence vocale", CommandType::ChatInput)
        .default_member_permissions(Permissions::MANAGE_CHANNELS)
        .option(
            SubCommandBuilder::new("start", "Lancer une conférence")
                .option(StringBuilder::new("titre", "Sujet de la conférence").required(true).max_length(80))
                .option(StringBuilder::new("description", "Quelques mots sur le programme").required(false).max_length(300)),
        )
        .option(SubCommandBuilder::new("end", "Terminer ta conférence en cours"))
        .build()
}

pub async fn run(interaction: Interaction, http: Arc<HttpClient>, db: PgPool) -> anyhow::Result<()> {
    let (Some(guild), Some(author)) = (interaction.guild_id, interaction.author_id()) else {
        return reply(&http, &interaction, "Cette commande s'utilise sur un serveur.").await;
    };
    let Some(InteractionData::ApplicationCommand(cmd)) = &interaction.data else { return Ok(()) };
    let Some(sub) = cmd.options.first() else { return Ok(()) };
    let opts = match &sub.value {
        CommandOptionValue::SubCommand(o) => o.clone(),
        _ => vec![],
    };
    let opt = |name: &str| {
        opts.iter().find(|o| o.name == name).and_then(|o| match &o.value {
            CommandOptionValue::String(s) => Some(s.trim().to_string()).filter(|s| !s.is_empty()),
            _ => None,
        })
    };

    if sub.name == "end" {
        let voice = {
            let all = confs().lock().unwrap();
            all.values()
                .find(|c| c.regie == interaction.channel.as_ref().map(|ch| ch.id.get()).unwrap_or(0) && can_manage(&interaction, c))
                .or_else(|| all.values().find(|c| c.host == author.get()))
                .map(|c| c.voice)
        };
        return match voice {
            Some(v) => {
                reply(&http, &interaction, "Conférence terminée. Les salons sont supprimés et le bilan est publié.").await?;
                end(&http, &db, v).await;
                Ok(())
            }
            None => reply(&http, &interaction, "Tu n'animes aucune conférence en cours.").await,
        };
    }

    if confs().lock().unwrap().values().any(|c| c.host == author.get()) {
        return reply(&http, &interaction, "Tu animes déjà une conférence. Termine-la avant d'en lancer une autre.").await;
    }
    let title = opt("titre").unwrap_or_else(|| "Conférence".to_string());
    let description = opt("description");

    let defer = InteractionResponse {
        kind: InteractionResponseType::DeferredChannelMessageWithSource,
        data: Some(InteractionResponseData { flags: Some(MessageFlags::EPHEMERAL), ..Default::default() }),
    };
    http.interaction(interaction.application_id).create_response(interaction.id, &interaction.token, &defer).await?;

    match start(&http, &db, &interaction, guild, author, title, description).await {
        Ok(c) => {
            let msg = format!("Conférence lancée : rejoins <#{}>. La régie est dans <#{}>.", c.voice, c.regie);
            let _ = http.interaction(interaction.application_id).update_response(&interaction.token).content(Some(&msg)).await;
        }
        Err(e) => {
            tracing::warn!("Conférence : lancement impossible : {e:?}");
            let _ = http
                .interaction(interaction.application_id)
                .update_response(&interaction.token)
                .content(Some("Impossible de créer les salons de la conférence (permissions du bot ?)."))
                .await;
        }
    }
    Ok(())
}

async fn start(
    http: &Arc<HttpClient>,
    db: &PgPool,
    interaction: &Interaction,
    guild: Id<GuildMarker>,
    host: Id<UserMarker>,
    title: String,
    description: Option<String>,
) -> anyhow::Result<Conf> {
    let everyone = Id::new(guild.get());
    let cohost = cohost_role();
    let staff_view = Permissions::VIEW_CHANNEL | Permissions::SEND_MESSAGES | Permissions::READ_MESSAGE_HISTORY;

    let category = http.create_guild_channel(guild, &clip(&format!("Conférence · {title}"), 100)).kind(ChannelType::GuildCategory).await?.model().await?;

    let mut voice_perms = vec![
        PermissionOverwrite { id: everyone, kind: PermissionOverwriteType::Role, allow: Permissions::VIEW_CHANNEL | Permissions::CONNECT, deny: Permissions::SPEAK },
        PermissionOverwrite {
            id: host.cast(),
            kind: PermissionOverwriteType::Member,
            allow: Permissions::SPEAK | Permissions::PRIORITY_SPEAKER | Permissions::MUTE_MEMBERS | Permissions::MOVE_MEMBERS,
            deny: Permissions::empty(),
        },
    ];
    let mut regie_perms = vec![
        PermissionOverwrite { id: everyone, kind: PermissionOverwriteType::Role, allow: Permissions::empty(), deny: Permissions::VIEW_CHANNEL },
        PermissionOverwrite { id: host.cast(), kind: PermissionOverwriteType::Member, allow: staff_view, deny: Permissions::empty() },
    ];
    if let Some(role) = cohost {
        voice_perms.push(PermissionOverwrite {
            id: role.cast(),
            kind: PermissionOverwriteType::Role,
            allow: Permissions::SPEAK | Permissions::MUTE_MEMBERS | Permissions::MOVE_MEMBERS,
            deny: Permissions::empty(),
        });
        regie_perms.push(PermissionOverwrite { id: role.cast(), kind: PermissionOverwriteType::Role, allow: staff_view, deny: Permissions::empty() });
    }

    let voice = http.create_guild_channel(guild, "Conférence").kind(ChannelType::GuildVoice).parent_id(category.id).permission_overwrites(&voice_perms).await?.model().await?;
    let regie = http.create_guild_channel(guild, "régie").kind(ChannelType::GuildText).parent_id(category.id).permission_overwrites(&regie_perms).await?.model().await?;

    let user = interaction.member.as_ref().and_then(|m| m.user.clone()).or_else(|| interaction.user.clone());
    let host_avatar = match user.as_ref().and_then(|u| u.avatar) {
        Some(hash) => format!("https://cdn.discordapp.com/avatars/{}/{}.png?size=256", host, hash),
        None => "https://cdn.discordapp.com/embed/avatars/0.png".to_string(),
    };
    let panel_channel = id_setting("announceChannelId")
        .or_else(|| interaction.channel.as_ref().map(|c| c.id.get()))
        .unwrap_or(regie.id.get());

    let mut conf = Conf {
        guild: guild.get(),
        host: host.get(),
        host_avatar,
        title,
        description,
        category: category.id.get(),
        voice: voice.id.get(),
        regie: regie.id.get(),
        panel_channel,
        panel_message: None,
        regie_message: None,
        ping_role: id_setting("pingRoleId"),
        started: now(),
        queue: vec![],
        speakers: vec![],
        questions: vec![],
        next_question: 1,
        locked: false,
        peak: 0,
        spoke: vec![],
        asked: 0,
        shown: 0,
        listeners: 0,
    };
    conf.regie_message = post(http, regie.id, &regie_panel(&conf), false).await.map(|m| m.get());
    conf.panel_message = post(http, Id::new(panel_channel), &public_panel(&conf), true).await.map(|m| m.get());
    let _ = http.update_guild_member(guild, host).channel_id(Some(voice.id)).await;

    confs().lock().unwrap().insert(conf.voice, conf.clone());
    save(db, &conf).await;
    Ok(conf)
}

async fn end(http: &Arc<HttpClient>, db: &PgPool, voice: u64) {
    let Some(c) = confs().lock().unwrap().remove(&voice) else { return };
    if let Some(msg) = c.panel_message {
        let _ = http.update_message(Id::new(c.panel_channel), Id::new(msg)).flags(V2).components(Some(&ended_panel(&c))).await;
    }
    for channel in [c.voice, c.regie, c.category] {
        let _ = http.delete_channel(Id::new(channel)).await;
    }
    forget(db, voice).await;
}

pub async fn handle_component(interaction: Interaction, http: Arc<HttpClient>, db: PgPool, custom_id: &str) -> anyhow::Result<()> {
    if LEGACY.iter().any(|p| custom_id.starts_with(p)) {
        return reply(&http, &interaction, "Cette conférence est terminée. Lance-en une nouvelle avec `/conference start`.").await;
    }
    let parts: Vec<&str> = custom_id.trim_start_matches(PREFIX).split(':').collect();
    let action = parts.first().copied().unwrap_or("");
    let Some(voice) = parts.get(1).and_then(|v| v.parse::<u64>().ok()) else { return Ok(()) };
    let arg = parts.get(2).and_then(|v| v.parse::<u64>().ok());
    let Some(user) = interaction.author_id().map(|u| u.get()) else { return Ok(()) };
    let Some(conf) = confs().lock().unwrap().get(&voice).cloned() else {
        return reply(&http, &interaction, "Cette conférence est terminée.").await;
    };

    match action {
        "hand" => {
            if conf.speakers.iter().any(|(u, _)| *u == user) {
                return reply(&http, &interaction, "Tu as déjà la parole.").await;
            }
            if !activity::humans_in(Id::new(voice)).contains(&user) {
                return reply(&http, &interaction, format!("Rejoins d'abord le vocal <#{voice}>, puis lève la main.")).await;
            }
            let Some((pos, c)) = with_conf(voice, |c| {
                if let Some(i) = c.queue.iter().position(|u| *u == user) {
                    c.queue.remove(i);
                    None
                } else {
                    c.queue.push(user);
                    Some(c.queue.len())
                }
            }) else {
                return Ok(());
            };
            refresh_regie(&http, &c).await;
            save(&db, &c).await;
            match pos {
                Some(p) => reply(&http, &interaction, format!("Main levée. Tu es **{p}{}** dans la file : un animateur va te donner la parole.\n-# Clique à nouveau pour baisser la main.", if p == 1 { "er" } else { "e" })).await,
                None => reply(&http, &interaction, "Tu as baissé la main.").await,
            }
        }
        "ask" => {
            if conf.questions.iter().any(|q| q.author == user) {
                return reply(&http, &interaction, "Ta question est déjà entre les mains des animateurs. Attends qu'elle soit traitée.").await;
            }
            let modal = InteractionResponse {
                kind: InteractionResponseType::Modal,
                data: Some(InteractionResponseData {
                    custom_id: Some(format!("{PREFIX}askm:{voice}")),
                    title: Some("Poser une question".to_string()),
                    components: Some(vec![row(vec![Component::TextInput(TextInput {
                        id: None,
                        custom_id: "question".to_string(),
                        label: Some("Ta question".to_string()),
                        max_length: Some(300),
                        min_length: Some(5),
                        placeholder: Some("Elle sera lue par les animateurs avant d'être affichée.".to_string()),
                        required: Some(true),
                        style: TextInputStyle::Paragraph,
                        value: None,
                    })])]),
                    ..Default::default()
                }),
            };
            http.interaction(interaction.application_id).create_response(interaction.id, &interaction.token, &modal).await?;
            Ok(())
        }
        "endok" | "give" | "next" | "revoke" | "muteall" | "lock" | "end" | "show" | "skip" if !can_manage(&interaction, &conf) => {
            reply(&http, &interaction, "Seuls l'animateur et les co-animateurs peuvent faire ça.").await
        }
        "give" | "next" => {
            let target = if action == "next" { conf.queue.first().copied() } else { arg };
            let Some(target) = target else { return update_regie_response(&http, &interaction, &conf).await };
            let limit = speak_seconds();
            let deadline = (limit > 0).then(|| now() + limit);
            let Some((_, c)) = with_conf(voice, |c| {
                c.queue.retain(|u| *u != target);
                if !c.speakers.iter().any(|(u, _)| *u == target) {
                    c.speakers.push((target, deadline));
                }
                if !c.spoke.contains(&target) {
                    c.spoke.push(target);
                }
            }) else {
                return Ok(());
            };
            allow_speak(&http, voice, target).await;
            update_regie_response(&http, &interaction, &c).await?;
            let note = match deadline {
                Some(d) => format!("🎙️ <@{target}> a la parole, jusqu'à <t:{d}:T>."),
                None => format!("🎙️ <@{target}> a la parole."),
            };
            let _ = post(&http, Id::new(voice), &card(note), false).await;
            if let Some(d) = deadline {
                schedule_end_of_speech(Arc::clone(&http), db.clone(), voice, target, d);
            }
            save(&db, &c).await;
            Ok(())
        }
        "revoke" => {
            let Some(target) = arg else { return Ok(()) };
            let Some((_, c)) = with_conf(voice, |c| c.speakers.retain(|(u, _)| *u != target)) else { return Ok(()) };
            deny_speak(&http, voice, target).await;
            update_regie_response(&http, &interaction, &c).await?;
            save(&db, &c).await;
            Ok(())
        }
        "muteall" => {
            let Some((removed, c)) = with_conf(voice, |c| std::mem::take(&mut c.speakers)) else { return Ok(()) };
            for (u, _) in removed {
                deny_speak(&http, voice, u).await;
            }
            update_regie_response(&http, &interaction, &c).await?;
            let _ = post(&http, Id::new(voice), &card("-# Tout le monde repasse en écoute.".to_string()), false).await;
            save(&db, &c).await;
            Ok(())
        }
        "lock" => {
            let Some((_, c)) = with_conf(voice, |c| c.locked = !c.locked) else { return Ok(()) };
            set_entry(&http, &c).await;
            update_regie_response(&http, &interaction, &c).await?;
            save(&db, &c).await;
            Ok(())
        }
        "show" | "skip" => {
            let Some(qid) = arg.map(|a| a as u32) else { return Ok(()) };
            let Some((question, c)) = with_conf(voice, |c| {
                let q = c.questions.iter().position(|q| q.id == qid).map(|i| c.questions.remove(i));
                if q.is_some() && action == "show" {
                    c.shown += 1;
                }
                q
            }) else {
                return Ok(());
            };
            update_regie_response(&http, &interaction, &c).await?;
            if let (Some(q), "show") = (question, action) {
                let _ = post(&http, Id::new(voice), &card(format!("-# Question de <@{}>\n### {}", q.author, q.text)), false).await;
            }
            save(&db, &c).await;
            Ok(())
        }
        "end" => {
            let response = InteractionResponse {
                kind: InteractionResponseType::ChannelMessageWithSource,
                data: Some(InteractionResponseData {
                    components: Some(vec![container(vec![
                        text("**Terminer la conférence ?**\nLe vocal et la régie seront supprimés, et le bilan remplacera l'annonce."),
                        row(vec![button(format!("{PREFIX}endok:{voice}"), "Oui, terminer", ButtonStyle::Danger, false)]),
                    ])]),
                    flags: Some(MessageFlags::EPHEMERAL | V2),
                    ..Default::default()
                }),
            };
            http.interaction(interaction.application_id).create_response(interaction.id, &interaction.token, &response).await?;
            Ok(())
        }
        "endok" => {
            reply(&http, &interaction, "Conférence terminée.").await?;
            end(&http, &db, voice).await;
            Ok(())
        }
        _ => Ok(()),
    }
}

pub async fn handle_modal(interaction: Interaction, http: Arc<HttpClient>, db: PgPool, modal: &ModalInteractionData) -> anyhow::Result<()> {
    let Some(voice) = modal.custom_id.trim_start_matches(PREFIX).strip_prefix("askm:").and_then(|v| v.parse::<u64>().ok()) else { return Ok(()) };
    let Some(user) = interaction.author_id().map(|u| u.get()) else { return Ok(()) };
    let question = crate::utils::extract_modal_inputs(&modal.components)
        .into_iter()
        .find(|(k, _)| k == "question")
        .map(|(_, v)| v.trim().to_string())
        .filter(|v| !v.is_empty());
    let Some(question) = question else { return reply(&http, &interaction, "Question vide.").await };
    let Some((accepted, c)) = with_conf(voice, |c| {
        if c.questions.iter().any(|q| q.author == user) {
            return false;
        }
        c.questions.push(Question { id: c.next_question, author: user, text: clip(&question, 300) });
        c.next_question += 1;
        c.asked += 1;
        true
    }) else {
        return reply(&http, &interaction, "Cette conférence est terminée.").await;
    };
    if !accepted {
        return reply(&http, &interaction, "Tu as déjà une question en attente.").await;
    }
    refresh_regie(&http, &c).await;
    save(&db, &c).await;
    reply(&http, &interaction, "Question envoyée aux animateurs. Elle sera affichée s'ils la retiennent.").await
}

pub async fn on_voice_state(http: &Arc<HttpClient>, db: &PgPool, user: Id<UserMarker>, channel: Option<Id<ChannelMarker>>) {
    let voices: Vec<u64> = confs().lock().unwrap().keys().copied().collect();
    for voice in voices {
        let inside = channel.map(|c| c.get()) == Some(voice);
        let Some(((changed, was_speaker), c)) = with_conf(voice, |c| {
            let listeners = activity::humans_in(Id::new(voice)).len();
            let mut changed = listeners != c.listeners;
            c.listeners = listeners;
            c.peak = c.peak.max(listeners);
            let mut was_speaker = false;
            if !inside {
                let queued = c.queue.len();
                c.queue.retain(|u| *u != user.get());
                was_speaker = c.speakers.iter().any(|(u, _)| *u == user.get());
                c.speakers.retain(|(u, _)| *u != user.get());
                changed |= was_speaker || queued != c.queue.len();
            }
            (changed, was_speaker)
        }) else {
            continue;
        };
        if was_speaker {
            deny_speak(http, voice, user.get()).await;
        }
        if changed {
            refresh_regie(http, &c).await;
            save(db, &c).await;
        }
    }
}

pub fn restore(http: Arc<HttpClient>, db: PgPool) {
    tokio::spawn(async move {
        let rows = sqlx::query("SELECT value FROM bot_runtime WHERE key LIKE 'conference:%'").fetch_all(&db).await.unwrap_or_default();
        for row in rows {
            let Ok(value) = row.try_get::<String, _>("value") else { continue };
            let Ok(c) = serde_json::from_str::<Conf>(&value) else { continue };
            if http.channel(Id::new(c.voice)).await.is_err() {
                forget(&db, c.voice).await;
                continue;
            }
            for (user, deadline) in &c.speakers {
                if let Some(d) = deadline {
                    schedule_end_of_speech(Arc::clone(&http), db.clone(), c.voice, *user, *d);
                }
            }
            confs().lock().unwrap().insert(c.voice, c.clone());
            refresh_regie(&http, &c).await;
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    fn count(list: &[Component]) -> usize {
        list.iter()
            .map(|c| {
                1 + match c {
                    Component::Container(x) => count(&x.components),
                    Component::ActionRow(x) => count(&x.components),
                    Component::Section(x) => count(&x.components) + count(std::slice::from_ref(&*x.accessory)),
                    _ => 0,
                }
            })
            .sum()
    }

    fn full() -> Conf {
        Conf {
            guild: 1, host: 2, host_avatar: "https://cdn.discordapp.com/embed/avatars/0.png".into(), title: "T".repeat(80), description: Some("D".repeat(300)),
            category: 3, voice: 4, regie: 5, panel_channel: 6, panel_message: None, regie_message: None, ping_role: Some(7), started: 0,
            queue: (10..30).collect(), speakers: (30..40).map(|u| (u, Some(0))).collect(),
            questions: (0..10).map(|i| Question { id: i, author: 50 + i as u64, text: "Q".repeat(300) }).collect(),
            next_question: 11, locked: false, peak: 0, spoke: vec![], asked: 10, shown: 0, listeners: 0,
        }
    }

    #[test]
    fn regie_sous_la_limite_de_discord() {
        let n = count(&regie_panel(&full()));
        assert!(n <= 40, "régie : {n} composants");
        assert!(count(&public_panel(&full())) <= 40);
        assert!(count(&ended_panel(&full())) <= 40);
    }

    #[test]
    fn textes_sous_4000_caracteres() {
        fn chars(list: &[Component]) -> usize {
            list.iter()
                .map(|c| match c {
                    Component::TextDisplay(t) => t.content.chars().count(),
                    Component::Container(x) => chars(&x.components),
                    Component::Section(x) => chars(&x.components),
                    _ => 0,
                })
                .sum()
        }
        assert!(chars(&regie_panel(&full())) <= 4000);
    }
}
