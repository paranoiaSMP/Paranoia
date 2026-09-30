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
use crate::utils::{COLOR_ERROR, COLOR_PURPLE, FOOTER_TEXT};
use uuid::Uuid;

pub fn register_pack() -> twilight_model::application::command::Command {
    CommandBuilder::new(
        "pack",
        "Ouvre un booster de cartes (TCG)",
        twilight_model::application::command::CommandType::ChatInput,
    )
    .build()
}

pub async fn run_pack(interaction: Interaction, http: Arc<HttpClient>, db: PgPool) -> anyhow::Result<()> {
    let author_id = match interaction.author_id() {
        Some(id) => id.to_string(),
        None => return Ok(()),
    };

    let config = sqlx::query(r#"SELECT "moduleTcg" FROM "GuildConfig" WHERE "guildId" = 'default'"#)
        .fetch_optional(&db).await.unwrap_or(None);

    let tcg_enabled = if let Some(r) = config {
        r.try_get("moduleTcg").unwrap_or(false)
    } else {
        false
    };

    if !tcg_enabled {
        let embed = EmbedBuilder::new()
            .title("Module Désactivé")
            .description("Le module TCG est actuellement désactivé sur le serveur.")
            .color(COLOR_ERROR)
            .build();
        
        let response = InteractionResponse {
            kind: InteractionResponseType::ChannelMessageWithSource,
            data: Some(InteractionResponseData { embeds: Some(vec![embed]), flags: Some(twilight_model::channel::message::MessageFlags::EPHEMERAL), ..Default::default() }),
        };
        http.interaction(interaction.application_id).create_response(interaction.id, &interaction.token, &response).await?;
        return Ok(());
    }

    let user_row = sqlx::query(r#"SELECT id, "paraCoins" FROM "User" WHERE "discordId" =  LIMIT 1"#)
        .bind(&author_id)
        .fetch_optional(&db).await?;

    let response_data = match user_row {
        Some(record) => {
            let user_id: String = record.try_get("id").unwrap();
            let coins: i32 = record.try_get("paraCoins").unwrap_or(0);

            if coins >= 100 {
                // Deduct coins
                sqlx::query(r#"UPDATE "User" SET "paraCoins" = "paraCoins" - 100 WHERE id = "#)
                    .bind(&user_id).execute(&db).await?;

                // Fetch a random card
                let card_row = sqlx::query(r#"SELECT id, title, rarity, "imageUrl" FROM "TradingCard" WHERE "isPublished" = true ORDER BY RANDOM() LIMIT 1"#)
                    .fetch_optional(&db).await?;

                match card_row {
                    Some(card) => {
                        let card_id: String = card.try_get("id").unwrap();
                        let title: String = card.try_get("title").unwrap_or_default();
                        let rarity: String = card.try_get("rarity").unwrap_or_default();
                        let image: Option<String> = card.try_get("imageUrl").unwrap_or(None);

                        // Give card
                        sqlx::query(r#"INSERT INTO "UserCard" (id, "userId", "tradingCardId", "obtainedAt") VALUES (, , , NOW())"#)
                            .bind(Uuid::new_v4().to_string())
                            .bind(&user_id)
                            .bind(&card_id)
                            .execute(&db).await?;

                        let mut embed_b = EmbedBuilder::new()
                            .title("📦 Ouverture de Booster")
                            .description(format!("Tu as dépensé 100 ParaCoins et obtenu :\n\n**{}**\n*(Rareté : {})*", title, rarity))
                            .color(COLOR_PURPLE)
                            .footer(EmbedFooterBuilder::new(FOOTER_TEXT));

                        if let Some(img_url) = image {
                            if !img_url.is_empty() {
                                embed_b = embed_b.thumbnail(twilight_util::builder::embed::ImageSource::url(img_url).unwrap());
                            }
                        }

                        InteractionResponseData { embeds: Some(vec![embed_b.build()]), ..Default::default() }
                    }
                    None => {
                        InteractionResponseData { embeds: Some(vec![EmbedBuilder::new().title("Erreur").description("Aucune carte disponible dans le jeu.").color(COLOR_ERROR).build()]), ..Default::default() }
                    }
                }
            } else {
                InteractionResponseData { embeds: Some(vec![EmbedBuilder::new().title("Fonds insuffisants").description("Il te faut au moins 100 ParaCoins pour ouvrir un booster.").color(COLOR_ERROR).build()]), flags: Some(twilight_model::channel::message::MessageFlags::EPHEMERAL), ..Default::default() }
            }
        }
        None => {
            InteractionResponseData { embeds: Some(vec![EmbedBuilder::new().title("Erreur").description("Compte non lié.").color(COLOR_ERROR).build()]), flags: Some(twilight_model::channel::message::MessageFlags::EPHEMERAL), ..Default::default() }
        }
    };

    let response = InteractionResponse { kind: InteractionResponseType::ChannelMessageWithSource, data: Some(response_data) };
    http.interaction(interaction.application_id).create_response(interaction.id, &interaction.token, &response).await?;
    Ok(())
}

