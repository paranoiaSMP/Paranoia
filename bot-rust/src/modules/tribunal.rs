//! Tribunal : procès communautaire (humoristique). Vote Coupable / Innocent, prolongation, sentence automatique, immunité 24 h.
use sqlx::{PgPool, Row};
use std::sync::Arc;
use std::time::Duration;
use twilight_http::Client as HttpClient;
use twilight_model::application::command::{Command, CommandType};
use twilight_model::application::interaction::{application_command::CommandOptionValue, Interaction, InteractionData};
use twilight_model::channel::message::{
    component::{ActionRow, Button, ButtonStyle, Component},
    Embed, EmojiReactionType, MessageFlags,
};
use twilight_model::http::interaction::{InteractionResponse, InteractionResponseData, InteractionResponseType};
use twilight_model::id::Id;
use twilight_util::builder::command::{CommandBuilder, StringBuilder, UserBuilder};
use twilight_util::builder::embed::EmbedBuilder;

use crate::modules::setting_number;
use crate::utils::emoji::{AUTHOR, DEMOTE, MESSAGE, OK, SANCTION, STATS, TIME};
use crate::utils::emoji_parts;

pub const VOTE: &str = "tr_vote:";
pub const EXTEND: &str = "tr_ext:";
const ID: &str = "tribunal";
const MAX_EXTENSIONS: i32 = 2;

pub fn register() -> Command {
    CommandBuilder::new("tribunal", "Accuser un membre devant la cour (humoristique)", CommandType::ChatInput)
        .option(UserBuilder::new("membre", "Le membre accusé").required(true))
        .option(StringBuilder::new("motif", "Le crime reproché").required(true))
        .option(
            StringBuilder::new("sanction", "Peine si l'accusé est déclaré coupable")
                .required(true)
                .choices([("Exclusion temporaire", "mute"), ("Amende en ParaCoins", "money"), ("Message du tribunal", "text")]),
        )
        .option(StringBuilder::new("texte", "Message à afficher (pour « Message du tribunal »)").required(false))
        .build()
}

struct Trial {
    target: i64,
    author: i64,
    motif: String,
    sanction: String,
    ends: i64,
}

fn sanction_label(kind: &str) -> String {
    match kind {
        "mute" => format!("Exclusion de {} min", setting_number(ID, "muteMinutes", 1)),
        "money" => format!("Amende de {} ParaCoins", setting_number(ID, "fine", 500)),
        _ => "Message du tribunal".to_string(),
    }
}

fn open_embed(t: &Trial) -> Embed {
    let lines = [
        format!("{AUTHOR} | **Accusé :** <@{}>", t.target),
        format!("{MESSAGE} | **Plaignant :** <@{}>", t.author),
        format!("{MESSAGE} | **Motif :** {}", t.motif),
        format!("{SANCTION} | **Peine requise :** {}", sanction_label(&t.sanction)),
        format!("{TIME} | **Fin du vote :** <t:{}:R>", t.ends),
    ];
    EmbedBuilder::new().description(format!("## {SANCTION} | Procès ouvert\n\n{}", lines.join("\n\n"))).color(0xf59e0b).build()
}

fn buttons(id: i64, guilty: i64, innocent: i64, disabled: bool) -> Vec<Component> {
    let btn = |custom: String, label: String, style, emoji: &str| {
        Component::Button(Button {
            id: None,
            custom_id: Some(custom),
            disabled,
            emoji: emoji_parts(emoji).map(|(n, i)| EmojiReactionType::Custom { animated: false, id: Id::new(i), name: Some(n.to_string()) }),
            label: Some(label),
            style,
            url: None,
            sku_id: None,
        })
    };
    vec![Component::ActionRow(ActionRow {
        id: None,
        components: vec![
            btn(format!("{VOTE}{id}:i"), format!("Innocent ({innocent})"), ButtonStyle::Success, &OK),
            btn(format!("{VOTE}{id}:g"), format!("Coupable ({guilty})"), ButtonStyle::Danger, &DEMOTE),
            btn(format!("{EXTEND}{id}"), "Prolonger (+1 min)".into(), ButtonStyle::Secondary, &TIME),
        ],
    })]
}

/// Égalité = acquittement.
fn is_guilty(guilty: i64, innocent: i64) -> bool {
    guilty > innocent
}

async fn say(http: &HttpClient, i: &Interaction, text: &str) -> anyhow::Result<()> {
    let data = InteractionResponseData { content: Some(text.to_string()), flags: Some(MessageFlags::EPHEMERAL), ..Default::default() };
    http.interaction(i.application_id).create_response(i.id, &i.token, &InteractionResponse { kind: InteractionResponseType::ChannelMessageWithSource, data: Some(data) }).await?;
    Ok(())
}

pub async fn run(interaction: Interaction, http: Arc<HttpClient>, db: PgPool) -> anyhow::Result<()> {
    let (mut target, mut motif, mut sanction, mut text, mut is_bot) = (None, String::new(), String::new(), None, false);
    if let Some(InteractionData::ApplicationCommand(cmd)) = &interaction.data {
        for o in &cmd.options {
            match (&o.name[..], &o.value) {
                ("membre", CommandOptionValue::User(u)) => {
                    target = Some(*u);
                    is_bot = cmd.resolved.as_ref().and_then(|r| r.users.get(u)).is_some_and(|u| u.bot) || u.get() == interaction.application_id.get();
                }
                ("motif", CommandOptionValue::String(v)) => motif = v.chars().take(300).collect(),
                ("sanction", CommandOptionValue::String(v)) => sanction = v.clone(),
                ("texte", CommandOptionValue::String(v)) => text = Some(v.chars().take(300).collect::<String>()),
                _ => {}
            }
        }
    }
    let (Some(target), Some(author), Some(guild), Some(channel)) =
        (target, interaction.author_id(), interaction.guild_id, interaction.channel.as_ref().map(|c| c.id))
    else {
        return Ok(());
    };
    if target == author {
        return say(&http, &interaction, "Tu ne peux pas t'accuser toi-même.").await;
    }
    if is_bot {
        return say(&http, &interaction, "Les bots sont hors de la juridiction de la cour.").await;
    }
    if sanction == "text" && text.is_none() {
        return say(&http, &interaction, "Précise le message du tribunal dans l'option `texte`.").await;
    }
    let t = target.get() as i64;
    if sqlx::query("SELECT 1 FROM tribunal WHERE target_id = $1 AND NOT ended").bind(t).fetch_optional(&db).await?.is_some() {
        return say(&http, &interaction, "Un procès est déjà en cours contre ce membre.").await;
    }
    if sqlx::query("SELECT 1 FROM tribunal WHERE target_id = $1 AND ended AND ended_at > NOW() - INTERVAL '24 hours'").bind(t).fetch_optional(&db).await?.is_some() {
        return say(&http, &interaction, "Ce membre a déjà été jugé il y a moins de 24 h : il est immunisé.").await;
    }

    let seconds = setting_number(ID, "voteSeconds", 30).clamp(10, 600);
    let ends = chrono::Utc::now() + chrono::Duration::seconds(seconds);
    let id: i64 = sqlx::query_scalar("INSERT INTO tribunal (guild_id, channel_id, target_id, author_id, motif, sanction, custom_text, ends_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id")
        .bind(guild.get() as i64)
        .bind(channel.get() as i64)
        .bind(t)
        .bind(author.get() as i64)
        .bind(&motif)
        .bind(&sanction)
        .bind(&text)
        .bind(ends)
        .fetch_one(&db)
        .await?;

    let trial = Trial { target: t, author: author.get() as i64, motif, sanction, ends: ends.timestamp() };
    let data = InteractionResponseData { content: Some(format!("<@{t}>")), embeds: Some(vec![open_embed(&trial)]), components: Some(buttons(id, 0, 0, false)), ..Default::default() };
    let ack = http.interaction(interaction.application_id);
    ack.create_response(interaction.id, &interaction.token, &InteractionResponse { kind: InteractionResponseType::ChannelMessageWithSource, data: Some(data) }).await?;
    let message = ack.response(&interaction.token).await?.model().await?;
    sqlx::query("UPDATE tribunal SET message_id = $1 WHERE id = $2").bind(message.id.get() as i64).bind(id).execute(&db).await?;
    Ok(())
}

async fn counts(db: &PgPool, id: i64) -> anyhow::Result<(i64, i64)> {
    let r = sqlx::query("SELECT COUNT(*) FILTER (WHERE guilty) AS g, COUNT(*) FILTER (WHERE NOT guilty) AS i FROM tribunal_vote WHERE trial_id = $1").bind(id).fetch_one(db).await?;
    Ok((r.try_get("g")?, r.try_get("i")?))
}

pub async fn handle_button(interaction: Interaction, http: Arc<HttpClient>, db: PgPool, cid: &str) -> anyhow::Result<()> {
    let Some(user) = interaction.author_id().map(|u| u.get() as i64) else { return Ok(()) };
    let (extend, rest) = match cid.strip_prefix(EXTEND) {
        Some(r) => (true, r),
        None => (false, cid.strip_prefix(VOTE).unwrap_or("")),
    };
    let mut parts = rest.split(':');
    let Some(id) = parts.next().and_then(|s| s.parse::<i64>().ok()) else { return Ok(()) };
    let Some(row) = sqlx::query("SELECT channel_id, message_id, target_id, author_id, motif, sanction, ends_at, extended, ended FROM tribunal WHERE id = $1").bind(id).fetch_optional(&db).await? else {
        return say(&http, &interaction, "Ce procès n'existe plus.").await;
    };
    if row.try_get::<bool, _>("ended")? {
        return say(&http, &interaction, "Le procès est terminé.").await;
    }
    let target: i64 = row.try_get("target_id")?;
    if user == target {
        return say(&http, &interaction, "L'accusé ne peut ni voter ni prolonger.").await;
    }
    let mut ends: chrono::DateTime<chrono::Utc> = row.try_get("ends_at")?;
    let reply = if extend {
        if row.try_get::<i32, _>("extended")? >= MAX_EXTENSIONS {
            return say(&http, &interaction, "Le procès a déjà été prolongé au maximum.").await;
        }
        ends += chrono::Duration::seconds(60);
        sqlx::query("UPDATE tribunal SET ends_at = $1, extended = extended + 1 WHERE id = $2").bind(ends).bind(id).execute(&db).await?;
        "Procès prolongé d'une minute."
    } else {
        let guilty = parts.next() == Some("g");
        sqlx::query("INSERT INTO tribunal_vote (trial_id, user_id, guilty) VALUES ($1,$2,$3) ON CONFLICT (trial_id, user_id) DO UPDATE SET guilty = $3").bind(id).bind(user).bind(guilty).execute(&db).await?;
        if guilty { "Vote enregistré : coupable." } else { "Vote enregistré : innocent." }
    };
    say(&http, &interaction, reply).await?;

    let (g, i) = counts(&db, id).await?;
    let trial = Trial { target, author: row.try_get("author_id")?, motif: row.try_get("motif")?, sanction: row.try_get("sanction")?, ends: ends.timestamp() };
    let _ = http
        .update_message(Id::new(row.try_get::<i64, _>("channel_id")? as u64), Id::new(row.try_get::<i64, _>("message_id")? as u64))
        .embeds(Some(&[open_embed(&trial)]))
        .components(Some(&buttons(id, g, i, false)))
        .await;
    Ok(())
}

/// Clôt les procès échus : verdict, sentence si coupable, message mis à jour sans boutons.
async fn finish_due(http: &HttpClient, db: &PgPool) -> anyhow::Result<()> {
    let due = sqlx::query("SELECT id, guild_id, channel_id, message_id, target_id, author_id, motif, sanction, custom_text FROM tribunal WHERE NOT ended AND ends_at <= NOW()").fetch_all(db).await?;
    for t in due {
        let id: i64 = t.try_get("id")?;
        if sqlx::query("UPDATE tribunal SET ended = TRUE, ended_at = NOW() WHERE id = $1 AND NOT ended").bind(id).execute(db).await?.rows_affected() == 0 {
            continue;
        }
        let (g, i) = counts(db, id).await?;
        let guilty = is_guilty(g, i);
        let (target, sanction): (i64, String) = (t.try_get("target_id")?, t.try_get("sanction")?);
        let effect = if !guilty {
            "L'accusé est acquitté et repart libre.".to_string()
        } else {
            match sanction.as_str() {
                "mute" => {
                    let until = chrono::Utc::now().timestamp() + setting_number(ID, "muteMinutes", 1).clamp(1, 1440) * 60;
                    let ok = match twilight_model::util::Timestamp::from_secs(until) {
                        Ok(ts) => http.update_guild_member(Id::new(t.try_get::<i64, _>("guild_id")? as u64), Id::new(target as u64)).communication_disabled_until(Some(ts)).await.is_ok(),
                        Err(_) => false,
                    };
                    if ok { format!("Exclusion de {} min appliquée.", setting_number(ID, "muteMinutes", 1)) } else { "Exclusion impossible (permissions du bot insuffisantes).".into() }
                }
                "money" => {
                    let fine = setting_number(ID, "fine", 500).max(0);
                    let done = sqlx::query(r#"UPDATE "User" SET "paraCoins" = GREATEST("paraCoins" - $1, 0) WHERE "discordId" = $2"#).bind(fine as i32).bind(target.to_string()).execute(db).await?.rows_affected() > 0;
                    if done { format!("Amende de {fine} ParaCoins prélevée.") } else { "Compte non lié au site : rien à prélever.".into() }
                }
                _ => t.try_get::<Option<String>, _>("custom_text")?.unwrap_or_else(|| "La cour déclare l'accusé coupable.".into()),
            }
        };
        let body = [
            format!("{AUTHOR} | **Accusé :** <@{target}>"),
            format!("{MESSAGE} | **Motif :** {}", t.try_get::<String, _>("motif")?),
            format!("{STATS} | **Votes :** {g} coupable · {i} innocent"),
            format!("{SANCTION} | {effect}"),
        ];
        let heading = if guilty { format!("## {DEMOTE} | VERDICT : COUPABLE") } else { format!("## {OK} | VERDICT : INNOCENT") };
        let embed = EmbedBuilder::new().description(format!("{heading}\n\n{}", body.join("\n\n"))).color(if guilty { 0xef4444 } else { 0x22c55e }).build();
        let _ = http
            .update_message(Id::new(t.try_get::<i64, _>("channel_id")? as u64), Id::new(t.try_get::<i64, _>("message_id")? as u64))
            .embeds(Some(&[embed]))
            .components(Some(&buttons(id, g, i, true)))
            .await;
    }
    Ok(())
}

pub fn spawn_scheduler(http: Arc<HttpClient>, db: PgPool) {
    tokio::spawn(async move {
        let mut tick = tokio::time::interval(Duration::from_secs(5));
        loop {
            tick.tick().await;
            if !crate::modules::enabled(ID) {
                continue;
            }
            if let Err(e) = finish_due(&http, &db).await {
                tracing::warn!("Tribunal : clôture impossible : {e}");
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_tie_acquits() {
        assert!(is_guilty(3, 2));
        assert!(!is_guilty(2, 2));
        assert!(!is_guilty(0, 0));
    }

    #[test]
    fn every_button_carries_the_trial_id() {
        let json = format!("{:?}", buttons(42, 1, 2, false));
        assert!(json.contains("tr_vote:42:i") && json.contains("tr_vote:42:g") && json.contains("tr_ext:42"));
    }
}
