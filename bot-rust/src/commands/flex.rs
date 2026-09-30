use sqlx::PgPool;
use std::sync::Arc;
use twilight_http::Client as HttpClient;
use twilight_model::{
    application::interaction::Interaction,
    http::interaction::{InteractionResponse, InteractionResponseType, InteractionResponseData},
};
use twilight_util::builder::{
    command::CommandBuilder,
    embed::{EmbedBuilder, EmbedFooterBuilder, ImageSource},
};

use crate::utils::{rarity_color, rarity_weight, COLOR_ERROR, FOOTER_TEXT};

#[derive(Debug, sqlx::FromRow)]
struct FlexCard {
    #[allow(dead_code)]
    id: String,
    title: String,
    rarity: String,
    edition: Option<String>,
    #[sqlx(rename = "imageUrl")]
    image_url: Option<String>,
    #[sqlx(rename = "renderedImageUrl")]
    rendered_image_url: Option<String>,
    proba: f64,
}

pub fn register() -> twilight_model::application::command::Command {
    CommandBuilder::new(
        "flex",
        "Affiche votre carte la plus rare !",
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

    let cards = sqlx::query_as::<_, FlexCard>(
        r#"
        SELECT t.id, t.title, t.rarity, t.edition, t."imageUrl", t."renderedImageUrl", t.proba
        FROM "UserCard" uc
        JOIN "TradingCard" t ON uc."tradingCardId" = t.id
        JOIN "User" u ON uc."userId" = u.id
        LEFT JOIN "Account" a ON u.id = a."userId"
        WHERE u."discordId" = $1 OR a."providerAccountId" = $1
        "#
    )
    .bind(&author_id)
    .fetch_all(&db)
    .await?;

    let response_data = if cards.is_empty() {
        let embed = EmbedBuilder::new()
            .title("Aucune carte trouvée")
            .description(format!(
                "**{}**, vous ne possédez encore aucune carte dans votre inventaire !",
                user_name
            ))
            .color(COLOR_ERROR)
            .footer(EmbedFooterBuilder::new(FOOTER_TEXT))
            .build();

        InteractionResponseData {
            embeds: Some(vec![embed]),
            flags: Some(twilight_model::channel::message::MessageFlags::EPHEMERAL),
            ..Default::default()
        }
    } else {
        let mut sorted_cards = cards;
        sorted_cards.sort_by(|a, b| {
            let weight_a = rarity_weight(&a.rarity);
            let weight_b = rarity_weight(&b.rarity);
            weight_b.cmp(&weight_a).then_with(|| a.proba.partial_cmp(&b.proba).unwrap_or(std::cmp::Ordering::Equal))
        });

        let best_card = &sorted_cards[0];
        let color = rarity_color(&best_card.rarity);
        let edition = best_card.edition.as_deref().unwrap_or("Standard");

        let mut embed_builder = EmbedBuilder::new()
            .title(format!("✨ Meilleure carte de {}", user_name))
            .description(format!(
                "**{}**\n\n**Rareté :** `{}`\n**Édition :** `{}`\n**Drop Rate :** `{}%`",
                best_card.title, best_card.rarity, edition, best_card.proba
            ))
            .color(color)
            .footer(EmbedFooterBuilder::new(FOOTER_TEXT));

        let image_url = best_card
            .rendered_image_url
            .as_ref()
            .or(best_card.image_url.as_ref());

        if let Some(url) = image_url {
            if let Ok(src) = ImageSource::url(url) {
                embed_builder = embed_builder.image(src);
            }
        }

        InteractionResponseData {
            embeds: Some(vec![embed_builder.build()]),
            ..Default::default()
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
