use sqlx::{PgPool, Row};
use std::sync::Arc;
use twilight_http::Client as HttpClient;
use twilight_model::application::command::{Command, CommandType};
use twilight_model::application::interaction::{application_command::CommandOptionValue, Interaction, InteractionData};
use twilight_model::http::interaction::{InteractionResponse, InteractionResponseData, InteractionResponseType};
use twilight_model::id::{marker::UserMarker, Id};
use twilight_util::builder::command::{CommandBuilder, StringBuilder, UserBuilder};
use twilight_util::builder::embed::{EmbedBuilder, EmbedFieldBuilder, ImageSource};

const COLOR: u32 = 0x7c3aed;

pub fn cost(level: i64) -> i64 {
    5 * level * level + 50 * level + 100
}

pub fn level_of(xp: i64) -> (i64, i64, i64) {
    let (mut level, mut rest) = (1, xp.max(0));
    while rest >= cost(level) {
        rest -= cost(level);
        level += 1;
    }
    (level, rest, cost(level))
}

pub fn register_rank() -> Command {
    CommandBuilder::new("rang", "Voir ton niveau et ton XP, ou ceux d'un membre", CommandType::ChatInput)
        .option(UserBuilder::new("membre", "Le membre à regarder").required(false))
        .build()
}

pub fn register_leaderboard() -> Command {
    CommandBuilder::new("classement", "Les 10 meilleurs membres", CommandType::ChatInput)
        .option(
            StringBuilder::new("type", "Quel classement")
                .required(false)
                .choices([("Niveaux", "niveaux"), ("ParaCoins", "paracoins"), ("Collection de cartes", "collection"), ("Gains au casino", "casino")]),
        )
        .build()
}

async fn reply(http: &HttpClient, interaction: &Interaction, embed: twilight_model::channel::message::Embed) -> anyhow::Result<()> {
    let response = InteractionResponse {
        kind: InteractionResponseType::ChannelMessageWithSource,
        data: Some(InteractionResponseData { embeds: Some(vec![embed]), ..Default::default() }),
    };
    http.interaction(interaction.application_id).create_response(interaction.id, &interaction.token, &response).await?;
    Ok(())
}

fn bar(done: i64, total: i64) -> String {
    let filled = ((done as f64 / total.max(1) as f64) * 12.0).round() as usize;
    format!("{}{}", "▰".repeat(filled.min(12)), "▱".repeat(12 - filled.min(12)))
}

pub async fn run_rank(interaction: Interaction, http: Arc<HttpClient>, db: PgPool) -> anyhow::Result<()> {
    let target: Option<Id<UserMarker>> = match &interaction.data {
        Some(InteractionData::ApplicationCommand(cmd)) => cmd.options.iter().find_map(|o| match o.value {
            CommandOptionValue::User(u) => Some(u),
            _ => None,
        }),
        _ => None,
    };
    let Some(user_id) = target.or_else(|| interaction.author_id()) else { return Ok(()) };

    let row = sqlx::query(r#"SELECT xp, "minecraftName", name FROM "User" WHERE "discordId" = $1 LIMIT 1"#)
        .bind(user_id.to_string())
        .fetch_optional(&db)
        .await?;

    let Some(row) = row else {
        let embed = EmbedBuilder::new()
            .title("Pas encore de niveau")
            .description("Ce compte Discord n'est pas lié au site. Connecte-toi sur https://paranoiastudio.fr pour gagner de l'XP.")
            .color(COLOR)
            .build();
        return reply(&http, &interaction, embed).await;
    };

    let xp: i32 = row.try_get("xp").unwrap_or(0);
    let name: String = row
        .try_get::<Option<String>, _>("minecraftName")
        .ok()
        .flatten()
        .or_else(|| row.try_get::<Option<String>, _>("name").ok().flatten())
        .unwrap_or_else(|| "Membre".to_string());
    let rank: i64 = sqlx::query_scalar(r#"SELECT COUNT(*) + 1 FROM "User" WHERE xp > $1"#).bind(xp).fetch_one(&db).await.unwrap_or(0);
    let (level, into, need) = level_of(xp as i64);

    let mut embed = EmbedBuilder::new()
        .title(format!("{name} · niveau {level}"))
        .description(format!("{}  {into} / {need} XP", bar(into, need)))
        .color(COLOR)
        .field(EmbedFieldBuilder::new("XP totale", xp.to_string()).inline())
        .field(EmbedFieldBuilder::new("Classement", format!("#{rank}")).inline());
    if let Ok(src) = ImageSource::url(format!("https://vzge.me/bust/128/{}.png", name)) {
        embed = embed.thumbnail(src);
    }
    reply(&http, &interaction, embed.build()).await
}

pub async fn run_leaderboard(interaction: Interaction, http: Arc<HttpClient>, db: PgPool) -> anyhow::Result<()> {
    let kind = match &interaction.data {
        Some(InteractionData::ApplicationCommand(cmd)) => cmd.options.iter().find_map(|o| match &o.value {
            CommandOptionValue::String(v) if o.name == "type" => Some(v.clone()),
            _ => None,
        }),
        _ => None,
    }
    .unwrap_or_else(|| "niveaux".to_string());

    let (title, sql) = match kind.as_str() {
        "paracoins" => ("Classement ParaCoins", r#"SELECT "discordId", "minecraftName", "paraCoins"::bigint AS v, '' AS extra FROM "User" WHERE "paraCoins" > 0 ORDER BY "paraCoins" DESC LIMIT 10"#),
        "collection" => (
            "Classement des collections",
            r#"SELECT u."discordId", u."minecraftName", COUNT(DISTINCT c."tradingCardId")::bigint AS v, COUNT(*)::text || ' cartes au total' AS extra
               FROM "UserCard" c JOIN "User" u ON u.id = c."userId" GROUP BY u.id ORDER BY v DESC LIMIT 10"#,
        ),
        "casino" => (
            "Classement du casino",
            r#"SELECT u."discordId", u."minecraftName", (s.won - s.wagered)::bigint AS v, 'record ' || s."biggestWin" || ' PC' AS extra
               FROM "CasinoStat" s JOIN "User" u ON u.id = s."userId" WHERE s.games > 0 ORDER BY v DESC LIMIT 10"#,
        ),
        _ => ("Classement des niveaux", r#"SELECT "discordId", "minecraftName", xp::bigint AS v, '' AS extra FROM "User" WHERE xp > 0 ORDER BY xp DESC LIMIT 10"#),
    };
    let rows = sqlx::query(sql).fetch_all(&db).await.unwrap_or_default();

    let lines: Vec<String> = rows
        .iter()
        .enumerate()
        .map(|(i, r)| {
            let v: i64 = r.try_get("v").unwrap_or(0);
            let extra: String = r.try_get("extra").unwrap_or_default();
            let who = r
                .try_get::<Option<String>, _>("discordId")
                .ok()
                .flatten()
                .map(|d| format!("<@{d}>"))
                .or_else(|| r.try_get::<Option<String>, _>("minecraftName").ok().flatten())
                .unwrap_or_else(|| "Membre".to_string());
            let medal = match i {
                0 => "🥇",
                1 => "🥈",
                2 => "🥉",
                _ => "▫️",
            };
            let value = match kind.as_str() {
                "paracoins" => format!("{v} PC"),
                "collection" => format!("{v} cartes différentes"),
                "casino" => format!("{}{v} PC", if v > 0 { "+" } else { "" }),
                _ => format!("niveau {} · {v} XP", level_of(v).0),
            };
            let extra = if extra.is_empty() { String::new() } else { format!(" ({extra})") };
            format!("{medal} **{}.** {who} · {value}{extra}", i + 1)
        })
        .collect();

    let embed = EmbedBuilder::new()
        .title(title)
        .description(if lines.is_empty() { "Personne au classement pour l'instant.".to_string() } else { lines.join("\n") })
        .color(COLOR)
        .build();
    reply(&http, &interaction, embed).await
}
