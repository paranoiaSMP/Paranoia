use sqlx::{PgPool, Row};
use std::sync::Arc;
use twilight_http::Client as HttpClient;
use twilight_model::{
    application::interaction::Interaction,
    http::interaction::{InteractionResponse, InteractionResponseType, InteractionResponseData},
};
use twilight_util::builder::{
    command::CommandBuilder,
    embed::{EmbedBuilder, EmbedFooterBuilder},
};
use chrono::{Utc, Duration};
use crate::utils::{COLOR_ERROR, COLOR_SUCCESS, FOOTER_TEXT};

pub fn register_daily() -> twilight_model::application::command::Command {
    CommandBuilder::new(
        "daily",
        "Récupère ta récompense quotidienne de ParaCoins",
        twilight_model::application::command::CommandType::ChatInput,
    )
    .build()
}

pub async fn run_daily(interaction: Interaction, http: Arc<HttpClient>, db: PgPool) -> anyhow::Result<()> {
    let author_id = match interaction.author_id() {
        Some(id) => id.to_string(),
        None => return Ok(()),
    };

    let row = sqlx::query(r#"SELECT id, "lastDaily" FROM "User" WHERE "discordId" = $1 LIMIT 1"#)
        .bind(&author_id)
        .fetch_optional(&db)
        .await?;

    let response_data = match row {
        Some(record) => {
            let user_id: String = record.try_get("id").unwrap();
            let last_daily: Option<chrono::NaiveDateTime> = record.try_get("lastDaily").unwrap_or(None);

            let now = Utc::now().naive_utc();
            let reward = 50;
            let claimed = sqlx::query(
                r#"UPDATE "User" SET "paraCoins" = "paraCoins" + $1, "lastDaily" = $2
                   WHERE id = $3 AND ("lastDaily" IS NULL OR "lastDaily" <= $4)
                   RETURNING id"#,
            )
            .bind(reward)
            .bind(now)
            .bind(&user_id)
            .bind(now - Duration::hours(24))
            .fetch_optional(&db)
            .await?
            .is_some();

            if claimed {
                let embed = EmbedBuilder::new()
                    .title("Récompense Quotidienne")
                    .description(format!("Félicitations ! Tu as récupéré tes **{} ParaCoins** quotidiens.", reward))
                    .color(COLOR_SUCCESS)
                    .footer(EmbedFooterBuilder::new(FOOTER_TEXT))
                    .build();

                InteractionResponseData {
                    embeds: Some(vec![embed]),
                    ..Default::default()
                }
            } else {
                let remaining = last_daily
                    .map(|ld| Duration::hours(24) - now.signed_duration_since(ld))
                    .unwrap_or_else(Duration::zero)
                    .max(Duration::minutes(1));
                let hours = remaining.num_hours();
                let mins = remaining.num_minutes() % 60;
                
                let embed = EmbedBuilder::new()
                    .title("Patience...")
                    .description(format!("Tu as déjà récupéré ta récompense. Reviens dans **{}h {}m**.", hours, mins))
                    .color(COLOR_ERROR)
                    .build();

                InteractionResponseData {
                    embeds: Some(vec![embed]),
                    flags: Some(twilight_model::channel::message::MessageFlags::EPHEMERAL),
                    ..Default::default()
                }
            }
        }
        None => {
            let embed = EmbedBuilder::new()
                .title("Compte non lié")
                .description("Tu dois lier ton compte Discord à Paranoia pour utiliser cette commande.")
                .color(COLOR_ERROR)
                .build();

            InteractionResponseData {
                embeds: Some(vec![embed]),
                flags: Some(twilight_model::channel::message::MessageFlags::EPHEMERAL),
                ..Default::default()
            }
        }
    };

    let response = InteractionResponse {
        kind: InteractionResponseType::ChannelMessageWithSource,
        data: Some(response_data),
    };

    http.interaction(interaction.application_id)
        .create_response(interaction.id, &interaction.token, &response)
        .await?;

    Ok(())
}
