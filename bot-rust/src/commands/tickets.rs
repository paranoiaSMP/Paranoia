#![allow(deprecated)]

use std::sync::Arc;
use twilight_http::Client as HttpClient;
use twilight_model::{
    application::interaction::{
        modal::ModalInteractionData, Interaction,
    },
    channel::{
        message::component::{ActionRow, Button, ButtonStyle, Component, TextInput, TextInputStyle},
        permission_overwrite::{PermissionOverwrite, PermissionOverwriteType},
        ChannelType,
    },
    guild::Permissions,
    http::interaction::{InteractionResponse, InteractionResponseType, InteractionResponseData},
    id::{
        marker::{ChannelMarker, GuildMarker, RoleMarker, UserMarker},
        Id,
    },
};
use twilight_util::builder::{
    command::CommandBuilder,
    embed::{EmbedBuilder, EmbedFieldBuilder, EmbedFooterBuilder},
};

use crate::utils::{COLOR_ERROR, COLOR_INFO, COLOR_PURPLE, FOOTER_TEXT};

pub fn register() -> twilight_model::application::command::Command {
    CommandBuilder::new(
        "setup_tickets",
        "Déploie le panneau interactif de gestion des tickets de support",
        twilight_model::application::command::CommandType::ChatInput,
    )
    .default_member_permissions(Permissions::ADMINISTRATOR)
    .build()
}

pub async fn run(interaction: Interaction, http: Arc<HttpClient>) -> anyhow::Result<()> {
    let channel_id = match interaction.channel.as_ref().map(|c| c.id) {
        Some(id) => id,
        None => return Ok(()),
    };

    let token = http.token().unwrap_or_default().to_string();

    let v2_payload = serde_json::json!({
        "flags": 32768,
        "content": null,
        "embeds": [],
        "components": [
            {
                "type": 12,
                "items": [
                    {
                        "media": {
                            "url": "https://files.catbox.moe/g1etwk.png"
                        }
                    }
                ]
            },
            {
                "type": 17,
                "accent_color": 11032055,
                "components": [
                    {
                        "type": 10,
                        "content": "# Contact Support\nVous souhaitez entrer en contact avec l'équipe de **Paranoia Studio** ?\nSuivez les indications ci-dessous et sélectionnez la catégorie adaptée à votre situation.\n\n*Ce salon est strictement réservé aux demandes d'assistance légitimes. Tout abus sera sanctionné.*"
                    },
                    {
                        "type": 14,
                        "spacing": 1,
                        "divider": true
                    },
                    {
                        "type": 10,
                        "content": "### 🛠️ Support Général & Technique\nUne question sur le serveur, un problème avec le launcher, la boutique ou un bug en jeu ?"
                    },
                    {
                        "type": 1,
                        "components": [
                            {
                                "type": 2,
                                "style": 1,
                                "label": "Ticket Support",
                                "emoji": {"name": "🛠️"},
                                "custom_id": "btn_open_general_ticket"
                            }
                        ]
                    },
                    {
                        "type": 14,
                        "spacing": 1,
                        "divider": true
                    },
                    {
                        "type": 10,
                        "content": "### 🚨 Signalement Joueur (Report)\nUn joueur enfreint le règlement (cheat, grief, propos inappropriés ou comportement toxique) ?"
                    },
                    {
                        "type": 1,
                        "components": [
                            {
                                "type": 2,
                                "style": 4,
                                "label": "Signaler un joueur",
                                "emoji": {"name": "🚨"},
                                "custom_id": "btn_open_report_ticket"
                            }
                        ]
                    },
                    {
                        "type": 14,
                        "spacing": 1,
                        "divider": true
                    },
                    {
                        "type": 10,
                        "content": "### 🎥 Candidature Vidéaste & Partenariat\nTu crées du contenu sur YouTube, Twitch ou TikTok ? Postule pour intégrer le programme créateur officiel."
                    },
                    {
                        "type": 1,
                        "components": [
                            {
                                "type": 2,
                                "style": 1,
                                "label": "Postuler Vidéaste",
                                "emoji": {"name": "🎥"},
                                "custom_id": "btn_open_videaste_ticket"
                            }
                        ]
                    },
                    {
                        "type": 14,
                        "spacing": 1,
                        "divider": true
                    },
                    {
                        "type": 10,
                        "content": "### ⚖️ Contestation de Sanction (Appeals)\nTu as reçu une sanction (ban, mute) et tu souhaites déposer une demande de révision argumentée ?"
                    },
                    {
                        "type": 1,
                        "components": [
                            {
                                "type": 2,
                                "style": 2,
                                "label": "Faire un appel",
                                "emoji": {"name": "⚖️"},
                                "custom_id": "btn_open_appeal_ticket"
                            }
                        ]
                    },
                    {
                        "type": 14,
                        "spacing": 1,
                        "divider": true
                    },
                    {
                        "type": 10,
                        "content": "> 📌 **Important :** Ne mentionnez aucun membre du staff dans votre ticket afin de ne pas ralentir le traitement.\n> 🌐 **Recrutement Staff :** Les candidatures (Modérateur, Helper) s'effectuent sur [paranoiastudio.fr/candidature](https://paranoiastudio.fr/candidature)."
                    }
                ]
            }
        ]
    });

    let client = reqwest::Client::new();
    let res = client
        .post(format!("https://discord.com/api/v10/channels/{}/messages", channel_id))
        .header("Authorization", format!("Bot {}", token))
        .header("Content-Type", "application/json")
        .json(&v2_payload)
        .send()
        .await;

    let success = res.is_ok() && res.unwrap().status().is_success();

    let response = InteractionResponse {
        kind: InteractionResponseType::ChannelMessageWithSource,
        data: Some(InteractionResponseData {
            content: Some(if success {
                "✅ Panel des tickets V2 déployé avec succès !".to_string()
            } else {
                "⚠️ Erreur lors du déploiement du panel V2.".to_string()
            }),
            flags: Some(twilight_model::channel::message::MessageFlags::EPHEMERAL),
            ..Default::default()
        }),
    };

    let _ = http.interaction(interaction.application_id)
        .create_response(interaction.id, &interaction.token, &response)
        .await;

    Ok(())
}

pub async fn handle_open_button(
    interaction: Interaction,
    http: Arc<HttpClient>,
    category: &str,
) -> anyhow::Result<()> {
    let (modal_title, text_inputs) = match category {
        "general" => (
            "Support Général & Technique",
            vec![
                TextInput {
                    id: None,
                    custom_id: "pseudo_mc".to_string(),
                    label: Some("Pseudo Minecraft (optionnel)".to_string()),
                    max_length: Some(32),
                    min_length: Some(0),
                    placeholder: Some("Ex: Leoo955".to_string()),
                    required: Some(false),
                    style: TextInputStyle::Short,
                    value: None,
                },
                TextInput {
                    id: None,
                    custom_id: "description".to_string(),
                    label: Some("Description de votre problème".to_string()),
                    max_length: Some(1000),
                    min_length: Some(10),
                    placeholder: Some("Expliquez votre demande en détails...".to_string()),
                    required: Some(true),
                    style: TextInputStyle::Paragraph,
                    value: None,
                },
            ],
        ),
        "report" => (
            "Signalement de Joueur",
            vec![
                TextInput {
                    id: None,
                    custom_id: "reported".to_string(),
                    label: Some("Pseudo du joueur signalé".to_string()),
                    max_length: Some(64),
                    min_length: Some(2),
                    placeholder: Some("Ex: Cheater123".to_string()),
                    required: Some(true),
                    style: TextInputStyle::Short,
                    value: None,
                },
                TextInput {
                    id: None,
                    custom_id: "reason".to_string(),
                    label: Some("Motif et preuves (liens vidéos/images)".to_string()),
                    max_length: Some(1000),
                    min_length: Some(10),
                    placeholder: Some("Décrivez les faits et collez des liens de preuves...".to_string()),
                    required: Some(true),
                    style: TextInputStyle::Paragraph,
                    value: None,
                },
            ],
        ),
        "videaste" => (
            "Candidature Créateur Vidéaste",
            vec![
                TextInput {
                    id: None,
                    custom_id: "pseudo_mc".to_string(),
                    label: Some("Pseudo Minecraft".to_string()),
                    max_length: Some(32),
                    min_length: Some(2),
                    placeholder: Some("Ex: Leoo955".to_string()),
                    required: Some(true),
                    style: TextInputStyle::Short,
                    value: None,
                },
                TextInput {
                    id: None,
                    custom_id: "channels".to_string(),
                    label: Some("Lien(s) de votre chaîne (YouTube, Twitch, TikTok)".to_string()),
                    max_length: Some(500),
                    min_length: Some(5),
                    placeholder: Some("https://youtube.com/@...".to_string()),
                    required: Some(true),
                    style: TextInputStyle::Paragraph,
                    value: None,
                },
            ],
        ),
        _ => (
            "Contestation de Sanction",
            vec![
                TextInput {
                    id: None,
                    custom_id: "sanction_id".to_string(),
                    label: Some("ID de la sanction (si connu)".to_string()),
                    max_length: Some(16),
                    min_length: Some(0),
                    placeholder: Some("Ex: a1b2c3".to_string()),
                    required: Some(false),
                    style: TextInputStyle::Short,
                    value: None,
                },
                TextInput {
                    id: None,
                    custom_id: "justification".to_string(),
                    label: Some("Justification de l'appel".to_string()),
                    max_length: Some(1000),
                    min_length: Some(10),
                    placeholder: Some("Pourquoi cette sanction devrait-elle être révisée ?".to_string()),
                    required: Some(true),
                    style: TextInputStyle::Paragraph,
                    value: None,
                },
            ],
        ),
    };

    let rows: Vec<Component> = text_inputs
        .into_iter()
        .map(|t| Component::ActionRow(ActionRow { id: None, components: vec![Component::TextInput(t)] }))
        .collect();

    let modal = InteractionResponse {
        kind: InteractionResponseType::Modal,
        data: Some(InteractionResponseData {
            custom_id: Some(format!("modal_ticket:{}", category)),
            title: Some(modal_title.to_string()),
            components: Some(rows),
            ..Default::default()
        }),
    };

    http.interaction(interaction.application_id)
        .create_response(interaction.id, &interaction.token, &modal)
        .await?;

    Ok(())
}

pub async fn handle_ticket_modal_submit(
    interaction: Interaction,
    http: Arc<HttpClient>,
    category: &str,
    modal_data: &ModalInteractionData,
    guild_id: Id<GuildMarker>,
    category_id: u64,
    staff_role_id: u64,
) -> anyhow::Result<()> {
    let author_id = interaction.author_id().unwrap();
    let author_name = crate::utils::get_interaction_user_name(&interaction);

    let details = crate::utils::extract_modal_inputs(&modal_data.components);

    let channel_name = format!("{}-{}", category, author_name.to_lowercase().replace(' ', "-"));

    let everyone_id = Id::<RoleMarker>::new(guild_id.get());
    let staff_id = Id::<RoleMarker>::new(staff_role_id);
    let user_id = Id::<UserMarker>::new(author_id.get());

    let overwrites = vec![
        PermissionOverwrite {
            id: everyone_id.cast(),
            kind: PermissionOverwriteType::Role,
            allow: Permissions::empty(),
            deny: Permissions::VIEW_CHANNEL,
        },
        PermissionOverwrite {
            id: staff_id.cast(),
            kind: PermissionOverwriteType::Role,
            allow: Permissions::VIEW_CHANNEL | Permissions::SEND_MESSAGES | Permissions::ATTACH_FILES | Permissions::READ_MESSAGE_HISTORY,
            deny: Permissions::empty(),
        },
        PermissionOverwrite {
            id: user_id.cast(),
            kind: PermissionOverwriteType::Member,
            allow: Permissions::VIEW_CHANNEL | Permissions::SEND_MESSAGES | Permissions::ATTACH_FILES | Permissions::READ_MESSAGE_HISTORY,
            deny: Permissions::empty(),
        },
    ];

    let created_channel = http
        .create_guild_channel(guild_id, &channel_name)
        .kind(ChannelType::GuildText)
        .parent_id(Id::<ChannelMarker>::new(category_id))
        .permission_overwrites(&overwrites)
        .await?
        .model()
        .await?;

    let mut embed_builder = EmbedBuilder::new()
        .title(format!("🎫 Ticket ouvert : {}", category.to_uppercase()))
        .description(format!(
            "Bonjour <@{}> ! Un membre de l'équipe de modération va prendre en charge votre demande sous peu.\n\n\
            Merci d'expliquer au maximum votre requête en attendant.",
            author_id
        ))
        .color(COLOR_PURPLE)
        .footer(EmbedFooterBuilder::new(FOOTER_TEXT));

    for (k, v) in details {
        embed_builder = embed_builder.field(EmbedFieldBuilder::new(k, v));
    }

    let buttons = vec![
        Button {
            id: None,
            custom_id: Some("ticket_claim".to_string()),
            disabled: false,
            emoji: None,
            label: Some("✋ Prendre en charge".to_string()),
            style: ButtonStyle::Primary,
            url: None,
            sku_id: None,
        },
        Button {
            id: None,
            custom_id: Some("ticket_close".to_string()),
            disabled: false,
            emoji: None,
            label: Some("🔒 Fermer le ticket".to_string()),
            style: ButtonStyle::Danger,
            url: None,
            sku_id: None,
        },
    ];

    let components = vec![Component::ActionRow(ActionRow {
        id: None,
        components: buttons.into_iter().map(Component::Button).collect(),
    })];

    let _ = http
        .create_message(created_channel.id)
        .content(&format!("<@{}> <@&{}>", author_id, staff_role_id))
        .embeds(&[embed_builder.build()])
        .components(&components)
        .await;

    let response = InteractionResponse {
        kind: InteractionResponseType::ChannelMessageWithSource,
        data: Some(InteractionResponseData {
            content: Some(format!("Votre ticket a été créé avec succès : <#{}>", created_channel.id)),
            flags: Some(twilight_model::channel::message::MessageFlags::EPHEMERAL),
            ..Default::default()
        }),
    };

    http.interaction(interaction.application_id)
        .create_response(interaction.id, &interaction.token, &response)
        .await?;

    Ok(())
}

pub async fn handle_claim(interaction: Interaction, http: Arc<HttpClient>) -> anyhow::Result<()> {
    let author_id = interaction.author_id().unwrap();

    let embed = EmbedBuilder::new()
        .description(format!("✋ Ce ticket a été pris en charge par <@{}>.", author_id))
        .color(COLOR_INFO)
        .build();

    let response = InteractionResponse {
        kind: InteractionResponseType::ChannelMessageWithSource,
        data: Some(InteractionResponseData {
            embeds: Some(vec![embed]),
            ..Default::default()
        }),
    };

    http.interaction(interaction.application_id)
        .create_response(interaction.id, &interaction.token, &response)
        .await?;

    Ok(())
}

pub async fn handle_close(
    interaction: Interaction,
    http: Arc<HttpClient>,
    log_channel_id: u64,
) -> anyhow::Result<()> {
    let channel_id = interaction.channel.as_ref().map(|c| c.id).unwrap();
    let author_id = interaction.author_id().unwrap();

    let closing_embed = EmbedBuilder::new()
        .description("🔒 **Fermeture du ticket en cours...**\nLe salon sera supprimé dans 5 secondes.")
        .color(COLOR_ERROR)
        .build();

    let response = InteractionResponse {
        kind: InteractionResponseType::ChannelMessageWithSource,
        data: Some(InteractionResponseData {
            embeds: Some(vec![closing_embed]),
            ..Default::default()
        }),
    };

    let _ = http.interaction(interaction.application_id)
        .create_response(interaction.id, &interaction.token, &response)
        .await;

    close_ticket_channel(channel_id, &http, log_channel_id, Some(author_id)).await;

    Ok(())
}

pub async fn close_ticket_channel(
    channel_id: Id<ChannelMarker>,
    http: &HttpClient,
    log_channel_id: u64,
    closer_id: Option<Id<UserMarker>>,
) {
    let messages = http.channel_messages(channel_id).limit(100).await;
    let transcript = if let Ok(msgs_resp) = messages {
        if let Ok(msgs) = msgs_resp.model().await {
            let mut lines = Vec::new();
            for m in msgs.iter().rev() {
                lines.push(format!("[{:?}] {}: {}", m.timestamp, m.author.name, m.content));
            }
            lines.join("\n")
        } else {
            "Transcript indisponible".to_string()
        }
    } else {
        "Transcript indisponible".to_string()
    };

    let closer_tag = match closer_id {
        Some(id) => format!("<@{}>", id),
        None => "Système / Commande".to_string(),
    };

    let log_embed = EmbedBuilder::new()
        .title("📁 Ticket Clôturé")
        .description(format!(
            "**Salon :** `{}`\n**Fermé par :** {}\n\n**Derniers messages :**\n```\n{}\n```",
            channel_id,
            closer_tag,
            if transcript.len() > 1500 { &transcript[transcript.len() - 1500..] } else { &transcript }
        ))
        .color(COLOR_INFO)
        .footer(EmbedFooterBuilder::new(FOOTER_TEXT))
        .build();

    let _ = http.create_message(Id::new(log_channel_id)).embeds(&[log_embed]).await;

    tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
    let _ = http.delete_channel(channel_id).await;
}
