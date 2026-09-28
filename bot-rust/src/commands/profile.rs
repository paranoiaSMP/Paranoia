use sqlx::{PgPool, Row};
use std::sync::Arc;
use twilight_http::Client as HttpClient;
use twilight_model::{
    application::interaction::{
        application_command::CommandOptionValue, Interaction, InteractionData,
    },
    http::interaction::{InteractionResponse, InteractionResponseType, InteractionResponseData},
};
use twilight_util::builder::{
    command::{CommandBuilder, UserBuilder},
    embed::{EmbedBuilder, EmbedFieldBuilder, EmbedFooterBuilder},
};

use crate::utils::{rarity_weight, COLOR_ERROR, COLOR_PURPLE, FOOTER_TEXT};

pub fn register() -> twilight_model::application::command::Command {
    CommandBuilder::new(
        "profile",
        "Affiche le profil d'un joueur ou le vÃ´tre",
        twilight_model::application::command::CommandType::ChatInput,
    )
    .option(
        UserBuilder::new("membre", "Le membre dont vous souhaitez voir le profil")
            .required(false),
    )
    .build()
}

pub async fn run(interaction: Interaction, http: Arc<HttpClient>, db: PgPool) -> anyhow::Result<()> {
    let mut target_id = interaction.author_id().map(|id| id.to_string());

    if let Some(InteractionData::ApplicationCommand(cmd_data)) = &interaction.data {
        for option in &cmd_data.options {
            if option.name == "membre" {
                if let CommandOptionValue::User(user_id) = &option.value {
                    target_id = Some(user_id.to_string());
                }
            }
        }
    }

    let target_id = match target_id {
        Some(id) => id,
        None => return Ok(()),
    };

    let user_record = sqlx::query(
        r#"
        SELECT u.id, u."minecraftName", u."paraCoins"
        FROM "User" u
        LEFT JOIN "Account" a ON u.id = a."userId"
        WHERE u."discordId" = $1 OR a."providerAccountId" = $1
        LIMIT 1
        "#
    )
    .bind(&target_id)
    .fetch_optional(&db)
    .await?;

    let response_data = match user_record {
        Some(user) => {
            let user_id: String = user.try_get("id").unwrap_or_default();
            let mc_name: Option<String> = user.try_get("minecraftName").ok();
            let coins: i32 = user.try_get("paraCoins").unwrap_or(0);

            let cards_count: i64 = sqlx::query_scalar(
                r#"SELECT COUNT(*) FROM "UserCard" WHERE "userId" = $1"#
            )
            .bind(&user_id)
            .fetch_one(&db)
            .await
            .unwrap_or(0);

            let total_cards: i64 = sqlx::query_scalar(
                r#"SELECT COUNT(*) FROM "TradingCard" WHERE "isPublished" = true"#
            )
            .fetch_one(&db)
            .await
            .unwrap_or(0);

            let rows = sqlx::query(
                r#"
                SELECT t.rarity
                FROM "UserCard" uc
                JOIN "TradingCard" t ON uc."tradingCardId" = t.id
                WHERE uc."userId" = $1
                "#
            )
            .bind(&user_id)
            .fetch_all(&db)
            .await?;

            let user_rarities: Vec<String> = rows.into_iter().filter_map(|r| r.try_get("rarity").ok()).collect();

            let max_rarity = user_rarities
                .iter()
                .max_by_key(|r| rarity_weight(r))
                .cloned()
                .unwrap_or_else(|| "Aucune".to_string());

            let level = (cards_count / 5 + 1).max(1);
            let boosters_opened = cards_count / 3;
            let para_id = if user_id.len() >= 5 {
                format!("P-{}", &user_id[..5].to_uppercase())
            } else {
                format!("P-{}", user_id.to_uppercase())
            };

            let mc_display = mc_name.unwrap_or_else(|| "Non liÃ©".to_string());

            let embed = EmbedBuilder::new()
                .title("ðŸ‘¤ Profil Paranoia")
                .color(COLOR_PURPLE)
                .field(EmbedFieldBuilder::new("ðŸŽ® Minecraft", mc_display).inline())
                .field(EmbedFieldBuilder::new("ðŸ†” ID Paranoia", para_id).inline())
                .field(EmbedFieldBuilder::new("ðŸª™ PARA Coins", format!("**{}**", coins)).inline())
                .field(
                    EmbedFieldBuilder::new(
                        "ðŸƒ Cartes",
                        format!("**{}/{}**", cards_count, total_cards),
                    )
                    .inline(),
                )
                .field(EmbedFieldBuilder::new("ðŸ“¦ Boosters ouverts", boosters_opened.to_string()).inline())
                .field(EmbedFieldBuilder::new("â­ RaretÃ© maximale", max_rarity).inline())
                .field(EmbedFieldBuilder::new("ðŸ† Niveau", format!("Niveau **{}**", level)).inline())
                .footer(EmbedFooterBuilder::new(FOOTER_TEXT))
                .build();

            InteractionResponseData {
                embeds: Some(vec![embed]),
                ..Default::default()
            }
        }
        None => {
            let embed = EmbedBuilder::new()
                .title("Joueur introuvable")
                .description("Ce membre n'est pas encore inscrit ou liÃ© sur le site Paranoia.")
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

