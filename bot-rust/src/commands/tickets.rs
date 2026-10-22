#![allow(deprecated)]

use std::sync::Arc;
use twilight_http::Client as HttpClient;
use twilight_model::{
    application::interaction::{
        modal::ModalInteractionData, Interaction,
    },
    channel::{
        message::EmojiReactionType,
        message::component::{ActionRow, Button, ButtonStyle, Component, SelectMenu, SelectMenuType, TextInput, TextInputStyle},
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
    command::{ChannelBuilder, CommandBuilder},
    embed::{EmbedBuilder, EmbedFieldBuilder, EmbedFooterBuilder, ImageSource},
};

use crate::utils::{COLOR_ERROR, COLOR_INFO, COLOR_PURPLE, FOOTER_TEXT};

pub fn register() -> twilight_model::application::command::Command {
    CommandBuilder::new(
        "setup_tickets",
        "Déploie le panneau interactif de gestion des tickets de support",
        twilight_model::application::command::CommandType::ChatInput,
    )
    .default_member_permissions(Permissions::ADMINISTRATOR)
    .option(ChannelBuilder::new("salon", "Salon où poster le panneau (par défaut : ici)").channel_types([ChannelType::GuildText]))
    .build()
}

/// (bouton, libellé, description, emoji) : source unique du panneau V2 et du repli en embed.
const CATEGORIES: [(&str, &str, &str, crate::utils::emoji::E); 4] = [
    ("general", "Aide générale", "Une question sur le site, le launcher ou le Discord", crate::utils::emoji::SUPPORT),
    ("report", "Signaler", "Un joueur qui ne respecte pas le règlement", crate::utils::emoji::TITLE),
    ("videaste", "Devenir créateur", "Rejoindre les créateurs du studio", crate::utils::emoji::TIKTOK),
    ("appeal", "Contester", "Faire appel d'une sanction", crate::utils::emoji::SANCTION),
];

use crate::utils::emoji_parts;

fn button_json(key: &str, label: &str, emoji: &str) -> serde_json::Value {
    let mut b = serde_json::json!({ "type": 2, "style": 1, "label": label, "custom_id": format!("btn_open_{key}_ticket") });
    if let Some((name, id)) = emoji_parts(emoji) {
        b["emoji"] = serde_json::json!({ "name": name, "id": id.to_string() });
    }
    b
}

const LOGO: &str = "https://raw.githubusercontent.com/paranoiaSMP/Paranoia/main/public/Paranoia_logo.png";

fn gap() -> serde_json::Value {
    serde_json::json!({ "type": 14, "divider": false, "spacing": 2 })
}

fn panel_v2() -> serde_json::Value {
    let text = |content: String| serde_json::json!({ "type": 10, "content": content });
    let mut parts = vec![
        serde_json::json!({ "type": 12, "items": [{ "media": { "url": "https://files.catbox.moe/g1etwk.png" } }] }),
        gap(),
        serde_json::json!({
            "type": 9,
            "components": [text(format!("## {} | Centre d'aide\nUn souci, une question, un signalement ? Ouvre un ticket : un salon privé est créé, visible uniquement par toi et l'équipe.", crate::utils::emoji::SUPPORT))],
            "accessory": { "type": 11, "media": { "url": LOGO } },
        }),
        serde_json::json!({ "type": 14, "divider": true, "spacing": 2 }),
    ];
    for (key, label, desc, emoji) in CATEGORIES {
        parts.push(serde_json::json!({
            "type": 9,
            "components": [text(format!("### {emoji} {label}\n{desc}"))],
            "accessory": button_json(key, "Ouvrir", ""),
        }));
        parts.push(gap());
    }
    parts.push(serde_json::json!({ "type": 14, "divider": true, "spacing": 1 }));
    parts.push(text("-# Un ticket par demande · merci de rester respectueux envers l'équipe.".to_string()));
    serde_json::json!({ "flags": 32768, "components": [{ "type": 17, "accent_color": 15132390, "components": parts }] })
}

pub async fn run(interaction: Interaction, http: Arc<HttpClient>) -> anyhow::Result<()> {
    use twilight_model::application::interaction::application_command::CommandOptionValue;
    let target = match &interaction.data {
        Some(twilight_model::application::interaction::InteractionData::ApplicationCommand(d)) => {
            d.options.iter().find_map(|o| match o.value { CommandOptionValue::Channel(c) if o.name == "salon" => Some(c), _ => None })
        }
        _ => None,
    };
    let Some(channel_id) = target.or(interaction.channel.as_ref().map(|c| c.id)) else { return Ok(()) };

    let _ = http.interaction(interaction.application_id)
        .create_response(interaction.id, &interaction.token, &InteractionResponse {
            kind: InteractionResponseType::DeferredChannelMessageWithSource,
            data: Some(InteractionResponseData { flags: Some(twilight_model::channel::message::MessageFlags::EPHEMERAL), ..Default::default() }),
        })
        .await;

    let raw_token = http.token().unwrap_or_default().trim();
    let auth_header = if raw_token.starts_with("Bot ") { raw_token.to_string() } else { format!("Bot {raw_token}") };

    let sent_v2 = match reqwest::Client::new()
        .post(format!("https://discord.com/api/v10/channels/{channel_id}/messages"))
        .header("Authorization", &auth_header)
        .json(&panel_v2())
        .send()
        .await
    {
        Ok(res) if res.status().is_success() => true,
        Ok(res) => {
            let status = res.status();
            tracing::warn!("V2 ticket panel rejected ({status}): {}, repli sur un embed standard", res.text().await.unwrap_or_default());
            false
        }
        Err(e) => {
            tracing::warn!("Network error sending V2 ticket panel: {e}, repli sur un embed standard");
            false
        }
    };

    if !sent_v2 {
        let list: Vec<String> = CATEGORIES.iter().map(|(_, label, desc, emoji)| format!("{emoji} | **{label}**\n{desc}")).collect();
        let mut embed = EmbedBuilder::new()
            .description(format!("{}\n\n{}", format!("## {} | Besoin d'aide ?", crate::utils::emoji::SUPPORT), format!("Choisis la catégorie qui correspond à ta demande : un membre de l'équipe te répond dans ton salon privé.\n\n{}", list.join("\n\n"))))
            .color(0xe6e6e6)
            .footer(EmbedFooterBuilder::new(format!("{FOOTER_TEXT} • Support")));
        if let Ok(src) = ImageSource::url("https://files.catbox.moe/g1etwk.png") {
            embed = embed.image(src);
        }
        let rows: Vec<Component> = CATEGORIES
            .chunks(2)
            .map(|chunk| {
                Component::ActionRow(ActionRow {
                    id: None,
                    components: chunk
                        .iter()
                        .map(|(key, label, _, emoji)| {
                            Component::Button(Button {
                                id: None,
                                custom_id: Some(format!("btn_open_{key}_ticket")),
                                disabled: false,
                                emoji: emoji_parts(emoji).map(|(name, id)| EmojiReactionType::Custom { animated: false, id: Id::new(id), name: Some(name.to_string()) }),
                                label: Some(label.to_string()),
                                style: ButtonStyle::Primary,
                                url: None,
                                sku_id: None,
                            })
                        })
                        .collect(),
                })
            })
            .collect();
        http.create_message(channel_id).embeds(&[embed.build()]).components(&rows).await?;
    }

    let _ = http.interaction(interaction.application_id)
        .update_response(&interaction.token)
        .content(Some(&format!("Panneau des tickets déployé dans <#{channel_id}>.")))
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
        .description(format!("{}\n\n{}", format!("## {} | Ticket ouvert : {}", crate::utils::emoji::SUPPORT, category.to_uppercase()), format!(
            "Bonjour <@{}> !\n\nUn membre de l'équipe va prendre en charge ta demande sous peu.\n\nEn attendant, explique-la le plus précisément possible.",
            author_id
        )))
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

    let mods_select = Component::SelectMenu(SelectMenu {
        id: None,
        channel_types: None,
        custom_id: MODS_SELECT.to_string(),
        default_values: None,
        disabled: false,
        kind: SelectMenuType::User,
        max_values: Some(3),
        min_values: Some(1),
        options: None,
        placeholder: Some("Choisir tes modérateurs (facultatif)".to_string()),
        required: None,
    });
    let components = vec![
        Component::ActionRow(ActionRow { id: None, components: buttons.into_iter().map(Component::Button).collect() }),
        Component::ActionRow(ActionRow { id: None, components: vec![mods_select] }),
    ];

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

pub const MODS_SELECT: &str = "ticket_mods";

/// Le demandeur choisit ses modérateurs : seuls les membres du rôle staff sont ajoutés au salon.
pub async fn handle_mods_select(interaction: Interaction, http: Arc<HttpClient>, values: &[String], staff_role_id: u64) -> anyhow::Result<()> {
    let (Some(guild_id), Some(channel), Some(msg)) = (interaction.guild_id, interaction.channel.as_ref(), interaction.message.as_ref()) else {
        return Ok(());
    };
    let reply = |text: String| {
        let http = http.clone();
        let (app, id, token) = (interaction.application_id, interaction.id, interaction.token.clone());
        async move {
            let resp = InteractionResponse {
                kind: InteractionResponseType::ChannelMessageWithSource,
                data: Some(InteractionResponseData { content: Some(text), flags: Some(twilight_model::channel::message::MessageFlags::EPHEMERAL), ..Default::default() }),
            };
            http.interaction(app).create_response(id, &token, &resp).await.map(|_| ())
        }
    };
    // Le message d'ouverture mentionne le demandeur en premier.
    if msg.mentions.first().map(|m| m.id) != interaction.author_id() {
        return Ok(reply("Seul le demandeur du ticket peut choisir ses modérateurs.".into()).await?);
    }
    let mut added = Vec::new();
    for v in values {
        let Ok(uid) = v.parse::<u64>() else { continue };
        let uid = Id::<UserMarker>::new(uid);
        let Ok(member) = http.guild_member(guild_id, uid).await else { continue };
        let Ok(member) = member.model().await else { continue };
        if !member.roles.iter().any(|r| r.get() == staff_role_id) {
            continue;
        }
        let ow = twilight_model::http::permission_overwrite::PermissionOverwrite {
            id: uid.cast(),
            kind: twilight_model::http::permission_overwrite::PermissionOverwriteType::Member,
            allow: Some(Permissions::VIEW_CHANNEL | Permissions::SEND_MESSAGES | Permissions::ATTACH_FILES | Permissions::READ_MESSAGE_HISTORY),
            deny: None,
        };
        if http.update_channel_permission(channel.id, &ow).await.is_ok() {
            added.push(uid);
        }
    }
    if added.is_empty() {
        return Ok(reply("Aucun des membres choisis ne fait partie du staff.".into()).await?);
    }
    let mentions: Vec<String> = added.iter().map(|u| format!("<@{u}>")).collect();
    let _ = http.create_message(channel.id).content(&format!("{} Modérateur(s) choisi(s) : {}", crate::utils::emoji::STAFF, mentions.join(" "))).await;
    Ok(reply("Modérateur(s) ajouté(s) au ticket.".into()).await?)
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
        .description(format!("{}\n\n{}", format!("## {} | Ticket Clôturé", crate::utils::emoji::SUPPORT), format!(
            "**Salon :** `{}`\n**Fermé par :** {}\n\n**Derniers messages :**\n```\n{}\n```",
            channel_id,
            closer_tag,
            if transcript.len() > 1500 { &transcript[transcript.len() - 1500..] } else { &transcript }
        )))
        .color(COLOR_INFO)
        .footer(EmbedFooterBuilder::new(FOOTER_TEXT))
        .build();

    let _ = http.create_message(Id::new(log_channel_id)).embeds(&[log_embed]).await;

    tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
    let _ = http.delete_channel(channel_id).await;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn button_emoji_is_parsed_and_every_category_has_one() {
        assert_eq!(emoji_parts("<:am_title:123>"), Some(("am_title", 123)));
        assert_eq!(emoji_parts("#️⃣"), None);
        assert!(CATEGORIES.iter().all(|c| emoji_parts(&c.3).is_some()));
    }
}
