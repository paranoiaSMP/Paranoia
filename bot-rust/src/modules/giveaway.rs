//! Giveaways : /giveaway publie un tirage avec bouton « Participer » ; un minuteur le clôt et tire les gagnants.
use rand::seq::SliceRandom;
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
use twilight_util::builder::command::{CommandBuilder, IntegerBuilder, StringBuilder};
use twilight_util::builder::embed::EmbedBuilder;

use crate::utils::emoji::{AUTHOR, PROMOTE, STATS, TIME};
use crate::utils::{emoji_parts, parse_duration};

pub const PREFIX: &str = "gw_join:";
const ID: &str = "giveaway";

pub fn register() -> Command {
    CommandBuilder::new("giveaway", "Lancer un giveaway", CommandType::ChatInput)
        .default_member_permissions(twilight_model::guild::Permissions::MANAGE_GUILD)
        .option(StringBuilder::new("prix", "Ce qui est à gagner").required(true))
        .option(StringBuilder::new("duree", "Durée : 30m, 2h, 1d…").required(true))
        .option(IntegerBuilder::new("gagnants", "Nombre de gagnants (1 par défaut)").min_value(1).max_value(20).required(false))
        .build()
}

fn card(prize: &str, host: i64, ends: i64, winners: i64, count: i64, won: Option<&[i64]>) -> Embed {
    let status = match won {
        None => format!("{TIME} | **Fin :** <t:{ends}:R>"),
        Some(_) => format!("{TIME} | **Terminé :** <t:{ends}:F>"),
    };
    let mut lines = vec![
        format!("### {prize}"),
        status,
        format!("{AUTHOR} | **Organisé par :** <@{host}>"),
        format!("{STATS} | **Gagnants :** {winners} · **Participants :** {count}"),
    ];
    if let Some(w) = won {
        lines.push(if w.is_empty() {
            "Personne n'a participé, pas de gagnant.".to_string()
        } else {
            format!("{PROMOTE} | **Gagnant{} :** {}", if w.len() > 1 { "s" } else { "" }, w.iter().map(|u| format!("<@{u}>")).collect::<Vec<_>>().join(", "))
        });
    }
    EmbedBuilder::new().description(format!("## {PROMOTE} | Giveaway\n\n{}", lines.join("\n\n"))).color(if won.is_some() { 0x6b7280 } else { 0xfbbf24 }).build()
}

fn button_row(id: i64, disabled: bool) -> Component {
    Component::ActionRow(ActionRow {
        id: None,
        components: vec![Component::Button(Button {
            id: None,
            custom_id: Some(format!("{PREFIX}{id}")),
            disabled,
            emoji: emoji_parts(PROMOTE).map(|(n, i)| EmojiReactionType::Custom { animated: false, id: Id::new(i), name: Some(n.to_string()) }),
            label: Some("Participer".into()),
            style: ButtonStyle::Primary,
            url: None,
            sku_id: None,
        })],
    })
}

/// Tire `n` gagnants distincts parmi les participants.
fn pick(mut entries: Vec<i64>, n: usize) -> Vec<i64> {
    entries.shuffle(&mut rand::thread_rng());
    entries.truncate(n);
    entries
}

async fn say(http: &HttpClient, i: &Interaction, text: &str) -> anyhow::Result<()> {
    let data = InteractionResponseData { content: Some(text.to_string()), flags: Some(MessageFlags::EPHEMERAL), ..Default::default() };
    http.interaction(i.application_id)
        .create_response(i.id, &i.token, &InteractionResponse { kind: InteractionResponseType::ChannelMessageWithSource, data: Some(data) })
        .await?;
    Ok(())
}

pub async fn run(interaction: Interaction, http: Arc<HttpClient>, db: PgPool) -> anyhow::Result<()> {
    let (mut prize, mut duration, mut winners) = (String::new(), String::new(), 1i64);
    if let Some(InteractionData::ApplicationCommand(cmd)) = &interaction.data {
        for o in &cmd.options {
            match (&o.name[..], &o.value) {
                ("prix", CommandOptionValue::String(v)) => prize = v.clone(),
                ("duree", CommandOptionValue::String(v)) => duration = v.clone(),
                ("gagnants", CommandOptionValue::Integer(n)) => winners = *n,
                _ => {}
            }
        }
    }
    let (Some(channel), Some(host)) = (interaction.channel.as_ref().map(|c| c.id), interaction.author_id()) else { return Ok(()) };
    let Some(length) = parse_duration(&duration).filter(|d| d.num_seconds() >= 10 && d.num_days() <= 30) else {
        return say(&http, &interaction, "Durée invalide : entre 10 secondes et 30 jours (ex. `30m`, `2h`, `1d`).").await;
    };
    let ends = chrono::Utc::now() + length;
    let gid: i64 = sqlx::query_scalar("INSERT INTO giveaway (channel_id, host_id, prize, winners, ends_at) VALUES ($1,$2,$3,$4,$5) RETURNING id")
        .bind(channel.get() as i64)
        .bind(host.get() as i64)
        .bind(&prize)
        .bind(winners as i32)
        .bind(ends)
        .fetch_one(&db)
        .await?;

    let ping = crate::modules::setting(ID, "pingRoleId").filter(|r| r.trim().parse::<u64>().is_ok()).map(|r| format!("<@&{}>", r.trim()));
    let data = InteractionResponseData {
        content: ping,
        embeds: Some(vec![card(&prize, host.get() as i64, ends.timestamp(), winners, 0, None)]),
        components: Some(vec![button_row(gid, false)]),
        ..Default::default()
    };
    let ack = http.interaction(interaction.application_id);
    ack.create_response(interaction.id, &interaction.token, &InteractionResponse { kind: InteractionResponseType::ChannelMessageWithSource, data: Some(data) }).await?;
    let message = ack.response(&interaction.token).await?.model().await?;
    sqlx::query("UPDATE giveaway SET message_id = $1 WHERE id = $2").bind(message.id.get() as i64).bind(gid).execute(&db).await?;
    Ok(())
}

pub async fn handle_join(interaction: Interaction, http: Arc<HttpClient>, db: PgPool, cid: &str) -> anyhow::Result<()> {
    let Some(gid) = cid.strip_prefix(PREFIX).and_then(|s| s.parse::<i64>().ok()) else { return Ok(()) };
    let Some(user) = interaction.author_id() else { return Ok(()) };
    let Some(g) = sqlx::query("SELECT channel_id, message_id, host_id, prize, winners, ends_at, ended FROM giveaway WHERE id = $1").bind(gid).fetch_optional(&db).await? else {
        return say(&http, &interaction, "Ce giveaway n'existe plus.").await;
    };
    if g.try_get::<bool, _>("ended")? {
        return say(&http, &interaction, "Ce giveaway est terminé.").await;
    }
    let inserted = sqlx::query("INSERT INTO giveaway_entry (giveaway_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING")
        .bind(gid)
        .bind(user.get() as i64)
        .execute(&db)
        .await?
        .rows_affected()
        > 0;
    if !inserted {
        sqlx::query("DELETE FROM giveaway_entry WHERE giveaway_id = $1 AND user_id = $2").bind(gid).bind(user.get() as i64).execute(&db).await?;
    }
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM giveaway_entry WHERE giveaway_id = $1").bind(gid).fetch_one(&db).await?;
    say(&http, &interaction, if inserted { "Participation enregistrée, bonne chance !" } else { "Participation retirée. Clique à nouveau pour revenir." }).await?;

    let ends: chrono::DateTime<chrono::Utc> = g.try_get("ends_at")?;
    let embed = card(&g.try_get::<String, _>("prize")?, g.try_get("host_id")?, ends.timestamp(), g.try_get::<i32, _>("winners")? as i64, count, None);
    let _ = http.update_message(Id::new(g.try_get::<i64, _>("channel_id")? as u64), Id::new(g.try_get::<i64, _>("message_id")? as u64)).embeds(Some(&[embed])).await;
    Ok(())
}

/// Clôt les giveaways échus : tire les gagnants, met le message à jour et les annonce.
async fn finish_due(http: &HttpClient, db: &PgPool) -> anyhow::Result<()> {
    let due = sqlx::query("SELECT id, channel_id, message_id, host_id, prize, winners, ends_at FROM giveaway WHERE NOT ended AND ends_at <= NOW()").fetch_all(db).await?;
    for g in due {
        let gid: i64 = g.try_get("id")?;
        // Garde anti double clôture si deux passages se chevauchent.
        if sqlx::query("UPDATE giveaway SET ended = TRUE WHERE id = $1 AND NOT ended").bind(gid).execute(db).await?.rows_affected() == 0 {
            continue;
        }
        let entries: Vec<i64> = sqlx::query_scalar("SELECT user_id FROM giveaway_entry WHERE giveaway_id = $1").bind(gid).fetch_all(db).await?;
        let count = entries.len() as i64;
        let (winners, prize): (i32, String) = (g.try_get("winners")?, g.try_get("prize")?);
        let won = pick(entries, winners as usize);
        let (channel, message) = (Id::new(g.try_get::<i64, _>("channel_id")? as u64), Id::new(g.try_get::<i64, _>("message_id")? as u64));
        let ends: chrono::DateTime<chrono::Utc> = g.try_get("ends_at")?;
        let embed = card(&prize, g.try_get("host_id")?, ends.timestamp(), winners as i64, count, Some(&won));
        let _ = http.update_message(channel, message).embeds(Some(&[embed])).components(Some(&[button_row(gid, true)])).await;
        if !won.is_empty() {
            let text = format!("{PROMOTE} Félicitations {} ! Vous gagnez **{prize}**.", won.iter().map(|u| format!("<@{u}>")).collect::<Vec<_>>().join(", "));
            let _ = http.create_message(channel).content(&text).reply(message).await;
        }
    }
    Ok(())
}

pub fn spawn_scheduler(http: Arc<HttpClient>, db: PgPool) {
    tokio::spawn(async move {
        let mut tick = tokio::time::interval(Duration::from_secs(15));
        loop {
            tick.tick().await;
            if let Err(e) = finish_due(&http, &db).await {
                tracing::warn!("Giveaway : clôture impossible : {e}");
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pick_returns_distinct_winners_capped_by_entries() {
        let w = pick(vec![1, 2, 3], 2);
        assert_eq!(w.len(), 2);
        assert_ne!(w[0], w[1]);
        assert_eq!(pick(vec![1], 5), vec![1]);
        assert!(pick(vec![], 3).is_empty());
    }
}
