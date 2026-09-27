use std::sync::Arc;
use twilight_http::Client as HttpClient;
use twilight_model::{
    application::interaction::Interaction,
    channel::message::component::{ActionRow, Button, ButtonStyle, Component},
    guild::Permissions,
    http::interaction::{InteractionResponse, InteractionResponseType, InteractionResponseData},
    id::{marker::RoleMarker, Id},
};
use twilight_util::builder::{
    command::CommandBuilder,
    embed::{EmbedBuilder, EmbedFooterBuilder},
};

use crate::utils::{COLOR_INFO, COLOR_PURPLE, COLOR_SUCCESS, FOOTER_TEXT};

pub fn register() -> twilight_model::application::command::Command {
    CommandBuilder::new(
        "notifications",
        "Déploie le panneau de sélection des rôles de notification",
        twilight_model::application::command::CommandType::ChatInput,
    )
    .default_member_permissions(Permissions::MANAGE_ROLES)
    .build()
}

pub async fn run(interaction: Interaction, http: Arc<HttpClient>) -> anyhow::Result<()> {
    let embed = EmbedBuilder::new()
        .title("🔔 Rôles de Notification")
        .description(
            "Cliquez sur les boutons ci-dessous pour activer ou désactiver les notifications de votre choix !\n\n\
            📢 **Annonces** : Annonces importantes du serveur\n\
            🎬 **Vidéastes** : Lives et nouvelles vidéos de nos créateurs\n\
            🎉 **Événements** : Tournois, concours et animations\n\
            🚀 **Mises à jour** : Patch notes et nouveautés en jeu\n\
            🎁 **Giveaways** : Tirages au sort et cadeaux",
        )
        .color(COLOR_PURPLE)
        .footer(EmbedFooterBuilder::new(FOOTER_TEXT))
        .build();

    let buttons = vec![
        Button {
            id: None,
            custom_id: Some("notif_toggle:Annonces".to_string()),
            disabled: false,
            emoji: None,
            label: Some("📢 Annonces".to_string()),
            style: ButtonStyle::Secondary,
            url: None,
            sku_id: None,
        },
        Button {
            id: None,
            custom_id: Some("notif_toggle:Vidéastes".to_string()),
            disabled: false,
            emoji: None,
            label: Some("🎬 Vidéastes".to_string()),
            style: ButtonStyle::Secondary,
            url: None,
            sku_id: None,
        },
        Button {
            id: None,
            custom_id: Some("notif_toggle:Événements".to_string()),
            disabled: false,
            emoji: None,
            label: Some("🎉 Événements".to_string()),
            style: ButtonStyle::Secondary,
            url: None,
            sku_id: None,
        },
        Button {
            id: None,
            custom_id: Some("notif_toggle:Mises à jour".to_string()),
            disabled: false,
            emoji: None,
            label: Some("🚀 Mises à jour".to_string()),
            style: ButtonStyle::Secondary,
            url: None,
            sku_id: None,
        },
        Button {
            id: None,
            custom_id: Some("notif_toggle:Giveaways".to_string()),
            disabled: false,
            emoji: None,
            label: Some("🎁 Giveaways".to_string()),
            style: ButtonStyle::Secondary,
            url: None,
            sku_id: None,
        },
    ];

    let row1 = ActionRow {
        id: None,
        components: buttons[0..3].iter().cloned().map(Component::Button).collect(),
    };
    let row2 = ActionRow {
        id: None,
        components: buttons[3..5].iter().cloned().map(Component::Button).collect(),
    };

    let response = InteractionResponse {
        kind: InteractionResponseType::ChannelMessageWithSource,
        data: Some(InteractionResponseData {
            embeds: Some(vec![embed]),
            components: Some(vec![Component::ActionRow(row1), Component::ActionRow(row2)]),
            ..Default::default()
        }),
    };

    http.interaction(interaction.application_id)
        .create_response(interaction.id, &interaction.token, &response)
        .await?;

    Ok(())
}

pub async fn handle_toggle(
    interaction: Interaction,
    http: Arc<HttpClient>,
    role_name: &str,
) -> anyhow::Result<()> {
    let guild_id = match interaction.guild_id {
        Some(id) => id,
        None => return Ok(()),
    };

    let member = match &interaction.member {
        Some(m) => m,
        None => return Ok(()),
    };

    let user_id = match member.user.as_ref() {
        Some(u) => u.id,
        None => return Ok(()),
    };

    let roles = http.roles(guild_id).await?.model().await?;
    let target_role = roles.into_iter().find(|r| r.name.eq_ignore_ascii_case(role_name));

    let (message, color) = match target_role {
        Some(role) => {
            let role_id: Id<RoleMarker> = role.id;
            let has_role = member.roles.contains(&role_id);

            if has_role {
                let res = http.remove_guild_member_role(guild_id, user_id, role_id).await;
                if res.is_ok() {
                    (format!("❌ Le rôle **{}** vous a été retiré.", role.name), COLOR_INFO)
                } else {
                    ("Impossible de modifier vos rôles (permissions manquantes).".to_string(), crate::utils::COLOR_ERROR)
                }
            } else {
                let res = http.add_guild_member_role(guild_id, user_id, role_id).await;
                if res.is_ok() {
                    (format!("✅ Le rôle **{}** vous a été attribué !", role.name), COLOR_SUCCESS)
                } else {
                    ("Impossible de modifier vos rôles (permissions manquantes).".to_string(), crate::utils::COLOR_ERROR)
                }
            }
        }
        None => (
            format!("Le rôle **{}** n'existe pas sur ce serveur. Contactez un administrateur.", role_name),
            crate::utils::COLOR_ERROR,
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
