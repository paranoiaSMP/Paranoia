use chrono::{NaiveTime, TimeZone, Utc};
use chrono_tz::Europe::Paris;
use sqlx::{PgPool, Row};
use std::sync::Arc;
use twilight_http::Client as HttpClient;
use twilight_model::application::command::{Command, CommandType};
use twilight_model::application::interaction::Interaction;
use twilight_model::channel::message::component::{ActionRow, Button, ButtonStyle, Component};
use twilight_model::channel::message::{Embed, MessageFlags};
use twilight_model::http::interaction::{InteractionResponse, InteractionResponseData, InteractionResponseType};
use twilight_model::id::{marker::UserMarker, Id};
use twilight_util::builder::command::CommandBuilder;
use twilight_util::builder::embed::{EmbedBuilder, EmbedFooterBuilder};

use crate::modules::{activity, setting_number, wallet};

const ID: &str = "quests";
pub const PREFIX: &str = "quest_claim:";

struct Quest {
    key: &'static str,
    label: String,
    done: i64,
    target: i64,
    reward: i32,
    claimed: bool,
}

pub fn register() -> Command {
    CommandBuilder::new("quetes", "Tes quêtes du jour et leurs récompenses en ParaCoins", CommandType::ChatInput).build()
}

fn day_start_utc() -> chrono::DateTime<Utc> {
    let today = Utc::now().with_timezone(&Paris).date_naive().and_time(NaiveTime::MIN);
    Paris.from_local_datetime(&today).earliest().map(|d| d.with_timezone(&Utc)).unwrap_or_else(Utc::now)
}

async fn load(db: &PgPool, user_id: &str, discord: Id<UserMarker>) -> Vec<Quest> {
    let day = wallet::today();
    let row = sqlx::query(r#"SELECT messages, "voiceMinutes", claimed FROM "BotDailyProgress" WHERE "userId" = $1 AND day = $2"#)
        .bind(user_id)
        .bind(&day)
        .fetch_optional(db)
        .await
        .ok()
        .flatten();
    let (unsaved_msg, unsaved_voice) = activity::unsaved(discord);
    let messages = row.as_ref().and_then(|r| r.try_get::<i32, _>("messages").ok()).unwrap_or(0) + unsaved_msg;
    let voice = row.as_ref().and_then(|r| r.try_get::<i32, _>("voiceMinutes").ok()).unwrap_or(0) + unsaved_voice;
    let claimed: Vec<String> = row.as_ref().and_then(|r| r.try_get("claimed").ok()).unwrap_or_default();
    let cards: i64 = sqlx::query_scalar(r#"SELECT COUNT(*) FROM "UserCard" WHERE "userId" = $1 AND "obtainedAt" >= $2"#)
        .bind(user_id)
        .bind(day_start_utc().naive_utc())
        .fetch_one(db)
        .await
        .unwrap_or(0);

    let msg_target = setting_number(ID, "messagesTarget", 20).max(1);
    let voice_target = setting_number(ID, "voiceTarget", 30).max(1);
    vec![
        Quest {
            key: "messages",
            label: format!("Envoyer {msg_target} messages"),
            done: messages as i64,
            target: msg_target,
            reward: setting_number(ID, "messagesReward", 50) as i32,
            claimed: claimed.iter().any(|c| c == "messages"),
        },
        Quest {
            key: "voice",
            label: format!("Passer {voice_target} minutes en vocal avec quelqu'un"),
            done: voice as i64,
            target: voice_target,
            reward: setting_number(ID, "voiceReward", 50) as i32,
            claimed: claimed.iter().any(|c| c == "voice"),
        },
        Quest {
            key: "booster",
            label: "Ouvrir un booster sur le site".to_string(),
            done: cards.min(1),
            target: 1,
            reward: setting_number(ID, "boosterReward", 75) as i32,
            claimed: claimed.iter().any(|c| c == "booster"),
        },
    ]
}

fn render(quests: &[Quest]) -> (Embed, Vec<Component>) {
    let lines: Vec<String> = quests
        .iter()
        .map(|q| {
            let done = q.done.min(q.target);
            let filled = (done * 10 / q.target) as usize;
            let state = if q.claimed { "✅ réclamée".to_string() } else if done >= q.target { "🎁 à réclamer".to_string() } else { format!("{done} / {}", q.target) };
            format!("**{}** · {} PC\n{}{}  {state}", q.label, q.reward, "▰".repeat(filled), "▱".repeat(10 - filled))
        })
        .collect();
    let embed = EmbedBuilder::new()
        .title("Quêtes du jour")
        .description(lines.join("\n\n"))
        .color(0x7c3aed)
        .footer(EmbedFooterBuilder::new("Nouvelles quêtes chaque jour à minuit (heure de Paris)"))
        .build();

    let buttons: Vec<Component> = quests
        .iter()
        .filter(|q| !q.claimed && q.done >= q.target)
        .map(|q| {
            Component::Button(Button {
                id: None,
                custom_id: Some(format!("{PREFIX}{}", q.key)),
                disabled: false,
                emoji: None,
                label: Some(format!("Réclamer {} PC", q.reward)),
                style: ButtonStyle::Success,
                url: None,
                sku_id: None,
            })
        })
        .collect();
    let components = if buttons.is_empty() { vec![] } else { vec![Component::ActionRow(ActionRow { id: None, components: buttons })] };
    (embed, components)
}

async fn respond(http: &HttpClient, interaction: &Interaction, kind: InteractionResponseType, data: InteractionResponseData) -> anyhow::Result<()> {
    let response = InteractionResponse { kind, data: Some(data) };
    http.interaction(interaction.application_id).create_response(interaction.id, &interaction.token, &response).await?;
    Ok(())
}

fn not_linked() -> InteractionResponseData {
    InteractionResponseData { content: Some(wallet::NOT_LINKED.to_string()), flags: Some(MessageFlags::EPHEMERAL), ..Default::default() }
}

pub async fn run(interaction: Interaction, http: Arc<HttpClient>, db: PgPool) -> anyhow::Result<()> {
    let Some(discord) = interaction.author_id() else { return Ok(()) };
    let Some(user_id) = wallet::user_id(&db, &discord.to_string()).await else {
        return respond(&http, &interaction, InteractionResponseType::ChannelMessageWithSource, not_linked()).await;
    };
    let (embed, components) = render(&load(&db, &user_id, discord).await);
    respond(&http, &interaction, InteractionResponseType::ChannelMessageWithSource, InteractionResponseData {
        embeds: Some(vec![embed]),
        components: Some(components),
        flags: Some(MessageFlags::EPHEMERAL),
        ..Default::default()
    })
    .await
}

pub async fn handle_claim(interaction: Interaction, http: Arc<HttpClient>, db: PgPool, custom_id: &str) -> anyhow::Result<()> {
    let Some(discord) = interaction.author_id() else { return Ok(()) };
    let Some(key) = custom_id.strip_prefix(PREFIX) else { return Ok(()) };
    let Some(user_id) = wallet::user_id(&db, &discord.to_string()).await else {
        return respond(&http, &interaction, InteractionResponseType::ChannelMessageWithSource, not_linked()).await;
    };

    let quests = load(&db, &user_id, discord).await;
    let Some(quest) = quests.iter().find(|q| q.key == key && !q.claimed && q.done >= q.target) else {
        let (embed, components) = render(&quests);
        return respond(&http, &interaction, InteractionResponseType::UpdateMessage, InteractionResponseData {
            embeds: Some(vec![embed]),
            components: Some(components),
            ..Default::default()
        })
        .await;
    };

    let claimed = sqlx::query(
        r#"INSERT INTO "BotDailyProgress" ("userId", day, claimed, "updatedAt") VALUES ($1, $2, ARRAY[$3], NOW())
           ON CONFLICT ("userId", day) DO UPDATE SET claimed = array_append("BotDailyProgress".claimed, $3), "updatedAt" = NOW()
           WHERE NOT ($3 = ANY("BotDailyProgress".claimed))
           RETURNING "userId""#,
    )
    .bind(&user_id)
    .bind(wallet::today())
    .bind(key)
    .fetch_optional(&db)
    .await?
    .is_some();
    if claimed {
        wallet::credit(&db, &discord.to_string(), quest.reward).await;
    }

    let (embed, components) = render(&load(&db, &user_id, discord).await);
    respond(&http, &interaction, InteractionResponseType::UpdateMessage, InteractionResponseData {
        embeds: Some(vec![embed]),
        components: Some(components),
        ..Default::default()
    })
    .await
}
