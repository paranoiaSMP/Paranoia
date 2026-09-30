use std::sync::Arc;
use twilight_http::Client as HttpClient;
use twilight_model::{
    application::interaction::Interaction,
    channel::message::component::{ActionRow, Button, ButtonStyle, Component, SelectMenu, SelectMenuOption, SelectMenuType},
    http::interaction::{InteractionResponse, InteractionResponseType, InteractionResponseData},
};
use twilight_util::builder::{
    command::CommandBuilder,
    embed::{EmbedBuilder, EmbedFooterBuilder},
};

use crate::utils::{COLOR_PURPLE, FOOTER_TEXT};

pub fn register() -> twilight_model::application::command::Command {
    CommandBuilder::new(
        "creators",
        "Affiche la liste des créateurs de contenu officiels Paranoia",
        twilight_model::application::command::CommandType::ChatInput,
    )
    .build()
}

pub async fn run(interaction: Interaction, http: Arc<HttpClient>) -> anyhow::Result<()> {
    let embed = EmbedBuilder::new()
        .title("🎬 Créateurs de Contenu Paranoia")
        .description(
            "Retrouvez les chaînes et streams officiels de nos créateurs partenaires !\n\n\
            Sélectionnez un créateur dans le menu déroulant ci-dessous pour accéder à ses liens.",
        )
        .color(COLOR_PURPLE)
        .footer(EmbedFooterBuilder::new(FOOTER_TEXT))
        .build();

    let select_menu = SelectMenu {
        id: None,
        custom_id: "creators_select_menu".to_string(),
        default_values: None,
        disabled: false,
        kind: SelectMenuType::Text,
        max_values: Some(1),
        min_values: Some(1),
        options: Some(vec![
            SelectMenuOption {
                default: false,
                description: Some("Chaîne YouTube & Projets".to_string()),
                emoji: None,
                label: "Leoo955 (YouTube)".to_string(),
                value: "leoo955".to_string(),
            },
            SelectMenuOption {
                default: false,
                description: Some("Lives Twitch".to_string()),
                emoji: None,
                label: "1sans_nom (Twitch)".to_string(),
                value: "1sans_nom".to_string(),
            },
            SelectMenuOption {
                default: false,
                description: Some("Vidéos & Aventures".to_string()),
                emoji: None,
                label: "Steve (YouTube)".to_string(),
                value: "steve".to_string(),
            },
        ]),
        placeholder: Some("Sélectionnez un créateur...".to_string()),
        channel_types: None,
        required: None,
    };

    let components = vec![Component::ActionRow(ActionRow {
        id: None,
        components: vec![Component::SelectMenu(select_menu)],
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

pub async fn handle_select(
    interaction: Interaction,
    http: Arc<HttpClient>,
    values: &[String],
) -> anyhow::Result<()> {
    let selected = values.first().map(|s| s.as_str()).unwrap_or("");

    let (name, platform, url) = match selected {
        "leoo955" => ("Leoo955", "YouTube", "https://youtube.com/@leoo955"),
        "1sans_nom" => ("1sans_nom", "Twitch", "https://twitch.tv/1sans_nom"),
        "steve" => ("Steve", "YouTube", "https://youtube.com/@steve"),
        _ => return Ok(()),
    };

    let embed = EmbedBuilder::new()
        .title(format!("🎥 Créateur : {}", name))
        .description(format!(
            "Retrouvez les contenus de **{}** sur **{}** !\n\nCliquez sur le bouton ci-dessous pour rejoindre la chaîne.",
            name, platform
        ))
        .color(COLOR_PURPLE)
        .footer(EmbedFooterBuilder::new(FOOTER_TEXT))
        .build();

    let button = Button {
        id: None,
        custom_id: None,
        disabled: false,
        emoji: None,
        label: Some(format!("Ouvrir {}", platform)),
        style: ButtonStyle::Link,
        url: Some(url.to_string()),
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
            flags: Some(twilight_model::channel::message::MessageFlags::EPHEMERAL),
            ..Default::default()
        }),
    };

    http.interaction(interaction.application_id)
        .create_response(interaction.id, &interaction.token, &response)
        .await?;

    Ok(())
}
