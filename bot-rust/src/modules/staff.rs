use chrono::{Datelike, NaiveDate, Utc};
use chrono_tz::Europe::Paris;
use sqlx::{PgPool, Row};
use std::collections::HashSet;
use std::sync::{Arc, Mutex, OnceLock};
use std::time::Duration;
use twilight_http::Client as HttpClient;
use twilight_model::application::command::{Command, CommandType};
use twilight_model::application::interaction::application_command::{CommandDataOption, CommandOptionValue};
use twilight_model::application::interaction::{Interaction, InteractionData};
use twilight_model::channel::message::{Embed, MessageFlags};
use twilight_model::guild::Permissions;
use twilight_model::http::interaction::{InteractionResponse, InteractionResponseData, InteractionResponseType};
use twilight_model::id::{marker::{GuildMarker, UserMarker}, Id};
use twilight_util::builder::command::{CommandBuilder, IntegerBuilder, StringBuilder, SubCommandBuilder, UserBuilder};
use twilight_util::builder::embed::{EmbedBuilder, EmbedFieldBuilder};

use crate::modules::{enabled, setting};

const COLOR: u32 = 0x7c3aed;

pub fn sub(interaction: &Interaction) -> (String, Vec<CommandDataOption>) {
    if let Some(InteractionData::ApplicationCommand(cmd)) = &interaction.data {
        if let Some(first) = cmd.options.first() {
            if let CommandOptionValue::SubCommand(opts) = &first.value {
                return (first.name.clone(), opts.clone());
            }
        }
        return (String::new(), cmd.options.clone());
    }
    (String::new(), vec![])
}

pub fn opt_str(opts: &[CommandDataOption], name: &str) -> Option<String> {
    opts.iter().find(|o| o.name == name).and_then(|o| match &o.value {
        CommandOptionValue::String(s) => Some(s.trim().to_string()),
        _ => None,
    })
}

pub fn opt_user(opts: &[CommandDataOption], name: &str) -> Option<Id<UserMarker>> {
    opts.iter().find(|o| o.name == name).and_then(|o| match o.value {
        CommandOptionValue::User(u) => Some(u),
        _ => None,
    })
}

pub fn opt_int(opts: &[CommandDataOption], name: &str) -> Option<i64> {
    opts.iter().find(|o| o.name == name).and_then(|o| match o.value {
        CommandOptionValue::Integer(i) => Some(i),
        _ => None,
    })
}

pub async fn reply_private(http: &HttpClient, interaction: &Interaction, content: Option<String>, embeds: Vec<Embed>) -> anyhow::Result<()> {
    let response = InteractionResponse {
        kind: InteractionResponseType::ChannelMessageWithSource,
        data: Some(InteractionResponseData {
            content,
            embeds: Some(embeds),
            flags: Some(MessageFlags::EPHEMERAL),
            ..Default::default()
        }),
    };
    http.interaction(interaction.application_id).create_response(interaction.id, &interaction.token, &response).await?;
    Ok(())
}

async fn text(http: &HttpClient, interaction: &Interaction, t: impl Into<String>) -> anyhow::Result<()> {
    reply_private(http, interaction, Some(t.into()), vec![]).await
}

pub fn register_note() -> Command {
    CommandBuilder::new("note", "Notes privées du staff sur un membre", CommandType::ChatInput)
        .default_member_permissions(Permissions::MODERATE_MEMBERS)
        .option(
            SubCommandBuilder::new("ajouter", "Ajouter une note")
                .option(UserBuilder::new("membre", "Le membre").required(true))
                .option(StringBuilder::new("texte", "La note").required(true).max_length(1000)),
        )
        .option(SubCommandBuilder::new("voir", "Voir les notes d'un membre").option(UserBuilder::new("membre", "Le membre").required(true)))
        .option(SubCommandBuilder::new("supprimer", "Supprimer une note").option(StringBuilder::new("id", "Identifiant de la note").required(true)))
        .build()
}

pub async fn run_note(interaction: Interaction, http: Arc<HttpClient>, db: PgPool) -> anyhow::Result<()> {
    let Some(author) = interaction.author_id() else { return Ok(()) };
    let (name, opts) = sub(&interaction);
    match name.as_str() {
        "ajouter" => {
            let (Some(target), Some(content)) = (opt_user(&opts, "membre"), opt_str(&opts, "texte")) else { return Ok(()) };
            let id = uuid::Uuid::new_v4().to_string();
            sqlx::query(r#"INSERT INTO "StaffNote" (id, "targetId", "authorId", content, "createdAt") VALUES ($1, $2, $3, $4, NOW())"#)
                .bind(&id)
                .bind(target.to_string())
                .bind(author.to_string())
                .bind(&content)
                .execute(&db)
                .await?;
            text(&http, &interaction, format!("Note ajoutée sur <@{target}> (id `{}`).", &id[..8])).await
        }
        "voir" => {
            let Some(target) = opt_user(&opts, "membre") else { return Ok(()) };
            let rows = sqlx::query(r#"SELECT id, "authorId", content, "createdAt" FROM "StaffNote" WHERE "targetId" = $1 ORDER BY "createdAt" DESC LIMIT 20"#)
                .bind(target.to_string())
                .fetch_all(&db)
                .await?;
            if rows.is_empty() {
                return text(&http, &interaction, format!("Aucune note sur <@{target}>.")).await;
            }
            let lines: Vec<String> = rows
                .iter()
                .map(|r| {
                    let id: String = r.try_get("id").unwrap_or_default();
                    let by: String = r.try_get("authorId").unwrap_or_default();
                    let at: chrono::NaiveDateTime = r.try_get("createdAt").unwrap_or_default();
                    let content: String = r.try_get("content").unwrap_or_default();
                    format!("`{}` · <@{by}> · {}\n{content}", &id[..8.min(id.len())], at.format("%d/%m/%Y"))
                })
                .collect();
            let embed = EmbedBuilder::new().description(format!("{}\n\n{}", format!("## {} | Notes du staff", crate::utils::emoji::STAFF), format!("<@{target}>\n\n{}", lines.join("\n\n")))).color(COLOR).build();
            reply_private(&http, &interaction, None, vec![embed]).await
        }
        "supprimer" => {
            let Some(prefix) = opt_str(&opts, "id") else { return Ok(()) };
            let deleted = sqlx::query(r#"DELETE FROM "StaffNote" WHERE id LIKE $1 || '%' AND length($1) >= 6"#)
                .bind(&prefix)
                .execute(&db)
                .await?
                .rows_affected();
            text(&http, &interaction, if deleted > 0 { "Note supprimée.".to_string() } else { "Aucune note avec cet identifiant.".to_string() }).await
        }
        _ => Ok(()),
    }
}

pub fn register_stats() -> Command {
    CommandBuilder::new("statsmodo", "Statistiques de modération du staff", CommandType::ChatInput)
        .default_member_permissions(Permissions::MODERATE_MEMBERS)
        .option(UserBuilder::new("modo", "Un membre du staff en particulier").required(false))
        .option(IntegerBuilder::new("jours", "Période").required(false).choices([("7 jours", 7), ("30 jours", 30), ("90 jours", 90)]))
        .build()
}

pub async fn run_stats(interaction: Interaction, http: Arc<HttpClient>, db: PgPool) -> anyhow::Result<()> {
    let (_, opts) = sub(&interaction);
    let days = opt_int(&opts, "jours").unwrap_or(30).clamp(1, 365);
    let since = Utc::now() - chrono::Duration::days(days);

    if let Some(modo) = opt_user(&opts, "modo") {
        let rows = sqlx::query(r#"SELECT sanction_type, COUNT(*)::bigint AS n FROM sanctions WHERE mod_id = $1 AND created_at >= $2 GROUP BY sanction_type ORDER BY n DESC"#)
            .bind(modo.get() as i64)
            .bind(since)
            .fetch_all(&db)
            .await
            .unwrap_or_default();
        let warns: i64 = sqlx::query_scalar(r#"SELECT COUNT(*) FROM "Warn" WHERE "authorId" = $1 AND "createdAt" >= $2"#)
            .bind(modo.to_string())
            .bind(since.naive_utc())
            .fetch_one(&db)
            .await
            .unwrap_or(0);
        let mut embed = EmbedBuilder::new().description(format!("{}\n\n{}", format!("## {} | Modération · {days} jours", crate::utils::emoji::STAFF), format!("<@{modo}>"))).color(COLOR);
        for r in &rows {
            let kind: String = r.try_get("sanction_type").unwrap_or_default();
            let n: i64 = r.try_get("n").unwrap_or(0);
            embed = embed.field(EmbedFieldBuilder::new(kind, n.to_string()).inline());
        }
        embed = embed.field(EmbedFieldBuilder::new("Avertissements", warns.to_string()).inline());
        return reply_private(&http, &interaction, None, vec![embed.build()]).await;
    }

    let rows = sqlx::query(
        r#"SELECT who, SUM(n)::bigint AS total FROM (
             SELECT mod_id::text AS who, COUNT(*) AS n FROM sanctions WHERE created_at >= $1 GROUP BY mod_id
             UNION ALL
             SELECT "authorId" AS who, COUNT(*) AS n FROM "Warn" WHERE "createdAt" >= $2 GROUP BY "authorId"
           ) t GROUP BY who ORDER BY total DESC LIMIT 15"#,
    )
    .bind(since)
    .bind(since.naive_utc())
    .fetch_all(&db)
    .await
    .unwrap_or_default();
    let lines: Vec<String> = rows
        .iter()
        .enumerate()
        .map(|(i, r)| {
            let who: String = r.try_get("who").unwrap_or_default();
            let total: i64 = r.try_get("total").unwrap_or(0);
            format!("**{}.** <@{who}> · {total} action(s)", i + 1)
        })
        .collect();
    let embed = EmbedBuilder::new()
        .description(format!("{}\n\n{}", format!("## {} | Modération · {days} jours", crate::utils::emoji::STAFF), if lines.is_empty() { "Aucune sanction sur la période.".to_string() } else { lines.join("\n") }))
        .color(COLOR)
        .build();
    reply_private(&http, &interaction, None, vec![embed]).await
}

pub fn register_absence() -> Command {
    CommandBuilder::new("absence", "Absences du staff", CommandType::ChatInput)
        .default_member_permissions(Permissions::MODERATE_MEMBERS)
        .option(
            SubCommandBuilder::new("ajouter", "Déclarer une absence")
                .option(StringBuilder::new("du", "Premier jour (JJ/MM ou JJ/MM/AAAA)").required(true))
                .option(StringBuilder::new("au", "Dernier jour (JJ/MM ou JJ/MM/AAAA)").required(true))
                .option(StringBuilder::new("raison", "Raison (facultatif)").required(false).max_length(300)),
        )
        .option(SubCommandBuilder::new("liste", "Absences en cours et à venir"))
        .option(SubCommandBuilder::new("annuler", "Annuler tes absences à venir"))
        .build()
}

fn today_paris() -> NaiveDate {
    Utc::now().with_timezone(&Paris).date_naive()
}

fn parse_day(s: &str) -> Option<NaiveDate> {
    let parts: Vec<&str> = s.trim().split(['/', '-', '.']).collect();
    let d: u32 = parts.first()?.parse().ok()?;
    let m: u32 = parts.get(1)?.parse().ok()?;
    let today = today_paris();
    match parts.get(2) {
        Some(y) => {
            let y: i32 = y.parse().ok()?;
            NaiveDate::from_ymd_opt(if y < 100 { 2000 + y } else { y }, m, d)
        }
        None => {
            let this_year = NaiveDate::from_ymd_opt(today.year(), m, d)?;
            if this_year < today { NaiveDate::from_ymd_opt(today.year() + 1, m, d) } else { Some(this_year) }
        }
    }
}

pub async fn run_absence(interaction: Interaction, http: Arc<HttpClient>, db: PgPool) -> anyhow::Result<()> {
    let Some(author) = interaction.author_id() else { return Ok(()) };
    let (name, opts) = sub(&interaction);
    match name.as_str() {
        "ajouter" => {
            let (Some(from), Some(to)) = (opt_str(&opts, "du").and_then(|s| parse_day(&s)), opt_str(&opts, "au").and_then(|s| parse_day(&s))) else {
                return text(&http, &interaction, "Date invalide : utilise JJ/MM ou JJ/MM/AAAA.").await;
            };
            if to < from {
                return text(&http, &interaction, "Le dernier jour doit être après le premier.").await;
            }
            let reason = opt_str(&opts, "raison");
            sqlx::query(r#"INSERT INTO "StaffAbsence" (id, "discordId", "startDay", "endDay", reason, "createdAt") VALUES ($1, $2, $3, $4, $5, NOW())"#)
                .bind(uuid::Uuid::new_v4().to_string())
                .bind(author.to_string())
                .bind(from.to_string())
                .bind(to.to_string())
                .bind(&reason)
                .execute(&db)
                .await?;
            let summary = format!(
                "<@{author}> est absent du **{}** au **{}**{}",
                from.format("%d/%m/%Y"),
                to.format("%d/%m/%Y"),
                reason.map(|r| format!(" · {r}")).unwrap_or_default()
            );
            if let Some(channel) = setting("absences", "channelId").and_then(|c| c.trim().parse::<u64>().ok()) {
                let embed = EmbedBuilder::new().description(format!("{}\n\n{}", format!("## {} | Absence", crate::utils::emoji::STAFF), &summary)).color(COLOR).build();
                let _ = http.create_message(Id::new(channel)).embeds(&[embed]).await;
            }
            if let Some(guild) = interaction.guild_id {
                sync_absence_roles(&http, &db, guild).await;
            }
            text(&http, &interaction, format!("Absence enregistrée. {summary}")).await
        }
        "annuler" => {
            let n = sqlx::query(r#"DELETE FROM "StaffAbsence" WHERE "discordId" = $1 AND "endDay" >= $2"#)
                .bind(author.to_string())
                .bind(today_paris().to_string())
                .execute(&db)
                .await?
                .rows_affected();
            if let Some(guild) = interaction.guild_id {
                if let Some(role) = absence_role() {
                    let _ = http.remove_guild_member_role(guild, author, role).await;
                }
                sync_absence_roles(&http, &db, guild).await;
            }
            text(&http, &interaction, if n > 0 { format!("{n} absence(s) annulée(s).") } else { "Aucune absence à annuler.".to_string() }).await
        }
        _ => {
            let rows = sqlx::query(r#"SELECT "discordId", "startDay", "endDay", reason FROM "StaffAbsence" WHERE "endDay" >= $1 ORDER BY "startDay" LIMIT 25"#)
                .bind(today_paris().to_string())
                .fetch_all(&db)
                .await?;
            let today = today_paris().to_string();
            let lines: Vec<String> = rows
                .iter()
                .map(|r| {
                    let who: String = r.try_get("discordId").unwrap_or_default();
                    let from: String = r.try_get("startDay").unwrap_or_default();
                    let to: String = r.try_get("endDay").unwrap_or_default();
                    let reason: Option<String> = r.try_get("reason").ok().flatten();
                    let now = if from <= today { " · **en cours**" } else { "" };
                    let fmt = |d: &str| NaiveDate::parse_from_str(d, "%Y-%m-%d").map(|d| d.format("%d/%m").to_string()).unwrap_or_default();
                    format!("<@{who}> · {} → {}{now}{}", fmt(&from), fmt(&to), reason.map(|r| format!("\n{r}")).unwrap_or_default())
                })
                .collect();
            let embed = EmbedBuilder::new()
                .description(format!("{}\n\n{}", format!("## {} | Absences du staff", crate::utils::emoji::STAFF), if lines.is_empty() { "Personne n'est absent.".to_string() } else { lines.join("\n\n") }))
                .color(COLOR)
                .build();
            reply_private(&http, &interaction, None, vec![embed]).await
        }
    }
}

fn absence_role() -> Option<Id<twilight_model::id::marker::RoleMarker>> {
    setting("absences", "roleId").and_then(|r| r.trim().parse::<u64>().ok()).map(Id::new)
}

async fn sync_absence_roles(http: &HttpClient, db: &PgPool, guild: Id<GuildMarker>) {
    let Some(role) = absence_role() else { return };
    let today = today_paris().to_string();
    let rows = sqlx::query(r#"SELECT DISTINCT "discordId", ("startDay" <= $1 AND "endDay" >= $1) AS now FROM "StaffAbsence" WHERE "endDay" >= $2"#)
        .bind(&today)
        .bind((today_paris() - chrono::Duration::days(2)).to_string())
        .fetch_all(db)
        .await
        .unwrap_or_default();
    for r in rows {
        let Ok(id) = r.try_get::<String, _>("discordId") else { continue };
        let Ok(user) = id.parse::<u64>() else { continue };
        if r.try_get::<bool, _>("now").unwrap_or(false) {
            let _ = http.add_guild_member_role(guild, Id::new(user), role).await;
        } else {
            let _ = http.remove_guild_member_role(guild, Id::new(user), role).await;
        }
    }
}

fn guilds() -> &'static Mutex<HashSet<Id<GuildMarker>>> {
    static G: OnceLock<Mutex<HashSet<Id<GuildMarker>>>> = OnceLock::new();
    G.get_or_init(|| Mutex::new(HashSet::new()))
}

pub fn remember_guild(id: Id<GuildMarker>) {
    guilds().lock().unwrap().insert(id);
}

pub fn spawn_absence_sync(http: Arc<HttpClient>, db: PgPool) {
    tokio::spawn(async move {
        let mut tick = tokio::time::interval(Duration::from_secs(3600));
        loop {
            tick.tick().await;
            if !enabled("absences") {
                continue;
            }
            let list: Vec<Id<GuildMarker>> = guilds().lock().unwrap().iter().copied().collect();
            for g in list {
                sync_absence_roles(&http, &db, g).await;
            }
        }
    });
}
