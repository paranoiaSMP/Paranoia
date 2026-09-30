use std::sync::Arc;
use twilight_http::Client as HttpClient;
use twilight_model::{
    application::interaction::{
        application_command::CommandOptionValue, Interaction, InteractionData,
    },
    channel::message::component::{ActionRow, Button, ButtonStyle, Component},
    guild::Permissions,
    http::interaction::{InteractionResponse, InteractionResponseType, InteractionResponseData},
};
use twilight_util::builder::{
    command::{CommandBuilder, StringBuilder},
    embed::{EmbedBuilder, EmbedFieldBuilder, EmbedFooterBuilder},
};

use crate::utils::{COLOR_PURPLE, FOOTER_TEXT};

pub fn register() -> twilight_model::application::command::Command {
    CommandBuilder::new(
        "event",
        "Créer une annonce d'événement avec inscriptions",
        twilight_model::application::command::CommandType::ChatInput,
    )
    .default_member_permissions(Permissions::MANAGE_MESSAGES)
    .option(StringBuilder::new("titre", "Le titre de l'événement").required(true))
    .option(StringBuilder::new("date", "La date et heure de l'événement").required(true))
    .option(StringBuilder::new("lieu", "Le lieu (ex: Serveur Event, Discord)").required(true))
    .option(StringBuilder::new("description", "Description détaillée").required(true))
    .build()
}

pub async fn run(interaction: Interaction, http: Arc<HttpClient>) -> anyhow::Result<()> {
    let mut titre = String::new();
    let mut date = String::new();
    let mut lieu = String::new();
    let mut description = String::new();

    if let Some(InteractionData::ApplicationCommand(cmd_data)) = &interaction.data {
        for option in &cmd_data.options {
            if let CommandOptionValue::String(val) = &option.value {
                match option.name.as_str() {
                    "titre" => titre = val.clone(),
                    "date" => date = val.clone(),
                    "lieu" => lieu = val.clone(),
                    "description" => description = val.clone(),
                    _ => {}
                }
            }
        }
    }

    let embed = EmbedBuilder::new()
        .title(format!("🎉 Événement : {}", titre))
        .description(description)
        .color(COLOR_PURPLE)
        .field(EmbedFieldBuilder::new("📅 Date & Heure", date).inline())
        .field(EmbedFieldBuilder::new("📍 Lieu", lieu).inline())
        .field(EmbedFieldBuilder::new("👥 Participants (0)", "*Aucun inscrit pour le moment.*"))
        .footer(EmbedFooterBuilder::new(FOOTER_TEXT))
        .build();

    let buttons = vec![
        Button {
            id: None,
            custom_id: Some("event_join".to_string()),
            disabled: false,
            emoji: None,
            label: Some("Je participe".to_string()),
            style: ButtonStyle::Success,
            url: None,
            sku_id: None,
        },
        Button {
            id: None,
            custom_id: Some("event_leave".to_string()),
            disabled: false,
            emoji: None,
            label: Some("Se désinscrire".to_string()),
            style: ButtonStyle::Secondary,
            url: None,
            sku_id: None,
        },
    ];

    let components = vec![Component::ActionRow(ActionRow {
        id: None,
        components: buttons.into_iter().map(Component::Button).collect(),
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

pub async fn handle_button(
    interaction: Interaction,
    http: Arc<HttpClient>,
    action: &str,
) -> anyhow::Result<()> {
    let author_id = match interaction.author_id() {
        Some(id) => id,
        None => return Ok(()),
    };

    let message = match &interaction.message {
        Some(m) => m,
        None => return Ok(()),
    };

    let original_embed = match message.embeds.first() {
        Some(e) => e,
        None => return Ok(()),
    };

    let mut participants: Vec<String> = Vec::new();
    let mut other_fields = Vec::new();

    for field in &original_embed.fields {
        if field.name.starts_with("👥 Participants") {
            let val = field.value.trim();
            if val != "*Aucun inscrit pour le moment.*" {
                for token in val.split(|c: char| c.is_whitespace() || c == ',') {
                    let token = token.trim();
                    if token.starts_with("<@") && token.ends_with('>') {
                        if !participants.contains(&token.to_string()) {
                            participants.push(token.to_string());
                        }
                    }
                }
            }
        } else {
            other_fields.push(field.clone());
        }
    }

    let user_tag = format!("<@{}>", author_id);
    if action == "join" {
        if !participants.contains(&user_tag) {
            participants.push(user_tag);
        }
    } else if action == "leave" {
        participants.retain(|p| p != &user_tag);
    }

    let count = participants.len();
    let field_val = if participants.is_empty() {
        "*Aucun inscrit pour le moment.*".to_string()
    } else {
        let joined = participants.join(" ");
        if joined.len() > 1000 {
            format!("*{} participants inscrits (liste trop longue)*", count)
        } else {
            joined
        }
    };

    let mut new_embed = EmbedBuilder::new()
        .title(original_embed.title.clone().unwrap_or_default())
        .description(original_embed.description.clone().unwrap_or_default())
        .color(original_embed.color.unwrap_or(COLOR_PURPLE))
        .footer(EmbedFooterBuilder::new(FOOTER_TEXT));

    for field in other_fields {
        new_embed = new_embed.field(EmbedFieldBuilder::new(field.name, field.value).inline());
    }
    new_embed = new_embed.field(EmbedFieldBuilder::new(format!("👥 Participants ({})", count), field_val));

    let response = InteractionResponse {
        kind: InteractionResponseType::UpdateMessage,
        data: Some(InteractionResponseData {
            embeds: Some(vec![new_embed.build()]),
            ..Default::default()
        }),
    };

    http.interaction(interaction.application_id)
        .create_response(interaction.id, &interaction.token, &response)
        .await?;

    Ok(())
}
