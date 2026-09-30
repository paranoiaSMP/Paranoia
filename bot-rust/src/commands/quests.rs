use sqlx::{PgPool, Row};
use std::sync::Arc;
use twilight_http::Client as HttpClient;
use twilight_model::{
    application::interaction::Interaction,
    channel::message::component::{ActionRow, Button, ButtonStyle, Component},
    http::interaction::{InteractionResponse, InteractionResponseType, InteractionResponseData},
};
use twilight_util::builder::{
    command::CommandBuilder,
    embed::{EmbedBuilder, EmbedFieldBuilder, EmbedFooterBuilder},
};

use crate::utils::{COLOR_INFO, COLOR_PURPLE, COLOR_SUCCESS, FOOTER_TEXT};

pub fn register() -> twilight_model::application::command::Command {
    CommandBuilder::new(
        "quetes",
        "Affiche le tableau des quêtes disponibles et vos récompenses",
        twilight_model::application::command::CommandType::ChatInput,
    )
    .build()
}

pub async fn run(interaction: Interaction, http: Arc<HttpClient>) -> anyhow::Result<()> {
    let embed = EmbedBuilder::new()
        .title("📜 Tableau des Quêtes Paranoia")
        .description("Complétez des objectifs pour obtenir des **ParaCoins** et des récompenses exclusives en jeu !")
        .color(COLOR_PURPLE)
        .field(
            EmbedFieldBuilder::new(
                "🏷️ Statut Discord (+50 PC)",
                "Ajoutez **`/Parasmp`** dans votre statut personnalisé Discord.\n*Cliquez sur le bouton ci-dessous pour valider la quête.*",
            ),
        )
        .field(
            EmbedFieldBuilder::new(
                "🎮 Paralauncher (+100 PC)",
                "Connectez-vous et jouez sur le serveur via le **Paranoia Launcher** officiel.",
            ),
        )
        .field(
            EmbedFieldBuilder::new(
                "📩 Recrutement (Drop Exclusif)",
                "Invitez 30 joueurs actifs sur le serveur Discord.",
            ),
        )
        .footer(EmbedFooterBuilder::new(FOOTER_TEXT))
        .build();

    let button = Button {
        id: None,
        custom_id: Some("quest_verify_status".to_string()),
        disabled: false,
        emoji: None,
        label: Some("Vérifier le statut /Parasmp".to_string()),
        style: ButtonStyle::Primary,
        url: None,
        sku_id: None,
    };

    let components = vec![Component::ActionRow(ActionRow {
        id: None,
        components: vec![Component::Button(button)],
    })];

    let response = InteractionResponse {
        kind: InteractionResponseType::ChannelMessageWithSource,
        data: Some(InteractionResponseData {
            embeds: Some(vec![embed]),
            components: Some(components),
            ..Default::default()
        }),
    };

    http.interaction(interaction.application_id)
        .create_response(interaction.id, &interaction.token, &response)
        .await?;

    Ok(())
}

pub async fn handle_verify_status(
    interaction: Interaction,
    http: Arc<HttpClient>,
    db: PgPool,
) -> anyhow::Result<()> {
    let author_id = match interaction.author_id() {
        Some(id) => id.to_string(),
        None => return Ok(()),
    };

    let result = sqlx::query(
        r#"
        UPDATE "User"
        SET "paraCoins" = "paraCoins" + 50
        WHERE id = (
            SELECT u.id
            FROM "User" u
            LEFT JOIN "Account" a ON u.id = a."userId"
            WHERE u."discordId" = $1 OR a."providerAccountId" = $1
            LIMIT 1
        )
        RETURNING "paraCoins"
        "#
    )
    .bind(&author_id)
    .fetch_optional(&db)
    .await?;

    let (message, color) = match result {
        Some(record) => {
            let coins: i32 = record.try_get("paraCoins").unwrap_or(0);
            (
                format!(
                    "🎉 **Quête validée !**\n\nVous avez reçu **+50 ParaCoins** !\nVotre nouveau solde est de **{}** PC.",
                    coins
                ),
                COLOR_SUCCESS,
            )
        }
        None => (
            "Votre compte Discord n'est pas encore lié à un compte Paranoia. Liez votre compte sur le site pour réclamer vos récompenses !".to_string(),
            COLOR_INFO,
        ),
    };

    let embed = EmbedBuilder::new()
        .description(message)
        .color(color)
        .footer(EmbedFooterBuilder::new(FOOTER_TEXT))
        .build();

    let response = InteractionResponse {
        kind: InteractionResponseType::ChannelMessageWithSource,
        data: Some(InteractionResponseData {
            embeds: Some(vec![embed]),
            flags: Some(twilight_model::channel::message::MessageFlags::EPHEMERAL),
            ..Default::default()
        }),
    };

    http.interaction(interaction.application_id)
        .create_response(interaction.id, &interaction.token, &response)
        .await?;

    Ok(())
}
