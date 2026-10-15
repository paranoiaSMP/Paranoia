use sqlx::{PgPool, Row};
use std::sync::Arc;
use twilight_http::Client as HttpClient;
use twilight_model::application::command::{Command, CommandType};
use twilight_model::application::interaction::{application_command::CommandOptionValue, Interaction, InteractionData};
use twilight_model::http::interaction::{InteractionResponse, InteractionResponseData, InteractionResponseType};
use twilight_model::id::{marker::UserMarker, Id};
use twilight_util::builder::command::{CommandBuilder, IntegerBuilder, StringBuilder, UserBuilder};
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

pub fn register_manage() -> Command {
    CommandBuilder::new("xp", "Gérer l'XP d'un membre (staff)", CommandType::ChatInput)
        .default_member_permissions(twilight_model::guild::Permissions::MANAGE_GUILD)
        .option(
            StringBuilder::new("action", "Que faire")
                .required(true)
                .choices([("Ajouter", "add"), ("Retirer", "remove"), ("Définir", "set"), ("Remettre à zéro", "reset")]),
        )
        .option(UserBuilder::new("membre", "Le membre concerné").required(true))
        .option(IntegerBuilder::new("montant", "Quantité d'XP (inutile pour la remise à zéro)").min_value(0).max_value(10_000_000).required(false))
        .build()
}

/// Nouvelle XP après l'action, jamais négative.
fn apply(action: &str, current: i64, amount: i64) -> i64 {
    match action {
        "add" => current + amount,
        "remove" => current - amount,
        "set" => amount,
        _ => 0,
    }
    .clamp(0, i32::MAX as i64)
}

pub async fn run_manage(interaction: Interaction, http: Arc<HttpClient>, db: PgPool) -> anyhow::Result<()> {
    let (mut action, mut target, mut amount) = (String::new(), None, 0i64);
    if let Some(InteractionData::ApplicationCommand(cmd)) = &interaction.data {
        for o in &cmd.options {
            match &o.value {
                CommandOptionValue::String(v) => action = v.clone(),
                CommandOptionValue::User(u) => target = Some(*u),
                CommandOptionValue::Integer(n) => amount = *n,
                _ => {}
            }
        }
    }
    let Some(user_id) = target else { return Ok(()) };
    let row = sqlx::query(r#"SELECT xp FROM "User" WHERE "discordId" = $1"#).bind(user_id.to_string()).fetch_optional(&db).await?;
    let (title, text) = match row {
        None => ("Compte non lié".to_string(), format!("<@{user_id}> n'a pas lié son compte Discord au site, il n'a pas d'XP.")),
        Some(r) => {
            let before: i32 = r.try_get("xp").unwrap_or(0);
            let after = apply(&action, before as i64, amount);
            let level = level_of(after).0;
            sqlx::query(r#"UPDATE "User" SET xp = $1, level = $2 WHERE "discordId" = $3"#)
                .bind(after as i32)
                .bind(level as i32)
                .bind(user_id.to_string())
                .execute(&db)
                .await?;
            ("XP mise à jour".to_string(), format!("<@{user_id}> : **{before} ➜ {after} XP** (niveau {level})."))
        }
    };
    let embed = EmbedBuilder::new().description(format!("## {} | {title}\n\n{text}", crate::utils::emoji::STATS)).color(COLOR).build();
    let response = InteractionResponse {
        kind: InteractionResponseType::ChannelMessageWithSource,
        data: Some(InteractionResponseData { embeds: Some(vec![embed]), flags: Some(twilight_model::channel::message::MessageFlags::EPHEMERAL), ..Default::default() }),
    };
    http.interaction(interaction.application_id).create_response(interaction.id, &interaction.token, &response).await?;
    Ok(())
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
            .description(format!("{}\n\n{}", format!("## {} | Pas encore de niveau", crate::utils::emoji::OFF), "Ce compte Discord n'est pas lié au site. Connecte-toi sur https://paranoiastudio.fr pour gagner de l'XP."))
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
        .description(format!("{}\n\n{}", format!("## {} | {name} · niveau {level}", crate::utils::emoji::STATS), format!("{}  {into} / {need} XP", bar(into, need))))
        .color(COLOR)
        .field(EmbedFieldBuilder::new("XP totale", xp.to_string()).inline())
        .field(EmbedFieldBuilder::new("Classement", format!("#{rank}")).inline());
    // Carte générée (avatar Discord du membre) ; sans elle, on garde le buste Minecraft en miniature.
    let setting = |k| crate::modules::setting("xp", k).unwrap_or_default();
    let mut card = None;
    if setting("cardEnabled") != "no" {
        if let Some(u) = http.user(user_id).await.ok() {
            if let Ok(u) = u.model().await {
                let avatar = match u.avatar {
                    Some(h) => format!("https://cdn.discordapp.com/avatars/{}/{}.png?size=256", u.id, h),
                    None => "https://cdn.discordapp.com/embed/avatars/0.png".to_string(),
                };
                let bg = setting("cardBackground");
                card = crate::modules::welcome_image::generate_rank(
                    &avatar,
                    Some(bg.as_str()).filter(|b| !b.is_empty()),
                    crate::modules::welcome_image::RankStyle { name: name.clone(), level, rank: Some(rank), into, need, color_a: setting("cardColorA"), color_b: setting("cardColorB") },
                )
                .await;
            }
        }
    }
    let mut files = Vec::new();
    match card {
        Some(bytes) => {
            embed = embed.image(ImageSource::attachment("rang.png")?);
            files.push(twilight_model::http::attachment::Attachment::from_bytes("rang.png".into(), bytes, 1));
        }
        None => {
            if let Ok(src) = ImageSource::url(format!("https://vzge.me/bust/128/{}.png", name)) {
                embed = embed.thumbnail(src);
            }
        }
    }
    let response = InteractionResponse {
        kind: InteractionResponseType::ChannelMessageWithSource,
        data: Some(InteractionResponseData { embeds: Some(vec![embed.build()]), attachments: (!files.is_empty()).then_some(files), ..Default::default() }),
    };
    http.interaction(interaction.application_id).create_response(interaction.id, &interaction.token, &response).await?;
    Ok(())
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
        "paracoins" => ("Classement ParaCoins", r#"SELECT "discordId", COALESCE("minecraftName", name) AS label, "paraCoins"::bigint AS v, '' AS extra FROM "User" WHERE "paraCoins" > 0 ORDER BY "paraCoins" DESC LIMIT 10"#),
        "collection" => (
            "Classement des collections",
            r#"SELECT u."discordId", COALESCE(u."minecraftName", u.name) AS label, COUNT(DISTINCT c."tradingCardId")::bigint AS v, COUNT(*)::text || ' cartes au total' AS extra
               FROM "UserCard" c JOIN "User" u ON u.id = c."userId" GROUP BY u.id ORDER BY v DESC LIMIT 10"#,
        ),
        "casino" => (
            "Classement du casino",
            r#"SELECT u."discordId", COALESCE(u."minecraftName", u.name) AS label, (s.won - s.wagered)::bigint AS v, 'record ' || s."biggestWin" || ' PC' AS extra
               FROM "CasinoStat" s JOIN "User" u ON u.id = s."userId" WHERE s.games > 0 ORDER BY v DESC LIMIT 10"#,
        ),
        _ => ("Classement des niveaux", r#"SELECT "discordId", COALESCE("minecraftName", name) AS label, xp::bigint AS v, '' AS extra FROM "User" WHERE xp > 0 ORDER BY xp DESC LIMIT 10"#),
    };
    let rows = sqlx::query(sql).fetch_all(&db).await.unwrap_or_default();

    let value_of = |v: i64| match kind.as_str() {
        "paracoins" => format!("{v} PC"),
        "collection" => format!("{v} cartes"),
        "casino" => format!("{}{v} PC", if v > 0 { "+" } else { "" }),
        _ => format!("niveau {} · {v} XP", level_of(v).0),
    };
    let label = |r: &sqlx::postgres::PgRow| r.try_get::<Option<String>, _>("label").ok().flatten().unwrap_or_else(|| "Membre".to_string());

    // Carte image (la réponse est différée : le dessin peut dépasser les 3 secondes de Discord).
    let board: Vec<(String, String)> = rows.iter().map(|r| (label(r), value_of(r.try_get("v").unwrap_or(0)))).collect();
    let setting = |k| crate::modules::setting("xp", k).unwrap_or_default();
    let ack = http.interaction(interaction.application_id);
    ack.create_response(
        interaction.id,
        &interaction.token,
        &InteractionResponse { kind: InteractionResponseType::DeferredChannelMessageWithSource, data: None },
    )
    .await?;
    if setting("cardEnabled") != "no" {
        let bg = setting("cardBackground");
        if let Some(png) = crate::modules::welcome_image::generate_board(title.to_string(), board, Some(bg.as_str()).filter(|b| !b.is_empty()), setting("cardColorA"), setting("cardColorB")).await {
            let file = twilight_model::http::attachment::Attachment::from_bytes("classement.png".into(), png, 1);
            ack.update_response(&interaction.token).attachments(&[file]).await?;
            return Ok(());
        }
    }

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
        .description(format!("## {} | {title}\n\n{}", crate::utils::emoji::STATS, if lines.is_empty() { "Personne au classement pour l'instant.".to_string() } else { lines.join("\n") }))
        .color(COLOR)
        .build();
    ack.update_response(&interaction.token).embeds(Some(&[embed])).await?;
    Ok(())
}

#[cfg(test)]
mod manage_tests {
    use super::apply;

    #[test]
    fn xp_actions_never_go_below_zero() {
        assert_eq!(apply("add", 100, 50), 150);
        assert_eq!(apply("remove", 100, 500), 0);
        assert_eq!(apply("set", 100, 20), 20);
        assert_eq!(apply("reset", 100, 20), 0);
    }
}
