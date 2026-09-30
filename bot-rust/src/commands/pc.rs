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

use crate::utils::{COLOR_ERROR, COLOR_GOLD, FOOTER_TEXT};

pub fn register() -> twilight_model::application::command::Command {
    CommandBuilder::new(
        "pc",
        "Affiche votre solde de ParaCoins",
        twilight_model::application::command::CommandType::ChatInput,
    )
    .build()
}

pub async fn run(interaction: Interaction, http: Arc<HttpClient>, db: PgPool) -> anyhow::Result<()> {
    let author_id = match interaction.author_id() {
        Some(id) => id.to_string(),
        None => return Ok(()),
    };

    let user_name = crate::utils::get_interaction_user_name(&interaction);

    let row = sqlx::query(
        r#"
        SELECT u."paraCoins"
        FROM "User" u
        LEFT JOIN "Account" a ON u.id = a."userId"
        WHERE u."discordId" = $1 OR a."providerAccountId" = $1
        LIMIT 1
        "#
    )
    .bind(&author_id)
    .fetch_optional(&db)
    .await?;

    let response_data = match row {
        Some(record) => {
            let coins: i32 = record.try_get("paraCoins").unwrap_or(0);
            let embed = EmbedBuilder::new()
                .title("💰 Solde de ParaCoins")
                .description(format!(
                    "**{}**, vous possédez actuellement **{}** ParaCoins !",
                    user_name, coins
                ))
                .color(COLOR_GOLD)
                .footer(EmbedFooterBuilder::new(FOOTER_TEXT))
                .build();

            InteractionResponseData {
                embeds: Some(vec![embed]),
                ..Default::default()
            }
        }
        None => {
            let embed = EmbedBuilder::new()
                .title("Compte non lié")
                .description("Votre compte Discord n'est pas encore associé à un compte sur le site Paranoia.")
                .color(COLOR_ERROR)
                .footer(EmbedFooterBuilder::new(FOOTER_TEXT))
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
